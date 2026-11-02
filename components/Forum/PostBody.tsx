import React from 'react';
import { forumImagesEnabled, imageUrl, splitBody } from '../../lib/forumImages';

// Corpo de um tópico/resposta: texto + imagens anexadas (marcadores [img:...]).
// A URL é montada a partir do domínio do bucket e de uma chave validada, então
// o post não consegue carregar imagem de outro endereço.
export const PostBody: React.FC<{ body: string }> = ({ body }) => {
  const { text, images } = splitBody(body);

  return (
    <div className="mt-2 space-y-3">
      {text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg-muted">{text}</p>}
      {forumImagesEnabled && images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((key) => (
            <a key={key} href={imageUrl(key)} target="_blank" rel="noopener noreferrer" className="block rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
              <img
                src={imageUrl(key)}
                alt="Imagem anexada ao post"
                loading="lazy"
                decoding="async"
                className="max-h-80 max-w-full rounded-lg border border-tint/10 object-contain"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
