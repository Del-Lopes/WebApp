import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Target, Activity, Award, Percent } from 'lucide-react';
import { loadMt5Trades, type Mt5Report, type Mt5Trade } from '../../hooks/useMt5Reports';
import { BackButton } from '../BackButton';
import { PageHeader, Skeleton } from '../ui';

interface Props {
  report: Mt5Report;
  onBack: () => void;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatMoney(value: number | null, currency: string | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const symbol = currency === 'USD' ? '$' : currency === 'BRL' ? 'R$' : currency ? `${currency} ` : '';
  return `${value < 0 ? '-' : ''}${symbol}${Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'positive' | 'negative';
}

function MetricCard({ icon, label, value, hint, tone = 'default' }: MetricCardProps) {
  const valueClass =
    tone === 'positive' ? 'text-success-fg' : tone === 'negative' ? 'text-danger-fg' : 'text-fg';
  return (
    <div className="glass-card rounded-xl p-4 min-w-0">
      <div className="eyebrow-muted flex items-center gap-2 mb-2 min-w-0">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`font-display text-xl sm:text-2xl font-semibold tabular-nums whitespace-nowrap truncate ${valueClass}`}>{value}</div>
      {hint && <div className="text-xs text-fg-muted mt-1 tabular-nums">{hint}</div>}
    </div>
  );
}

// ─── Gráfico de evolução do balance (linha) ─────────────────────────────────

function BalanceChart({ trades }: { trades: Mt5Trade[] }) {
  // min/max com reduce: Math.min(...array) estoura a pilha com milhares de deals.
  const { points, minY, maxY } = useMemo(() => {
    const sorted = [...trades]
      .filter((t) => t.close_time)
      .sort((a, b) => new Date(a.close_time!).getTime() - new Date(b.close_time!).getTime());
    let acc = 0;
    const pts = sorted.map((t, i) => {
      acc += (t.profit ?? 0) + (t.commission ?? 0) + (t.swap ?? 0);
      return { x: i, y: acc, time: t.close_time! };
    });
    return {
      points: pts,
      minY: pts.reduce((m, p) => (p.y < m ? p.y : m), 0),
      maxY: pts.reduce((m, p) => (p.y > m ? p.y : m), 0),
    };
  }, [trades]);

  if (points.length < 2) {
    return (
      <div className="glass-card rounded-xl p-6 text-center text-sm text-fg-muted">
        Sem dados suficientes para o gráfico de evolução.
      </div>
    );
  }

  const width = 800;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const rangeY = maxY - minY || 1;
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const rangeX = maxX - minX || 1;

  const sx = (x: number) => padding.left + ((x - minX) / rangeX) * innerW;
  const sy = (y: number) => padding.top + innerH - ((y - minY) / rangeY) * innerH;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
  const areaD = `${pathD} L ${sx(maxX)} ${sy(0)} L ${sx(minX)} ${sy(0)} Z`;
  const zeroY = sy(0);

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="font-display font-semibold text-fg mb-3">Evolução do resultado</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Eixo Y zero */}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="var(--ds-line-strong)"
          strokeDasharray="2 4"
        />
        {/* Labels eixo Y */}
        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" fontSize="10" fill="var(--ds-fg-muted)">
          {maxY.toFixed(2)}
        </text>
        <text x={padding.left - 8} y={zeroY + 4} textAnchor="end" fontSize="10" fill="var(--ds-fg-muted)">
          0
        </text>
        <text x={padding.left - 8} y={padding.top + innerH + 4} textAnchor="end" fontSize="10" fill="var(--ds-fg-muted)">
          {minY.toFixed(2)}
        </text>
        {/* Área */}
        <path d={areaD} fill="var(--ds-accent)" fillOpacity={0.12} />
        {/* Linha */}
        <path d={pathD} fill="none" stroke="var(--ds-accent)" strokeWidth="2" />
        {/* Labels eixo X */}
        <text x={padding.left} y={height - 8} fontSize="10" fill="var(--ds-fg-muted)">
          {new Date(points[0].time).toLocaleDateString('pt-BR')}
        </text>
        <text x={width - padding.right} y={height - 8} textAnchor="end" fontSize="10" fill="var(--ds-fg-muted)">
          {new Date(points[points.length - 1].time).toLocaleDateString('pt-BR')}
        </text>
      </svg>
    </div>
  );
}

// ─── Gráfico de lucro por par (barras horizontais) ──────────────────────────

function ProfitBySymbolChart({ trades }: { trades: Mt5Trade[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { profit: number; count: number }>();
    for (const t of trades) {
      const key = t.symbol;
      const v = map.get(key) ?? { profit: 0, count: 0 };
      v.profit += (t.profit ?? 0) + (t.commission ?? 0) + (t.swap ?? 0);
      v.count += 1;
      map.set(key, v);
    }
    return Array.from(map.entries())
      .map(([symbol, v]) => ({ symbol, ...v }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 12);
  }, [trades]);

  if (data.length === 0) {
    return null;
  }

  const maxAbs = data.reduce((m, d) => Math.max(m, Math.abs(d.profit)), 0) || 1;

  return (
    <div className="glass-card rounded-xl p-4 min-w-0">
      <h3 className="font-display font-semibold text-fg mb-3">Resultado por par</h3>
      <div className="space-y-2">
        {data.map((d) => {
          const widthPct = (Math.abs(d.profit) / maxAbs) * 100;
          const positive = d.profit >= 0;
          return (
            <div key={d.symbol} className="flex items-center gap-3 text-sm">
              <div className="w-16 sm:w-20 shrink-0 font-mono font-medium text-fg truncate">{d.symbol}</div>
              <div className="flex-1 min-w-0 relative bg-tint/5 rounded-md h-6 overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full rounded-md ${positive ? 'bg-success' : 'bg-danger'}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className={`w-20 sm:w-24 shrink-0 text-right font-mono tabular-nums whitespace-nowrap font-semibold ${positive ? 'text-success-fg' : 'text-danger-fg'}`}>
                {d.profit >= 0 ? '+' : ''}
                {d.profit.toFixed(2)}
              </div>
              <div className="w-10 sm:w-12 shrink-0 text-right text-xs font-mono tabular-nums text-fg-muted">{d.count}x</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Gráfico de lucro por dia da semana ─────────────────────────────────────

function ProfitByWeekdayChart({ trades }: { trades: Mt5Trade[] }) {
  const data = useMemo(() => {
    const sums = [0, 0, 0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const t of trades) {
      const when = t.close_time ?? t.open_time;
      if (!when) continue;
      const day = new Date(when).getDay();
      sums[day] += (t.profit ?? 0) + (t.commission ?? 0) + (t.swap ?? 0);
      counts[day] += 1;
    }
    return WEEKDAY_LABELS.map((label, i) => ({ label, profit: sums[i], count: counts[i] }));
  }, [trades]);

  const maxAbs = data.reduce((m, d) => Math.max(m, Math.abs(d.profit)), 0) || 1;

  return (
    <div className="glass-card rounded-xl p-4 min-w-0">
      <h3 className="font-display font-semibold text-fg mb-3">Resultado por dia da semana</h3>
      <div className="flex items-end justify-between gap-1 sm:gap-2 h-40">
        {data.map((d) => {
          const heightPct = (Math.abs(d.profit) / maxAbs) * 100;
          const positive = d.profit >= 0;
          return (
            <div key={d.label} className="flex-1 min-w-0 flex flex-col items-center gap-1">
              <div className={`text-[10px] sm:text-xs font-mono font-semibold tabular-nums whitespace-nowrap ${positive ? 'text-success-fg' : 'text-danger-fg'}`}>
                {d.count > 0 ? (d.profit >= 0 ? '+' : '') + d.profit.toFixed(0) : ''}
              </div>
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t-md ${positive ? 'bg-success' : 'bg-danger'}`}
                  style={{ height: `${heightPct}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                />
              </div>
              <div className="text-xs text-fg-muted font-medium">{d.label}</div>
              <div className="text-[10px] font-mono tabular-nums text-fg-subtle">{d.count}x</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export function ReportView({ report, onBack }: Props) {
  const [trades, setTrades] = useState<Mt5Trade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingTrades(true);
    loadMt5Trades(report.id).then((data) => {
      if (!cancelled) {
        setTrades(data);
        setLoadingTrades(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [report.id]);

  const netProfitTone = report.net_profit !== null && report.net_profit >= 0 ? 'positive' : 'negative';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        title={<span className="block truncate">{report.account_name ?? report.file_name}</span>}
        description={
          <>
            {report.account_number && <>Conta {report.account_number} · </>}
            {report.broker && <>{report.broker} · </>}
            {report.currency}
            {report.account_type && <> · {report.account_type === 'real' ? 'Real' : 'Demo'}</>}
          </>
        }
      />

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<TrendingUp size={14} />}
          label="Lucro líquido"
          value={formatMoney(report.net_profit, report.currency)}
          tone={netProfitTone}
        />
        <MetricCard
          icon={<Target size={14} />}
          label="Fator de lucro"
          value={formatNumber(report.profit_factor, 2)}
          hint={report.expected_payoff !== null ? `Payoff: ${formatNumber(report.expected_payoff, 2)}` : undefined}
        />
        <MetricCard
          icon={<Percent size={14} />}
          label="Acertos"
          value={formatPercent(report.profit_trades_percent)}
          hint={
            report.profit_trades !== null && report.loss_trades !== null
              ? `${report.profit_trades} ganhos / ${report.loss_trades} perdas`
              : undefined
          }
        />
        <MetricCard
          icon={<Activity size={14} />}
          label="Total de trades"
          value={report.total_trades !== null ? report.total_trades.toLocaleString('pt-BR') : '—'}
          hint={
            report.long_trades !== null && report.short_trades !== null
              ? `${report.long_trades} compras / ${report.short_trades} vendas`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<TrendingDown size={14} />}
          label="Drawdown máx."
          value={formatMoney(report.max_drawdown, report.currency)}
          hint={report.max_drawdown_percent !== null ? formatPercent(report.max_drawdown_percent) : undefined}
          tone="negative"
        />
        <MetricCard
          icon={<Award size={14} />}
          label="Lucro bruto"
          value={formatMoney(report.gross_profit, report.currency)}
          tone="positive"
        />
        <MetricCard
          icon={<TrendingDown size={14} />}
          label="Perda bruta"
          value={formatMoney(report.gross_loss, report.currency)}
          tone="negative"
        />
        <MetricCard
          icon={<Target size={14} />}
          label="Fator de recuperação"
          value={formatNumber(report.recovery_factor, 2)}
          hint={report.sharpe_ratio !== null ? `Sharpe: ${formatNumber(report.sharpe_ratio, 2)}` : undefined}
        />
      </div>

      {/* Gráficos */}
      {loadingTrades ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      ) : trades.length === 0 ? (
        <div className="glass-card rounded-xl p-6 text-center text-sm text-fg-muted">
          Este relatório não tem trades detalhados para gerar gráficos.
        </div>
      ) : (
        <>
          <BalanceChart trades={trades} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProfitBySymbolChart trades={trades} />
            <ProfitByWeekdayChart trades={trades} />
          </div>
        </>
      )}

      {/* Detalhes adicionais */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="font-display font-semibold text-fg mb-3">Detalhes adicionais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex justify-between gap-3 border-b border-tint/6 py-1">
            <span className="text-fg-muted">Maior lucro</span>
            <span className="font-mono tabular-nums whitespace-nowrap font-medium text-success-fg">{formatMoney(report.largest_profit, report.currency)}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-tint/6 py-1">
            <span className="text-fg-muted">Maior perda</span>
            <span className="font-mono tabular-nums whitespace-nowrap font-medium text-danger-fg">{formatMoney(report.largest_loss, report.currency)}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-tint/6 py-1">
            <span className="text-fg-muted">Média de lucro</span>
            <span className="font-mono tabular-nums whitespace-nowrap font-medium text-fg">{formatMoney(report.average_profit, report.currency)}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-tint/6 py-1">
            <span className="text-fg-muted">Média de perda</span>
            <span className="font-mono tabular-nums whitespace-nowrap font-medium text-fg">{formatMoney(report.average_loss, report.currency)}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-tint/6 py-1">
            <span className="text-fg-muted">Acertos em compras</span>
            <span className="font-mono tabular-nums whitespace-nowrap font-medium text-fg">{formatPercent(report.long_trades_won_percent)}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-tint/6 py-1">
            <span className="text-fg-muted">Acertos em vendas</span>
            <span className="font-mono tabular-nums whitespace-nowrap font-medium text-fg">{formatPercent(report.short_trades_won_percent)}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-tint/6 py-1">
            <span className="text-fg-muted">Drawdown absoluto</span>
            <span className="font-mono tabular-nums whitespace-nowrap font-medium text-fg">{formatMoney(report.absolute_drawdown, report.currency)}</span>
          </div>
          <div className="flex justify-between gap-3 border-b border-tint/6 py-1">
            <span className="text-fg-muted">Drawdown relativo</span>
            <span className="font-mono tabular-nums whitespace-nowrap font-medium text-fg">{formatPercent(report.relative_drawdown_percent)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
