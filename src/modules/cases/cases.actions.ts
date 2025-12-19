'use server';

import { z } from 'zod';
import { db } from '@/data/db';
import { cases } from '@/data/schema/cases';
import { monitoredAddresses } from '@/data/schema/addresses';
import { getCurrentUser } from '@/modules/auth/auth.actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { redirect } from '@/i18n/routing';
import { createCaseSchema, CreateCaseInput } from './cases.schema';

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

            // Check depth limit (max 3 levels)
            if (parentFolder.level >= 3) {
                return { error: "Folder depth cannot exceed 3 levels" };
            }

            level = parentFolder.level + 1;
        }

        // Create the case
        await db.insert(cases).values({
            id: caseId,
            userId: user.id,
            name,
            description: description || null,
            parentId: parentId || null,
            level,
            status: 'active',
        });

        // Insert addresses if provided
        if (addresses && addresses.length > 0) {
            const addressValues = addresses.map(addr => ({
                id: uuidv4(),
                caseId,
                address: addr.address,
                chain: addr.chain,
                network: addr.network || null,
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

    const allCases = await db.query.cases.findMany({
        where: eq(cases.userId, user.id),
        orderBy: [desc(cases.createdAt)],
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

    // Calculate address counts recursively
    const calculateAddressCounts = async (node: FolderNode): Promise<number> => {
        // Get direct addresses for this case
        const directAddresses = await db.query.monitoredAddresses.findMany({
            where: eq(monitoredAddresses.caseId, node.id),
        });
        let count = directAddresses.length;

        // Add children's addresses recursively
        for (const child of node.children) {
            count += await calculateAddressCounts(child);
        }

        node.addressCount = count;
        return count;
    };

    for (const root of rootNodes) {
        await calculateAddressCounts(root);
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
    const user = await getCurrentUser();
    if (!user) return [];

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

    const addresses = await db.query.monitoredAddresses.findMany({
        where: eq(monitoredAddresses.caseId, caseId),
    });

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
        // Ensure only the owner can delete
        const result = await db.delete(cases)
            .where(
                and(
                    eq(cases.id, caseId),
                    eq(cases.userId, user.id)
                )
            );

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting case:', error);
        return { error: error.message || "Failed to delete folder" };
    }
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
                const addressValues = addresses.map(addr => ({
                    id: uuidv4(),
                    caseId,
                    address: addr.address,
                    chain: addr.chain,
                    network: addr.network || null,
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
