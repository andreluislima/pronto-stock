import { corsOptions, requireAccessKey } from "./config/http.js";
import "./config/env.js";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { checkDatabaseConnection } from "./database.js";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import {
  getState,
  onChange,
  createProduct,
  editProduct,
  addMovement,
  createKit,
  editKit,
  assemble,
  sellKit,
  addPending,
  receivePending,
  cancelPending,
  restoreState,
  newProductInput,
  editProductInput,
  movementInput,
  kitInput,
  assemblyInput,
  saleKitInput,
  pendingInput,
  receiveInput,
} from "./store.js";

export const app = express();
app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));
const handler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, storage: "postgres" }),
);
app.get(
  "/api/health/database",
  handler(async (_req, res) => {
    const connected = await checkDatabaseConnection();
    return res.status(connected ? 200 : 503).json({ ok: connected });
  }),
);
app.use("/api", requireAccessKey);
app.get(
  "/api/state",
  handler(async (_req, res) => res.json(await getState())),
);
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write("event: connected\ndata: {}\n\n");
  const unsubscribe = onChange(() =>
    res.write(
      `event: changed\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString() })}\n\n`,
    ),
  );
  const keepAlive = setInterval(() => res.write(": alive\n\n"), 25000);
  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});
app.post(
  "/api/products",
  handler(async (req, res) =>
    res.json(await createProduct(newProductInput.parse(req.body))),
  ),
);
app.patch(
  "/api/products/:id",
  handler(async (req, res) =>
    res.json(
      await editProduct(req.params.id, editProductInput.parse(req.body)),
    ),
  ),
);
app.post(
  "/api/movements",
  handler(async (req, res) =>
    res.json(await addMovement(movementInput.parse(req.body))),
  ),
);
app.post(
  "/api/pending",
  handler(async (req, res) =>
    res.json(await addPending(pendingInput.parse(req.body))),
  ),
);
app.post(
  "/api/pending/:id/receive",
  handler(async (req, res) =>
    res.json(await receivePending(req.params.id, receiveInput.parse(req.body))),
  ),
);
app.post(
  "/api/pending/:id/cancel",
  handler(async (req, res) => res.json(await cancelPending(req.params.id))),
);
app.post(
  "/api/kits",
  handler(async (req, res) =>
    res.json(await createKit(kitInput.parse(req.body))),
  ),
);
app.put(
  "/api/kits/:id",
  handler(async (req, res) =>
    res.json(await editKit(req.params.id, kitInput.parse(req.body))),
  ),
);
app.post(
  "/api/assemblies",
  handler(async (req, res) =>
    res.json(await assemble(assemblyInput.parse(req.body))),
  ),
);
app.post(
  "/api/kit-sales",
  handler(async (req, res) =>
    res.json(await sellKit(saleKitInput.parse(req.body))),
  ),
);
app.get(
  "/api/backup",
  handler(async (_req, res) => {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pronto-stock-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.send(JSON.stringify(await getState(), null, 2));
  }),
);
app.post(
  "/api/restore",
  handler(async (req, res) => res.json(await restoreState(req.body))),
);
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Rota não encontrada." }),
);
if (process.env.SERVE_FRONTEND === "true") {
  const dist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../dist",
  );
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err && typeof err === "object" && "code" in err) {
    console.error("[ProntoStock] Falha na operação de banco.");
    res
      .status(503)
      .json({ error: "Não foi possível acessar o banco. Tente novamente." });
    return;
  }
  const validation = err instanceof ZodError;
  const message = validation
    ? err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
    : err instanceof Error
      ? err.message
      : "Erro inesperado.";
  console.error("[ProntoStock]", message);
  res
    .status(
      validation
        ? 400
        : message.includes("Estoque insuficiente") ||
            message.includes("Faltam ") ||
            message.includes("já ") ||
            message.includes("Somente ")
          ? 409
          : 400,
    )
    .json({ error: message });
});
