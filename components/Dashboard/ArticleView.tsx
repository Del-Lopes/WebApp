import React, { useState } from 'react';
import { ArrowLeft, Calendar, User, Clock, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Article } from '../../types';

interface ArticleViewProps {
  article: Article;
  onBack: () => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ article, onBack }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    if (!article.gallery_urls || article.gallery_urls.length === 0) return;
    setCurrentImageIndex((prev) => (prev === (article.gallery_urls!.length - 1) ? 0 : prev + 1));
  };

  const prevImage = () => {
    if (!article.gallery_urls || article.gallery_urls.length === 0) return;
    setCurrentImageIndex((prev) => (prev === 0 ? (article.gallery_urls!.length - 1) : prev - 1));
  };
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors group mb-4"
      >
        <div className="p-2 rounded-full bg-white border border-slate-200 group-hover:border-green-200 group-hover:bg-green-50 transition-all">
          <ArrowLeft size={20} />
        </div>
        <span className="font-medium">Voltar para o Início</span>
      </button>

      <article className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {article.image_url && (
          <div className="w-full h-64 md:h-80 relative">
            <img 
              src={article.image_url} 
              alt={article.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 md:p-8 text-white">
               <span className="inline-block px-3 py-1 bg-green-500 text-xs font-bold rounded-full mb-3 shadow-lg">
                  {article.category || 'Geral'}
               </span>
               <h1 className="text-3xl md:text-4xl font-bold leading-tight shadow-sm text-shadow-sm">
                 {article.title}
               </h1>
            </div>
          </div>
        )}

        <div className="p-6 md:p-10">
          {!article.image_url && (
             <div className="mb-8 border-b border-slate-100 pb-8">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-3">
                  {article.category || 'Geral'}
               </span>
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
              <span>Equipe Tradexperience</span>
            </div>
             <div className="flex items-center gap-2">
              <Clock size={16} className="text-green-600" />
              <span>5 min de leitura</span>
            </div>
          </div>

          <div className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-900 prose-a:text-green-600 hover:prose-a:text-green-700">
             {/* Simple paragraph splitting for basic formatting if no markdown parser is available yet */}
             {article.content ? (
               article.content.split('\n').map((paragraph, index) => (
                 paragraph.trim() && <p key={index} className="mb-4 text-slate-600 leading-relaxed">{paragraph}</p>
               ))
             ) : (
                <p className="text-slate-500 italic">Conteúdo indisponível.</p>
             )}
          </div>

          {/* Image Gallery Carousel */}
          {article.gallery_urls && article.gallery_urls.length > 0 && (
            <div className="mt-12 pt-12 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Galeria de Imagens</h3>
              
              <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden group">
                 <img 
                   src={article.gallery_urls[currentImageIndex]} 
                   alt={`Imagem ${currentImageIndex + 1}`} 
                   className="w-full h-full object-contain"
                 />
                 
                 {article.gallery_urls.length > 1 && (
                   <>
                     <button 
                       onClick={prevImage}
                       className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                     >
                       <ChevronLeft size={24} />
                     </button>
                     <button 
                       onClick={nextImage}
                       className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                     >
                       <ChevronRight size={24} />
                     </button>
                     
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                       {article.gallery_urls.map((_, idx) => (
                         <div 
                           key={idx} 
                           className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                         />
                       ))}
                     </div>
                   </>
                 )}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};
