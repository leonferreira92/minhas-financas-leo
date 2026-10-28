import { Account, Debt, Transaction, matchesScope } from '../types';
import { isNeutralCashFlowMovement } from './aiReportService';
import { getAccountVinculo } from './financeAggregator';
import { getCurrentMonthPrefix, getLocalDateString } from './dateUtils';
import { isLegacyArchivedTx } from './legacyCutoffMigration';

export interface MonthCashPanelData {
  monthPrefix: string;
  currentBalance: number;
  toReceive: number;
  toPay: number;
  projected: number;
  receiveItems: Transaction[];
  payItems: Transaction[];
}

export type ProjectionMode = 'past' | 'current' | 'future' | 'agenda';

export interface ChainedMonthProjection {
  mode: ProjectionMode;
  targetMonth: string;
  currentMonth: string;
  currentBalance: number;
  /** Pendências do mês alvo (cards A receber / A pagar). */
  monthToReceive: number;
  monthToPay: number;
  /** Parcelas de dívida projetadas no mês alvo (sem lançamento pending). */
  monthSyntheticDebt: number;
  /** Soma encadeada do mês atual até o alvo. */
  chainToReceive: number;
  chainToPay: number;
  projected: number;
  monthsInChain: string[];
  receiveItems: Transaction[];
  payItems: Transaction[];
  overdueCount: number;
  overdueAmount: number;
}

/** Contas do caixa pessoal (ativas, sem vínculo músico). */
export const isPersonalCashAccount = (acc: Account): boolean => {
  if (acc.enabled === false) return false;
  return getAccountVinculo(acc) !== 'MUSICO' && acc.scope !== 'BUSINESS';
};

export const shiftMonthPrefix = (ym: string, delta: number): string => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const isEligiblePending = (t: Transaction): boolean => {
  if (!t || t.status !== 'pending') return false;
  if (isLegacyArchivedTx(t)) return false;
  if (!t.date) return false;
  if (isNeutralCashFlowMovement(t)) return false;
  if (!matchesScope(t.scope, 'PERSONAL')) return false;
  return t.type === 'income' || t.type === 'expense';
};

const sumAmounts = (items: Transaction[]): number =>
  Number(items.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0).toFixed(2));

/**
 * Painel do mês atual — saldo agora + a receber − a pagar (com atrasadas).
 */
export const computeMonthCashPanel = (params: {
  accounts: Account[];
  transactions: Transaction[];
  getAccountBalance: (accountId: string) => number;
  monthPrefix?: string;
}): MonthCashPanelData => {
  const monthPrefix = params.monthPrefix || getCurrentMonthPrefix();
  const monthStart = `${monthPrefix}-01`;

  const personalAccounts = params.accounts.filter(isPersonalCashAccount);
  const currentBalance = Number(
    personalAccounts
      .reduce((sum, acc) => sum + params.getAccountBalance(acc.id), 0)
      .toFixed(2)
  );

  const relevantPending = params.transactions.filter(t => {
    if (!isEligiblePending(t)) return false;
    if (t.type === 'income') return t.date.startsWith(monthPrefix);
    return t.date.startsWith(monthPrefix) || t.date < monthStart;
  });

  const receiveItems = relevantPending
    .filter(t => t.type === 'income')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const payItems = relevantPending
    .filter(t => t.type === 'expense')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const toReceive = sumAmounts(receiveItems);
  const toPay = sumAmounts(payItems);
  const projected = Number((currentBalance + toReceive - toPay).toFixed(2));

  return {
    monthPrefix,
    currentBalance,
    toReceive,
    toPay,
    projected,
    receiveItems,
    payItems
  };
};

const listMonthsInclusive = (fromYm: string, toYm: string): string[] => {
  if (toYm < fromYm) return [];
  const out: string[] = [];
  let cur = fromYm;
  let guard = 0;
  while (cur <= toYm && guard < 120) {
    out.push(cur);
    cur = shiftMonthPrefix(cur, 1);
    guard += 1;
  }
  return out;
};

const pendingIncomesForMonth = (transactions: Transaction[], monthPrefix: string): Transaction[] =>
  transactions
    .filter(t => isEligiblePending(t) && t.type === 'income' && t.date.startsWith(monthPrefix))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

/** Despesas pendentes do mês; no mês corrente inclui atrasadas (date < monthStart). */
const pendingExpensesForMonth = (
  transactions: Transaction[],
  monthPrefix: string,
  includeOverdue: boolean
): Transaction[] => {
  const monthStart = `${monthPrefix}-01`;
  return transactions
    .filter(t => {
      if (!isEligiblePending(t) || t.type !== 'expense') return false;
      if (t.date.startsWith(monthPrefix)) return true;
      return includeOverdue && t.date < monthStart;
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
};

/**
 * Parcela sintética: dívida ativa sem lançamento paid/pending naquele mês futuro.
 * Não sintetiza no mês corrente (parcelas do mês já pagas não devem reaparecer).
 */
export const computeSyntheticDebtForMonth = (params: {
  monthPrefix: string;
  currentMonth: string;
  debts: Debt[];
  transactions: Transaction[];
  getDebtRemaining: (debtId: string) => number;
}): number => {
  const { monthPrefix, currentMonth, debts, transactions, getDebtRemaining } = params;
  if (monthPrefix <= currentMonth) return 0;

  let total = 0;
  for (const debt of debts) {
    const remaining = getDebtRemaining(debt.id);
    if (remaining <= 0.05) continue;

    const installment = Math.abs(Number(debt.installmentAmount) || 0);
    if (installment <= 0) continue;

    const hasTxInMonth = transactions.some(
      t =>
        t.debtId === debt.id &&
        t.status !== 'cancelled' &&
        t.date &&
        t.date.startsWith(monthPrefix) &&
        (t.status === 'pending' || t.status === 'paid')
    );
    if (hasTxInMonth) continue;

    total += installment;
  }
  return Number(total.toFixed(2));
};

/**
 * Projeção encadeada: caixa de hoje ± pendências do mês atual até o mês alvo.
 * Meses futuros sem parcela cadastrada recebem síntese das dívidas ativas.
 * Mês passado: só pendências remanescentes daquele mês (não reescreve histórico).
 */
export const computeChainedMonthProjection = (params: {
  accounts: Account[];
  transactions: Transaction[];
  debts?: Debt[];
  getAccountBalance: (accountId: string) => number;
  getDebtRemaining?: (debtId: string) => number;
  targetMonth: string;
  mode?: 'month' | 'future';
}): ChainedMonthProjection => {
  const currentMonth = getCurrentMonthPrefix();
  const todayStr = getLocalDateString();
  const targetMonth = params.targetMonth || currentMonth;
  const debts = params.debts || [];
  const getDebtRemaining = params.getDebtRemaining || (() => 0);

  const personalAccounts = params.accounts.filter(isPersonalCashAccount);
  const currentBalance = Number(
    personalAccounts
      .reduce((sum, acc) => sum + params.getAccountBalance(acc.id), 0)
      .toFixed(2)
  );

  if (params.mode === 'future') {
    // Agenda: receitas futuras abertas + todas despesas pending (inclui atrasadas)
    const openReceive = params.transactions
      .filter(t => isEligiblePending(t) && t.type === 'income' && t.date >= todayStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const openPay = params.transactions
      .filter(t => isEligiblePending(t) && t.type === 'expense')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const monthToReceive = sumAmounts(openReceive);
    const monthToPay = sumAmounts(openPay);
    const overdueItems = openPay.filter(t => t.date < todayStr);
    const projected = Number((currentBalance + monthToReceive - monthToPay).toFixed(2));

    return {
      mode: 'agenda',
      targetMonth,
      currentMonth,
      currentBalance,
      monthToReceive,
      monthToPay,
      monthSyntheticDebt: 0,
      chainToReceive: monthToReceive,
      chainToPay: monthToPay,
      projected,
      monthsInChain: [],
      receiveItems: openReceive,
      payItems: openPay,
      overdueCount: overdueItems.length,
      overdueAmount: sumAmounts(overdueItems)
    };
  }

  if (targetMonth < currentMonth) {
    const receiveItems = pendingIncomesForMonth(params.transactions, targetMonth);
    const payItems = pendingExpensesForMonth(params.transactions, targetMonth, false);
    const monthToReceive = sumAmounts(receiveItems);
    const monthToPay = sumAmounts(payItems);
    const projected = Number((currentBalance + monthToReceive - monthToPay).toFixed(2));
    const overdueItems = payItems.filter(t => t.date < todayStr);

    return {
      mode: 'past',
      targetMonth,
      currentMonth,
      currentBalance,
      monthToReceive,
      monthToPay,
      monthSyntheticDebt: 0,
      chainToReceive: monthToReceive,
      chainToPay: monthToPay,
      projected,
      monthsInChain: [targetMonth],
      receiveItems,
      payItems,
      overdueCount: overdueItems.length,
      overdueAmount: sumAmounts(overdueItems)
    };
  }

  const monthsInChain = listMonthsInclusive(currentMonth, targetMonth);
  let running = currentBalance;
  let chainToReceive = 0;
  let chainToPay = 0;
  let targetReceiveItems: Transaction[] = [];
  let targetPayItems: Transaction[] = [];
  let monthSyntheticDebt = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  for (const month of monthsInChain) {
    const isCurrent = month === currentMonth;
    const incomes = pendingIncomesForMonth(params.transactions, month);
    const expenses = pendingExpensesForMonth(params.transactions, month, isCurrent);
    const synthetic = computeSyntheticDebtForMonth({
      monthPrefix: month,
      currentMonth,
      debts,
      transactions: params.transactions,
      getDebtRemaining
    });

    const inSum = sumAmounts(incomes);
    const outSum = Number((sumAmounts(expenses) + synthetic).toFixed(2));

    chainToReceive = Number((chainToReceive + inSum).toFixed(2));
    chainToPay = Number((chainToPay + outSum).toFixed(2));
    running = Number((running + inSum - outSum).toFixed(2));

    if (month === targetMonth) {
      targetReceiveItems = incomes;
      targetPayItems = expenses;
      monthSyntheticDebt = synthetic;
      if (isCurrent) {
        const monthStart = `${month}-01`;
        const overdueItems = expenses.filter(t => t.date < monthStart || t.date < todayStr);
        overdueCount = overdueItems.length;
        overdueAmount = sumAmounts(overdueItems);
      }
    }
  }

  const monthToReceive = sumAmounts(targetReceiveItems);
  const monthToPay = Number((sumAmounts(targetPayItems) + monthSyntheticDebt).toFixed(2));

  return {
    mode: targetMonth === currentMonth ? 'current' : 'future',
    targetMonth,
    currentMonth,
    currentBalance,
    monthToReceive,
    monthToPay,
    monthSyntheticDebt,
    chainToReceive,
    chainToPay,
    projected: running,
    monthsInChain,
    receiveItems: targetReceiveItems,
    payItems: targetPayItems,
    overdueCount,
    overdueAmount
  };
};
