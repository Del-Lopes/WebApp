import React, { useEffect, useState } from 'react';
import { Loader2, LockOpen, Info } from 'lucide-react';
import {
  fetchUpcomingUnlocks, fetchUnlockCoverage, daysUntil,
  UpcomingUnlock, UnlockCoverage,
} from '../../lib/cryptoData';

// Calendário de desbloqueio de vesting. É o raro dado de cripto que se conhece
// com antecedência: a data em que um lote de tokens sai do cofre e a oferta
// aumenta. Nada aqui prevê preço — mostra pressão de oferta programada.

const WINDOWS = [7, 30, 90];

// Acima disso o lote é grande o bastante para merecer destaque visual.
const HEAVY_DILUTION_PCT = 1;

function fmtTokens(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const UnlocksPanel: React.FC = () => {
  const [days, setDays] = useState(30);
  const [items, setItems] = useState<UpcomingUnlock[]>([]);
  const [coverage, setCoverage] = useState<UnlockCoverage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchUpcomingUnlocks(days), fetchUnlockCoverage()])
      .then(([u, c]) => {
        if (!alive) return;
        setItems(u);
        setCoverage(c);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <LockOpen size={16} className="text-rose-500" /> Próximos desbloqueios de tokens.
        </p>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          {WINDOWS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                days === d ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-slate-300"><Loader2 className="animate-spin" size={24} /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          {coverage && coverage.protocols === 0
            ? 'O calendário ainda está sendo montado. Volte em algumas horas.'
            : `Nenhum desbloqueio nos próximos ${days} dias entre os protocolos já mapeados.`}
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((u) => {
            const d = daysUntil(u.next_unlock_at);
            const heavy = (u.dilution_pct ?? 0) >= HEAVY_DILUTION_PCT;
            return (
              <div
                key={u.protocol_slug}
                className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow-xs ring-1 ${
                  heavy ? 'ring-rose-200' : 'ring-slate-100'
                }`}
              >
                <div className="w-12 shrink-0 text-center">
                  <p className="text-sm font-bold text-slate-700 leading-tight tabular-nums">{d}</p>
                  <p className="text-[10px] text-slate-400">{d === 1 ? 'dia' : 'dias'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{u.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {fmtDate(u.next_unlock_at)}
                    {u.next_unlock_category && ` • ${u.next_unlock_category}`}
                    {u.next_unlock_type === 'cliff' && ' • lote único'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-700 tabular-nums">{fmtTokens(u.next_unlock_tokens)}</p>
                  {u.dilution_pct != null && (
                    <p className={`text-[11px] font-medium tabular-nums ${heavy ? 'text-rose-600' : 'text-slate-400'}`}>
                      {u.dilution_pct.toFixed(2)}% do supply
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
        <Info size={13} className="mt-0.5 shrink-0" />
        Cronograma de vesting via DefiLlama
        {coverage && coverage.protocols > 0 && ` — ${coverage.protocols} protocolos mapeados até agora`}.
        Desbloqueio aumenta a oferta disponível; não determina o preço, e muitos já estão precificados.
      </p>
    </div>
  );
};
