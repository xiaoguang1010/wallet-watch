import { mysqlTable, varchar, text, timestamp, int } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const cases = mysqlTable("cases", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    parentId: varchar("parent_id", { length: 36 }),
    level: int("level").notNull().default(1), // 1, 2, or 3
    status: varchar("status", { length: 20 }).default('active').notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});
