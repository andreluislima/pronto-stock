import {
  addMovement,
  addPending,
  receivePending,
  cancelPending,
} from "../services/api";
import { useState } from "react";
import {
  ArrowDownLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Plus,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Field,
  Modal,
  Notice,
  PageHeading,
  ProductSelect,
} from "../componentes";
import { useApp } from "../context";
import { dateLabel, money, number, todayLocal } from "../services/inventory";
export function Entries() {
  const { data, mutate } = useApp();
  const [productId, setProductId] = useState(""),
    [quantity, setQuantity] = useState("1"),
    [date, setDate] = useState(todayLocal()),
    [unitCost, setUnitCost] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false),
    [pendingProduct, setPendingProduct] = useState(""),
    [pendingQty, setPendingQty] = useState("1"),
    [expectedDate, setExpectedDate] = useState(""),
    [pendingNote, setPendingNote] = useState("");
  const [receiving, setReceiving] = useState(null),
    [receiveDate, setReceiveDate] = useState(todayLocal()),
    [receiveCost, setReceiveCost] = useState("");
  const pending = data.pendingPurchases.filter((x) => x.status === "pendente");
  const selected = data.products.find((x) => x.id === productId);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await mutate(
      addMovement,
      {
        type: "entrada",
        productId,
        quantity: Number(quantity),
        date,
        note,
        unitCost: unitCost === "" ? undefined : Number(unitCost),
      },
      "Entrada registrada.",
    );
    setBusy(false);
    if (ok) {
      setProductId("");
      setQuantity("1");
      setUnitCost("");
      setNote("");
    }
  };
  const submitPending = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await mutate(
      addPending,
      {
        productId: pendingProduct,
        quantity: Number(pendingQty),
        expectedDate: expectedDate || null,
        note: pendingNote,
      },
      "Compra adicionada como pendente.",
    );
    setBusy(false);
    if (ok) {
      setPendingOpen(false);
      setPendingProduct("");
      setPendingQty("1");
      setPendingNote("");
      setExpectedDate("");
    }
  };
  const receive = async (e) => {
    e.preventDefault();
    if (!receiving) return;
    setBusy(true);
    const ok = await mutate(
      (data) => receivePending(receiving, data),
      {
        date: receiveDate,
        unitCost: receiveCost === "" ? undefined : Number(receiveCost),
      },
      "Recebimento confirmado. Estoque atualizado.",
    );
    setBusy(false);
    if (ok) {
      setReceiving(null);
      setReceiveCost("");
    }
  };
  return (
    <div className="page">
      <PageHeading
        eyebrow="MOVIMENTAÇÕES"
        title="Registrar entradas"
        subtitle="Receba mercadorias, registre compras e acompanhe itens a caminho."
        action={
          <Button variant="outline" onClick={() => setPendingOpen(true)}>
            <Plus size={17} /> Adicionar compra pendente
          </Button>
        }
      />
      <div className="two-panel-form">
        <Card className="input-panel">
          <div className="panel-head">
            <h3>
              <ArrowDownLeft size={19} /> Nova entrada
            </h3>
          </div>
          <p className="panel-subtitle">
            O saldo é atualizado assim que você confirma o recebimento.
          </p>
          <form onSubmit={submit} className="form-stack">
            <Field label="Produto">
              <ProductSelect
                data={data}
                value={productId}
                onChange={(id) => {
                  setProductId(id);
                  setUnitCost("");
                }}
              />
            </Field>
            <div className="form-grid">
              <Field label="Quantidade recebida">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </Field>
              <Field label="Data de entrada">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field
              label="Custo desta compra (R$ / unidade)"
              hint="Opcional. Se preenchido, recalcula o custo médio ponderado."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={
                  selected
                    ? `Custo atual: ${money(selected.unitCost)}`
                    : "Deixe vazio para manter o atual"
                }
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </Field>
            <Field label="Documento / observação">
              <textarea
                rows={3}
                placeholder="Ex.: Compra fornecedor, NF, lote..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            {selected && (
              <div className="mini-info">
                Saldo atual de <b>{selected.name}</b>:{" "}
                {number(selected.stock, 2)} {selected.unit}
              </div>
            )}
            <Button type="submit" disabled={busy || !productId}>
              <CheckCircle2 size={17} />
              {busy ? "Registrando..." : "Confirmar entrada"}
            </Button>
          </form>
        </Card>
        <Card className="input-panel">
          <div className="panel-head">
            <h3>
              <Clock3 size={19} /> A caminho
            </h3>
            <Badge status="pending">{pending.length} pendentes</Badge>
          </div>
          <p className="panel-subtitle">
            As compras pendentes não aumentam o estoque até serem recebidas.
          </p>
          <div className="pending-list">
            {pending.length === 0 ? (
              <div className="pending-empty">
                <ClipboardCheck size={32} />
                <b>Nada pendente</b>
                <span>As compras recebidas sairão desta lista.</span>
              </div>
            ) : (
              pending.map((row) => {
                const p = data.products.find((x) => x.id === row.productId);
                return (
                  <div key={row.id} className="pending-row">
                    <div className="pending-row-top">
                      <b>{p?.name || "Produto"}</b>
                      <strong>
                        +{number(row.quantity, 2)} {p?.unit}
                      </strong>
                    </div>
                    <p>{row.note || "Compra sem observação"}</p>
                    <div className="pending-row-bottom">
                      <small>
                        {row.expectedDate
                          ? `Previsão: ${dateLabel(row.expectedDate)}`
                          : "Entrega a confirmar"}
                      </small>
                      <div>
                        <button
                          className="cancel-link"
                          onClick={() => {
                            if (
                              window.confirm("Cancelar esta compra pendente?")
                            )
                              void mutate(
                                (data) => cancelPending(row.id, data),
                                {},
                                "Compra cancelada.",
                              );
                          }}
                        >
                          <X size={14} /> Cancelar
                        </button>
                        <button
                          className="receive-link"
                          onClick={() => {
                            setReceiving(row.id);
                            setReceiveDate(todayLocal());
                            setReceiveCost("");
                          }}
                        >
                          <CheckCircle2 size={14} /> Receber
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
      <Card title="Entradas recentes">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>DATA</th>
                <th>PRODUTO</th>
                <th>QUANTIDADE</th>
                <th>CUSTO UN.</th>
                <th>OBSERVAÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {data.movements
                .filter((x) => x.type === "entrada")
                .slice(0, 12)
                .map((x) => (
                  <tr key={x.id}>
                    <td>{dateLabel(x.date)}</td>
                    <td className="weight-600">
                      {data.products.find((p) => p.id === x.productId)?.name}
                    </td>
                    <td className="text-success weight-700">
                      +{number(x.quantity, 2)}
                    </td>
                    <td>
                      {x.unitCost === undefined ? "—" : money(x.unitCost)}
                    </td>
                    <td className="muted">{x.note || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!data.movements.some((x) => x.type === "entrada") && (
          <div className="table-empty">
            As primeiras entradas aparecerão aqui.
          </div>
        )}
      </Card>
      {pendingOpen && (
        <Modal
          title="Nova compra em trânsito"
          subtitle="Registre o que está chegando, sem alterar o saldo disponível."
          onClose={() => setPendingOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setPendingOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  document.getElementById("pending-submit")?.click()
                }
                disabled={busy}
              >
                Salvar pendência
              </Button>
            </>
          }
        >
          <form className="form-stack" onSubmit={submitPending}>
            <Field label="Produto">
              <ProductSelect
                data={data}
                value={pendingProduct}
                onChange={setPendingProduct}
              />
            </Field>
            <div className="form-grid">
              <Field label="Quantidade">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={pendingQty}
                  onChange={(e) => setPendingQty(e.target.value)}
                  required
                />
              </Field>
              <Field label="Previsão de entrega (opcional)">
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Observação">
              <textarea
                rows={3}
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
                placeholder="Fornecedor, pedido, detalhes..."
              />
            </Field>
            <Notice>
              Esta compra ficará pendente até você pressionar “Receber”.
            </Notice>
            <button id="pending-submit" hidden type="submit" />
          </form>
        </Modal>
      )}
      {receiving && (
        <Modal
          title="Confirmar recebimento"
          subtitle={
            data.products.find(
              (p) =>
                p.id ===
                data.pendingPurchases.find((x) => x.id === receiving)
                  ?.productId,
            )?.name
          }
          onClose={() => setReceiving(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setReceiving(null)}>
                Cancelar
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  document.getElementById("receive-submit")?.click()
                }
              >
                <CheckCircle2 size={16} /> Receber no estoque
              </Button>
            </>
          }
        >
          <form className="form-stack" onSubmit={receive}>
            <Field label="Data real de recebimento">
              <input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Custo unitário desta compra (opcional)">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Manter custo atual"
                value={receiveCost}
                onChange={(e) => setReceiveCost(e.target.value)}
              />
            </Field>
            <Notice tone="success">
              O recebimento registrará uma entrada e aumentará o saldo do
              produto automaticamente.
            </Notice>
            <button hidden type="submit" id="receive-submit" />
          </form>
        </Modal>
      )}
    </div>
  );
}
