import React, { useState, useEffect } from 'react';
import { Play, FileText, Clock, ChevronRight, Loader2, Plus, Edit2, Trash2, Save, X, MoreVertical, Layout, ChevronDown, ChevronUp, ArrowLeft, Upload, Image as ImageIcon, Lock } from 'lucide-react';
import { MOCK_ARTICLES } from '../constants';
import { supabase } from '../lib/supabase';
import { ARTICLE_LIST_COLUMNS, withArticleContent } from '../lib/articles';
import { useAuth } from '../contexts/AuthContext';
import { Product, Module, Lesson, Article } from '../types';
import { ArticleView } from './Dashboard/ArticleView';
import { BackButton } from './BackButton';
import { uploadToSupabase } from '../lib/storage';
import { Badge, Button, Card, EmptyState, Input, Label, PageHeader, Skeleton, Textarea } from './ui';
import { type } from 'os';

interface EducationProps {
  onBack?: () => void;
  articlesOnly?: boolean;
}

const ARTICLES_LIMIT = 100;

export const Education: React.FC<EducationProps> = ({ onBack, articlesOnly = false }) => {
  const { role } = useAuth();
  const [courses, setCourses] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [selectedCourse, setSelectedCourse] = useState<Product | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Admin State Courses
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Product | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', image_url: '', is_locked: false, lock_note: '' });

  // Modal informativo quando cliente clica em curso trancado
  const [lockedCourse, setLockedCourse] = useState<Product | null>(null);

  // Admin State Lessons
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ 
      title: '', 
      video_url: '', 
      duration: '05:00', 
      description: '' 
  });

  // Admin State Articles
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleForm, setArticleForm] = useState({ title: '', excerpt: '', content: '', image_url: '', category: 'Análise', gallery_urls_input: '' });

  // Module Expansion State for Viewer
  const [expandedModules, setExpandedModules] = useState<{[key: string]: boolean}>({});
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchArticles();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('type', 'course').order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (error) { console.error('Error fetching courses:', error); } finally { setLoading(false); }
  };

  const fetchArticles = async () => {
      try {
          // Listagem: sem o HTML (vem ao abrir) e com teto para não crescer sem limite.
          const { data } = await supabase.from('articles').select(ARTICLE_LIST_COLUMNS).order('created_at', {ascending: false}).limit(ARTICLES_LIMIT);
          if (data && data.length > 0) setArticles(data);
          else {
               // Map mock articles to new structure if DB empty
               const mockMapped = MOCK_ARTICLES.map(a => ({ id: a.id, title: a.title, excerpt: a.excerpt, date: a.date, content: a.excerpt, category: 'Análise Geral' }));
               setArticles(mockMapped as any);
          }
      } catch (e) { console.error(e); }
  };

  const fetchModules = async (courseId: string) => {
      try {
        const { data } = await supabase.from('modules').select('*, lessons(*)').eq('product_id', courseId).order('order_index');
        
        // Sort lessons by order_index manually since supabase relation sort is tricky
        const sortedData = data?.map(m => ({
            ...m,
            lessons: m.lessons?.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
        }));

        setModules(sortedData as any || []);
        
        // Auto expand first module if not already set
        if (data && data.length > 0 && Object.keys(expandedModules).length === 0) {
            setExpandedModules({[data[0].id]: true});
        }
      } catch (e) {
        console.error("Error fetching modules", e);
      }
  };

  const getEmbedUrl = (url: string) => {
      if (!url) return '';
      try {
          // Generic youtube embed converter
          if (url.includes('youtube.com/watch')) {
              const videoId = new URLSearchParams(new URL(url).search).get('v');
              return `https://www.youtube.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0`;
          }
          if (url.includes('youtu.be/')) {
              const videoId = url.split('youtu.be/')[1]?.split('?')[0];
              return `https://www.youtube.com/embed/${videoId}?playsinline=1&modestbranding=1&rel=0`;
          }
          if (url.includes('vimeo.com')) {
              const videoId = url.split('.com/')[1]?.split('?')[0];
              return `https://player.vimeo.com/video/${videoId}?playsinline=1&title=0&byline=0`;
          }
          return url;
      } catch (e) {
          console.error("Error parsing video URL:", e);
          return url;
      }
  };

  // --- Course Admin ---

  const handleEditClick = async (course: Product) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      image_url: course.image_url,
      is_locked: !!course.is_locked,
      lock_note: course.lock_note || '',
    });
    await fetchModules(course.id);
    setIsModalOpen(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
      if (!confirm("Tem certeza que deseja excluir este curso e todo seu conteúdo?")) return;
      try {
          // Cascading delete should handle modules/lessons if configured, but let's be safe
          const { error } = await supabase.from('products').delete().eq('id', courseId);
          if (error) throw error;
          setIsModalOpen(false);
          fetchCourses();
      } catch(e: any) { alert("Erro ao excluir: " + e.message); }
  };

  const handleCreateClick = () => {
      setEditingCourse(null);
      setCourseForm({ title: '', description: '', image_url: '', is_locked: false, lock_note: '' });
      setModules([]);
      setIsModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const payload = {
              title: courseForm.title,
              description: courseForm.description,
              image_url: courseForm.image_url,
              is_locked: courseForm.is_locked,
              lock_note: courseForm.lock_note || null,
          };
          const { error } = editingCourse
              ? await supabase.from('products').update(payload).eq('id', editingCourse.id)
              : await supabase.from('products').insert({ type: 'course', ...payload, image_url: payload.image_url || 'https://picsum.photos/400/225' });
          if (error) throw error;
          setIsModalOpen(false);
          fetchCourses();
      } catch (e: any) { alert("Erro: " + e.message); }
  };

  // --- Modules & Lessons Admin ---

  const handleAddModule = async () => {
      if (!editingCourse) return;
      const title = prompt("Nome do novo módulo:");
      if (!title) return;
      try {
          const { error } = await supabase.from('modules').insert({ product_id: editingCourse.id, title, order_index: modules.length });
          if (error) throw error;
          fetchModules(editingCourse.id);
      } catch(e: any) { alert("Erro ao criar módulo: " + e.message); }
  };

  const handleDeleteModule = async (moduleId: string) => {
      if (!confirm("Tem certeza que deseja excluir este módulo e todas as suas aulas?")) return;
      try {
          const { error } = await supabase.from('modules').delete().eq('id', moduleId);
          if (error) throw error;
          if (editingCourse) fetchModules(editingCourse.id);
      } catch(e: any) { alert("Erro ao excluir módulo: " + e.message); }
  };

  const openLessonModal = (moduleId: string, lesson?: Lesson) => {
      setActiveModuleId(moduleId);
      if (lesson) {
          setEditingLesson(lesson);
          setLessonForm({ 
              title: lesson.title, 
              video_url: lesson.video_url || '', 
              duration: lesson.duration || '05:00',
              description: lesson.description || ''
          });
      } else {
          setEditingLesson(null);
          setLessonForm({ title: '', video_url: '', duration: '05:00', description: '' });
      }
      setIsLessonModalOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeModuleId) return;

      try {
          let updatedLessonData = null;

          if (editingLesson) {
              const { data, error } = await supabase.from('lessons').update(lessonForm).eq('id', editingLesson.id).select().single();
              if (error) throw error;
              updatedLessonData = data;
          } else {
              // Get current max order
              const currentModule = modules.find(m => m.id === activeModuleId);
              const nextOrder = (currentModule?.lessons?.length || 0);
              
              const { data, error } = await supabase.from('lessons').insert({ 
                  module_id: activeModuleId, 
                  ...lessonForm, 
                  order_index: nextOrder 
              }).select().single();
              if (error) throw error;
              updatedLessonData = data;
          }

          // Force update local state so changes reflect immediately in player if selected
          if (updatedLessonData && selectedLesson && selectedLesson.id === updatedLessonData.id) {
              setSelectedLesson(updatedLessonData);
          }

          if(editingCourse) await fetchModules(editingCourse.id);
          setIsLessonModalOpen(false);
      } catch(e: any) { alert("Erro ao salvar aula: " + e.message); }
  };



  const handleDeleteLesson = async (lessonId: string) => {
      if (!confirm("Tem certeza que deseja excluir esta aula?")) return;
      try {
          const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
          if (error) throw error;
          if (editingCourse) fetchModules(editingCourse.id);
      } catch(e: any) { alert("Erro ao excluir aula: " + e.message); }
  };

  const handleDeleteArticle = async (articleId: string) => {
      if (!confirm("Tem certeza que deseja excluir este artigo?")) return;
      try {
          const { error } = await supabase.from('articles').delete().eq('id', articleId);
          if (error) throw error;
          setIsArticleModalOpen(false);
          fetchArticles();
      } catch(e: any) { alert("Erro ao excluir: " + e.message); }
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

          const { error } = editingArticle
              ? await supabase.from('articles').update(articleData).eq('id', editingArticle.id)
              : await supabase.from('articles').insert(articleData);
          if (error) throw error;
          setIsArticleModalOpen(false);
          fetchArticles();
      } catch(e: any) { alert("Erro: " + e.message); }
  };

  const openArticleModal = async (article?: Article) => {
      if (article) {
          try {
              article = await withArticleContent(article);
          } catch (e: any) {
              alert("Erro ao carregar artigo: " + e.message);
              return;
          }
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



  // --- View Logic ---

  const handleAccessCourse = async (course: Product) => {
      setSelectedCourse(course);
      setSelectedLesson(null);
      await fetchModules(course.id);
  };

  const toggleModule = (moduleId: string) => {
      setExpandedModules(prev => ({...prev, [moduleId]: !prev[moduleId]}));
  };

  // --- Render Helpers ---

  const renderLessonModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-surface border border-tint/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto ds-scrollbar">
              <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-xl font-semibold text-fg">{editingLesson ? 'Editar Aula' : 'Nova Aula'}</h3>
                  <button onClick={() => setIsLessonModalOpen(false)} aria-label="Fechar" className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveLesson} className="space-y-4">
                  <div>
                      <Label>Título</Label>
                      <Input type="text" required value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} />
                  </div>
                  <div>
                      <Label>Video URL (Youtube/Vimeo)</Label>
                      <Input type="text" value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} placeholder="https://..." />
                  </div>
                  <div>
                       <Label>Duração</Label>
                       <Input type="text" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} className="font-mono tabular-nums" placeholder="05:00" />
                  </div>
                  <div>
                       <Label>Descrição / Material de Apoio</Label>
                       <Textarea rows={4} value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} placeholder="Sobre esta aula..." />
                  </div>
                  <Button type="submit" className="w-full mt-2">Salvar Aula</Button>
              </form>
          </div>
      </div>
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'course' | 'article' | 'gallery') => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          const category = type === 'course' ? 'courses' : 'articles';
          const url = await uploadToSupabase(file, category);

          if (type === 'course') {
              setCourseForm(prev => ({ ...prev, image_url: url }));
          } else if (type === 'article') {
              setArticleForm(prev => ({ ...prev, image_url: url }));
          } else if (type === 'gallery') {
              setArticleForm(prev => ({
                  ...prev,
                  gallery_urls_input: prev.gallery_urls_input ? `${prev.gallery_urls_input}\n${url}` : url
              }));
          }
      } catch (err: any) {
          alert(err.message);
      } finally {
          setIsUploading(false);
          e.target.value = '';
      }
  };

  const renderCourseModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative bg-surface border border-tint/10 rounded-2xl w-full max-w-2xl my-8 overflow-hidden">
              <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>
              <div className="p-6 border-b border-tint/6 flex justify-between items-center bg-tint/3">
                  <h3 className="font-display text-xl font-semibold text-fg">{editingCourse ? 'Editar Curso' : 'Novo Curso'}</h3>
                  <div className="flex items-center gap-2">
                      {editingCourse && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(editingCourse.id)}
                            className="p-2 text-danger-fg hover:bg-danger/10 rounded-full transition-colors mr-2"
                            title="Excluir Curso"
                          >
                              <Trash2 size={20} />
                          </button>
                      )}
                      <button onClick={() => setIsModalOpen(false)} aria-label="Fechar" className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"><X size={24} /></button>
                  </div>
              </div>
              <div className="p-6 space-y-6">
                  <form id="course-form" onSubmit={handleSaveCourse} className="space-y-4">
                      <div><Label>Título</Label><Input type="text" required value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} /></div>
                      <div><Label>Descrição</Label><Textarea rows={3} value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} /></div>

                      <div className="bg-tint/3 border border-tint/8 rounded-xl p-4 space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                  type="checkbox"
                                  checked={courseForm.is_locked}
                                  onChange={e => setCourseForm({ ...courseForm, is_locked: e.target.checked })}
                                  className="w-4 h-4 accent-accent"
                              />
                              <span className="flex items-center gap-2 font-semibold text-fg">
                                  <Lock size={16} className="text-fg-muted" /> Trancar conteúdo
                              </span>
                          </label>
                          <p className="text-xs text-fg-muted -mt-1">
                              Quando trancado, o curso aparece na Biblioteca com cadeado e não pode ser acessado.
                          </p>
                          {courseForm.is_locked && (
                              <div>
                                  <Label className="text-xs text-fg-muted">
                                      Mensagem do cadeado (opcional)
                                  </Label>
                                  <Textarea
                                      rows={2}
                                      value={courseForm.lock_note}
                                      onChange={e => setCourseForm({ ...courseForm, lock_note: e.target.value })}
                                      placeholder="Ex: Em produção, lançamento em junho. Disponível só para alunos Premium."
                                      className="min-h-0"
                                  />
                              </div>
                          )}
                      </div>

                      <div className="space-y-2">
                        <Label className="mb-0">Imagem de Capa</Label>
                        <div className="flex gap-4 items-start">
                            {courseForm.image_url ? (
                                <div className="relative w-32 shrink-0 aspect-video rounded-lg overflow-hidden border border-tint/10 group">
                                    <img src={courseForm.image_url} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setCourseForm(prev => ({ ...prev, image_url: '' }))}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-32 shrink-0 aspect-video rounded-lg bg-tint/3 border-2 border-dashed border-tint/10 flex items-center justify-center text-fg-subtle">
                                    <ImageIcon size={24} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <label className="flex flex-col items-center justify-center w-full h-12 px-4 transition bg-tint/3 border-2 border-tint/10 border-dashed rounded-xl cursor-copy hover:border-accent/60 group">
                                    <div className="flex items-center space-x-2">
                                        {isUploading ? <Loader2 className="animate-spin text-accent-fg" size={18} /> : <Upload className="text-fg-subtle group-hover:text-accent-fg" size={18} />}
                                        <span className="text-xs font-semibold text-fg-muted group-hover:text-accent-fg">
                                            {isUploading ? 'Enviando...' : 'Clique para subir imagem'}
                                        </span>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" disabled={isUploading} onChange={(e) => handleFileUpload(e, 'course')} />
                                </label>
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        placeholder="Ou cole a URL aqui"
                                        value={courseForm.image_url}
                                        onChange={e => setCourseForm({...courseForm, image_url: e.target.value})}
                                        className="w-full text-[10px] text-fg border-b border-tint/10 bg-transparent py-1 outline-hidden placeholder:text-fg-subtle focus:border-accent/60"
                                    />
                                </div>
                            </div>
                        </div>
                      </div>
                  </form>

                  {editingCourse && (
                      <div className="border-t border-tint/8 pt-6">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="font-display font-semibold text-fg flex items-center gap-2"><Layout size={18} className="text-fg-muted" /> Conteúdo</h4>
                              <button onClick={handleAddModule} className="text-sm text-accent-fg font-semibold hover:underline underline-offset-4">+ Módulo</button>
                          </div>
                          <div className="space-y-3">
                              {modules.map((mod) => (
                                  <div key={mod.id} className="bg-tint/3 rounded-lg p-3 border border-tint/8">
                                      <div className="flex justify-between items-center gap-2 mb-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                              <span className="font-semibold text-fg truncate">{mod.title}</span>
                                              <button onClick={() => handleDeleteModule(mod.id)} className="text-fg-subtle hover:text-danger-fg transition-colors" title="Excluir Módulo">
                                                  <Trash2 size={14} />
                                              </button>
                                          </div>
                                          <button onClick={() => openLessonModal(mod.id)} className="shrink-0 text-xs bg-surface border border-tint/10 text-fg-muted px-2 py-1 rounded-sm hover:bg-accent/10 hover:border-accent/20 hover:text-accent-fg font-medium transition-colors">+ Aula</button>
                                      </div>
                                      <div className="pl-4 space-y-1">
                                          {mod.lessons?.map(lesson => (
                                              <div key={lesson.id} className="flex items-center justify-between gap-2 text-sm text-fg-muted bg-surface p-2 rounded-sm border border-transparent hover:border-tint/10 group">
                                                  <div className="flex items-center gap-2 min-w-0">
                                                      <Play size={12} className="text-fg-subtle shrink-0" /> <span className="truncate">{lesson.title}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                      <button onClick={() => openLessonModal(mod.id, lesson)} className="text-fg-subtle hover:text-accent-fg" title="Editar Aula">
                                                          <Edit2 size={14} />
                                                      </button>
                                                      <button onClick={() => handleDeleteLesson(lesson.id)} className="text-fg-subtle hover:text-danger-fg" title="Excluir Aula">
                                                          <Trash2 size={14} />
                                                      </button>
                                                  </div>
                                              </div>
                                          ))}
                                          {!mod.lessons?.length && <p className="text-xs text-fg-subtle italic">Sem aulas.</p>}
                                      </div>
                                  </div>
                              ))}
                              {modules.length === 0 && <p className="text-sm text-fg-muted text-center">Nenhum módulo criado.</p>}
                          </div>
                      </div>
                  )}
              </div>
              <div className="p-6 border-t border-tint/6 flex justify-end gap-3 bg-tint/3">
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" form="course-form" className="px-6">Salvar</Button>
              </div>
          </div>
      </div>
  );

  // Detailed Article View
  if (selectedArticle) {
       return (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">


               <ArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} />
              {/* Reuse Edit Modal if admin wants to edit from here - maybe later */}
           </div>
       );
  }

  // Detailed Course View
  if (selectedCourse) {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Navigation Header */}
               <PageHeader
                   className="mb-0 sm:mb-0"
                   leading={
                      <button
                          onClick={() => setSelectedCourse(null)}
                          aria-label="Voltar"
                          className="p-2 hover:bg-tint/5 rounded-full text-fg-muted hover:text-accent-fg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                      >
                          <ArrowLeft size={24} />
                      </button>
                   }
                   eyebrow="Curso"
                   title={selectedCourse.title}
                   description={<span className="line-clamp-1">{selectedCourse.description}</span>}
                   actions={role === 'admin' && (
                       <Button
                         variant="secondary"
                         onClick={() => handleEditClick(selectedCourse)}
                       >
                           <Edit2 size={18} /> Editar Curso
                       </Button>
                   )}
               />

               {/* Content Layout */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                   {/* Main Player/Content Area */}
                   <div className="lg:col-span-2 space-y-6">
                       <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-tint/8 relative group">
                           {selectedLesson ? (
                               <iframe
                                 src={getEmbedUrl(selectedLesson.video_url)}
                                 className="w-full h-full"
                                 title={selectedLesson.title}
                                 referrerPolicy="strict-origin-when-cross-origin"
                                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                 allowFullScreen
                               />
                           ) : (
                               <>
                                   <img src={selectedCourse.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                                   <div className="relative z-10 flex flex-col items-center justify-center h-full text-white px-4 text-center">
                                       <div className="w-16 h-16 bg-brand-green text-brand-dark rounded-full flex items-center justify-center mb-4 shadow-[0_10px_40px_-12px_rgba(34,197,94,0.55)] animate-pulse">
                                           <Play className="ml-1 fill-current" size={32} />
                                       </div>
                                       <p className="font-display font-semibold text-lg">Selecione uma aula para iniciar</p>
                                   </div>
                               </>
                           )}
                       </div>

                       <Card>
                           <h3 className="font-display font-semibold text-lg mb-2 text-fg">
                               {selectedLesson ? `Sobre esta aula: ${selectedLesson.title}` : 'Sobre este curso'}
                           </h3>
                           <div className="text-fg-muted leading-relaxed whitespace-pre-wrap break-words">
                               {selectedLesson ? (
                                   selectedLesson.description || "Sem descrição disponível para esta aula."
                               ) : (
                                   selectedCourse.description
                               )}
                           </div>
                       </Card>
                   </div>

                   {/* Sidebar: Modules & Lessons */}
                   <div className="space-y-4">
                       <div className="flex items-center justify-between">
                           <h3 className="font-display font-semibold text-fg text-lg">Conteúdo do Curso</h3>
                           <Badge tone="accent" className="rounded-lg tabular-nums">{modules.length} Módulos</Badge>
                       </div>

                       <div className="space-y-3">
                           {modules.map((module, idx) => (
                               <div key={module.id} className="border border-tint/8 rounded-xl overflow-hidden bg-surface">
                                   <button
                                      onClick={() => toggleModule(module.id)}
                                      className="w-full flex items-center justify-between gap-2 p-4 bg-tint/3 hover:bg-tint/5 transition-colors text-left"
                                   >
                                       <div className="flex items-center gap-3 min-w-0">
                                           <span className="w-6 h-6 shrink-0 rounded-full bg-tint/8 text-fg-muted flex items-center justify-center text-xs font-semibold font-mono tabular-nums">{idx + 1}</span>
                                           <span className="font-semibold text-fg">{module.title}</span>
                                       </div>
                                       {expandedModules[module.id] ? <ChevronUp size={18} className="text-fg-subtle shrink-0" /> : <ChevronDown size={18} className="text-fg-subtle shrink-0" />}
                                   </button>

                                   {expandedModules[module.id] && (
                                       <div className="divide-y divide-tint/6 bg-surface">
                                           {module.lessons?.map((lesson, msgIdx) => (
                                               <button
                                                    key={lesson.id}
                                                    onClick={() => setSelectedLesson(lesson)}
                                                    className={`w-full flex items-center gap-3 p-3 pl-12 transition-colors text-left group ${selectedLesson?.id === lesson.id ? 'bg-accent/10 text-accent-fg' : 'hover:bg-tint/3'}`}
                                               >
                                                   <div className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center transition-colors ${selectedLesson?.id === lesson.id ? 'border-accent bg-accent text-white' : 'border-tint/15 text-fg-subtle group-hover:border-accent/40 group-hover:text-accent-fg'}`}>
                                                       <Play size={10} className={`ml-0.5 ${selectedLesson?.id === lesson.id ? 'fill-white' : 'fill-current'}`} />
                                                   </div>
                                                   <div className="flex-1 min-w-0">
                                                       <p className={`text-sm font-medium ${selectedLesson?.id === lesson.id ? 'text-accent-fg' : 'text-fg-muted group-hover:text-fg'}`}>{lesson.title}</p>
                                                       <span className="text-xs text-fg-subtle font-mono tabular-nums">{lesson.duration || '00:00'}</span>
                                                   </div>
                                               </button>
                                           ))}
                                           {(!module.lessons || module.lessons.length === 0) && (
                                               <div className="p-4 text-center text-xs text-fg-subtle italic">Em breve</div>
                                           )}
                                       </div>
                                   )}
                               </div>
                           ))}
                           {modules.length === 0 && (
                               <EmptyState className="py-8" title="Nenhum conteúdo disponível ainda." />
                           )}
                       </div>
                   </div>
               </div>

               {/* Re-using modal logic for consistency, though buttons hidden in view mode */}
               {isModalOpen && renderCourseModal()}
               {isLessonModalOpen && renderLessonModal()}
          </div>
      );
  }


  // Articles-only view
  if (articlesOnly) {
    return (
      <div className="space-y-6">
        <PageHeader
          className="mb-0 sm:mb-0"
          leading={onBack && <BackButton onClick={onBack} />}
          eyebrow="Conteúdo"
          title="Artigos e Análises"
          description="Conteúdo educacional e análises de mercado."
          actions={role === 'admin' && (
            <Button size="sm" onClick={() => openArticleModal()}>
              <Plus size={18} /> Novo Artigo
            </Button>
          )}
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" role="status">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card overflow-hidden rounded-xl">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
            <span className="sr-only">Carregando...</span>
          </div>
        ) : articles.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum artigo disponível." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="group glass-card glass-card-hover flex flex-col rounded-xl overflow-hidden cursor-pointer"
              >
                {/* Cover image */}
                <div className="relative aspect-video bg-tint/3">
                  {article.image_url ? (
                    <img loading="lazy" decoding="async" src={article.image_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-fg-subtle">
                      <FileText size={36} />
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <span className="text-[10px] font-medium text-accent-fg uppercase tracking-[0.2em] mb-1">{article.category || 'Geral'}</span>
                  <h4 className="font-display text-sm font-semibold text-fg mb-1 line-clamp-2 group-hover:text-accent-fg transition-colors">{article.title}</h4>
                  <p className="text-xs text-fg-muted line-clamp-2 flex-1">{article.excerpt}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-tint/6">
                    <div className="flex items-center gap-1 text-[10px] text-fg-subtle tabular-nums">
                      <Clock size={10} />
                      <span>{new Date(article.created_at || Date.now()).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {role === 'admin' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openArticleModal(article); }}
                        className="p-1 text-fg-subtle hover:text-accent-fg rounded-sm transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isArticleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative bg-surface border border-tint/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto ds-scrollbar">
              <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display text-xl font-semibold text-fg">{editingArticle ? 'Editar Artigo' : 'Novo Artigo'}</h3>
                <div className="flex items-center gap-2">
                  {editingArticle && (
                    <button type="button" onClick={() => handleDeleteArticle(editingArticle.id)} className="p-2 text-danger-fg hover:bg-danger/10 rounded-full transition-colors mr-2"><Trash2 size={20} /></button>
                  )}
                  <button onClick={() => setIsArticleModalOpen(false)} aria-label="Fechar" className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"><X size={24} /></button>
                </div>
              </div>
              <form onSubmit={handleSaveArticle} className="space-y-3">
                <Input type="text" placeholder="Título" required value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} />
                <Input type="text" placeholder="Categoria" value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})} />
                <Textarea placeholder="Resumo" rows={2} value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} className="min-h-0 rounded-xl" />
                <Textarea placeholder="Conteúdo" rows={5} value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} className="rounded-xl" />
                <Input type="text" placeholder="URL da Capa" value={articleForm.image_url} onChange={e => setArticleForm({...articleForm, image_url: e.target.value})} />
                <Button type="submit" size="lg" className="w-full mt-2 rounded-xl">
                  {editingArticle ? 'Salvar Alterações' : 'Publicar Artigo'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View (Biblioteca — cursos)
  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={onBack && <BackButton onClick={onBack} />}
        eyebrow="Biblioteca"
        title="Biblioteca de Conteúdo"
        description="Aprofunde seus conhecimentos em negociação algorítmica."
        actions={role === 'admin' && (
            <Button size="sm" onClick={handleCreateClick}>
                <Plus size={18} /> Novo Curso
            </Button>
        )}
      />

      {/* Course List */}
      <section>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" role="status">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card overflow-hidden rounded-xl">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              </div>
            ))}
            <span className="sr-only">Carregando...</span>
          </div>
        ) :
        courses.length === 0 ? <EmptyState icon={Play} title="Nenhum curso disponível." /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className={`group glass-card flex flex-col h-full rounded-xl overflow-hidden relative ${course.is_locked ? '' : 'glass-card-hover'}`}>
                {role === 'admin' && (
                    <div className="absolute top-2 right-2 z-20 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(course); }} className="p-2 bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:text-brand-green-bright rounded-lg transition-colors"><Edit2 size={16} /></button>
                    </div>
                )}
                {course.is_locked && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-1 bg-black/75 border border-white/10 text-white text-[10px] font-semibold uppercase tracking-[0.15em] rounded-lg">
                        <Lock size={12} /> Trancado
                    </div>
                )}
                <div className="relative aspect-video bg-tint/3">
                  <img loading="lazy" decoding="async" src={course.image_url || 'https://picsum.photos/400/225'} alt={course.title} className={`w-full h-full object-cover ${course.is_locked ? 'grayscale opacity-70' : ''}`} />
                  {course.is_locked ? (
                    <div
                      onClick={() => setLockedCourse(course)}
                      className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/40 backdrop-blur-[2px]"
                    >
                      <div className="w-14 h-14 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
                        <Lock size={22} />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleAccessCourse(course)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20"
                    >
                      <div className="w-12 h-12 rounded-full bg-brand-green text-brand-dark flex items-center justify-center shadow-[0_10px_40px_-12px_rgba(34,197,94,0.55)] transform group-hover:scale-110 transition-transform"><Play size={20} className="ml-1 fill-current" /></div>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                    <h4 className="font-display text-lg font-semibold text-fg mb-2">{course.title}</h4>
                    <p className="text-sm text-fg-muted line-clamp-2 mb-4 flex-1">{course.description}</p>
                    {course.is_locked ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setLockedCourse(course)}
                            className="w-full mt-auto"
                        >
                            <Lock size={14} /> Conteúdo trancado
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAccessCourse(course)}
                            className="w-full mt-auto hover:text-accent-fg"
                        >
                            Acessar
                        </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {isModalOpen && renderCourseModal()}
      {isLessonModalOpen && renderLessonModal()}

      {/* Locked course info modal (cliente) */}
      {lockedCourse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setLockedCourse(null)}>
          <div className="relative bg-surface border border-tint/10 rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative aspect-video bg-tint/3">
              <img src={lockedCourse.image_url || 'https://picsum.photos/400/225'} alt={lockedCourse.title} className="w-full h-full object-cover grayscale opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="w-16 h-16 rounded-full bg-black/85 border border-white/10 flex items-center justify-center text-white">
                  <Lock size={28} />
                </div>
              </div>
              <button onClick={() => setLockedCourse(null)} aria-label="Fechar" className="absolute top-3 right-3 w-9 h-9 bg-black/60 hover:bg-black/80 border border-white/10 rounded-full flex items-center justify-center text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="eyebrow-muted inline-block mb-2">Conteúdo trancado</span>
                <h3 className="font-display text-xl font-semibold text-fg">{lockedCourse.title}</h3>
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">{lockedCourse.description}</p>
              {lockedCourse.lock_note && (
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-sm text-warning-fg">
                  {lockedCourse.lock_note}
                </div>
              )}
              <Button
                variant="secondary"
                onClick={() => setLockedCourse(null)}
                className="w-full rounded-xl"
              >
                Entendi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Articles Section */}


      {/* Article Modal */}
      {isArticleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="relative bg-surface border border-tint/10 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto ds-scrollbar">
                  <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>
                  <div className="flex justify-between items-center mb-4">
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
                      <Input type="text" placeholder="Título" required value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} />
                      <Input type="text" placeholder="Categoria" value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})} />
                      <Textarea placeholder="Resumo" rows={2} value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} className="min-h-0 rounded-xl" />
                      <Textarea placeholder="Conteúdo Completo" rows={5} value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} className="rounded-xl" />

                      <div className="space-y-4 pt-2 border-t border-tint/6">
                          <label className="block eyebrow-muted">Imagens e Galeria</label>

                          {/* Main Image */}
                          <div className="space-y-2">
                              <span className="text-xs font-semibold text-fg-muted">Imagem de Capa</span>
                              <div className="flex gap-4">
                                  {articleForm.image_url && (
                                      <img src={articleForm.image_url} alt="" className="w-20 h-20 shrink-0 object-cover rounded-lg border border-tint/10" />
                                  )}
                                  <label className="flex-1 flex flex-col items-center justify-center min-h-12 border-2 border-dashed border-tint/10 rounded-xl hover:border-accent/60 cursor-pointer transition-all bg-tint/3">
                                      <div className="flex items-center gap-2">
                                          {isUploading ? <Loader2 className="animate-spin text-accent-fg" size={16} /> : <Upload size={16} className="text-fg-subtle" />}
                                          <span className="text-xs font-semibold text-fg-muted">Subir Capa</span>
                                      </div>
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'article')} />
                                  </label>
                              </div>
                              <input type="text" placeholder="URL da Capa" value={articleForm.image_url} onChange={e => setArticleForm({...articleForm, image_url: e.target.value})} className="w-full text-[10px] text-fg bg-transparent border-b border-tint/10 py-1 outline-hidden placeholder:text-fg-subtle focus:border-accent/60" />
                          </div>

                          {/* Gallery */}
                          <div className="space-y-2">
                              <div className="flex justify-between items-center gap-2">
                                  <span className="text-xs font-semibold text-fg-muted">Galeria de Imagens</span>
                                  <label className="text-[10px] font-semibold tracking-wider text-accent-fg hover:underline underline-offset-4 cursor-pointer flex items-center gap-1">
                                      <Plus size={12} /> ADICIONAR À GALERIA
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'gallery')} />
                                  </label>
                              </div>
                              <Textarea
                                placeholder="URLs da Galeria (uma por linha)"
                                rows={3}
                                value={articleForm.gallery_urls_input}
                                onChange={e => setArticleForm({...articleForm, gallery_urls_input: e.target.value})}
                                className="min-h-0 rounded-xl text-xs font-mono"
                              />
                          </div>
                      </div>

                      <Button type="submit" size="lg" disabled={isUploading} className="w-full mt-4 rounded-xl">
                          {isUploading ? 'ENVIANDO...' : (editingArticle ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR ARTIGO')}
                      </Button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
