import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Wallet, Music, BarChart3, Menu, Plus, X, 
  ArrowUpRight, ArrowDownRight, ArrowRightLeft, PiggyBank
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onOpenAdd: (type?: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw') => void;
}

export const Layout: React.FC<Props> = ({ children, onOpenAdd }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  const handleQuickAction = (actionType: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw' | 'show') => {
    setIsQuickActionOpen(false);
    if (actionType === 'show') {
      navigate('/shows');
    } else {
      onOpenAdd(actionType);
    }
  };

  // Determine active states for the 5 primary navigation tabs
  const isHomeActive = location.pathname === '/';
  
  const isFinanceiroActive = [
    '/financeiro', '/transactions', '/debts', '/metas', '/planning', '/flow', '/insights'
  ].some(path => location.pathname === path || location.pathname.startsWith('/financeiro'));

  const isShowsActive = location.pathname.startsWith('/shows');

  const isRelatoriosActive = [
    '/relatorios', '/ai-report', '/summary', '/calendar'
  ].some(path => location.pathname === path || location.pathname.startsWith('/relatorios'));

  const isMaisActive = [
    '/mais', '/settings', '/financial-settings', '/categories', '/alerts'
  ].some(path => location.pathname === path || location.pathname.startsWith('/mais'));

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-700 transition-colors duration-200">
      
      {/* Container Principal */}
      <main className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 sm:border-x sm:border-slate-200/80 dark:sm:border-slate-800/80 shadow-2xl relative transition-colors duration-200 pb-28">
        <div className="p-4 sm:p-5">
          {children}
        </div>
      </main>

      {/* NAVBAR INFERIOR SIMPLES COM 5 ÁREAS: Home, Financeiro, Shows, Relatórios, Mais */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-[env(safe-area-inset-bottom,12px)] shadow-lg">
        <div className="max-w-md mx-auto relative px-1 sm:px-2">
          
          <nav className="flex justify-between items-center h-[64px] relative z-10">
            {/* 1. HOME */}
            <NavLink 
              to="/" 
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95
                ${isHomeActive ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${isHomeActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                <Home size={20} strokeWidth={isHomeActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Home</span>
            </NavLink>

            {/* 2. FINANCEIRO */}
            <NavLink 
              to="/financeiro" 
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95
                ${isFinanceiroActive ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${isFinanceiroActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                <Wallet size={20} strokeWidth={isFinanceiroActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Financeiro</span>
            </NavLink>

            {/* 3. SHOWS */}
            <NavLink 
              to="/shows" 
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95
                ${isShowsActive ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${isShowsActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                <Music size={20} strokeWidth={isShowsActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Shows</span>
            </NavLink>

            {/* 4. RELATÓRIOS */}
            <NavLink 
              to="/relatorios" 
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95
                ${isRelatoriosActive ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${isRelatoriosActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                <BarChart3 size={20} strokeWidth={isRelatoriosActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Relatórios</span>
            </NavLink>

            {/* 5. MAIS */}
            <NavLink 
              to="/mais" 
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95
                ${isMaisActive ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${isMaisActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                <Menu size={20} strokeWidth={isMaisActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Mais</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* QUICK ACTIONS MODAL (SE ACIONADO PELAS TELAS OU ATALHOS) */}
      {isQuickActionOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsQuickActionOpen(false)} 
          />
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 z-10 animate-slide-up space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                  <Plus size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Nova Movimentação</h3>
                  <p className="text-[11px] font-medium text-slate-400">Selecione o tipo de registro rápido</p>
                </div>
              </div>

              <button 
                onClick={() => setIsQuickActionOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickAction('income')}
                className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <ArrowUpRight size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block">Receita</span>
                  <span className="text-[10px] text-slate-400 font-medium">Entradas e salários</span>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction('expense')}
                className="p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                  <ArrowDownRight size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-rose-700 dark:text-rose-400 block">Despesa</span>
                  <span className="text-[10px] text-slate-400 font-medium">Contas e compras</span>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction('transfer')}
                className="p-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <ArrowRightLeft size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 block">Transferência</span>
                  <span className="text-[10px] text-slate-400 font-medium">Entre suas contas</span>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction('goal_deposit')}
                className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <PiggyBank size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 block">Guardar Dinheiro</span>
                  <span className="text-[10px] text-slate-400 font-medium">Aporte na reserva</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
