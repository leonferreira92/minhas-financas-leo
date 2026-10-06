import { Transaction, Account, ScopeType, Debt, DebtCostCenterMode, CareerDebtSubcategory, MusicCostCategory, Category } from '../types';
import { CAREER_DEBT_SUBCATEGORIES } from '../constants';

export type AccountVinculo = 'PESSOAL' | 'MUSICO' | 'NEUTRO';

/**
 * Constantes da Regra de Rateio e Teto do Contrato Único 'Viny':
 * - Contrato único ('Viny' / 'Viny / Acordo Geral') com Valor Total de R$ 12.435,00,
 *   preservando integralmente os pagamentos históricos:
 *   Entrada R$ 300, P1 R$ 1.000, P2 R$ 700, P3 R$ 683, P4 R$ 767, P5 R$ 647, P6 R$ 704, P7 R$ 704, P8 R$ 628 (Total Amortizado Real = R$ 6.133,00).
 * - Teto MÁXIMO acumulado para a DRE da Música ('Equipamentos/Som'): R$ 6.500,00 (10x de R$ 650,00).
 *   Em NENHUMA hipótese a soma direcionada para a DRE da Música pode ultrapassar R$ 6.500,00.
 * - Nas parcelas pagas referentes ao som (Fevereiro a Novembro, Parcelas 2 a 11):
 *   Destina exatamente R$ 650,00/mês para 'MÚSICA / CARREIRA' (limitado ao teto de R$ 6.500,00).
 * - Todo o valor excedente pago em cada parcela e as demais parcelas (Entrada, P1 e P12 a P18+)
 *   são alocados automaticamente em 'PESSOAL' (Categoria padrão: 'Dívidas / Empréstimo Pessoal').
 */
export const VINY_MUSIC_START_INSTALLMENT = 2; // Fevereiro (P2)
export const VINY_MUSIC_END_INSTALLMENT = 10;  // Parcelas 2 a 10 (Padrão Som/Música do Viny; P11+ = 100% Pessoal)
export const VINY_MONTHLY_MUSIC_FIXED = 650.0; // R$ 650,00/mês padrão na DRE da Música (editável pelo usuário)
export const VINY_MUSIC_MAX_CEILING = 6500.0;  // Teto padrão acumulado na DRE da Música
export const VINY_DEFAULT_TOTAL_AMOUNT = 12435.0; // Valor Total padrão inicial do contrato único do Viny (editável)
export const DEFAULT_PERSONAL_DEBT_CATEGORY_ID = 'cat_dividas'; // Categoria padrão: 'Dívidas / Empréstimo Pessoal'

export const VINY_HISTORICAL_PAID_SCHEDULE: Array<{
  installmentNumber: number;
  amount: number;
  monthOffset: number; // 0 = Jan (P1), 1 = Fev (P2), ..., 7 = Ago (P8)
}> = [
  { installmentNumber: 0, amount: 300.0, monthOffset: 0 },  // Entrada de R$ 300,00
  { installmentNumber: 1, amount: 1000.0, monthOffset: 0 }, // P1 (Jan): R$ 1.000,00
  { installmentNumber: 2, amount: 700.0, monthOffset: 1 },  // P2 (Fev): R$ 700,00
  { installmentNumber: 3, amount: 683.0, monthOffset: 2 },  // P3 (Mar): R$ 683,00
  { installmentNumber: 4, amount: 767.0, monthOffset: 3 },  // P4 (Abr): R$ 767,00
  { installmentNumber: 5, amount: 647.0, monthOffset: 4 },  // P5 (Mai): R$ 647,00
  { installmentNumber: 6, amount: 704.0, monthOffset: 5 },  // P6 (Jun): R$ 704,00
  { installmentNumber: 7, amount: 704.0, monthOffset: 6 },  // P7 (Jul): R$ 704,00
  { installmentNumber: 8, amount: 628.0, monthOffset: 7 }   // P8 (Ago): R$ 628,00
];

/**
 * Resolve a categoria padrão para parcelas pessoais de dívidas ('Dívidas / Empréstimo Pessoal'),
 * substituindo o antigo fallback 'cat_1' ('Alimentação' / 'Mercado').
 */
export const resolveDefaultPersonalDebtCategoryId = (
  categories?: Array<Pick<Category, 'id' | 'name'>>,
  currentCategoryId?: string
): string => {
  const businessCatIds = [
    'cat_equipamentos',
    'cat_logistica_shows',
    'cat_producao_shows',
    'cat_marketing',
    'cat_33',
    'cat_prolabore_out'
  ];

  const isFoodOrInvalid = (catId?: string) => {
    if (!catId || catId === 'cat_1' || businessCatIds.includes(catId)) return true;
    if (Array.isArray(categories) && categories.length > 0) {
      const found = categories.find(c => c.id === catId);
      if (found) {
        const norm = (found.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (norm.includes('alimentacao') || norm === 'mercado' || norm.includes('restaurante')) {
          return true;
        }
      }
    }
    return false;
  };

  if (currentCategoryId && !isFoodOrInvalid(currentCategoryId)) {
    return currentCategoryId;
  }

  if (Array.isArray(categories) && categories.length > 0) {
    const byId = categories.find(c => c.id === DEFAULT_PERSONAL_DEBT_CATEGORY_ID);
    if (byId) return byId.id;

    const byName = categories.find(c => {
      const norm = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return norm.includes('divida') || norm.includes('emprestimo');
    });
    if (byName) return byName.id;
  }

  return DEFAULT_PERSONAL_DEBT_CATEGORY_ID;
};

/**
 * Identifica se a dívida ou lançamento refere-se ao card duplicado 'Som Léo' (que deve ser removido).
 */
export const isSomLeoDebtOrTransaction = (
  debt?: Partial<Debt> | null,
  tx?: Partial<Transaction> | null
): boolean => {
  const debtName = (debt?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const txDesc = (tx?.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (
    debt?.id === 'debt_som_leo' ||
    tx?.debtId === 'debt_som_leo' ||
    debtName.includes('som leo') ||
    txDesc.includes('som leo')
  );
};

/**
 * Identifica se a dívida ou lançamento refere-se ao contrato único do 'Viny'.
 */
export const isVinyDebtOrTransaction = (
  debt?: Partial<Debt> | null,
  tx?: Partial<Transaction> | null
): boolean => {
  if (isSomLeoDebtOrTransaction(debt, tx)) return false;
  const debtName = (debt?.name || '').toLowerCase();
  const txDesc = (tx?.description || '').toLowerCase();
  return debtName.includes('viny') || txDesc.includes('viny');
};

/**
 * Extrai o número da parcela de uma transação (0 = Entrada Inicial, 1..18 = Parcelas 1 a 18).
 */
export const extractInstallmentNumber = (
  t: Partial<Transaction>,
  allTransactions?: Transaction[]
): number => {
  const descLower = (t.description || '').toLowerCase();
  const rawAmt = Math.round(Math.abs(Number(t.amount) || 0));

  // Entrada Inicial (ex: Entrada de R$ 300,00)
  if (t.installmentNumber === 0 || descLower.includes('entrada')) {
    return 0;
  }

  if (typeof t.installmentNumber === 'number' && !isNaN(t.installmentNumber) && t.installmentNumber > 0) {
    // Caso a Entrada de R$ 300 tenha recebido installmentNumber 1 por engano, distingue pelo valor R$ 300
    if (rawAmt === 300 && t.installmentNumber === 1 && descLower.includes('viny')) {
      return 0;
    }
    return t.installmentNumber;
  }

  const desc = t.description || '';
  const matchParcela =
    desc.match(/parcela\s*0*(\d+)/i) ||
    desc.match(/\(\s*0*(\d+)\s*\/\s*\d+/) ||
    desc.match(/\b0*(\d+)\s*\/\s*\d+\b/);

  if (matchParcela && matchParcela[1]) {
    const parsed = parseInt(matchParcela[1], 10);
    if (!isNaN(parsed)) return parsed;
  }

  if (t.debtId && t.id && Array.isArray(allTransactions) && allTransactions.length > 0) {
    if (rawAmt === 300) return 0;
    const siblings = allTransactions
      .filter(
        item =>
          item &&
          item.debtId === t.debtId &&
          item.installmentNumber !== 0 &&
          !(item.description || '').toLowerCase().includes('entrada') &&
          Math.round(Math.abs(Number(item.amount) || 0)) !== 300
      )
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const idx = siblings.findIndex(item => item.id === t.id);
    if (idx !== -1) return idx + 1;
  }

  return 1;
};

/**
 * Calcula o rateio dinâmico de uma parcela do contrato do 'Viny', respeitando estritamente:
 * - Parcelas do intervalo do Som (Fevereiro a Novembro, Parcelas 2 a 11):
 *   Destina para a DRE da Música ('Equipamentos/Som') o valor de `Math.min(valorDaParcela, 650.00)`,
 *   limitado também ao teto acumulado de R$ 6.500,00.
 * - O valor excedente da parcela (`Math.max(0, valorDaParcela - 650.00)`) é alocado em 'PESSOAL'.
 * - Em NENHUMA hipótese o valor de Música pode ser superior ao valor total da própria parcela.
 * - Entrada (0), Parcela 1 (Janeiro) e Parcelas 12+ (Dezembro em diante): 100% 'PESSOAL'.
 */
export const resolveVinyInstallmentAllocation = (
  installmentNumber: number,
  rawAmount: number = 0,
  personalCategoryId: string = DEFAULT_PERSONAL_DEBT_CATEGORY_ID,
  alreadyAllocatedMusicTotal: number = 0,
  startInstallment: number = VINY_MUSIC_START_INSTALLMENT,
  endInstallment: number = VINY_MUSIC_END_INSTALLMENT,
  customMonthlyMusicLimit?: number,
  txOverride?: Partial<Transaction>
): {
  scope: 'BUSINESS' | 'PERSONAL';
  categoryId: string;
  subcategory?: string;
  musicAmount: number;
  personalAmount: number;
  isMusicInterval: boolean;
} => {
  const cleanAmount = Math.round(Math.abs(Number(rawAmount) || 0) * 100) / 100;
  const safePersonalCat = resolveDefaultPersonalDebtCategoryId(undefined, personalCategoryId);

  // Se a parcela possui override manual explícito de valor ou centro de custo definido pelo usuário, respeita estritamente:
  if (txOverride?.manualCostCenterOverride) {
    if (typeof txOverride.customMusicAmount === 'number' && !isNaN(txOverride.customMusicAmount)) {
      const mAmt = Math.min(cleanAmount, Math.max(0, Math.round(txOverride.customMusicAmount * 100) / 100));
      const pAmt = Math.max(0, Math.round((cleanAmount - mAmt) * 100) / 100);
      return {
        scope: mAmt > 0 ? 'BUSINESS' : 'PERSONAL',
        categoryId: mAmt > 0 ? 'cat_equipamentos' : safePersonalCat,
        subcategory: mAmt > 0 ? (txOverride.subcategory || 'Equipamentos/Som') : undefined,
        musicAmount: mAmt,
        personalAmount: pAmt,
        isMusicInterval: mAmt > 0
      };
    }
    if (txOverride.scope === 'PERSONAL') {
      return {
        scope: 'PERSONAL',
        categoryId: safePersonalCat,
        subcategory: undefined,
        musicAmount: 0,
        personalAmount: cleanAmount,
        isMusicInterval: false
      };
    }
    if (txOverride.scope === 'BUSINESS') {
      const limit =
        typeof customMonthlyMusicLimit === 'number' && customMonthlyMusicLimit > 0
          ? customMonthlyMusicLimit
          : cleanAmount;
      const mAmt = Math.min(cleanAmount, Math.round(limit * 100) / 100);
      const pAmt = Math.max(0, Math.round((cleanAmount - mAmt) * 100) / 100);
      return {
        scope: 'BUSINESS',
        categoryId: 'cat_equipamentos',
        subcategory: txOverride.subcategory || 'Equipamentos/Som',
        musicAmount: mAmt,
        personalAmount: pAmt,
        isMusicInterval: true
      };
    }
  }

  // Parcelas fora do intervalo definido (ex: Entrada 0, Parcela 1, e Parcela 11 em diante quando intervalo é 2 a 10)
  // são categorizadas automaticamente como 100% 'PESSOAL'
  const isMusicInterval =
    installmentNumber > 0 &&
    installmentNumber >= startInstallment &&
    installmentNumber <= endInstallment;

  if (!isMusicInterval || cleanAmount <= 0) {
    return {
      scope: 'PERSONAL',
      categoryId: safePersonalCat,
      subcategory: undefined,
      musicAmount: 0,
      personalAmount: cleanAmount,
      isMusicInterval: false
    };
  }

  const effectiveMonthlyLimit =
    typeof customMonthlyMusicLimit === 'number' && customMonthlyMusicLimit > 0
      ? customMonthlyMusicLimit
      : VINY_MONTHLY_MUSIC_FIXED;

  const intervalCount = Math.max(1, endInstallment - startInstallment + 1);
  const dynamicCeiling = Math.max(VINY_MUSIC_MAX_CEILING, intervalCount * effectiveMonthlyLimit);
  const remainingCeiling = Math.max(
    0,
    Math.round((dynamicCeiling - Math.max(0, alreadyAllocatedMusicTotal)) * 100) / 100
  );

  if (remainingCeiling > 0) {
    const musicAmount = Math.round(
      Math.min(cleanAmount, effectiveMonthlyLimit, remainingCeiling) * 100
    ) / 100;
    const personalAmount = Math.max(0, Math.round((cleanAmount - musicAmount) * 100) / 100);
    return {
      scope: musicAmount > 0 ? 'BUSINESS' : 'PERSONAL',
      categoryId: musicAmount > 0 ? 'cat_equipamentos' : safePersonalCat,
      subcategory: musicAmount > 0 ? 'Equipamentos/Som' : undefined,
      musicAmount,
      personalAmount,
      isMusicInterval: musicAmount > 0
    };
  }

  return {
    scope: 'PERSONAL',
    categoryId: safePersonalCat,
    subcategory: undefined,
    musicAmount: 0,
    personalAmount: cleanAmount,
    isMusicInterval: false
  };
};

/**
 * Calcula o resumo consolidado e dinâmico de Centro de Custo para o Contrato do Viny
 * (ou qualquer dívida com rateio por intervalo), respeitando o intervalo configurável (padrão 2 a 10)
 * e garantindo que da Parcela 11 em diante seja 100% 'PESSOAL'.
 */
export const calculateVinyCostCenterSummary = (
  vinyTransactions: Transaction[],
  totalContractAmount: number = VINY_DEFAULT_TOTAL_AMOUNT,
  startInstallment: number = VINY_MUSIC_START_INSTALLMENT,
  endInstallment: number = VINY_MUSIC_END_INSTALLMENT,
  customMonthlyMusicLimit?: number
) => {
  const sorted = [...(Array.isArray(vinyTransactions) ? vinyTransactions : [])].sort((a, b) => {
    const instA = extractInstallmentNumber(a, vinyTransactions);
    const instB = extractInstallmentNumber(b, vinyTransactions);
    if (instA !== instB) return instA - instB;
    return (a.date || '').localeCompare(b.date || '');
  });

  let musicPaidTotal = 0;
  let musicPendingTotal = 0;
  let personalPaidTotal = 0;
  let personalPendingTotal = 0;
  let musicCount = 0;
  let personalCount = 0;
  let totalPaidReal = 0;
  let totalPendingReal = 0;

  sorted.forEach(t => {
    if (!t || t.status === 'cancelled') return;
    const amt = Math.round(Math.abs(Number(t.amount) || 0) * 100) / 100;
    const instNum = extractInstallmentNumber(t, sorted);
    const currentAllocatedMusic = Math.round((musicPaidTotal + musicPendingTotal) * 100) / 100;

    const alloc = resolveVinyInstallmentAllocation(
      instNum,
      amt,
      DEFAULT_PERSONAL_DEBT_CATEGORY_ID,
      currentAllocatedMusic,
      startInstallment,
      endInstallment,
      customMonthlyMusicLimit,
      t
    );

    if (t.status === 'paid') {
      totalPaidReal = Math.round((totalPaidReal + amt) * 100) / 100;
      musicPaidTotal = Math.round((musicPaidTotal + alloc.musicAmount) * 100) / 100;
      personalPaidTotal = Math.round((personalPaidTotal + alloc.personalAmount) * 100) / 100;
    } else if (t.status === 'pending') {
      totalPendingReal = Math.round((totalPendingReal + amt) * 100) / 100;
      musicPendingTotal = Math.round((musicPendingTotal + alloc.musicAmount) * 100) / 100;
      personalPendingTotal = Math.round((personalPendingTotal + alloc.personalAmount) * 100) / 100;
    }

    if (alloc.musicAmount > 0) {
      musicCount += 1;
    }
    if (alloc.personalAmount > 0 || alloc.musicAmount === 0) {
      personalCount += 1;
    }
  });

  const safeTotalContract =
    Number(totalContractAmount) >= 0 ? Number(totalContractAmount) : VINY_DEFAULT_TOTAL_AMOUNT;
  const remainingBalance = Math.max(0, Math.round((safeTotalContract - totalPaidReal) * 100) / 100);
  const totalAllocatedMusic = Math.round((musicPaidTotal + musicPendingTotal) * 100) / 100;
  const personalContractTotal = Math.max(
    0,
    Math.round((safeTotalContract - totalAllocatedMusic) * 100) / 100
  );

  return {
    musicPaidTotal,
    musicPendingTotal,
    musicTotalAllocated: totalAllocatedMusic,
    musicContractTotal: totalAllocatedMusic,
    musicCeiling: VINY_MUSIC_MAX_CEILING,
    musicCount,
    personalPaidTotal,
    personalPendingTotal,
    personalTotalContract: personalContractTotal,
    personalContractTotal,
    personalCount,
    totalPaidReal,
    totalPendingReal,
    remainingBalance
  };
};

/**
 * Recalcula proporcionalmente SOMENTE as parcelas pendentes (status === 'pending') de uma dívida
 * quando o Valor Total ou o Intervalo de Centro de Custo é alterado.
 * - NUNCA exclui nem modifica o valor, data ou conta de transações já pagas (status === 'paid').
 * - Saldo Restante = Math.max(0, Valor Total - Soma das Parcelas Pagas).
 * - Redistribui o Saldo Restante proporcionalmente entre todas as parcelas não pagas (status === 'pending').
 */
export const recalculatePendingInstallmentsProportionally = (
  debt: Partial<Debt>,
  debtTransactions: Transaction[],
  newTotalAmount: number
): {
  paidTotal: number;
  paidSum: number;
  remainingBalance: number;
  updatedTransactions: Transaction[];
  pendingAmountsMap: Map<string, number>;
  averagePendingInstallment: number;
} => {
  const cleanTotal = Math.max(0, Math.round((Number(newTotalAmount) || 0) * 100) / 100);
  const activeTxs = debtTransactions.filter(t => t && t.status !== 'cancelled');

  const paidTotal = Math.round(
    activeTxs
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + (Math.abs(Number(t.amount) || 0) - Math.max(0, Number(t.interest) || 0)), 0) * 100
  ) / 100;

  const remainingBalance = Math.max(0, Math.round((cleanTotal - paidTotal) * 100) / 100);

  const pendingTxs = [...activeTxs.filter(t => t.status === 'pending')].sort((a, b) => {
    const instA = extractInstallmentNumber(a, activeTxs);
    const instB = extractInstallmentNumber(b, activeTxs);
    if (instA !== instB) return instA - instB;
    return (a.date || '').localeCompare(b.date || '');
  });

  const pendingAmountsMap = new Map<string, number>();

  if (pendingTxs.length > 0) {
    const currentPendingSum = pendingTxs.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    let allocatedSoFar = 0;

    pendingTxs.forEach((pt, idx) => {
      const isLast = idx === pendingTxs.length - 1;
      if (isLast) {
        const lastVal = Math.max(0, Math.round((remainingBalance - allocatedSoFar) * 100) / 100);
        pendingAmountsMap.set(pt.id, lastVal);
      } else {
        const weight = currentPendingSum > 0
          ? Math.abs(Number(pt.amount) || 0) / currentPendingSum
          : 1 / pendingTxs.length;
        const share = Math.max(0, Math.round(remainingBalance * weight * 100) / 100);
        allocatedSoFar = Math.round((allocatedSoFar + share) * 100) / 100;
        pendingAmountsMap.set(pt.id, share);
      }
    });
  }

  const updatedDebtRef: Partial<Debt> = {
    ...debt,
    totalAmount: cleanTotal
  };

  const updatedTransactions = debtTransactions.map(t => {
    if (!t || t.status === 'cancelled') return t;
    const instNum = extractInstallmentNumber(t, activeTxs);
    const isDownPayment = instNum === 0 || (t.description || '').toLowerCase().includes('entrada');
    const totalCount = updatedDebtRef.installmentCount || t.installmentTotal || 1;

    // PROTEÇÃO ABSOLUTA DE TRANSAÇÕES PAGAS NO PASSADO:
    // Jamais altera valor, data, status ou conta de uma transação já paga (status === 'paid')!
    if (t.status === 'paid') {
      const paidCC = t.manualCostCenterOverride
        ? {
            scope: t.scope || 'PERSONAL',
            categoryId: t.categoryId,
            subcategory: t.subcategory
          }
        : resolveDebtInstallmentCostCenter(updatedDebtRef, instNum, t.amount, t);
      return {
        ...t,
        installmentNumber: instNum,
        installmentTotal: totalCount,
        scope: paidCC.scope,
        categoryId: paidCC.categoryId,
        category: paidCC.categoryId,
        subcategory: paidCC.subcategory
      };
    }

    const nextAmount = pendingAmountsMap.has(t.id)
      ? pendingAmountsMap.get(t.id)!
      : Math.abs(Number(t.amount) || 0);
    const instCC = t.manualCostCenterOverride
      ? {
          scope: t.scope || 'PERSONAL',
          categoryId: t.categoryId,
          subcategory: t.subcategory,
          musicAmount:
            typeof t.customMusicAmount === 'number'
              ? Math.min(nextAmount, t.customMusicAmount)
              : t.scope === 'BUSINESS'
              ? nextAmount
              : 0,
          personalAmount:
            typeof t.customMusicAmount === 'number'
              ? Math.max(0, nextAmount - Math.min(nextAmount, t.customMusicAmount))
              : t.scope === 'BUSINESS'
              ? 0
              : nextAmount
        }
      : resolveDebtInstallmentCostCenter(updatedDebtRef, instNum, nextAmount, t);
    const debtName = updatedDebtRef.name || 'Dívida';

    return {
      ...t,
      amount: nextAmount,
      interest: 0,
      installmentNumber: instNum,
      installmentTotal: totalCount,
      description: isDownPayment
        ? `Entrada Inicial - ${debtName}`
        : `${debtName} (${instNum}/${totalCount})`,
      scope: instCC.scope,
      categoryId: instCC.categoryId,
      category: instCC.categoryId,
      subcategory: instCC.subcategory,
      customMusicAmount: t.manualCostCenterOverride ? instCC.musicAmount : instCC.musicAmount,
      customPersonalAmount: t.manualCostCenterOverride ? instCC.personalAmount : instCC.personalAmount,
      accountId: updatedDebtRef.accountId || t.accountId
    };
  });

  const averagePendingInstallment =
    pendingTxs.length > 0
      ? Math.round((remainingBalance / pendingTxs.length) * 100) / 100
      : 0;

  return {
    paidTotal,
    paidSum: paidTotal,
    remainingBalance,
    updatedTransactions,
    pendingAmountsMap,
    averagePendingInstallment
  };
};

/**
 * Ao alterar manualmente o valor de qualquer parcela pendente (para mais ou para menos),
 * recalcula a diferença e redistribui automaticamente o impacto SOMENTE nas demais parcelas pendentes,
 * mantendo a integridade estrita do Saldo Devedor Total e sem JAMAIS modificar transações já pagas
 * nem forçar reatribuição para Música caso a parcela esteja fora do intervalo definido.
 */
export const recalculateInstallmentManualChange = (
  debt: Partial<Debt> | undefined,
  debtTransactions: Transaction[],
  targetTransactionId: string,
  newInstallmentAmount: number,
  targetOverrides?: {
    scope?: 'BUSINESS' | 'PERSONAL';
    customMusicAmount?: number;
    customPersonalAmount?: number;
    manualCostCenterOverride?: boolean;
    subcategory?: string;
  }
): {
  paidTotal: number;
  remainingBalance: number;
  updatedTransactions: Transaction[];
  updatedAmountsMap: Map<string, number>;
} => {
  const activeTxs = debtTransactions.filter(t => t && t.status !== 'cancelled');
  const targetTx = activeTxs.find(t => t.id === targetTransactionId);
  const cleanNewAmount = Math.max(0, Math.round((Number(newInstallmentAmount) || 0) * 100) / 100);

  const totalContract =
    debt && Number(debt.totalAmount) > 0
      ? Math.round(Number(debt.totalAmount) * 100) / 100
      : Math.round(activeTxs.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0) * 100) / 100;

  const paidTotal = Math.round(
    activeTxs
      .filter(t => t.status === 'paid' && t.id !== targetTransactionId)
      .reduce((s, t) => s + (Math.abs(Number(t.amount) || 0) - Math.max(0, Number(t.interest) || 0)), 0) * 100
  ) / 100;

  const remainingBalance = Math.max(0, Math.round((totalContract - paidTotal) * 100) / 100);
  const updatedAmountsMap = new Map<string, number>();

  if (!targetTx) {
    return {
      paidTotal,
      remainingBalance,
      updatedTransactions: debtTransactions,
      updatedAmountsMap
    };
  }

  updatedAmountsMap.set(targetTransactionId, cleanNewAmount);

  // Só redistribui nas demais parcelas pendentes se a parcela editada for pendente
  const allOtherPending =
    targetTx.status === 'pending'
      ? [...activeTxs.filter(t => t.status === 'pending' && t.id !== targetTransactionId)].sort(
          (a, b) => {
            const instA = extractInstallmentNumber(a, activeTxs);
            const instB = extractInstallmentNumber(b, activeTxs);
            if (instA !== instB) return instA - instB;
            return (a.date || '').localeCompare(b.date || '');
          }
        )
      : [];

  if (allOtherPending.length > 0) {
    const targetInstNum = extractInstallmentNumber(targetTx, activeTxs);
    const subsequentPending = allOtherPending.filter(t => extractInstallmentNumber(t, activeTxs) > targetInstNum);
    const priorPending = allOtherPending.filter(t => extractInstallmentNumber(t, activeTxs) <= targetInstNum);
    const priorPendingSum = Math.round(
      priorPending.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0) * 100
    ) / 100;

    const canRedistributeToSubsequentOnly =
      subsequentPending.length > 0 &&
      Math.round((remainingBalance - priorPendingSum - cleanNewAmount) * 100) / 100 >= 0;

    const poolToRedistribute = canRedistributeToSubsequentOnly ? subsequentPending : allOtherPending;
    const poolTargetSum = canRedistributeToSubsequentOnly
      ? Math.max(0, Math.round((remainingBalance - priorPendingSum - cleanNewAmount) * 100) / 100)
      : Math.max(0, Math.round((remainingBalance - cleanNewAmount) * 100) / 100);

    const currentPoolSum = poolToRedistribute.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
    let allocatedSoFar = 0;

    poolToRedistribute.forEach((pt, idx) => {
      const isLast = idx === poolToRedistribute.length - 1;
      if (isLast) {
        const lastVal = Math.max(0, Math.round((poolTargetSum - allocatedSoFar) * 100) / 100);
        updatedAmountsMap.set(pt.id, lastVal);
      } else {
        const weight = currentPoolSum > 0
          ? Math.abs(Number(pt.amount) || 0) / currentPoolSum
          : 1 / poolToRedistribute.length;
        const share = Math.max(0, Math.round(poolTargetSum * weight * 100) / 100);
        allocatedSoFar = Math.round((allocatedSoFar + share) * 100) / 100;
        updatedAmountsMap.set(pt.id, share);
      }
    });
  }

  const fallbackPersonalCat = resolveDefaultPersonalDebtCategoryId(
    undefined,
    debt?.personalCategoryId || debt?.categoryId
  );

  const updatedTransactions = debtTransactions.map(t => {
    if (!t || t.status === 'cancelled') return t;
    // Jamais modifica transações já pagas que não sejam o próprio alvo
    if (t.status === 'paid' && t.id !== targetTransactionId) return t;
    if (!updatedAmountsMap.has(t.id)) return t;

    const nextAmount = updatedAmountsMap.get(t.id)!;
    const instNum = extractInstallmentNumber(t, activeTxs);

    // Se é a própria parcela sendo editada pelo usuário:
    if (t.id === targetTransactionId) {
      if (targetOverrides && (targetOverrides.manualCostCenterOverride || targetOverrides.scope || typeof targetOverrides.customMusicAmount === 'number')) {
        const customMusic =
          typeof targetOverrides.customMusicAmount === 'number'
            ? Math.min(nextAmount, Math.max(0, Math.round(targetOverrides.customMusicAmount * 100) / 100))
            : targetOverrides.scope === 'BUSINESS'
            ? nextAmount
            : 0;
        const customPersonal = Math.max(0, Math.round((nextAmount - customMusic) * 100) / 100);
        const nextScope: 'BUSINESS' | 'PERSONAL' = customMusic > 0 ? 'BUSINESS' : 'PERSONAL';
        const meta = resolveCareerSubcategoryMeta(
          targetOverrides.subcategory || t.subcategory || debt?.musicSubcategory
        );

        return {
          ...t,
          amount: nextAmount,
          interest: 0,
          installmentNumber: instNum,
          scope: nextScope,
          categoryId: nextScope === 'BUSINESS' ? meta.categoryId : fallbackPersonalCat,
          category: nextScope === 'BUSINESS' ? meta.categoryId : fallbackPersonalCat,
          subcategory: nextScope === 'BUSINESS' ? meta.subcategory : undefined,
          customMusicAmount: customMusic,
          customPersonalAmount: customPersonal,
          manualCostCenterOverride: true
        };
      }

      // Se a parcela já tinha override manual ou já estava fora do intervalo como PESSOAL, preserva e NÃO força Música!
      if (t.manualCostCenterOverride) {
        const prevMusic = typeof t.customMusicAmount === 'number' ? t.customMusicAmount : (t.scope === 'BUSINESS' ? nextAmount : 0);
        const clampedMusic = Math.min(nextAmount, Math.max(0, prevMusic));
        const clampedPersonal = Math.max(0, Math.round((nextAmount - clampedMusic) * 100) / 100);
        return {
          ...t,
          amount: nextAmount,
          interest: 0,
          installmentNumber: instNum,
          customMusicAmount: clampedMusic,
          customPersonalAmount: clampedPersonal
        };
      }
    }

    // Para as demais parcelas (ou quando não há override manual), resolve respeitando estritamente o intervalo (ex: 2 a 10; P11+ = 100% PESSOAL)
    if (t.manualCostCenterOverride) {
      const prevMusic = typeof t.customMusicAmount === 'number' ? t.customMusicAmount : (t.scope === 'BUSINESS' ? nextAmount : 0);
      const clampedMusic = Math.min(nextAmount, Math.max(0, prevMusic));
      const clampedPersonal = Math.max(0, Math.round((nextAmount - clampedMusic) * 100) / 100);
      return {
        ...t,
        amount: nextAmount,
        interest: 0,
        installmentNumber: instNum,
        customMusicAmount: clampedMusic,
        customPersonalAmount: clampedPersonal
      };
    }

    const instCC = debt ? resolveDebtInstallmentCostCenter(debt, instNum, nextAmount, t) : undefined;

    return {
      ...t,
      amount: nextAmount,
      interest: 0,
      installmentNumber: instNum,
      scope: instCC ? instCC.scope : t.scope,
      categoryId: instCC ? instCC.categoryId : t.categoryId,
      category: instCC ? instCC.categoryId : t.category,
      subcategory: instCC ? instCC.subcategory : t.subcategory,
      customMusicAmount: instCC?.musicAmount,
      customPersonalAmount: instCC?.personalAmount
    };
  });

  return {
    paidTotal,
    remainingBalance,
    updatedTransactions,
    updatedAmountsMap
  };
};

/**
 * Remove o card duplicado 'Som Léo' (caso exista), garante a categoria pessoal 'Dívidas / Empréstimo Pessoal',
 * e ajusta a Parcela 11+ do Viny para 100% PESSOAL por padrão (intervalo padrão 2 a 10),
 * sem JAMAIS alterar valores, datas ou contas de transações realizadas.
 */
export const reconcileUnifiedVinyDebt = (
  debts: Debt[],
  transactions: Transaction[],
  categories?: Category[]
): {
  changed: boolean;
  debts: Debt[];
  transactions: Transaction[];
  deletedDebtIds: string[];
  deletedTransactionIds: string[];
} => {
  const safeDebts = Array.isArray(debts) ? [...debts] : [];
  const safeTxs = Array.isArray(transactions) ? [...transactions] : [];
  const deletedDebtIds: string[] = [];
  const deletedTransactionIds: string[] = [];

  let changed = false;

  // 1. Remover qualquer card duplicado 'Som Léo' e suas transações
  const somLeoDebts = safeDebts.filter(d => isSomLeoDebtOrTransaction(d));
  if (somLeoDebts.length > 0) {
    changed = true;
    somLeoDebts.forEach(d => deletedDebtIds.push(d.id));
  }

  const remainingDebts = safeDebts.filter(d => !isSomLeoDebtOrTransaction(d));

  const somLeoTxs = safeTxs.filter(t => isSomLeoDebtOrTransaction(null, t));
  if (somLeoTxs.length > 0) {
    changed = true;
    somLeoTxs.forEach(t => deletedTransactionIds.push(t.id));
  }

  const remainingTxs = safeTxs.filter(t => !isSomLeoDebtOrTransaction(null, t));

  // 2. Migrar categorias pessoais e ajustar o fim padrão do intervalo do Viny de 11 para 10 (se ainda estava 11)
  remainingDebts.forEach((d, idx) => {
    const resolvedPersonalCat = resolveDefaultPersonalDebtCategoryId(categories, d.personalCategoryId || d.categoryId);
    const isViny = isVinyDebtOrTransaction(d);
    const needsCatFix = d.personalCategoryId === 'cat_1' || (!d.personalCategoryId && d.categoryId === 'cat_1');
    const needsVinyEndFix = isViny && (d.businessEndInstallment === undefined || d.businessEndInstallment === 11);

    if (needsCatFix || needsVinyEndFix) {
      changed = true;
      remainingDebts[idx] = {
        ...d,
        personalCategoryId: resolvedPersonalCat,
        categoryId: d.scope === 'BUSINESS' ? d.categoryId : resolvedPersonalCat,
        ...(needsVinyEndFix
          ? {
              costCenterMode: d.costCenterMode || 'INSTALLMENT_RANGE',
              businessStartInstallment: d.businessStartInstallment ?? VINY_MUSIC_START_INSTALLMENT,
              businessEndInstallment: VINY_MUSIC_END_INSTALLMENT
            }
          : {})
      };
    }
  });

  // 3. Garantir que a Parcela 11 em diante do Viny (sem override manual) seja categorizada como 100% PESSOAL,
  // sem tocar em amount, date, status ou accountId!
  const updatedTxs = remainingTxs.map(t => {
    if (!t || t.status === 'cancelled' || t.manualCostCenterOverride) return t;
    const parentDebt = t.debtId ? remainingDebts.find(d => d.id === t.debtId) : undefined;
    if (!isVinyDebtOrTransaction(parentDebt, t)) return t;

    const instNum = extractInstallmentNumber(t, remainingTxs);
    const startInst = parentDebt?.businessStartInstallment ?? VINY_MUSIC_START_INSTALLMENT;
    const endInst = parentDebt?.businessEndInstallment ?? VINY_MUSIC_END_INSTALLMENT;

    if (instNum > endInst || instNum < startInst) {
      const resolvedPersonalCat = resolveDefaultPersonalDebtCategoryId(
        categories,
        parentDebt?.personalCategoryId || t.categoryId
      );
      if (t.scope !== 'PERSONAL' || t.subcategory || t.categoryId === 'cat_equipamentos') {
        changed = true;
        return {
          ...t,
          scope: 'PERSONAL' as ScopeType,
          categoryId: resolvedPersonalCat,
          category: resolvedPersonalCat,
          subcategory: undefined,
          customMusicAmount: 0,
          customPersonalAmount: Math.abs(Number(t.amount) || 0)
        };
      }
    }
    return t;
  });

  return {
    changed,
    debts: remainingDebts,
    transactions: updatedTxs,
    deletedDebtIds,
    deletedTransactionIds
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
  rawAmount: number = 0,
  txOverride?: Partial<Transaction>
): {
  scope: 'BUSINESS' | 'PERSONAL';
  categoryId: string;
  subcategory?: string;
  musicAmount?: number;
  personalAmount?: number;
  isTransitionInstallment?: boolean;
} => {
  const cleanAmount = Math.round(Math.abs(Number(rawAmount) || 0) * 100) / 100;
  const fallbackPersonalCat = resolveDefaultPersonalDebtCategoryId(
    undefined,
    debt.personalCategoryId || debt.categoryId
  );

  // Se o usuário definiu manualmente o centro de custo ou valor de música desta parcela específica:
  if (txOverride?.manualCostCenterOverride) {
    const meta = resolveCareerSubcategoryMeta(txOverride.subcategory || debt.musicSubcategory);
    if (typeof txOverride.customMusicAmount === 'number' && !isNaN(txOverride.customMusicAmount)) {
      const mAmt = Math.min(cleanAmount, Math.max(0, Math.round(txOverride.customMusicAmount * 100) / 100));
      const pAmt = Math.max(0, Math.round((cleanAmount - mAmt) * 100) / 100);
      return {
        scope: mAmt > 0 ? 'BUSINESS' : 'PERSONAL',
        categoryId: mAmt > 0 ? meta.categoryId : fallbackPersonalCat,
        subcategory: mAmt > 0 ? meta.subcategory : undefined,
        musicAmount: mAmt,
        personalAmount: pAmt,
        isTransitionInstallment: mAmt > 0 && pAmt > 0
      };
    }
    if (txOverride.scope === 'PERSONAL') {
      return {
        scope: 'PERSONAL',
        categoryId: fallbackPersonalCat,
        subcategory: undefined,
        musicAmount: 0,
        personalAmount: cleanAmount,
        isTransitionInstallment: false
      };
    }
    if (txOverride.scope === 'BUSINESS') {
      return {
        scope: 'BUSINESS',
        categoryId: meta.categoryId,
        subcategory: meta.subcategory,
        musicAmount: cleanAmount,
        personalAmount: 0,
        isTransitionInstallment: false
      };
    }
  }

  // Regra de Rateio Dinâmico do Contrato do 'Viny':
  // Intervalo padrão: Parcelas 2 a 10 (ajustável pelo usuário em businessStartInstallment / businessEndInstallment).
  // Parcela 11 em diante (e Parcela 1 / Entrada): categorizada automaticamente como 100% 'PESSOAL'.
  if (isVinyDebtOrTransaction(debt)) {
    const startInst = debt.businessStartInstallment ?? VINY_MUSIC_START_INSTALLMENT;
    const endInst = debt.businessEndInstallment ?? VINY_MUSIC_END_INSTALLMENT;
    const monthlyLimit =
      typeof debt.musicMonthlyAmount === 'number' && debt.musicMonthlyAmount > 0
        ? debt.musicMonthlyAmount
        : VINY_MONTHLY_MUSIC_FIXED;
    const priorMusicCount =
      installmentNumber >= startInst && installmentNumber <= endInst
        ? Math.max(0, installmentNumber - startInst)
        : 0;
    const alreadyAllocatedMusic = priorMusicCount * monthlyLimit;
    const alloc = resolveVinyInstallmentAllocation(
      installmentNumber,
      cleanAmount,
      fallbackPersonalCat,
      alreadyAllocatedMusic,
      startInst,
      endInst,
      monthlyLimit,
      txOverride
    );
    return {
      scope: alloc.scope,
      categoryId: alloc.categoryId,
      subcategory: alloc.subcategory,
      musicAmount: alloc.musicAmount,
      personalAmount: alloc.personalAmount,
      isTransitionInstallment: alloc.isMusicInterval && alloc.personalAmount > 0
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
    const customMonthly =
      typeof debt.musicMonthlyAmount === 'number' && debt.musicMonthlyAmount > 0
        ? Math.min(cleanAmount, Math.round(debt.musicMonthlyAmount * 100) / 100)
        : cleanAmount;
    const personalRemainder = Math.max(0, Math.round((cleanAmount - customMonthly) * 100) / 100);
    return {
      scope: customMonthly > 0 ? 'BUSINESS' : 'PERSONAL',
      categoryId: customMonthly > 0 ? meta.categoryId : fallbackPersonalCat,
      subcategory: customMonthly > 0 ? meta.subcategory : undefined,
      musicAmount: customMonthly,
      personalAmount: personalRemainder,
      isTransitionInstallment: customMonthly > 0 && personalRemainder > 0
    };
  }

  return {
    scope: 'PERSONAL',
    categoryId: fallbackPersonalCat,
    subcategory: undefined,
    musicAmount: 0,
    personalAmount: cleanAmount,
    isTransitionInstallment: false
  };
};

/**
 * Pré-calcula o mapa de alocação dinâmica de cada transação do contrato 'Viny',
 * garantindo que:
 * 1. As parcelas dentro do intervalo configurado (padrão Parcelas 2 a 10)
 *    destinem para 'MÚSICA / CARREIRA' o valor de `Math.min(valorDaParcela, limiteMensalMusica)`.
 * 2. Da Parcela 11 em diante (ou qualquer parcela fora do intervalo sem override manual),
 *    seja categorizada automaticamente como 100% 'PESSOAL' (musicAmount = 0).
 * 3. Em NENHUMA hipótese o valor de Música supere o valor da própria parcela.
 */
export const buildVinyAllocationMap = (
  allTransactions: Transaction[],
  debts: Debt[] = []
): Map<string, { musicAmount: number; personalAmount: number; instNum: number; isSoundInstallment: boolean }> => {
  const map = new Map<string, { musicAmount: number; personalAmount: number; instNum: number; isSoundInstallment: boolean }>();
  const safeTxs = Array.isArray(allTransactions) ? allTransactions : [];
  const safeDebts = Array.isArray(debts) ? debts : [];

  const vinyTxs = safeTxs
    .filter(t => {
      if (!t || t.type !== 'expense' || t.status === 'cancelled') return false;
      const parentDebt = t.debtId ? safeDebts.find(d => d.id === t.debtId) : undefined;
      return isVinyDebtOrTransaction(parentDebt, t);
    })
    .sort((a, b) => {
      const instA = extractInstallmentNumber(a, safeTxs);
      const instB = extractInstallmentNumber(b, safeTxs);
      if (instA !== instB) return instA - instB;
      return (a.date || '').localeCompare(b.date || '');
    });

  let cumulativeAllMusic = 0;

  vinyTxs.forEach(t => {
    const rawAmt = Math.round(Math.abs(Number(t.amount) || 0) * 100) / 100;
    const instNum = extractInstallmentNumber(t, safeTxs);
    const parentDebt = t.debtId ? safeDebts.find(d => d.id === t.debtId) : undefined;
    const startInst = parentDebt?.businessStartInstallment ?? VINY_MUSIC_START_INSTALLMENT;
    const endInst = parentDebt?.businessEndInstallment ?? VINY_MUSIC_END_INSTALLMENT;
    const customMonthly = parentDebt?.musicMonthlyAmount;

    const alloc = resolveVinyInstallmentAllocation(
      instNum,
      rawAmt,
      parentDebt?.personalCategoryId || DEFAULT_PERSONAL_DEBT_CATEGORY_ID,
      cumulativeAllMusic,
      startInst,
      endInst,
      customMonthly,
      t
    );

    cumulativeAllMusic = Math.round((cumulativeAllMusic + alloc.musicAmount) * 100) / 100;
    map.set(t.id, {
      musicAmount: alloc.musicAmount,
      personalAmount: alloc.personalAmount,
      instNum,
      isSoundInstallment: alloc.isMusicInterval
    });
  });

  return map;
};

/**
 * Retorna a divisão exata entre 'MÚSICA / CARREIRA' e 'PESSOAL' para uma transação de despesa.
 */
export const getTransactionCareerAndPersonalSplit = (
  t: Transaction,
  debts?: Debt[],
  allTransactions?: Transaction[]
): { musicAmount: number; careerAmount: number; personalAmount: number } => {
  if (!t || t.type !== 'expense' || t.status === 'cancelled') {
    return { musicAmount: 0, careerAmount: 0, personalAmount: 0 };
  }
  if (isSomLeoDebtOrTransaction(null, t)) {
    return { musicAmount: 0, careerAmount: 0, personalAmount: 0 };
  }

  const rawAmt = Math.round(Math.abs(Number(t.amount) || 0) * 100) / 100;
  const safeDebts = Array.isArray(debts) ? debts : [];
  const parentDebt = t.debtId ? safeDebts.find(d => d.id === t.debtId) : undefined;

  if (isSomLeoDebtOrTransaction(parentDebt, t)) {
    return { musicAmount: 0, careerAmount: 0, personalAmount: 0 };
  }

  if (t.manualCostCenterOverride && typeof t.customMusicAmount === 'number') {
    const mAmt = Math.min(rawAmt, Math.max(0, Math.round(t.customMusicAmount * 100) / 100));
    const pAmt = Math.max(0, Math.round((rawAmt - mAmt) * 100) / 100);
    return { musicAmount: mAmt, careerAmount: mAmt, personalAmount: pAmt };
  }

  if (isVinyDebtOrTransaction(parentDebt, t)) {
    if (Array.isArray(allTransactions) && allTransactions.length > 0) {
      const vinyMap = buildVinyAllocationMap(allTransactions, safeDebts);
      const entry = vinyMap.get(t.id);
      if (entry) {
        return {
          musicAmount: entry.musicAmount,
          careerAmount: entry.musicAmount,
          personalAmount: entry.personalAmount
        };
      }
    }
    const instNum = extractInstallmentNumber(t, allTransactions);
    const alloc = resolveVinyInstallmentAllocation(
      instNum,
      rawAmt,
      parentDebt?.personalCategoryId || DEFAULT_PERSONAL_DEBT_CATEGORY_ID,
      0,
      parentDebt?.businessStartInstallment ?? VINY_MUSIC_START_INSTALLMENT,
      parentDebt?.businessEndInstallment ?? VINY_MUSIC_END_INSTALLMENT,
      parentDebt?.musicMonthlyAmount,
      t
    );
    return {
      musicAmount: alloc.musicAmount,
      careerAmount: alloc.musicAmount,
      personalAmount: alloc.personalAmount
    };
  }

  if (parentDebt) {
    const instNum = extractInstallmentNumber(t, allTransactions);
    const cc = resolveDebtInstallmentCostCenter(parentDebt, instNum, rawAmt, t);
    const mAmt = Math.min(rawAmt, Math.max(0, Number(cc.musicAmount) || 0));
    const pAmt = Math.max(0, Math.round((rawAmt - mAmt) * 100) / 100);
    return { musicAmount: mAmt, careerAmount: mAmt, personalAmount: pAmt };
  }

  if (isCareerExpenseTransaction(t, safeDebts, allTransactions)) {
    return { musicAmount: rawAmt, careerAmount: rawAmt, personalAmount: 0 };
  }

  return { musicAmount: 0, careerAmount: 0, personalAmount: rawAmt };
};

/**
 * Verifica se uma transação de despesa pertence ao Centro de Custo 'MÚSICA / CARREIRA'.
 * - No contrato único do 'Viny': apenas as Parcelas 2 a 11 (Fevereiro a Novembro) possuem cota da Música,
 *   respeitando o teto máximo acumulado de R$ 6.500,00 (10x R$ 650,00).
 *   Entrada (R$ 300), P1 (Janeiro) e P12 a P18+ (Dezembro em diante) são 100% Pessoais.
 */
export const isCareerExpenseTransaction = (
  t: Transaction,
  debts?: Debt[],
  allTransactions?: Transaction[]
): boolean => {
  if (!t || t.type !== 'expense' || t.status === 'cancelled') return false;

  // Ignora qualquer registro residual do card duplicado 'Som Léo'
  if (isSomLeoDebtOrTransaction(null, t)) return false;

  const desc = (t.description || '').toLowerCase();
  if (desc.includes('retirada de pró-labore') || desc.includes('retirada de pro-labore')) {
    return false;
  }

  const parentDebt = t.debtId && debts && debts.length > 0
    ? debts.find(d => d.id === t.debtId)
    : undefined;

  if (isSomLeoDebtOrTransaction(parentDebt, t)) {
    return false;
  }

  // Regra do Contrato Único 'Viny': respeita intervalo configurável (padrão 2 a 10) e overrides manuais
  if (isVinyDebtOrTransaction(parentDebt, t)) {
    if (t.manualCostCenterOverride && typeof t.customMusicAmount === 'number') {
      return t.customMusicAmount > 0;
    }
    if (Array.isArray(allTransactions) && allTransactions.length > 0) {
      const vinyMap = buildVinyAllocationMap(allTransactions, debts || []);
      const entry = vinyMap.get(t.id);
      if (entry) return entry.musicAmount > 0;
    }
    const instNum = extractInstallmentNumber(t, allTransactions);
    const startInst = parentDebt?.businessStartInstallment ?? VINY_MUSIC_START_INSTALLMENT;
    const endInst = parentDebt?.businessEndInstallment ?? VINY_MUSIC_END_INSTALLMENT;
    return instNum >= startInst && instNum <= endInst;
  }

  // Se for parcela/lançamento de outras dívidas:
  if (t.debtId) {
    if (t.manualCostCenterOverride && typeof t.customMusicAmount === 'number') {
      return t.customMusicAmount > 0;
    }
    if (t.scope === 'PERSONAL') return false;
    if (t.scope === 'BUSINESS') return true;

    if (parentDebt) {
      const resolved = resolveDebtInstallmentCostCenter(parentDebt, t.installmentNumber ?? 1, t.amount, t);
      return resolved.scope === 'BUSINESS' && (resolved.musicAmount ?? 0) > 0;
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
 * Regra obrigatória para o Contrato Único do 'Viny':
 * - Teto MÁXIMO acumulado para a DRE da Música ('Equipamentos/Som'): R$ 6.500,00 (10x de R$ 650,00).
 *   Em NENHUMA hipótese a soma direcionada para a DRE da Música pode ultrapassar R$ 6.500,00.
 * - Nas Parcelas 2 a 11 (meses de Fevereiro a Novembro) PAGAS: destina exatamente R$ 650,00/mês
 *   para a DRE da Música (Categoria: 'Equipamentos/Som').
 * - Todo o valor excedente pago em cada parcela e as demais parcelas (Entrada R$ 300, P1 R$ 1.000
 *   e P12 a P18+) são alocados automaticamente em 'PESSOAL' e NÃO entram na DRE da Música.
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

  // Mapa global de rateio do Viny (garante o teto absoluto de R$ 6.500,00 em qualquer recorte de período)
  const vinyAllocationMap = buildVinyAllocationMap(safeTxs, safeDebts);
  let periodVinyMusicSum = 0;

  const filteredTxs: Transaction[] = [];

  safeTxs.forEach(t => {
    if (!t || !t.date || t.type !== 'expense' || t.status === 'cancelled') return;

    // Ignorar qualquer transação residual de 'Som Léo'
    if (isSomLeoDebtOrTransaction(null, t)) return;

    if (options?.monthPrefix && !t.date.startsWith(options.monthPrefix)) return;
    if (options?.startDate && t.date < options.startDate) return;
    if (options?.endDate && t.date > options.endDate) return;

    // Parcelas de dívida: SEMPRE exigir status === 'paid' nos relatórios da música
    if (t.debtId && t.status !== 'paid') return;
    if (onlyPaidForAll && t.status !== 'paid') return;

    const parentDebt = t.debtId ? safeDebts.find(d => d.id === t.debtId) : undefined;
    if (isSomLeoDebtOrTransaction(parentDebt, t)) return;

    // Regra de Rateio Dinâmico do Contrato 'Viny' (intervalo padrão 2 a 10, P11+ = 100% Pessoal, ou override manual):
    if (isVinyDebtOrTransaction(parentDebt, t)) {
      const alloc = vinyAllocationMap.get(t.id);
      const finalMusicAmount = alloc ? alloc.musicAmount : 0;

      if (finalMusicAmount > 0) {
        periodVinyMusicSum = Math.round((periodVinyMusicSum + finalMusicAmount) * 100) / 100;
        filteredTxs.push({
          ...t,
          amount: finalMusicAmount,
          scope: 'BUSINESS',
          categoryId: 'cat_equipamentos',
          subcategory: t.subcategory || 'Equipamentos/Som'
        });
      }
      return;
    }

    // Outras dívidas com rateio customizado por parcela ou valor mensal fixo de música
    if (t.debtId && (t.manualCostCenterOverride || parentDebt)) {
      const split = getTransactionCareerAndPersonalSplit(t, safeDebts, safeTxs);
      if (split.musicAmount > 0) {
        filteredTxs.push({
          ...t,
          amount: split.musicAmount,
          scope: 'BUSINESS'
        });
      }
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
