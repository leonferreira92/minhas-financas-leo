import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Lightbulb, AlertTriangle, TrendingUp, TrendingDown, 
  CheckCircle2, ArrowRight, ShieldCheck, Flame, 
  Music, Calendar, CreditCard, ShoppingBag, 
  Layers, Sparkles, ChevronRight, Zap
} from 'lucide-react';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import { 
  isEssentialExpense, 
  isDebtExpense, 
  isTransferMovement, 
  isGoalMovement,
  isIncomeGuaranteed,
  isRecurringIncome
} from '../services/aiReportService';

export interface FinancialInsight {
  id: string;
  type: 'critical' | 'warning' | 'opportunity' | 'success' | 'info';
  badge: string;
  title: string;
  fact: string;
  action: string;
  linkText?: string;
  linkTo?: string;
  icon: any;
  priorityScore: number; // Maior = mais relevante (para ordenar os top 1 a 5)
}

export const FinancialInsightsSection: React.FC = () => {
  const { 
    transactions, 
    categories, 
    debts, 
    goals, 
    shows, 
    accounts, 
    settings, 
    isBlurred,
    getAccountBalance,
    getDebtProgress 
  } = useFinance();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  const financialSettings = useMemo(() => {
    return settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
  }, [settings.financialSettings]);

  const formatBRL = (val: number) => {
    if (isBlurred) return 'R$ •••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // ---------------------------------------------------------------------------
  // MOTOR DE DETECÇÃO AUTOMÁTICA DE INSIGHTS (ESTRITAMENTE BASEADO EM DADOS REAIS)
  // ---------------------------------------------------------------------------
  const insightsList = useMemo(() => {
    const detected: FinancialInsight[] = [];

    // 1. Filtrar transações de despesas operacionais reais
    const validExpenseTxs = transactions.filter(t => 
      t.type === 'expense' && 
      !isTransferMovement(t) && 
      !isGoalMovement(t)
    );

    // Mês atual
    const currentMonthExpenses = validExpenseTxs.filter(t => t.date.startsWith(currentMonthPrefix));
    const currentMonthTotal = currentMonthExpenses.reduce((s, t) => s + Number(t.amount), 0);

    // Meses passados
    const pastMonthsSet = new Set<string>();
    validExpenseTxs.forEach(t => {
      const ym = t.date.slice(0, 7);
      if (ym && ym < currentMonthPrefix) pastMonthsSet.add(ym);
    });
    const pastMonthsList = Array.from(pastMonthsSet).sort();
    const pastMonthsCount = pastMonthsList.length;

    // -------------------------------------------------------------------------
    // INSIGHT: CATEGORIA QUE MAIS CONSUMIU DINHEIRO NO MÊS ATUAL
    // -------------------------------------------------------------------------
    if (currentMonthTotal > 0) {
      const categorySums: Record<string, number> = {};
      currentMonthExpenses.forEach(t => {
        categorySums[t.categoryId] = (categorySums[t.categoryId] || 0) + Number(t.amount);
      });

      let topCatId = '';
      let topCatAmount = 0;
      Object.entries(categorySums).forEach(([catId, sum]) => {
        if (sum > topCatAmount) {
          topCatAmount = sum;
          topCatId = catId;
        }
      });

      if (topCatId && topCatAmount > 0) {
        const topCat = categories.find(c => c.id === topCatId);
        const topCatName = topCat?.name || 'Geral';
        const pctOfTotal = Math.round((topCatAmount / currentMonthTotal) * 100);

        if (pctOfTotal >= 25) {
          detected.push({
            id: 'top_spender_category',
            type: 'info',
            badge: 'Concentração de Gastos',
            title: `Maior ralo financeiro do mês: ${topCatName}`,
            fact: `A categoria ${topCatName} já consumiu ${formatBRL(topCatAmount)}, representando ${pctOfTotal}% de todas as suas saídas registradas neste mês.`,
            action: 'Decisão prática: Verifique as notas e lançamentos dessa categoria para identificar se há despesas supérfluas que podem ser evitadas.',
            linkText: 'Ver extrato da categoria',
            linkTo: `/transactions?categoryId=${topCatId}`,
            icon: ShoppingBag,
            priorityScore: 75 + pctOfTotal
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // INSIGHT: CATEGORIA QUE MAIS AUMENTOU / GASTO ACIMA DA MÉDIA
    // -------------------------------------------------------------------------
    if (pastMonthsCount >= 1) {
      interface CatDiff {
        catId: string;
        name: string;
        currentVal: number;
        avgVal: number;
        diff: number;
        diffPct: number;
      }

      const diffList: CatDiff[] = [];

      categories.forEach(cat => {
        const catCurrent = currentMonthExpenses
          .filter(t => t.categoryId === cat.id)
          .reduce((s, t) => s + Number(t.amount), 0);

        const catPast = validExpenseTxs
          .filter(t => t.categoryId === cat.id && t.date < currentMonthPrefix)
          .reduce((s, t) => s + Number(t.amount), 0);

        const catAvg = catPast / pastMonthsCount;

        if (catAvg > 50 && catCurrent > catAvg * 1.25 && (catCurrent - catAvg) >= 100) {
          const diff = catCurrent - catAvg;
          const diffPct = Math.round((diff / catAvg) * 100);
          diffList.push({
            catId: cat.id,
            name: cat.name,
            currentVal: catCurrent,
            avgVal: catAvg,
            diff,
            diffPct
          });
        }
      });

      diffList.sort((a, b) => b.diff - a.diff);

      if (diffList.length > 0) {
        const biggestSurge = diffList[0];
        detected.push({
          id: 'category_surge',
          type: 'warning',
          badge: 'Desvio de Média',
          title: `Disparo anormal em ${biggestSurge.name}`,
          fact: `Você já gastou ${formatBRL(biggestSurge.currentVal)} em ${biggestSurge.name} neste mês, superando sua média histórica (${formatBRL(biggestSurge.avgVal)}) em +${biggestSurge.diffPct}% (+${formatBRL(biggestSurge.diff)}).`,
          action: 'Decisão prática: Congele novos desembolsos nesta categoria até o próximo mês para estancar o vazamento orçamentário.',
          linkText: 'Acessar Médias de Gastos',
          linkTo: '/flow',
          icon: TrendingUp,
          priorityScore: 90
        });
      }
    }

    // -------------------------------------------------------------------------
    // INSIGHT: REDUÇÃO DE DÍVIDA PRÓXIMA / QUITAÇÃO IMINENTE
    // -------------------------------------------------------------------------
    const activeDebts = debts.filter(d => {
      const prog = getDebtProgress(d.id);
      return prog.status !== 'paid' && prog.remaining > 0.1;
    });

    if (activeDebts.length > 0) {
      const endingSoonDebts = activeDebts.map(d => {
        const dTxs = transactions.filter(t => t.debtId === d.id);
        const paidCount = dTxs.filter(t => t.status === 'paid').length;
        const totalCount = d.installmentCount || dTxs.length || 1;
        const remainingCount = Math.max(0, totalCount - paidCount);

        const pendingTxs = dTxs.filter(t => t.status === 'pending').sort((a, b) => a.date.localeCompare(b.date));
        const lastTx = pendingTxs[pendingTxs.length - 1];
        const installmentVal = Number(d.installmentAmount) || (totalCount > 0 ? Number(d.totalAmount) / totalCount : 0);

        return {
          debt: d,
          remainingCount,
          totalCount,
          installmentVal,
          lastDate: lastTx?.date || ''
        };
      }).filter(item => item.remainingCount > 0 && item.remainingCount <= 3 && item.installmentVal > 0)
        .sort((a, b) => a.remainingCount - b.remainingCount);

      if (endingSoonDebts.length > 0) {
        const soonest = endingSoonDebts[0];
        const monthLabel = soonest.lastDate 
          ? new Date(soonest.lastDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          : 'nos próximos meses';

        detected.push({
          id: 'debt_ending_soon',
          type: 'success',
          badge: 'Alívio Financeiro',
          title: `Fim da dívida: ${soonest.debt.name}`,
          fact: `Faltam apenas ${soonest.remainingCount} ${soonest.remainingCount === 1 ? 'parcela' : 'parcelas'} para quitar ${soonest.debt.name} (previsão de término em ${monthLabel}).`,
          action: `Decisão prática: Assim que quitar, direcione o valor de ${formatBRL(soonest.installmentVal)}/mês que será liberado diretamente para a sua reserva de segurança.`,
          linkText: 'Ver detalhes das dívidas',
          linkTo: '/debts',
          icon: CheckCircle2,
          priorityScore: 85
        });
      }
    }

    // -------------------------------------------------------------------------
    // INSIGHT: NECESSIDADE DE RENDA ADICIONAL / SHOWS NECESSÁRIOS
    // -------------------------------------------------------------------------
    // Custo essencial mensal de subsistência
    const essentialTxs = currentMonthExpenses.filter(t => isEssentialExpense(t, categories, debts, financialSettings));
    const currentEssentialCost = essentialTxs.reduce((s, t) => s + Number(t.amount), 0);

    // Parcelas mensais ativas
    const monthlyDebtCost = activeDebts.reduce((s, d) => {
      if (d.installmentAmount && d.installmentAmount > 0) return s + Number(d.installmentAmount);
      return s + (Number(d.totalAmount) / (d.installmentCount || 1));
    }, 0);

    const mandatoryBaseline = currentEssentialCost + monthlyDebtCost;

    // Renda fixa recorrente (salário/pró-labore fixo contínuo)
    const recurringIncomes = transactions.filter(t => 
      t.type === 'income' && 
      isRecurringIncome(t, categories) &&
      !isTransferMovement(t) &&
      !isGoalMovement(t) &&
      Math.abs(Number(t.amount) - 2079.82) >= 0.05
    );
    const recurringIncomesThisMonth = recurringIncomes.filter(t => t.date.startsWith(currentMonthPrefix));
    const monthlyFixedIncome = recurringIncomesThisMonth.reduce((s, t) => s + Number(t.amount), 0);

    // Lucro médio por show no histórico
    const confirmedShows = shows.filter(s => s.status === 'Confirmado' || s.status === 'Realizado');
    let totalGrossShows = 0;
    let totalShowCosts = 0;
    confirmedShows.forEach(s => {
      totalGrossShows += Number(s.totalCache) || 0;
      const exp = s.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 };
      totalShowCosts += (Number(exp.fuel) || 0) + (Number(exp.food) || 0) + (Number(exp.toll) || 0) + (Number(exp.commission) || 0) + (Number(exp.others) || 0);
    });
    const avgProfitPerShow = confirmedShows.length > 0 ? (totalGrossShows - totalShowCosts) / confirmedShows.length : 0;

    // Se a renda fixa não cobrir o custo básico de subsistência + dívidas
    const monthlyDeficit = mandatoryBaseline - monthlyFixedIncome;
    if (monthlyDeficit > 150 && mandatoryBaseline > 0) {
      if (avgProfitPerShow > 0) {
        const neededShows = Math.ceil(monthlyDeficit / avgProfitPerShow);
        detected.push({
          id: 'shows_needed_for_deficit',
          type: 'critical',
          badge: 'Meta de Faturamento',
          title: `Necessidade de ${neededShows} ${neededShows === 1 ? 'show' : 'shows'}/mês para cobrir o custo fixo`,
          fact: `Suas obrigações obrigatórias (${formatBRL(mandatoryBaseline)}) superam sua renda fixa contínua (${formatBRL(monthlyFixedIncome)}) em ${formatBRL(monthlyDeficit)}/mês. Com lucro médio de ${formatBRL(avgProfitPerShow)} por show, você precisa de ${neededShows} apresentações mensais para zerar o déficit.`,
          action: 'Decisão prática: Garanta o fechamento dessas datas na agenda com antecedência ou renegocie despesas fixas para não depender de receitas extraordinárias.',
          linkText: 'Acessar Agenda de Shows',
          linkTo: '/shows',
          icon: Music,
          priorityScore: 98
        });
      } else {
        detected.push({
          id: 'deficit_income_needed',
          type: 'critical',
          badge: 'Pressão de Custos Fixos',
          title: `Déficit operacional de ${formatBRL(monthlyDeficit)}/mês`,
          fact: `Suas despesas essenciais somadas às parcelas de dívidas (${formatBRL(mandatoryBaseline)}) são maiores que sua renda fixa (${formatBRL(monthlyFixedIncome)}).`,
          action: 'Decisão prática: É imperativo gerar receitas variáveis adicionais ou reestruturar as contas essenciais para equilibrar o caixa.',
          linkText: 'Ajustar Configurações Financeiras',
          linkTo: '/financial-settings',
          icon: AlertTriangle,
          priorityScore: 95
        });
      }
    }

    // -------------------------------------------------------------------------
    // INSIGHT: MESES FUTUROS COM MAIOR PRESSÃO FINANCEIRA
    // -------------------------------------------------------------------------
    const futureMonthsMap: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense' && t.status === 'pending' && t.date >= todayStr && !isTransferMovement(t) && !isGoalMovement(t))
      .forEach(t => {
        const ym = t.date.slice(0, 7);
        futureMonthsMap[ym] = (futureMonthsMap[ym] || 0) + Number(t.amount);
      });

    const futureMonthsArr = Object.entries(futureMonthsMap).sort((a, b) => b[1] - a[1]);
    if (futureMonthsArr.length > 0) {
      const heaviestMonth = futureMonthsArr[0];
      const avgFutureMonth = futureMonthsArr.reduce((s, [, v]) => s + v, 0) / futureMonthsArr.length;

      if (heaviestMonth[1] > avgFutureMonth * 1.3 && heaviestMonth[1] >= 1000) {
        const [y, m] = heaviestMonth[0].split('-');
        const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        detected.push({
          id: 'future_pressure_month',
          type: 'warning',
          badge: 'Pico de Despesas',
          title: `Alerta de sobrecarga em ${monthName}`,
          fact: `${monthName} já possui ${formatBRL(heaviestMonth[1])} em contas futuras cadastradas, concentrando a maior pressão de desembolso no seu horizonte.`,
          action: 'Decisão prática: Reserve desde já uma fatia dos seus recebimentos atuais para não passar aperto na chegada desse vencimento.',
          linkText: 'Ver Planejamento Mensal',
          linkTo: '/flow',
          icon: Calendar,
          priorityScore: 82
        });
      }
    }

    // -------------------------------------------------------------------------
    // INSIGHT: RESERVA MÍNIMA ABAIXO DA META
    // -------------------------------------------------------------------------
    const userMinReserve = financialSettings.minReserveAmount ?? 5000;
    const targetMonths = financialSettings.targetReserveMonths ?? 6;
    const targetFromMonths = currentEssentialCost > 0 ? (targetMonths * currentEssentialCost) : 0;
    const targetReserveTotal = Math.max(userMinReserve, targetFromMonths);

    const savingsAccounts = accounts.filter(a => a.type === 'savings');
    const totalInSavings = savingsAccounts.reduce((s, a) => s + getAccountBalance(a.id), 0);
    const totalInGoals = goals.reduce((s, g) => s + (Number(g.currentAmount) || 0), 0);
    const actualReserved = Math.max(totalInSavings, totalInGoals);

    const reserveDeficit = targetReserveTotal - actualReserved;
    if (reserveDeficit > 500 && targetReserveTotal > 0) {
      const coverage = Math.round((actualReserved / targetReserveTotal) * 100);
      detected.push({
        id: 'reserve_gap',
        type: 'warning',
        badge: 'Blindagem Patrimonial',
        title: `Reserva em ${coverage}% da meta recomendada`,
        fact: `Você possui ${formatBRL(actualReserved)} guardados em cofrinhos/poupança frente a uma meta de ${formatBRL(targetReserveTotal)} (déficit de ${formatBRL(reserveDeficit)}).`,
        action: 'Decisão prática: Destine os saldos livres e qualquer receita extraordinária (FGTS, rescisões ou bônus) para acelerar essa cobertura.',
        linkText: 'Configurar Reserva',
        linkTo: '/financial-settings',
        icon: ShieldCheck,
        priorityScore: 78
      });
    }

    // Ordenar por prioridade (maior pontuação primeiro) e limitar aos 5 mais relevantes
    return detected.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5);
  }, [
    transactions, 
    categories, 
    debts, 
    goals, 
    shows, 
    accounts, 
    financialSettings, 
    currentMonthPrefix, 
    todayStr, 
    getAccountBalance, 
    getDebtProgress,
    isBlurred
  ]);

  if (insightsList.length === 0) {
    return null;
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      
      {/* HEADER DA SEÇÃO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Zap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Insights Financeiros
              </h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/50">
                {insightsList.length} {insightsList.length === 1 ? 'alerta ativo' : 'alertas ativos'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pontos de atenção e oportunidades detectados automaticamente no seu fluxo
            </p>
          </div>
        </div>

        <Link
          to="/ai-report"
          className="hidden sm:inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <span>Relatório Completo</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* LISTA DE CARDS DE INSIGHTS (1 A 5 CARDS) */}
      <div className="grid grid-cols-1 gap-3.5">
        {insightsList.map(item => {
          const IconComp = item.icon;

          // Estilos contextuais por tipo
          const typeStyle = {
            critical: {
              border: 'border-rose-200 dark:border-rose-900/60',
              bg: 'bg-rose-50/40 dark:bg-rose-950/20',
              badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900/60',
              iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            },
            warning: {
              border: 'border-amber-200 dark:border-amber-900/60',
              bg: 'bg-amber-50/40 dark:bg-amber-950/20',
              badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/60',
              iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            },
            success: {
              border: 'border-emerald-200 dark:border-emerald-900/60',
              bg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
              badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/60',
              iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            },
            opportunity: {
              border: 'border-indigo-200 dark:border-indigo-900/60',
              bg: 'bg-indigo-50/40 dark:bg-indigo-950/20',
              badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-900/60',
              iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            },
            info: {
              border: 'border-slate-200 dark:border-slate-800',
              bg: 'bg-slate-50/60 dark:bg-slate-950/40',
              badge: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
              iconBg: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }
          }[item.type];

          return (
            <div 
              key={item.id}
              className={`p-4 sm:p-5 rounded-2xl border ${typeStyle.border} ${typeStyle.bg} flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition hover:shadow-xs`}
            >
              <div className="flex items-start space-x-3.5">
                <div className={`w-9 h-9 rounded-xl ${typeStyle.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <IconComp size={18} strokeWidth={2.5} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeStyle.badge}`}>
                      {item.badge}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.fact}
                  </p>

                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed pt-1">
                    {item.action}
                  </p>
                </div>
              </div>

              {item.linkTo && item.linkText && (
                <Link
                  to={item.linkTo}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 sm:self-center ml-12 sm:ml-0"
                >
                  <span>{item.linkText}</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* RODA-PÉ METODOLÓGICO */}
      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          <span>Calculado exclusivamente sobre movimentações e contratos reais do aplicativo.</span>
        </div>
      </div>

    </section>
  );
};
