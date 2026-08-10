# Hand Bot — Deploy da feature "Hedge total + stand by"

> Data: 2026-08-10 · Origem: projeto matriz `Tradexperience/WebApp`
>
> Este documento cobre **apenas** a feature em andamento. As correções anteriores
> (policy `handbot_params_anon_needs_sync`, `verify_jwt` no `config.toml`) já foram
> aplicadas e verificadas no whitelabel — não constam mais aqui.

---

## O que mudou

Três alterações entregues juntas — duas no binário do EA, uma no webapp:

**1. Correção do bug do `OnInit`.** O EA reinicializado depois que a flag `needs_sync` já havia
sido consumida recebia `{sync:false}`, mantinha `_RemoteParamsLoaded=false` e passava a operar com
os inputs locais do `.mq5` em vez dos parâmetros do painel — silenciosamente. Agora o `OnInit`
chama a edge function com `?full=1`, que devolve os parâmetros ignorando a flag.

**2. Reformulação do Hedge Dinâmico.** Mudança de comportamento operacional, não correção de bug.

| | Antes | Agora |
|---|---|---|
| Disparo | escalonado: a cada novo múltiplo do % de flutuante | **uma única vez**, ao atingir o % |
| Volume | cobertura parcial repetida a cada nível | **volume líquido total em aberto** (zera a exposição) |
| Ordens pendentes | permaneciam ativas e podiam executar | **canceladas** no instante da trava |
| Stops e takes | permaneciam e podiam disparar, desfazendo a trava | **removidos** de todas as posições |
| Depois do hedge | EA seguia operando: grids, adds e entradas desbalanceavam a trava | **stand by total** |
| Sai do stand by | — | só quando **todas as posições e pendentes forem liquidadas** |

**3. Rótulo e descrição do campo no webapp.** O campo dizia "% de flutuante para ativar", mas o
percentual incide sobre o saldo inicial da sessão. Corrigido, com um texto explicando que o robô
para completamente. Detalhes na seção "Alteração no front end". **Não é campo novo** — veja a seção
de migrations.

### O que "stand by total" significa

Enquanto a trava estiver ativa o EA **não envia ordem de nenhuma natureza**. Isso inclui, além das
entradas e da gestão de posição, três coisas que antes rodavam incondicionalmente:

- `CutGainDinamico()` — liquidação por lucro
- `DailyGainChecker()` — meta do dia e limite de perda
- fechamento por fim de sessão (dentro de `IsNegociationTime()`)
- `getFloatingProfit()` — que também dispara `Close_All()` nos limites `CutGain`/`CutLoss`

Continuam rodando apenas leituras de estado: atualização do painel, relógio e a sincronização de
parâmetros com o Supabase.

A saída do stand by depende de **intervenção manual do cliente**. O EA não interfere nessa
intervenção — teclas e botões do painel continuam funcionando normalmente, inclusive os de
fechamento, que são o caminho previsto para liquidar.

---

## Migrations: nenhuma — e por quê

**Nenhum dos dois projetos precisa de migration.** O campo de percentual do hedge **não é novo**: o
fluxo `webapp → banco → edge function → EA` já existia inteiro e continua idêntico. Foi só o
*comportamento* do EA ao atingir o gatilho que mudou.

Confirmação, ponto a ponto:

| Camada | Onde | Situação |
|---|---|---|
| Tabela | `handbot_params.dynamic_hedge_percent` e `.dynamic_hedge_enabled` | já existiam |
| Edge fn — leitura (EA) | lista de colunas do `select` em `handleEaGet` | já incluía os dois |
| Edge fn — escrita (webapp) | `allowedFields` em `handleUserPost` | já incluía os dois |
| EA — parsing | `HANDBOT_GET_BOOL("dynamic_hedge_enabled")` / `HANDBOT_GET_DBL("dynamic_hedge_percent")` | já existia |
| EA — uso | `HedgeLockManager()` lê `_RemoteDynamicHedgePercent` com fallback no input local | já existia |
| Webapp | `NumericInput` na seção "Hedge Dinâmico" | já existia |

Ou seja: **o EA já recebe esse dado via GET e o webapp já o envia via POST.** O fluxo está correto e
não precisou de ajuste. O `?full=1` da correção do `OnInit` é lido da query string, não do banco.

Se alguma sessão futura sugerir uma migration para esta feature, é engano — confira esta tabela
antes de rodar qualquer coisa.

---

## Alteração no front end (webapp) — obrigatória nos dois projetos

O campo não é novo, mas o **rótulo estava errado** e agora ficou perigoso: ele dizia
`"% de flutuante para ativar"`, quando o percentual é aplicado sobre o **saldo inicial da sessão**
(`saldo_inicial × percent / 100`), não sobre o flutuante. Além disso, o cliente precisa saber que o
robô **para completamente** ao atingir o gatilho — antes ele seguia operando.

Arquivo: `components/HandBot/HandBot.tsx`, seção "Hedge Dinâmico".

```diff
     <NumericInput
-      label="% de flutuante para ativar"
+      label="% do saldo para travar o hedge"
       value={params.dynamic_hedge_percent}
       onChange={(v) => set('dynamic_hedge_percent', v)}
       step={0.1}
       min={0}
       decimal
     />
+    <p className="text-xs text-slate-500">
+      Percentual do saldo inicial da sessão. Quando o prejuízo flutuante atingir esse valor, o robô trava
+      <strong> toda a exposição de uma vez</strong>: cancela as ordens pendentes, remove stops e takes, e
+      <strong> para completamente</strong> — não abre entradas, não faz grid, não fecha por meta do dia nem
+      por fim de sessão. Para liberar, feche manualmente todas as posições e ordens.
+    </p>
```

Já aplicado na matriz. No whitelabel, replique o mesmo trecho e publique o build do webapp.

---

## Passo a passo — projeto MATRIZ (`Tradexperience/WebApp`)

O código já está aplicado no repositório. Falta publicar.

### 1. Deploy da edge function

```powershell
supabase functions deploy handbot-params --project-ref <REF_DA_MATRIZ>
```

Se o `config.toml` da matriz ainda não tiver o bloco abaixo, acrescente antes de rodar — sem ele o
CLI religa a verificação de JWT e o EA passa a levar 401 antes de chegar no código:

```toml
[functions.handbot-params]
verify_jwt = false
```

### 2. Compilar o EA

Abra `mt5/Handbot.mq5` no MetaEditor e compile com **F7**. Confirme que o resultado é
`0 errors, 0 warnings` antes de seguir.

### 3. Publicar o `.ex5`

Suba o binário para o bucket de storage da matriz, mantendo o mesmo nome de arquivo para que o botão
de download do webapp já entregue a versão nova. O caminho está na constante `EA_DOWNLOAD_URL` em
[components/HandBot/HandBot.tsx](../components/HandBot/HandBot.tsx).

### 4. Publicar o webapp

O rótulo do campo de percentual e o texto explicativo já estão aplicados no repositório. Faça o
build e o deploy do front end para que o cliente veja a descrição correta do novo comportamento.

### 5. Avisar os clientes

Quem já roda o EA **não recebe a atualização sozinho** — precisa baixar de novo e recolocar no
gráfico. Como o comportamento do hedge mudou, o aviso é obrigatório. Veja o texto sugerido no fim
deste documento.

---

## Passo a passo — projeto WHITELABEL

O whitelabel **não tem o código-fonte `.mq5`** (proteção de propriedade intelectual). Recebe o
binário pronto e precisa replicar duas mudanças de código: a da edge function e a do front end.

### 1. Aplicar o patch na edge function

Arquivo `supabase/functions/handbot-params/index.ts`, função `handleEaGet`:

```diff
  async function handleEaGet(req: Request): Promise<Response> {
+   // full=1 → inicialização do EA: devolve os parâmetros mesmo sem needs_sync pendente
+   const force = new URL(req.url).searchParams.get('full') === '1'
+
    const token = extractBearer(req)
    if (!token) return jsonResponse(401, { error: 'missing_bearer_token' })
```

```diff
    if (!params) return jsonResponse(404, { error: 'params_not_found' })

-   if (!params.needs_sync) return jsonResponse(200, { sync: false })
+   if (!params.needs_sync && !force) return jsonResponse(200, { sync: false })

-   await supabaseAdmin
-     .from('handbot_params')
-     .update({ needs_sync: false })
-     .eq('handbot_link_id', link.id)
+   if (params.needs_sync) {
+     await supabaseAdmin
+       .from('handbot_params')
+       .update({ needs_sync: false })
+       .eq('handbot_link_id', link.id)
+   }
```

> O `Deno.serve` roteia pelo **último segmento do pathname**. Query strings não afetam isso, então
> `GET /functions/v1/handbot-params?full=1` continua caindo em `handleEaGet`. Não crie uma rota
> nova tipo `/full` — quebraria o roteamento existente.

### 2. Deploy

```powershell
supabase functions deploy handbot-params --project-ref <REF_DO_WHITELABEL>
```

Confirme depois no dashboard que **Verify JWT continua OFF**.

### 3. Publicar o `.ex5`

**É o mesmo binário da matriz** — não precisa de build separado. O EA expõe os dois valores como
inputs editáveis na aba **Entradas**, com os defaults apontando para a matriz:

| Input | Default (matriz) | O que o whitelabel faz |
|---|---|---|
| `SupabaseUrl` | `https://<ref-da-matriz>.supabase.co` | troca pela URL do projeto do whitelabel |
| `SupabaseAnonKey` | anon key da matriz | troca pela anon key do whitelabel |
| `ApiKey` | vazio | o cliente cola a chave gerada no painel |

Suba o `.ex5` no bucket de storage do whitelabel e mantenha o nome de arquivo.

⚠️ **Use a anon key *legacy*** (formato `eyJ...`, aba *Legacy API keys* em Project Settings → API
Keys). O EA envia essa chave também em `Authorization: Bearer`, e o formato novo
`sb_publishable_...` é rejeitado ali por não ser um JWT — o polling de 60s quebraria em silêncio.

> **Recomendação:** em vez de pedir para cada cliente digitar URL e chave, distribua um arquivo
> `.set` junto com o `.ex5`, já com os dois valores preenchidos. No MT5 o cliente carrega o preset
> pelo botão **Carregar** da janela de inputs. Menos erro de digitação, menos suporte.

### 4. Aplicar a mudança do front end

Replique o trecho da seção "Alteração no front end" deste documento em
`components/HandBot/HandBot.tsx` e publique o build do webapp.

### 5. Avisar os clientes

Mesma observação da matriz.

### Ordem entre os passos

Qualquer ordem funciona, sem janela de quebra:

- Função nova + EA antigo → o EA não manda `full=1`, comportamento idêntico ao atual.
- Função antiga + EA novo → o `full=1` é ignorado, o bug do `OnInit` simplesmente continua.
- O front end é independente dos dois: só muda rótulo e texto, não muda o dado enviado.

O que não pode é parar no meio do caminho por semanas — nem, principalmente, distribuir o `.ex5`
novo sem publicar o texto explicativo no webapp e sem avisar os clientes. O robô passa a parar
sozinho, e quem não souber disso vai abrir chamado achando que travou por bug.

---

## Verificação

### V1 — Correção do OnInit

1. Salve um parâmetro no webapp e espere o EA sincronizar (até 60s).
2. Troque o timeframe do gráfico **duas vezes seguidas**, sem salvar nada entre elas.
3. Na aba **Especialistas** do MT5, as duas reinicializações devem imprimir
   `[HandBot] Parâmetros remotos carregados com sucesso.`

Antes da correção, a segunda não imprimia — e era aí que o EA voltava aos inputs locais.

### V2 — Hedge total e stand by (conta DEMO)

1. Configure `dynamic_hedge_percent` bem baixo (ex.: `0.05`) e ligue `dynamic_hedge_enabled`.
2. Abra posição e deixe o flutuante negativo cruzar o gatilho.
3. Confira, em ordem:

| O que checar | Esperado |
|---|---|
| Aba Especialistas | `[HandBot] HEDGE TOTAL acionado ... EA em STAND BY TOTAL` |
| Ordens pendentes | todas canceladas |
| Stops e takes das posições | zerados |
| Exposição líquida | neutra (volume comprado = vendido) |
| Painel | `HEDGE TRAVADO - liquide manualmente para liberar` |
| Depois de 5+ minutos | **nenhuma** ordem nova, mesmo cruzando gatilhos de grid/add |
| Fim da sessão | as posições **não** são fechadas automaticamente |

4. Feche tudo manualmente. Deve sair `[HandBot] Stand by encerrado apos N min` e o EA volta a operar.

### V3 — Reinício durante a trava

Com a trava ativa, remova e recoloque o EA no gráfico. Ele deve re-armar o stand by sozinho, logando
`Exposicao ja estava neutra`. Se em vez disso voltar a operar normalmente, veja a limitação conhecida
abaixo.

---

## Limitação conhecida

O estado da trava vive **apenas em memória**. Se o MT5 for reiniciado durante o stand by, o EA
re-arma sozinho no primeiro tick — mas só porque o flutuante congelado continua abaixo do gatilho.
Se swap ou spread empurrarem o flutuante para cima da linha nesse intervalo, o EA volta a operar
sobre uma posição travada, e o grid começa a somar.

A janela é estreita, mas existe. A solução é persistir o estado em `GlobalVariableSet` por
símbolo/magic. Não foi implementada — decidir se vale.

---

## Texto sugerido para o aviso aos clientes

> **Atualização do Hand Bot — mudança no Hedge Dinâmico**
>
> Baixe a nova versão do robô no painel e recoloque no gráfico.
>
> O Hedge Dinâmico mudou: antes ele fazia coberturas parciais a cada nível de prejuízo e o robô
> continuava operando. Agora, ao atingir o percentual configurado, ele **trava toda a exposição de
> uma vez** — cancela as ordens pendentes, remove stops e takes, e **para completamente**.
>
> Enquanto estiver travado, o robô não envia nenhuma ordem: não abre entradas, não faz grid, não
> fecha por meta do dia nem por fim de sessão. O painel mostra `HEDGE TRAVADO`.
>
> Para liberar, **feche manualmente todas as posições e ordens**. O robô volta a operar sozinho
> assim que a conta estiver zerada.
