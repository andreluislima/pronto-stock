import { useState } from "react";

export function AccessForm({ onSubmit }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempted, setAttempted] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit(key);
      setAttempted(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="access-page">
      <form className="panel form-stack" onSubmit={submit}>
        <h1>Pronto Stock</h1>
        <p>Informe sua chave de acesso para abrir o estoque.</p>
        <label className="field">
          Chave de acesso
          <input
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            required
          />
        </label>
        {attempted && (
          <p role="alert">
            Não foi possível entrar. Confira a chave e a conexão.
          </p>
        )}
        <button className="button button-primary" disabled={busy}>
          {busy ? "Conectando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
