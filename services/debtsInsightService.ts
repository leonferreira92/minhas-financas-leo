import { Debt, Transaction } from '../types';

export type DebtFitTone = 'ok' | 'tight' | 'heavy';

export interface DebtsMonthInsight {
  activeCount: number;
  totalRemaining: number;
  monthInstallmentsDue: number;
  monthInstallmentsPaid: number;
  monthInstallmentsPending: number;
  nextDueDate: string | null;
  nextDueLabel: string | null;
  fitTone: DebtFitTone;
  fitLabel: string;
  fitHint: string;
}

type DebtProgressFn = (debtId: string) => {
  status: string;
  remaining: number;
  paid: number;
};

/**
 * Resumo simples: parcelas do mês e se o peso das dívidas está confortável.
 */
export const computeDebtsMonthInsight = (params: {
  debts: Debt[];
  transactions: Transaction[];
  getDebtProgress: DebtProgressFn;
  /** Folga de caixa / limite à vista (opcional) para comparar com parcelas do mês */
  safeCashHeadroom?: number;
}): DebtsMonthInsight => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayStr.slice(0, 7);

  const active = params.debts.filter(d => {
    const p = params.getDebtProgress(d.id);
    return p.status === 'active' && p.remaining > 0.1;
  });

  const totalRemaining = active.reduce(
    (s, d) => s + params.getDebtProgress(d.id).remaining,
    0
  );

  const monthDebtTxs = params.transactions.filter(
    t =>
      t.debtId &&
      t.date?.startsWith(monthPrefix) &&
      t.status !== 'cancelled' &&
      t.type === 'expense'
  );

  const monthInstallmentsPaid = monthDebtTxs
    .filter(t => t.status === 'paid')
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const monthInstallmentsPending = monthDebtTxs
    .filter(t => t.status === 'pending')
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  // Se não houver txs pendentes cadastradas, estima pelas dívidas ativas (parcela do contrato)
  let estimatedDue = monthInstallmentsPending;
  if (estimatedDue < 0.01 && active.length > 0) {
    estimatedDue = active.reduce((sum, d) => {
      const hasPaidThisMonth = monthDebtTxs.some(
        t => t.debtId === d.id && t.status === 'paid'
      );
      if (hasPaidThisMonth) return sum;
      if (d.installmentAmount && d.installmentAmount > 0) {
        return sum + Number(d.installmentAmount);
      }
      const count = d.installmentCount || 1;
      return sum + Number(d.totalAmount) / count;
    }, 0);
  }

  const monthInstallmentsDue = monthInstallmentsPaid + estimatedDue;

  const pendingTxs = monthDebtTxs
    .filter(t => t.status === 'pending' && t.date)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const nextDueDate = pendingTxs[0]?.date || null;
  let nextDueLabel: string | null = null;
  if (nextDueDate) {
    const d = new Date(nextDueDate + 'T12:00:00');
    nextDueLabel = d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  }

  const headroom = params.safeCashHeadroom;
  let fitTone: DebtFitTone = 'ok';
  let fitLabel = 'Parcelas sob controle';
  let fitHint =
    estimatedDue > 0
      ? `Ainda faltam cerca de ${fmt(estimatedDue)} em parcelas neste mês.`
      : monthInstallmentsPaid > 0
        ? 'As parcelas deste mês já estão quitadas (pelo extrato).'
        : active.length === 0
          ? 'Nenhuma dívida parcelada ativa no momento.'
          : 'Sem parcelas pendentes cadastradas para este mês.';

  if (active.length > 0 && estimatedDue > 0) {
    if (headroom != null && headroom >= 0 && estimatedDue > headroom) {
      fitTone = 'heavy';
      fitLabel = 'Parcelas pesadas no caixa';
      fitHint = `As parcelas a pagar (${fmt(estimatedDue)}) passam da folga segura do caixa (${fmt(headroom)}). Priorize quitar o que vence primeiro.`;
    } else if (
      headroom != null &&
      headroom > 0 &&
      estimatedDue > headroom * 0.55
    ) {
      fitTone = 'tight';
      fitLabel = 'Parcelas apertam o mês';
      fitHint = `Cerca de ${fmt(estimatedDue)} em parcelas — usa boa parte da folga. Evite novas compras parceladas.`;
    } else if (monthInstallmentsDue > 0 && totalRemaining > monthInstallmentsDue * 24) {
      // Dívida longa, mas mês ok
      fitTone = 'ok';
      fitLabel = 'Mês ok · dívida longa';
      fitHint = `Este mês está manejável. Ainda restam ${fmt(totalRemaining)} no total — foque nas próximas parcelas.`;
    }
  }

  return {
    activeCount: active.length,
    totalRemaining,
    monthInstallmentsDue,
    monthInstallmentsPaid,
    monthInstallmentsPending: estimatedDue,
    nextDueDate,
    nextDueLabel,
    fitTone,
    fitLabel,
    fitHint
  };
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
