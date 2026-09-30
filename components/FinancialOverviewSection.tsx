import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Wallet, Calendar, ShieldCheck, AlertTriangle, ShieldAlert,
  Sliders, ArrowUpRight, ArrowDownRight, CreditCard,
  PiggyBank, CheckCircle2, ChevronRight, TrendingDown,
  Sparkles, HelpCircle, Layers, Activity
} from 'lucide-react';
import { DEFAULT_FINANCIAL_SETTINGS, parseCurrencyInput } from '../constants';
import { 
  isEssentialExpense, 
  isDebtExpense, 
  isTransferMovement, 
  isGoalMovement 
} from '../services/aiReportService';

export const FinancialOverviewSection: React.FC = () => {
  const navigate = useNavigate();
  const { 
    transactions, 
    accounts, 
    categories, 
    debts, 
    settings, 
    isBlurred,
    getAccountBalance,
    getBalanceSummary,
    getDebtProgress
  } = useFinance();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  const financialSettings = useMemo(() => {
    return settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
  }, [settings.financialSettings]);

  // 1. DINHEIRO DISPONÍVEL HOJE (Contas operacionais: conta corrente, carteira, investimentos)
  const cashAvailableToday = useMemo(() => {
    const operationalAccounts = accounts.filter(a => a.type !== 'savings');
    return operationalAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  }, [accounts, getAccountBalance]);

  // Total guardado em contas de poupança (Reserva Real Existente)
  const actualReservedMoney = useMemo(() => {
    const savingsAccounts = accounts.filter(a => a.type === 'savings');
    return savingsAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  }, [accounts, getAccountBalance]);

  // 2. COMPROMISSOS FUTUROS JÁ CONHECIDOS (Despesas pendentes registradas a partir de hoje + mês atual)
  const futureCommitments = useMemo(() => {
    // Despesas pendentes com data >= hoje
    const pendingFromToday = transactions.filter(t => 
      t.type === 'expense' && 
      t.status === 'pending' && 
      t.date >= todayStr &&
      !isTransferMovement(t) && 
      !isGoalMovement(t)
    );

    // Despesas pendentes do mês corrente
    const pendingThisMonth = transactions.filter(t => 
      t.type === 'expense' && 
      t.status === 'pending' && 
      t.date.startsWith(currentMonthPrefix) &&
      !isTransferMovement(t) && 
      !isGoalMovement(t)
    );

    const totalFromToday = pendingFromToday.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalThisMonth = pendingThisMonth.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalKnown: totalFromToday,
      totalThisMonth,
      countFromToday: pendingFromToday.length,
      countThisMonth: pendingThisMonth.length
    };
  }, [transactions, todayStr, currentMonthPrefix]);

  // 3. CUSTO ESSENCIAL MENSAL (Calculado com as categorias essenciais do usuário)
  const monthlyEssentialCost = useMemo(() => {
    // Despesas essenciais deste mês
    const thisMonthEssential = transactions.filter(t => 
      t.date.startsWith(currentMonthPrefix) &&
      isEssentialExpense(t, categories, debts, financialSettings)
    );
    const thisMonthSum = thisMonthEssential.reduce((s, t) => s + Number(t.amount), 0);
    if (thisMonthSum > 0) return thisMonthSum;

    // Se o mês estiver no início, média dos últimos 3 meses
    const now = new Date();
    const pastMonths: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      pastMonths.push(d.toISOString().slice(0, 7));
    }
    const pastEssential = transactions.filter(t => 
      pastMonths.some(m => t.date.startsWith(m)) &&
      isEssentialExpense(t, categories, debts, financialSettings)
    );
    const pastSum = pastEssential.reduce((s, t) => s + Number(t.amount), 0);
    return pastMonths.length > 0 && pastSum > 0 ? (pastSum / pastMonths.length) : 0;
  }, [transactions, categories, debts, financialSettings, currentMonthPrefix]);

  // 4. RESERVA MÍNIMA CONFIGURADA
  const minReserveConfigured = financialSettings.minReserveAmount ?? 5000;
  const targetReserveMonths = financialSettings.targetReserveMonths ?? 6;
  const targetReserveByMonths = monthlyEssentialCost > 0 ? (targetReserveMonths * monthlyEssentialCost) : 0;
  const targetTotalReserve = Math.max(minReserveConfigured, targetReserveByMonths);

  const reserveCoveragePct = targetTotalReserve > 0 
    ? Math.min(100, Math.round((actualReservedMoney / targetTotalReserve) * 100))
    : 100;
  const reserveDeficit = Math.max(0, targetTotalReserve - actualReservedMoney);

  // 5. CUSTO MENSAL COM DÍVIDAS ATIVAS
  const activeDebtsSummary = useMemo(() => {
    const active = debts.filter(d => {
      const prog = getDebtProgress(d.id);
      return prog.status !== 'paid' && prog.remaining > 0.1;
    });

    const monthlyTotal = active.reduce((sum, d) => {
      if (d.installmentAmount && d.installmentAmount > 0) return sum + Number(d.installmentAmount);
      const tx = transactions.find(t => t.debtId === d.id && t.date.startsWith(currentMonthPrefix));
      if (tx) return sum + Number(tx.amount);
      const count = d.installmentCount || 1;
      return sum + (Number(d.totalAmount) / count);
    }, 0);

    return {
      activeCount: active.length,
      monthlyTotal,
      debts: active
    };
  }, [debts, transactions, currentMonthPrefix, getDebtProgress]);

  // 6. CUSTO DE VIDA ATUAL (Essencial + Dívidas + Estilo de Vida Fixo)
  const currentCostOfLiving = useMemo(() => {
    // Despesas fixas/recorrentes do mês que não sejam essenciais nem dívidas
    const otherFixedMonthly = transactions.filter(t => 
      t.type === 'expense' && 
      t.date.startsWith(currentMonthPrefix) &&
      (t.isFixed || Boolean(t.fixedGroupId)) &&
      !isEssentialExpense(t, categories, debts, financialSettings) &&
      !isDebtExpense(t, debts, categories)
    ).reduce((s, t) => s + Number(t.amount), 0);

    return monthlyEssentialCost + activeDebtsSummary.monthlyTotal + otherFixedMonthly;
  }, [monthlyEssentialCost, activeDebtsSummary, transactions, currentMonthPrefix, categories, debts, financialSettings]);

  // 7. SALDO REALMENTE LIVRE
  // Caixa disponível hoje menos compromissos a pagar do mês menos déficit da reserva mínima
  const trulyFreeBalance = useMemo(() => {
    const immediateFree = cashAvailableToday - futureCommitments.totalThisMonth;
    if (immediateFree <= 0) return 0;
    // Se a reserva tem déficit, parte do caixa livre protege a reserva
    return Math.max(0, immediateFree - reserveDeficit);
  }, [cashAvailableToday, futureCommitments.totalThisMonth, reserveDeficit]);

  // 8. PRÓXIMA REDUÇÃO RELEVANTE DE DESPESAS/DÍVIDAS
  const nextRelevantReduction = useMemo(() => {
    const candidateDebts = activeDebtsSummary.debts.map(d => {
      const debtTxs = transactions.filter(t => t.debtId === d.id);
      const pendingTxs = debtTxs.filter(t => t.status === 'pending').sort((a, b) => a.date.localeCompare(b.date));
      const paidCount = debtTxs.filter(t => t.status === 'paid').length;
      const totalCount = d.installmentCount || debtTxs.length || 1;
      const remainingCount = Math.max(0, totalCount - paidCount);

      const lastTx = pendingTxs[pendingTxs.length - 1] || debtTxs[debtTxs.length - 1];
      const endDate = lastTx?.date || '';
      const monthlyRelief = Number(d.installmentAmount) || (totalCount > 0 ? Number(d.totalAmount) / totalCount : 0);

      return {
        name: d.name,
        endDate,
        monthlyRelief,
        remainingCount
      };
    }).filter(item => item.endDate && item.monthlyRelief > 0)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    return candidateDebts[0] || null;
  }, [activeDebtsSummary.debts, transactions]);

  // 9. INDICADOR DE SITUAÇÃO FINANCEIRA
  // Considera caixa atual, compromissos futuros, reserva mínima e projeção de caixa
  const financialStatusIndicator = useMemo(() => {
    // Projeção do mês atual
    const summary = getBalanceSummary(currentMonthPrefix, todayStr);
    const projectedBalance = summary.projectedBalance;
    const pendingIncome = summary.pendingIncome;
    const pendingExpense = futureCommitments.totalThisMonth;

    // Critério 🔴 RISCO:
    // 1) Caixa operacional descoberto (< 0)
    // 2) Projeção de caixa negativa
    // 3) Caixa atual + receitas previstas NÃO cobrem as contas pendentes do mês
    if (cashAvailableToday < 0 || projectedBalance < 0 || (cashAvailableToday + pendingIncome < pendingExpense)) {
      return {
        level: 'RISCO' as const,
        symbol: '🔴',
        label: 'Risco Financeiro',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-900/60',
        dotColor: 'bg-rose-500',
        reason: cashAvailableToday < 0
          ? 'Contas operacionais em saldo negativo.'
          : projectedBalance < 0
          ? 'Projeção de caixa negativa: obrigações superam os recursos totais.'
          : 'Compromissos pendentes do mês excedem o caixa somado às entradas previstas.'
      };
    }

    // Critério 🟡 ATENÇÃO:
    // 1) Caixa hoje não cobre sozinho as contas do mês (depende 100% de receitas futuras entrarem a tempo)
    // 2) OU Reserva de segurança com menos de 50% de cobertura
    // 3) OU Saldo realmente livre zerado
    if (cashAvailableToday < pendingExpense || reserveCoveragePct < 50 || trulyFreeBalance === 0) {
      return {
        level: 'ATENCAO' as const,
        symbol: '🟡',
        label: 'Atenção Necessária',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-900/60',
        dotColor: 'bg-amber-500',
        reason: cashAvailableToday < pendingExpense
          ? 'Caixa atual não quita todas as contas do mês sozinho; depende do recebimento de receitas previstas.'
          : reserveCoveragePct < 50
          ? `Reserva mínima de segurança abaixo de 50% da meta (${reserveCoveragePct}% coberta).`
          : 'Margem livre de novas compras zerada após salvaguardar obrigações e reserva.'
      };
    }

    // Critério 🟢 SAUDÁVEL:
    // 1) Caixa disponível hoje cobre as contas do mês com folga
    // 2) Projeção positiva
    // 3) Reserva com 50% ou mais de cobertura
    return {
      level: 'SAUDAVEL' as const,
      symbol: '🟢',
      label: 'Situação Saudável',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/60',
      dotColor: 'bg-emerald-500',
      reason: 'Caixa cobre compromissos imediatos, projeção positiva e reserva financeira guarnecida.'
    };
  }, [cashAvailableToday, futureCommitments.totalThisMonth, reserveCoveragePct, trulyFreeBalance, getBalanceSummary, currentMonthPrefix, todayStr]);

  const formatBRL = (val: number) => {
    if (isBlurred) return 'R$ •••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      
      {/* HEADER DA SEÇÃO COM INDICADOR DE SITUAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Visão Financeira
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Diagnóstico consolidado de liquidez, obrigações e blindagem patrimonial
          </p>
        </div>

        {/* INDICADOR DE SITUAÇÃO FINANCEIRA: 🟢 Saudável | 🟡 Atenção | 🔴 Risco */}
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1.5 rounded-full border text-xs font-black flex items-center space-x-2 shadow-xs ${financialStatusIndicator.badgeClass}`}>
            <span className="text-sm leading-none">{financialStatusIndicator.symbol}</span>
            <span>{financialStatusIndicator.label}</span>
          </div>

          <Link
            to="/financial-settings"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition active:scale-95 shadow-xs"
            title="Configurações Financeiras"
          >
            <Sliders size={16} />
          </Link>
        </div>
      </div>

      {/* EXPLICAÇÃO DO INDICADOR */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${financialStatusIndicator.dotColor}`} />
        <span className="leading-snug">
          <strong className="text-slate-800 dark:text-white">Diagnóstico de Caixa: </strong>
          {financialStatusIndicator.reason}
        </span>
      </div>

      {/* GRID DAS 8 MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        
        {/* 1. DINHEIRO DISPONÍVEL HOJE */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5">
              <Wallet size={14} className="text-indigo-500" />
              <span>Dinheiro Disponível Hoje</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
              Caixa Efetivo
            </span>
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums block">
              {formatBRL(cashAvailableToday)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Contas operacionais livres (exclui cofrinhos)
            </span>
          </div>
        </div>

        {/* 2. COMPROMISSOS FUTUROS JÁ CONHECIDOS */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar size={14} className="text-rose-500" />
              <span>Compromissos Futuros</span>
            </span>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
              {futureCommitments.countFromToday} pendentes
            </span>
          </div>
          <div>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums block">
              {formatBRL(futureCommitments.totalKnown)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Despesas pendentes cadastradas a vencer
            </span>
          </div>
        </div>

        {/* 3. RESERVA MÍNIMA CONFIGURADA */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck size={14} className="text-amber-500" />
              <span>Reserva Mínima Configurada</span>
            </span>
            <Link 
              to="/financial-settings"
              className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-0.5"
            >
              <span>{reserveCoveragePct}% coberta</span>
              <ChevronRight size={12} />
            </Link>
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                {formatBRL(targetTotalReserve)}
              </span>
              <span className="text-[11px] text-slate-400 font-bold">
                ({targetReserveMonths} meses)
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Guardado: {formatBRL(actualReservedMoney)} em cofrinhos/poupança
            </span>
          </div>
        </div>

        {/* 4. CUSTO ESSENCIAL MENSAL */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5">
              <Layers size={14} className="text-amber-600" />
              <span>Custo Essencial Mensal</span>
            </span>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
              Subsistência
            </span>
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums block">
              {formatBRL(monthlyEssentialCost)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Moradia, alimentação, saúde e contas básicas
            </span>
          </div>
        </div>

        {/* 5. CUSTO MENSAL COM DÍVIDAS ATIVAS */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5">
              <CreditCard size={14} className="text-rose-500" />
              <span>Custo Mensal Dívidas Ativas</span>
            </span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              {activeDebtsSummary.activeCount} ativas
            </span>
          </div>
          <div>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums block">
              {formatBRL(activeDebtsSummary.monthlyTotal)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Soma das parcelas mensais de empréstimos/dívidas
            </span>
          </div>
        </div>

        {/* 6. CUSTO DE VIDA ATUAL */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5">
              <Activity size={14} className="text-purple-500" />
              <span>Custo de Vida Atual</span>
            </span>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full">
              Por Mês
            </span>
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums block">
              {formatBRL(currentCostOfLiving)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Essencial ({formatBRL(monthlyEssentialCost)}) + Dívidas ({formatBRL(activeDebtsSummary.monthlyTotal)}) + Fixas
            </span>
          </div>
        </div>

        {/* 7. SALDO REALMENTE LIVRE */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles size={14} className="text-emerald-600" />
              <span>Saldo Realmente Livre</span>
            </span>
            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
              Margem de Compra
            </span>
          </div>
          <div>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums block">
              {formatBRL(trulyFreeBalance)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {reserveDeficit > 0 
                ? `Livre após contas e retenção de ${formatBRL(reserveDeficit)} para reserva`
                : 'Livre de qualquer compromisso ou déficit de reserva'}
            </span>
          </div>
        </div>

        {/* 8. PRÓXIMA REDUÇÃO RELEVANTE DE DESPESAS/DÍVIDAS */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5">
              <TrendingDown size={14} className="text-indigo-500" />
              <span>Próxima Redução Relevante</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
              Alívio Futuro
            </span>
          </div>
          <div>
            {nextRelevantReduction ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {nextRelevantReduction.name}
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 ml-2">
                    +{formatBRL(nextRelevantReduction.monthlyRelief)}/mês
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Término previsto: {new Date(nextRelevantReduction.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })} ({nextRelevantReduction.remainingCount} parcelas restantes)
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 block">
                  Sem parcelamentos ativos
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Nenhuma dívida com término previsto nos próximos meses.
                </span>
              </>
            )}
          </div>
        </div>

      </div>

      {/* FOOTER DA SEÇÃO COM ATALHO RÁPIDO PARA CONFIGURAÇÕES FINANCEIRAS */}
      <div className="pt-2 flex items-center justify-between text-xs">
        <Link 
          to="/financial-settings"
          className="inline-flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
        >
          <Sliders size={14} />
          <span>Personalizar Reserva e Categorias Essenciais</span>
          <ChevronRight size={14} />
        </Link>

        <Link
          to="/ai-report"
          className="inline-flex items-center space-x-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
        >
          <span>Gerar Relatório Completo para IA</span>
          <ChevronRight size={14} />
        </Link>
      </div>

    </section>
  );
};
