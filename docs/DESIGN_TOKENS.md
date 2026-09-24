# Design tokens — Trader AFK

Referência para converter as telas no redesign (Fases 3 a 5 do `REDESIGN_ROADMAP.md`).
Os tokens ficam em `index.css`, e os componentes base em `components/ui/`. Em desenvolvimento, `/__ui` mostra todos os componentes nos dois temas.

## Como os dois temas funcionam

As telas usam **tokens semânticos**. Os valores são trocados pelo atributo `data-theme` (`dark` ou `light`) em qualquer ancestral.
Não use `dark:` nem cores fixas de fundo e texto nas telas: se o token certo for usado, o tema claro sai sem esforço extra.

| Token | Uso | Escuro | Claro |
|---|---|---|---|
| `bg-page` | fundo da página | `#0a0a0a` | `#fafafa` |
| `bg-surface` | card, painel, modal, sidebar | `#111111` | `#ffffff` |
| `bg-elevated` | superfície acima de outra (menu, popover) | `#171717` | `#f5f5f5` |
| `border-line` / `border-line-strong` | bordas sólidas | `#262626` / `#333` | `#e5e5e5` / `#d4d4d4` |
| `tint` + opacidade | camadas translúcidas (`bg-tint/3`, `border-tint/8`) | branco | preto |
| `text-fg` | texto principal | `#f5f5f5` | `#0a0a0a` |
| `text-fg-muted` | texto secundário (mínimo AA) | `#a3a3a3` | `#525252` |
| `text-fg-subtle` | datas e rodapés (ainda AA) | `#8a8a8a` | `#6b6b6b` |
| `bg-accent` / `text-accent-fg` | destaque da marca | `#22c55e` / `#4ade80` | `#16a34a` / `#15803d` |
| `success` / `danger` / `warning` / `info` | base para fundo e borda com opacidade | | |
| `text-success-fg` etc. | texto semântico legível no tema | 400 | 700 |

Utilitários: `eyebrow`, `eyebrow-muted`, `glass-card`, `glass-card-hover`, `text-gradient-brand`, `hairline`, `hairline-neutral`, `bg-grid-fade` e `ds-scrollbar`.

Fontes (valem dentro de `[data-theme]`):
- `font-display` (Space Grotesk) para títulos;
- Inter no corpo;
- `font-mono` (JetBrains Mono) para números e tickers, sempre com `tabular-nums`.

Cores fixas da marca, as mesmas nos dois temas: `brand-green`, `brand-green-bright`, `brand-green-deep`, `brand-red`, `brand-gold`. Use em gradientes e brilhos, não em texto.

## Mapa de conversão

| Antes (claro, Tailwind puro) | Depois (token) |
|---|---|
| `bg-slate-50` (fundo de página) | `bg-page` |
| `bg-white` (card/painel) | `<Card>` / `glass-card`, ou `bg-surface border border-tint/8` |
| `bg-slate-100` / `bg-gray-100` (área secundária) | `bg-tint/3` |
| `text-slate-900` / `text-gray-900` | `text-fg` |
| `text-slate-600/700` | `text-fg-muted` |
| `text-slate-400/500` | `text-fg-muted` (se precisa ser lido) ou `text-fg-subtle` |
| `border-slate-100/200` | `border-tint/6` / `border-tint/8` |
| `divide-slate-100` | `divide-tint/6` |
| `bg-green-600` (ação principal) | `<Button>` (primary) |
| `bg-green-50 text-green-700` (badge/destaque) | `<Badge tone="accent">` ou `bg-accent/10 text-accent-fg border border-accent/20` |
| `text-green-600` (lucro/compra) | `text-success-fg` |
| `bg-red-50 text-red-600` | `<Badge tone="danger">` ou `bg-danger/10 text-danger-fg border border-danger/20` |
| `bg-amber-50 text-amber-700` | `<Badge tone="warning">` ou `bg-warning/10 text-warning-fg border border-warning/20` |
| `blue/indigo/purple` decorativos | accent ou neutro (`info` só onde for semântico) |
| `shadow-md/lg/xl` em cards | nada: a borda e o hover fazem o papel |
| `hover:shadow-*` | `glass-card-hover` (ou `<Card interactive>`) |
| inputs com `border-slate-300 focus:border-green-500` | `<Input>`, `<Select>`, `<Textarea>` |
| cabeçalho de tela (ícone + h1 + subtítulo) | `<PageHeader>` |
| tabela com `thead bg-slate-50` | `<Table>` / `THead` / `TH` / `TD` |
| "Nenhum item…" em caixa tracejada | `<EmptyState>` |
| `Loader2` centralizado no carregamento de lista | `<Skeleton>` no formato do conteúdo |

## Regras que não mudam

- **As cores semânticas continuam semânticas:** verde para lucro, compra, sucesso e ativo; vermelho para perda, venda e erro; âmbar para aviso e pendente.
- **Dados reais do usuário nunca recebem blur.**
- **Nada de rolagem horizontal em 375px:** tabelas rolam dentro do próprio wrapper (o `<Table>` já faz isso).
- **Foco visível:** os componentes já usam `ring-accent/60`. Em botão próprio, repita `focus-visible:ring-2 focus-visible:ring-accent/60`.
- **Classes inteiras no código:** o Tailwind compilado não enxerga `bg-${cor}-50`. Use mapas com as classes escritas por completo.
- **Cor em SVG ou `style` inline:** use `var(--ds-success)`, `var(--ds-line)` etc. As variáveis `--color-success`, `--color-fg`... **não existem no CSS gerado** (`@theme inline` só as usa dentro dos utilitários).
- **Logo:** `<Logo>` escolhe a arte pelo tema (`logo-icon.png` branca no escuro, `icon.png` escura no claro).
