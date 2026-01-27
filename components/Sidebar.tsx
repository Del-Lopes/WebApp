import React from 'react';
import { LayoutDashboard, GraduationCap, Share2, Key, LogOut, Shield, User } from 'lucide-react';
import { View, UserRole } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setCurrentView, 
  isOpen, 
  setIsOpen,
  userRole,
  setUserRole
}) => {
  const menuItems = [
    { id: 'strategies' as View, label: 'Estratégias / Robôs', icon: LayoutDashboard },
    { id: 'education' as View, label: 'Conteúdo Educacional', icon: GraduationCap },
    { id: 'marketing' as View, label: 'Marketing & Vendas', icon: Share2 },
    { id: 'licenses' as View, label: 'Licenças', icon: Key },
  ];

  return (
    <>
      {/* Mobile Toggle Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-20 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-30 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <Logo className="w-full h-full" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Tradexperience
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                  ${isActive 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                  }`}
              >
                <Icon size={20} className={`${isActive ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
          
          {/* Admin Toggle (For Simulation) */}
          <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2 px-1">Perfil (Simulação)</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setUserRole('user')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  userRole === 'user' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <User size={14} /> User
              </button>
              <button 
                onClick={() => setUserRole('admin')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  userRole === 'admin' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Shield size={14} /> Admin
              </button>
            </div>
          </div>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Sair da Plataforma</span>
          </button>
        </div>
      </aside>
    </>
  );
};