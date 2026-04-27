import React from 'react';
import { 
  ArrowLeft, 
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
    subtitle: "Automação de Alta Performance",
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
    longDescription: "Não acreditamos em 'caixa preta'. Na Biblioteca, você tem acesso a todo o material educativo da Trader AFK. Desde tutoriais básicos de instalação até mentorias avançadas sobre como os robôs funcionam e como otimizar seus resultados manualmente.",
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
    longDescription: "A Trader AFK é mais que uma plataforma, é uma comunidade. Nesta sessão, você entende como funciona nosso programa de afiliados, acessa materiais de divulgação e entende como escalar seus ganhos indicando a plataforma para outros traders.",
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

export const Journey: React.FC<JourneyProps> = ({ onBack, onNavigate }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
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
              <Zap className="text-indigo-600" />
              Manual da Plataforma
            </h1>
            <p className="text-slate-500">Conheça cada sessão da Trader AFK a fundo.</p>
          </div>
        </div>
      </div>

      {/* Intro Hero */}
      <div className="bg-slate-900 p-10 rounded-3xl text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -ml-20 -mb-20"></div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-sm border border-white/10">
            <Info size={14} className="text-indigo-400" />
            Guia do Ecossistema
          </div>
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Onde a tecnologia encontra o lucro.</h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Navegue pelos módulos abaixo para entender como cada engrenagem da nossa plataforma foi desenhada para facilitar sua vida como trader e maximizar sua performance automatizada.
          </p>
        </div>
      </div>

      {/* Grid of Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {SESSIONS.map((session) => (
          <div 
            key={session.id}
            className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group flex flex-col"
          >
            <div className="p-8 flex-1">
              {/* Header Card */}
              <div className="flex items-start justify-between mb-6">
                <div className={`p-4 rounded-2xl bg-${session.color}-50 text-${session.color}-600 group-hover:scale-110 transition-transform duration-500`}>
                  {session.icon}
                </div>
                <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                   <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                   <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className={`text-sm font-bold text-${session.color}-600 uppercase tracking-widest mb-1`}>
                    {session.subtitle}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {session.title}
                  </h3>
                </div>

                <p className="text-slate-500 text-sm leading-relaxed">
                  {session.longDescription}
                </p>

                <div className="pt-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Target size={12} /> O que você encontra aqui:
                  </p>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    {session.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <ShieldCheck size={14} className="text-green-500 shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Card */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
              <button 
                onClick={() => onNavigate(session.view)}
                className="w-full bg-white border border-slate-200 py-3 rounded-xl text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
              >
                Acessar Sessão
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Final Action */}
      <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-3xl text-center">
        <h3 className="text-xl font-bold text-indigo-900 mb-2">Ainda com dúvidas?</h3>
        <p className="text-indigo-700/70 mb-6">Nossa equipe de suporte está pronta para te ajudar a configurar tudo.</p>
        <button 
          onClick={() => onNavigate('marketing')}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          Falar com Suporte
        </button>
      </div>
    </div>
  );
};
