import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Map, LayoutDashboard, Cpu, GraduationCap, Key, Users, Download } from 'lucide-react';

interface PlatformTourProps {
  onClose: () => void;
  onComplete: () => void;
}

const TOUR_STEPS = [
  {
    title: "Bem-vindo à Trader AFK",
    description: "Sua central de inteligência para trading algorítmico. Preparamos este tour para você dominar todas as ferramentas disponíveis.",
    icon: <LayoutDashboard size={48} className="text-accent-fg" />,
    image: "https://images.unsplash.com/photo-1611974765270-ca12586343bb?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Painel de Controle",
    description: "No Dashboard, você tem uma visão rápida das suas contas ativas e os últimos artigos e análises do mercado para guiar seu dia.",
    icon: <LayoutDashboard size={48} className="text-accent-fg" />,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Estratégias (Robôs)",
    description: "Conheça nossa vitrine de robôs. Aqui você escolhe a estratégia que melhor se adapta ao seu perfil e a conecta à sua conta.",
    icon: <Cpu size={48} className="text-accent-fg" />,
    image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Biblioteca de Conteúdo",
    description: "Acesse cursos exclusivos, tutoriais técnicos e análises aprofundadas. O conhecimento é a chave para o sucesso no trading.",
    icon: <GraduationCap size={48} className="text-accent-fg" />,
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Gestão de Licenças",
    description: "Acompanhe o status de cada licença, gerencie seus números de conta MT5 e garanta que tudo esteja operando perfeitamente.",
    icon: <Key size={48} className="text-accent-fg" />,
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Central de Downloads",
    description: "Baixe o MetaTrader 5, indicadores exclusivos, templates e manuais de instalação para configurar seu ambiente.",
    icon: <Download size={48} className="text-accent-fg" />,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Marketing e Comunidade",
    description: "Acesse materiais de apoio, participe da nossa comunidade e fique por dentro das novidades da Trader AFK.",
    icon: <Users size={48} className="text-accent-fg" />,
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label="Tour da plataforma">
      <div className="bg-surface text-fg border border-tint/10 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92dvh] overflow-y-auto ds-scrollbar flex flex-col md:flex-row relative">
        <div className="hairline absolute inset-x-0 top-0 z-10" aria-hidden />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fechar tour"
          className="absolute top-4 right-4 z-20 p-2 bg-black/30 md:bg-tint/5 hover:bg-black/50 md:hover:bg-tint/10 backdrop-blur-sm rounded-full text-white md:text-fg-muted md:hover:text-fg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <X size={24} />
        </button>

        {/* Image Section (Left/Top) */}
        <div className="w-full md:w-1/2 h-48 md:h-auto shrink-0 relative bg-brand-dark">
          <img
            src={step.image}
            alt={step.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent md:bg-gradient-to-r" />

          <div className="absolute bottom-4 left-4 text-white z-10 md:hidden">
            <h2 className="font-display text-2xl font-semibold">{step.title}</h2>
          </div>
        </div>

        {/* Content Section (Right/Bottom) */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between relative bg-surface">
          <div className="space-y-6 pt-4">
            <div className="hidden md:flex items-center gap-4">
               <div className="p-3 bg-tint/3 border border-tint/8 rounded-2xl">
                 {step.icon}
               </div>
               <div>
                  <span className="eyebrow">Passo {currentStep + 1} de {TOUR_STEPS.length}</span>
                  <h2 className="font-display text-3xl font-semibold text-fg mt-1">{step.title}</h2>
               </div>
            </div>

            <p className="text-base sm:text-lg text-fg-muted leading-relaxed">
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
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-brand-green' : 'w-2 bg-tint/15'}`}
                   />
                 ))}
               </div>

               <div className="flex gap-3">
                 {currentStep > 0 && (
                   <button
                    onClick={handlePrev}
                    className="px-4 py-2 text-fg-muted hover:text-fg font-medium transition-colors"
                   >
                     Voltar
                   </button>
                 )}
                 <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-green-bright to-brand-green text-brand-dark rounded-lg font-semibold shadow-[0_10px_40px_-12px_rgba(34,197,94,0.55)] hover:brightness-110 hover:-translate-y-0.5 transition-all flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
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
