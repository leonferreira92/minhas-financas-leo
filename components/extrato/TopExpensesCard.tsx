import React, { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { matchesScope } from '../../types';
import { isCareerExpenseTransaction } from '../../services/financeAggregator';
import { ArrowDownRight, TrendingDown, Layers, User, Music } from 'lucide-react';

export const TopExpensesCard: React.FC = () => {
  const { transactions, debts, categories, activeScope, isBlurred } = useFinance();

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Separação Despesas Pessoais x Despesas Empresa (Música) no mês
  const expenseComparison = useMemo(() => {
    let personalTotal = 0;
    let businessTotal = 0;

    transactions.forEach(t => {
      if (t.type !== 'expense' || t.status === 'cancelled' || !t.date || !t.date.startsWith(currentMonthStr)) return;
      const amt = Number(t.amount) || 0;
      
      const isBiz = isCareerExpenseTransaction(t, debts);
      if (isBiz) {
        // Para parcelas de dívida da música, apenas as parcelas pagas entram no relatório da carreira
        if (t.debtId && t.status !== 'paid') return;
        businessTotal += amt;
      } else {
        personalTotal += amt;
      }
    });

    const combined = personalTotal + businessTotal;
    const personalPct = combined > 0 ? (personalTotal / combined) * 100 : 0;
    const businessPct = combined > 0 ? (businessTotal / combined) * 100 : 0;

    return {
      personalTotal,
      businessTotal,
      combined,
      personalPct,
      businessPct
    };
  }, [transactions, debts, currentMonthStr]);

  const topExpenses = useMemo(() => {
    const monthExpenses = transactions.filter(t => {
      if (t.type !== 'expense' || t.status === 'cancelled' || !t.date.startsWith(currentMonthStr)) return false;
      if (activeScope === 'BUSINESS') {
        if (t.debtId && t.status !== 'paid') return false;
        return isCareerExpenseTransaction(t, debts);
      }
      if (activeScope === 'PERSONAL') {
        return !isCareerExpenseTransaction(t, debts);
      }
      return matchesScope(t.scope, activeScope);
    });

    const sorted = [...monthExpenses].sort((a, b) => Number(b.amount) - Number(a.amount));
    const top5 = sorted.slice(0, 5);
    const maxAmount = top5.length > 0 ? Number(top5[0].amount) || 1 : 1;

    return {
      items: top5.map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const isBiz = isCareerExpenseTransaction(t, debts);
        return {
          id: t.id,
          description: t.description,
          amount: Number(t.amount) || 0,
          date: t.date,
          categoryName: t.subcategory ? String(t.subcategory) : (cat?.name || 'Geral'),
          color: cat?.color || '#6366f1',
          isBusiness: isBiz,
          percentage: Math.round(((Number(t.amount) || 0) / maxAmount) * 100)
        };
      }),
      totalMonthExpense: monthExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    };
  }, [transactions, debts, categories, currentMonthStr, activeScope]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-4">
      {/* 1. COMPARATIVO: DESPESAS PESSOAIS X DESPESAS EMPRESA (MÚSICA) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Divisão Mensal de Custos
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              Despesas Pessoais x Despesas Empresa
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Mês Vigente
          </span>
        </div>

        {/* Cards comparativos lado a lado */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
            <div className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-300">
              <User size={13} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Despesas Pessoais</span>
            </div>
            <div className="text-base sm:text-lg font-black text-indigo-900 dark:text-white tabular-nums">
              {!isBlurred ? formatCurrency(expenseComparison.personalTotal) : 'R$ •••••'}
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
              {expenseComparison.personalPct.toFixed(0)}% do custo total
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 space-y-1">
            <div className="flex items-center space-x-1.5 text-purple-700 dark:text-purple-300">
              <Music size={13} strokeWidth={2.5} />
              <span className="text-[10px] font-black uppercase tracking-wider">Despesas Música (Empresa)</span>
            </div>
            <div className="text-base sm:text-lg font-black text-purple-900 dark:text-white tabular-nums">
              {!isBlurred ? formatCurrency(expenseComparison.businessTotal) : 'R$ •••••'}
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
              {expenseComparison.businessPct.toFixed(0)}% do custo total
            </div>
          </div>
        </div>

        {/* Barra comparativa proporcional */}
        <div className="space-y-1 pt-1">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden flex">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500" 
              style={{ width: `${Math.max(5, expenseComparison.personalPct)}%` }} 
              title={`Pessoal: ${expenseComparison.personalPct.toFixed(1)}%`}
            />
            <div 
              className="bg-purple-600 h-full transition-all duration-500" 
              style={{ width: `${Math.max(5, expenseComparison.businessPct)}%` }} 
              title={`Empresa / Música: ${expenseComparison.businessPct.toFixed(1)}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-0.5">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
              <span>Pessoal (Custo de Vida)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
              <span>Música (Equipamentos & Produção)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOP 5 DESPESAS DO MÊS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
              Top 5 Maiores Despesas
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
              Nenhuma despesa registrada neste mês para o módulo selecionado.
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
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${
                      item.isBusiness
                        ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    }`}>
                      {item.isBusiness ? '🎸 Música' : '👤 Pessoal'}
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
    </div>
  );
};
