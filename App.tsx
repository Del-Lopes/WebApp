
import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Menu, Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { INITIAL_ROBOTS } from './constants';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { View, UserRole, Robot, Article } from './types';
import type { KnowledgeInput } from './hooks/useKnowledge';
import { Logo } from './components/Logo';
import { Login } from './components/Auth/Login';
// Removed duplicate ArticleView import

// Lazy load components for performance optimization
const Strategies = React.lazy(() => import('./components/Strategies').then(module => ({ default: module.Strategies })));
const Education = React.lazy(() => import('./components/Education').then(module => ({ default: module.Education })));
const Marketing = React.lazy(() => import('./components/Marketing').then(module => ({ default: module.Marketing })));
const Licenses = React.lazy(() => import('./components/Licenses').then(module => ({ default: module.Licenses })));
const UserDashboard = React.lazy(() => import('./components/Dashboard/UserDashboard').then(module => ({ default: module.UserDashboard })));
const AdminPanel = React.lazy(() => import('./components/Admin/AdminPanel').then(module => ({ default: module.AdminPanel })));
const Settings = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const CoursePlayer = React.lazy(() => import('./components/Education/CoursePlayer').then(module => ({ default: module.CoursePlayer })));
const Downloads = React.lazy(() => import('./components/Downloads').then(module => ({ default: module.Downloads })));
const ArticleView = React.lazy(() => import('./components/Dashboard/ArticleView').then(module => ({ default: module.ArticleView })));
const Journey = React.lazy(() => import('./components/Journey').then(module => ({ default: module.Journey })));
const PlatformTour = React.lazy(() => import('./components/PlatformTour').then(module => ({ default: module.PlatformTour })));
const Treasury = React.lazy(() => import('./components/Treasury').then(module => ({ default: module.Treasury })));
const ChatWidget = React.lazy(() => import('./components/Chat/ChatWidget').then(module => ({ default: module.ChatWidget })));
const ChatModeration = React.lazy(() => import('./components/Admin/ChatModeration/ChatModeration').then(module => ({ default: module.ChatModeration })));
const KnowledgeBase = React.lazy(() => import('./components/Admin/Knowledge/KnowledgeBase').then(module => ({ default: module.KnowledgeBase })));
const TradeJournal = React.lazy(() => import('./components/Journal/TradeJournal').then(module => ({ default: module.TradeJournal })));
const ResultsAnalysis = React.lazy(() => import('./components/Analysis/ResultsAnalysis').then(module => ({ default: module.ResultsAnalysis })));
const LivePortfolio = React.lazy(() => import('./components/LivePortfolio/LivePortfolio').then(module => ({ default: module.LivePortfolio })));
const Market = React.lazy(() => import('./components/Market').then(module => ({ default: module.Market })));
const HandBot = React.lazy(() => import('./components/HandBot/HandBot').then(module => ({ default: module.HandBot })));
const TrilhaGain = React.lazy(() => import('./components/TrilhaGain/TrilhaGain').then(module => ({ default: module.TrilhaGain })));
const Signals = React.lazy(() => import('./components/Signals/Signals').then(module => ({ default: module.Signals })));
const Crypto = React.lazy(() => import('./components/Crypto/Crypto').then(module => ({ default: module.Crypto })));
const LiveRoom = React.lazy(() => import('./components/LiveRoom/LiveRoom').then(module => ({ default: module.LiveRoom })));
const EconCalendar = React.lazy(() => import('./components/EconCalendar/EconCalendar').then(module => ({ default: module.EconCalendar })));

// Telas restritas por role; as demais são livres para qualquer usuário logado.
const VIEW_ROLES: Partial<Record<View, UserRole[]>> = {
  admin: ['admin'],
  knowledge: ['admin'],
  treasury: ['admin', 'first_mate'],
  chat_moderation: ['admin', 'first_mate'],
};

const canAccessView = (view: View, role: UserRole | null) => {
  const allowed = VIEW_ROLES[view];
  return !allowed || (!!role && allowed.includes(role));
};

function AppContent() {
  const { user, isLoading, role, isPasswordRecovery } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('admin'); // Legacy state, kept for prop compatibility
  const [showTour, setShowTour] = useState(false);
  const [knowledgeDraft, setKnowledgeDraft] = useState<Partial<KnowledgeInput> | undefined>(undefined);

  const handleCreateKnowledgeFromTopic = (draft: Partial<KnowledgeInput>) => {
    setKnowledgeDraft(draft);
    setCurrentView('knowledge');
  };

  // Troca de conta na mesma aba (A sai, B entra): não herda a tela nem o
  // artigo/rascunho do usuário anterior. Declarado antes do efeito de
  // recuperação de senha para que ele prevaleça no mesmo commit.
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevUserIdRef.current;
    const current = user?.id ?? null;
    prevUserIdRef.current = current;
    if (prev !== null && prev !== current) {
      setCurrentView('dashboard');
      setSelectedArticle(null);
      setKnowledgeDraft(undefined);
    }
  }, [user?.id]);

  // Tela sem permissão: o render já mostra o dashboard; aqui só corrige o state.
  const isViewBlocked = !canAccessView(currentView, role);
  useEffect(() => {
    if (isViewBlocked) setCurrentView('dashboard');
  }, [isViewBlocked]);

  useEffect(() => {
    // Check for recovery hash in URL directly as fallback/primary method
    const hash = window.location.hash;
    const type = new URLSearchParams(hash.replace('#', '?')).get('type');

    if (isPasswordRecovery || type === 'recovery') {
      console.log("Recovery mode detected, redirecting to settings");
      setCurrentView('settings');
      // Optionally clean the URL
      // window.history.replaceState(null, '', window.location.pathname);
    }
  }, [isPasswordRecovery]);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('trader_afk_tour_completed');
    if (!tourCompleted) {
       // Delay tour slightly for better UX
       const timer = setTimeout(() => setShowTour(true), 1500);
       return () => clearTimeout(timer);
    }
  }, []);
  
  // State lifted from Strategies to App to persist data across tab switches
  const [robots, setRobots] = useState<Robot[]>(INITIAL_ROBOTS);

  const handleAddRobot = (robot: Robot) => {
    setRobots([...robots, robot]);
  };

  const handleUpdateRobot = (updatedRobot: Robot) => {
    setRobots((prevRobots) => 
      prevRobots.map((r) => r.id === updatedRobot.id ? updatedRobot : r)
    );
  };

  const handleDeleteRobot = (id: string) => {
    setRobots((prevRobots) => prevRobots.filter((r) => r.id !== id));
  };

  const handleReadArticle = (article: Article) => {
    setSelectedArticle(article);
    setCurrentView('article');
  };

  const handleTourClose = () => {
    setShowTour(false);
    // Always mark as completed on interaction (whether close or finish)
    localStorage.setItem('trader_afk_tour_completed', 'true');
  };


  const getPageTitle = (view: View, article: Article | null) => {
    switch (view) {
      case 'dashboard': return 'Início - Trader AFK';
      case 'strategies': return 'Estratégias - Trader AFK';
      case 'education': return 'Biblioteca - Trader AFK';
      case 'articles': return 'Artigos e Análises - Trader AFK';
      case 'course_player': return 'Aula - Trader AFK';
      case 'marketing': return 'Marketing - Trader AFK';
      case 'licenses': return 'Licenças - Trader AFK';
      case 'admin': return 'Administração - Trader AFK';
      case 'settings': return 'Configurações - Trader AFK';
      case 'journey': return 'Sua Jornada - Trader AFK';
      case 'downloads': return 'Downloads - Trader AFK';
      case 'treasury': return 'Tesouraria - Trader AFK';
      case 'chat_moderation': return 'Conversas IA - Trader AFK';
      case 'knowledge': return 'Base de Conhecimento - Trader AFK';
      case 'journal': return 'Diário de Operações - Trader AFK';
      case 'analysis': return 'Análise de Resultados - Trader AFK';
      case 'live_portfolio': return 'Live Portfólio - Trader AFK';
      case 'market': return 'Market - Trader AFK';
      case 'hand_bot': return 'Hand Bot - Trader AFK';
      case 'trilha_gain': return 'Trilha Gain - Trader AFK';
      case 'signals': return 'Sinais - Trader AFK';
      case 'crypto': return 'Crypto - Trader AFK';
      case 'econ_calendar': return 'Calendário Econômico - Trader AFK';
      case 'live_room': return 'Sala ao Vivo - Trader AFK';
      case 'article': return article ? `${article.title} - Trader AFK` : 'Artigo - Trader AFK';
      default: return 'Trader AFK';
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-page text-fg-muted">
        <Helmet>
          <title>Login - Trader AFK</title>
        </Helmet>
        <Loader2 className="animate-spin text-accent" size={32} aria-label="Carregando" />
      </div>
    );
  }

  if (!user) {
     return <Login />;
  }

  const renderView = () => {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <Loader2 className="animate-spin text-accent" size={36} aria-label="Carregando" />
        </div>
      }>
        {(() => {
          if (isViewBlocked) {
            return <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} />;
          }
          switch (currentView) {
            case 'dashboard': return <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} onShowTour={() => setShowTour(true)} />;
            case 'article': 
              return selectedArticle ? (
                <ArticleView 
                  article={selectedArticle} 
                  onBack={() => setCurrentView('dashboard')} 
                />
              ) : <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} onShowTour={() => setShowTour(true)} />;
            case 'strategies': 
              return (
                <Strategies 
                  userRole={role || 'client'} 
                  robots={robots}
                  onAddRobot={handleAddRobot}
                  onUpdateRobot={handleUpdateRobot}
                  onDeleteRobot={handleDeleteRobot}
                  onBack={() => setCurrentView('dashboard')}
                />
              );
      
            case 'education': return <Education onBack={() => setCurrentView('dashboard')} />;
            case 'articles': return <Education onBack={() => setCurrentView('dashboard')} articlesOnly />;

            case 'course_player': return <CoursePlayer onBack={() => setCurrentView('education')} />;
            case 'marketing': return <Marketing onBack={() => setCurrentView('dashboard')} />;
            case 'licenses': return <Licenses onBack={() => setCurrentView('dashboard')} />;
            
            case 'admin': 
              return <AdminPanel onBack={() => setCurrentView('dashboard')} onShowTour={() => setShowTour(true)} />;
            
            case 'journey': return <Journey onBack={() => setCurrentView('dashboard')} onNavigate={setCurrentView} />;
            case 'downloads': return <Downloads onBack={() => setCurrentView('dashboard')} />;
            
            case 'treasury':
              return <Treasury onBack={() => setCurrentView('dashboard')} />;

            case 'chat_moderation':
              return (
                <ChatModeration
                  onBack={() => setCurrentView('dashboard')}
                  onCreateKnowledge={role === 'admin' ? handleCreateKnowledgeFromTopic : undefined}
                />
              );

            case 'knowledge':
              return (
                <KnowledgeBase
                  onBack={() => { setKnowledgeDraft(undefined); setCurrentView('dashboard'); }}
                  initialDraft={knowledgeDraft}
                />
              );

            case 'journal':
              return <TradeJournal onBack={() => setCurrentView('dashboard')} />;

            case 'analysis':
              return <ResultsAnalysis onBack={() => setCurrentView('dashboard')} />;

            case 'live_portfolio':
              return <LivePortfolio onBack={() => setCurrentView('dashboard')} />;

            case 'market':
              return <Market onBack={() => setCurrentView('dashboard')} />;

            case 'hand_bot':
              return <HandBot onBack={() => setCurrentView('dashboard')} />;

            case 'trilha_gain':
              return <TrilhaGain onBack={() => setCurrentView('dashboard')} />;

            case 'signals':
              return <Signals onBack={() => setCurrentView('dashboard')} />;

            case 'crypto':
              return <Crypto onBack={() => setCurrentView('dashboard')} />;

            case 'econ_calendar':
              return <EconCalendar onBack={() => setCurrentView('dashboard')} />;

            case 'live_room':
              return <LiveRoom onBack={() => setCurrentView('dashboard')} />;

            case 'settings': return <Settings onBack={() => setCurrentView('dashboard')} />;
            default: return <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="flex h-screen bg-page text-fg font-sans selection:bg-brand-green/30 selection:text-fg">
      <Helmet>
        <title>{getPageTitle(currentView, selectedArticle)}</title>
        <meta name="description" content="Plataforma de negociação algorítmica Trader AFK." />
      </Helmet>
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        // Legacy props
        userRole={role || 'client'} 
        setUserRole={setUserRole}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-tint/6 bg-page/80 backdrop-blur-md sticky top-0 z-10">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setCurrentView('dashboard')}
          >
             <div className="w-8 h-8">
               <Logo className="w-full h-full" variant="mobile" />
             </div>
             <span className="font-display text-lg font-semibold text-fg">
              Trader AFK
            </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menu"
            className="p-2 text-fg-muted hover:text-fg rounded-lg hover:bg-tint/5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth ds-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {renderView()}
          </div>
        </div>
        
        {/* Platform Tour Modal */}
        {showTour && (
          <Suspense fallback={null}>
            <PlatformTour
              onClose={handleTourClose}
              onComplete={handleTourClose}
            />
          </Suspense>
        )}
      </main>

      {/* AI Chat Widget — visível apenas após login */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;