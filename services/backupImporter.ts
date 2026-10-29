import rawBackup from '../public/assets/aistudio/financas_pro_backup_2026-10-21_a06f8b5c.json';
import { Transaction, Category, AppSettings, Debt, Account, Budget } from '../types';

export interface BackupDataStructure {
  version: string;
  timestamp: string;
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
  debts: Debt[];
  accounts: Account[];
  budgets: Budget[];
}

const raw = rawBackup as any;

// 1. Garante que categorias referenciadas (como logística de shows) existam na lista
const categoriesList: Category[] = Array.isArray(raw.categories) ? [...raw.categories] : [];
const hasLogistica = categoriesList.some(c => c.id === 'cat_logistica_shows');
if (!hasLogistica) {
  categoriesList.push({
    id: 'cat_logistica_shows',
    name: 'Deslocamento / Logística Shows',
    type: 'expense',
    color: '#f59e0b',
    icon: 'Fuel',
    classification: 'professional',
    scope: 'BUSINESS'
  });
}

// 2. Normaliza contas (Banco do Brasil, Mercado Pago, Carteira)
const accountsList: Account[] = Array.isArray(raw.accounts) ? raw.accounts.map((acc: any) => ({
  ...acc,
  enabled: true,
  vinculo: acc.vinculo || (acc.scope === 'BUSINESS' ? 'MUSICO' : 'PESSOAL')
})) : [];

// 3. Normaliza transações (mapeia acc_mp legado para ID da conta Mercado Pago e padroniza categoryId)
const MERCADO_PAGO_ID = 'c7566b59-3683-4c90-8293-2ff7af82f3b3';
const transactionsList: Transaction[] = Array.isArray(raw.transactions) ? raw.transactions.map((tx: any) => {
  const accountId = tx.accountId === 'acc_mp' ? MERCADO_PAGO_ID : (tx.accountId || '');
  // Sem categoria / ID vazio → "A Classificar" (nunca "Roupas / Calçados")
  const categoryId = tx.categoryId || tx.category || 'cat_other';
  return {
    ...tx,
    accountId,
    categoryId,
    category: categoryId,
    interest: Number(tx.interest) || 0,
    amount: Number(tx.amount) || 0
  };
}) : [];

// 4. Normaliza dívidas e configurações
const debtsList: Debt[] = Array.isArray(raw.debts) ? raw.debts : [];
const budgetsList: Budget[] = Array.isArray(raw.budgets) ? raw.budgets : [];
const settingsObj: AppSettings = raw.settings || {
  theme: 'dark',
  userName: 'Leo',
  personalDefaultAccountId: 'cc239623-c7c3-4d88-b6ff-e5dc83a2c1d5',
  businessDefaultAccountId: 'c7566b59-3683-4c90-8293-2ff7af82f3b3',
  dashboardLayout: []
};

export const BACKUP_DATA: BackupDataStructure = {
  version: raw.version || '1.1',
  timestamp: raw.timestamp || new Date().toISOString(),
  transactions: transactionsList,
  categories: categoriesList,
  settings: settingsObj,
  debts: debtsList,
  accounts: accountsList,
  budgets: budgetsList
};

/**
 * Carrega e persiste os dados do backup no armazenamento local
 */
export const loadBackupIntoStorage = (userId?: string | null): boolean => {
  try {
    const suffix = userId ? `_${userId}` : '';
    
    // Chaves de armazenamento do usuário e raiz
    const itemsToSave = [
      { key: `fin_app_transactions${suffix}`, data: BACKUP_DATA.transactions },
      { key: `fin_app_categories${suffix}`, data: BACKUP_DATA.categories },
      { key: `fin_app_settings${suffix}`, data: BACKUP_DATA.settings },
      { key: `fin_app_debts${suffix}`, data: BACKUP_DATA.debts },
      { key: `fin_app_accounts${suffix}`, data: BACKUP_DATA.accounts },
      { key: `fin_app_budgets${suffix}`, data: BACKUP_DATA.budgets },
      // Também replica nas chaves principais para uso imediato em qualquer contexto
      { key: 'fin_app_transactions', data: BACKUP_DATA.transactions },
      { key: 'fin_app_categories', data: BACKUP_DATA.categories },
      { key: 'fin_app_settings', data: BACKUP_DATA.settings },
      { key: 'fin_app_debts', data: BACKUP_DATA.debts },
      { key: 'fin_app_accounts', data: BACKUP_DATA.accounts },
      { key: 'fin_app_budgets', data: BACKUP_DATA.budgets },
    ];

    itemsToSave.forEach(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    });

    // Limpa shows/legado de carreira no local (não fazem parte do backup pessoal 21/10)
    const emptyArr = JSON.stringify([]);
    localStorage.setItem(`fin_app_shows${suffix}`, emptyArr);
    localStorage.setItem('fin_app_shows', emptyArr);
    localStorage.setItem(`fin_app_venues${suffix}`, emptyArr);
    localStorage.setItem('fin_app_venues', emptyArr);
    localStorage.setItem(`fin_app_crew${suffix}`, emptyArr);
    localStorage.setItem('fin_app_crew', emptyArr);

    localStorage.setItem(`fin_backup_restored_${userId || 'root'}`, `${Date.now()}`);
    return true;
  } catch (error) {
    console.error('[BackupImporter] Erro ao salvar dados do backup:', error);
    return false;
  }
};
