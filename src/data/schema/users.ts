import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
    id: varchar("id", { length: 36 }).primaryKey(),
    username: varchar("username", { length: 50 }).unique().notNull(),
    displayName: varchar("display_name", { length: 100 }),
    avatarUrl: varchar("avatar_url", { length: 1024 }),
    currentChallenge: varchar("current_challenge", { length: 255 }),
    locale: varchar("locale", { length: 10 }).default("zh").notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});
