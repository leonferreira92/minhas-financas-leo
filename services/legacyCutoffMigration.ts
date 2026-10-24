import { Account, Transaction } from '../types';

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

/** Show / cachê / carreira — lixo de empresa no app pessoal. */
export const isShowOrCareerTransaction = (t: Transaction): boolean => {
  if (t.scope === 'BUSINESS') return true;
  if (t.showId || t.showExpenseId || t.showPaymentId || t.isEventTransaction) return true;
  if (SHOW_CATEGORY_IDS.has(t.categoryId)) return true;
  const blob = normalize(`${t.description || ''} ${t.category || ''} ${t.showName || ''}`);
  return (
    blob.includes('cache') ||
    blob.includes('cachê') ||
    blob.includes('show') ||
    blob.includes('musico') ||
    blob.includes('músico') ||
    blob.includes('vida de artista') ||
    blob.includes('ensaio') ||
    blob.includes('contratante')
  );
};

export const isLegacyArchivedTx = (t: Transaction): boolean =>
  Boolean((t as Transaction & { legacyArchived?: boolean }).legacyArchived);

export type LegacyMigrationReport = {
  cutoff: string;
  paidBeforeCutoff: number;
  pendingBeforeCutoff: number;
  showCareerPendingAnyDate: number;
  showCareerPaidBeforeCutoff: number;
  openingByAccount: { accountId: string; name: string; openingBalance: number; previousInitial: number }[];
  balancesMatch: boolean;
  maxBalanceDrift: number;
  samplePendingJunk: { id: string; date: string; description: string; amount: number; scope?: string }[];
};

const applyPaidDelta = (
  map: Record<string, number>,
  t: Transaction,
  accounts: Account[]
): void => {
  if (t.status !== 'paid') return;
  const amt = Math.abs(Number(t.amount) || 0);
  if (amt === 0) return;

  if (t.accountId && map[t.accountId] !== undefined) {
    const account = accounts.find(a => a.id === t.accountId);
    const isSavings = account?.type === 'savings' || t.accountId === 'acc_savings';

    if (t.type === 'income' || (t.type === 'goal_withdraw' && !isSavings)) {
      map[t.accountId] += amt;
    } else if (
      t.type === 'expense' ||
      t.type === 'goal_deposit' ||
      t.type === 'transfer' ||
      (t.type === 'goal_withdraw' && isSavings)
    ) {
      map[t.accountId] -= amt;
    } else if (t.type === 'adjustment') {
      const rawAmt = Number(t.amount) || 0;
      map[t.accountId] += rawAmt < 0 ? -amt : amt;
    }
  }

  if (t.type === 'transfer' && t.destinationAccountId && map[t.destinationAccountId] !== undefined) {
    map[t.destinationAccountId] += amt;
  }

  if (t.type === 'goal_deposit') {
    const destId =
      t.destinationAccountId ||
      accounts.find(a => a.type === 'savings' || a.id === 'acc_savings')?.id;
    if (destId && map[destId] !== undefined && destId !== t.accountId) {
      map[destId] += amt;
    }
  }
};

/** Saldo da conta considerando só lançamentos pagos com date < cutoff (e não arquivados). */
export const computeBalancesBeforeCutoff = (
  accounts: Account[],
  transactions: Transaction[],
  cutoff: string = PERSONAL_CUTOFF_DATE
): Record<string, number> => {
  const map: Record<string, number> = {};
  accounts.forEach(acc => {
    map[acc.id] = Number(acc.initialBalance || 0);
  });

  transactions.forEach(t => {
    if (!t || isLegacyArchivedTx(t)) return;
    if (t.status !== 'paid') return;
    if (!t.date || t.date >= cutoff) return;
    applyPaidDelta(map, t, accounts);
  });

  Object.keys(map).forEach(id => {
    map[id] = parseFloat(map[id].toFixed(2));
  });
  return map;
};

export const computeCurrentBalances = (
  accounts: Account[],
  transactions: Transaction[]
): Record<string, number> => {
  const map: Record<string, number> = {};
  accounts.forEach(acc => {
    map[acc.id] = Number(acc.initialBalance || 0);
  });
  transactions.forEach(t => {
    if (!t || isLegacyArchivedTx(t)) return;
    applyPaidDelta(map, t, accounts);
  });
  Object.keys(map).forEach(id => {
    map[id] = parseFloat(map[id].toFixed(2));
  });
  return map;
};

export const buildLegacyMigrationReport = (
  accounts: Account[],
  transactions: Transaction[],
  cutoff: string = PERSONAL_CUTOFF_DATE
): LegacyMigrationReport => {
  const before = transactions.filter(t => t.date && t.date < cutoff && !isLegacyArchivedTx(t));
  const paidBeforeCutoff = before.filter(t => t.status === 'paid').length;
  const pendingBeforeCutoff = before.filter(t => t.status === 'pending').length;
  const showCareerPendingAnyDate = transactions.filter(
    t => !isLegacyArchivedTx(t) && t.status === 'pending' && isShowOrCareerTransaction(t)
  ).length;
  const showCareerPaidBeforeCutoff = before.filter(
    t => t.status === 'paid' && isShowOrCareerTransaction(t)
  ).length;

  const opening = computeBalancesBeforeCutoff(accounts, transactions, cutoff);
  const current = computeCurrentBalances(accounts, transactions);

  // Simula pós-migração: opening como initial + só txs >= cutoff
  const simulatedAccounts = accounts.map(a => ({
    ...a,
    initialBalance: opening[a.id] ?? Number(a.initialBalance || 0)
  }));
  const postTxs = transactions.map(t => {
    if (t.date && t.date < cutoff) {
      return { ...t, legacyArchived: true, status: t.status === 'pending' ? ('cancelled' as const) : t.status };
    }
    if (t.status === 'pending' && isShowOrCareerTransaction(t)) {
      return { ...t, legacyArchived: true, status: 'cancelled' as const };
    }
    return t;
  });
  const after = computeCurrentBalances(simulatedAccounts, postTxs);

  let maxBalanceDrift = 0;
  accounts.forEach(a => {
    const drift = Math.abs((after[a.id] || 0) - (current[a.id] || 0));
    if (drift > maxBalanceDrift) maxBalanceDrift = drift;
  });

  const samplePendingJunk = transactions
    .filter(
      t =>
        !isLegacyArchivedTx(t) &&
        t.status === 'pending' &&
        ((t.date && t.date < cutoff) || isShowOrCareerTransaction(t))
    )
    .slice(0, 12)
    .map(t => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: Math.abs(Number(t.amount) || 0),
      scope: t.scope
    }));

  return {
    cutoff,
    paidBeforeCutoff,
    pendingBeforeCutoff,
    showCareerPendingAnyDate,
    showCareerPaidBeforeCutoff,
    openingByAccount: accounts.map(a => ({
      accountId: a.id,
      name: a.name,
      openingBalance: opening[a.id] ?? 0,
      previousInitial: Number(a.initialBalance || 0)
    })),
    balancesMatch: maxBalanceDrift < 0.02,
    maxBalanceDrift: parseFloat(maxBalanceDrift.toFixed(2)),
    samplePendingJunk
  };
};

export type LegacyMigrationResult = {
  applied: boolean;
  alreadyApplied: boolean;
  report: LegacyMigrationReport;
  accounts: Account[];
  transactions: Transaction[];
};

/** Idempotente: reaplica marcadores em txs vindas do cloud sem recalcular initialBalance. */
export const ensureLegacyArchiveMarkers = (
  transactions: Transaction[],
  cutoff: string = PERSONAL_CUTOFF_DATE
): { transactions: Transaction[]; changed: boolean } => {
  let changed = false;
  const next = transactions.map(t => {
    if (isLegacyArchivedTx(t)) return t;
    const beforeCutoff = Boolean(t.date && t.date < cutoff);
    const showJunkPending = t.status === 'pending' && isShowOrCareerTransaction(t);
    if (!beforeCutoff && !showJunkPending) return t;
    changed = true;
    return {
      ...t,
      legacyArchived: true,
      status: t.status === 'pending' || showJunkPending ? ('cancelled' as const) : t.status
    };
  });
  return { transactions: next, changed };
};

/**
 * Congela saldo em 01/10/2026, arquiva pré-corte e cancela pendências de show/empresa.
 * Não apaga registros — soft archive / cancel.
 */
export const applyPersonalCutoffMigration = (params: {
  accounts: Account[];
  transactions: Transaction[];
  alreadyAppliedFlag?: string | null;
  cutoff?: string;
}): LegacyMigrationResult => {
  const cutoff = params.cutoff || PERSONAL_CUTOFF_DATE;
  const report = buildLegacyMigrationReport(params.accounts, params.transactions, cutoff);

  if (params.alreadyAppliedFlag === LEGACY_MIGRATION_FLAG) {
    return {
      applied: false,
      alreadyApplied: true,
      report,
      accounts: params.accounts,
      transactions: params.transactions
    };
  }

  const opening = computeBalancesBeforeCutoff(params.accounts, params.transactions, cutoff);

  const accounts = params.accounts.map(a => ({
    ...a,
    initialBalance: opening[a.id] ?? Number(a.initialBalance || 0)
  }));

  const transactions = params.transactions.map(t => {
    let next: Transaction & { legacyArchived?: boolean } = { ...t };

    const beforeCutoff = Boolean(t.date && t.date < cutoff);
    const showJunkPending =
      t.status === 'pending' && isShowOrCareerTransaction(t);

    if (beforeCutoff || showJunkPending) {
      next = {
        ...next,
        legacyArchived: true,
        status: t.status === 'pending' || showJunkPending ? 'cancelled' : t.status
      };
    }

    return next;
  });

  const verify = buildLegacyMigrationReport(accounts, transactions, cutoff);

  return {
    applied: true,
    alreadyApplied: false,
    report: {
      ...report,
      balancesMatch: verify.maxBalanceDrift < 0.02,
      maxBalanceDrift: verify.maxBalanceDrift,
      openingByAccount: accounts.map(a => ({
        accountId: a.id,
        name: a.name,
        openingBalance: Number(a.initialBalance || 0),
        previousInitial:
          report.openingByAccount.find(x => x.accountId === a.id)?.previousInitial ?? 0
      }))
    },
    accounts,
    transactions
  };
};
