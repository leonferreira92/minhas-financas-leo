import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  CategoryPeriodKey,
  EssentialityTotals,
  calculateEssentialityTotals,
  getPeriodMonthPrefixes,
} from '../services/categoryEssentiality';

export interface UseFinancialMetricsOptions {
  /** Janela temporal (padrão: últimos 6 meses). */
  period?: CategoryPeriodKey;
}

export interface FinancialMetrics extends EssentialityTotals {
  period: CategoryPeriodKey;
  monthPrefixes: string[];
}

/**
 * Hook de preparação para Relatórios Inteligentes.
 * Expõe totais por essencialidade e o Custo Mínimo de Sobrevivência (survivalCost).
 */
export function useFinancialMetrics(
  options?: UseFinancialMetricsOptions,
): FinancialMetrics {
  const { transactions, categories } = useFinance();
  const period = options?.period ?? '6m';

  return useMemo(() => {
    const monthPrefixes = getPeriodMonthPrefixes(period);
    const totals = calculateEssentialityTotals(transactions, categories, {
      monthPrefixes,
      expensesOnly: true,
    });
    return {
      ...totals,
      period,
      monthPrefixes,
    };
  }, [transactions, categories, period]);
}

export {
  calculateEssentialityTotals,
  getPeriodMonthPrefixes,
} from '../services/categoryEssentiality';
export type { EssentialityTotals, CategoryPeriodKey };
