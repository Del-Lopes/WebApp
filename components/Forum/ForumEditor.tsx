import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button, FieldMessage, Textarea } from '../ui';
import {
  FORUM_TEXT_MAX, MAX_IMAGES_PER_POST, forumImageErrorMessage, forumImagesEnabled, imageUrl, uploadForumImage,
} from '../../lib/forumImages';

interface Props {
  id: string;
  text: string;
  images: string[];
  onTextChange: (text: string) => void;
  onImagesChange: (images: string[]) => void;
  /** true enquanto há imagem sendo enviada (o pai bloqueia o envio do post). */
  onBusyChange?: (busy: boolean) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

// Caixa de mensagem do Fórum: texto + imagens (Ctrl+V, arrastar ou botão).
export const ForumEditor: React.FC<Props> = ({
  id, text, images, onTextChange, onImagesChange, onBusyChange, placeholder, ariaLabel, className,
}) => {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Uploads simultâneos terminam antes de o pai re-renderizar: o ref evita perder uma imagem.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const pendingRef = useRef(0);

  useEffect(() => { onBusyChange?.(pending > 0); }, [pending, onBusyChange]);

  const addFiles = async (files: File[]) => {
    const list = files.filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setError(null);
    for (const file of list) {
      if (imagesRef.current.length + pendingRef.current >= MAX_IMAGES_PER_POST) {
        setError(`Máximo de ${MAX_IMAGES_PER_POST} imagens por mensagem.`);
        break;
      }
      pendingRef.current += 1;
      setPending(pendingRef.current);
      try {
        const key = await uploadForumImage(file);
        imagesRef.current = [...imagesRef.current, key];
        onImagesChange(imagesRef.current);
      } catch (err) {
        console.error('[Forum] imagem', err);
        setError(forumImageErrorMessage(err));
      } finally {
        pendingRef.current -= 1;
        setPending(pendingRef.current);
      }
    }
  };

  const removeImage = (key: string) => {
    imagesRef.current = imagesRef.current.filter((k) => k !== key);
    onImagesChange(imagesRef.current);
  };

  // Ctrl+V: só intercepta quando a área de transferência tem imagem; texto cola normal.
  const onPaste = (e: React.ClipboardEvent) => {
    if (!forumImagesEnabled) return;
    const files = Array.from<File>(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    void addFiles(files);
  };

  const onDrop = (e: React.DragEvent) => {
    if (!forumImagesEnabled) return;
    const files = Array.from<File>(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault();
    void addFiles(files);
  };

  return (
    <div className="space-y-2">
      <Textarea
        id={id}
        value={text}
        maxLength={FORUM_TEXT_MAX}
        onChange={(e) => onTextChange(e.target.value)}
        onPaste={onPaste}
        onDrop={onDrop}
        onDragOver={(e) => { if (forumImagesEnabled) e.preventDefault(); }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={className}
      />

      {forumImagesEnabled && (
        <>
          {(images.length > 0 || pending > 0) && (
            <ul className="flex flex-wrap gap-2">
              {images.map((key) => (
                <li key={key} className="relative h-20 w-28 overflow-hidden rounded-lg border border-tint/10 bg-tint/3">
                  <img src={imageUrl(key)} alt="Imagem anexada" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(key)}
                    aria-label="Remover imagem"
                    className="absolute right-1 top-1 rounded-full bg-page/80 p-1 text-fg hover:bg-page focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
              {Array.from({ length: pending }).map((_, i) => (
                <li key={`p-${i}`} className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed border-tint/15 bg-tint/3 text-fg-subtle">
                  <Loader2 size={18} className="animate-spin" aria-label="Enviando imagem" />
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={images.length + pending >= MAX_IMAGES_PER_POST}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus size={15} /> Anexar imagem
            </Button>
            <span className="text-xs text-fg-subtle">ou cole um print com Ctrl+V · até {MAX_IMAGES_PER_POST} imagens</span>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(Array.from<File>(e.target.files ?? []));
                e.target.value = '';
              }}
            />
          </div>
          {error && <FieldMessage error>{error}</FieldMessage>}
        </>
      )}
    </div>
  );
};
