import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { ActiveScopeFilter } from '../types';
import { RefreshCw, User, Music } from 'lucide-react';

interface Props {
  className?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export const ScopeSelector: React.FC<Props> = ({ className = '', size = 'md', fullWidth = false }) => {
  const { activeScope, setActiveScope } = useFinance();

  const options: { id: ActiveScopeFilter; label: string; icon: React.ReactNode; activeClass: string }[] = [
    { 
      id: 'ALL', 
      label: 'Visão Geral', 
      icon: <RefreshCw size={size === 'sm' ? 11 : 13} className="shrink-0" />,
      activeClass: 'bg-emerald-500 text-zinc-950 font-black shadow-md shadow-emerald-500/20'
    },
    { 
      id: 'PERSONAL', 
      label: 'Pessoal', 
      icon: <User size={size === 'sm' ? 11 : 13} className="shrink-0" />,
      activeClass: 'bg-emerald-500 text-zinc-950 font-black shadow-md shadow-emerald-500/20'
    },
    { 
      id: 'BUSINESS', 
      label: 'Empresa (Shows)', 
      icon: <Music size={size === 'sm' ? 11 : 13} className="shrink-0" />,
      activeClass: 'bg-purple-500 text-white font-black shadow-md shadow-purple-500/20'
    }
  ];

  return (
    <div className={`p-1 bg-[#18181b] rounded-2xl border border-zinc-800/80 shadow-xs ${
      fullWidth ? 'w-full grid grid-cols-3 gap-1' : 'inline-flex items-center space-x-0.5 max-w-full overflow-x-auto no-scrollbar'
    } ${className}`}>
      {options.map((opt) => {
        const isActive = activeScope === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setActiveScope(opt.id)}
            className={`flex items-center justify-center space-x-1 sm:space-x-1.5 rounded-xl font-bold tracking-tight transition-all active:scale-95 whitespace-nowrap text-center ${
              size === 'sm' ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
            } ${
              isActive
                ? opt.activeClass
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
