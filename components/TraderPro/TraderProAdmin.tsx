import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, CardHeader, Input, Select } from '../ui';
import { supabase } from '../../lib/supabase';
import { TP_FEATURES, TP_PLANS } from './traderProApi';

interface Row {
  id: string; user_id: string; plan: string; status: string; features: string[]; max_devices: number; expires_at: string | null; notes: string | null;
}
interface Person { id: string; full_name: string | null; email: string | null }
interface Ev { id: number; kind: string; detail: string | null; created_at: string; user_id: string | null }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : 'sem vencimento');

/** Painel do admin: conceder/suspender/revogar licenças do Trader Pro e ver a auditoria (ativações e recusas). */
export const TraderProAdmin: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [events, setEvents] = useState<Ev[]>([]);
  const [devCount, setDevCount] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<Person[]>([]);
  const [target, setTarget] = useState<Person | null>(null);
  const [plan, setPlan] = useState('standard');
  const [maxDev, setMaxDev] = useState(2);
  const [expires, setExpires] = useState('');
  const [features, setFeatures] = useState<string[]>(TP_FEATURES.map((f) => f.id));
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: lic } = await supabase.from('ext_licenses').select('id, user_id, plan, status, features, max_devices, expires_at, notes').order('created_at', { ascending: false }).limit(200);
    const list = (lic ?? []) as Row[];
    setRows(list);
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      setPeople(Object.fromEntries(((ps ?? []) as Person[]).map((p) => [p.id, p])));
    }
    const { data: dv } = await supabase.from('ext_devices').select('license_id').is('revoked_at', null);
    const c: Record<string, number> = {};
    for (const d of (dv ?? []) as { license_id: string }[]) c[d.license_id] = (c[d.license_id] ?? 0) + 1;
    setDevCount(c);
    const { data: ev } = await supabase.from('ext_license_events').select('id, kind, detail, created_at, user_id').order('created_at', { ascending: false }).limit(25);
    setEvents((ev ?? []) as Ev[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const doSearch = async () => {
    const q = search.trim().replace(/[%,()]/g, '');
    if (q.length < 3) { setFound([]); return; }
    const { data } = await supabase.from('profiles').select('id, full_name, email').or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).limit(8);
    setFound((data ?? []) as Person[]);
  };

  const grant = async () => {
    if (!target) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('ext_licenses').upsert({
      user_id: target.id, product: 'trader_pro', plan, status: 'active', features, max_devices: maxDev,
      expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null, source: 'admin', notes: notes.trim() || null,
    }, { onConflict: 'user_id,product' });
    setBusy(false);
    if (error) { setMsg(`Erro: ${error.message}`); return; }
    setMsg('Licença salva.'); setTarget(null); setSearch(''); setFound([]); setNotes(''); void load();
  };

  const setStatus = async (id: string, status: 'active' | 'suspended' | 'revoked') => {
    const { error } = await supabase.from('ext_licenses').update({ status }).eq('id', id);
    if (error) setMsg(`Erro: ${error.message}`); else void load();
  };

  const toggleFeature = (id: string) => setFeatures((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const who = (id: string) => people[id]?.email || people[id]?.full_name || id.slice(0, 8);

  return (
    <Card className="relative overflow-hidden mb-6 md:mb-8">
      <div className="hairline absolute inset-x-0 top-0" aria-hidden />
      <CardHeader eyebrow="Administração" title="Trader Pro · licenças" />

      <div className="space-y-4 rounded-xl border border-tint/10 bg-tint/3 p-4 mb-6">
        <p className="eyebrow-muted">Conceder ou atualizar licença</p>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void doSearch()} placeholder="Buscar usuário por e-mail ou nome" />
          <Button variant="secondary" onClick={() => void doSearch()}>Buscar</Button>
        </div>
        {found.length > 0 && !target && (
          <ul className="divide-y divide-tint/6 rounded-lg border border-tint/10">
            {found.map((p) => (
              <li key={p.id}><button type="button" className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-tint/5" onClick={() => { setTarget(p); setFound([]); }}>{p.full_name || '(sem nome)'} <span className="text-fg-subtle">· {p.email}</span></button></li>
            ))}
          </ul>
        )}
        {target && (
          <div className="space-y-4">
            <p className="text-sm text-fg">Usuário: <b>{target.full_name || target.email}</b> <button type="button" className="text-xs text-fg-subtle underline ml-2" onClick={() => setTarget(null)}>trocar</button></p>
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-xs text-fg-muted">Plano<Select value={plan} onChange={(e) => setPlan(e.target.value)}>{TP_PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></label>
              <label className="text-xs text-fg-muted">Navegadores<Input type="number" min={1} max={10} value={maxDev} onChange={(e) => setMaxDev(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} /></label>
              <label className="text-xs text-fg-muted">Vence em (vazio = nunca)<Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></label>
            </div>
            <div className="flex flex-wrap gap-2">
              {TP_FEATURES.map((f) => (
                <label key={f.id} className="inline-flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                  <input type="checkbox" className="accent-[var(--ds-accent)]" checked={features.includes(f.id)} onChange={() => toggleFeature(f.id)} />{f.label}
                </label>
              ))}
            </div>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Observação interna (opcional)" />
            <Button onClick={() => void grant()} isLoading={busy}>Salvar licença</Button>
          </div>
        )}
        {msg && <p className="text-sm text-fg-muted" role="status">{msg}</p>}
      </div>

      <p className="eyebrow-muted mb-2">Licenças ({rows.length})</p>
      {rows.length === 0 ? <p className="text-sm text-fg-subtle mb-6">Nenhuma licença ainda.</p> : (
        <ul className="divide-y divide-tint/6 mb-6">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-fg truncate">{who(r.user_id)} <Badge tone={r.status === 'active' ? 'success' : r.status === 'suspended' ? 'warning' : 'danger'} className="ml-1">{r.status}</Badge></p>
                <p className="text-xs text-fg-subtle">{r.plan} · {devCount[r.id] ?? 0}/{r.max_devices} navegadores · {fmt(r.expires_at)} · {r.features.length} recursos{r.notes ? ` · ${r.notes}` : ''}</p>
              </div>
              <div className="flex gap-1.5">
                {r.status !== 'active' && <Button size="sm" variant="secondary" onClick={() => void setStatus(r.id, 'active')}>Reativar</Button>}
                {r.status === 'active' && <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, 'suspended')}>Suspender</Button>}
                {r.status !== 'revoked' && <Button size="sm" variant="danger" onClick={() => void setStatus(r.id, 'revoked')}>Revogar</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="eyebrow-muted mb-2">Auditoria recente</p>
      {events.length === 0 ? <p className="text-sm text-fg-subtle">Sem eventos.</p> : (
        <ul className="text-xs font-mono tabular-nums text-fg-muted space-y-1">
          {events.map((e) => (
            <li key={e.id}>{new Date(e.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {e.kind}{e.user_id ? ` · ${who(e.user_id)}` : ''}{e.detail ? ` · ${e.detail}` : ''}</li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-fg-subtle">Muitas "activate_denied" ou vários dispositivos para a mesma licença indicam compartilhamento: suspenda e converse com o usuário.</p>
    </Card>
  );
};
