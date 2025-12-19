import { mysqlTable, varchar, decimal, text, timestamp, int } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { cases } from "./cases";
import { monitoredAddresses } from "./addresses";

/**
 * 余额快照表
 * 用于存储每个地址的余额历史记录，用于检测余额变化和触发提醒
 */
export const balanceSnapshots = mysqlTable("balance_snapshots", {
    id: varchar("id", { length: 36 }).primaryKey(),
    caseId: varchar("case_id", { length: 36 }).references(() => cases.id, { onDelete: 'cascade' }).notNull(),
    addressId: varchar("address_id", { length: 36 }).references(() => monitoredAddresses.id, { onDelete: 'cascade' }).notNull(),
    
    // 余额数据（JSON 格式存储所有代币信息）
    // 格式: { tokens: [{ symbol, balance, usdValue, ... }], totalValue: number }
    balanceData: text("balance_data").notNull(),
    
    // 总价值（USD）
    totalValue: decimal("total_value", { precision: 20, scale: 2 }).notNull(),
    
    // 快照时间
    snapshotAt: timestamp("snapshot_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

/**
 * 提醒规则表
 * 存储用户配置的提醒策略
 */
export const alertRules = mysqlTable("alert_rules", {
    id: varchar("id", { length: 36 }).primaryKey(),
    caseId: varchar("case_id", { length: 36 }).references(() => cases.id, { onDelete: 'cascade' }).notNull(),
    
    // 规则类型: 'large_outflow' | 'large_inflow' | 'balance_volatility' | 'asset_emptied'
    ruleType: varchar("rule_type", { length: 50 }).notNull(),
    
    // 规则名称
    name: varchar("name", { length: 255 }).notNull(),
    
    // 规则配置（JSON 格式）
    // 大额转出/转入: { threshold: 1000 } // USD
    // 余额波动: { timeWindow: 15, percentage: 20 } // 15分钟内20%
    // 资产清空: { threshold: 0.01 } // 余额低于此值视为清空
    config: text("config").notNull(),
    
    // 是否启用 (0 = false, 1 = true)
    enabled: int("enabled").default(1).notNull(),
    
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

/**
 * 提醒记录表
 * 存储触发的提醒
 */
export const alerts = mysqlTable("alerts", {
    id: varchar("id", { length: 36 }).primaryKey(),
    caseId: varchar("case_id", { length: 36 }).references(() => cases.id, { onDelete: 'cascade' }).notNull(),
    addressId: varchar("address_id", { length: 36 }).references(() => monitoredAddresses.id, { onDelete: 'cascade' }),
    ruleId: varchar("rule_id", { length: 36 }).references(() => alertRules.id, { onDelete: 'set null' }),
    
    // 提醒类型
    alertType: varchar("alert_type", { length: 50 }).notNull(),
    
    // 提醒标题
    title: varchar("title", { length: 255 }).notNull(),
    
    // 提醒消息
    message: text("message").notNull(),
    
    // 提醒详情（JSON 格式）
    // 包含：变化金额、变化百分比、前一个快照、当前快照等
    details: text("details"),
    
    // 严重程度: 'info' | 'warning' | 'error'
    severity: varchar("severity", { length: 20 }).default('warning').notNull(),
    
    // 是否已读 (0 = false, 1 = true)
    isRead: int("is_read").default(0).notNull(),
    
    // 触发时间
    triggeredAt: timestamp("triggered_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

