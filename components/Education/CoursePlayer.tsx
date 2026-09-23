
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

  if (loading) return <div className="p-8 text-center">Carregando curso...</div>;
  if (modules.length === 0) return <div className="p-8 text-center">Curso sem conteúdo disponível.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:flex-row bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Main Content (Video) */}
        <div className="flex-1 flex flex-col bg-slate-900 relative">
            <div className="absolute top-4 left-4 z-10 lg:hidden">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-slate-800 text-white rounded-lg">
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
                                <p className="text-sm text-slate-400 mt-2">{activeLesson.title}</p>
                            </div>
                        </div>
                    ) : (
                         <div className="text-slate-500">Selecione uma aula</div>
                    )
                ) : (
                    <div className="text-slate-500">Selecione uma aula para começar</div>
                )}
            </div>
            
            <div className="p-6 bg-white border-t border-slate-200">
                 <h2 className="text-xl font-bold text-slate-900">{activeLesson?.title || 'Curso'}</h2>
                 <p className="text-slate-500 text-sm mt-1">{activeLesson?.duration || '00:00'} • Aula Prática</p>
            </div>
        </div>

        {/* Sidebar (Modules) */}
        <div className={`${sidebarOpen ? 'w-full lg:w-80' : 'hidden'} lg:block border-l border-slate-200 bg-slate-50 overflow-y-auto`}>
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-slate-800">Conteúdo do Curso</h3>
                <p className="text-xs text-slate-500">{modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} aulas</p>
            </div>
            
            <div className="divide-y divide-slate-100">
                {modules.map((module) => (
                    <div key={module.id} className="bg-white">
                        <button 
                            onClick={() => toggleModule(module.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                        >
                            <span className="font-semibold text-sm text-slate-700">{module.title}</span>
                            {expandedModules[module.id] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                        </button>
                        
                        {expandedModules[module.id] && (
                            <div className="bg-slate-50">
                                {module.lessons?.map((lesson) => (
                                    <button
                                        key={lesson.id}
                                        onClick={() => setActiveLesson(lesson)}
                                        className={`w-full flex items-center gap-3 p-3 pl-6 text-sm transition-colors border-l-4 ${
                                            activeLesson?.id === lesson.id 
                                            ? 'border-green-500 bg-green-50 text-green-700' 
                                            : 'border-transparent hover:bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        <div className="shrink-0">
                                            {activeLesson?.id === lesson.id ? <PlayCircle size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300"></div>}
                                        </div>
                                        <span className="truncate">{lesson.title}</span>
                                        <span className="ml-auto text-xs text-slate-400">{lesson.duration}</span>
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
