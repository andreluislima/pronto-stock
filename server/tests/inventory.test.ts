import { test, after } from "node:test";
import { closeDatabase } from "../database.js";
import { importInventory } from "../repositories/inventory-repository.js";
if (process.env.INVENTORY_TEST_DATABASE !== "isolated")
  throw new Error("Use npm test: os testes exigem banco isolado.");
after(closeDatabase);
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { kitMetrics } from "../../src/types.js";
const tempDir = mkdtempSync(path.join(os.tmpdir(), "pronto-stock-test-"));
process.env.DATA_DIR = tempDir;
// Import after setting DATA_DIR; the application never writes the test data into the project.
const store = await import("../store.js");
await importInventory(
  JSON.parse(
    readFileSync(new URL("../seed/initial-data.json", import.meta.url), "utf8"),
  ),
);
await store.initStore();

test("importa os 23 itens, três modelos e compras a caminho sem somar no estoque", async () => {
  const state = await store.getState();
  assert.equal(state.products.length, 23);
  assert.equal(state.kits.length, 3);
  assert.equal(
    state.pendingPurchases.filter((p) => p.status === "pendente").length,
    6,
  );
  assert.equal(state.products.find((p) => p.id === "LANT-DIN-001")?.stock, 0);
  assert.equal(kitMetrics(state, state.kits[0]).possibleWithoutBackpack, 0);
});

test("conta capacidade com e sem mochila separadamente", async () => {
  const state = await store.getState();
  for (const p of state.products) p.stock = p.isBackpack ? 0 : 30;
  const metrics = kitMetrics(state, state.kits[0]);
  assert.ok(metrics.possibleWithoutBackpack > 0);
  assert.equal(metrics.possibleWithBackpack, 0);
  assert.equal(
    state.kits[0].components.find((x) => x.productId === "CLOR-001")?.quantity,
    1,
  );
});

test("entrada persiste no PostgreSQL, saída não aceita saldo insuficiente", async () => {
  await store.addMovement({
    type: "entrada",
    productId: "CREM-001",
    quantity: 2,
    date: "2026-11-12",
    note: "Teste de recebimento",
    unitCost: 2.5,
  });
  assert.equal(
    (await store.getState()).products.find((p) => p.id === "CREM-001")?.stock,
    2,
  );
  assert.equal(
    (await store.getState()).products.find((p) => p.id === "CREM-001")?.stock,
    2,
  );
  await assert.rejects(
    store.addMovement({
      type: "saida",
      productId: "CREM-001",
      quantity: 3,
      date: "2026-11-12",
      note: "Excesso",
    }),
    /Estoque insuficiente/,
  );
  assert.equal(
    (await store.getState()).products.find((p) => p.id === "CREM-001")?.stock,
    2,
  );
});

test("montagem desconta componentes, venda desconta só o kit pronto", async () => {
  await assert.rejects(
    store.assemble({
      kitModelId: "essencial-atual",
      quantity: 1,
      date: "2026-11-12",
      note: "",
    }),
    /Faltam/,
  );
  await store.addMovement({
    type: "entrada",
    productId: "LANT-DIN-001",
    quantity: 2,
    date: "2026-11-12",
    note: "Teste",
  });
  const before = await store.getState();
  const beforeCrem = before.products.find((p) => p.id === "CREM-001")!.stock;
  await store.assemble({
    kitModelId: "essencial-atual",
    quantity: 1,
    date: "2026-11-12",
    note: "Teste de montagem",
  });
  const assembled = await store.getState();
  assert.equal(assembled.finishedKits["essencial-atual"], 1);
  assert.equal(
    assembled.products.find((p) => p.id === "CREM-001")?.stock,
    beforeCrem - 1,
  );
  assert.ok(assembled.movements[0].componentSnapshot!.length > 0);
  const ingredientsAfterAssembly = assembled.products.map((p) => [
    p.id,
    p.stock,
  ]);
  await store.sellKit({
    kitModelId: "essencial-atual",
    quantity: 1,
    date: "2026-11-12",
    note: "Teste de venda",
  });
  assert.equal((await store.getState()).finishedKits["essencial-atual"], 0);
  assert.deepEqual(
    (await store.getState()).products.map((p) => [p.id, p.stock]),
    ingredientsAfterAssembly,
  );
  await assert.rejects(
    store.sellKit({
      kitModelId: "essencial-atual",
      quantity: 1,
      date: "2026-11-12",
      note: "",
    }),
    /Somente/,
  );
});

test("receber pedido pendente aumenta estoque e impede recebimento duplicado", async () => {
  const id = "pend-CAP-001";
  const before = (await store.getState()).products.find(
    (p) => p.id === "CAP-001",
  )!.stock;
  await store.receivePending(id, { date: "2026-11-12" });
  assert.equal(
    (await store.getState()).products.find((p) => p.id === "CAP-001")?.stock,
    before + 10,
  );
  await assert.rejects(
    store.receivePending(id, { date: "2026-11-12" }),
    /finalizada/,
  );
});

test("importação repetida não sobrescreve o estoque", async () => {
  const before = await store.getState();
  await assert.rejects(importInventory(before), /já contém/);
  assert.deepEqual(await store.getState(), before);
});
test("entradas concorrentes não perdem atualizações", async () => {
  const before = await store.getState();
  const stock = before.products.find((p) => p.id === "CREM-001")!.stock;
  await Promise.all(
    [1, 2].map(() =>
      store.addMovement({
        type: "entrada",
        productId: "CREM-001",
        quantity: 1,
        date: "2026-11-12",
        note: "Concorrência",
      }),
    ),
  );
  assert.equal(
    (await store.getState()).products.find((p) => p.id === "CREM-001")!.stock,
    stock + 2,
  );
});
test("falha de constraint reverte a transação inteira", async () => {
  const before = await store.getState();
  const { updateInventory } =
    await import("../repositories/inventory-repository.js");
  await assert.rejects(
    updateInventory((state) => {
      state.products[0].stock = -1;
    }),
  );
  assert.deepEqual(await store.getState(), before);
});
test("restauração preserva backup no banco e recupera dados", async () => {
  const before = await store.getState();
  await store.addMovement({
    type: "entrada",
    productId: "CREM-001",
    quantity: 1,
    date: "2026-11-12",
    note: "Antes de restaurar",
  });
  const previous = await store.getState();
  await store.restoreState(before);
  assert.deepEqual(await store.getState(), before);
  const { getDatabase } = await import("../database.js");
  const backup = await getDatabase().query(
    "SELECT data FROM pronto_stock.inventory_backups ORDER BY id DESC LIMIT 1",
  );
  assert.deepEqual(backup.rows[0].data, previous);
});

test(
  "dados reais do JSON preservam todos os campos no PostgreSQL",
  { skip: !existsSync(new URL("../data/estoque.json", import.meta.url)) },
  async () => {
    const source = JSON.parse(
      readFileSync(new URL("../data/estoque.json", import.meta.url), "utf8"),
    );
    const { parseState } = await import("../state-schema.js");
    await store.restoreState(source);
    assert.deepEqual(await store.getState(), parseState(source));
  },
);
