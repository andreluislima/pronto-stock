export const API_URL = import.meta.env.VITE_API_URL || "/api";
export const backupUrl = API_URL + "/backup";
export function subscribeToChanges(callback) {
  const stream = new EventSource(API_URL + "/events");
  stream.addEventListener("changed", callback);
  return () => stream.close();
}
export async function loadState() {
  const response = await fetch(API_URL + "/state", { cache: "no-store" });
  if (!response.ok)
    throw new Error(
      "Não foi possível acessar a API. Verifique sua conexão e tente novamente.",
    );
  return response.json();
}
export async function updateState(path, body, method = "POST") {
  const response = await fetch(API_URL + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: `Erro HTTP ${response.status}` }));
    throw new Error(error.error || `Erro HTTP ${response.status}`);
  }
  return response.json();
}
export function downloadCsv(name, rows) {
  const csv =
    "\uFEFF" +
    rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function createProduct(data) {
  return updateState("/products", data, "POST");
}

export function editProduct(id, data) {
  return updateState(`/products/${id}`, data, "PATCH");
}

export function addMovement(data) {
  return updateState("/movements", data, "POST");
}

export function createKit(data) {
  return updateState("/kits", data, "POST");
}

export function editKit(id, data) {
  return updateState(`/kits/${id}`, data, "PUT");
}

export function assembleKit(data) {
  return updateState("/assemblies", data, "POST");
}

export function sellKit(data) {
  return updateState("/kit-sales", data, "POST");
}

export function addPending(data) {
  return updateState("/pending", data, "POST");
}

export function receivePending(id, data) {
  return updateState(`/pending/${id}/receive`, data, "POST");
}

export function cancelPending(id, data) {
  return updateState(`/pending/${id}/cancel`, data, "POST");
}

export function restoreBackup(data) {
  return updateState("/restore", data, "POST");
}
