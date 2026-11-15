import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
process.env.NODE_ENV = "production";
process.env.API_ACCESS_KEY = randomBytes(32).toString("hex");
process.env.ALLOWED_ORIGINS = "https://andreluislima.github.io";
const { app } = await import("../app.js");
const { validateHttpConfig } = await import("../config/http.js");
const server = app.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => server.once("listening", resolve));
const url = "http://127.0.0.1:" + (server.address() as AddressInfo).port;
after(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    }),
);

test("health público não expõe estoque ou credenciais", async () => {
  const response = await fetch(url + "/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, storage: "postgres" });
});
test("rotas sensíveis exigem chave, inclusive backup e SSE", async () => {
  for (const path of ["/state", "/backup", "/events"]) {
    assert.equal((await fetch(url + "/api" + path)).status, 401);
  }
  assert.equal(
    (
      await fetch(url + "/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    401,
  );
});
test("chave incorreta é recusada e chave correta alcança roteamento", async () => {
  assert.equal(
    (
      await fetch(url + "/api/unknown", {
        headers: { Authorization: "Bearer invalid" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(url + "/api/unknown", {
        headers: { Authorization: "Bearer " + process.env.API_ACCESS_KEY },
      })
    ).status,
    404,
  );
});
test("preflight permite somente origem configurada e Authorization", async () => {
  const response = await fetch(url + "/api/state", {
    method: "OPTIONS",
    headers: {
      Origin: "https://andreluislima.github.io",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });
  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://andreluislima.github.io",
  );
  assert.match(
    response.headers.get("Access-Control-Allow-Headers") || "",
    /Authorization/,
  );
  const blocked = await fetch(url + "/api/health", {
    headers: { Origin: "https://untrusted.example" },
  });
  assert.equal(blocked.headers.get("Access-Control-Allow-Origin"), null);
});
test("produção não inicia sem chave forte", () => {
  const previous = process.env.API_ACCESS_KEY;
  process.env.API_ACCESS_KEY = "short";
  try {
    assert.throws(validateHttpConfig, /32 caracteres/);
  } finally {
    process.env.API_ACCESS_KEY = previous;
  }
});
