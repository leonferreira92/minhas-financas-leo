import {
  Account,
  Category,
  Debt,
  FinancialSettings,
  Show,
  Transaction
} from '../types';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import {
  isDiscretionaryExpense,
  isEssentialExpense,
  isGoalMovement,
  isIncomeGuaranteed,
  isTransferMovement
} from './aiReportService';
import { computeHomeBalanceSnapshot, BalanceFn } from './balanceEngine';
import { getLocalDateString } from './dateUtils';

export type MonthTrafficLight = 'green' | 'yellow' | 'red';

export interface MonthPanelSnapshot {
  monthLabel: string;
  monthPrefix: string;
  cashToday: number;
  savingsTotal: number;
  totalPersonal: number;
  pendingIncome: number;
  pendingExpense: number;
  overdueExpense: number;
  paidIncomeMonth: number;
  paidExpenseMonth: number;
  projectedEndBalance: number;
  monthNetSoFar: number;
  traffic: MonthTrafficLight;
  trafficLabel: string;
  trafficHint: string;
}

export interface IncomeTargetSnapshot {
  essentialMonthly: number;
  lifestyleMonthly: number;
  targetReserveMonths: number;
  targetReserveAmount: number;
  reservedToday: number;
  reserveDeficit: number;
  monthlyReserveContribution: number;
  /** Piso: só essenciais + parcela da reserva */
  safeMonthlyIncome: number;
  /** Confortável: essenciais + lazer + parcela da reserva */
  comfortableMonthlyIncome: number;
  avgIncomeLast3Months: number;
  incomeGapToComfortable: number;
}

const monthPrefixesLastN = (n: number, from = new Date()): string[] => {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
};

const averageMonthlyByFilter = (
  transactions: Transaction[],
  months: string[],
  predicate: (t: Transaction) => boolean
): number => {
  if (months.length === 0) return 0;
  const totals = months.map(m =>
    transactions
      .filter(t => t.date?.startsWith(m) && t.status !== 'cancelled' && predicate(t))
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0)
  );
  const withActivity = totals.filter(v => v > 0);
  if (withActivity.length === 0) return 0;
  return withActivity.reduce((a, b) => a + b, 0) / withActivity.length;
};

/** Média mensal de essenciais (mês atual se > 0; senão média dos últimos 3 com movimento). */
export const estimateMonthlyEssential = (
  transactions: Transaction[],
  categories: Category[],
  debts: Debt[],
  financialSettings: FinancialSettings
): number => {
  const now = new Date();
  const current = now.toISOString().slice(0, 7);
  const thisMonth = transactions
    .filter(
      t =>
        t.date?.startsWith(current) &&
        t.status !== 'cancelled' &&
        isEssentialExpense(t, categories, debts, financialSettings)
    )
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  if (thisMonth > 0) return thisMonth;

  return averageMonthlyByFilter(
    transactions,
    monthPrefixesLastN(3).slice(1),
    t => isEssentialExpense(t, categories, debts, financialSettings)
  );
};

/** Média mensal de lazer/compras (discricionário). */
export const estimateMonthlyLifestyle = (
  transactions: Transaction[],
  categories: Category[],
  debts: Debt[],
  financialSettings: FinancialSettings
): number => {
  const now = new Date();
  const current = now.toISOString().slice(0, 7);
  const thisMonth = transactions
    .filter(
      t =>
        t.date?.startsWith(current) &&
        t.status !== 'cancelled' &&
        isDiscretionaryExpense(t, categories, debts, financialSettings)
    )
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  if (thisMonth > 0) return thisMonth;

  return averageMonthlyByFilter(
    transactions,
    monthPrefixesLastN(3).slice(1),
    t => isDiscretionaryExpense(t, categories, debts, financialSettings)
  );
};

export const computeMonthPanel = (params: {
  accounts: Account[];
  transactions: Transaction[];
  shows: Show[];
  categories: Category[];
  getAccountBalance: BalanceFn;
  /** @deprecated Ignorado — o motor unificado já filtra contas pessoais operacionais. */
  cashAccountIds?: string[];
}): MonthPanelSnapshot => {
  const { accounts, transactions, shows, categories, getAccountBalance } = params;
  const todayStr = getLocalDateString();
  const snap = computeHomeBalanceSnapshot({
    accounts,
    transactions,
    getAccountBalance,
    todayStr
  });

  const monthLabel = new Date(
    Number(snap.monthPrefix.slice(0, 4)),
    Number(snap.monthPrefix.slice(5, 7)) - 1,
    1
  ).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const {
    cashToday,
    pendingIncome,
    pendingExpense,
    paidIncomeMonth,
    paidExpenseMonth,
    projectedEndBalance,
    monthNetSoFar,
    overdueExpense,
    savingsTotal,
    totalPersonal
  } = snap;

  const cushion = projectedEndBalance;
  const tightThreshold = Math.max(300, pendingExpense * 0.2);

  let traffic: MonthTrafficLight = 'green';
  let trafficLabel = 'Tranquilo';
  let trafficHint = 'No fim do mês você tende a sobrar.';

  if (projectedEndBalance < 0) {
    traffic = 'red';
    trafficLabel = 'Atenção';
    trafficHint = 'No fim do mês o saldo pode ficar negativo. Revise gastos ou antecipe receitas.';
  } else if (overdueExpense > 0) {
    traffic = 'yellow';
    trafficLabel = 'Há atrasados';
    trafficHint = `${overdueExpense.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })} em despesas atrasadas ainda entram no previsto.`;
  } else if (cushion < tightThreshold) {
    traffic = 'yellow';
    trafficLabel = 'Apertado';
    trafficHint = 'Dá para fechar o mês, mas a folga fica pequena.';
  } else if (
    pendingIncome > cashToday * 0.25 &&
    !transactions.some(
      t =>
        t.type === 'income' &&
        t.status === 'pending' &&
        t.date?.startsWith(snap.monthPrefix) &&
        isIncomeGuaranteed(t, shows, categories)
    )
  ) {
    traffic = 'yellow';
    trafficLabel = 'Depende de entradas';
    trafficHint = 'Parte da projeção conta com receitas ainda não confirmadas.';
  }

  return {
    monthLabel,
    monthPrefix: snap.monthPrefix,
    cashToday,
    savingsTotal,
    totalPersonal,
    pendingIncome,
    pendingExpense,
    overdueExpense,
    paidIncomeMonth,
    paidExpenseMonth,
    projectedEndBalance,
    monthNetSoFar,
    traffic,
    trafficLabel,
    trafficHint
  };
};

export const computeIncomeTarget = (params: {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  financialSettings?: FinancialSettings;
  getAccountBalance: BalanceFn;
}): IncomeTargetSnapshot => {
  const fs = {
    ...DEFAULT_FINANCIAL_SETTINGS,
    ...(params.financialSettings || {})
  };

  const essentialMonthly = estimateMonthlyEssential(
    params.transactions,
    params.categories,
    params.debts,
    fs
  );
  const lifestyleMonthly = estimateMonthlyLifestyle(
    params.transactions,
    params.categories,
    params.debts,
    fs
  );

  const targetReserveMonths = fs.targetReserveMonths ?? 6;
  const minReserve = fs.minReserveAmount ?? 5000;
  const fromMonths = essentialMonthly > 0 ? essentialMonthly * targetReserveMonths : 0;
  const targetReserveAmount = Math.max(minReserve, fromMonths);

  const reservedToday = params.accounts
    .filter(a => a.enabled !== false && a.type === 'savings')
    .reduce((s, a) => s + params.getAccountBalance(a.id), 0);

  const reserveDeficit = Math.max(0, targetReserveAmount - reservedToday);
  const buildHorizon = Math.max(1, targetReserveMonths);
  const monthlyReserveContribution = reserveDeficit / buildHorizon;

  const safeMonthlyIncome = essentialMonthly + monthlyReserveContribution;
  const comfortableMonthlyIncome = essentialMonthly + lifestyleMonthly + monthlyReserveContribution;

  const avgIncomeLast3Months = averageMonthlyByFilter(
    params.transactions,
    monthPrefixesLastN(3),
    t => t.type === 'income' && t.status !== 'cancelled' && !isTransferMovement(t) && !isGoalMovement(t)
  );

  const incomeGapToComfortable = Math.max(0, comfortableMonthlyIncome - avgIncomeLast3Months);

  return {
    essentialMonthly,
    lifestyleMonthly,
    targetReserveMonths,
    targetReserveAmount,
    reservedToday,
    reserveDeficit,
    monthlyReserveContribution,
    safeMonthlyIncome,
    comfortableMonthlyIncome,
    avgIncomeLast3Months,
    incomeGapToComfortable
  };
};
