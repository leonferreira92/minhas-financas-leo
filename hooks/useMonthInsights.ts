import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getAccountVinculo } from '../services/financeAggregator';
import {
  computeIncomeTarget,
  computeMonthPanel,
  IncomeTargetSnapshot,
  MonthPanelSnapshot
} from '../services/monthPanelService';

/**
 * Painel do mês + renda-alvo a partir dos dados já carregados no FinanceContext.
 * Não altera persistência — só deriva números para a UI.
 */
export const useMonthInsights = (): {
  monthPanel: MonthPanelSnapshot;
  incomeTarget: IncomeTargetSnapshot;
} => {
  const {
    accounts,
    transactions,
    categories,
    debts,
    shows,
    settings,
    getAccountBalance
  } = useFinance();

  const personalCashAccountIds = useMemo(
    () =>
      accounts
        .filter(
          a =>
            a.enabled !== false &&
            a.type !== 'savings' &&
            getAccountVinculo(a) !== 'MUSICO' &&
            a.scope !== 'BUSINESS'
        )
        .map(a => a.id),
    [accounts]
  );

  const monthPanel = useMemo(
    () =>
      computeMonthPanel({
        accounts,
        transactions,
        shows,
        categories,
        getAccountBalance,
        cashAccountIds: personalCashAccountIds
      }),
    [accounts, transactions, shows, categories, getAccountBalance, personalCashAccountIds]
  );

  const incomeTarget = useMemo(
    () =>
      computeIncomeTarget({
        accounts,
        transactions,
        categories,
        debts,
        financialSettings: settings.financialSettings,
        getAccountBalance
      }),
    [accounts, transactions, categories, debts, settings.financialSettings, getAccountBalance]
  );

  return { monthPanel, incomeTarget };
};
