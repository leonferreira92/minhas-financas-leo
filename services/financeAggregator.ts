import { Transaction, Account, ScopeType, Debt, DebtCostCenterMode, CareerDebtSubcategory, MusicCostCategory } from '../types';
import { CAREER_DEBT_SUBCATEGORIES } from '../constants';

export type AccountVinculo = 'PESSOAL' | 'MUSICO' | 'NEUTRO';

/**
 * Constantes da Regra de Transição do Parcelamento 'Viny' (Teto de Custos da Música / Som)
 * - Teto total para Música ('Equipamentos/Som'): R$ 6.614,00
 * - Valor já amortizado até a Parcela 8: R$ 6.133,00
 * - Saldo residual na Parcela 9 destinado à Música: R$ 481,00
 * - Excedente da Parcela 9 e integralidade das Parcelas 10 a 18+: Centro de Custo 'Pessoal' (Empréstimo/Dívida Pessoal)
 */
export const VINY_MUSIC_CEILING = 6614.0;
export const VINY_PRIOR_AMORTIZED = 6133.0;
export const VINY_INSTALLMENT_9_MUSIC_CAP = 481.0;

/**
 * Identifica se a dívida ou lançamento refere-se ao parcelamento do 'Viny'.
 */
export const isVinyDebtOrTransaction = (
  debt?: Partial<Debt> | null,
  tx?: Partial<Transaction> | null
): boolean => {
  const debtName = (debt?.name || '').toLowerCase();
  const txDesc = (tx?.description || '').toLowerCase();
  return debtName.includes('viny') || txDesc.includes('viny');
};

/**
 * Extrai o número da parcela de uma transação, usando installmentNumber explícito,
 * regex na descrição (ex: "Parcela 9/18", "(9/18)") ou ordem cronológica da dívida.
 */
export const extractInstallmentNumber = (
  t: Partial<Transaction>,
  allTransactions?: Transaction[]
): number => {
  if (typeof t.installmentNumber === 'number' && !isNaN(t.installmentNumber)) {
    return t.installmentNumber;
  }

  const desc = t.description || '';
  const matchParcela =
    desc.match(/parcela\s*0*(\d+)/i) ||
    desc.match(/\(\s*0*(\d+)\s*\/\s*\d+\s*\)/) ||
    desc.match(/\b0*(\d+)\s*\/\s*\d+\b/);

  if (matchParcela && matchParcela[1]) {
    const parsed = parseInt(matchParcela[1], 10);
    if (!isNaN(parsed)) return parsed;
  }

  if (t.debtId && t.id && Array.isArray(allTransactions) && allTransactions.length > 0) {
    const siblings = allTransactions
      .filter(item => item && item.debtId === t.debtId && item.installmentNumber !== 0)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const idx = siblings.findIndex(item => item.id === t.id);
    if (idx !== -1) return idx + 1;
  }

  return 1;
};

/**
 * Calcula a divisão exata da parcela segundo a Regra de Transição do 'Viny' (Teto R$ 6.614,00).
 */
export const resolveVinyInstallmentRule = (
  installmentNumber: number,
  rawAmount: number = 0,
  personalCategoryId: string = 'cat_1'
): {
  scope: 'BUSINESS' | 'PERSONAL';
  categoryId: string;
  subcategory: string;
  musicAmount: number;
  personalAmount: number;
  personalCategoryName: string;
  isTransitionInstallment: boolean;
} => {
  const cleanAmount = Math.abs(Number(rawAmount) || 0);

  // Parcelas 1 a 8 (já amortizaram R$ 6.133,00 no Centro de Custo Música)
  if (installmentNumber <= 8) {
    return {
      scope: 'BUSINESS',
      categoryId: 'cat_equipamentos',
      subcategory: 'Equipamentos/Som',
      musicAmount: cleanAmount,
      personalAmount: 0,
      personalCategoryName: 'Empréstimo/Dívida Pessoal',
      isTransitionInstallment: false
    };
  }

  // Parcela 9: Transição do Teto (destina apenas R$ 481,00 para Música e o restante para Pessoal)
  if (installmentNumber === 9) {
    const musicAmount =
      cleanAmount > 0
        ? Math.min(cleanAmount, VINY_INSTALLMENT_9_MUSIC_CAP)
        : VINY_INSTALLMENT_9_MUSIC_CAP;
    const personalAmount =
      cleanAmount > 0
        ? Math.max(0, Math.round((cleanAmount - musicAmount) * 100) / 100)
        : 0;

    return {
      scope: 'BUSINESS',
      categoryId: 'cat_equipamentos',
      subcategory: 'Equipamentos/Som',
      musicAmount,
      personalAmount,
      personalCategoryName: 'Empréstimo/Dívida Pessoal',
      isTransitionInstallment: true
    };
  }

  // Parcelas 10 a 18 em diante: 100% Centro de Custo 'Pessoal' (Empréstimo/Dívida Pessoal)
  return {
    scope: 'PERSONAL',
    categoryId: personalCategoryId || 'cat_1',
    subcategory: 'Empréstimo/Dívida Pessoal',
    musicAmount: 0,
    personalAmount: cleanAmount,
    personalCategoryName: 'Empréstimo/Dívida Pessoal',
    isTransitionInstallment: false
  };
};

/**
 * Resolve a categoria financeira (categoryId) e a chave de custo musical (musicCostKey)
 * a partir da subcategoria da carreira/música.
 */
export const resolveCareerSubcategoryMeta = (subcategory?: CareerDebtSubcategory | string) => {
  const normalized = (subcategory || 'Equipamentos / Instrumentos').trim();
  if (
    normalized.toLowerCase() === 'equipamentos/som' ||
    normalized.toLowerCase() === 'equipamentos & som'
  ) {
    return {
      subcategory: 'Equipamentos/Som',
      categoryId: 'cat_equipamentos',
      musicCostKey: 'equipment' as MusicCostCategory
    };
  }

  const found = CAREER_DEBT_SUBCATEGORIES.find(
    s => s.id.toLowerCase() === normalized.toLowerCase() || s.label.toLowerCase() === normalized.toLowerCase()
  );
  if (found) {
    return {
      subcategory: found.label,
      categoryId: found.categoryId,
      musicCostKey: found.musicCostKey
    };
  }
  return {
    subcategory: normalized || 'Equipamentos / Instrumentos',
    categoryId: 'cat_equipamentos',
    musicCostKey: 'equipment' as MusicCostCategory
  };
};

/**
 * Determina o Centro de Custo ('BUSINESS' = MÚSICA / CARREIRA | 'PERSONAL' = PESSOAL),
 * a categoria e a subcategoria para uma parcela específica de uma dívida.
 * installmentNumber: 0 para Entrada Inicial, 1..N para parcelas normais.
 */
export const resolveDebtInstallmentCostCenter = (
  debt: Partial<Debt>,
  installmentNumber: number = 1,
  rawAmount: number = 0
): {
  scope: 'BUSINESS' | 'PERSONAL';
  categoryId: string;
  subcategory?: string;
  musicAmount?: number;
  personalAmount?: number;
  isTransitionInstallment?: boolean;
} => {
  const businessCatIds = ['cat_equipamentos', 'cat_logistica_shows', 'cat_producao_shows', 'cat_marketing', 'cat_33'];
  const fallbackPersonalCat =
    debt.personalCategoryId ||
    (debt.categoryId && !businessCatIds.includes(debt.categoryId) ? debt.categoryId : 'cat_1');

  // Regra Específica Automática para o parcelamento do 'Viny' (Teto R$ 6.614,00 na Parcela 9)
  if (isVinyDebtOrTransaction(debt)) {
    const vinyRule = resolveVinyInstallmentRule(installmentNumber, rawAmount, fallbackPersonalCat);
    return {
      scope: vinyRule.scope,
      categoryId: vinyRule.categoryId,
      subcategory: vinyRule.scope === 'BUSINESS' ? vinyRule.subcategory : undefined,
      musicAmount: vinyRule.musicAmount,
      personalAmount: vinyRule.personalAmount,
      isTransitionInstallment: vinyRule.isTransitionInstallment
    };
  }

  const mode: DebtCostCenterMode =
    debt.costCenterMode ||
    (debt.scope === 'BUSINESS' ? 'TOTAL_BUSINESS' : 'TOTAL_PERSONAL');

  let isBusiness = false;

  if (mode === 'TOTAL_BUSINESS') {
    isBusiness = true;
  } else if (mode === 'TOTAL_PERSONAL') {
    isBusiness = false;
  } else if (mode === 'INSTALLMENT_RANGE') {
    if (installmentNumber === 0) {
      isBusiness = Boolean(debt.includeDownPaymentInBusiness);
    } else {
      const start = Math.max(1, Number(debt.businessStartInstallment) || 1);
      const end = Math.max(start, Number(debt.businessEndInstallment) || Number(debt.installmentCount) || start);
      isBusiness = installmentNumber >= start && installmentNumber <= end;
    }
  }

  if (isBusiness) {
    const meta = resolveCareerSubcategoryMeta(debt.musicSubcategory);
    return {
      scope: 'BUSINESS',
      categoryId: meta.categoryId,
      subcategory: meta.subcategory,
      musicAmount: Math.abs(Number(rawAmount) || 0),
      personalAmount: 0,
      isTransitionInstallment: false
    };
  }

  return {
    scope: 'PERSONAL',
    categoryId: fallbackPersonalCat,
    subcategory: undefined,
    musicAmount: 0,
    personalAmount: Math.abs(Number(rawAmount) || 0),
    isTransitionInstallment: false
  };
};

/**
 * Verifica se uma transação de despesa pertence ao Centro de Custo 'MÚSICA / CARREIRA'.
 * - Para o parcelamento do 'Viny': aplica rigorosamente o teto de R$ 6.614,00 até a Parcela 9
 *   e categoriza as Parcelas 10 a 18+ como 'PESSOAL' (excluindo-as da Música).
 * - Para demais parcelas de dívida (t.debtId): respeita a marcação da parcela/dívida.
 */
export const isCareerExpenseTransaction = (
  t: Transaction,
  debts?: Debt[],
  allTransactions?: Transaction[]
): boolean => {
  if (!t || t.type !== 'expense' || t.status === 'cancelled') return false;

  const desc = (t.description || '').toLowerCase();
  if (desc.includes('retirada de pró-labore') || desc.includes('retirada de pro-labore')) {
    return false;
  }

  const parentDebt = t.debtId && debts && debts.length > 0
    ? debts.find(d => d.id === t.debtId)
    : undefined;

  // Regra prioritária de transição do 'Viny': Parcelas 10 a 18+ são 100% Pessoais
  if (isVinyDebtOrTransaction(parentDebt, t)) {
    const instNum = extractInstallmentNumber(t, allTransactions);
    const vinyRule = resolveVinyInstallmentRule(instNum, Math.abs(Number(t.amount) || 0));
    return vinyRule.musicAmount > 0;
  }

  // Se for parcela/lançamento de outras dívidas:
  if (t.debtId) {
    if (t.scope === 'PERSONAL') return false;
    if (t.scope === 'BUSINESS') return true;

    if (parentDebt) {
      const resolved = resolveDebtInstallmentCostCenter(parentDebt, t.installmentNumber ?? 1, t.amount);
      return resolved.scope === 'BUSINESS';
    }
    return false;
  }

  // Para despesas gerais fora de dívidas, se estiver explicitamente marcada como PERSONAL
  // e não tiver vínculo direto com show ou categoria exclusiva de música, é pessoal.
  const isMusicCategory =
    t.categoryId === 'cat_equipamentos' ||
    t.categoryId === 'cat_producao_shows' ||
    t.categoryId === 'cat_logistica_shows' ||
    t.categoryId === 'cat_marketing';

  if (t.scope === 'PERSONAL' && !t.showId && !t.showExpenseId && !isMusicCategory) {
    return false;
  }

  return (
    t.scope === 'BUSINESS' ||
    isMusicCategory ||
    !!t.showId ||
    !!t.showExpenseId ||
    desc.includes('equipamento') ||
    desc.includes('músico') ||
    desc.includes('musico') ||
    desc.includes('ensaio') ||
    desc.includes('logística') ||
    desc.includes('logistica')
  );
};

/**
 * Consolida os gastos da carreira ('MÚSICA / CARREIRA') para relatórios, gráficos e DRE.
 * Regra obrigatória para Dívidas/Parcelamentos:
 * - Inclui automaticamente APENAS as parcelas PAGAS (status === 'paid') associadas a 'MÚSICA / CARREIRA'.
 * - No parcelamento do 'Viny': aplica o teto de R$ 6.614,00 (R$ 6.133,00 até a Parcela 8 + R$ 481,00 na Parcela 9
 *   em 'Equipamentos/Som'), enviando o restante da Parcela 9 e as Parcelas 10 a 18+ para 'Pessoal'.
 * - Exclui integralmente as parcelas marcadas como 'PESSOAL' e parcelas ainda pendentes.
 */
export const consolidateCareerExpenses = (
  transactions: Transaction[],
  debts: Debt[] = [],
  options?: {
    startDate?: string;
    endDate?: string;
    monthPrefix?: string;
    onlyPaidForAll?: boolean;
  }
) => {
  const onlyPaidForAll = options?.onlyPaidForAll ?? true;
  const safeTxs = Array.isArray(transactions) ? transactions : [];
  const safeDebts = Array.isArray(debts) ? debts : [];

  const filteredTxs: Transaction[] = [];

  safeTxs.forEach(t => {
    if (!t || !t.date || t.type !== 'expense' || t.status === 'cancelled') return;

    if (options?.monthPrefix && !t.date.startsWith(options.monthPrefix)) return;
    if (options?.startDate && t.date < options.startDate) return;
    if (options?.endDate && t.date > options.endDate) return;

    // Parcelas de dívida: SEMPRE exigir status === 'paid' nos relatórios da música
    if (t.debtId && t.status !== 'paid') return;
    if (onlyPaidForAll && t.status !== 'paid') return;

    const parentDebt = t.debtId ? safeDebts.find(d => d.id === t.debtId) : undefined;

    // Tratamento prioritário da Regra de Transição do 'Viny' (Teto R$ 6.614,00 / Parcela 9 = R$ 481,00)
    if (isVinyDebtOrTransaction(parentDebt, t)) {
      const instNum = extractInstallmentNumber(t, safeTxs);
      const rawAmount = Math.abs(Number(t.amount) || 0);
      const vinyRule = resolveVinyInstallmentRule(instNum, rawAmount, parentDebt?.personalCategoryId);

      // Parcelas 10 a 18+ têm musicAmount === 0 (100% Pessoal) -> não entram no relatório da Música
      if (vinyRule.musicAmount <= 0) {
        return;
      }

      // Parcelas 1 a 8 (integral) e Parcela 9 (limitada automaticamente a R$ 481,00 em 'Equipamentos/Som')
      filteredTxs.push({
        ...t,
        amount: vinyRule.musicAmount,
        scope: 'BUSINESS',
        categoryId: 'cat_equipamentos',
        subcategory: 'Equipamentos/Som'
      });
      return;
    }

    if (isCareerExpenseTransaction(t, safeDebts, safeTxs)) {
      filteredTxs.push(t);
    }
  });

  const debtCareerExpenses = filteredTxs.filter(t => Boolean(t.debtId));
  const directCareerExpenses = filteredTxs.filter(t => !t.debtId);

  const totalAmount = filteredTxs.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const debtInstallmentsTotal = debtCareerExpenses.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const directExpensesTotal = directCareerExpenses.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  // Agrupamento por subcategoria da música
  const subcategoryMap = new Map<string, { label: string; amount: number; count: number; debtCount: number }>();

  filteredTxs.forEach(t => {
    let subLabel = t.subcategory ? String(t.subcategory) : '';
    if (!subLabel && t.debtId) {
      const parentDebt = safeDebts.find(d => d.id === t.debtId);
      subLabel = parentDebt?.musicSubcategory || 'Equipamentos / Instrumentos';
    }
    if (!subLabel) {
      if (t.categoryId === 'cat_equipamentos') subLabel = 'Equipamentos / Instrumentos';
      else if (t.categoryId === 'cat_logistica_shows') subLabel = 'Deslocamento / Logística';
      else if (t.categoryId === 'cat_producao_shows') subLabel = 'Músicos / Apoio (Equipe)';
      else if (t.categoryId === 'cat_marketing') subLabel = 'Marketing & Divulgação';
      else subLabel = 'Outros Custos da Música';
    }

    const prev = subcategoryMap.get(subLabel) || { label: subLabel, amount: 0, count: 0, debtCount: 0 };
    subcategoryMap.set(subLabel, {
      label: subLabel,
      amount: prev.amount + Math.abs(Number(t.amount) || 0),
      count: prev.count + 1,
      debtCount: prev.debtCount + (t.debtId ? 1 : 0)
    });
  });

  const bySubcategory = Array.from(subcategoryMap.values())
    .map(item => ({
      ...item,
      percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    allCareerExpenses: filteredTxs,
    debtCareerExpenses,
    directCareerExpenses,
    totalAmount: Math.round(totalAmount * 100) / 100,
    debtInstallmentsTotal: Math.round(debtInstallmentsTotal * 100) / 100,
    directExpensesTotal: Math.round(directExpensesTotal * 100) / 100,
    bySubcategory
  };
};

/**
 * Helper para interpretar valores inseridos com padrão brasileiro ou internacional.
 * Ex: "1.250,50" -> 1250.50
 * Ex: "1,250.50" -> 1250.50
 * Ex: "500" -> 500
 */
export const parseCurrencyInput = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const str = String(value).trim();
  if (!str) return 0;

  // Se contiver ambos vírgula e ponto:
  // Ex: 1.250,50 (PT-BR) vs 1,250.50 (US)
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Padrão PT-BR: 1.250,50 -> remove pontos, substitui vírgula por ponto
      const clean = str.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    } else {
      // Padrão US: 1,250.50 -> remove vírgulas
      const clean = str.replace(/,/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    }
  }

  // Se contiver apenas vírgula (ex: 1250,50)
  if (str.includes(',')) {
    const clean = str.replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Apenas números ou ponto simples (ex: 1250.50)
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Normaliza e obtém o vínculo ('PESSOAL' | 'MUSICO' | 'NEUTRO') de uma conta
 */
export const getAccountVinculo = (acc: Account): AccountVinculo => {
  if (acc.vinculo) return acc.vinculo;
  if (acc.scope === 'BUSINESS') return 'MUSICO';
  if (acc.scope === 'PERSONAL') return 'PESSOAL';
  return 'NEUTRO';
};

/**
 * Converte vínculo para ScopeType
 */
export const vinculoToScope = (vinculo: AccountVinculo): ScopeType => {
  if (vinculo === 'MUSICO') return 'BUSINESS';
  if (vinculo === 'PESSOAL') return 'PERSONAL';
  return 'BOTH';
};

/**
 * Métricas do Mês para Carreira Artística / Empresa (Regime de Caixa Estrito - Apenas Transações Efetivadas)
 */
export const getMonthlyCareerMetrics = (
  transactions: Transaction[],
  monthStr: string,
  debts: Debt[] = []
) => {
  const monthPrefix = monthStr.slice(0, 7);

  // 1. Receitas Efetivas (Regime de Caixa: status === 'paid' no mês selecionado)
  const incomeTxs = transactions.filter(t => {
    if (!t.date || !t.date.startsWith(monthPrefix)) return false;
    if (t.type !== 'income' || t.status !== 'paid') return false;

    const desc = (t.description || '').toLowerCase();
    if (desc.includes('recebimento de pró-labore') || desc.includes('recebimento de pro-labore')) return false;

    return (
      t.scope === 'BUSINESS' ||
      t.categoryId === 'cat_33' ||
      !!t.showId ||
      desc.includes('cachê') ||
      desc.includes('cache') ||
      desc.includes('show')
    );
  });

  // Desconsidera transações duplicadas de base para o mesmo showId
  const seenShowBaseIds = new Set<string>();
  const deduplicatedIncomeTxs = incomeTxs.filter(t => {
    if (!t.showId) return true;
    const desc = (t.description || '').toLowerCase();
    const isExtra = t.showPaymentType === 'Extra' || t.showPaymentType === 'Bônus' || desc.includes('hora extra') || desc.includes('gorjeta');
    if (isExtra) return true;
    if (seenShowBaseIds.has(t.showId)) return false;
    seenShowBaseIds.add(t.showId);
    return true;
  });

  const faturamentoReal = deduplicatedIncomeTxs.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  // 2. Despesas Efetivas (Regime de Caixa) - incluindo parcelas pagas de dívidas vinculadas à Música e excluindo Pessoais
  const consolidated = consolidateCareerExpenses(transactions, debts, {
    monthPrefix,
    onlyPaidForAll: true
  });

  const custosReais = consolidated.totalAmount;
  const lucroLiquido = faturamentoReal - custosReais;
  const margemLucro = faturamentoReal > 0 ? (lucroLiquido / faturamentoReal) * 100 : 0;

  return {
    faturamentoReal: Math.round(faturamentoReal * 100) / 100,
    custosReais: Math.round(custosReais * 100) / 100,
    lucroLiquido: Math.round(lucroLiquido * 100) / 100,
    margemLucro: Math.round(margemLucro * 10) / 10,
    incomeCount: incomeTxs.length,
    expenseCount: consolidated.allCareerExpenses.length,
    debtInstallmentsTotal: consolidated.debtInstallmentsTotal,
    bySubcategory: consolidated.bySubcategory
  };
};
