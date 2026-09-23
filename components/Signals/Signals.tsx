import React, { useEffect, useState } from 'react';
import { Loader2, Radio, Sparkles, UserCog, Info, Coins, Zap, Gauge } from 'lucide-react';
import { Signal, SignalSource, TrilhaStats } from '../../types';
import { fetchSignals, fetchAnalysisCost, requestSignalAnalysis } from '../../lib/signals';
import { ASSETS, AVAILABLE_TIMEFRAMES } from '../../lib/marketData';
import { fetchStats } from '../../lib/trilhaGain';
import { BackButton } from '../BackButton';
import { useAuth } from '../../contexts/AuthContext';
import { SignalCard } from './SignalCard';
import { SetupSignalForm } from './SetupSignalForm';
import { TrendPanel } from './TrendPanel';

// Abas da sessão. 'trend' é o painel multi-TF; 'auto'/'setup' são sinais.
type TabKey = 'trend' | 'auto' | 'setup';

interface Props {
  onBack: () => void;
}

const TABS: { key: TabKey; label: string; Icon: React.ElementType; hint: string }[] = [
  { key: 'trend', label: 'Tendência',   Icon: Gauge,    hint: 'Painel multi-timeframe do seu setup. Abrir um ativo custa Coins (1×/ativo/dia); atualização livre.' },
  { key: 'auto',  label: 'Análise IA',  Icon: Sparkles, hint: 'Análise sob demanda do XAU/USD com parecer de IA. Cada análise custa Coins.' },
  { key: 'setup', label: 'Meu Setup',   Icon: UserCog,  hint: 'Sinais publicados manualmente pelo time.' },
];

export const Signals: React.FC<Props> = ({ onBack }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [tab, setTab] = useState<TabKey>('trend');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  // Economia de Coins (aba auto)
  const [cost, setCost] = useState<number>(500);
  const [stats, setStats] = useState<TrilhaStats | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ativo e timeframe escolhidos para a Análise IA (default: XAU/USD 15min).
  const [analysisAsset, setAnalysisAsset] = useState(ASSETS[0].value);
  const [analysisTf, setAnalysisTf] = useState('15min');

  const balance = stats?.total_xp ?? 0;
  const canAfford = balance >= cost;

  const load = async (source: SignalSource) => {
    setLoading(true);
    setError(null);
    setSignals(await fetchSignals(source));
    setLoading(false);
  };

  // A aba 'trend' tem seu próprio componente; só buscamos sinais em auto/setup.
  useEffect(() => {
    if (tab === 'trend') return;
    load(tab);
  }, [tab]);

  // Carrega custo + saldo uma vez (para a aba de análise).
  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([fetchAnalysisCost(), fetchStats()]);
      setCost(c);
      setStats(s);
    })();
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await requestSignalAnalysis(analysisAsset, analysisTf);
      // Novo sinal no topo + saldo atualizado a partir do retorno do servidor.
      setSignals((prev) => [result.signal, ...prev]);
      setStats((prev) => (prev ? { ...prev, total_xp: result.new_balance } : prev));
    } catch (e) {
      const code = e instanceof Error ? e.message : 'analysis_failed';
      setError(
        code === 'insufficient_coins' ? 'Coins insuficientes para esta análise.'
        : code === 'quotes_fetch_failed' ? 'Não foi possível obter as cotações agora. Tente novamente (nada foi cobrado).'
        : 'Não foi possível gerar a análise. Tente novamente.',
      );
      // Ressincroniza o saldo (pode ter havido estorno no servidor).
      setStats(await fetchStats());
    } finally {
      setAnalyzing(false);
    }
  };

  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <BackButton onClick={onBack} />
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center">
            <Radio size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Sinais</h1>
            <p className="text-xs text-slate-400">Compra e venda para XAU/USD</p>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Info size={13} /> {active.hint}
      </p>

      {/* Aba Tendência — painel multi-TF (cálculo no browser) */}
      {tab === 'trend' && <TrendPanel />}

      {/* Painel de análise paga (aba auto) */}
      {tab === 'auto' && (
        <div className="rounded-2xl bg-gradient-to-br from-white via-emerald-50/60 to-teal-50 ring-1 ring-emerald-100 p-5 shadow-[0_10px_30px_-16px_rgba(16,185,129,0.35)]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-800">Analisar o mercado agora</p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Coins size={13} className="text-amber-500" />
                Seu saldo: <span className="font-semibold text-slate-700">{balance.toLocaleString('pt-BR')} Coins</span>
                <span className="text-slate-300">•</span>
                Custo: <span className="font-semibold text-slate-700">{cost.toLocaleString('pt-BR')} Coins</span>
              </p>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ativo</label>
                <select
                  value={analysisAsset}
                  onChange={(e) => setAnalysisAsset(e.target.value)}
                  disabled={analyzing}
                  className="mt-1 block px-3 py-2.5 rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-hidden text-sm bg-white disabled:opacity-60"
                >
                  {ASSETS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Timeframe</label>
                <select
                  value={analysisTf}
                  onChange={(e) => setAnalysisTf(e.target.value)}
                  disabled={analyzing}
                  className="mt-1 block px-3 py-2.5 rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-hidden text-sm bg-white disabled:opacity-60"
                >
                  {AVAILABLE_TIMEFRAMES.map((tf) => <option key={tf.td} value={tf.td}>{tf.label}</option>)}
                </select>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !canAfford}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/10"
              >
                {analyzing ? <><Loader2 size={18} className="animate-spin" /> Analisando…</> : <><Zap size={18} /> Analisar ({cost} Coins)</>}
              </button>
            </div>
          </div>
          {!canAfford && !analyzing && (
            <p className="text-xs text-amber-600 mt-2">Você precisa de {(cost - balance).toLocaleString('pt-BR')} Coins a mais. Ganhe Coins na Trilha Gain.</p>
          )}
          {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
        </div>
      )}

      {/* Form de publicação (só admin, só na aba setup) */}
      {isAdmin && tab === 'setup' && (
        <SetupSignalForm onCreated={(s) => setSignals((prev) => [s, ...prev])} />
      )}

      {/* Lista de sinais (abas auto/setup) */}
      {tab !== 'trend' && (
        loading ? (
          <div className="flex items-center justify-center py-16 text-slate-300">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : signals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
            <Radio size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum sinal por aqui ainda.</p>
            <p className="text-xs text-slate-300 mt-1">
              {tab === 'auto' ? 'Clique em "Analisar" para gerar sua primeira análise.' : 'Os sinais do setup aparecerão aqui quando publicados.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {signals.map((s) => <SignalCard key={s.id} signal={s} />)}
          </div>
        )
      )}
    </div>
  );
};
