import { useInventory } from "./hooks/useInventory";
import { restoreBackup } from "./services/api";
import React, { useRef, useState } from "react";

import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Box,
  Calculator,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  FileClock,
  LayoutDashboard,
  Layers3,
  Menu,
  Package,
  PanelLeftClose,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { downloadBackup, setAccessKey } from "./services/api";
import { AccessForm } from "./componentes/AccessForm";
import { AppContext } from "./context";
import { Dashboard } from "./pages/Dashboard";
import { Products } from "./pages/Products";
import { Stock } from "./pages/Stock";
import { Entries } from "./pages/Entries";
import { Exits } from "./pages/Exits";
import { Movements } from "./pages/Movements";
import { Composition } from "./pages/Composition";
import { Costs } from "./pages/Costs";
import { todayLocal } from "./services/inventory";
import "./styles.css";
import { useTheme } from "./hooks/useTheme";
const groups = [
  {
    label: "GERENCIAMENTO",
    items: [
      { name: "Visão geral", icon: LayoutDashboard },
      { name: "Produtos", icon: Package },
      { name: "Estoque", icon: Box },
      { name: "Entradas", icon: ArrowDownLeft },
      { name: "Saídas", icon: ArrowUpRight },
      { name: "Movimentações", icon: FileClock },
    ],
  },
  {
    label: "PLANEJAMENTO",
    items: [
      { name: "Composição", icon: Layers3 },
      { name: "Custos", icon: Calculator },
    ],
  },
];
export function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    data,
    authRequired,
    error,
    loading,
    notification,
    setNotification,
    notify,
    refresh,
    mutate,
  } = useInventory();
  const [page, setPage] = useState("Visão geral");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const restoreRef = useRef(null);
  const navigate = (destination) => {
    setPage(destination);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const restore = async (file) => {
    if (
      !window.confirm(
        "Restaurar este backup substituirá os dados atuais. O sistema fará um backup automático antes da restauração. Continuar?",
      )
    )
      return;
    try {
      const body = JSON.parse(await file.text());
      await mutate(restoreBackup, body, "Backup restaurado com sucesso.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Arquivo inválido.", "error");
    } finally {
      if (restoreRef.current) restoreRef.current.value = "";
    }
  };
  const status = error
    ? "Desconectado"
    : loading
      ? "Conectando"
      : "Dados salvos no banco";
  if (authRequired)
    return (
      <AccessForm
        onSubmit={async (key) => {
          setAccessKey(key);
          await refresh();
        }}
      />
    );
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <span>P</span>
            <i />
          </div>
          {!collapsed && (
            <div className="brand-word">
              <strong>
                pronto<span>.</span>
              </strong>
              <small>STOCK MANAGER</small>
            </div>
          )}
          <button
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              {!collapsed && <div className="nav-label">{group.label}</div>}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    title={item.name}
                    key={item.name}
                    className={`nav-link ${page === item.name ? "selected" : ""}`}
                    onClick={() => navigate(item.name)}
                  >
                    <Icon size={19} strokeWidth={1.9} />
                    {!collapsed && <span>{item.name}</span>}
                    {page === item.name && !collapsed && (
                      <span className="nav-selected-indicator" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-guide">
            <div className="guide-icon">
              <ShieldCheck size={19} />
            </div>
            {!collapsed && (
              <>
                <strong>Seus dados, suas regras.</strong>
                <p>Estoque protegido com histórico e backups.</p>
              </>
            )}
          </div>
          {!collapsed && (
            <>
              <button
                className="sidebar-secondary"
                onClick={() =>
                  downloadBackup().catch((error) =>
                    notify(error.message, "error"),
                  )
                }
              >
                <Download size={17} /> Exportar backup
              </button>
              <button
                className="sidebar-secondary"
                onClick={() => restoreRef.current?.click()}
              >
                <RotateCcw size={17} /> Restaurar backup
              </button>
            </>
          )}
          <input
            ref={restoreRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void restore(f);
            }}
          />
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="sidebar-collapse"
              onClick={() => setCollapsed((v) => !v)}
              title="Expandir/recolher menu"
            >
              <PanelLeftClose size={19} />
            </button>
            <button
              className="mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
            <span className="topbar-crumb">Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="button button-outline"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? "Modo claro" : "Modo escuro"}
            </button>
            <span className="today-label">
              {new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(new Date(todayLocal() + "T12:00:00"))}
            </span>
            <button
              className="sync-button"
              title="Atualizar dados"
              onClick={() => void refresh()}
            >
              <RefreshCcw size={17} />
            </button>
            <span className={`sync-status ${error ? "offline" : ""}`}>
              <i />
              {status}
            </span>
            <div className="user-avatar">PS</div>
          </div>
        </header>
        <main className="main-content">
          {loading && !data ? (
            <div className="loading-state">
              <div className="spinner" />
              Carregando o estoque...
            </div>
          ) : !data ? (
            <div className="error-state">
              <CircleAlert size={32} />
              <h2>Não foi possível conectar</h2>
              <p>{error}</p>
              <button onClick={() => void refresh()}>Tentar novamente</button>
              <small>
                Execute <code>npm run dev</code> na pasta do projeto.
              </small>
            </div>
          ) : (
            <AppContext.Provider
              value={{ data, mutate, refresh, toast: notify }}
            >
              {page === "Visão geral" && <Dashboard navigate={navigate} />}
              {page === "Produtos" && <Products />}
              {page === "Estoque" && <Stock />}
              {page === "Entradas" && <Entries />}
              {page === "Saídas" && <Exits />}
              {page === "Movimentações" && <Movements />}
              {page === "Composição" && <Composition />}
              {page === "Custos" && <Costs />}
              <div className="footer-app">
                <span>
                  Pronto Stock <b>v1.0</b>
                </span>
                <span>
                  <Activity size={14} /> Estoque com histórico persistente
                </span>
              </div>
            </AppContext.Provider>
          )}
        </main>
      </div>
      {notification && (
        <div role="status" className={`toast toast-${notification.type}`}>
          {notification.type === "success" ? (
            <CheckCircle2 size={19} />
          ) : (
            <CircleAlert size={19} />
          )}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
