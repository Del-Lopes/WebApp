
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Cpu, 
  GraduationCap, 
  AlertCircle,
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
  Calendar, 
  CheckCircle2,
  Database,
  ShieldAlert,
  HardDrive,
  Loader2,
  Notebook,
  BarChart3,
  Activity
} from 'lucide-react';
import { LicenseRequest, Article, View } from '../../types';
import { getStorageStats, uploadToSupabase, formatBytes, type StorageStats } from '../../lib/storage';
import { Badge, Button, Card, EmptyState, Input, Label, PageHeader, Skeleton, Textarea } from '../ui';

interface UserDashboardProps {
  onNavigate: (view: View) => void;
  onReadArticle: (article: Article) => void;
  onShowTour?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate, onReadArticle, onShowTour }) => {
  const { user, role } = useAuth();

  const [activeLicenses, setActiveLicenses] = useState<LicenseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [articles, setArticles] = useState<Article[]>([]);
  const [coursesCount, setCoursesCount] = useState(0);

  // Article Admin State
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleForm, setArticleForm] = useState({ title: '', excerpt: '', content: '', image_url: '', category: 'Análise', gallery_urls: [] as string[] });
  const [isUploading, setIsUploading] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  useEffect(() => {
    if (user) {
        fetchDashboardData();
        fetchContentData();
        fetchStorageStats();
    }
  }, [user]);

  const fetchStorageStats = async () => {
    const stats = await getStorageStats();
    setStorageStats(stats);
  };

  const LICENSE_TABLES = [
    { table: 'license_requests',          ea: 'AFK TRADER' },
    { table: 'license_requests_snowball', ea: 'SNOW BALL'  },
    { table: 'license_requests_boletapro',ea: 'BOLETA PRO' },
    { table: 'license_requests_fxsquad',  ea: 'FX SQUAD'  },
  ] as const;

  const fetchDashboardData = async () => {
    try {
      const results = await Promise.all(
        LICENSE_TABLES.map(({ table, ea }) =>
          supabase
            .from(table)
            .select('id, mt5_account, license_title, expires_at, status')
            .eq('user_id', user?.id)
            .eq('status', 'approved')
            .then(({ data }) => (data || []).map(r => ({ ...r, ea })))
        )
      );

      setActiveLicenses(results.flat() as any[]);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
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
            .select('*')
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
  const openArticleModal = (article?: Article) => {
      if (article) {
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

          if (editingArticle) {
              await supabase.from('articles').update(articleData).eq('id', editingArticle.id);
          } else {
              await supabase.from('articles').insert(articleData);
          }
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
      <PageHeader
        className="mb-0 sm:mb-0"
        eyebrow="Painel"
        title={<>Olá, {user?.user_metadata?.full_name || 'Trader'}!</>}
        description="Bem-vindo ao seu painel de controle."
      />

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

        {/* Analysis Card */}
        <div
          onClick={() => onNavigate('analysis')}
          className={navCard}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={navIcon}>
              <BarChart3 size={24} />
            </div>
            <div className="min-w-0">
              <p className={`${navEyebrow} truncate`}>Análise de Resultados</p>
              <h3 className={navTitle}>Performance</h3>
            </div>
          </div>
          <div className={navHint}>Métricas e relatórios MT5</div>
        </div>

        {/* Live Portfolio Card */}
        <div
          onClick={() => onNavigate('live_portfolio')}
          className={navCard}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={navIcon}>
              <Activity size={24} />
            </div>
            <div>
              <p className={navEyebrow}>Live Portfólio</p>
              <h3 className={navTitle}>Tempo real</h3>
            </div>
          </div>
          <div className={navHint}>Suas contas MT5 ao vivo</div>
        </div>

        {/* Hand Bot Card */}
        <div
          onClick={() => onNavigate('hand_bot')}
          className={navCard}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={navIcon}>
              <Cpu size={24} />
            </div>
            <div>
              <p className={navEyebrow}>Automação</p>
              <h3 className={navTitle}>Hand Bot</h3>
            </div>
          </div>
          <div className={navHint}>Gerencie seu robô de trades</div>
        </div>

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

          {/* Recent Activity / Licenses List (Now on the right) */}
          <Card>
            <div className="flex items-center justify-between gap-3 mb-6">
              <h3 className="font-display text-lg font-semibold text-fg">Suas Contas</h3>
              <div
                onClick={() => onNavigate('licenses')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-success/10 border border-success/20 rounded-xl cursor-pointer hover:bg-success/15 transition-colors group"
              >
                <CheckCircle2 size={14} className="text-success-fg shrink-0" />
                <span className="text-sm font-semibold text-success-fg whitespace-nowrap">
                  <span className="tabular-nums">{activeLicenses.length}</span> Licença{activeLicenses.length !== 1 ? 's' : ''} Ativa{activeLicenses.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {loading ? (
                 <div className="space-y-3" role="status">
                   <Skeleton className="h-24 w-full rounded-2xl" />
                   <Skeleton className="h-24 w-full rounded-2xl" />
                   <span className="sr-only">Carregando...</span>
                 </div>
            ) : activeLicenses.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 ds-scrollbar">
                {activeLicenses.map((license) => (
                  <div key={license.id} className="p-4 sm:p-5 bg-tint/3 rounded-2xl border border-tint/8 hover:border-tint/15 transition-all space-y-3 group">
                    {/* Linha 1: Conta e Título */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 shrink-0 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        <span className="font-mono font-semibold tabular-nums text-fg text-lg sm:text-xl tracking-tight truncate">{license.mt5_account}</span>
                      </div>
                      <Badge className="uppercase tracking-widest text-[10px] rounded-lg">
                        {license.license_title || (license as any).ea || 'MT5'}
                      </Badge>
                    </div>

                    {/* Linha 2: Ativo e Validade */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-tint/6">
                      <Badge tone="success" className="rounded-lg text-[10px] font-semibold uppercase tracking-[0.2em]">
                        <CheckCircle2 size={10} />
                        <span>ATIVO</span>
                      </Badge>
                      <div className="flex items-center gap-2 text-fg-subtle">
                        <Calendar size={12} className="shrink-0" />
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Validade: <span className="text-fg font-semibold ml-1 tabular-nums">{license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Não definida'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                className="py-8"
                icon={AlertCircle}
                title="Você ainda não tem licenças ativas."
                description={<span className="text-accent-fg font-medium">Vá até a aba Licenças para solicitar.</span>}
              />
            )}
          </Card>
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
                                        <img src={url} className="w-full h-full object-cover" />
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
