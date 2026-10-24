import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getAccountVinculo } from '../services/financeAggregator';

export interface ProLaboreEstimate {
  /** Estimativa segura disponível para retirar como pró-labore */
  availableEstimate: number;
  /** Saldo em contas da empresa / legado carreira */
  companyCash: number;
  /** Despesas BUSINESS pendentes no mês */
  companyPendingBills: number;
  /** Reserva sugerida de reinvestimento (20% do lucro líquido do mês) */
  recommendedReinvestment: number;
  /** Lucro líquido BUSINESS do mês (receitas − despesas, excl. pró-labore) */
  companyNetProfit: number;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  hasCompanyAccount: boolean;
  categoryId: 'cat_7';
  categoryLabel: string;
}

const PROLABORE_CATEGORY_ID = 'cat_7' as const;
const PROLABORE_CATEGORY_LABEL = 'Pró-labore / Transferência Vida de Artista';

/**
 * Hook leve de leitura: estima pró-labore disponível a partir do caixa
 * da conta empresa/legado (Vida de Artista → Pessoal), sem criar lançamentos.
 */
export function useProLaboreEstimate(): ProLaboreEstimate {
  const { accounts, transactions, getAccountBalance } = useFinance();

  return useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthPrefix = todayStr.slice(0, 7);

    const companyAccounts = accounts.filter(
      a => a.enabled !== false && (getAccountVinculo(a) === 'MUSICO' || a.scope === 'BUSINESS')
    );
    const personalAccounts = accounts.filter(
      a => a.enabled !== false && (getAccountVinculo(a) === 'PESSOAL' || a.scope === 'PERSONAL')
    );

    const sourceAccount =
      companyAccounts[0] ||
      accounts.find(a => a.enabled !== false) ||
      null;
    const destinationAccount =
      personalAccounts.find(a => a.id !== sourceAccount?.id) ||
      accounts.find(a => a.enabled !== false && a.id !== sourceAccount?.id) ||
      personalAccounts[0] ||
      null;

    const companyCash =
      companyAccounts.length > 0
        ? companyAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0)
        : sourceAccount
          ? getAccountBalance(sourceAccount.id)
          : 0;

    const companyMonthIncome = transactions
      .filter(
        t =>
          t.type === 'income' &&
          t.status !== 'cancelled' &&
          (t.scope === 'BUSINESS' || Boolean(t.showId)) &&
          t.date?.startsWith(currentMonthPrefix)
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const companyMonthExpenses = transactions
      .filter(t => {
        if (t.type !== 'expense' || t.status === 'cancelled') return false;
        if (!(t.scope === 'BUSINESS' || Boolean(t.showId))) return false;
        if (!t.date?.startsWith(currentMonthPrefix)) return false;
        const desc = (t.description || '').toLowerCase();
        if (desc.includes('pró-labore') || desc.includes('pro-labore')) return false;
        return true;
      })
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const companyNetProfit = Math.max(0, companyMonthIncome - companyMonthExpenses);
    const recommendedReinvestment = Math.round(companyNetProfit * 0.2);

    const companyPendingBills = transactions
      .filter(
        t =>
          t.type === 'expense' &&
          t.status === 'pending' &&
          (t.scope === 'BUSINESS' || Boolean(t.showId)) &&
          t.date?.startsWith(currentMonthPrefix)
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const availableEstimate = Math.max(
      0,
      companyCash - companyPendingBills - recommendedReinvestment
    );

    return {
      availableEstimate,
      companyCash,
      companyPendingBills,
      recommendedReinvestment,
      companyNetProfit,
      sourceAccountId: sourceAccount?.id || null,
      destinationAccountId: destinationAccount?.id || null,
      hasCompanyAccount: companyAccounts.length > 0,
      categoryId: PROLABORE_CATEGORY_ID,
      categoryLabel: PROLABORE_CATEGORY_LABEL
    };
  }, [accounts, transactions, getAccountBalance]);
}
