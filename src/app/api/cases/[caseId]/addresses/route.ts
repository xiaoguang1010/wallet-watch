import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/data/db';
import { monitoredAddresses } from '@/data/schema/addresses';
import { cases } from '@/data/schema/cases';
import { getCurrentUser } from '@/modules/auth/auth.actions';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const addAddressSchema = z.object({
    addresses: z.array(z.object({
        address: z.string().min(1),
        chain: z.enum(["BTC", "ETH", "TRON"]),
        network: z.enum(["L1", "L2"]).optional(),
        walletName: z.string().max(100).optional(), // 钱包名称
    })).min(1),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const userResult = await getCurrentUser();
        if (!userResult.success || !userResult.data) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = userResult.data;

        const { caseId } = await params;
        const body = await request.json();
        
        const validation = addAddressSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // Verify case exists and belongs to user
        const caseData = await db.query.cases.findFirst({
            where: and(
                eq(cases.id, caseId),
                eq(cases.userId, user.id)
            ),
        });

        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        // Add addresses
        const { addresses } = validation.data;
        await db.insert(monitoredAddresses).values(
            addresses.map(addr => ({
                id: uuidv4(),
                caseId: caseId,
                address: addr.address,
                chain: addr.chain,
                network: addr.network || 'L1',
                walletName: addr.walletName || null, // 保存钱包名称
            }))
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to add addresses:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

