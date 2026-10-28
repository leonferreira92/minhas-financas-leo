import { Account, Transaction, matchesScope } from '../types';
import { isNeutralCashFlowMovement } from './aiReportService';
import { getAccountVinculo } from './financeAggregator';
import { getCurrentMonthPrefix } from './dateUtils';
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

/** Contas do caixa pessoal (ativas, sem vínculo músico). */
export const isPersonalCashAccount = (acc: Account): boolean => {
  if (acc.enabled === false) return false;
  return getAccountVinculo(acc) !== 'MUSICO' && acc.scope !== 'BUSINESS';
};

/**
 * Painel do mês — mesma regra mental do Extrato (pessoal + mês atual).
 * Transferências não entram em a receber / a pagar.
 * A receber: pendentes do mês.
 * A pagar: pendentes do mês + atrasadas (ainda abertas) — afetam o previsto.
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
    if (!t || t.status !== 'pending') return false;
    if (isLegacyArchivedTx(t)) return false;
    if (!t.date) return false;
    if (isNeutralCashFlowMovement(t)) return false;
    if (!matchesScope(t.scope, 'PERSONAL')) return false;
    if (t.type !== 'income' && t.type !== 'expense') return false;

    // Receitas: só do mês (não puxa cachê antigo)
    if (t.type === 'income') return t.date.startsWith(monthPrefix);

    // Despesas: mês atual OU atrasadas (ainda abertas) — contam no previsto
    return t.date.startsWith(monthPrefix) || t.date < monthStart;
  });

  const receiveItems = relevantPending
    .filter(t => t.type === 'income')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const payItems = relevantPending
    .filter(t => t.type === 'expense')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const toReceive = Number(
    receiveItems.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0).toFixed(2)
  );
  const toPay = Number(
    payItems.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0).toFixed(2)
  );
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
