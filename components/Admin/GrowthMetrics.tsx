import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Activity, RefreshCw, Download, Table2, BarChart3, CalendarRange } from 'lucide-react';
import { Button, Card, CardHeader, Stat, Skeleton, EmptyState, Tabs, Input, Label, Table, THead, TBody, TR, TH, TD } from '../ui';
import { cn } from '../../lib/cn';
import { SeriesChart } from '../charts/SeriesChart';
import {
  GrowthBucket, GrowthMetrics as Metrics, ROLE_LABELS,
  fetchGrowthMetrics, isoDate, bucketLabel, toCsv,
} from '../../lib/growthMetrics';

type Preset = '7d' | '30d' | '90d' | '12m' | 'custom';

const PRESETS: { key: Preset; label: string; days?: number; bucket?: GrowthBucket }[] = [
  { key: '7d', label: '7 dias', days: 7, bucket: 'day' },
  { key: '30d', label: '30 dias', days: 30, bucket: 'day' },
  { key: '90d', label: '90 dias', days: 90, bucket: 'week' },
  { key: '12m', label: '12 meses', days: 365, bucket: 'month' },
  { key: 'custom', label: 'Personalizado' },
];

const BUCKET_NAMES: Record<GrowthBucket, string> = { day: 'dia', week: 'semana', month: 'mês' };

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return isoDate(d);
};

const int = (v: number) => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const pctOf = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');

export const GrowthMetrics: React.FC = () => {
  const [preset, setPreset] = useState<Preset>('30d');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(isoDate(new Date()));
  const [bucket, setBucket] = useState<GrowthBucket>('day');
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(async () => {
    if (!from || !to || from > to) { setError('Escolha um intervalo de datas válido.'); return; }
    setLoading(true);
    setError(null);
    try {
      setData(await fetchGrowthMetrics(from, to, bucket));
    } catch (e) {
      console.error('[GrowthMetrics]', e);
      const msg = (e as { message?: string })?.message ?? '';
      setError(msg.includes('range_too_large') ? 'Intervalo máximo de 3 anos.' : 'Não foi possível carregar as métricas.');
    } finally {
      setLoading(false);
    }
  }, [from, to, bucket]);

  useEffect(() => { load(); }, [load]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    const def = PRESETS.find((x) => x.key === p);
    if (def?.days) {
      setFrom(daysAgo(def.days));
      setTo(isoDate(new Date()));
      if (def.bucket) setBucket(def.bucket);
    }
  };

  const labels = useMemo(() => data?.series.map((p) => bucketLabel(p.bucket, bucket)) ?? [], [data, bucket]);
  const t = data?.totals;
  const change = t && t.new_prev_range > 0 ? ((t.new_in_range - t.new_prev_range) / t.new_prev_range) * 100 : null;
  const avgPerBucket = data && data.series.length ? t!.new_in_range / data.series.length : 0;
  const peak = data?.series.reduce((best, p) => (p.signups > (best?.signups ?? -1) ? p : best), data.series[0]);
  const roleTotal = data?.roles.reduce((s, r) => s + r.count, 0) ?? 0;

  const exportCsv = () => {
    if (!data) return;
    const blob = new Blob([toCsv(data.series, bucket)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crescimento_${from}_${to}_${bucket}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filtros: uma linha acima dos gráficos */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <Tabs<Preset> aria-label="Período" value={preset} onChange={choosePreset} items={PRESETS.map(({ key, label }) => ({ key, label }))} />
          {preset === 'custom' && (
            <div className="flex items-end gap-2">
              <div>
                <Label htmlFor="growth-from" className="mb-1 text-xs">De</Label>
                <Input id="growth-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="py-1.5" />
              </div>
              <div>
                <Label htmlFor="growth-to" className="mb-1 text-xs">Até</Label>
                <Input id="growth-to" type="date" value={to} min={from} max={isoDate(new Date())} onChange={(e) => setTo(e.target.value)} className="py-1.5" />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs<GrowthBucket>
            aria-label="Agrupar por"
            value={bucket}
            onChange={setBucket}
            items={[{ key: 'day', label: 'Dia' }, { key: 'week', label: 'Semana' }, { key: 'month', label: 'Mês' }]}
          />
          <Button size="icon" variant="secondary" onClick={load} aria-label="Atualizar" title="Atualizar">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {error ? (
        <EmptyState icon={BarChart3} title={error} action={<Button variant="secondary" onClick={load}>Tentar novamente</Button>} />
      ) : !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total de usuários" value={int(t!.total_users)} icon={Users} hint={`+${int(t!.new_today)} hoje`} />
            <Stat
              label="Novos no período"
              value={int(t!.new_in_range)}
              icon={UserPlus}
              delta={change == null
                ? { value: 'sem base anterior', tone: 'flat' }
                : { value: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`, tone: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' }}
              hint={change != null ? `vs. ${int(t!.new_prev_range)} no período anterior` : undefined}
            />
            <Stat label="Ativos 7 dias" value={int(t!.active_7d)} icon={Activity} hint={`${pctOf(t!.active_7d, t!.total_users)} da base`} />
            <Stat label="Ativos 30 dias" value={int(t!.active_30d)} icon={CalendarRange} hint={`${int(t!.never_signed_in)} nunca entraram`} />
          </div>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <SeriesChart
              title={`Novos usuários por ${BUCKET_NAMES[bucket]}`}
              kind="bar"
              values={data.series.map((p) => p.signups)}
              labels={labels}
              format={int}
              summary={`média ${avgPerBucket.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/${BUCKET_NAMES[bucket]}`}
            />
            <SeriesChart
              title="Total acumulado de usuários"
              kind="area"
              values={data.series.map((p) => p.cumulative)}
              labels={labels}
              format={int}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
            <Card>
              <CardHeader eyebrow="Base atual" title="Usuários por perfil" />
              <ul className="space-y-3">
                {data.roles.map((r) => (
                  <li key={r.role}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="text-fg">{ROLE_LABELS[r.role] ?? r.role}</span>
                      <span className="tabular-nums text-fg-muted">{int(r.count)} · {pctOf(r.count, roleTotal)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-tint/6">
                      <div className="h-full rounded-full bg-brand-green" style={{ width: `${roleTotal ? (r.count / roleTotal) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader eyebrow="Destaques do período" title="Resumo" />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Melhor ' + BUCKET_NAMES[bucket], peak && peak.signups > 0 ? `${bucketLabel(peak.bucket, bucket)} · ${int(peak.signups)}` : '—'],
                  ['Média por ' + BUCKET_NAMES[bucket], avgPerBucket.toLocaleString('pt-BR', { maximumFractionDigits: 1 })],
                  ['Crescimento da base', t!.total_users - t!.new_in_range > 0
                    ? `+${((t!.new_in_range / (t!.total_users - t!.new_in_range)) * 100).toFixed(1)}%`
                    : '—'],
                  ['Engajamento 30d', pctOf(t!.active_30d, t!.total_users)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-tint/3 p-3">
                    <dt className="eyebrow-muted text-[10px]">{k}</dt>
                    <dd className="mt-1 font-display text-lg font-semibold tabular-nums text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-fg-subtle">
                "Ativos" considera o último login. "Crescimento da base" compara os novos do período com a base existente antes dele.
              </p>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
                <Table2 size={14} /> {showTable ? 'Ocultar tabela' : 'Ver tabela'}
              </Button>
              <Button size="sm" variant="ghost" onClick={exportCsv}><Download size={14} /> Exportar CSV</Button>
            </div>
            {showTable && (
              <Table wrapperClassName="max-h-96 overflow-y-auto">
                <THead>
                  <TR>
                    <TH>Período</TH>
                    <TH align="right">Novos usuários</TH>
                    <TH align="right">Total acumulado</TH>
                  </TR>
                </THead>
                <TBody>
                  {[...data.series].reverse().map((p) => (
                    <TR key={p.bucket}>
                      <TD>{bucketLabel(p.bucket, bucket)}</TD>
                      <TD align="right" numeric>{int(p.signups)}</TD>
                      <TD align="right" numeric>{int(p.cumulative)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
