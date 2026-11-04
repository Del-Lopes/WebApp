import React, { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/cn';

// ── Peças compartilhadas ─────────────────────────────────────────────────
export const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('rounded-xl border border-tint/8 bg-tint/3 p-3', className)}>{children}</div>
);

export const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string; fmt?: (v: number) => string;
}> = ({ label, value, min, max, step = 1, onChange, unit, fmt }) => (
  <label className="flex items-center gap-3 text-xs text-fg-muted">
    <span className="w-24 shrink-0 font-medium">{label}</span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="min-w-0 flex-1 accent-[var(--color-accent)]" />
    <span className="min-w-16 shrink-0 text-right font-mono text-sm font-bold text-fg tabular-nums">{fmt ? fmt(value) : value}{unit}</span>
  </label>
);

export const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button type="button" onClick={onClick}
    className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
      on ? 'border-accent/40 bg-accent/10 text-accent-fg' : 'border-tint/10 bg-tint/3 text-fg-muted hover:text-fg')}>
    {children}
  </button>
);

export const Readout: React.FC<{ label: string; value: string; tone?: 'up' | 'dn' | 'ac' | 'mu' }> = ({ label, value, tone = 'mu' }) => (
  <div className="min-w-0 flex-1 rounded-lg border border-tint/8 bg-tint/3 px-2.5 py-2 text-center">
    <p className="eyebrow-muted truncate">{label}</p>
    <p className={cn('truncate font-mono text-base font-bold tabular-nums',
      tone === 'up' ? 'text-success-fg' : tone === 'dn' ? 'text-danger-fg' : tone === 'ac' ? 'text-accent-fg' : 'text-fg')}>{value}</p>
  </div>
);

export const Note: React.FC<{ children: React.ReactNode; tone?: 'ac' | 'up' | 'dn' | 'wn' }> = ({ children, tone = 'ac' }) => (
  <p className={cn('rounded-xl border px-3 py-2 text-sm leading-snug',
    tone === 'up' ? 'border-success/25 bg-success/10 text-success-fg' : tone === 'dn' ? 'border-danger/25 bg-danger/10 text-danger-fg'
      : tone === 'wn' ? 'border-warning/25 bg-warning/10 text-warning-fg' : 'border-accent/20 bg-accent/5 text-fg')}>{children}</p>
);

export const money = (v: number, d = 2) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })}`;

// ── Laboratório de candle ────────────────────────────────────────────────
// Quatro controles (abertura, fechamento, pavio de cima, pavio de baixo) e o nome do candle que sai.
interface CandleState { o: number; c: number; u: number; d: number }
export const CANDLE_PRESETS: Record<string, { label: string; s: CandleState }> = {
  alta: { label: 'Alta', s: { o: 38, c: 66, u: 5, d: 5 } },
  baixa: { label: 'Baixa', s: { o: 66, c: 38, u: 5, d: 5 } },
  doji: { label: 'Doji', s: { o: 52, c: 52.5, u: 16, d: 16 } },
  libelula: { label: 'Doji libélula', s: { o: 66, c: 65.5, u: 0.5, d: 22 } },
  lapide: { label: 'Doji lápide', s: { o: 36, c: 36.5, u: 22, d: 0.5 } },
  martelo: { label: 'Martelo', s: { o: 58, c: 66, u: 1, d: 22 } },
  estrela: { label: 'Estrela cadente', s: { o: 44, c: 36, u: 22, d: 1 } },
  marubozu: { label: 'Marubozu', s: { o: 28, c: 74, u: 0, d: 0 } },
  marubozuB: { label: 'Marubozu baixa', s: { o: 74, c: 28, u: 0, d: 0 } },
  pinbar: { label: 'Pinbar', s: { o: 62, c: 66, u: 2, d: 28 } },
  corpoGrande: { label: 'Corpo grande', s: { o: 30, c: 70, u: 4, d: 4 } },
  corpoPequeno: { label: 'Corpo pequeno', s: { o: 50, c: 56, u: 14, d: 14 } },
};

function classify(s: CandleState): { name: string; why: string; tone: 'up' | 'dn' | 'ac' } {
  const hi = Math.max(s.o, s.c) + s.u, lo = Math.min(s.o, s.c) - s.d;
  const range = Math.max(hi - lo, 0.001), body = Math.abs(s.c - s.o);
  const up = s.c >= s.o, tone = up ? 'up' : 'dn';
  const r = body / range;
  if (r <= 0.1) {
    if (s.u < range * 0.12 && s.d > range * 0.6) return { name: 'Doji libélula', why: 'Abriu e fechou no topo, mas o preço foi lá embaixo e voltou: compradores defenderam a região.', tone: 'up' };
    if (s.d < range * 0.12 && s.u > range * 0.6) return { name: 'Doji lápide', why: 'Abriu e fechou embaixo; o preço subiu e foi rejeitado: vendedores seguraram o topo.', tone: 'dn' };
    return { name: 'Doji', why: 'Abertura e fechamento quase iguais: ninguém venceu. É indecisão, e costuma pedir confirmação.', tone: 'ac' };
  }
  if (r >= 0.9) return { name: up ? 'Marubozu de alta' : 'Marubozu de baixa', why: up ? 'Quase sem pavios: os compradores dominaram da abertura ao fechamento.' : 'Quase sem pavios: os vendedores dominaram da abertura ao fechamento.', tone };
  if (s.d >= body * 2 && s.u <= range * 0.15 && r <= 0.35) {
    return s.d >= range * 0.6 && r <= 0.25
      ? { name: 'Pinbar / Martelo', why: 'Pavio inferior enorme: o preço foi empurrado para baixo e rejeitado. Em fundo, sugere reversão para cima.', tone: 'up' }
      : { name: 'Martelo', why: 'Corpo pequeno no topo e pavio de baixo longo: vendedores tentaram e perderam força.', tone: 'up' };
  }
  if (s.u >= body * 2 && s.d <= range * 0.15 && r <= 0.35) {
    return { name: 'Estrela cadente', why: 'Corpo pequeno embaixo e pavio de cima longo: o preço subiu e foi rejeitado. Em topo, sugere reversão para baixo.', tone: 'dn' };
  }
  if (s.u >= range * 0.3 && s.d >= range * 0.3 && r <= 0.35) return { name: 'Pião (indecisão)', why: 'Corpo pequeno com pavios dos dois lados: briga equilibrada entre compradores e vendedores.', tone: 'ac' };
  if (r >= 0.6) return { name: up ? 'Candle de alta forte' : 'Candle de baixa forte', why: 'Corpo grande: um lado teve controle claro durante o período.', tone };
  return { name: up ? 'Candle de alta' : 'Candle de baixa', why: up ? 'Fechou acima da abertura: os compradores levaram a melhor.' : 'Fechou abaixo da abertura: os vendedores levaram a melhor.', tone };
}

export const CandleLab: React.FC<{ start?: string; presets?: string[]; hint?: string }> = ({ start = 'alta', presets = ['alta', 'baixa', 'doji', 'martelo', 'estrela', 'marubozu'], hint }) => {
  const [s, setS] = useState<CandleState>(CANDLE_PRESETS[start].s);
  const set = (p: Partial<CandleState>) => setS((v) => ({ ...v, ...p }));
  const hi = Math.max(s.o, s.c) + s.u, lo = Math.min(s.o, s.c) - s.d;
  const k = classify(s);
  const Hh = 150, y = (v: number) => 8 + (1 - (v - 0) / 100) * (Hh - 16);
  const up = s.c >= s.o, col = up ? '#10b981' : '#f43f5e';
  // Rótulos que cairiam um em cima do outro (ex.: Marubozu, Doji) são unidos numa linha só.
  const raw: [string, number][] = [['Máxima', hi], [up ? 'Fechamento' : 'Abertura', Math.max(s.o, s.c)], [up ? 'Abertura' : 'Fechamento', Math.min(s.o, s.c)], ['Mínima', lo]];
  const lines: [string, number][] = [];
  for (const [t, v] of raw) {
    const prev = lines[lines.length - 1];
    if (prev && Math.abs(y(prev[1]) - y(v)) < 13) lines[lines.length - 1] = [prev[0] + ' = ' + t.toLowerCase(), prev[1]];
    else lines.push([t, v]);
  }
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <Chip key={p} on={false} onClick={() => setS(CANDLE_PRESETS[p].s)}>{CANDLE_PRESETS[p].label}</Chip>
        ))}
      </div>
      <Panel>
        <svg viewBox={`0 0 340 ${Hh}`} className="w-full h-auto" role="img" aria-label="Candle interativo">
          <g className="text-fg-subtle">
            {lines.map(([t, v], i) => (
              <g key={t + i}>
                <line x1={70} x2={185} y1={y(v)} y2={y(v)} stroke="currentColor" strokeDasharray="3 3" opacity={0.5} />
                <text x={194} y={y(v) + 3} fontSize={9.5} fontWeight={600} fill="currentColor">{t}</text>
              </g>
            ))}
          </g>
          <line x1={120} x2={120} y1={y(hi)} y2={y(lo)} stroke={col} strokeWidth={3} strokeLinecap="round" />
          <rect x={100} y={y(Math.max(s.o, s.c))} width={40} height={Math.max(2, Math.abs(y(s.o) - y(s.c)))} rx={3} fill={col} />
        </svg>
      </Panel>
      <Panel className="space-y-2">
        <Slider label="Abertura" value={s.o} min={15} max={85} step={0.5} onChange={(v) => set({ o: v })} fmt={(v) => v.toFixed(0)} />
        <Slider label="Fechamento" value={s.c} min={15} max={85} step={0.5} onChange={(v) => set({ c: v })} fmt={(v) => v.toFixed(0)} />
        <Slider label="Pavio de cima" value={s.u} min={0} max={26} step={0.5} onChange={(v) => set({ u: v })} fmt={(v) => v.toFixed(0)} />
        <Slider label="Pavio de baixo" value={s.d} min={0} max={26} step={0.5} onChange={(v) => set({ d: v })} fmt={(v) => v.toFixed(0)} />
      </Panel>
      <Note tone={k.tone === 'ac' ? 'ac' : k.tone}><b>{k.name}.</b> {k.why}</Note>
      {hint && <p className="text-center text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
};

// ── Cards que revelam (conceitos, passo a passo e checklist) ─────────────
export interface RevealItem { h: string; b: string; p?: string }
export const Reveal: React.FC<{ items: RevealItem[]; lead?: string; mode?: 'grid' | 'flow' | 'check' }> = ({ items, lead, mode = 'grid' }) => {
  const [open, setOpen] = useState<number | null>(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    setOpen(open === i ? null : i);
    if (mode === 'check') setDone((d) => { const n = new Set(d); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };
  const detail = open !== null ? items[open] : null;
  return (
    <div className="space-y-2.5">
      {lead && <p className="text-xs text-fg-muted">{lead}</p>}
      {mode === 'check' && (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-tint/8"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${(done.size / items.length) * 100}%` }} /></div>
          <span className="font-mono text-xs font-bold text-fg tabular-nums">{done.size}/{items.length}</span>
        </div>
      )}
      <div className={cn(mode === 'flow' ? 'space-y-0' : 'grid grid-cols-1 gap-2 sm:grid-cols-2')}>
        {items.map((it, i) => {
          const on = open === i;
          return (
            <div key={i} className={mode === 'flow' ? 'relative' : ''}>
              {mode === 'flow' && i < items.length - 1 && <span className="absolute left-[17px] top-9 -bottom-1 w-px bg-tint/15" aria-hidden />}
              <button type="button" onClick={() => toggle(i)}
                className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                  on ? 'border-accent/40 bg-accent/10' : 'border-tint/10 bg-tint/3 hover:bg-tint/5',
                  mode === 'flow' && 'mb-1.5')}>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                  mode === 'check' && done.has(i) ? 'border-success/40 bg-success/20 text-success-fg' : on ? 'border-accent/40 bg-accent/20 text-accent-fg' : 'border-tint/15 text-fg-muted')}>
                  {mode === 'check' && done.has(i) ? <Check size={14} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-fg">{it.h}</span>
              </button>
            </div>
          );
        })}
      </div>
      {detail && (
        <div key={open} className="animate-in fade-in slide-in-from-bottom-1 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 duration-300">
          {detail.p && <p className="mb-1.5 rounded-md bg-black/30 px-2 py-1 font-mono text-[11px] text-white/90 break-words">{detail.p}</p>}
          <p className="text-sm leading-snug text-fg">{detail.b}</p>
        </div>
      )}
    </div>
  );
};

// ── Bifurcação: escolha e consequência ───────────────────────────────────
export interface ForkOpt { l: string; o: string; t: 'good' | 'bad' | 'mid' }
export const Fork: React.FC<{ q: string; opts: ForkOpt[]; takeaway?: string }> = ({ q, opts, takeaway }) => {
  const [pick, setPick] = useState<number | null>(null);
  const p = pick !== null ? opts[pick] : null;
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-semibold text-fg">{q}</p>
      <div className="space-y-2">
        {opts.map((o, i) => (
          <button key={i} type="button" onClick={() => setPick(i)}
            className={cn('w-full rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors',
              pick === i ? (o.t === 'good' ? 'border-success/50 bg-success/10 text-success-fg' : o.t === 'bad' ? 'border-danger/50 bg-danger/10 text-danger-fg' : 'border-warning/50 bg-warning/10 text-warning-fg')
                : 'border-tint/10 bg-tint/3 text-fg hover:bg-tint/5')}>
            {o.l}
          </button>
        ))}
      </div>
      {p && (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 space-y-1.5">
          <Note tone={p.t === 'good' ? 'up' : p.t === 'bad' ? 'dn' : 'wn'}>{p.o}</Note>
          {takeaway && <p className="text-xs text-fg-muted">{takeaway}</p>}
          <button type="button" onClick={() => setPick(null)} className="flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg"><RotateCcw size={12} /> Testar outra escolha</button>
        </div>
      )}
    </div>
  );
};

// ── Comparação A x B ─────────────────────────────────────────────────────
export interface CompareSide { t: string; tone: 'up' | 'dn' | 'ac'; pts: string[] }
export const Compare: React.FC<{ a: CompareSide; b: CompareSide; foot?: string }> = ({ a, b, foot }) => {
  const [side, setSide] = useState<'a' | 'b'>('a');
  const cur = side === 'a' ? a : b;
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        {([['a', a], ['b', b]] as const).map(([k, s]) => (
          <button key={k} type="button" onClick={() => setSide(k)}
            className={cn('rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
              side === k ? (s.tone === 'up' ? 'border-success/40 bg-success/10 text-success-fg' : s.tone === 'dn' ? 'border-danger/40 bg-danger/10 text-danger-fg' : 'border-accent/40 bg-accent/10 text-accent-fg')
                : 'border-tint/10 bg-tint/3 text-fg-muted')}>
            {s.t}
          </button>
        ))}
      </div>
      <ul key={side} className="animate-in fade-in space-y-1.5 duration-300">
        {cur.pts.map((p, i) => (
          <li key={i} className="flex gap-2 rounded-lg border border-tint/8 bg-tint/3 px-3 py-2 text-sm leading-snug text-fg">
            <span className={cn('mt-0.5 font-bold', cur.tone === 'up' ? 'text-success-fg' : cur.tone === 'dn' ? 'text-danger-fg' : 'text-accent-fg')}>•</span>{p}
          </li>
        ))}
      </ul>
      {foot && <p className="text-xs text-fg-muted">{foot}</p>}
    </div>
  );
};

// ── Mapa de regiões (janela simulada com áreas clicáveis) ────────────────
export interface Region { id: string; l: string; b: string; r: [number, number, number, number] } // x,y,w,h em % (0-100)
export const RegionMap: React.FC<{ regions: Region[]; title?: string }> = ({ regions, title }) => {
  const [id, setId] = useState<string>(regions[0].id);
  const cur = regions.find((r) => r.id === id)!;
  return (
    <div className="space-y-2.5">
      <Panel className="p-2">
        {title && <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{title}</p>}
        <div className="relative w-full overflow-hidden rounded-lg border border-tint/10 bg-black/20" style={{ aspectRatio: '16 / 10' }}>
          {regions.map((r) => (
            <button key={r.id} type="button" onClick={() => setId(r.id)}
              style={{ left: `${r.r[0]}%`, top: `${r.r[1]}%`, width: `${r.r[2]}%`, height: `${r.r[3]}%` }}
              className={cn('absolute flex items-center justify-center rounded-md border p-0.5 text-center text-[10px] font-semibold leading-tight transition-colors sm:text-xs',
                id === r.id ? 'border-accent bg-accent/25 text-fg' : 'border-tint/20 bg-tint/5 text-fg-muted hover:bg-tint/10')}>
              {r.l}
            </button>
          ))}
        </div>
      </Panel>
      <div key={id} className="animate-in fade-in rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 duration-300">
        <p className="text-sm font-semibold text-fg">{cur.l}</p>
        <p className="mt-0.5 text-sm leading-snug text-fg-muted">{cur.b}</p>
      </div>
    </div>
  );
};
