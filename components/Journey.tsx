import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Lock, Map, Milestone, TrendingUp, Wallet, UserCheck, Play } from 'lucide-react';

interface JourneyProps {
  onBack: () => void;
}

type StepStatus = 'completed' | 'current' | 'upcoming';

interface Step {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  icon: React.ReactNode;
  actionLabel: string;
  actionType: 'modal' | 'link';
  actionData?: string;
}

export const Journey: React.FC<JourneyProps> = ({ onBack }) => {
  const [activeStepId, setActiveStepId] = useState<number>(2); // Default to step 2 for demo

  const steps: Step[] = [
    {
      id: 1,
      title: "Boas-vindas à AFK Trade",
      description: "Você já deu o primeiro passo! Agora você faz parte da elite do trading automatizado.",
      status: "completed",
      icon: <UserCheck size={24} className="text-white" />,
      actionLabel: "Ver Introdução",
      actionType: 'modal'
    },
    {
      id: 2,
      title: "Abrir Conta na Corretora",
      description: "Escolha uma de nossas corretoras parceiras para garantir os melhores spreads e execução.",
      status: "current",
      icon: <Milestone size={24} className="text-white" />,
      actionLabel: "Escolher Corretora",
      actionType: 'modal',
      actionData: 'broker-tutorial'
    },
    {
      id: 3,
      title: "Realizar Depósito",
      description: "Aporte capital na sua conta da corretora para começar a operar.",
      status: "upcoming",
      icon: <Wallet size={24} className="text-white" />,
      actionLabel: "Ver Tutorial de Depósito",
      actionType: 'modal',
      actionData: 'deposit-tutorial'
    },
    {
      id: 4,
      title: "Conectar Estratégia",
      description: "Escolha o robô que melhor se adapta ao seu perfil e conecte sua conta.",
      status: "upcoming",
      icon: <TrendingUp size={24} className="text-white" />,
      actionLabel: "Ver Estratégias",
      actionType: 'link',
      actionData: 'strategies'
    }
  ];

  const handleAction = (step: Step) => {
    if (step.status === 'upcoming') return;
    
    // Placeholder logic for actions
    alert(`Ação: ${step.actionLabel}\nTipo: ${step.actionType}\nDados: ${step.actionData}`);
  };

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
            <Map className="text-green-600" />
            Sua Jornada Trader
          </h1>
          <p className="text-slate-500">Siga o passo a passo para o sucesso.</p>
        </div>
      </div>

      {/* Intro Card */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 p-8 rounded-2xl text-white shadow-lg shadow-green-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Bem-vindo ao Futuro!</h2>
          <p className="text-green-50 max-w-xl text-lg opacity-90">
            Preparamos um caminho exclusivo para você atingir a consistência. 
            Complete as missões abaixo para liberar todo o potencial da plataforma.
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

              return (
                <div key={step.id} className="relative pl-24 group">
                  {/* Status Indicator */}
                  <div className={`
                    absolute left-0 top-0 w-16 h-16 flex items-center justify-center rounded-2xl border-4 transition-all duration-500 z-10 shadow-sm
                    ${isCompleted ? 'bg-green-500 border-white ring-4 ring-green-100' : ''}
                    ${isCurrent ? 'bg-blue-600 border-white ring-4 ring-blue-100 scale-110' : ''}
                    ${isUpcoming ? 'bg-slate-200 border-white ring-4 ring-slate-50' : ''}
                  `}>
                    {isCompleted ? <CheckCircle2 size={32} className="text-white" /> : step.icon}
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
                        Passo 0{step.id}
                      </span>
                      {isUpcoming && <Lock size={16} className="text-slate-300" />}
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
                          ${isCurrent 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5' 
                            : isCompleted
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }
                        `}
                        disabled={isUpcoming}
                      >
                        {isUpcoming ? <Lock size={16} /> : <Play size={16} />}
                        {step.actionLabel}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
