import React, { useEffect, useMemo, useState } from 'react';
import { Video, Save, Search, Lock, Unlock, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchLiveRoomConfig, saveLiveRoomConfig, isValidRoomUrl,
  fetchLiveRoomAccessIds, grantLiveRoomAccess, revokeLiveRoomAccess, setLiveRoomStatus,
} from '../../lib/liveRoom';
import { Button, Card, CardHeader, Input, Label, FieldMessage, Badge, Tabs, Skeleton, EmptyState } from '../ui';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

type Filter = 'all' | 'granted';

// Staff (admin/first_mate) sempre entra na sala: não precisa de liberação.
const STAFF_ROLES = ['admin', 'first_mate'];

export const LiveRoomAdmin: React.FC = () => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [schedule, setSchedule] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [updatingLiveStatus, setUpdatingLiveStatus] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    (async () => {
      try {
        const [cfg, ids, { data, error }] = await Promise.all([
          fetchLiveRoomConfig(),
          fetchLiveRoomAccessIds(),
          supabase.from('profiles').select('id, full_name, email, role').order('full_name', { ascending: true }),
        ]);
        if (error) throw error;
        setUrl(cfg.url ?? '');
        setSchedule(cfg.schedule ?? '');
        setIsLive(cfg.is_live);
        setSavedAt(cfg.updated_at);
        setGranted(ids);
        setProfiles((data ?? []) as ProfileRow[]);
      } catch (e) {
        console.error('[LiveRoomAdmin] load', e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const urlValid = isValidRoomUrl(url);

  const handleSave = async () => {
    if (!user) return;
    if (!urlValid) { setConfigError('Use um link completo começando com https://'); return; }
    setSaving(true);
    setConfigError(null);
    try {
      await saveLiveRoomConfig(url, schedule, user.id);
      setSavedAt(new Date().toISOString());
    } catch (e) {
      console.error('[LiveRoomAdmin] save', e);
      setConfigError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleLiveStatusChange = async () => {
    if (!user || updatingLiveStatus) return;
    const nextStatus = !isLive;
    setUpdatingLiveStatus(true);
    setConfigError(null);
    try {
      await setLiveRoomStatus(nextStatus, user.id);
      setIsLive(nextStatus);
      setSavedAt(new Date().toISOString());
      window.dispatchEvent(new CustomEvent<boolean>('live-room-status-change', { detail: nextStatus }));
    } catch (e) {
      console.error('[LiveRoomAdmin] live status', e);
      setConfigError('Não foi possível atualizar o status ao vivo. Tente novamente.');
    } finally {
      setUpdatingLiveStatus(false);
    }
  };

  const toggleAccess = async (p: ProfileRow) => {
    if (!user) return;
    const has = granted.has(p.id);
    setBusyId(p.id);
    try {
      if (has) await revokeLiveRoomAccess(p.id);
      else await grantLiveRoomAccess(p.id, user.id);
      setGranted((prev) => {
        const next = new Set(prev);
        if (has) next.delete(p.id); else next.add(p.id);
        return next;
      });
    } catch (e) {
      console.error('[LiveRoomAdmin] toggle', e);
      alert(has ? 'Não foi possível remover o acesso.' : 'Não foi possível liberar o acesso.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      if (filter === 'granted' && !granted.has(p.id)) return false;
      if (!q) return true;
      return (p.full_name ?? '').toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q);
    });
  }, [profiles, granted, search, filter]);

  const grantedCount = useMemo(
    () => profiles.filter((p) => granted.has(p.id) && !STAFF_ROLES.includes(p.role ?? '')).length,
    [profiles, granted],
  );

  if (loadError) {
    return (
      <EmptyState
        icon={Video}
        title="Não foi possível carregar a Sala ao Vivo"
        description="Verifique se a migration 20260927_live_room foi aplicada no banco e recarregue a página."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuração da sala */}
      <Card>
        <CardHeader
          eyebrow="Sala ao Vivo"
          title="Link e horário"
          action={<Video size={18} className="text-fg-subtle" aria-hidden />}
        />
        <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-tint/8 bg-tint/[0.025] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-fg">Estamos ao vivo</p>
            <p className="text-xs text-fg-muted">Exibe o indicador de transmissão no menu e na Sala ao Vivo.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isLive}
            aria-label={isLive ? 'Desligar status ao vivo' : 'Ligar status ao vivo'}
            disabled={loading || updatingLiveStatus}
            onClick={handleLiveStatusChange}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 ${
              isLive ? 'bg-danger' : 'bg-tint/15'
            }`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${isLive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="live-room-url" hint="Zoom, Meet, YouTube, Discord…">Link da sala</Label>
            <Input
              id="live-room-url"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setConfigError(null); }}
              aria-invalid={!urlValid || undefined}
            />
            {!urlValid && <FieldMessage error>Use um link completo começando com https://</FieldMessage>}
          </div>
          <div>
            <Label htmlFor="live-room-schedule" hint="opcional">Horário exibido aos membros</Label>
            <Input
              id="live-room-schedule"
              placeholder="Ex.: Seg a Sex · 9h às 11h (Brasília)"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              maxLength={120}
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-fg-subtle">
            O link só é entregue a quem tem acesso liberado.
            {savedAt && <> · Última atualização: {new Date(savedAt).toLocaleString('pt-BR')}</>}
          </p>
          <Button onClick={handleSave} isLoading={saving} disabled={!urlValid || loading}>
            {!saving && <Save size={16} />} Salvar
          </Button>
        </div>
        {configError && <FieldMessage error>{configError}</FieldMessage>}
      </Card>

      {/* Acessos */}
      <Card>
        <CardHeader
          eyebrow="Acessos"
          title="Quem pode entrar"
          action={<Badge tone="accent"><Users size={12} /> {grantedCount} liberado{grantedCount === 1 ? '' : 's'}</Badge>}
        />
        <p className="-mt-2 mb-4 text-sm text-fg-muted">
          Libere a sala para os usuários pagantes. Admin e First Mate têm acesso automático.
        </p>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou e-mail…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar usuário"
            />
          </div>
          <Tabs<Filter>
            aria-label="Filtro de acesso"
            value={filter}
            onChange={setFilter}
            items={[{ key: 'all', label: 'Todos' }, { key: 'granted', label: 'Com acesso' }]}
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Ajuste a busca ou o filtro." />
        ) : (
          <ul className="divide-y divide-tint/6 overflow-hidden rounded-xl border border-tint/8">
            {visible.map((p) => {
              const isStaff = STAFF_ROLES.includes(p.role ?? '');
              const has = isStaff || granted.has(p.id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-tint/2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{p.full_name || 'Sem nome'}</p>
                    <p className="truncate text-xs text-fg-subtle">{p.email || '—'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isStaff ? (
                      <Badge tone="neutral">Staff · acesso automático</Badge>
                    ) : (
                      <>
                        <Badge tone={has ? 'success' : 'neutral'} dot className="hidden sm:inline-flex">
                          {has ? 'Liberado' : 'Bloqueado'}
                        </Badge>
                        <Button
                          size="sm"
                          variant={has ? 'danger' : 'primary'}
                          isLoading={busyId === p.id}
                          onClick={() => toggleAccess(p)}
                          aria-label={has ? `Remover acesso de ${p.full_name || p.email}` : `Liberar acesso para ${p.full_name || p.email}`}
                        >
                          {busyId !== p.id && (has ? <Lock size={14} /> : <Unlock size={14} />)}
                          {has ? 'Remover' : 'Liberar'}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
