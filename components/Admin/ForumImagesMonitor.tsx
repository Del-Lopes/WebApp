import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, ExternalLink, ImageIcon, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge } from '../ui';
import { formatBytes } from '../../lib/storage';
import {
  ForumImagesStats, deleteForumImage, fetchForumImagesStats, forumImageDeleteErrorMessage, forumImagesEnabled, imageUrl,
} from '../../lib/forumImages';
import { CollapsibleSection } from './CollapsibleSection';

// Plano grátis do R2: 10 GB guardados e 1 milhão de gravações por mês.
const R2_FREE_BYTES = 10 * 1024 * 1024 * 1024;
const R2_FREE_WRITES = 1_000_000;

// Monitoramento do bucket de imagens do Fórum (Cloudflare R2). Os números vêm
// do registro de uploads da plataforma (forum_images).
export const ForumImagesMonitor: React.FC = () => {
  const [stats, setStats] = useState<ForumImagesStats | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setStats(await fetchForumImagesStats());
      setError(false);
    } catch (e) {
      console.error('[ForumImagesMonitor]', e);
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async (key: string) => {
    if (!window.confirm('Apagar esta imagem do R2 definitivamente? Se ela estiver em algum post do Fórum, o post passará a mostrar uma imagem quebrada.')) return;
    setDeletingKey(key);
    setDeleteError(null);
    try {
      await deleteForumImage(key);
      await load();
    } catch (e) {
      console.error('[ForumImagesMonitor] apagar', e);
      setDeleteError(forumImageDeleteErrorMessage(e));
    } finally {
      setDeletingKey(null);
    }
  };

  const used = stats?.total_bytes ?? 0;
  const pct = (used / R2_FREE_BYTES) * 100;
  const critical = pct >= 95;
  const warning = pct >= 80;

  return (
    <div className="bg-tint/2 rounded-2xl p-5 sm:p-8 border border-tint/8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border ${
            critical ? 'bg-danger/10 border-danger/25 text-danger-fg animate-pulse' :
            warning ? 'bg-warning/10 border-warning/25 text-warning-fg' :
            'bg-accent/10 border-accent/25 text-accent-fg'
          }`}>
            {critical ? <ShieldAlert size={28} /> : <Cloud size={28} />}
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl font-semibold text-fg flex flex-wrap items-center gap-2">
              Imagens do Fórum · Cloudflare R2
              <Badge tone={error ? 'warning' : critical ? 'danger' : 'success'} className="uppercase text-[10px]">
                {error ? 'Indisponível' : critical ? 'Crítico' : warning ? 'Atenção' : 'Operacional'}
              </Badge>
            </h3>
            <p className="text-sm text-fg-muted">Plano grátis: 10 GB guardados e 1 milhão de gravações por mês</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 md:items-end">
          <div className="font-mono text-xl sm:text-2xl font-semibold text-fg tabular-nums whitespace-nowrap">
            {formatBytes(used)}
            <span className="text-fg-subtle mx-2">/</span>
            10 GB
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-sm text-fg-subtle hover:text-accent-fg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label="Atualizar monitoramento do R2"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="eyebrow-muted">Atualizar</span>
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-warning-fg">
          Não foi possível ler os números. Confirme que a migration 20261106 e a 20261107 foram executadas no Supabase.
        </p>
      ) : (
        <>
          <div>
            <div className="h-3 w-full bg-tint/6 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out ${
                  critical ? 'bg-danger' : warning ? 'bg-warning' : 'bg-gradient-to-r from-brand-green-bright to-brand-green'
                }`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-fg-subtle tabular-nums">{pct.toFixed(pct < 1 ? 2 : 1)}% do limite grátis de armazenamento</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Imagens', value: stats?.total_count },
              { label: 'Últimas 24 h', value: stats?.count_24h },
              { label: 'Últimos 7 dias', value: stats?.count_7d },
              { label: 'Autores', value: stats?.users },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-tint/8 bg-tint/3 p-3">
                <dt className="eyebrow-muted">{s.label}</dt>
                <dd className="mt-1 font-mono text-xl font-semibold text-fg tabular-nums">{s.value ?? '—'}</dd>
              </div>
            ))}
          </dl>

          <p className="text-xs text-fg-subtle leading-relaxed tabular-nums">
            Gravações neste mês: <span className="font-mono text-fg-muted">{(stats?.count_month ?? 0).toLocaleString('pt-BR')}</span> de {R2_FREE_WRITES.toLocaleString('pt-BR')}.
            Leituras e imagens apagadas direto no painel da Cloudflare não entram nesta conta; consulte Métricas no R2.
          </p>

          <CollapsibleSection
            title="Imagens recentes"
            icon={<ImageIcon size={20} className="text-fg-subtle" />}
            badge={<Badge className="uppercase"><span className="font-mono tabular-nums">{stats?.recent.length ?? 0}</span> mais recentes</Badge>}
          >
            {!forumImagesEnabled && (
              <p className="mb-3 text-xs text-warning-fg">VITE_FORUM_IMAGES_URL não está definida: as miniaturas ficam indisponíveis.</p>
            )}
            {deleteError && <p role="alert" className="mb-3 text-sm text-danger-fg">{deleteError}</p>}
            {stats && stats.recent.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.recent.map((img) => (
                  <li key={img.object_key} className="flex items-center gap-3 rounded-xl border border-tint/8 bg-surface p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-tint/8 bg-tint/3">
                      {forumImagesEnabled && (
                        <img loading="lazy" decoding="async" src={imageUrl(img.object_key)} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{img.author ?? 'Usuário removido'}</p>
                      <p className="font-mono text-[11px] tabular-nums text-fg-subtle">
                        {formatBytes(img.bytes)} · {new Date(img.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {forumImagesEnabled && (
                      <a
                        href={imageUrl(img.object_key)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg p-2 text-fg-subtle hover:bg-tint/5 hover:text-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                        title="Ver imagem"
                        aria-label="Ver imagem"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void remove(img.object_key)}
                      disabled={deletingKey !== null}
                      className="shrink-0 rounded-lg p-2 text-fg-subtle hover:bg-danger/10 hover:text-danger-fg disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      title="Apagar do R2"
                      aria-label="Apagar imagem do R2"
                    >
                      <Trash2 size={16} className={deletingKey === img.object_key ? 'animate-pulse' : ''} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm italic text-fg-muted">Nenhuma imagem enviada ao Fórum ainda.</p>
            )}
          </CollapsibleSection>
        </>
      )}
    </div>
  );
};
