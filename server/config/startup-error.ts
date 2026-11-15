// Somente mensagens conhecidas são registradas. Nunca imprimir o erro bruto do driver.
export function startupErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const safeMessages = [
    'DATABASE_URL obrigatória.',
    'API_ACCESS_KEY deve ter pelo menos 32 caracteres.',
    'ALLOWED_ORIGINS obrigatória.',
    'PORT inválida.',
    'Estoque não importado. Execute npm run db:import.',
  ];
  if (safeMessages.includes(message)) return message;
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const reasons: Record<string, string> = {
    '28P01': 'Credenciais PostgreSQL recusadas. Confira DATABASE_URL no Render.',
    '3D000': 'Banco de dados não encontrado. Confira o banco indicado em DATABASE_URL.',
    '42P01': 'Tabelas não encontradas. Confira se a conexão aponta para o banco e branch migrados.',
    '3F000': 'Schema não encontrado. Confira o banco e a migração.',
    '42501': 'Usuário PostgreSQL sem permissão para acessar o estoque.',
    ENOTFOUND: 'Endereço do banco não encontrado. Confira DATABASE_URL e DNS.',
    ECONNREFUSED: 'Conexão com o banco recusada.',
    ETIMEDOUT: 'Tempo limite ao conectar ao banco.',
    ERR_INVALID_URL: 'DATABASE_URL inválida. Cole somente a conexão PostgreSQL, sem aspas ou prefixo DATABASE_URL=.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'Não foi possível validar o certificado TLS do banco.',
    SELF_SIGNED_CERT_IN_CHAIN: 'Certificado TLS do banco não confiável.',
  };
  if (reasons[code]) return reasons[code];
  if (/timeout|timed out/i.test(message)) return 'Tempo limite ao conectar ao banco. Confira rede e disponibilidade do Neon.';
  return 'Falha na leitura do estoque. Confira conexão, permissões e integridade dos dados no banco.';
}
