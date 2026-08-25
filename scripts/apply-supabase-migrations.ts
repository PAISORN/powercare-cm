import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const migrations = [
  "20260815000100_pm_planning.sql",
  "20260815000200_pm_plan_work_sequence.sql",
  "20260815000300_pm_notification_idempotency.sql",
] as const;

if (process.env.VERCEL_ENV !== "production") {
  console.log("Skipping Supabase migrations outside Vercel production.");
  process.exit(0);
}

const db = new PrismaClient();

try {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PowercareSchemaMigration" (
      "name" TEXT PRIMARY KEY,
      "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const name of migrations) {
    const applied = await db.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT "name" FROM "PowercareSchemaMigration" WHERE "name" = $1`,
      name,
    );
    if (applied.length) {
      console.log(`Migration already applied: ${name}`);
      continue;
    }

    const sql = readFileSync(resolve("prisma", "supabase-migrations", name), "utf8");
    const statements = splitSqlStatements(sql);
    await db.$transaction(
      async (tx) => {
        for (const statement of statements) await tx.$executeRawUnsafe(statement);
        await tx.$executeRawUnsafe(
          `INSERT INTO "PowercareSchemaMigration" ("name") VALUES ($1)`,
          name,
        );
      },
      { maxWait: 30_000, timeout: 120_000 },
    );
    console.log(`Migration applied: ${name}`);
  }
} finally {
  await db.$disconnect();
}

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let singleQuoted = false;
  let doubleQuoted = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (char === "'" && !doubleQuoted) {
      current += char;
      if (singleQuoted && next === "'") {
        current += next;
        index += 1;
      } else {
        singleQuoted = !singleQuoted;
      }
      continue;
    }
    if (char === '"' && !singleQuoted) doubleQuoted = !doubleQuoted;

    if (char === ";" && !singleQuoted && !doubleQuoted) {
      if (current.trim()) statements.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}