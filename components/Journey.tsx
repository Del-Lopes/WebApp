import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  GraduationCap,
  Download,
  Users,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
  Target,
  Milestone,
  Radio,
  Bitcoin,
  CalendarClock,
  Video,
  FileText,
  Bot,
  Notebook,
  BarChart3,
  Activity,
  ShoppingBag,
  Key,
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
    description: "Uma visão geral de tudo o que acontece na sua conta.",
    longDescription: "O Painel é o seu ponto de partida. Aqui você acompanha o status das suas licenças e contas MT5, vê os artigos e análises mais recentes da equipe e acessa com um clique as ferramentas que mais usa.",
    icon: <LayoutDashboard size={32} />,
    color: "green",
    view: 'dashboard',
    features: [
      "Status das Licenças",
      "Artigos Recentes",
      "Atalhos para as Sessões",
      "Visão Geral da Conta"
    ]
  },
  {
    id: 'trilha_gain',
    title: "Trilha Gain",
    subtitle: "Educação Gamificada",
    description: "Aprenda o mercado do zero, uma lição por vez, e ganhe Coins.",
    longDescription: "Uma jornada de lições curtas e interativas — conceitos, quizzes, verdadeiro ou falso e leitura de gráfico — organizada em unidades do básico ao operacional. Cada lição concluída rende Coins e mantém sua sequência de dias. As Coins podem ser usadas para desbloquear unidades Premium e recursos da plataforma, como o painel de Sinais e o Relatório IA de Crypto.",
    icon: <Milestone size={32} />,
    color: "green",
    view: 'trilha_gain',
    features: [
      "Lições Interativas",
      "Coins e Sequência Diária",
      "Unidades Premium",
      "Do Básico ao Operacional"
    ]
  },
  {
    id: 'signals',
    title: "Sinais",
    subtitle: "Tendência e Análise por IA",
    description: "Leitura técnica em vários timeframes e análises por IA.",
    longDescription: "Acompanhe o painel de tendência com a leitura de vários timeframes ao mesmo tempo e solicite análises por IA do ativo usando suas Coins. Os setups publicados pela equipe trazem a leitura técnica do momento. Todo o conteúdo é informativo e educacional — não é recomendação de investimento.",
    icon: <Radio size={32} />,
    color: "green",
    view: 'signals',
    features: [
      "Painel Multi-timeframe",
      "Análise por IA",
      "Setups da Equipe",
      "Gráfico Interativo"
    ]
  },
  {
    id: 'crypto',
    title: "Crypto",
    subtitle: "Inteligência de Mercado",
    description: "Tendências, narrativas e indicadores do mercado cripto.",
    longDescription: "Termômetro do mercado (capitalização, dominância, medo e ganância), moedas mais buscadas, desempenho por narrativa e setor, DeFi, calendário de desbloqueio de tokens e sua lista de acompanhamento. Um relatório por IA resume as narrativas do momento.",
    icon: <Bitcoin size={32} />,
    color: "green",
    view: 'crypto',
    features: [
      "Termômetro de Mercado",
      "Narrativas e Setores",
      "Desbloqueios de Tokens",
      "Relatório por IA"
    ]
  },
  {
    id: 'econ_calendar',
    title: "Calendário Econômico",
    subtitle: "Notícias de Alto Impacto",
    description: "Os eventos que movem o mercado e como ele costuma reagir.",
    longDescription: "Eventos de 2 e 3 estrelas no seu fuso horário, com projeção, dado anterior e o resultado assim que é divulgado. Cada indicador traz uma interpretação por IA: o que ele mede, por que importa e os cenários típicos se vier acima, em linha ou abaixo do esperado.",
    icon: <CalendarClock size={32} />,
    color: "green",
    view: 'econ_calendar',
    features: [
      "Eventos de Alto Impacto",
      "Atual × Projeção × Anterior",
      "Cenários por IA",
      "Histórico de Divulgações"
    ]
  },
  {
    id: 'live_room',
    title: "Sala ao Vivo",
    subtitle: "Aprendizado em Tempo Real",
    description: "Sessões ao vivo com a equipe Trader AFK.",
    longDescription: "A equipe acompanha o mercado ao vivo, comenta o contexto do dia, mostra o uso das ferramentas da plataforma e responde às dúvidas dos membros. O acesso é exclusivo para assinantes e liberado pela equipe.",
    icon: <Video size={32} />,
    color: "green",
    view: 'live_room',
    features: [
      "Leitura de Mercado ao Vivo",
      "Dúvidas em Tempo Real",
      "Uso das Ferramentas",
      "Exclusivo para Assinantes"
    ]
  },
  {
    id: 'articles',
    title: "Artigos e Análises",
    subtitle: "Conteúdo Atualizado",
    description: "Artigos sobre padrões, método e hábitos de trading.",
    longDescription: "Uma coleção de artigos sobre análise técnica, padrões gráficos, gestão de risco e comportamento, atualizada com frequência para complementar a sua formação.",
    icon: <FileText size={32} />,
    color: "green",
    view: 'articles',
    features: [
      "Padrões Gráficos",
      "Estratégia e Método",
      "Gestão de Risco",
      "Novos Conteúdos"
    ]
  },
  {
    id: 'hand_bot',
    title: "Hand Bot",
    subtitle: "Controle Remoto do EA",
    description: "Ajuste os parâmetros do seu robô sem abrir o MetaTrader.",
    longDescription: "Vincule sua conta MT5 e ajuste pela plataforma os parâmetros do Hand Bot — trailing, grid, hedge e stand by. As alterações são enviadas ao EA na próxima sincronização automática, com a conexão protegida por chave.",
    icon: <Bot size={32} />,
    color: "green",
    view: 'hand_bot',
    features: [
      "Vínculo com a Conta MT5",
      "Parâmetros Remotos",
      "Sincronização Automática",
      "Conexão Protegida"
    ]
  },
  {
    id: 'downloads',
    title: "Central de Downloads",
    subtitle: "Kit de Ferramentas Completo",
    description: "Tudo o que você precisa instalar para começar.",
    longDescription: "Sua caixa de ferramentas técnica. Aqui você baixa o MetaTrader 5, os indicadores, os arquivos de configuração (.set) e as versões mais recentes dos robôs licenciados.",
    icon: <Download size={32} />,
    color: "slate",
    view: 'downloads',
    features: [
      "Instalador MT5",
      "Indicadores",
      "Arquivos de Setup (.set)",
      "Atualizações dos Robôs"
    ]
  },
  {
    id: 'journal',
    title: "Diário de Operações",
    subtitle: "Disciplina e Registro",
    description: "Registre cada operação com motivo, emocional e aprendizado.",
    longDescription: "Anote suas operações com ativo, lado, lote, preços, motivo da entrada, estado emocional e conclusões, anexando o print do gráfico. As estatísticas do diário mostram os seus padrões ao longo do tempo.",
    icon: <Notebook size={32} />,
    color: "green",
    view: 'journal',
    features: [
      "Registro Detalhado",
      "Estado Emocional",
      "Prints do Gráfico",
      "Estatísticas do Diário"
    ]
  },
  {
    id: 'analysis',
    title: "Análise de Resultados",
    subtitle: "Métricas do seu MT5",
    description: "Envie o relatório do MetaTrader e veja suas métricas.",
    longDescription: "Exporte o relatório HTML do MetaTrader 5 e envie aqui: a plataforma calcula métricas como resultado, taxa de acerto, drawdown e curva de capital, com a lista de operações para você revisar.",
    icon: <BarChart3 size={32} />,
    color: "green",
    view: 'analysis',
    features: [
      "Upload do Relatório MT5",
      "Métricas de Desempenho",
      "Curva de Capital",
      "Lista de Operações"
    ]
  },
  {
    id: 'live_portfolio',
    title: "Live Portfólio",
    subtitle: "Telemetria em Tempo Real",
    description: "Acompanhe suas contas MT5 ao vivo.",
    longDescription: "Conecte suas contas MT5 com o EA de telemetria e acompanhe equity, resultado do dia e o status de cada conta em tempo real, num só lugar.",
    icon: <Activity size={32} />,
    color: "green",
    view: 'live_portfolio',
    features: [
      "Equity em Tempo Real",
      "Resultado do Dia",
      "Várias Contas",
      "Status de Conexão"
    ]
  },
  {
    id: 'strategies',
    title: "Estratégias (Robôs)",
    subtitle: "Automação com Gestão de Risco",
    description: "Conheça os robôs e o perfil de risco de cada um.",
    longDescription: "Nesta sessão você encontra os robôs disponíveis (como o AFK Trader e o Snow Ball), com a descrição da lógica, o perfil de risco, o manual e o histórico de cada estratégia. Rentabilidade passada não garante resultados futuros.",
    icon: <Cpu size={32} />,
    color: "green",
    view: 'strategies',
    features: [
      "Catálogo de Robôs",
      "Perfil de Risco",
      "Manuais",
      "Histórico das Estratégias"
    ]
  },
  {
    id: 'education',
    title: "Biblioteca (Cursos)",
    subtitle: "Conhecimento é Poder",
    description: "Aprenda as metodologias por trás das estratégias.",
    longDescription: "Não acreditamos em 'caixa preta'. Na Biblioteca você acessa o material educativo da Trader AFK: de tutoriais de instalação a aulas sobre como os robôs funcionam, como ajustar parâmetros e como gerenciar o risco.",
    icon: <GraduationCap size={32} />,
    color: "green",
    view: 'education',
    features: [
      "Aulas em Vídeo",
      "E-books e Manuais",
      "Mentorias Gravadas",
      "Tutoriais de Instalação"
    ]
  },
  {
    id: 'market',
    title: "Market",
    subtitle: "Produtos Selecionados",
    description: "Cursos, e-books, indicadores e robôs.",
    longDescription: "Uma vitrine de produtos selecionados — cursos, e-books, indicadores e robôs — com a descrição e as condições de cada um.",
    icon: <ShoppingBag size={32} />,
    color: "green",
    view: 'market',
    features: [
      "Cursos e E-books",
      "Indicadores",
      "Robôs",
      "Condições de Cada Produto"
    ]
  },
  {
    id: 'licenses',
    title: "Gestão de Licenças",
    subtitle: "Controle das suas Contas",
    description: "Vincule suas contas de corretora e acompanhe suas licenças.",
    longDescription: "Aqui você solicita licenças dos robôs, vincula os números das suas contas MT5 e acompanha a validade e o status de cada licença. A licença ativa é o que permite ao robô rodar na conta vinculada.",
    icon: <Key size={32} />,
    color: "green",
    view: 'licenses',
    features: [
      "Vínculo de Contas MT5",
      "Solicitação de Licenças",
      "Histórico de Solicitações",
      "Status de Aprovação"
    ]
  },
  {
    id: 'marketing',
    title: "Comunidade & Parceiros",
    subtitle: "Programa de Indicação",
    description: "Conheça o programa de parceiros da Trader AFK.",
    longDescription: "Nesta sessão você entende como funciona o programa de parceiros, acessa os materiais de divulgação e as regras de comissão por indicação, conforme o regulamento do programa.",
    icon: <Users size={32} />,
    color: "green",
    view: 'marketing',
    features: [
      "Painel do Parceiro",
      "Materiais de Apoio",
      "Links de Indicação",
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
