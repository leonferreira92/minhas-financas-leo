import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  HeartHandshake, Compass, Target, Flame, 
  Sparkles, Sliders, ArrowUpRight, CheckCircle2, 
  Layers, ShieldAlert, Coffee, Umbrella, HelpCircle
} from 'lucide-react';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import { 
  isEssentialExpense, 
  isTransferMovement, 
  isGoalMovement, 
  isDebtExpense,
  isDiscretionaryExpense
} from '../services/aiReportService';

export const CostOfLivingSection: React.FC = () => {
  const { 
    transactions, 
    categories, 
    debts, 
    settings, 
    isBlurred 
  } = useFinance();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  const financialSettings = useMemo(() => {
    return settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
  }, [settings.financialSettings]);

  // ---------------------------------------------------------------------------
  // APURAÇÃO HISTÓRICA REAL DAS MOVIMENTAÇÕES (EXCLUINDO TRANSFERÊNCIAS E COFRINHOS)
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    // 1. Filtrar todas as despesas operacionais reais (não transferências, não cofrinhos)
    const validExpenseTxs = transactions.filter(t => 
      t.type === 'expense' && 
      !isTransferMovement(t) && 
      !isGoalMovement(t)
    );

    // Mapear meses distintos com movimentação de despesas
    const monthSet = new Set<string>();
    validExpenseTxs.forEach(t => {
      const ym = t.date.slice(0, 7);
      if (ym) monthSet.add(ym);
    });

    const activeMonths = Array.from(monthSet).sort();
    const monthsCount = Math.max(1, activeMonths.length);

    // Agrupamento de gastos por categoria estrutural
    let totalEssentialAllTime = 0;
    let totalLifestyleAllTime = 0;
    let totalAllExpensesAllTime = 0;

    // Também calcular gastos do mês atual para comparação ou caso seja o único mês
    let currentMonthEssential = 0;
    let currentMonthLifestyle = 0;
    let currentMonthTotal = 0;

    validExpenseTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      totalAllExpensesAllTime += amt;

      const isEss = isEssentialExpense(t, categories, debts, financialSettings);
      if (isEss) {
        totalEssentialAllTime += amt;
      } else {
        totalLifestyleAllTime += amt;
      }

      if (t.date.startsWith(currentMonthPrefix)) {
        currentMonthTotal += amt;
        if (isEss) {
          currentMonthEssential += amt;
        } else {
          currentMonthLifestyle += amt;
        }
      }
    });

    // Médias mensais históricas
    const avgMonthlyEssential = totalEssentialAllTime / monthsCount;
    const avgMonthlyLifestyle = totalLifestyleAllTime / monthsCount;
    const avgMonthlyTotal = totalAllExpensesAllTime / monthsCount;

    // Se tivermos dados consolidados do mês atual e forem mais representativos que a média,
    // usamos uma ponderação prudente da média histórica
    const survivalCost = avgMonthlyEssential > 0 
      ? avgMonthlyEssential 
      : (currentMonthEssential > 0 ? currentMonthEssential : 0);

    const currentLivingCost = avgMonthlyTotal > 0 
      ? avgMonthlyTotal 
      : (currentMonthTotal > 0 ? currentMonthTotal : survivalCost);

    // -------------------------------------------------------------------------
    // CUSTO MENSAL PARA ATINGIR METAS FINANCEIRAS (Removido)
    // -------------------------------------------------------------------------
    const monthlyGoalsPace = 0;
    const activeGoalsCount = 0;

    const livingAndGoalsCost = currentLivingCost + monthlyGoalsPace;

    return {
      survivalCost,
      currentLivingCost,
      livingAndGoalsCost,
      monthlyGoalsPace,
      activeGoalsCount,
      monthsAnalyzed: monthsCount,
      lifestylePortion: Math.max(0, currentLivingCost - survivalCost)
    };
  }, [transactions, categories, debts, financialSettings, currentMonthPrefix]);

  const formatBRL = (val: number) => {
    if (isBlurred) return 'R$ •••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      
      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Compass size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Quanto custa minha vida?
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {metrics.monthsAnalyzed} {metrics.monthsAnalyzed === 1 ? 'mês base' : 'meses de base'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Degraus financeiros mensais baseados no seu histórico real de gastos
            </p>
          </div>
        </div>

        <Link
          to="/financial-settings"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
        >
          <Sliders size={14} />
          <span>Classificar Categorias</span>
        </Link>
      </div>

      {/* OS 3 INDICADORES SOLICITADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. CUSTO DE SOBREVIVÊNCIA */}
        <div className="p-5 rounded-[2rem] bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between relative overflow-hidden transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Umbrella size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/50">
                Piso Essencial
              </span>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                1. Custo de Sobrevivência
              </h3>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {formatBRL(metrics.survivalCost)}
                </span>
                <span className="text-xs font-bold text-slate-400">/mês</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Valor mensal necessário apenas para <strong>despesas essenciais</strong>: moradia, alimentação básica, contas de consumo, saúde e transporte indispensável.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Seu mínimo inegociável</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">Linha d'água</span>
          </div>
        </div>

        {/* 2. CUSTO DE VIDA ATUAL */}
        <div className="p-5 rounded-[2rem] bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/60 flex flex-col justify-between relative overflow-hidden transition hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Coffee size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/50">
                Padrão Real
              </span>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                2. Custo de Vida Atual
              </h3>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
                  {formatBRL(metrics.currentLivingCost)}
                </span>
                <span className="text-xs font-bold text-slate-400">/mês</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Média mensal considerando <strong>despesas essenciais + estilo de vida</strong> (lazer, refeições fora, assinaturas, compras e compromissos rotineiros).
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-indigo-200/60 dark:border-indigo-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Estilo de vida</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">+{formatBRL(metrics.lifestylePortion)}/mês</span>
          </div>
        </div>

        {/* 3. CUSTO PARA VIVER E ATINGIR METAS */}
        <div className="p-5 rounded-[2rem] bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 flex flex-col justify-between relative overflow-hidden transition hover:border-emerald-300 dark:hover:border-emerald-700 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Target size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50">
                Vida + Futuro
              </span>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                3. Viver & Atingir Metas
              </h3>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                  {formatBRL(metrics.livingAndGoalsCost)}
                </span>
                <span className="text-xs font-bold text-slate-400">/mês</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Custo de vida atual + valor mensal necessário</strong> para cumprir as {metrics.activeGoalsCount} metas financeiras cadastradas nos prazos planejados.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-emerald-200/60 dark:border-emerald-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Aporte p/ Metas</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.monthlyGoalsPace > 0 ? `+${formatBRL(metrics.monthlyGoalsPace)}/mês` : 'Metas 100% atingidas'}
            </span>
          </div>
        </div>

      </div>

      {/* RODA-PÉ METODOLÓGICO */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
          <span>
            Transferências entre contas e aportes em cofrinhos foram <strong>rigorosamente desconsiderados</strong> como despesas.
          </span>
        </div>
        <Link 
          to="/goals" 
          className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0 flex items-center space-x-1"
        >
          <span>Ver Metas ({metrics.activeGoalsCount})</span>
          <ArrowUpRight size={12} />
        </Link>
      </div>

    </section>
  );
};
