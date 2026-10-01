import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, Wallet, Music, BarChart3, Menu
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onOpenAdd: (type?: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw') => void;
}

export const Layout: React.FC<Props> = ({ children }) => {
  const location = useLocation();

  // Determine active states for the 5 primary navigation tabs
  const isHomeActive = location.pathname === '/';
  
  const isFinanceiroActive = [
    '/financeiro', '/transactions', '/debts', '/planning', '/flow', '/insights'
  ].some(path => location.pathname === path || location.pathname.startsWith('/financeiro'));

  const isShowsActive = location.pathname.startsWith('/shows');

  const isRelatoriosActive = [
    '/relatorios', '/ai-report', '/summary', '/calendar'
  ].some(path => location.pathname === path || location.pathname.startsWith('/relatorios'));

  const isMaisActive = [
    '/mais', '/settings', '/financial-settings', '/categories', '/alerts'
  ].some(path => location.pathname === path || location.pathname.startsWith('/mais'));

  const navItems = [
    { to: '/', label: 'Home', icon: Home, isActive: isHomeActive },
    { to: '/financeiro', label: 'Finanças', icon: Wallet, isActive: isFinanceiroActive },
    { to: '/shows', label: 'Shows', icon: Music, isActive: isShowsActive },
    { to: '/relatorios', label: 'Relatórios', icon: BarChart3, isActive: isRelatoriosActive },
    { to: '/mais', label: 'Mais', icon: Menu, isActive: isMaisActive },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] font-sans text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      
      {/* Container Principal Mobile-First */}
      <main className="w-full max-w-md mx-auto min-h-screen bg-[#09090b] sm:border-x sm:border-zinc-800/60 shadow-2xl relative pb-28 overflow-x-hidden">
        <div className="p-3.5 sm:p-4 w-full max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* FLOATING BOTTOM NAVIGATION BAR - DESIGN SYSTEM FIGMA iBank / FinPay */}
      <div className="fixed bottom-3 left-0 right-0 z-40 px-3 sm:px-4 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <nav className="bg-[#18181b]/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-1.5 shadow-2xl shadow-black/80 flex items-center justify-between gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`
                    relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95 group
                    ${item.isActive 
                      ? 'text-emerald-400 font-bold' 
                      : 'text-zinc-400 hover:text-zinc-200 font-medium'
                    }
                  `}
                >
                  {/* Subtle active glow container */}
                  <div className={`
                    relative p-1 rounded-lg transition-all duration-200
                    ${item.isActive ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.35)]' : 'group-hover:bg-zinc-800/40'}
                  `}>
                    <Icon size={19} strokeWidth={item.isActive ? 2.5 : 2} />
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                    {item.label}
                  </span>

                  {/* Active dot indicator */}
                  {item.isActive && (
                    <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

    </div>
  );
};
