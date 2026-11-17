# Roadmap: redesign do WebApp Trader AFK (estética Osher, cor AFK)

> **Como usar:** abra o Claude Code na raiz do WebApp e diga:
> `Leia REDESIGN_ROADMAP.md e execute a Fase 0.`
> Ao fim de cada fase, pare, mostre o resultado e espere o OK antes de seguir.

## Objetivo

Levar o WebApp para a mesma linguagem visual da landing, já refatorada e em produção em
`../afk-landing` (commit `4a85570`). A landing é a **fonte da verdade**: leia antes de começar.

- `../afk-landing/src/index.css`: tokens (`@theme`) e utilitários (`eyebrow`, `glass-card`, `glass-card-hover`, `hairline`, `text-gradient-brand`, `bg-grid-fade`)
- `../afk-landing/src/components/ui/`: `Button`, `Eyebrow`, `SectionHeader`, `Reveal`, `Backdrop`
- `../afk-landing/src/lib/cn.ts`
- `../afk-landing/src/components/blocks/Hero.tsx` e `TradingJournal.tsx`: referência de "painel de produto" no novo estilo

A estética vem de osher.work, aplicada com a cor do Trader AFK:
- fundo quase preto neutro (#0a0a0a), sem tons azulados;
- **um único destaque, o verde da marca** (#22c55e, com gradiente #5eea96 → #22c55e → #15803d);
- títulos em Space Grotesk e corpo em Inter;
- rótulos em caixa alta com tracking largo;
- cards de vidro com borda que acende em verde no hover;
- linhas finas em gradiente, brilhos difusos e movimento contido.

O resultado deve ser premium e silencioso, sem cara de "neon gamer".

## Ponto de partida (levantado em 2026-09-23)

- Vite 6 + React 19 + TS, **sem Tailwind instalado**. O Tailwind v3 vem de `<script src="https://cdn.tailwindcss.com">` no `index.html`.
- O `index.html` também tem um `importmap` apontando React e lucide para esm.sh. Parece sobra de outra ferramenta e compete com o bundle do Vite.
- O tema é **claro**: `bg-white` (~262 usos), `bg-slate-50` (~163), `text-slate-900` no body e **nenhum** `dark:`.
- As cores estão hardcoded nos componentes: `green-*` (~830), `red-*` (~274), `amber-*` (~136), `emerald/blue/indigo/purple` (~245), `shadow-*` (~365).
- Os títulos usam a fonte Outfit (`index.css`). Há uma scrollbar customizada clara.
- São ~119 arquivos .ts/.tsx e ~21 mil linhas. Os maiores: `Admin/AdminPanel.tsx` (2258), `HandBot/HandBot.tsx` (1161), `Education.tsx` (977), `Marketing.tsx` (899), `Dashboard/UserDashboard.tsx` (642).
- Há PWA (`manifest.json`, `sw.js`, `theme-color #16a34a`), Supabase, TradingView (`Signals/TradingViewChart.tsx`), loaders `ldrs` e `react-quick-pinch-zoom`.

Confirme esses números no início, porque o código pode ter mudado.

## Regras para todas as fases

1. **É uma refatoração visual.** Não altere lógica, chamadas ao Supabase, textos, rotas, estados ou nomes de props.
2. **Cores semânticas continuam semânticas:** verde para lucro, compra, sucesso e ativo; vermelho para perda, venda e erro; âmbar para aviso e pendente. Use as versões para fundo escuro (`text-red-400`, `bg-red-500/10`, `border-red-500/20` etc.).
3. **Os dados reais do usuário não recebem blur.** O blur da landing era só para o marketing.
4. **Mobile first.** Nada pode gerar rolagem horizontal em 375px. Sidebar, modais e tabelas precisam funcionar no celular.
5. **Contraste AA:** texto secundário no mínimo `#a3a3a3` sobre `#0a0a0a`. Mantenha foco visível e `prefers-reduced-motion`.
6. **Trabalhe numa branch** (`refactor/redesign-osher`) e faça um commit por fase. O build tem que passar ao fim de cada fase.
7. **Verifique vendo a tela.** Tire screenshots antes e depois (puppeteer-core com o Chrome instalado em `C:/Program Files/Google/Chrome/Application/chrome.exe` funciona bem aqui) em 1440px e 390px. Screenshot `fullPage` em página muito alta pode repetir trechos: prefira tirar por viewport, rolando.

## Fase 0: reconhecimento e decisões (sem mexer em código)

1. Leia a landing (arquivos acima), `App.tsx`, `index.html`, `index.css`, `components/Sidebar.tsx` e uma tela grande (`Dashboard/UserDashboard.tsx`).
2. Liste todas as rotas e telas, e como se chega a cada uma (inclusive as que exigem login ou perfil admin). Descubra como rodar localmente com login, por exemplo com um usuário de teste. Se não houver jeito, pergunte.
3. Tire os screenshots de "antes" das telas principais.
4. **Pergunte ao usuário e espere as respostas:**
   - **Tema.** Recomendado: **só escuro**, igual à landing, com menos superfície de manutenção. A alternativa é escuro com opção de claro (`dark:` em tudo, quase o dobro de trabalho).
   - **Migrar do CDN para o Tailwind v4 compilado** (`tailwindcss` + `@tailwindcss/vite`)? Recomendado: **sim**. O CDN não é para produção e não suporta os tokens `@theme` da landing.
   - **Remover o `importmap`** do `index.html`? Recomendado: sim, depois de confirmar que o build do Vite resolve tudo.
   - **Área Admin:** redesenhar junto ou deixar para o fim ou para depois?
5. Entregue um plano curto com as fases abaixo ajustadas ao que encontrou.

## Fase 1: infraestrutura de estilo (sem mudança visual intencional)

1. Instale `tailwindcss@4`, `@tailwindcss/vite`, `clsx` e `tailwind-merge`. Adicione o plugin no `vite.config.ts`.
2. Tire o `<script src="https://cdn.tailwindcss.com">` e, se aprovado, o `importmap`. Importe o CSS pelo `index.tsx`, não via `<link>`.
3. Migre o `index.css` para `@import "tailwindcss";`. Mantenha por enquanto os estilos globais existentes (scrollbar etc.).
4. **Diferenças do v3 para o v4 que quebram layout em silêncio.** Procure no código e corrija:
   - `shadow-sm` passou a ser `shadow-xs`, e `shadow` passou a ser `shadow-sm`. Com `rounded-sm`/`rounded` e `blur-sm`/`blur` acontece o mesmo.
   - `ring` agora tem 1px em vez de 3px (use `ring-3` onde precisar).
   - A cor padrão de borda e de ring agora é `currentColor`, então todo `border` sem cor precisa de uma cor explícita.
   - `outline-none` virou `outline-hidden`.
   - `bg-opacity-*`, `text-opacity-*` etc. saíram. Use `bg-black/50`.
   - `flex-shrink-*`/`flex-grow-*` viraram `shrink-*`/`grow-*`.
   - O `space-y-*` agora usa outro seletor; confira listas com filhos condicionais.
   - Teste `npx @tailwindcss/upgrade`. Sem um `tailwind.config` ele pode não pegar tudo, então revise o diff.
5. **Critério de aceite:** o app fica visualmente igual ao "antes", ainda claro. Compare os screenshots. O build e o `tsc` passam.

## Fase 2: design system

1. Crie `lib/cn.ts` igual ao da landing.
2. No `index.css`, copie o bloco `@theme` e os `@utility` da landing, incluindo o remapeamento de `slate-*` para cinzas neutros. Acrescente o que um app precisa e a landing não tinha:
   - superfícies `--color-brand-surface` (#111111), `--color-brand-elevated` (#171717) e `--color-brand-line` (#262626);
   - um estilo de input: `bg-white/[0.03]`, `border-white/10`, foco em `border-brand-green/60 ring-brand-green/20`, placeholder `text-neutral-500`;
   - a scrollbar escura: thumb `#262626`, hover `#333`.
3. Troque a fonte Outfit por **Space Grotesk** nos `h1`–`h4` e em `.font-display`. Mantenha Inter no corpo e use JetBrains Mono para números e tickers. Coloque a regra no `@layer base`, como na landing.
4. Crie os primitivos em `components/ui/`, reaproveitando os da landing quando fizer sentido:
   - `Button` (primary em gradiente verde com texto escuro; outline; secondary; ghost; danger);
   - `Card` (glass-card, com variante interativa);
   - `Input`, `Select`, `Textarea`, `Label`;
   - `Badge` (neutral, success, danger, warning, info);
   - `Modal` ou `Dialog` (overlay `bg-black/70 backdrop-blur-sm`, painel glass com hairline no topo);
   - `Tabs`, `Table` (cabeçalho em eyebrow, linhas com `divide-white/[0.06]` e hover `bg-white/[0.02]`);
   - `PageHeader` (eyebrow, título display, descrição e ações);
   - `EmptyState`, `Skeleton` e `Stat` (número em `font-display` e rótulo em eyebrow cinza).
5. **Mapa de conversão.** Documente num comentário do `index.css` ou em `docs/DESIGN_TOKENS.md` e siga nas fases seguintes:

| Antes (claro)                                       | Depois (escuro)                                                      |
|-----------------------------------------------------|----------------------------------------------------------------------|
| `bg-slate-50` (fundo de página)                     | `bg-brand-dark`                                                      |
| `bg-white` (card/painel)                            | `glass-card` ou `bg-brand-surface border border-white/[0.08]`        |
| `bg-slate-100` / `bg-gray-100` (área secundária)    | `bg-white/[0.03]`                                                    |
| `text-slate-900` / `text-gray-900`                  | `text-white`                                                         |
| `text-slate-600/700`                                | `text-neutral-300`                                                   |
| `text-slate-400/500`                                | `text-brand-muted` (#a3a3a3) / `text-brand-subtle` (#737373)         |
| `border-slate-100/200`                              | `border-white/[0.06]` / `border-white/[0.08]`                        |
| `bg-green-600` (ação principal)                     | `Button variant="primary"`                                           |
| `bg-green-50 text-green-700` (badge/destaque)       | `bg-brand-green/10 text-brand-green border border-brand-green/20`    |
| `bg-red-50 text-red-600`                            | `bg-red-500/10 text-red-400 border border-red-500/20`                |
| `bg-amber-50 text-amber-700`                        | `bg-amber-500/10 text-amber-300 border border-amber-500/20`          |
| `blue/indigo/purple` decorativos                    | verde da marca ou neutro (use `info` só onde for semântico)          |
| `shadow-md/lg/xl` em cards                          | nenhum; a borda e o hover fazem o papel                              |
| `hover:shadow-*`                                    | `glass-card-hover`                                                   |

6. **Critério de aceite:** existe uma página de amostra temporária, `/__ui`, só em dev, mostrando todos os primitivos. Tire screenshots dela em desktop e mobile.

## Fase 3: casca do app

Faça `index.html`, o layout em `App.tsx`, `Sidebar.tsx`, o header/topbar, `Auth/Login.tsx`, `Logo.tsx`, `BackButton.tsx`, `Chat/ChatWidget.tsx`/`ChatWindow.tsx` e `PlatformTour.tsx`.
- **Body:** `bg-brand-dark text-neutral-100`. `theme-color` em `#0a0a0a`, e `manifest.json` (`background_color`/`theme_color`) atualizado também.
- **Sidebar:** superfície `bg-brand-surface` com borda direita `white/[0.06]`. O item ativo ganha uma barra fina verde à esquerda e `bg-white/[0.04]`. Os ícones ficam cinza e ficam verdes quando ativos. Os rótulos de grupo usam eyebrow cinza.
- **Login:** mesma linguagem do hero da landing, com `Backdrop`/`bg-grid-fade`, card de vidro e o título com destaque em `text-gradient-brand`.
- **Critério de aceite:** screenshots de login, dashboard vazio e sidebar aberta e fechada no mobile.

## Fase 4: telas, em lotes

Converta seguindo o mapa da Fase 2 e usando os primitivos. Cada lote vira um commit. Lotes independentes podem rodar em paralelo com subagentes que recebam este arquivo, o mapa de conversão e a lista exata de arquivos.

1. **Dashboard e conteúdo:** `Dashboard/*`, `Journey.tsx`, `Education.tsx`, `Education/CoursePlayer.tsx`, `Downloads.tsx`, `Settings.tsx`.
2. **Trading:** `Strategies.tsx`, `RobotDetails.tsx`, `Licenses.tsx`, `Mt5Connection/*`, `LivePortfolio/*`, `Treasury.tsx`, `Treasury/*`, `HandBot/HandBot.tsx`.
3. **Mercado e análise:** `Market.tsx`, `Signals/*`, `Crypto/*`, `EconCalendar/*`, `Analysis/*`, `Journal/*`.
4. **Gamificação:** `TrilhaGain/*`. Tem candles e mapas próprios; mantenha as cores de alta e baixa.
5. **Marketing e parceiros:** `Marketing.tsx`.
6. **Admin (por último):** `Admin/*`. O `AdminPanel.tsx` é grande; divida por aba ou seção e faça commits intermediários.

Para cada tela: nada de azul, índigo ou roxo decorativo; cabeçalhos com `PageHeader`; números em `font-display` ou `font-mono` com `tabular-nums`; tabelas e listas no padrão `Table`; estados vazio e de carregamento com `EmptyState` e `Skeleton`.

## Fase 5: terceiros e detalhes

- **TradingView:** passe `theme: "dark"` e cores de fundo e grade compatíveis (`#0a0a0a`/`#111111`, grade `rgba(255,255,255,0.04)`).
- **Loaders `ldrs`:** cor `#22c55e`. **Pinch-zoom e imagens:** confira fundos claros "vazando".
- **E-mails, PDFs e relatórios** gerados pelo app (`ReportView`) talvez precisem continuar claros para impressão. Pergunte antes de mudar.
- **Service worker:** mude a versão do cache para o CSS novo não ficar preso em quem já instalou o PWA.
- **Caça aos restos:** procure `bg-white`, `bg-slate-50`, `text-slate-900`, `shadow-lg`, `blue-`, `indigo-`, `purple-` e justifique cada ocorrência que ficar.

## Fase 6: QA e entrega

1. `npm run build` e `tsc --noEmit` limpos.
2. Screenshots de "depois" de todas as rotas em 1440px e 390px. Monte um comparativo antes/depois das telas principais.
3. Confira: sem overflow horizontal, contraste AA, foco visível no teclado, modais fecham com Esc, `prefers-reduced-motion` respeitado.
4. Teste os fluxos críticos logado: login, conectar MT5, solicitar licença, registrar trade no diário e abrir o chat.
5. Resuma o que mudou, o que ficou pendente e os riscos. Só faça merge na `main` com o OK do usuário.
