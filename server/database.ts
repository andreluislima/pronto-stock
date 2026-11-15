import "./config/env.js";
import pg from "pg";

let pool: pg.Pool | undefined;

// Uma pool por processo reutiliza as conexões entre requisições da API.
export function getDatabase(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL não configurada no servidor. Execute neon deploy.",
    );
  }

  // Mantém a validação do certificado explícita entre versões do driver.
  const databaseUrl = new URL(connectionString);
  databaseUrl.searchParams.set("sslmode", "verify-full");

  pool = new pg.Pool({
    connectionString: databaseUrl.toString(),
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  });

  // Não imprimir o erro original: ele pode conter detalhes da conexão.
  pool.on("error", () => console.error("[Banco] Conexão ociosa interrompida."));
  return pool;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await getDatabase().query("SELECT 1 AS connected");
    return result.rows[0]?.connected === 1;
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
