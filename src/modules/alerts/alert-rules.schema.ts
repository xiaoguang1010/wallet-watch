import { z } from 'zod';

/**
 * 大额转出/转入规则配置
 */
export const largeTransferRuleSchema = z.object({
    threshold: z.number().min(0, '阈值必须大于0'), // USD
});

/**
 * 余额波动规则配置
 */
export const balanceVolatilityRuleSchema = z.object({
    timeWindow: z.number().min(1, '时间窗口必须大于0'), // 分钟
    percentage: z.number().min(0).max(100, '百分比必须在0-100之间'), // 百分比
});

/**
 * 资产清空规则配置
 */
export const assetEmptiedRuleSchema = z.object({
    threshold: z.number().min(0, '阈值必须大于0'), // USD，余额低于此值视为清空
    percentage: z.number().min(0).max(100, '百分比必须在0-100之间').optional(), // 可选：短时间内减少百分比
});

/**
 * 风险等级提醒规则配置
 */
export const addressRiskRuleSchema = z.object({
    riskLevels: z.array(z.number()).min(1, '至少需要指定一个风险等级'), // 需要提醒的风险等级列表，例如 [3, 4, 5] 表示高风险
    alertOnNewAddress: z.boolean().default(true), // 新增地址时是否立即提醒
});

/**
 * 提醒规则类型
 */
export const alertRuleTypeSchema = z.enum([
    'large_outflow',      // 大额转出
    'large_inflow',       // 大额转入
    'balance_volatility', // 余额波动
    'asset_emptied',      // 资产清空
    'address_risk',       // 地址风险等级
]);

/**
 * 创建提醒规则的输入 Schema
 */
export const createAlertRuleSchema = z.object({
    caseId: z.string().min(1, 'Case ID 是必需的'),
    ruleType: alertRuleTypeSchema,
    name: z.string().min(1, '规则名称是必需的').max(255),
    config: z.union([
        largeTransferRuleSchema,
        balanceVolatilityRuleSchema,
        assetEmptiedRuleSchema,
        addressRiskRuleSchema,
    ]),
    enabled: z.boolean().default(true),
});

export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type LargeTransferRuleConfig = z.infer<typeof largeTransferRuleSchema>;
export type BalanceVolatilityRuleConfig = z.infer<typeof balanceVolatilityRuleSchema>;
export type AssetEmptiedRuleConfig = z.infer<typeof assetEmptiedRuleSchema>;
export type AddressRiskRuleConfig = z.infer<typeof addressRiskRuleSchema>;
export type AlertRuleType = z.infer<typeof alertRuleTypeSchema>;

