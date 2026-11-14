# Publicar no GitHub Pages

O Pages deve publicar a pasta compilada `dist`, e não o código JSX da raiz.
O workflow `.github/workflows/pages.yml` faz a instalação, o build e a publicação
em cada push para `homolog`. O build usa `/pronto-stock/` como caminho base;
a execução local continua usando `/`.

1. Envie o workflow e os demais arquivos do projeto para a branch `homolog`,
   incluindo `package-lock.json`.
2. Em **Settings > Pages > Build and deployment > Source**, selecione
   **GitHub Actions**, substituindo **Deploy from a branch**.
3. Na aba **Actions**, acompanhe **Publicar frontend no GitHub Pages**.
   Se necessário, faça outro push em `homolog` após mudar a configuração.
4. Acesse `https://andreluislima.github.io/pronto-stock/`.

## A API precisa de hospedagem separada

O GitHub Pages só hospeda arquivos estáticos. Ele não inicia o Express nem grava
o arquivo de estoque. Sem API, a interface será carregada, mas apresentará erro
de conexão e não disponibilizará os dados do estoque.

Depois de hospedar a API, crie a variável de repositório `VITE_API_URL` em
**Settings > Secrets and variables > Actions > Variables**. Exemplo:
`https://api.seu-dominio.com/api`. Faça outro push para gerar um novo build.
Essa URL é pública e não deve conter senhas ou tokens.

A API deve aceitar a origem `https://andreluislima.github.io` via CORS e manter os
contratos atuais, incluindo `/state`, `/events` e as operações de escrita.
O backend atual é local: em produção desativa CORS e escuta em `127.0.0.1`.
Antes de hospedá-lo, será necessário adaptar a configuração de rede, persistência
e autenticação. Não basta mudar a URL do frontend.

Para conferir o mesmo build localmente:

```powershell
npm run build -- --base /pronto-stock/
```

Para voltar à versão servida pelo Express local, execute `npm run build` sem
`--base`, seguido de `npm start`.
