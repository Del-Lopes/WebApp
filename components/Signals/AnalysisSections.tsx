import React, { useState } from 'react';
import {
  ChevronDown, Layers, TrendingUp, Activity, Waves, Crosshair, Newspaper, Compass,
} from 'lucide-react';
import type { AnalysisSection, SectionTone, StructuredAnalysis } from '../../lib/signalAnalysis';

// Parecer da Análise IA em cards por tema, recolhíveis (estilo Calendário Econômico):
// o cabeçalho mostra os números-chave mesmo fechado; o corpo traz métricas + leitura.

const ICONS: Record<string, React.ElementType> = {
  confluencia: Layers,
  tendencia: TrendingUp,
  momentum: Activity,
  volatilidade: Waves,
  niveis: Crosshair,
  macro: Newspaper,
  cenarios: Compass,
};

const TONE_TEXT: Record<SectionTone, string> = {
  up: 'text-success-fg',
  down: 'text-danger-fg',
  neutral: 'text-fg',
};

const TONE_ICON: Record<SectionTone, string> = {
  up: 'bg-success/10 border-success/20 text-success-fg',
  down: 'bg-danger/10 border-danger/20 text-danger-fg',
  neutral: 'bg-tint/5 border-tint/10 text-fg-muted',
};

const TONE_TILE: Record<SectionTone, string> = {
  up: 'bg-success/10 border-success/20',
  down: 'bg-danger/10 border-danger/20',
  neutral: 'bg-tint/3 border-tint/6',
};

// Abertos ao carregar: o que mais pesa na decisão.
const DEFAULT_OPEN = new Set(['niveis', 'cenarios']);

export const AnalysisSections: React.FC<{ analysis: StructuredAnalysis }> = ({ analysis }) => {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(analysis.sections.filter((s) => DEFAULT_OPEN.has(s.id)).map((s) => s.id)),
  );
  const allOpen = open.size === analysis.sections.length;

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div className="relative mt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="eyebrow-muted">Análise por tema</p>
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(analysis.sections.map((s) => s.id)))}
          className="rounded text-xs font-medium text-accent-fg hover:opacity-80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          {allOpen ? 'Recolher tudo' : 'Expandir tudo'}
        </button>
      </div>

      <div className="space-y-2">
        {analysis.sections.map((s) => (
          <SectionCard key={s.id} section={s} open={open.has(s.id)} onToggle={() => toggle(s.id)} />
        ))}
      </div>

      {analysis.disclaimer && (
        <p className="mt-3 text-[11px] leading-relaxed text-fg-subtle">{analysis.disclaimer}</p>
      )}
    </div>
  );
};

const SectionCard: React.FC<{ section: AnalysisSection; open: boolean; onToggle: () => void }> = ({ section, open, onToggle }) => {
  const Icon = ICONS[section.id] ?? Compass;
  const bodyId = `analysis-${section.id}`;
  // Fechado, o cabeçalho resume com os 2 primeiros números.
  const preview = section.metrics.slice(0, 2);

  return (
    <div className="overflow-hidden rounded-xl border border-tint/8 bg-tint/2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-tint/3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${TONE_ICON[section.tone]}`}>
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{section.title}</span>
          {!open && preview.length > 0 && (
            <span className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-fg-subtle">
              {preview.map((m) => (
                <span key={m.label} className="truncate">
                  {m.label}: <span className={`font-mono tabular-nums ${TONE_TEXT[m.tone ?? 'neutral']}`}>{m.value}</span>
                </span>
              ))}
            </span>
          )}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-fg-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={bodyId} className="space-y-3 border-t border-tint/6 px-3 pb-3 pt-3">
          {section.id === 'niveis' && <LevelsBar section={section} />}
          {section.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {section.metrics.map((m) => (
                <div key={m.label} className={`min-w-0 rounded-lg border px-2.5 py-2 ${TONE_TILE[m.tone ?? 'neutral']}`}>
                  <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-fg-subtle">{m.label}</p>
                  <p className={`mt-0.5 truncate font-mono text-sm font-semibold tabular-nums ${TONE_TEXT[m.tone ?? 'neutral']}`}>{m.value}</p>
                </div>
              ))}
            </div>
          )}
          {section.text && <p className="text-sm leading-relaxed text-fg-muted">{section.text}</p>}
        </div>
      )}
    </div>
  );
};

// Barra suporte ←→ resistência com a posição do preço.
const LevelsBar: React.FC<{ section: AnalysisSection }> = ({ section }) => {
  const find = (label: string) => section.metrics.find((x) => x.label === label);
  const num = (label: string) => {
    const m = find(label);
    const v = m ? parseFloat(m.value) : NaN;
    return Number.isFinite(v) ? v : null;
  };
  const support = num('Suporte');
  const resistance = num('Resistência');
  const price = num('Preço');
  if (support === null || resistance === null || price === null || resistance <= support) return null;
  const pos = Math.min(100, Math.max(0, ((price - support) / (resistance - support)) * 100));

  return (
    <div>
      <div className="relative h-2 rounded-full bg-linear-to-r from-success/40 via-tint/10 to-danger/40">
        <span
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg shadow"
          style={{ left: `${pos}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums">
        <span className="text-success-fg">Suporte {find('Suporte')?.value}</span>
        <span className="text-danger-fg">Resistência {find('Resistência')?.value}</span>
      </div>
    </div>
  );
};
