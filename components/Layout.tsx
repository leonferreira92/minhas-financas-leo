
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Sparkles, Calendar } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface Props {
  children: React.ReactNode;
  onOpenAdd: () => void;
}

export const Layout: React.FC<Props> = ({ children, onOpenAdd }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-700 transition-colors duration-200">
      
      {/* Botão de Privacidade Flutuante (Opcional, mas vamos colocar no header se houver um) */}
      {/* Por enquanto, vamos adicionar ao Layout para que apareça em todas as telas se necessário, ou apenas no Dashboard */}

      {/* Container Principal com padding inferior ajustado para a nova navbar fixa */}
      <main className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 sm:border-x sm:border-slate-200 dark:sm:border-slate-800 shadow-2xl relative transition-colors duration-200 pb-32">
         <div className="p-5">
           {children}
         </div>
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,20px)]">
        <div className="max-w-md mx-auto relative">
          
          <nav className="flex justify-between items-center px-6 h-[72px]">
            {/* Esquerda */}
            <NavItem to="/" icon={LayoutDashboard} label="Home" />
            <NavItem to="/transactions" icon={List} label="Extrato" />

            {/* Espaço para o botão central (FAB) */}
            <div className="w-12"></div>

            {/* Direita */}
            <NavItem to="/calendar" icon={Calendar} label="Agenda" />
            <NavItem to="/insights" icon={Sparkles} label="Análise" />
          </nav>

          {/* Botão de Adição Central (Elevado) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6">
             <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 scale-150 animate-pulse"></div>
             <button 
                onClick={onOpenAdd}
                className="relative w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-500 dark:from-indigo-500 dark:to-indigo-400 rounded-full shadow-[0_8px_20px_rgba(79,70,229,0.3)] flex items-center justify-center text-white transform transition-all duration-300 active:scale-95 hover:scale-105 border-[4px] border-slate-50 dark:border-slate-950"
                aria-label="Nova Transação"
             >
                <Plus size={32} strokeWidth={3} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Interno de Item de Navegação
const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => `
      flex flex-col items-center justify-center w-14 h-full space-y-1 transition-all duration-300 active:scale-95
      ${isActive 
        ? 'text-indigo-600 dark:text-indigo-400' 
        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
      }
    `}
  >
    {({ isActive }) => (
      <>
        <div className={`relative transition-all duration-300 ${isActive ? '-translate-y-1' : ''}`}>
           <Icon 
             size={24} 
             strokeWidth={isActive ? 2.5 : 2}
             className={isActive ? 'drop-shadow-sm' : ''}
           />
           {isActive && (
             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
           )}
        </div>
        <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-0 scale-0'} transition-all duration-300 origin-top`}>
          {label}
        </span>
      </>
    )}
  </NavLink>
);
