
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Module, Lesson } from '../../types';
import { PlayCircle, CheckCircle, Lock, ChevronDown, ChevronRight, Menu } from 'lucide-react';

// Mock Props for now, ideally passed via router params
interface CoursePlayerProps {
    courseId?: string; // If not provided, we might fetch the first available course
    onBack?: () => void;
}

export const CoursePlayer: React.FC<CoursePlayerProps> = ({ courseId, onBack }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCourseContent();
  }, []);

  const fetchCourseContent = async () => {
    try {
        // Fetch all modules for the first course found if no ID (for demo simplicity)
        // In real app, we use courseId
        let targetCourseId = courseId;
        
        if (!targetCourseId) {
            const { data: courses } = await supabase.from('products').select('id').eq('type', 'course').limit(1);
            if (courses && courses.length > 0) targetCourseId = courses[0].id;
        }

        if (!targetCourseId) {
            setLoading(false);
            return;
        }

        const { data: modulesData, error } = await supabase
            .from('modules')
            .select(`
                *,
                lessons ( * )
            `)
            .eq('product_id', targetCourseId)
            .order('order_index', { ascending: true });

        if (error) throw error;
        
        // Sort lessons within modules
        const formattedModules = modulesData?.map((m: any) => ({
            ...m,
            lessons: m.lessons.sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
        })) as Module[];

        setModules(formattedModules);
        
        // Auto expand first module and select first lesson
        if (formattedModules.length > 0) {
            setExpandedModules({ [formattedModules[0].id]: true });
            if (formattedModules[0].lessons && formattedModules[0].lessons.length > 0) {
                setActiveLesson(formattedModules[0].lessons[0]);
            }
        }
    } catch (error) {
        console.error('Error fetching course:', error);
    } finally {
        setLoading(false);
    }
  };

  const toggleModule = (modId: string) => {
      setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  if (loading) return <div className="p-8 text-center text-fg-muted">Carregando curso...</div>;
  if (modules.length === 0) return <div className="p-8 text-center text-fg-muted">Curso sem conteúdo disponível.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:flex-row bg-surface border border-tint/8 rounded-2xl overflow-hidden">
        {/* Main Content (Video) */}
        <div className="flex-1 flex flex-col bg-black relative">
            <div className="absolute top-4 left-4 z-10 lg:hidden">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-black/60 border border-white/10 text-white rounded-lg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60">
                    <Menu size={20} />
                </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center bg-black">
                {activeLesson ? (
                    activeLesson.video_url ? (
                        <div className="w-full h-full flex items-center justify-center text-white">
                            {/* Placeholder for iframe */}
                            <div className="text-center">
                                <PlayCircle size={64} className="mx-auto mb-4 opacity-50" />
                                <p>Player de Vídeo Simulador</p>
                                <p className="text-sm text-white/60 mt-2">{activeLesson.title}</p>
                            </div>
                        </div>
                    ) : (
                         <div className="text-white/50">Selecione uma aula</div>
                    )
                ) : (
                    <div className="text-white/50">Selecione uma aula para começar</div>
                )}
            </div>
            
            <div className="p-6 bg-surface border-t border-tint/8">
                 <h2 className="font-display text-xl font-semibold text-fg">{activeLesson?.title || 'Curso'}</h2>
                 <p className="text-fg-muted text-sm mt-1 tabular-nums">{activeLesson?.duration || '00:00'} • Aula Prática</p>
            </div>
        </div>

        {/* Sidebar (Modules) */}
        <div className={`${sidebarOpen ? 'w-full lg:w-80' : 'hidden'} lg:block border-t lg:border-t-0 lg:border-l border-tint/8 bg-page overflow-y-auto ds-scrollbar`}>
            <div className="p-4 border-b border-tint/8 bg-surface sticky top-0 z-10">
                <h3 className="font-display font-semibold text-fg">Conteúdo do Curso</h3>
                <p className="text-xs text-fg-muted">{modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} aulas</p>
            </div>
            
            <div className="divide-y divide-tint/6">
                {modules.map((module) => (
                    <div key={module.id} className="bg-surface">
                        <button 
                            onClick={() => toggleModule(module.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-tint/3 transition-colors text-left"
                        >
                            <span className="font-semibold text-sm text-fg">{module.title}</span>
                            {expandedModules[module.id] ? <ChevronDown size={16} className="text-fg-subtle" /> : <ChevronRight size={16} className="text-fg-subtle" />}
                        </button>
                        
                        {expandedModules[module.id] && (
                            <div className="bg-page">
                                {module.lessons?.map((lesson) => (
                                    <button
                                        key={lesson.id}
                                        onClick={() => setActiveLesson(lesson)}
                                        className={`w-full flex items-center gap-3 p-3 pl-6 text-sm transition-colors border-l-4 ${
                                            activeLesson?.id === lesson.id 
                                            ? 'border-accent bg-accent/10 text-accent-fg' 
                                            : 'border-transparent hover:bg-tint/5 text-fg-muted hover:text-fg'
                                        }`}
                                    >
                                        <div className="shrink-0">
                                            {activeLesson?.id === lesson.id ? <PlayCircle size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-tint/20"></div>}
                                        </div>
                                        <span className="truncate">{lesson.title}</span>
                                        <span className="ml-auto text-xs text-fg-subtle tabular-nums">{lesson.duration}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
