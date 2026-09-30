
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

export const StorageService = {
  getTransactions: (): Transaction[] => {
    try {
      const data = localStorage.getItem(KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getCategories: (): Category[] => {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories: (categories: Category[]) => {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  },

  getSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
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
    } catch (e) {
      return { 
        theme: 'light',
        dashboardLayout: []
      } as any;
    }
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  getDebts: (): Debt[] => {
    try {
      const data = localStorage.getItem(KEYS.DEBTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveDebts: (debts: Debt[]) => {
    localStorage.setItem(KEYS.DEBTS, JSON.stringify(debts));
  },

  getAccounts: (): Account[] => {
    try {
      const data = localStorage.getItem(KEYS.ACCOUNTS);
      if (!data) {
        localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
        return DEFAULT_ACCOUNTS;
      }
      const parsed: Account[] = JSON.parse(data);
      if (!parsed || parsed.length === 0) {
        localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
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
        localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(result));
      }
      return result;
    } catch (e) {
      return DEFAULT_ACCOUNTS;
    }
  },

  saveAccounts: (accounts: Account[]) => {
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  // Storage methods for budgets
  getBudgets: (): Budget[] => {
    try {
      const data = localStorage.getItem(KEYS.BUDGETS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveBudgets: (budgets: Budget[]) => {
    localStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
  },

  // Storage methods for shows (musician life)
  getShows: (): Show[] => {
    try {
      const data = localStorage.getItem(KEYS.SHOWS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveShows: (shows: Show[]) => {
    localStorage.setItem(KEYS.SHOWS, JSON.stringify(shows));
  },
  
  clearData: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },

  createAutoBackup: () => {
    const backupData = {
      transactions: StorageService.getTransactions(),
      categories: StorageService.getCategories(),
      settings: StorageService.getSettings(),
      debts: StorageService.getDebts(),
      accounts: StorageService.getAccounts(),
      budgets: StorageService.getBudgets(),
      shows: StorageService.getShows(),
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(KEYS.AUTO_BACKUP, JSON.stringify(backupData));
      localStorage.setItem(KEYS.LAST_BACKUP_TIME, Date.now().toString());
      return true;
    } catch (e) {
      return false;
    }
  },

  getAutoBackupInfo: () => {
    const timestampStr = localStorage.getItem(KEYS.LAST_BACKUP_TIME);
    if (!timestampStr) return null;
    return {
      timestamp: parseInt(timestampStr),
      date: new Date(parseInt(timestampStr))
    };
  },

  restoreAutoBackup: () => {
    try {
      const dataStr = localStorage.getItem(KEYS.AUTO_BACKUP);
      if (!dataStr) return false;
      const data = JSON.parse(dataStr);
      if (data.transactions) StorageService.saveTransactions(data.transactions);
      if (data.categories) StorageService.saveCategories(data.categories);
      if (data.settings) StorageService.saveSettings(data.settings);
      if (data.debts) StorageService.saveDebts(data.debts);
      if (data.accounts) StorageService.saveAccounts(data.accounts);
      if (data.budgets) StorageService.saveBudgets(data.budgets);
      if (data.shows) StorageService.saveShows(data.shows);
      return true;
    } catch (e) {
      return false;
    }
  }
};