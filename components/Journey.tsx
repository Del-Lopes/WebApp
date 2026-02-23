import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Lock, Map, Milestone, TrendingUp, Wallet, UserCheck, Play, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface JourneyProps {
  onBack: () => void;
}

type StepStatus = 'completed' | 'current' | 'upcoming';

interface Step {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  iconType: 'UserCheck' | 'Milestone' | 'Wallet' | 'TrendingUp';
  actionLabel: string;
  actionType: 'modal' | 'link';
  actionData?: string;
}

// Initial default steps
const INITIAL_STEPS: Step[] = [
  {
    id: 1,
    title: "Boas-vindas à AFK Trade",
    description: "Você já deu o primeiro passo! Agora você faz parte da elite do trading automatizado.",
    status: "completed",
    iconType: 'UserCheck',
    actionLabel: "Ver Introdução",
    actionType: 'modal'
  },
  {
    id: 2,
    title: "Abrir Conta na Corretora",
    description: "Escolha uma de nossas corretoras parceiras para garantir os melhores spreads e execução.",
    status: "current", // Unlocked as requested
    iconType: 'Milestone',
    actionLabel: "Escolher Corretora",
    actionType: 'modal',
    actionData: 'broker-tutorial'
  },
  {
    id: 3,
    title: "Realizar Depósito",
    description: "Aporte capital na sua conta da corretora para começar a operar.",
    status: "current", // Unlocked as requested
    iconType: 'Wallet',
    actionLabel: "Ver Tutorial de Depósito",
    actionType: 'modal',
    actionData: 'deposit-tutorial'
  },
  {
    id: 4,
    title: "Conectar Estratégia",
    description: "Escolha o robô que melhor se adapta ao seu perfil e conecte sua conta.",
    status: "current", // Unlocked as requested
    iconType: 'TrendingUp',
    actionLabel: "Ver Estratégias",
    actionType: 'link',
    actionData: 'strategies'
  }
];

export const Journey: React.FC<JourneyProps> = ({ onBack }) => {
  const { role } = useAuth();
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);

  // Icon mapping helper
  const getIcon = (type: string, className: string) => {
    switch (type) {
      case 'UserCheck': return <UserCheck size={24} className={className} />;
      case 'Milestone': return <Milestone size={24} className={className} />;
      case 'Wallet': return <Wallet size={24} className={className} />;
      case 'TrendingUp': return <TrendingUp size={24} className={className} />;
      default: return <Milestone size={24} className={className} />;
    }
  };

  const handleAction = (step: Step) => {
    if (step.status === 'upcoming' && role !== 'admin') return;
    alert(`Ação: ${step.actionLabel}\nTipo: ${step.actionType}\nDados: ${step.actionData}`);
  };

  const handleSaveStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStep) return;

    setSteps(prev => prev.map(s => s.id === editingStep.id ? editingStep : s));
    setEditingStep(null);
  };

  const handleDeleteStep = (id: number) => {
      if(!confirm("Tem certeza?")) return;
      setSteps(prev => prev.filter(s => s.id !== id));
      setEditingStep(null);
  }

  const handleAddNewStep = () => {
      const newStep: Step = {
          id: Date.now(),
          title: "Novo Passo",
          description: "Descrição do novo passo",
          status: "upcoming",
          iconType: "Milestone",
          actionLabel: "Ação",
          actionType: "link"
      };
      setSteps([...steps, newStep]);
      setEditingStep(newStep);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 relative">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
            >
            <ArrowLeft className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>
            <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Map className="text-green-600" />
                Sua Jornada Trader
            </h1>
            <p className="text-slate-500">Veja como é simples o passo a passo.</p>
            </div>
        </div>
        
        {role === 'admin' && (
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-sm ${isEditing ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
                <Edit2 size={16} />
                {isEditing ? 'Modo Edição Ativo' : 'Editar Trilha'}
            </button>
        )}
      </div>

      {/* Intro Card */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 p-8 rounded-2xl text-white shadow-lg shadow-green-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo à jornada</h2>
          <p className="text-green-50 max-w-xl text-lg opacity-90">
            Preparamos um caminho simples e fácil para você atingir a consistência. 
            Complete as missões abaixo para começar a lucrar no piloto automático.
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-4xl mx-auto pt-8">
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 top-8 bottom-8 w-1 bg-slate-100 rounded-full"></div>

          <div className="space-y-12">
            {steps.map((step, index) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';
              const isUpcoming = step.status === 'upcoming';
              const isLocked = isUpcoming && !isEditing;

              return (
                <div key={step.id} className="relative pl-24 group">
                  {/* Status Indicator */}
                  <div className={`
                    absolute left-0 top-0 w-16 h-16 flex items-center justify-center rounded-2xl border-4 transition-all duration-500 z-10 shadow-sm
                    ${isCompleted ? 'bg-green-500 border-white ring-4 ring-green-100' : ''}
                    ${isCurrent ? 'bg-blue-600 border-white ring-4 ring-blue-100 scale-110' : ''}
                    ${isUpcoming ? 'bg-slate-200 border-white ring-4 ring-slate-50' : ''}
                  `}>
                    {isCompleted ? <CheckCircle2 size={32} className="text-white" /> : getIcon(step.iconType, "text-white")}
                  </div>

                  {/* Content Card */}
                  <div className={`
                    relative bg-white p-6 rounded-2xl border transition-all duration-300
                    ${isCurrent 
                      ? 'border-blue-100 shadow-xl shadow-blue-500/10 scale-[1.02] opacity-100 ring-1 ring-blue-500/20' 
                      : isCompleted
                        ? 'border-green-100 bg-green-50/30 opacity-90 hover:opacity-100'
                        : 'border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                    }
                  `}>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`
                        text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1
                        ${isCompleted ? 'bg-green-100 text-green-700' : ''}
                        ${isCurrent ? 'bg-blue-100 text-blue-700' : ''}
                        ${isUpcoming ? 'bg-slate-100 text-slate-500' : ''}
                      `}>
                        {isCompleted && <CheckCircle2 size={12} />}
                        Passo 0{index + 1}
                      </span>
                      {isLocked && <Lock size={16} className="text-slate-300" />}
                      {isEditing && (
                          <button onClick={() => setEditingStep(step)} className="p-1 hover:bg-slate-100 rounded text-blue-600">
                              <Edit2 size={16} />
                          </button>
                      )}
                    </div>
                    
                    <h3 className={`text-xl font-bold mb-2 ${isCurrent ? 'text-slate-900' : 'text-slate-700'}`}>
                      {step.title}
                    </h3>
                    
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed border-b border-slate-100 pb-4">
                      {step.description}
                    </p>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAction(step)}
                        className={`
                          px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all flex-1 justify-center
                          ${isCurrent || !isLocked
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5' 
                            : isCompleted
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }
                        `}
                        disabled={isLocked}
                      >
                        {isLocked ? <Lock size={16} /> : <Play size={16} />}
                        {step.actionLabel}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
             
             {isEditing && (
                 <div className="pl-24">
                     <button onClick={handleAddNewStep} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:border-green-500 hover:text-green-500 transition-colors">
                         <Plus size={24} />
                         Adicionar Novo Passo
                     </button>
                 </div>
             )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800">Editar Passo</h3>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => handleDeleteStep(editingStep.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={20}/></button>
                        <button onClick={() => setEditingStep(null)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                    </div>
                </div>
                <form onSubmit={handleSaveStep} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-600">Título</label>
                        <input type="text" required value={editingStep.title} onChange={e => setEditingStep({...editingStep, title: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-600">Descrição</label>
                        <textarea rows={3} required value={editingStep.description} onChange={e => setEditingStep({...editingStep, description: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-600">Status</label>
                            <select value={editingStep.status} onChange={e => setEditingStep({...editingStep, status: e.target.value as StepStatus})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500">
                                <option value="completed">Completado</option>
                                <option value="current">Atual (Ativo)</option>
                                <option value="upcoming">Bloqueado (Futuro)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-600">Ícone</label>
                            <select value={editingStep.iconType} onChange={e => setEditingStep({...editingStep, iconType: e.target.value as any})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500">
                                <option value="UserCheck">UserCheck</option>
                                <option value="Milestone">Milestone</option>
                                <option value="Wallet">Wallet</option>
                                <option value="TrendingUp">TrendingUp</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium mb-1 text-slate-600">Label Botão</label>
                            <input type="text" value={editingStep.actionLabel} onChange={e => setEditingStep({...editingStep, actionLabel: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1 text-slate-600">Action Data</label>
                            <input type="text" value={editingStep.actionData || ''} onChange={e => setEditingStep({...editingStep, actionData: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-green-500" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-500 transition-all mt-2">
                        Salvar Alterações
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
