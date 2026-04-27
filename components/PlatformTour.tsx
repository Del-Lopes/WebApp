import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Map, LayoutDashboard, Cpu, GraduationCap, Key, Users } from 'lucide-react';

interface PlatformTourProps {
  onClose: () => void;
  onComplete: () => void;
}

const TOUR_STEPS = [
  {
    title: "Bem-vindo à Tradexperience",
    description: "Sua central de inteligência para trading algorítmico. Preparamos este tour para você dominar todas as ferramentas disponíveis.",
    icon: <LayoutDashboard size={48} className="text-green-500" />,
    image: "https://images.unsplash.com/photo-1611974765270-ca12586343bb?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Painel de Controle",
    description: "No Dashboard, você tem uma visão rápida das suas contas ativas e os últimos artigos e análises do mercado para guiar seu dia.",
    icon: <LayoutDashboard size={48} className="text-blue-500" />,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Estratégias (Robôs)",
    description: "Conheça nossa vitrine de robôs. Aqui você escolhe a estratégia que melhor se adapta ao seu perfil e a conecta à sua conta.",
    icon: <Cpu size={48} className="text-purple-500" />,
    image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Biblioteca de Conteúdo",
    description: "Acesse cursos exclusivos, tutoriais técnicos e análises aprofundadas. O conhecimento é a chave para o sucesso no trading.",
    icon: <GraduationCap size={48} className="text-yellow-500" />,
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Gestão de Licenças",
    description: "Acompanhe o status de cada licença, gerencie seus números de conta MT5 e garanta que tudo esteja operando perfeitamente.",
    icon: <Key size={48} className="text-emerald-500" />,
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Central de Downloads",
    description: "Baixe o MetaTrader 5, indicadores exclusivos, templates e manuais de instalação para configurar seu ambiente.",
    icon: <Download size={48} className="text-indigo-500" />,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Marketing e Comunidade",
    description: "Acesse materiais de apoio, participe da nossa comunidade e fique por dentro das novidades da Tradexperience.",
    icon: <Users size={48} className="text-pink-500" />,
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800&auto=format&fit=crop"
  }
];

export const PlatformTour: React.FC<PlatformTourProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const finishTour = () => {
    onComplete();
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full text-white md:text-slate-500 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Image Section (Left/Top) */}
        <div className="w-full md:w-1/2 h-48 md:h-auto relative bg-slate-900">
          <img 
            src={step.image} 
            alt={step.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent md:bg-gradient-to-r" />
          
          <div className="absolute bottom-4 left-4 text-white z-10 md:hidden">
            <h2 className="text-2xl font-bold">{step.title}</h2>
          </div>
        </div>

        {/* Content Section (Right/Bottom) */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-between relative bg-white">
          <div className="space-y-6 pt-4">
            <div className="hidden md:flex items-center gap-4">
               <div className="p-3 bg-slate-50 rounded-2xl">
                 {step.icon}
               </div>
               <div>
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Passo {currentStep + 1} de {TOUR_STEPS.length}</span>
                  <h2 className="text-3xl font-bold text-slate-900 mt-1">{step.title}</h2>
               </div>
            </div>

            <p className="text-lg text-slate-600 leading-relaxed">
              {step.description}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
               <div className="flex gap-1">
                 {TOUR_STEPS.map((_, idx) => (
                   <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-green-500' : 'w-2 bg-slate-200'}`}
                   />
                 ))}
               </div>

               <div className="flex gap-3">
                 {currentStep > 0 && (
                   <button 
                    onClick={handlePrev}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium transition-colors"
                   >
                     Voltar
                   </button>
                 )}
                 <button 
                  onClick={handleNext}
                  className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-500 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                 >
                   {currentStep === TOUR_STEPS.length - 1 ? 'Começar' : 'Próximo'}
                   <ChevronRight size={18} />
                 </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
