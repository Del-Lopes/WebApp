
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Cpu, 
  GraduationCap, 
  Clock,
  FileText,
  Plus,
  Edit2,
  Trash2, 
  X, 
  Save, 
  Map, 
  LayoutDashboard,
  ChevronRight, 
  Download, 
  Database,
  ShieldAlert,
  HardDrive,
  Loader2,
  Notebook
} from 'lucide-react';
import { Article, View } from '../../types';
import { getStorageStats, uploadToSupabase, formatBytes, type StorageStats } from '../../lib/storage';
import { ARTICLE_LIST_COLUMNS, withArticleContent } from '../../lib/articles';
import { Button, Card, Input, Label, Textarea } from '../ui';
import { TrilhaProgressCard } from './TrilhaProgressCard';
import { GamificationBar } from '../TrilhaGain/GamificationBar';
import { CryptoCard, EconCalendarCard, SignalsCard } from './LiveCards';
import { fetchStats } from '../../lib/trilhaGain';
import { TrilhaStats } from '../../types';

interface UserDashboardProps {
  onNavigate: (view: View) => void;
  onReadArticle: (article: Article) => void;
  onShowTour?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate, onReadArticle, onShowTour }) => {
  const { user, role } = useAuth();

  const [articles, setArticles] = useState<Article[]>([]);
  const [coursesCount, setCoursesCount] = useState(0);
  const [stats, setStats] = useState<TrilhaStats | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchStats().then((st) => { if (alive) setStats(st); });
    return () => { alive = false; };
  }, [user]);

  // Article Admin State
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleForm, setArticleForm] = useState({ title: '', excerpt: '', content: '', image_url: '', category: 'Análise', gallery_urls: [] as string[] });
  const [isUploading, setIsUploading] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  useEffect(() => {
    if (user) {
        fetchContentData();
    }
  }, [user]);

  // Uso do storage só interessa ao admin (quem abre o modal de artigo);
  // get_storage_usage é uma RPC pesada para rodar em todo painel de cliente.
  useEffect(() => {
    if (user && role === 'admin') fetchStorageStats();
  }, [user, role]);

  const fetchStorageStats = async () => {
    const stats = await getStorageStats();
    setStorageStats(stats);
  };

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 5;

  const fetchContentData = async (reset = true) => {
      try {
          if (reset) {
              // Fetch Courses Count
              const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('type', 'course');
              setCoursesCount(count || 0);
              setPage(0);
              setHasMore(true);
          }

          const currentPage = reset ? 0 : page + 1;
          const from = currentPage * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          // Fetch Articles with pagination
          const { data: articlesData } = await supabase
            .from('articles')
            .select(ARTICLE_LIST_COLUMNS)
            .order('created_at', {ascending: false})
            .range(from, to);

          if (articlesData) {
              if (reset) {
                  setArticles(articlesData);
              } else {
                  setArticles(prev => [...prev, ...articlesData]);
                  setPage(currentPage);
              }
              
              if (articlesData.length < PAGE_SIZE) {
                  setHasMore(false);
              }
          }

      } catch (e) { console.error(e); }
  };

  const loadMoreArticles = async () => {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);
      await fetchContentData(false);
      setLoadingMore(false);
  };

  // Article Management Functions
  const openArticleModal = async (article?: Article) => {
      if (article) {
          try {
              article = await withArticleContent(article);
          } catch (e: any) {
              alert("Erro ao carregar artigo: " + e.message);
              return;
          }
          setEditingArticle(article);
          const initialGallery = article.gallery_urls || [];
          const galleryWithCover = (article.image_url && !initialGallery.includes(article.image_url)) 
            ? [article.image_url, ...initialGallery] 
            : initialGallery;

          setArticleForm({ 
            title: article.title, 
            excerpt: article.excerpt, 
            content: article.content || '', 
            image_url: article.image_url || '', 
            category: article.category || 'Análise',
            gallery_urls: galleryWithCover
          });
      } else {
          setEditingArticle(null);
          setArticleForm({ title: '', excerpt: '', content: '', image_url: '', category: 'Análise', gallery_urls: [] });
      }
      setIsArticleModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const articleData = {
              title: articleForm.title,
              excerpt: articleForm.excerpt,
              content: articleForm.content,
              image_url: articleForm.image_url,
              category: articleForm.category,
              gallery_urls: articleForm.gallery_urls
          };

          const { error } = editingArticle
              ? await supabase.from('articles').update(articleData).eq('id', editingArticle.id)
              : await supabase.from('articles').insert(articleData);
          if (error) throw error;
          setIsArticleModalOpen(false);
          fetchContentData(); // Refresh list
      } catch(e: any) { alert("Erro: " + e.message); }
  };

  const handleUploadToSupabase = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Check if user has permission
    if (role !== 'admin' && role !== 'first_mate') {
      alert('Apenas Admin e First Mate podem fazer upload de arquivos.');
      return;
    }

    if (storageStats?.isFull) {
        alert('Erro: Limite de armazenamento do Supabase (1GB) atingido. Remova arquivos antigos primeiro.');
        return;
    }

    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      const category = articleForm.category.toLowerCase().includes('análise') || articleForm.category.toLowerCase().includes('analise') 
        ? 'analyses' 
        : 'articles';

      for (let i = 0; i < files.length; i++) {
        const url = await uploadToSupabase(files[i], category);
        newUrls.push(url);
      }
      
      setArticleForm(prev => ({
        ...prev,
        gallery_urls: [...prev.gallery_urls, ...newUrls],
        image_url: prev.image_url || newUrls[0]
      }));
      
      fetchStorageStats(); // Refresh usage
    } catch (e: any) {
      alert('Erro no upload: ' + e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
      if (!confirm("Tem certeza que deseja excluir este artigo?")) return;
      try {
          const { error } = await supabase.from('articles').delete().eq('id', articleId);
          if (error) throw error;
          setIsArticleModalOpen(false);
          fetchContentData();
      } catch(e: any) { alert("Erro ao excluir: " + e.message); }
  };

  // Classes dos cards de atalho: vidro neutro, borda acende no hover, ícone vira destaque.
  const navCard = 'glass-card glass-card-hover p-6 rounded-2xl cursor-pointer group';
  const navIcon = 'p-3 bg-tint/5 border border-tint/10 text-fg-muted rounded-xl group-hover:bg-accent/10 group-hover:border-accent/20 group-hover:text-accent-fg transition-colors';
  const navEyebrow = 'eyebrow-muted';
  const navTitle = 'font-display text-lg font-semibold text-fg';
  const navHint = 'text-xs text-fg-muted';

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="eyebrow">Painel</p>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="min-w-0 font-display text-2xl font-semibold leading-tight text-fg sm:text-3xl">
            Olá, {user?.user_metadata?.full_name || 'Trader'}!
          </h1>
          <GamificationBar stats={stats} onBuy={() => onNavigate('buy_coins')} />
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">Bem-vindo ao seu painel de controle.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Journey Card (Start Here) */}
        <div
          onClick={() => onNavigate('journey')}
          className="glass-card glass-card-hover ring-1 ring-inset ring-accent/20 p-6 rounded-2xl cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" aria-hidden></div>

          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-accent/10 border border-accent/20 text-accent-fg rounded-xl group-hover:bg-accent/20 transition-colors">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <p className="eyebrow">Novo por aqui?</p>
              <h3 className={navTitle}>Conheça a Plataforma</h3>
            </div>
          </div>
          <div className="text-xs text-fg-muted relative z-10 flex items-center gap-1 font-medium group-hover:text-accent-fg transition-colors">
            <span>Apresentação das sessões</span>
            <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Downloads Card */}
        <div
          onClick={() => onNavigate('downloads')}
          className={navCard}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={navIcon}>
              <Download size={24} />
            </div>
            <div>
              <p className={navEyebrow}>Ferramentas</p>
              <h3 className={`${navTitle} capitalize`}>Downloads</h3>
            </div>
          </div>
          <div className={navHint}>MT5, Manuais e Indicadores</div>
        </div>

        {/* Strategies Card */}
        <div
          onClick={() => onNavigate('strategies')}
          className={navCard}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={navIcon}>
              <Cpu size={24} />
            </div>
            <div>
              <p className={navEyebrow}>Estratégias</p>
              <h3 className={`${navTitle} capitalize`}>Robôs</h3>
            </div>
          </div>
          <div className={navHint}>Gerenciar estratégias</div>
        </div>

        {/* Journal Card */}
        <div
          onClick={() => onNavigate('journal')}
          className={navCard}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={navIcon}>
              <Notebook size={24} />
            </div>
            <div>
              <p className={navEyebrow}>Diário</p>
              <h3 className={navTitle}>Anotações</h3>
            </div>
          </div>
          <div className={navHint}>Registre suas operações</div>
        </div>

        {/* Atalhos vivos: mostram o que está acontecendo em cada área */}
        <EconCalendarCard onNavigate={onNavigate} />
        <CryptoCard onNavigate={onNavigate} />
        <SignalsCard onNavigate={onNavigate} />

        {/* Courses Card (Renamed to Biblioteca) */}
        <div
          onClick={() => onNavigate('education')}
          className={navCard}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={navIcon}>
              <GraduationCap size={24} />
            </div>
            <div>
              <p className={navEyebrow}>Biblioteca</p>
              <h3 className={navTitle}><span className="tabular-nums">{coursesCount}</span> Cursos Disponíveis</h3>
            </div>
          </div>
          <div className={navHint}>Continue seus estudos</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Articles Section (Now on the left) */}
          <Card>
            <div className="flex items-center justify-between gap-3 mb-6">
                 <h3 className="font-display text-lg font-semibold text-fg flex items-center gap-2">Artigos e Análises Recentes</h3>
                 {role === 'admin' && (
                     <button
                         onClick={() => openArticleModal()}
                         className="shrink-0 text-xs bg-accent/10 text-accent-fg border border-accent/20 hover:bg-accent/15 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                     >
                         <Plus size={14} /> Novo
                     </button>
                 )}
            </div>

            {articles.length > 0 ? (
                <div
                  className="space-y-3 max-h-[420px] overflow-y-auto pr-1 ds-scrollbar"
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                      loadMoreArticles();
                    }
                  }}
                >
                  {articles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => onReadArticle(article)}
                      className="group flex items-start gap-3 p-3 bg-tint/3 hover:bg-tint/5 border border-tint/8 hover:border-accent/30 rounded-xl transition-all cursor-pointer relative"
                    >
                      {/* Thumbnail */}
                      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-tint/5">
                        {article.image_url ? (
                          <img
                            src={article.image_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-fg-subtle">
                            <FileText size={20} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-semibold text-fg group-hover:text-accent-fg transition-colors line-clamp-1">{article.title}</h4>
                        </div>
                        <p className="text-xs text-fg-muted line-clamp-2 mb-1">{article.excerpt}</p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 text-[10px] text-fg-subtle">
                            <Clock size={10} className="shrink-0" /><span className="tabular-nums">{new Date(article.created_at || Date.now()).toLocaleDateString()}</span>
                            <span>•</span><span className="text-accent-fg uppercase font-semibold tracking-wider truncate">{article.category || 'Geral'}</span>
                          </div>
                          {role === 'admin' && (
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); openArticleModal(article); }}
                                className="p-1 text-fg-subtle hover:text-accent-fg hover:bg-tint/5 rounded-sm"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {loadingMore && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin text-accent-fg" size={20} />
                    </div>
                  )}

                  {!hasMore && articles.length > 5 && (
                    <div className="text-center py-4 eyebrow-muted">
                      Você chegou ao fim
                    </div>
                  )}
                </div>
            ) : (
                <div className="text-center py-8 text-fg-muted">Nenhum artigo recente.</div>
            )}
          </Card>

          {/* Progresso da Trilha Gain (lado direito) */}
          <TrilhaProgressCard onOpen={() => onNavigate('trilha_gain')} />
      </div>

      {/* Article Modal */}
      {isArticleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="relative bg-surface border border-tint/10 rounded-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto ds-scrollbar">
                  <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>
                  <div className="flex justify-between items-center mb-4 sticky top-0 bg-surface z-10 pb-2">
                      <h3 className="font-display text-xl font-semibold text-fg">{editingArticle ? 'Editar Artigo' : 'Novo Artigo'}</h3>
                      <div className="flex items-center gap-2">
                        {editingArticle && (
                            <button
                              type="button"
                              onClick={() => handleDeleteArticle(editingArticle.id)}
                              className="p-2 text-danger-fg hover:bg-danger/10 rounded-full transition-colors mr-2"
                              title="Excluir Artigo"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button onClick={() => setIsArticleModalOpen(false)} aria-label="Fechar" className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"><X size={24} /></button>
                      </div>
                  </div>
                  <form onSubmit={handleSaveArticle} className="space-y-4">
                      <div>
                          <Label>Título</Label>
                          <Input type="text" required value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} placeholder="Ex: Análise do Ouro" />
                      </div>
                      <div>
                          <Label>Categoria</Label>
                          <Input type="text" value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})} placeholder="Ex: Forex, Crypto..." />
                      </div>
                      <div>
                          <Label>Resumo (Card)</Label>
                          <Textarea rows={2} value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} className="min-h-0" placeholder="Breve descrição..." />
                      </div>
                      <div>
                          <Label>Conteúdo Completo</Label>
                          <Textarea rows={6} value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} placeholder="Texto completo da análise..." />
                      </div>
                      <div>
                        <Label>Fotos (Supabase Storage)</Label>

                        {/* Mini Storage Monitor */}
                        {storageStats && (
                            <div className="mb-3 p-3 bg-tint/3 border border-tint/8 rounded-xl">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="eyebrow-muted flex items-center gap-1">
                                        <Database size={10} /> Armazenamento
                                    </span>
                                    <span className={`text-[10px] font-semibold font-mono tabular-nums ${storageStats.isFull ? 'text-danger-fg' : 'text-fg-muted'}`}>
                                        {formatBytes(storageStats.usedBytes)} / 1GB
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-tint/5 rounded-full overflow-hidden border border-tint/8 relative">
                                    <div
                                        className={`h-full transition-all duration-1000 ${
                                            storageStats.percentage >= 95 ? 'bg-danger' :
                                            storageStats.percentage >= 80 ? 'bg-warning' :
                                            'bg-success'
                                        }`}
                                        style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                                    />
                                </div>
                                {storageStats.isFull && (
                                    <p className="text-[10px] text-danger-fg font-semibold mt-1.5 flex items-center gap-1 animate-pulse">
                                        <ShieldAlert size={10} /> Limite de armazenamento atingido.
                                    </p>
                                )}
                            </div>
                        )}

                        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all ${isUploading || storageStats?.isFull ? 'bg-tint/3 border-tint/8 cursor-not-allowed text-fg-subtle' : 'cursor-pointer bg-tint/3 border-tint/10 hover:bg-accent/5 hover:border-accent/50'}`}>
                            <Plus size={24} className={`${isUploading ? 'text-fg-subtle animate-spin' : storageStats?.isFull ? 'text-danger-fg/50' : 'text-accent-fg'}`} />
                            <span className="text-xs font-semibold text-fg-muted mt-1">
                                {isUploading ? 'Enviando...' : storageStats?.isFull ? 'Limite Atingido' : 'Adicionar Fotos'}
                            </span>
                            <input type="file" multiple accept="image/*" onChange={(e) => handleUploadToSupabase(e.target.files)} className="hidden" disabled={isUploading || storageStats?.isFull} />
                        </label>

                        {articleForm.gallery_urls.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
                                {articleForm.gallery_urls.map((url, i) => (
                                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-tint/10">
                                        <img src={url} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setArticleForm(prev => ({...prev, gallery_urls: prev.gallery_urls.filter((_, idx) => idx !== i)}))} className="absolute top-0 right-0 p-1 bg-brand-red text-white rounded-bl-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                                        <button type="button" onClick={() => setArticleForm({...articleForm, image_url: url})} className={`absolute bottom-0 left-0 right-0 py-0.5 text-[8px] font-semibold tracking-wider text-center ${articleForm.image_url === url ? 'bg-brand-green text-brand-dark' : 'bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}>{articleForm.image_url === url ? 'CAPA' : 'USAR CAPA'}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <Button type="submit" size="lg" className="w-full">
                            {editingArticle ? 'Salvar Alterações' : 'Publicar Artigo'}
                        </Button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
