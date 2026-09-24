import React from 'react';
import {
  
  LayoutDashboard,
  Cpu,
  GraduationCap,
  TrendingUp,
  Download,
  Users,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
  Target
} from 'lucide-react';
import { View } from '../types';
import { Button, PageHeader } from './ui';
import { BackButton } from './BackButton';

interface JourneyProps {
  onBack: () => void;
  onNavigate: (view: View) => void;
}

interface PlatformSession {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  icon: React.ReactNode;
  color: string;
  view: View;
  features: string[];
}

const SESSIONS: PlatformSession[] = [
  {
    id: 'dashboard',
    title: "Painel de Controle",
    subtitle: "Sua Central de Inteligência",
    description: "Uma visão 360º de tudo o que acontece na sua conta em tempo real.",
    longDescription: "O Dashboard foi projetado para ser o seu centro de comando. Aqui você acompanha o status de suas contas MT5, visualiza as últimas análises de mercado da nossa equipe e tem acesso rápido às ferramentas que mais utiliza. É o ponto de partida para qualquer operação.",
    icon: <LayoutDashboard size={32} />,
    color: "indigo",
    view: 'dashboard',
    features: [
      "Status das Contas MT5",
      "Feed de Notícias e Análises",
      "Monitor de Armazenamento",
      "Atalhos de Navegação Rápida"
    ]
  },
  {
    id: 'strategies',
    title: "Estratégias (Robôs)",
    subtitle: "Automação com Gestão de Risco",
    description: "Gerencie e configure seus algoritmos de trading de forma simplificada.",
    longDescription: "Nesta sessão, você encontra o 'cérebro' das nossas operações. Você pode visualizar todos os robôs disponíveis (como o AFK Trader e Snow Ball), entender o perfil de risco de cada um e gerenciar quais estratégias estão ativas em suas contas vinculadas.",
    icon: <Cpu size={32} />,
    color: "blue",
    view: 'strategies',
    features: [
      "Catálogo de Algoritmos",
      "Configurações de Risco",
      "Monitor de Performance",
      "Gestão de Parâmetros"
    ]
  },
  {
    id: 'education',
    title: "Biblioteca (Cursos)",
    subtitle: "Conhecimento é Poder",
    description: "Aprenda as metodologias por trás das estratégias e domine o mercado.",
    longDescription: "Não acreditamos em 'caixa preta'. Na Biblioteca, você tem acesso a todo o material educativo da Trader AFK. Desde tutoriais básicos de instalação até mentorias avançadas sobre como os robôs funcionam, como ajustar parâmetros e como gerenciar o risco.",
    icon: <GraduationCap size={32} />,
    color: "purple",
    view: 'education',
    features: [
      "Aulas em Vídeo",
      "E-books e Manuais",
      "Mentorias Gravadas",
      "Certificações"
    ]
  },
  {
    id: 'licenses',
    title: "Gestão de Licenças",
    subtitle: "Controle Total das suas Contas",
    description: "Vincule suas contas de corretora e acompanhe suas permissões de uso.",
    longDescription: "Aqui é onde você oficializa sua operação. Você pode solicitar novas chaves de licença, vincular números de contas MT5 específicos e verificar a validade de cada assinatura. É o portal que garante que seus robôs tenham permissão total para rodar nos servidores.",
    icon: <TrendingUp size={32} />,
    color: "green",
    view: 'licenses',
    features: [
      "Vínculo de Contas MT5",
      "Renovação de Assinaturas",
      "Histórico de Solicitações",
      "Status de Aprovação"
    ]
  },
  {
    id: 'downloads',
    title: "Central de Downloads",
    subtitle: "Kit de Ferramentas Completo",
    description: "Tudo o que você precisa instalar para começar a operar.",
    longDescription: "Sua caixa de ferramentas técnica. Aqui você baixa o MetaTrader 5 customizado, nossos indicadores exclusivos, arquivos de configuração (.set) otimizados e as versões mais recentes dos robôs que você adquiriu.",
    icon: <Download size={32} />,
    color: "slate",
    view: 'downloads',
    features: [
      "Instalador MT5",
      "Indicadores Proprietários",
      "Arquivos de Setup (.set)",
      "Updates de Software"
    ]
  },
  {
    id: 'marketing',
    title: "Comunidade & Afiliados",
    subtitle: "Cresça com a Trader AFK",
    description: "Explore nosso ecossistema de marketing e rede de parceiros.",
    longDescription: "A Trader AFK é mais que uma plataforma, é uma comunidade. Nesta sessão, você entende como funciona nosso programa de afiliados, acessa materiais de divulgação e entende as regras de comissão por indicação da plataforma, conforme o regulamento do programa.",
    icon: <Users size={32} />,
    color: "orange",
    view: 'marketing',
    features: [
      "Painel de Afiliado",
      "Materiais de Apoio",
      "Redes Sociais",
      "Suporte Direto"
    ]
  }
];

// Cores de cada sessão (dados acima) -> classes de token escritas por inteiro,
// para o Tailwind compilado enxergar. Cores decorativas viram destaque da marca ou neutro.
const SESSION_TONE: Record<string, { icon: string; subtitle: string }> = {
  indigo: { icon: 'bg-accent/10 text-accent-fg border border-accent/20', subtitle: 'text-accent-fg' },
  blue: { icon: 'bg-accent/10 text-accent-fg border border-accent/20', subtitle: 'text-accent-fg' },
  purple: { icon: 'bg-accent/10 text-accent-fg border border-accent/20', subtitle: 'text-accent-fg' },
  green: { icon: 'bg-accent/10 text-accent-fg border border-accent/20', subtitle: 'text-accent-fg' },
  orange: { icon: 'bg-accent/10 text-accent-fg border border-accent/20', subtitle: 'text-accent-fg' },
  slate: { icon: 'bg-tint/5 text-fg-muted border border-tint/10', subtitle: 'text-fg-muted' },
};
const DEFAULT_TONE = SESSION_TONE.slate;

export const Journey: React.FC<JourneyProps> = ({ onBack, onNavigate }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <PageHeader
        className="mb-0 sm:mb-0"
        leading={
          <BackButton onClick={onBack} />
        }
        eyebrow={<span className="inline-flex items-center gap-1.5"><Zap size={12} /> Guia</span>}
        title="Manual da Plataforma"
        description="Conheça cada sessão da Trader AFK a fundo."
      />

      {/* Intro Hero */}
      <div className="glass-card p-6 sm:p-10 rounded-3xl relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-fade pointer-events-none" aria-hidden></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-green/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" aria-hidden></div>
        <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-tint/5 rounded-full text-[11px] font-medium uppercase tracking-[0.2em] text-fg-muted mb-4 border border-tint/10">
            <Info size={14} className="text-accent-fg" />
            Guia do Ecossistema
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-4 tracking-tight text-fg">Onde a tecnologia encontra a <span className="text-gradient-brand">disciplina.</span></h2>
          <p className="text-fg-muted text-base sm:text-lg leading-relaxed">
            Navegue pelos módulos abaixo para entender como cada engrenagem da nossa plataforma foi desenhada para facilitar sua vida como trader e maximizar sua performance automatizada.
          </p>
        </div>
      </div>

      {/* Grid of Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {SESSIONS.map((session) => {
          const tone = SESSION_TONE[session.color] ?? DEFAULT_TONE;
          return (
          <div
            key={session.id}
            className="glass-card glass-card-hover rounded-3xl overflow-hidden group flex flex-col"
          >
            <div className="p-6 sm:p-8 flex-1">
              {/* Header Card */}
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl ${tone.icon} group-hover:scale-110 transition-transform duration-500`}>
                  {session.icon}
                </div>
                <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-tint/10"></div>
                   <div className="w-2 h-2 rounded-full bg-tint/10"></div>
                   <div className="w-2 h-2 rounded-full bg-tint/20"></div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className={`text-xs font-medium ${tone.subtitle} uppercase tracking-[0.2em] mb-1`}>
                    {session.subtitle}
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-fg group-hover:text-accent-fg transition-colors">
                    {session.title}
                  </h3>
                </div>

                <p className="text-fg-muted text-sm leading-relaxed">
                  {session.longDescription}
                </p>

                <div className="pt-4">
                  <p className="eyebrow-muted mb-3 flex items-center gap-2">
                    <Target size={12} /> O que você encontra aqui:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                    {session.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-medium text-fg-muted">
                        <ShieldCheck size={14} className="text-accent-fg shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Card */}
            <div className="p-4 bg-tint/3 border-t border-tint/6 mt-auto">
              <Button
                variant="outline"
                onClick={() => onNavigate(session.view)}
                className="w-full rounded-xl"
              >
                Acessar Sessão
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Final Action */}
      <div className="glass-card relative overflow-hidden p-6 sm:p-8 rounded-3xl text-center">
        <div className="absolute top-0 inset-x-0 hairline" aria-hidden></div>
        <h3 className="font-display text-xl font-semibold text-fg mb-2">Ainda com dúvidas?</h3>
        <p className="text-fg-muted mb-6">Nossa equipe de suporte está pronta para te ajudar a configurar tudo.</p>
        <Button
          onClick={() => onNavigate('marketing')}
          className="px-8"
        >
          Falar com Suporte
        </Button>
      </div>
    </div>
  );
};
