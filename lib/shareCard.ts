// Gerador de cards compartilháveis (PNG) — desenhado direto no <canvas>, sem
// dependências. O card segue a identidade do app: fundo quase preto, um único
// destaque verde, Space Grotesk nos títulos e JetBrains Mono nos números.
import type { BadgeGlyph, BadgeTier } from './badges';

export type ShareFormat = 'feed' | 'story';

export const SIZES: Record<ShareFormat, { w: number; h: number }> = {
  feed: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

export type Tone = 'up' | 'down' | 'neutral';

export interface ShareStat { label: string; value: string; tone?: Tone }

/** Resultado de uma operação, do dia/período ou da trajetória nas mesas. */
export interface ResultCard {
  kind: 'result';
  eyebrow: string;
  title: string;
  subtitle?: string;
  headline: string;
  headlineLabel?: string;
  tone: Tone;
  stats: ShareStat[];
  /** Linha do rodapé (padrão: diário de operações). */
  footer?: string;
  /** Endereços de imagens (prints do trade) para ilustrar o card; até 4. Se não carregarem, o card sai sem elas. */
  media?: string[];
}

export interface CardBadge { name: string; tier: BadgeTier; glyph: BadgeGlyph; earned: boolean }

export interface ProgressCard {
  kind: 'progress';
  rank: string;
  lessons: number;
  totalLessons: number;
  streak: number;
  bestStreak: number;
  badges: CardBadge[];
}

export interface BadgeCard {
  kind: 'badge';
  badge: { name: string; description: string; tier: BadgeTier; glyph: BadgeGlyph; tierLabel: string };
  rank: string;
  lessons: number;
  bestStreak: number;
}

/** Análise de um sinal (compra, venda ou sem entrada). */
export interface SignalShareCard {
  kind: 'signal';
  action: 'BUY' | 'SELL' | 'NONE';
  symbol: string;
  timeframe?: string | null;
  when: string;
  /** Entrada / Stop / Alvo; null quando não há setup. */
  levels: { label: string; value: string; tone: Tone }[] | null;
  themes: { title: string; value: string; tone: Tone }[];
  note?: string;
}

export type Dir3 = 'up' | 'down' | 'flat';

/** Interpretação de um indicador do calendário, antes ou depois da divulgação. */
export interface NewsShareCard {
  kind: 'news';
  phase: 'pre' | 'post';
  title: string;
  meta: string;
  stars: number;
  numbers: ShareStat[];
  headline: string;
  headlineTone: Tone;
  verdict?: string;
  rowsTitle: string;
  rows: { label: string; value: string; dir: Dir3 }[];
  note?: string;
  /** Substitui o texto do topo (padrão: "Calendário Econômico · antes/após a notícia"). */
  eyebrow?: string;
  /** Linhas de largura total (rótulos longos, como o nome de uma notícia). */
  wide?: boolean;
  /** Título acima do texto de análise e quantas linhas ele pode ocupar (padrão: sem título, 2 linhas). */
  noteTitle?: string;
  noteMax?: number;
}

/** Tela de parabéns da Trilha (Gain ou módulo concluído): ícone, título e caixa de Coins. */
export interface RewardCard {
  kind: 'reward';
  variant: 'gain' | 'module';
  eyebrow: string;
  title: string;
  subtitle?: string;
  coins: number;
  stats: ShareStat[];
  footer?: string;
}

export type CardSpec = ResultCard | ProgressCard | BadgeCard | SignalShareCard | NewsShareCard | RewardCard;

const C = {
  bg: '#0a0a0a', surface: '#111111', elevated: '#171717', line: '#262626',
  text: '#fafafa', muted: '#a3a3a3', subtle: '#737373',
  green: '#22c55e', greenBright: '#5eea96', greenDark: '#15803d',
  red: '#f87171', redDark: '#b91c1c',
};
const DISPLAY = '"Space Grotesk", Inter, system-ui, sans-serif';
const BODY = 'Inter, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

const TIER_COLORS: Record<BadgeTier, [string, string]> = {
  bronze: ['#f5c9a0', '#b9722f'],
  silver: ['#f1f5f9', '#94a3b8'],
  gold: ['#fde68a', '#d4a017'],
  diamond: ['#a5f3fc', '#22d3ee'],
};

const toneColor = (t: Tone | undefined) => (t === 'up' ? C.greenBright : t === 'down' ? C.red : C.text);
const toneGlow = (t: Tone | undefined) => (t === 'up' ? C.green : t === 'down' ? C.redDark : '#404040');

// ── utilidades de desenho ──
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Reduz o corpo da fonte até o texto caber em maxW. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number | string, family: string, size: number, maxW: number, min = 28) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > min) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; }
  return s;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' = 'left') {
  const w = [...text].reduce((t, ch) => t + ctx.measureText(ch).width + spacing, -spacing);
  let cx = align === 'center' ? x - w / 2 : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  ctx.textAlign = prev;
}

function loadImage(src: string, cors = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Imagem de outro domínio só vai para o canvas (e vira PNG) se o servidor liberar CORS.
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function background(ctx: CanvasRenderingContext2D, W: number, H: number, glow: string) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // grade sutil
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // brilho difuso no topo e no rodapé
  const g1 = ctx.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, W * 0.9);
  g1.addColorStop(0, `${glow}55`); g1.addColorStop(1, `${glow}00`);
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.1, H, 0, W * 0.1, H, W * 0.8);
  g2.addColorStop(0, `${C.green}22`); g2.addColorStop(1, `${C.green}00`);
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  // moldura
  ctx.strokeStyle = C.line; ctx.lineWidth = 2; roundRect(ctx, 24, 24, W - 48, H - 48, 36); ctx.stroke();
}

function header(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, W: number) {
  const x = 84, y = 92;
  if (logo) ctx.drawImage(logo, x, y - 12, 64, 64);
  ctx.fillStyle = C.text; ctx.font = `700 34px ${DISPLAY}`; ctx.textBaseline = 'alphabetic';
  spaced(ctx, 'TRADER AFK', x + 84, y + 32, 5);
  ctx.fillStyle = C.green; ctx.fillRect(W - 84 - 120, y + 18, 120, 3);
}

function footer(ctx: CanvasRenderingContext2D, W: number, H: number, line: string) {
  ctx.fillStyle = C.line; ctx.fillRect(84, H - 168, W - 168, 2);
  ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = `500 28px ${BODY}`;
  ctx.fillText(line, 84, H - 108);
  ctx.textAlign = 'right'; ctx.fillStyle = C.greenBright; ctx.font = `700 34px ${DISPLAY}`;
  ctx.fillText('traderafk.com', W - 84, H - 106);
  ctx.textAlign = 'left';
}

function statBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s: ShareStat) {
  ctx.fillStyle = C.surface; roundRect(ctx, x, y, w, h, 24); ctx.fill();
  ctx.strokeStyle = C.line; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 24); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = C.subtle;
  const lab = s.label.toUpperCase();
  let ls = 22;
  const labW = (size: number) => { ctx.font = `600 ${size}px ${BODY}`; return [...lab].reduce((t, ch) => t + ctx.measureText(ch).width + 2.5, -2.5); };
  while (ls > 13 && labW(ls) > w - 60) ls -= 1;
  ctx.font = `600 ${ls}px ${BODY}`;
  spaced(ctx, lab, x + 30, y + 42, 2.5);
  ctx.fillStyle = toneColor(s.tone);
  const size = fitFont(ctx, s.value, 500, MONO, Math.min(52, h - 88), w - 60, 24);
  ctx.font = `500 ${size}px ${MONO}`;
  ctx.fillText(s.value, x + 30, y + h - 26);
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function flame(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.bezierCurveTo(cx + r * 0.2, cy - r * 0.5, cx + r * 0.85, cy - r * 0.15, cx + r * 0.7, cy + r * 0.45);
  ctx.bezierCurveTo(cx + r * 0.6, cy + r * 0.95, cx - r * 0.6, cy + r * 0.95, cx - r * 0.7, cy + r * 0.45);
  ctx.bezierCurveTo(cx - r * 0.8, cy + r * 0.05, cx - r * 0.35, cy - r * 0.1, cx - r * 0.2, cy - r * 0.45);
  ctx.bezierCurveTo(cx - r * 0.05, cy - r * 0.2, cx + r * 0.05, cy - r * 0.55, cx, cy - r);
  ctx.closePath();
}

function medal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, tier: BadgeTier, glyph: BadgeGlyph, earned: boolean) {
  const [light, dark] = TIER_COLORS[tier];
  if (earned) {
    const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.7);
    halo.addColorStop(0, `${dark}66`); halo.addColorStop(1, `${dark}00`);
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2); ctx.fill();
  }
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  if (earned) { g.addColorStop(0, light); g.addColorStop(1, dark); } else { g.addColorStop(0, '#1f1f1f'); g.addColorStop(1, '#171717'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = earned ? 'rgba(255,255,255,0.55)' : C.line;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = earned ? '#0a0a0a' : '#3a3a3a';
  if (glyph === 'star') star(ctx, cx, cy + r * 0.04, r * 0.46); else flame(ctx, cx, cy, r * 0.46);
  ctx.fill();
}

/** Desenha a imagem preenchendo o retângulo (recorte central), com cantos arredondados e borda. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 24); ctx.clip();
  ctx.fillStyle = C.surface; ctx.fillRect(x, y, w, h);
  const k = Math.max(w / img.width, h / img.height);
  const dw = img.width * k, dh = img.height * k;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
  ctx.strokeStyle = C.line; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 24); ctx.stroke();
}

/** Grade de prints: 1 ocupa tudo; 2 lado a lado (ou empilhadas se a área for alta); 3 = uma larga + duas; 4 = 2x2. */
function drawMediaGrid(ctx: CanvasRenderingContext2D, imgs: HTMLImageElement[], x: number, y: number, w: number, h: number) {
  const g = 16, n = imgs.length;
  if (n === 1) { drawCover(ctx, imgs[0], x, y, w, h); return; }
  if (n === 2) {
    if (h > w * 0.9) {
      const hh = (h - g) / 2;
      drawCover(ctx, imgs[0], x, y, w, hh); drawCover(ctx, imgs[1], x, y + hh + g, w, hh);
    } else {
      const ww = (w - g) / 2;
      drawCover(ctx, imgs[0], x, y, ww, h); drawCover(ctx, imgs[1], x + ww + g, y, ww, h);
    }
    return;
  }
  const hh = (h - g) / 2, ww = (w - g) / 2;
  if (n === 3) {
    drawCover(ctx, imgs[0], x, y, w, hh);
    drawCover(ctx, imgs[1], x, y + hh + g, ww, hh);
    drawCover(ctx, imgs[2], x + ww + g, y + hh + g, ww, hh);
    return;
  }
  imgs.slice(0, 4).forEach((im, i) => drawCover(ctx, im, x + (i % 2) * (ww + g), y + Math.floor(i / 2) * (hh + g), ww, hh));
}

/** Versão do card de resultado com os prints do trade no meio: cabeçalho enxuto, prints e até 3 números. */
function drawResultMedia(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, W: number, H: number, s: ResultCard, media: HTMLImageElement[]) {
  background(ctx, W, H, toneGlow(s.tone));
  header(ctx, logo, W);
  const top = 190, bottom = H - 200, gap = 18, statsH = 124;
  const headH = 40 + 110 + (s.subtitle ? 56 : 0) + 30 + 120;
  const mediaMax = Math.min(1000, bottom - top - headH - statsH - gap * 2);
  const mw = W - 168;
  const mediaH = media.length === 1
    ? Math.max(300, Math.min(mediaMax, mw * (media[0].height / media[0].width)))
    : mediaMax;
  const block = headH + gap + mediaH + gap + statsH;
  let y = top + Math.max(0, (bottom - top - block) / 2);

  ctx.textAlign = 'left'; ctx.fillStyle = C.green; ctx.font = `700 28px ${BODY}`;
  spaced(ctx, s.eyebrow.toUpperCase(), 84, y + 30, 6);
  y += 40;
  ctx.fillStyle = C.text;
  const ts = fitFont(ctx, s.title, 700, DISPLAY, 96, W - 168, 48);
  ctx.font = `700 ${ts}px ${DISPLAY}`;
  ctx.fillText(s.title, 84, y + 84);
  y += 110;
  if (s.subtitle) {
    ctx.fillStyle = C.muted; ctx.font = `500 30px ${BODY}`;
    ctx.fillText(s.subtitle, 84, y + 28);
    y += 56;
  }
  if (s.headlineLabel) {
    ctx.fillStyle = C.subtle; ctx.font = `600 22px ${BODY}`;
    spaced(ctx, s.headlineLabel.toUpperCase(), 84, y + 18, 4);
  }
  y += 30;
  ctx.fillStyle = toneColor(s.tone);
  const hs = fitFont(ctx, s.headline, 500, MONO, 110, W - 168, 56);
  ctx.font = `500 ${hs}px ${MONO}`;
  ctx.fillText(s.headline, 84, y + hs * 0.82);
  y += 120 + gap;

  drawMediaGrid(ctx, media, 84, y, mw, mediaH);
  y += mediaH + gap;

  const st = s.stats.slice(0, 3), n = Math.max(1, st.length), bg = 16, bw = (mw - bg * (n - 1)) / n;
  st.forEach((x, i) => statBox(ctx, 84 + i * (bw + bg), y, bw, statsH, x));
  footer(ctx, W, H, s.footer ?? 'Meu diário de operações');
}

// ── cards ──
/**
 * Amplia o corpo do card (fontes, caixas e espaços juntos) até ele ocupar a altura útil, no máximo 1,5x.
 * Devolve a largura e os limites verticais no espaço ampliado; quem chama usa `W` e `top/bottom` devolvidos
 * e fecha com ctx.restore() antes de desenhar o rodapé. As margens laterais (84 px) ficam iguais às do cabeçalho.
 */
function beginFit(ctx: CanvasRenderingContext2D, W: number, H: number, content: number, kmax = 1.5) {
  const top = 190, avail = H - 200 - top;
  const k = Math.max(1, Math.min(kmax, avail / content));
  ctx.save();
  ctx.translate(84 * (1 - k), top * (1 - k));
  ctx.scale(k, k);
  return { k, W: (W - 168) / k + 168, top, bottom: top + avail / k };
}

function drawResult(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, W: number, H: number, s: ResultCard) {
  background(ctx, W, H, toneGlow(s.tone));
  header(ctx, logo, W);
  const RW = W, RH = H; // medidas reais (o corpo do card é desenhado numa escala ampliada)

  // Mais de 4 caixas (ex.: um ponteiro por timeframe): layout compacto para caber no feed.
  const compact = s.stats.length > 4;
  const boxH = compact ? 120 : 168;
  const headArea = compact ? 170 : 215;
  const rows = Math.ceil(s.stats.length / 2);
  const statsH = rows * boxH + Math.max(0, rows - 1) * 24;
  const blockH = 40 + 24 + 130 + (s.subtitle ? 56 : 0) + 60 + headArea + 50 + statsH;
  const fit = beginFit(ctx, W, H, blockH);
  W = fit.W;
  const { top, bottom } = fit;
  let y = top + Math.max(0, (bottom - top - blockH) / 2);

  ctx.textAlign = 'left'; ctx.fillStyle = C.green; ctx.font = `700 28px ${BODY}`;
  spaced(ctx, s.eyebrow.toUpperCase(), 84, y + 30, 6);
  y += 40 + 24;

  ctx.fillStyle = C.text;
  const ts = fitFont(ctx, s.title, 700, DISPLAY, 120, W - 168, 56);
  ctx.font = `700 ${ts}px ${DISPLAY}`;
  ctx.fillText(s.title, 84, y + 96);
  y += 130;
  if (s.subtitle) {
    ctx.fillStyle = C.muted; ctx.font = `500 32px ${BODY}`;
    ctx.fillText(s.subtitle, 84, y + 30);
    y += 56;
  }
  y += 60;

  if (s.headlineLabel) {
    ctx.fillStyle = C.subtle; ctx.font = `600 24px ${BODY}`;
    spaced(ctx, s.headlineLabel.toUpperCase(), 84, y + 8, 4);
  }
  ctx.fillStyle = toneColor(s.tone);
  const hs = fitFont(ctx, s.headline, 500, MONO, compact ? 130 : 170, W - 168, 60);
  ctx.font = `500 ${hs}px ${MONO}`;
  ctx.fillText(s.headline, 84, y + 46 + hs * 0.8);
  y += headArea + 50;

  const bw = (W - 168 - 24) / 2;
  s.stats.slice(0, 6).forEach((st, i) => {
    statBox(ctx, 84 + (i % 2) * (bw + 24), y + Math.floor(i / 2) * (boxH + 24), bw, boxH, st);
  });
  ctx.restore();
  footer(ctx, RW, RH, s.footer ?? 'Meu diário de operações');
}

function drawProgress(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, W: number, H: number, s: ProgressCard) {
  background(ctx, W, H, C.green);
  header(ctx, logo, W);
  const RW = W, RH = H; // medidas reais (o corpo do card é desenhado numa escala ampliada)

  const content = 50 + 100 + 360 + 40 + 140 + 40 + 196;
  const fit = beginFit(ctx, W, H, content);
  W = fit.W;
  const { top, bottom } = fit;
  const cx = W / 2;
  let y = top + Math.max(0, (bottom - top - content) / 2);

  ctx.textAlign = 'center'; ctx.fillStyle = C.green; ctx.font = `700 28px ${BODY}`;
  spaced(ctx, 'MINHA JORNADA NA TRILHA GAIN', cx, y + 28, 5, 'center');
  y += 50;
  ctx.fillStyle = C.text;
  const rs = fitFont(ctx, s.rank, 700, DISPLAY, 88, W - 168, 48);
  ctx.font = `700 ${rs}px ${DISPLAY}`;
  ctx.fillText(s.rank, cx, y + 76);
  y += 100;

  // anel de progresso
  const R = 140, ry = y + 170;
  const pct = s.totalLessons > 0 ? Math.min(1, s.lessons / s.totalLessons) : 0;
  ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.strokeStyle = C.elevated; ctx.beginPath(); ctx.arc(cx, ry, R, 0, Math.PI * 2); ctx.stroke();
  if (pct > 0) {
    const g = ctx.createLinearGradient(cx - R, ry - R, cx + R, ry + R);
    g.addColorStop(0, C.greenBright); g.addColorStop(1, C.greenDark);
    ctx.strokeStyle = g; ctx.beginPath(); ctx.arc(cx, ry, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct); ctx.stroke();
  }
  ctx.fillStyle = C.text; ctx.font = `500 84px ${MONO}`; ctx.fillText(`${Math.round(pct * 100)}%`, cx, ry + 18);
  ctx.fillStyle = C.muted; ctx.font = `500 26px ${BODY}`;
  ctx.fillText(s.totalLessons > 0 ? `${s.lessons} de ${s.totalLessons} aulas` : `${s.lessons} aulas`, cx, ry + 62);
  y += 360 + 40;

  const bw = (W - 168 - 24) / 2;
  statBox(ctx, 84, y, bw, 140, { label: 'Sequência', value: `${s.streak} dias`, tone: s.streak > 0 ? 'up' : 'neutral' });
  statBox(ctx, 84 + bw + 24, y, bw, 140, { label: 'Melhor sequência', value: `${s.bestStreak} dias` });
  y += 140 + 40;

  // insígnias (até 10, em duas fileiras de 5)
  const shown = s.badges.slice(0, 10);
  const per = 5, r = 44, gap = (W - 168 - per * r * 2) / (per - 1);
  shown.forEach((b, i) => {
    const bx = 84 + r + (i % per) * (r * 2 + gap);
    const by = y + r + Math.floor(i / per) * (r * 2 + 20);
    medal(ctx, bx, by, r, b.tier, b.glyph, b.earned);
  });
  ctx.textAlign = 'left';
  ctx.restore();
  footer(ctx, RW, RH, 'Aprendendo a operar, um dia de cada vez');
}

function drawBadge(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, W: number, H: number, s: BadgeCard) {
  const [, dark] = TIER_COLORS[s.badge.tier];
  background(ctx, W, H, dark);
  header(ctx, logo, W);
  const RW = W, RH = H; // medidas reais (o corpo do card é desenhado numa escala ampliada)

  // Medalha de 150 px de raio: o bloco todo (~830 px) cabe no formato feed (960 px úteis).
  const content = 50 + 340 + 50 + 100 + 40 + 70 + 50 + 140;
  const fit = beginFit(ctx, W, H, content);
  W = fit.W;
  const { top, bottom } = fit;
  let y = top + Math.max(0, (bottom - top - content) / 2);
  const cx = W / 2;

  ctx.textAlign = 'center'; ctx.fillStyle = C.green; ctx.font = `700 28px ${BODY}`;
  spaced(ctx, 'NOVA INSÍGNIA CONQUISTADA', cx, y + 28, 6, 'center');
  y += 50;
  medal(ctx, cx, y + 170, 150, s.badge.tier, s.badge.glyph, true);
  y += 340 + 50;

  ctx.fillStyle = C.text;
  const ns = fitFont(ctx, s.badge.name, 700, DISPLAY, 88, W - 168, 48);
  ctx.font = `700 ${ns}px ${DISPLAY}`; ctx.fillText(s.badge.name, cx, y + 72);
  y += 100;
  ctx.fillStyle = TIER_COLORS[s.badge.tier][0]; ctx.font = `700 26px ${BODY}`;
  spaced(ctx, `NÍVEL ${s.badge.tierLabel.toUpperCase()}`, cx, y + 20, 5, 'center');
  y += 40;
  ctx.fillStyle = C.muted;
  fitFont(ctx, s.badge.description, 500, BODY, 32, W - 168, 22);
  ctx.fillText(s.badge.description, cx, y + 36);
  y += 70 + 50;

  const bw = (W - 168 - 24) / 2;
  statBox(ctx, 84, y, bw, 140, { label: 'Patente', value: s.rank });
  if (s.badge.glyph === 'flame') {
    statBox(ctx, 84 + bw + 24, y, bw, 140, { label: 'Melhor sequência', value: `${s.bestStreak} dias`, tone: 'up' });
  } else {
    statBox(ctx, 84 + bw + 24, y, bw, 140, { label: 'Aulas concluídas', value: String(s.lessons), tone: 'up' });
  }
  ctx.textAlign = 'left';
  ctx.restore();
  footer(ctx, RW, RH, 'Conquistado na Trilha Gain');
}

// Ícones (traçado do Lucide, grade 24x24) desenhados direto no canvas.
const SWORDS = [
  'M14.5 17.5 3 6V3h3l11.5 11.5', 'M13 19l6-6', 'M16 16l4 4', 'M19 21l2-2',
  'M14.5 6.5 18 3h3v3l-3.5 3.5', 'M5 14l4 4', 'M7 17l-3 3', 'M3 19l2 2',
];
const TROPHY = [
  'M6 9H4.5a2.5 2.5 0 0 1 0-5H6', 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18', 'M4 22h16',
  'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22',
  'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22',
  'M18 2H6v7a6 6 0 0 0 12 0V2Z',
];
const COINS = ['M18.09 10.37A6 6 0 1 1 10.34 18', 'M7 6h1v4', 'm16.71 13.88.7.71-2.82 2.82'];

/** Traça um ícone de 24x24 centrado em (cx, cy) com `size` px de lado. */
function strokeIcon(ctx: CanvasRenderingContext2D, paths: string[], cx: number, cy: number, size: number, color: string, width = 2, circle = false) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (circle) { ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.stroke(); }
  for (const d of paths) ctx.stroke(new Path2D(d));
  ctx.restore();
}

function drawReward(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, W: number, H: number, s: RewardCard) {
  const gain = s.variant === 'gain';
  const glow = gain ? '#ef4444' : '#d97706';
  const accent = gain ? '#f87171' : '#fbbf24';
  background(ctx, W, H, glow);
  header(ctx, logo, W);
  const RW = W, RH = H; // medidas reais (o corpo do card é desenhado numa escala ampliada)

  const stats = s.stats.slice(0, 2);
  const content = 224 + 50 + 38 + 20 + 100 + 44 + 40 + 130 + (stats.length ? 50 + 140 : 0);
  const fit = beginFit(ctx, W, H, content);
  W = fit.W;
  const { top, bottom } = fit;
  let y = top + Math.max(0, (bottom - top - content) / 2);
  const cx = W / 2;

  // círculo do ícone, com anel suave (igual à tela de parabéns)
  const R = 112, cy = y + R;
  ctx.fillStyle = `${glow}22`; ctx.beginPath(); ctx.arc(cx, cy, R + 26, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  if (gain) { g.addColorStop(0, '#f87171'); g.addColorStop(1, '#dc2626'); } else { g.addColorStop(0, '#fbbf24'); g.addColorStop(1, '#d97706'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  strokeIcon(ctx, gain ? SWORDS : TROPHY, cx, cy, 120, '#ffffff', 2.4);
  y += 224 + 50;

  ctx.textAlign = 'center'; ctx.fillStyle = accent; ctx.font = `700 26px ${BODY}`;
  spaced(ctx, s.eyebrow.toUpperCase(), cx, y + 26, 7, 'center');
  y += 38 + 20;

  ctx.fillStyle = C.text;
  const ts = fitFont(ctx, s.title, 700, DISPLAY, 92, W - 168, 48);
  ctx.font = `700 ${ts}px ${DISPLAY}`;
  ctx.fillText(s.title, cx, y + 74);
  y += 100;

  if (s.subtitle) { ctx.fillStyle = C.muted; ctx.font = `500 30px ${BODY}`; ctx.fillText(s.subtitle, cx, y + 26); }
  y += 44 + 40;

  // caixa dourada de Coins
  const label = `+${s.coins.toLocaleString('pt-BR')} Coins`;
  ctx.font = `700 76px ${DISPLAY}`;
  const tw = ctx.measureText(label).width;
  const iconS = 64, padX = 44, gap = 22;
  const bw = Math.min(W - 168, padX * 2 + iconS + gap + tw), bh = 130;
  const bx = cx - bw / 2;
  ctx.fillStyle = 'rgba(245,158,11,0.10)'; roundRect(ctx, bx, y, bw, bh, 36); ctx.fill();
  ctx.strokeStyle = 'rgba(245,158,11,0.30)'; ctx.lineWidth = 2; roundRect(ctx, bx, y, bw, bh, 36); ctx.stroke();
  strokeIcon(ctx, COINS, bx + padX + iconS / 2, y + bh / 2, iconS, '#f59e0b', 2, true);
  ctx.fillStyle = '#fcd34d'; ctx.textAlign = 'left';
  ctx.fillText(label, bx + padX + iconS + gap, y + bh / 2 + 26);
  y += bh;

  if (stats.length) {
    y += 50;
    const n = stats.length, sg = 24, sw = (W - 168 - sg * (n - 1)) / n;
    stats.forEach((st, i) => statBox(ctx, 84 + i * (sw + sg), y, sw, 140, st));
  }
  ctx.textAlign = 'left';
  ctx.restore();
  footer(ctx, RW, RH, s.footer ?? 'Aprendendo a operar, um dia de cada vez');
}

/** Quebra o texto em linhas que cabem em maxW (a última ganha reticências). */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  const lines: string[] = [];
  let cur = '';
  let consumed = 0;
  for (let i = 0; i < words.length; i++) {
    const test = cur ? `${cur} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= maxW) { cur = test; consumed = i + 1; continue; }
    if (lines.length === maxLines - 1) break;
    lines.push(cur);
    cur = words[i];
    consumed = i + 1;
  }
  if (cur) lines.push(cur);
  if (consumed < words.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.replace(/[ ,.;:]+$/, '')}…`;
  }
  return lines.slice(0, maxLines);
}

function triangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, dir: Dir3, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (dir === 'up') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.8); ctx.lineTo(cx - r, cy + r * 0.8); }
  else if (dir === 'down') { ctx.moveTo(cx, cy + r); ctx.lineTo(cx + r, cy - r * 0.8); ctx.lineTo(cx - r, cy - r * 0.8); }
  else { ctx.rect(cx - r, cy - r * 0.22, r * 2, r * 0.44); }
  ctx.closePath(); ctx.fill();
}

const DIR_COLOR: Record<Dir3, string> = { up: C.greenBright, down: C.red, flat: C.muted };

function drawSignal(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, W: number, H: number, s: SignalShareCard) {
  const tone: Tone = s.action === 'BUY' ? 'up' : s.action === 'SELL' ? 'down' : 'neutral';
  background(ctx, W, H, toneGlow(tone));
  header(ctx, logo, W);
  const RW = W, RH = H; // medidas reais (o corpo do card é desenhado numa escala ampliada)

  const word = s.action === 'BUY' ? 'COMPRA' : s.action === 'SELL' ? 'VENDA' : 'SEM ENTRADA';
  const themes = s.themes.slice(0, 4);
  const themeRows = Math.ceil(themes.length / 2);
  const h = 64 + 120 + 90 + 50
    + (s.levels ? 150 + 36 : 0)
    + (themes.length ? themeRows * 130 + (themeRows - 1) * 20 + 36 : 0)
    + (s.note ? 3 * 42 + 10 : 0);
  const fit = beginFit(ctx, W, H, h);
  W = fit.W;
  const { top, bottom } = fit;
  ctx.font = `500 30px ${BODY}`;
  const noteLines = s.note ? wrapLines(ctx, s.note, W - 168, 3) : [];
  let y = top + Math.max(0, (bottom - top - h) / 2);

  ctx.textAlign = 'left'; ctx.fillStyle = C.green; ctx.font = `700 28px ${BODY}`;
  spaced(ctx, `ANÁLISE IA${s.timeframe ? ` · ${s.timeframe}` : ''}`, 84, y + 30, 6);
  y += 64;

  ctx.fillStyle = toneColor(tone);
  const ws = fitFont(ctx, word, 700, DISPLAY, 120, W - 168, 56);
  ctx.font = `700 ${ws}px ${DISPLAY}`;
  ctx.fillText(word, 84, y + 96);
  y += 120;

  ctx.fillStyle = C.text;
  const ss = fitFont(ctx, s.symbol, 500, MONO, 76, W - 168, 36);
  ctx.font = `500 ${ss}px ${MONO}`;
  ctx.fillText(s.symbol, 84, y + 62);
  y += 90;
  ctx.fillStyle = C.muted; ctx.font = `500 28px ${BODY}`;
  ctx.fillText(s.when, 84, y + 22);
  y += 50;

  if (s.levels) {
    const n = s.levels.length, gap = 20, bw = (W - 168 - gap * (n - 1)) / n;
    s.levels.forEach((l, i) => statBox(ctx, 84 + i * (bw + gap), y, bw, 150, { label: l.label, value: l.value, tone: l.tone }));
    y += 150 + 36;
  }
  if (themes.length) {
    const bw = (W - 168 - 20) / 2;
    themes.forEach((t, i) => statBox(ctx, 84 + (i % 2) * (bw + 20), y + Math.floor(i / 2) * (130 + 20), bw, 130, { label: t.title, value: t.value, tone: t.tone }));
    y += themeRows * 130 + (themeRows - 1) * 20 + 36;
  }
  if (noteLines.length) {
    ctx.fillStyle = C.muted; ctx.font = `500 30px ${BODY}`;
    noteLines.forEach((l, i) => ctx.fillText(l, 84, y + 30 + i * 42));
  }
  ctx.restore();
  footer(ctx, RW, RH, 'Informativo · não é recomendação');
}

function drawNews(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, W: number, H: number, s: NewsShareCard) {
  background(ctx, W, H, toneGlow(s.headlineTone));
  header(ctx, logo, W);

  const top = 190, bottom = H - 200, avail = bottom - top;
  const story = H > 1500;
  // No story há muito mais altura: a análise pode ocupar o dobro de linhas.
  const noteMax = s.noteMax ? (story ? s.noteMax * 2 : s.noteMax) : 2;
  const rows = s.rows.slice(0, 6);
  const cols = rows.length > 3 && !s.wide ? 2 : 1;
  const rowH = 80, rowGap = 14;
  const rowCount = Math.ceil(rows.length / cols);
  const rowsH = rowCount * rowH + Math.max(0, rowCount - 1) * rowGap;

  // Desenha num espaço "lógico" ampliado por k: fontes, caixas e espaços crescem juntos. Escolhe o maior k
  // em que o conteúdo ainda cabe, então o story (mais alto) sai com tudo maior e preenchido, não encolhido no meio.
  const layout = (k: number) => {
    const cw = (W - 168) / k;
    ctx.font = `700 56px ${DISPLAY}`;
    const titleLines = wrapLines(ctx, s.title, cw, 2);
    ctx.font = `500 28px ${BODY}`;
    const noteLines = s.note ? wrapLines(ctx, s.note, cw, noteMax) : [];
    const h = 64 + titleLines.length * 66 + 50 + 16
      + (s.numbers.length ? 130 + 24 : 0)
      + 84 + (s.verdict ? 44 : 0) + 16 + 36 + rowsH
      + (noteLines.length ? noteLines.length * 38 + 20 + (s.noteTitle ? 40 : 0) : 0);
    return { cw, titleLines, noteLines, h };
  };
  let k = 1, L = layout(1);
  for (const c of [1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.05]) {
    const t = layout(c);
    if (t.h * c <= avail) { k = c; L = t; break; }
  }
  const { cw, titleLines, noteLines, h } = L;

  ctx.save();
  ctx.translate(84, top + Math.max(0, (avail - h * k) / 2));
  ctx.scale(k, k);
  let y = 0;

  // O topo é espaçado letra a letra: reduz o corpo até caber na largura (títulos longos como "· APÓS A NOTÍCIA").
  const eyebrow = s.eyebrow ?? `CALENDÁRIO ECONÔMICO · ${s.phase === 'pre' ? 'ANTES DA NOTÍCIA' : 'APÓS A NOTÍCIA'}`;
  let es = 26;
  const spacedW = (size: number) => { ctx.font = `700 ${size}px ${BODY}`; return [...eyebrow].reduce((t, ch) => t + ctx.measureText(ch).width + 4, -4); };
  while (es > 16 && spacedW(es) > cw) es -= 1;
  ctx.textAlign = 'left'; ctx.fillStyle = C.green; ctx.font = `700 ${es}px ${BODY}`;
  spaced(ctx, eyebrow, 0, y + 28, 4);
  y += 64;

  ctx.fillStyle = C.text; ctx.font = `700 56px ${DISPLAY}`;
  titleLines.forEach((l, i) => ctx.fillText(l, 0, y + 50 + i * 66));
  y += titleLines.length * 66;

  ctx.fillStyle = C.muted; ctx.font = `500 28px ${BODY}`;
  ctx.fillText(s.meta, 0, y + 34);
  const metaW = ctx.measureText(s.meta).width;
  ctx.fillStyle = '#fbbf24';
  for (let i = 0; i < s.stars; i++) { star(ctx, metaW + 40 + i * 34, y + 24, 13); ctx.fill(); }
  y += 50 + 16;

  if (s.numbers.length) {
    const n = s.numbers.length, gap = 16, bw = (cw - gap * (n - 1)) / n;
    s.numbers.forEach((st, i) => statBox(ctx, i * (bw + gap), y, bw, 130, st));
    y += 130 + 24;
  }

  ctx.fillStyle = toneColor(s.headlineTone);
  const hs = fitFont(ctx, s.headline, 700, DISPLAY, 72, cw, 36);
  ctx.font = `700 ${hs}px ${DISPLAY}`;
  ctx.fillText(s.headline, 0, y + 62);
  y += 84;
  if (s.verdict) {
    ctx.fillStyle = C.text;
    fitFont(ctx, s.verdict, 600, BODY, 32, cw, 22);
    ctx.fillText(s.verdict, 0, y + 26);
    y += 44;
  }
  y += 16;

  ctx.fillStyle = C.subtle; ctx.font = `600 22px ${BODY}`;
  spaced(ctx, s.rowsTitle.toUpperCase(), 0, y + 18, 3);
  y += 36;

  const gap = 20, rw = (cw - gap * (cols - 1)) / cols;
  rows.forEach((r, i) => {
    const x = (i % cols) * (rw + gap), ry = y + Math.floor(i / cols) * (rowH + rowGap);
    ctx.fillStyle = C.surface; roundRect(ctx, x, ry, rw, rowH, 20); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; roundRect(ctx, x, ry, rw, rowH, 20); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = C.text;
    fitFont(ctx, r.label, 600, s.wide ? BODY : MONO, 30, rw * (s.wide ? 0.62 : 0.5), 18);
    ctx.fillText(r.label, x + 28, ry + rowH / 2 + 10);
    ctx.textAlign = 'right'; ctx.fillStyle = DIR_COLOR[r.dir];
    fitFont(ctx, r.value, 600, BODY, 28, rw * (s.wide ? 0.26 : 0.5) - 20, 18);
    ctx.fillText(r.value, x + rw - 28, ry + rowH / 2 + 10);
    const vw = ctx.measureText(r.value).width;
    triangle(ctx, x + rw - 28 - vw - 26, ry + rowH / 2 + 1, 10, r.dir, DIR_COLOR[r.dir]);
    ctx.textAlign = 'left';
  });
  y += rowsH;

  if (noteLines.length) {
    let ny = y;
    if (s.noteTitle) {
      ctx.fillStyle = C.subtle; ctx.font = `600 22px ${BODY}`;
      spaced(ctx, s.noteTitle.toUpperCase(), 0, ny + 54, 3);
      ny += 40;
    }
    ctx.fillStyle = s.noteTitle ? C.text : C.muted; ctx.font = `500 28px ${BODY}`;
    noteLines.forEach((l, i) => ctx.fillText(l, 0, ny + 48 + i * 38));
  }
  ctx.restore();
  footer(ctx, W, H, 'Não é recomendação · Leitura completa no app');
}

export interface RenderInfo { mediaRequested: number; mediaLoaded: number }

export async function renderShareCard(spec: CardSpec, format: ShareFormat, info?: RenderInfo): Promise<Blob> {
  const { w, h } = SIZES[format];
  try {
    await Promise.all([
      document.fonts.load(`700 64px "Space Grotesk"`),
      document.fonts.load(`500 32px Inter`),
      document.fonts.load(`700 32px Inter`),
      document.fonts.load(`500 64px "JetBrains Mono"`),
    ]);
  } catch { /* segue com a fonte reserva */ }
  const logo = await loadImage('/images/logo-icon-128.png');

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');

  // Prints do trade: só os que carregam (e liberam CORS); sem nenhum, usa o layout normal.
  const media = spec.kind === 'result' && spec.media?.length
    ? (await Promise.all(spec.media.slice(0, 4).map((u) => loadImage(u, true)))).filter((i): i is HTMLImageElement => !!i)
    : [];
  if (info) {
    info.mediaRequested = spec.kind === 'result' ? Math.min(4, spec.media?.length ?? 0) : 0;
    info.mediaLoaded = media.length;
  }

  if (spec.kind === 'result') { if (media.length) drawResultMedia(ctx, logo, w, h, spec, media); else drawResult(ctx, logo, w, h, spec); }
  else if (spec.kind === 'progress') drawProgress(ctx, logo, w, h, spec);
  else if (spec.kind === 'signal') drawSignal(ctx, logo, w, h, spec);
  else if (spec.kind === 'news') drawNews(ctx, logo, w, h, spec);
  else if (spec.kind === 'reward') drawReward(ctx, logo, w, h, spec);
  else drawBadge(ctx, logo, w, h, spec);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('render_failed'))), 'image/png'));
}

export const canShareFiles = (file: File) =>
  typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files: [file] });
