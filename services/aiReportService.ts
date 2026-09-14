import { Transaction, Account, Category, Goal, Debt, Show } from '../types';

export type ReportPeriodType = 
  | 'current'
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom';

export interface ReportDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

export interface GenerateReportParams {
  periodType: ReportPeriodType;
  customStartDate?: string;
  customEndDate?: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
  debts: Debt[];
  shows: Show[];
  getAccountBalance: (accountId: string) => number;
}

// Utilitário para formatar moeda em padrão BRL
export const formatBRL = (val: number): string => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

// Utilitário para calcular intervalo de datas baseado no tipo de período
export const getPeriodDateRange = (
  type: ReportPeriodType, 
  customStart?: string, 
  customEnd?: string
): ReportDateRange => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (type) {
    case 'current': {
      // Situação atual: foco no mês corrente até o fim do mês, refletindo a posição do momento
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return {
        startDate: start,
        endDate: end,
        label: `Situação Financeira Atual (Posição em ${new Date().toLocaleDateString('pt-BR')})`
      };
    }
    case 'this_month': {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return {
        startDate: start,
        endDate: end,
        label: `Este Mês (${monthName.charAt(0).toUpperCase() + monthName.slice(1)})`
      };
    }
    case 'last_month': {
      const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month, 0).toISOString().slice(0, 10);
      const lastMonthDate = new Date(year, month - 1, 1);
      const monthName = lastMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return {
        startDate: start,
        endDate: end,
        label: `Mês Anterior (${monthName.charAt(0).toUpperCase() + monthName.slice(1)})`
      };
    }
    case 'last_30_days': {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 30);
      return {
        startDate: past30.toISOString().slice(0, 10),
        endDate: todayStr,
        label: `Últimos 30 Dias (${past30.toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')})`
      };
    }
    case 'last_3_months': {
      const past3M = new Date(year, month - 2, 1);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return {
        startDate: past3M.toISOString().slice(0, 10),
        endDate: end,
        label: `Últimos 3 Meses (${past3M.toLocaleDateString('pt-BR', { month: 'short' })} a ${now.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})`
      };
    }
    case 'last_6_months': {
      const past6M = new Date(year, month - 5, 1);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return {
        startDate: past6M.toISOString().slice(0, 10),
        endDate: end,
        label: `Últimos 6 Meses (${past6M.toLocaleDateString('pt-BR', { month: 'short' })} a ${now.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})`
      };
    }
    case 'this_year': {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      return {
        startDate: start,
        endDate: end,
        label: `Este Ano (${year})`
      };
    }
    case 'custom': {
      const start = customStart || todayStr;
      const end = customEnd || todayStr;
      const d1 = new Date(start + 'T12:00:00');
      const d2 = new Date(end + 'T12:00:00');
      return {
        startDate: start,
        endDate: end,
        label: `Período Personalizado (${d1.toLocaleDateString('pt-BR')} a ${d2.toLocaleDateString('pt-BR')})`
      };
    }
  }
};

/**
 * Gera o texto puro do Relatório Financeiro para IA
 */
export const generateFinancialReportForAI = (params: GenerateReportParams): string => {
  const {
    periodType,
    customStartDate,
    customEndDate,
    transactions,
    accounts,
    categories,
    goals,
    debts,
    shows,
    getAccountBalance
  } = params;

  const dateRange = getPeriodDateRange(periodType, customStartDate, customEndDate);
  const now = new Date();
  const generationTimestamp = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  // Helper de categoria
  const getCatName = (catId: string) => categories.find(c => c.id === catId)?.name || 'Outros';
  const getCatClassification = (catId: string) => categories.find(c => c.id === catId)?.classification || 'personal';
  const getAccountName = (accId: string) => accounts.find(a => a.id === accId)?.name || 'Conta Não Identificada';

  // 1. DADOS DE CONTAS E PATRIMÔNIO ATUAL
  const accountsWithBalances = accounts.map(acc => ({
    ...acc,
    currentBalance: getAccountBalance(acc.id)
  }));

  const operationalAccounts = accountsWithBalances.filter(
    a => !(a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('cofrinho'))
  );
  const totalAvailableOperational = operationalAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalInAllAccounts = accountsWithBalances.reduce((sum, a) => sum + a.currentBalance, 0);

  // Economias / Cofrinhos
  const totalReservedInGoals = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  
  // Patrimônio total líquido (Contas operacionais + Economias/Cofrinhos)
  const totalNetWorth = totalAvailableOperational + totalReservedInGoals;

  // 2. FILTRAR TRANSAÇÕES DO PERÍODO
  const periodTransactions = transactions.filter(t => {
    return t.date >= dateRange.startDate && t.date <= dateRange.endDate;
  });

  // Receitas do período (excluindo transferências e cofrinhos)
  const incomeTxs = periodTransactions.filter(t => t.type === 'income');
  const paidIncomes = incomeTxs.filter(t => t.status === 'paid');
  const pendingIncomes = incomeTxs.filter(t => t.status === 'pending');
  const totalPaidIncome = paidIncomes.reduce((s, t) => s + Number(t.amount), 0);
  const totalPendingIncome = pendingIncomes.reduce((s, t) => s + Number(t.amount), 0);
  const totalProjectedIncome = totalPaidIncome + totalPendingIncome;

  // Despesas do período (excluindo transferências e cofrinhos)
  const expenseTxs = periodTransactions.filter(t => t.type === 'expense');
  const paidExpenses = expenseTxs.filter(t => t.status === 'paid');
  const pendingExpenses = expenseTxs.filter(t => t.status === 'pending');
  const totalPaidExpense = paidExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalPendingExpense = pendingExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalProjectedExpense = totalPaidExpense + totalPendingExpense;

  // Transferências do período
  const transferTxs = periodTransactions.filter(t => t.type === 'transfer');
  const totalTransferred = transferTxs.reduce((s, t) => s + Number(t.amount), 0);

  // Movimentações de Metas/Cofrinhos no período
  const goalDepositTxs = periodTransactions.filter(t => t.type === 'goal_deposit');
  const goalWithdrawTxs = periodTransactions.filter(t => t.type === 'goal_withdraw');
  const totalGoalDeposits = goalDepositTxs.reduce((s, t) => s + Number(t.amount), 0);
  const totalGoalWithdraws = goalWithdrawTxs.reduce((s, t) => s + Number(t.amount), 0);
  const netGoalSavings = totalGoalDeposits - totalGoalWithdraws;

  // Compromissos conhecidos atuais (despesas pendentes imediatas)
  // Se estamos na situação atual, olhamos para as despesas pendentes do mês atual ou próximas
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const allCurrentPendingExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'pending');
  const thisMonthPendingExpenses = allCurrentPendingExpenses.filter(t => t.date.startsWith(currentMonthPrefix));
  const totalCommittedNow = thisMonthPendingExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const freeAvailableNow = totalAvailableOperational - totalCommittedNow;

  // 3. AGRUPAMENTO DE RECEITAS POR CATEGORIA
  const incomeByCategory: Record<string, { name: string; total: number; count: number }> = {};
  incomeTxs.forEach(t => {
    const catName = getCatName(t.categoryId);
    if (!incomeByCategory[catName]) {
      incomeByCategory[catName] = { name: catName, total: 0, count: 0 };
    }
    incomeByCategory[catName].total += Number(t.amount);
    incomeByCategory[catName].count += 1;
  });
  const sortedIncomeCategories = Object.values(incomeByCategory).sort((a, b) => b.total - a.total);

  // 4. AGRUPAMENTO DE DESPESAS POR CATEGORIA
  const expenseByCategory: Record<string, { name: string; total: number; count: number; classification: string }> = {};
  expenseTxs.forEach(t => {
    const catName = getCatName(t.categoryId);
    const classification = getCatClassification(t.categoryId);
    if (!expenseByCategory[catName]) {
      expenseByCategory[catName] = { name: catName, total: 0, count: 0, classification };
    }
    expenseByCategory[catName].total += Number(t.amount);
    expenseByCategory[catName].count += 1;
  });
  const sortedExpenseCategories = Object.values(expenseByCategory).sort((a, b) => b.total - a.total);

  // Classificação 50/30/20 das despesas
  const essentialExpenses = sortedExpenseCategories
    .filter(c => c.classification === 'essential')
    .reduce((s, c) => s + c.total, 0);
  const personalExpenses = sortedExpenseCategories
    .filter(c => c.classification === 'personal')
    .reduce((s, c) => s + c.total, 0);
  const futureExpenses = sortedExpenseCategories
    .filter(c => c.classification === 'future')
    .reduce((s, c) => s + c.total, 0);

  // 5. MAIORES ENTRADAS E SAÍDAS
  const topIncomes = [...incomeTxs].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);
  const topExpenses = [...expenseTxs].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5);

  // 6. EVENTOS / SHOWS NO PERÍODO
  const periodShows = shows.filter(s => s.date >= dateRange.startDate && s.date <= dateRange.endDate);
  let totalShowsContracted = 0;
  let totalShowsReceived = 0;
  let totalShowsPending = 0;
  let totalShowsExpenses = 0;

  const detailedShows = periodShows.map(show => {
    const cacheTotal = Number(show.totalCache) || 0;
    totalShowsContracted += cacheTotal;

    let received = 0;
    let pending = 0;
    if (show.receipts && show.receipts.length > 0) {
      show.receipts.forEach(r => {
        if (r.status === 'Recebido') received += Number(r.amount);
        else pending += Number(r.amount);
      });
    } else {
      if (show.status === 'Realizado') received = cacheTotal;
      else pending = cacheTotal;
    }

    totalShowsReceived += received;
    totalShowsPending += pending;

    const exp = show.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 };
    const showExpTotal = (Number(exp.fuel) || 0) + (Number(exp.food) || 0) + (Number(exp.toll) || 0) + (Number(exp.commission) || 0) + (Number(exp.others) || 0);
    totalShowsExpenses += showExpTotal;

    const netProfit = cacheTotal - showExpTotal;
    const margin = cacheTotal > 0 ? (netProfit / cacheTotal) * 100 : 0;

    return {
      name: show.name,
      contractor: show.contractorName,
      date: show.date,
      location: show.location,
      status: show.status,
      totalCache: cacheTotal,
      received,
      pending,
      expenses: showExpTotal,
      expensesBreakdown: exp,
      netProfit,
      margin
    };
  });

  const totalShowsNetProfit = totalShowsContracted - totalShowsExpenses;
  const avgShowProfit = periodShows.length > 0 ? totalShowsNetProfit / periodShows.length : 0;
  const avgShowExpense = periodShows.length > 0 ? totalShowsExpenses / periodShows.length : 0;
  const overallShowsMargin = totalShowsContracted > 0 ? (totalShowsNetProfit / totalShowsContracted) * 100 : 0;

  // Show mais rentável e menos rentável
  const sortedShowsByProfit = [...detailedShows].sort((a, b) => b.netProfit - a.netProfit);
  const mostProfitableShow = sortedShowsByProfit[0] || null;
  const leastProfitableShow = sortedShowsByProfit[sortedShowsByProfit.length - 1] || null;

  // 7. COMPARAÇÃO COM PERÍODO ANTERIOR (SE HOUVER DADOS)
  // Calcular período anterior de mesma duração
  const startDateObj = new Date(dateRange.startDate + 'T12:00:00');
  const endDateObj = new Date(dateRange.endDate + 'T12:00:00');
  const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevEndObj = new Date(startDateObj);
  prevEndObj.setDate(prevEndObj.getDate() - 1);
  const prevStartObj = new Date(prevEndObj);
  prevStartObj.setDate(prevStartObj.getDate() - diffDays + 1);

  const prevStartStr = prevStartObj.toISOString().slice(0, 10);
  const prevEndStr = prevEndObj.toISOString().slice(0, 10);

  const prevPeriodTxs = transactions.filter(t => t.date >= prevStartStr && t.date <= prevEndStr);
  const prevIncomeTotal = prevPeriodTxs.filter(t => t.type === 'income' && t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const prevExpenseTotal = prevPeriodTxs.filter(t => t.type === 'expense' && t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const hasPreviousPeriodData = prevPeriodTxs.length > 0;

  // 8. RESULTADO E TAXAS
  const netResultPaid = totalPaidIncome - totalPaidExpense;
  const netResultProjected = totalProjectedIncome - totalProjectedExpense;
  const savingsRatePaid = totalPaidIncome > 0 ? (netResultPaid / totalPaidIncome) * 100 : 0;
  const savingsRateProjected = totalProjectedIncome > 0 ? (netResultProjected / totalProjectedIncome) * 100 : 0;

  // Burn Rate Diário
  const burnRateDaily = diffDays > 0 ? totalPaidExpense / diffDays : 0;

  // Despesas Fixas vs Variáveis
  const fixedExpenses = expenseTxs.filter(t => t.isFixed || Boolean(t.fixedGroupId));
  const totalFixedExpenses = fixedExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalVariableExpenses = totalPaidExpense + totalPendingExpense - totalFixedExpenses;

  // 9. DÍVIDAS / PARCELAMENTOS ATIVOS
  const activeDebts = debts.map(d => {
    const debtTxs = transactions.filter(t => t.debtId === d.id);
    const paidTxs = debtTxs.filter(t => t.status === 'paid');
    const pendingTxs = debtTxs.filter(t => t.status === 'pending');
    const paidAmount = paidTxs.reduce((s, t) => s + Number(t.amount), 0);
    const totalAmount = Number(d.totalAmount) || 0;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    return {
      name: d.name,
      type: d.type,
      totalAmount,
      paidAmount,
      remainingAmount,
      totalInstallments: d.installmentCount,
      paidInstallments: paidTxs.length,
      remainingInstallments: pendingTxs.length
    };
  });
  const totalRemainingDebt = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);

  // 10. COMPROMISSOS FUTUROS PRÓXIMOS (PRÓXIMOS 30 DIAS A PARTIR DE HOJE)
  const in30DaysObj = new Date(now);
  in30DaysObj.setDate(in30DaysObj.getDate() + 30);
  const in30DaysStr = in30DaysObj.toISOString().slice(0, 10);
  const upcomingExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'pending' && t.date >= todayStr && t.date <= in30DaysStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  // ==========================================
  // CONSTRUÇÃO DO DOCUMENTO EM TEXTO PURO
  // ==========================================
  const lines: string[] = [];

  const addHeader = (title: string) => {
    lines.push('');
    lines.push('================================================================================');
    lines.push(title.toUpperCase());
    lines.push('================================================================================');
  };

  const addSubHeader = (title: string) => {
    lines.push('');
    lines.push(`--- ${title} ---`);
  };

  // CABEÇALHO DO RELATÓRIO
  lines.push('================================================================================');
  lines.push('RELATÓRIO FINANCEIRO CONSOLIDADO PARA ANÁLISE DE INTELIGÊNCIA ARTIFICIAL');
  lines.push('================================================================================');
  lines.push(`FINALIDADE: Alimentar IA para tomada de decisão financeira e avaliação de gastos`);
  lines.push(`DATA E HORA DE GERAÇÃO: ${generationTimestamp}`);
  lines.push(`PERÍODO ANALISADO: ${dateRange.label}`);
  lines.push(`INTERVALO DE DATAS: ${dateRange.startDate} até ${dateRange.endDate} (${diffDays} dias)`);
  lines.push(`MOEDA: Real Brasileiro (BRL / R$)`);

  // SEÇÃO 1: RESUMO FINANCEIRO ATUAL (SNAPSHOT DO MOMENTO)
  addHeader('1. RESUMO DA SITUAÇÃO FINANCEIRA ATUAL');
  lines.push(`PATRIMÔNIO LÍQUIDO TOTAL: ${formatBRL(totalNetWorth)}`);
  lines.push(`  └─ Total em Contas Correntes / Carteiras: ${formatBRL(totalAvailableOperational)}`);
  lines.push(`  └─ Total Reservado em Metas / Cofrinhos:  ${formatBRL(totalReservedInGoals)} (Recurso protegido)`);
  lines.push('');
  lines.push(`POSIÇÃO DE LIQUIDEZ IMEDIATA:`);
  lines.push(`  • Dinheiro Disponível em Caixa:        ${formatBRL(totalAvailableOperational)}`);
  lines.push(`  • Compromissos Pendentes no Mês Atual:  ${formatBRL(totalCommittedNow)} (Despesas a pagar)`);
  lines.push(`  • Saldo Livre Disponível Real:          ${formatBRL(freeAvailableNow)}`);
  lines.push(`    Status: ${freeAvailableNow >= 0 ? 'POSITIVO (Folga de caixa)' : 'ATENÇÃO (Compromissos superam saldo em caixa)'}`);
  lines.push(`  • Total de Dívidas / Contratos Ativos: ${formatBRL(totalRemainingDebt)} (Saldo devedor total)`);
  lines.push('');
  lines.push(`AVISO CONCEITUAL PARA A IA:`);
  lines.push(`  * Cofrinhos e Economias NÃO são despesas; representam capital acumulado e reservado.`);
  lines.push(`  * Transferências internas NÃO afetam patrimônio líquido nem representam ganho ou perda.`);
  lines.push(`  * A renda do usuário possui componente VARIÁVEL (shows e apresentações musicais).`);

  // SEÇÃO 2: CONTAS E CARTEIRAS
  addHeader('2. SALDO INDIVIDUAL POR CONTA BANCÁRIA E CARTEIRA');
  if (accountsWithBalances.length === 0) {
    lines.push('Nenhuma conta cadastrada.');
  } else {
    accountsWithBalances.forEach(acc => {
      const typeLabel = 
        acc.type === 'bank' ? 'Conta Bancária' :
        acc.type === 'wallet' ? 'Carteira Física' :
        acc.type === 'savings' ? 'Conta Poupança / Reserva' :
        acc.type === 'investment' ? 'Investimento' : 'Outro';
      const statusLabel = acc.enabled ? 'Ativa' : 'Inativa';
      lines.push(`• CONTA: ${acc.name} [${typeLabel}]`);
      lines.push(`  Saldo Atual: ${formatBRL(acc.currentBalance)} | Status: ${statusLabel}`);
    });
    lines.push('');
    lines.push(`SUBTOTAL DAS CONTAS OPERACIONAIS: ${formatBRL(totalAvailableOperational)}`);
    lines.push(`SUBTOTAL GERAL DE TODAS AS CONTAS:  ${formatBRL(totalInAllAccounts)}`);
  }

  // SEÇÃO 3: RECEITAS DO PERÍODO
  addHeader('3. RECEITAS DO PERÍODO ANALISADO');
  lines.push(`RECEITAS EFETIVADAS (PAGAS / RECEBIDAS):  ${formatBRL(totalPaidIncome)} (${paidIncomes.length} lançamentos)`);
  lines.push(`RECEITAS PREVISTAS (PENDENTES A RECEBER): ${formatBRL(totalPendingIncome)} (${pendingIncomes.length} lançamentos)`);
  lines.push(`RECEITA TOTAL PROJETADA DO PERÍODO:      ${formatBRL(totalProjectedIncome)}`);
  lines.push(`TICKET MÉDIO POR RECEITA EFETIVADA:      ${paidIncomes.length > 0 ? formatBRL(totalPaidIncome / paidIncomes.length) : 'R$ 0,00'}`);
  
  if (hasPreviousPeriodData) {
    const incomeDiff = totalPaidIncome - prevIncomeTotal;
    const incomeDiffPct = prevIncomeTotal > 0 ? (incomeDiff / prevIncomeTotal) * 100 : 0;
    lines.push(`COMPARAÇÃO COM PERÍODO ANTERIOR: ${incomeDiff >= 0 ? '+' : ''}${formatBRL(incomeDiff)} (${incomeDiffPct >= 0 ? '+' : ''}${incomeDiffPct.toFixed(1)}%) [Anterior: ${formatBRL(prevIncomeTotal)}]`);
  } else {
    lines.push('COMPARAÇÃO COM PERÍODO ANTERIOR: Dados insuficientes no período anterior.');
  }

  addSubHeader('RECEITAS POR CATEGORIA');
  if (sortedIncomeCategories.length === 0) {
    lines.push('Nenhuma receita registrada no período.');
  } else {
    sortedIncomeCategories.forEach(cat => {
      const pct = totalProjectedIncome > 0 ? (cat.total / totalProjectedIncome) * 100 : 0;
      lines.push(`• ${cat.name}: ${formatBRL(cat.total)} (${pct.toFixed(1)}% do total) - ${cat.count} lançamento(s)`);
    });
  }

  addSubHeader('MAIORES RECEITAS REGISTRADAS NO PERÍODO');
  if (topIncomes.length === 0) {
    lines.push('Nenhuma receita para listar.');
  } else {
    topIncomes.forEach((t, i) => {
      const status = t.status === 'paid' ? 'RECEBIDO' : 'PREVISTO';
      lines.push(` ${i + 1}. [${t.date}] ${t.description} | ${getCatName(t.categoryId)} | ${formatBRL(t.amount)} (${status})`);
    });
  }

  // SEÇÃO 4: DESPESAS DO PERÍODO
  addHeader('4. DESPESAS DO PERÍODO ANALISADO');
  lines.push(`DESPESAS EFETIVADAS (PAGAS / QUITADAS): ${formatBRL(totalPaidExpense)} (${paidExpenses.length} lançamentos)`);
  lines.push(`DESPESAS PREVISTAS (PENDENTES A PAGAR):  ${formatBRL(totalPendingExpense)} (${pendingExpenses.length} lançamentos)`);
  lines.push(`DESPESA TOTAL PROJETADA DO PERÍODO:     ${formatBRL(totalProjectedExpense)}`);
  lines.push(`MÉDIA DE DESPESA POR DIA (BURN RATE):   ${formatBRL(burnRateDaily)}/dia`);
  lines.push(`TICKET MÉDIO POR DESPESA EFETIVADA:     ${paidExpenses.length > 0 ? formatBRL(totalPaidExpense / paidExpenses.length) : 'R$ 0,00'}`);
  lines.push(`DIVISÃO DE GASTOS: Fixos: ${formatBRL(totalFixedExpenses)} | Variáveis: ${formatBRL(totalVariableExpenses)}`);

  if (hasPreviousPeriodData) {
    const expDiff = totalPaidExpense - prevExpenseTotal;
    const expDiffPct = prevExpenseTotal > 0 ? (expDiff / prevExpenseTotal) * 100 : 0;
    lines.push(`COMPARAÇÃO COM PERÍODO ANTERIOR: ${expDiff >= 0 ? '+' : ''}${formatBRL(expDiff)} (${expDiffPct >= 0 ? '+' : ''}${expDiffPct.toFixed(1)}%) [Anterior: ${formatBRL(prevExpenseTotal)}]`);
  } else {
    lines.push('COMPARAÇÃO COM PERÍODO ANTERIOR: Dados insuficientes no período anterior.');
  }

  addSubHeader('DESPESAS POR CATEGORIA');
  if (sortedExpenseCategories.length === 0) {
    lines.push('Nenhuma despesa registrada no período.');
  } else {
    sortedExpenseCategories.forEach(cat => {
      const pct = totalProjectedExpense > 0 ? (cat.total / totalProjectedExpense) * 100 : 0;
      const classLabel = 
        cat.classification === 'essential' ? 'Essencial (50%)' :
        cat.classification === 'personal' ? 'Estilo de Vida (30%)' : 'Prioridade Futura (20%)';
      lines.push(`• ${cat.name}: ${formatBRL(cat.total)} (${pct.toFixed(1)}%) [${classLabel}] - ${cat.count} lançamento(s)`);
    });
  }

  addSubHeader('DISTRIBUIÇÃO METODOLÓGICA (REGRA 50/30/20)');
  lines.push(`• Gastos Essenciais / Fixos:    ${formatBRL(essentialExpenses)} (${totalProjectedExpense > 0 ? ((essentialExpenses / totalProjectedExpense) * 100).toFixed(1) : 0}%)`);
  lines.push(`• Estilo de Vida / Pessoal:      ${formatBRL(personalExpenses)} (${totalProjectedExpense > 0 ? ((personalExpenses / totalProjectedExpense) * 100).toFixed(1) : 0}%)`);
  lines.push(`• Metas / Poupança / Futuro:     ${formatBRL(futureExpenses)} (${totalProjectedExpense > 0 ? ((futureExpenses / totalProjectedExpense) * 100).toFixed(1) : 0}%)`);

  addSubHeader('MAIORES DESPESAS INDIVIDUAIS NO PERÍODO');
  if (topExpenses.length === 0) {
    lines.push('Nenhuma despesa para listar.');
  } else {
    topExpenses.forEach((t, i) => {
      const status = t.status === 'paid' ? 'PAGO' : 'PENDENTE';
      lines.push(` ${i + 1}. [${t.date}] ${t.description} | ${getCatName(t.categoryId)} | ${formatBRL(t.amount)} (${status})`);
    });
  }

  // SEÇÃO 5: TRANSFERÊNCIAS ENTRE CONTAS
  addHeader('5. TRANSFERÊNCIAS ENTRE CONTAS');
  lines.push('NOTA: Transferências NÃO são receitas nem despesas. Representam realocação de capital.');
  lines.push(`VOLUME TOTAL DE TRANSFERÊNCIAS NO PERÍODO: ${formatBRL(totalTransferred)} (${transferTxs.length} transferências)`);
  if (transferTxs.length > 0) {
    transferTxs.forEach((t, i) => {
      const origin = getAccountName(t.accountId);
      const dest = t.destinationAccountId ? getAccountName(t.destinationAccountId) : 'Outra Conta';
      lines.push(` ${i + 1}. [${t.date}] De "${origin}" Para "${dest}": ${formatBRL(t.amount)} (${t.description || 'Transferência'})`);
    });
  } else {
    lines.push('Nenhuma transferência interna realizada no período.');
  }

  // SEÇÃO 6: ECONOMIAS E COFRINHOS (METAS FINANCEIRAS)
  addHeader('6. ECONOMIAS, RESERVAS E COFRINHOS');
  lines.push('NOTA: Valores guardados em cofrinhos são patrimônio poupado e não despesa consumida.');
  lines.push(`SALDO TOTAL ATUAL GUARDADO NOS COFRINHOS: ${formatBRL(totalReservedInGoals)}`);
  lines.push(`MOVIMENTAÇÃO NO PERÍODO:`);
  lines.push(`  • Aportes Realizados:  +${formatBRL(totalGoalDeposits)} (${goalDepositTxs.length} aportes)`);
  lines.push(`  • Resgates Efetuados:  -${formatBRL(totalGoalWithdraws)} (${goalWithdrawTxs.length} resgates)`);
  lines.push(`  • Saldo Líquido Poupado: ${netGoalSavings >= 0 ? '+' : ''}${formatBRL(netGoalSavings)}`);
  
  addSubHeader('DETALHAMENTO DE CADA META / COFRINHO');
  if (goals.length === 0) {
    lines.push('Nenhum cofrinho ou meta cadastrada.');
  } else {
    goals.forEach(goal => {
      const current = Number(goal.currentAmount) || 0;
      const target = Number(goal.targetAmount) || 0;
      const missing = Math.max(0, target - current);
      const progress = target > 0 ? (current / target) * 100 : 0;
      const deadlineInfo = goal.deadline ? `Prazo: ${goal.deadline}` : 'Sem prazo definido';
      lines.push(`• META: ${goal.name}`);
      lines.push(`  Saldo Acumulado: ${formatBRL(current)} de ${formatBRL(target)} (${progress.toFixed(1)}% concluído)`);
      lines.push(`  Faltam: ${formatBRL(missing)} | ${deadlineInfo}`);
    });
  }

  // SEÇÃO 7: EVENTOS FINANCEIROS / SHOWS (RENDA VARIÁVEL)
  addHeader('7. EVENTOS FINANCEIROS E SHOWS (RENDA VARIÁVEL)');
  lines.push('NOTA: Os shows geram receitas e despesas vinculadas, essenciais para avaliar a rentabilidade.');
  lines.push(`NÚMERO DE EVENTOS NO PERÍODO:             ${periodShows.length} evento(s)`);
  lines.push(`RECEITA TOTAL CONTRATADA (CACHÊS):        ${formatBRL(totalShowsContracted)}`);
  lines.push(`RECEITA DE SHOWS JÁ RECEBIDA:             ${formatBRL(totalShowsReceived)}`);
  lines.push(`RECEITA DE SHOWS PENDENTE A RECEBER:      ${formatBRL(totalShowsPending)}`);
  lines.push(`DESPESAS DIRETAS DE PRODUÇÃO / SHOWS:     ${formatBRL(totalShowsExpenses)}`);
  lines.push(`LUCRO LÍQUIDO GERADO PELOS EVENTOS:       ${formatBRL(totalShowsNetProfit)}`);
  lines.push(`MARGEM DE LUCRO LÍQUIDA GLOBAL:           ${overallShowsMargin.toFixed(1)}%`);
  lines.push(`MÉDIA DE LUCRO POR SHOW:                  ${formatBRL(avgShowProfit)}`);
  lines.push(`MÉDIA DE CUSTO POR SHOW:                  ${formatBRL(avgShowExpense)}`);

  if (mostProfitableShow) {
    lines.push(`SHOW MAIS LUCRATIVO: "${mostProfitableShow.name}" em ${mostProfitableShow.date} | Lucro: ${formatBRL(mostProfitableShow.netProfit)} (Margem: ${mostProfitableShow.margin.toFixed(1)}%)`);
  }
  if (leastProfitableShow && periodShows.length > 1) {
    lines.push(`SHOW MENOS LUCRATIVO: "${leastProfitableShow.name}" em ${leastProfitableShow.date} | Lucro: ${formatBRL(leastProfitableShow.netProfit)} (Margem: ${leastProfitableShow.margin.toFixed(1)}%)`);
  }

  addSubHeader('LISTAGEM DETALHADA DOS SHOWS DO PERÍODO');
  if (detailedShows.length === 0) {
    lines.push('Nenhum show ou evento registrado no período selecionado.');
  } else {
    detailedShows.forEach((s, idx) => {
      lines.push(` ${idx + 1}. [${s.date}] ${s.name} - Contratante: ${s.contractor || 'N/A'} (${s.status})`);
      lines.push(`    Cachê Bruto: ${formatBRL(s.totalCache)} | Recebido: ${formatBRL(s.received)} | A Receber: ${formatBRL(s.pending)}`);
      lines.push(`    Custos: ${formatBRL(s.expenses)} (Combustível: ${formatBRL(s.expensesBreakdown.fuel)}, Comida: ${formatBRL(s.expensesBreakdown.food)}, Pedágio: ${formatBRL(s.expensesBreakdown.toll)}, Comissão: ${formatBRL(s.expensesBreakdown.commission)}, Outros: ${formatBRL(s.expensesBreakdown.others)})`);
      lines.push(`    Lucro Líquido: ${formatBRL(s.netProfit)} | Rentabilidade: ${s.margin.toFixed(1)}%`);
    });
  }

  // SEÇÃO 8: FLUXO FINANCEIRO E RESULTADO
  addHeader('8. FLUXO FINANCEIRO E RESULTADO DO PERÍODO');
  lines.push('EQUAÇÃO REALIZADA (FLUXO EFETIVADO):');
  lines.push(`  (+) Receitas Efetivadas:  ${formatBRL(totalPaidIncome)}`);
  lines.push(`  (-) Despesas Efetivadas:  ${formatBRL(totalPaidExpense)}`);
  lines.push(`  (=) RESULTADO REALIZADO:  ${formatBRL(netResultPaid)} -> ${netResultPaid >= 0 ? 'SUPERÁVIT (Sobra de caixa)' : 'DÉFICIT (Gastou mais do que recebeu)'}`);
  lines.push(`  Taxa de Poupança Efetiva: ${savingsRatePaid.toFixed(1)}%`);
  lines.push('');
  lines.push('EQUAÇÃO PROJETADA (INCLUINDO PENDÊNCIAS):');
  lines.push(`  (+) Receitas Totais Projetadas:  ${formatBRL(totalProjectedIncome)}`);
  lines.push(`  (-) Despesas Totais Projetadas:  ${formatBRL(totalProjectedExpense)}`);
  lines.push(`  (=) RESULTADO PROJETADO:         ${formatBRL(netResultProjected)} -> ${netResultProjected >= 0 ? 'SUPERÁVIT PROJETADO' : 'DÉFICIT PROJETADO'}`);
  lines.push(`  Taxa de Poupança Projetada:      ${savingsRateProjected.toFixed(1)}%`);

  // SEÇÃO 9: ANÁLISE DE PADRÕES E TENDÊNCIAS
  addHeader('9. ANÁLISE DE PADRÕES E TENDÊNCIAS OBSERVADAS');
  
  // Identificação de concentração
  if (sortedExpenseCategories.length > 0 && totalProjectedExpense > 0) {
    const top2 = sortedExpenseCategories.slice(0, 2);
    const top2Total = top2.reduce((s, c) => s + c.total, 0);
    const top2Pct = (top2Total / totalProjectedExpense) * 100;
    lines.push(`• Concentração de Despesas: As 2 maiores categorias (${top2.map(c => c.name).join(', ')}) concentram ${top2Pct.toFixed(1)}% de todos os gastos.`);
  }

  // Comportamento de Renda Variável
  if (periodShows.length > 0) {
    const showIncomePct = totalProjectedIncome > 0 ? (totalShowsContracted / totalProjectedIncome) * 100 : 0;
    lines.push(`• Dependência de Renda de Shows: Os cachês de shows representam ${showIncomePct.toFixed(1)}% da renda total projetada do período.`);
  } else {
    lines.push('• Nenhum show registrado no período; renda dependente de outras fontes.');
  }

  // Gastos Fixos vs Variáveis
  const fixedRatio = totalProjectedExpense > 0 ? (totalFixedExpenses / totalProjectedExpense) * 100 : 0;
  lines.push(`• Estrutura de Custos: ${fixedRatio.toFixed(1)}% de custos fixos vs ${(100 - fixedRatio).toFixed(1)}% de custos variáveis.`);

  // Tendência
  if (hasPreviousPeriodData) {
    const expTrend = totalPaidExpense > prevExpenseTotal ? 'Aumento de despesas' : 'Redução de despesas';
    const incTrend = totalPaidIncome > prevIncomeTotal ? 'Aumento de receitas' : 'Redução de receitas';
    lines.push(`• Tendência em Relação ao Período Anterior: ${expTrend} e ${incTrend}.`);
  }

  // SEÇÃO 10: COMPROMISSOS, DÍVIDAS E CRONOGRAMA
  addHeader('10. COMPROMISSOS, PARCELAMENTOS E OBRIGAÇÕES');
  
  addSubHeader('DÍVIDAS E CONTRATOS PARCELADOS EM ANDAMENTO');
  if (activeDebts.length === 0) {
    lines.push('Nenhuma dívida ou credor ativo cadastrado.');
  } else {
    activeDebts.forEach(d => {
      const typeLabel = 
        d.type === 'bank' ? 'Empréstimo Bancário' :
        d.type === 'person' ? 'Pessoa Física / Amigo' :
        d.type === 'card_installment' ? 'Parcelamento de Cartão' : 'Financiamento de Veículo';
      lines.push(`• CONTRATO: ${d.name} [${typeLabel}]`);
      lines.push(`  Saldo Devedor Restante: ${formatBRL(d.remainingAmount)} de ${formatBRL(d.totalAmount)}`);
      lines.push(`  Parcelas: ${d.paidInstallments} pagas | ${d.remainingInstallments} restantes`);
    });
    lines.push(`TOTAL DO SALDO DEVEDOR CONSOLIDADO: ${formatBRL(totalRemainingDebt)}`);
  }

  addSubHeader('PRÓXIMAS DESPESAS A VENCER (PRÓXIMOS 30 DIAS)');
  if (upcomingExpenses.length === 0) {
    lines.push('Nenhuma conta pendente nos próximos 30 dias.');
  } else {
    upcomingExpenses.slice(0, 10).forEach(t => {
      lines.push(`• [${t.date}] ${t.description} | ${getCatName(t.categoryId)}: ${formatBRL(t.amount)}`);
    });
    if (upcomingExpenses.length > 10) {
      lines.push(`... e mais ${upcomingExpenses.length - 10} conta(s) pendente(s).`);
    }
  }

  // SEÇÃO 11: INDICADORES CONSOLIDADOS PARA A TOMADA DE DECISÃO
  addHeader('11. MATRIZ DE INDICADORES-CHAVE PARA DECISÃO DA IA');
  lines.push(`[1] PATRIMÔNIO LÍQUIDO TOTAL:             ${formatBRL(totalNetWorth)}`);
  lines.push(`[2] DISPONÍVEL IMEDIATO (CAIXA):          ${formatBRL(totalAvailableOperational)}`);
  lines.push(`[3] DINHEIRO RESERVADO (COFRINHOS):       ${formatBRL(totalReservedInGoals)} (Intocável)`);
  lines.push(`[4] COMPROMETIDO IMEDIATO (CONTAS A PAGAR): ${formatBRL(totalCommittedNow)}`);
  lines.push(`[5] SALDO LIVRE REAL DE CAIXA:            ${formatBRL(freeAvailableNow)}`);
  lines.push(`[6] BURN RATE DIÁRIO DO PERÍODO:         ${formatBRL(burnRateDaily)}/dia`);
  lines.push(`[7] LUCRO MÉDIO POR SHOW:                 ${periodShows.length > 0 ? formatBRL(avgShowProfit) : 'Dados insuficientes para calcular.'}`);
  lines.push(`[8] MARGEM MÉDIA DOS SHOWS:               ${periodShows.length > 0 ? `${overallShowsMargin.toFixed(1)}%` : 'Dados insuficientes para calcular.'}`);
  lines.push(`[9] TAXA DE POUPANÇA REALIZADA:          ${totalPaidIncome > 0 ? `${savingsRatePaid.toFixed(1)}%` : '0.0%'}`);
  lines.push(`[10] TOTAL DE OBRIGAÇÕES DE LONGO PRAZO:  ${formatBRL(totalRemainingDebt)}`);

  // SEÇÃO 12: PROMPTS E PERGUNTAS SUGERIDAS PARA A IA
  addHeader('12. PERGUNTAS DIRECIONADAS QUE VOCÊ PODE FAZER À IA APÓS COLAR ESTE RELATÓRIO');
  lines.push('Você pode copiar uma das perguntas abaixo e enviar para a IA junto com este relatório:');
  lines.push('');
  lines.push('1. "Com base na minha situação financeira atual e compromissos, posso fazer uma compra de [R$ VALOR] à vista ou parcelada agora?"');
  lines.push('2. "Qual é o valor exato que realmente posso gastar livremente nos próximos dias sem comprometer nenhuma conta?"');
  lines.push('3. "Quais são as 3 categorias onde estou com maior vazamento de dinheiro e onde posso cortar gastos?"');
  lines.push('4. "Como está a lucratividade dos meus shows? Qual é a margem mínima de cachê que devo negociar para cobrir custos e ter bom lucro?"');
  lines.push('5. "Quanto preciso faturar no próximo mês para pagar todas as contas, dívidas e ainda conseguir guardar dinheiro no cofrinho?"');
  lines.push('6. "Faça um diagnóstico sincero e sem rodeios da minha saúde financeira, apontando meus maiores pontos cegos e prioridades imediatas."');
  lines.push('');
  lines.push('================================================================================');
  lines.push('FIM DO RELATÓRIO FINANCEIRO PARA IA');
  lines.push('================================================================================');

  return lines.join('\n');
};
