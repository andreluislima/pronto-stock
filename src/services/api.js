export const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);
let accessKey = "";
export function setAccessKey(value) {
  accessKey = value;
}

async function request(path, options = {}) {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      ...options.headers,
      ...(accessKey ? { Authorization: "Bearer " + accessKey } : {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(
      body.error || "Não foi possível acessar a API. Tente novamente.",
    );
    error.status = response.status;
    throw error;
  }
  return response;
}
export function subscribeToChanges(callback) {
  // Polling permite autenticar cada atualização sem colocar a chave na URL de SSE.
  const timer = window.setInterval(() => {
    if (!document.hidden) void callback();
  }, 30000);
  return () => window.clearInterval(timer);
}
export async function loadState() {
  return (await request("/state", { cache: "no-store" })).json();
}
export async function updateState(path, body, method = "POST") {
  return (
    await request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  ).json();
}
export async function downloadBackup() {
  const response = await request("/backup");
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    "pronto-stock-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
