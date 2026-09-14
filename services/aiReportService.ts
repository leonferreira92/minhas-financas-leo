import { Transaction, Account, Category, Goal, Debt, Show } from '../types';

export type ReportPeriodType = 
  | 'current_plus_6m'  // PADRÃO: Situação Atual + Próximos 6 Meses (Recomendado para Decisão)
  | 'current'          // Situação Atual (Mês Corrente)
  | 'this_month'       // Apenas Este Mês
  | 'next_month'       // Próximo Mês
  | 'next_3_months'    // Próximos 3 Meses
  | 'next_6_months'    // Próximos 6 Meses
  | 'this_year'        // Este Ano
  | 'custom';          // Período Personalizado

export interface ReportDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
  monthsCount: number;
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
export const formatBRL = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return 'DADOS INSUFICIENTES';
  }
  const num = Number(val);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

// Formatação segura de data ISO para DD/MM/AAAA
export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return 'Data não informada';
  try {
    const [y, m, d] = dateStr.split('T')[0].split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
};

// Formatação de Mês/Ano (ex: Março/2026)
export const formatMonthYearBR = (yearMonthStr: string): string => {
  if (!yearMonthStr) return '';
  try {
    const [y, m] = yearMonthStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, 15);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `${capitalizedMonth}/${y}`;
  } catch {
    return yearMonthStr;
  }
};

// Calcula intervalo de datas baseado no tipo de período
export const getPeriodDateRange = (
  type: ReportPeriodType, 
  customStart?: string, 
  customEnd?: string
): ReportDateRange => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const todayStr = now.toISOString().slice(0, 10);

  switch (type) {
    case 'current_plus_6m': {
      // Começa no início do mês corrente e vai até o fim de 6 meses futuros (total 7 meses)
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 6, 0).toISOString().slice(0, 10);
      return {
        startDate: start,
        endDate: end,
        label: `Situação Atual + Próximos 6 Meses`,
        monthsCount: 6
      };
    }
    case 'current': {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return {
        startDate: start,
        endDate: end,
        label: `Situação Atual (${formatMonthYearBR(`${year}-${String(month + 1).padStart(2, '0')}`)})`,
        monthsCount: 1
      };
    }
    case 'this_month': {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return {
        startDate: start,
        endDate: end,
        label: `Este Mês (${formatMonthYearBR(`${year}-${String(month + 1).padStart(2, '0')}`)})`,
        monthsCount: 1
      };
    }
    case 'next_month': {
      const start = new Date(year, month + 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 2, 0).toISOString().slice(0, 10);
      const nextMonthDate = new Date(year, month + 1, 1);
      const ym = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
      return {
        startDate: start,
        endDate: end,
        label: `Próximo Mês (${formatMonthYearBR(ym)})`,
        monthsCount: 1
      };
    }
    case 'next_3_months': {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 3, 0).toISOString().slice(0, 10);
      return {
        startDate: start,
        endDate: end,
        label: `Próximos 3 Meses`,
        monthsCount: 3
      };
    }
    case 'next_6_months': {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 6, 0).toISOString().slice(0, 10);
      return {
        startDate: start,
        endDate: end,
        label: `Próximos 6 Meses`,
        monthsCount: 6
      };
    }
    case 'this_year': {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      return {
        startDate: start,
        endDate: end,
        label: `Este Ano (${year})`,
        monthsCount: 12
      };
    }
    case 'custom': {
      const start = customStart || todayStr;
      const end = customEnd || todayStr;
      const d1 = new Date(start + 'T12:00:00');
      const d2 = new Date(end + 'T12:00:00');
      const diffMonths = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      return {
        startDate: start,
        endDate: end,
        label: `Período Personalizado (${formatDateBR(start)} a ${formatDateBR(end)})`,
        monthsCount: diffMonths
      };
    }
  }
};

// =========================================================================
// CLASSIFICAÇÕES FINANCEIRAS
// =========================================================================

/**
 * 1. TRANSFERÊNCIAS ENTRE CONTAS
 * REGRA: Transferências não são receitas nem despesas. Devem ser excluídas.
 */
export const isTransferMovement = (t: Transaction): boolean => {
  return t.type === 'transfer' || t.categoryId === 'cat_transfer' || Boolean(t.destinationAccountId);
};

/**
 * 2. ECONOMIA / COFRINHO
 * REGRA: Cofrinhos não são despesas. Representam dinheiro reservado e protegido.
 */
export const isGoalMovement = (t: Transaction): boolean => {
  return t.type === 'goal_deposit' || t.type === 'goal_withdraw' || t.categoryId === 'cat_savings' || Boolean(t.goalId);
};

/**
 * 3. RECEITA EXTRAORDINÁRIA (Não recorrente / Não mensal)
 * Exemplos: Rescisão trabalhista, multa rescisória, FGTS, seguro-desemprego,
 * restituição de IRPF, venda de bens/veículos, indenizações, acordos judiciais, bônus pontual.
 * REGRA CRÍTICA: Receitas extraordinárias NÃO entram na média de renda mensal recorrente.
 */
export const isExtraordinaryIncome = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;

  if (t.classification === 'extraordinary') return true;

  const cat = categories.find(c => c.id === t.categoryId);
  if (cat?.classification === 'extraordinary') return true;

  // Categorias específicas do app
  if (t.categoryId === 'cat_24' || t.categoryId === 'cat_25') return true; // Bônus / PLR, Venda de Usados

  const catName = (cat?.name || '').toLowerCase();
  if (
    catName.includes('extraordin') || 
    catName.includes('rescis') || 
    catName.includes('fgts') || 
    catName.includes('seguro-desemprego') || 
    catName.includes('seguro desemprego') || 
    catName.includes('restitui') || 
    catName.includes('bônus') ||
    catName.includes('bonus') ||
    catName.includes('venda de usado') ||
    catName.includes('indeniza') ||
    catName.includes('herança') ||
    catName.includes('heranca')
  ) {
    return true;
  }

  // Palavras-chave na descrição
  const desc = (t.description || '').toLowerCase();
  const keywords = [
    'rescisão', 'rescisao', 'fgts', 'seguro-desemprego', 'seguro desemprego',
    'multa rescisória', 'multa rescisoria', 'restituição', 'restituicao',
    'indenização', 'indenizacao', 'herança', 'heranca', 'acordo trabalhista',
    'acordo judicial', 'venda de bem', 'venda de bens', 'venda de carro',
    'venda de moto', 'venda de instrumento', 'venda de equipamento',
    'plr', 'bonus pontual', 'bônus pontual', 'extraordin'
  ];

  return keywords.some(k => desc.includes(k));
};

/**
 * 4. RECEITA VARIÁVEL DE SHOWS (Cachês, Eventos Musicais, Couvert, Apresentações)
 */
export const isVariableWorkIncome = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  if (t.categoryId === 'cat_33') return true; // Categoria Shows / Cachês

  const cat = categories.find(c => c.id === t.categoryId);
  const catName = (cat?.name || '').toLowerCase();
  if (catName.includes('show') || catName.includes('cachê') || catName.includes('cache')) {
    return true;
  }

  const desc = (t.description || '').toLowerCase();
  const keywords = ['show', 'cachê', 'cache', 'evento', 'apresentação', 'apresentacao', 'couvert', 'freela musical'];
  return keywords.some(k => desc.includes(k));
};

/**
 * 5. RECEITA NORMAL / RECORRENTE FIXA (Salário, Pró-Labore, Aluguel, Aposentadoria)
 */
export const isRecurringIncome = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  if (isExtraordinaryIncome(t, categories)) return false;
  if (isVariableWorkIncome(t, categories)) return false;

  if (t.isFixed || Boolean(t.fixedGroupId)) return true;
  if (t.categoryId === 'cat_6' || t.categoryId === 'cat_7' || t.categoryId === 'cat_32') return true;

  const cat = categories.find(c => c.id === t.categoryId);
  const catName = (cat?.name || '').toLowerCase();
  return catName.includes('salário') || catName.includes('salario') || catName.includes('pró-labore') || catName.includes('pro-labore') || catName.includes('fixa');
};

/**
 * 6. RECEITAS FUTURAS: GARANTIDAS vs ESTIMADAS / INCERTAS
 */
export const isIncomeGuaranteed = (t: Transaction, shows: Show[], categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  if (t.status === 'paid') return true;

  // Se vinculada a um show, verificar status do show
  const linkedShow = shows.find(s => 
    s.receipts && s.receipts.some(r => r.transactionId === t.id)
  );
  if (linkedShow) {
    return linkedShow.status === 'Confirmado' || linkedShow.status === 'Realizado';
  }

  // Receitas fixas/salários são garantidas
  if (isRecurringIncome(t, categories)) return true;

  const desc = (t.description || '').toLowerCase();
  if (desc.includes('estimativa') || desc.includes('projeção') || desc.includes('projecao') || desc.includes('incerto') || desc.includes('talvez')) {
    return false;
  }

  return true;
};

/**
 * 7. PARCELAS DE DÍVIDAS / FINANCIAMENTOS / EMPRÉSTIMOS
 */
export const isDebtExpense = (t: Transaction, debts: Debt[], categories: Category[]): boolean => {
  if (t.type !== 'expense') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;

  if (t.debtId) return true;
  if (t.installmentNumber !== undefined && t.installmentNumber > 0) return true;

  const desc = (t.description || '').toLowerCase();
  if (/\(\d+\/\d+\)/.test(desc)) return true; // Padrão (1/12)
  if (desc.startsWith('entrada - ') && debts.some(d => desc.includes(d.name.toLowerCase()))) return true;

  const cat = categories.find(c => c.id === t.categoryId);
  const catName = (cat?.name || '').toLowerCase();
  return (
    catName.includes('empréstimo') || 
    catName.includes('emprestimo') || 
    catName.includes('financiamento') || 
    catName.includes('dívida') || 
    catName.includes('divida')
  );
};

/**
 * 8. INVESTIMENTOS PROFISSIONAIS (Equipamentos de trabalho, ferramentas musicais, instrumentos)
 * REGRA: Não confundir com lazer pessoal ou compras supérfluas.
 */
export const isProfessionalInvestmentExpense = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'expense') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  if (t.classification === 'professional') return true;

  const cat = categories.find(c => c.id === t.categoryId);
  if (cat?.classification === 'professional') return true;

  const desc = (t.description || '').toLowerCase();
  const keywords = [
    'equipamento', 'instrumento', 'ferramenta de trabalho', 'manutenção de instrumento',
    'manutencao de instrumento', 'guitarra', 'violão', 'violao', 'baixo',
    'bateria', 'teclado', 'amplificador', 'microfone', 'cabo p10', 'pedal',
    'pedaleira', 'som profissional', 'estúdio', 'estudio', 'ensaio',
    'gravação', 'gravacao', 'figurino', 'marketing musical', 'tráfego pago show'
  ];

  return keywords.some(k => desc.includes(k));
};

/**
 * 9. DESPESAS ESSENCIAIS (Custo básico de vida e subsistência)
 * Aluguel, condomínio, alimentação, água, luz, gás, internet, transporte, saúde, farmácia.
 */
export const isEssentialExpense = (t: Transaction, categories: Category[], debts: Debt[]): boolean => {
  if (t.type !== 'expense') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  if (isDebtExpense(t, debts, categories)) return false;
  if (isProfessionalInvestmentExpense(t, categories)) return false;

  if (t.classification === 'essential') return true;
  const cat = categories.find(c => c.id === t.categoryId);
  if (cat?.classification === 'essential') return true;

  const catName = (cat?.name || '').toLowerCase();
  const essentialKeywords = [
    'mercado', 'supermercado', 'alimentação', 'alimentacao', 'aluguel',
    'condomínio', 'condominio', 'luz', 'energia', 'água', 'agua', 'gás',
    'gas', 'internet', 'celular', 'telefone', 'saúde', 'saude', 'farmácia',
    'farmacia', 'plano de saúde', 'transporte', 'combustível', 'combustivel',
    'imposto', 'iptu', 'ipva'
  ];

  return essentialKeywords.some(k => catName.includes(k));
};

/**
 * 10. DESPESAS DISCRICIONÁRIAS (Lazer, compras pessoais, restaurantes, supérfluos)
 */
export const isDiscretionaryExpense = (t: Transaction, categories: Category[], debts: Debt[]): boolean => {
  if (t.type !== 'expense') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  if (isDebtExpense(t, debts, categories)) return false;
  if (isProfessionalInvestmentExpense(t, categories)) return false;
  if (isEssentialExpense(t, categories, debts)) return false;
  return true;
};

// =========================================================================
// MOTOR PRINCIPAL DE GERAÇÃO DO RELATÓRIO
// Estrutura prioritária:
// DINHEIRO HOJE → ENTRADAS FUTURAS → SAÍDAS FUTURAS → CUSTO MENSAL → DÍVIDAS → FLUXO DOS PRÓXIMOS MESES → CAPACIDADE DE COMPRA
// =========================================================================

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

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const dateRange = getPeriodDateRange(periodType, customStartDate, customEndDate);
  const generationTimestamp = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  // Helpers de categorias
  const getCatName = (catId: string) => categories.find(c => c.id === catId)?.name || 'Geral';

  // -------------------------------------------------------------------------
  // 1. DINHEIRO HOJE E SEPARAÇÃO DOS BUCKETS DE CAPITAL
  // -------------------------------------------------------------------------
  const accountsWithBalances = accounts.map(acc => ({
    ...acc,
    currentBalance: getAccountBalance(acc.id)
  }));

  // Separar Contas Operacionais (dinheiro livre para uso) de Contas de Reserva/Poupança
  const operationalAccounts = accountsWithBalances.filter(
    a => !(a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('economia') || a.name.toLowerCase().includes('cofrinho'))
  );
  const savingsAccounts = accountsWithBalances.filter(
    a => (a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('economia') || a.name.toLowerCase().includes('cofrinho'))
  );

  const totalAvailableOperationalToday = operationalAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalInSavingsAccounts = savingsAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

  // Dinheiro reservado em Metas / Cofrinhos
  const totalReservedToGoals = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  
  // Total de dinheiro reservado (intocável para despesas correntes)
  const totalMoneyReserved = totalReservedToGoals + totalInSavingsAccounts;

  // Patrimônio líquido total
  const totalNetWorth = totalAvailableOperationalToday + totalMoneyReserved;

  // Compromissos imediatos (despesas pendentes a vencer até o fim do mês corrente ou vencidas)
  const immediatePendingExpenses = transactions.filter(t => {
    if (t.type !== 'expense' || t.status !== 'pending') return false;
    if (isTransferMovement(t) || isGoalMovement(t)) return false;
    return t.date <= todayStr || t.date.startsWith(currentMonthPrefix);
  });
  const totalImmediateCommitments = immediatePendingExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

  // Caixa livre imediato após compromissos imediatos
  const immediateFreeCash = totalAvailableOperationalToday - totalImmediateCommitments;

  // -------------------------------------------------------------------------
  // 2. SHOWS E RENDA VARIÁVEL
  // -------------------------------------------------------------------------
  const allShows = shows || [];
  const showsRealizados = allShows.filter(s => s.status === 'Realizado');
  
  // Shows contratados futuros (Confirmados ou Agendados com data >= hoje)
  const showsContratadosFuturos = allShows.filter(s => 
    (s.status === 'Confirmado' || (s.status === 'Agendado' && Number(s.totalCache) > 0)) && 
    s.date >= todayStr
  );

  const totalFutureShowsValue = showsContratadosFuturos.reduce((sum, s) => sum + (Number(s.totalCache) || 0), 0);
  const totalFutureShowsReceived = showsContratadosFuturos.reduce((sum, s) => sum + (Number(s.cacheReceived) || 0), 0);
  const totalFutureShowsToReceive = Math.max(0, totalFutureShowsValue - totalFutureShowsReceived);

  const totalFutureShowsCosts = showsContratadosFuturos.reduce((sum, s) => {
    const exp = s.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 };
    return sum + (Number(exp.fuel) || 0) + (Number(exp.food) || 0) + (Number(exp.toll) || 0) + (Number(exp.commission) || 0) + (Number(exp.others) || 0);
  }, 0);

  const totalFutureShowsExpectedProfit = totalFutureShowsToReceive - totalFutureShowsCosts;

  // Histórico de shows para média de lucro e margem
  let totalHistoricGross = 0;
  let totalHistoricCosts = 0;
  allShows.forEach(s => {
    const cache = Number(s.totalCache) || 0;
    totalHistoricGross += cache;
    const exp = s.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 };
    totalHistoricCosts += (Number(exp.fuel) || 0) + (Number(exp.food) || 0) + (Number(exp.toll) || 0) + (Number(exp.commission) || 0) + (Number(exp.others) || 0);
  });
  const totalHistoricNetProfit = totalHistoricGross - totalHistoricCosts;
  const avgProfitPerShow = allShows.length > 0 ? Number((totalHistoricNetProfit / allShows.length).toFixed(2)) : 0;

  // -------------------------------------------------------------------------
  // 3. RECEITAS FUTURAS (GARANTIDAS vs ESTIMADAS vs EXTRAORDINÁRIAS)
  // -------------------------------------------------------------------------
  const futureIncomeTxs = transactions.filter(t => 
    t.type === 'income' && 
    t.status === 'pending' && 
    t.date >= todayStr &&
    t.date <= dateRange.endDate &&
    !isTransferMovement(t) &&
    !isGoalMovement(t)
  );

  const guaranteedFutureIncomes: Transaction[] = [];
  const estimatedFutureIncomes: Transaction[] = [];
  const extraordinaryIncomes: Transaction[] = [];

  futureIncomeTxs.forEach(t => {
    if (isExtraordinaryIncome(t, categories)) {
      extraordinaryIncomes.push(t);
    } else if (isIncomeGuaranteed(t, shows, categories)) {
      guaranteedFutureIncomes.push(t);
    } else {
      estimatedFutureIncomes.push(t);
    }
  });

  const totalGuaranteedFutureIncomeFromTxs = guaranteedFutureIncomes.reduce((s, t) => s + Number(t.amount), 0);
  const totalEstimatedFutureIncome = estimatedFutureIncomes.reduce((s, t) => s + Number(t.amount), 0);

  // Se os cachês futuros de shows não estiverem cadastrados como transações pendentes, somamos ao garantido para não omitir
  const futureShowsCoveredInTxs = guaranteedFutureIncomes.filter(t => isVariableWorkIncome(t, categories)).reduce((s, t) => s + Number(t.amount), 0);
  const uncoveredFutureShowsToReceive = Math.max(0, totalFutureShowsToReceive - futureShowsCoveredInTxs);
  const totalGuaranteedFutureIncome = totalGuaranteedFutureIncomeFromTxs + uncoveredFutureShowsToReceive;

  // -------------------------------------------------------------------------
  // 4. DESPESAS E CUSTOS (ESSENCIAIS, DÍVIDAS, RECORRENTES, PROFISSIONAIS)
  // -------------------------------------------------------------------------
  // Despesas já pagas no mês atual
  const thisMonthPaidExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid' && t.date.startsWith(currentMonthPrefix) && !isTransferMovement(t) && !isGoalMovement(t))
    .reduce((s, t) => s + Number(t.amount), 0);

  // Despesas futuras conhecidas no período
  const futureExpenseTxs = transactions.filter(t => 
    t.type === 'expense' && 
    t.status === 'pending' && 
    t.date >= todayStr &&
    t.date <= dateRange.endDate &&
    !isTransferMovement(t) &&
    !isGoalMovement(t)
  );
  const totalKnownFutureExpenses = futureExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);

  const futureEssentialTotal = futureExpenseTxs.filter(t => isEssentialExpense(t, categories, debts)).reduce((s, t) => s + Number(t.amount), 0);
  const futureDebtTotal = futureExpenseTxs.filter(t => isDebtExpense(t, debts, categories)).reduce((s, t) => s + Number(t.amount), 0);
  const futureRecurringTotal = futureExpenseTxs.filter(t => (t.isFixed || Boolean(t.fixedGroupId)) && !isEssentialExpense(t, categories, debts) && !isDebtExpense(t, debts, categories)).reduce((s, t) => s + Number(t.amount), 0);
  const futureProfTotal = futureExpenseTxs.filter(t => isProfessionalInvestmentExpense(t, categories)).reduce((s, t) => s + Number(t.amount), 0);
  const futureDiscretionaryTotal = futureExpenseTxs.filter(t => isDiscretionaryExpense(t, categories, debts)).reduce((s, t) => s + Number(t.amount), 0);

  // -------------------------------------------------------------------------
  // 5. DETALHAMENTO DE DÍVIDAS
  // -------------------------------------------------------------------------
  interface DebtDetail {
    debt: Debt;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    monthlyInstallment: number;
    paidCount: number;
    remainingCount: number;
    totalCount: number;
    endMonthYear: string;
  }

  const debtDetails: DebtDetail[] = debts.map(d => {
    const linkedTxs = transactions.filter(t => t.debtId === d.id);
    const paidTxs = linkedTxs.filter(t => t.status === 'paid');
    const pendingTxs = linkedTxs.filter(t => t.status === 'pending');

    const totalContract = Number(d.totalAmount) || 0;
    const paidPrincipal = paidTxs.reduce((s, t) => s + (Number(t.amount) - (Number(t.interest) || 0)), 0);
    const remainingAmount = Math.max(0, totalContract - paidPrincipal);

    let monthlyInstallment = 0;
    if (d.installmentAmount && d.installmentAmount > 0) {
      monthlyInstallment = d.installmentAmount;
    } else if (pendingTxs.length > 0) {
      monthlyInstallment = Number(pendingTxs[0].amount) || 0;
    } else if (d.installmentCount > 0 && totalContract > 0) {
      monthlyInstallment = totalContract / d.installmentCount;
    }

    const totalCount = d.installmentCount || (linkedTxs.length > 0 ? linkedTxs.length : 0);
    const paidCount = paidTxs.length;
    const remainingCount = totalCount > 0 ? Math.max(0, totalCount - paidCount) : pendingTxs.length;

    let endMonthYear = 'DADOS INSUFICIENTES';
    if (pendingTxs.length > 0) {
      const sortedPending = [...pendingTxs].sort((a, b) => a.date.localeCompare(b.date));
      const lastTx = sortedPending[sortedPending.length - 1];
      endMonthYear = formatMonthYearBR(lastTx.date.slice(0, 7));
    } else if (d.startDate && remainingCount > 0) {
      const [sy, sm] = d.startDate.split('-').map(Number);
      const endDate = new Date(sy, (sm - 1) + (totalCount || 1), 1);
      const ym = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      endMonthYear = formatMonthYearBR(ym);
    }

    return {
      debt: d,
      totalAmount: totalContract,
      paidAmount: paidPrincipal,
      remainingAmount,
      monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
      paidCount,
      remainingCount,
      totalCount,
      endMonthYear
    };
  });

  const totalDebtsRemaining = debtDetails.reduce((s, d) => s + d.remainingAmount, 0);
  const totalMonthlyDebtInstallments = debtDetails.reduce((s, d) => s + d.monthlyInstallment, 0);

  let debtReliefDateSummary = 'DADOS INSUFICIENTES';
  if (debtDetails.length > 0) {
    const validEnds = debtDetails.filter(d => d.endMonthYear !== 'DADOS INSUFICIENTES');
    if (validEnds.length > 0) {
      debtReliefDateSummary = validEnds[validEnds.length - 1].endMonthYear;
    }
  }

  // -------------------------------------------------------------------------
  // 6. CUSTO MENSAL DE MANTER A VIDA (ESSENCIAL + DÍVIDAS + RECORRENTES)
  // -------------------------------------------------------------------------
  // Média de despesas essenciais do histórico recente (últimos 3 meses pagos)
  const past3MonthsList: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    past3MonthsList.push(d.toISOString().slice(0, 7));
  }

  const pastEssentialExpenses = transactions.filter(t => 
    isEssentialExpense(t, categories, debts) && 
    past3MonthsList.some(m => t.date.startsWith(m)) &&
    t.status === 'paid'
  );
  const totalPastEssential = pastEssentialExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const monthlyEssentialLifeCostAvg = past3MonthsList.length > 0 && totalPastEssential > 0
    ? totalPastEssential / past3MonthsList.length
    : 0;

  // Despesas essenciais deste mês (pagas + pendentes)
  const thisMonthEssentialTotal = transactions
    .filter(t => isEssentialExpense(t, categories, debts) && t.date.startsWith(currentMonthPrefix))
    .reduce((s, t) => s + Number(t.amount), 0);

  // Valor de referência para custo de manter a vida (essencial)
  const referenceMonthlyEssentialCost = thisMonthEssentialTotal > 0 
    ? thisMonthEssentialTotal 
    : (monthlyEssentialLifeCostAvg > 0 ? monthlyEssentialLifeCostAvg : 0);

  // Despesas recorrentes fixas não essenciais (ex: assinaturas úteis)
  const thisMonthRecurringOther = transactions
    .filter(t => t.type === 'expense' && (t.isFixed || Boolean(t.fixedGroupId)) && !isEssentialExpense(t, categories, debts) && !isDebtExpense(t, debts, categories) && t.date.startsWith(currentMonthPrefix))
    .reduce((s, t) => s + Number(t.amount), 0);

  // CUSTO MENSAL TOTAL OBRIGATÓRIO
  const totalMandatoryMonthlyCost = referenceMonthlyEssentialCost + totalMonthlyDebtInstallments + thisMonthRecurringOther;

  // Renda mensal fixa recorrente (salário/pró-labore)
  const totalMonthlyRecurringIncome = transactions
    .filter(t => isRecurringIncome(t, categories) && t.date.startsWith(currentMonthPrefix))
    .reduce((s, t) => s + Number(t.amount), 0);

  // Balanço mensal base (Renda fixa - Custo mensal obrigatório)
  const baseMonthlyBalance = totalMonthlyRecurringIncome - totalMandatoryMonthlyCost;

  // Necessidade de shows para cobrir o custo mensal
  let necessityOfShowsExplanation = 'Renda fixa cobre os custos obrigatórios.';
  if (baseMonthlyBalance < 0) {
    const deficit = Math.abs(baseMonthlyBalance);
    if (avgProfitPerShow > 0) {
      const showsCount = (deficit / avgProfitPerShow).toFixed(1);
      necessityOfShowsExplanation = `Déficit base de ${formatBRL(deficit)}. Necessários ${showsCount} shows/mês (com lucro médio de ${formatBRL(avgProfitPerShow)}) para pagar o custo obrigatório.`;
    } else {
      necessityOfShowsExplanation = `Déficit base de ${formatBRL(deficit)}/mês que depende de shows e renda variável para ser coberto.`;
    }
  }

  // -------------------------------------------------------------------------
  // 7. FLUXO MENSAL DOS PRÓXIMOS 6 MESES
  // Mês | Entradas garantidas | Despesas essenciais | Parcelas de dívidas | Outras obrigações | Resultado | Saldo projetado
  // -------------------------------------------------------------------------
  const next6MonthsList: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    next6MonthsList.push(d.toISOString().slice(0, 7));
  }

  let runningProjectedBalance = totalAvailableOperationalToday;

  interface MonthlyFlowRow {
    monthStr: string;
    monthLabel: string;
    guaranteedIncomes: number;
    essentialExpenses: number;
    debtInstallments: number;
    otherObligations: number;
    netResult: number;
    projectedEndBalance: number;
  }

  const monthlyFlowRows: MonthlyFlowRow[] = next6MonthsList.map((monthStr, idx) => {
    const isCurrent = monthStr === currentMonthPrefix;

    // 1. Entradas garantidas no mês
    // Rendas fixas / programadas garantidas
    const monthIncomeTxs = transactions.filter(t => 
      t.type === 'income' && 
      t.date.startsWith(monthStr) && 
      (isCurrent ? t.status === 'pending' && t.date >= todayStr : true) &&
      !isTransferMovement(t) &&
      !isGoalMovement(t) &&
      !isExtraordinaryIncome(t, categories) &&
      isIncomeGuaranteed(t, shows, categories)
    );
    let monthIncomes = monthIncomeTxs.reduce((s, t) => s + Number(t.amount), 0);

    // Shows contratados para este mês que porventura não tenham tx pendente criada
    const monthShows = showsContratadosFuturos.filter(s => s.date.startsWith(monthStr));
    monthShows.forEach(s => {
      const showToReceive = Math.max(0, (Number(s.totalCache) || 0) - (Number(s.cacheReceived) || 0));
      const hasTx = monthIncomeTxs.some(t => isVariableWorkIncome(t, categories));
      if (!hasTx && showToReceive > 0) {
        monthIncomes += showToReceive;
      }
    });

    // 2. Despesas Essenciais do mês
    const monthEssentialTxs = transactions.filter(t => 
      isEssentialExpense(t, categories, debts) && 
      t.date.startsWith(monthStr) &&
      (isCurrent ? t.status === 'pending' && t.date >= todayStr : true)
    );
    let essentialExp = monthEssentialTxs.reduce((s, t) => s + Number(t.amount), 0);
    // Se para mês futuro ainda não foram lançadas as contas essenciais, projeta o custo essencial de referência para não iludir
    if (!isCurrent && essentialExp === 0 && referenceMonthlyEssentialCost > 0) {
      essentialExp = referenceMonthlyEssentialCost;
    }

    // 3. Parcelas de dívidas no mês
    const monthDebtTxs = transactions.filter(t => 
      isDebtExpense(t, debts, categories) && 
      t.date.startsWith(monthStr) &&
      (isCurrent ? t.status === 'pending' && t.date >= todayStr : true)
    );
    let debtExp = monthDebtTxs.reduce((s, t) => s + Number(t.amount), 0);
    // Se não há tx de dívida para mês futuro mas há parcelas ativas cadastradas em dívidas
    if (!isCurrent && debtExp === 0 && totalMonthlyDebtInstallments > 0) {
      debtExp = totalMonthlyDebtInstallments;
    }

    // 4. Outras obrigações (recorrentes fixas + investimentos profissionais + compromissos discricionários pendentes)
    const monthOtherTxs = transactions.filter(t => 
      t.type === 'expense' && 
      t.date.startsWith(monthStr) &&
      (isCurrent ? t.status === 'pending' && t.date >= todayStr : true) &&
      !isEssentialExpense(t, categories, debts) &&
      !isDebtExpense(t, debts, categories) &&
      !isTransferMovement(t) &&
      !isGoalMovement(t)
    );
    let otherObligations = monthOtherTxs.reduce((s, t) => s + Number(t.amount), 0);
    if (!isCurrent && otherObligations === 0 && thisMonthRecurringOther > 0) {
      otherObligations = thisMonthRecurringOther;
    }

    // Resultado do mês = Entradas Garantidas - Saídas Obrigatórias
    const netResult = monthIncomes - (essentialExp + debtExp + otherObligations);
    runningProjectedBalance += netResult;

    return {
      monthStr,
      monthLabel: formatMonthYearBR(monthStr),
      guaranteedIncomes: Number(monthIncomes.toFixed(2)),
      essentialExpenses: Number(essentialExp.toFixed(2)),
      debtInstallments: Number(debtExp.toFixed(2)),
      otherObligations: Number(otherObligations.toFixed(2)),
      netResult: Number(netResult.toFixed(2)),
      projectedEndBalance: Number(runningProjectedBalance.toFixed(2))
    };
  });

  const finalProjectedBalanceAtHorizon = monthlyFlowRows[monthlyFlowRows.length - 1]?.projectedEndBalance ?? runningProjectedBalance;

  // -------------------------------------------------------------------------
  // 8. CAPACIDADE DE COMPRA E MARGEM SEGURA
  // -------------------------------------------------------------------------
  // Menor saldo projetado ao longo dos 6 meses
  const minProjectedBalance = Math.min(...monthlyFlowRows.map(r => r.projectedEndBalance));

  // Meses de sobrevivência com o caixa atual: Dinheiro disponível hoje / Custo mensal obrigatório
  const monthsOfSurvivalCurrentCash = totalMandatoryMonthlyCost > 0 
    ? Number((totalAvailableOperationalToday / totalMandatoryMonthlyCost).toFixed(1)) 
    : 'DADOS INSUFICIENTES';

  // Margem segura para novas compras à vista:
  // Não pode negativar compromissos imediatos, não pode negativar o saldo mínimo nos 6 meses,
  // e preserva um colchão de segurança essencial (ou 50% do excedente).
  let safePurchaseMargin = 0;
  const maxAvailableCash = Math.min(immediateFreeCash, minProjectedBalance);

  if (maxAvailableCash > 0) {
    if (totalMoneyReserved >= referenceMonthlyEssentialCost) {
      // Já tem reserva em cofrinhos cobrindo pelo menos 1 mês de vida
      safePurchaseMargin = Math.max(0, Math.round(maxAvailableCash * 0.7));
    } else {
      // Não tem reserva suficiente nos cofrinhos: protege o custo de 1 mês de vida no caixa operacional
      safePurchaseMargin = Math.max(0, Math.round(maxAvailableCash - referenceMonthlyEssentialCost));
    }
  }

  // Margem para novas compras parceladas por mês:
  // Capacidade de suportar uma nova parcela mensal sem tornar nenhum mês deficitário
  const monthlySurpluses = monthlyFlowRows.map(r => r.netResult);
  const minMonthlySurplus = Math.min(...monthlySurpluses);
  const safeMonthlyInstallmentMargin = minMonthlySurplus > 0 ? Math.round(minMonthlySurplus * 0.5) : 0;

  // -------------------------------------------------------------------------
  // MONTAGEM DO TEXTO DO RELATÓRIO
  // ESTRUTURA EXATA E PRIORITÁRIA:
  // DINHEIRO HOJE → ENTRADAS FUTURAS → SAÍDAS FUTURAS → CUSTO MENSAL → DÍVIDAS → FLUXO DOS PRÓXIMOS MESES → CAPACIDADE DE COMPRA
  // -------------------------------------------------------------------------
  const lines: string[] = [];

  // CABEÇALHO
  lines.push('============================================================');
  lines.push('RELATÓRIO FINANCEIRO PARA IA');
  lines.push('============================================================');
  lines.push(`Data de geração: ${generationTimestamp}`);
  lines.push(`Período analisado: ${dateRange.label}`);
  lines.push(`Horizonte temporal: ${formatDateBR(dateRange.startDate)} até ${formatDateBR(dateRange.endDate)}`);

  // RESUMO EXECUTIVO (OS 10 ITENS EXATOS NO INÍCIO)
  lines.push('');
  lines.push('------------------------------------------------------------');
  lines.push('RESUMO EXECUTIVO');
  lines.push('------------------------------------------------------------');
  lines.push(`Dinheiro hoje: ${formatBRL(totalAvailableOperationalToday)}`);
  lines.push(`Reservado: ${formatBRL(totalMoneyReserved)}`);
  lines.push(`Compromissos imediatos: ${formatBRL(totalImmediateCommitments)}`);
  lines.push(`Custo mensal obrigatório: ${formatBRL(totalMandatoryMonthlyCost)}`);
  lines.push(`Parcelas de dívidas/mês: ${formatBRL(totalMonthlyDebtInstallments)}`);
  lines.push(`Receitas futuras garantidas: ${formatBRL(totalGuaranteedFutureIncome)}`);
  lines.push(`Shows futuros contratados: ${formatBRL(totalFutureShowsToReceive)}`);
  lines.push(`Dívidas restantes: ${formatBRL(totalDebtsRemaining)}`);
  lines.push(`Saldo projetado: ${formatBRL(finalProjectedBalanceAtHorizon)}`);
  lines.push(`Margem segura para novas compras: ${formatBRL(safePurchaseMargin)}`);

  // SEÇÃO 1: DINHEIRO HOJE
  lines.push('');
  lines.push('============================================================');
  lines.push('1. DINHEIRO HOJE');
  lines.push('============================================================');
  lines.push(`• Dinheiro disponível hoje (em contas operacionais): ${formatBRL(totalAvailableOperationalToday)}`);
  lines.push(`• Dinheiro reservado (cofrinhos / metas / poupança - intocável): ${formatBRL(totalMoneyReserved)}`);
  lines.push(`• Compromissos imediatos (contas a vencer no mês atual): ${formatBRL(totalImmediateCommitments)}`);
  lines.push(`• Caixa livre imediato (disponível - compromissos imediatos): ${formatBRL(immediateFreeCash)}`);
  lines.push(`• Patrimônio líquido total (disponível + reservado): ${formatBRL(totalNetWorth)}`);
  lines.push('NOTA METODOLÓGICA: O dinheiro reservado (cofrinhos) NÃO é despesa nem saldo livre para consumo; é patrimônio protegido.');

  // SEÇÃO 2: ENTRADAS FUTURAS
  lines.push('');
  lines.push('============================================================');
  lines.push('2. ENTRADAS FUTURAS');
  lines.push('============================================================');
  lines.push(`• Total de receitas garantidas: ${formatBRL(totalGuaranteedFutureIncome)}`);
  lines.push(`  - Salários / rendas fixas certas: ${formatBRL(totalGuaranteedFutureIncomeFromTxs - futureShowsCoveredInTxs)}`);
  lines.push(`  - Cachês de shows contratados a receber: ${formatBRL(totalFutureShowsToReceive)}`);
  lines.push('');
  lines.push('RESUMO DA RENDA VARIÁVEL DE SHOWS:');
  lines.push('Shows contratados | Valor a receber | Custos previstos | Lucro esperado | Lucro médio por show');
  lines.push('------------------|-----------------|------------------|----------------|---------------------');
  const showsLabel = `${showsContratadosFuturos.length} show(s)`.padEnd(17);
  const showToRecStr = formatBRL(totalFutureShowsToReceive).padStart(17);
  const showCostsStr = formatBRL(totalFutureShowsCosts).padStart(18);
  const showProfitStr = formatBRL(totalFutureShowsExpectedProfit).padStart(16);
  const showAvgStr = formatBRL(avgProfitPerShow).padStart(21);
  lines.push(`${showsLabel} | ${showToRecStr} | ${showCostsStr} | ${showProfitStr} | ${showAvgStr}`);

  if (showsContratadosFuturos.length > 0) {
    lines.push('');
    lines.push('DETALHE DOS SHOWS FUTUROS CONTRATADOS:');
    showsContratadosFuturos.forEach(s => {
      const pending = Math.max(0, (Number(s.totalCache) || 0) - (Number(s.cacheReceived) || 0));
      lines.push(`• [${formatDateBR(s.date)}] ${s.name} (${s.contractorName || 'Contratante'}) | A receber: ${formatBRL(pending)} | Status: ${s.status}`);
    });
  }

  lines.push('');
  lines.push(`• Receitas futuras estimadas (incertas / não contratadas): ${formatBRL(totalEstimatedFutureIncome)}`);

  lines.push('');
  lines.push('RECEITAS EXTRAORDINÁRIAS IDENTIFICADAS:');
  if (extraordinaryIncomes.length === 0) {
    lines.push('Nenhuma receita extraordinária registrada (rescisão, FGTS, bônus pontual).');
  } else {
    lines.push('NOTA METODOLÓGICA: As receitas extraordinárias abaixo NÃO foram somadas à renda mensal recorrente:');
    extraordinaryIncomes.forEach(t => {
      lines.push(`• [${formatDateBR(t.date)}] ${t.description} (${getCatName(t.categoryId)}): ${formatBRL(t.amount)}`);
    });
  }

  // SEÇÃO 3: SAÍDAS FUTURAS
  lines.push('');
  lines.push('============================================================');
  lines.push('3. SAÍDAS FUTURAS');
  lines.push('============================================================');
  lines.push(`• Total de despesas futuras conhecidas no período: ${formatBRL(totalKnownFutureExpenses)}`);
  lines.push(`• Despesas já pagas no mês atual: ${formatBRL(thisMonthPaidExpenses)}`);
  lines.push(`• Despesas essenciais futuras programadas: ${formatBRL(futureEssentialTotal)}`);
  lines.push(`• Parcelas de dívidas futuras programadas: ${formatBRL(futureDebtTotal)}`);
  lines.push(`• Despesas fixas recorrentes programadas: ${formatBRL(futureRecurringTotal)}`);
  lines.push(`• Investimentos profissionais programados (equipamentos/trabalho): ${formatBRL(futureProfTotal)}`);
  lines.push(`• Despesas discricionárias programadas: ${formatBRL(futureDiscretionaryTotal)}`);
  lines.push('NOTA: Transferências entre contas e aportes em cofrinhos foram desconsiderados pois não representam despesas.');

  // SEÇÃO 4: CUSTO MENSAL
  lines.push('');
  lines.push('============================================================');
  lines.push('4. CUSTO MENSAL');
  lines.push('============================================================');
  lines.push(`• Custo de manter a vida por mês (despesas essenciais): ${formatBRL(referenceMonthlyEssentialCost)}`);
  lines.push(`• Parcelas mensais de dívidas/financiamentos: ${formatBRL(totalMonthlyDebtInstallments)}`);
  lines.push(`• Despesas fixas recorrentes adicionais: ${formatBRL(thisMonthRecurringOther)}`);
  lines.push('------------------------------------------------------------');
  lines.push(`CUSTO MENSAL TOTAL OBRIGATÓRIO: ${formatBRL(totalMandatoryMonthlyCost)}`);
  lines.push('------------------------------------------------------------');
  lines.push(`• Renda mensal fixa/recorrente: ${formatBRL(totalMonthlyRecurringIncome)}`);
  lines.push(`• Balanço mensal base (renda fixa - custo obrigatório): ${baseMonthlyBalance >= 0 ? '+' : ''}${formatBRL(baseMonthlyBalance)}`);
  lines.push(`• Diagnóstico da renda variável: ${necessityOfShowsExplanation}`);

  // SEÇÃO 5: DÍVIDAS
  lines.push('');
  lines.push('============================================================');
  lines.push('5. DÍVIDAS');
  lines.push('============================================================');
  if (debtDetails.length === 0) {
    lines.push('Nenhuma dívida ou parcelamento ativo cadastrado.');
  } else {
    lines.push('Dívida                        | Saldo restante | Valor da parcela | Parcelas restantes | Mês de término');
    lines.push('------------------------------|----------------|------------------|--------------------|---------------');
    debtDetails.forEach(dd => {
      const name = dd.debt.name.slice(0, 28).padEnd(28);
      const bal = formatBRL(dd.remainingAmount).padStart(14);
      const parc = formatBRL(dd.monthlyInstallment).padStart(16);
      const rest = `${dd.remainingCount}/${dd.totalCount || '?'}`.padStart(18);
      const end = dd.endMonthYear.slice(0, 15).padEnd(15);
      lines.push(`${name} | ${bal} | ${parc} | ${rest} | ${end}`);
    });
    lines.push('');
    lines.push(`• Total de dívidas restantes: ${formatBRL(totalDebtsRemaining)}`);
    lines.push(`• Total pago mensalmente em parcelas: ${formatBRL(totalMonthlyDebtInstallments)}`);
    lines.push(`• Previsão de término da maior parte das dívidas: ${debtReliefDateSummary}`);
  }

  // SEÇÃO 6: FLUXO DOS PRÓXIMOS MESES
  lines.push('');
  lines.push('============================================================');
  lines.push('6. FLUXO DOS PRÓXIMOS MESES');
  lines.push('============================================================');
  lines.push('Mês             | Entradas garantidas | Despesas essenciais | Parcelas de dívidas | Outras obrigações | Resultado     | Saldo projetado');
  lines.push('----------------|---------------------|---------------------|---------------------|-------------------|---------------|----------------');
  monthlyFlowRows.forEach(row => {
    const m = row.monthLabel.slice(0, 15).padEnd(15);
    const inVal = formatBRL(row.guaranteedIncomes).padStart(19);
    const essVal = formatBRL(row.essentialExpenses).padStart(19);
    const debtVal = formatBRL(row.debtInstallments).padStart(19);
    const othVal = formatBRL(row.otherObligations).padStart(17);
    const resVal = `${row.netResult >= 0 ? '+' : ''}${formatBRL(row.netResult)}`.padStart(13);
    const endVal = formatBRL(row.projectedEndBalance).padStart(16);
    lines.push(`${m} | ${inVal} | ${essVal} | ${debtVal} | ${othVal} | ${resVal} | ${endVal}`);
  });

  // Alertas sobre o fluxo
  const deficitMonths = monthlyFlowRows.filter(r => r.netResult < 0 || r.projectedEndBalance < 0);
  if (deficitMonths.length > 0) {
    lines.push('');
    lines.push('ALERTAS DE FLUXO:');
    deficitMonths.forEach(dm => {
      if (dm.projectedEndBalance < 0) {
        lines.push(`• CRÍTICO EM ${dm.monthLabel.toUpperCase()}: Saldo final projetado fica negativo em ${formatBRL(dm.projectedEndBalance)}.`);
      } else {
        lines.push(`• ATENÇÃO EM ${dm.monthLabel.toUpperCase()}: Déficit mensal de ${formatBRL(Math.abs(dm.netResult))}, coberto pelo saldo acumulado anterior.`);
      }
    });
  }

  // SEÇÃO 7: CAPACIDADE DE COMPRA
  lines.push('');
  lines.push('============================================================');
  lines.push('7. CAPACIDADE DE COMPRA');
  lines.push('============================================================');
  lines.push(`• Saldo final projetado após todas as obrigações: ${formatBRL(finalProjectedBalanceAtHorizon)}`);
  lines.push(`• Meses de sobrevivência com o caixa atual: ${typeof monthsOfSurvivalCurrentCash === 'number' ? `${monthsOfSurvivalCurrentCash} meses` : monthsOfSurvivalCurrentCash}`);
  lines.push(`• MARGEM SEGURA PARA NOVAS COMPRAS À VISTA: ${formatBRL(safePurchaseMargin)}`);
  lines.push(`  (Valor máximo que pode ser gasto à vista hoje sem comprometer contas imediatas, sem negativar o caixa nos próximos 6 meses e preservando a reserva)`);
  lines.push(`• MARGEM PARA NOVA PARCELA MENSAL: ${formatBRL(safeMonthlyInstallmentMargin)}/mês`);
  lines.push(`  (Valor máximo de nova prestação que o fluxo mensal suporta com folga)`);

  lines.push('');
  lines.push('ORIENTAÇÃO DIRETA PARA A IA:');
  if (safePurchaseMargin > 0) {
    lines.push(`O usuário PODE realizar compras à vista de até ${formatBRL(safePurchaseMargin)} sem colocar em risco as obrigações dos próximos 6 meses nem a sua reserva.`);
  } else {
    lines.push(`O usuário NÃO DEVE realizar novas compras no momento. O caixa disponível está comprometido com contas imediatas ou há meses com risco de déficit.`);
  }
  lines.push('============================================================');
  lines.push('FIM DO RELATÓRIO');
  lines.push('============================================================');

  return lines.join('\n');
};
