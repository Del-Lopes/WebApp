import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Target, ShieldAlert, Clock, CheckCircle2, XCircle, Ban, MinusCircle, ChevronDown, CandlestickChart } from 'lucide-react';
import { Signal } from '../../types';
import { tvSymbol, tvInterval } from '../../lib/marketData';
import { TradingViewChart } from './TradingViewChart';

const STATUS_META: Record<Signal['status'], { label: string; className: string; Icon: React.ElementType }> = {
  open:      { label: 'Ativo',       className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: Clock },
  hit_tp:    { label: 'Alvo atingido', className: 'bg-green-50 text-green-700 ring-green-200', Icon: CheckCircle2 },
  hit_sl:    { label: 'Stopado',     className: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: XCircle },
  cancelled: { label: 'Cancelado',   className: 'bg-slate-100 text-slate-500 ring-slate-200', Icon: Ban },
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

  // Verde para compra, vermelho para venda, neutro (slate) para "sem entrada".
  const accent = isBuy
    ? { ring: 'ring-emerald-100', chip: 'bg-emerald-600', glow: 'bg-emerald-200/40', text: 'text-emerald-700', label: 'COMPRA', Icon: ArrowUpRight }
    : isSell
    ? { ring: 'ring-rose-100', chip: 'bg-rose-600', glow: 'bg-rose-200/40', text: 'text-rose-700', label: 'VENDA', Icon: ArrowDownRight }
    : { ring: 'ring-slate-100', chip: 'bg-slate-400', glow: 'bg-slate-200/40', text: 'text-slate-600', label: 'SEM ENTRADA', Icon: MinusCircle };

  const AccentIcon = accent.Icon;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ${accent.ring} shadow-[0_8px_24px_-14px_rgba(15,23,42,0.25)]`}>
      <div className={`pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full ${accent.glow} blur-3xl`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${accent.chip} text-white flex items-center justify-center shadow-lg`}>
            <AccentIcon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${accent.text}`}>{accent.label}</span>
              <span className="text-sm font-semibold text-slate-500">{signal.symbol}</span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Clock size={12} /> {fmtWhen(signal.created_at)}
              {signal.timeframe && <span className="ml-1 text-slate-300">• {signal.timeframe}</span>}
            </p>
          </div>
        </div>
        {!isNone && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${status.className}`}>
            <StatusIcon size={13} /> {status.label}
          </span>
        )}
      </div>

      {/* Entrada/Stop/Alvo só quando há setup */}
      {!isNone && (
        <div className="relative grid grid-cols-3 gap-2 mt-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Entrada</p>
            <p className="text-base font-bold text-slate-900 tabular-nums">{fmtPrice(signal.entry_price)}</p>
          </div>
          <div className="rounded-xl bg-rose-50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-rose-400 uppercase tracking-wide flex items-center gap-1"><ShieldAlert size={11} /> Stop</p>
            <p className="text-base font-bold text-rose-700 tabular-nums">{fmtPrice(signal.stop_loss)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-emerald-500 uppercase tracking-wide flex items-center gap-1"><Target size={11} /> Alvo</p>
            <p className="text-base font-bold text-emerald-700 tabular-nums">{fmtPrice(signal.take_profit)}</p>
          </div>
        </div>
      )}

      {/* Gráfico TradingView sob demanda (só Análise IA) — acima do parecer */}
      {canShowChart && (
        <div className="relative mt-3">
          <button
            onClick={() => setShowChart((v) => !v)}
            className="text-xs font-medium text-slate-600 hover:text-green-700 inline-flex items-center gap-1"
          >
            <CandlestickChart size={14} />
            {showChart ? 'Ocultar gráfico' : 'Ver gráfico'}
            <ChevronDown size={13} className={`transition-transform ${showChart ? 'rotate-180' : ''}`} />
          </button>
          {showChart && (
            <div className="mt-2">
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Parecer</p>
          <p className={`text-sm text-slate-600 leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
            {analysis}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-green-600 hover:text-green-700 inline-flex items-center gap-1"
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
