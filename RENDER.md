# Implantar a API no Render

A API atual é Node.js/Express, conectada ao Neon. O frontend segue no GitHub Pages.
Uma API Java poderá substituir este serviço depois, preservando os contratos HTTP.

## Pelo Blueprint (recomendado)

1. Faça commit e push das alterações para `homolog`.
2. No Render, selecione **New > Blueprint**, conecte o repositório e escolha `homolog`.
3. O Render lerá `render.yaml` e criará `pronto-stock-api` no plano gratuito.
4. Preencha `DATABASE_URL` usando a conexão pooled que está em `.env.local`.
   Cole somente no campo secreto do Render. Não a coloque no GitHub Pages nem no chat.
5. A chave `API_ACCESS_KEY` é gerada automaticamente pelo Blueprint.
6. Aguarde o deploy e consulte `/api/health` na URL que o Render informar.

Não execute `db:import` no deploy: os dados já estão no Neon. O serviço só acessa
as tabelas existentes. Migrações futuras devem ser executadas explicitamente.

## Se preferir New > Web Service

| Campo | Valor |
|---|---|
| Branch | `homolog` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build:api` |
| Start Command | `npm run start:api` |
| Plan | Free |
| Health Check Path | `/api/health` |
| Root Directory | deixe vazio |

Configure `NODE_ENV=production`, `HOST=0.0.0.0`, `NODE_VERSION=22.21.1`,
`ALLOWED_ORIGINS=https://andreluislima.github.io`, `DATABASE_URL` e
`API_ACCESS_KEY` (chave aleatória de pelo menos 32 caracteres).
O Render fornece `PORT`; não é necessário defini-la manualmente.

## Conectar o GitHub Pages

1. Copie a URL HTTPS da API fornecida pelo Render.
2. No GitHub, vá em **Settings > Secrets and variables > Actions > Variables**.
3. Defina `VITE_API_URL=https://SEU-SERVICO.onrender.com/api`.
4. Execute novamente o workflow de publicação do frontend.
5. Abra o site e informe a chave `API_ACCESS_KEY` cadastrada no Render.

A chave é mantida somente em memória na aba e enviada no header `Authorization`.
Após recarregar a página, ela será solicitada novamente. Não existe variável
`VITE_API_ACCESS_KEY`: não publique a chave no bundle.
Esta é uma proteção simples para uso por um operador; contas individuais e
permissões exigem uma evolução de autenticação. CORS não substitui autenticação.

Os dados são atualizados após operações, ao retornar à aba e a cada 30 segundos
com a aba visível. Esse polling permite autenticar as atualizações sem expor
chaves em URLs de SSE. O endpoint SSE continua disponível para clientes que
suportem Authorization.

## Desenvolvimento e verificações

`npm run dev` mantém o desenvolvimento local. Sem API_ACCESS_KEY no ambiente de
 desenvolvimento, o acesso local não pede chave. Em produção ela é obrigatória.
Para `npm start` local, configure também ALLOWED_ORIGINS e API_ACCESS_KEY.

- `npm run build:api`: compila o backend em `build/`.
- `npm run build`: verifica os tipos e compila o frontend.
- `npm run test:http`: valida autenticação, CORS e health sem alterar o banco.
- `npm test`: testes de estoque na branch Neon isolada.

O plano gratuito do Render pode suspender a API após inatividade; o primeiro
acesso pode demorar. O estoque continua persistido no Neon.

Referências: https://render.com/docs/web-services e https://render.com/docs/blueprint-spec
