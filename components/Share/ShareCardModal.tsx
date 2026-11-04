import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, ImageDown, Loader2, Share2 } from 'lucide-react';
import { Button, FieldMessage, Modal, Tabs } from '../ui';
import { CardSpec, MediaFrame, MediaRect, RenderInfo, ShareFormat, SIZES, canShareFiles, renderShareCard } from '../../lib/shareCard';

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  /** Monta o card; `showValues` vem do interruptor de privacidade. */
  build: (opts: { showValues: boolean; showMedia: boolean; frames: Record<number, MediaFrame> }) => CardSpec;
  /** Texto que acompanha a imagem na hora de postar. */
  caption: string;
  /** Mostra o interruptor "Mostrar valores em R$" (para cards com dinheiro). */
  canHideValues?: boolean;
  /** Texto do interruptor de valores (padrão: "Mostrar valores em R$"). */
  valuesLabel?: string;
  /** Mostra o interruptor "Incluir prints do trade" (para cards com imagens anexadas). */
  canToggleMedia?: boolean;
  title?: string;
  fileName?: string;
}

/** Botão padrão de compartilhar, para usar nas telas. */
export const ShareButton: React.FC<{
  onClick: () => void; label?: string; size?: 'sm' | 'md'; variant?: 'secondary' | 'ghost' | 'outline';
}> = ({ onClick, label = 'Compartilhar', size = 'sm', variant = 'secondary' }) => (
  <Button variant={variant} size={size} onClick={onClick}>
    <Share2 size={14} /> {label}
  </Button>
);

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  open, onClose, build, caption, canHideValues, valuesLabel = 'Mostrar valores em R$', canToggleMedia, title = 'Compartilhar card', fileName = 'trader-afk',
}) => {
  const [format, setFormat] = useState<ShareFormat>('feed');
  const [showValues, setShowValues] = useState(true);
  const [showMedia, setShowMedia] = useState(true);
  const [mediaWarn, setMediaWarn] = useState<string | null>(null);
  // Reenquadramento dos prints: enquadramento de cada um, qual está em edição e onde cada um foi desenhado.
  const [frames, setFrames] = useState<Record<number, MediaFrame>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [rects, setRects] = useState<MediaRect[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // `build` costuma ser uma arrow inline: guardado em ref para não re-renderizar o card a cada render do pai.
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setBusy(true); setError(null); setNote(null);
    const info: RenderInfo = { mediaRequested: 0, mediaLoaded: 0, mediaRects: [] };
    // Durante o arraste, espera um instante para não redesenhar a cada pixel.
    const timer = window.setTimeout(() => {
      renderShareCard(buildRef.current({ showValues, showMedia, frames }), format, info)
      .then((b) => {
        if (!alive) return;
        setRects(info.mediaRects);
        setMediaWarn(info.mediaRequested > info.mediaLoaded
          ? `${info.mediaRequested - info.mediaLoaded} de ${info.mediaRequested} print(s) não puderam entrar no card: o servidor das imagens precisa permitir o acesso do app (CORS). Os demais dados do card foram gerados normalmente.`
          : null);
        setBlob(b);
        setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(b); });
      })
      .catch((e) => { console.error('[share] render', e); if (alive) setError('Não foi possível gerar a imagem.'); })
      .finally(() => { if (alive) setBusy(false); });
    }, editing !== null ? 40 : 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [open, format, showValues, showMedia, frames, editing]);

  useEffect(() => {
    if (open) return;
    setBlob(null);
    setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setNote(null); setError(null);
    setEditing(null); setFrames({}); setRects([]);
  }, [open]);

  // ── Reenquadrar um print: dois cliques nele, arrastar para mover, controle de zoom ──
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const canvasScale = () => {
    const r = imgRef.current?.getBoundingClientRect();
    const { w, h } = SIZES[format];
    return r && r.width > 0 ? { r, w, h, sx: w / r.width, sy: h / r.height } : null;
  };
  const onPreviewDouble = (e: React.MouseEvent) => {
    const c = canvasScale();
    if (!c || rects.length === 0) return;
    const px = (e.clientX - c.r.left) * c.sx, py = (e.clientY - c.r.top) * c.sy;
    const hit = rects.find((q) => px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h);
    if (hit) setEditing(hit.idx);
  };
  const onPreviewDown = (e: React.PointerEvent) => {
    if (editing === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPreviewMove = (e: React.PointerEvent) => {
    if (editing === null || !drag.current) return;
    const c = canvasScale();
    const q = rects.find((r) => r.idx === editing);
    if (!c || !q) return;
    const dx = (e.clientX - drag.current.x) * c.sx, dy = (e.clientY - drag.current.y) * c.sy;
    drag.current = { x: e.clientX, y: e.clientY };
    // Arrastar a imagem para a direita mostra mais do lado esquerdo: o foco anda no sentido contrário.
    setFrames((f) => {
      const cur = f[editing] ?? { x: 0.5, y: 0.5, z: 1 };
      return { ...f, [editing]: { ...cur, x: q.exX > 0 ? clamp01(cur.x - dx / q.exX) : cur.x, y: q.exY > 0 ? clamp01(cur.y - dy / q.exY) : cur.y } };
    });
  };
  const onPreviewUp = () => { drag.current = null; };
  const setZoom = (z: number) => {
    if (editing === null) return;
    setFrames((f) => ({ ...f, [editing]: { ...(f[editing] ?? { x: 0.5, y: 0.5, z: 1 }), z } }));
  };
  const editRect = editing !== null ? rects.find((r) => r.idx === editing) : undefined;
  const size = SIZES[format];

  const fileOf = (b: Blob) => new File([b], `${fileName}.png`, { type: 'image/png' });

  const download = () => {
    if (!blob || !url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `${fileName}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const share = async () => {
    if (!blob) return;
    setNote(null); setError(null);
    const file = fileOf(blob);
    if (canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], text: caption, title: 'Trader AFK' });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError('Não foi possível abrir o compartilhamento. Baixe a imagem e poste manualmente.');
      }
      return;
    }
    // Navegador sem compartilhamento de arquivo (a maioria dos desktops).
    download();
    setNote('Imagem baixada. Agora é só postar nas suas redes e colar a legenda.');
  };

  const copyImage = async () => {
    if (!blob) return;
    setNote(null); setError(null);
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setNote('Imagem copiada. Cole (Ctrl+V) no post.');
    } catch {
      setError('Seu navegador não permite copiar a imagem. Use "Baixar".');
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar a legenda.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg"
      description="Gere uma imagem pronta para postar nas suas redes sociais.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs<ShareFormat>
            aria-label="Formato do card"
            value={format}
            onChange={setFormat}
            items={[{ key: 'feed', label: 'Feed 4:5' }, { key: 'story', label: 'Story 9:16' }]}
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {canToggleMedia && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={showMedia} onChange={(e) => setShowMedia(e.target.checked)} className="h-4 w-4 accent-accent" />
                Incluir prints do trade
              </label>
            )}
            {canHideValues && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} className="h-4 w-4 accent-accent" />
                {valuesLabel}
              </label>
            )}
          </div>
        </div>

        <div className="flex min-h-48 items-center justify-center rounded-xl border border-tint/10 bg-tint/3 p-3">
          {busy && !url ? (
            <Loader2 className="animate-spin text-fg-subtle" size={28} />
          ) : url ? (
            <div className="relative inline-flex max-w-full">
              <img
                ref={imgRef}
                src={url}
                alt="Prévia do card"
                draggable={false}
                onDoubleClick={onPreviewDouble}
                onPointerDown={onPreviewDown}
                onPointerMove={onPreviewMove}
                onPointerUp={onPreviewUp}
                onPointerCancel={onPreviewUp}
                style={{ touchAction: editing !== null ? 'none' : 'manipulation' }}
                className={`max-h-[52vh] w-auto max-w-full select-none rounded-lg ${busy && editing === null ? 'opacity-60' : ''} ${editing !== null ? 'cursor-grab active:cursor-grabbing' : rects.length > 0 ? 'cursor-zoom-in' : ''}`}
              />
              {editRect && (
                <div
                  className="pointer-events-none absolute rounded-md border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                  style={{ left: `${(editRect.x / size.w) * 100}%`, top: `${(editRect.y / size.h) * 100}%`, width: `${(editRect.w / size.w) * 100}%`, height: `${(editRect.h / size.h) * 100}%` }}
                />
              )}
            </div>
          ) : null}
        </div>

        {editing !== null ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5">
            <p className="text-sm text-fg"><strong>Reenquadrando o print {editing + 1}.</strong> Arraste a imagem para o lado que quiser mostrar.</p>
            <label className="flex flex-1 items-center gap-2 text-xs text-fg-muted" style={{ minWidth: 160 }}>
              Zoom
              <input type="range" min={1} max={3} step={0.05} value={frames[editing]?.z ?? 1} onChange={(e) => setZoom(+e.target.value)} className="min-w-0 flex-1 accent-accent" />
              <span className="w-10 text-right font-mono tabular-nums text-fg">{((frames[editing]?.z ?? 1) * 100).toFixed(0)}%</span>
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setFrames((f) => { const n = { ...f }; delete n[editing]; return n; })}>Redefinir</Button>
              <Button size="sm" onClick={() => setEditing(null)}>Concluir</Button>
            </div>
          </div>
        ) : rects.length > 0 ? (
          <p className="text-center text-xs text-fg-subtle">Dê dois cliques em um print para reenquadrar: arraste a imagem e ajuste o zoom antes de postar.</p>
        ) : null}

        {mediaWarn && <FieldMessage error>{mediaWarn}</FieldMessage>}
        {error && <FieldMessage error>{error}</FieldMessage>}
        {note && <FieldMessage>{note}</FieldMessage>}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void share()} disabled={!blob || busy}><Share2 size={16} /> Compartilhar</Button>
          <Button variant="secondary" onClick={download} disabled={!blob || busy}><Download size={16} /> Baixar</Button>
          <Button variant="secondary" onClick={() => void copyImage()} disabled={!blob || busy}><ImageDown size={16} /> Copiar imagem</Button>
          <Button variant="ghost" onClick={() => void copyCaption()}>
            {copied ? <><Check size={16} /> Legenda copiada</> : <><Copy size={16} /> Copiar legenda</>}
          </Button>
        </div>
        <p className="rounded-lg border border-tint/8 bg-tint/2 px-3 py-2 text-xs text-fg-muted whitespace-pre-wrap">{caption}</p>
      </div>
    </Modal>
  );
};
