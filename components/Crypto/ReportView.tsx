import React, { useEffect, useState } from 'react';
import { Loader2, Coins, Zap, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { TrilhaStats } from '../../types';
import { fetchReportCost, fetchMyReports, requestNarrativeReport, CryptoReport } from '../../lib/cryptoData';
import { fetchStats } from '../../lib/trilhaGain';
import { fmtPct, pctColor } from './format';
import { Button, Skeleton, EmptyState } from '../ui';

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
      <div className="glass-card relative overflow-hidden p-5">
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-display text-sm font-semibold text-fg flex items-center gap-2"><Brain size={16} className="text-accent-fg" /> Panorama de narrativas por IA</p>
            <p className="text-xs text-fg-muted mt-0.5 flex items-center gap-1 flex-wrap">
              <Coins size={13} className="text-warning" />
              Saldo: <span className="font-mono tabular-nums whitespace-nowrap font-semibold text-fg">{balance.toLocaleString('pt-BR')}</span>
              <span className="text-fg-subtle">•</span>
              Custo: <span className="font-mono tabular-nums whitespace-nowrap font-semibold text-fg">{cost.toLocaleString('pt-BR')} Coins</span>
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || !canAfford}
          >
            {generating ? <><Loader2 size={18} className="animate-spin" /> Gerando…</> : <><Zap size={18} /> Gerar relatório ({cost} Coins)</>}
          </Button>
        </div>
        {!canAfford && !generating && (
          <p className="text-xs text-warning-fg mt-2">Faltam {(cost - balance).toLocaleString('pt-BR')} Coins. Ganhe na Trilha Gain.</p>
        )}
        {error && <p className="text-xs text-danger-fg mt-2">{error}</p>}
      </div>

      {/* Histórico */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">{[0, 1].map((k) => <Skeleton key={k} className="h-40 rounded-2xl" />)}</div>
      ) : reports.length === 0 ? (
        <EmptyState icon={Brain} title="Nenhum relatório ainda." description="Gere seu primeiro panorama de narrativas do momento." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="glass-card p-5">
              <p className="font-display text-base font-semibold text-fg">{r.title}</p>
              <p className="text-[11px] text-fg-subtle tabular-nums mb-3">{new Date(r.created_at).toLocaleString('pt-BR')}</p>
              {/* chips dos setores em destaque */}
              {r.meta?.top_sectors && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {r.meta.top_sectors.slice(0, 6).map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-tint/3 border border-tint/8 text-fg-muted">
                      {s.change24h >= 0 ? <TrendingUp size={11} className="text-success-fg" /> : <TrendingDown size={11} className="text-danger-fg" />}
                      {s.name} <span className={`font-mono tabular-nums ${pctColor(s.change24h)}`}>{fmtPct(s.change24h)}</span>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
