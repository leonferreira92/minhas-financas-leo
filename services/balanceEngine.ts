import { Account, ScopeType, Transaction } from '../types';
import { getAccountVinculo } from './financeAggregator';
import { isGoalMovement, isTransferMovement } from './aiReportService';
import { getCurrentMonthPrefix, getLocalDateString } from './dateUtils';

export type BalanceFn = (accountId: string) => number;

/** Conta de reserva / economia — não entra no "caixa do dia a dia". */
export const isSavingsAccount = (acc: Account): boolean => {
  if (acc.type === 'savings') return true;
  const n = (acc.name || '').toLowerCase();
  return n.includes('economia') || n.includes('reserva') || n.includes('poupan');
};

/** Conta ativa e operacional (corrente, carteira, etc.). */
export const isOperationalAccount = (acc: Account): boolean => {
  if (acc.enabled === false) return false;
  return !isSavingsAccount(acc);
};

/** Conta do módulo pessoal (exclui carreira/empresa arquivada). */
export const isPersonalAccount = (acc: Account): boolean => {
  if (acc.enabled === false) return false;
  if (getAccountVinculo(acc) === 'MUSICO') return false;
  if (acc.scope === 'BUSINESS') return false;
  return true;
};

export const lastDayOfMonthPrefix = (monthPrefix: string): string => {
  const [y, m] = monthPrefix.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${monthPrefix}-${String(last).padStart(2, '0')}`;
};

const isCashFlowTx = (t: Transaction): boolean =>
  t.status !== 'cancelled' && !isTransferMovement(t) && !isGoalMovement(t);

/**
 * Soma saldos pagos (regime de caixa) das contas filtradas.
 */
export const sumBalances = (
  accounts: Account[],
  getAccountBalance: BalanceFn,
  predicate: (a: Account) => boolean = () => true
): number =>
  parseFloat(
    accounts
      .filter(predicate)
      .reduce((s, a) => s + getAccountBalance(a.id), 0)
      .toFixed(2)
  );

export interface HomeBalanceSnapshot {
  todayStr: string;
  monthPrefix: string;
  /** Caixa operacional pessoal (pago) — "Saldo atual" */
  cashToday: number;
  /** Soma das reservas / savings pessoais */
  savingsTotal: number;
  /** Caixa + reserva (patrimônio líquido nas contas pessoais) */
  totalPersonal: number;
  /** Receitas pagas no mês */
  paidIncomeMonth: number;
  /** Despesas pagas no mês */
  paidExpenseMonth: number;
  /** Pendentes a receber até o fim do mês (inclui atrasadas do mês e meses anteriores) */
  pendingIncome: number;
  /** Pendentes a pagar até o fim do mês (inclui atrasadas) */
  pendingExpense: number;
  /** Só atrasadas (date < hoje) */
  overdueExpense: number;
  overdueIncome: number;
  /** cashToday + a receber − a pagar */
  projectedEndBalance: number;
  /** Pago no mês: receita − despesa */
  monthNetSoFar: number;
}

/**
 * Fonte única: saldos da home / painel do mês / extrato (visão pessoal).
 *
 * Regras:
 * - Saldo atual = só lançamentos PAID nas contas operacionais.
 * - Previsto = atual + pendentes com data ≤ fim do mês (atrasados entram).
 * - Transferências e metas não entram no fluxo do mês.
 */
export const computeHomeBalanceSnapshot = (params: {
  accounts: Account[];
  transactions: Transaction[];
  getAccountBalance: BalanceFn;
  todayStr?: string;
  monthPrefix?: string;
}): HomeBalanceSnapshot => {
  const todayStr = params.todayStr || getLocalDateString();
  const monthPrefix = params.monthPrefix || getCurrentMonthPrefix(todayStr);
  const monthEnd = lastDayOfMonthPrefix(monthPrefix);

  const personal = params.accounts.filter(isPersonalAccount);
  const cashToday = sumBalances(personal, params.getAccountBalance, isOperationalAccount);
  const savingsTotal = sumBalances(personal, params.getAccountBalance, isSavingsAccount);
  const totalPersonal = parseFloat((cashToday + savingsTotal).toFixed(2));

  const monthFlow = params.transactions.filter(
    t => isCashFlowTx(t) && t.date?.startsWith(monthPrefix)
  );

  const paidIncomeMonth = monthFlow
    .filter(t => t.type === 'income' && t.status === 'paid')
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const paidExpenseMonth = monthFlow
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  /**
   * Pendentes que ainda afetam o caixa até o fim do mês:
   * - qualquer pendente com date <= fim do mês (inclui atraso deste e de meses anteriores)
   */
  const pendingAffectingMonth = params.transactions.filter(
    t =>
      isCashFlowTx(t) &&
      t.status === 'pending' &&
      !!t.date &&
      t.date <= monthEnd &&
      (t.type === 'income' || t.type === 'expense')
  );

  const pendingIncome = pendingAffectingMonth
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const pendingExpense = pendingAffectingMonth
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const overdueExpense = pendingAffectingMonth
    .filter(t => t.type === 'expense' && t.date < todayStr)
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const overdueIncome = pendingAffectingMonth
    .filter(t => t.type === 'income' && t.date < todayStr)
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const projectedEndBalance = parseFloat(
    (cashToday + pendingIncome - pendingExpense).toFixed(2)
  );

  return {
    todayStr,
    monthPrefix,
    cashToday: parseFloat(cashToday.toFixed(2)),
    savingsTotal: parseFloat(savingsTotal.toFixed(2)),
    totalPersonal,
    paidIncomeMonth: parseFloat(paidIncomeMonth.toFixed(2)),
    paidExpenseMonth: parseFloat(paidExpenseMonth.toFixed(2)),
    pendingIncome: parseFloat(pendingIncome.toFixed(2)),
    pendingExpense: parseFloat(pendingExpense.toFixed(2)),
    overdueExpense: parseFloat(overdueExpense.toFixed(2)),
    overdueIncome: parseFloat(overdueIncome.toFixed(2)),
    projectedEndBalance,
    monthNetSoFar: parseFloat((paidIncomeMonth - paidExpenseMonth).toFixed(2))
  };
};

/**
 * Projeção genérica (usada por getBalanceSummary): caixa operacional + pendentes até a data-limite.
 */
export const computeProjectedBalance = (params: {
  operatingCash: number;
  transactions: Transaction[];
  projectionDateStr: string;
  scopeMatch?: (scope?: ScopeType) => boolean;
}): number => {
  let projected = params.operatingCash;
  params.transactions.forEach(t => {
    if (!isCashFlowTx(t) || t.status !== 'pending') return;
    if (params.scopeMatch && !params.scopeMatch(t.scope)) return;
    if (!t.date || t.date > params.projectionDateStr) return;
    const amount = Math.abs(Number(t.amount) || 0);
    if (t.type === 'income') projected += amount;
    else if (t.type === 'expense') projected -= amount;
  });
  return parseFloat(projected.toFixed(2));
};
