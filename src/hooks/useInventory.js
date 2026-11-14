import { useCallback, useEffect, useState } from "react";
import { loadState, subscribeToChanges } from "../services/api";

// Coordena carregamento, atualizações e mensagens compartilhadas pelas telas.
export function useInventory() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const notify = useCallback(
    (message, type = "success") => setNotification({ message, type }),
    [],
  );
  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 4400);
    return () => window.clearTimeout(timer);
  }, [notification]);
  const refresh = useCallback(async () => {
    try {
      const state = await loadState();
      setData(state);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeToChanges(refresh);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  const mutate = useCallback(
    async (operation, body, successText = "Operação realizada.") => {
      try {
        const state = await operation(body);
        setData(state);
        notify(successText);
        return true;
      } catch (e) {
        notify(
          e instanceof Error ? e.message : "Não foi possível concluir.",
          "error",
        );
        return false;
      }
    },
    [notify],
  );

  return {
    data,
    error,
    loading,
    notification,
    setNotification,
    notify,
    refresh,
    mutate,
  };
}
