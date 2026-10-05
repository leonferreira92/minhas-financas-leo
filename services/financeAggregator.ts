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
export const VINY_MUSIC_END_INSTALLMENT = 11;  // Novembro (P11)
export const VINY_MONTHLY_MUSIC_FIXED = 650.0; // R$ 650,00/mês fixos na DRE da Música (Fev a Nov)
export const VINY_MUSIC_MAX_CEILING = 6500.0;  // Teto MÁXIMO acumulado na DRE da Música (10x R$ 650,00 = R$ 6.500,00)
export const VINY_DEFAULT_TOTAL_AMOUNT = 12435.0; // Valor Total padrão do contrato único do Viny (R$ 12.435,00)
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
 * Calcula o rateio de uma parcela do contrato único do 'Viny', respeitando estritamente
 * o valor fixo de R$ 650,00/mês (Fevereiro a Novembro, P2 a P11) e o teto acumulado de R$ 6.500,00:
 * - Parcelas 2 a 11 (Fevereiro a Novembro): exatamente R$ 650,00 na Música ('Equipamentos/Som'),
 *   limitado ao teto acumulado de R$ 6.500,00, e todo o valor excedente em 'PESSOAL'.
 * - Entrada (0), Parcela 1 (Janeiro) e Parcelas 12 a 18+ (Dezembro em diante): 100% 'PESSOAL'.
 */
export const resolveVinyInstallmentAllocation = (
  installmentNumber: number,
  rawAmount: number = 0,
  personalCategoryId: string = DEFAULT_PERSONAL_DEBT_CATEGORY_ID,
  alreadyAllocatedMusicTotal: number = 0
): {
  scope: 'BUSINESS' | 'PERSONAL';
  categoryId: string;
  subcategory?: string;
  musicAmount: number;
  personalAmount: number;
  isMusicInterval: boolean;
} => {
  const cleanAmount = Math.abs(Number(rawAmount) || 0);
  const safePersonalCat = resolveDefaultPersonalDebtCategoryId(undefined, personalCategoryId);
  const isMusicInterval =
    installmentNumber >= VINY_MUSIC_START_INSTALLMENT &&
    installmentNumber <= VINY_MUSIC_END_INSTALLMENT;

  const remainingCeiling = Math.max(
    0,
    Math.round((VINY_MUSIC_MAX_CEILING - Math.max(0, alreadyAllocatedMusicTotal)) * 100) / 100
  );

  if (isMusicInterval && remainingCeiling > 0) {
    const musicAmount = Math.min(VINY_MONTHLY_MUSIC_FIXED, remainingCeiling);
    const personalAmount = Math.max(0, Math.round((cleanAmount - musicAmount) * 100) / 100);
    return {
      scope: 'BUSINESS',
      categoryId: 'cat_equipamentos',
      subcategory: 'Equipamentos/Som',
      musicAmount,
      personalAmount,
      isMusicInterval: true
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
 * Calcula o resumo consolidado de Centro de Custo para o Contrato Único do Viny,
 * garantindo que a soma direcionada para a DRE da Música JAMAIS ultrapasse R$ 6.500,00 (10x R$ 650,00)
 * e que o Saldo Restante seja sempre (Valor Total - Total Amortizado Real).
 */
export const calculateVinyCostCenterSummary = (
  vinyTransactions: Transaction[],
  totalContractAmount: number = VINY_DEFAULT_TOTAL_AMOUNT
) => {
  const sorted = [...(Array.isArray(vinyTransactions) ? vinyTransactions : [])].sort((a, b) => {
    const instA = extractInstallmentNumber(a, vinyTransactions);
    const instB = extractInstallmentNumber(b, vinyTransactions);
    if (instA !== instB) return instA - instB;
    return (a.date || '').localeCompare(b.date || '');
  });

  let musicPaidTotal = 0;
  let musicPendingTotal = 0;
  let musicCount = 0;
  let personalCount = 0;
  let totalPaidReal = 0;

  sorted.forEach(t => {
    if (!t || t.status === 'cancelled') return;
    const amt = Math.abs(Number(t.amount) || 0);
    const instNum = extractInstallmentNumber(t, sorted);
    const isSoundInstallment =
      instNum >= VINY_MUSIC_START_INSTALLMENT && instNum <= VINY_MUSIC_END_INSTALLMENT;

    if (t.status === 'paid') {
      totalPaidReal = Math.round((totalPaidReal + amt) * 100) / 100;
    }

    if (isSoundInstallment) {
      musicCount += 1;
      const currentAllocatedMusic = musicPaidTotal + musicPendingTotal;
      const remainingCeiling = Math.max(0, VINY_MUSIC_MAX_CEILING - currentAllocatedMusic);
      const installmentMusicQuota = Math.min(VINY_MONTHLY_MUSIC_FIXED, remainingCeiling);

      if (t.status === 'paid') {
        const remainingPaidCeiling = Math.max(0, VINY_MUSIC_MAX_CEILING - musicPaidTotal);
        musicPaidTotal = Math.round(
          (musicPaidTotal + Math.min(VINY_MONTHLY_MUSIC_FIXED, remainingPaidCeiling)) * 100
        ) / 100;
      } else if (t.status === 'pending') {
        musicPendingTotal = Math.round((musicPendingTotal + installmentMusicQuota) * 100) / 100;
      }

      if (amt > VINY_MONTHLY_MUSIC_FIXED) {
        personalCount += 1;
      }
    } else {
      personalCount += 1;
    }
  });

  // Garantia absoluta: Pago + Pendente na Música NUNCA ultrapassa R$ 6.500,00
  musicPaidTotal = Math.min(VINY_MUSIC_MAX_CEILING, musicPaidTotal);
  musicPendingTotal = Math.min(Math.max(0, VINY_MUSIC_MAX_CEILING - musicPaidTotal), musicPendingTotal);

  const personalPaidTotal = Math.max(0, Math.round((totalPaidReal - musicPaidTotal) * 100) / 100);
  const safeTotalContract = Number(totalContractAmount) > 0 ? Number(totalContractAmount) : VINY_DEFAULT_TOTAL_AMOUNT;
  const remainingBalance = Math.max(0, Math.round((safeTotalContract - totalPaidReal) * 100) / 100);

  return {
    musicPaidTotal,
    musicPendingTotal,
    musicCeiling: VINY_MUSIC_MAX_CEILING,
    musicCount: Math.min(10, musicCount || 10),
    personalPaidTotal,
    personalTotalContract: Math.max(0, Math.round((safeTotalContract - VINY_MUSIC_MAX_CEILING) * 100) / 100),
    personalCount,
    totalPaidReal,
    remainingBalance
  };
};

/**
 * Remove o card duplicado 'Som Léo' (caso exista) e restaura/mantém o contrato único do 'Viny'
 * com todos os lançamentos e valores históricos intactos, categoria pessoal 'Dívidas / Empréstimo Pessoal',
 * Valor Total R$ 12.435,00 e Saldo Restante = (R$ 12.435,00 - Total Amortizado Real).
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

  let remainingTxs = safeTxs.filter(t => !isSomLeoDebtOrTransaction(null, t));

  // 2. Migrar categorias pessoais de todas as dívidas que ainda apontem para 'cat_1' (Alimentação)
  remainingDebts.forEach((d, idx) => {
    const resolvedPersonalCat = resolveDefaultPersonalDebtCategoryId(categories, d.personalCategoryId || d.categoryId);
    if (d.personalCategoryId === 'cat_1' || (!d.personalCategoryId && d.categoryId === 'cat_1')) {
      changed = true;
      remainingDebts[idx] = {
        ...d,
        personalCategoryId: resolvedPersonalCat,
        categoryId: d.scope === 'BUSINESS' ? d.categoryId : resolvedPersonalCat
      };
    }
  });

  // 3. Verificar e preservar/restaurar o contrato único do 'Viny'
  const vinyIdx = remainingDebts.findIndex(d => isVinyDebtOrTransaction(d));
  if (vinyIdx !== -1) {
    const vinyDebt = { ...remainingDebts[vinyIdx] };
    const personalCatId = resolveDefaultPersonalDebtCategoryId(
      categories,
      vinyDebt.personalCategoryId || vinyDebt.categoryId
    );

    const vinyTxs = remainingTxs
      .filter(t => t.debtId === vinyDebt.id)
      .sort((a, b) => {
        const aIsDown = a.installmentNumber === 0 || (a.description || '').toLowerCase().includes('entrada');
        const bIsDown = b.installmentNumber === 0 || (b.description || '').toLowerCase().includes('entrada');
        if (aIsDown && !bIsDown) return -1;
        if (!aIsDown && bIsDown) return 1;
        return (a.date || '').localeCompare(b.date || '');
      });

    const paidTxs = vinyTxs.filter(t => t.status === 'paid');
    const paidSum = Math.round(paidTxs.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0) * 100) / 100;

    // Detecta se a separação anterior ('Som Léo') havia deduzido R$ 647 das parcelas históricas do Viny
    const wasAlteredBySplit =
      somLeoDebts.length > 0 ||
      somLeoTxs.length > 0 ||
      vinyTxs.some(t => (t.description || '').toLowerCase().includes('camisa do brasil')) ||
      (paidTxs.length > 0 && paidSum < 6100 && vinyTxs.some(t => [353, 53, 36, 120, 57].includes(Math.round(Number(t.amount) || 0))));

    // Se o valor total estava com o resíduo da migração anterior (5965, 6470 ou 12603), corrige para R$ 12.435,00
    const currentTotalRounded = Math.round((Number(vinyDebt.totalAmount) || 0) * 100) / 100;
    const isSyntheticOldTotal =
      !currentTotalRounded ||
      currentTotalRounded === 5965 ||
      currentTotalRounded === 6470 ||
      currentTotalRounded === 12603;

    const targetTotalAmount = isSyntheticOldTotal ? VINY_DEFAULT_TOTAL_AMOUNT : currentTotalRounded;
    const targetInstallmentCount = vinyDebt.installmentCount || 18;

    let finalVinyTxs = [...vinyTxs];

    if (wasAlteredBySplit) {
      changed = true;
      const pendingTxs = vinyTxs
        .filter(t => t.status === 'pending')
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      const firstRefDate =
        somLeoTxs[0]?.date ||
        vinyTxs.find(t => t.installmentNumber !== 0)?.date ||
        vinyDebt.startDate ||
        `${new Date().getFullYear()}-01-10`;
      const [baseY, , baseD] = firstRefDate.split('-').map(Number);
      const year = baseY || new Date().getFullYear();
      const day = String(baseD || 10).padStart(2, '0');
      const accountId = vinyDebt.accountId || vinyTxs[0]?.accountId || 'acc_bb';

      let runningMusic = 0;
      const restoredPaidTxs: Transaction[] = VINY_HISTORICAL_PAID_SCHEDULE.map((item, idx) => {
        const existingMatch =
          item.installmentNumber === 0
            ? paidTxs.find(
                t =>
                  t.installmentNumber === 0 ||
                  (t.description || '').toLowerCase().includes('entrada') ||
                  Math.round(Number(t.amount) || 0) === 300
              )
            : paidTxs[idx];

        const monthStr = String(item.monthOffset + 1).padStart(2, '0');
        const txDate = existingMatch?.date || `${year}-${monthStr}-${day}`;
        const alloc = resolveVinyInstallmentAllocation(item.installmentNumber, item.amount, personalCatId, runningMusic);
        runningMusic += alloc.musicAmount;

        return {
          id: existingMatch?.id || `tx_viny_hist_${item.installmentNumber}`,
          debtId: vinyDebt.id,
          description:
            item.installmentNumber === 0
              ? `Entrada Inicial - ${vinyDebt.name}`
              : `${vinyDebt.name} (${item.installmentNumber}/18)`,
          amount: item.amount,
          type: 'expense',
          status: 'paid',
          date: txDate,
          categoryId: alloc.categoryId,
          category: alloc.categoryId,
          subcategory: alloc.subcategory,
          scope: alloc.scope,
          accountId: existingMatch?.accountId || accountId,
          installmentNumber: item.installmentNumber,
          installmentTotal: 18,
          createdAt: existingMatch?.createdAt || Date.now() + idx
        };
      });

      const restoredPaidSum = restoredPaidTxs.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
      const remainingToDistribute = Math.max(0, Math.round((targetTotalAmount - restoredPaidSum) * 100) / 100);
      const totalPendingCount = Math.max(10, pendingTxs.length);
      const basePendingVal = Math.floor((remainingToDistribute / totalPendingCount) * 100) / 100;
      const pendingRemainder = Math.round((remainingToDistribute - basePendingVal * totalPendingCount) * 100) / 100;

      const restoredPendingTxs: Transaction[] = [];
      for (let i = 0; i < totalPendingCount; i++) {
        const instNum = 9 + i; // P9 a P18
        const existingPending = pendingTxs[i];
        const d = new Date(year, 8 + i, Number(day) || 10, 12, 0, 0);
        const txDate = existingPending?.date || d.toISOString().slice(0, 10);
        const isLast = i === totalPendingCount - 1;
        const pendingAmt = isLast
          ? Math.round((basePendingVal + pendingRemainder) * 100) / 100
          : basePendingVal;

        const alloc = resolveVinyInstallmentAllocation(instNum, pendingAmt, personalCatId, runningMusic);
        runningMusic += alloc.musicAmount;

        restoredPendingTxs.push({
          id: existingPending?.id || `tx_viny_pend_${instNum}`,
          debtId: vinyDebt.id,
          description: `${vinyDebt.name} (${instNum}/18)`,
          amount: pendingAmt,
          type: 'expense',
          status: 'pending',
          date: txDate,
          categoryId: alloc.categoryId,
          category: alloc.categoryId,
          subcategory: alloc.subcategory,
          scope: alloc.scope,
          accountId: existingPending?.accountId || accountId,
          installmentNumber: instNum,
          installmentTotal: 18,
          createdAt: existingPending?.createdAt || Date.now() + 100 + instNum
        });
      }

      const keptIds = new Set([...restoredPaidTxs, ...restoredPendingTxs].map(t => t.id));
      vinyTxs.forEach(t => {
        if (!keptIds.has(t.id)) {
          deletedTransactionIds.push(t.id);
        }
      });

      finalVinyTxs = [...restoredPaidTxs, ...restoredPendingTxs];
    } else {
      // Garante metadados de escopo/categoria (incluindo troca de 'cat_1' para 'cat_dividas') sem tocar nos valores pagos
      let nonDownCounter = 0;
      let runningMusic = 0;
      const totalCount = vinyDebt.installmentCount || 18;
      finalVinyTxs = vinyTxs.map(t => {
        const isDown =
          t.installmentNumber === 0 ||
          (t.description || '').toLowerCase().includes('entrada') ||
          (Math.round(Number(t.amount) || 0) === 300 && nonDownCounter === 0);

        const instNum = isDown ? 0 : ++nonDownCounter;
        const alloc = resolveVinyInstallmentAllocation(instNum, t.amount, personalCatId, runningMusic);
        runningMusic += alloc.musicAmount;

        const cleanDesc = (t.description || '')
          .replace(/\s*•?\s*incl\.\s*R\$\s*57,00\s*Camisa do Brasil/gi, '')
          .replace(/\s*\(incl\.\s*R\$\s*57,00\s*Camisa do Brasil\)/gi, '');

        if (
          t.installmentNumber !== instNum ||
          t.scope !== alloc.scope ||
          t.categoryId !== alloc.categoryId ||
          t.subcategory !== alloc.subcategory ||
          t.description !== cleanDesc
        ) {
          changed = true;
        }

        return {
          ...t,
          installmentNumber: instNum,
          installmentTotal: totalCount,
          description: cleanDesc,
          scope: alloc.scope,
          categoryId: alloc.categoryId,
          category: alloc.categoryId,
          subcategory: alloc.subcategory
        };
      });

      // Se o totalAmount foi corrigido de 12603/5965 para 12435, ajusta as parcelas pendentes para fechar exatamente com (12435 - pago)
      if (isSyntheticOldTotal && currentTotalRounded !== targetTotalAmount) {
        const realPaidSum = finalVinyTxs
          .filter(t => t.status === 'paid')
          .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        const pendingList = finalVinyTxs.filter(t => t.status === 'pending');
        if (pendingList.length > 0) {
          const remainingForPending = Math.max(0, Math.round((targetTotalAmount - realPaidSum) * 100) / 100);
          const basePerPend = Math.floor((remainingForPend(remainingForPending, pendingList.length)) * 100) / 100;
          const diffPend = Math.round((remainingForPending - basePerPend * pendingList.length) * 100) / 100;
          let pIdx = 0;
          finalVinyTxs = finalVinyTxs.map(t => {
            if (t.status !== 'pending') return t;
            const isLast = pIdx === pendingList.length - 1;
            pIdx++;
            const newAmt = isLast ? Math.round((basePerPend + diffPend) * 100) / 100 : basePerPend;
            if (Math.abs(Number(t.amount) - newAmt) > 0.009) {
              changed = true;
            }
            return { ...t, amount: newAmt };
          });
        }
      }
    }

    if (
      vinyDebt.costCenterMode !== 'INSTALLMENT_RANGE' ||
      vinyDebt.businessStartInstallment !== VINY_MUSIC_START_INSTALLMENT ||
      vinyDebt.businessEndInstallment !== VINY_MUSIC_END_INSTALLMENT ||
      vinyDebt.includeDownPaymentInBusiness !== false ||
      vinyDebt.musicSubcategory !== 'Equipamentos/Som' ||
      vinyDebt.scope !== 'BOTH' ||
      vinyDebt.personalCategoryId !== personalCatId ||
      vinyDebt.totalAmount !== targetTotalAmount ||
      vinyDebt.installmentCount !== targetInstallmentCount
    ) {
      changed = true;
    }

    if (changed) {
      remainingDebts[vinyIdx] = {
        ...vinyDebt,
        scope: 'BOTH',
        costCenterMode: 'INSTALLMENT_RANGE',
        businessStartInstallment: VINY_MUSIC_START_INSTALLMENT,
        businessEndInstallment: VINY_MUSIC_END_INSTALLMENT,
        includeDownPaymentInBusiness: false,
        musicSubcategory: 'Equipamentos/Som',
        categoryId: 'cat_equipamentos',
        personalCategoryId: personalCatId,
        totalAmount: targetTotalAmount,
        installmentCount: targetInstallmentCount
      };

      const otherTxs = remainingTxs.filter(t => t.debtId !== vinyDebt.id);
      remainingTxs = [...otherTxs, ...finalVinyTxs];
    }
  }

  return {
    changed,
    debts: remainingDebts,
    transactions: remainingTxs,
    deletedDebtIds,
    deletedTransactionIds
  };
};

function remainingForPend(remaining: number, count: number): number {
  return count > 0 ? remaining / count : 0;
}

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
  const fallbackPersonalCat = resolveDefaultPersonalDebtCategoryId(
    undefined,
    debt.personalCategoryId || debt.categoryId
  );

  // Regra de Rateio e Teto do Contrato Único do 'Viny':
  // Parcelas 2 a 11 (Fev a Nov): R$ 650,00 fixos na Música ('Equipamentos/Som', teto máx R$ 6.500,00) + excedente Pessoal
  // Entrada (0), Parcela 1 (Jan) e Parcelas 12 a 18+: 100% Pessoal ('Dívidas / Empréstimo Pessoal')
  if (isVinyDebtOrTransaction(debt)) {
    const priorMusicCount =
      installmentNumber >= VINY_MUSIC_START_INSTALLMENT
        ? Math.min(10, Math.max(0, installmentNumber - VINY_MUSIC_START_INSTALLMENT))
        : 0;
    const alreadyAllocatedMusic = priorMusicCount * VINY_MONTHLY_MUSIC_FIXED;
    const alloc = resolveVinyInstallmentAllocation(
      installmentNumber,
      rawAmount,
      fallbackPersonalCat,
      alreadyAllocatedMusic
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
 * Pré-calcula o mapa de alocação de cada transação do contrato único 'Viny',
 * garantindo que:
 * 1. Apenas as parcelas pagas referentes ao som (Fevereiro a Novembro, Parcelas 2 a 11)
 *    recebam exatamente R$ 650,00/mês em 'MÚSICA / CARREIRA'.
 * 2. Em NENHUMA hipótese a soma direcionada para a DRE da Música ultrapasse o teto máximo de R$ 6.500,00.
 * 3. Todo o valor excedente pago em cada parcela seja alocado automaticamente em 'PESSOAL'.
 */
export const buildVinyAllocationMap = (
  allTransactions: Transaction[],
  debts: Debt[] = []
): Map<string, { musicAmount: number; personalAmount: number; instNum: number }> => {
  const map = new Map<string, { musicAmount: number; personalAmount: number; instNum: number }>();
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

  let cumulativePaidMusic = 0;
  let cumulativeAllMusic = 0;
  const allocatedPaidMonths = new Set<string>();

  vinyTxs.forEach(t => {
    const rawAmt = Math.abs(Number(t.amount) || 0);
    const instNum = extractInstallmentNumber(t, safeTxs);
    const monthKey = (t.date || '').slice(0, 7);
    const isSoundInstallment =
      instNum >= VINY_MUSIC_START_INSTALLMENT && instNum <= VINY_MUSIC_END_INSTALLMENT;

    if (isSoundInstallment) {
      if (t.status === 'paid') {
        const alreadyUsedMonth = monthKey ? allocatedPaidMonths.has(monthKey) : false;
        const remainingPaidCeiling = Math.max(
          0,
          Math.round((VINY_MUSIC_MAX_CEILING - cumulativePaidMusic) * 100) / 100
        );
        const musicPortion = alreadyUsedMonth
          ? 0
          : Math.min(VINY_MONTHLY_MUSIC_FIXED, remainingPaidCeiling);

        if (musicPortion > 0 && monthKey) {
          allocatedPaidMonths.add(monthKey);
        }
        cumulativePaidMusic = Math.min(
          VINY_MUSIC_MAX_CEILING,
          Math.round((cumulativePaidMusic + musicPortion) * 100) / 100
        );
        cumulativeAllMusic = Math.min(
          VINY_MUSIC_MAX_CEILING,
          Math.round((cumulativeAllMusic + musicPortion) * 100) / 100
        );
        const personalPortion = Math.max(0, Math.round((rawAmt - musicPortion) * 100) / 100);
        map.set(t.id, { musicAmount: musicPortion, personalAmount: personalPortion, instNum });
      } else {
        const remainingCeiling = Math.max(
          0,
          Math.round((VINY_MUSIC_MAX_CEILING - cumulativeAllMusic) * 100) / 100
        );
        const musicPortion = Math.min(VINY_MONTHLY_MUSIC_FIXED, remainingCeiling);
        cumulativeAllMusic = Math.min(
          VINY_MUSIC_MAX_CEILING,
          Math.round((cumulativeAllMusic + musicPortion) * 100) / 100
        );
        const personalPortion = Math.max(0, Math.round((rawAmt - musicPortion) * 100) / 100);
        map.set(t.id, { musicAmount: musicPortion, personalAmount: personalPortion, instNum });
      }
    } else {
      map.set(t.id, { musicAmount: 0, personalAmount: rawAmt, instNum });
    }
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
): { musicAmount: number; personalAmount: number } => {
  if (!t || t.type !== 'expense' || t.status === 'cancelled') {
    return { musicAmount: 0, personalAmount: 0 };
  }
  if (isSomLeoDebtOrTransaction(null, t)) {
    return { musicAmount: 0, personalAmount: 0 };
  }

  const rawAmt = Math.abs(Number(t.amount) || 0);
  const safeDebts = Array.isArray(debts) ? debts : [];
  const parentDebt = t.debtId ? safeDebts.find(d => d.id === t.debtId) : undefined;

  if (isSomLeoDebtOrTransaction(parentDebt, t)) {
    return { musicAmount: 0, personalAmount: 0 };
  }

  if (isVinyDebtOrTransaction(parentDebt, t)) {
    if (Array.isArray(allTransactions) && allTransactions.length > 0) {
      const vinyMap = buildVinyAllocationMap(allTransactions, safeDebts);
      const entry = vinyMap.get(t.id);
      if (entry) {
        return { musicAmount: entry.musicAmount, personalAmount: entry.personalAmount };
      }
    }
    const instNum = extractInstallmentNumber(t, allTransactions);
    const alloc = resolveVinyInstallmentAllocation(instNum, rawAmt);
    return { musicAmount: alloc.musicAmount, personalAmount: alloc.personalAmount };
  }

  if (isCareerExpenseTransaction(t, safeDebts, allTransactions)) {
    return { musicAmount: rawAmt, personalAmount: 0 };
  }

  return { musicAmount: 0, personalAmount: rawAmt };
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

  // Regra do Contrato Único 'Viny': apenas Parcelas 2 a 11 (Fevereiro a Novembro) entram na DRE da Música
  if (isVinyDebtOrTransaction(parentDebt, t)) {
    if (Array.isArray(allTransactions) && allTransactions.length > 0) {
      const vinyMap = buildVinyAllocationMap(allTransactions, debts || []);
      const entry = vinyMap.get(t.id);
      if (entry) return entry.musicAmount > 0;
    }
    const instNum = extractInstallmentNumber(t, allTransactions);
    return instNum >= VINY_MUSIC_START_INSTALLMENT && instNum <= VINY_MUSIC_END_INSTALLMENT;
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

    // Regra de Rateio e Teto do Contrato Único 'Viny':
    // Parcelas 2 a 11 (Fevereiro a Novembro): exatamente R$ 650,00/mês em 'Equipamentos/Som',
    // jamais ultrapassando o teto acumulado de R$ 6.500,00.
    if (isVinyDebtOrTransaction(parentDebt, t)) {
      const alloc = vinyAllocationMap.get(t.id);
      const allowedFromMap = alloc ? alloc.musicAmount : 0;
      const remainingPeriodCeiling = Math.max(0, VINY_MUSIC_MAX_CEILING - periodVinyMusicSum);
      const finalMusicAmount = Math.min(allowedFromMap, remainingPeriodCeiling);

      if (finalMusicAmount > 0) {
        periodVinyMusicSum = Math.round((periodVinyMusicSum + finalMusicAmount) * 100) / 100;
        filteredTxs.push({
          ...t,
          amount: finalMusicAmount,
          scope: 'BUSINESS',
          categoryId: 'cat_equipamentos',
          subcategory: 'Equipamentos/Som'
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
