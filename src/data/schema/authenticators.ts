import { mysqlTable, varchar, text, bigint } from "drizzle-orm/mysql-core";
import { users } from "./users";

export const authenticators = mysqlTable("authenticators", {
    id: varchar("id", { length: 36 }).primaryKey(),
    credentialID: text("credential_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: bigint("counter", { mode: "number" }).notNull(),
    transports: varchar("transports", { length: 255 }),
    userId: varchar("user_id", { length: 36 })
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
});
