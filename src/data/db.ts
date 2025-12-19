import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "@/config/env";
import * as users from "./schema/users";
import * as authenticators from "./schema/authenticators";

import * as cases from "./schema/cases";
import * as addresses from "./schema/addresses";
import * as balanceSnapshots from "./schema/balance-snapshots";

const poolConnection = mysql.createPool({
    uri: env.DATABASE_URL,
});

export const db = drizzle(poolConnection, {
    mode: "default",
    schema: { ...users, ...authenticators, ...cases, ...addresses, ...balanceSnapshots },
});
