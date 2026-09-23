import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Loader2, AlertTriangle, Upload, Star, Image as ImageIcon, Trash2,
} from 'lucide-react';
import {
  EMOTIONAL_TAGS,
  type TradeEntry,
  type TradeInput,
  type TradeSide,
} from '../../hooks/useTradeJournal';

interface TradeEditorProps {
  entry: TradeEntry | null;
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

export function TradeEditor({ entry, onClose, onSave, onUploadScreenshot }: TradeEditorProps) {
  const isEditing = !!entry;

  // Operação
  const [asset, setAsset] = useState(entry?.asset ?? '');
  const [side, setSide] = useState<TradeSide>(entry?.side ?? 'buy');
  const [volume, setVolume] = useState<string>(entry ? String(entry.volume) : '');
  const [entryPrice, setEntryPrice] = useState<string>(entry?.entry_price != null ? String(entry.entry_price) : '');
  const [exitPrice, setExitPrice] = useState<string>(entry?.exit_price != null ? String(entry.exit_price) : '');
  const [openedAt, setOpenedAt] = useState<string>(toLocalInput(entry?.opened_at) || toLocalInput(new Date().toISOString()));
  const [closedAt, setClosedAt] = useState<string>(toLocalInput(entry?.closed_at));

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

  // Calcula pips automaticamente quando há entrada e saída
  const computedPips = useMemo(() => {
    const e = parseFloat(entryPrice);
    const x = parseFloat(exitPrice);
    if (!Number.isFinite(e) || !Number.isFinite(x)) return null;
    const sign = side === 'buy' ? 1 : -1;
    return sign * (x - e);
  }, [entryPrice, exitPrice, side]);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setUploadError(null);
    try {
      const url = await onUploadScreenshot(file);
      setScreenshotUrl(url);
    } catch (err: any) {
      setUploadError(err?.message ?? 'Falha ao enviar imagem.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!asset.trim()) { setError('Informe o ativo (par).'); return; }
    const volNum = parseFloat(volume);
    if (!Number.isFinite(volNum) || volNum <= 0) { setError('Volume precisa ser maior que zero.'); return; }
    const openedIso = fromLocalInput(openedAt);
    if (!openedIso) { setError('Informe a data/hora de abertura.'); return; }
    const closedIso = closedAt ? fromLocalInput(closedAt) : null;
    if (closedAt && !closedIso) { setError('Data/hora de fechamento inválida.'); return; }
    if (closedIso && new Date(closedIso) < new Date(openedIso)) {
      setError('Fechamento não pode ser antes da abertura.');
      return;
    }

    const input: TradeInput = {
      asset: asset.trim(),
      side,
      volume: volNum,
      entry_price: entryPrice ? parseFloat(entryPrice) : null,
      exit_price: exitPrice ? parseFloat(exitPrice) : null,
      opened_at: openedIso,
      closed_at: closedIso,
      result_amount: resultAmount ? parseFloat(resultAmount) : null,
      // Se há preço entrada+saída, usa o cálculo. Senão, usa o que o usuário digitou.
      result_pips: computedPips !== null
        ? Number(computedPips.toFixed(4))
        : (resultPipsManual ? parseFloat(resultPipsManual) : null),
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-lg">
            {isEditing ? 'Editar operação' : 'Nova operação'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {/* Operação */}
          <Section title="Operação">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Ativo">
                <input
                  type="text"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value.toUpperCase())}
                  placeholder="EURUSD, WIN, BTC…"
                  maxLength={30}
                  className={inputClass}
                />
              </Field>
              <Field label="Tipo">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSide('buy')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      side === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Compra
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('sell')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      side === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Venda
                  </button>
                </div>
              </Field>
              <Field label="Volume / Lote">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="0.10"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <Field label="Preço de entrada (opcional)">
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="1.08234"
                  className={inputClass}
                />
              </Field>
              <Field label="Preço de saída (opcional)">
                <input
                  type="number"
                  step="any"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="1.08512"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <Field label="Abertura">
                <input
                  type="datetime-local"
                  value={openedAt}
                  onChange={(e) => setOpenedAt(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Fechamento (opcional)">
                <input
                  type="datetime-local"
                  value={closedAt}
                  onChange={(e) => setClosedAt(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          {/* Resultado */}
          <Section title="Resultado">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Resultado em moeda (R$/$)">
                <input
                  type="number"
                  step="0.01"
                  value={resultAmount}
                  onChange={(e) => setResultAmount(e.target.value)}
                  placeholder="Use sinal negativo para prejuízo"
                  className={inputClass}
                />
              </Field>
              <Field label={computedPips !== null ? 'Pips/pontos (calculado)' : 'Pips/pontos (opcional)'}>
                {computedPips !== null ? (
                  <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm tabular-nums text-slate-700">
                    {computedPips.toFixed(4)}
                  </div>
                ) : (
                  <input
                    type="number"
                    step="any"
                    value={resultPipsManual}
                    onChange={(e) => setResultPipsManual(e.target.value)}
                    placeholder="Preencha se quiser"
                    className={inputClass}
                  />
                )}
              </Field>
            </div>
          </Section>

          {/* Reflexão */}
          <Section title="Reflexão">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Motivo da entrada">
                <textarea
                  value={entryReason}
                  onChange={(e) => setEntryReason(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Por que entrou? Setup, sinal, contexto…"
                  className={inputClass}
                />
              </Field>
              <Field label="Motivo da saída">
                <textarea
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Por que saiu? Stop, alvo, decisão manual…"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Análise">
              <textarea
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                rows={3}
                maxLength={4000}
                placeholder="Como você lê esse trade tecnicamente? O que estava acontecendo no mercado?"
                className={inputClass}
              />
            </Field>

            <Field label="Como se sentiu durante a operação">
              <div className="flex flex-wrap gap-2 mb-2">
                {EMOTIONAL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      emotionalTags.includes(tag)
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                value={emotionalNote}
                onChange={(e) => setEmotionalNote(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Comentário sobre o emocional (opcional)"
                className={inputClass}
              />
            </Field>

            <Field label="Avaliação da operação">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? null : n)}
                    className="p-1"
                    aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={24}
                      className={
                        rating !== null && n <= rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }
                    />
                  </button>
                ))}
                {rating !== null && (
                  <button
                    type="button"
                    onClick={() => setRating(null)}
                    className="ml-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    limpar
                  </button>
                )}
              </div>
            </Field>

            <Field label="Conclusão / aprendizado">
              <textarea
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="O que esse trade te ensinou? O que faria diferente?"
                className={inputClass}
              />
            </Field>
          </Section>

          {/* Screenshot */}
          <Section title="Screenshot do gráfico (opcional)">
            {screenshotUrl ? (
              <div className="relative inline-block">
                <img
                  src={screenshotUrl}
                  alt="Screenshot da operação"
                  className="max-h-64 rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setScreenshotUrl(null)}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700"
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
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-600 hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  {uploadingFile ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  {uploadingFile ? 'Enviando...' : 'Enviar imagem (até 5MB)'}
                </button>
                {uploadError && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-red-50 text-red-700 text-xs">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            )}
          </Section>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
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
            disabled={saving || uploadingFile}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            {isEditing ? 'Salvar alterações' : 'Registrar operação'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:border-transparent';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
