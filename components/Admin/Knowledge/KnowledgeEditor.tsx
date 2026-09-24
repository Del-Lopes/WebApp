import React, { useEffect, useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import {
  KNOWLEDGE_CATEGORIES,
  type KnowledgeCategory,
  type KnowledgeEntry,
  type KnowledgeInput,
} from '../../../hooks/useKnowledge';
import { Button, Input, Label, Select, Textarea } from '../../ui';

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="relative overflow-hidden bg-surface text-fg border border-tint/10 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        <div className="flex items-center justify-between gap-4 p-5 border-b border-tint/6">
          <h3 className="font-display font-semibold text-fg text-lg">
            {isEditing ? 'Editar entrada' : 'Nova entrada de conhecimento'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto ds-scrollbar p-5 space-y-4">
          <div>
            <Label>Título</Label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              placeholder="Ex: Como ativar uma licença AFK Trader"
            />
            <div className="text-xs text-fg-subtle mt-1 text-right font-mono tabular-nums">{title.length} / {TITLE_MAX}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
              >
                {KNOWLEDGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-tint/10 bg-tint/3 cursor-pointer hover:bg-tint/5 transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded-sm accent-brand-green focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                />
                <span className="text-sm text-fg-muted">Ativo (incluído nas respostas)</span>
              </label>
            </div>
          </div>

          <div>
            <Label>Conteúdo</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={CONTENT_MAX}
              rows={12}
              placeholder="Escreva em texto puro como o bot deve responder. Quanto mais detalhado e específico, melhor.&#10;&#10;Exemplo:&#10;Para ativar uma licença AFK Trader:&#10;1. Acesse a tela Licenças no menu lateral&#10;2. Clique em 'Solicitar nova licença'&#10;3. Informe o número da conta MT5&#10;4. Aguarde aprovação do admin (em até 24h)"
              className="ds-scrollbar font-mono"
            />
            <div className="text-xs text-fg-subtle mt-1 text-right font-mono tabular-nums">{content.length} / {CONTENT_MAX}</div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 text-danger-fg border border-danger/20 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 p-5 border-t border-tint/6">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            {isEditing ? 'Salvar alterações' : 'Criar entrada'}
          </Button>
        </div>
      </div>
    </div>
  );
}
