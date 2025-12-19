/**
 * Insert one demo alert into DB for notification list display.
 *
 * Usage:
 *   npx tsx src/scripts/insert-demo-alert.ts
 *   npx tsx src/scripts/insert-demo-alert.ts --caseId=<CASE_ID>
 *   npx tsx src/scripts/insert-demo-alert.ts --databaseUrl="mysql://user:pass@localhost:3306/db"
 *
 * Notes:
 * - This script intentionally DOES NOT import the app's env/db modules, to avoid requiring
 *   unrelated env vars (RP_ID/RP_ORIGIN) when you just want to write DB seed data.
 * - If caseId is omitted, inserts into the latest case by created_at.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env") });

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { alerts } from "@/data/schema/balance-snapshots";
import { and, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

function getArgValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function resolveTargetCaseId(
  db: ReturnType<typeof drizzle>,
  explicitCaseId?: string
): Promise<string> {
  if (explicitCaseId) return explicitCaseId;

  const result = await db.execute(
    sql`SELECT id FROM cases ORDER BY created_at DESC LIMIT 1`
  );
  const latestId = (result as any)?.[0]?.[0]?.id as string | undefined;

  if (!latestId) {
    throw new Error(
      "No cases found. Please create a case first, or pass --caseId=<CASE_ID>."
    );
  }

  return latestId;
}

async function main() {
  const databaseUrlArg = getArgValue("databaseUrl");
  const databaseUrl = databaseUrlArg ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is missing. Provide it via .env or pass --databaseUrl=\"...\""
    );
  }

  const pool = mysql.createPool({ uri: databaseUrl });
  const db = drizzle(pool, { mode: "default" });

  const caseIdArg = getArgValue("caseId");
  const caseId = await resolveTargetCaseId(db, caseIdArg);

  // Demo content (from user request)
  const triggeredAt = new Date("2025-12-12T16:32:00+08:00");
  const title = "连锁餐厅 · 金沙店地址";
  const message = "日净流出超出预警阈值：-$ 8,520";

  const id = uuidv4();

  // Avoid inserting the same demo alert repeatedly for the same case.
  // We treat (caseId, alertType, title, message, triggeredAt) as a natural "dedupe key" for this script.
  const existing = await db
    .select({
      id: alerts.id,
      caseId: alerts.caseId,
      title: alerts.title,
      message: alerts.message,
      triggeredAt: alerts.triggeredAt,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.caseId, caseId),
        eq(alerts.alertType, "large_outflow"),
        eq(alerts.title, title),
        eq(alerts.message, message),
        eq(alerts.triggeredAt, triggeredAt)
      )
    )
    .limit(1);

  if (existing[0]) {
    console.log("ℹ️ Demo alert already exists, skipping insert:");
    console.log(existing[0]);
    console.log("\nℹ️ Target caseId:", caseId);
    return;
  }

  await db.insert(alerts).values({
    id,
    caseId,
    addressId: null,
    ruleId: null,
    alertType: "large_outflow",
    title,
    message,
    details: JSON.stringify({
      netOutflowUsd: -8520,
      timeWindow: "day",
      note: "demo seed",
    }),
    severity: "error",
    isRead: false,
    triggeredAt,
  });

  const insertedRows = await db
    .select({
      id: alerts.id,
      caseId: alerts.caseId,
      title: alerts.title,
      message: alerts.message,
      triggeredAt: alerts.triggeredAt,
    })
    .from(alerts)
    .where(eq(alerts.id, id))
    .limit(1);
  const inserted = insertedRows[0] ?? null;

  console.log("✅ Inserted demo alert:");
  console.log(inserted);
  console.log("\nℹ️ Target caseId:", caseId);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to insert demo alert:", err?.message || err);
    process.exit(1);
  });


