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
import { Button, PageHeader, Tabs, Label, Select, EmptyState, Skeleton } from '../ui';

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
      <PageHeader
        leading={<BackButton onClick={onBack} />}
        title={<span className="inline-flex items-center gap-2.5"><Radio size={22} className="text-accent-fg" aria-hidden /> Sinais</span>}
        description="Compra e venda para XAU/USD"
        className="mb-2 sm:mb-2"
      />

      {/* Abas */}
      <Tabs
        aria-label="Abas de sinais"
        items={TABS.map(({ key, label, Icon }) => ({ key, label, icon: Icon }))}
        value={tab}
        onChange={setTab}
      />

      <p className="flex items-start gap-2 text-xs text-fg-muted">
        <Info size={13} className="mt-0.5 shrink-0" /> {active.hint}
      </p>

      {/* Aba Tendência — painel multi-TF (cálculo no browser) */}
      {tab === 'trend' && <TrendPanel />}

      {/* Painel de análise paga (aba auto) */}
      {tab === 'auto' && (
        <div className="glass-card relative overflow-hidden p-5">
          <div className="hairline absolute inset-x-0 top-0" aria-hidden />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-display text-sm font-semibold text-fg">Analisar o mercado agora</p>
              <p className="text-xs text-fg-muted mt-0.5 flex items-center gap-1 flex-wrap">
                <Coins size={13} className="text-warning" />
                Seu saldo: <span className="font-mono tabular-nums whitespace-nowrap font-semibold text-fg">{balance.toLocaleString('pt-BR')} Coins</span>
                <span className="text-fg-subtle">•</span>
                Custo: <span className="font-mono tabular-nums whitespace-nowrap font-semibold text-fg">{cost.toLocaleString('pt-BR')} Coins</span>
              </p>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <Label className="eyebrow-muted">Ativo</Label>
                <Select
                  value={analysisAsset}
                  onChange={(e) => setAnalysisAsset(e.target.value)}
                  disabled={analyzing}
                >
                  {ASSETS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </div>
              <div>
                <Label className="eyebrow-muted">Timeframe</Label>
                <Select
                  value={analysisTf}
                  onChange={(e) => setAnalysisTf(e.target.value)}
                  disabled={analyzing}
                >
                  {AVAILABLE_TIMEFRAMES.map((tf) => <option key={tf.td} value={tf.td}>{tf.label}</option>)}
                </Select>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !canAfford}
              >
                {analyzing ? <><Loader2 size={18} className="animate-spin" /> Analisando…</> : <><Zap size={18} /> Analisar ({cost} Coins)</>}
              </Button>
            </div>
          </div>
          {!canAfford && !analyzing && (
            <p className="text-xs text-warning-fg mt-2">Você precisa de {(cost - balance).toLocaleString('pt-BR')} Coins a mais. Ganhe Coins na Trilha Gain.</p>
          )}
          {error && <p className="text-xs text-danger-fg mt-2">{error}</p>}
        </div>
      )}

      {/* Form de publicação (só admin, só na aba setup) */}
      {isAdmin && tab === 'setup' && (
        <SetupSignalForm onCreated={(s) => setSignals((prev) => [s, ...prev])} />
      )}

      {/* Lista de sinais (abas auto/setup) */}
      {tab !== 'trend' && (
        loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        ) : signals.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Nenhum sinal por aqui ainda."
            description={tab === 'auto' ? 'Clique em "Analisar" para gerar sua primeira análise.' : 'Os sinais do setup aparecerão aqui quando publicados.'}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {signals.map((s) => <SignalCard key={s.id} signal={s} />)}
          </div>
        )
      )}
    </div>
  );
};
