import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// Somente o servidor carrega as credenciais. Variáveis do ambiente têm prioridade.
const envFile = fileURLToPath(new URL('../../.env.local', import.meta.url));
if (existsSync(envFile)) {
  loadEnvFile(envFile);
}
