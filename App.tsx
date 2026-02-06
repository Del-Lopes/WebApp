
import React, { useState, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { Menu, Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { INITIAL_ROBOTS } from './constants';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { View, UserRole, Robot, Article } from './types';
import { Logo } from './components/Logo';
import { Login } from './components/Auth/Login';
import { ArticleView } from './components/Dashboard/ArticleView';

// Lazy load components for performance optimization
const Strategies = React.lazy(() => import('./components/Strategies').then(module => ({ default: module.Strategies })));
const Education = React.lazy(() => import('./components/Education').then(module => ({ default: module.Education })));
const Marketing = React.lazy(() => import('./components/Marketing').then(module => ({ default: module.Marketing })));
const Licenses = React.lazy(() => import('./components/Licenses').then(module => ({ default: module.Licenses })));
const UserDashboard = React.lazy(() => import('./components/Dashboard/UserDashboard').then(module => ({ default: module.UserDashboard })));
const AdminPanel = React.lazy(() => import('./components/Admin/AdminPanel').then(module => ({ default: module.AdminPanel })));
const Settings = React.lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const CoursePlayer = React.lazy(() => import('./components/Education/CoursePlayer').then(module => ({ default: module.CoursePlayer })));
const ArticleView = React.lazy(() => import('./components/Dashboard/ArticleView').then(module => ({ default: module.ArticleView })));

function AppContent() {
  const { user, isLoading, role } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('admin'); // Legacy state, kept for prop compatibility
  
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


  const getPageTitle = (view: View, article: Article | null) => {
    switch (view) {
      case 'dashboard': return 'Início - AFK Trade';
      case 'strategies': return 'Estratégias - AFK Trade';
      case 'education': return 'Biblioteca - AFK Trade';
      case 'course_player': return 'Aula - AFK Trade';
      case 'marketing': return 'Marketing - AFK Trade';
      case 'licenses': return 'Licenças - AFK Trade';
      case 'admin': return 'Administração - AFK Trade';
      case 'settings': return 'Configurações - AFK Trade';
      case 'article': return article ? `${article.title} - AFK Trade` : 'Artigo - AFK Trade';
      default: return 'AFK Trade';
    }
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Helmet>
          <title>Carregando... - AFK Trade</title>
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
            case 'dashboard': return <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} />;
            case 'article': 
              return selectedArticle ? (
                <ArticleView 
                  article={selectedArticle} 
                  onBack={() => setCurrentView('dashboard')} 
                />
              ) : <UserDashboard onNavigate={setCurrentView} onReadArticle={handleReadArticle} />;
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
            case 'course_player': return <CoursePlayer onBack={() => setCurrentView('education')} />;
            case 'marketing': return <Marketing onBack={() => setCurrentView('dashboard')} />;
            case 'licenses': return <Licenses onBack={() => setCurrentView('dashboard')} />;
            case 'admin': return <AdminPanel onBack={() => setCurrentView('dashboard')} />;
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
        <meta name="description" content="Plataforma de negociação algorítmica AFK Trade." />
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
          <div className="flex items-center gap-3">
             <div className="w-8 h-8">
               <Logo className="w-full h-full" variant="mobile" />
             </div>
             <h1 className="text-lg font-bold text-slate-900">
              AFK Trade
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
      </main>
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