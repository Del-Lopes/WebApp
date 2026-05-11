import React, { useEffect, useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import {
  KNOWLEDGE_CATEGORIES,
  type KnowledgeCategory,
  type KnowledgeEntry,
  type KnowledgeInput,
} from '../../../hooks/useKnowledge';

interface KnowledgeEditorProps {
  entry: KnowledgeEntry | null;
  initial?: Partial<KnowledgeInput>; // pré-preenchimento ao criar a partir de um tópico
  onClose: () => void;
  onSave: (input: KnowledgeInput) => Promise<{ ok: boolean; error?: string }>;
}

const TITLE_MAX = 200;
const CONTENT_MAX = 5000;

export function KnowledgeEditor({ entry, initial, onClose, onSave }: KnowledgeEditorProps) {
  const [title, setTitle] = useState(entry?.title ?? initial?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? initial?.content ?? '');
  const [category, setCategory] = useState<KnowledgeCategory>(
    entry?.category ?? initial?.category ?? 'Outros'
  );
  const [isActive, setIsActive] = useState(entry?.is_active ?? initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Preencha título e conteúdo.');
      return;
    }
    if (title.length > TITLE_MAX) {
      setError(`Título excede ${TITLE_MAX} caracteres.`);
      return;
    }
    if (content.length > CONTENT_MAX) {
      setError(`Conteúdo excede ${CONTENT_MAX} caracteres.`);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave({ title, content, category, is_active: isActive });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? 'Falha ao salvar.');
    } else {
      onClose();
    }
  };

  const isEditing = !!entry;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-lg">
            {isEditing ? 'Editar entrada' : 'Nova entrada de conhecimento'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Ex: Como ativar uma licença AFK Trader"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="text-xs text-slate-400 mt-1 text-right">{title.length} / {TITLE_MAX}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {KNOWLEDGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-slate-700">Ativo (incluído nas respostas)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Conteúdo</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={CONTENT_MAX}
              rows={12}
              placeholder="Escreva em texto puro como o bot deve responder. Quanto mais detalhado e específico, melhor.&#10;&#10;Exemplo:&#10;Para ativar uma licença AFK Trader:&#10;1. Acesse a tela Licenças no menu lateral&#10;2. Clique em 'Solicitar nova licença'&#10;3. Informe o número da conta MT5&#10;4. Aguarde aprovação do admin (em até 24h)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent custom-scrollbar font-mono"
            />
            <div className="text-xs text-slate-400 mt-1 text-right">{content.length} / {CONTENT_MAX}</div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            {isEditing ? 'Salvar alterações' : 'Criar entrada'}
          </button>
        </div>
      </div>
    </div>
  );
}
