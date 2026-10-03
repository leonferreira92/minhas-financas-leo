import React, { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';
import { matchesScope } from '../../types';
import { Sparkles, TrendingUp, Wallet, ShieldCheck, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const CareerLifeDiagnostic: React.FC = () => {
  const { shows, transactions, accounts, getAccountBalance, isBlurred, activeScope } = useFinance();

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const metrics = useMemo(() => {
    // 1. Margem de Lucro por Show: (Cachê Bruto - Custos) / Cachê Bruto %
    let totalGrossCache = 0;
    let totalShowExpenses = 0;
    let totalRevenueShows = 0;
    let logisticExpenses = 0;

    const safeShows = Array.isArray(shows) ? shows : [];
    safeShows.forEach(s => {
      if (s.status === 'Cancelado') return;
      const fin = getShowFinancialSummary(s);
      totalGrossCache += fin.totalPredicted;
      totalShowExpenses += fin.totalExpenses;
      totalRevenueShows += fin.totalPredicted;

      if (s?.expenses && typeof s.expenses === 'object' && !Array.isArray(s.expenses)) {
        logisticExpenses += (Number((s.expenses as any).fuel) || 0) + (Number((s.expenses as any).toll) || 0) + (Number((s.expenses as any).commission) || 0);
      }
      if (Array.isArray(s.expenseItems)) {
        s.expenseItems.forEach(item => {
          logisticExpenses += Number(item.amount) || 0;
        });
      }
    });

    const profitMargin = totalGrossCache > 0 
      ? ((totalGrossCache - totalShowExpenses) / totalGrossCache) * 100 
      : 0;

    // 2. Cobertura do Custo de Vida Pessoal (Saldo Pessoal / Despesas Pessoais Fixas Mensais)
    const personalAccountsBalance = accounts
      .filter(a => a.scope === 'PERSONAL' || a.scope === 'BOTH')
      .reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);

    const personalExpensesThisMonth = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonthStr) && (t.scope === 'PERSONAL' || t.scope === 'BOTH'))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const monthlyFixedPersonal = Math.max(1500, personalExpensesThisMonth);
    const lifeCoverageMonths = monthlyFixedPersonal > 0 ? personalAccountsBalance / monthlyFixedPersonal : 0;

    // 3. Custo Logístico x Cachê (%)
    const logisticCostRatio = totalGrossCache > 0 ? (logisticExpenses / totalGrossCache) * 100 : 0;

    // 4. Eficiência de Pró-Labore (% da receita de shows transferida para o caixa pessoal no mês)
    const showIncomeMonth = transactions
      .filter(t => t.type === 'income' && t.date.startsWith(currentMonthStr) && (t.scope === 'BUSINESS' || t.categoryId === 'cat_33'))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const proLaboreMonth = transactions
      .filter(t => {
        if (!t.date.startsWith(currentMonthStr)) return false;
        const desc = t.description.toLowerCase();
        return desc.includes('pró-labore') || desc.includes('pro labore') || desc.includes('retirada');
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const proLaboreEfficiency = showIncomeMonth > 0 ? (proLaboreMonth / showIncomeMonth) * 100 : (proLaboreMonth > 0 ? 100 : 0);

    return {
      profitMargin,
      lifeCoverageMonths,
      logisticCostRatio,
      proLaboreEfficiency,
      totalGrossCache,
      personalAccountsBalance,
      proLaboreMonth
    };
  }, [shows, transactions, accounts, getAccountBalance, currentMonthStr]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
            Diagnóstico Operacional
          </span>
          <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
            Carreira Artística & Vida Pessoal
          </h3>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
          <Sparkles size={20} />
        </div>
      </div>

      {/* Grid com os 4 Cards Inteligentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Card 1: Margem de Lucro por Show */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              1. Margem de Lucro por Show
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {metrics.profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              (Cachê Bruto - Custos) / Cachê Bruto
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.max(5, metrics.profitMargin))}%` }} />
          </div>
        </div>

        {/* Card 2: Cobertura do Custo de Vida Pessoal */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              2. Cobertura de Vida Pessoal
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {metrics.lifeCoverageMonths.toFixed(1)} meses
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Saldo Pessoal cobre despesas mensais
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, (metrics.lifeCoverageMonths / 6) * 100)}%` }} />
          </div>
        </div>

        {/* Card 3: Custo Logístico x Cachê */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              3. Custo Logístico x Cachê
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <PieChart size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {metrics.logisticCostRatio.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Combustível, pedágio e comissões sobre cachê
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, metrics.logisticCostRatio)}%` }} />
          </div>
        </div>

        {/* Card 4: Eficiência de Pró-Labore */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              4. Eficiência de Pró-Labore
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Wallet size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
              {metrics.proLaboreEfficiency.toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Retirada transferida do show para o pessoal ({formatCurrency(metrics.proLaboreMonth)})
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(100, metrics.proLaboreEfficiency)}%` }} />
          </div>
        </div>

      </div>
    </div>
  );
};
