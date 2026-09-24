import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Coins, Zap, RefreshCw, Settings2, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { TrilhaStats } from '../../types';
import { computeTrendMeter, TrendAnalysis } from '../../lib/trendMeter';
import {
  ASSETS, findAsset, DEFAULT_TIMEFRAMES, AVAILABLE_TIMEFRAMES,
  fetchCandlesForTFs, HAS_MARKET_KEY, TimeframeOption,
} from '../../lib/marketData';
import { fetchTrendPanelCost, fetchTodayPanelAccess, openTrendPanel } from '../../lib/signals';
import { fetchStats } from '../../lib/trilhaGain';
import { TFGauge } from './TFGauge';
import { Button, Label, Select, Skeleton } from '../ui';

// Auto-refresh a cada 90s: com 5 TFs = 5 req por rodada, fica bem abaixo do
// limite do plano free do Twelve Data (8 req/min).
const REFRESH_MS = 90_000;
// Espera o usuário parar de ajustar (ativo/TFs/MA) antes de gastar requisições.
const DEBOUNCE_MS = 700;
// Mínimo entre buscas automáticas — barra rajadas que estourariam o rate-limit.
const MIN_FETCH_GAP_MS = 60_000;
const MA_MIN = 3, MA_MAX = 50;

export const TrendPanel: React.FC = () => {
  const [asset, setAsset] = useState(ASSETS[0].value);
  const [timeframes, setTimeframes] = useState<TimeframeOption[]>(DEFAULT_TIMEFRAMES);
  const [maPeriod, setMaPeriod] = useState(8);
  const [showSettings, setShowSettings] = useState(false);

  const [cost, setCost] = useState(200);
  const [stats, setStats] = useState<TrilhaStats | null>(null);
  const [openedToday, setOpenedToday] = useState<Set<string>>(new Set());

  const [analysis, setAnalysis] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastFetchRef = useRef<number>(0); // timestamp da última busca (throttle)
  const inFlightRef = useRef(false);       // evita buscas concorrentes
  const balance = stats?.total_xp ?? 0;
  const isOpen = openedToday.has(asset);
  const canAfford = balance >= cost;

  useEffect(() => {
    (async () => {
      const [c, s, acc] = await Promise.all([fetchTrendPanelCost(), fetchStats(), fetchTodayPanelAccess()]);
      setCost(c); setStats(s); setOpenedToday(acc);
    })();
    return () => {
      if (refreshRef.current) window.clearInterval(refreshRef.current);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  // Busca candles e calcula o Trendmeter localmente (no browser).
  // `force=true` (refresh manual) ignora o throttle; o resto respeita o mínimo
  // entre buscas para não estourar o rate-limit do Twelve Data (8 req/min, e
  // cada busca faz 1 req por TF).
  const runAnalysis = async (force = false) => {
    const a = findAsset(asset);
    if (!a || inFlightRef.current) return;

    const now = Date.now();
    const since = now - lastFetchRef.current;
    if (!force && since < MIN_FETCH_GAP_MS) return; // throttle

    inFlightRef.current = true;
    lastFetchRef.current = now;
    setLoading(true);
    setError(null);
    try {
      const candlesByTF = await fetchCandlesForTFs(a.td, timeframes);
      const result = computeTrendMeter({
        candlesByTF,
        labels: timeframes.map((t) => t.label),
        maPeriod,
      });
      setAnalysis(result);
      setLastUpdate(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      // Rate-limit: mantém os dados atuais na tela e avisa para aguardar.
      setError(msg === 'rate_limited'
        ? 'Limite de cotações atingido (plano gratuito: 8/min). Aguarde ~1 minuto — os dados anteriores continuam válidos.'
        : 'Falha ao atualizar o painel.');
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  // Liga/desliga o auto-refresh conforme o ativo esteja aberto. Mudanças de
  // ativo/timeframes/período são DEBOUNCED: espera o usuário parar de mexer
  // antes de gastar 5 requisições, evitando rajadas que estouram o rate-limit.
  useEffect(() => {
    if (refreshRef.current) { window.clearInterval(refreshRef.current); refreshRef.current = null; }
    if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }

    if (!isOpen) { setAnalysis(null); return; }

    debounceRef.current = window.setTimeout(() => {
      runAnalysis(true); // primeira busca após parametrizar: força
      refreshRef.current = window.setInterval(() => runAnalysis(false), REFRESH_MS);
    }, DEBOUNCE_MS);

    return () => {
      if (refreshRef.current) window.clearInterval(refreshRef.current);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, asset, timeframes, maPeriod]);

  const handleOpen = async () => {
    setOpening(true);
    setError(null);
    try {
      const newBalance = await openTrendPanel(asset);
      setStats((prev) => (prev ? { ...prev, total_xp: newBalance } : prev));
      setOpenedToday((prev) => new Set(prev).add(asset));
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setError(code.includes('insufficient_coins') ? 'Coins insuficientes para abrir este ativo.' : 'Não foi possível abrir o painel.');
    } finally {
      setOpening(false);
    }
  };

  const toggleTF = (opt: TimeframeOption) => {
    setTimeframes((prev) => {
      const exists = prev.some((t) => t.td === opt.td);
      if (exists) return prev.filter((t) => t.td !== opt.td);
      if (prev.length >= 5) return prev; // máx 5 TFs (como o MT5)
      // mantém a ordem curto→longo pela ordem de AVAILABLE_TIMEFRAMES
      const next = [...prev, opt];
      return AVAILABLE_TIMEFRAMES.filter((a) => next.some((n) => n.td === a.td));
    });
  };

  const biasMeta = analysis
    ? analysis.superTrend === 'up' || analysis.bias === 1
      ? { Icon: TrendingUp, text: 'text-success-fg', bg: 'bg-success/10 border-success/20' }
      : analysis.superTrend === 'down' || analysis.bias === -1
      ? { Icon: TrendingDown, text: 'text-danger-fg', bg: 'bg-danger/10 border-danger/20' }
      : { Icon: Minus, text: 'text-warning-fg', bg: 'bg-warning/10 border-warning/20' }
    : null;

  if (!HAS_MARKET_KEY) {
    return (
      <div className="rounded-2xl bg-warning/10 border border-warning/20 p-5 text-sm text-warning-fg flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning-fg" />
        <div className="min-w-0">
          <p className="font-semibold">Fonte de cotações não configurada.</p>
          <p className="text-warning-fg mt-1 break-words">Defina <code className="font-mono bg-warning/15 px-1 rounded-sm">VITE_TWELVEDATA_KEY</code> no ambiente do front para ativar o painel de tendência.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="glass-card p-4">
        <div className="flex items-end gap-2 sm:gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs text-fg-muted">Ativo</Label>
            <Select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
            >
              {ASSETS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
          </div>

          <Button
            variant="secondary"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
          >
            <Settings2 size={16} /> Parâmetros
          </Button>

          {isOpen ? (
            <Button
              onClick={() => runAnalysis(true)}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar
            </Button>
          ) : (
            <Button
              onClick={handleOpen}
              disabled={opening || !canAfford}
            >
              {opening ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Abrir ({cost} Coins)
            </Button>
          )}
        </div>

        <p className="text-xs text-fg-muted mt-3 flex items-center gap-1 flex-wrap">
          <Coins size={13} className="text-warning" />
          Saldo: <span className="font-mono tabular-nums font-semibold text-fg">{balance.toLocaleString('pt-BR')}</span>
          <span className="text-fg-subtle">•</span>
          {isOpen
            ? <span className="text-success-fg font-medium">Ativo aberto hoje — atualização livre</span>
            : <>Abrir custa <span className="font-mono tabular-nums font-semibold text-fg">{cost}</span> Coins (1×/ativo/dia)</>}
        </p>
        {!canAfford && !isOpen && (
          <p className="text-xs text-warning-fg mt-1">Faltam {(cost - balance).toLocaleString('pt-BR')} Coins. Ganhe na Trilha Gain.</p>
        )}
        {error && <p className="text-xs text-danger-fg mt-1">{error}</p>}

        {/* Parâmetros ajustáveis */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-tint/6 space-y-3">
            <div>
              <Label className="text-xs text-fg-muted">Período da média móvel: <span className="font-mono tabular-nums text-fg">{maPeriod}</span></Label>
              <input
                type="range" min={MA_MIN} max={MA_MAX} value={maPeriod}
                onChange={(e) => setMaPeriod(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
            <div>
              <Label className="text-xs text-fg-muted">Timeframes (até 5, curto → longo)</Label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TIMEFRAMES.map((tf) => {
                  const active = timeframes.some((t) => t.td === tf.td);
                  return (
                    <button
                      key={tf.td}
                      onClick={() => toggleTF(tf)}
                      aria-pressed={active}
                      className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${active ? 'bg-accent/10 text-accent-fg border-accent/30' : 'bg-tint/3 text-fg-muted border-tint/10 hover:text-fg'}`}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resultado */}
      {isOpen && (
        loading && !analysis ? (
          <div className="glass-card p-5 space-y-4" aria-busy="true">
            <div className="flex flex-wrap justify-center gap-4">
              {timeframes.map((t) => <Skeleton key={t.td} className="h-28 w-32 rounded-xl" />)}
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : analysis ? (
          <div className="glass-card p-4 sm:p-5 space-y-4">
            {/* Gauges */}
            <div className="flex flex-wrap justify-center gap-2">
              {analysis.perByTF.map((r) => <TFGauge key={r.label} result={r} />)}
            </div>

            {/* Parecer */}
            {biasMeta && (
              <div className={`rounded-xl border ${biasMeta.bg} p-4`}>
                <div className="flex items-start gap-2">
                  <biasMeta.Icon size={20} className={`${biasMeta.text} mt-0.5 shrink-0`} />
                  <div>
                    <p className={`text-sm font-semibold ${biasMeta.text}`}>{analysis.line1}</p>
                    {analysis.line2 && <p className="text-sm text-fg-muted mt-0.5">{analysis.line2}</p>}
                  </div>
                </div>
              </div>
            )}

            {lastUpdate && (
              <p className="text-[11px] text-fg-subtle text-right tabular-nums">
                Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • auto a cada 90s
              </p>
            )}
          </div>
        ) : null
      )}
    </div>
  );
};
