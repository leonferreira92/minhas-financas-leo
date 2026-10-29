import { describe, expect, it } from 'vitest';
import type { Account, Debt, Transaction } from '../types';
import {
  SAFE_SPEND_ZERO_MESSAGE,
  buildDebtScheduleByMonth,
  computeBurnRateMetrics,
  computeDebtMetricsForMonth,
  computeSafeSpendMetrics,
  round2,
} from './metricsCalculations';

const debt = (partial: Partial<Debt> & Pick<Debt, 'id' | 'name'>): Debt => ({
  type: 'bank',
  totalAmount: 0,
  startDate: '2025-01-01',
  installmentCount: 1,
  ...partial,
});

const tx = (
  partial: Partial<Transaction> &
    Pick<Transaction, 'id' | 'date' | 'amount' | 'type' | 'status'>,
): Transaction => ({
  description: partial.description || 'tx',
  accountId: 'acc1',
  categoryId: 'cat1',
  createdAt: Date.now(),
  ...partial,
});

const account = (
  partial: Partial<Account> & Pick<Account, 'id' | 'name' | 'type'>,
): Account => ({
  color: '#000',
  initialBalance: 0,
  enabled: true,
  ...partial,
});

describe('computeDebtMetricsForMonth — parcelas do mês selecionado', () => {
  it('soma apenas parcelas que vencem no mês (não saldo÷meses)', () => {
    const debts: Debt[] = [
      debt({
        id: 'd1',
        name: 'Financiamento',
        totalAmount: 1200,
        installmentCount: 6,
        installmentAmount: 200,
        startDate: '2025-09-01',
      }),
      debt({
        id: 'd2',
        name: 'Cartão',
        totalAmount: 594,
        installmentCount: 1,
        installmentAmount: 594,
        startDate: '2025-11-01',
      }),
    ];

    const transactions: Transaction[] = [
      tx({
        id: 't1',
        debtId: 'd1',
        date: '2025-11-10',
        amount: 200,
        type: 'expense',
        status: 'pending',
      }),
      tx({
        id: 't2',
        debtId: 'd1',
        date: '2025-12-10',
        amount: 200,
        type: 'expense',
        status: 'pending',
      }),
      tx({
        id: 't3',
        debtId: 'd2',
        date: '2025-11-15',
        amount: 594,
        type: 'expense',
        status: 'pending',
      }),
      // parcela já paga no passado — não deve entrar em nov/dez
      tx({
        id: 't0',
        debtId: 'd1',
        date: '2025-10-10',
        amount: 200,
        type: 'expense',
        status: 'paid',
      }),
    ];

    const nov = computeDebtMetricsForMonth({
      debts,
      transactions,
      monthPrefix: '2025-11',
    });
    const dez = computeDebtMetricsForMonth({
      debts,
      transactions,
      monthPrefix: '2025-12',
    });

    expect(nov.monthlyCommitment).toBe(794); // 200 + 594
    expect(dez.monthlyCommitment).toBe(200); // só d1; d2 encerrou em nov
  });

  it('reflete queda do cronograma (ex.: 1670,89 → 1076,89)', () => {
    const debts: Debt[] = [
      debt({
        id: 'a',
        name: 'A',
        totalAmount: 5000,
        installmentAmount: 1076.89,
        installmentCount: 5,
      }),
      debt({
        id: 'b',
        name: 'B',
        totalAmount: 594,
        installmentAmount: 594,
        installmentCount: 1,
      }),
    ];
    const transactions: Transaction[] = [
      tx({
        id: 'n1',
        debtId: 'a',
        date: '2025-11-05',
        amount: 1076.89,
        type: 'expense',
        status: 'pending',
      }),
      tx({
        id: 'n2',
        debtId: 'b',
        date: '2025-11-05',
        amount: 594,
        type: 'expense',
        status: 'pending',
      }),
      tx({
        id: 'd1',
        debtId: 'a',
        date: '2025-12-05',
        amount: 1076.89,
        type: 'expense',
        status: 'pending',
      }),
    ];

    const schedule = buildDebtScheduleByMonth({
      debts,
      transactions,
      fromMonth: '2025-11',
      horizonMonths: 3,
    });

    expect(round2(schedule['2025-11'])).toBe(1670.89);
    expect(round2(schedule['2025-12'])).toBe(1076.89);
  });

  it('não inclui dívida quitada no passado', () => {
    const debts: Debt[] = [
      debt({
        id: 'old',
        name: 'Quitada',
        totalAmount: 500,
        installmentAmount: 500,
        installmentCount: 1,
      }),
    ];
    const transactions: Transaction[] = [
      tx({
        id: 'p',
        debtId: 'old',
        date: '2025-08-01',
        amount: 500,
        type: 'expense',
        status: 'paid',
      }),
    ];

    const metrics = computeDebtMetricsForMonth({
      debts,
      transactions,
      monthPrefix: '2025-11',
      getDebtRemaining: () => 0,
    });

    expect(metrics.monthlyCommitment).toBe(0);
    expect(metrics.activeDebtsCount).toBe(0);
  });

  it('última parcela restante no mês soma só o valor residual', () => {
    const debts: Debt[] = [
      debt({
        id: 'last',
        name: 'Última',
        totalAmount: 1000,
        installmentAmount: 200,
        installmentCount: 5,
        startDate: '2025-07-01',
      }),
    ];
    // 4 pagas → resta 200
    const paidMonths = ['2025-07', '2025-08', '2025-09', '2025-10'];
    const transactions: Transaction[] = paidMonths.map((ym, i) =>
      tx({
        id: `p${i}`,
        debtId: 'last',
        date: `${ym}-10`,
        amount: 200,
        type: 'expense',
        status: 'paid',
      }),
    );

    const schedule = buildDebtScheduleByMonth({
      debts,
      transactions,
      fromMonth: '2025-11',
      horizonMonths: 3,
      getDebtRemaining: () => 200,
    });

    expect(schedule['2025-11']).toBe(200);
    expect(schedule['2025-12'] || 0).toBe(0);

    const nov = computeDebtMetricsForMonth({
      debts,
      transactions,
      monthPrefix: '2025-11',
      getDebtRemaining: () => 200,
    });
    expect(nov.monthlyCommitment).toBe(200);
  });
});

describe('computeSafeSpendMetrics — compra segura', () => {
  const accounts: Account[] = [
    account({ id: 'op', name: 'Nubank', type: 'bank' }),
    account({ id: 'res', name: 'Reserva', type: 'savings' }),
  ];

  it('usa reserva real (não meta teórica) e trava em 0 com mensagem', () => {
    const getBalance = (id: string) => (id === 'op' ? 1000 : 3000);

    const result = computeSafeSpendMetrics({
      accounts,
      getAccountBalance: getBalance,
      debts: [
        debt({
          id: 'd1',
          name: 'X',
          totalAmount: 500,
          installmentAmount: 500,
          installmentCount: 1,
        }),
      ],
      transactions: [
        tx({
          id: 'bill',
          date: '2025-11-20',
          amount: 400,
          type: 'expense',
          status: 'pending',
        }),
        tx({
          id: 'debt',
          debtId: 'd1',
          date: '2025-11-15',
          amount: 500,
          type: 'expense',
          status: 'pending',
        }),
      ],
      monthPrefix: '2025-11',
      todayStr: '2025-11-10',
      getDebtRemaining: () => 500,
    });

    // 1000 - 400 - 500 = 100
    expect(result.operationalBalance).toBe(1000);
    expect(result.actualReserved).toBe(3000); // real, não 6× custo de vida
    expect(result.pendingBillsRestOfMonth).toBe(400);
    expect(result.debtInstallmentsActiveMonth).toBe(500);
    expect(result.safeSpotPurchase).toBe(100);
    expect(result.message).toBeNull();
  });

  it('resultado negativo vira R$ 0,00 com mensagem padrão', () => {
    const result = computeSafeSpendMetrics({
      accounts,
      getAccountBalance: (id) => (id === 'op' ? 200 : 8000),
      debts: [],
      transactions: [
        tx({
          id: 'bill',
          date: '2025-11-28',
          amount: 500,
          type: 'expense',
          status: 'pending',
        }),
      ],
      monthPrefix: '2025-11',
      todayStr: '2025-11-10',
    });

    expect(result.safeSpotPurchase).toBe(0);
    expect(result.message).toBe(SAFE_SPEND_ZERO_MESSAGE);
    // Não desconta déficit teórico: reserva real só informativa
    expect(result.actualReserved).toBe(8000);
  });
});

describe('computeBurnRateMetrics — projeção fim de mês', () => {
  it('projeta spent + (spent/dia)*restantes e nunca fica abaixo do gasto realizado', () => {
    const transactions: Transaction[] = [
      tx({
        id: 'e1',
        date: '2025-11-01',
        amount: 2000,
        type: 'expense',
        status: 'paid',
      }),
      tx({
        id: 'e2',
        date: '2025-11-15',
        amount: 3799.66,
        type: 'expense',
        status: 'paid',
      }),
      // pendente futuro não entra no realizado
      tx({
        id: 'e3',
        date: '2025-11-30',
        amount: 999,
        type: 'expense',
        status: 'pending',
      }),
    ];

    const metrics = computeBurnRateMetrics({
      transactions,
      monthPrefix: '2025-11',
      todayStr: '2025-11-28',
    });

    expect(metrics.spentToDate).toBe(5799.66);
    expect(metrics.dayOfMonth).toBe(28);
    expect(metrics.daysInMonth).toBe(30);
    expect(metrics.daysRemaining).toBe(2);
    expect(metrics.projected).toBeGreaterThanOrEqual(5799.66);

    const expected = round2(
      5799.66 + (5799.66 / 28) * 2,
    );
    expect(metrics.projected).toBe(expected);
  });

  it('piso: projeção >= gasto realizado mesmo em casos-limite', () => {
    const metrics = computeBurnRateMetrics({
      transactions: [
        tx({
          id: 'e',
          date: '2025-11-28',
          amount: 5799.66,
          type: 'expense',
          status: 'paid',
        }),
      ],
      monthPrefix: '2025-11',
      todayStr: '2025-11-28',
    });

    expect(metrics.projected).toBeGreaterThanOrEqual(metrics.spentToDate);
    expect(metrics.spentToDate).toBe(5799.66);
  });
});
