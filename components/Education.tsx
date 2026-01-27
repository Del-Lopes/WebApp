import React, { useState, useEffect } from 'react';
import { Play, FileText, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { MOCK_ARTICLES } from '../constants';
import { supabase } from '../lib/supabase';

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string;
  external_link: string; // duration mapped here for simpler schema or null
  created_at: string;
}

export const Education: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Academia de Trading</h2>
        <p className="text-slate-500 text-sm">Aprofunde seus conhecimentos em negociação algorítmica.</p>
      </div>

      {/* Video Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
            <Play size={18} className="fill-current" />
            Aulas em Vídeo
          </h3>
          <button className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">Ver todos</button>
        </div>
        
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
              <div key={course.id} className="group cursor-pointer">
                <div className="relative overflow-hidden rounded-xl aspect-video mb-3 border border-slate-200 group-hover:border-green-500/50 transition-all shadow-sm hover:shadow-md bg-slate-100">
                  {course.image_url ? (
                    <img 
                      src={course.image_url} 
                      alt={course.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                       <Play size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-green-600/90 flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-90 group-hover:scale-100 transition-all">
                      <Play size={20} className="ml-1 fill-white" />
                    </div>
                  </div>
                  {/* Assuming external_link might hold duration string or extra info temporarily */}
                  {/* <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium text-white">
                    {course.external_link || '10:00'}
                  </div> */}
                </div>
                <h4 className="text-slate-900 font-medium group-hover:text-green-600 transition-colors line-clamp-2">{course.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{course.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Articles Section */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
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
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Clock size={12} />
                <span>{article.date}</span>
                <span>•</span>
                <span className="text-green-600/80 uppercase tracking-wide font-semibold">Análise Técnica</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};