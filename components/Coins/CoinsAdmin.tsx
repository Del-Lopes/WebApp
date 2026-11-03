import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Plus, Save, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, EmptyState, FieldMessage, Input, Label, Select, Skeleton, Stat, Table, TBody, TD, TH, THead, TR } from '../ui';
import type { BadgeTone } from '../ui';
import {
  AdminOrder, AdminPackage, METHOD_LABEL, OrderStatus, brl,
  fetchAdminOrders, fetchAllPackages, savePackage,
} from '../../lib/coinStore';

const STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  paid: { label: 'Pago', tone: 'success' },
  expired: { label: 'Expirado', tone: 'neutral' },
  failed: { label: 'Falhou', tone: 'danger' },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// ── Pacotes ─────────────────────────────────────────────────────────────
interface Draft {
  id: string; name: string; price: string; coins: string; bonus: string; order: string;
  highlight: boolean; active: boolean;
}

const toDraft = (p: AdminPackage): Draft => ({
  id: p.id, name: p.name, price: String(p.price_brl), coins: String(p.coins), bonus: String(p.bonus_pct),
  order: String(p.sort_order), highlight: p.highlight, active: p.active,
});

const emptyDraft = (order: number): Draft => ({
  id: '', name: '', price: '', coins: '', bonus: '0', order: String(order), highlight: false, active: true,
});

// Devolve o pacote validado ou a mensagem de erro.
function parseDraft(d: Draft, isNew: boolean): AdminPackage | string {
  if (isNew && !/^[a-z0-9-]{2,30}$/.test(d.id)) return 'Identificador: 2 a 30 caracteres, só letras minúsculas, números e hífen.';
  if (!d.name.trim()) return 'Informe o nome.';
  const price = Number(d.price.replace(',', '.'));
  if (!Number.isFinite(price) || price <= 0 || price > 99999) return 'Preço inválido (maior que zero).';
  const coins = Number(d.coins);
  if (!Number.isInteger(coins) || coins <= 0 || coins > 10_000_000) return 'Coins deve ser um inteiro maior que zero.';
  const bonus = Number(d.bonus);
  if (!Number.isInteger(bonus) || bonus < 0 || bonus > 1000) return 'Bônus deve ser um inteiro de 0 em diante.';
  const order = Number(d.order);
  if (!Number.isInteger(order)) return 'Ordem deve ser um número inteiro.';
  return {
    id: d.id, name: d.name.trim(), price_brl: Math.round(price * 100) / 100, coins, bonus_pct: bonus,
    highlight: d.highlight, active: d.active, sort_order: order,
  };
}

const PackageRow: React.FC<{
  initial: Draft; isNew?: boolean; onSaved: () => void; onCancel?: () => void;
}> = ({ initial, isNew, onSaved, onCancel }) => {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setD(initial); }, [initial]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setD((cur) => ({ ...cur, [k]: v })); setSaved(false); };
  const dirty = isNew || JSON.stringify(d) !== JSON.stringify(initial);
  const price = Number(d.price.replace(',', '.'));
  const coins = Number(d.coins);
  const perCoin = price > 0 && coins > 0 ? price / coins : null;

  const save = async () => {
    const parsed = parseDraft(d, !!isNew);
    if (typeof parsed === 'string') { setError(parsed); return; }
    setBusy(true); setError(null);
    try {
      await savePackage(parsed);
      setSaved(true);
      onSaved();
    } catch (e) {
      console.error('[CoinsAdmin] save', e);
      setError('Não foi possível salvar. Confira se você é admin e se o identificador já não existe.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-1">
          <Label htmlFor={`id-${initial.id || 'new'}`}>Identificador</Label>
          <Input
            id={`id-${initial.id || 'new'}`} value={d.id} disabled={!isNew} placeholder="ex.: mega"
            onChange={(e) => set('id', e.target.value.toLowerCase())}
          />
        </div>
        <div className="lg:col-span-1">
          <Label htmlFor={`nm-${initial.id || 'new'}`}>Nome</Label>
          <Input id={`nm-${initial.id || 'new'}`} value={d.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`pr-${initial.id || 'new'}`}>Preço (R$)</Label>
          <Input id={`pr-${initial.id || 'new'}`} inputMode="decimal" value={d.price} onChange={(e) => set('price', e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`co-${initial.id || 'new'}`}>Coins</Label>
          <Input id={`co-${initial.id || 'new'}`} inputMode="numeric" value={d.coins} onChange={(e) => set('coins', e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`bo-${initial.id || 'new'}`} hint="só exibição">Bônus (%)</Label>
          <Input id={`bo-${initial.id || 'new'}`} inputMode="numeric" value={d.bonus} onChange={(e) => set('bonus', e.target.value)} />
        </div>
        <div>
          <Label htmlFor={`or-${initial.id || 'new'}`}>Ordem</Label>
          <Input id={`or-${initial.id || 'new'}`} inputMode="numeric" value={d.order} onChange={(e) => set('order', e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={d.highlight} onChange={(e) => set('highlight', e.target.checked)} className="h-4 w-4 accent-accent" />
          Mais escolhido
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={d.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-accent" />
          Ativo (visível na loja)
        </label>
        {perCoin !== null && <span className="text-xs text-fg-subtle">{brl(perCoin)} por Coin</span>}
        <span className="ml-auto flex items-center gap-2">
          {saved && !dirty && <Badge tone="success">Salvo</Badge>}
          {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>}
          <Button size="sm" onClick={save} isLoading={busy} disabled={!dirty}><Save size={14} /> {isNew ? 'Criar pacote' : 'Salvar'}</Button>
        </span>
      </div>
      {error && <FieldMessage error>{error}</FieldMessage>}
    </Card>
  );
};

const PackagesPanel: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [rows, setRows] = useState<AdminPackage[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRows(await fetchAllPackages()); setError(null); }
    catch (e) { console.error('[CoinsAdmin] packages', e); setError('Não foi possível carregar os pacotes.'); setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const afterSave = () => { setAdding(false); void load(); onChanged(); };

  if (rows === null) return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">
          Mudanças valem para novas compras. Pedidos já criados guardam o preço e os Coins da época.
        </p>
        {!adding && <Button variant="secondary" size="sm" onClick={() => setAdding(true)}><Plus size={14} /> Novo pacote</Button>}
      </div>
      {error && <FieldMessage error>{error}</FieldMessage>}
      {adding && (
        <PackageRow
          isNew initial={emptyDraft((rows.at(-1)?.sort_order ?? 0) + 1)} onSaved={afterSave} onCancel={() => setAdding(false)}
        />
      )}
      {rows.map((p) => <PackageRow key={p.id} initial={toDraft(p)} onSaved={afterSave} />)}
      {rows.length === 0 && !error && <EmptyState title="Nenhum pacote" description="Crie o primeiro pacote." />}
    </div>
  );
};

// ── Pedidos ─────────────────────────────────────────────────────────────
const OrdersPanel: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [method, setMethod] = useState<'all' | AdminOrder['method']>('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try { setOrders(await fetchAdminOrders()); setError(null); }
    catch (e) { console.error('[CoinsAdmin] orders', e); setError('Não foi possível carregar os pedidos.'); setOrders([]); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(
    () => (orders ?? []).filter((o) => (status === 'all' || o.status === status) && (method === 'all' || o.method === method)),
    [orders, status, method],
  );
  const stats = useMemo(() => {
    const paid = (orders ?? []).filter((o) => o.status === 'paid');
    return {
      revenue: paid.reduce((s, o) => s + o.price_brl, 0),
      paid: paid.length,
      coins: paid.reduce((s, o) => s + o.coins, 0),
      pending: (orders ?? []).filter((o) => o.status === 'pending').length,
    };
  }, [orders]);

  if (orders === null) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Receita (pagos)" value={brl(stats.revenue)} />
        <Stat label="Pedidos pagos" value={String(stats.paid)} />
        <Stat label="Coins vendidos" value={stats.coins.toLocaleString('pt-BR')} />
        <Stat label="Pendentes" value={String(stats.pending)} />
      </div>
      <p className="text-xs text-fg-subtle">Totais dos últimos {orders.length} pedidos carregados (máx. 200).</p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Label htmlFor="f-status">Status</Label>
          <Select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">Todos</option>
            {(Object.keys(STATUS) as OrderStatus[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </Select>
        </div>
        <div className="w-44">
          <Label htmlFor="f-method">Método</Label>
          <Select id="f-method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="all">Todos</option>
            {(Object.keys(METHOD_LABEL) as AdminOrder['method'][]).map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
          </Select>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} isLoading={busy}><RefreshCw size={14} /> Atualizar</Button>
      </div>

      {error && <FieldMessage error>{error}</FieldMessage>}

      {shown.length === 0 ? (
        <EmptyState title="Nenhum pedido" description="Nada encontrado com esses filtros." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Data</TH><TH>Usuário</TH><TH>Pacote</TH><TH align="right">Coins</TH>
              <TH align="right">Valor</TH><TH>Método</TH><TH>Status</TH><TH>ID no gateway</TH>
            </TR>
          </THead>
          <TBody>
            {shown.map((o) => (
              <TR key={o.id}>
                <TD className="whitespace-nowrap">{fmtDate(o.created_at)}</TD>
                <TD>
                  <span className="block text-fg">{o.user_name || '—'}</span>
                  <span className="block text-xs text-fg-subtle">{o.user_email || o.user_id.slice(0, 8)}</span>
                </TD>
                <TD>{o.package_id ?? '—'}</TD>
                <TD numeric>{o.coins.toLocaleString('pt-BR')}</TD>
                <TD numeric>{brl(o.price_brl)}</TD>
                <TD>{METHOD_LABEL[o.method]}</TD>
                <TD><Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge></TD>
                <TD className="font-mono text-xs">{o.external_id ?? '—'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
};

export type AdminView = 'packages' | 'orders';

export const CoinsAdmin: React.FC<{ view: AdminView; onPackagesChanged: () => void }> = ({ view, onPackagesChanged }) => (
  <div className="space-y-4">
    <p className="eyebrow-muted inline-flex items-center gap-1.5"><Coins size={12} /> Administração da loja</p>
    {view === 'packages' ? <PackagesPanel onChanged={onPackagesChanged} /> : <OrdersPanel />}
  </div>
);
