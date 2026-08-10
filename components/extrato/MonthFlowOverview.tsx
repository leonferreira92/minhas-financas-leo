import React, { useMemo } from 'react';
import { Transaction } from '../../types';
import { TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';

interface MonthFlowOverviewProps {
  transactions: Transaction[];
  selectedMonthStr: string; // YYYY-MM
  isBlurred: boolean;
}

export const MonthFlowOverview: React.FC<MonthFlowOverviewProps> = ({
  transactions,
  selectedMonthStr,
  isBlurred
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Group transactions into 4 weekly periods of the selected month
  const weeklyData = useMemo(() => {
    const monthTx = transactions.filter(t => t.date.startsWith(selectedMonthStr));
    
    // 4 periods: Sem 1 (1-7), Sem 2 (8-14), Sem 3 (15-21), Sem 4 (22+)
    const weeks = [
      { id: 1, label: '01 a 07', income: 0, expense: 0 },
      { id: 2, label: '08 a 14', income: 0, expense: 0 },
      { id: 3, label: '15 a 21', income: 0, expense: 0 },
      { id: 4, label: '22 a 31', income: 0, expense: 0 },
    ];

    monthTx.forEach(t => {
      const day = parseInt(t.date.split('-')[2], 10) || 1;
      const amount = Number(t.amount) || 0;
      let weekIndex = 0;
      if (day >= 22) weekIndex = 3;
      else if (day >= 15) weekIndex = 2;
      else if (day >= 8) weekIndex = 1;

      if (t.type === 'income' || t.type === 'goal_withdraw') {
        weeks[weekIndex].income += amount;
      } else if (t.type === 'expense' || t.type === 'goal_deposit') {
        weeks[weekIndex].expense += amount;
      }
    });

    const maxVal = Math.max(...weeks.map(w => Math.max(w.income, w.expense)), 100);

    return { weeks, maxVal };
  }, [transactions, selectedMonthStr]);

  return (
    <div id="fluxo-do-mes-section" className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fluxo do Mês</h3>
            <p className="text-sm font-black text-slate-800 dark:text-white">Evolução por Períodos</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[10px] font-bold">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-500 dark:text-slate-400">Entradas</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-500 dark:text-slate-400">Saídas</span>
          </div>
        </div>
      </div>

      {/* Mobile-friendly Weekly Bar Comparators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {weeklyData.weeks.map(w => {
          const incPct = Math.min(100, Math.round((w.income / weeklyData.maxVal) * 100));
          const expPct = Math.min(100, Math.round((w.expense / weeklyData.maxVal) * 100));
          const diff = w.income - w.expense;

          return (
            <div 
              key={w.id} 
              className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                <span>{w.label}</span>
                <span className={`text-[9px] ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {!isBlurred ? (diff >= 0 ? `+${Math.round(diff)}` : `${Math.round(diff)}`) : '••'}
                </span>
              </div>

              {/* Progress Bars */}
              <div className="space-y-1.5">
                {/* Income Bar */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-medium text-slate-500 dark:text-slate-400">
                    <span>Entradas</span>
                    <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {!isBlurred ? formatCurrency(w.income) : '••'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${incPct}%` }}
                    />
                  </div>
                </div>

                {/* Expense Bar */}
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-medium text-slate-500 dark:text-slate-400">
                    <span>Saídas</span>
                    <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                      {!isBlurred ? formatCurrency(w.expense) : '••'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${expPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
