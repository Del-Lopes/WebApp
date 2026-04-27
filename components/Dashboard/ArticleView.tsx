import React, { useState, useEffect, useRef } from 'react';
import { Calendar, User, Clock, X } from 'lucide-react';
import { Article } from '../../types';
import { BackButton } from '../BackButton';

interface ArticleViewProps {
  article: Article;
  onBack: () => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ article, onBack }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

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

      <article className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
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
                 <span className="inline-block px-3 py-1 bg-green-500 text-xs font-bold rounded-full shadow-lg">
                   {article.category || 'Geral'}
                 </span>
               </div>
               <h1 className="text-3xl md:text-4xl font-bold leading-tight shadow-sm text-shadow-sm">
                 {article.title}
               </h1>
            </div>
          </div>
        )}

        <div className="p-6 md:p-10">
          {!article.image_url && (
             <div className="mb-8 border-b border-slate-100 pb-8">
               <div className="flex items-center gap-2 mb-3">
                 <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                   {article.category || 'Geral'}
                 </span>
               </div>
               <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                 {article.title}
               </h1>
             </div>
          )}

          <div className="flex items-center gap-6 text-sm text-slate-500 mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-green-600" />
              <span>{new Date(article.created_at || Date.now()).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} className="text-green-600" />
              <span>Equipe Trader AFK</span>
            </div>
             <div className="flex items-center gap-2">
              <Clock size={16} className="text-green-600" />
              <span>5 min de leitura</span>
            </div>
          </div>

          <div
            ref={contentRef}
            className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-900 prose-a:text-green-600 hover:prose-a:text-green-700 prose-img:rounded-xl prose-img:shadow-md prose-img:mx-auto"
            dangerouslySetInnerHTML={
              article.content
                ? { __html: article.content }
                : { __html: '<p class="text-slate-500 italic">Conteúdo indisponível.</p>' }
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
             className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:rotate-90 duration-300"
           >
             <X size={28} />
           </button>
           
           <div className="relative max-w-5xl w-full flex items-center justify-center">
             <img 
               src={lightboxImage} 
               alt="Full size" 
               className="max-w-full max-h-[92vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-90 duration-300 ease-out"
               onClick={(e) => e.stopPropagation()}
             />
           </div>
        </div>
      )}
    </div>
  );
};

