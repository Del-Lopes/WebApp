import React, { useState } from 'react';
import { ArrowLeft, Download, FileText, Settings, Smartphone, Monitor, ChevronRight } from 'lucide-react';

interface DownloadsProps {
  onBack: () => void;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'Platform' | 'Indicator' | 'Utility' | 'Document';
  platform: 'Windows' | 'Mac' | 'Mobile' | 'PDF';
  version?: string;
  size?: string;
  downloadUrl: string;
  icon: React.ReactNode;
}

export const Downloads: React.FC<DownloadsProps> = ({ onBack }) => {
  const tools: Tool[] = [
    {
      id: 'mt5-terminal',
      name: 'MetaTrader 5 Terminal',
      description: 'Plataforma oficial de negociação para desktop. Análises avançadas e execução rápida.',
      category: 'Platform',
      platform: 'Windows',
      version: '5.0.38',
      size: '120 MB',
      downloadUrl: '#',
      icon: <Monitor size={24} className="text-blue-600" />
    },
    {
      id: 'mt5-mobile',
      name: 'MetaTrader 5 Mobile',
      description: 'Acompanhe suas operações em qualquer lugar. Disponível para iOS e Android.',
      category: 'Platform',
      platform: 'Mobile',
      downloadUrl: '#',
      icon: <Smartphone size={24} className="text-green-600" />
    },
    {
      id: 'setup-manual',
      name: 'Manual de Instalação (PDF)',
      description: 'Guia completo passo-a-passo para configurar seu ambiente de trading.',
      category: 'Document',
      platform: 'PDF',
      size: '2.5 MB',
      downloadUrl: '#',
      icon: <FileText size={24} className="text-red-500" />
    },
    {
      id: 'custom-indicator',
      name: 'Indicador AFK Trend',
      description: 'Indicador exclusivo para identificação de tendências e pontos de entrada.',
      category: 'Indicator',
      platform: 'Windows',
      version: '1.2',
      size: '50 KB',
      downloadUrl: '#',
      icon: <TrendingUpIcon />
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="text-slate-400 group-hover:text-slate-600 transition-colors" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Download className="text-blue-600" />
            Downloads e Ferramentas
          </h1>
          <p className="text-slate-500">Recursos essenciais para sua operação.</p>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div key={tool.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                {tool.icon}
              </div>
              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg uppercase tracking-wide">
                {tool.platform}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              {tool.name}
            </h3>
            <p className="text-slate-500 text-sm mb-6 min-h-[40px]">
              {tool.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
               <div className="text-xs text-slate-400">
                 {tool.version && <span className="mr-2">v{tool.version}</span>}
                 {tool.size && <span>{tool.size}</span>}
               </div>
               
               <a 
                 href={tool.downloadUrl}
                 className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
                 onClick={(e) => {
                    e.preventDefault();
                    alert('Download iniciado (Simulação)');
                 }}
               >
                 Baixar
                 <Download size={16} />
               </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper component for the icon
const TrendingUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
);
