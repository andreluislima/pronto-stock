import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  importInventory,
  readInventory,
} from "../repositories/inventory-repository.js";
import { closeDatabase } from "../database.js";
import { parseState } from "../state-schema.js";
import { isDeepStrictEqual } from "node:util";

try {
  const defaultDirectory = fileURLToPath(new URL("../data", import.meta.url));
  const source = path.resolve(
    process.argv[2] ||
      path.join(process.env.DATA_DIR || defaultDirectory, "estoque.json"),
  );
  const content = await fs.readFile(source, "utf8");
  const state = parseState(JSON.parse(content));
  const digest = createHash("sha256").update(content).digest("hex");
  const backup = path.join(
    path.dirname(source),
    "backups",
    `antes-neon-${digest.slice(0, 16)}.json`,
  );
  await fs.mkdir(path.dirname(backup), { recursive: true });
  try {
    await fs.writeFile(backup, content, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  if ((await fs.readFile(backup, "utf8")) !== content)
    throw new Error("Backup divergente.");
  await importInventory(state);
  if (!isDeepStrictEqual(await readInventory(), state))
    throw new Error("Conferência após importação falhou.");
  console.log(
    `Importação conferida: ${state.products.length} produtos, ${state.kits.length} modelos, ${state.movements.length} movimentações, ${state.pendingPurchases.length} compras.`,
  );
  console.log("Backup local preservado. O arquivo original não foi alterado.");
} catch (error) {
  const message =
    error instanceof Error && error.message.startsWith("Importação recusada:")
      ? error.message
      : "Falha na importação. Verifique o arquivo, o esquema e a conexão. O JSON original foi preservado.";
  console.error(message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
