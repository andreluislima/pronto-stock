import { checkDatabaseConnection, closeDatabase } from "../database.js";

try {
  const connected = await checkDatabaseConnection();
  console.log(
    connected
      ? "Neon: conexão PostgreSQL verificada com sucesso."
      : "Neon: conexão indisponível. Verifique as variáveis do servidor e a rede.",
  );
  if (!connected) process.exitCode = 1;
} finally {
  await closeDatabase();
}
