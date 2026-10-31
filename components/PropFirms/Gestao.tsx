import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, X, Layers, Wallet, TrendingUp, PiggyBank, ArrowDownToLine } from 'lucide-react';
import { Button, Card, CardHeader, Label, Input, Select, Stat, Badge } from '../ui';
import { cn } from '../../lib/cn';
import { PropFirm, SimAccount, SimParams, simulate, formatMoney, formatSize } from '../../lib/propFirms';
import { SimChart } from './SimChart';

interface Props {
  firms: PropFirm[];
}

interface Saved {
  accounts: SimAccount[];
  params: SimParams;
}

const STORAGE_KEY = 'traderafk:gestao:v1';
const MAX_TILES = 60; // acima disso o grid resume em "+N contas"

// Exemplo inicial: 5 contas de $10 cada fazendo $1/dia.
const DEFAULT: Saved = {
  accounts: Array.from({ length: 5 }, (_, i) => ({ id: `init-${i}`, size: 10000, cost: 10, day: 0 })),
  params: { profitPerAccount: 1, splitPct: 100, reinvestPct: 100, nextSize: 10000, nextCost: 10, maxAccounts: 50, days: 30 },
};

const loadSaved = (): Saved => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Saved;
      if (Array.isArray(s.accounts) && s.params) return { accounts: s.accounts, params: { ...DEFAULT.params, ...s.params } };
    }
  } catch { /* storage indisponível: usa o exemplo */ }
  return DEFAULT;
};

const usd = (v: number) => formatMoney(v, 'USD', v !== 0 && Math.abs(v) < 100 ? 2 : 0);

export const Gestao: React.FC<Props> = ({ firms }) => {
  const [{ accounts, params }, setState] = useState<Saved>(loadSaved);
  const [qty, setQty] = useState('1');
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ accounts, params })); } catch { /* ignora */ }
  }, [accounts, params]);

  const sim = useMemo(() => simulate(accounts, params), [accounts, params]);
  const today = sim.timeline[Math.min(day, sim.timeline.length - 1)];

  // Reprodução automática: avança 1 dia por tique até o fim.
  useEffect(() => {
    if (!playing) return;
    if (day >= params.days) { setPlaying(false); return; }
    const t = window.setTimeout(() => setDay((d) => d + 1), 450);
    return () => window.clearTimeout(t);
  }, [playing, day, params.days]);

  useEffect(() => { if (day > params.days) setDay(params.days); }, [day, params.days]);

  const setParam = <K extends keyof SimParams>(k: K, v: SimParams[K]) =>
    setState((s) => ({ ...s, params: { ...s.params, [k]: v } }));

  const addAccounts = () => {
    const n = Math.min(100, Math.max(1, Math.floor(Number(qty) || 1)));
    setState((s) => ({
      ...s,
      accounts: [
        ...s.accounts,
        ...Array.from({ length: n }, () => ({ id: `init-${crypto.randomUUID()}`, size: s.params.nextSize, cost: s.params.nextCost, day: 0 })),
      ],
    }));
  };

  const removeAccount = (id: string) =>
    setState((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));

  // Planos das mesas cadastradas como atalho para tamanho/valor.
  const planOptions = firms.flatMap((f) =>
    f.plans.filter((p) => p.currency === 'USD').map((p) => ({ key: `${f.id}:${p.size}`, label: `${f.name} · ${formatSize(p.size)} · ${formatMoney(p.price)}`, ...p })),
  );

  const active = sim.accounts.filter((a) => a.day <= day);
  const progress = params.nextCost > 0 ? Math.min(1, today.fund / params.nextCost) : 0;
  const atCap = active.length >= Math.max(accounts.length, params.maxAccounts);
  const daysToNext = (() => {
    const perDay = active.length * params.profitPerAccount * (params.splitPct / 100) * (params.reinvestPct / 100);
    if (atCap || perDay <= 0) return null;
    return Math.ceil((params.nextCost - today.fund) / perDay);
  })();
  const net = today.totalProfit - today.invested; // resultado já descontando o que foi pago em contas

  const numInput = (k: keyof SimParams, label: string, opts: { min?: number; max?: number; step?: number; hint?: string; prefix?: string } = {}) => (
    <div>
      <Label htmlFor={`g-${k}`} hint={opts.hint}>{label}</Label>
      <div className="relative">
        {opts.prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">{opts.prefix}</span>}
        <Input
          id={`g-${k}`}
          type="number"
          inputMode="decimal"
          min={opts.min ?? 0}
          max={opts.max}
          step={opts.step ?? 1}
          value={params[k]}
          onChange={(e) => {
            const v = Number(e.target.value);
            setParam(k, (Number.isFinite(v) ? Math.max(opts.min ?? 0, opts.max != null ? Math.min(opts.max, v) : v) : 0) as never);
          }}
          className={cn('tabular-nums', opts.prefix && 'pl-7')}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
        {/* Configuração */}
        <Card className="space-y-5 self-start">
          <CardHeader className="mb-0" eyebrow="Monte sua estratégia" title="Contas e operação" />

          {planOptions.length > 0 && (
            <div>
              <Label htmlFor="g-plan">Plano de uma mesa</Label>
              <Select
                id="g-plan"
                defaultValue=""
                onChange={(e) => {
                  const p = planOptions.find((o) => o.key === e.target.value);
                  if (p) setState((s) => ({ ...s, params: { ...s.params, nextSize: p.size, nextCost: p.price } }));
                }}
              >
                <option value="">Personalizado</option>
                {planOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {numInput('nextSize', 'Tamanho da conta', { step: 1000, prefix: '$' })}
            {numInput('nextCost', 'Valor pago', { step: 1, prefix: '$' })}
          </div>

          <div className="flex items-end gap-2">
            <div className="w-20">
              <Label htmlFor="g-qty">Qtd.</Label>
              <Input id="g-qty" type="number" min={1} max={100} value={qty} onChange={(e) => setQty(e.target.value)} className="tabular-nums" />
            </div>
            <Button className="flex-1" onClick={addAccounts}><Plus size={16} /> Adicionar conta</Button>
          </div>
          <p className="-mt-3 text-xs text-fg-subtle">As contas compradas com o lucro usam o tamanho e o valor acima.</p>

          <div className="hairline-neutral" aria-hidden />

          <div className="grid grid-cols-2 gap-3">
            {numInput('profitPerAccount', 'Resultado/conta/dia', { step: 0.5, prefix: '$' })}
            {numInput('splitPct', 'Seu split', { max: 100, hint: '%' })}
            {numInput('reinvestPct', 'Reinvestir', { max: 100, hint: '%' })}
            {numInput('maxAccounts', 'Limite de contas', { min: 1, max: 500 })}
          </div>
          {numInput('days', 'Dias de simulação', { min: 1, max: 365 })}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setState(DEFAULT); setDay(0); setPlaying(false); }}
            className="w-full"
          >
            <RotateCcw size={14} /> Voltar ao exemplo
          </Button>
        </Card>

        {/* Multiterminal */}
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Contas ativas" value={active.length} icon={Layers} hint={`${accounts.length} iniciais`} />
            <Stat label="Resultado do dia" value={usd(today.dayProfit)} icon={TrendingUp} />
            <Stat label="Lucro acumulado" value={usd(today.totalProfit)} icon={Wallet}
              delta={{ value: `${net >= 0 ? '+' : ''}${usd(net)} líquido`, tone: net > 0 ? 'up' : net < 0 ? 'down' : 'flat' }} />
            <Stat label="Disponível p/ saque" value={usd(today.withdrawn)} icon={ArrowDownToLine} hint={`investido ${usd(today.invested)}`} />
          </div>

          <Card className="space-y-5">
            {/* Controles do tempo */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <Button size="icon" variant="secondary" aria-label="Dia anterior" onClick={() => { setPlaying(false); setDay((d) => Math.max(0, d - 1)); }} disabled={day === 0}>
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  size="icon"
                  aria-label={playing ? 'Pausar' : 'Reproduzir'}
                  onClick={() => { if (day >= params.days) setDay(0); setPlaying((p) => !p); }}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </Button>
                <Button size="icon" variant="secondary" aria-label="Próximo dia" onClick={() => { setPlaying(false); setDay((d) => Math.min(params.days, d + 1)); }} disabled={day >= params.days}>
                  <ChevronRight size={16} />
                </Button>
              </div>
              <div className="flex min-w-48 flex-1 items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={params.days}
                  value={day}
                  onChange={(e) => { setPlaying(false); setDay(Number(e.target.value)); }}
                  aria-label="Dia da simulação"
                  className="h-1.5 flex-1 cursor-pointer accent-brand-green"
                />
                <span className="w-20 text-right font-display text-sm font-semibold tabular-nums text-fg">Dia {day}/{params.days}</span>
              </div>
            </div>

            {/* Loading da próxima conta */}
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-fg">
                  <PiggyBank size={16} className="text-accent-fg" aria-hidden />
                  {atCap ? 'Limite de contas atingido' : `Próxima conta · ${formatSize(params.nextSize)}`}
                </p>
                <p className="text-sm tabular-nums text-fg-muted">
                  {atCap ? 'lucro vai para saque' : <><span className="font-semibold text-fg">{usd(today.fund)}</span> de {usd(params.nextCost)}</>}
                </p>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-tint/8"
                role="progressbar"
                aria-label="Progresso para a próxima conta"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((atCap ? 1 : progress) * 100)}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-green-deep via-brand-green to-brand-green-bright transition-[width] duration-300"
                  style={{ width: `${(atCap ? 1 : progress) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-fg-subtle">
                {atCap
                  ? `Você chegou a ${active.length} contas.`
                  : `${Math.round(progress * 100)}% carregado${daysToNext != null ? ` · faltam ~${daysToNext} ${daysToNext === 1 ? 'dia' : 'dias'}` : ''}`}
                {today.bought > 0 && <span className="ml-2 font-medium text-accent-fg">+{today.bought} {today.bought === 1 ? 'conta comprada' : 'contas compradas'} hoje</span>}
              </p>
            </div>

            {/* Contas (multiterminal) */}
            <div>
              <p className="eyebrow-muted mb-3">Copy em {active.length} {active.length === 1 ? 'conta' : 'contas'}</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
                {active.slice(0, MAX_TILES).map((a, i) => {
                  const isNew = a.day > 0 && a.day === day;
                  const isInitial = a.day === 0;
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        'group relative rounded-xl border p-2.5 transition-colors',
                        isNew ? 'animate-fade-in border-accent/50 bg-accent/10' : 'border-tint/10 bg-tint/3',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] tabular-nums text-fg-subtle">#{i + 1}</span>
                        {isInitial ? (
                          <button
                            type="button"
                            onClick={() => removeAccount(a.id)}
                            aria-label={`Remover conta ${i + 1}`}
                            className="rounded p-0.5 text-fg-subtle opacity-0 transition-opacity hover:text-danger-fg focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <X size={12} />
                          </button>
                        ) : (
                          <Badge tone="accent" className="px-1.5 py-0 text-[10px]">D{a.day}</Badge>
                        )}
                      </div>
                      <p className="mt-1 font-display text-base font-semibold tabular-nums text-fg">${formatSize(a.size)}</p>
                      <p className="text-xs tabular-nums text-success-fg">
                        {day > a.day ? `+${usd(params.profitPerAccount * (params.splitPct / 100))}` : 'entrando'}
                      </p>
                    </div>
                  );
                })}
                {active.length > MAX_TILES && (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-tint/15 p-2.5 text-sm text-fg-muted">
                    +{active.length - MAX_TILES} contas
                  </div>
                )}
                <button
                  type="button"
                  onClick={addAccounts}
                  className="flex min-h-[86px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-tint/15 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-accent-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Plus size={18} /> Nova conta
                </button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <SimChart
              title="Contas ativas"
              kind="bar"
              values={sim.timeline.map((t) => t.accounts)}
              format={(v) => String(Math.round(v))}
              current={day}
              onSelectDay={(d) => { setPlaying(false); setDay(d); }}
            />
            <SimChart
              title="Lucro acumulado (USD)"
              kind="area"
              values={sim.timeline.map((t) => t.totalProfit)}
              format={(v) => usd(v)}
              current={day}
              onSelectDay={(d) => { setPlaying(false); setDay(d); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
