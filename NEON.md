# PostgreSQL / Neon

O estoque agora é armazenado no schema `pronto_stock` do PostgreSQL.
O arquivo JSON é apenas fonte da importação inicial e formato de exportação/backup.

## Organização

- `server/store.ts`: regras de entrada, saída, compra, montagem e venda.
- `server/state-schema.ts`: validação do estado e das referências entre entidades.
- `server/repositories/inventory-repository.ts`: leitura e escrita nas tabelas.
- `server/migrations/001_inventory.sql`: estrutura do banco, versionada no Git.
- `server/database.ts`: pool de conexões; usa `DATABASE_URL` no backend.
- `server/scripts/`: migração, importação, verificação e testes.

As tabelas são `products`, `kit_models`, `kit_components`, `movements`,
`movement_components` (custos e composição no momento da montagem),
`pending_purchases` e `finished_kits`. `inventory_metadata` mantém a versão e
coordena as transações; `inventory_backups` guarda as cópias de segurança.
Os IDs existentes e os contratos HTTP foram preservados para a futura API Java.
Datas ficam em texto ISO para preservar exatamente o conteúdo do JSON legado.
Valores monetários e quantidades usam `numeric` no PostgreSQL.

## Configurar / migrar uma instalação

1. Configure as conexões em `.env.local` com `neon deploy`.
2. Pare a API antiga antes do corte para que ela não continue alterando o JSON.
3. Execute `npm run db:migrate` para criar as tabelas.
4. Execute `npm run db:import` para importar `server/data/estoque.json`.
5. Inicie novamente com `npm run dev` ou `npm run build` e `npm start`.

A migração usa `DATABASE_URL_UNPOOLED` quando disponível. A API usa `DATABASE_URL`
pooled. Não publique essas variáveis no frontend nem no Git.

A importação não usa automaticamente o seed. Para importar outro arquivo:

```powershell
npm run db:import -- "D:\Backups\estoque.json"
```

Ela valida o conteúdo, cria uma cópia local em `server/data/backups`, executa tudo
em uma transação e compara o estado reconstruído com o original antes do commit.
Se o banco já tiver estoque ou registros nas tabelas, a importação é recusada.
O JSON original não é alterado. Não execute a importação a cada deploy.

## Gravações e backups

Cada alteração bloqueia a linha de metadados durante a transação, lê o saldo atual,
aplica a regra de negócio e grava as tabelas. Uma falha desfaz a operação inteira.
Isso serializa as operações de um estoque, inclusive entre processos da API.
O primeiro movimento do dia cria um backup no banco (dia em UTC do servidor).
A restauração cria um backup independente antes de substituir os dados.
Exportar e restaurar pela interface continuam usando JSON.

A API ainda trabalha com o estado completo do estoque, como o frontend atual.
O repositório sincroniza as tabelas por lotes e atualiza apenas linhas diferentes.
Para históricos grandes, a próxima evolução é paginar consultas e escrever
apenas as entidades afetadas em cada operação. Eventos SSE são enviados pelo
processo que realizou a operação; múltiplas réplicas precisarão de eventos compartilhados.

## Verificações

- `npm run db:check`: conexão, somente `SELECT 1`.
- `GET /api/health/database`: 200 quando há conexão, 503 em caso de falha.
- `npm run build`: validação de tipos e compilação.
- `npm test`: testes de integração em branch Neon isolada.

Para configurar os testes, crie a branch `migration-postgres-test` e obtenha suas
variáveis com `neon env pull --file .env.migration-test`. Retorne o vínculo do CLI
para `production` sem sobrescrever `.env.local` (`--no-env-pull`).
O runner verifica a branch e o host, recria somente o schema `pronto_stock` da
branch de teste e nunca usa implicitamente as credenciais de produção.
Não aponte aplicações reais para essa branch: os testes apagam seus dados.

O GitHub Pages hospeda apenas o frontend. Hospedar o Express e configurar
`VITE_API_URL`, CORS e autenticação ainda são etapas separadas.
