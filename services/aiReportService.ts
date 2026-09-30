import { Transaction, Account, Category, Debt, Show, FinancialSettings } from '../types';

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
  debts: Debt[];
  shows: Show[];
  financialSettings?: FinancialSettings;
  getAccountBalance: (accountId: string) => number;
}

// Utilitário para formatar moeda em padrão BRL
export const formatBRL = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return 'não informado';
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
export const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'não informado';
  try {
    const [y, m, d] = dateStr.split('T')[0].split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr || 'não informado';
  }
};

// Formatação de Mês/Ano (ex: Março/2026)
export const formatMonthYearBR = (yearMonthStr: string | null | undefined): string => {
  if (!yearMonthStr) return 'não informado';
  try {
    const [y, m] = yearMonthStr.split('-');
    if (!y || !m) return 'não informado';
    const date = new Date(Number(y), Number(m) - 1, 15);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `${capitalizedMonth}/${y}`;
  } catch {
    return yearMonthStr || 'não informado';
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
  return t.categoryId === 'cat_savings';
};

/**
 * 3. RECEITA EXTRAORDINÁRIA (Não recorrente contínua)
 * Exemplos: Seguro-desemprego, Multa de 40% do FGTS, Rescisão trabalhista, FGTS,
 * restituição de IRPF, venda de bens/veículos, indenizações, acordos judiciais, bônus pontual.
 * REGRA CRÍTICA:
 * - Devem ser identificadas como receita extraordinária.
 * - NÃO entram como "renda mensal recorrente contínua".
 * - DEVEM ENTRAR normalmente no fluxo de caixa e no saldo projetado do mês em que estão previstas para entrar!
 */
export const isExtraordinaryIncome = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;

  if (t.classification === 'extraordinary') return true;

  const cat = categories.find(c => c.id === t.categoryId);
  if (cat?.classification === 'extraordinary') return true;
  if (t.categoryId === 'cat_24' || t.categoryId === 'cat_25') return true; // Bônus / PLR, Venda de Usados

  const catName = (cat?.name || '').toLowerCase();
  const desc = (t.description || '').toLowerCase();

  // Caso específico informado pelo usuário: receita rescisória de R$ 2.079,82
  if (Math.abs(Number(t.amount) - 2079.82) < 0.05) return true;

  const extraordinaryKeywords = [
    'seguro-desemprego', 'seguro desemprego',
    'multa de 40%', 'multa 40%', 'multa rescisória', 'multa rescisoria', 'multa do fgts', 'multa fgts',
    'fgts', 'saque fgts',
    'rescisão', 'rescisao', 'rescisória', 'rescisoria', 'verbas rescisórias', 'acerto rescisório', 'acerto rescisorio', 'acerto',
    'restituição', 'restituicao', 'irpf',
    'indenização', 'indenizacao', 'herança', 'heranca', 'acordo trabalhista', 'acordo judicial',
    'bônus', 'bonus', 'plr',
    'venda de usado', 'venda de usados', 'venda de bem', 'venda de bens', 'venda de carro', 'venda de moto',
    'extraordin'
  ];

  if (extraordinaryKeywords.some(k => catName.includes(k))) return true;
  if (extraordinaryKeywords.some(k => desc.includes(k))) return true;

  return false;
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
 * 5. RECEITA NORMAL / RECORRENTE FIXA (Salário Contínuo, Pró-Labore Fixo, Aluguel Recebido)
 * REGRA: Não pode conter receitas extraordinárias (como rescisões, FGTS, seguro-desemprego ou o valor de R$2.079,82).
 */
export const isRecurringIncome = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  if (isExtraordinaryIncome(t, categories)) return false;
  if (isVariableWorkIncome(t, categories)) return false;
  if (Math.abs(Number(t.amount) - 2079.82) < 0.05) return false;

  const desc = (t.description || '').toLowerCase();
  if (desc.includes('rescis') || desc.includes('acerto') || desc.includes('seguro') || desc.includes('fgts')) {
    return false;
  }

  if (t.isFixed || Boolean(t.fixedGroupId)) return true;
  if (t.categoryId === 'cat_6' || t.categoryId === 'cat_7' || t.categoryId === 'cat_32') return true;

  const cat = categories.find(c => c.id === t.categoryId);
  const catName = (cat?.name || '').toLowerCase();
  return catName.includes('salário') || catName.includes('salario') || catName.includes('pró-labore') || catName.includes('pro-labore') || catName.includes('fixa');
};

/**
 * 6. RECEITAS FUTURAS: GARANTIDAS vs ESTIMADAS / INCERTAS
 * Todas as receitas cadastradas certas (incluindo seguro-desemprego, multa de 40% do FGTS, cachês contratados e salários) são garantidas.
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

  // Seguro-desemprego, FGTS e receitas extraordinárias certas cadastradas são garantidas
  if (isExtraordinaryIncome(t, categories)) return true;

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
 */
export const isProfessionalInvestmentExpense = (
  t: Transaction, 
  categories: Category[], 
  financialSettings?: FinancialSettings
): boolean => {
  if (t.type !== 'expense') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  
  if (financialSettings?.professionalCategoryIds?.includes(t.categoryId)) return true;
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
export const isEssentialExpense = (
  t: Transaction, 
  categories: Category[], 
  debts: Debt[],
  financialSettings?: FinancialSettings
): boolean => {
  if (t.type !== 'expense') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  if (isDebtExpense(t, debts, categories)) return false;
  if (isProfessionalInvestmentExpense(t, categories, financialSettings)) return false;

  if (financialSettings?.essentialCategoryIds?.includes(t.categoryId)) return true;
  if (t.classification === 'essential') return true;
  const cat = categories.find(c => c.id === t.categoryId);
  if (cat?.classification === 'essential') return true;

  // Se o usuário explicitamente colocou a categoria em Estilo de Vida ou Investimento Profissional, não é essencial
  if (financialSettings?.lifestyleCategoryIds?.includes(t.categoryId)) return false;
  if (financialSettings?.professionalCategoryIds?.includes(t.categoryId)) return false;
  if (cat?.classification === 'personal' || cat?.classification === 'discretionary') return false;

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
export const isDiscretionaryExpense = (
  t: Transaction, 
  categories: Category[], 
  debts: Debt[],
  financialSettings?: FinancialSettings
): boolean => {
  if (t.type !== 'expense') return false;
  if (isTransferMovement(t) || isGoalMovement(t)) return false;
  if (isDebtExpense(t, debts, categories)) return false;
  if (isProfessionalInvestmentExpense(t, categories, financialSettings)) return false;
  if (isEssentialExpense(t, categories, debts, financialSettings)) return false;
  return true;
};

// =========================================================================
// MOTOR PRINCIPAL DE GERAÇÃO DO RELATÓRIO
// =========================================================================

export const generateFinancialReportForAI = (params: GenerateReportParams): string => {
  const {
    periodType,
    customStartDate,
    customEndDate,
    transactions,
    accounts,
    categories,
    debts,
    shows,
    financialSettings,
    getAccountBalance
  } = params;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const dateRange = getPeriodDateRange(periodType, customStartDate, customEndDate);
  const generationTimestamp = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  const getCatName = (catId: string) => categories.find(c => c.id === catId)?.name || 'Geral';

  // -------------------------------------------------------------------------
  // 1. DINHEIRO HOJE E SEPARAÇÃO DE CAIXA OPERACIONAL vs RESERVADO
  // -------------------------------------------------------------------------
  const accountsWithBalances = accounts.map(acc => ({
    ...acc,
    currentBalance: getAccountBalance(acc.id)
  }));

  const operationalAccounts = accountsWithBalances.filter(
    a => !(a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('economia') || a.name.toLowerCase().includes('cofrinho'))
  );
  const savingsAccounts = accountsWithBalances.filter(
    a => (a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('economia') || a.name.toLowerCase().includes('cofrinho'))
  );

  const totalAvailableOperationalToday = operationalAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalInSavingsAccounts = savingsAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

  const totalMoneyReserved = totalInSavingsAccounts;
  const totalNetWorth = totalAvailableOperationalToday + totalMoneyReserved;

  // Compromissos imediatos (despesas pendentes com vencimento até o fim do mês corrente ou vencidas)
  const immediatePendingExpenses = transactions.filter(t => {
    if (t.type !== 'expense' || t.status !== 'pending') return false;
    if (isTransferMovement(t) || isGoalMovement(t)) return false;
    return t.date <= todayStr || t.date.startsWith(currentMonthPrefix);
  });
  const totalImmediateCommitments = immediatePendingExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
  const immediateFreeCash = totalAvailableOperationalToday - totalImmediateCommitments;

  // -------------------------------------------------------------------------
  // 2. SHOWS E RENDA VARIÁVEL
  // -------------------------------------------------------------------------
  const allShows = shows || [];
  const showsRealizados = allShows.filter(s => s.status === 'Realizado');

  // Shows futuros contratados ou confirmados a partir de hoje
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
  // REGRA: Todas as receitas cadastradas para o período futuro entram no relatório.
  // -------------------------------------------------------------------------
  const futureIncomeTxs = transactions.filter(t => 
    t.type === 'income' && 
    t.status === 'pending' && 
    t.date >= todayStr &&
    t.date <= dateRange.endDate &&
    !isTransferMovement(t) &&
    !isGoalMovement(t)
  );

  const futureExtraordinaryIncomes: Transaction[] = [];
  const futureGuaranteedRecurringIncomes: Transaction[] = [];
  const futureEstimatedIncomes: Transaction[] = [];

  futureIncomeTxs.forEach(t => {
    if (isExtraordinaryIncome(t, categories)) {
      futureExtraordinaryIncomes.push(t);
    } else if (isIncomeGuaranteed(t, shows, categories)) {
      futureGuaranteedRecurringIncomes.push(t);
    } else {
      futureEstimatedIncomes.push(t);
    }
  });

  const totalFutureExtraordinaryIncome = futureExtraordinaryIncomes.reduce((s, t) => s + Number(t.amount), 0);
  const totalFutureRecurringGuaranteed = futureGuaranteedRecurringIncomes.reduce((s, t) => s + Number(t.amount), 0);
  const totalFutureEstimated = futureEstimatedIncomes.reduce((s, t) => s + Number(t.amount), 0);

  // Shows cobertos em transações pendentes para não duplicar
  const futureShowsCoveredInTxs = futureGuaranteedRecurringIncomes.filter(t => isVariableWorkIncome(t, categories)).reduce((s, t) => s + Number(t.amount), 0);
  const uncoveredFutureShowsToReceive = Math.max(0, totalFutureShowsToReceive - futureShowsCoveredInTxs);

  // TOTAL DE RECEITAS FUTURAS GARANTIDAS (Inclui receitas recorrentes certas, shows contratados e receitas extraordinárias programadas)
  const totalGuaranteedFutureIncome = totalFutureRecurringGuaranteed + uncoveredFutureShowsToReceive + totalFutureExtraordinaryIncome;

  // -------------------------------------------------------------------------
  // 4. DESPESAS CONHECIDAS NO HORIZONTE
  // -------------------------------------------------------------------------
  const thisMonthPaidExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'paid' && t.date.startsWith(currentMonthPrefix) && !isTransferMovement(t) && !isGoalMovement(t))
    .reduce((s, t) => s + Number(t.amount), 0);

  const futureExpenseTxs = transactions.filter(t => 
    t.type === 'expense' && 
    t.status === 'pending' && 
    t.date >= todayStr &&
    t.date <= dateRange.endDate &&
    !isTransferMovement(t) &&
    !isGoalMovement(t)
  );
  const totalKnownFutureExpenses = futureExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);

  const futureEssentialTotal = futureExpenseTxs.filter(t => isEssentialExpense(t, categories, debts, financialSettings)).reduce((s, t) => s + Number(t.amount), 0);
  const futureDebtTotal = futureExpenseTxs.filter(t => isDebtExpense(t, debts, categories)).reduce((s, t) => s + Number(t.amount), 0);
  const futureRecurringTotal = futureExpenseTxs.filter(t => (t.isFixed || Boolean(t.fixedGroupId)) && !isEssentialExpense(t, categories, debts, financialSettings) && !isDebtExpense(t, debts, categories)).reduce((s, t) => s + Number(t.amount), 0);
  const futureProfTotal = futureExpenseTxs.filter(t => isProfessionalInvestmentExpense(t, categories, financialSettings)).reduce((s, t) => s + Number(t.amount), 0);
  const futureDiscretionaryTotal = futureExpenseTxs.filter(t => isDiscretionaryExpense(t, categories, debts, financialSettings)).reduce((s, t) => s + Number(t.amount), 0);

  // -------------------------------------------------------------------------
  // 5. DETALHAMENTO DE DÍVIDAS
  // Colunas solicitadas:
  // saldo restante | valor da parcela | parcelas já pagas | parcelas restantes | mês previsto para término
  // -------------------------------------------------------------------------
  interface DebtDetail {
    debt: Debt;
    remainingAmount: number | null;
    monthlyInstallment: number | null;
    paidCount: number | null;
    remainingCount: number | null;
    totalCount: number | null;
    endMonthYear: string;
  }

  const debtDetails: DebtDetail[] = debts.map(d => {
    const linkedTxs = transactions.filter(t => t.debtId === d.id);
    const paidTxs = linkedTxs.filter(t => t.status === 'paid');
    const pendingTxs = linkedTxs.filter(t => t.status === 'pending');

    const totalContract = Number(d.totalAmount) || 0;
    const paidPrincipal = paidTxs.reduce((s, t) => s + (Number(t.amount) - (Number(t.interest) || 0)), 0);

    let remainingAmount: number | null = null;
    if (totalContract > 0) {
      remainingAmount = Math.max(0, totalContract - paidPrincipal);
    } else if (pendingTxs.length > 0) {
      remainingAmount = pendingTxs.reduce((s, t) => s + Number(t.amount), 0);
    }

    let monthlyInstallment: number | null = null;
    if (d.installmentAmount && d.installmentAmount > 0) {
      monthlyInstallment = d.installmentAmount;
    } else if (pendingTxs.length > 0 && Number(pendingTxs[0].amount) > 0) {
      monthlyInstallment = Number(pendingTxs[0].amount);
    } else if (d.installmentCount && d.installmentCount > 0 && totalContract > 0) {
      monthlyInstallment = totalContract / d.installmentCount;
    }

    const totalCount = d.installmentCount || (linkedTxs.length > 0 ? linkedTxs.length : null);

    let paidCount: number | null = null;
    if (paidTxs.length > 0) {
      paidCount = paidTxs.length;
    } else if (totalCount !== null && pendingTxs.length > 0) {
      paidCount = Math.max(0, totalCount - pendingTxs.length);
    } else if (totalCount !== null) {
      paidCount = 0;
    }

    let remainingCount: number | null = null;
    if (totalCount !== null && paidCount !== null) {
      remainingCount = Math.max(0, totalCount - paidCount);
    } else if (pendingTxs.length > 0) {
      remainingCount = pendingTxs.length;
    }

    let endMonthYear = 'não informado';
    if (pendingTxs.length > 0) {
      const sortedPending = [...pendingTxs].sort((a, b) => a.date.localeCompare(b.date));
      const lastTx = sortedPending[sortedPending.length - 1];
      if (lastTx && lastTx.date) {
        endMonthYear = formatMonthYearBR(lastTx.date.slice(0, 7));
      }
    } else if (d.startDate && totalCount !== null && totalCount > 0) {
      try {
        const [sy, sm] = d.startDate.split('-').map(Number);
        if (sy && sm) {
          const endDate = new Date(sy, (sm - 1) + totalCount, 1);
          const ym = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
          endMonthYear = formatMonthYearBR(ym);
        }
      } catch {
        endMonthYear = 'não informado';
      }
    }

    return {
      debt: d,
      remainingAmount,
      monthlyInstallment: monthlyInstallment !== null ? Number(monthlyInstallment.toFixed(2)) : null,
      paidCount,
      remainingCount,
      totalCount,
      endMonthYear
    };
  });

  const totalDebtsRemaining = debtDetails.reduce((s, d) => s + (d.remainingAmount || 0), 0);
  const totalMonthlyDebtInstallments = debtDetails.reduce((s, d) => s + (d.monthlyInstallment || 0), 0);

  let debtReliefDateSummary = 'não informado';
  if (debtDetails.length > 0) {
    const validEnds = debtDetails.filter(d => d.endMonthYear !== 'não informado');
    if (validEnds.length > 0) {
      debtReliefDateSummary = validEnds[validEnds.length - 1].endMonthYear;
    }
  }

  // -------------------------------------------------------------------------
  // 6. CUSTO MENSAL OBRIGATÓRIO E RENDA RECORRENTE REAL
  // REGRA: R$ 2.079,82 e receitas rescisórias NÃO entram em renda mensal recorrente.
  // -------------------------------------------------------------------------
  const past3MonthsList: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    past3MonthsList.push(d.toISOString().slice(0, 7));
  }

  const pastEssentialExpenses = transactions.filter(t => 
    isEssentialExpense(t, categories, debts, financialSettings) && 
    past3MonthsList.some(m => t.date.startsWith(m)) &&
    t.status === 'paid'
  );
  const totalPastEssential = pastEssentialExpenses.reduce((s, t) => s + Number(t.amount), 0);
  const monthlyEssentialLifeCostAvg = past3MonthsList.length > 0 && totalPastEssential > 0
    ? totalPastEssential / past3MonthsList.length
    : 0;

  const thisMonthEssentialTotal = transactions
    .filter(t => isEssentialExpense(t, categories, debts, financialSettings) && t.date.startsWith(currentMonthPrefix))
    .reduce((s, t) => s + Number(t.amount), 0);

  const referenceMonthlyEssentialCost = thisMonthEssentialTotal > 0 
    ? thisMonthEssentialTotal 
    : (monthlyEssentialLifeCostAvg > 0 ? monthlyEssentialLifeCostAvg : 0);

  const thisMonthRecurringOther = transactions
    .filter(t => t.type === 'expense' && (t.isFixed || Boolean(t.fixedGroupId)) && !isEssentialExpense(t, categories, debts, financialSettings) && !isDebtExpense(t, debts, categories) && t.date.startsWith(currentMonthPrefix))
    .reduce((s, t) => s + Number(t.amount), 0);

  // Custo Mensal Total Obrigatório
  const totalMandatoryMonthlyCost = referenceMonthlyEssentialCost + totalMonthlyDebtInstallments + thisMonthRecurringOther;

  // RENDA MENSAL RECORRENTE REAL (Apenas receitas contínuas futuras, excluindo rescisões e extraordinárias)
  const activeFutureRecurringTxs = transactions.filter(t => 
    t.type === 'income' &&
    t.status === 'pending' &&
    t.date >= todayStr &&
    isRecurringIncome(t, categories) &&
    !isExtraordinaryIncome(t, categories) &&
    !isVariableWorkIncome(t, categories)
  );

  const activeFixedSeriesTxs = transactions.filter(t =>
    t.type === 'income' &&
    (t.isFixed || Boolean(t.fixedGroupId)) &&
    isRecurringIncome(t, categories) &&
    !isExtraordinaryIncome(t, categories) &&
    !isVariableWorkIncome(t, categories) &&
    Math.abs(Number(t.amount) - 2079.82) >= 0.05
  );

  let totalMonthlyRecurringIncome = 0;
  if (activeFutureRecurringTxs.length > 0) {
    totalMonthlyRecurringIncome = Number(activeFutureRecurringTxs[0].amount) || 0;
  } else if (activeFixedSeriesTxs.length > 0) {
    totalMonthlyRecurringIncome = Number(activeFixedSeriesTxs[0].amount) || 0;
  }

  const baseMonthlyBalance = totalMonthlyRecurringIncome - totalMandatoryMonthlyCost;

  let necessityOfShowsExplanation = 'Renda fixa recorrente cobre as despesas obrigatórias.';
  if (baseMonthlyBalance < 0) {
    const deficit = Math.abs(baseMonthlyBalance);
    if (avgProfitPerShow > 0) {
      const showsCount = (deficit / avgProfitPerShow).toFixed(1);
      necessityOfShowsExplanation = `Déficit mensal recorrente de ${formatBRL(deficit)}. Necessários ${showsCount} shows/mês (lucro médio de ${formatBRL(avgProfitPerShow)}) para custear as obrigações sem contar receitas extraordinárias.`;
    } else {
      necessityOfShowsExplanation = `Déficit mensal recorrente de ${formatBRL(deficit)}. Necessita de shows e renda variável para fechamento das contas.`;
    }
  }

  // -------------------------------------------------------------------------
  // 7. FLUXO MENSAL DOS PRÓXIMOS 6 MESES (CORRIGIDO)
  // REGRA:
  // - TODAS as receitas futuras cadastradas (Seguro-desemprego, FGTS 40%, rescisões, shows e salários)
  //   entram no mês em que estão previstas para receber!
  // - Saldo projetado considera TODAS as entradas e saídas previstas no período.
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
    extraordinaryIncomes: number;
    showIncomes: number;
    recurringIncomes: number;
    essentialExpenses: number;
    debtInstallments: number;
    otherObligations: number;
    totalOutflows: number;
    netResult: number;
    projectedEndBalance: number;
  }

  const monthlyFlowRows: MonthlyFlowRow[] = next6MonthsList.map((monthStr) => {
    const isCurrent = monthStr === currentMonthPrefix;

    // 1. ENTRADAS DO MÊS (TODAS AS ENTRADAS PREVISTAS: RECORRENTES, SHOWS E EXTRAORDINÁRIAS)
    const monthIncomeTxs = transactions.filter(t => 
      t.type === 'income' && 
      t.date.startsWith(monthStr) && 
      (isCurrent ? t.status === 'pending' && t.date >= todayStr : true) &&
      !isTransferMovement(t) &&
      !isGoalMovement(t)
    );

    let monthRecurringIncomes = 0;
    let monthExtraordinaryIncomes = 0;
    let monthShowIncomes = 0;

    monthIncomeTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (isExtraordinaryIncome(t, categories)) {
        monthExtraordinaryIncomes += amt;
      } else if (isVariableWorkIncome(t, categories)) {
        monthShowIncomes += amt;
      } else {
        monthRecurringIncomes += amt;
      }
    });

    // Shows contratados futuros com data neste mês a receber (caso não estejam lançados como transação pendente)
    const monthShows = showsContratadosFuturos.filter(s => s.date.startsWith(monthStr));
    monthShows.forEach(s => {
      const showToReceive = Math.max(0, (Number(s.totalCache) || 0) - (Number(s.cacheReceived) || 0));
      const hasShowTx = monthIncomeTxs.some(t => 
        isVariableWorkIncome(t, categories) || 
        (s.receipts && s.receipts.some(r => r.transactionId === t.id)) ||
        (t.description && t.description.toLowerCase().includes(s.name.toLowerCase()))
      );
      if (!hasShowTx && showToReceive > 0) {
        monthShowIncomes += showToReceive;
      }
    });

    // Total de entradas garantidas no mês
    const totalMonthInflows = monthRecurringIncomes + monthExtraordinaryIncomes + monthShowIncomes;

    // 2. DESPESAS ESSENCIAIS
    const monthEssentialTxs = transactions.filter(t => 
      isEssentialExpense(t, categories, debts, financialSettings) && 
      t.date.startsWith(monthStr) &&
      (isCurrent ? t.status === 'pending' && t.date >= todayStr : true)
    );
    let essentialExp = monthEssentialTxs.reduce((s, t) => s + Number(t.amount), 0);
    if (!isCurrent && essentialExp === 0 && referenceMonthlyEssentialCost > 0) {
      essentialExp = referenceMonthlyEssentialCost;
    }

    // 3. PARCELAS DE DÍVIDAS
    const monthDebtTxs = transactions.filter(t => 
      isDebtExpense(t, debts, categories) && 
      t.date.startsWith(monthStr) &&
      (isCurrent ? t.status === 'pending' && t.date >= todayStr : true)
    );
    let debtExp = monthDebtTxs.reduce((s, t) => s + Number(t.amount), 0);
    if (!isCurrent && debtExp === 0 && totalMonthlyDebtInstallments > 0) {
      // Verifica se as dívidas ainda estão ativas no mês em questão
      const activeInMonth = debtDetails.filter(d => {
        if (d.endMonthYear === 'não informado') return true;
        return d.endMonthYear >= formatMonthYearBR(monthStr);
      });
      debtExp = activeInMonth.reduce((s, d) => s + (d.monthlyInstallment || 0), 0);
    }

    // 4. OUTRAS OBRIGAÇÕES (Fixas recorrentes, investimentos profissionais e compromissos discricionários)
    const monthOtherTxs = transactions.filter(t => 
      t.type === 'expense' && 
      t.date.startsWith(monthStr) &&
      (isCurrent ? t.status === 'pending' && t.date >= todayStr : true) &&
      !isEssentialExpense(t, categories, debts, financialSettings) &&
      !isDebtExpense(t, debts, categories) &&
      !isTransferMovement(t) &&
      !isGoalMovement(t)
    );
    let otherObligations = monthOtherTxs.reduce((s, t) => s + Number(t.amount), 0);
    if (!isCurrent && otherObligations === 0 && thisMonthRecurringOther > 0) {
      otherObligations = thisMonthRecurringOther;
    }

    const totalMonthOutflows = essentialExp + debtExp + otherObligations;
    const netResult = totalMonthInflows - totalMonthOutflows;
    runningProjectedBalance += netResult;

    return {
      monthStr,
      monthLabel: formatMonthYearBR(monthStr),
      guaranteedIncomes: Number(totalMonthInflows.toFixed(2)),
      extraordinaryIncomes: Number(monthExtraordinaryIncomes.toFixed(2)),
      showIncomes: Number(monthShowIncomes.toFixed(2)),
      recurringIncomes: Number(monthRecurringIncomes.toFixed(2)),
      essentialExpenses: Number(essentialExp.toFixed(2)),
      debtInstallments: Number(debtExp.toFixed(2)),
      otherObligations: Number(otherObligations.toFixed(2)),
      totalOutflows: Number(totalMonthOutflows.toFixed(2)),
      netResult: Number(netResult.toFixed(2)),
      projectedEndBalance: Number(runningProjectedBalance.toFixed(2))
    };
  });

  const finalProjectedBalanceAtHorizon = monthlyFlowRows[monthlyFlowRows.length - 1]?.projectedEndBalance ?? runningProjectedBalance;

  // -------------------------------------------------------------------------
  // 8. CAPACIDADE DE COMPRA (BASEADA NO FLUXO E RESERVA CONFIGURADA)
  // -------------------------------------------------------------------------
  const minProjectedBalance = Math.min(...monthlyFlowRows.map(r => r.projectedEndBalance));

  const monthsOfSurvivalCurrentCash = totalMandatoryMonthlyCost > 0 
    ? Number((totalAvailableOperationalToday / totalMandatoryMonthlyCost).toFixed(1)) 
    : 'não informado';

  // Parâmetros de reserva configurados pelo usuário
  const userConfiguredMinReserve = financialSettings?.minReserveAmount !== undefined
    ? Number(financialSettings.minReserveAmount)
    : 5000;
  const targetReserveMonths = financialSettings?.targetReserveMonths !== undefined
    ? Number(financialSettings.targetReserveMonths)
    : 6;

  const targetReserveFromMonths = referenceMonthlyEssentialCost > 0 
    ? targetReserveMonths * referenceMonthlyEssentialCost 
    : 0;
  const targetSafetyReserveTotal = Math.max(userConfiguredMinReserve, targetReserveFromMonths);
  const reserveDeficit = Math.max(0, targetSafetyReserveTotal - totalMoneyReserved);

  let safePurchaseMargin = 0;
  // O usuário só pode comprar à vista se houver caixa livre imediato E o menor saldo projetado for positivo
  const maxSafeCash = Math.min(immediateFreeCash, minProjectedBalance);

  if (maxSafeCash > 0) {
    if (reserveDeficit === 0) {
      // Reserva mínima 100% atingida nos cofrinhos/poupança!
      safePurchaseMargin = Math.max(0, Math.round(maxSafeCash * 0.7));
    } else {
      // O excedente de caixa operacional precisa cobrir o déficit da reserva antes de liberar compras discricionárias
      const cashAfterReserveGap = Math.max(0, maxSafeCash - reserveDeficit);
      safePurchaseMargin = Math.max(0, Math.round(cashAfterReserveGap * 0.7));
    }
  }

  // Margem para novas parcelas mensais
  const minMonthlyNetSurplus = Math.min(...monthlyFlowRows.map(r => r.netResult));
  const safeMonthlyInstallmentMargin = (minMonthlyNetSurplus > 0 && minProjectedBalance > 0)
    ? Math.max(0, Math.round(minMonthlyNetSurplus * 0.5))
    : 0;

  // -------------------------------------------------------------------------
  // MONTAGEM DO DOCUMENTO EM TEXTO PURO
  // ESTRUTURA PRIORITÁRIA:
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

  // RESUMO EXECUTIVO
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
  lines.push(`  - Reserva mínima desejada configurada: ${formatBRL(userConfiguredMinReserve)}`);
  lines.push(`  - Meta por meses essenciais (${targetReserveMonths} meses): ${formatBRL(targetReserveFromMonths)}`);
  lines.push(`  - Meta total adotada para reserva: ${formatBRL(targetSafetyReserveTotal)}`);
  lines.push(`  - Status da reserva: ${reserveDeficit === 0 ? 'Meta atingida (100% segura)' : `Déficit de ${formatBRL(reserveDeficit)} para atingir a meta`}`);
  lines.push(`• Compromissos imediatos (contas a vencer no mês atual): ${formatBRL(totalImmediateCommitments)}`);
  lines.push(`• Caixa livre imediato (disponível - compromissos imediatos): ${formatBRL(immediateFreeCash)}`);
  lines.push(`• Patrimônio líquido total (disponível + reservado): ${formatBRL(totalNetWorth)}`);
  lines.push('NOTA METODOLÓGICA: Cofrinhos e poupança NÃO são despesas nem dinheiro livre para consumo corrente; representam patrimônio reservado e protegido.');

  // SEÇÃO 2: ENTRADAS FUTURAS
  lines.push('');
  lines.push('============================================================');
  lines.push('2. ENTRADAS FUTURAS');
  lines.push('============================================================');
  lines.push(`• Total de receitas futuras garantidas no período: ${formatBRL(totalGuaranteedFutureIncome)}`);
  lines.push(`  - Rendas fixas / recorrentes certas: ${formatBRL(totalFutureRecurringGuaranteed - futureShowsCoveredInTxs)}`);
  lines.push(`  - Cachês de shows contratados a receber: ${formatBRL(totalFutureShowsToReceive)}`);
  lines.push(`  - Receitas extraordinárias futuras programadas: ${formatBRL(totalFutureExtraordinaryIncome)}`);
  
  lines.push('');
  lines.push('RESUMO DA RENDA VARIÁVEL DE SHOWS:');
  lines.push('Shows contratados | Valor a receber | Custos previstos | Lucro esperado | Lucro médio por show');
  lines.push('------------------|-----------------|------------------|----------------|---------------------');
  const showsLabel = `${showsContratadosFuturos.length} show(s)`.padEnd(17);
  const showToRecStr = formatBRL(totalFutureShowsToReceive).padStart(17);
  const showCostsStr = formatBRL(totalFutureShowsCosts).padStart(18);
  const showProfitStr = formatBRL(totalFutureShowsExpectedProfit).padStart(16);
  const showAvgStr = (avgProfitPerShow > 0 ? formatBRL(avgProfitPerShow) : 'não informado').padStart(21);
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
  lines.push(`• Receitas futuras estimadas (incertas / não confirmadas): ${formatBRL(totalFutureEstimated)}`);

  lines.push('');
  lines.push('RECEITAS EXTRAORDINÁRIAS IDENTIFICADAS NO PERÍODO:');
  lines.push('NOTA METODOLÓGICA: Seguro-desemprego, Multa de 40% do FGTS, rescisões e bônus NÃO entram na renda mensal recorrente contínua, mas entram normalmente no fluxo de caixa e no saldo projetado dos meses em que estão previstos.');
  if (futureExtraordinaryIncomes.length === 0) {
    lines.push('Nenhuma receita extraordinária futura programada.');
  } else {
    futureExtraordinaryIncomes.forEach(t => {
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
  lines.push('NOTA: Transferências internas entre contas e aportes em cofrinhos foram desconsiderados (não representam despesa).');

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
  lines.push(`• Renda mensal fixa recorrente futura: ${formatBRL(totalMonthlyRecurringIncome)}`);
  lines.push(`• Balanço mensal base recorrente (renda fixa - custo obrigatório): ${baseMonthlyBalance >= 0 ? '+' : ''}${formatBRL(baseMonthlyBalance)}`);
  lines.push(`• Diagnóstico da renda variável: ${necessityOfShowsExplanation}`);
  lines.push('NOTA METODOLÓGICA: Valores rescisórios passados (como rescisão/saldo recebido) e parcelas de seguro-desemprego/FGTS não constam na renda mensal recorrente contínua.');

  // SEÇÃO 5: DÍVIDAS
  lines.push('');
  lines.push('============================================================');
  lines.push('5. DÍVIDAS');
  lines.push('============================================================');
  if (debtDetails.length === 0) {
    lines.push('Nenhuma dívida ou parcelamento ativo cadastrado.');
  } else {
    lines.push('Dívida                        | Saldo restante | Valor da parcela | Parcelas pagas | Parcelas restantes | Mês término');
    lines.push('------------------------------|----------------|------------------|----------------|--------------------|------------');
    debtDetails.forEach(dd => {
      const name = dd.debt.name.slice(0, 28).padEnd(28);
      const bal = (dd.remainingAmount !== null ? formatBRL(dd.remainingAmount) : 'não informado').padStart(14);
      const parc = (dd.monthlyInstallment !== null ? formatBRL(dd.monthlyInstallment) : 'não informado').padStart(16);
      const paid = (dd.paidCount !== null ? String(dd.paidCount) : 'não informado').padStart(14);
      const rest = (dd.remainingCount !== null ? String(dd.remainingCount) : 'não informado').padStart(18);
      const end = dd.endMonthYear.slice(0, 15).padEnd(15);
      lines.push(`${name} | ${bal} | ${parc} | ${paid} | ${rest} | ${end}`);
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

  lines.push('');
  lines.push('DETALHAMENTO DAS ENTRADAS E SAÍDAS POR MÊS:');
  monthlyFlowRows.forEach(row => {
    const parts: string[] = [];
    if (row.recurringIncomes > 0) parts.push(`Recorrentes: ${formatBRL(row.recurringIncomes)}`);
    if (row.showIncomes > 0) parts.push(`Shows: ${formatBRL(row.showIncomes)}`);
    if (row.extraordinaryIncomes > 0) parts.push(`Extraordinárias (Seguro-desemprego/FGTS): ${formatBRL(row.extraordinaryIncomes)}`);
    const inDetail = parts.length > 0 ? parts.join(' | ') : 'Sem entradas programadas';
    lines.push(`• ${row.monthLabel.toUpperCase()}:`);
    lines.push(`  - Entradas (${formatBRL(row.guaranteedIncomes)}): ${inDetail}`);
    lines.push(`  - Saídas   (${formatBRL(row.totalOutflows)}): Essenciais: ${formatBRL(row.essentialExpenses)} | Dívidas: ${formatBRL(row.debtInstallments)} | Outras: ${formatBRL(row.otherObligations)}`);
    lines.push(`  - Resultado do Mês: ${row.netResult >= 0 ? '+' : ''}${formatBRL(row.netResult)} | Saldo Projetado ao Fim: ${formatBRL(row.projectedEndBalance)}`);
  });

  const deficitMonths = monthlyFlowRows.filter(r => r.netResult < 0 || r.projectedEndBalance < 0);
  if (deficitMonths.length > 0) {
    lines.push('');
    lines.push('ALERTAS DE FLUXO:');
    deficitMonths.forEach(dm => {
      if (dm.projectedEndBalance < 0) {
        lines.push(`• CRÍTICO EM ${dm.monthLabel.toUpperCase()}: Saldo projetado fica negativo em ${formatBRL(dm.projectedEndBalance)}.`);
      } else {
        lines.push(`• ATENÇÃO EM ${dm.monthLabel.toUpperCase()}: Déficit de ${formatBRL(Math.abs(dm.netResult))} no mês, suprido pelo saldo acumulado de meses anteriores.`);
      }
    });
  }

  // SEÇÃO 7: CAPACIDADE DE COMPRA
  lines.push('');
  lines.push('============================================================');
  lines.push('7. CAPACIDADE DE COMPRA');
  lines.push('============================================================');
  lines.push(`• Saldo final projetado ao fim dos 6 meses: ${formatBRL(finalProjectedBalanceAtHorizon)}`);
  lines.push(`• Menor saldo operacional projetado no período: ${formatBRL(minProjectedBalance)}`);
  lines.push(`• Meses de sobrevivência com o caixa atual: ${typeof monthsOfSurvivalCurrentCash === 'number' ? `${monthsOfSurvivalCurrentCash} meses` : monthsOfSurvivalCurrentCash}`);
  lines.push(`• Reserva de Segurança Configurada:`);
  lines.push(`  - Reserva mínima desejada: ${formatBRL(userConfiguredMinReserve)}`);
  lines.push(`  - Quantidade de meses de reserva desejada: ${targetReserveMonths} meses (${formatBRL(targetReserveFromMonths)} em custos essenciais)`);
  lines.push(`  - Meta total de proteção: ${formatBRL(targetSafetyReserveTotal)}`);
  lines.push(`  - Saldo já reservado hoje: ${formatBRL(totalMoneyReserved)} (${targetSafetyReserveTotal > 0 ? ((totalMoneyReserved / targetSafetyReserveTotal) * 100).toFixed(0) : 100}% coberto)`);
  lines.push(`• MARGEM SEGURA PARA NOVAS COMPRAS À VISTA: ${formatBRL(safePurchaseMargin)}`);
  lines.push(`  (Teto máximo que pode ser gasto à vista hoje sem comprometer contas imediatas, sem negativar o caixa em nenhum dos próximos 6 meses e preservando a reserva configurada)`);
  lines.push(`• MARGEM PARA NOVA PARCELA MENSAL: ${formatBRL(safeMonthlyInstallmentMargin)}/mês`);
  lines.push(`  (Valor máximo de prestação mensal adicional que o fluxo suporta sem gerar déficit)`);

  lines.push('');
  lines.push('ORIENTAÇÃO DIRETA PARA A IA:');
  if (safePurchaseMargin > 0) {
    lines.push(`O usuário PODE realizar novas compras à vista de até ${formatBRL(safePurchaseMargin)}. Esse valor respeita o fluxo de caixa, não compromete nenhuma conta imediata nem futura e mantém a reserva mínima configurada intacta.`);
  } else {
    lines.push(`O usuário NÃO DEVE fazer compras supérfluas no momento. O caixa disponível está comprometido com contas imediatas, a reserva mínima configurada (${formatBRL(targetSafetyReserveTotal)}) ainda não está plenamente guarnecida ou há meses com fluxo deficitário.`);
  }
  lines.push('============================================================');
  lines.push('FIM DO RELATÓRIO');
  lines.push('============================================================');

  return lines.join('\n');
};
