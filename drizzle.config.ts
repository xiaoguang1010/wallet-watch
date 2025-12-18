import { defineConfig } from "drizzle-kit";
import { env } from "./src/config/env";

// We use process.env directly here because this file runs outside of Next.js context sometimes
// But importing env ensures validation if we run via tsx
export default defineConfig({
    schema: "./src/data/schema/*",
    out: "./drizzle",
    dialect: 'mysql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
