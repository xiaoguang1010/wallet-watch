'use server';

import { db } from '@/data/db';
import { alerts, alertRules } from '@/data/schema/balance-snapshots';
import { cases } from '@/data/schema/cases';
import { getCurrentUser } from '@/modules/auth/auth.actions';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createAlertRuleSchema, type CreateAlertRuleInput } from './alert-rules.schema';
import { v4 as uuidv4 } from 'uuid';

async function getCaseAndDescendantCaseIds(caseId: string, userId: string): Promise<string[]> {
    const visited = new Set<string>();
    const queue: string[] = [caseId];
    visited.add(caseId);

    while (queue.length > 0) {
        const batch = queue.splice(0, 50);
        const children = await db
            .select({ id: cases.id })
            .from(cases)
            .where(and(eq(cases.userId, userId), inArray(cases.parentId, batch)));

        for (const row of children) {
            const id = row.id;
            if (!visited.has(id)) {
                visited.add(id);
                queue.push(id);
            }
        }
    }

    return Array.from(visited);
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of items) map.set(item.id, item);
    return Array.from(map.values());
}

/**
 * 获取 case 的所有提醒
 */
export async function getCaseAlerts(caseId: string) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return null;

    try {
        // Include alerts from this case AND all descendant cases (sub folders).
        const caseIds = await getCaseAndDescendantCaseIds(caseId, userResult.data.id);
        const alertsList = await db.query.alerts.findMany({
            where: inArray(alerts.caseId, caseIds),
            orderBy: [desc(alerts.triggeredAt)],
            limit: 50, // 最多返回50条
        });

        const mapped = alertsList.map((alert) => ({
            ...alert,
            details: alert.details ? JSON.parse(alert.details) : null,
        }));
        return dedupeById(mapped);
    } catch (error: any) {
        console.error('Error getting case alerts:', error);
        return [];
    }
}

/**
 * 获取未读提醒数量
 */
export async function getUnreadAlertCount(caseId: string) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return 0;

    try {
        const caseIds = await getCaseAndDescendantCaseIds(caseId, userResult.data.id);
        const unreadAlerts = await db.query.alerts.findMany({
            where: and(
                inArray(alerts.caseId, caseIds),
                eq(alerts.isRead, 0) // 0 = false
            ),
        });

        return dedupeById(unreadAlerts).length;
    } catch (error: any) {
        console.error('Error getting unread alert count:', error);
        return 0;
    }
}

/**
 * 标记提醒为已读
 */
export async function markAlertAsRead(alertId: string) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
        return { error: 'Unauthorized' };
    }

    try {
        await db.update(alerts)
            .set({ isRead: 1 }) // 1 = true
            .where(eq(alerts.id, alertId));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error marking alert as read:', error);
        return { error: error.message };
    }
}

/**
 * 标记所有提醒为已读
 */
export async function markAllAlertsAsRead(caseId: string) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
        return { error: 'Unauthorized' };
    }

    try {
        const caseIds = await getCaseAndDescendantCaseIds(caseId, userResult.data.id);
        await db.update(alerts)
            .set({ isRead: 1 }) // 1 = true
            .where(inArray(alerts.caseId, caseIds));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error marking all alerts as read:', error);
        return { error: error.message };
    }
}

/**
 * 创建提醒规则
 */
export async function createAlertRule(input: CreateAlertRuleInput) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
        return { error: 'Unauthorized' };
    }

    const validation = createAlertRuleSchema.safeParse(input);
    if (!validation.success) {
        return { error: validation.error.format() };
    }

    try {
        await db.insert(alertRules).values({
            id: uuidv4(),
            caseId: input.caseId,
            ruleType: input.ruleType,
            name: input.name,
            config: JSON.stringify(input.config),
            enabled: (input.enabled ?? true) ? 1 : 0,
        });

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error creating alert rule:', error);
        return { error: error.message };
    }
}

/**
 * 获取 case 的所有提醒规则
 */
export async function getCaseAlertRules(caseId: string) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) return [];

    try {
        const rules = await db.query.alertRules.findMany({
            where: eq(alertRules.caseId, caseId),
            orderBy: [desc(alertRules.createdAt)],
        });

        return rules.map((rule) => ({
            ...rule,
            config: JSON.parse(rule.config),
        }));
    } catch (error: any) {
        console.error('Error getting alert rules:', error);
        return [];
    }
}

/**
 * 更新提醒规则
 */
export async function updateAlertRule(ruleId: string, input: Partial<CreateAlertRuleInput>) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
        return { error: 'Unauthorized' };
    }

    try {
        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.config) updateData.config = JSON.stringify(input.config);
        if (input.enabled !== undefined) updateData.enabled = input.enabled ? 1 : 0;

        await db.update(alertRules)
            .set(updateData)
            .where(eq(alertRules.id, ruleId));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating alert rule:', error);
        return { error: error.message };
    }
}

/**
 * 删除提醒规则
 */
export async function deleteAlertRule(ruleId: string) {
    const userResult = await getCurrentUser();
    if (!userResult.success || !userResult.data) {
        return { error: 'Unauthorized' };
    }

    try {
        await db.delete(alertRules).where(eq(alertRules.id, ruleId));

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting alert rule:', error);
        return { error: error.message };
    }
}

