import {
  Account,
  Category,
  Debt,
  DebtStatus,
  FinancialSettings,
  Show,
  Transaction
} from '../types';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import {
  isGoalMovement,
  isIncomeGuaranteed,
  isTransferMovement
} from './aiReportService';
import { estimateMonthlyEssential, estimateMonthlyLifestyle } from './monthPanelService';

export type PurchaseVerdict = 'go' | 'careful' | 'wait';

export interface PurchaseRoute {
  id: string;
  title: string;
  detail: string;
  recommended: boolean;
}

export interface PurchaseCapacity {
  cashAvailableToday: number;
  pendingCommitmentsFromToday: number;
  reserveDeficit: number;
  targetSafetyReserve: number;
  monthlyEssential: number;
  monthlyLifestyle: number;
  spotPurchaseCapacity: number;
  maxMonthlyInstallment: number;
  lowestProjectedBalance: number;
}

export interface PurchaseAdvice extends PurchaseCapacity {
  amount: number;
  verdict: PurchaseVerdict;
  verdictLabel: string;
  summary: string;
  routes: PurchaseRoute[];
}

type BalanceFn = (accountId: string) => number;
type DebtProgressFn = (debtId: string) => { status: DebtStatus | string; remaining: number };

const computeCapacity = (params: {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  shows: Show[];
  financialSettings?: FinancialSettings;
  getAccountBalance: BalanceFn;
  getDebtProgress: DebtProgressFn;
  /** Se informado, restringe o caixa às contas pessoais (mesmo critério do painel). */
  cashAccountIds?: string[];
}): PurchaseCapacity => {
  const fs = { ...DEFAULT_FINANCIAL_SETTINGS, ...(params.financialSettings || {}) };
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);

  const operational = params.accounts.filter(a => {
    if (a.enabled === false) return false;
    if (a.type === 'savings') return false;
    if (params.cashAccountIds) return params.cashAccountIds.includes(a.id);
    return true;
  });

  const cashAvailableToday = operational.reduce(
    (s, a) => s + params.getAccountBalance(a.id),
    0
  );

  const actualReservedInGoals = params.accounts
    .filter(a => a.enabled !== false && a.type === 'savings')
    .reduce((s, a) => s + params.getAccountBalance(a.id), 0);

  const monthlyEssential = estimateMonthlyEssential(
    params.transactions,
    params.categories,
    params.debts,
    fs
  );
  const monthlyLifestyle = estimateMonthlyLifestyle(
    params.transactions,
    params.categories,
    params.debts,
    fs
  );

  const minReserveConfigured = fs.minReserveAmount ?? 5000;
  const targetReserveMonths = fs.targetReserveMonths ?? 6;
  const targetFromMonths =
    monthlyEssential > 0 ? targetReserveMonths * monthlyEssential : 0;
  const targetSafetyReserve = Math.max(minReserveConfigured, targetFromMonths);
  const reserveDeficit = Math.max(0, targetSafetyReserve - actualReservedInGoals);

  const pendingFromToday = params.transactions.filter(
    t =>
      t.type === 'expense' &&
      t.status === 'pending' &&
      t.date >= todayStr &&
      !isTransferMovement(t) &&
      !isGoalMovement(t)
  );
  const pendingCommitmentsFromToday = pendingFromToday.reduce(
    (s, t) => s + Math.abs(Number(t.amount) || 0),
    0
  );

  const activeDebts = params.debts.filter(d => {
    const prog = params.getDebtProgress(d.id);
    return prog.status !== 'paid' && prog.remaining > 0.1;
  });

  const totalMonthlyDebtInstallments = activeDebts.reduce((sum, d) => {
    if (d.installmentAmount && d.installmentAmount > 0) {
      return sum + Number(d.installmentAmount);
    }
    const tx = params.transactions.find(
      t => t.debtId === d.id && t.date?.startsWith(currentMonthPrefix)
    );
    if (tx) return sum + Math.abs(Number(tx.amount) || 0);
    const count = d.installmentCount || 1;
    return sum + Number(d.totalAmount) / count;
  }, 0);

  // Projeção 6 meses (mesma regra prudente do HowMuchCanISpend)
  const monthsList: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthsList.push(d.toISOString().slice(0, 7));
  }

  const confirmedFutureShows = params.shows.filter(
    s =>
      (s.status === 'Confirmado' || s.status === 'Realizado') && s.date >= todayStr
  );

  let runningBalance = cashAvailableToday;
  const monthlyNets: number[] = [];
  const endBalances: number[] = [];

  monthsList.forEach((monthStr, idx) => {
    const isCurrent = idx === 0;

    const monthIncomes = params.transactions.filter(
      t =>
        t.type === 'income' &&
        t.date?.startsWith(monthStr) &&
        (isCurrent ? t.status === 'pending' && t.date >= todayStr : true) &&
        !isTransferMovement(t) &&
        !isGoalMovement(t) &&
        isIncomeGuaranteed(t, params.shows, params.categories)
    );

    let guaranteedInflow = monthIncomes.reduce(
      (s, t) => s + Math.abs(Number(t.amount) || 0),
      0
    );

    confirmedFutureShows
      .filter(s => s.date?.startsWith(monthStr))
      .forEach(s => {
        const showToReceive = Math.max(
          0,
          (Number(s.totalCache) || 0) - (Number(s.cacheReceived) || 0)
        );
        const hasTx = monthIncomes.some(
          t =>
            (s.receipts && s.receipts.some(r => r.transactionId === t.id)) ||
            (t.description &&
              s.name &&
              t.description.toLowerCase().includes(s.name.toLowerCase()))
        );
        if (!hasTx && showToReceive > 0) guaranteedInflow += showToReceive;
      });

    const monthExpenses = params.transactions.filter(
      t =>
        t.type === 'expense' &&
        t.date?.startsWith(monthStr) &&
        (isCurrent ? t.status === 'pending' && t.date >= todayStr : true) &&
        !isTransferMovement(t) &&
        !isGoalMovement(t)
    );

    let outflows = monthExpenses.reduce(
      (s, t) => s + Math.abs(Number(t.amount) || 0),
      0
    );

    if (!isCurrent && outflows === 0) {
      outflows = monthlyEssential + totalMonthlyDebtInstallments;
    }

    const net = guaranteedInflow - outflows;
    runningBalance += net;
    monthlyNets.push(net);
    endBalances.push(runningBalance);
  });

  const allPoints = [
    cashAvailableToday - pendingCommitmentsFromToday,
    ...endBalances
  ];
  const lowestProjectedBalance = Math.min(...allPoints);
  const minMonthlyNet = monthlyNets.length > 0 ? Math.min(...monthlyNets) : 0;

  const immediateHeadroom = cashAvailableToday - pendingCommitmentsFromToday;
  const projectedHeadroom = lowestProjectedBalance;

  let spotPurchaseCapacity = 0;
  if (immediateHeadroom > 0 && projectedHeadroom > 0) {
    const rawHeadroom = Math.min(immediateHeadroom, projectedHeadroom);
    spotPurchaseCapacity = Math.max(0, rawHeadroom - reserveDeficit);
  }

  let maxMonthlyInstallment = 0;
  if (
    lowestProjectedBalance > 0 &&
    minMonthlyNet > 0 &&
    spotPurchaseCapacity > 0
  ) {
    maxMonthlyInstallment = Math.max(0, Math.round(minMonthlyNet * 0.7));
  }

  return {
    cashAvailableToday,
    pendingCommitmentsFromToday,
    reserveDeficit,
    targetSafetyReserve,
    monthlyEssential,
    monthlyLifestyle,
    spotPurchaseCapacity,
    maxMonthlyInstallment,
    lowestProjectedBalance
  };
};

/**
 * Analisa um valor de compra e sugere a melhor rota sem furar essenciais/reserva.
 */
export const analyzePurchase = (params: {
  amount: number;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  shows: Show[];
  financialSettings?: FinancialSettings;
  getAccountBalance: BalanceFn;
  getDebtProgress: DebtProgressFn;
  cashAccountIds?: string[];
}): PurchaseAdvice => {
  const amount = Math.max(0, Number(params.amount) || 0);
  const capacity = computeCapacity(params);
  const routes: PurchaseRoute[] = [];

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (amount <= 0) {
    return {
      ...capacity,
      amount: 0,
      verdict: 'wait',
      verdictLabel: 'Informe um valor',
      summary: 'Digite quanto custa o que você quer comprar.',
      routes: []
    };
  }

  // Rota 1: à vista
  if (amount <= capacity.spotPurchaseCapacity) {
    routes.push({
      id: 'spot',
      title: 'Comprar à vista agora',
      detail: `Cabe no limite seguro de ${fmt(capacity.spotPurchaseCapacity)} sem mexer na reserva nem nas contas essenciais.`,
      recommended: true
    });
  } else {
    routes.push({
      id: 'spot',
      title: 'À vista agora — não recomendado',
      detail: `O limite seguro à vista é ${fmt(capacity.spotPurchaseCapacity)}. Faltam ${fmt(amount - capacity.spotPurchaseCapacity)}.`,
      recommended: false
    });
  }

  // Rota 2: parcelar
  let bestInstallments: number | null = null;
  let installmentValue = 0;
  if (capacity.maxMonthlyInstallment > 0) {
    for (let n = 2; n <= 12; n++) {
      const parcela = amount / n;
      if (parcela <= capacity.maxMonthlyInstallment) {
        bestInstallments = n;
        installmentValue = parcela;
        break;
      }
    }
  }

  if (bestInstallments) {
    routes.push({
      id: 'installments',
      title: `Parcelar em ${bestInstallments}× de ${fmt(installmentValue)}`,
      detail: `Cabe na folga mensal estimada (até ${fmt(capacity.maxMonthlyInstallment)}/mês), sem estourar o essencial.`,
      recommended: amount > capacity.spotPurchaseCapacity
    });
  } else if (capacity.maxMonthlyInstallment > 0) {
    const minN = Math.ceil(amount / capacity.maxMonthlyInstallment);
    routes.push({
      id: 'installments',
      title: 'Parcelar — apertado',
      detail:
        minN > 12
          ? `Mesmo em 12× a parcela (${fmt(amount / 12)}) passa da folga de ${fmt(capacity.maxMonthlyInstallment)}/mês.`
          : `Precisaria de cerca de ${minN}×; a folga segura é só ${fmt(capacity.maxMonthlyInstallment)}/mês.`,
      recommended: false
    });
  } else {
    routes.push({
      id: 'installments',
      title: 'Parcelar — sem folga',
      detail: 'Não há superávit mensal projetado para assumir nova parcela agora.',
      recommended: false
    });
  }

  // Rota 3: mistura (entrada + parcelas)
  if (
    amount > capacity.spotPurchaseCapacity &&
    capacity.spotPurchaseCapacity > 50 &&
    capacity.maxMonthlyInstallment > 0
  ) {
    const down = capacity.spotPurchaseCapacity;
    const rest = amount - down;
    for (let n = 2; n <= 12; n++) {
      const parcela = rest / n;
      if (parcela <= capacity.maxMonthlyInstallment) {
        routes.push({
          id: 'mixed',
          title: `Entrada de ${fmt(down)} + ${n}× de ${fmt(parcela)}`,
          detail: 'Usa o limite à vista seguro e parcela só o restante.',
          recommended: !routes.some(r => r.id === 'installments' && r.recommended)
        });
        break;
      }
    }
  }

  // Rota 4: cortar lazer / juntar
  if (amount > capacity.spotPurchaseCapacity && capacity.monthlyLifestyle > 0) {
    const monthsToSave = Math.ceil(
      (amount - capacity.spotPurchaseCapacity) / Math.max(capacity.monthlyLifestyle * 0.5, 1)
    );
    routes.push({
      id: 'cut_lifestyle',
      title:
        monthsToSave <= 1
          ? 'Segurar lazer neste mês e comprar'
          : `Segurar parte do lazer por ~${monthsToSave} meses`,
      detail: `Seu ritmo de lazer/compras é cerca de ${fmt(capacity.monthlyLifestyle)}/mês. Reduzindo pela metade, dá para juntar a diferença sem tocar no essencial.`,
      recommended: !routes.some(r => r.recommended)
    });
  }

  // Rota 5: esperar
  if (!routes.some(r => r.recommended)) {
    routes.push({
      id: 'wait',
      title: 'Esperar um mês melhor',
      detail: `Essenciais (~${fmt(capacity.monthlyEssential)}/mês) e contas futuras (${fmt(capacity.pendingCommitmentsFromToday)}) têm prioridade. Cadastre a receita do próximo trabalho e tente de novo.`,
      recommended: true
    });
  }

  const hasSafeSpot = amount <= capacity.spotPurchaseCapacity;
  const hasSafePlan = routes.some(
    r => r.recommended && (r.id === 'installments' || r.id === 'mixed' || r.id === 'spot')
  );

  let verdict: PurchaseVerdict = 'wait';
  let verdictLabel = 'Melhor esperar';
  let summary = 'Agora a compra atrapalharia o essencial ou a reserva.';

  if (hasSafeSpot) {
    verdict = 'go';
    verdictLabel = 'Pode comprar';
    summary = 'À vista cabe no seu limite seguro. Essenciais e reserva ficam protegidos.';
  } else if (hasSafePlan) {
    verdict = 'careful';
    verdictLabel = 'Dá, com cuidado';
    summary = 'Não cabe tudo à vista, mas há um caminho (parcelar ou misturar) sem furar o essencial.';
  } else if (routes.some(r => r.id === 'cut_lifestyle' && r.recommended)) {
    verdict = 'careful';
    verdictLabel = 'Só se cortar lazer';
    summary = 'Sem folga de caixa agora. Dá para juntar se reduzir compras/lazer por um tempo.';
  }

  // Garante uma rota marcada como recomendada
  if (!routes.some(r => r.recommended) && routes.length > 0) {
    routes[routes.length - 1].recommended = true;
  }

  return {
    ...capacity,
    amount,
    verdict,
    verdictLabel,
    summary,
    routes
  };
};

export const getPurchaseCapacity = computeCapacity;
