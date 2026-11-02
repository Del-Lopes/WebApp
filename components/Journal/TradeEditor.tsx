import React, { useEffect, useRef, useState } from 'react';
import {
  X, Loader2, AlertTriangle, Upload, Star, Image as ImageIcon, Trash2,
} from 'lucide-react';
import {
  EMOTIONAL_TAGS,
  type TradeEntry,
  type TradeInput,
  type TradeSide,
} from '../../hooks/useTradeJournal';
import { Button, Input, Textarea } from '../ui';
import { forumImageErrorMessage, forumImagesEnabled, uploadForumImage } from '../../lib/forumImages';
import { journalImageSrc } from '../../lib/journalImages';

interface TradeEditorProps {
  entry: TradeEntry | null;
  /** Data/hora inicial de uma operação nova (ex.: o dia escolhido no calendário). */
  defaultOpenedAt?: string;
  onClose: () => void;
  onSave: (input: TradeInput) => Promise<{ ok: boolean; error?: string }>;
  onUploadScreenshot: (file: File) => Promise<string>;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  // YYYY-MM-DDTHH:MM no horário local
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function TradeEditor({ entry, defaultOpenedAt, onClose, onSave, onUploadScreenshot }: TradeEditorProps) {
  const isEditing = !!entry;

  // Operação
  const [asset, setAsset] = useState(entry?.asset ?? '');
  const [side, setSide] = useState<TradeSide>(entry?.side ?? 'buy');
  const [volume, setVolume] = useState<string>(entry ? String(entry.volume) : '');
  // Preços e horários saíram do formulário: uma operação nova abre agora (ou no dia
  // escolhido no calendário) e, com resultado informado, conta como fechada nesse dia.
  // Em edição, o que já estava salvo é preservado.
  const openedAt = toLocalInput(entry?.opened_at) || toLocalInput(defaultOpenedAt ?? new Date().toISOString());
  const closedAt = toLocalInput(entry?.closed_at);

  // Resultado
  const [resultAmount, setResultAmount] = useState<string>(entry?.result_amount != null ? String(entry.result_amount) : '');
  const [resultPipsManual, setResultPipsManual] = useState<string>(entry?.result_pips != null ? String(entry.result_pips) : '');

  // Reflexão
  const [entryReason, setEntryReason] = useState(entry?.entry_reason ?? '');
  const [exitReason, setExitReason] = useState(entry?.exit_reason ?? '');
  const [analysis, setAnalysis] = useState(entry?.analysis ?? '');
  const [emotionalTags, setEmotionalTags] = useState<string[]>(entry?.emotional_tags ?? []);
  const [emotionalNote, setEmotionalNote] = useState(entry?.emotional_note ?? '');
  const [rating, setRating] = useState<number | null>(entry?.rating ?? null);
  const [conclusion, setConclusion] = useState(entry?.conclusion ?? '');

  // Screenshot
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(entry?.screenshot_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleTag = (tag: string) => {
    setEmotionalTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingFile(true);
    setUploadError(null);
    try {
      // Novo storage (R2); se não estiver configurado, cai no upload antigo.
      const value = forumImagesEnabled ? await uploadForumImage(file) : await onUploadScreenshot(file);
      setScreenshotUrl(value);
    } catch (err: any) {
      setUploadError(forumImagesEnabled ? forumImageErrorMessage(err) : (err?.message ?? 'Falha ao enviar imagem.'));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadImage(file);
  };

  // Ctrl+V em qualquer ponto do formulário: só intercepta se a área de transferência tiver imagem.
  const onPaste = (e: React.ClipboardEvent) => {
    const file = Array.from<File>(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    void uploadImage(file);
  };

  const onDrop = (e: React.DragEvent) => {
    const file = Array.from<File>(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    void uploadImage(file);
  };

  const handleSave = async () => {
    setError(null);

    if (!asset.trim()) { setError('Informe o ativo (par).'); return; }
    const volNum = parseFloat(volume);
    if (!Number.isFinite(volNum) || volNum <= 0) { setError('Volume precisa ser maior que zero.'); return; }
    const openedIso = fromLocalInput(openedAt);
    if (!openedIso) { setError('Informe a data/hora de abertura.'); return; }
    const resultNum = resultAmount.trim() ? parseFloat(resultAmount) : null;
    if (resultNum !== null && !Number.isFinite(resultNum)) { setError('Resultado inválido.'); return; }
    // Com resultado, a operação fecha no mesmo dia em que abriu (a menos que já tivesse fechamento).
    const closedIso = closedAt ? fromLocalInput(closedAt) : (resultNum !== null ? openedIso : null);

    const input: TradeInput = {
      asset: asset.trim(),
      side,
      volume: volNum,
      entry_price: entry?.entry_price ?? null,
      exit_price: entry?.exit_price ?? null,
      opened_at: openedIso,
      closed_at: closedIso,
      result_amount: resultNum,
      result_pips: resultPipsManual ? parseFloat(resultPipsManual) : null,
      entry_reason: entryReason,
      exit_reason: exitReason,
      analysis,
      emotional_tags: emotionalTags,
      emotional_note: emotionalNote,
      rating,
      conclusion,
      screenshot_url: screenshotUrl,
    };

    setSaving(true);
    const result = await onSave(input);
    setSaving(false);
    if (!result.ok) setError(result.error ?? 'Falha ao salvar.');
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div
        onPaste={onPaste}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative overflow-hidden bg-surface text-fg border border-tint/10 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[92dvh] flex flex-col"
      >
        <div className="hairline absolute inset-x-0 top-0" aria-hidden />
        <div className="flex items-center justify-between p-5 border-b border-tint/6">
          <h3 className="font-display font-semibold text-fg text-lg">
            {isEditing ? 'Editar operação' : 'Nova operação'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto ds-scrollbar p-5 space-y-6">
          {/* Operação */}
          <Section title="Operação">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Ativo">
                <Input
                  type="text"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value.toUpperCase())}
                  placeholder="EURUSD, WIN, BTC…"
                  maxLength={30}
                />
              </Field>
              <Field label="Tipo">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSide('buy')}
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      side === 'buy'
                        ? 'bg-success/15 border-success/40 text-success-fg'
                        : 'bg-tint/3 border-tint/10 text-fg-muted hover:bg-tint/6 hover:text-fg'
                    }`}
                  >
                    Compra
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('sell')}
                    className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      side === 'sell'
                        ? 'bg-danger/15 border-danger/40 text-danger-fg'
                        : 'bg-tint/3 border-tint/10 text-fg-muted hover:bg-tint/6 hover:text-fg'
                    }`}
                  >
                    Venda
                  </button>
                </div>
              </Field>
              <Field label="Volume / Lote">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="0.10"
                />
              </Field>
            </div>

          </Section>

          {/* Resultado */}
          <Section title="Resultado">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Resultado em moeda (R$/$)">
                <Input
                  type="number"
                  step="0.01"
                  value={resultAmount}
                  onChange={(e) => setResultAmount(e.target.value)}
                  placeholder="Use sinal negativo para prejuízo"
                />
              </Field>
              <Field label="Pips/pontos (opcional)">
                <Input
                  type="number"
                  step="any"
                  value={resultPipsManual}
                  onChange={(e) => setResultPipsManual(e.target.value)}
                  placeholder="Preencha se quiser"
                />
              </Field>
            </div>
          </Section>

          {/* Reflexão */}
          <Section title="Reflexão">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Motivo da entrada">
                <Textarea
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Por que entrou? Setup, sinal, contexto…"
                />
              </Field>
              <Field label="Motivo da saída">
                <Textarea
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Por que saiu? Stop, alvo, decisão manual…"
                />
              </Field>
            </div>

            <Field label="Análise">
              <Textarea
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Como você lê esse trade tecnicamente? O que estava acontecendo no mercado?"
              />
            </Field>

            <Field label="Como se sentiu durante a operação">
              <div className="flex flex-wrap gap-2 mb-2">
                {EMOTIONAL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      emotionalTags.includes(tag)
                        ? 'bg-accent/10 border-accent/40 text-accent-fg'
                        : 'bg-tint/3 border-tint/10 text-fg-muted hover:bg-tint/6 hover:text-fg'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <Textarea
                value={emotionalNote}
                onChange={(e) => setEmotionalNote(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Comentário sobre o emocional (opcional)"
              />
            </Field>

            <Field label="Avaliação da operação">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? null : n)}
                    className="p-1 rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                    aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={24}
                      className={
                        rating !== null && n <= rating
                          ? 'text-warning fill-warning'
                          : 'text-fg-subtle/50'
                      }
                    />
                  </button>
                ))}
                {rating !== null && (
                  <button
                    type="button"
                    onClick={() => setRating(null)}
                    className="ml-2 text-xs text-fg-muted hover:text-fg"
                  >
                    limpar
                  </button>
                )}
              </div>
            </Field>

            <Field label="Conclusão / aprendizado">
              <Textarea
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="O que esse trade te ensinou? O que faria diferente?"
              />
            </Field>
          </Section>

          {/* Screenshot */}
          <Section title="Screenshot do gráfico (opcional)">
            {screenshotUrl ? (
              <div className="relative inline-block">
                <img
                  src={journalImageSrc(screenshotUrl)}
                  alt="Screenshot da operação"
                  className="max-h-64 max-w-full rounded-lg border border-tint/10"
                />
                <button
                  type="button"
                  onClick={() => setScreenshotUrl(null)}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-brand-red text-white hover:brightness-110 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                  aria-label="Remover screenshot"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-tint/15 text-sm text-fg-muted hover:border-accent/60 hover:text-accent-fg hover:bg-accent/5 transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  {uploadingFile ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  {uploadingFile ? 'Enviando...' : 'Enviar imagem'}
                </button>
                <p className="mt-1.5 text-xs text-fg-subtle">ou cole um print com Ctrl+V em qualquer ponto desta janela</p>
                {uploadError && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded-lg border bg-danger/10 border-danger/20 text-danger-fg text-xs">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border bg-danger/10 border-danger/20 text-danger-fg text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-tint/6 bg-tint/2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || uploadingFile}
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            {isEditing ? 'Salvar alterações' : 'Registrar operação'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="eyebrow-muted mb-3">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-fg mb-1.5">{label}</span>
      {children}
    </label>
  );
}
