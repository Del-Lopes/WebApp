import React, { useState, useEffect, useRef, useCallback } from 'react';
import QuickPinchZoom, { make3dTransformValue } from 'react-quick-pinch-zoom';
import { Calendar, User, Clock, X } from 'lucide-react';
import { Article } from '../../types';
import { BackButton } from '../BackButton';
import { Badge } from '../ui';

interface ArticleViewProps {
  article: Article;
  onBack: () => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ article, onBack }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onUpdate = useCallback(({ x, y, scale }: { x: number; y: number; scale: number }) => {
    if (imgRef.current) {
      const value = make3dTransformValue({ x, y, scale });
      imgRef.current.style.setProperty('transform', value);
    }
  }, []);

  const openLightbox = (image: string) => {
    setLightboxImage(image);
    setLightboxOpen(true);
  };

  // Handle clicks on images inside the article content
  useEffect(() => {
    const handleContentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        const imgSrc = (target as HTMLImageElement).src;
        openLightbox(imgSrc);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleContentClick);
      
      // Add cursor-zoom-in to all images in content
      const images = contentElement.querySelectorAll('img');
      images.forEach(img => {
        img.style.cursor = 'zoom-in';
        img.classList.add('hover:opacity-90', 'transition-opacity');
      });
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('click', handleContentClick);
      }
    };
  }, [article.content]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <BackButton onClick={onBack} />

      <article className="glass-card rounded-3xl overflow-hidden">
        {article.image_url && (
          <div className="w-full h-64 md:h-80 relative">
            <img 
              src={article.image_url} 
              alt={article.title} 
              className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-700"
              onClick={() => openLightbox(article.image_url!)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white">
               <div className="flex items-center gap-2 mb-3">
                 <span className="inline-block px-3 py-1 bg-brand-green text-brand-dark text-xs font-semibold rounded-full">
                   {article.category || 'Geral'}
                 </span>
               </div>
               <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-white text-shadow-sm">
                 {article.title}
               </h1>
            </div>
          </div>
        )}

        <div className="p-6 md:p-10">
          {!article.image_url && (
             <div className="mb-8 border-b border-tint/6 pb-8">
               <div className="flex items-center gap-2 mb-3">
                 <Badge tone="accent" className="font-semibold">
                   {article.category || 'Geral'}
                 </Badge>
               </div>
               <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-fg leading-tight">
                 {article.title}
               </h1>
             </div>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-muted mb-8 border-b border-tint/6 pb-6">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-accent-fg" />
              <span>{new Date(article.created_at || Date.now()).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} className="text-accent-fg" />
              <span>Equipe Trader AFK</span>
            </div>
             <div className="flex items-center gap-2">
              <Clock size={16} className="text-accent-fg" />
              <span>5 min de leitura</span>
            </div>
          </div>

          <div
            ref={contentRef}
            className="prose prose-lg max-w-none break-words text-fg-muted leading-relaxed [&_:is(h1,h2,h3,h4)]:font-display [&_:is(h1,h2,h3,h4)]:text-fg [&_strong]:text-fg [&_a]:text-accent-fg [&_a:hover]:underline [&_img]:rounded-xl [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto"
            dangerouslySetInnerHTML={
              article.content
                ? { __html: article.content }
                : { __html: '<p class="text-fg-muted italic">Conteúdo indisponível.</p>' }
            }
          />
        </div>
      </article>

      {/* Lightbox Overlay */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" 
          onClick={() => setLightboxOpen(false)}
        >
           <button 
             onClick={() => setLightboxOpen(false)}
             className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:rotate-90 duration-300 z-[110] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
           >
             <X size={28} />
           </button>
           
           <div className="absolute inset-0 w-full h-full">
             <QuickPinchZoom 
               onUpdate={onUpdate}
               draggableUnZoomed={false}
               enforceBounds={true}
               tapZoomFactor={2}
               maxZoom={5}
             >
               <img 
                 ref={imgRef}
                 src={lightboxImage} 
                 alt="Full size" 
                 className="w-screen h-screen object-contain animate-in zoom-in-90 duration-300"
                 onClick={(e) => e.stopPropagation()}
               />
             </QuickPinchZoom>
           </div>
        </div>
      )}
    </div>
  );
};

