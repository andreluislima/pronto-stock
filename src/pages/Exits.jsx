import { addMovement, sellKit } from "../services/api";
import { useState } from "react";
import { ArrowUpRight, Box, PackageCheck, ShoppingBag } from "lucide-react";
import {
  Button,
  Card,
  Field,
  Notice,
  PageHeading,
  ProductSelect,
} from "../componentes";
import { useApp } from "../context";
import {
  dateLabel,
  kitMetrics,
  money,
  number,
  todayLocal,
} from "../services/inventory";
export function Exits() {
  const { data, mutate } = useApp();
  const [mode, setMode] = useState("produto");
  const [productId, setProductId] = useState(""),
    [kitId, setKitId] = useState(data.kits[0]?.id || "");
  const [quantity, setQuantity] = useState("1"),
    [date, setDate] = useState(todayLocal()),
    [note, setNote] = useState(""),
    [salePrice, setSalePrice] = useState(""),
    [busy, setBusy] = useState(false);
  const product = data.products.find((p) => p.id === productId);
  const kit = data.kits.find((k) => k.id === kitId);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = { quantity: Number(quantity), date, note };
    const ok =
      mode === "produto"
        ? await mutate(
            addMovement,
            { ...payload, type: "saida", productId },
            "Saída registrada.",
          )
        : await mutate(
            sellKit,
            {
              ...payload,
              kitModelId: kitId,
              salePrice: salePrice === "" ? undefined : Number(salePrice),
            },
            "Saída de kit registrada.",
          );
    setBusy(false);
    if (ok) {
      setQuantity("1");
      setNote("");
      setSalePrice("");
    }
  };
  return (
    <div className="page">
      <PageHeading
        eyebrow="MOVIMENTAÇÕES"
        title="Registrar saídas"
        subtitle="Controle consumo, perdas, devoluções e vendas de kits montados."
      />
      <div className="two-panel-form">
        <Card className="input-panel">
          <div className="panel-head">
            <h3>
              <ArrowUpRight size={20} /> Nova saída
            </h3>
          </div>
          <p className="panel-subtitle">
            Escolha se você está retirando um insumo ou um kit pronto.
          </p>
          <div className="tabs-compact">
            <button
              className={mode === "produto" ? "active" : ""}
              onClick={() => setMode("produto")}
            >
              <Box size={16} /> Insumo avulso
            </button>
            <button
              className={mode === "kit" ? "active" : ""}
              onClick={() => setMode("kit")}
            >
              <ShoppingBag size={16} /> Kit montado
            </button>
          </div>
          <form className="form-stack" onSubmit={submit}>
            {mode === "produto" ? (
              <Field label="Insumo">
                <ProductSelect
                  data={data}
                  value={productId}
                  onChange={setProductId}
                />
              </Field>
            ) : (
              <Field label="Modelo do kit">
                <select
                  required
                  value={kitId}
                  onChange={(e) => setKitId(e.target.value)}
                >
                  {data.kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="form-grid">
              <Field label="Quantidade de saída">
                <input
                  type="number"
                  min="1"
                  step={mode === "kit" ? "1" : "0.01"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </Field>
              <Field label="Data de saída">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
            </div>
            {mode === "kit" && (
              <Field
                label="Preço vendido por kit (R$)"
                hint={`Opcional; valor padrão ${money(kit?.salePrice || 0)}.`}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder={kit ? String(kit.salePrice) : "0"}
                />
              </Field>
            )}
            <Field label="Motivo / referência">
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === "kit"
                    ? "Ex.: Pedido Mercado Livre #12345"
                    : "Ex.: Consumo interno, avaria, descarte..."
                }
              />
            </Field>
            <div className="mini-info">
              Disponível agora:{" "}
              <strong>
                {mode === "produto"
                  ? `${number(product?.stock || 0, 2)} ${product?.unit || ""}`
                  : `${number(data.finishedKits[kitId] || 0)} kit(s) pronto(s)`}
              </strong>
            </div>
            <Button
              type="submit"
              disabled={busy || (mode === "produto" ? !productId : !kitId)}
            >
              <ArrowUpRight size={17} />
              {busy ? "Registrando..." : "Confirmar saída"}
            </Button>
          </form>
        </Card>
        <Card className="input-panel">
          <div className="panel-head">
            <h3>
              <PackageCheck size={19} /> Kits prontos
            </h3>
          </div>
          <p className="panel-subtitle">
            Kits já montados e disponíveis para venda. Não confundir com a
            capacidade de produzir.
          </p>
          <div className="ready-kits">
            {data.kits.map((k, i) => {
              const m = kitMetrics(data, k);
              return (
                <div className="ready-kit-row" key={k.id}>
                  <div className={`ready-kit-icon tint-${i % 3}`}>
                    <ShoppingBag size={19} />
                  </div>
                  <div>
                    <strong>{k.name}</strong>
                    <small>
                      Produção possível: {m.possibleWithoutBackpack} sem contar
                      mochila
                    </small>
                  </div>
                  <span>{number(data.finishedKits[k.id] || 0)}</span>
                </div>
              );
            })}
          </div>
          <Notice>
            Para aumentar os kits prontos, registre uma montagem na aba{" "}
            <b>Composição</b>. O sistema desconta os componentes
            automaticamente.
          </Notice>
        </Card>
      </div>
      <Card title="Últimas saídas">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>DATA</th>
                <th>TIPO</th>
                <th>ITEM</th>
                <th>QUANTIDADE</th>
                <th>OBSERVAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {data.movements
                .filter((m) => m.type === "saida" || m.type === "venda-kit")
                .slice(0, 15)
                .map((m) => (
                  <tr key={m.id}>
                    <td>{dateLabel(m.date)}</td>
                    <td>{m.type === "saida" ? "Insumo" : "Kit pronto"}</td>
                    <td className="weight-600">
                      {m.productId
                        ? data.products.find((p) => p.id === m.productId)?.name
                        : data.kits.find((k) => k.id === m.kitModelId)?.name}
                    </td>
                    <td className="text-danger weight-700">
                      −{number(m.quantity, 2)}
                    </td>
                    <td className="muted">{m.note || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!data.movements.some(
          (m) => m.type === "saida" || m.type === "venda-kit",
        ) && (
          <div className="table-empty">
            Nenhuma saída registrada até o momento.
          </div>
        )}
      </Card>
    </div>
  );
}
