import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, ShieldCheck, Activity, BarChart2, BookOpen, Edit2, X, Save, Plus, Trash2 } from 'lucide-react';
import { Robot, UserRole } from '../types';

interface RobotDetailsProps {
  robot: Robot;
  onBack: () => void;
  userRole: UserRole;
  onUpdate: (updatedRobot: Robot) => void;
}

export const RobotDetails: React.FC<RobotDetailsProps> = ({ robot, onBack, userRole, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Robot>(robot);

  // Sync state if prop changes
  useEffect(() => {
    setFormData(robot);
  }, [robot]);

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(robot);
    setIsEditing(false);
  };

  // Generic input handler
  const handleChange = (field: keyof Robot, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Image handlers
  const addImage = (type: 'images' | 'manualImages') => {
    const url = window.prompt("Insira a URL da imagem:");
    if (url) {
      setFormData(prev => ({
        ...prev,
        [type]: [...(prev[type] || []), url]
      }));
    }
  };

  const removeImage = (type: 'images' | 'manualImages', index: number) => {
    if (window.confirm("Remover esta imagem?")) {
      setFormData(prev => ({
        ...prev,
        [type]: (prev[type] || []).filter((_, i) => i !== index)
      }));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-green-600 transition-colors group self-start"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para Estratégias</span>
        </button>
        
        <div className="flex items-center gap-3">
           <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                formData.status === 'active' 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {formData.status === 'active' ? 'Rodando' : 'Parado'}
          </span>
          <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
            v{formData.version}
          </span>
          
          {/* Admin Edit Controls */}
          {userRole === 'admin' && (
            <div className="ml-2 flex gap-2">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors shadow-sm"
                  >
                    <Save size={16} /> Salvar
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"
                  >
                    <X size={16} /> Cancelar
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-green-500 hover:text-green-600 text-slate-600 rounded-lg transition-colors"
                >
                  <Edit2 size={16} /> Editar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column: Info & Description */}
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex flex-col gap-2 mb-4">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="text-3xl font-bold text-slate-900 border-b-2 border-green-500 focus:outline-none bg-transparent w-full"
                    placeholder="Nome do Robô"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-slate-900">{formData.name}</h1>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm">
                <div className="flex items-center gap-1.5">
                  <Activity size={16} className="text-green-600" />
                  Par: 
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={formData.pair}
                      onChange={(e) => handleChange('pair', e.target.value)}
                      className="border border-slate-300 rounded px-2 py-0.5 w-24 text-slate-900 font-bold"
                    />
                  ) : (
                    <strong className="text-slate-900">{formData.pair}</strong>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <BarChart2 size={16} className={formData.profitability.includes('+') ? 'text-green-600' : 'text-red-500'} />
                  Performance: 
                  {isEditing ? (
                     <input 
                      type="text" 
                      value={formData.profitability}
                      onChange={(e) => handleChange('profitability', e.target.value)}
                      className="border border-slate-300 rounded px-2 py-0.5 w-24 text-slate-900 font-bold"
                    />
                  ) : (
                    <strong className={formData.profitability.includes('+') ? 'text-green-600' : 'text-red-500'}>{formData.profitability}</strong>
                  )}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-1.5">
                     <span className="text-slate-500">Versão:</span>
                     <input 
                      type="text" 
                      value={formData.version}
                      onChange={(e) => handleChange('version', e.target.value)}
                      className="border border-slate-300 rounded px-2 py-0.5 w-20 text-slate-900 font-bold"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={20} className="text-green-600" />
                Sobre a Estratégia
              </h3>
              {isEditing ? (
                <textarea 
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={6}
                  className="w-full mt-2 p-3 border border-slate-300 rounded-lg text-slate-600 leading-relaxed focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Descrição da estratégia..."
                />
              ) : (
                <p className="text-slate-600 leading-relaxed">
                  {formData.description || "Descrição detalhada indisponível para esta versão."}
                </p>
              )}
            </div>

            {!isEditing && (
              <div className="pt-4 flex gap-4">
                <button className="w-full sm:w-auto flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transform hover:-translate-y-0.5">
                  <Download size={20} />
                  Download do Robô (.ex5)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operational Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-l-4 border-green-500 pl-2">
            <h3 className="text-xl font-bold text-slate-900">Operacional & Backtests</h3>
            {isEditing && (
                <button 
                  onClick={() => addImage('images')}
                  className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:underline"
                >
                  <Plus size={16} /> Adicionar URL
                </button>
            )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formData.images?.map((img, idx) => (
            <div key={idx} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm aspect-[4/3]">
              <img 
                src={img} 
                alt={`Operacional ${idx + 1}`} 
                className="w-full h-full object-cover"
              />
              {!isEditing && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 cursor-zoom-in">
                  <span className="text-white font-medium text-sm">Visualizar Ampliado</span>
                </div>
              )}
              {isEditing && (
                 <button 
                    onClick={() => removeImage('images', idx)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-lg transition-colors"
                    title="Remover imagem"
                 >
                    <Trash2 size={16} />
                 </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button 
              onClick={() => addImage('images')}
              className="border-2 border-dashed border-slate-300 hover:border-green-500 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-green-600 bg-slate-50 hover:bg-green-50 transition-colors aspect-[4/3]"
            >
              <Plus size={32} />
              <span className="text-sm font-medium">Adicionar Imagem</span>
            </button>
          )}
          {(!formData.images?.length && !isEditing) && <p className="text-slate-500 italic p-4 col-span-full">Nenhuma imagem disponível.</p>}
        </div>
      </div>

      {/* Manual Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between border-l-4 border-green-500 pl-2">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={24} className="text-slate-500" />
            Manual de Instalação e Parâmetros
          </h3>
           {isEditing && (
              <button 
                onClick={() => addImage('manualImages')}
                className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:underline"
              >
                <Plus size={16} /> Adicionar Página
              </button>
          )}
        </div>
        
        {!isEditing && <p className="text-slate-500 text-sm">Siga o passo a passo visual abaixo para configurar seu robô corretamente.</p>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formData.manualImages?.map((img, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <span className="text-green-600 text-xs font-bold uppercase tracking-wider">Passo {idx + 1}</span>
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-lg relative group">
                <img 
                  src={img} 
                  alt={`Manual Página ${idx + 1}`} 
                  className="w-full h-auto object-cover"
                />
                 {isEditing && (
                    <button 
                      onClick={() => removeImage('manualImages', idx)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-lg transition-colors"
                      title="Remover página"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
              </div>
            </div>
          ))}
           {isEditing && (
            <button 
              onClick={() => addImage('manualImages')}
              className="border-2 border-dashed border-slate-300 hover:border-green-500 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-green-600 bg-slate-50 hover:bg-green-50 transition-colors min-h-[200px]"
            >
              <Plus size={32} />
              <span className="text-sm font-medium">Adicionar Página do Manual</span>
            </button>
          )}
          {(!formData.manualImages?.length && !isEditing) && <p className="text-slate-500 italic p-4 col-span-full">Manual indisponível.</p>}
        </div>
      </div>
    </div>
  );
};