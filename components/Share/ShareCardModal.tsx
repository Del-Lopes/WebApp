import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, ImageDown, Loader2, Share2 } from 'lucide-react';
import { Button, FieldMessage, Modal, Tabs } from '../ui';
import { CardSpec, RenderInfo, ShareFormat, canShareFiles, renderShareCard } from '../../lib/shareCard';

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  /** Monta o card; `showValues` vem do interruptor de privacidade. */
  build: (opts: { showValues: boolean; showMedia: boolean }) => CardSpec;
  /** Texto que acompanha a imagem na hora de postar. */
  caption: string;
  /** Mostra o interruptor "Mostrar valores em R$" (para cards com dinheiro). */
  canHideValues?: boolean;
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
  open, onClose, build, caption, canHideValues, canToggleMedia, title = 'Compartilhar card', fileName = 'trader-afk',
}) => {
  const [format, setFormat] = useState<ShareFormat>('feed');
  const [showValues, setShowValues] = useState(true);
  const [showMedia, setShowMedia] = useState(true);
  const [mediaWarn, setMediaWarn] = useState<string | null>(null);
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
    const info: RenderInfo = { mediaRequested: 0, mediaLoaded: 0 };
    renderShareCard(buildRef.current({ showValues, showMedia }), format, info)
      .then((b) => {
        if (!alive) return;
        setMediaWarn(info.mediaRequested > info.mediaLoaded
          ? `${info.mediaRequested - info.mediaLoaded} de ${info.mediaRequested} print(s) não puderam entrar no card: o servidor das imagens precisa permitir o acesso do app (CORS). Os demais dados do card foram gerados normalmente.`
          : null);
        setBlob(b);
        setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(b); });
      })
      .catch((e) => { console.error('[share] render', e); if (alive) setError('Não foi possível gerar a imagem.'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [open, format, showValues, showMedia]);

  useEffect(() => {
    if (open) return;
    setBlob(null);
    setUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setNote(null); setError(null);
  }, [open]);

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
                Mostrar valores em R$
              </label>
            )}
          </div>
        </div>

        <div className="flex min-h-48 items-center justify-center rounded-xl border border-tint/10 bg-tint/3 p-3">
          {busy && !url ? (
            <Loader2 className="animate-spin text-fg-subtle" size={28} />
          ) : url ? (
            <img src={url} alt="Prévia do card" className={`max-h-[52vh] w-auto max-w-full rounded-lg ${busy ? 'opacity-60' : ''}`} />
          ) : null}
        </div>

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
