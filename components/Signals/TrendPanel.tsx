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
      ? { Icon: TrendingUp, text: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' }
      : analysis.superTrend === 'down' || analysis.bias === -1
      ? { Icon: TrendingDown, text: 'text-rose-700', bg: 'bg-rose-50 ring-rose-200' }
      : { Icon: Minus, text: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' }
    : null;

  if (!HAS_MARKET_KEY) {
    return (
      <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-5 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Fonte de cotações não configurada.</p>
          <p className="text-amber-700 mt-1">Defina <code className="bg-amber-100 px-1 rounded">VITE_TWELVEDATA_KEY</code> no ambiente do front para ativar o painel de tendência.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-100 p-4 shadow-sm">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-slate-500">Ativo</label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none text-sm bg-white"
            >
              {ASSETS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          <button
            onClick={() => setShowSettings((v) => !v)}
            className="px-3 py-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Settings2 size={16} /> Parâmetros
          </button>

          {isOpen ? (
            <button
              onClick={() => runAnalysis(true)}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Atualizar
            </button>
          ) : (
            <button
              onClick={handleOpen}
              disabled={opening || !canAfford}
              className="px-4 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {opening ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              Abrir ({cost} Coins)
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
          <Coins size={13} className="text-amber-500" />
          Saldo: <span className="font-semibold text-slate-700">{balance.toLocaleString('pt-BR')}</span>
          <span className="text-slate-300">•</span>
          {isOpen
            ? <span className="text-emerald-600 font-medium">Ativo aberto hoje — atualização livre</span>
            : <>Abrir custa <span className="font-semibold text-slate-700">{cost}</span> Coins (1×/ativo/dia)</>}
        </p>
        {!canAfford && !isOpen && (
          <p className="text-xs text-amber-600 mt-1">Faltam {(cost - balance).toLocaleString('pt-BR')} Coins. Ganhe na Trilha Gain.</p>
        )}
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}

        {/* Parâmetros ajustáveis */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">Período da média móvel: <span className="text-slate-700">{maPeriod}</span></label>
              <input
                type="range" min={MA_MIN} max={MA_MAX} value={maPeriod}
                onChange={(e) => setMaPeriod(Number(e.target.value))}
                className="w-full accent-green-600 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Timeframes (até 5, curto → longo)</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {AVAILABLE_TIMEFRAMES.map((tf) => {
                  const active = timeframes.some((t) => t.td === tf.td);
                  return (
                    <button
                      key={tf.td}
                      onClick={() => toggleTF(tf)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${active ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
          <div className="flex items-center justify-center py-16 text-slate-300"><Loader2 className="animate-spin" size={32} /></div>
        ) : analysis ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-100 p-5 shadow-sm space-y-4">
            {/* Gauges */}
            <div className="flex flex-wrap justify-center gap-2">
              {analysis.perByTF.map((r) => <TFGauge key={r.label} result={r} />)}
            </div>

            {/* Parecer */}
            {biasMeta && (
              <div className={`rounded-xl ring-1 ${biasMeta.bg} p-4`}>
                <div className="flex items-start gap-2">
                  <biasMeta.Icon size={20} className={`${biasMeta.text} mt-0.5 shrink-0`} />
                  <div>
                    <p className={`text-sm font-semibold ${biasMeta.text}`}>{analysis.line1}</p>
                    {analysis.line2 && <p className="text-sm text-slate-600 mt-0.5">{analysis.line2}</p>}
                  </div>
                </div>
              </div>
            )}

            {lastUpdate && (
              <p className="text-[11px] text-slate-400 text-right">
                Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • auto a cada 90s
              </p>
            )}
          </div>
        ) : null
      )}
    </div>
  );
};
