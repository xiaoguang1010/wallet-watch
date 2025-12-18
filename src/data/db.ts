import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "@/config/env";
import * as users from "./schema/users";
import * as authenticators from "./schema/authenticators";

const poolConnection = mysql.createPool({
    uri: env.DATABASE_URL,
});

export const db = drizzle(poolConnection, {
    mode: "default",
    schema: { ...users, ...authenticators },
});
