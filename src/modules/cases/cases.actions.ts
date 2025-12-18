'use server';

import { z } from 'zod';
import { db } from '@/data/db';
import { cases } from '@/data/schema/cases';
import { monitoredAddresses } from '@/data/schema/addresses';
import { getCurrentUser } from '@/modules/auth/auth.actions';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { redirect } from '@/i18n/routing';
import { createCaseSchema, CreateCaseInput } from './cases.schema';

export async function createCaseAction(input: CreateCaseInput) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const val = createCaseSchema.safeParse(input);
    if (!val.success) {
        return { error: val.error.format() };
    }
    const { name, description, addresses } = val.data;

    const caseId = uuidv4();

    try {
        await db.transaction(async (tx) => {
            // 1. Create Case
            await tx.insert(cases).values({
                id: caseId,
                userId: user.id,
                name,
                description,
                status: 'active',
            });

            // 2. Insert Addresses
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
        return { success: true, caseId };
    } catch (error) {
        console.error("Failed to create case:", error);
        return { error: "Failed to create case" };
    }
}

export async function getUserCases() {
    const user = await getCurrentUser();
    if (!user) return [];

    return await db.query.cases.findMany({
        where: eq(cases.userId, user.id),
        orderBy: [desc(cases.createdAt)],
    });
}

export async function getCaseDetails(caseId: string) {
    const user = await getCurrentUser();
    if (!user) return null;

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
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    try {
        const deleted = await db.delete(cases)
            .where(
                // Ensure only the owner can delete
                // Combined check: ID matches AND User matches
                // Note: Drizzle delete returning logic might vary by driver, so we rely on where clause security
                db.eq(cases.id, caseId) && db.eq(cases.userId, user.id) as any
            );

        // Explicitly check ownership before delete if needed, but the AND condition in WHERE is safer
        // Re-implementing with explicit check for clarity
        const existing = await db.query.cases.findFirst({
            where: eq(cases.id, caseId),
        });

        if (!existing || existing.userId !== user.id) {
            return { error: "Case not found or unauthorized" };
        }

        await db.delete(cases).where(eq(cases.id, caseId));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete case:", error);
        return { error: "Failed to delete case" };
    }
}

export async function updateCaseAction(caseId: string, input: CreateCaseInput) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const val = createCaseSchema.safeParse(input);
    if (!val.success) {
        return { error: val.error.format() };
    }
    const { name, description, addresses } = val.data;

    try {
        const existing = await db.query.cases.findFirst({
            where: eq(cases.id, caseId),
        });

        if (!existing || existing.userId !== user.id) {
            return { error: "Case not found or unauthorized" };
        }

        await db.transaction(async (tx) => {
            // 1. Update Case Details
            await tx.update(cases).set({
                name,
                description,
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
        console.error("Failed to update case:", error);
        return { error: "Failed to update case" };
    }
}
