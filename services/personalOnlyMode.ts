import { Account, Category } from '../types';
import { getAccountVinculo } from './financeAggregator';

/**
 * App 100% pessoal na UI.
 * - Não apaga transações de shows/carreira (histórico entra no saldo via accountBalancesMap).
 * - Esconde módulo empresa e soft-arquiva contas MUSICO/BUSINESS.
 * - Novos lançamentos são forçados como PERSONAL no FinanceContext.
 */
export const PERSONAL_ONLY_MODE = true;

const SHOW_CATEGORY_IDS = new Set([
  'cat_33',
  'cat_equipamentos',
  'cat_logistica_shows',
  'cat_producao_shows',
  'cat_midia_marketing',
  'cat_marketing',
  'cat_prolabore_out'
]);

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

/** Categorias do módulo empresa/shows — fora do fluxo pessoal. */
export const isBusinessCategory = (cat: Category | null | undefined): boolean => {
  if (!cat) return false;
  if (cat.scope === 'BUSINESS') return true;
  if (SHOW_CATEGORY_IDS.has(cat.id)) return true;
  return false;
};

/**
 * TED/Pix/DOC entre contas próprias — não é despesa nem receita.
 * Heurística conservadora: só padrões explícitos de transferência bancária interna.
 */
export const looksLikeInternalTransfer = (description: string): boolean => {
  const n = (description || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!n) return false;

  // Pix/TED para terceiros costuma trazer nome — não marcar como transferência interna
  const thirdPartyHints =
    n.includes('pix enviado') ||
    n.includes('pix recebido') ||
    n.includes('pix transf') ||
    (n.includes('pix') && (n.includes('cpf') || n.includes('cnpj')));

  if (thirdPartyHints) return false;

  return (
    n.includes('transferencia entre contas') ||
    n.includes('transf entre contas') ||
    n.includes('transferencia mesma titularidade') ||
    n.includes('transf mesma titularidade') ||
    n.includes('ted mesma titularidade') ||
    n.includes('doc mesma titularidade') ||
    n.includes('aplicacao automatica') ||
    n.includes('aplicacao programada') ||
    n.includes('resgate aplicacao') ||
    n.includes('resgate automatico') ||
    n.includes('aplicacao resgate') ||
    n.includes('transf cc') ||
    n.includes('transf. cc') ||
    n.includes('movimento entre contas') ||
    n.includes('transferencia para conta') ||
    n.includes('transferencia da conta') ||
    /^transferencia( bancaria)?$/.test(n.trim()) ||
    n === 'transferencia' ||
    n === 'transf'
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
