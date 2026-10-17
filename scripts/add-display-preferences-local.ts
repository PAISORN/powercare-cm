import path from "node:path";
import { loadProjectEnv } from "./load-project-env";
import { db } from "../lib/db";

loadProjectEnv();
const url = process.env.DATABASE_URL ?? "";
if (!url.startsWith("file:")) throw new Error("This additive migration is for local SQLite only");
const target = path.resolve("prisma", url.slice(5));
if (path.dirname(target) !== path.resolve("prisma")) throw new Error("Unexpected local database target");
try {
  const columns = await db.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("User")');
  if (!columns.some(column => column.name === "displayPreferences")) {
    await db.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "displayPreferences" TEXT');
  }
  console.log(`Display preferences column ready: ${target}`);
} finally {
  await db.$disconnect();
}
