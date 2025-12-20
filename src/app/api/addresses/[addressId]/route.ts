import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/data/db';
import { monitoredAddresses } from '@/data/schema/addresses';
import { cases } from '@/data/schema/cases';
import { getCurrentUser } from '@/modules/auth/auth.actions';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ addressId: string }> }
) {
    try {
        const userResult = await getCurrentUser();
        if (!userResult.success || !userResult.data) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = userResult.data;
        const { addressId } = await params;

        // 确认该地址属于当前用户的分组
        const addr = await db.query.monitoredAddresses.findFirst({
            where: eq(monitoredAddresses.id, addressId),
        });

        if (!addr) {
            return NextResponse.json({ error: 'Address not found' }, { status: 404 });
        }

        const caseRow = await db.query.cases.findFirst({
            where: and(eq(cases.id, addr.caseId), eq(cases.userId, user.id)),
        });

        if (!caseRow) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await db.delete(monitoredAddresses).where(eq(monitoredAddresses.id, addressId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete address:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

