import React, { useState, useEffect } from 'react';
import { Play, FileText, Clock, ChevronRight, Loader2, Plus, Edit2, Trash2, Save, X, MoreVertical, Layout, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { MOCK_ARTICLES } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Product, Module, Lesson, Article } from '../types';

export const Education: React.FC = () => {
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
  const [courseForm, setCourseForm] = useState({ title: '', description: '', image_url: '' });

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
  const [articleForm, setArticleForm] = useState({ title: '', excerpt: '', content: '', image_url: '', category: 'Análise' });

  // Module Expansion State for Viewer
  const [expandedModules, setExpandedModules] = useState<{[key: string]: boolean}>({});

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
          const { data } = await supabase.from('articles').select('*').order('created_at', {ascending: false});
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
    setCourseForm({ title: course.title, description: course.description, image_url: course.image_url });
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
      setCourseForm({ title: '', description: '', image_url: '' });
      setModules([]);
      setIsModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (editingCourse) {
              await supabase.from('products').update({ ...courseForm }).eq('id', editingCourse.id);
          } else {
              await supabase.from('products').insert({ type: 'course', ...courseForm, image_url: courseForm.image_url || 'https://picsum.photos/400/225' });
          }
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
          await supabase.from('modules').insert({ product_id: editingCourse.id, title, order_index: modules.length });
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
          if (editingArticle) {
              await supabase.from('articles').update(articleForm).eq('id', editingArticle.id);
          } else {
              await supabase.from('articles').insert(articleForm);
          }
          setIsArticleModalOpen(false);
          fetchArticles();
      } catch(e: any) { alert("Erro: " + e.message); }
  };

  const openArticleModal = (article?: Article) => {
      if (article) {
          setEditingArticle(article);
          setArticleForm({ title: article.title, excerpt: article.excerpt, content: article.content || '', image_url: article.image_url || '', category: article.category || 'Análise' });
      } else {
          setEditingArticle(null);
          setArticleForm({ title: '', excerpt: '', content: '', image_url: '', category: 'Análise' });
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800">{editingLesson ? 'Editar Aula' : 'Nova Aula'}</h3>
                  <button onClick={() => setIsLessonModalOpen(false)}><X size={24} className="text-slate-400" /></button>
              </div>
              <form onSubmit={handleSaveLesson} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium mb-1">Título</label>
                      <input type="text" required value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500" />
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-1">Video URL (Youtube/Vimeo)</label>
                      <input type="text" value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500" placeholder="https://..." />
                  </div>
                  <div>
                       <label className="block text-sm font-medium mb-1">Duração</label>
                       <input type="text" value={lessonForm.duration} onChange={e => setLessonForm({...lessonForm, duration: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500" placeholder="05:00" />
                  </div>
                  <div>
                       <label className="block text-sm font-medium mb-1">Descrição / Material de Apoio</label>
                       <textarea rows={4} value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500" placeholder="Sobre esta aula..." />
                  </div>
                  <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-500 mt-2">Salvar Aula</button>
              </form>
          </div>
      </div>
  );

  const renderCourseModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                  <h3 className="text-xl font-bold text-slate-800">{editingCourse ? 'Editar Curso' : 'Novo Curso'}</h3>
                  <div className="flex items-center gap-2">
                      {editingCourse && (
                          <button 
                            type="button" 
                            onClick={() => handleDeleteCourse(editingCourse.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors mr-2"
                            title="Excluir Curso"
                          >
                              <Trash2 size={20} />
                          </button>
                      )}
                      <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
                  </div>
              </div>
              <div className="p-6 space-y-6">
                  <form id="course-form" onSubmit={handleSaveCourse} className="space-y-4">
                      <div><label className="block text-sm font-medium mb-1">Título</label><input type="text" required value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none" /></div>
                      <div><label className="block text-sm font-medium mb-1">Descrição</label><textarea rows={3} value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none" /></div>
                      <div><label className="block text-sm font-medium mb-1">Imagem URL</label><input type="text" value={courseForm.image_url} onChange={e => setCourseForm({...courseForm, image_url: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none" /></div>
                  </form>

                  {editingCourse && (
                      <div className="border-t border-slate-200 pt-6">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-slate-700 flex items-center gap-2"><Layout size={18} /> Conteúdo</h4>
                              <button onClick={handleAddModule} className="text-sm text-green-600 font-semibold hover:underline">+ Módulo</button>
                          </div>
                          <div className="space-y-3">
                              {modules.map((mod) => (
                                  <div key={mod.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                      <div className="flex justify-between items-center mb-2">
                                          <div className="flex items-center gap-2">
                                              <span className="font-semibold text-slate-800">{mod.title}</span>
                                              <button onClick={() => handleDeleteModule(mod.id)} className="text-slate-400 hover:text-red-500 transition-colors" title="Excluir Módulo">
                                                  <Trash2 size={14} />
                                              </button>
                                          </div>
                                          <button onClick={() => openLessonModal(mod.id)} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded hover:bg-green-50 hover:text-green-600 font-medium">+ Aula</button>
                                      </div>
                                      <div className="pl-4 space-y-1">
                                          {mod.lessons?.map(lesson => (
                                              <div key={lesson.id} className="flex items-center justify-between text-sm text-slate-600 bg-white p-2 rounded border border-transparent hover:border-slate-200 group">
                                                  <div className="flex items-center gap-2">
                                                      <Play size={12} className="text-slate-400" /> {lesson.title}
                                                  </div>
                                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button onClick={() => openLessonModal(mod.id, lesson)} className="text-slate-400 hover:text-green-600" title="Editar Aula">
                                                          <Edit2 size={14} />
                                                      </button>
                                                      <button onClick={() => handleDeleteLesson(lesson.id)} className="text-slate-400 hover:text-red-500" title="Excluir Aula">
                                                          <Trash2 size={14} />
                                                      </button>
                                                  </div>
                                              </div>
                                          ))}
                                          {!mod.lessons?.length && <p className="text-xs text-slate-400 italic">Sem aulas.</p>}
                                      </div>
                                  </div>
                              ))}
                              {modules.length === 0 && <p className="text-sm text-slate-500 text-center">Nenhum módulo criado.</p>}
                          </div>
                      </div>
                  )}
              </div>
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancelar</button>
                  <button type="submit" form="course-form" className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 shadow-lg">Salvar</button>
              </div>
          </div>
      </div>
  );

  // Detailed Article View
  if (selectedArticle) {
       return (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-4 mb-6">
                 <button 
                     onClick={() => setSelectedArticle(null)}
                     className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-green-600 transition-colors"
                 >
                     <ArrowLeft size={24} />
                 </button>
                 <span className="font-semibold text-slate-500">Voltar para Academia</span>
              </div>
              
              <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
                  {selectedArticle.image_url && (
                      <div className="w-full h-64 md:h-96 relative">
                          <img src={selectedArticle.image_url} alt={selectedArticle.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 p-8 text-white">
                              <span className="inline-block px-3 py-1 bg-green-600 rounded-lg text-xs font-bold uppercase tracking-wide mb-2">
                                  {selectedArticle.category || 'Análise'}
                              </span>
                              <h1 className="text-3xl md:text-4xl font-bold leading-tight">{selectedArticle.title}</h1>
                          </div>
                      </div>
                  )}
                  {!selectedArticle.image_url && (
                       <div className="p-8 pb-4">
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase tracking-wide mb-2">
                                  {selectedArticle.category || 'Análise'}
                             </span>
                          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{selectedArticle.title}</h1>
                       </div>
                  )}
                  
                  <div className="px-8 py-2 md:px-12 flex items-center gap-4 text-sm text-slate-500 border-b border-slate-100 pb-6 mb-6">
                      <div className="flex items-center gap-1"><Clock size={16} /> {new Date(selectedArticle.created_at || Date.now()).toLocaleDateString()}</div>
                      <div>•</div>
                      <div className="font-medium text-green-600">Equipe Tradexperience</div>
                  </div>

                  <div className="px-8 md:px-12 pb-12">
                      <div className="prose prose-lg prose-slate max-w-none">
                          <p className="lead text-xl text-slate-600 mb-8 font-light">{selectedArticle.excerpt}</p>
                          <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                              {selectedArticle.content}
                          </div>
                      </div>
                  </div>
              </article>
              {/* Reuse Edit Modal if admin wants to edit from here - maybe later */}
           </div>
       );
  }

  // Detailed Course View
  if (selectedCourse) {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               {/* Navigation Header */}
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <button 
                          onClick={() => setSelectedCourse(null)}
                          className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-green-600 transition-colors"
                      >
                          <ArrowLeft size={24} />
                      </button>
                      <div>
                          <h2 className="text-2xl font-bold text-slate-900">{selectedCourse.title}</h2>
                          <p className="text-sm text-slate-500 line-clamp-1">{selectedCourse.description}</p>
                      </div>
                   </div>
                   {role === 'admin' && (
                       <button 
                         onClick={() => handleEditClick(selectedCourse)}
                         className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                       >
                           <Edit2 size={18} /> Editar Curso
                       </button>
                   )}
               </div>

               {/* Content Layout */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Main Player/Content Area */}
                   <div className="lg:col-span-2 space-y-6">
                       <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lg relative group">
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
                                   <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
                                       <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg animate-pulse">
                                           <Play className="ml-1 fill-white" size={32} />
                                       </div>
                                       <p className="font-semibold text-lg">Selecione uma aula para iniciar</p>
                                   </div>
                               </>
                           )}
                       </div>
                       
                       <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                           <h3 className="font-bold text-lg mb-2 text-slate-900">
                               {selectedLesson ? `Sobre esta aula: ${selectedLesson.title}` : 'Sobre este curso'}
                           </h3>
                           <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                               {selectedLesson ? (
                                   selectedLesson.description || "Sem descrição disponível para esta aula."
                               ) : (
                                   selectedCourse.description
                               )}
                           </div>
                       </div>
                   </div>

                   {/* Sidebar: Modules & Lessons */}
                   <div className="space-y-4">
                       <div className="flex items-center justify-between">
                           <h3 className="font-bold text-slate-900 text-lg">Conteúdo do Curso</h3>
                           <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{modules.length} Módulos</span>
                       </div>
                       
                       <div className="space-y-3">
                           {modules.map((module, idx) => (
                               <div key={module.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                   <button 
                                      onClick={() => toggleModule(module.id)}
                                      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                                   >
                                       <div className="flex items-center gap-3">
                                           <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                           <span className="font-semibold text-slate-800">{module.title}</span>
                                       </div>
                                       {expandedModules[module.id] ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                   </button>
                                   
                                   {expandedModules[module.id] && (
                                       <div className="divide-y divide-slate-100 bg-white">
                                           {module.lessons?.map((lesson, msgIdx) => (
                                               <button 
                                                    key={lesson.id} 
                                                    onClick={() => setSelectedLesson(lesson)}
                                                    className={`w-full flex items-center gap-3 p-3 pl-12 transition-colors text-left group ${selectedLesson?.id === lesson.id ? 'bg-green-50 text-green-700' : 'hover:bg-slate-50'}`}
                                               >
                                                   <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${selectedLesson?.id === lesson.id ? 'border-green-500 bg-green-500 text-white' : 'border-slate-200 text-slate-300 group-hover:border-green-300 group-hover:text-green-500'}`}>
                                                       <Play size={10} className={`ml-0.5 ${selectedLesson?.id === lesson.id ? 'fill-white' : 'fill-current'}`} />
                                                   </div>
                                                   <div className="flex-1">
                                                       <p className={`text-sm font-medium ${selectedLesson?.id === lesson.id ? 'text-green-800' : 'text-slate-600 group-hover:text-green-700'}`}>{lesson.title}</p>
                                                       <span className="text-xs text-slate-400 font-mono">{lesson.duration || '00:00'}</span>
                                                   </div>
                                               </button>
                                           ))}
                                           {(!module.lessons || module.lessons.length === 0) && (
                                               <div className="p-4 text-center text-xs text-slate-400 italic">Em breve</div>
                                           )}
                                       </div>
                                   )}
                               </div>
                           ))}
                           {modules.length === 0 && (
                               <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                   Nenhum conteúdo disponível ainda.
                               </div>
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


  // List View
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Biblioteca de Conteúdo</h2>
          <p className="text-slate-500 text-sm">Aprofunde seus conhecimentos em negociação algorítmica.</p>
        </div>
        {role === 'admin' && (
            <button onClick={handleCreateClick} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                <Plus size={18} /> Novo Curso
            </button>
        )}
      </div>

      {/* Course List */}
      <section>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={32} /></div> : 
        courses.length === 0 ? <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-500">Nenhum curso disponível.</div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="group flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all relative">
                {role === 'admin' && (
                    <div className="absolute top-2 right-2 z-20 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEditClick(course); }} className="p-2 bg-white/90 text-slate-600 hover:text-green-600 rounded-lg shadow-sm"><Edit2 size={16} /></button>
                         {/* Delete would go here */}
                    </div>
                )}
                <div className="relative aspect-video bg-slate-100">
                  <img src={course.image_url || 'https://picsum.photos/400/225'} alt={course.title} className="w-full h-full object-cover" />
                  <div 
                    onClick={() => handleAccessCourse(course)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-transform"><Play size={20} className="ml-1 fill-white" /></div>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                    <h4 className="text-lg font-bold text-slate-900 mb-2">{course.title}</h4>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{course.description}</p>
                    <button 
                        onClick={() => handleAccessCourse(course)}
                        className="w-full mt-auto py-2 bg-slate-50 hover:bg-green-50 text-slate-600 hover:text-green-600 font-semibold rounded-lg text-sm transition-colors"
                    >
                        Acessar
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {isModalOpen && renderCourseModal()}
      {isLessonModalOpen && renderLessonModal()}

      {/* Articles Section */}


      {/* Article Modal */}
      {isArticleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
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
                        <button onClick={() => setIsArticleModalOpen(false)}><X size={24} className="text-slate-400" /></button>
                      </div>
                  </div>
                  <form onSubmit={handleSaveArticle} className="space-y-4">
                      <input type="text" placeholder="Título" required value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                      <input type="text" placeholder="Categoria" value={articleForm.category} onChange={e => setArticleForm({...articleForm, category: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                      <textarea placeholder="Resumo" rows={2} value={articleForm.excerpt} onChange={e => setArticleForm({...articleForm, excerpt: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                      <textarea placeholder="Conteúdo Completo" rows={5} value={articleForm.content} onChange={e => setArticleForm({...articleForm, content: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                      <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-500">Salvar Artigo</button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};