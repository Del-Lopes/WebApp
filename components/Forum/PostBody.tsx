import React, { useState } from 'react';
import { forumImagesEnabled, imageUrl, splitBody } from '../../lib/forumImages';
import { ImageViewer } from '../ui';

// Corpo de um tópico/resposta: texto + imagens anexadas (marcadores [img:...]).
// A URL é montada a partir do domínio do bucket e de uma chave validada, então
// o post não consegue carregar imagem de outro endereço.
// Clicar numa imagem abre o visualizador de galeria (zoom, arrastar e navegar), sem sair da página.
export const PostBody: React.FC<{ body: string }> = ({ body }) => {
  const { text, images } = splitBody(body);
  const [viewer, setViewer] = useState<number | null>(null);

  return (
    <div className="mt-2 space-y-3">
      {text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg-muted">{text}</p>}
      {forumImagesEnabled && images.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {images.map((key, i) => (
              <button
                key={key}
                type="button"
                onClick={() => setViewer(i)}
                aria-label={`Ampliar imagem ${i + 1} de ${images.length}`}
                className="block cursor-zoom-in rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <img
                  src={imageUrl(key)}
                  alt="Imagem anexada ao post"
                  loading="lazy"
                  decoding="async"
                  className="max-h-80 max-w-full rounded-lg border border-tint/10 object-contain"
                />
              </button>
            ))}
          </div>
          <ImageViewer
            images={images.map(imageUrl)}
            index={viewer}
            onIndexChange={setViewer}
            onClose={() => setViewer(null)}
            label="Imagem do post"
          />
        </>
      )}
    </div>
  );
};
