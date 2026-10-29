import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  DebtMonthMetrics,
  computeDebtMetricsForMonth,
} from '../services/metricsCalculations';
import { getCurrentMonthPrefix } from '../services/dateUtils';
import { isSomLeoDebtOrTransaction } from '../services/financeAggregator';

export interface UseDebtMetricsOptions {
  /** Mês alvo YYYY-MM (padrão: mês corrente local). */
  monthPrefix?: string;
  horizonMonths?: number;
}

/**
 * Compromisso mensal com dívidas = parcelas que vencem no mês selecionado
 * (cronograma real de amortização — não saldo÷meses).
 */
export function useDebtMetrics(
  options?: UseDebtMetricsOptions,
): DebtMonthMetrics {
  const { debts, transactions, getDebtProgress } = useFinance();
  const monthPrefix = options?.monthPrefix ?? getCurrentMonthPrefix();
  const horizonMonths = options?.horizonMonths ?? 24;

  return useMemo(
    () =>
      computeDebtMetricsForMonth({
        debts,
        transactions,
        monthPrefix,
        horizonMonths,
        getDebtRemaining: (id) => getDebtProgress(id).remaining,
        excludeDebt: (d) => isSomLeoDebtOrTransaction(d),
      }),
    [debts, transactions, monthPrefix, horizonMonths, getDebtProgress],
  );
}

export type { DebtMonthMetrics };
