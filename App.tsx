import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Strategies } from './components/Strategies';
import { Education } from './components/Education';
import { Marketing } from './components/Marketing';
import { Licenses } from './components/Licenses';
import { View, UserRole, Robot } from './types';
import { Logo } from './components/Logo';
import { INITIAL_ROBOTS } from './constants';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';

function App() {
  const [currentView, setCurrentView] = useState<View>('strategies');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, role, isLoading, signIn } = useAuth();
  
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

  const renderView = () => {
    switch (currentView) {
      case 'strategies': 
        return (
          <Strategies 
            userRole={role || 'client'} 
            robots={robots}
            onAddRobot={handleAddRobot}
            onUpdateRobot={handleUpdateRobot}
            onDeleteRobot={handleDeleteRobot}
          />
        );
      case 'education': return <Education />;
      case 'marketing': return <Marketing />;
      case 'licenses': return <Licenses />;
      default: 
        return (
          <Strategies 
            userRole={role || 'client'} 
            robots={robots}
            onAddRobot={handleAddRobot}
            onUpdateRobot={handleUpdateRobot}
            onDeleteRobot={handleDeleteRobot}
          />
        );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-50">Loading...</div>;
  }

  if (!user) {
     return <Login />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-green-500/30 selection:text-green-900">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userRole={role || 'client'}
        setUserRole={() => {}} // Disabled manual role switch in favor of AuthContext
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8">
               <Logo className="w-full h-full" />
             </div>
             <h1 className="text-lg font-bold text-slate-900">
              Tradexperience
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

// Wrap with provider
function AppWithProvider() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithProvider;