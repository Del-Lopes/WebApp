import React, { useMemo, useState } from 'react';
import {
  Plus, Edit2, Trash2, AlertTriangle, Search,
  TrendingUp, TrendingDown, Star, BookOpen, Clock, ImageIcon,
  Target, BarChart3, ListChecks,
} from 'lucide-react';
import { useTradeJournal, type TradeEntry } from '../../hooks/useTradeJournal';
import { TradeEditor } from './TradeEditor';
import { BackButton } from '../BackButton';
import { Button, EmptyState, Input, PageHeader, Select, Skeleton } from '../ui';

interface TradeJournalProps {
  onBack: () => void;
}

type SideFilter = 'all' | 'buy' | 'sell';
type ResultFilter = 'all' | 'win' | 'loss' | 'open';

const PERIOD_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 365, label: '1 ano' },
];

export function TradeJournal({ onBack }: TradeJournalProps) {
  const {
    entries, stats, loading, error,
    createEntry, updateEntry, deleteEntry, uploadScreenshot, refresh,
  } = useTradeJournal();

  const [search, setSearch] = useState('');
  const [periodDays, setPeriodDays] = useState(0);
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [editing, setEditing] = useState<TradeEntry | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sinceMs = periodDays > 0 ? Date.now() - periodDays * 86400000 : 0;
    return entries.filter((e) => {
      if (sideFilter !== 'all' && e.side !== sideFilter) return false;
      if (resultFilter === 'open' && e.closed_at) return false;
      if (resultFilter === 'win' && (e.result_amount ?? 0) <= 0) return false;
      if (resultFilter === 'loss' && (e.result_amount ?? 0) >= 0) return false;
      if (sinceMs > 0 && new Date(e.opened_at).getTime() < sinceMs) return false;
      if (!q) return true;
      const haystack = [
        e.asset, e.entry_reason, e.exit_reason, e.analysis, e.emotional_note, e.conclusion,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, search, periodDays, sideFilter, resultFilter]);

  // Stats do período filtrado (não global)
  const filteredStats = useMemo(() => {
    const closed = filtered.filter((e) => e.result_amount !== null && e.closed_at !== null);
    const wins = closed.filter((e) => (e.result_amount ?? 0) > 0).length;
    const sum = filtered.reduce((acc, e) => acc + (e.result_amount ?? 0), 0);
    const ratings = filtered.map((e) => e.rating).filter((r): r is number => r != null);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      totalTrades: filtered.length,
      closedTrades: closed.length,
      winRate: closed.length > 0 ? wins / closed.length : 0,
      resultSum: sum,
      averageRating: avgRating,
    };
  }, [filtered]);

  const handleSave = async (input: Parameters<typeof createEntry>[0]) => {
    if (editing) return updateEntry(editing.id, input);
    return createEntry(input);
  };

  const handleDelete = async (entry: TradeEntry) => {
    if (!window.confirm(`Apagar a operação de ${entry.asset} (${formatDateTime(entry.opened_at)}) definitivamente?`)) return;
    const result = await deleteEntry(entry.id);
    if (!result.ok) alert(result.error ?? 'Falha ao apagar.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="text-accent-fg shrink-0" size={22} />
            Diário de Operações
          </span>
        }
        description="Registre suas operações com motivo, emocional e aprendizados."
        actions={
          <Button onClick={() => { setEditing(null); setCreatingNew(true); }}>
            <Plus size={16} />
            Nova operação
          </Button>
        }
      />

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border bg-danger/10 border-danger/20 text-danger-fg text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<ListChecks size={20} />}
          label="Operações"
          value={String(filteredStats.totalTrades)}
          hint={`${filteredStats.closedTrades} fechadas`}
        />
        <StatCard
          icon={<Target size={20} />}
          label="Win rate"
          value={`${Math.round(filteredStats.winRate * 100)}%`}
          hint={filteredStats.closedTrades > 0 ? `${filteredStats.closedTrades} trades` : 'sem trades fechados'}
        />
        <StatCard
          icon={filteredStats.resultSum >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          label="Resultado acumulado"
          value={formatMoney(filteredStats.resultSum)}
          accent={filteredStats.resultSum > 0 ? 'positive' : filteredStats.resultSum < 0 ? 'negative' : 'neutral'}
        />
        <StatCard
          icon={<Star size={20} />}
          label="Avaliação média"
          value={filteredStats.averageRating > 0 ? filteredStats.averageRating.toFixed(1) : '—'}
          hint="0 a 5 estrelas"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px] max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle z-10" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ativo, motivo, análise…"
            className="pl-9 py-2"
          />
        </div>

        <div className="w-auto">
          <Select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="py-2"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        <FilterPill active={sideFilter === 'all'} onClick={() => setSideFilter('all')}>Todos</FilterPill>
        <FilterPill active={sideFilter === 'buy'} onClick={() => setSideFilter('buy')}>Compras</FilterPill>
        <FilterPill active={sideFilter === 'sell'} onClick={() => setSideFilter('sell')}>Vendas</FilterPill>

        <span className="w-px h-6 bg-tint/10 mx-1" aria-hidden />

        <FilterPill active={resultFilter === 'all'} onClick={() => setResultFilter('all')}>Todas</FilterPill>
        <FilterPill active={resultFilter === 'win'} onClick={() => setResultFilter('win')}>Ganho</FilterPill>
        <FilterPill active={resultFilter === 'loss'} onClick={() => setResultFilter('loss')}>Perda</FilterPill>
        <FilterPill active={resultFilter === 'open'} onClick={() => setResultFilter('open')}>Em aberto</FilterPill>
      </div>

      {/* Lista */}
      {loading && entries.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            <span className="block font-sans text-sm font-normal text-fg-muted">
              {entries.length === 0
                ? 'Você ainda não registrou nenhuma operação. Clique em "Nova operação" para começar.'
                : 'Nenhuma operação corresponde aos filtros.'}
            </span>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <TradeCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onEdit={() => { setEditing(entry); setCreatingNew(false); }}
              onDelete={() => handleDelete(entry)}
            />
          ))}
        </div>
      )}

      {(editing || creatingNew) && (
        <TradeEditor
          entry={editing}
          onClose={() => { setEditing(null); setCreatingNew(false); refresh(); }}
          onSave={handleSave}
          onUploadScreenshot={uploadScreenshot}
        />
      )}
    </div>
  );
}

interface TradeCardProps {
  key?: React.Key;
  entry: TradeEntry;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TradeCard({ entry, expanded, onToggle, onEdit, onDelete }: TradeCardProps) {
  const isOpen = !entry.closed_at;
  const result = entry.result_amount ?? 0;
  const isWin = result > 0;
  const isLoss = result < 0;

  return (
    <div className="glass-card glass-card-hover rounded-xl overflow-hidden">
      {/* Header (clicável pra expandir) */}
      <button
        onClick={onToggle}
        className="w-full flex flex-wrap items-center gap-3 p-4 text-left hover:bg-tint/2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
      >
        <span className={`px-2.5 py-1 rounded-md border text-xs font-bold whitespace-nowrap ${
          entry.side === 'buy' ? 'bg-success/10 border-success/20 text-success-fg' : 'bg-danger/10 border-danger/20 text-danger-fg'
        }`}>
          {entry.side === 'buy' ? '↑ COMPRA' : '↓ VENDA'}
        </span>

        <div className="flex flex-col min-w-0">
          <span className="font-mono font-semibold text-fg">{entry.asset}</span>
          <span className="text-xs text-fg-subtle flex items-center gap-1">
            <Clock size={11} />
            {formatDateTime(entry.opened_at)}
          </span>
        </div>

        <span className="text-sm text-fg-muted font-mono tabular-nums whitespace-nowrap ml-auto">
          {entry.volume} lote{entry.volume !== 1 ? 's' : ''}
        </span>

        {entry.rating !== null && (
          <span className="flex items-center gap-0.5 text-warning-fg">
            {Array.from({ length: entry.rating }).map((_, i) => (
              <Star key={i} size={12} className="fill-warning text-warning" />
            ))}
          </span>
        )}

        {entry.screenshot_url && (
          <ImageIcon size={14} className="text-fg-subtle" />
        )}

        <span className={`px-3 py-1 rounded-lg border text-sm font-semibold font-mono tabular-nums whitespace-nowrap ${
          isOpen ? 'bg-warning/10 border-warning/20 text-warning-fg' :
          isWin ? 'bg-success/10 border-success/20 text-success-fg' :
          isLoss ? 'bg-danger/10 border-danger/20 text-danger-fg' :
          'bg-tint/5 border-tint/10 text-fg-muted'
        }`}>
          {isOpen ? 'Em aberto' : formatMoney(result)}
        </span>
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-tint/6 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {entry.entry_price != null && (
              <KeyValue label="Entrada" value={String(entry.entry_price)} />
            )}
            {entry.exit_price != null && (
              <KeyValue label="Saída" value={String(entry.exit_price)} />
            )}
            {entry.closed_at && (
              <KeyValue label="Fechamento" value={formatDateTime(entry.closed_at)} />
            )}
            {entry.result_pips != null && (
              <KeyValue label="Pips/Pontos" value={Number(entry.result_pips).toFixed(2)} />
            )}
          </div>

          {entry.entry_reason && (
            <ReflectionField label="Motivo da entrada" value={entry.entry_reason} />
          )}
          {entry.exit_reason && (
            <ReflectionField label="Motivo da saída" value={entry.exit_reason} />
          )}
          {entry.analysis && (
            <ReflectionField label="Análise" value={entry.analysis} />
          )}
          {entry.emotional_tags.length > 0 && (
            <div>
              <p className="eyebrow-muted mb-1.5">Emocional</p>
              <div className="flex flex-wrap gap-1.5">
                {entry.emotional_tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full border border-tint/10 bg-tint/5 text-xs text-fg-muted">{tag}</span>
                ))}
              </div>
              {entry.emotional_note && (
                <p className="text-sm text-fg-muted mt-1.5 whitespace-pre-wrap">{entry.emotional_note}</p>
              )}
            </div>
          )}
          {entry.conclusion && (
            <ReflectionField label="Conclusão" value={entry.conclusion} />
          )}
          {entry.screenshot_url && (
            <div>
              <p className="eyebrow-muted mb-1.5">Screenshot</p>
              <a href={entry.screenshot_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={entry.screenshot_url}
                  alt={`Screenshot ${entry.asset}`}
                  className="max-h-72 max-w-full rounded-lg border border-tint/10 hover:opacity-90 transition-opacity"
                />
              </a>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-tint/6">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 size={14} />
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              <Trash2 size={14} />
              Apagar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, hint, accent = 'neutral',
}: {
  icon: React.ReactNode; label: string; value: string; hint?: string;
  accent?: 'positive' | 'negative' | 'neutral';
}) {
  const accentClass = accent === 'positive'
    ? 'text-success-fg'
    : accent === 'negative'
      ? 'text-danger-fg'
      : 'text-fg';
  return (
    <div className="glass-card rounded-xl p-4 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="eyebrow-muted truncate">{label}</span>
        <span className="text-fg-subtle shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      </div>
      <div className={`font-display text-xl sm:text-2xl font-semibold tabular-nums whitespace-nowrap truncate ${accentClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-fg-subtle mt-0.5">{hint}</div>}
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
        active
          ? 'bg-accent/10 border-accent/40 text-accent-fg font-medium'
          : 'bg-tint/3 border-tint/10 text-fg-muted hover:bg-tint/6 hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow-muted">{label}</p>
      <p className="mt-0.5 text-fg font-mono tabular-nums break-words">{value}</p>
    </div>
  );
}

function ReflectionField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow-muted mb-1">{label}</p>
      <p className="text-sm text-fg whitespace-pre-wrap bg-tint/3 rounded-lg px-3 py-2 border-l-2 border-accent/40">{value}</p>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatMoney(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
}
