import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { matchesScope } from '../../types';
import { TrendingUp, ShieldAlert, AlertTriangle, CheckCircle2, Sliders, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type ScenarioType = 'conservative' | 'moderate' | 'optimistic';

export const CashFlowSimulator: React.FC = () => {
  const { accounts, transactions, shows, getAccountBalance, isBlurred, activeScope } = useFinance();
  const [scenario, setScenario] = useState<ScenarioType>('moderate');

  // Saldo real atual
  const currentBalance = useMemo(() => {
    return accounts
      .filter(a => matchesScope(a.scope, activeScope))
      .reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  }, [accounts, getAccountBalance, activeScope]);

  // Média mensal histórica de despesas e receitas dos últimos 3 meses
  const averages = useMemo(() => {
    let totalExpense = 0;
    let totalShowRevenue = 0;
    const now = new Date();

    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = d.toISOString().slice(0, 7);

      const monthTxs = transactions.filter(t => t.date.startsWith(prefix) && matchesScope(t.scope, activeScope));
      monthTxs.forEach(t => {
        if (t.type === 'expense') totalExpense += Number(t.amount) || 0;
      });

      const monthShows = shows.filter(s => s.status !== 'Cancelado' && (s.date || '').startsWith(prefix) && matchesScope(s.scope, activeScope));
      monthShows.forEach(s => {
        const cache = Number(s.totalCache || s.cacheCombined || 0);
        totalShowRevenue += cache;
      });
    }

    const avgMonthlyExpense = Math.max(1200, totalExpense / 3);
    const avgMonthlyShowRev = totalShowRevenue / 3;

    return { avgMonthlyExpense, avgMonthlyShowRev };
  }, [transactions, shows, activeScope]);

  // Simulação para os próximos 6 meses com base no cenário selecionado
  const simulationMonths = useMemo(() => {
    const multiplier = scenario === 'conservative' ? 0.2 : scenario === 'moderate' ? 1.0 : 1.3;
    const monthsData: { label: string; projectedBalance: number; showRevenue: number; expenses: number }[] = [];

    let runningBalance = currentBalance;
    const now = new Date();

    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

      const simulatedShowRev = averages.avgMonthlyShowRev * multiplier;
      const simulatedExpense = averages.avgMonthlyExpense;

      runningBalance += (simulatedShowRev - simulatedExpense);

      monthsData.push({
        label,
        projectedBalance: Math.round(runningBalance * 100) / 100,
        showRevenue: Math.round(simulatedShowRev * 100) / 100,
        expenses: Math.round(simulatedExpense * 100) / 100
      });
    }

    return monthsData;
  }, [currentBalance, averages, scenario]);

  // Ponto de Equilíbrio / Data Limitante (mês em que o saldo zera ou fica negativo)
  const breakevenAlert = useMemo(() => {
    const negativeMonth = simulationMonths.find(m => m.projectedBalance < 0);
    if (negativeMonth) {
      return {
        hasRisk: true,
        message: `Atenção: No cenário ${scenario === 'conservative' ? 'Conservador' : scenario === 'moderate' ? 'Moderado' : 'Otimista'}, o saldo ficaria negativo em ${negativeMonth.label}.`
      };
    }
    const lowest = [...simulationMonths].sort((a, b) => a.projectedBalance - b.projectedBalance)[0];
    return {
      hasRisk: false,
      message: `Caixa sustentável em todos os próximos 6 meses. Menor saldo projetado: ${lowest ? lowest.label : 'N/D'}.`
    };
  }, [simulationMonths, scenario]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Simulador de Caixa Futuro
          </span>
          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            Projeções por Cenários de Shows
          </h3>
        </div>

        {/* Seletor de Cenários */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setScenario('conservative')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
              scenario === 'conservative' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Conservador
          </button>
          <button
            type="button"
            onClick={() => setScenario('moderate')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
              scenario === 'moderate' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Moderado
          </button>
          <button
            type="button"
            onClick={() => setScenario('optimistic')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
              scenario === 'optimistic' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Otimista
          </button>
        </div>
      </div>

      {/* Indicador de Ponto de Equilíbrio / Data Limitante */}
      <div className={`p-4 rounded-2xl border flex items-start space-x-3 ${
        breakevenAlert.hasRisk 
          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200' 
          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
      }`}>
        {breakevenAlert.hasRisk ? <ShieldAlert size={20} className="shrink-0 mt-0.5 text-rose-600" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider">Ponto de Equilíbrio & Sustentabilidade</h4>
          <p className="text-xs font-medium mt-0.5">{breakevenAlert.message}</p>
        </div>
      </div>

      {/* Grid de Projeção para os próximos meses */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {simulationMonths.map((m, idx) => (
          <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">{m.label}</span>
              <div className={`text-sm sm:text-base font-black tracking-tight tabular-nums mt-1 ${m.projectedBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
                {!isBlurred ? formatCurrency(m.projectedBalance) : '••••'}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 text-[10px]">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Rec:</span>
                <span>{!isBlurred ? formatCurrency(m.showRevenue) : '••'}</span>
              </div>
              <div className="flex justify-between text-rose-500 font-bold">
                <span>Desp:</span>
                <span>{!isBlurred ? formatCurrency(m.expenses) : '••'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
