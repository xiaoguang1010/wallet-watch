import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { cases } from "./cases";

export const monitoredAddresses = mysqlTable("monitored_addresses", {
    id: varchar("id", { length: 36 }).primaryKey(),
    caseId: varchar("case_id", { length: 36 }).references(() => cases.id, { onDelete: 'cascade' }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    chain: varchar("chain", { length: 20 }).notNull(),   // BTC, ETH, TRON
    network: varchar("network", { length: 20 }),         // L1, L2
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});
