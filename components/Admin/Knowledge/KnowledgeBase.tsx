import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Loader2, Edit2, Trash2, AlertTriangle, Search,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" aria-label="Voltar">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="text-green-600" size={22} />
              Base de Conhecimento
            </h2>
            <p className="text-sm text-slate-500">
              {entries.length} entradas — <span className="text-green-700 font-medium">{activeCount} ativas</span> são incluídas no contexto do assistente.
            </p>
          </div>
        </div>

        <button
          onClick={() => { setEditing(null); setCreatingNew(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Nova entrada
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, conteúdo ou categoria…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            filterCat === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Todas
        </button>
        {KNOWLEDGE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterCat === c
                ? 'bg-green-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="animate-spin text-green-600" size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-12 px-4 text-sm">
            {entries.length === 0
              ? 'Ainda não há entradas. Crie a primeira para começar a treinar o assistente.'
              : 'Nenhuma entrada corresponde aos filtros.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <div key={e.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleActive(e.id, !e.is_active)}
                    className="mt-0.5 shrink-0"
                    title={e.is_active ? 'Desativar (não será incluída no contexto)' : 'Ativar'}
                  >
                    {e.is_active ? (
                      <CheckCircle2 className="text-green-600" size={18} />
                    ) : (
                      <Circle className="text-slate-300" size={18} />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${e.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                        {e.title}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-700">
                        {e.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">
                      {e.content}
                    </p>
                    <div className="text-xs text-slate-400 mt-2">
                      Atualizada em {formatDate(e.updated_at)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditing(e); setCreatingNew(false); }}
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      aria-label="Editar"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(e)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      </div>

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
