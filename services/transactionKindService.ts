import { Category, Debt, FinancialSettings, Transaction } from '../types';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import {
  isDebtExpense,
  isDiscretionaryExpense,
  isEssentialExpense,
  isGoalMovement,
  isTransferMovement
} from './aiReportService';

export type TransactionKind =
  | 'income'
  | 'essential'
  | 'lifestyle'
  | 'installment'
  | 'reserve'
  | 'transfer'
  | 'other';

export type KindFilter = 'all' | TransactionKind;

export interface KindTagStyle {
  kind: TransactionKind;
  label: string;
  className: string;
}

const KIND_STYLES: Record<TransactionKind, Omit<KindTagStyle, 'kind'>> = {
  income: {
    label: 'Receita',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  essential: {
    label: 'Essencial',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  lifestyle: {
    label: 'Lazer',
    className: 'bg-violet-100 text-violet-800 border-violet-200'
  },
  installment: {
    label: 'Parcela',
    className: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  reserve: {
    label: 'Reserva',
    className: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  transfer: {
    label: 'Transferência',
    className: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  other: {
    label: 'Outro',
    className: 'bg-slate-50 text-slate-600 border-slate-200'
  }
};

export const getTransactionKind = (
  t: Transaction,
  categories: Category[],
  debts: Debt[],
  financialSettings?: FinancialSettings
): TransactionKind => {
  const fs = { ...DEFAULT_FINANCIAL_SETTINGS, ...(financialSettings || {}) };

  if (t.type === 'transfer' || isTransferMovement(t)) return 'transfer';
  if (t.type === 'goal_deposit' || t.type === 'goal_withdraw' || isGoalMovement(t)) {
    return 'reserve';
  }
  if (t.type === 'income') return 'income';

  if (t.type === 'expense') {
    if (isDebtExpense(t, debts, categories) || t.debtId || t.installmentNumber) {
      return 'installment';
    }
    if (isEssentialExpense(t, categories, debts, fs)) return 'essential';
    if (isDiscretionaryExpense(t, categories, debts, fs)) return 'lifestyle';
    return 'other';
  }

  return 'other';
};

export const getKindTag = (
  t: Transaction,
  categories: Category[],
  debts: Debt[],
  financialSettings?: FinancialSettings
): KindTagStyle => {
  const kind = getTransactionKind(t, categories, debts, financialSettings);
  return { kind, ...KIND_STYLES[kind] };
};

/** Totais simples do mês para gráfico “pessoa comum”. */
export const summarizeExpenseKinds = (params: {
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  monthPrefix: string;
  financialSettings?: FinancialSettings;
}): {
  essential: number;
  lifestyle: number;
  installment: number;
  other: number;
  total: number;
} => {
  const fs = { ...DEFAULT_FINANCIAL_SETTINGS, ...(params.financialSettings || {}) };
  let essential = 0;
  let lifestyle = 0;
  let installment = 0;
  let other = 0;

  params.transactions.forEach(t => {
    if (t.type !== 'expense' || t.status === 'cancelled') return;
    if (!t.date?.startsWith(params.monthPrefix)) return;
    if (isTransferMovement(t) || isGoalMovement(t)) return;

    const amt = Math.abs(Number(t.amount) || 0);
    const kind = getTransactionKind(t, params.categories, params.debts, fs);
    if (kind === 'essential') essential += amt;
    else if (kind === 'lifestyle') lifestyle += amt;
    else if (kind === 'installment') installment += amt;
    else other += amt;
  });

  const total = essential + lifestyle + installment + other;
  return { essential, lifestyle, installment, other, total };
};
