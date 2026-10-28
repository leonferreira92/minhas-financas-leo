import { Account, AppSettings, Transaction } from '../types';
import { isTransferMovement } from './aiReportService';

/** App 100% pessoal a partir desta data (inclusive). */
export const PERSONAL_CUTOFF_DATE = '2026-10-01';
export const LEGACY_MIGRATION_FLAG = '2026-10-01';

const SHOW_CATEGORY_IDS = new Set([
  'cat_33',
  'cat_equipamentos',
  'cat_logistica_shows',
  'cat_producao_shows',
  'cat_marketing',
  'cat_prolabore_out',
  'cat_midia_marketing'
]);

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const isLegacyArchivedTx = (t: Transaction): boolean =>
  Boolean((t as Transaction & { legacyArchived?: boolean }).legacyArchived);

/** Show / cachê / carreira — legado de empresa neste app. */
export const isShowOrCareerTransaction = (t: Transaction): boolean => {
  if (t.scope === 'BUSINESS') return true;
  if (t.showId || t.showExpenseId || t.showPaymentId || t.isEventTransaction) return true;
  if (SHOW_CATEGORY_IDS.has(t.categoryId)) return true;
  const d = normalize(t.description || '');
  const n = normalize(t.showName || '');
  return (
    d.includes('cache') ||
    d.includes('cachê') ||
    d.includes('show ') ||
    d.startsWith('show') ||
    d.includes('musico') ||
    d.includes('músico') ||
    n.includes('show') ||
    n.includes('cache')
  );
};

export const shouldArchiveAsLegacy = (
  t: Transaction,
  cutoff: string = PERSONAL_CUTOFF_DATE
): boolean => {
  if (isLegacyArchivedTx(t)) return false;
  if (t.status === 'cancelled') return false;
  if (isShowOrCareerTransaction(t)) return true;
  if (t.date && t.date < cutoff) return true;
  return false;
};

export interface CutoffDryRunSummary {
  cutoff: string;
  alreadyApplied: boolean;
  totalTransactions: number;
  toArchivePaid: number;
  toArchivePending: number;
  toCancelPending: number;
  showOrCareerCount: number;
  preCutoffCount: number;
  accountOpenings: Array<{
    accountId: string;
    accountName: string;
    currentInitial: number;
    proposedInitial: number;
    delta: number;
  }>;
}

const txCashEffectOnAccount = (
  t: Transaction,
  accountId: string
): number => {
  if (t.status !== 'paid') return 0;
  const amt = Math.abs(Number(t.amount) || 0);
  if (amt === 0) return 0;

  if (isTransferMovement(t) || t.type === 'transfer') {
    if (t.accountId === accountId) return -amt;
    if (t.destinationAccountId === accountId) return +amt;
    return 0;
  }

  if (t.accountId !== accountId) return 0;
  if (t.type === 'income' || t.type === 'goal_withdraw') return +amt;
  if (t.type === 'expense' || t.type === 'goal_deposit') return -amt;
  return 0;
};

export const dryRunPersonalCutoff = (params: {
  accounts: Account[];
  transactions: Transaction[];
  settings: AppSettings;
  cutoff?: string;
}): CutoffDryRunSummary => {
  const cutoff = params.cutoff || PERSONAL_CUTOFF_DATE;
  const alreadyApplied = params.settings.legacyPersonalCutoffApplied === LEGACY_MIGRATION_FLAG;

  const candidates = params.transactions.filter(t => shouldArchiveAsLegacy(t, cutoff));
  const showOrCareerCount = candidates.filter(isShowOrCareerTransaction).length;
  const preCutoffCount = candidates.filter(t => t.date && t.date < cutoff && !isShowOrCareerTransaction(t)).length;

  const toArchivePaid = candidates.filter(t => t.status === 'paid').length;
  const toArchivePending = candidates.filter(t => t.status === 'pending').length;
  const toCancelPending = toArchivePending;

  const accountOpenings = params.accounts.map(acc => {
    const currentInitial = Number(acc.initialBalance || 0);
    let delta = 0;
    candidates.forEach(t => {
      if (t.status !== 'paid') return;
      delta += txCashEffectOnAccount(t, acc.id);
    });
    const proposedInitial = Number((currentInitial + delta).toFixed(2));
    return {
      accountId: acc.id,
      accountName: acc.name,
      currentInitial,
      proposedInitial,
      delta: Number(delta.toFixed(2))
    };
  }).filter(a => Math.abs(a.delta) > 0.001 || true);

  return {
    cutoff,
    alreadyApplied,
    totalTransactions: params.transactions.length,
    toArchivePaid,
    toArchivePending,
    toCancelPending,
    showOrCareerCount,
    preCutoffCount,
    accountOpenings: accountOpenings.filter(a => Math.abs(a.delta) > 0.001)
  };
};

/**
 * Soft-archive: marca legacyArchived, congela efeito pago no initialBalance.
 * Pendentes de legado → cancelled (não altera caixa).
 * Idempotente via settings.legacyPersonalCutoffApplied.
 */
export const applyPersonalCutoffMigration = (params: {
  accounts: Account[];
  transactions: Transaction[];
  settings: AppSettings;
  cutoff?: string;
}): {
  accounts: Account[];
  transactions: Transaction[];
  settings: AppSettings;
  summary: CutoffDryRunSummary;
  applied: boolean;
} => {
  const cutoff = params.cutoff || PERSONAL_CUTOFF_DATE;
  const summary = dryRunPersonalCutoff(params);

  if (summary.alreadyApplied) {
    return {
      accounts: params.accounts,
      transactions: params.transactions,
      settings: params.settings,
      summary,
      applied: false
    };
  }

  const openingByAccount = new Map(
    summary.accountOpenings.map(a => [a.accountId, a.proposedInitial])
  );

  const accounts = params.accounts.map(acc => {
    const next = openingByAccount.get(acc.id);
    if (next === undefined) return acc;
    return { ...acc, initialBalance: next };
  });

  const transactions = params.transactions.map(t => {
    if (!shouldArchiveAsLegacy(t, cutoff)) return t;
    const next: Transaction = {
      ...t,
      legacyArchived: true
    };
    if (t.status === 'pending') {
      next.status = 'cancelled';
    }
    return next;
  });

  const settings: AppSettings = {
    ...params.settings,
    legacyPersonalCutoffApplied: LEGACY_MIGRATION_FLAG
  };

  return { accounts, transactions, settings, summary, applied: true };
};

/** Reparo idempotente: despesas pendentes do módulo carreira voltam ao caixa pessoal. */
export const CAREER_EXPENSE_PENDING_REPAIR = 'v1';

/**
 * Problema: no modo 100% pessoal, lançamentos BUSINESS (músico) ou cancelados pelo
 * corte legado somem do Painel do Mês / Extrato — mas ainda são contas a pagar reais.
 *
 * Solução: reabrir despesas pendentes (ou canceladas pelo arquivo) a partir do corte
 * e mover para scope PERSONAL, para aparecerem no extrato futuro e no saldo previsto.
 * Receitas de carreira (cachês) NÃO são restauradas.
 */
export const repairHiddenCareerExpensePendings = (params: {
  transactions: Transaction[];
  settings: AppSettings;
  fromDate?: string;
}): {
  transactions: Transaction[];
  settings: AppSettings;
  changed: boolean;
  restoredIds: string[];
} => {
  if (params.settings.careerExpensePendingRepairApplied === CAREER_EXPENSE_PENDING_REPAIR) {
    return {
      transactions: params.transactions,
      settings: params.settings,
      changed: false,
      restoredIds: []
    };
  }

  const fromDate = params.fromDate || PERSONAL_CUTOFF_DATE;
  const restoredIds: string[] = [];

  const transactions = params.transactions.map(t => {
    if (!t || t.type !== 'expense') return t;

    const isCareer =
      isShowOrCareerTransaction(t) || t.scope === 'BUSINESS';
    if (!isCareer) return t;

    const dateOk = Boolean(t.date && t.date >= fromDate);
    if (!dateOk) return t;

    // A) Cancelada + arquivada pelo corte → volta como pendente pessoal
    if (t.status === 'cancelled' && isLegacyArchivedTx(t)) {
      restoredIds.push(t.id);
      return {
        ...t,
        status: 'pending' as const,
        legacyArchived: false,
        scope: 'PERSONAL' as const
      };
    }

    // B) Ainda pendente mas escondida no escopo BUSINESS → traz para o pessoal
    if (t.status === 'pending' && (t.scope === 'BUSINESS' || isLegacyArchivedTx(t))) {
      restoredIds.push(t.id);
      return {
        ...t,
        legacyArchived: false,
        scope: 'PERSONAL' as const
      };
    }

    return t;
  });

  return {
    transactions,
    settings: {
      ...params.settings,
      careerExpensePendingRepairApplied: CAREER_EXPENSE_PENDING_REPAIR
    },
    changed: restoredIds.length > 0,
    restoredIds
  };
};
