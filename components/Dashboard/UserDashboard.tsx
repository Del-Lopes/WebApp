
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Cpu, 
  GraduationCap, 
  TrendingUp, 
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
  BarChart3
} from 'lucide-react';
import { LicenseRequest, Article, View, Profile } from '../../types';
import { getStorageStats, uploadToSupabase, formatBytes, type StorageStats } from '../../lib/storage';

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
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
        fetchDashboardData();
        fetchContentData();
        fetchStorageStats();
        fetchCurrentUser();
    }
  }, [user]);

  const fetchStorageStats = async () => {
    const stats = await getStorageStats();
    setStorageStats(stats);
  };

  const fetchCurrentUser = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setCurrentUserProfile(data);
  };

  const fetchDashboardData = async () => {
    try {
      const [afk, snowball, boleta, fxsquad] = await Promise.all([
        supabase.from('license_requests').select('*').eq('user_id', user?.id).eq('status', 'approved'),
        supabase.from('license_requests_snowball').select('*').eq('user_id', user?.id).eq('status', 'approved'),
        supabase.from('license_requests_boletapro').select('*').eq('user_id', user?.id).eq('status', 'approved'),
        supabase.from('license_requests_fxsquad').select('*').eq('user_id', user?.id).eq('status', 'approved')
      ]);

      const allApproved = [
        ...(afk.data || []).map(r => ({ ...r, ea: 'AFK TRADER' })),
        ...(snowball.data || []).map(r => ({ ...r, ea: 'SNOW BALL' })),
        ...(boleta.data || []).map(r => ({ ...r, ea: 'BOLETA PRO' })),
        ...(fxsquad.data || []).map(r => ({ ...r, ea: 'FX SQUAD' }))
      ];
      
      setActiveLicenses(allApproved as any[]);
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
    const role = currentUserProfile?.role;
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Olá, {user?.user_metadata?.full_name || 'Trader'}!</h2>
        <p className="text-slate-500">Bem-vindo ao seu painel de controle.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Journey Card (Start Here) */}
        <div 
          onClick={() => onNavigate('journey')}
          className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-2xl border border-transparent shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-white/20 text-white rounded-xl backdrop-blur-sm group-hover:bg-white group-hover:text-indigo-600 transition-colors">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <p className="text-sm text-indigo-100 font-medium">Novo por aqui?</p>
              <h3 className="text-lg font-bold text-white">Conheça a Plataforma</h3>
            </div>
          </div>
          <div className="text-xs text-indigo-100 relative z-10 flex items-center gap-1 font-medium">
            <span>Apresentação das sessões</span>
            <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Downloads Card */}
        <div 
          onClick={() => onNavigate('downloads')}
          className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-slate-200 text-slate-600 rounded-xl group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <Download size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Ferramentas</p>
              <h3 className="text-lg font-bold capitalize text-slate-900">Downloads</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400">MT5, Manuais e Indicadores</div>
        </div>

        {/* Strategies Card */}
        <div
          onClick={() => onNavigate('strategies')}
          className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Cpu size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Estratégias</p>
              <h3 className="text-lg font-bold capitalize text-slate-900">Robôs</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400">Gerenciar estratégias</div>
        </div>

        {/* Journal Card */}
        <div
          onClick={() => onNavigate('journal')}
          className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Notebook size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Diário</p>
              <h3 className="text-lg font-bold text-slate-900">Anotações</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400">Registre suas operações</div>
        </div>

        {/* Analysis Card */}
        <div
          onClick={() => onNavigate('analysis')}
          className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-lg shadow-rose-500/10 hover:shadow-xl hover:shadow-rose-500/20 transition-all duration-300 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Análise de Resultados</p>
              <h3 className="text-lg font-bold text-slate-900">Performance</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400">Métricas e relatórios MT5</div>
        </div>

        {/* Licenses Card */}
        <div 
          onClick={() => onNavigate('licenses')}
          className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Licenças Ativas</p>
              <h3 className="text-lg font-bold text-slate-900">{activeLicenses.length}</h3>
            </div>
          </div>
           {activeLicenses.length > 0 ? (
             <div className="text-xs text-green-600 font-medium">Operando normalmente</div>
           ) : (
             <div className="text-xs text-yellow-600 font-medium">Nenhuma licença ativa</div>
           )}
        </div>

        {/* Courses Card (Renamed to Biblioteca) */}
        <div 
          onClick={() => onNavigate('education')}
          className="bg-purple-50 p-6 rounded-2xl border border-purple-100 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 cursor-pointer group"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Biblioteca</p>
              <h3 className="text-lg font-bold text-slate-900">{coursesCount} Cursos Disponíveis</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400">Continue seus estudos</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Articles Section (Now on the left) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">Artigos e Análises Recentes</h3>
                 {role === 'admin' && (
                     <button 
                         onClick={() => openArticleModal()} 
                         className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors"
                     >
                         <Plus size={14} /> Novo
                     </button>
                 )}
            </div>
            
            {articles.length > 0 ? (
                <div 
                  className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar"
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
                      className="group flex items-start gap-3 p-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all cursor-pointer relative"
                    >
                      {/* Thumbnail */}
                      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-200">
                        {article.image_url ? (
                          <img
                            src={article.image_url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <FileText size={20} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-sm font-semibold text-slate-800 group-hover:text-green-600 transition-colors line-clamp-1">{article.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-1">{article.excerpt}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <Clock size={10} /><span>{new Date(article.created_at || Date.now()).toLocaleDateString()}</span>
                            <span>•</span><span className="text-green-600/80 uppercase font-semibold">{article.category || 'Geral'}</span>
                          </div>
                          {role === 'admin' && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); openArticleModal(article); }}
                                className="p-1 text-slate-400 hover:text-green-600 hover:bg-white rounded shadow-sm"
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
                      <Loader2 className="animate-spin text-green-600" size={20} />
                    </div>
                  )}

                  {!hasMore && articles.length > 5 && (
                    <div className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Você chegou ao fim
                    </div>
                  )}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500">Nenhum artigo recente.</div>
            )}
          </div>

          {/* Recent Activity / Licenses List (Now on the right) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Suas Contas</h3>
            
            {loading ? (
                 <p className="text-slate-400">Carregando...</p>
            ) : activeLicenses.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                {activeLicenses.map((license) => (
                  <div key={license.id} className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-slate-50 transition-all space-y-3 group">
                    {/* Linha 1: Conta e Título */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                        <span className="font-mono font-black text-slate-900 text-xl tracking-tight">{license.mt5_account}</span>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-3 py-1 rounded-xl uppercase tracking-widest border border-slate-300/30">
                        {license.license_title || (license as any).ea || 'MT5'}
                      </span>
                    </div>

                    {/* Linha 2: Ativo e Validade */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-lg border border-green-200/50 shadow-sm uppercase tracking-[0.2em]">
                        <CheckCircle2 size={10} />
                        <span>ATIVO</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={12} className="shrink-0" />
                        <span className="text-[11px] font-medium uppercase tracking-wider">
                          Validade: <span className="text-slate-700 font-bold ml-1">{license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Não definida'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                   <AlertCircle className="text-slate-400" />
                 </div>
                <p className="text-slate-500 mb-2">Você ainda não tem licenças ativas.</p>
                <p className="text-sm text-green-600 font-medium">Vá até a aba Licenças para solicitar.</p>
              </div>
            )}
          </div>
      </div>

      {/* Article Modal */}
      {isArticleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10 pb-2">
                      <h3 className="text-xl font-bold text-slate-800">{editingArticle ? 'Editar Artigo' : 'Novo Artigo'}</h3>
                      <div className="flex items-center gap-2">
                        {editingArticle && (
                            <button 
                              type="button" 
                              onClick={() => handleDeleteArticle(editingArticle.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors mr-2"
                              title="Excluir Artigo"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button onClick={() => setIsArticleModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                      </div>
                  </div>
                  <form onSubmit={handleSaveArticle} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-600">Título</label>
                          <input type="text" required value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500 transition-colors" placeholder="Ex: Análise do Ouro" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-600">Categoria</label>
                          <input type="text" value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500 transition-colors" placeholder="Ex: Forex, Crypto..." />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-600">Resumo (Card)</label>
                          <textarea rows={2} value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500 transition-colors" placeholder="Breve descrição..." />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-600">Conteúdo Completo</label>
                          <textarea rows={6} value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500 transition-colors" placeholder="Texto completo da análise..." />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-slate-600">Fotos (Supabase Storage)</label>
                        
                        {/* Mini Storage Monitor */}
                        {storageStats && (
                            <div className="mb-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                        <Database size={10} /> Armazenamento
                                    </span>
                                    <span className={`text-[10px] font-bold ${storageStats.isFull ? 'text-red-500' : 'text-slate-500'}`}>
                                        {formatBytes(storageStats.usedBytes)} / 1GB
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-slate-200 relative">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${
                                            storageStats.percentage >= 95 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                                            storageStats.percentage >= 80 ? 'bg-orange-400' : 
                                            'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                                        }`}
                                        style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
                                    </div>
                                </div>
                                {storageStats.isFull && (
                                    <p className="text-[9px] text-red-500 font-bold mt-1.5 flex items-center gap-1 animate-pulse">
                                        <ShieldAlert size={10} /> Limite de armazenamento atingido.
                                    </p>
                                )}
                            </div>
                        )}

                        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer hover:bg-green-50 hover:border-green-400 transition-all ${isUploading || storageStats?.isFull ? 'bg-slate-50 cursor-not-allowed text-slate-300' : 'bg-green-50/10 border-slate-200'}`}>
                            <Plus size={24} className={`${isUploading ? 'text-slate-300 animate-spin' : storageStats?.isFull ? 'text-red-200' : 'text-green-500'}`} />
                            <span className="text-xs font-bold text-slate-500 mt-1">
                                {isUploading ? 'Enviando...' : storageStats?.isFull ? 'Limite Atingido' : 'Adicionar Fotos'}
                            </span>
                            <input type="file" multiple accept="image/*" onChange={(e) => handleUploadToSupabase(e.target.files)} className="hidden" disabled={isUploading || storageStats?.isFull} />
                        </label>
                        
                        {articleForm.gallery_urls.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mt-4">
                                {articleForm.gallery_urls.map((url, i) => (
                                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                                        <img src={url} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setArticleForm(prev => ({...prev, gallery_urls: prev.gallery_urls.filter((_, idx) => idx !== i)}))} className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                                        <button type="button" onClick={() => setArticleForm({...articleForm, image_url: url})} className={`absolute bottom-0 left-0 right-0 py-0.5 text-[8px] font-black text-center ${articleForm.image_url === url ? 'bg-green-600 text-white' : 'bg-slate-900/40 text-white opacity-0 group-hover:opacity-100'}`}>{articleForm.image_url === url ? 'CAPA' : 'USAR CAPA'}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-500 shadow-lg shadow-green-600/20 transition-all transform hover:-translate-y-0.5">
                            {editingArticle ? 'Salvar Alterações' : 'Publicar Artigo'}
                        </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
