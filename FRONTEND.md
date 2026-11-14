# Guia do frontend

O frontend usa JavaScript e JSX. O servidor atual continua em TypeScript.

- `src/main.jsx`: inicializa o React.
- `src/App.jsx`: navegação e estrutura da aplicação.
- `src/pages/`: telas e estado dos formulários.
- `src/componentes/`: um componente visual por arquivo; `index.js` reúne as exportações.
- `src/hooks/useInventory.js`: carrega dados, acompanha mudanças e apresenta mensagens.
- `src/hooks/useTheme.js`: alterna o tema e salva a preferência no navegador.
- `src/services/api.js`: endereços, requisições e operações da API.
- `src/services/inventory.js`: cálculos usados pela interface.
- `src/services/movements.js`: nomes apresentados no histórico.
- `src/context.jsx`: disponibiliza dados e operações às telas.
- `src/styles.css`: estilos e cores dos dois temas.

## Fluxo de uma alteração

A tela lê os campos e chama `mutate(addMovement, dados, mensagem)`. O hook executa o serviço, atualiza o estado compartilhado e mostra o resultado. O serviço conhece o endpoint e o método HTTP. As validações definitivas e a persistência pertencem ao backend.

Para operações com identificador, use uma função simples: `mutate((dados) => editProduct(id, dados), formulario, 'Produto atualizado.')`.

## API Java

Configure `VITE_API_URL=http://localhost:8080/api` em `.env.local` e reinicie o Vite. A API deve permitir a origem do frontend via CORS. Adapte os serviços se os contratos Java forem diferentes. Atualmente as operações retornam o estado completo do estoque. A sincronização utiliza SSE em `/events`; exportação e restauração também precisam de endpoints equivalentes.

O endereço é incorporado no build: alterá-lo em produção exige gerar outro build.

## Executar

Desenvolvimento: `npm run dev`.
Produção: `npm run build`, depois `npm start`.
Validação: `npm test` e `npm run build`.

O frontend JSX é validado pelo build do Vite, sem checagem estática de tipos JavaScript. Os tipos legados em `src/types.ts` ainda atendem ao backend TypeScript e seus testes; sua migração pode acompanhar a substituição do backend por Java.
