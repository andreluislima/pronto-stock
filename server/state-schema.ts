import { z } from "zod";
import type { AppState } from "../src/types.js";
const error = (message: string): never => {
  throw new Error(message);
};
const nonnegative = z.number().finite().min(0);
const positive = z.number().finite().positive();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD")
  .refine((value) => {
    const d = new Date(value + "T12:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
  }, "Data inválida");
const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(),
  stock: nonnegative,
  minStock: nonnegative,
  unitCost: nonnegative,
  isBackpack: z.boolean(),
  active: z.boolean(),
  notes: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const componentSchema = z.object({ productId: z.string(), quantity: positive });
const kitSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  salePrice: nonnegative,
  platformFeePercent: z.number().min(0).max(100),
  extraCost: nonnegative,
  components: z.array(componentSchema),
  updatedAt: z.string(),
});
const movementSchema = z.object({
  id: z.string(),
  type: z.enum(["entrada", "saida", "montagem", "venda-kit"]),
  date,
  createdAt: z.string(),
  productId: z.string().optional(),
  kitModelId: z.string().optional(),
  quantity: positive,
  unitCost: nonnegative.optional(),
  salePrice: nonnegative.optional(),
  note: z.string(),
  componentSnapshot: z
    .array(
      z.object({
        productId: z.string(),
        quantity: positive,
        unitCost: nonnegative,
      }),
    )
    .optional(),
});
const pendingSchema = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: positive,
  expectedDate: date.nullable(),
  note: z.string(),
  status: z.enum(["pendente", "recebido", "cancelado"]),
  createdAt: z.string(),
  receivedAt: z.string().optional(),
});
export const stateSchema = z.object({
  version: z.number(),
  products: z.array(productSchema),
  kits: z.array(kitSchema),
  movements: z.array(movementSchema),
  pendingPurchases: z.array(pendingSchema),
  finishedKits: z.record(nonnegative),
  updatedAt: z.string(),
});

export function validateRelations(s: AppState) {
  const products = new Set(s.products.map((p) => p.id));
  const kits = new Set(s.kits.map((k) => k.id));
  if (products.size !== s.products.length) error("Produtos duplicados.");
  if (kits.size !== s.kits.length) error("Modelos duplicados.");
  if (new Set(s.movements.map((m) => m.id)).size !== s.movements.length)
    error("Movimentações duplicadas.");
  if (
    new Set(s.pendingPurchases.map((p) => p.id)).size !==
    s.pendingPurchases.length
  )
    error("Compras duplicadas.");
  if (
    new Set(s.products.map((p) => p.sku.toUpperCase())).size !==
    s.products.length
  )
    error("SKUs duplicados.");
  for (const kit of s.kits) {
    if (
      new Set(kit.components.map((c) => c.productId)).size !==
      kit.components.length
    )
      error("Item duplicado na composição.");
    for (const c of kit.components)
      if (!products.has(c.productId))
        error(`Produto não encontrado na composição: ${c.productId}`);
  }
  for (const pend of s.pendingPurchases)
    if (!products.has(pend.productId))
      error("Compra pendente com produto não encontrado.");
  for (const m of s.movements) {
    if (m.productId && !products.has(m.productId))
      error("Movimentação com produto não encontrado.");
    if (m.kitModelId && !kits.has(m.kitModelId))
      error("Movimentação com modelo não encontrado.");
    for (const item of m.componentSnapshot || [])
      if (!products.has(item.productId))
        error("Componente histórico com produto não encontrado.");
  }
  for (const k of Object.keys(s.finishedKits))
    if (!kits.has(k)) error("Estoque de kits com modelo não encontrado.");
}

export function parseState(raw: unknown): AppState {
  const state = stateSchema.parse(raw) as AppState;
  validateRelations(state);
  return state;
}
