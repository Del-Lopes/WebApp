import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, FieldMessage, Input, Label, Modal, Select, Textarea } from '../ui';
import type { TradeEntry } from '../../hooks/useTradeJournal';
import { ForumCategory, createTopic, fetchCategories } from '../../lib/forum';
import { buildTradeTopicBody, defaultTopicTitle, forumEligibleShots } from '../../lib/forumTrade';
import { currencySymbol } from '../../lib/journalCalendar';
import { splitBody, imageUrl } from '../../lib/forumImages';

interface Props {
  entry: TradeEntry;
  onClose: () => void;
  /** Leva ao Fórum depois de publicar. */
  onOpenForum?: () => void;
}

const Check: React.FC<{ checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; hint?: string }> = ({ checked, onChange, children, hint }) => (
  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-fg">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
    <span>{children}{hint && <span className="block text-xs text-fg-subtle">{hint}</span>}</span>
  </label>
);

// Publica uma operação do Diário como tópico do Fórum, para abrir uma discussão sobre ela.
export const ShareToForumModal: React.FC<Props> = ({ entry, onClose, onOpenForum }) => {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState(() => defaultTopicTitle(entry));
  const [message, setMessage] = useState('');
  const [values, setValues] = useState(false);
  const [reflection, setReflection] = useState(true);
  const [emotional, setEmotional] = useState(false);
  const [images, setImages] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const shots = useMemo(() => forumEligibleShots(entry), [entry]);
  const hasReflection = !!(entry.entry_reason || entry.exit_reason || entry.analysis || entry.conclusion);
  const hasEmotional = !!(entry.emotional_tags?.length || entry.emotional_note || entry.rating != null);

  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then((c) => { if (!alive) return; setCategories(c); setCategoryId((id) => id || c[0]?.id || ''); })
      .catch(() => { if (alive) setError('Não foi possível carregar as categorias do Fórum.'); });
    return () => { alive = false; };
  }, []);

  const body = useMemo(
    () => buildTradeTopicBody(entry, { message, values, reflection, emotional, images: images && shots.keys.length > 0 }),
    [entry, message, values, reflection, emotional, images, shots.keys.length],
  );
  const preview = useMemo(() => splitBody(body), [body]);
  const valid = !!categoryId && title.trim().length >= 3 && !saving;

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createTopic(categoryId, title, body);
      setDone(true);
    } catch (err) {
      console.error('[Journal] compartilhar no fórum', err);
      setError('Não foi possível publicar o tópico. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Discutir esta operação no Fórum"
      description="Publica a operação como um tópico para a comunidade comentar."
      size="lg"
      closeOnOverlay={false}
      footer={done ? (
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          {onOpenForum && <Button onClick={onOpenForum}>Ver no Fórum</Button>}
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="journal-forum-share" isLoading={saving} disabled={!valid}>Publicar no Fórum</Button>
        </>
      )}
    >
      {done ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 size={36} className="text-success-fg" aria-hidden />
          <p className="font-display text-lg font-semibold text-fg">Tópico publicado!</p>
          <p className="max-w-sm text-sm text-fg-muted">Sua operação já está no Fórum. As respostas aparecem lá, no próprio tópico.</p>
        </div>
      ) : (
        <form id="journal-forum-share" onSubmit={publish} className="space-y-4">
          <div>
            <Label htmlFor="jf-cat">Categoria</Label>
            <Select id="jf-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="jf-title" hint={`${title.length}/140`}>Título</Label>
            <Input id="jf-title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="jf-msg">O que você quer discutir? (opcional)</Label>
            <Textarea id="jf-msg" value={message} maxLength={1500} onChange={(e) => setMessage(e.target.value)} className="min-h-24"
              placeholder="Ex.: Entrei no rompimento, mas o preço voltou. Vocês teriam esperado o reteste?" />
          </div>

          <fieldset className="space-y-2.5 rounded-xl border border-tint/8 bg-tint/2 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">O que compartilhar</legend>
            <Check checked={values} onChange={setValues} hint="Resultado e preços de entrada e saída. Desligado, só aparecem ativo, direção, volume e pips.">
              Valores em {currencySymbol()}
            </Check>
            {hasReflection && <Check checked={reflection} onChange={setReflection}>Motivos de entrada e saída, análise e aprendizado</Check>}
            {hasEmotional && <Check checked={emotional} onChange={setEmotional}>Estado emocional e nota da operação</Check>}
            {shots.keys.length > 0 && (
              <Check checked={images} onChange={setImages}>
                Prints do gráfico ({shots.keys.length})
              </Check>
            )}
            {shots.skipped > 0 && (
              <p className="text-xs text-fg-subtle">
                {shots.skipped} {shots.skipped === 1 ? 'print não pode' : 'prints não podem'} ir para o Fórum (enviado{shots.skipped === 1 ? '' : 's'} antes do armazenamento atual). Reenvie na operação, se quiser incluir.
              </p>
            )}
          </fieldset>

          <div>
            <p className="eyebrow-muted mb-1.5">Como vai aparecer</p>
            <div className="rounded-xl border border-tint/8 bg-surface p-3">
              <p className="font-display text-sm font-semibold text-fg">{title || '—'}</p>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg-muted">{preview.text}</p>
              {preview.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {preview.images.map((k) => (
                    <img key={k} src={imageUrl(k)} alt="Print da operação" className="h-20 w-28 rounded-lg border border-tint/10 object-cover" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <FieldMessage error>{error}</FieldMessage>}
        </form>
      )}
    </Modal>
  );
};
