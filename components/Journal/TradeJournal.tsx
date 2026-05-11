import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Loader2, Edit2, Trash2, AlertTriangle, Search,
  TrendingUp, TrendingDown, Star, BookOpen, Clock, ImageIcon,
  Target, BarChart3, ListChecks,
} from 'lucide-react';
import { useTradeJournal, type TradeEntry } from '../../hooks/useTradeJournal';
import { TradeEditor } from './TradeEditor';

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Voltar">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="text-green-600" size={22} />
              Diário de Operações
            </h2>
            <p className="text-sm text-slate-500">
              Registre suas operações com motivo, emocional e aprendizados.
            </p>
          </div>
        </div>

        <button
          onClick={() => { setEditing(null); setCreatingNew(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nova operação
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ativo, motivo, análise…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <select
          value={periodDays}
          onChange={(e) => setPeriodDays(Number(e.target.value))}
          className="text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <FilterPill active={sideFilter === 'all'} onClick={() => setSideFilter('all')}>Todos</FilterPill>
        <FilterPill active={sideFilter === 'buy'} onClick={() => setSideFilter('buy')}>Compras</FilterPill>
        <FilterPill active={sideFilter === 'sell'} onClick={() => setSideFilter('sell')}>Vendas</FilterPill>

        <span className="w-px h-6 bg-slate-200 mx-1" />

        <FilterPill active={resultFilter === 'all'} onClick={() => setResultFilter('all')}>Todas</FilterPill>
        <FilterPill active={resultFilter === 'win'} onClick={() => setResultFilter('win')}>Ganho</FilterPill>
        <FilterPill active={resultFilter === 'loss'} onClick={() => setResultFilter('loss')}>Perda</FilterPill>
        <FilterPill active={resultFilter === 'open'} onClick={() => setResultFilter('open')}>Em aberto</FilterPill>
      </div>

      {/* Lista */}
      {loading && entries.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-green-600" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {entries.length === 0
              ? 'Você ainda não registrou nenhuma operação. Clique em "Nova operação" para começar.'
              : 'Nenhuma operação corresponde aos filtros.'}
          </p>
        </div>
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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* Header (clicável pra expandir) */}
      <button
        onClick={onToggle}
        className="w-full flex flex-wrap items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
          entry.side === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {entry.side === 'buy' ? '↑ COMPRA' : '↓ VENDA'}
        </span>

        <div className="flex flex-col min-w-0">
          <span className="font-bold text-slate-900">{entry.asset}</span>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock size={11} />
            {formatDateTime(entry.opened_at)}
          </span>
        </div>

        <span className="text-sm text-slate-600 tabular-nums ml-auto">
          {entry.volume} lote{entry.volume !== 1 ? 's' : ''}
        </span>

        {entry.rating !== null && (
          <span className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: entry.rating }).map((_, i) => (
              <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
            ))}
          </span>
        )}

        {entry.screenshot_url && (
          <ImageIcon size={14} className="text-slate-400" />
        )}

        <span className={`px-3 py-1 rounded-lg text-sm font-semibold tabular-nums ${
          isOpen ? 'bg-amber-50 text-amber-700' :
          isWin ? 'bg-green-50 text-green-700' :
          isLoss ? 'bg-red-50 text-red-700' :
          'bg-slate-50 text-slate-700'
        }`}>
          {isOpen ? 'Em aberto' : formatMoney(result)}
        </span>
      </button>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
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
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-1.5">Emocional</p>
              <div className="flex flex-wrap gap-1.5">
                {entry.emotional_tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-700">{tag}</span>
                ))}
              </div>
              {entry.emotional_note && (
                <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-wrap">{entry.emotional_note}</p>
              )}
            </div>
          )}
          {entry.conclusion && (
            <ReflectionField label="Conclusão" value={entry.conclusion} />
          )}
          {entry.screenshot_url && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-1.5">Screenshot</p>
              <a href={entry.screenshot_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={entry.screenshot_url}
                  alt={`Screenshot ${entry.asset}`}
                  className="max-h-72 rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
                />
              </a>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Edit2 size={14} />
              Editar
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Apagar
            </button>
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
    ? 'text-green-600'
    : accent === 'negative'
      ? 'text-red-600'
      : 'text-slate-900';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
        <span className="text-green-600">{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${accentClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-green-600 text-white'
          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{label}</p>
      <p className="text-slate-700 tabular-nums">{value}</p>
    </div>
  );
}

function ReflectionField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-1">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg px-3 py-2 border-l-2 border-slate-300">{value}</p>
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
