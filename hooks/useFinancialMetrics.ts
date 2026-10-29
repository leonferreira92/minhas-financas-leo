import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  CategoryPeriodKey,
  EssentialityTotals,
  calculateEssentialityTotals,
  getPeriodMonthPrefixes,
} from '../services/categoryEssentiality';
import {
  SafeSpendMetrics,
  SAFE_SPEND_ZERO_MESSAGE,
  computeSafeSpendMetrics,
} from '../services/metricsCalculations';
import { getCurrentMonthPrefix, getLocalDateString } from '../services/dateUtils';
import { isSomLeoDebtOrTransaction } from '../services/financeAggregator';

export interface UseFinancialMetricsOptions {
  /** Janela temporal para essencialidade (padrão: últimos 6 meses). */
  period?: CategoryPeriodKey;
  /** Mês ativo para compra segura (padrão: mês corrente). */
  monthPrefix?: string;
  todayStr?: string;
}

export interface FinancialMetrics extends EssentialityTotals {
  period: CategoryPeriodKey;
  monthPrefixes: string[];
  /** Limite seguro para compra à vista (fórmula corrigida). */
  safeSpend: SafeSpendMetrics;
}

/**
 * Hook agregador: essencialidade + limite seguro para compra à vista.
 */
export function useFinancialMetrics(
  options?: UseFinancialMetricsOptions,
): FinancialMetrics {
  const {
    transactions,
    categories,
    accounts,
    debts,
    getAccountBalance,
    getDebtProgress,
  } = useFinance();
  const period = options?.period ?? '6m';
  const todayStr = options?.todayStr ?? getLocalDateString();
  const monthPrefix = options?.monthPrefix ?? getCurrentMonthPrefix(todayStr);

  return useMemo(() => {
    const monthPrefixes = getPeriodMonthPrefixes(period);
    const totals = calculateEssentialityTotals(transactions, categories, {
      monthPrefixes,
      expensesOnly: true,
    });
    const safeSpend = computeSafeSpendMetrics({
      accounts,
      transactions,
      debts,
      getAccountBalance,
      getDebtRemaining: (id) => getDebtProgress(id).remaining,
      monthPrefix,
      todayStr,
      excludeDebt: (d) => isSomLeoDebtOrTransaction(d),
    });
    return {
      ...totals,
      period,
      monthPrefixes,
      safeSpend,
    };
  }, [
    transactions,
    categories,
    accounts,
    debts,
    getAccountBalance,
    getDebtProgress,
    period,
    monthPrefix,
    todayStr,
  ]);
}

export {
  calculateEssentialityTotals,
  getPeriodMonthPrefixes,
} from '../services/categoryEssentiality';
export { SAFE_SPEND_ZERO_MESSAGE };
export type { EssentialityTotals, CategoryPeriodKey, SafeSpendMetrics };
