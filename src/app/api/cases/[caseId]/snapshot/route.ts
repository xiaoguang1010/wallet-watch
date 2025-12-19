import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/data/db';
import { cases } from '@/data/schema/cases';
import { monitoredAddresses } from '@/data/schema/addresses';
import { eq } from 'drizzle-orm';
import { createBalanceSnapshots } from '@/modules/alerts/balance-snapshot.service';
import { detectAlerts } from '@/modules/alerts/alert-detection.service';
import type { BalanceSnapshotData } from '@/modules/alerts/balance-snapshot.service';

/**
 * POST /api/cases/[caseId]/snapshot
 * 创建余额快照并检测提醒
 * 
 * 请求体:
 * {
 *   "snapshots": [
 *     {
 *       "addressId": "xxx",
 *       "balanceData": { ... }
 *     }
 *   ]
 * }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await params;

        // 检查用户认证
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_user_id")?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // 验证 case 所有权
        const caseData = await db.query.cases.findFirst({
            where: eq(cases.id, caseId),
        });

        if (!caseData || caseData.userId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Case not found' },
                { status: 404 }
            );
        }

        // 解析请求体
        const body = await request.json();
        const { snapshots } = body;

        if (!Array.isArray(snapshots) || snapshots.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Snapshots array is required' },
                { status: 400 }
            );
        }

        // 创建快照
        const snapshotResult = await createBalanceSnapshots(caseId, snapshots);

        if (!snapshotResult.success) {
            return NextResponse.json(
                { success: false, error: snapshotResult.error },
                { status: 500 }
            );
        }

        // 检测提醒（异步，不阻塞响应）
        const detectedAlerts = [];
        for (const snapshot of snapshots) {
            const alertResult = await detectAlerts(
                caseId,
                snapshot.addressId,
                snapshot.balanceData as BalanceSnapshotData
            );

            if (alertResult.success && alertResult.alerts) {
                detectedAlerts.push(...alertResult.alerts);
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                snapshotsCreated: snapshots.length,
                alertsTriggered: detectedAlerts.length,
                alerts: detectedAlerts,
            },
        });
    } catch (error: any) {
        console.error('Error in snapshot API route:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to create snapshot',
            },
            { status: 500 }
        );
    }
}

