import fs from "node:fs/promises";
import { getDatabase, closeDatabase } from "../database.js";

try {
  if (process.env.DATABASE_URL_UNPOOLED)
    process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
  const sql = await fs.readFile(
    new URL("../migrations/001_inventory.sql", import.meta.url),
    "utf8",
  );
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(71943821)");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("Migração 001 aplicada com sucesso.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} catch {
  console.error("Falha na migração. Verifique conexão, permissões e esquema.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
