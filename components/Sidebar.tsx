
import React from 'react';
import { LayoutDashboard, TrendingUp, GraduationCap, Users, Key, LogOut, Settings, X, Map, Download, DollarSign, FileText, MessagesSquare, BookOpen, Notebook, BarChart3, Activity, ShoppingBag, Bot, Milestone, Radio, Bitcoin, CalendarClock, Sun, Moon, Video } from 'lucide-react';
import { View, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Logo } from './Logo';
import { cn } from '../lib/cn';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  userRole?: UserRole; // Optional now as we get it from auth context too, but keeping prop for compat
  setUserRole?: (role: UserRole) => void; // Deprecated
}

// Item de navegação: ativo ganha barra fina verde à esquerda, fundo sutil e
// ícone verde; inativo fica cinza.
const NavItem: React.FC<{
  view: View;
  label: string;
  icon: React.ElementType;
  currentView: View;
  onSelect: (view: View) => void;
}> = ({ view, label, icon: Icon, currentView, onSelect }) => {
  const active = currentView === view;
  return (
    <button
      onClick={() => onSelect(view)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors duration-200',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60',
        active ? 'bg-tint/5 text-fg font-medium' : 'text-fg-muted hover:bg-tint/3 hover:text-fg',
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-green" aria-hidden />}
      <Icon size={18} className={active ? 'text-accent-fg' : 'text-fg-subtle'} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
};

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="eyebrow-muted px-4 mb-2 mt-2">{children}</div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  isOpen,
  setIsOpen,
}) => {
  const { role, signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setIsOpen(false);
  };

  const item = (view: View, label: string, icon: React.ElementType) => (
    <NavItem view={view} label={label} icon={icon} currentView={currentView} onSelect={handleViewChange} />
  );

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`fixed md:relative z-50 w-72 h-full bg-surface text-fg border-r border-tint/6 flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="px-6 py-5 flex items-center justify-between">
           <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleViewChange('dashboard')}
           >
             <div className="w-8 h-8">
               <Logo className="w-full h-full" />
             </div>
             <span className="font-display text-xl font-semibold tracking-tight text-fg">
               Trader AFK
             </span>
           </div>
          <button onClick={() => setIsOpen(false)} aria-label="Fechar menu" className="md:hidden p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-tint/5">
            <X size={22} />
          </button>
        </div>
        <div className="hairline-neutral mx-4" aria-hidden />

        <nav className="ds-scrollbar flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <GroupLabel>Principal</GroupLabel>

          {item('dashboard', 'Início', LayoutDashboard)}
          {item('journey', 'Comece Aqui', Map)}
          {item('trilha_gain', 'Trilha Gain', Milestone)}
          {item('signals', 'Sinais', Radio)}
          {item('crypto', 'Crypto', Bitcoin)}
          {item('econ_calendar', 'Calendário Econômico', CalendarClock)}
          {item('live_room', 'Sala ao Vivo', Video)}
          {item('articles', 'Artigos e Análises', FileText)}
          {item('hand_bot', 'Hand Bot', Bot)}
          {item('downloads', 'Downloads', Download)}
          {item('journal', 'Diário', Notebook)}
          {item('analysis', 'Análise de Resultados', BarChart3)}
          {item('live_portfolio', 'Live Portfólio', Activity)}
          {item('strategies', 'Estratégias', TrendingUp)}
          {item('education', 'Biblioteca', GraduationCap)}
          {item('market', 'Market', ShoppingBag)}
          {item('licenses', 'Licenças', Key)}

          {/* Partner Panel - Accessible by Partner, First Mate, and Admin */}
          {['partner', 'first_mate', 'admin'].includes(role || '') && item('marketing', 'Painel do Parceiro', Users)}

          {/* Show "Become Partner" only for clients */}
          {role === 'client' && item('marketing', 'Torne-se Parceiro', Users)}

          {/* Treasury - Accessible by First Mate and Admin */}
          {['first_mate', 'admin'].includes(role || '') && (
            <>
              <div className="hairline-neutral my-4 mx-2" aria-hidden />
              <GroupLabel>Administração</GroupLabel>
              {item('treasury', 'Tesouraria', DollarSign)}
              {item('chat_moderation', 'Conversas IA', MessagesSquare)}
            </>
          )}

          {/* Knowledge Base - Admin only */}
          {role === 'admin' && item('knowledge', 'Base de Conhecimento', BookOpen)}

          {/* Admin Panel - Accessible by Admin only */}
          {role === 'admin' && item('admin', 'Painel Admin', Settings)}
        </nav>

        <div className="p-3 border-t border-tint/6">
          <div className="w-full flex items-center justify-between gap-1 p-2 rounded-xl hover:bg-tint/3 transition-colors group cursor-pointer" onClick={() => handleViewChange('settings')}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-fg font-semibold text-sm">
                 {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium text-fg truncate group-hover:text-accent-fg transition-colors">
                    {user?.user_metadata?.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-fg-subtle capitalize flex items-center gap-1">
                  {role === 'admin' && '👑 '}
                  {role === 'first_mate' && '🏴‍☠️ '}
                  {role === 'first_mate' ? 'First Mate' : role === 'client' ? 'Usuário' : role}
                </p>
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheme();
                }}
                className="p-2 text-fg-subtle hover:text-fg hover:bg-tint/5 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                title={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
                aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  signOut();
                }}
                className="p-2 text-fg-subtle hover:text-danger-fg hover:bg-danger/10 rounded-lg transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/60"
                title="Sair da conta"
                aria-label="Sair da conta"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
