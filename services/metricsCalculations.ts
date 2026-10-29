/**
 * SSOT das fórmulas financeiras agregadas (dívidas do mês, compra segura, burn rate).
 * Funções puras — usadas pelos hooks e pelo Relatório para IA.
 */

import type { Account, Debt, Transaction } from '../types';
import { getCurrentMonthPrefix, getLocalDateString } from './dateUtils';
import { shiftMonthPrefix } from './monthCashPanel';

const EPS = 0.05;

export const SAFE_SPEND_ZERO_MESSAGE =
  'Sem margem para compras à vista sem comprometer sua reserva ou contas do mês';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function daysInMonthPrefix(monthPrefix: string): number {
  const [y, m] = monthPrefix.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function computeDebtRemainingFromTxs(
  debt: Debt,
  transactions: Transaction[],
): number {
  const totalContract = Math.max(0, Number(debt.totalAmount) || 0);
  const paidPrincipal = transactions
    .filter((t) => t.debtId === debt.id && t.status === 'paid')
    .reduce(
      (s, t) =>
        s +
        (Math.abs(Number(t.amount) || 0) - Math.max(0, Number(t.interest) || 0)),
      0,
    );
  return Math.max(0, round2(totalContract - paidPrincipal));
}

export function resolveDebtInstallmentAmount(
  debt: Debt,
  transactions: Transaction[],
): number {
  if (debt.installmentAmount && Number(debt.installmentAmount) > 0) {
    return round2(Number(debt.installmentAmount));
  }
  const pending = transactions
    .filter((t) => t.debtId === debt.id && t.status === 'pending')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (pending.length > 0 && Math.abs(Number(pending[0].amount) || 0) > 0) {
    return round2(Math.abs(Number(pending[0].amount)));
  }
  const count = debt.installmentCount || 1;
  if (count > 0 && Number(debt.totalAmount) > 0) {
    return round2(Number(debt.totalAmount) / count);
  }
  return 0;
}

function isDebtLinkedExpense(t: Transaction): boolean {
  return Boolean(t.debtId) && t.type === 'expense' && t.status !== 'cancelled';
}

/** Contas operacionais (exclui poupança/reserva). */
export function isOperationalAccount(acc: Account): boolean {
  if (acc.enabled === false) return false;
  if (acc.type === 'savings') return false;
  const name = (acc.name || '').toLowerCase();
  if (name.includes('reserva') || name.includes('economia')) return false;
  return true;
}

/** Contas de reserva efetivamente alocada. */
export function isReserveAccount(acc: Account): boolean {
  if (acc.enabled === false) return false;
  if (acc.type === 'savings') return true;
  const name = (acc.name || '').toLowerCase();
  return name.includes('reserva') || name.includes('economia');
}

// ---------------------------------------------------------------------------
// 1) Compromisso mensal com dívidas — parcelas que vencem no mês
// ---------------------------------------------------------------------------

export interface DebtInstallmentBreakdownItem {
  debtId: string;
  debtName: string;
  amount: number;
  pendingAmount: number;
  source: 'transaction' | 'projected';
}

export interface DebtMonthMetrics {
  monthPrefix: string;
  /** Soma das parcelas que vencem no mês (paid + pending / projetadas). */
  monthlyCommitment: number;
  /** Apenas parcelas ainda não pagas no mês (para compra segura). */
  pendingCommitment: number;
  activeDebtsCount: number;
  totalRemainingDebts: number;
  breakdown: DebtInstallmentBreakdownItem[];
  /** Cronograma mês → compromisso (a partir do mês informado). */
  scheduleByMonth: Record<string, number>;
}

interface DebtMonthSlice {
  debtId: string;
  debtName: string;
  amount: number;
  pendingAmount: number;
  source: 'transaction' | 'projected';
  remaining: number;
}

/**
 * Calcula a fatia de uma dívida em um mês específico.
 * Prefere lançamentos reais; projeta só se houver saldo e o mês couber no cronograma restante.
 */
function computeDebtSliceForMonth(
  debt: Debt,
  transactions: Transaction[],
  monthPrefix: string,
  remaining: number,
): DebtMonthSlice | null {
  const linked = transactions.filter(
    (t) => t.debtId === debt.id && t.status !== 'cancelled',
  );
  const monthTxs = linked.filter(
    (t) => isDebtLinkedExpense(t) && t.date && t.date.startsWith(monthPrefix),
  );

  const paidAmt = round2(
    monthTxs
      .filter((t) => t.status === 'paid')
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0),
  );
  const pendingAmt = round2(
    monthTxs
      .filter((t) => t.status === 'pending')
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0),
  );
  const txTotal = round2(paidAmt + pendingAmt);

  if (txTotal > EPS) {
    return {
      debtId: debt.id,
      debtName: debt.name,
      amount: txTotal,
      pendingAmount: pendingAmt,
      source: 'transaction',
      remaining,
    };
  }

  // Sem lançamento no mês: só projeta se ainda há saldo devedor
  if (remaining <= EPS) return null;

  const installment = resolveDebtInstallmentAmount(debt, transactions);
  if (installment <= EPS) return null;

  const pendingTxs = linked
    .filter((t) => t.status === 'pending' && t.date)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // Se existem pendências cadastradas, só conta meses que tenham tx (já tratado acima)
  // ou meses entre a primeira e a última pendência sem gap preenchido — aqui:
  // se há pendências em OUTROS meses, não inventa parcela neste mês.
  if (pendingTxs.length > 0) {
    return null;
  }

  // Sem pendências geradas: projeta pelos próximos N meses a partir do mês-base implícito
  // (mês da última paga + 1, ou startDate, ou o próprio monthPrefix se for o primeiro slot).
  const paidTxs = linked
    .filter((t) => t.status === 'paid' && t.date)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const paidCount = paidTxs.length;
  const totalCount = Math.max(
    1,
    debt.installmentCount || linked.length || 1,
  );
  const remainingCount = Math.max(0, totalCount - paidCount);
  if (remainingCount <= 0) return null;

  let firstProjectMonth: string;
  if (paidTxs.length > 0) {
    firstProjectMonth = shiftMonthPrefix(paidTxs[paidTxs.length - 1].date!.slice(0, 7), 1);
  } else if (debt.startDate) {
    firstProjectMonth = debt.startDate.slice(0, 7);
  } else {
    firstProjectMonth = monthPrefix;
  }

  // Índice do monthPrefix na sequência projetada
  let cursor = firstProjectMonth;
  let slot = -1;
  for (let i = 0; i < remainingCount + 36; i++) {
    if (cursor === monthPrefix) {
      slot = i;
      break;
    }
    if (cursor > monthPrefix) break;
    cursor = shiftMonthPrefix(cursor, 1);
  }

  if (slot < 0 || slot >= remainingCount) return null;

  const amount = round2(Math.min(installment, remaining));
  if (amount <= EPS) return null;

  return {
    debtId: debt.id,
    debtName: debt.name,
    amount,
    pendingAmount: amount,
    source: 'projected',
    remaining,
  };
}

/**
 * Monta o cronograma real de amortização por mês (valores que vencem em cada mês).
 */
export function buildDebtScheduleByMonth(params: {
  debts: Debt[];
  transactions: Transaction[];
  fromMonth: string;
  horizonMonths?: number;
  getDebtRemaining?: (debtId: string) => number;
  excludeDebt?: (debt: Debt) => boolean;
}): Record<string, number> {
  const {
    debts,
    transactions,
    fromMonth,
    horizonMonths = 24,
    getDebtRemaining,
    excludeDebt,
  } = params;

  const schedule: Record<string, number> = {};

  for (const debt of debts) {
    if (excludeDebt?.(debt)) continue;

    let runningRemaining = getDebtRemaining
      ? getDebtRemaining(debt.id)
      : computeDebtRemainingFromTxs(debt, transactions);

    const linked = transactions.filter(
      (t) => t.debtId === debt.id && t.status !== 'cancelled',
    );
    const hasPaidInFromMonth = linked.some(
      (t) =>
        t.status === 'paid' &&
        t.type === 'expense' &&
        t.date &&
        t.date.startsWith(fromMonth),
    );

    if (runningRemaining <= EPS && !hasPaidInFromMonth) {
      // Pode ainda ter tx no horizonte (já paga neste fromMonth tratado acima)
      const anyAhead = linked.some(
        (t) =>
          isDebtLinkedExpense(t) &&
          t.date &&
          t.date.slice(0, 7) >= fromMonth,
      );
      if (!anyAhead) continue;
    }

    for (let i = 0; i < horizonMonths; i++) {
      const ym = shiftMonthPrefix(fromMonth, i);
      const slice = computeDebtSliceForMonth(
        debt,
        transactions,
        ym,
        // Para o mês corrente usamos saldo real; para futuros, saldo já reduzido
        // pelas parcelas anteriores do loop
        i === 0
          ? getDebtRemaining
            ? getDebtRemaining(debt.id)
            : computeDebtRemainingFromTxs(debt, transactions)
          : runningRemaining,
      );

      if (!slice || slice.amount <= EPS) {
        // Se há tx pagas só no mês 0 e remaining=0, ainda assim conte o mês 0
        continue;
      }

      schedule[ym] = round2((schedule[ym] || 0) + slice.amount);

      // Amortiza para o próximo mês do loop (não re-soma o mesmo saldo)
      if (slice.source === 'projected' || slice.pendingAmount > EPS || i === 0) {
        runningRemaining = Math.max(0, round2(runningRemaining - slice.amount));
      }
    }
  }

  return schedule;
}

export function computeDebtMetricsForMonth(params: {
  debts: Debt[];
  transactions: Transaction[];
  monthPrefix: string;
  getDebtRemaining?: (debtId: string) => number;
  excludeDebt?: (debt: Debt) => boolean;
  horizonMonths?: number;
}): DebtMonthMetrics {
  const {
    debts,
    transactions,
    monthPrefix,
    getDebtRemaining,
    excludeDebt,
    horizonMonths = 24,
  } = params;

  const breakdown: DebtInstallmentBreakdownItem[] = [];
  let activeDebtsCount = 0;
  let totalRemainingDebts = 0;
  let monthlyCommitment = 0;
  let pendingCommitment = 0;

  for (const debt of debts) {
    if (excludeDebt?.(debt)) continue;

    const remaining = getDebtRemaining
      ? getDebtRemaining(debt.id)
      : computeDebtRemainingFromTxs(debt, transactions);

    if (remaining > EPS) {
      activeDebtsCount += 1;
      totalRemainingDebts = round2(totalRemainingDebts + remaining);
    }

    const slice = computeDebtSliceForMonth(
      debt,
      transactions,
      monthPrefix,
      remaining,
    );
    if (!slice || slice.amount <= EPS) continue;

    breakdown.push({
      debtId: slice.debtId,
      debtName: slice.debtName,
      amount: slice.amount,
      pendingAmount: slice.pendingAmount,
      source: slice.source,
    });
    monthlyCommitment = round2(monthlyCommitment + slice.amount);
    pendingCommitment = round2(pendingCommitment + slice.pendingAmount);
  }

  const scheduleByMonth = buildDebtScheduleByMonth({
    debts,
    transactions,
    fromMonth: monthPrefix,
    horizonMonths,
    getDebtRemaining,
    excludeDebt,
  });

  // Garante coerência: compromisso do mês = schedule[month] se breakdown vazio mas schedule tem valor
  if (monthlyCommitment <= EPS && (scheduleByMonth[monthPrefix] || 0) > EPS) {
    monthlyCommitment = round2(scheduleByMonth[monthPrefix]);
    pendingCommitment = monthlyCommitment;
  }

  return {
    monthPrefix,
    monthlyCommitment,
    pendingCommitment,
    activeDebtsCount,
    totalRemainingDebts: round2(totalRemainingDebts),
    breakdown,
    scheduleByMonth,
  };
}

// ---------------------------------------------------------------------------
// 2) Limite seguro para compra à vista
// ---------------------------------------------------------------------------

export interface SafeSpendMetrics {
  operationalBalance: number;
  pendingBillsRestOfMonth: number;
  debtInstallmentsActiveMonth: number;
  actualReserved: number;
  safeSpotPurchase: number;
  message: string | null;
  memory: {
    operationalBalance: number;
    pendingBillsRestOfMonth: number;
    debtInstallmentsActiveMonth: number;
    actualReserved: number;
    result: number;
  };
}

export function computeSafeSpendMetrics(params: {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  getAccountBalance: (accountId: string) => number;
  getDebtRemaining?: (debtId: string) => number;
  monthPrefix?: string;
  todayStr?: string;
  excludeDebt?: (debt: Debt) => boolean;
}): SafeSpendMetrics {
  const todayStr = params.todayStr || getLocalDateString();
  const monthPrefix = params.monthPrefix || getCurrentMonthPrefix(todayStr);

  const operationalBalance = round2(
    params.accounts
      .filter(isOperationalAccount)
      .reduce((s, a) => s + params.getAccountBalance(a.id), 0),
  );

  const actualReserved = round2(
    params.accounts
      .filter(isReserveAccount)
      .reduce((s, a) => s + params.getAccountBalance(a.id), 0),
  );

  const monthStart = `${monthPrefix}-01`;
  const pendingBillsRestOfMonth = round2(
    params.transactions
      .filter((t) => {
        if (t.type !== 'expense' || t.status !== 'pending' || !t.date) return false;
        if (t.debtId) return false;
        if (t.categoryId === 'cat_savings') return false;
        if (t.date.startsWith(monthPrefix)) return true;
        return t.date < monthStart;
      })
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0),
  );

  const debtMetrics = computeDebtMetricsForMonth({
    debts: params.debts,
    transactions: params.transactions,
    monthPrefix,
    getDebtRemaining: params.getDebtRemaining,
    excludeDebt: params.excludeDebt,
  });

  const debtInstallmentsActiveMonth = round2(debtMetrics.pendingCommitment);

  // Saldo operacional já exclui a reserva efetivamente guardada (contas savings).
  // NÃO subtrai meta teórica de 6 meses — só o que está de fato alocado (já fora do caixa).
  const raw = round2(
    operationalBalance - pendingBillsRestOfMonth - debtInstallmentsActiveMonth,
  );
  const safeSpotPurchase = Math.max(0, raw);

  return {
    operationalBalance,
    pendingBillsRestOfMonth,
    debtInstallmentsActiveMonth,
    actualReserved,
    safeSpotPurchase,
    message: safeSpotPurchase <= 0 ? SAFE_SPEND_ZERO_MESSAGE : null,
    memory: {
      operationalBalance,
      pendingBillsRestOfMonth,
      debtInstallmentsActiveMonth,
      actualReserved,
      result: safeSpotPurchase,
    },
  };
}

// ---------------------------------------------------------------------------
// 3) Burn rate / projeção fim de mês
// ---------------------------------------------------------------------------

export interface BurnRateMetrics {
  monthPrefix: string;
  spentToDate: number;
  /** Alias legado para UI */
  monthExpense: number;
  monthIncome: number;
  dayOfMonth: number;
  daysInMonth: number;
  daysRemaining: number;
  dailyBurn: number;
  projected: number;
  overBudget: boolean;
  overAmount: number;
}

/**
 * Projeção = Gasto_Realizado_Até_Hoje
 *          + (Gasto_Realizado_Até_Hoje / Dia_Atual) * Dias_Restantes
 * Regra: projected >= spentToDate sempre.
 */
export function computeBurnRateMetrics(params: {
  transactions: Transaction[];
  monthPrefix?: string;
  todayStr?: string;
  includeGoalDeposit?: boolean;
}): BurnRateMetrics {
  const todayStr = params.todayStr || getLocalDateString();
  const monthPrefix = params.monthPrefix || getCurrentMonthPrefix(todayStr);
  const includeGoalDeposit = params.includeGoalDeposit ?? false;

  const dayOfMonth = Math.max(1, Number(todayStr.slice(8, 10)) || 1);
  const dim = daysInMonthPrefix(monthPrefix);
  const daysRemaining = Math.max(0, dim - dayOfMonth);

  let spentToDate = 0;
  let monthIncome = 0;

  for (const t of params.transactions) {
    if (!t.date?.startsWith(monthPrefix)) continue;
    if (t.status === 'cancelled') continue;
    const amt = Math.abs(Number(t.amount) || 0);

    if (t.type === 'expense' || (includeGoalDeposit && t.type === 'goal_deposit')) {
      if (t.status === 'paid' && t.date <= todayStr) {
        spentToDate += amt;
      }
    } else if (
      t.type === 'income' ||
      (includeGoalDeposit && t.type === 'goal_withdraw')
    ) {
      if (t.status === 'paid') {
        monthIncome += amt;
      }
    }
  }

  spentToDate = round2(spentToDate);
  monthIncome = round2(monthIncome);

  const dailyBurn = dayOfMonth > 0 ? round2(spentToDate / dayOfMonth) : 0;
  const extrapolated = round2(dailyBurn * daysRemaining);
  let projected = round2(spentToDate + extrapolated);

  if (projected < spentToDate) {
    projected = spentToDate;
  }

  const overBudget = monthIncome > 0 && projected > monthIncome;
  const overAmount = overBudget ? round2(projected - monthIncome) : 0;

  return {
    monthPrefix,
    spentToDate,
    monthExpense: spentToDate,
    monthIncome,
    dayOfMonth,
    daysInMonth: dim,
    daysRemaining,
    dailyBurn,
    projected,
    overBudget,
    overAmount,
  };
}
