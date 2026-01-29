import React, { useState, useEffect } from 'react';
import { Play, FileText, Clock, ChevronRight, Loader2, Plus, Edit2, Trash2, Save, X, MoreVertical, Layout } from 'lucide-react';
import { MOCK_ARTICLES } from '../constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Product, Module, Lesson } from '../types';

export const Education: React.FC = () => {
  const { role } = useAuth();
  const [courses, setCourses] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Product | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  
  // Form State
  const [courseForm, setCourseForm] = useState({ title: '', description: '', image_url: '' });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('type', 'course')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (course: Product) => {
    setEditingCourse(course);
    setCourseForm({
       title: course.title,
       description: course.description,
       image_url: course.image_url
    });
    // Fetch content (Modules/Lessons)
    try {
        const { data: modData } = await supabase
            .from('modules')
            .select('*, lessons(*)')
            .eq('product_id', course.id)
            .order('order_index');
        setModules(modData as any || []);
    } catch (e) {
        console.error("Error fetching modules", e);
        setModules([]);
    }
    setIsModalOpen(true);
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
              // Update
              const { error } = await supabase
                .from('products')
                .update({ 
                    title: courseForm.title, 
                    description: courseForm.description, 
                    image_url: courseForm.image_url 
                })
                .eq('id', editingCourse.id);
              if (error) throw error;
          } else {
              // Create
              const { error } = await supabase
                .from('products')
                .insert({
                    type: 'course',
                    title: courseForm.title,
                    description: courseForm.description,
                    image_url: courseForm.image_url || 'https://picsum.photos/400/225'
                });
              if (error) throw error;
          }
          setIsModalOpen(false);
          fetchCourses();
      } catch (e: any) {
          alert("Erro ao salvar curso: " + e.message);
      }
  };

  const handleDeleteCourse = async (id: string) => {
      if(!window.confirm("Tem certeza que deseja excluir este curso?")) return;
      try {
          // Note: Needs cascading delete in DB or manual delete of modules/lessons
          await supabase.from('products').delete().eq('id', id);
          fetchCourses();
      } catch (e: any) {
          alert("Erro: " + e.message);
      }
  };

  // --- Render ---

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Academia de Trading</h2>
          <p className="text-slate-500 text-sm">Aprofunde seus conhecimentos em negociação algorítmica.</p>
        </div>
        {role === 'admin' && (
            <button 
                onClick={handleCreateClick}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
            >
                <Plus size={18} /> Novo Curso
            </button>
        )}
      </div>

      {/* Course List */}
      <section>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-green-600" size={32} />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 text-slate-500">
            Nenhum curso disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="group flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all relative">
                
                {/* Admin Actions Overlay */}
                {role === 'admin' && (
                    <div className="absolute top-2 right-2 z-20 flex gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleEditClick(course); }}
                            className="p-2 bg-white/90 hover:bg-white text-slate-600 hover:text-green-600 rounded-lg shadow-sm backdrop-blur-sm transition-all"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                            className="p-2 bg-white/90 hover:bg-white text-slate-600 hover:text-red-600 rounded-lg shadow-sm backdrop-blur-sm transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}

                <div className="relative aspect-video bg-slate-100 group-hover:opacity-90 transition-opacity">
                  {course.image_url ? (
                    <img 
                      src={course.image_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                       <Play size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white shadow-xl transform scale-50 group-hover:scale-100 transition-transform">
                      <Play size={20} className="ml-1 fill-white" />
                    </div>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                    <h4 className="text-lg font-bold text-slate-900 mb-2 leading-tight">{course.title}</h4>
                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{course.description}</p>
                    <button className="w-full mt-auto py-2 bg-slate-50 hover:bg-green-50 text-slate-600 hover:text-green-600 font-semibold rounded-lg text-sm transition-colors">
                        Começar Agora
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Editor Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                      <h3 className="text-xl font-bold text-slate-800">
                          {editingCourse ? 'Editar Curso' : 'Novo Curso'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {/* Basic Info */}
                      <form id="course-form" onSubmit={handleSaveCourse} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Título do Curso</label>
                              <input 
                                  type="text" 
                                  required
                                  value={courseForm.title}
                                  onChange={e => setCourseForm({...courseForm, title: e.target.value})}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                              <textarea 
                                  rows={3}
                                  value={courseForm.description}
                                  onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">URL da Imagem (Capa)</label>
                              <input 
                                  type="text" 
                                  value={courseForm.image_url}
                                  onChange={e => setCourseForm({...courseForm, image_url: e.target.value})}
                                  placeholder="https://..."
                                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                              />
                          </div>
                      </form>

                      {/* Modules/Lessons Manager - Only if editing existing course for now */}
                      {editingCourse ? (
                          <div className="border-t border-slate-200 pt-6">
                              <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                      <Layout size={18} /> Conteúdo do Curso
                                  </h4>
                                  <button className="text-sm text-green-600 font-semibold hover:underline">
                                      + Adicionar Módulo
                                  </button>
                              </div>
                              
                              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center text-slate-500 text-sm">
                                  <p>Gerenciamento de aulas disponível em breve.</p>
                                  <p className="text-xs mt-1">(Esta funcionalidade requer tabelas 'modules' e 'lessons' configuradas)</p>
                              </div>
                          </div>
                      ) : (
                          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
                              Salve o curso primeiro para adicionar aulas.
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl bg-slate-50">
                      <button 
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          type="submit"
                          form="course-form"
                          className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 shadow-lg shadow-green-600/20 transition-all"
                      >
                          Salvar Curso
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Articles Section (Static for now) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {/* ... existing articles code ... */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
            <FileText size={18} />
            Artigos e Análises
          </h3>
        </div>
        <div className="space-y-4">
          {MOCK_ARTICLES.map((article) => (
            <div key={article.id} className="group p-4 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all cursor-pointer">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-medium text-slate-800 group-hover:text-green-600 transition-colors">{article.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{article.excerpt}</p>
                </div>
                <ChevronRight size={18} className="text-slate-400 group-hover:text-green-500 mt-1 shrink-0 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};