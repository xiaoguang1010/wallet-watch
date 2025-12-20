import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/data/db';
import { cases } from '@/data/schema/cases';
import { getCurrentUser } from '@/modules/auth/auth.actions';
import { eq, and, inArray } from 'drizzle-orm';

export async function POST(req: NextRequest) {
    try {
        const userResult = await getCurrentUser();
        if (!userResult.success || !userResult.data) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = userResult.data;

        const { parentId, orderedIds } = await req.json();

        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return NextResponse.json({ error: 'orderedIds is required' }, { status: 400 });
        }

        // Fetch cases to validate ownership and parent
        const items = await db.query.cases.findMany({
            where: and(
                inArray(cases.id, orderedIds),
                eq(cases.userId, user.id)
            ),
        });

        if (items.length !== orderedIds.length) {
            return NextResponse.json({ error: 'Invalid case ids' }, { status: 400 });
        }

        // Ensure same parent
        const expectedParent = parentId || null;
        const sameParent = items.every((c) => (c.parentId || null) === expectedParent);
        if (!sameParent) {
            return NextResponse.json({ error: 'Cases must share the same parent' }, { status: 400 });
        }

        // Update positions sequentially within a transaction
        await db.transaction(async (tx) => {
            for (let i = 0; i < orderedIds.length; i++) {
                await tx
                    .update(cases)
                    .set({ position: i + 1 })
                    .where(eq(cases.id, orderedIds[i]));
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to reorder cases:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

