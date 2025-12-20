'use server';

import { z } from 'zod';
import { db } from '@/data/db';
import { cases } from '@/data/schema/cases';
import { monitoredAddresses } from '@/data/schema/addresses';
import { getCurrentUser } from '@/modules/auth/auth.actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { redirect } from '@/i18n/routing';
import { createCaseSchema, CreateCaseInput } from './cases.schema';

function normalizeAddressForKey(chain: string, address: string) {
    const trimmed = (address || '').trim();
    const upper = (chain || '').toUpperCase();
    // EVM addresses are case-insensitive; keep others as-is to avoid breaking base58 formats.
    return upper === 'ETH' ? trimmed.toLowerCase() : trimmed;
}

function dedupeAddresses(addresses: any[]) {
    const seen = new Set<string>();
    const result: any[] = [];

    for (const addr of addresses) {
        const chain = (addr.chain || '').trim();
        const network = (addr.network ?? null) as string | null;
        const address = (addr.address || '').trim();
        if (!chain || !address) continue;

        const key = `${chain.toUpperCase()}|${network ?? ''}|${normalizeAddressForKey(chain, address)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(addr); // 返回完整的对象，保留所有字段如 walletName
    }

    return result;
}

export async function createCaseAction(input: CreateCaseInput) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
        throw new Error("Unauthorized");
    }
    const user = userResult.data;

    const val = createCaseSchema.safeParse(input);
    if (!val.success) {
        return { error: val.error.format() };
    }
    const { name, description, addresses, parentId } = val.data;

    const caseId = uuidv4();

    try {
        // Determine level based on parent
        let level = 1;
        let parentFolder = null;

        if (parentId) {
            // Validate parent exists and belongs to user
            parentFolder = await db.query.cases.findFirst({
                where: and(
                    eq(cases.id, parentId),
                    eq(cases.userId, user.id)
                ),
            });

            if (!parentFolder) {
                return { error: "Parent folder not found or unauthorized" };
            }

            // Check depth limit (max 2 levels)
            if (parentFolder.level >= 2) {
                return { error: "Folder depth cannot exceed 2 levels" };
            }

            level = parentFolder.level + 1;
        }

        // Determine position (append to end within same parent)
        const parentCondition = parentId ? eq(cases.parentId, parentId) : sql`parent_id IS NULL`;
        const maxPosResult = await db.select({
            maxPos: sql<number>`COALESCE(MAX(${cases.position}), 0)`,
        })
        .from(cases)
        .where(and(eq(cases.userId, user.id), parentCondition));

        const nextPosition = (maxPosResult[0]?.maxPos ?? 0) + 1;

        // Create the case
        await db.insert(cases).values({
            id: caseId,
            userId: user.id,
            name,
            description: description || null,
            parentId: parentId || null,
            level,
            position: nextPosition,
            status: 'active',
        });

        // Insert addresses if provided
        if (addresses && addresses.length > 0) {
            const uniqueAddresses = dedupeAddresses(addresses);
            const addressValues = uniqueAddresses.map(addr => ({
                id: uuidv4(),
                caseId,
                address: addr.address,
                chain: addr.chain,
                network: addr.network || null,
                walletName: addr.walletName || null, // 保存钱包名称
            }));

            await db.insert(monitoredAddresses).values(addressValues);
        }

        revalidatePath('/dashboard');
        return { success: true, id: caseId };
    } catch (error: any) {
        console.error('Error creating case:', error);
        return { error: error.message || "Failed to create folder" };
    }
}

export async function getUserCases() {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return [];
    const user = userResult.data;

    return await db.query.cases.findMany({
        where: eq(cases.userId, user.id),
        orderBy: [desc(cases.createdAt)],
    });
}

/**
 * 获取当前用户所有 case 的所有地址（递归获取所有子文件夹的地址）
 * 用于在 dashboard 首页显示所有分组的钱包信息
 */
// 统一地址对象转换
function mapAddress(addr: any) {
    return {
        id: addr.id,
        caseId: addr.caseId,
        address: addr.address,
        chain: addr.chain,
        network: addr.network,
        walletName: addr.walletName || addr.wallet_name || null, // 统一字段名为驼峰
        createdAt: addr.createdAt,
    };
}

export async function getAllCasesAddresses() {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return null;
    const user = userResult.data;

    // 获取所有 case
    const allCases = await db.query.cases.findMany({
        where: eq(cases.userId, user.id),
    });

    if (allCases.length === 0) {
        return {
            id: 'all-cases',
            name: '所有分组',
            description: '所有分组的钱包地址汇总',
            addresses: [],
            stats: {
                caseCount: 0,
                totalAssets: 0,
                addressCount: 0,
                assetDistribution: []
            }
        };
    }

    // 递归获取某个 case 及其所有子文件夹的 ID（从内存中查找，减少 DB 调用）
    const getAllCaseIdsRecursive = (caseId: string): string[] => {
        const result: string[] = [caseId];
        const children = allCases.filter(c => c.parentId === caseId);
        for (const child of children) {
            result.push(...getAllCaseIdsRecursive(child.id));
        }
        return result;
    };

    // 只处理根节点（parentId 为 null 的 case）
    const rootCases = allCases.filter(c => !c.parentId);
    
    // 获取所有 case 的 ID（包括子文件夹）
    const allCaseIds: string[] = [];
    for (const rootCase of rootCases) {
        allCaseIds.push(...getAllCaseIdsRecursive(rootCase.id));
    }

    // 去重
    const uniqueCaseIds = Array.from(new Set(allCaseIds));

    // 获取所有地址
    const rawAddresses = await db.query.monitoredAddresses.findMany({
        where: inArray(monitoredAddresses.caseId, uniqueCaseIds),
    });

    const allAddresses = rawAddresses.map(mapAddress);

    // Mock Asset Data Calculation
    const totalAssets = allAddresses.length * 1234.56; // Mock value
    const assetDist = [
        { name: 'BTC', value: 400 },
        { name: 'ETH', value: 300 },
        { name: 'TRON', value: 300 },
    ];

    return {
        id: 'all-cases',
        name: '所有分组',
        description: '所有分组的钱包地址汇总',
        addresses: allAddresses,
        stats: {
            caseCount: rootCases.length, // 只统计一级目录数量
            totalAssets,
            addressCount: allAddresses.length,
            assetDistribution: assetDist
        }
    };
}

export type FolderNode = {
    id: string;
    name: string;
    level: number;
    parentId: string | null;
    children: FolderNode[];
    addressCount?: number; // 该文件夹及其子文件夹的地址总数
};

export async function getUserCasesTree(): Promise<FolderNode[]> {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return [];
    const user = userResult.data;

    // 🚀 优化：先查询用户的所有分组
    const allCases = await db.query.cases.findMany({
        where: eq(cases.userId, user.id),
        orderBy: [cases.position, desc(cases.createdAt)],
    });

    // 如果没有分组，直接返回
    if (allCases.length === 0) return [];

    // 🚀 优化：批量查询所有分组的地址（1次查询代替N次）
    const caseIds = allCases.map(c => c.id);
    const allAddresses = await db.query.monitoredAddresses.findMany({
        where: inArray(monitoredAddresses.caseId, caseIds),
        columns: { id: true, caseId: true }, // 只查询需要的字段
    });

    // 🚀 优化：在内存中按 caseId 分组统计地址数量
    const addressCountMap = new Map<string, number>();
    allAddresses.forEach(addr => {
        const count = addressCountMap.get(addr.caseId) || 0;
        addressCountMap.set(addr.caseId, count + 1);
    });

    // Build tree structure
    const caseMap = new Map<string, FolderNode>();
    const rootNodes: FolderNode[] = [];

    // First pass: create all nodes
    allCases.forEach(c => {
        caseMap.set(c.id, {
            id: c.id,
            name: c.name,
            level: c.level,
            parentId: c.parentId,
            children: [],
            addressCount: 0,
        });
    });

    // Second pass: build tree
    allCases.forEach(c => {
        const node = caseMap.get(c.id)!;
        if (c.parentId) {
            const parent = caseMap.get(c.parentId);
            if (parent) {
                parent.children.push(node);
            } else {
                // Orphan node, treat as root
                rootNodes.push(node);
            }
        } else {
            rootNodes.push(node);
        }
    });

    // 🚀 优化：递归计算地址数量（纯内存操作，无数据库查询）
    const calculateAddressCounts = (node: FolderNode): number => {
        // Get direct addresses count from memory map
        let count = addressCountMap.get(node.id) || 0;

        // Add children's addresses recursively
        for (const child of node.children) {
            count += calculateAddressCounts(child);
        }

        node.addressCount = count;
        return count;
    };

    for (const root of rootNodes) {
        calculateAddressCounts(root);
    }

    return rootNodes;
}

/**
 * 递归获取某个文件夹及其所有子文件夹的地址列表
 */
export async function getCaseAddressesRecursive(caseId: string): Promise<Array<{
    id: string;
    caseId: string;
    address: string;
    chain: string;
    network: string | null;
    createdAt: Date | null;
}>> {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return [];
    const user = userResult.data;

    // 验证该文件夹属于当前用户
    const caseData = await db.query.cases.findFirst({
        where: and(
            eq(cases.id, caseId),
            eq(cases.userId, user.id)
        ),
    });

    if (!caseData) return [];

    // 获取所有子文件夹的 ID（递归）
    const getAllChildCaseIds = async (parentId: string): Promise<string[]> => {
        const children = await db.query.cases.findMany({
            where: and(
                eq(cases.parentId, parentId),
                eq(cases.userId, user.id)
            ),
        });

        let childIds: string[] = [];
        for (const child of children) {
            childIds.push(child.id);
            const grandChildren = await getAllChildCaseIds(child.id);
            childIds = childIds.concat(grandChildren);
        }

        return childIds;
    };

    const childCaseIds = await getAllChildCaseIds(caseId);
    const allCaseIds = [caseId, ...childCaseIds];

    // 获取所有地址
    const allAddresses = await db.query.monitoredAddresses.findMany({
        where: inArray(monitoredAddresses.caseId, allCaseIds),
    });

    return allAddresses;
}

export async function getCaseDetails(caseId: string) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return null;
    const user = userResult.data;

    const caseData = await db.query.cases.findFirst({
        where: eq(cases.id, caseId),
        with: {
            // We can add relation in schema if needed, or query addresses separately
        }
    });

    if (!caseData || caseData.userId !== user.id) return null;

    // 获取当前用户的所有 case（用于内存递归，减少 DB 调用）
    const allUserCases = await db.query.cases.findMany({
        where: eq(cases.userId, user.id),
    });

    // 递归获取所有子文件夹的 ID
    const getAllChildCaseIds = (parentId: string): string[] => {
        const children = allUserCases.filter(c => c.parentId === parentId);
        let childIds: string[] = [];
        for (const child of children) {
            childIds.push(child.id);
            childIds = childIds.concat(getAllChildCaseIds(child.id));
        }
        return childIds;
    };

    const childCaseIds = getAllChildCaseIds(caseId);
    const allCaseIds = [caseId, ...childCaseIds];

    // 获取该 case 及其所有子文件夹的所有地址
    const rawAddresses = await db.query.monitoredAddresses.findMany({
        where: inArray(monitoredAddresses.caseId, allCaseIds),
    });
    
    const addresses = rawAddresses.map(mapAddress);

    // 仅获取该 case 自己的地址
    const directAddresses = addresses.filter(addr => addr.caseId === caseId);

    // Mock Asset Data Calculation
    const totalAssets = addresses.length * 1234.56; // Mock value
    const assetDist = [
        { name: 'BTC', value: 400 },
        { name: 'ETH', value: 300 },
        { name: 'TRON', value: 300 },
    ];

    return {
        ...caseData,
        addresses,
        directAddresses,
        stats: {
            totalAssets,
            addressCount: addresses.length,
            assetDistribution: assetDist
        }
    };
}

export async function deleteCaseAction(caseId: string) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
        throw new Error("Unauthorized");
    }
    const user = userResult.data;

    try {
        // Verify the case belongs to the user
        const targetCase = await db.query.cases.findFirst({
            where: and(
                eq(cases.id, caseId),
                eq(cases.userId, user.id)
            ),
        });

        if (!targetCase) {
            return { error: "Case not found or unauthorized" };
        }

        // Recursively delete from leaves to root
        await deleteCaseRecursive(caseId, user.id);

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting case:', error);
        return { error: error.message || "Failed to delete folder" };
    }
}

// Helper function to recursively delete cases from leaves to root
async function deleteCaseRecursive(caseId: string, userId: string): Promise<void> {
    // First, find all direct children
    const children = await db.query.cases.findMany({
        where: and(
            eq(cases.parentId, caseId),
            eq(cases.userId, userId)
        ),
    });

    // Recursively delete all children first (depth-first, post-order)
    for (const child of children) {
        await deleteCaseRecursive(child.id, userId);
    }

    // After all children are deleted, delete this case
    // Addresses will be cascade deleted by database foreign key
    await db.delete(cases).where(eq(cases.id, caseId));
}

export async function updateCaseAction(caseId: string, input: CreateCaseInput) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
        throw new Error("Unauthorized");
    }
    const user = userResult.data;

    const val = createCaseSchema.safeParse(input);
    if (!val.success) {
        return { error: val.error.format() };
    }

    const { name, description, addresses, parentId } = val.data;

    try {
        // Verify ownership
        const existingCase = await db.query.cases.findFirst({
            where: and(
                eq(cases.id, caseId),
                eq(cases.userId, user.id)
            ),
        });

        if (!existingCase) {
            return { error: "Case not found or unauthorized" };
        }

        // Prevent moving to self or creating circular reference
        if (parentId === caseId) {
            return { error: "Cannot move folder to itself" };
        }

        // If parentId is provided, validate it
        let level = existingCase.level;
        if (parentId !== undefined && parentId !== existingCase.parentId) {
            if (parentId === null) {
                level = 1;
            } else {
                const parentFolder = await db.query.cases.findFirst({
                    where: and(
                        eq(cases.id, parentId),
                        eq(cases.userId, user.id)
                    ),
                });

                if (!parentFolder) {
                    return { error: "Parent folder not found or unauthorized" };
                }

                if (parentFolder.level >= 3) {
                    return { error: "Folder depth cannot exceed 3 levels" };
                }

                level = parentFolder.level + 1;
            }
        }

        // Update case
        await db.update(cases)
            .set({
                name,
                description: description || null,
                parentId: parentId !== undefined ? parentId : existingCase.parentId,
                level,
            })
            .where(eq(cases.id, caseId));

        // Update addresses
        if (addresses !== undefined) {
            // Delete existing addresses
            await db.delete(monitoredAddresses)
                .where(eq(monitoredAddresses.caseId, caseId));

            // Insert new addresses
            if (addresses.length > 0) {
                const uniqueAddresses = dedupeAddresses(addresses);
                const addressValues = uniqueAddresses.map(addr => ({
                    id: uuidv4(),
                    caseId,
                    address: addr.address,
                    chain: addr.chain,
                    network: addr.network || null,
                    walletName: addr.walletName || null, // 保存钱包名称
                }));

                await db.insert(monitoredAddresses).values(addressValues);
            }
        }

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating case:', error);
        return { error: error.message || "Failed to update folder" };
    }
}
