import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Sparkles, LayoutDashboard, Milestone, Radio, CalendarClock, Bot, BarChart3, Key } from 'lucide-react';
import { TourArt, TourArtKind } from './TourArt';

interface PlatformTourProps {
  onClose: () => void;
  onComplete: () => void;
}

const ICON = 'text-accent-fg';

const TOUR_STEPS: { title: string; description: string; icon: React.ReactNode; art: TourArtKind }[] = [
  {
    title: "Bem-vindo à Trader AFK",
    description: "Sua central para aprender, acompanhar o mercado e operar com método. Em poucos passos, mostramos onde fica cada ferramenta da plataforma.",
    icon: <Sparkles size={28} className={ICON} />,
    art: 'welcome',
  },
  {
    title: "Início",
    description: "Seu ponto de partida: status das licenças e contas MT5, suas Coins, os artigos mais recentes e atalhos para as sessões que você mais usa.",
    icon: <LayoutDashboard size={28} className={ICON} />,
    art: 'dashboard',
  },
  {
    title: "Trilha Gain",
    description: "Aprenda o mercado do zero com lições curtas e interativas. Cada lição concluída rende Coins e mantém sua sequência de dias.",
    icon: <Milestone size={28} className={ICON} />,
    art: 'trilha',
  },
  {
    title: "Sinais e Crypto",
    description: "Painel de tendência em vários timeframes, análises por IA e o termômetro do mercado cripto. Conteúdo informativo, não é recomendação de investimento.",
    icon: <Radio size={28} className={ICON} />,
    art: 'signals',
  },
  {
    title: "Calendário e Sala ao Vivo",
    description: "Os eventos que movem o mercado, com a interpretação de cada cenário e por ativo. Assinantes acompanham a leitura ao vivo com a equipe.",
    icon: <CalendarClock size={28} className={ICON} />,
    art: 'calendar',
  },
  {
    title: "Robôs e Hand Bot",
    description: "Conheça os robôs e o perfil de risco de cada um, e ajuste os parâmetros do Hand Bot pela plataforma, sem abrir o MetaTrader.",
    icon: <Bot size={28} className={ICON} />,
    art: 'bots',
  },
  {
    title: "Diário e Resultados",
    description: "Registre suas operações com motivo e emocional, e envie o relatório do MT5 para ver taxa de acerto, drawdown e curva de capital.",
    icon: <BarChart3 size={28} className={ICON} />,
    art: 'journal',
  },
  {
    title: "Licenças e Downloads",
    description: "Vincule suas contas MT5, acompanhe a validade das licenças e baixe o MetaTrader, os indicadores e os setups. Dúvidas? O “Comece Aqui” explica cada sessão.",
    icon: <Key size={28} className={ICON} />,
    art: 'licenses',
  },
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
          className="absolute top-4 right-4 z-20 p-2 bg-surface/80 hover:bg-tint/10 backdrop-blur-sm rounded-full text-fg-muted hover:text-fg border border-tint/10 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <X size={20} />
        </button>

        {/* Ilustração (esquerda/topo) */}
        <div className="w-full md:w-1/2 h-64 sm:h-72 md:h-auto md:min-h-[480px] shrink-0 relative border-b md:border-b-0 md:border-r border-tint/8">
          <div key={step.art} className="absolute inset-0 animate-fade-in">
            <TourArt kind={step.art} />
          </div>
        </div>

        {/* Content Section (Right/Bottom) */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between relative bg-surface">
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-tint/3 border border-tint/8 rounded-2xl">
                 {step.icon}
               </div>
               <div>
                  <span className="eyebrow">Passo {currentStep + 1} de {TOUR_STEPS.length}</span>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-fg mt-1">{step.title}</h2>
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
