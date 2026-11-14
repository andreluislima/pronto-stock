import { createProduct, editProduct } from "../services/api";
import { useState } from "react";
import { Boxes, Edit2, PackagePlus, Plus } from "lucide-react";
import {
  Button,
  Card,
  CategorySelect,
  Field,
  Modal,
  PageHeading,
  SearchField,
  StatusBadge,
} from "../componentes";
import { useApp } from "../context";
import { categoriesOf, money, number } from "../services/inventory";
function fromProduct(p) {
  return {
    sku: p?.sku || "",
    name: p?.name || "",
    category: p?.category || "Equipamentos",
    unit: p?.unit || "un",
    minStock: String(p?.minStock ?? 5),
    unitCost: String(p?.unitCost ?? 0),
    initialStock: "0",
    notes: p?.notes || "",
    isBackpack: p?.isBackpack || false,
    active: p?.active ?? true,
  };
}
export function Products() {
  const { data, mutate } = useApp();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [editing, setEditing] = useState(),
    [open, setOpen] = useState(false),
    [draft, setDraft] = useState(fromProduct()),
    [busy, setBusy] = useState(false);
  const filtered = data.products
    .filter(
      (p) =>
        (category === "all" || p.category === category) &&
        `${p.name} ${p.sku} ${p.category}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const launch = (p) => {
    setEditing(p);
    setDraft(fromProduct(p));
    setOpen(true);
  };
  const change = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      sku: draft.sku.trim().toUpperCase(),
      name: draft.name.trim(),
      category: draft.category.trim(),
      unit: draft.unit.trim(),
      minStock: Number(draft.minStock),
      unitCost: Number(draft.unitCost),
      isBackpack: draft.isBackpack,
      notes: draft.notes,
      active: draft.active,
    };
    const success = editing
      ? await mutate(
          (data) => editProduct(editing.id, data),
          payload,
          "Produto atualizado.",
        )
      : await mutate(
          createProduct,
          { ...payload, initialStock: Number(draft.initialStock) },
          "Produto cadastrado.",
        );
    setBusy(false);
    if (success) setOpen(false);
  };
  return (
    <div className="page">
      <PageHeading
        eyebrow="CATÁLOGO"
        title="Produtos"
        subtitle="Organize seus insumos, preços e níveis mínimos de estoque."
        action={
          <Button onClick={() => launch()}>
            <Plus size={17} /> Novo produto
          </Button>
        }
      />
      <div className="stats-mini">
        <div>
          <Boxes size={18} />
          <strong>{data.products.length}</strong>
          <span>produtos cadastrados</span>
        </div>
        <div>
          <PackagePlus size={18} />
          <strong>{categoriesOf(data).length}</strong>
          <span>categorias ativas</span>
        </div>
      </div>
      <Card className="table-panel">
        <div className="table-toolbar">
          <SearchField value={search} onChange={setSearch} />
          <CategorySelect
            value={category}
            onChange={setCategory}
            categories={categoriesOf(data)}
          />
          <span className="results-count">{filtered.length} resultados</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PRODUTO / SKU</th>
                <th>CATEGORIA</th>
                <th>ESTOQUE</th>
                <th>MÍNIMO</th>
                <th>CUSTO UN.</th>
                <th>SITUAÇÃO</th>
                <th className="text-right">AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={!p.active ? "inactive-row" : ""}>
                  <td>
                    <div className="product-name">
                      {p.name}
                      {p.isBackpack && (
                        <span className="mini-label">MOCHILA</span>
                      )}
                      {!p.active && <span className="mini-label">INATIVO</span>}
                    </div>
                    <small className="mono">{p.sku}</small>
                  </td>
                  <td>
                    <span className="category-pill">{p.category}</span>
                  </td>
                  <td>
                    <strong>{number(p.stock, 2)}</strong>{" "}
                    <small>{p.unit}</small>
                  </td>
                  <td>{number(p.minStock, 2)}</td>
                  <td className="weight-600">{money(p.unitCost)}</td>
                  <td>
                    <StatusBadge product={p} />
                  </td>
                  <td className="text-right">
                    <button
                      className="small-action"
                      onClick={() => launch(p)}
                      aria-label={`Editar ${p.name}`}
                    >
                      <Edit2 size={16} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {open && (
        <Modal
          title={editing ? "Editar produto" : "Cadastrar produto"}
          subtitle={
            editing
              ? "Altere os dados sem perder o histórico de movimentações."
              : "Cadastre um novo item. O saldo inicial gerará uma entrada no histórico."
          }
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={busy}
                onClick={() =>
                  document.getElementById("product-submit")?.click()
                }
              >
                {busy ? "Salvando..." : "Salvar produto"}
              </Button>
            </>
          }
        >
          <form onSubmit={submit} className="form-grid">
            <Field label="Nome do produto">
              <input
                required
                value={draft.name}
                onChange={(e) => change("name", e.target.value)}
                placeholder="Ex.: Lanterna de cabeça"
              />
            </Field>
            <Field label="SKU">
              <input
                required
                value={draft.sku}
                onChange={(e) => change("sku", e.target.value)}
                placeholder="LANT-002"
              />
            </Field>
            <Field label="Categoria">
              <input
                required
                list="available-categories"
                value={draft.category}
                onChange={(e) => change("category", e.target.value)}
              />
              <datalist id="available-categories">
                {categoriesOf(data).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Unidade de medida">
              <input
                required
                value={draft.unit}
                onChange={(e) => change("unit", e.target.value)}
                placeholder="un, m, pct"
              />
            </Field>
            <Field label="Estoque mínimo">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={draft.minStock}
                onChange={(e) => change("minStock", e.target.value)}
              />
            </Field>
            <Field label="Custo unitário (R$)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={draft.unitCost}
                onChange={(e) => change("unitCost", e.target.value)}
              />
            </Field>
            {!editing && (
              <Field label="Quantidade inicial">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.initialStock}
                  onChange={(e) => change("initialStock", e.target.value)}
                />
              </Field>
            )}
            <Field label="Observações">
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => change("notes", e.target.value)}
                placeholder="Fornecedor, características..."
              />
            </Field>
            <label className="check-line">
              <input
                type="checkbox"
                checked={draft.isBackpack}
                onChange={(e) => change("isBackpack", e.target.checked)}
              />{" "}
              Este produto é uma mochila vazia (não limita o indicador de kits
              possíveis)
            </label>
            {editing && (
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => change("active", e.target.checked)}
                />{" "}
                Produto ativo no catálogo
              </label>
            )}
            <button id="product-submit" type="submit" hidden />
          </form>
        </Modal>
      )}
    </div>
  );
}
