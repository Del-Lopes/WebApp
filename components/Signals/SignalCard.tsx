import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Target, ShieldAlert, Clock, CheckCircle2, XCircle, Ban, MinusCircle, ChevronDown, CandlestickChart } from 'lucide-react';
import { Signal } from '../../types';
import { tvSymbol, tvInterval } from '../../lib/marketData';
import { TradingViewChart } from './TradingViewChart';

const STATUS_META: Record<Signal['status'], { label: string; className: string; Icon: React.ElementType }> = {
  open:      { label: 'Ativo',       className: 'bg-accent/10 text-accent-fg border-accent/20', Icon: Clock },
  hit_tp:    { label: 'Alvo atingido', className: 'bg-success/10 text-success-fg border-success/20', Icon: CheckCircle2 },
  hit_sl:    { label: 'Stopado',     className: 'bg-danger/10 text-danger-fg border-danger/20', Icon: XCircle },
  cancelled: { label: 'Cancelado',   className: 'bg-tint/5 text-fg-muted border-tint/10', Icon: Ban },
};

function fmtPrice(v: number | null): string {
  if (v == null) return '—';
  // Casas decimais conforme a magnitude: forex (EUR/USD ~1.14) precisa de mais
  // casas que ouro/cripto (XAU ~4000, BTC ~62000). Sem depender do símbolo.
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 2 : abs >= 100 ? 3 : abs >= 10 ? 4 : 5;
  return v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  signal: Signal;
}

export const SignalCard: React.FC<Props> = ({ signal }) => {
  const isBuy = signal.action === 'BUY';
  const isSell = signal.action === 'SELL';
  const isNone = signal.action === 'NONE';
  const status = STATUS_META[signal.status];
  const StatusIcon = status.Icon;

  // Parecer longo começa recolhido.
  const [expanded, setExpanded] = useState(false);
  // Gráfico TradingView sob demanda (carrega iframe só quando aberto).
  const [showChart, setShowChart] = useState(false);
  const analysis = signal.analysis ?? signal.rationale ?? null;
  // Gráfico só para sinais da Análise IA (source 'auto'); setup manual não tem.
  const canShowChart = signal.source === 'auto';
  const isLong = (analysis?.length ?? 0) > 220;

  // Verde para compra, vermelho para venda, neutro para "sem entrada".
  const accent = isBuy
    ? { ring: 'hover:border-success/30!', chip: 'bg-success/10 text-success-fg border-success/20', glow: 'bg-success/10', text: 'text-success-fg', label: 'COMPRA', Icon: ArrowUpRight }
    : isSell
    ? { ring: 'hover:border-danger/30!', chip: 'bg-danger/10 text-danger-fg border-danger/20', glow: 'bg-danger/10', text: 'text-danger-fg', label: 'VENDA', Icon: ArrowDownRight }
    : { ring: 'hover:border-tint/15!', chip: 'bg-tint/5 text-fg-muted border-tint/10', glow: 'bg-tint/5', text: 'text-fg-muted', label: 'SEM ENTRADA', Icon: MinusCircle };

  const AccentIcon = accent.Icon;

  return (
    <div className={`glass-card relative overflow-hidden p-5 transition-colors ${accent.ring}`}>
      <div className={`pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full ${accent.glow} blur-3xl`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`w-11 h-11 shrink-0 rounded-xl border ${accent.chip} flex items-center justify-center`}>
            <AccentIcon size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-x-2">
              <span className={`font-display text-lg font-semibold tracking-wide ${accent.text}`}>{accent.label}</span>
              <span className="font-mono text-sm font-medium text-fg-muted whitespace-nowrap">{signal.symbol}</span>
            </div>
            <p className="text-xs text-fg-subtle flex items-center gap-1 mt-0.5 tabular-nums">
              <Clock size={12} /> {fmtWhen(signal.created_at)}
              {signal.timeframe && <span className="ml-1 font-mono text-fg-subtle">• {signal.timeframe}</span>}
            </p>
          </div>
        </div>
        {!isNone && (
          <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded-full border ${status.className}`}>
            <StatusIcon size={13} /> {status.label}
          </span>
        )}
      </div>

      {/* Entrada/Stop/Alvo só quando há setup */}
      {!isNone && (
        <div className="relative grid grid-cols-3 gap-2 mt-4">
          <div className="min-w-0 rounded-xl bg-tint/3 border border-tint/6 px-2.5 py-2.5 sm:px-3">
            <p className="eyebrow-muted text-[10px]">Entrada</p>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-semibold text-fg tabular-nums whitespace-nowrap truncate">{fmtPrice(signal.entry_price)}</p>
          </div>
          <div className="min-w-0 rounded-xl bg-danger/10 border border-danger/20 px-2.5 py-2.5 sm:px-3">
            <p className="text-[10px] font-medium text-danger-fg uppercase tracking-[0.15em] flex items-center gap-1"><ShieldAlert size={11} /> Stop</p>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-semibold text-danger-fg tabular-nums whitespace-nowrap truncate">{fmtPrice(signal.stop_loss)}</p>
          </div>
          <div className="min-w-0 rounded-xl bg-success/10 border border-success/20 px-2.5 py-2.5 sm:px-3">
            <p className="text-[10px] font-medium text-success-fg uppercase tracking-[0.15em] flex items-center gap-1"><Target size={11} /> Alvo</p>
            <p className="mt-0.5 font-mono text-sm sm:text-base font-semibold text-success-fg tabular-nums whitespace-nowrap truncate">{fmtPrice(signal.take_profit)}</p>
          </div>
        </div>
      )}

      {/* Gráfico TradingView sob demanda (só Análise IA) — acima do parecer */}
      {canShowChart && (
        <div className="relative mt-3">
          <button
            onClick={() => setShowChart((v) => !v)}
            className="text-xs font-medium text-fg-muted hover:text-accent-fg inline-flex items-center gap-1 rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <CandlestickChart size={14} />
            {showChart ? 'Ocultar gráfico' : 'Ver gráfico'}
            <ChevronDown size={13} className={`transition-transform ${showChart ? 'rotate-180' : ''}`} />
          </button>
          {showChart && (
            <div className="mt-2 overflow-hidden rounded-xl border border-tint/8">
              <TradingViewChart
                symbol={tvSymbol(signal.symbol)}
                interval={tvInterval(signal.timeframe)}
                height={320}
              />
            </div>
          )}
        </div>
      )}

      {/* Parecer — sempre presente na análise on-demand */}
      {analysis && (
        <div className="relative mt-3">
          <p className="eyebrow-muted mb-1">Parecer</p>
          <p className={`text-sm text-fg-muted leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
            {analysis}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-accent-fg hover:opacity-80 inline-flex items-center gap-1 rounded focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
              <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
