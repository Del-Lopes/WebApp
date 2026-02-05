
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Cpu, GraduationCap, TrendingUp, AlertCircle, Clock, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { LicenseRequest, Article, View } from '../../types';

interface UserDashboardProps {
  onNavigate: (view: View) => void;
  onReadArticle: (article: Article) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate, onReadArticle }) => {
  const { user, role } = useAuth();
  const [activeLicenses, setActiveLicenses] = useState<LicenseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [articles, setArticles] = useState<Article[]>([]);
  const [coursesCount, setCoursesCount] = useState(0);

  // Article Admin State
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleForm, setArticleForm] = useState({ title: '', excerpt: '', content: '', image_url: '', category: 'Análise', gallery_urls_input: '' });

  useEffect(() => {
    if (user) {
        fetchDashboardData();
        fetchContentData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data } = await supabase
        .from('license_requests')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'approved');
      
      setActiveLicenses(data || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContentData = async () => {
      try {
          // Fetch Courses Count
          const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('type', 'course');
          setCoursesCount(count || 0);

          // Fetch Recent Articles
          const { data: articlesData } = await supabase.from('articles').select('*').order('created_at', {ascending: false}).limit(5);
          if (articlesData) setArticles(articlesData);

      } catch (e) { console.error(e); }
  };

  // Article Management Functions
  const openArticleModal = (article?: Article) => {
      if (article) {
          setEditingArticle(article);
          setArticleForm({ 
            title: article.title, 
            excerpt: article.excerpt, 
            content: article.content || '', 
            image_url: article.image_url || '', 
            category: article.category || 'Análise',
            gallery_urls_input: article.gallery_urls ? article.gallery_urls.join('\n') : ''
          });
      } else {
          setEditingArticle(null);
          setArticleForm({ title: '', excerpt: '', content: '', image_url: '', category: 'Análise', gallery_urls_input: '' });
      }
      setIsArticleModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const gallery_urls = articleForm.gallery_urls_input
              .split('\n')
              .map(url => url.trim())
              .filter(url => url.length > 0);

          const articleData = {
              title: articleForm.title,
              excerpt: articleForm.excerpt,
              content: articleForm.content,
              image_url: articleForm.image_url,
              category: articleForm.category,
              gallery_urls: gallery_urls
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <h3 className="text-lg font-bold capitalize text-slate-900">Meus Robôs</h3>
            </div>
          </div>
          <div className="text-xs text-slate-400">Gerenciar estratégias</div>
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
          {/* Recent Activity / Licenses List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Suas Contas MT5</h3>
            
            {loading ? (
                 <p className="text-slate-400">Carregando...</p>
            ) : activeLicenses.length > 0 ? (
              <div className="space-y-3">
                {activeLicenses.map((license) => (
                  <div key={license.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="font-mono font-medium text-slate-700">{license.mt5_account}</span>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                      ATIVO
                    </span>
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

          {/* Articles Section (Migrated) */}
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
                <div className="space-y-4">
                  {articles.map((article) => (
                    <div 
                      key={article.id} 
                      onClick={() => onReadArticle(article)}
                      className="group p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all cursor-pointer relative"
                    >
                      <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1 flex-1">
                            <h4 className="text-sm font-semibold text-slate-800 group-hover:text-green-600 transition-colors">{article.title}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2">{article.excerpt}</p>
                          </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                             <Clock size={10} /><span>{new Date(article.created_at || Date.now()).toLocaleDateString()}</span>
                             <span>•</span><span className="text-green-600/80 uppercase font-semibold">{article.category || 'Geral'}</span>
                          </div>
                          
                          {role === 'admin' && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  ))}
                </div>
            ) : (
                <div className="text-center py-8 text-slate-500">Nenhum artigo recente.</div>
            )}
          </div>
      </div>

      {/* Article Modal */}
      {isArticleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
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
                          <label className="block text-sm font-medium mb-1 text-slate-600">Imagem URL (Opcional)</label>
                          <input type="text" value={articleForm.image_url} onChange={e => setArticleForm({...articleForm, image_url: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500 transition-colors" placeholder="https://..." />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 text-slate-600">Galeria de Imagens (Uma URL por linha)</label>
                          <textarea 
                            rows={3} 
                            value={articleForm.gallery_urls_input} 
                            onChange={e => setArticleForm({...articleForm, gallery_urls_input: e.target.value})} 
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500 transition-colors" 
                            placeholder="https://imagem1.jpg&#10;https://imagem2.jpg" 
                          />
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
