import { Transaction, Category, AppSettings, Debt, Account, Budget, Show } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../constants';

const KEYS = {
  TRANSACTIONS: 'fin_app_transactions',
  CATEGORIES: 'fin_app_categories',
  SETTINGS: 'fin_app_settings',
  DEBTS: 'fin_app_debts',
  ACCOUNTS: 'fin_app_accounts',
  BUDGETS: 'fin_app_budgets',
  SHOWS: 'fin_app_shows',
  AUTO_BACKUP: 'fin_app_auto_backup',
  LAST_BACKUP_TIME: 'fin_app_last_backup_time'
};

const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[StorageService] Falha ao salvar chave '${key}' no localStorage (Possível limite excedido):`, error);
    return false;
  }
};

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[StorageService] Falha ao ler chave '${key}' do localStorage:`, error);
    return null;
  }
};

export const StorageService = {
  getTransactions: (): Transaction[] => {
    try {
      const data = safeGetItem(KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveTransactions: (transactions: Transaction[]) => {
    safeSetItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getCategories: (): Category[] => {
    try {
      const data = safeGetItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories: (categories: Category[]) => {
    safeSetItem(KEYS.CATEGORIES, JSON.stringify(categories));
  },

  getSettings: (): AppSettings => {
    try {
      const data = safeGetItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : { 
        theme: 'light',
        dashboardLayout: [
          { id: 'balance', visible: true, label: 'Patrimônio' },
          { id: 'shortcuts', visible: true, label: 'Ações Rápidas' },
          { id: 'status', visible: true, label: 'Fluxo Mensal' },
          { id: 'debts', visible: true, label: 'Dívidas' },
          { id: 'recent', visible: true, label: 'Recentes' }
        ]
      };
    } catch {
      return { 
        theme: 'light',
        dashboardLayout: []
      } as any;
    }
  },

  saveSettings: (settings: AppSettings) => {
    safeSetItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  getDebts: (): Debt[] => {
    try {
      const data = safeGetItem(KEYS.DEBTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveDebts: (debts: Debt[]) => {
    safeSetItem(KEYS.DEBTS, JSON.stringify(debts));
  },

  getAccounts: (): Account[] => {
    try {
      const data = safeGetItem(KEYS.ACCOUNTS);
      if (!data) {
        safeSetItem(KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
        return DEFAULT_ACCOUNTS;
      }
      const parsed: Account[] = JSON.parse(data);
      if (!parsed || parsed.length === 0) {
        safeSetItem(KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
        return DEFAULT_ACCOUNTS;
      }
      const hasSavings = parsed.some(acc => acc.type === 'savings' || acc.name.toLowerCase().includes('economia') || acc.name.toLowerCase().includes('reserva'));
      let result = parsed.map(acc => {
        if (acc.name.toLowerCase().includes('economia') || acc.name.toLowerCase().includes('reserva')) {
          return { ...acc, type: 'savings' as const };
        }
        return acc;
      });
      if (!hasSavings) {
        result.push({
          id: 'acc_savings',
          name: 'Economias',
          type: 'savings',
          color: '#f59e0b',
          initialBalance: 0,
          enabled: true
        });
        safeSetItem(KEYS.ACCOUNTS, JSON.stringify(result));
      }
      return result;
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  },

  saveAccounts: (accounts: Account[]) => {
    safeSetItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  getBudgets: (): Budget[] => {
    try {
      const data = safeGetItem(KEYS.BUDGETS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveBudgets: (budgets: Budget[]) => {
    safeSetItem(KEYS.BUDGETS, JSON.stringify(budgets));
  },

  getShows: (): Show[] => {
    try {
      const data = safeGetItem(KEYS.SHOWS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveShows: (shows: Show[]) => {
    safeSetItem(KEYS.SHOWS, JSON.stringify(shows));
  },
  
  clearData: () => {
    try {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[StorageService] Falha ao limpar dados:', e);
    }
  },

  // Removida a duplicação redundante de dados em fin_app_auto_backup para economizar 50% de espaço
  createAutoBackup: () => {
    try {
      // Remove a cópia legada pesada se ainda existir
      localStorage.removeItem(KEYS.AUTO_BACKUP);
      safeSetItem(KEYS.LAST_BACKUP_TIME, Date.now().toString());
      return true;
    } catch {
      return false;
    }
  },

  getAutoBackupInfo: () => {
    try {
      const timestampStr = safeGetItem(KEYS.LAST_BACKUP_TIME);
      if (!timestampStr) return null;
      return {
        timestamp: parseInt(timestampStr),
        date: new Date(parseInt(timestampStr))
      };
    } catch {
      return null;
    }
  },

  restoreAutoBackup: () => {
    // Como os dados já residem como fonte viva nas chaves principais sem duplicação de cópia,
    // o estado atual já é preservado. Se existir backup legado, tenta recuperar.
    try {
      const dataStr = safeGetItem(KEYS.AUTO_BACKUP);
      if (!dataStr) return true;
      const data = JSON.parse(dataStr);
      if (data.transactions) StorageService.saveTransactions(data.transactions);
      if (data.categories) StorageService.saveCategories(data.categories);
      if (data.settings) StorageService.saveSettings(data.settings);
      if (data.debts) StorageService.saveDebts(data.debts);
      if (data.accounts) StorageService.saveAccounts(data.accounts);
      if (data.budgets) StorageService.saveBudgets(data.budgets);
      if (data.shows) StorageService.saveShows(data.shows);
      localStorage.removeItem(KEYS.AUTO_BACKUP);
      return true;
    } catch {
      return false;
    }
  }
};
