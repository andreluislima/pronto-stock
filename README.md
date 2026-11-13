# Pronto Stock · Gestão de Estoque

Sistema web local para a **Pronto Supply e Soluções**. Interface minimalista em React + TypeScript, API Node.js/Express em TypeScript e persistência em arquivos JSON **no próprio computador**. Criado a partir de `Atual(revisada) - Gestão Estoque.xlsx`.

## Como abrir no Windows (mais fácil)

1. Instale o **Node.js LTS** (versão 20.19+ ou 22+) em https://nodejs.org se ainda não tiver.
2. Descompacte a pasta `pronto-stock` em um diretório de sua preferência, por exemplo `D:\Projetos\pronto-stock`.
3. Dê **dois cliques em `start-windows.bat`**.
4. Na primeira execução, o script instalará as dependências com `npm install` (**precisa de internet só nessa instalação**).
5. Abra `http://localhost:5173` caso o navegador não abra automaticamente.
6. Para encerrar, feche a janela chamada **Pronto Stock - Servidor** (`Ctrl+C`). Seus dados continuarão salvos.

> Atenção: não abra apenas `index.html` pelo Explorador de Arquivos. O sistema requer a API local ativa para gravar os dados.

### Pelo terminal (PowerShell)

```powershell
cd D:\Projetos\pronto-stock
npm install
npm run dev
```

- **Sistema web:** http://localhost:5173
- **API:** http://localhost:3333/api/health
- **Armazenamento:** `server/data/estoque.json` (criado automaticamente na primeira execução)

### Para executar como versão de produção

```powershell
npm run build
npm start
```

Abra http://localhost:3333. Nesta modalidade, a API também serve a aplicação React compilada.

## Onde ficam os dados?

O arquivo principal é **`server/data/estoque.json`**. Ele mantém:

- Produtos, categorias, quantidade física, mínimo e custos unitários;
- Compras em trânsito (pendentes, recebidas ou canceladas);
- Entradas, saídas, montagens e vendas com datas;
- Três modelos de kit e suas composições;
- Quantidade de kits prontos de cada modelo.

**Não é localStorage:** os dados são gravados pelo servidor em um arquivo real no computador, com gravação atômica (arquivo temporário + renomeação). Também é criada uma cópia diária anterior à primeira alteração em `server/data/backups/`. O menu **Exportar backup** permite salvar um JSON em outro local, e **Restaurar backup** importa esse JSON e salva uma cópia de segurança antes da troca.

Para guardar dados fora do diretório do projeto, configure a variável `DATA_DIR` antes de iniciar:

```powershell
$env:DATA_DIR = 'D:\ProntoSupply\DadosEstoque'
npm run dev
```

Esse comando vale para a janela de terminal atual. Para execução posterior, configure a variável novamente ou crie seu próprio atalho. Evite diretórios sincronizados por OneDrive para reduzir a possibilidade de conflitos de escrita.

## Funcionalidades

| Seção | O que faz |
|---|---|
| Visão geral | Indicadores, situação dos insumos, modelos, valores por categoria e chegadas pendentes |
| Produtos | Cadastro e edição de produto, SKU, custo, unidade, estoque mínimo, categoria e status |
| Estoque | Lista completa com busca e filtros de categoria/situação, entradas e saídas rápidas, CSV |
| Entradas | Registro com data, quantidade, custo da compra, compra pendente e confirmação de chegada |
| Saídas | Consumo de insumos ou venda de kit previamente montado, com data |
| Movimentações | Histórico permanente, filtros de tipo, período, nome e exportação CSV |
| Composição | Modelos personalizáveis, quantidades, gargalos, montagem e capacidade de produção |
| Custos | Custos unitários por categoria, composição do custo, taxa da plataforma e margem simulada |

### Modelos iniciais

1. **Essencial Atual**: os componentes da planilha, com silver tape.
2. **Essencial Futuro**: versão sem a silver tape para comparação de custos.
3. **Personalizado**: cenário de experimentação para editar à vontade.

É possível duplicar modelos (máximo de 10), adicionar/remover itens e alterar quantidades, preço, taxa percentual, custo extra e descrição. **Importante:** altere os componentes apenas após salvar a composição; futuras montagens usam a composição atual. As montagens históricas guardam uma fotografia dos componentes utilizados.

### Como são calculados os kits possíveis?

Para cada componente **que não seja uma mochila vazia**, o sistema calcula `floor(saldo disponível / quantidade necessária por kit)`. O menor resultado determina a capacidade de produção. A interface exibe também um segundo indicador **incluindo as mochilas vazias**.

**Capacidade de produção ≠ kits prontos.** Quando registra uma montagem, o sistema baixa os componentes (inclusive a mochila da composição, se houver) e aumenta os kits prontos. Ao vender um kit pronto, baixa somente o kit montado. Não permite saldo negativo ou vendas além do estoque pronto.

### Custo de um kit

`Soma (quantidade de cada componente × custo unitário) + custos extras`.

A projeção de resultado também considera `preço de venda × taxa percentual`. Não inclui frete, impostos ou gastos não informados. A entrada com custo de compra opcional atualiza o custo médio ponderado do insumo.

## Sobre os dados importados da planilha

- **23 SKUs** importados com categoria, unidade, custo e estoque mínimo da aba Produtos. Estoque inicial extraído da coluna **Estoque atual**.
- A composição do modelo Atual, incluindo a mochila e o Clorin ajustados, soma **30 unidades físicas em 23 SKUs**. Se a descrição do anúncio informar 33 ou 34 itens, confira e ajuste a receita antes de utilizá-la como ficha definitiva.
- **6 compras marcadas “a caminho”** importadas como pendentes: álcool gel (+6), capa de chuva (+10), silver tape (+10), fita microporosa (+12), lanterna dínamo (+5) e luvas (+100). As datas apontadas eram antigas; nenhum item pendente aumenta automaticamente o saldo. Confirme o recebimento.
- A planilha tinha **Mochila** e **Clorin** com quantidade 0 na composição. Foram assumidos **1 de cada por kit**, como hipótese inicial; confirme e ajuste se necessário.
- **Manta térmica** possui divergência entre estoque físico (15) e disponível (20). O sistema importou **15** e registrou uma observação no cadastro.
- **Máscara KN95** e **Corda** também contêm observações de conferência física e unidade de medida.
- O preço de venda inicial de **R$ 210** é apenas uma referência editável; confira o valor praticado, promoções e taxas reais.
- A aba Movimentações da planilha estava vazia; não há histórico anterior importado. O saldo inicial é o ponto de partida.

## Organização técnica

```text
pronto-stock/
├── src/
│   ├── main.tsx          # Navegação, notificações, sincronização e backup
│   ├── pages/            # Uma tela para cada área funcional
│   ├── components.tsx    # Componentes visuais reutilizáveis
│   ├── context.tsx       # Estado compartilhado da aplicação
│   ├── api.ts            # Comunicação HTTP + exportação CSV
│   ├── types.ts          # Entidades, regras de capacidade e custos
│   └── styles.css        # Design responsivo
├── server/
│   ├── index.ts          # Rotas REST e SSE
│   ├── store.ts          # Validações, regras de negócio e persistência
│   ├── tests/            # Testes de entradas, saídas, kits e persistência
│   ├── seed/initial-data.json
│   └── data/estoque.json # Criado na primeira execução; NÃO versionar
├── start-windows.bat
├── package.json
└── vite.config.ts
```

A API possui rotas para produtos, movimentos, compras pendentes, modelos, montagens, vendas, exportação e restauração. O navegador recebe notificações de mudança por **Server-Sent Events (SSE)**, atualizando as telas também quando outra aba registra uma alteração.

### Testes e qualidade

```powershell
npm run typecheck
npm test
npm run build
```

**Nota de validação:** o código foi analisado sintaticamente e as regras puras de capacidade/custo foram testadas. Não foi possível executar a instalação npm nem iniciar a interface completa no ambiente de geração porque o acesso a `registry.npmjs.org` estava indisponível. Execute os comandos acima após instalar as dependências no seu computador e consulte eventuais mensagens do terminal.

## Preparado para a versão futura

O frontend já está separado das regras de inventário pela API. Quando quiser migrar para **Java 17 + Spring Boot + PostgreSQL**, é possível substituir a API local, manter as telas React e reaproveitar os contratos de dados. Para uso em rede por vários usuários será necessário acrescentar autenticação, perfis, controle transacional no banco e trilha de auditoria mais detalhada.

### Regras de segurança da versão local

A API escuta somente `127.0.0.1`: ela é adequada para **uso no próprio computador**, não para publicar diretamente na internet. Faça exportações de backup regularmente. O histórico de movimentações é imutável pela interface; correções de estoque devem ser lançadas como entradas ou saídas adicionais para preservar a rastreabilidade.
