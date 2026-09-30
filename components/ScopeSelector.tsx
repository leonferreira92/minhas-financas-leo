import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { ActiveScopeFilter } from '../types';
import { RefreshCw, User, Music } from 'lucide-react';

interface Props {
  className?: string;
  size?: 'sm' | 'md';
}

export const ScopeSelector: React.FC<Props> = ({ className = '', size = 'md' }) => {
  const { activeScope, setActiveScope } = useFinance();

  const options: { id: ActiveScopeFilter; label: string; icon: React.ReactNode; colorClass: string }[] = [
    { 
      id: 'ALL', 
      label: 'Todos', 
      icon: <RefreshCw size={size === 'sm' ? 12 : 13} className="shrink-0" />,
      colorClass: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
    },
    { 
      id: 'PERSONAL', 
      label: 'Pessoal', 
      icon: <User size={size === 'sm' ? 12 : 13} className="shrink-0" />,
      colorClass: 'bg-indigo-600 text-white shadow-xs'
    },
    { 
      id: 'BUSINESS', 
      label: 'Shows', 
      icon: <Music size={size === 'sm' ? 12 : 13} className="shrink-0" />,
      colorClass: 'bg-purple-600 text-white shadow-xs'
    }
  ];

  return (
    <div className={`inline-flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs ${className}`}>
      {options.map((opt) => {
        const isActive = activeScope === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setActiveScope(opt.id)}
            className={`flex items-center space-x-1.5 rounded-xl font-black uppercase tracking-wider transition-all active:scale-95 whitespace-nowrap ${
              size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'
            } ${
              isActive
                ? opt.colorClass
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
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
