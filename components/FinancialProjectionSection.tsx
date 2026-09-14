import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  Calendar, TrendingUp, TrendingDown, AlertTriangle, 
  ShieldCheck, ArrowUpRight, ArrowDownRight, Layers, 
  Sparkles, CheckCircle2, ChevronRight, HelpCircle, 
  Filter, Eye, Flame, Clock, Landmark
} from 'lucide-react';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import { 
  isEssentialExpense, 
  isDebtExpense, 
  isProfessionalInvestmentExpense,
  isDiscretionaryExpense,
  isTransferMovement, 
  isGoalMovement,
  isIncomeGuaranteed,
  isRecurringIncome,
  isExtraordinaryIncome,
  isVariableWorkIncome,
  formatMonthYearBR
} from '../services/aiReportService';

export const FinancialProjectionSection: React.FC = () => {
  const { 
    transactions, 
    categories, 
    debts, 
    shows, 
    accounts, 
    settings, 
    isBlurred,
    getAccountBalance,
    getDebtProgress 
  } = useFinance();

  // Seletor de horizonte: 3, 6 ou 12 meses
  const [horizonMonths, setHorizonMonths] = useState<3 | 6 | 12>(6);
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('cards');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  const financialSettings = useMemo(() => {
    return settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
  }, [settings.financialSettings]);

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // ---------------------------------------------------------------------------
  // MOTOR DE PROJEÇÃO MENSAL
  // ---------------------------------------------------------------------------
  const projectionData = useMemo(() => {
    const now = new Date();

    // 1. Saldo Inicial Operacional Hoje (Exclui contas de reserva/poupança)
    const operationalAccounts = accounts.filter(
      a => !(a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('economia') || a.name.toLowerCase().includes('cofrinho'))
    );
    const startingCashToday = operationalAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);

    // 2. Lista dos próximos N meses
    const monthsList: string[] = [];
    for (let i = 0; i < horizonMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthsList.push(d.toISOString().slice(0, 7));
    }

    // 3. Informações de Dívidas ativas e parcelas
    const activeDebts = debts.filter(d => {
      const prog = getDebtProgress(d.id);
      return prog.status !== 'paid' && prog.remaining > 0.1;
    });

    const debtScheduleMap: Record<string, number> = {};
    activeDebts.forEach(d => {
      const dTxs = transactions.filter(t => t.debtId === d.id);
      const pendingTxs = dTxs.filter(t => t.status === 'pending');
      const installmentAmount = Number(d.installmentAmount) || (Number(d.totalAmount) / (d.installmentCount || 1)) || 0;

      if (pendingTxs.length > 0) {
        pendingTxs.forEach(t => {
          const ym = t.date.slice(0, 7);
          debtScheduleMap[ym] = (debtScheduleMap[ym] || 0) + Number(t.amount);
        });
      } else {
        // Se não houver transações pendentes geradas, projeta a parcela pelos próximos meses restantes
        const paidCount = dTxs.filter(t => t.status === 'paid').length;
        const totalCount = d.installmentCount || (dTxs.length || 1);
        const remainingCount = Math.max(0, totalCount - paidCount);

        for (let i = 0; i < Math.min(remainingCount, horizonMonths); i++) {
          const targetMonth = monthsList[i];
          if (targetMonth) {
            debtScheduleMap[targetMonth] = (debtScheduleMap[targetMonth] || 0) + installmentAmount;
          }
        }
      }
    });

    // 4. Média de despesas essenciais mensais para projeção de meses sem lançamentos
    const pastEssentialTxs = transactions.filter(t => 
      isEssentialExpense(t, categories, debts, financialSettings) && 
      t.date < currentMonthPrefix && 
      !isTransferMovement(t) && 
      !isGoalMovement(t)
    );
    const pastMonthsCount = new Set(pastEssentialTxs.map(t => t.date.slice(0, 7))).size;
    const avgHistoricalEssential = pastMonthsCount > 0 
      ? pastEssentialTxs.reduce((s, t) => s + Number(t.amount), 0) / pastMonthsCount 
      : 0;

    // Shows contratados futuros
    const confirmedFutureShows = shows.filter(s => 
      (s.status === 'Confirmado' || (s.status === 'Agendado' && Number(s.totalCache) > 0)) && 
      s.date >= todayStr
    );

    // Iteração dos meses calculando saldos encadeados
    let runningBalance = startingCashToday;

    interface MonthProjectionRow {
      monthStr: string;
      monthLabel: string;
      isCurrentMonth: boolean;
      initialBalance: number;
      confirmedIncomes: number;
      estimatedIncomes: number;
      essentialExpenses: number;
      lifestyleExpenses: number;
      debtInstallments: number;
      professionalInvestments: number;
      totalOutflows: number;
      netResult: number;
      projectedEndBalance: number;
      isDeficit: boolean;
      isNegative: boolean;
    }

    const rows: MonthProjectionRow[] = monthsList.map((monthStr, idx) => {
      const isCurrentMonth = monthStr === currentMonthPrefix;
      const initialBalance = runningBalance;

      // -----------------------------------------------------------------------
      // ENTRADAS DO MÊS
      // -----------------------------------------------------------------------
      const monthIncomes = transactions.filter(t => 
        t.type === 'income' && 
        t.date.startsWith(monthStr) && 
        (isCurrentMonth ? (t.status === 'pending' && t.date >= todayStr) : true) &&
        !isTransferMovement(t) && 
        !isGoalMovement(t)
      );

      let confirmedIncomes = 0;
      let estimatedIncomes = 0;

      monthIncomes.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (isIncomeGuaranteed(t, shows, categories) || isExtraordinaryIncome(t, categories) || isRecurringIncome(t, categories)) {
          confirmedIncomes += amt;
        } else {
          estimatedIncomes += amt;
        }
      });

      // Shows futuros contratados para este mês que não foram lançados como transação
      const showsInMonth = confirmedFutureShows.filter(s => s.date.startsWith(monthStr));
      showsInMonth.forEach(s => {
        const toReceive = Math.max(0, (Number(s.totalCache) || 0) - (Number(s.cacheReceived) || 0));
        const alreadyInTx = monthIncomes.some(t => 
          isVariableWorkIncome(t, categories) || 
          (s.receipts && s.receipts.some(r => r.transactionId === t.id)) ||
          (t.description && t.description.toLowerCase().includes(s.name.toLowerCase()))
        );
        if (!alreadyInTx && toReceive > 0) {
          confirmedIncomes += toReceive;
        }
      });

      // -----------------------------------------------------------------------
      // SAÍDAS DO MÊS POR TIPO
      // -----------------------------------------------------------------------
      const monthExpenseTxs = transactions.filter(t => 
        t.type === 'expense' && 
        t.date.startsWith(monthStr) && 
        (isCurrentMonth ? (t.status === 'pending' && t.date >= todayStr) : true) &&
        !isTransferMovement(t) && 
        !isGoalMovement(t)
      );

      // 1. Essenciais
      let essentialExpenses = monthExpenseTxs
        .filter(t => isEssentialExpense(t, categories, debts, financialSettings))
        .reduce((s, t) => s + Number(t.amount), 0);
      
      // Se não for o mês atual e não houver transações essenciais agendadas, projeta a média essencial
      if (!isCurrentMonth && essentialExpenses === 0 && avgHistoricalEssential > 0) {
        essentialExpenses = avgHistoricalEssential;
      }

      // 2. Dívidas
      let debtInstallments = monthExpenseTxs
        .filter(t => isDebtExpense(t, debts, categories))
        .reduce((s, t) => s + Number(t.amount), 0);
      
      // Fallback para cronograma de parcelas mapeado
      if (debtInstallments === 0 && debtScheduleMap[monthStr]) {
        debtInstallments = debtScheduleMap[monthStr];
      }

      // 3. Investimentos Profissionais
      const professionalInvestments = monthExpenseTxs
        .filter(t => isProfessionalInvestmentExpense(t, categories, financialSettings))
        .reduce((s, t) => s + Number(t.amount), 0);

      // 4. Estilo de vida (discricionário)
      const lifestyleExpenses = monthExpenseTxs
        .filter(t => 
          !isEssentialExpense(t, categories, debts, financialSettings) &&
          !isDebtExpense(t, debts, categories) &&
          !isProfessionalInvestmentExpense(t, categories, financialSettings)
        )
        .reduce((s, t) => s + Number(t.amount), 0);

      const totalOutflows = essentialExpenses + lifestyleExpenses + debtInstallments + professionalInvestments;

      // REGRA: Receitas incertas NÃO entram no saldo garantido
      const netResult = confirmedIncomes - totalOutflows;
      runningBalance += netResult;

      return {
        monthStr,
        monthLabel: formatMonthYearBR(monthStr),
        isCurrentMonth,
        initialBalance,
        confirmedIncomes,
        estimatedIncomes,
        essentialExpenses,
        lifestyleExpenses,
        debtInstallments,
        professionalInvestments,
        totalOutflows,
        netResult,
        projectedEndBalance: runningBalance,
        isDeficit: netResult < 0,
        isNegative: runningBalance < 0
      };
    });

    // -------------------------------------------------------------------------
    // DESTAQUES AUTOMÁTICOS SOLICITADOS:
    // 1. Primeiro mês com risco de saldo negativo
    // 2. Menor saldo projetado
    // 3. Meses com déficit
    // 4. Meses com maior sobra
    // -------------------------------------------------------------------------
    const firstNegativeMonth = rows.find(r => r.projectedEndBalance < 0) || null;

    let lowestRow = rows[0];
    rows.forEach(r => {
      if (r.projectedEndBalance < lowestRow.projectedEndBalance) {
        lowestRow = r;
      }
    });

    const deficitMonths = rows.filter(r => r.netResult < 0);

    let bestSurplusRow = rows[0];
    rows.forEach(r => {
      if (r.netResult > bestSurplusRow.netResult) {
        bestSurplusRow = r;
      }
    });

    return {
      startingCashToday,
      rows,
      firstNegativeMonth,
      lowestRow,
      deficitMonths,
      bestSurplusRow: bestSurplusRow.netResult > 0 ? bestSurplusRow : null
    };
  }, [
    horizonMonths, 
    accounts, 
    debts, 
    shows, 
    transactions, 
    categories, 
    financialSettings, 
    currentMonthPrefix, 
    todayStr, 
    getAccountBalance, 
    getDebtProgress
  ]);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      
      {/* HEADER DA SEÇÃO COM SELETOR DE HORIZONTE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Projeção Financeira
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                Horizonte {horizonMonths}M
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulação de fluxo de caixa, receitas confirmadas e pontos de estresse
            </p>
          </div>
        </div>

        {/* CONTROLES: HORIZONTE (3, 6, 12M) + VISÃO (CARDS / TABELA) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Seletor de Meses */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs font-bold">
            <button
              onClick={() => setHorizonMonths(3)}
              className={`px-3 py-1.5 rounded-xl transition ${
                horizonMonths === 3
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              3 Meses
            </button>
            <button
              onClick={() => setHorizonMonths(6)}
              className={`px-3 py-1.5 rounded-xl transition ${
                horizonMonths === 6
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              6 Meses
            </button>
            <button
              onClick={() => setHorizonMonths(12)}
              className={`px-3 py-1.5 rounded-xl transition ${
                horizonMonths === 12
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              12 Meses
            </button>
          </div>

          {/* Seletor de Modo de Exibição */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs font-bold">
            <button
              onClick={() => setDisplayMode('cards')}
              className={`px-2.5 py-1.5 rounded-xl transition ${
                displayMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Cartões
            </button>
            <button
              onClick={() => setDisplayMode('table')}
              className={`px-2.5 py-1.5 rounded-xl transition ${
                displayMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tabela
            </button>
          </div>

        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* OS 4 DESTAQUES AUTOMÁTICOS OBRIGATÓRIOS                               */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* 1. PRIMEIRO MÊS COM RISCO DE SALDO NEGATIVO */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2 ${
          projectionData.firstNegativeMonth 
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60' 
            : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Risco Negativo
            </span>
            {projectionData.firstNegativeMonth ? (
              <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
            ) : (
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
            )}
          </div>

          <div>
            {projectionData.firstNegativeMonth ? (
              <>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block">
                  1º Mês em Risco:
                </span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums block">
                  {projectionData.firstNegativeMonth.monthLabel}
                </span>
                <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-bold block mt-0.5">
                  Saldo final: {formatBRL(projectionData.firstNegativeMonth.projectedEndBalance)}
                </span>
              </>
            ) : (
              <>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block">
                  Sem Risco
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  Nenhum mês projeta saldo negativo no horizonte de {horizonMonths} meses.
                </p>
              </>
            )}
          </div>
        </div>

        {/* 2. MENOR SALDO PROJETADO */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Menor Saldo Projetado
            </span>
            <ArrowDownRight size={16} className="text-amber-500" />
          </div>

          <div>
            <div className="flex items-baseline space-x-1">
              <span className={`text-base font-black tabular-nums tracking-tight ${
                projectionData.lowestRow.projectedEndBalance < 0 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : 'text-slate-900 dark:text-white'
              }`}>
                {formatBRL(projectionData.lowestRow.projectedEndBalance)}
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
              Em {projectionData.lowestRow.monthLabel}
            </span>
          </div>
        </div>

        {/* 3. MESES COM DÉFICIT */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Meses com Déficit
            </span>
            <TrendingDown size={16} className="text-rose-500" />
          </div>

          <div>
            <span className="text-base font-black text-slate-900 dark:text-white tabular-nums block">
              {projectionData.deficitMonths.length} {projectionData.deficitMonths.length === 1 ? 'mês' : 'meses'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
              {projectionData.deficitMonths.length > 0 
                ? projectionData.deficitMonths.map(m => m.monthLabel.split('/')[0]).join(', ') 
                : 'Nenhum déficit registrado'}
            </span>
          </div>
        </div>

        {/* 4. MESES COM MAIOR SOBRA */}
        <div className="p-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/70 dark:border-emerald-900/40 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Maior Sobra Mensal
            </span>
            <ArrowUpRight size={16} className="text-emerald-500" />
          </div>

          <div>
            {projectionData.bestSurplusRow ? (
              <>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums block">
                  +{formatBRL(projectionData.bestSurplusRow.netResult)}
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">
                  Em {projectionData.bestSurplusRow.monthLabel}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400">Sem sobras no período</span>
            )}
          </div>
        </div>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MODO 1: CARTÕES MENSAIS (TIMELINE)                                    */}
      {/* --------------------------------------------------------------------- */}
      {displayMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectionData.rows.map(row => (
            <div 
              key={row.monthStr}
              className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                row.isNegative 
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60' 
                  : row.isDeficit 
                  ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50' 
                  : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Header do Mês */}
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60 pb-2.5">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white capitalize">
                      {row.monthLabel}
                    </h3>
                    {row.isCurrentMonth && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        Atual
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Saldo Inicial: <strong>{formatBRL(row.initialBalance)}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Resultado
                  </span>
                  <span className={`text-xs font-black tabular-nums ${
                    row.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {row.netResult >= 0 ? `+${formatBRL(row.netResult)}` : formatBRL(row.netResult)}
                  </span>
                </div>
              </div>

              {/* Linhas de Entrada e Saída */}
              <div className="space-y-1.5 text-xs">
                
                {/* (+) Receitas Confirmadas */}
                <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                  <span className="text-[11px] font-bold flex items-center">
                    (+) Receitas Confirmadas
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatBRL(row.confirmedIncomes)}
                  </span>
                </div>

                {/* (~) Receitas Estimadas (Separadas!) */}
                {row.estimatedIncomes > 0 && (
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <span>(~) Receitas Estimadas</span>
                      <span className="text-[8px] font-black uppercase px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                        Não Garantida
                      </span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatBRL(row.estimatedIncomes)}
                    </span>
                  </div>
                )}

                {/* (-) Despesas Essenciais */}
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 text-[11px]">
                  <span>(-) Despesas Essenciais</span>
                  <span className="font-bold tabular-nums">
                    {formatBRL(row.essentialExpenses)}
                  </span>
                </div>

                {/* (-) Estilo de Vida */}
                {row.lifestyleExpenses > 0 && (
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span>(-) Estilo de Vida</span>
                    <span className="font-medium tabular-nums">
                      {formatBRL(row.lifestyleExpenses)}
                    </span>
                  </div>
                )}

                {/* (-) Parcelas de Dívidas Ativas */}
                {row.debtInstallments > 0 && (
                  <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-[11px]">
                    <span>(-) Dívidas Ativas</span>
                    <span className="font-bold tabular-nums">
                      {formatBRL(row.debtInstallments)}
                    </span>
                  </div>
                )}

                {/* (-) Investimentos Profissionais */}
                {row.professionalInvestments > 0 && (
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-[11px]">
                    <span>(-) Invest. Profissional</span>
                    <span className="font-medium tabular-nums">
                      {formatBRL(row.professionalInvestments)}
                    </span>
                  </div>
                )}

              </div>

              {/* Saldo Final Projetado */}
              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Saldo Final Projetado:
                </span>
                <span className={`text-sm font-black tabular-nums ${
                  row.projectedEndBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatBRL(row.projectedEndBalance)}
                </span>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODO 2: TABELA DETALHADA COMPARATIVA                                  */}
      {/* --------------------------------------------------------------------- */}
      {displayMode === 'table' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-black text-[10px]">
              <tr>
                <th className="py-3 px-3">Mês</th>
                <th className="py-3 px-3 text-right">Saldo Inicial</th>
                <th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">Rec. Confirmada</th>
                <th className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">Rec. Estimada</th>
                <th className="py-3 px-3 text-right">Essenciais</th>
                <th className="py-3 px-3 text-right">Estilo de Vida</th>
                <th className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">Dívidas</th>
                <th className="py-3 px-3 text-right">Invest. Prof.</th>
                <th className="py-3 px-3 text-right">Resultado</th>
                <th className="py-3 px-3 text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {projectionData.rows.map(row => (
                <tr 
                  key={row.monthStr}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                    row.isNegative ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {row.monthLabel}
                    {row.isCurrentMonth && (
                      <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-600">
                        Atual
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-500 tabular-nums">
                    {formatBRL(row.initialBalance)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatBRL(row.confirmedIncomes)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                    {row.estimatedIncomes > 0 ? formatBRL(row.estimatedIncomes) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatBRL(row.essentialExpenses)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-500 tabular-nums">
                    {row.lifestyleExpenses > 0 ? formatBRL(row.lifestyleExpenses) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {row.debtInstallments > 0 ? formatBRL(row.debtInstallments) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {row.professionalInvestments > 0 ? formatBRL(row.professionalInvestments) : '—'}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-black tabular-nums ${
                    row.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {row.netResult >= 0 ? `+${formatBRL(row.netResult)}` : formatBRL(row.netResult)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-black tabular-nums ${
                    row.projectedEndBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatBRL(row.projectedEndBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RODA-PÉ METODOLÓGICO */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          <span>
            Receitas estimadas não foram incorporadas ao saldo projetado garantido. Transferências entre contas e aportes foram desconsiderados.
          </span>
        </div>
      </div>

    </section>
  );
};
