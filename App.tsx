
import React, { useState, Suspense, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Menu, Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { INITIAL_ROBOTS } from './constants';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { View, UserRole, Robot, Article } from './types';
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

function AppContent() {
  const { user, isLoading, role, isPasswordRecovery } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('admin'); // Legacy state, kept for prop compatibility
  const [showTour, setShowTour] = useState(false);

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
      case 'article': return article ? `${article.title} - Trader AFK` : 'Artigo - Trader AFK';
      default: return 'Trader AFK';
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Helmet>
          <title>Login - Trader AFK</title>
        </Helmet>
        Loading...
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
          <Loader2 className="animate-spin text-green-600" size={40} />
        </div>
      }>
        {(() => {
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
              if (role !== 'admin') {
                  // Redirect to dashboard if unauthorized
                  setTimeout(() => setCurrentView('dashboard'), 0);
                  return <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} />;
              }
              return <AdminPanel onBack={() => setCurrentView('dashboard')} onShowTour={() => setShowTour(true)} />;
            
            case 'journey': return <Journey onBack={() => setCurrentView('dashboard')} onNavigate={setCurrentView} />;
            case 'downloads': return <Downloads onBack={() => setCurrentView('dashboard')} />;
            
            case 'treasury':
              if (!['admin', 'first_mate'].includes(role || '')) {
                  // Redirect to dashboard if unauthorized
                  setTimeout(() => setCurrentView('dashboard'), 0);
                  return <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} />;
              }
              return <Treasury onBack={() => setCurrentView('dashboard')} />;

            case 'chat_moderation':
              if (!['admin', 'first_mate'].includes(role || '')) {
                  setTimeout(() => setCurrentView('dashboard'), 0);
                  return <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} />;
              }
              return <ChatModeration onBack={() => setCurrentView('dashboard')} />;
            
            case 'settings': return <Settings onBack={() => setCurrentView('dashboard')} />;
            default: return <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-green-500/30 selection:text-green-900">
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
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setCurrentView('dashboard')}
          >
             <div className="w-8 h-8">
               <Logo className="w-full h-full" variant="mobile" />
             </div>
             <h1 className="text-lg font-bold text-slate-900">
              Trader AFK
            </h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar">
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;