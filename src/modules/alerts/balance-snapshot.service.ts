/**
 * 余额快照服务
 * 用于保存和查询余额历史记录
 */

import { db } from '@/data/db';
import { balanceSnapshots } from '@/data/schema/balance-snapshots';
import { eq, desc, and, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface BalanceSnapshotData {
    tokens: Array<{
        symbol: string;
        balance: string;
        formattedBalance: string;
        usdValue: number;
        [key: string]: any;
    }>;
    totalValue: number;
    totalValueFormatted: string;
    chain?: string;
    address?: string;
}

/**
 * 创建余额快照
 */
export async function createBalanceSnapshot(
    caseId: string,
    addressId: string,
    balanceData: BalanceSnapshotData
) {
    try {
        const snapshot = await db.insert(balanceSnapshots).values({
            id: uuidv4(),
            caseId,
            addressId,
            balanceData: JSON.stringify(balanceData),
            totalValue: balanceData.totalValue.toString(),
            snapshotAt: new Date(),
        });

        return { success: true, snapshot };
    } catch (error: any) {
        console.error('Error creating balance snapshot:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 批量创建余额快照
 */
export async function createBalanceSnapshots(
    caseId: string,
    snapshots: Array<{ addressId: string; balanceData: BalanceSnapshotData }>
) {
    try {
        const values = snapshots.map(({ addressId, balanceData }) => ({
            id: uuidv4(),
            caseId,
            addressId,
            balanceData: JSON.stringify(balanceData),
            totalValue: balanceData.totalValue.toString(),
            snapshotAt: new Date(),
        }));

        await db.insert(balanceSnapshots).values(values);

        return { success: true };
    } catch (error: any) {
        console.error('Error creating balance snapshots:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取地址的最新快照
 */
export async function getLatestSnapshot(caseId: string, addressId: string) {
    try {
        const snapshot = await db.query.balanceSnapshots.findFirst({
            where: and(
                eq(balanceSnapshots.caseId, caseId),
                eq(balanceSnapshots.addressId, addressId)
            ),
            orderBy: [desc(balanceSnapshots.snapshotAt)],
        });

        if (!snapshot) {
            return { success: true, data: null };
        }

        return {
            success: true,
            data: {
                ...snapshot,
                balanceData: JSON.parse(snapshot.balanceData) as BalanceSnapshotData,
            },
        };
    } catch (error: any) {
        console.error('Error getting latest snapshot:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取地址在指定时间范围内的快照
 */
export async function getSnapshotsInTimeRange(
    caseId: string,
    addressId: string,
    startTime: Date,
    endTime: Date
) {
    try {
        const snapshots = await db.query.balanceSnapshots.findMany({
            where: and(
                eq(balanceSnapshots.caseId, caseId),
                eq(balanceSnapshots.addressId, addressId),
                gte(balanceSnapshots.snapshotAt, startTime)
            ),
            orderBy: [desc(balanceSnapshots.snapshotAt)],
        });

        // 过滤结束时间
        const filtered = snapshots.filter(
            (s) => s.snapshotAt >= startTime && s.snapshotAt <= endTime
        );

        return {
            success: true,
            data: filtered.map((snapshot) => ({
                ...snapshot,
                balanceData: JSON.parse(snapshot.balanceData) as BalanceSnapshotData,
            })),
        };
    } catch (error: any) {
        console.error('Error getting snapshots in time range:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取 case 的所有地址的最新快照
 */
export async function getLatestSnapshotsForCase(caseId: string) {
    try {
        const snapshots = await db.query.balanceSnapshots.findMany({
            where: eq(balanceSnapshots.caseId, caseId),
            orderBy: [desc(balanceSnapshots.snapshotAt)],
        });

        // 按地址分组，取每个地址的最新快照
        const latestByAddress = new Map();
        snapshots.forEach((snapshot) => {
            if (!latestByAddress.has(snapshot.addressId)) {
                latestByAddress.set(snapshot.addressId, snapshot);
            }
        });

        const result = Array.from(latestByAddress.values()).map((snapshot) => ({
            ...snapshot,
            balanceData: JSON.parse(snapshot.balanceData) as BalanceSnapshotData,
        }));

        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error getting latest snapshots for case:', error);
        return { success: false, error: error.message };
    }
}

