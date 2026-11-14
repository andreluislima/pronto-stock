import { movementName, movementTypeName } from "../services/movements";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Layers3,
  Package,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  Button,
  Card,
  Empty,
  PageHeading,
  Stat,
  StatusBadge,
} from "../componentes";
import { useApp } from "../context";
import {
  kitMetrics,
  money,
  number,
  statusOf,
  stockValue,
  dateLabel,
} from "../services/inventory";
const fillColors = [
  "#306e5a",
  "#85b49e",
  "#dfad63",
  "#7c9ba9",
  "#bab0c0",
  "#aac5b9",
];
export function Dashboard({ navigate }) {
  const { data } = useApp();
  const low = data.products
    .filter((p) => p.active && statusOf(p) !== "ok")
    .sort((a, b) => a.stock - b.stock);
  const inbound = data.pendingPurchases.filter((p) => p.status === "pendente");
  const mainKit = data.kits[0];
  const m = mainKit ? kitMetrics(data, mainKit) : null;
  const ready = Object.values(data.finishedKits).reduce((a, b) => a + b, 0);
  const byCategory = Object.entries(
    data.products
      .filter((p) => p.active)
      .reduce(
        (memo, p) => ({
          ...memo,
          [p.category]: (memo[p.category] || 0) + p.unitCost * p.stock,
        }),
        {},
      ),
  ).sort((a, b) => b[1] - a[1]);
  const total = byCategory.reduce((a, [, val]) => a + val, 0);
  return (
    <div className="page">
      <PageHeading
        eyebrow="VISÃO GERAL"
        title="Seu estoque, sem complicação."
        subtitle="Informações atualizadas com cada entrada, saída ou montagem."
        action={
          <Button onClick={() => navigate("Entradas")}>
            <Plus size={17} /> Registrar entrada
          </Button>
        }
      />
      <div className="hero-card">
        <div className="hero-copy">
          <div className="hero-tag">
            <span className="hero-glow" /> CONTROLE EM TEMPO REAL
          </div>
          <h2>
            Você sabe exatamente
            <br />
            <em>o que pode montar.</em>
          </h2>
          <p>
            Planeje sua próxima produção usando apenas os componentes que estão
            disponíveis agora.
          </p>
          <button className="hero-link" onClick={() => navigate("Composição")}>
            Ver composição dos kits <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-metric">
          <span>CAPACIDADE ATUAL</span>
          <strong>{m?.possibleWithoutBackpack ?? 0}</strong>
          <div>
            kits possíveis <b>sem limitar pela mochila</b>
          </div>
          <div className="hero-separator" />
          <small>
            {m?.possibleWithBackpack ?? 0} kits considerando mochilas vazias
          </small>
        </div>
        <div className="hero-graphic">
          <div />
          <div />
          <div />
        </div>
      </div>
      <div className="stats-grid">
        <Stat
          title="Produtos cadastrados"
          value={number(data.products.filter((p) => p.active).length)}
          foot="Itens ativos no catálogo"
          icon={<Package size={20} />}
        />
        <Stat
          title="Itens em alerta"
          value={number(low.length)}
          foot={`${low.filter((p) => statusOf(p) === "critical").length} em situação crítica`}
          icon={<AlertTriangle size={20} />}
          tone="red"
        />
        <Stat
          title="Valor dos insumos"
          value={money(stockValue(data))}
          foot="Estoque físico × custo médio"
          icon={<CircleDollarSign size={20} />}
          tone="green"
        />
        <Stat
          title="Kits já montados"
          value={number(ready)}
          foot="Disponíveis para saída / venda"
          icon={<Boxes size={20} />}
        />
      </div>
      <div className="dashboard-grid">
        <Card
          title="Atenção ao estoque"
          action={
            <button className="text-link" onClick={() => navigate("Estoque")}>
              Ver estoque <ArrowRight size={15} />
            </button>
          }
        >
          <div className="caption-panel">
            Itens abaixo ou próximos do estoque mínimo
          </div>
          {low.length === 0 ? (
            <Empty
              title="Tudo em ordem"
              description="Todos os itens estão acima do mínimo."
            />
          ) : (
            <div className="compact-list">
              {low.slice(0, 6).map((p) => (
                <div className="compact-item" key={p.id}>
                  <div className="list-icon danger">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="compact-copy">
                    <b>{p.name}</b>
                    <small>
                      Mínimo: {number(p.minStock, 2)} {p.unit}
                    </small>
                  </div>
                  <div className="compact-end">
                    <strong>{number(p.stock, 2)}</strong>
                    <StatusBadge product={p} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card
          title="Valor em estoque"
          action={<div className="tiny-tag">POR CATEGORIA</div>}
        >
          <div className="category-layout">
            <div
              className="donut"
              style={{
                background:
                  total > 0
                    ? `conic-gradient(${byCategory.map(([, value], i) => `${fillColors[i % fillColors.length]} ${(byCategory.slice(0, i).reduce((sum, [, v]) => sum + v, 0) / total) * 100}% ${(byCategory.slice(0, i + 1).reduce((sum, [, v]) => sum + v, 0) / total) * 100}%`).join(",")})`
                    : "#e6ece6",
              }}
            >
              <div>
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
            </div>
            <div className="category-legend">
              {byCategory.map(([name, value], i) => (
                <div key={name}>
                  <span
                    className="legend-dot"
                    style={{ background: fillColors[i % fillColors.length] }}
                  />
                  <span>{name}</span>
                  <strong>{money(value)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="category-note">
            Valores dos componentes cadastrados, sem incluir kits já montados.
          </div>
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card
          title="Modelos de mochila"
          action={
            <button className="text-link" onClick={() => navigate("Custos")}>
              Analisar custos <ArrowRight size={15} />
            </button>
          }
        >
          <div className="model-overview">
            {data.kits.slice(0, 3).map((kit, i) => {
              const metrics = kitMetrics(data, kit);
              return (
                <button
                  key={kit.id}
                  className="model-row"
                  onClick={() => navigate("Composição")}
                >
                  <span className={`model-number model-number-${i}`}>
                    0{i + 1}
                  </span>
                  <span className="compact-copy">
                    <b>{kit.name}</b>
                    <small>{money(metrics.totalCost)} de custo unitário</small>
                  </span>
                  <strong>
                    {metrics.possibleWithoutBackpack}
                    <small> kits</small>
                  </strong>
                  <ArrowRight size={16} />
                </button>
              );
            })}
          </div>
        </Card>
        <Card
          title="Últimas movimentações"
          action={
            <button
              className="text-link"
              onClick={() => navigate("Movimentações")}
            >
              Ver todas <ArrowRight size={15} />
            </button>
          }
        >
          {data.movements.length === 0 ? (
            <Empty
              title="Nenhuma movimentação ainda"
              description="Registre uma entrada ou saída para começar o histórico."
            />
          ) : (
            <div className="compact-list">
              {data.movements.slice(0, 5).map((row) => (
                <div className="compact-item" key={row.id}>
                  <div
                    className={`list-icon ${row.type === "entrada" ? "good" : "neutral"}`}
                  >
                    {row.type === "entrada" ? (
                      <ArrowDownLeft size={16} />
                    ) : row.type === "saida" ? (
                      <ArrowUpRight size={16} />
                    ) : row.type === "montagem" ? (
                      <Layers3 size={16} />
                    ) : (
                      <TrendingUp size={16} />
                    )}
                  </div>
                  <div className="compact-copy">
                    <b>{movementName(data, row)}</b>
                    <small>
                      {dateLabel(row.date)} · {movementTypeName(row.type)}
                    </small>
                  </div>
                  <div className="compact-end">
                    <strong>{row.quantity}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      {inbound.length > 0 && (
        <div className="inbound-banner">
          <div className="inbound-icon">
            <Package size={22} />
          </div>
          <div>
            <strong>
              {inbound.length} pedidos de insumos aguardando conferência
            </strong>
            <p>
              Os itens “a caminho” da planilha não foram somados ao estoque.
              Confirme o recebimento para liberar a quantidade.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("Entradas")}>
            Conferir chegadas <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
