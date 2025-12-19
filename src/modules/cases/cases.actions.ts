'use server';

import { z } from 'zod';
import { db } from '@/data/db';
import { cases } from '@/data/schema/cases';
import { monitoredAddresses } from '@/data/schema/addresses';
import { getCurrentUser } from '@/modules/auth/auth.actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and } from 'drizzle-orm';
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

        await db.transaction(async (tx) => {
            // 1. Create Folder
            await tx.insert(cases).values({
                id: caseId,
                userId: user.id,
                name,
                description,
                parentId: parentId || null,
                level,
                status: 'active',
            });

            // 2. Insert Addresses (optional)
            if (addresses && addresses.length > 0) {
                await tx.insert(monitoredAddresses).values(
                    addresses.map(addr => ({
                        id: uuidv4(),
                        caseId: caseId,
                        address: addr.address,
                        chain: addr.chain,
                        network: addr.network || 'L1',
                    }))
                );
            }
        });

        revalidatePath('/dashboard');
        return { success: true, caseId };
    } catch (error) {
        console.error("Failed to create folder:", error);
        return { error: "Failed to create folder" };
    }
}

// Get all user folders as flat list (for tree building)
export async function getUserCases() {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return [];
    const user = userResult.data;

    return await db.query.cases.findMany({
        where: eq(cases.userId, user.id),
        orderBy: [desc(cases.createdAt)],
    });
}

// Build tree structure from flat list
export type FolderNode = {
    id: string;
    name: string;
    level: number;
    parentId: string | null;
    children: FolderNode[];
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
};

export async function getUserCasesTree(): Promise<FolderNode[]> {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return [];
    const user = userResult.data;

    const folders = await db.query.cases.findMany({
        where: eq(cases.userId, user.id),
        orderBy: [desc(cases.createdAt)],
    });

    // Build tree
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // First pass: create all nodes
    folders.forEach(folder => {
        folderMap.set(folder.id, {
            id: folder.id,
            name: folder.name,
            level: folder.level,
            parentId: folder.parentId,
            description: folder.description,
            status: folder.status,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
            children: [],
        });
    });

    // Second pass: build tree structure
    folders.forEach(folder => {
        const node = folderMap.get(folder.id)!;
        if (folder.parentId) {
            const parent = folderMap.get(folder.parentId);
            if (parent) {
                parent.children.push(node);
            }
        } else {
            rootFolders.push(node);
        }
    });

    return rootFolders;
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
    } catch (error) {
        console.error("Failed to delete case:", error);
        return { error: "Failed to delete case" };
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
        const existing = await db.query.cases.findFirst({
            where: eq(cases.id, caseId),
        });

        if (!existing || existing.userId !== user.id) {
            return { error: "Folder not found or unauthorized" };
        }

        // If parentId is being changed, validate the new parent
        let level = existing.level;
        if (parentId !== undefined && parentId !== existing.parentId) {
            if (parentId) {
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

                // Check if moving to a child (circular reference)
                if (parentId === caseId) {
                    return { error: "Cannot move folder to itself" };
                }

                level = parentFolder.level + 1;
            } else {
                level = 1; // Moving to root
            }
        }

        await db.transaction(async (tx) => {
            // 1. Update Folder Details
            await tx.update(cases).set({
                name,
                description,
                parentId: parentId || null,
                level,
                updatedAt: new Date(),
            }).where(eq(cases.id, caseId));

            // 2. Replace Addresses (Delete All + Insert New)
            await tx.delete(monitoredAddresses).where(eq(monitoredAddresses.caseId, caseId));

            if (addresses.length > 0) {
                await tx.insert(monitoredAddresses).values(
                    addresses.map(addr => ({
                        id: uuidv4(),
                        caseId: caseId,
                        address: addr.address,
                        chain: addr.chain,
                        network: addr.network || 'L1',
                    }))
                );
            }
        });

        revalidatePath('/dashboard');
        revalidatePath(`/dashboard/cases/${caseId}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to update folder:", error);
        return { error: "Failed to update folder" };
    }
}
