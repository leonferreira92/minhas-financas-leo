import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { HowMuchCanISpendCard } from './HowMuchCanISpendCard';
import { CostOfLivingSection } from './CostOfLivingSection';
import { SpendingAveragesSection } from './SpendingAveragesSection';
import { FinancialOverviewSection } from './FinancialOverviewSection';
import { FinancialProjectionSection } from './FinancialProjectionSection';
import { TopExpensesCard } from './extrato/TopExpensesCard';

/**
 * Hub de inteligência pessoal — reaproveita cards já existentes.
 * Sem seções de shows/carreira.
 */
export const PersonalInsightsScreen: React.FC = () => {
  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-5 pb-24 animate-fade-in">
      <div className="flex items-start gap-3 pt-1">
        <Link
          to="/mais"
          className="mt-1 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50 inline-flex items-center gap-1">
            <Sparkles size={10} /> Inteligência
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            Visão inteligente
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
            Quanto posso gastar, custo de vida, médias e projeções — só finanças pessoais.
          </p>
        </div>
      </div>

      <HowMuchCanISpendCard />
      <FinancialOverviewSection />
      <TopExpensesCard />
      <CostOfLivingSection />
      <SpendingAveragesSection />
      <FinancialProjectionSection />
    </div>
  );
};
