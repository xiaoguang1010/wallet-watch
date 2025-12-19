/**
 * 提醒检测服务
 * 检测余额变化并触发相应的提醒规则
 */

import { db } from '@/data/db';
import { alertRules, alerts, balanceSnapshots } from '@/data/schema/balance-snapshots';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getLatestSnapshot, getSnapshotsInTimeRange, BalanceSnapshotData } from './balance-snapshot.service';
import type {
    AlertRuleType,
    LargeTransferRuleConfig,
    BalanceVolatilityRuleConfig,
    AssetEmptiedRuleConfig,
    AddressRiskRuleConfig,
} from './alert-rules.schema';

export interface AlertDetails {
    previousValue: number;
    currentValue: number;
    changeAmount: number;
    changePercentage: number;
    previousSnapshot?: any;
    currentSnapshot?: any;
    [key: string]: any;
}

/**
 * 检测所有启用的提醒规则
 */
export async function detectAlerts(
    caseId: string,
    addressId: string,
    currentBalance: BalanceSnapshotData
) {
    try {
        // 获取该 case 的所有启用规则
        const rules = await db.query.alertRules.findMany({
            where: and(
                eq(alertRules.caseId, caseId),
                eq(alertRules.enabled, 1) // enabled 是 int 类型，1 表示 true
            ),
        });

        const triggeredAlerts = [];

        for (const rule of rules) {
            const config = JSON.parse(rule.config);
            let alert: any = null;

            switch (rule.ruleType) {
                case 'large_outflow':
                    alert = await detectLargeOutflow(
                        caseId,
                        addressId,
                        currentBalance,
                        config as LargeTransferRuleConfig
                    );
                    break;
                case 'large_inflow':
                    alert = await detectLargeInflow(
                        caseId,
                        addressId,
                        currentBalance,
                        config as LargeTransferRuleConfig
                    );
                    break;
                case 'balance_volatility':
                    alert = await detectBalanceVolatility(
                        caseId,
                        addressId,
                        currentBalance,
                        config as BalanceVolatilityRuleConfig
                    );
                    break;
                case 'asset_emptied':
                    alert = await detectAssetEmptied(
                        caseId,
                        addressId,
                        currentBalance,
                        config as AssetEmptiedRuleConfig
                    );
                    break;
                case 'address_risk':
                    alert = await detectAddressRisk(
                        caseId,
                        addressId,
                        currentBalance,
                        config as AddressRiskRuleConfig
                    );
                    break;
            }

            if (alert) {
                // 创建提醒记录
                await createAlert({
                    caseId,
                    addressId,
                    ruleId: rule.id,
                    alertType: rule.ruleType as AlertRuleType,
                    title: alert.title,
                    message: alert.message,
                    details: alert.details,
                    severity: alert.severity || 'warning',
                });

                triggeredAlerts.push(alert);
            }
        }

        return { success: true, alerts: triggeredAlerts };
    } catch (error: any) {
        console.error('Error detecting alerts:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 检测大额转出
 */
async function detectLargeOutflow(
    caseId: string,
    addressId: string,
    currentBalance: BalanceSnapshotData,
    config: LargeTransferRuleConfig
): Promise<any | null> {
    const latest = await getLatestSnapshot(caseId, addressId);
    if (!latest.success || !latest.data) {
        return null; // 没有历史快照，无法比较
    }

    const previous = latest.data.balanceData as BalanceSnapshotData;
    const changeAmount = previous.totalValue - currentBalance.totalValue;

    // 检测转出（余额减少）且超过阈值
    if (changeAmount > 0 && changeAmount >= config.threshold) {
        const changePercentage = (changeAmount / previous.totalValue) * 100;

        return {
            title: '大额转出提醒',
            message: `检测到单笔转出 $${changeAmount.toFixed(2)} (${changePercentage.toFixed(2)}%)`,
            details: {
                previousValue: previous.totalValue,
                currentValue: currentBalance.totalValue,
                changeAmount,
                changePercentage,
                threshold: config.threshold,
                previousSnapshot: previous,
                currentSnapshot: currentBalance,
            },
            severity: 'error', // 安全型，使用 error 级别
        };
    }

    return null;
}

/**
 * 检测大额转入
 */
async function detectLargeInflow(
    caseId: string,
    addressId: string,
    currentBalance: BalanceSnapshotData,
    config: LargeTransferRuleConfig
): Promise<any | null> {
    const latest = await getLatestSnapshot(caseId, addressId);
    if (!latest.success || !latest.data) {
        return null;
    }

    const previous = latest.data.balanceData as BalanceSnapshotData;
    const changeAmount = currentBalance.totalValue - previous.totalValue;

    // 检测转入（余额增加）且超过阈值
    if (changeAmount > 0 && changeAmount >= config.threshold) {
        const changePercentage = (changeAmount / previous.totalValue) * 100;

        return {
            title: '大额转入提醒',
            message: `检测到单笔转入 $${changeAmount.toFixed(2)} (${changePercentage.toFixed(2)}%)`,
            details: {
                previousValue: previous.totalValue,
                currentValue: currentBalance.totalValue,
                changeAmount,
                changePercentage,
                threshold: config.threshold,
                previousSnapshot: previous,
                currentSnapshot: currentBalance,
            },
            severity: 'info', // 信息型，使用 info 级别
        };
    }

    return null;
}

/**
 * 检测余额异常波动
 */
async function detectBalanceVolatility(
    caseId: string,
    addressId: string,
    currentBalance: BalanceSnapshotData,
    config: BalanceVolatilityRuleConfig
): Promise<any | null> {
    const now = new Date();
    const startTime = new Date(now.getTime() - config.timeWindow * 60 * 1000);

    const snapshotsResult = await getSnapshotsInTimeRange(
        caseId,
        addressId,
        startTime,
        now
    );

    if (!snapshotsResult.success || !snapshotsResult.data || snapshotsResult.data.length === 0) {
        return null;
    }

    // 找到时间范围内的最早快照
    const oldestSnapshot = snapshotsResult.data[snapshotsResult.data.length - 1];
    const oldestBalance = oldestSnapshot.balanceData as BalanceSnapshotData;

    // 计算变化百分比
    const changeAmount = Math.abs(currentBalance.totalValue - oldestBalance.totalValue);
    const changePercentage = oldestBalance.totalValue > 0
        ? (changeAmount / oldestBalance.totalValue) * 100
        : 0;

    // 检测是否超过阈值
    if (changePercentage >= config.percentage) {
        const isIncrease = currentBalance.totalValue > oldestBalance.totalValue;

        return {
            title: '余额异常波动提醒',
            message: `在 ${config.timeWindow} 分钟内余额${isIncrease ? '增加' : '减少'}了 ${changePercentage.toFixed(2)}% ($${changeAmount.toFixed(2)})`,
            details: {
                previousValue: oldestBalance.totalValue,
                currentValue: currentBalance.totalValue,
                changeAmount,
                changePercentage,
                timeWindow: config.timeWindow,
                threshold: config.percentage,
                previousSnapshot: oldestBalance,
                currentSnapshot: currentBalance,
            },
            severity: 'warning',
        };
    }

    return null;
}

/**
 * 检测资产被清空
 */
async function detectAssetEmptied(
    caseId: string,
    addressId: string,
    currentBalance: BalanceSnapshotData,
    config: AssetEmptiedRuleConfig
): Promise<any | null> {
    const latest = await getLatestSnapshot(caseId, addressId);
    if (!latest.success || !latest.data) {
        return null;
    }

    const previous = latest.data.balanceData as BalanceSnapshotData;

    // 情况1: 余额从非零变为接近0
    const wasNonZero = previous.totalValue > config.threshold;
    const isNowZero = currentBalance.totalValue <= config.threshold;

    if (wasNonZero && isNowZero) {
        return {
            title: '资产被清空提醒',
            message: `余额从 $${previous.totalValue.toFixed(2)} 降至 $${currentBalance.totalValue.toFixed(2)}`,
            details: {
                previousValue: previous.totalValue,
                currentValue: currentBalance.totalValue,
                changeAmount: previous.totalValue - currentBalance.totalValue,
                changePercentage: 100,
                threshold: config.threshold,
                previousSnapshot: previous,
                currentSnapshot: currentBalance,
            },
            severity: 'error',
        };
    }

    // 情况2: 短时间内余额减少超过阈值百分比
    if (config.percentage) {
        const changeAmount = previous.totalValue - currentBalance.totalValue;
        const changePercentage = previous.totalValue > 0
            ? (changeAmount / previous.totalValue) * 100
            : 0;

        if (changePercentage >= config.percentage && changeAmount > 0) {
            return {
                title: '资产大幅减少提醒',
                message: `余额在短时间内减少了 ${changePercentage.toFixed(2)}% ($${changeAmount.toFixed(2)})`,
                details: {
                    previousValue: previous.totalValue,
                    currentValue: currentBalance.totalValue,
                    changeAmount,
                    changePercentage,
                    threshold: config.percentage,
                    previousSnapshot: previous,
                    currentSnapshot: currentBalance,
                },
                severity: 'error',
            };
        }
    }

    return null;
}

/**
 * 创建提醒记录
 */
async function createAlert(data: {
    caseId: string;
    addressId: string;
    ruleId: string | null;
    alertType: AlertRuleType;
    title: string;
    message: string;
    details: AlertDetails;
    severity: 'info' | 'warning' | 'error';
}) {
    try {
        await db.insert(alerts).values({
            id: uuidv4(),
            caseId: data.caseId,
            addressId: data.addressId,
            ruleId: data.ruleId,
            alertType: data.alertType,
            title: data.title,
            message: data.message,
            details: JSON.stringify(data.details),
            severity: data.severity,
            isRead: 0, // isRead 是 int 类型，0 表示 false
            triggeredAt: new Date(),
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error creating alert:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 检测地址风险等级
 */
async function detectAddressRisk(
    caseId: string,
    addressId: string,
    currentBalance: BalanceSnapshotData,
    config: AddressRiskRuleConfig
): Promise<any | null> {
    // 从余额数据中获取风险信息
    // 注意：需要检查 API 返回的数据结构中是否包含风险字段
    // 如果 API 返回的数据中包含 risk 或 riskLevel 字段，则使用它
    const riskLevel = (currentBalance as any).riskLevel || (currentBalance as any).risk || null;
    
    if (riskLevel === null || riskLevel === undefined) {
        // 如果当前快照没有风险信息，检查是否是新增地址
        if (config.alertOnNewAddress) {
            const latest = await getLatestSnapshot(caseId, addressId);
            if (!latest.success || !latest.data) {
                // 这是新增地址，且配置了新增地址提醒
                return {
                    title: '新增地址提醒',
                    message: `检测到新增地址，请确认地址安全性`,
                    details: {
                        addressId,
                        isNewAddress: true,
                        currentSnapshot: currentBalance,
                    },
                    severity: 'warning',
                };
            }
        }
        return null;
    }
    
    // 检查风险等级是否在需要提醒的列表中
    if (config.riskLevels.includes(riskLevel)) {
        const riskLevelNames: { [key: number]: string } = {
            1: '低风险',
            2: '中低风险',
            3: '中风险',
            4: '中高风险',
            5: '高风险',
        };
        
        const riskName = riskLevelNames[riskLevel] || `风险等级 ${riskLevel}`;
        
        return {
            title: '地址风险提醒',
            message: `检测到地址风险等级为：${riskName} (等级 ${riskLevel})`,
            details: {
                addressId,
                riskLevel,
                riskName,
                currentSnapshot: currentBalance,
            },
            severity: riskLevel >= 4 ? 'error' : 'warning',
        };
    }
    
    return null;
}

