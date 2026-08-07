import React, { useEffect, useState } from 'react';
import { Loader2, Coins, Zap, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { TrilhaStats } from '../../types';
import { fetchReportCost, fetchMyReports, requestNarrativeReport, CryptoReport } from '../../lib/cryptoData';
import { fetchStats } from '../../lib/trilhaGain';
import { fmtPct, pctColor } from './format';

// Relatório de Narrativa por IA — panorama do que está aquecendo, pago em Coins.
export const ReportView: React.FC = () => {
  const [cost, setCost] = useState(500);
  const [stats, setStats] = useState<TrilhaStats | null>(null);
  const [reports, setReports] = useState<CryptoReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = stats?.total_xp ?? 0;
  const canAfford = balance >= cost;

  useEffect(() => {
    (async () => {
      const [c, s, r] = await Promise.all([fetchReportCost(), fetchStats(), fetchMyReports()]);
      setCost(c); setStats(s); setReports(r); setLoading(false);
    })();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await requestNarrativeReport();
      setReports((prev) => [result.report, ...prev]);
      setStats((prev) => (prev ? { ...prev, total_xp: result.new_balance } : prev));
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(
        code === 'insufficient_coins' ? 'Coins insuficientes para gerar o relatório.'
        : code === 'market_data_failed' ? 'Não foi possível obter os dados de mercado agora (nada foi cobrado).'
        : 'Não foi possível gerar o relatório. Tente novamente.',
      );
      setStats(await fetchStats());
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Painel de geração */}
      <div className="rounded-2xl bg-gradient-to-br from-white via-violet-50/60 to-indigo-50 ring-1 ring-violet-100 p-5 shadow-[0_10px_30px_-16px_rgba(99,102,241,0.35)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Brain size={16} className="text-violet-600" /> Panorama de narrativas por IA</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Coins size={13} className="text-amber-500" />
              Saldo: <span className="font-semibold text-slate-700">{balance.toLocaleString('pt-BR')}</span>
              <span className="text-slate-300">•</span>
              Custo: <span className="font-semibold text-slate-700">{cost.toLocaleString('pt-BR')} Coins</span>
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !canAfford}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-900/10"
          >
            {generating ? <><Loader2 size={18} className="animate-spin" /> Gerando…</> : <><Zap size={18} /> Gerar relatório ({cost} Coins)</>}
          </button>
        </div>
        {!canAfford && !generating && (
          <p className="text-xs text-amber-600 mt-2">Faltam {(cost - balance).toLocaleString('pt-BR')} Coins. Ganhe na Trilha Gain.</p>
        )}
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      </div>

      {/* Histórico */}
      {loading ? (
        <div className="flex justify-center py-16 text-slate-300"><Loader2 className="animate-spin" size={32} /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          <Brain size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum relatório ainda.</p>
          <p className="text-xs text-slate-300 mt-1">Gere seu primeiro panorama de narrativas do momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white ring-1 ring-slate-100 p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-800">{r.title}</p>
              <p className="text-[11px] text-slate-400 mb-2">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
              {/* chips dos setores em destaque */}
              {r.meta?.top_sectors && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {r.meta.top_sectors.slice(0, 6).map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-50 ring-1 ring-slate-100">
                      {s.change24h >= 0 ? <TrendingUp size={11} className="text-emerald-600" /> : <TrendingDown size={11} className="text-rose-600" />}
                      {s.name} <span className={pctColor(s.change24h)}>{fmtPct(s.change24h)}</span>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
