import React, { useMemo, useState } from 'react';
import {
  Plus, Edit2, Trash2, AlertTriangle, Search,
  CheckCircle2, Circle, BookOpen,
} from 'lucide-react';
import {
  useKnowledge,
  KNOWLEDGE_CATEGORIES,
  type KnowledgeEntry,
  type KnowledgeCategory,
  type KnowledgeInput,
} from '../../../hooks/useKnowledge';
import { KnowledgeEditor } from './KnowledgeEditor';
import { BackButton } from '../../BackButton';
import { Badge, Button, Card, EmptyState, Input, PageHeader, Skeleton } from '../../ui';

interface KnowledgeBaseProps {
  onBack: () => void;
  /** Pré-seed para abrir o editor já com algo (ex: vindo do painel de tópicos) */
  initialDraft?: Partial<KnowledgeInput>;
}

export function KnowledgeBase({ onBack, initialDraft }: KnowledgeBaseProps) {
  const { entries, loading, error, createEntry, updateEntry, toggleActive, deleteEntry } = useKnowledge();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<'all' | KnowledgeCategory>('all');
  const [editing, setEditing] = useState<KnowledgeEntry | null>(null);
  const [creatingNew, setCreatingNew] = useState(!!initialDraft);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterCat !== 'all' && e.category !== filterCat) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q)
        || e.content.toLowerCase().includes(q)
        || e.category.toLowerCase().includes(q)
      );
    });
  }, [entries, search, filterCat]);

  const activeCount = entries.filter((e) => e.is_active).length;

  const handleSave = async (input: KnowledgeInput) => {
    if (editing) return updateEntry(editing.id, input);
    return createEntry(input);
  };

  const handleDelete = async (entry: KnowledgeEntry) => {
    if (!window.confirm(`Apagar "${entry.title}" definitivamente? Esta ação não pode ser desfeita.`)) return;
    const result = await deleteEntry(entry.id);
    if (!result.ok) alert(result.error ?? 'Falha ao apagar.');
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={<BackButton onClick={onBack} />}
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="text-accent-fg shrink-0" size={22} />
            Base de Conhecimento
          </span>
        }
        description={
          <>
            <span className="font-mono tabular-nums">{entries.length}</span> entradas — <span className="text-success-fg font-medium"><span className="font-mono tabular-nums">{activeCount}</span> ativas</span> são incluídas no contexto do assistente.
          </>
        }
        actions={
          <Button onClick={() => { setEditing(null); setCreatingNew(true); }}>
            <Plus size={16} />
            Nova entrada
          </Button>
        }
      />

      {error && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 text-danger-fg border border-danger/20 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, conteúdo ou categoria…"
            className="pl-9"
          />
        </div>
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
            filterCat === 'all'
              ? 'bg-accent/10 border-accent/30 text-accent-fg font-medium'
              : 'bg-tint/3 border-tint/10 text-fg-muted hover:bg-tint/6 hover:text-fg'
          }`}
        >
          Todas
        </button>
        {KNOWLEDGE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
              filterCat === c
                ? 'bg-accent/10 border-accent/30 text-accent-fg font-medium'
                : 'bg-tint/3 border-tint/10 text-fg-muted hover:bg-tint/6 hover:text-fg'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Lista */}
      <Card padding="none" className="overflow-hidden">
        {loading && entries.length === 0 ? (
          <div className="divide-y divide-tint/6" aria-busy="true">
            {[0, 1, 2].map((k) => (
              <div key={k} className="p-4 flex items-start gap-3">
                <Skeleton className="h-[18px] w-[18px] rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            className="border-0 rounded-none"
            title={entries.length === 0
              ? 'Ainda não há entradas. Crie a primeira para começar a treinar o assistente.'
              : 'Nenhuma entrada corresponde aos filtros.'}
          />
        ) : (
          <div className="divide-y divide-tint/6">
            {filtered.map((e) => (
              <div key={e.id} className="p-4 hover:bg-tint/3 transition-colors">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleActive(e.id, !e.is_active)}
                    className="mt-0.5 shrink-0 rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                    title={e.is_active ? 'Desativar (não será incluída no contexto)' : 'Ativar'}
                  >
                    {e.is_active ? (
                      <CheckCircle2 className="text-success-fg" size={18} />
                    ) : (
                      <Circle className="text-fg-subtle" size={18} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className={`font-semibold break-words ${e.is_active ? 'text-fg' : 'text-fg-subtle line-through'}`}>
                        {e.title}
                      </h4>
                      <Badge>{e.category}</Badge>
                    </div>
                    <p className="text-sm text-fg-muted whitespace-pre-wrap break-words line-clamp-3">
                      {e.content}
                    </p>
                    <div className="text-xs text-fg-subtle mt-2">
                      Atualizada em {formatDate(e.updated_at)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditing(e); setCreatingNew(false); }}
                      className="p-2 text-fg-muted hover:text-fg hover:bg-tint/5 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      aria-label="Editar"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(e)}
                      className="p-2 text-fg-muted hover:text-danger-fg hover:bg-danger/10 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      aria-label="Apagar"
                      title="Apagar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(editing || creatingNew) && (
        <KnowledgeEditor
          entry={editing}
          initial={editing ? undefined : initialDraft}
          onClose={() => { setEditing(null); setCreatingNew(false); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
