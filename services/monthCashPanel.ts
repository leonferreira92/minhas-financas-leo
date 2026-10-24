import { Account, Transaction, matchesScope } from '../types';
import { isTransferMovement } from './aiReportService';
import { getAccountVinculo } from './financeAggregator';
import { getCurrentMonthPrefix } from './dateUtils';

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
 * Pendentes só do mês selecionado (não arrasta lixo de meses anteriores).
 */
export const computeMonthCashPanel = (params: {
  accounts: Account[];
  transactions: Transaction[];
  getAccountBalance: (accountId: string) => number;
  monthPrefix?: string;
}): MonthCashPanelData => {
  const monthPrefix = params.monthPrefix || getCurrentMonthPrefix();

  const personalAccounts = params.accounts.filter(isPersonalCashAccount);
  const currentBalance = Number(
    personalAccounts
      .reduce((sum, acc) => sum + params.getAccountBalance(acc.id), 0)
      .toFixed(2)
  );

  const monthPending = params.transactions.filter(t => {
    if (!t || t.status !== 'pending') return false;
    if (!t.date || !t.date.startsWith(monthPrefix)) return false;
    if (isTransferMovement(t)) return false;
    if (!matchesScope(t.scope, 'PERSONAL')) return false;
    return t.type === 'income' || t.type === 'expense';
  });

  const receiveItems = monthPending
    .filter(t => t.type === 'income')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const payItems = monthPending
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
