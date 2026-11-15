import fs from "node:fs/promises";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import "../config/env.js";

try {
  const config = parseEnv(await fs.readFile(".env.migration-test", "utf8"));
  // O runner nunca usa implicitamente as credenciais de produção.
  if (!config.DATABASE_URL || config.NEON_BRANCH !== "migration-postgres-test")
    throw new Error("Branch de teste inválida.");
  if (
    new URL(config.DATABASE_URL).hostname ===
    new URL(process.env.DATABASE_URL!).hostname
  )
    throw new Error("Banco de teste não está isolado.");
  process.env.DATABASE_URL = config.DATABASE_URL;
  const { getDatabase, closeDatabase } = await import("../database.js");
  try {
    await getDatabase().query("DROP SCHEMA IF EXISTS pronto_stock CASCADE");
    const sql = await fs.readFile(
      new URL("../migrations/001_inventory.sql", import.meta.url),
      "utf8",
    );
    await getDatabase().query(sql);
  } finally {
    await closeDatabase();
  }
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", "server/tests/inventory.test.ts"],
    {
      stdio: "inherit",
      env: { ...process.env, INVENTORY_TEST_DATABASE: "isolated" },
    },
  );
  process.exitCode = result.status ?? 1;
} catch {
  console.error(
    "Testes não executados: configure .env.migration-test para a branch isolada migration-postgres-test.",
  );
  process.exitCode = 1;
}
