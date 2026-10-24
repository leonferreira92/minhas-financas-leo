import { Account } from '../types';
import { getAccountVinculo } from './financeAggregator';

/**
 * Fase 1 — App 100% pessoal na UI.
 * Não apaga transações; só esconde módulo empresa e arquiva contas MUSICO/BUSINESS.
 */
export const PERSONAL_ONLY_MODE = true;

/** Conta de carreira/empresa — deve sair da UI de caixa pessoal. */
export const isCompanyAccount = (acc: Account | null | undefined): boolean => {
  if (!acc) return false;
  if (getAccountVinculo(acc) === 'MUSICO') return true;
  if (acc.scope === 'BUSINESS') return true;
  const n = (acc.name || '').toLowerCase();
  // Heurística só para contas claramente PJ/shows — não arquiva Mercado Pago pessoal
  return (
    n.includes('shows (pj)') ||
    (n.includes('mercado pago') && (n.includes('pj') || n.includes('show'))) ||
    (n.includes('pj') && n.includes('show'))
  );
};

/**
 * Soft-archive: enabled=false. Preserva id e histórico de txs.
 * Não altera initialBalance nem lançamentos.
 */
export const archiveCompanyAccounts = (
  list: Account[]
): { accounts: Account[]; changed: boolean; archivedIds: string[] } => {
  let changed = false;
  const archivedIds: string[] = [];
  const accounts = list.map(acc => {
    if (!isCompanyAccount(acc)) return acc;
    if (acc.enabled === false) return acc;
    changed = true;
    archivedIds.push(acc.id);
    return { ...acc, enabled: false };
  });
  return { accounts, changed, archivedIds };
};
