import "./config/env.js";
import { app } from "./app.js";
import { initStore } from "./store.js";
import { closeDatabase } from "./database.js";
import { validateHttpConfig } from "./config/http.js";

try {
  validateHttpConfig();
  const port = Number(process.env.PORT || 3333);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT inválida.");
  const host =
    process.env.HOST ||
    (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  await initStore();
  const server = app.listen(port, host, () =>
    console.log("Pronto Stock API iniciada na porta " + port),
  );
  server.on("error", () => {
    console.error("Não foi possível iniciar o servidor HTTP.");
    process.exit(1);
  });
  function shutdown() {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
    server.closeAllConnections();
  }
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
} catch {
  console.error(
    "Falha ao iniciar a API. Confira DATABASE_URL, API_ACCESS_KEY, ALLOWED_ORIGINS, PORT e a migração do banco.",
  );
  await closeDatabase();
  process.exitCode = 1;
}
