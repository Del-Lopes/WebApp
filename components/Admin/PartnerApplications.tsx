import React, { useEffect, useMemo, useState } from 'react';
import { Inbox, Mail, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, Badge, Tabs, Skeleton, EmptyState } from '../ui';
import type { BadgeTone } from '../ui/Badge';

// Solicitações do formulário "Seja um Parceiro" da landing (edge function
// partner-apply → partner_applications). Só staff lê/edita (RLS).

type Status = 'new' | 'contacted' | 'approved' | 'rejected';

interface Application {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  status: Status;
  created_at: string;
}

const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  new: { label: 'Nova', tone: 'warning' },
  contacted: { label: 'Em contato', tone: 'info' },
  approved: { label: 'Aprovada', tone: 'success' },
  rejected: { label: 'Recusada', tone: 'neutral' },
};

const STATUS_SELECT = 'bg-elevated border border-tint/15 rounded-md px-2 py-1 text-xs text-fg outline-hidden focus:border-accent/60 focus:ring-1 focus:ring-accent/30 cursor-pointer';
const ICON_LINK = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-tint/5 hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60';

type Filter = 'open' | 'all';

export const PartnerApplications: React.FC<{ search?: string }> = ({ search = '' }) => {
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<Filter>('open');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('partner_applications')
        .select('id, name, email, phone, message, status, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        console.error('[PartnerApplications] load', error);
        setLoadError(true);
      } else {
        setItems((data ?? []) as Application[]);
      }
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id: string, status: Status) => {
    const prev = items;
    setItems((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
    const { error } = await supabase
      .from('partner_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[PartnerApplications] status', error);
      setItems(prev);
      alert('Não foi possível atualizar o status.');
    }
  };

  const remove = async (a: Application) => {
    if (!confirm(`Apagar a solicitação de ${a.name}?`)) return;
    const { error } = await supabase.from('partner_applications').delete().eq('id', a.id);
    if (error) {
      console.error('[PartnerApplications] delete', error);
      alert('Não foi possível apagar a solicitação.');
      return;
    }
    setItems((list) => list.filter((x) => x.id !== a.id));
  };

  const openCount = useMemo(() => items.filter((a) => a.status === 'new' || a.status === 'contacted').length, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      if (filter === 'open' && a.status !== 'new' && a.status !== 'contacted') return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.phone.includes(q);
    });
  }, [items, filter, search]);

  return (
    <Card>
      <CardHeader
        eyebrow="Formulário do site"
        title="Solicitações de parceria"
        action={<Badge tone={openCount ? 'warning' : 'neutral'}><Inbox size={12} /> {openCount} em aberto</Badge>}
      />

      <div className="mb-4">
        <Tabs<Filter>
          aria-label="Filtro de solicitações"
          value={filter}
          onChange={setFilter}
          items={[{ key: 'open', label: 'Em aberto' }, { key: 'all', label: 'Todas' }]}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : loadError ? (
        <EmptyState
          icon={Inbox}
          title="Não foi possível carregar as solicitações"
          description="Verifique se a migration 20260928_partner_applications foi aplicada no banco e recarregue a página."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={filter === 'open' ? 'Nenhuma solicitação em aberto' : 'Nenhuma solicitação ainda'}
          description="Os pedidos enviados pelo formulário “Seja um Parceiro” da landing aparecem aqui."
        />
      ) : (
        <ul className="divide-y divide-tint/6 overflow-hidden rounded-xl border border-tint/8">
          {visible.map((a) => {
            const digits = a.phone.replace(/\D/g, '');
            const wa = digits.length <= 11 ? `55${digits}` : digits;
            return (
              <li key={a.id} className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-tint/2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-fg">{a.name}</p>
                    <Badge tone={STATUS[a.status].tone} dot>{STATUS[a.status].label}</Badge>
                  </div>
                  <p className="truncate text-xs text-fg-muted">
                    {a.email} · <span className="font-mono tabular-nums">{a.phone}</span>
                  </p>
                  {a.message && <p className="whitespace-pre-line text-sm text-fg-muted">{a.message}</p>}
                  <p className="font-mono text-[11px] tabular-nums text-fg-subtle">{new Date(a.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={ICON_LINK} title="Abrir no WhatsApp" aria-label={`WhatsApp de ${a.name}`}>
                    <MessageCircle size={16} />
                  </a>
                  <a href={`mailto:${a.email}`} className={ICON_LINK} title="Enviar e-mail" aria-label={`E-mail para ${a.name}`}>
                    <Mail size={16} />
                  </a>
                  <select
                    value={a.status}
                    onChange={(e) => updateStatus(a.id, e.target.value as Status)}
                    className={`${STATUS_SELECT} ml-1`}
                    aria-label={`Status da solicitação de ${a.name}`}
                  >
                    {(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                  </select>
                  <button
                    onClick={() => remove(a)}
                    className={`${ICON_LINK} hover:bg-danger/10 hover:text-danger-fg`}
                    title="Apagar"
                    aria-label={`Apagar solicitação de ${a.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
