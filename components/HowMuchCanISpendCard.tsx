import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  ShoppingBag, ShieldCheck, AlertTriangle, TrendingDown, 
  Calendar, CreditCard, ChevronDown, ChevronUp, Sliders, 
  HelpCircle, CheckCircle2, Lock, ArrowRight, Sparkles,
  Info, AlertCircle, Banknote
} from 'lucide-react';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import { 
  isEssentialExpense, 
  isDebtExpense, 
  isTransferMovement, 
  isGoalMovement,
  isIncomeGuaranteed,
  isExtraordinaryIncome,
  isVariableWorkIncome,
  isRecurringIncome
} from '../services/aiReportService';

export const HowMuchCanISpendCard: React.FC = () => {
  const { 
    transactions, 
    accounts, 
    categories, 
    debts, 
    goals, 
    shows, 
    settings, 
    isBlurred,
    getAccountBalance,
    getDebtProgress
  } = useFinance();

  const [showDetail, setShowDetail] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Configurações financeiras do usuário (sem inventar dados)
  const financialSettings = useMemo(() => {
    return settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
  }, [settings.financialSettings]);

  // 1. DINHEIRO DISPONÍVEL HOJE EM CONTAS OPERACIONAIS
  const cashAvailableToday = useMemo(() => {
    const operational = accounts.filter(a => a.type !== 'savings');
    return operational.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  }, [accounts, getAccountBalance]);

  // Saldo real guardado em poupança e cofrinhos
  const actualReservedInGoals = useMemo(() => {
    const savingsAccounts = accounts.filter(a => a.type === 'savings');
    const totalInSavings = savingsAccounts.reduce((s, a) => s + getAccountBalance(a.id), 0);
    const totalInGoals = goals.reduce((s, g) => s + (Number(g.currentAmount) || 0), 0);
    return Math.max(totalInSavings, totalInGoals);
  }, [accounts, goals, getAccountBalance]);

  // 2. CUSTO ESSENCIAL MENSAL DE REFERÊNCIA
  const monthlyEssentialCost = useMemo(() => {
    const thisMonthTxs = transactions.filter(t => 
      t.date.startsWith(currentMonthPrefix) &&
      isEssentialExpense(t, categories, debts, financialSettings)
    );
    const thisMonthSum = thisMonthTxs.reduce((s, t) => s + Number(t.amount), 0);
    if (thisMonthSum > 0) return thisMonthSum;

    const pastMonths: string[] = [];
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      pastMonths.push(d.toISOString().slice(0, 7));
    }
    const pastTxs = transactions.filter(t => 
      pastMonths.some(m => t.date.startsWith(m)) &&
      isEssentialExpense(t, categories, debts, financialSettings)
    );
    const pastSum = pastTxs.reduce((s, t) => s + Number(t.amount), 0);
    return pastMonths.length > 0 && pastSum > 0 ? (pastSum / pastMonths.length) : 0;
  }, [transactions, categories, debts, financialSettings, currentMonthPrefix]);

  // 3. RESERVA MÍNIMA PROTEGIDA (CONFIGURADA PELO USUÁRIO)
  const minReserveConfigured = financialSettings.minReserveAmount ?? 5000;
  const targetReserveMonths = financialSettings.targetReserveMonths ?? 6;
  const targetFromMonths = monthlyEssentialCost > 0 ? (targetReserveMonths * monthlyEssentialCost) : 0;
  const targetSafetyReserve = Math.max(minReserveConfigured, targetFromMonths);

  // Déficit da reserva (quanto falta guardar nos cofrinhos para atingir a meta configurada)
  const reserveDeficit = Math.max(0, targetSafetyReserve - actualReservedInGoals);

  // 4. COMPROMISSOS FUTUROS CONSIDERADOS (Despesas pendentes cadastradas a vencer a partir de hoje)
  const futureCommitments = useMemo(() => {
    // Despesas pendentes cadastradas a partir de hoje
    const pendingFromToday = transactions.filter(t => 
      t.type === 'expense' && 
      t.status === 'pending' && 
      t.date >= todayStr &&
      !isTransferMovement(t) && 
      !isGoalMovement(t)
    );

    // Despesas pendentes do mês atual a vencer
    const pendingCurrentMonth = transactions.filter(t => 
      t.type === 'expense' && 
      t.status === 'pending' && 
      t.date.startsWith(currentMonthPrefix) &&
      !isTransferMovement(t) && 
      !isGoalMovement(t)
    );

    const totalFromToday = pendingFromToday.reduce((s, t) => s + Number(t.amount), 0);
    const totalThisMonth = pendingCurrentMonth.reduce((s, t) => s + Number(t.amount), 0);

    return {
      totalFromToday,
      totalThisMonth,
      countFromToday: pendingFromToday.length,
      countThisMonth: pendingCurrentMonth.length,
      list: pendingFromToday
    };
  }, [transactions, todayStr, currentMonthPrefix]);

  // Dívidas ativas e parcelas mensais
  const activeDebts = useMemo(() => {
    return debts.filter(d => {
      const prog = getDebtProgress(d.id);
      return prog.status !== 'paid' && prog.remaining > 0.1;
    });
  }, [debts, getDebtProgress]);

  const totalMonthlyDebtInstallments = useMemo(() => {
    return activeDebts.reduce((sum, d) => {
      if (d.installmentAmount && d.installmentAmount > 0) return sum + Number(d.installmentAmount);
      const tx = transactions.find(t => t.debtId === d.id && t.date.startsWith(currentMonthPrefix));
      if (tx) return sum + Number(tx.amount);
      const count = d.installmentCount || 1;
      return sum + (Number(d.totalAmount) / count);
    }, 0);
  }, [activeDebts, transactions, currentMonthPrefix]);

  // 5. PROJEÇÃO DE FLUXO MENSAL DOS PRÓXIMOS 6 MESES
  // REGRA CRUCIAL: NÃO considerar receitas incertas ou não confirmadas para aumentar limite de compra!
  const projection = useMemo(() => {
    const monthsList: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      monthsList.push(d.toISOString().slice(0, 7));
    }

    let runningBalance = cashAvailableToday;
    const monthlyData: {
      monthStr: string;
      guaranteedInflow: number;
      outflows: number;
      net: number;
      endBalance: number;
    }[] = [];

    // Shows contratados futuros confirmados a receber
    const confirmedFutureShows = shows.filter(s => 
      (s.status === 'Confirmado' || s.status === 'Realizado') &&
      s.date >= todayStr
    );

    monthsList.forEach((monthStr, idx) => {
      const isCurrent = idx === 0;

      // ENTRADAS: APENAS RECEITAS GARANTIDAS (exclui incertas / não confirmadas)
      const monthIncomes = transactions.filter(t => 
        t.type === 'income' && 
        t.date.startsWith(monthStr) &&
        (isCurrent ? t.status === 'pending' && t.date >= todayStr : true) &&
        !isTransferMovement(t) &&
        !isGoalMovement(t) &&
        isIncomeGuaranteed(t, shows, categories) // Filtro rigoroso: descarta previsões incertas
      );

      let guaranteedInflow = monthIncomes.reduce((s, t) => s + Number(t.amount), 0);

      // Shows confirmados do mês caso não estejam em transações pendentes
      const monthShows = confirmedFutureShows.filter(s => s.date.startsWith(monthStr));
      monthShows.forEach(s => {
        const showToReceive = Math.max(0, (Number(s.totalCache) || 0) - (Number(s.cacheReceived) || 0));
        const hasTx = monthIncomes.some(t => 
          (s.receipts && s.receipts.some(r => r.transactionId === t.id)) ||
          (t.description && t.description.toLowerCase().includes(s.name.toLowerCase()))
        );
        if (!hasTx && showToReceive > 0) {
          guaranteedInflow += showToReceive;
        }
      });

      // SAÍDAS DO MÊS
      const monthExpenses = transactions.filter(t => 
        t.type === 'expense' && 
        t.date.startsWith(monthStr) &&
        (isCurrent ? t.status === 'pending' && t.date >= todayStr : true) &&
        !isTransferMovement(t) &&
        !isGoalMovement(t)
      );

      let outflows = monthExpenses.reduce((s, t) => s + Number(t.amount), 0);

      // Se mês futuro ainda não tiver contas cadastradas, projeta o custo essencial + parcelas de dívidas ativas
      if (!isCurrent && outflows === 0) {
        outflows = monthlyEssentialCost + totalMonthlyDebtInstallments;
      }

      const net = guaranteedInflow - outflows;
      runningBalance += net;

      monthlyData.push({
        monthStr,
        guaranteedInflow,
        outflows,
        net,
        endBalance: runningBalance
      });
    });

    // Menor saldo projetado em qualquer ponto da linha do tempo
    const allPoints = [
      cashAvailableToday - futureCommitments.totalThisMonth,
      ...monthlyData.map(m => m.endBalance)
    ];
    const lowestProjected = Math.min(...allPoints);

    // Menor saldo líquido mensal
    const minMonthlyNet = Math.min(...monthlyData.map(m => m.net));

    return {
      monthlyData,
      lowestProjected,
      minMonthlyNet
    };
  }, [
    cashAvailableToday, 
    futureCommitments.totalThisMonth, 
    transactions, 
    shows, 
    categories, 
    todayStr, 
    monthlyEssentialCost, 
    totalMonthlyDebtInstallments
  ]);

  // 6. VALOR DISPONÍVEL PARA COMPRA À VISTA (CÁLCULO AUTOMÁTICO RIGOROSO)
  // O valor máximo que pode ser gasto à vista sem:
  // - comprometer contas futuras já cadastradas (cashAvailableToday - futureCommitments >= compra)
  // - causar saldo negativo na projeção (lowestProjected >= compra)
  // - consumir a reserva mínima configurada (lowestProjected - reserveDeficit >= compra)
  const spotPurchaseCapacity = useMemo(() => {
    // Teto 1: Caixa imediato livre de contas do mês
    const immediateHeadroom = cashAvailableToday - futureCommitments.totalThisMonth;
    
    // Teto 2: Menor saldo que a conta atingirá no horizonte projetado
    const projectedHeadroom = projection.lowestProjected;

    // Se qualquer teto for negativo, não há capacidade de compra à vista
    if (immediateHeadroom <= 0 || projectedHeadroom <= 0) {
      return 0;
    }

    // Teto base mais restritivo entre liquidez imediata e projeção
    const rawHeadroom = Math.min(immediateHeadroom, projectedHeadroom);

    // Subtrai o déficit da reserva mínima para que o dinheiro nunca consuma a reserva protegida
    const safeAfterReserveProtection = rawHeadroom - reserveDeficit;

    return Math.max(0, safeAfterReserveProtection);
  }, [cashAvailableToday, futureCommitments.totalThisMonth, projection.lowestProjected, reserveDeficit]);

  // 7. NOVA PARCELA MENSAL POSSÍVEL (CONSIDERANDO O FLUXO PROJETADO)
  const maxPossibleInstallment = useMemo(() => {
    // Só é possível assumir nova parcela se:
    // 1) O menor saldo projetado for positivo
    // 2) O menor resultado líquido mensal (entradas certas - saídas) for positivo
    // 3) A reserva mínima estiver preservada
    if (projection.lowestProjected <= 0 || projection.minMonthlyNet <= 0 || spotPurchaseCapacity <= 0) {
      return 0;
    }

    // A parcela mensal máxima deve caber no mês mais apertado do fluxo
    // Aplicamos uma margem de segurança prudente (70% do superávit mínimo)
    const safeInstallment = Math.round(projection.minMonthlyNet * 0.7);
    return Math.max(0, safeInstallment);
  }, [projection.lowestProjected, projection.minMonthlyNet, spotPurchaseCapacity]);

  const formatBRL = (val: number) => {
    if (isBlurred) return 'R$ •••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Status visual da capacidade
  const statusConfig = useMemo(() => {
    if (spotPurchaseCapacity > 1000) {
      return {
        badge: 'Margem Disponível',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgGradient: 'from-emerald-50/50 to-indigo-50/30 dark:from-emerald-950/20 dark:to-indigo-950/10',
        borderColor: 'border-emerald-200 dark:border-emerald-800/50'
      };
    } else if (spotPurchaseCapacity > 0) {
      return {
        badge: 'Margem Limitada',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/60',
        textColor: 'text-amber-600 dark:text-amber-400',
        bgGradient: 'from-amber-50/50 to-slate-50 dark:from-amber-950/20 dark:to-slate-900',
        borderColor: 'border-amber-200 dark:border-amber-800/50'
      };
    } else {
      return {
        badge: 'Sem Margem Segura',
        badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/60',
        textColor: 'text-rose-600 dark:text-rose-400',
        bgGradient: 'from-rose-50/50 to-slate-50 dark:from-rose-950/20 dark:to-slate-900',
        borderColor: 'border-rose-200 dark:border-rose-800/50'
      };
    }
  }, [spotPurchaseCapacity]);

  return (
    <section className={`rounded-[2.5rem] p-5 sm:p-6 bg-gradient-to-br ${statusConfig.bgGradient} bg-white dark:bg-slate-900 border ${statusConfig.borderColor} shadow-sm space-y-5 relative overflow-hidden transition-all duration-300`}>
      
      {/* Glow discreto no topo */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER DO CARTÃO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
            <ShoppingBag size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Posso gastar quanto?
              </h2>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusConfig.badgeClass}`}>
                {statusConfig.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Limite seguro sem risco de desencaixe ou consumo da reserva
            </p>
          </div>
        </div>

        <Link
          to="/financial-settings"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 transition active:scale-95 shadow-xs"
          title="Ajustar Parâmetros da Reserva"
        >
          <Sliders size={16} />
        </Link>
      </div>

      {/* BLOCO DE DESTAQUE: VALOR DISPONÍVEL PARA COMPRA À VISTA */}
      <div className="p-4 sm:p-5 rounded-[2rem] bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
            Valor Disponível para Compra à Vista
          </span>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tight ${statusConfig.textColor}`}>
              {formatBRL(spotPurchaseCapacity)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
            {spotPurchaseCapacity > 0 
              ? 'Teto máximo liberado hoje sem comprometer contas futuras ou a reserva.'
              : 'Nenhum gasto à vista recomendado no momento para preservar a segurança de caixa.'}
          </span>
        </div>

        {/* NOVA PARCELA MENSAL POSSÍVEL */}
        <div className="sm:border-l sm:border-slate-100 dark:sm:border-slate-800 sm:pl-5 pt-3 sm:pt-0 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1 flex items-center space-x-1">
            <CreditCard size={12} className="text-indigo-500" />
            <span>Nova Parcela Mensal Possível</span>
          </span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums block">
            {formatBRL(maxPossibleInstallment)}
            <span className="text-xs font-bold text-slate-400">/mês</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {maxPossibleInstallment > 0 
              ? 'Cabe no superávit mensal projetado'
              : 'Sem folga mensal para novos parcelamentos'}
          </span>
        </div>
      </div>

      {/* OS 3 PILARES OBRIGATÓRIOS: RESERVA, COMPROMISSOS E MENOR SALDO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        
        {/* 1. RESERVA MÍNIMA PROTEGIDA */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
              <Lock size={12} className="text-amber-500" />
              <span>Reserva Protegida</span>
            </span>
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md">
              Intocável
            </span>
          </div>
          <div>
            <span className="text-sm font-black text-slate-800 dark:text-white tabular-nums block">
              {formatBRL(targetSafetyReserve)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Configurada: {formatBRL(minReserveConfigured)} ({targetReserveMonths} meses)
            </span>
          </div>
        </div>

        {/* 2. COMPROMISSOS FUTUROS CONSIDERADOS */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
              <Calendar size={12} className="text-rose-500" />
              <span>Contas Futuras Mapeadas</span>
            </span>
            <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md">
              {futureCommitments.countFromToday} contas
            </span>
          </div>
          <div>
            <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums block">
              {formatBRL(futureCommitments.totalFromToday)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Pendências a vencer cadastradas
            </span>
          </div>
        </div>

        {/* 3. MENOR SALDO PROJETADO */}
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
              <TrendingDown size={12} className="text-indigo-500" />
              <span>Menor Saldo Projetado</span>
            </span>
            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md">
              Ponto Mínimo
            </span>
          </div>
          <div>
            <span className={`text-sm font-black tabular-nums block ${projection.lowestProjected >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-500'}`}>
              {formatBRL(projection.lowestProjected)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Piso do caixa no horizonte de 6 meses
            </span>
          </div>
        </div>

      </div>

      {/* EXPLICAÇÃO RESUMIDA DO CÁLCULO */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
        <div className="flex items-center space-x-1.5 text-slate-800 dark:text-white font-bold">
          <Info size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Como este limite é calculado com segurança:</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          O valor à vista representa o montante que você pode retirar hoje sem que sua conta fique no vermelho em nenhum mês futuro. Ele deduz todos os <strong>{futureCommitments.countFromToday} compromissos cadastrados ({formatBRL(futureCommitments.totalFromToday)})</strong> e blinda integralmente a <strong>reserva mínima configurada ({formatBRL(targetSafetyReserve)})</strong>.
        </p>
        <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center space-x-1 pt-0.5">
          <ShieldCheck size={12} className="shrink-0" />
          <span>Receitas incertas ou não confirmadas foram totalmente ignoradas para não inflar artificialmente seu limite.</span>
        </p>
      </div>

      {/* BOTÃO TOGGLE DE DETALHAMENTO DA MEMÓRIA DE CÁLCULO */}
      <div>
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-between transition active:scale-98"
        >
          <span className="flex items-center space-x-1.5">
            <Sparkles size={14} className="text-indigo-500" />
            <span>{showDetail ? 'Ocultar memória de cálculo detalhada' : 'Ver memória de cálculo detalhada passo a passo'}</span>
          </span>
          {showDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetail && (
          <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-3 animate-fade-in">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Auditoria Matemática do Limite
            </span>

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500 dark:text-slate-400">(+) Saldo Operacional Hoje</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatBRL(cashAvailableToday)}</span>
              </div>

              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500 dark:text-slate-400">(-) Contas a Pagar no Mês Atual</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">-{formatBRL(futureCommitments.totalThisMonth)}</span>
              </div>

              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500 dark:text-slate-400">(=) Caixa Imediato Disponível</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatBRL(Math.max(0, cashAvailableToday - futureCommitments.totalThisMonth))}</span>
              </div>

              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500 dark:text-slate-400">(-) Déficit da Reserva Mínima (blindado em cofrinho)</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {reserveDeficit > 0 ? `-${formatBRL(reserveDeficit)}` : 'R$ 0,00 (100% coberta)'}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500 dark:text-slate-400">Piso Mínimo da Projeção de 6 Meses</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatBRL(projection.lowestProjected)}</span>
              </div>

              <div className="flex justify-between items-center pt-2 font-black text-sm">
                <span className="text-slate-800 dark:text-white">(=) Limite Seguro para Compra à Vista</span>
                <span className={statusConfig.textColor}>{formatBRL(spotPurchaseCapacity)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Meta de Reserva: {formatBRL(targetSafetyReserve)} ({targetReserveMonths} meses)
              </span>
              <Link 
                to="/financial-settings"
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
              >
                <span>Alterar parâmetros</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>

    </section>
  );
};
