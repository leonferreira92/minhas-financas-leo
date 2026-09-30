import React, { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { matchesScope } from '../../types';
import { ArrowDownRight, TrendingDown, Layers } from 'lucide-react';

export const TopExpensesCard: React.FC = () => {
  const { transactions, categories, activeScope, isBlurred } = useFinance();

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const topExpenses = useMemo(() => {
    const monthExpenses = transactions.filter(t => 
      t.type === 'expense' && 
      t.date.startsWith(currentMonthStr) && 
      matchesScope(t.scope, activeScope)
    );

    const sorted = [...monthExpenses].sort((a, b) => Number(b.amount) - Number(a.amount));
    const top5 = sorted.slice(0, 5);
    const maxAmount = top5.length > 0 ? Number(top5[0].amount) || 1 : 1;

    return {
      items: top5.map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        return {
          id: t.id,
          description: t.description,
          amount: Number(t.amount) || 0,
          date: t.date,
          categoryName: cat?.name || 'Geral',
          color: cat?.color || '#6366f1',
          percentage: Math.round(((Number(t.amount) || 0) / maxAmount) * 100)
        };
      }),
      totalMonthExpense: monthExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    };
  }, [transactions, categories, currentMonthStr, activeScope]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
            Top 5 Despesas do Mês
          </span>
          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            Onde o dinheiro está saindo
          </h3>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Saídas</span>
          <span className="text-sm font-black text-rose-500 tabular-nums">
            {!isBlurred ? formatCurrency(topExpenses.totalMonthExpense) : 'R$ •••••'}
          </span>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        {topExpenses.items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            Nenhuma despesa registrada neste mês para o escopo selecionado.
          </div>
        ) : (
          topExpenses.items.map((item, idx) => (
            <div key={item.id} className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white truncate">{item.description}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                    {item.categoryName}
                  </span>
                </div>
                <span className="font-black text-rose-600 dark:text-rose-400 tabular-nums shrink-0 ml-2">
                  {!isBlurred ? formatCurrency(item.amount) : '••••'}
                </span>
              </div>

              {/* Barra de progresso visual em Tailwind */}
              <div className="w-full bg-slate-200 dark:bg-slate-700/80 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-rose-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(10, item.percentage)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
