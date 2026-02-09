
import React from 'react';
import { LayoutDashboard, TrendingUp, GraduationCap, Users, Key, LogOut, Settings, X, Shield, User, Map, Download, DollarSign } from 'lucide-react';
import { View, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userRole?: UserRole; // Optional now as we get it from auth context too, but keeping prop for compat
  setUserRole?: (role: UserRole) => void; // Deprecated
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  isOpen, 
  setIsOpen,
}) => {
  const { role, signOut, user } = useAuth();
  
  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setIsOpen(false);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`fixed md:relative z-50 w-72 h-full bg-slate-900 text-white flex flex-col transition-transform duration-300 shadow-2xl md:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-6 flex items-center justify-between">
           <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleViewChange('dashboard')}
           >
             <div className="w-8 h-8">
               <Logo className="w-full h-full text-green-500" />
             </div>
             <h1 className="text-xl font-bold tracking-tight">
               AFK Trade
             </h1>
           </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4 mt-2">Principal</div>
          
          <button
            onClick={() => handleViewChange('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === 'dashboard' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard size={20} className={currentView === 'dashboard' ? 'animate-pulse' : ''} />
            <span className="font-medium">Início</span>
          </button>

          <button
            onClick={() => handleViewChange('journey')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === 'journey' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Map size={20} />
            <span className="font-medium">Comece Aqui</span>
          </button>

          <button
            onClick={() => handleViewChange('downloads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === 'downloads' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Download size={20} />
            <span className="font-medium">Downloads</span>
          </button>


          <button
            onClick={() => handleViewChange('strategies')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === 'strategies' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <TrendingUp size={20} />
            <span className="font-medium">Estratégias</span>
          </button>

          <button
            onClick={() => handleViewChange('education')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === 'education' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <GraduationCap size={20} />
            <span className="font-medium">Biblioteca</span>
          </button>

          <button
            onClick={() => handleViewChange('licenses')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === 'licenses' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Key size={20} />
            <span className="font-medium">Licenças</span>
          </button>

          <button
            onClick={() => handleViewChange('marketing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === 'marketing' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users size={20} />
            <span className="font-medium">
              {role === 'partner' ? 'Painel do Parceiro' : role === 'client' ? 'Torne-se Parceiro' : 'Marketing'}
            </span>
          </button>

          {['admin', 'first_mate'].includes(role || '') && (
            <>
              <div className="border-t border-slate-800 my-4 mx-2"></div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Administração</div>
              
              <button
                onClick={() => handleViewChange('treasury')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  currentView === 'treasury' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <DollarSign size={20} />
                <span className="font-medium">Tesouraria</span>
              </button>

              <button
                onClick={() => handleViewChange('admin')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  currentView === 'admin' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Settings size={20} />
                <span className="font-medium">Painel Admin</span>
              </button>
            </>
          )}

        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer" onClick={() => handleViewChange('settings')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold">
                 {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">
                    {user?.user_metadata?.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-slate-500 capitalize flex items-center gap-1">
                  {role === 'admin' && '👑 '}
                  {role === 'first_mate' && '🏴‍☠️ '}
                  {role === 'first_mate' ? 'First Mate' : role === 'client' ? 'Usuário' : role}
                </p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                signOut();
              }}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-700/50 rounded-lg transition-all"
              title="Sair da conta"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};