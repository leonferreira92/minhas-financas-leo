import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  BurnRateMetrics,
  computeBurnRateMetrics,
} from '../services/metricsCalculations';
import { getCurrentMonthPrefix, getLocalDateString } from '../services/dateUtils';

export interface UseBurnRateOptions {
  monthPrefix?: string;
  todayStr?: string;
  /** Inclui aportes de meta no gasto (padrão da Visão Inteligente). */
  includeGoalDeposit?: boolean;
}

/**
 * Burn rate e projeção de fim de mês.
 * projected = spentToDate + (spentToDate / dayOfMonth) * daysRemaining
 * com piso em spentToDate.
 */
export function useBurnRate(options?: UseBurnRateOptions): BurnRateMetrics {
  const { transactions } = useFinance();
  const todayStr = options?.todayStr ?? getLocalDateString();
  const monthPrefix = options?.monthPrefix ?? getCurrentMonthPrefix(todayStr);
  const includeGoalDeposit = options?.includeGoalDeposit ?? true;

  return useMemo(
    () =>
      computeBurnRateMetrics({
        transactions,
        monthPrefix,
        todayStr,
        includeGoalDeposit,
      }),
    [transactions, monthPrefix, todayStr, includeGoalDeposit],
  );
}

export type { BurnRateMetrics };
