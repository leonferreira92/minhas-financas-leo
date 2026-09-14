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

// Formatação de Mês/Ano
export const formatMonthYearBR = (yearMonthStr: string): string => {
  if (!yearMonthStr) return '';
  const [y, m] = yearMonthStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, 15);
  const name = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return name.charAt(0).toUpperCase() + name.slice(1);
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
        label: `Situação Atual + Próximos 6 Meses (Recomendado para Decisão)`,
        monthsCount: 6
      };
    }
    case 'current': {
      // Situação atual (mês corrente)
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return {
        startDate: start,
        endDate: end,
        label: `Situação Atual (${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`,
        monthsCount: 1
      };
    }
    case 'this_month': {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return {
        startDate: start,
        endDate: end,
        label: `Este Mês (${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`,
        monthsCount: 1
      };
    }
    case 'next_month': {
      const start = new Date(year, month + 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 2, 0).toISOString().slice(0, 10);
      const nextMonthDate = new Date(year, month + 1, 1);
      return {
        startDate: start,
        endDate: end,
        label: `Próximo Mês (${nextMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})`,
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
// REGRAS E FUNÇÕES DE CLASSIFICAÇÃO INTELIGENTE DE TRANSAÇÕES
// =========================================================================

/**
 * 1. Identifica se a receita é EXTRAORDINÁRIA (não recorrente, pontual/excepcional).
 * Exemplos: Rescisão, FGTS, Seguro-Desemprego, Venda de Bem/Usados, Restituição IRPF, Bônus excepcional.
 * REGRA CRÍTICA: Receitas extraordinárias NÃO entram na média de renda mensal recorrente.
 */
export const isExtraordinaryIncome = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  
  // Categorias específicas
  if (t.categoryId === 'cat_24' || t.categoryId === 'cat_25') return true; // Bônus / PLR, Venda de Usados
  
  const cat = categories.find(c => c.id === t.categoryId);
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
    catName.includes('venda de usado')
  ) {
    return true;
  }

  // Palavras-chave na descrição
  const desc = (t.description || '').toLowerCase();
  const keywords = [
    'rescisão', 'rescisao', 'fgts', 'seguro-desemprego', 'seguro desemprego',
    'multa rescisória', 'multa rescisoria', 'restituição', 'restituicao',
    'indenização', 'indenizacao', 'herança', 'heranca', 'acordo trabalhista',
    'venda de bem', 'venda de bens', 'venda de carro', 'venda de moto',
    'venda de instrumento', 'venda de equipamento', 'plr', 'bônus', 'bonus pontual',
    'acordo judicial', 'extraordin'
  ];

  return keywords.some(k => desc.includes(k));
};

/**
 * 2. Identifica se a receita é de RENDA VARIÁVEL DE TRABALHO (Shows, Cachês, Eventos, Freelances).
 */
export const isVariableWorkIncome = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  if (t.categoryId === 'cat_33') return true; // Categoria Shows / Cachês
  
  const cat = categories.find(c => c.id === t.categoryId);
  const catName = (cat?.name || '').toLowerCase();
  if (catName.includes('show') || catName.includes('cachê') || catName.includes('cache')) {
    return true;
  }

  const desc = (t.description || '').toLowerCase();
  const keywords = ['show', 'cachê', 'cache', 'evento', 'apresentação', 'apresentacao', 'couvert', 'freela', 'freelance', 'palestra'];
  return keywords.some(k => desc.includes(k));
};

/**
 * 3. Identifica se a receita é RECORRENTE / FIXA GARANTIDA (Salário, Pró-Labore, Rendimentos regulares).
 */
export const isRecurringIncome = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  if (isExtraordinaryIncome(t, categories)) return false;
  if (isVariableWorkIncome(t, categories)) return false;

  if (t.isFixed || Boolean(t.fixedGroupId)) return true;
  if (t.categoryId === 'cat_6' || t.categoryId === 'cat_7' || t.categoryId === 'cat_32') return true;

  const cat = categories.find(c => c.id === t.categoryId);
  const catName = (cat?.name || '').toLowerCase();
  return catName.includes('salário') || catName.includes('salario') || catName.includes('pró-labore') || catName.includes('pro-labore');
};

/**
 * 4. Determina se uma receita futura é GARANTIDA / CONTRATADA vs PROJETADA / INCERTA.
 */
export const isIncomeGuaranteed = (t: Transaction, shows: Show[], categories: Category[]): boolean => {
  if (t.type !== 'income') return false;
  
  // Se já foi paga, o dinheiro já foi efetivado
  if (t.status === 'paid') return true;

  // Se vinculada a um Show, verificar status do Show ou do Recebimento
  const linkedShow = shows.find(s => 
    s.receipts && s.receipts.some(r => r.transactionId === t.id)
  );

  if (linkedShow) {
    if (linkedShow.status === 'Confirmado' || linkedShow.status === 'Realizado') {
      return true;
    }
    // Shows com status 'Agendado' ainda são estimativas/incertas
    return false;
  }

  // Receitas fixas/recorrentes e salários são garantidas
  if (isRecurringIncome(t, categories)) return true;

  // Receitas com descrição explícita de contrato ou confirmação
  const desc = (t.description || '').toLowerCase();
  if (desc.includes('estimativa') || desc.includes('projeção') || desc.includes('projecao') || desc.includes('incerto')) {
    return false;
  }

  // Por padrão, se está agendada como receita normal no app e não é show em aberto, trata como confirmada/garantida
  return true;
};

/**
 * 5. Identifica se uma despesa é PARCELA DE DÍVIDA / FINANCIAMENTO / EMPRÉSTIMO.
 */
export const isDebtExpense = (t: Transaction, debts: Debt[], categories: Category[]): boolean => {
  if (t.type !== 'expense') return false;
  if (t.debtId) return true;
  if (t.installmentNumber !== undefined && t.installmentNumber > 0) return true;
  
  const desc = (t.description || '').toLowerCase();
  if (/\(\d+\/\d+\)/.test(desc)) return true; // Padrão (1/12)
  if (desc.startsWith('entrada - ') && debts.some(d => desc.includes(d.name.toLowerCase()))) return true;

  const cat = categories.find(c => c.id === t.categoryId);
  const catName = (cat?.name || '').toLowerCase();
  if (catName.includes('empréstimo') || catName.includes('emprestimo') || catName.includes('financiamento') || catName.includes('dívida') || catName.includes('divida')) {
    return true;
  }

  return false;
};

/**
 * 6. Identifica se uma despesa é INVESTIMENTO PROFISSIONAL (Equipamentos de trabalho, ferramentas, manutenção musical).
 * REGRA CRÍTICA: Não classificar investimentos profissionais como simples lazer ou compras discricionárias.
 */
export const isProfessionalInvestmentExpense = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'expense') return false;

  const cat = categories.find(c => c.id === t.categoryId);
  if (cat?.classification === 'professional') return true;

  const desc = (t.description || '').toLowerCase();
  const keywords = [
    'equipamento', 'instrumento', 'ferramenta', 'manutenção de instrumento',
    'manutencao de instrumento', 'guitarra', 'violão', 'violao', 'baixo',
    'bateria', 'teclado', 'amplificador', 'microfone', 'cabo', 'pedal',
    'pedaleira', 'som profissional', 'iluminação', 'iluminacao', 'estúdio',
    'estudio', 'ensaio', 'gravação', 'gravacao', 'figurino', 'marketing musical',
    'tráfego pago', 'trafego pago', 'divulgação musical', 'divulgacao musical'
  ];

  return keywords.some(k => desc.includes(k));
};

/**
 * 7. Identifica se uma despesa é ESSENCIAL (custo básico de sobrevivência).
 * Aluguel, condomínio, alimentação, água, luz, internet, transporte, saúde, farmácia.
 */
export const isEssentialExpense = (t: Transaction, categories: Category[], debts: Debt[]): boolean => {
  if (t.type !== 'expense') return false;
  if (isDebtExpense(t, debts, categories)) return false;
  if (isProfessionalInvestmentExpense(t, categories)) return false;

  const cat = categories.find(c => c.id === t.categoryId);
  if (cat?.classification === 'essential') return true;

  const catName = (cat?.name || '').toLowerCase();
  const essentialKeywords = [
    'mercado', 'aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua',
    'gás', 'gas', 'internet', 'celular', 'telefone', 'saúde', 'saude',
    'farmácia', 'farmacia', 'plano de saúde', 'transporte', 'combustível',
    'combustivel', 'seguro', 'imposto'
  ];

  return essentialKeywords.some(k => catName.includes(k));
};

/**
 * 8. Identifica se a movimentação é NEUTRA (transferência entre contas ou movimentação de cofrinho).
 */
export const isNeutralMovement = (t: Transaction): boolean => {
  return t.type === 'transfer' || t.type === 'goal_deposit' || t.type === 'goal_withdraw' || t.categoryId === 'cat_transfer';
};

// =========================================================================
// MOTOR PRINCIPAL DE GERAÇÃO DO NOVO RELATÓRIO
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

  // Helpers
  const getCatName = (catId: string) => categories.find(c => c.id === catId)?.name || 'Geral';
  const getAccountName = (accId: string) => accounts.find(a => a.id === accId)?.name || 'Conta';

  // -------------------------------------------------------------------------
  // 1. DINHEIRO HOJE E SEPARAÇÃO DOS "BUCKETS" DE CAPITAL
  // -------------------------------------------------------------------------
  const accountsWithBalances = accounts.map(acc => ({
    ...acc,
    currentBalance: getAccountBalance(acc.id)
  }));

  // Separar Contas Operacionais (dinheiro disponível agora) de Contas de Reserva/Poupança
  const operationalAccounts = accountsWithBalances.filter(
    a => !(a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('economia') || a.name.toLowerCase().includes('cofrinho'))
  );
  const savingsAccounts = accountsWithBalances.filter(
    a => (a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('economia') || a.name.toLowerCase().includes('cofrinho'))
  );

  const totalAvailableOperationalToday = operationalAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalInSavingsAccounts = savingsAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

  // Dinheiro reservado em Metas / Cofrinhos
  const totalReservedInGoals = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  
  // Total de dinheiro reservado (cofrinhos + contas poupança)
  const totalMoneyReserved = Math.max(totalReservedInGoals, totalInSavingsAccounts + totalReservedInGoals);

  // Patrimônio total líquido (dinheiro operacional + dinheiro reservado)
  const totalNetWorth = totalAvailableOperationalToday + totalMoneyReserved;

  // -------------------------------------------------------------------------
  // 2. COMPROMISSOS IMEDIATOS (A VENCER NO MÊS ATUAL / PRÓXIMOS 30 DIAS)
  // -------------------------------------------------------------------------
  const immediatePendingExpenses = transactions.filter(t => {
    if (t.type !== 'expense' || t.status !== 'pending') return false;
    // Considera vencidas até hoje ou com vencimento até o fim do mês corrente
    return t.date <= todayStr || t.date.startsWith(currentMonthPrefix);
  });
  const totalImmediateCommitments = immediatePendingExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

  // Caixa livre imediato após compromissos imediatos
  const immediateFreeCash = totalAvailableOperationalToday - totalImmediateCommitments;

  // -------------------------------------------------------------------------
  // 3. ANÁLISE DE DÍVIDAS E PARCELAMENTOS
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
    nextDueDate: string;
    endMonthYear: string;
    hasInsufficientData: boolean;
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

    // Próximo vencimento
    const sortedPending = [...pendingTxs].sort((a, b) => a.date.localeCompare(b.date));
    const nextDueDate = sortedPending[0]?.date || 'Não agendada';

    // Mês de término
    let endMonthYear = 'DADOS INSUFICIENTES';
    if (sortedPending.length > 0) {
      const lastTx = sortedPending[sortedPending.length - 1];
      endMonthYear = formatMonthYearBR(lastTx.date.slice(0, 7));
    } else if (d.startDate && remainingCount > 0) {
      const [sy, sm] = d.startDate.split('-').map(Number);
      const endDate = new Date(sy, (sm - 1) + (totalCount || 1), 1);
      endMonthYear = endDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    const hasInsufficientData = totalContract === 0 && linkedTxs.length === 0;

    return {
      debt: d,
      totalAmount: totalContract,
      paidAmount: paidPrincipal,
      remainingAmount,
      monthlyInstallment: Number(monthlyInstallment.toFixed(2)),
      paidCount,
      remainingCount,
      totalCount,
      nextDueDate,
      endMonthYear,
      hasInsufficientData
    };
  });

  const totalDebtsRemaining = debtDetails.reduce((s, d) => s + d.remainingAmount, 0);
  const totalMonthlyDebtInstallments = debtDetails.reduce((s, d) => s + d.monthlyInstallment, 0);

  // Quando a maior parte das parcelas termina
  let debtReliefDateSummary = 'DADOS INSUFICIENTES';
  if (debtDetails.length > 0) {
    const validEnds = debtDetails.filter(d => d.endMonthYear !== 'DADOS INSUFICIENTES');
    if (validEnds.length > 0) {
      debtReliefDateSummary = validEnds[validEnds.length - 1].endMonthYear;
    }
  }

  // -------------------------------------------------------------------------
  // 4. CRONOGRAMA DE REDUÇÃO DAS DÍVIDAS (MÊS A MÊS NOS PRÓXIMOS 6 MESES)
  // -------------------------------------------------------------------------
  const nextMonthsList: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    nextMonthsList.push(d.toISOString().slice(0, 7));
  }

  const debtScheduleByMonth = nextMonthsList.map(monthStr => {
    // Busca todas as parcelas pendentes com data neste mês
    const monthDebtTxs = transactions.filter(t => 
      isDebtExpense(t, debts, categories) && 
      t.date.startsWith(monthStr) &&
      (monthStr === currentMonthPrefix ? t.status === 'pending' : true)
    );
    const totalMonthParcelas = monthDebtTxs.reduce((s, t) => s + Number(t.amount), 0);
    return {
      monthStr,
      monthLabel: formatMonthYearBR(monthStr),
      totalInstallments: Number(totalMonthParcelas.toFixed(2)),
      count: monthDebtTxs.length
    };
  });

  // -------------------------------------------------------------------------
  // 5. CUSTO MENSAL REAL DA VIDA (ESSENCIAL + OBRIGATÓRIO)
  // -------------------------------------------------------------------------
  // Calcular média mensal de despesas essenciais
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
  const thisMonthEssentialTxs = transactions.filter(t => 
    isEssentialExpense(t, categories, debts) && 
    t.date.startsWith(currentMonthPrefix)
  );
  const thisMonthEssentialTotal = thisMonthEssentialTxs.reduce((s, t) => s + Number(t.amount), 0);

  // Valor de referência para Custo Médio Mensal da Vida (Essencial)
  const referenceMonthlyEssentialCost = thisMonthEssentialTotal > 0 
    ? thisMonthEssentialTotal 
    : (monthlyEssentialLifeCostAvg > 0 ? monthlyEssentialLifeCostAvg : 0);

  // Despesas Recorrentes Fixas Mensais (não essenciais e não dívidas)
  const recurringFixedExpenses = transactions.filter(t => 
    t.type === 'expense' && 
    (t.isFixed || Boolean(t.fixedGroupId)) &&
    !isDebtExpense(t, debts, categories) &&
    !isEssentialExpense(t, categories, debts) &&
    t.date.startsWith(currentMonthPrefix)
  );
  const totalMonthlyRecurringOther = recurringFixedExpenses.reduce((s, t) => s + Number(t.amount), 0);

  // CUSTO MENSAL TOTAL OBRIGATÓRIO = Essenciais + Parcelas de Dívidas + Recorrentes Fixas
  const totalMandatoryMonthlyCost = referenceMonthlyEssentialCost + totalMonthlyDebtInstallments + totalMonthlyRecurringOther;

  // -------------------------------------------------------------------------
  // 6. RENDA MENSAL RECORRENTE vs VARIÁVEL vs EXTRAORDINÁRIA
  // -------------------------------------------------------------------------
  // Renda Recorrente do mês (salário, pró-labore, fixo)
  const thisMonthRecurringIncomes = transactions.filter(t => 
    isRecurringIncome(t, categories) && 
    t.date.startsWith(currentMonthPrefix)
  );
  const totalMonthlyRecurringIncome = thisMonthRecurringIncomes.reduce((s, t) => s + Number(t.amount), 0);

  // Shows & Atividade Profissional (Histórico e Futuro)
  const allShows = shows || [];
  const showsRealizados = allShows.filter(s => s.status === 'Realizado');
  const showsContratadosFuturos = allShows.filter(s => 
    (s.status === 'Confirmado' || s.status === 'Agendado') && 
    s.date >= todayStr
  );

  let totalShowsGrossRevenue = 0;
  let totalShowsDirectCosts = 0;

  allShows.forEach(s => {
    const cache = Number(s.totalCache) || 0;
    totalShowsGrossRevenue += cache;
    const exp = s.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 };
    const costs = (Number(exp.fuel) || 0) + (Number(exp.food) || 0) + (Number(exp.toll) || 0) + (Number(exp.commission) || 0) + (Number(exp.others) || 0);
    totalShowsDirectCosts += costs;
  });

  const totalShowsNetProfit = totalShowsGrossRevenue - totalShowsDirectCosts;
  const avgProfitPerShow = allShows.length > 0 
    ? Number((totalShowsNetProfit / allShows.length).toFixed(2)) 
    : 0;
  const overallShowsMargin = totalShowsGrossRevenue > 0 
    ? Number(((totalShowsNetProfit / totalShowsGrossRevenue) * 100).toFixed(1)) 
    : 0;

  // Shows necessários por mês para cobrir o custo mensal obrigatório
  let showsNeededPerMonth: number | string = 'DADOS INSUFICIENTES PARA CALCULAR';
  if (avgProfitPerShow > 0 && totalMandatoryMonthlyCost > 0) {
    showsNeededPerMonth = Number((totalMandatoryMonthlyCost / avgProfitPerShow).toFixed(1));
  }

  // Renda Mensal Variável Média (baseada em shows e transações de cachês)
  const past3MonthsShowIncome = transactions.filter(t => 
    isVariableWorkIncome(t, categories) && 
    past3MonthsList.some(m => t.date.startsWith(m)) &&
    t.status === 'paid'
  );
  const avgMonthlyVariableIncome = past3MonthsList.length > 0 && past3MonthsShowIncome.length > 0
    ? past3MonthsShowIncome.reduce((s, t) => s + Number(t.amount), 0) / past3MonthsList.length
    : 0;

  // -------------------------------------------------------------------------
  // 7. RECEITAS FUTURAS (GARANTIDAS vs PROJETADAS vs EXTRAORDINÁRIAS)
  // -------------------------------------------------------------------------
  // Consideramos todas as transações de receita com data futura a partir de hoje
  const futureIncomeTxs = transactions.filter(t => 
    t.type === 'income' && 
    t.status === 'pending' && 
    t.date >= todayStr &&
    t.date <= dateRange.endDate
  );

  const guaranteedFutureIncomes: Transaction[] = [];
  const projectedFutureIncomes: Transaction[] = [];
  const extraordinaryIncomesFound: Transaction[] = [];

  futureIncomeTxs.forEach(t => {
    if (isExtraordinaryIncome(t, categories)) {
      extraordinaryIncomesFound.push(t);
    } else if (isIncomeGuaranteed(t, shows, categories)) {
      guaranteedFutureIncomes.push(t);
    } else {
      projectedFutureIncomes.push(t);
    }
  });

  const totalGuaranteedFutureIncome = guaranteedFutureIncomes.reduce((s, t) => s + Number(t.amount), 0);
  const totalProjectedFutureIncome = projectedFutureIncomes.reduce((s, t) => s + Number(t.amount), 0);

  // Todas as despesas futuras conhecidas no horizonte
  const futureExpenseTxs = transactions.filter(t => 
    t.type === 'expense' && 
    t.status === 'pending' && 
    t.date >= todayStr &&
    t.date <= dateRange.endDate
  );
  const totalKnownFutureExpenses = futureExpenseTxs.reduce((s, t) => s + Number(t.amount), 0);

  // Saldo Projetado ao fim do horizonte (Caixa Atual + Receitas Garantidas - Despesas Futuras)
  const finalProjectedBalanceAtHorizon = totalAvailableOperationalToday + totalGuaranteedFutureIncome - totalKnownFutureExpenses;

  // -------------------------------------------------------------------------
  // 8. CAPACIDADE FINANCEIRA E ANÁLISE DE COMPRAS
  // -------------------------------------------------------------------------
  // Meses de sobrevivência com o caixa atual: Dinheiro disponível hoje / Custo mensal obrigatório
  const monthsOfSurvivalCurrentCash = totalMandatoryMonthlyCost > 0 
    ? Number((totalAvailableOperationalToday / totalMandatoryMonthlyCost).toFixed(1)) 
    : 'DADOS INSUFICIENTES PARA CALCULAR';

  // Meses de sobrevivência com caixa atual + receitas garantidas dos próximos meses
  const monthsOfSurvivalWithGuaranteed = totalMandatoryMonthlyCost > 0 
    ? Number(((totalAvailableOperationalToday + totalGuaranteedFutureIncome) / totalMandatoryMonthlyCost).toFixed(1))
    : 'DADOS INSUFICIENTES PARA CALCULAR';

  // LIMITES DE COMPRA:
  // 1. Limite Absoluto: teto máximo sem negativar o caixa após compromissos imediatos
  const absoluteLimit = Math.max(0, immediateFreeCash);

  // 2. Limite Seguro: valor que pode ser gasto preservando 1 mês de sobrevivência essencial em caixa
  // ou 50% do caixa livre se já houver reserva em cofrinhos
  let safeLimit = 0;
  if (totalMoneyReserved >= referenceMonthlyEssentialCost) {
    // Se o usuário já possui reserva equivalente a pelo menos 1 mês em cofrinhos, o limite seguro pode ser 50% do caixa livre imediato
    safeLimit = Math.max(0, immediateFreeCash * 0.5);
  } else {
    // Se não tem reserva nos cofrinhos, preserva o custo de vida de 1 mês no caixa operacional
    safeLimit = Math.max(0, immediateFreeCash - referenceMonthlyEssentialCost);
  }

  // 3. Limite Recomendado: altamente prudente diante da renda variável (máx. 25% do caixa livre, ou 0 se fluxo projetado for deficitário)
  let recommendedLimit = 0;
  if (finalProjectedBalanceAtHorizon > 0 && immediateFreeCash > 0) {
    recommendedLimit = Math.max(0, safeLimit * 0.5);
  }

  // -------------------------------------------------------------------------
  // 9. MAPA MENSAL DE OBRIGAÇÕES (PRÓXIMOS 6 MESES - FLUXO DETALHADO)
  // -------------------------------------------------------------------------
  let runningCashBalance = totalAvailableOperationalToday;

  interface MonthlyMapItem {
    monthStr: string;
    monthLabel: string;
    guaranteedIncomes: number;
    showContractedIncomes: number;
    otherIncomes: number;
    totalInflows: number;
    essentialExpenses: number;
    debtInstallments: number;
    recurringExpenses: number;
    professionalExpenses: number;
    otherExpenses: number;
    totalOutflows: number;
    monthNetResult: number;
    projectedEndBalance: number;
  }

  const monthlyMap: MonthlyMapItem[] = nextMonthsList.map((monthStr, index) => {
    const isCurrentMonth = monthStr === currentMonthPrefix;

    // Entradas do mês:
    // Para o mês corrente: apenas o que ainda está pendente a receber
    // Para meses futuros: todas as receitas garantidas programadas para aquele mês
    const monthIncomeTxs = transactions.filter(t => 
      t.type === 'income' && 
      t.date.startsWith(monthStr) &&
      (isCurrentMonth ? t.status === 'pending' && t.date >= todayStr : true) &&
      !isExtraordinaryIncome(t, categories)
    );

    const guaranteedTxs = monthIncomeTxs.filter(t => isIncomeGuaranteed(t, shows, categories));
    const showTxs = guaranteedTxs.filter(t => isVariableWorkIncome(t, categories));
    const otherGuaranteedTxs = guaranteedTxs.filter(t => !isVariableWorkIncome(t, categories));

    const showContractedIncomes = showTxs.reduce((s, t) => s + Number(t.amount), 0);
    const otherIncomes = otherGuaranteedTxs.reduce((s, t) => s + Number(t.amount), 0);
    const totalInflows = showContractedIncomes + otherIncomes;

    // Saídas do mês:
    // Para o mês corrente: apenas o que ainda está pendente a pagar
    // Para meses futuros: todas as despesas programadas para aquele mês
    const monthExpenseTxs = transactions.filter(t => 
      t.type === 'expense' && 
      t.date.startsWith(monthStr) &&
      (isCurrentMonth ? t.status === 'pending' && t.date >= todayStr : true)
    );

    const essentialTxs = monthExpenseTxs.filter(t => isEssentialExpense(t, categories, debts));
    const debtTxs = monthExpenseTxs.filter(t => isDebtExpense(t, debts, categories));
    const profTxs = monthExpenseTxs.filter(t => isProfessionalInvestmentExpense(t, categories));
    const recTxs = monthExpenseTxs.filter(t => 
      (t.isFixed || Boolean(t.fixedGroupId)) && 
      !isEssentialExpense(t, categories, debts) && 
      !isDebtExpense(t, debts, categories)
    );
    const otherExpTxs = monthExpenseTxs.filter(t => 
      !isEssentialExpense(t, categories, debts) && 
      !isDebtExpense(t, debts, categories) &&
      !isProfessionalInvestmentExpense(t, categories) &&
      !(t.isFixed || Boolean(t.fixedGroupId))
    );

    // Se em mês futuro não há despesa essencial cadastrada, projeta a média essencial para não gerar falsa ilusão de sobra
    let essentialExpenses = essentialTxs.reduce((s, t) => s + Number(t.amount), 0);
    if (!isCurrentMonth && essentialExpenses === 0 && referenceMonthlyEssentialCost > 0) {
      essentialExpenses = referenceMonthlyEssentialCost;
    }

    const debtInstallments = debtTxs.reduce((s, t) => s + Number(t.amount), 0);
    const professionalExpenses = profTxs.reduce((s, t) => s + Number(t.amount), 0);
    const recurringExpenses = recTxs.reduce((s, t) => s + Number(t.amount), 0);
    const otherExpenses = otherExpTxs.reduce((s, t) => s + Number(t.amount), 0);

    const totalOutflows = essentialExpenses + debtInstallments + professionalExpenses + recurringExpenses + otherExpenses;
    const monthNetResult = totalInflows - totalOutflows;

    runningCashBalance = runningCashBalance + monthNetResult;

    return {
      monthStr,
      monthLabel: formatMonthYearBR(monthStr),
      guaranteedIncomes: totalInflows,
      showContractedIncomes,
      otherIncomes,
      totalInflows,
      essentialExpenses,
      debtInstallments,
      recurringExpenses,
      professionalExpenses,
      otherExpenses,
      totalOutflows,
      monthNetResult,
      projectedEndBalance: Number(runningCashBalance.toFixed(2))
    };
  });

  // -------------------------------------------------------------------------
  // 10. ALERTAS FINANCEIROS OBJETIVOS (SEM GENERICIDADES)
  // -------------------------------------------------------------------------
  const financialAlerts: string[] = [];

  // Alerta 1: Meses com fluxo projetado negativo
  const deficitMonths = monthlyMap.filter(m => m.monthNetResult < 0 || m.projectedEndBalance < 0);
  if (deficitMonths.length > 0) {
    deficitMonths.forEach(dm => {
      if (dm.projectedEndBalance < 0) {
        financialAlerts.push(
          `ALERTA CRÍTICO DE CAIXA NEGATIVO EM ${dm.monthLabel.toUpperCase()}: Saldo projetado negativo de ${formatBRL(dm.projectedEndBalance)}. As saídas obrigatórias de ${formatBRL(dm.totalOutflows)} superam o caixa inicial somado às receitas garantidas de ${formatBRL(dm.totalInflows)}.`
        );
      } else {
        financialAlerts.push(
          `FLUXO MENSAL DEFICITÁRIO EM ${dm.monthLabel.toUpperCase()}: Déficit de ${formatBRL(Math.abs(dm.monthNetResult))} no mês (Saídas obrigatórias de ${formatBRL(dm.totalOutflows)} vs Entradas garantidas de ${formatBRL(dm.totalInflows)}). O mês depende de novos shows ou do saldo residual de meses anteriores.`
        );
      }
    });
  } else {
    financialAlerts.push(
      `FLUXO DE CAIXA COBERTO: Nos próximos 6 meses mapeados, todas as saídas obrigatórias possuem cobertura matemática de receitas garantidas ou saldo de caixa.`
    );
  }

  // Alerta 2: Cobertura de sobrevivência
  if (typeof monthsOfSurvivalCurrentCash === 'number') {
    if (monthsOfSurvivalCurrentCash < 1.0) {
      financialAlerts.push(
        `COLCHÃO DE SEGURANÇA VULNERÁVEL: O dinheiro disponível hoje em caixa operacional cobre apenas ${monthsOfSurvivalCurrentCash} mês(es) de custo de vida obrigatório. Qualquer atraso de cachê trará pressão imediata de caixa.`
      );
    } else if (monthsOfSurvivalCurrentCash >= 3.0) {
      financialAlerts.push(
        `RESERVA OPERACIONAL SAUDÁVEL: O caixa disponível hoje garante ${monthsOfSurvivalCurrentCash} meses de sobrevivência mesmo sem novas receitas.`
      );
    }
  }

  // Alerta 3: Peso das parcelas de dívidas no orçamento
  if (totalMandatoryMonthlyCost > 0 && totalMonthlyDebtInstallments > 0) {
    const debtRatio = (totalMonthlyDebtInstallments / totalMandatoryMonthlyCost) * 100;
    if (debtRatio > 30) {
      financialAlerts.push(
        `COMPROMETIMENTO ELEVADO COM DÍVIDAS: As parcelas de dívidas (R$ ${formatBRL(totalMonthlyDebtInstallments)}/mês) comprometem ${debtRatio.toFixed(1)}% do custo mensal obrigatório. A maior parte das parcelas termina em ${debtReliefDateSummary}.`
      );
    }
  }

  // Alerta 4: Dependência de shows
  if (allShows.length > 0 && totalMandatoryMonthlyCost > 0) {
    if (typeof showsNeededPerMonth === 'number') {
      financialAlerts.push(
        `METRO DE FATURAMENTO PROFISSIONAL: São necessários ${showsNeededPerMonth} shows/mês com lucro médio de ${formatBRL(avgProfitPerShow)} para pagar todo o custo mensal obrigatório.`
      );
    }
  }

  // Alerta 5: Cofrinhos
  if (totalReservedInGoals === 0 && totalInSavingsAccounts === 0) {
    financialAlerts.push(
      `AUSÊNCIA DE RESERVA DE EMERGÊNCIA DEDICADA: Não há valores alocados em cofrinhos ou contas de reserva protegidas.`
    );
  }

  // =========================================================================
  // CONSTRUÇÃO DO DOCUMENTO EM TEXTO PURO SEGUINDO A ESPECIFICAÇÃO
  // =========================================================================
  const lines: string[] = [];

  // CABEÇALHO DO RELATÓRIO
  lines.push('============================================================');
  lines.push('RELATÓRIO FINANCEIRO PARA ANÁLISE POR IA');
  lines.push('============================================================');
  lines.push(`DATA DE GERAÇÃO: ${generationTimestamp}`);
  lines.push(`PERÍODO ANALISADO: ${dateRange.label}`);
  lines.push(`HORIZONTE TEMPORAL: ${formatDateBR(dateRange.startDate)} até ${formatDateBR(dateRange.endDate)}`);
  lines.push(`OBJETIVO: Diagnóstico para tomada de decisão financeira, capacidade de pagamento e limites de compras`);

  // SEÇÃO 1: RESUMO ATUAL (O PRIMEIRO BLOCO QUE A IA LÊ)
  lines.push('');
  lines.push('============================================================');
  lines.push('1. RESUMO ATUAL');
  lines.push('============================================================');
  lines.push(`Data de referência: ${formatDateBR(todayStr)}`);
  lines.push('');
  lines.push(`DINHEIRO HOJE (DISPONÍVEL EM CAIXA OPERACIONAL):`);
  lines.push(`${formatBRL(totalAvailableOperationalToday)}`);
  lines.push('');
  lines.push(`DINHEIRO RESERVADO (METAS E COFRINHOS - INTOCÁVEL):`);
  lines.push(`${formatBRL(totalMoneyReserved)}`);
  lines.push('');
  lines.push(`COMPROMISSOS IMEDIATOS (A VENCER NO MÊS / PRÓXIMOS 30 DIAS):`);
  lines.push(`${formatBRL(totalImmediateCommitments)}`);
  lines.push('');
  lines.push(`CAIXA LIVRE APÓS COMPROMISSOS IMEDIATOS:`);
  lines.push(`${formatBRL(immediateFreeCash)}`);
  lines.push('');
  lines.push(`DÍVIDAS/OBRIGAÇÕES RESTANTES (SALDO DEVEDOR TOTAL):`);
  lines.push(`${formatBRL(totalDebtsRemaining)}`);
  lines.push('');
  lines.push(`RECEITAS FUTURAS GARANTIDAS (NO HORIZONTE ANALISADO):`);
  lines.push(`${formatBRL(totalGuaranteedFutureIncome)}`);
  lines.push('');
  lines.push(`DESPESAS FUTURAS JÁ CONHECIDAS (NO HORIZONTE ANALISADO):`);
  lines.push(`${formatBRL(totalKnownFutureExpenses)}`);
  lines.push('');
  lines.push(`SALDO PROJETADO AO FIM DO HORIZONTE:`);
  lines.push(`${formatBRL(finalProjectedBalanceAtHorizon)}`);
  lines.push('');
  lines.push(`CUSTO MÉDIO MENSAL DA VIDA (ESSENCIAL):`);
  lines.push(`${formatBRL(referenceMonthlyEssentialCost)}`);
  lines.push('');
  lines.push(`PARCELAS MENSAIS DE DÍVIDAS:`);
  lines.push(`${formatBRL(totalMonthlyDebtInstallments)}`);
  lines.push('');
  lines.push(`CUSTO MENSAL TOTAL OBRIGATÓRIO (ESSENCIAIS + DÍVIDAS + RECORRENTES):`);
  lines.push(`${formatBRL(totalMandatoryMonthlyCost)}`);
  lines.push('');
  lines.push(`RENDA MENSAL RECORRENTE (FIXA/CERTA):`);
  lines.push(`${formatBRL(totalMonthlyRecurringIncome)}`);
  lines.push('');
  lines.push(`RENDA MENSAL VARIÁVEL MÉDIA (SHOWS/TRABALHOS):`);
  lines.push(`${formatBRL(avgMonthlyVariableIncome)}`);

  // SEÇÃO 2: DINHEIRO QUE VAI ENTRAR
  lines.push('');
  lines.push('============================================================');
  lines.push('2. DINHEIRO QUE VAI ENTRAR');
  lines.push('============================================================');
  
  lines.push('');
  lines.push('### RECEITAS GARANTIDAS / CONTRATADAS');
  if (guaranteedFutureIncomes.length === 0) {
    lines.push('Nenhuma receita futura garantida cadastrada no horizonte.');
  } else {
    lines.push('Data       | Descrição                           | Categoria          | Valor');
    lines.push('-----------|-------------------------------------|--------------------|--------------');
    guaranteedFutureIncomes.forEach(t => {
      const d = formatDateBR(t.date).padEnd(10);
      const desc = (t.description || 'Receita').slice(0, 35).padEnd(35);
      const cat = getCatName(t.categoryId).slice(0, 18).padEnd(18);
      const val = formatBRL(t.amount).padStart(12);
      lines.push(`${d} | ${desc} | ${cat} | ${val}`);
    });
  }
  lines.push(`TOTAL GARANTIDO: ${formatBRL(totalGuaranteedFutureIncome)}`);

  lines.push('');
  lines.push('### RECEITAS PROJETADAS / INCERTAS');
  if (projectedFutureIncomes.length === 0) {
    lines.push('Nenhuma receita projetada ou incerta registrada no período.');
  } else {
    lines.push('Data       | Descrição                           | Categoria          | Valor');
    lines.push('-----------|-------------------------------------|--------------------|--------------');
    projectedFutureIncomes.forEach(t => {
      const d = formatDateBR(t.date).padEnd(10);
      const desc = (t.description || 'Previsão').slice(0, 35).padEnd(35);
      const cat = getCatName(t.categoryId).slice(0, 18).padEnd(18);
      const val = formatBRL(t.amount).padStart(12);
      lines.push(`${d} | ${desc} | ${cat} | ${val}`);
    });
  }
  lines.push(`TOTAL PROJETADO: ${formatBRL(totalProjectedFutureIncome)}`);

  lines.push('');
  lines.push('### RECEITAS EXTRAORDINÁRIAS IDENTIFICADAS (ISOLADAS DA RENDA REGULAR)');
  lines.push('NOTA METODOLÓGICA: As receitas abaixo foram isoladas e NÃO compõem a renda mensal normal do usuário.');
  if (extraordinaryIncomesFound.length === 0) {
    lines.push('Nenhuma receita extraordinária (rescisão, FGTS, bônus pontual) registrada no horizonte.');
  } else {
    extraordinaryIncomesFound.forEach(t => {
      lines.push(`• [${formatDateBR(t.date)}] ${t.description} | ${getCatName(t.categoryId)}: ${formatBRL(t.amount)}`);
    });
  }

  // SEÇÃO 3: DINHEIRO QUE VAI SAIR
  lines.push('');
  lines.push('============================================================');
  lines.push('3. DINHEIRO QUE VAI SAIR');
  lines.push('============================================================');
  
  lines.push('');
  lines.push('### DESPESAS ESSENCIAIS MENSAIS');
  // Agrupar essenciais deste mês por categoria
  const essentialGrouped: Record<string, number> = {};
  thisMonthEssentialTxs.forEach(t => {
    const c = getCatName(t.categoryId);
    essentialGrouped[c] = (essentialGrouped[c] || 0) + Number(t.amount);
  });
  if (Object.keys(essentialGrouped).length === 0) {
    lines.push(`Custo mensal essencial estimado: ${formatBRL(referenceMonthlyEssentialCost)} (Baseado na média histórica)`);
  } else {
    Object.entries(essentialGrouped).forEach(([cat, val]) => {
      lines.push(`• ${cat.padEnd(25)}: ${formatBRL(val)}/mês`);
    });
  }
  lines.push(`TOTAL ESSENCIAL MENSAL: ${formatBRL(referenceMonthlyEssentialCost)}`);

  lines.push('');
  lines.push('### PARCELAS DE DÍVIDAS');
  if (debtDetails.length === 0) {
    lines.push('Nenhuma dívida ou parcelamento ativo cadastrado.');
  } else {
    lines.push('Dívida                        | Parcela       | Restantes  | Término          | Vencimento');
    lines.push('------------------------------|---------------|------------|------------------|-----------');
    debtDetails.forEach(dd => {
      const name = dd.debt.name.slice(0, 28).padEnd(28);
      const parc = formatBRL(dd.monthlyInstallment).padStart(13);
      const rest = `${dd.remainingCount}/${dd.totalCount || '?'}`.padStart(10);
      const end = dd.endMonthYear.slice(0, 16).padEnd(16);
      const due = formatDateBR(dd.nextDueDate).padEnd(10);
      lines.push(`${name} | ${parc} | ${rest} | ${end} | ${due}`);
    });
  }
  lines.push(`TOTAL MENSAL DE PARCELAS: ${formatBRL(totalMonthlyDebtInstallments)}`);

  lines.push('');
  lines.push('### DESPESAS RECORRENTES (FIXAS)');
  if (recurringFixedExpenses.length === 0) {
    lines.push('Nenhuma despesa fixa adicional recorrente além das essenciais.');
  } else {
    recurringFixedExpenses.forEach(t => {
      lines.push(`• ${t.description.padEnd(30)}: ${formatBRL(t.amount)} | Mensal | Vencimento: ${formatDateBR(t.date)}`);
    });
  }
  lines.push(`TOTAL RECORRENTE ADICIONAL: ${formatBRL(totalMonthlyRecurringOther)}`);

  lines.push('');
  lines.push('### INVESTIMENTOS PROFISSIONAIS (EQUIPAMENTOS / TRABALHO)');
  lines.push('NOTA METODOLÓGICA: Despesas de ferramentas musicais e trabalho mantidas separadas de lazer pessoal.');
  const profTxsHorizon = transactions.filter(t => 
    isProfessionalInvestmentExpense(t, categories) && 
    t.date >= todayStr && 
    t.date <= dateRange.endDate
  );
  if (profTxsHorizon.length === 0) {
    lines.push('Nenhum investimento profissional em equipamentos registrado no horizonte.');
  } else {
    profTxsHorizon.forEach(t => {
      lines.push(`• [${formatDateBR(t.date)}] ${t.description}: ${formatBRL(t.amount)} (${t.status === 'paid' ? 'PAGO' : 'PREVISTO'})`);
    });
  }

  // SEÇÃO 4: MAPA DOS PRÓXIMOS MESES (FLUXO MENSAL PROJETADO)
  lines.push('');
  lines.push('============================================================');
  lines.push('4. MAPA DOS PRÓXIMOS MESES (FLUXO MENSAL PROJETADO)');
  lines.push('============================================================');
  lines.push('MÊS             | ENTRADAS GARANT. | SAÍDAS OBRIGAT.  | RESULTADO MÊS | SALDO FINAL PROJ.');
  lines.push('----------------|------------------|------------------|---------------|------------------');
  monthlyMap.forEach(m => {
    const month = m.monthLabel.slice(0, 15).padEnd(15);
    const inVal = formatBRL(m.totalInflows).padStart(16);
    const outVal = formatBRL(m.totalOutflows).padStart(16);
    const netVal = `${m.monthNetResult >= 0 ? '+' : ''}${formatBRL(m.monthNetResult)}`.padStart(13);
    const endVal = formatBRL(m.projectedEndBalance).padStart(17);
    lines.push(`${month} | ${inVal} | ${outVal} | ${netVal} | ${endVal}`);
  });

  lines.push('');
  lines.push('DETALHAMENTO MÊS A MÊS:');
  monthlyMap.forEach(m => {
    lines.push(`• ${m.monthLabel.toUpperCase()}:`);
    lines.push(`  - Entradas Garantidas: ${formatBRL(m.totalInflows)} (Shows Contratados: ${formatBRL(m.showContractedIncomes)} | Outras: ${formatBRL(m.otherIncomes)})`);
    lines.push(`  - Saídas Obrigatórias: ${formatBRL(m.totalOutflows)} (Essenciais: ${formatBRL(m.essentialExpenses)} | Parcelas Dívidas: ${formatBRL(m.debtInstallments)} | Recorrentes: ${formatBRL(m.recurringExpenses)})`);
    lines.push(`  - Resultado do Mês:    ${m.monthNetResult >= 0 ? '+' : ''}${formatBRL(m.monthNetResult)}`);
    lines.push(`  - Saldo Projetado Fim: ${formatBRL(m.projectedEndBalance)} ${m.projectedEndBalance < 0 ? '[ALERTA: DÉFICIT]' : ''}`);
  });

  // SEÇÃO 5: SHOWS / ATIVIDADE PROFISSIONAL (RENDA VARIÁVEL)
  lines.push('');
  lines.push('============================================================');
  lines.push('5. SHOWS / RENDA VARIÁVEL');
  lines.push('============================================================');
  lines.push(`Shows realizados:                           ${showsRealizados.length}`);
  lines.push(`Shows contratados futuros:                  ${showsContratadosFuturos.length}`);
  lines.push(`Receita bruta consolidada de shows:         ${formatBRL(totalShowsGrossRevenue)}`);
  lines.push(`Custos diretos de produção (combustível/alimentação/pedágio/comissão): ${formatBRL(totalShowsDirectCosts)}`);
  lines.push(`Lucro líquido dos shows:                    ${formatBRL(totalShowsNetProfit)}`);
  lines.push(`Margem média de lucro líquido:              ${overallShowsMargin}%`);
  lines.push(`Lucro médio por show:                       ${formatBRL(avgProfitPerShow)}`);
  lines.push(`Shows/mês necessários para cobrir custo mensal obrigatório: ${typeof showsNeededPerMonth === 'number' ? `${showsNeededPerMonth} shows/mês` : showsNeededPerMonth}`);

  lines.push('');
  lines.push('PRÓXIMOS SHOWS CONTRATADOS:');
  if (showsContratadosFuturos.length === 0) {
    lines.push('Nenhum show futuro confirmado ou agendado no cadastro.');
  } else {
    lines.push('Data       | Evento / Contratante                | Cachê        | Recebido     | A Receber    | Lucro Estimado');
    lines.push('-----------|-------------------------------------|--------------|--------------|--------------|---------------');
    showsContratadosFuturos.forEach(s => {
      const d = formatDateBR(s.date).padEnd(10);
      const name = `${s.name} (${s.contractorName || 'Geral'})`.slice(0, 35).padEnd(35);
      const cache = formatBRL(s.totalCache).padStart(12);
      const rec = formatBRL(s.cacheReceived || 0).padStart(12);
      const pend = formatBRL((s.totalCache || 0) - (s.cacheReceived || 0)).padStart(12);
      const exp = s.expenses ? (Number(s.expenses.fuel) || 0) + (Number(s.expenses.food) || 0) + (Number(s.expenses.toll) || 0) + (Number(s.expenses.commission) || 0) + (Number(s.expenses.others) || 0) : 0;
      const profit = formatBRL((s.totalCache || 0) - exp).padStart(14);
      lines.push(`${d} | ${name} | ${cache} | ${rec} | ${pend} | ${profit}`);
    });
  }

  // SEÇÃO 6: DÍVIDAS E PARCELAMENTOS
  lines.push('');
  lines.push('============================================================');
  lines.push('6. DÍVIDAS');
  lines.push('============================================================');
  if (debtDetails.length === 0) {
    lines.push('Nenhuma dívida cadastrada.');
  } else {
    lines.push('Dívida                        | Saldo Devedor | Parcela Mensal | Parcelas Restantes | Mês Término');
    lines.push('------------------------------|---------------|----------------|--------------------|------------');
    debtDetails.forEach(dd => {
      const name = dd.debt.name.slice(0, 28).padEnd(28);
      const bal = formatBRL(dd.remainingAmount).padStart(13);
      const parc = formatBRL(dd.monthlyInstallment).padStart(14);
      const rest = `${dd.remainingCount}/${dd.totalCount || '?'}`.padStart(18);
      const end = dd.endMonthYear.slice(0, 11).padEnd(11);
      lines.push(`${name} | ${bal} | ${parc} | ${rest} | ${end}`);
    });
    lines.push('');
    lines.push(`TOTAL DE DÍVIDAS RESTANTES: ${formatBRL(totalDebtsRemaining)}`);
    lines.push(`TOTAL DE PARCELAS MENSAIS:  ${formatBRL(totalMonthlyDebtInstallments)}`);
    lines.push(`QUANDO A MAIOR PARTE DAS PARCELAS TERMINA: ${debtReliefDateSummary}`);

    lines.push('');
    lines.push('CRONOGRAMA DE REDUÇÃO DAS PARCELAS MENSAIS DE DÍVIDAS:');
    debtScheduleByMonth.forEach(sch => {
      lines.push(`• ${sch.monthLabel.toUpperCase().padEnd(16)}: ${formatBRL(sch.totalInstallments)} em parcelas (${sch.count} parcela(s) ativa(s))`);
    });
  }

  // SEÇÃO 7: RESERVAS E METAS (COFRINHOS)
  lines.push('');
  lines.push('============================================================');
  lines.push('7. RESERVAS E METAS');
  lines.push('============================================================');
  lines.push('NOTA METODOLÓGICA: Economias e cofrinhos NÃO são despesas. Representam patrimônio reservado e protegido.');
  if (goals.length === 0) {
    lines.push('Nenhum cofrinho ou meta cadastrada.');
  } else {
    lines.push('Meta / Cofrinho               | Saldo Atual   | Objetivo      | Falta         | Prazo      | % Concluído');
    lines.push('------------------------------|---------------|---------------|---------------|------------|------------');
    goals.forEach(g => {
      const name = g.name.slice(0, 28).padEnd(28);
      const cur = formatBRL(g.currentAmount).padStart(13);
      const target = formatBRL(g.targetAmount).padStart(13);
      const missing = formatBRL(Math.max(0, g.targetAmount - g.currentAmount)).padStart(13);
      const deadline = g.deadline ? formatDateBR(g.deadline).padEnd(10) : 'Sem prazo  ';
      const pct = g.targetAmount > 0 ? `${((g.currentAmount / g.targetAmount) * 100).toFixed(1)}%`.padStart(11) : '100%       ';
      lines.push(`${name} | ${cur} | ${target} | ${missing} | ${deadline} | ${pct}`);
    });
  }
  lines.push(`TOTAL RESERVADO EM COFRINHOS: ${formatBRL(totalReservedInGoals)}`);
  lines.push(`TOTAL EM CONTAS POUPANÇA/RESERVA: ${formatBRL(totalInSavingsAccounts)}`);
  lines.push(`TOTAL PATRIMONIAL RESERVADO: ${formatBRL(totalMoneyReserved)}`);

  // SEÇÃO 8: CAPACIDADE FINANCEIRA E ANÁLISE DE COMPRAS
  lines.push('');
  lines.push('============================================================');
  lines.push('8. CAPACIDADE FINANCEIRA');
  lines.push('============================================================');
  lines.push(`Custo mensal total obrigatório: ${formatBRL(totalMandatoryMonthlyCost)}`);
  lines.push(`Caixa disponível hoje:          ${formatBRL(totalAvailableOperationalToday)}`);
  lines.push(`Compromissos imediatos a pagar: ${formatBRL(totalImmediateCommitments)}`);
  lines.push(`Caixa livre imediato:           ${formatBRL(immediateFreeCash)}`);
  lines.push(`Meses de sobrevivência cobertos pelo caixa atual: ${typeof monthsOfSurvivalCurrentCash === 'number' ? `${monthsOfSurvivalCurrentCash} meses` : monthsOfSurvivalCurrentCash}`);
  lines.push(`Meses de sobrevivência considerando receitas garantidas: ${typeof monthsOfSurvivalWithGuaranteed === 'number' ? `${monthsOfSurvivalWithGuaranteed} meses` : monthsOfSurvivalWithGuaranteed}`);
  lines.push(`Receitas garantidas futuras no horizonte: ${formatBRL(totalGuaranteedFutureIncome)}`);
  lines.push(`Saldo projetado ao fim do horizonte:     ${formatBRL(finalProjectedBalanceAtHorizon)}`);

  lines.push('');
  lines.push('PARÂMETROS DE REFERÊNCIA PARA NOVAS COMPRAS:');
  lines.push(`• LIMITE ABSOLUTO (Teto máximo sem negativar caixa nos compromissos conhecidos):`);
  lines.push(`  ${formatBRL(absoluteLimit)}`);
  lines.push(`  (Aviso: gastar este valor zera o caixa livre imediato após as contas vencendo no mês)`);
  lines.push('');
  lines.push(`• LIMITE SEGURO (Preservando colchão de segurança de 1 mês ou reserva):`);
  lines.push(`  ${formatBRL(safeLimit)}`);
  lines.push(`  (Permite comprar sem violar a cobertura básica de subsistência)`);
  lines.push('');
  lines.push(`• LIMITE RECOMENDADO (Prudente diante da volatilidade de renda variável):`);
  lines.push(`  ${formatBRL(recommendedLimit)}`);
  lines.push(`  (Valor recomendado para compras discricionárias à vista sem aperto)`);

  // SEÇÃO 9: ALERTAS FINANCEIROS OBJETIVOS
  lines.push('');
  lines.push('============================================================');
  lines.push('9. ALERTAS FINANCEIROS');
  lines.push('============================================================');
  financialAlerts.forEach((alert, idx) => {
    lines.push(`* [${idx + 1}] ${alert}`);
  });

  // SEÇÃO 10: DADOS IMPORTANTES PARA A IA (SÍNTESE EXECUTIVA)
  lines.push('');
  lines.push('============================================================');
  lines.push('10. DADOS IMPORTANTES PARA A IA');
  lines.push('============================================================');
  const mainDebtsNames = debtDetails.map(d => d.debt.name).join(', ') || 'Nenhuma dívida ativa';
  lines.push(
    `SÍNTESE EXECUTIVA PARA DECISÃO:\n` +
    `O usuário possui ${formatBRL(totalAvailableOperationalToday)} em caixa operacional disponível hoje, ${formatBRL(totalMoneyReserved)} reservados em cofrinhos/poupança e ${formatBRL(totalImmediateCommitments)} em compromissos imediatos já conhecidos a vencer no mês atual. Seu caixa livre imediato é de ${formatBRL(immediateFreeCash)}. ` +
    `Seu custo mensal total obrigatório é de aproximadamente ${formatBRL(totalMandatoryMonthlyCost)} (sendo ${formatBRL(referenceMonthlyEssentialCost)} referentes a despesas essenciais de vida, ${formatBRL(totalMonthlyDebtInstallments)} referentes a parcelas de dívidas e ${formatBRL(totalMonthlyRecurringOther)} em fixas recorrentes). ` +
    `Possui ${formatBRL(totalGuaranteedFutureIncome)} em receitas futuras garantidas já contratadas e ${formatBRL(totalProjectedFutureIncome)} em receitas projetadas. ` +
    `No segmento profissional de shows, seu lucro médio líquido por apresentação é de ${formatBRL(avgProfitPerShow)} com margem de ${overallShowsMargin}%, sendo necessários ${showsNeededPerMonth} shows por mês para cobrir integralmente o custo de vida obrigatório. ` +
    `O caixa atual assegura ${monthsOfSurvivalCurrentCash} meses de sobrevivência caso a renda cesse completamente. ` +
    `As principais obrigações ativas são: ${mainDebtsNames}, com término e alívio financeiro projetado para ${debtReliefDateSummary}. ` +
    `Para avaliação de novas compras, o limite seguro imediato é de ${formatBRL(safeLimit)} e o limite recomendado prudencial é de ${formatBRL(recommendedLimit)}.`
  );

  lines.push('');
  lines.push('============================================================');
  lines.push('FIM DO RELATÓRIO');
  lines.push('============================================================');

  return lines.join('\n');
};
