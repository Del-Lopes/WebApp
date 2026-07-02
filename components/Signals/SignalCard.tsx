import React from 'react';
import { ArrowUpRight, ArrowDownRight, Target, ShieldAlert, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { Signal } from '../../types';

const STATUS_META: Record<Signal['status'], { label: string; className: string; Icon: React.ElementType }> = {
  open:      { label: 'Ativo',       className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Icon: Clock },
  hit_tp:    { label: 'Alvo atingido', className: 'bg-green-50 text-green-700 ring-green-200', Icon: CheckCircle2 },
  hit_sl:    { label: 'Stopado',     className: 'bg-rose-50 text-rose-700 ring-rose-200', Icon: XCircle },
  cancelled: { label: 'Cancelado',   className: 'bg-slate-100 text-slate-500 ring-slate-200', Icon: Ban },
};

function fmtPrice(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const status = STATUS_META[signal.status];
  const StatusIcon = status.Icon;

  // Verde para compra, vermelho para venda.
  const accent = isBuy
    ? { ring: 'ring-emerald-100', chip: 'bg-emerald-600', glow: 'bg-emerald-200/40', text: 'text-emerald-700' }
    : { ring: 'ring-rose-100', chip: 'bg-rose-600', glow: 'bg-rose-200/40', text: 'text-rose-700' };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ${accent.ring} shadow-[0_8px_24px_-14px_rgba(15,23,42,0.25)]`}>
      <div className={`pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full ${accent.glow} blur-3xl`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl ${accent.chip} text-white flex items-center justify-center shadow-lg`}>
            {isBuy ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${accent.text}`}>{isBuy ? 'COMPRA' : 'VENDA'}</span>
              <span className="text-sm font-semibold text-slate-500">{signal.symbol}</span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Clock size={12} /> {fmtWhen(signal.created_at)}
              {signal.timeframe && <span className="ml-1 text-slate-300">• {signal.timeframe}</span>}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${status.className}`}>
          <StatusIcon size={13} /> {status.label}
        </span>
      </div>

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

      {signal.rationale && (
        <p className="relative text-xs text-slate-500 mt-3 leading-relaxed">{signal.rationale}</p>
      )}
    </div>
  );
};
