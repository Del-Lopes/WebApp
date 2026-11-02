import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Layers, Wallet, TrendingUp, ArrowDownToLine, Trash2, Loader2, Target, Power, X } from 'lucide-react';
import { Button, Card, CardHeader, Label, Input, Select, Stat, Badge, Modal, FieldMessage, Skeleton } from '../ui';
import { cn } from '../../lib/cn';
import { PropFirm, simulate, formatMoney, formatSize, SimAccount, SimParams } from '../../lib/propFirms';
import { SeriesChart } from '../charts/SeriesChart';
import { PLAN_STORAGE_KEY } from './Projecao';
import {
  TrackAccount, TrackerData, accountIsActive, addAccounts, addWithdrawal, buildTimeline, daysBetween,
  deleteAccount, deleteResults, deleteWithdrawal, fetchTracker, shortDate, todayISO, updateAccount, upsertResults,
} from '../../lib/propTracker';

interface Props { firms: PropFirm[] }

const usd = (v: number) => formatMoney(v, 'USD', v !== 0 && Math.abs(v) < 100 ? 2 : 0);
const parse = (s: string) => Number(String(s).replace(',', '.'));
const MAX_TILES = 60;

// Plano salvo na aba Projeção (mesmo navegador) — serve de régua para o realizado.
function loadPlan(): { accounts: SimAccount[]; params: SimParams } | null {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return Array.isArray(s.accounts) && s.params ? s : null;
  } catch { return null; }
}

export const Gestao: React.FC<Props> = ({ firms }) => {
  const [data, setData] = useState<TrackerData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [openAccount, setOpenAccount] = useState<string | null>(null);

  const today = todayISO();
  const plan = useMemo(loadPlan, []);

  // Formulários
  const [acc, setAcc] = useState({ size: '10000', cost: '10', split: String(plan?.params.splitPct ?? 100), opened: today, qty: '1' });
  const [res, setRes] = useState({ date: today, amount: '' });
  const [wd, setWd] = useState({ date: today, amount: '', note: '' });

  const load = useCallback(async () => {
    try { setData(await fetchTracker()); setLoadError(false); }
    catch (e) { console.error('[Gestao] load', e); setLoadError(true); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<void>, fail = 'Não foi possível salvar. Tente novamente.') => {
    setBusy(true); setError(null);
    try { await fn(); await load(); }
    catch (e) { console.error('[Gestao]', e); setError(fail); }
    finally { setBusy(false); }
  };

  const tl = useMemo(() => (data ? buildTimeline(data, today) : []), [data, today]);
  const idx = tl.length === 0 ? 0 : Math.min(selIdx ?? tl.length - 1, tl.length - 1);
  const cur = tl[idx];
  const date = cur?.date ?? today;

  const accounts = data?.accounts ?? [];
  const results = data?.results ?? [];
  const withdrawals = data?.withdrawals ?? [];
  const active = accounts.filter((a) => accountIsActive(a, date));

  const net = (cur?.cumNet ?? 0) - (cur?.invested ?? 0);
  const cash = net - (cur?.withdrawn ?? 0);

  // Realizado x planejado (dia N do plano = N dias após a 1ª conta).
  const vsPlan = useMemo(() => {
    if (!plan || !cur || accounts.length === 0) return null;
    const first = accounts[0].opened_on;
    const off = daysBetween(first, cur.date);
    if (off < 0 || off > plan.params.days) return null;
    const planned = simulate(plan.accounts, plan.params).timeline[off];
    return planned ? { planned: planned.totalProfit, planAccounts: planned.accounts, off } : null;
  }, [plan, cur, accounts]);

  const planOptions = firms.flatMap((f) =>
    f.plans.filter((p) => p.currency === 'USD').map((p) => ({ key: `${f.id}:${p.size}`, label: `${f.name} · ${formatSize(p.size)} · ${formatMoney(p.price)}`, ...p })),
  );

  const accSum = (id: string, upTo: string) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return 0;
    return results.filter((r) => r.account_id === id && r.day <= upTo).reduce((s, r) => s + r.amount, 0) * (a.split_pct / 100);
  };

  // ── Ações ──
  const submitAccounts = () => {
    const size = parse(acc.size), cost = parse(acc.cost), split = parse(acc.split);
    const n = Math.min(100, Math.max(1, Math.floor(parse(acc.qty) || 1)));
    if (!(size > 0) || !(cost >= 0) || !(split >= 0 && split <= 100) || !acc.opened) { setError('Confira tamanho, valor pago, split e data.'); return; }
    run(() => addAccounts(n, { size, cost, split_pct: split, opened_on: acc.opened }));
  };

  const dayTargets = accounts.filter((a) => accountIsActive(a, res.date));
  const submitResult = () => {
    const amount = parse(res.amount);
    if (res.amount.trim() === '' || !Number.isFinite(amount)) { setError('Informe o resultado por conta (pode ser negativo).'); return; }
    if (dayTargets.length === 0) { setError('Nenhuma conta ativa nessa data.'); return; }
    run(async () => { await upsertResults(dayTargets.map((a) => ({ account_id: a.id, day: res.date, amount }))); setRes((r) => ({ ...r, amount: '' })); });
  };

  const submitWithdrawal = () => {
    const amount = parse(wd.amount);
    if (!(amount > 0)) { setError('Informe o valor do saque.'); return; }
    run(async () => { await addWithdrawal({ day: wd.date, amount, note: wd.note.trim() }); setWd((w) => ({ ...w, amount: '', note: '' })); });
  };

  // Lançamentos recentes (resultados agrupados por dia + saques).
  const log = useMemo(() => {
    const byDay = new Map<string, { ids: string[]; gross: number; n: number }>();
    for (const r of results) {
      const g = byDay.get(r.day) ?? { ids: [], gross: 0, n: 0 };
      g.ids.push(r.id); g.gross += r.amount; g.n += 1;
      byDay.set(r.day, g);
    }
    const rows: { key: string; day: string; kind: 'res' | 'wd'; ids: string[]; text: string; amount: number }[] = [];
    byDay.forEach((g, day) => rows.push({ key: `r-${day}`, day, kind: 'res', ids: g.ids, text: `Resultado em ${g.n} ${g.n === 1 ? 'conta' : 'contas'} (bruto)`, amount: g.gross }));
    withdrawals.forEach((w) => rows.push({ key: `w-${w.id}`, day: w.day, kind: 'wd', ids: [w.id], text: w.note ? `Saque · ${w.note}` : 'Saque', amount: -w.amount }));
    return rows.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0)).slice(0, 10);
  }, [results, withdrawals]);

  const field = (id: string, label: string, value: string, onChange: (v: string) => void, o: { type?: string; step?: number; prefix?: string; hint?: string; min?: number; max?: number } = {}) => (
    <div>
      <Label htmlFor={id} hint={o.hint}>{label}</Label>
      <div className="relative">
        {o.prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">{o.prefix}</span>}
        <Input id={id} type={o.type ?? 'number'} inputMode={o.type ? undefined : 'decimal'} step={o.step} min={o.min} max={o.max}
          value={value} onChange={(e) => onChange(e.target.value)} className={cn('tabular-nums', o.prefix && 'pl-7')} />
      </div>
    </div>
  );

  if (loadError) {
    return (
      <Card className="space-y-3 text-center">
        <p className="text-sm text-fg">Não foi possível carregar sua gestão.</p>
        <p className="text-xs text-fg-subtle">Se for a primeira vez, confirme que a migration 20261110_prop_tracker.sql foi aplicada.</p>
        <div><Button variant="secondary" onClick={load}>Tentar novamente</Button></div>
      </Card>
    );
  }
  if (!data) return <div className="grid gap-6 xl:grid-cols-[340px_1fr]"><Skeleton className="h-[520px] rounded-2xl" /><Skeleton className="h-[520px] rounded-2xl" /></div>;

  const shown = active.slice(0, MAX_TILES);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_1fr]">
        {/* Lançamentos */}
        <div className="space-y-4 self-start">
          <Card className="space-y-4">
            <CardHeader className="mb-0" eyebrow="Passo 1" title="Nova conta" />
            {planOptions.length > 0 && (
              <div>
                <Label htmlFor="t-plan">Plano de uma mesa</Label>
                <Select id="t-plan" defaultValue="" onChange={(e) => {
                  const p = planOptions.find((o) => o.key === e.target.value);
                  if (p) setAcc((a) => ({ ...a, size: String(p.size), cost: String(p.price) }));
                }}>
                  <option value="">Personalizado</option>
                  {planOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {field('t-size', 'Tamanho', acc.size, (v) => setAcc((a) => ({ ...a, size: v })), { prefix: '$', step: 1000 })}
              {field('t-cost', 'Valor pago', acc.cost, (v) => setAcc((a) => ({ ...a, cost: v })), { prefix: '$' })}
              {field('t-split', 'Seu split', acc.split, (v) => setAcc((a) => ({ ...a, split: v })), { hint: '%', max: 100 })}
              {field('t-qty', 'Qtd.', acc.qty, (v) => setAcc((a) => ({ ...a, qty: v })), { min: 1, max: 100 })}
            </div>
            {field('t-opened', 'Data de abertura', acc.opened, (v) => setAcc((a) => ({ ...a, opened: v })), { type: 'date' })}
            <Button className="w-full" onClick={submitAccounts} disabled={busy}><Plus size={16} /> Adicionar conta</Button>
          </Card>

          <Card className="space-y-4">
            <CardHeader className="mb-0" eyebrow="Passo 2" title="Resultado do dia" />
            <div className="grid grid-cols-2 gap-3">
              {field('t-rdate', 'Data', res.date, (v) => setRes((r) => ({ ...r, date: v })), { type: 'date' })}
              {field('t-ramount', 'Por conta', res.amount, (v) => setRes((r) => ({ ...r, amount: v })), { prefix: '$', step: 0.5 })}
            </div>
            <p className="-mt-2 text-xs text-fg-subtle">
              Valor bruto, aplicado em todas as contas ativas nessa data ({dayTargets.length}). Lançar de novo no mesmo dia substitui. Ajustes por conta: clique na conta.
            </p>
            <Button className="w-full" onClick={submitResult} disabled={busy || dayTargets.length === 0}>
              <TrendingUp size={16} /> Lançar em {dayTargets.length} {dayTargets.length === 1 ? 'conta' : 'contas'}
            </Button>
          </Card>

          <Card className="space-y-4">
            <CardHeader className="mb-0" eyebrow="Passo 3" title="Saque" />
            <div className="grid grid-cols-2 gap-3">
              {field('t-wdate', 'Data', wd.date, (v) => setWd((w) => ({ ...w, date: v })), { type: 'date' })}
              {field('t-wamount', 'Valor', wd.amount, (v) => setWd((w) => ({ ...w, amount: v })), { prefix: '$' })}
            </div>
            {field('t-wnote', 'Observação (opcional)', wd.note, (v) => setWd((w) => ({ ...w, note: v })), { type: 'text' })}
            <Button variant="secondary" className="w-full" onClick={submitWithdrawal} disabled={busy}><ArrowDownToLine size={16} /> Registrar saque</Button>
          </Card>

          {error && <FieldMessage error>{error}</FieldMessage>}
        </div>

        {/* Painel */}
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Contas ativas" value={active.length} icon={Layers} hint={`${accounts.length} no total`} />
            <Stat label="Resultado do dia" value={usd(cur?.dayNet ?? 0)} icon={TrendingUp} hint={cur ? shortDate(cur.date) : undefined} />
            <Stat label="Lucro acumulado" value={usd(cur?.cumNet ?? 0)} icon={Wallet}
              delta={{ value: `${net >= 0 ? '+' : ''}${usd(net)} líquido`, tone: net > 0 ? 'up' : net < 0 ? 'down' : 'flat' }} />
            <Stat label="Sacado" value={usd(cur?.withdrawn ?? 0)} icon={ArrowDownToLine} hint={`em caixa ${usd(cash)} · investido ${usd(cur?.invested ?? 0)}`} />
          </div>

          {vsPlan && cur && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-fg"><Target size={16} className="text-accent-fg" aria-hidden /> Vs. Projeção · dia {vsPlan.off}</span>
              <span className="text-fg-muted">Planejado <strong className="tabular-nums text-fg">{usd(vsPlan.planned)}</strong></span>
              <span className="text-fg-muted">Realizado <strong className="tabular-nums text-fg">{usd(cur.cumNet)}</strong></span>
              <span className={cn('font-semibold tabular-nums', cur.cumNet - vsPlan.planned >= 0 ? 'text-success-fg' : 'text-danger-fg')}>
                {cur.cumNet - vsPlan.planned >= 0 ? '+' : ''}{usd(cur.cumNet - vsPlan.planned)}
              </span>
              <span className="text-xs text-fg-subtle">contas: {active.length} de {vsPlan.planAccounts} planejadas</span>
            </div>
          )}

          <Card className="space-y-4">
            <p className="eyebrow-muted">
              {accounts.length === 0 ? 'Suas contas' : `Copy em ${active.length} ${active.length === 1 ? 'conta' : 'contas'} · ${cur ? shortDate(cur.date) : ''}`}
            </p>
            {accounts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-tint/15 p-6 text-center text-sm text-fg-muted">
                Cadastre sua primeira conta ao lado. Depois lance o resultado de cada dia e acompanhe a trajetória.
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                {shown.map((a, i) => {
                  const total = accSum(a.id, date);
                  return (
                    <button key={a.id} type="button" onClick={() => setOpenAccount(a.id)}
                      aria-label={`Conta ${i + 1}, ${formatSize(a.size)}. Abrir detalhes`}
                      className="rounded-xl border border-tint/10 bg-tint/3 p-2.5 text-left transition-colors hover:border-accent/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] tabular-nums text-fg-subtle">#{i + 1}{a.label ? ` · ${a.label}` : ''}</span>
                        <span className="text-[10px] tabular-nums text-fg-subtle">{shortDate(a.opened_on)}</span>
                      </div>
                      <p className="mt-1 font-display text-base font-semibold tabular-nums text-fg">${formatSize(a.size)}</p>
                      <p className={cn('text-xs tabular-nums', total > 0 ? 'text-success-fg' : total < 0 ? 'text-danger-fg' : 'text-fg-subtle')}>
                        {total === 0 ? 'sem resultado' : `${total > 0 ? '+' : ''}${usd(total)}`}
                      </p>
                    </button>
                  );
                })}
                {active.length > MAX_TILES && (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-tint/15 p-2.5 text-sm text-fg-muted">+{active.length - MAX_TILES} contas</div>
                )}
              </div>
            )}
            {accounts.some((a) => !accountIsActive(a, date)) && (
              <p className="text-xs text-fg-subtle">
                {accounts.filter((a) => !accountIsActive(a, date)).length} conta(s) fora do período ou encerradas nesta data não aparecem acima.
              </p>
            )}
          </Card>

          {tl.length > 0 && (
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
              <SeriesChart title="Contas ativas" kind="bar" values={tl.map((t) => t.accounts)} labels={tl.map((t) => shortDate(t.date))}
                format={(v) => String(Math.round(v))} current={idx} onSelectDay={setSelIdx} />
              <SeriesChart title="Lucro acumulado (USD)" kind="area" values={tl.map((t) => t.cumNet)} labels={tl.map((t) => shortDate(t.date))}
                format={(v) => usd(v)} current={idx} onSelectDay={setSelIdx} />
            </div>
          )}

          {log.length > 0 && (
            <Card className="space-y-2">
              <p className="eyebrow-muted">Últimos lançamentos</p>
              <ul className="divide-y divide-tint/8">
                {log.map((l) => (
                  <li key={l.key} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-12 shrink-0 tabular-nums text-fg-subtle">{shortDate(l.day)}</span>
                    <span className="min-w-0 flex-1 truncate text-fg-muted">{l.text}</span>
                    <span className={cn('tabular-nums font-medium', l.amount >= 0 ? 'text-success-fg' : 'text-danger-fg')}>{l.amount >= 0 ? '+' : ''}{usd(l.amount)}</span>
                    <button type="button" aria-label="Excluir lançamento" disabled={busy}
                      onClick={() => { if (window.confirm('Excluir este lançamento?')) run(() => (l.kind === 'res' ? deleteResults(l.ids) : deleteWithdrawal(l.ids[0]))); }}
                      className="rounded p-1 text-fg-subtle hover:text-danger-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {openAccount && (() => {
        const a = accounts.find((x) => x.id === openAccount);
        return a ? (
          <AccountDialog account={a} index={accounts.indexOf(a) + 1} data={data} busy={busy}
            onClose={() => setOpenAccount(null)}
            onRun={run} />
        ) : null;
      })()}
    </div>
  );
};

// ── Detalhe da conta: resultados dela, lançamento individual, encerrar/excluir ──
const AccountDialog: React.FC<{
  account: TrackAccount; index: number; data: TrackerData; busy: boolean;
  onClose: () => void; onRun: (fn: () => Promise<void>) => void;
}> = ({ account: a, index, data, busy, onClose, onRun }) => {
  const [day, setDay] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const mine = data.results.filter((r) => r.account_id === a.id).sort((x, y) => (x.day < y.day ? 1 : -1));
  const gross = mine.reduce((s, r) => s + r.amount, 0);
  const closed = !!a.closed_on;

  return (
    <Modal open onClose={onClose} size="md"
      title={`Conta #${index} · $${formatSize(a.size)}`}
      description={`Aberta em ${shortDate(a.opened_on)} · pago ${usd(a.cost)} · split ${a.split_pct}%${closed ? ` · encerrada em ${shortDate(a.closed_on!)}` : ''}`}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="danger" size="sm" disabled={busy}
            onClick={() => { if (window.confirm('Excluir esta conta e todos os resultados dela?')) { onRun(() => deleteAccount(a.id)); onClose(); } }}>
            <Trash2 size={14} /> Excluir conta
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={busy}
              onClick={() => onRun(() => updateAccount(a.id, { closed_on: closed ? null : (todayISO() < a.opened_on ? a.opened_on : todayISO()) }))}>
              <Power size={14} /> {closed ? 'Reabrir' : 'Encerrar'}
            </Button>
            <Button size="sm" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      }>
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1"><Label htmlFor="ad-day">Data</Label><Input id="ad-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} /></div>
          <div className="flex-1"><Label htmlFor="ad-amt">Resultado bruto</Label>
            <Input id="ad-amt" type="number" inputMode="decimal" step={0.5} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="ex.: 12,50" className="tabular-nums" /></div>
          <Button disabled={busy || !day || amount.trim() === '' || !Number.isFinite(parse(amount))}
            onClick={() => { onRun(() => upsertResults([{ account_id: a.id, day, amount: parse(amount) }])); setAmount(''); }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="eyebrow-muted">Resultados</span>
          <span className="text-fg-muted">Bruto <strong className="tabular-nums text-fg">{usd(gross)}</strong> · seu <strong className="tabular-nums text-fg">{usd(gross * a.split_pct / 100)}</strong></span>
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-fg-subtle">Nenhum resultado lançado nesta conta.</p>
        ) : (
          <ul className="ds-scrollbar max-h-56 divide-y divide-tint/8 overflow-y-auto">
            {mine.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="w-12 tabular-nums text-fg-subtle">{shortDate(r.day)}</span>
                <span className={cn('flex-1 tabular-nums', r.amount >= 0 ? 'text-success-fg' : 'text-danger-fg')}>{r.amount >= 0 ? '+' : ''}{usd(r.amount)}</span>
                <button type="button" aria-label="Excluir resultado" disabled={busy} onClick={() => onRun(() => deleteResults([r.id]))}
                  className="rounded p-1 text-fg-subtle hover:text-danger-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
        {closed && <Badge tone="neutral">Conta encerrada — não recebe novos lançamentos em lote</Badge>}
      </div>
    </Modal>
  );
};
