import React from 'react';
import { Star, Radio, Lock, Check, Download, Coins, Flame, Bot, Key } from 'lucide-react';
import { Logo } from './Logo';

// Ilustrações do tour: miniaturas das telas reais feitas com os tokens do
// design (funcionam nos dois temas e não dependem de imagem externa).
// Em SVG as cores vêm de var(--ds-*) — var(--color-*) não existe no CSS gerado.

export type TourArtKind =
  | 'welcome' | 'dashboard' | 'trilha' | 'signals' | 'calendar' | 'bots' | 'journal' | 'licenses';

const ACCENT = 'var(--ds-accent)';
const DANGER = 'var(--ds-danger)';
const LINE = 'var(--ds-line-strong)';

/** Janela de app: moldura comum a todas as miniaturas. */
const Frame: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`w-full max-w-[340px] rounded-2xl border border-tint/10 bg-surface/90 shadow-2xl shadow-black/30 backdrop-blur-sm ${className}`}>
    <div className="flex items-center gap-1.5 border-b border-tint/8 px-3.5 py-2.5">
      <span className="h-2 w-2 rounded-full bg-tint/15" />
      <span className="h-2 w-2 rounded-full bg-tint/15" />
      <span className="h-2 w-2 rounded-full bg-tint/15" />
      <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">{title}</span>
    </div>
    <div className="p-3.5">{children}</div>
  </div>
);

const Bar: React.FC<{ w: string; strong?: boolean }> = ({ w, strong }) => (
  <div className={`h-1.5 rounded-full ${strong ? 'bg-tint/20' : 'bg-tint/10'}`} style={{ width: w }} />
);

// ─── Cenas ────────────────────────────────────────────────────────────────

const Welcome = () => (
  <div className="relative flex h-full w-full items-center justify-center">
    <div className="absolute h-56 w-56 rounded-full border border-tint/8" />
    <div className="absolute h-40 w-40 rounded-full border border-accent/20" />
    <div className="absolute h-72 w-72 rounded-full border border-dashed border-tint/6" />
    <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-accent/30 bg-surface shadow-[0_0_60px_-10px_rgba(34,197,94,0.55)]">
      <Logo className="h-12 w-12 object-contain" />
    </div>
    {[
      { label: 'Trilha Gain', cls: 'left-[8%] top-[18%]' },
      { label: 'Sinais', cls: 'right-[10%] top-[14%]' },
      { label: 'Robôs', cls: 'left-[6%] bottom-[20%]' },
      { label: 'Ao vivo', cls: 'right-[8%] bottom-[16%]' },
    ].map((c) => (
      <span key={c.label} className={`absolute rounded-full border border-tint/10 bg-surface/90 px-2.5 py-1 text-[10px] font-medium text-fg-muted shadow-lg ${c.cls}`}>
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />{c.label}
      </span>
    ))}
  </div>
);

const Dashboard = () => (
  <Frame title="Início">
    <div className="grid grid-cols-3 gap-2">
      {[['Licenças', '3'], ['Contas MT5', '2'], ['Coins', '1.250']].map(([k, v]) => (
        <div key={k} className="rounded-lg border border-tint/8 bg-tint/2 p-2">
          <p className="text-[9px] uppercase tracking-wider text-fg-subtle">{k}</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-fg">{v}</p>
        </div>
      ))}
    </div>
    <div className="mt-2.5 rounded-lg border border-tint/8 bg-tint/2 p-2.5">
      <div className="flex items-center justify-between">
        <Bar w="38%" strong />
        <span className="text-[9px] font-semibold text-accent-fg">● Online</span>
      </div>
      <svg viewBox="0 0 200 50" className="mt-2 h-12 w-full" aria-hidden>
        <defs>
          <linearGradient id="ta-dash" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={ACCENT} stopOpacity="0.35" />
            <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 40 L20 36 L40 38 L60 28 L80 30 L100 22 L120 25 L140 15 L160 18 L180 9 L200 11 L200 50 L0 50 Z" fill="url(#ta-dash)" />
        <path d="M0 40 L20 36 L40 38 L60 28 L80 30 L100 22 L120 25 L140 15 L160 18 L180 9 L200 11" fill="none" stroke={ACCENT} strokeWidth="2" />
      </svg>
    </div>
    <div className="mt-2.5 space-y-1.5">
      {[70, 55].map((w) => (
        <div key={w} className="flex items-center gap-2 rounded-lg border border-tint/6 p-2">
          <div className="h-6 w-6 rounded-md bg-accent/15" />
          <div className="flex-1 space-y-1"><Bar w={`${w}%`} strong /><Bar w="40%" /></div>
        </div>
      ))}
    </div>
  </Frame>
);

const Trilha = () => {
  const nodes = [
    { x: 50, done: true }, { x: 30, done: true }, { x: 58, current: true }, { x: 38, locked: true },
  ];
  return (
    <Frame title="Trilha Gain">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning-fg"><Flame size={11} /> 7 dias</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent-fg"><Coins size={11} /> 1.250</span>
      </div>
      <div className="relative h-44">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M50 10 C 30 20, 30 30, 30 36 S 58 55, 58 62 S 38 80, 38 88" fill="none" stroke={LINE} strokeWidth="1.2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
        {nodes.map((n, i) => (
          <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}%`, top: `${10 + i * 26}%` }}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
              n.done ? 'border-accent bg-accent text-brand-dark'
              : n.current ? 'border-accent bg-surface text-accent-fg ring-4 ring-accent/20'
              : 'border-tint/15 bg-tint/5 text-fg-subtle'}`}>
              {n.done ? <Check size={18} strokeWidth={3} /> : n.locked ? <Lock size={15} /> : <Star size={16} fill="currentColor" />}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
};

const Signals = () => {
  // velas: [abertura, fechamento, máxima, mínima] em coordenadas do SVG
  const candles: [number, number, number, number][] = [
    [60, 52, 48, 64], [52, 56, 50, 60], [56, 44, 40, 58], [44, 40, 36, 48], [40, 46, 38, 50],
    [46, 34, 30, 48], [34, 30, 26, 38], [30, 36, 28, 40], [36, 24, 20, 38], [24, 18, 14, 28],
  ];
  return (
    <Frame title="Sinais · XAUUSD">
      <div className="mb-2.5 flex gap-1.5">
        {[['M15', true], ['H1', true], ['H4', true], ['D1', false]].map(([tf, up]) => (
          <span key={tf as string} className={`flex-1 rounded-md border px-1.5 py-1 text-center text-[10px] font-semibold ${up ? 'border-accent/30 bg-accent/10 text-accent-fg' : 'border-danger/30 bg-danger/10 text-danger-fg'}`}>
            {tf} {up ? '▲' : '▼'}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 200 80" className="h-28 w-full rounded-lg border border-tint/6 bg-tint/2" aria-hidden>
        {[20, 40, 60].map((y) => <line key={y} x1="0" x2="200" y1={y} y2={y} stroke={LINE} strokeWidth="0.5" strokeDasharray="2 3" />)}
        {candles.map(([o, c, h, l], i) => {
          const x = 12 + i * 19;
          const up = c < o;
          const color = up ? ACCENT : DANGER;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={h} y2={l} stroke={color} strokeWidth="1.2" />
              <rect x={x - 4.5} y={Math.min(o, c)} width="9" height={Math.max(2, Math.abs(o - c))} rx="1" fill={color} />
            </g>
          );
        })}
      </svg>
      <div className="mt-2.5 rounded-lg border border-accent/20 bg-accent/5 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-accent-fg">Análise por IA</p>
        <div className="mt-1.5 space-y-1"><Bar w="92%" strong /><Bar w="74%" /></div>
      </div>
    </Frame>
  );
};

const Calendar = () => (
  <Frame title="Calendário econômico">
    <div className="space-y-1.5">
      {[
        { t: '09:30', c: 'USD', n: 'Payroll', s: 3 },
        { t: '10:00', c: 'BRL', n: 'IPCA-15', s: 3 },
        { t: '11:00', c: 'EUR', n: 'Discurso BCE', s: 2 },
      ].map((e) => (
        <div key={e.n} className="flex items-center gap-2 rounded-lg border border-tint/6 px-2 py-1.5">
          <span className="font-mono text-[10px] text-fg-subtle">{e.t}</span>
          <span className="rounded-sm bg-tint/5 px-1 text-[9px] font-semibold text-fg-muted">{e.c}</span>
          <span className="flex-1 truncate text-[11px] font-medium text-fg">{e.n}</span>
          <span className="flex">
            {[0, 1, 2].map((i) => <Star key={i} size={9} className={i < e.s ? 'text-warning-fg' : 'text-tint/15'} fill="currentColor" />)}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-danger/25 bg-danger/5 p-2.5">
      <div className="relative flex h-10 w-14 items-center justify-center rounded-lg bg-brand-dark">
        <Radio size={18} className="text-white" />
        <span className="absolute -right-1 -top-1 rounded-sm bg-danger px-1 text-[8px] font-bold text-white">AO VIVO</span>
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-semibold text-fg">Sala ao Vivo</p>
        <p className="text-[10px] text-fg-muted">Leitura de mercado com a equipe</p>
      </div>
    </div>
  </Frame>
);

const Bots = () => (
  <Frame title="Hand Bot">
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent-fg"><Bot size={20} /></div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-fg">AFK Trader</p>
        <p className="text-[10px] text-fg-muted">Conta MT5 · 12345678</p>
      </div>
      <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-semibold text-accent-fg">Sincronizado</span>
    </div>
    <div className="mt-3 space-y-2.5">
      {[['Trailing', 62], ['Grid', 38], ['Hedge', 50]].map(([k, v]) => (
        <div key={k as string}>
          <div className="flex justify-between text-[10px]"><span className="text-fg-muted">{k}</span><span className="font-mono text-fg">{v}</span></div>
          <div className="relative mt-1 h-1.5 rounded-full bg-tint/10">
            <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
            <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface" style={{ left: `${v}%` }} />
          </div>
        </div>
      ))}
    </div>
    <div className="mt-3 flex items-center justify-between rounded-lg border border-tint/8 bg-tint/2 px-2.5 py-2">
      <span className="text-[10px] text-fg-muted">Stand by</span>
      <span className="relative h-4 w-7 rounded-full bg-accent"><span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-white" /></span>
    </div>
  </Frame>
);

const Journal = () => (
  <Frame title="Análise de resultados">
    <div className="grid grid-cols-3 gap-2">
      {[['Acerto', '58%'], ['Drawdown', '6,2%'], ['Operações', '142']].map(([k, v]) => (
        <div key={k} className="rounded-lg border border-tint/8 bg-tint/2 p-2">
          <p className="text-[9px] uppercase tracking-wider text-fg-subtle">{k}</p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-fg">{v}</p>
        </div>
      ))}
    </div>
    <svg viewBox="0 0 200 60" className="mt-2.5 h-20 w-full rounded-lg border border-tint/6 bg-tint/2" aria-hidden>
      <path d="M0 50 L25 46 L45 48 L70 38 L90 41 L115 30 L135 34 L160 22 L180 25 L200 14" fill="none" stroke={ACCENT} strokeWidth="2" />
      <path d="M0 50 L200 50" stroke={LINE} strokeWidth="0.6" strokeDasharray="2 3" />
    </svg>
    <div className="mt-2.5 space-y-1.5">
      {[{ side: 'Compra', ok: true }, { side: 'Venda', ok: false }].map((r, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-tint/6 px-2 py-1.5">
          <span className={`rounded-sm px-1.5 text-[9px] font-semibold ${r.ok ? 'bg-accent/15 text-accent-fg' : 'bg-danger/15 text-danger-fg'}`}>{r.side}</span>
          <div className="flex-1"><Bar w={i ? '55%' : '72%'} /></div>
          <span className="text-[10px] text-fg-subtle">{i ? 'Ansioso' : 'Calmo'}</span>
        </div>
      ))}
    </div>
  </Frame>
);

const Licenses = () => (
  <Frame title="Licenças">
    <div className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/10 to-transparent p-3">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent-fg"><Key size={16} /></span>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-semibold text-accent-fg">Aprovada</span>
      </div>
      <p className="mt-2.5 text-xs font-semibold text-fg">Snow Ball</p>
      <p className="font-mono text-[10px] text-fg-muted">Conta 12345678 · válida até 04/2027</p>
    </div>
    <div className="mt-2.5 space-y-1.5">
      {['MetaTrader 5', 'Indicadores (.ex5)', 'Setups (.set)'].map((f) => (
        <div key={f} className="flex items-center gap-2 rounded-lg border border-tint/6 px-2.5 py-2">
          <span className="flex-1 text-[11px] text-fg">{f}</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-tint/5 text-fg-muted"><Download size={13} /></span>
        </div>
      ))}
    </div>
  </Frame>
);

const SCENES: Record<TourArtKind, React.FC> = {
  welcome: Welcome, dashboard: Dashboard, trilha: Trilha, signals: Signals,
  calendar: Calendar, bots: Bots, journal: Journal, licenses: Licenses,
};

export const TourArt: React.FC<{ kind: TourArtKind }> = ({ kind }) => {
  const Scene = SCENES[kind];
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-page p-3 md:p-6" aria-hidden>
      <div className="absolute inset-0 bg-grid-fade opacity-60" />
      <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-brand-green/[0.12] blur-[90px]" />
      <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-brand-green/[0.08] blur-[90px]" />
      <div className="relative flex h-full w-full origin-center scale-[0.7] items-center justify-center sm:scale-[0.8] md:scale-100">
        <Scene />
      </div>
    </div>
  );
};
