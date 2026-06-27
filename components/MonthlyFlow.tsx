import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ChevronLeft, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

export const MonthlyFlow = () => {
  const { transactions, isBlurred } = useFinance();

  // Process data for the flow
  const flowData = useMemo(() => {
    if (transactions.length === 0) return [];

    // 1. Group by Month (YYYY-MM)
    const groups: Record<string, { income: number; expense: number; date: Date }> = {};

    transactions.forEach(t => {
      const dateKey = t.date.slice(0, 7); // YYYY-MM
      if (!groups[dateKey]) {
        groups[dateKey] = { 
          income: 0, 
          expense: 0, 
          date: new Date(t.date + 'T12:00:00') 
        };
      }
      if (t.type === 'income') {
        groups[dateKey].income += Number(t.amount);
      } else {
        groups[dateKey].expense += Number(t.amount);
      }
    });

    const sortedKeys = Object.keys(groups).sort();

    // 3. Calculate Accumulated Balance
    let runningBalance = 0;
    const data = sortedKeys.map(key => {
      const g = groups[key];
      const monthlyBalance = g.income - g.expense;
      runningBalance += monthlyBalance;

      return {
        key,
        monthLabel: g.date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''), // jan/24
        fullLabel: g.date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        income: g.income,
        expense: g.expense,
        monthlyResult: monthlyBalance,
        accumulated: runningBalance
      };
    });

    return data;
  }, [transactions]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl text-xs">
          <p className="font-bold text-slate-700 dark:text-white mb-2 uppercase">{label}</p>
          <div className="space-y-1">
             <p className="text-emerald-600 dark:text-emerald-400 flex justify-between space-x-4">
               <span>Receitas:</span> <span>{isBlurred ? '••••' : formatCurrency(payload.find((p: any) => p.dataKey === 'income')?.value || 0)}</span>
             </p>
             <p className="text-rose-600 dark:text-rose-400 flex justify-between space-x-4">
               <span>Despesas:</span> <span>{isBlurred ? '••••' : formatCurrency(payload.find((p: any) => p.dataKey === 'expense')?.value || 0)}</span>
             </p>
             <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
             <p className="text-indigo-600 dark:text-indigo-400 font-bold flex justify-between space-x-4">
               <span>Acumulado:</span> <span>{isBlurred ? '••••' : formatCurrency(payload.find((p: any) => p.dataKey === 'accumulated')?.value || 0)}</span>
             </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pb-24 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-6">
        <Link to="/" className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400">
           <ChevronLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Fluxo Mensal</h1>
      </div>

      {flowData.length === 0 ? (
        <div className="text-center py-20 opacity-50">
           <TrendingUp className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
           <p className="text-sm text-slate-500 dark:text-slate-400">Adicione transações para visualizar o fluxo.</p>
        </div>
      ) : (
        <>
          {/* Chart Section */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Evolução do Saldo</h2>
            <div className="h-64 w-full text-xs">
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={flowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                   <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                   <YAxis tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `R$${val/1000}k`} />
                   <Tooltip content={<CustomTooltip />} cursor={{fill: '#f1f5f9', opacity: 0.1}} />
                   <Legend wrapperStyle={{paddingTop: '20px'}} />
                   <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
                   <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={8} />
                   <Line type="monotone" dataKey="accumulated" name="Saldo Acumulado" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} />
                 </ComposedChart>
               </ResponsiveContainer>
            </div>
          </div>

          {/* Table Section */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Detalhamento</h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Mês</th>
                        <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Receitas</th>
                        <th className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">Despesas</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap">Saldo Mês</th>
                        <th className="px-4 py-3 text-right whitespace-nowrap text-indigo-600 dark:text-indigo-400">Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {flowData.slice().reverse().map((row) => (
                        <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span>{row.monthLabel.toUpperCase()}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{row.key.slice(0, 4)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                            {isBlurred ? '••••' : formatCurrency(row.income)}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                            {isBlurred ? '••••' : formatCurrency(row.expense)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                             <span className={row.monthlyResult >= 0 ? 'text-slate-700 dark:text-slate-200' : 'text-red-500'}>
                                {isBlurred ? '••••' : (row.monthlyResult > 0 ? '+' : '') + formatCurrency(row.monthlyResult)}
                             </span>
                          </td>
                          <td className="px-4 py-3 text-right text-indigo-700 dark:text-indigo-400 font-bold whitespace-nowrap bg-indigo-50/30 dark:bg-indigo-900/10">
                            {isBlurred ? '••••' : formatCurrency(row.accumulated)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};