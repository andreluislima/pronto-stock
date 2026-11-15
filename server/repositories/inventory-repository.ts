import type { PoolClient } from "pg";
import type { AppState } from "../../src/types.js";
import { getDatabase } from "../database.js";
import { parseState } from "../state-schema.js";

type Row = Record<string, any>;
const tables = [
  "products",
  "kit_models",
  "kit_components",
  "movements",
  "movement_components",
  "pending_purchases",
  "finished_kits",
] as const;
type Table = (typeof tables)[number];
const keys: Record<Table, string[]> = {
  products: ["id"],
  kit_models: ["id"],
  kit_components: ["kit_model_id", "product_id"],
  movements: ["id"],
  movement_components: ["movement_id", "position"],
  pending_purchases: ["id"],
  finished_kits: ["kit_model_id"],
};
function toRow(item: Row): Row {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase()),
      value,
    ]),
  );
}
function fromRow(item: Row): Row {
  return Object.fromEntries(
    Object.entries(item)
      .filter(([key, value]) => key !== "position" && value !== null)
      .map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        value,
      ]),
  );
}

// Uma leitura usa um único snapshot do banco, mesmo durante outra gravação.
async function load(client: PoolClient): Promise<AppState> {
  const metadata = await client.query(
    "SELECT version, updated_at FROM pronto_stock.inventory_metadata WHERE id=1",
  );
  if (!metadata.rowCount)
    throw new Error("Estoque não importado. Execute npm run db:import.");
  const rows = {} as Record<Table, Row[]>;
  for (const table of tables) {
    // row_to_json entrega numeric como número JSON, em vez de string do driver pg.
    const order = table === "finished_kits" ? "kit_model_id" : "position";
    const result = await client.query(
      `SELECT row_to_json(t) AS item FROM pronto_stock.${table} t ORDER BY ${order}`,
    );
    rows[table] = result.rows.map((row) => row.item);
  }
  return parseState({
    version: metadata.rows[0].version,
    updatedAt: metadata.rows[0].updated_at,
    products: rows.products.map(fromRow),
    kits: rows.kit_models.map((row) => ({
      ...fromRow(row),
      components: rows.kit_components
        .filter((c) => c.kit_model_id === row.id)
        .map((c) => ({ productId: c.product_id, quantity: c.quantity })),
    })),
    movements: rows.movements.map((row) => {
      const movement = fromRow(row);
      delete movement.hasSnapshot;
      if (row.has_snapshot)
        movement.componentSnapshot = rows.movement_components
          .filter((c) => c.movement_id === row.id)
          .map((c) => ({
            productId: c.product_id,
            quantity: c.quantity,
            unitCost: c.unit_cost,
          }));
      return movement;
    }),
    pendingPurchases: rows.pending_purchases.map((row) => ({
      ...fromRow(row),
      expectedDate: row.expected_date,
    })),
    finishedKits: Object.fromEntries(
      rows.finished_kits.map((row) => [row.kit_model_id, row.quantity]),
    ),
  });
}
function serialize(state: AppState): Record<Table, Row[]> {
  return {
    products: state.products.map((p, position) => ({ ...toRow(p), position })),
    kit_models: state.kits.map(({ components, ...kit }, position) => ({
      ...toRow(kit),
      position,
    })),
    kit_components: state.kits.flatMap((kit) =>
      kit.components.map((c, position) => ({
        kit_model_id: kit.id,
        ...toRow(c),
        position,
      })),
    ),
    movements: state.movements.map(
      ({ componentSnapshot, ...movement }, position) => ({
        ...toRow(movement),
        has_snapshot: componentSnapshot !== undefined,
        position,
      }),
    ),
    movement_components: state.movements.flatMap((m) =>
      (m.componentSnapshot || []).map((c, position) => ({
        movement_id: m.id,
        ...toRow(c),
        position,
      })),
    ),
    pending_purchases: state.pendingPurchases.map((p, position) => ({
      ...toRow(p),
      position,
    })),
    finished_kits: Object.entries(state.finishedKits).map(
      ([kit_model_id, quantity]) => ({ kit_model_id, quantity }),
    ),
  };
}

// Nomes de tabelas vêm somente da lista fixa acima; valores sempre são parâmetros.
async function save(client: PoolClient, state: AppState) {
  const records = serialize(parseState(state));
  for (const table of tables) {
    const primaryKeys = keys[table];
    const match = primaryKeys
      .map((key) => `t.${key}=incoming.${key}`)
      .join(" AND ");
    const columns = (
      await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position",
        ["pronto_stock", table],
      )
    ).rows.map((row) => row.column_name as string);
    const updates = columns
      .filter((column) => !primaryKeys.includes(column))
      .map((column) => `${column}=EXCLUDED.${column}`)
      .join(",");
    const json = JSON.stringify(records[table]);
    await client.query(
      `DELETE FROM pronto_stock.${table} t WHERE NOT EXISTS (SELECT 1 FROM json_populate_recordset(NULL::pronto_stock.${table}, $1::json) incoming WHERE ${match})`,
      [json],
    );
    await client.query(
      `INSERT INTO pronto_stock.${table} AS existing SELECT * FROM json_populate_recordset(NULL::pronto_stock.${table}, $1::json) ON CONFLICT (${primaryKeys.join(",")}) DO UPDATE SET ${updates} WHERE existing IS DISTINCT FROM EXCLUDED`,
      [json],
    );
  }
  await client.query(
    "UPDATE pronto_stock.inventory_metadata SET version=$1,updated_at=$2 WHERE id=1",
    [state.version, state.updatedAt],
  );
}
export async function readInventory(): Promise<AppState> {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const state = await load(client);
    await client.query("COMMIT");
    return state;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function updateInventory(
  change: (state: AppState) => void,
  backup = false,
): Promise<AppState> {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    // Serializa a regra de negócio entre processos: evita perda de atualizações.
    await client.query(
      "SELECT id FROM pronto_stock.inventory_metadata WHERE id=1 FOR UPDATE",
    );
    const state = await load(client);
    if (backup)
      await client.query(
        "INSERT INTO pronto_stock.inventory_backups(reason,data) VALUES ($1,$2)",
        ["antes-restauracao", JSON.stringify(state)],
      );
    else
      await client.query(
        "INSERT INTO pronto_stock.inventory_backups(reason,data) SELECT 'diario', $1::jsonb WHERE NOT EXISTS (SELECT 1 FROM pronto_stock.inventory_backups WHERE reason='diario' AND created_at::date=CURRENT_DATE)",
        [JSON.stringify(state)],
      );
    change(state);
    await save(client, state);
    await client.query("COMMIT");
    return state;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function importInventory(raw: unknown): Promise<AppState> {
  const state = parseState(raw);
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "LOCK TABLE pronto_stock.inventory_metadata IN EXCLUSIVE MODE",
    );
    const exists = await client.query(
      "SELECT id FROM pronto_stock.inventory_metadata",
    );
    if (exists.rowCount)
      throw new Error("Importação recusada: o banco já contém um estoque.");
    for (const table of tables) {
      const result = await client.query(
        `SELECT 1 FROM pronto_stock.${table} LIMIT 1`,
      );
      if (result.rowCount)
        throw new Error("Importação recusada: existem dados nas tabelas.");
    }
    await client.query(
      "INSERT INTO pronto_stock.inventory_metadata(id,version,updated_at) VALUES (1,$1,$2)",
      [state.version, state.updatedAt],
    );
    await save(client, state);
    const imported = await load(client);
    // Conferência completa antes do commit, preservando também campos opcionais.
    const { isDeepStrictEqual } = await import("node:util");
    if (!isDeepStrictEqual(imported, state))
      throw new Error(
        "Conferência da importação falhou. Nenhum dado foi gravado.",
      );
    await client.query("COMMIT");
    return imported;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
