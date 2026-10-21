import { Transaction, Category, AppSettings, Debt, Account, Budget, Show, Venue, MusicianCrewMember, MusicLocomotionExpense, MusicCostItem } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../constants';

const BASE_KEYS = {
  TRANSACTIONS: 'fin_app_transactions',
  CATEGORIES: 'fin_app_categories',
  SETTINGS: 'fin_app_settings',
  DEBTS: 'fin_app_debts',
  ACCOUNTS: 'fin_app_accounts',
  BUDGETS: 'fin_app_budgets',
  SHOWS: 'fin_app_shows',
  VENUES: 'fin_app_venues',
  CREW: 'fin_app_crew',
  LOCOMOTION: 'fin_app_locomotion',
  MUSIC_COSTS: 'fin_app_music_costs',
  AUTO_BACKUP: 'fin_app_auto_backup',
  LAST_BACKUP_TIME: 'fin_app_last_backup_time'
};

let currentUserId: string | null = null;
let isDemoModeActive: boolean = false;

const getKey = (baseKey: string): string => {
  if (currentUserId) {
    return `${baseKey}_${currentUserId}`;
  }
  return baseKey;
};

const safeSetItem = (key: string, value: string): boolean => {
  if (isDemoModeActive) {
    // No modo demonstração, NUNCA grava nada em armazenamento persistente
    return true;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[StorageService] Falha ao salvar chave '${key}' no localStorage (Possível limite excedido):`, error);
    return false;
  }
};

const safeGetItem = (key: string): string | null => {
  if (isDemoModeActive) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`[StorageService] Falha ao ler chave '${key}' do localStorage:`, error);
    return null;
  }
};

function deduplicateById<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

export const StorageService = {
  setActiveUser: (uid: string | null, isLeo = false) => {
    currentUserId = uid;
    // Se for o Leo e as chaves específicas dele ainda não existirem, migra uma única vez
    if (uid && isLeo) {
      try {
        const userTxKey = getKey(BASE_KEYS.TRANSACTIONS);
        if (!localStorage.getItem(userTxKey)) {
          Object.values(BASE_KEYS).forEach(baseK => {
            const legacyVal = localStorage.getItem(baseK);
            if (legacyVal) {
              localStorage.setItem(`${baseK}_${uid}`, legacyVal);
            }
          });
        }
      } catch (e) {
        console.warn('Erro ao migrar dados legados para o usuário Leo:', e);
      }
    }
  },

  getActiveUser: () => currentUserId,

  setDemoMode: (isDemo: boolean) => {
    isDemoModeActive = isDemo;
  },

  isDemo: () => isDemoModeActive,

  getTransactions: (): Transaction[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.TRANSACTIONS));
      const parsed = data ? JSON.parse(data) : [];
      return deduplicateById<Transaction>(parsed);
    } catch {
      return [];
    }
  },

  saveTransactions: (transactions: Transaction[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.TRANSACTIONS), JSON.stringify(deduplicateById(transactions)));
  },

  getCategories: (): Category[] => {
    if (isDemoModeActive) return DEFAULT_CATEGORIES;
    try {
      const data = safeGetItem(getKey(BASE_KEYS.CATEGORIES));
      const parsed = data ? JSON.parse(data) : DEFAULT_CATEGORIES;
      return deduplicateById<Category>(parsed);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories: (categories: Category[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.CATEGORIES), JSON.stringify(deduplicateById(categories)));
  },

  getSettings: (): AppSettings => {
    if (isDemoModeActive) {
      return { 
        theme: 'dark',
        dashboardLayout: [
          { id: 'balance', visible: true, label: 'Patrimônio' },
          { id: 'shortcuts', visible: true, label: 'Ações Rápidas' },
          { id: 'status', visible: true, label: 'Fluxo Mensal' },
          { id: 'debts', visible: true, label: 'Dívidas' },
          { id: 'recent', visible: true, label: 'Recentes' }
        ]
      } as any;
    }
    try {
      const data = safeGetItem(getKey(BASE_KEYS.SETTINGS));
      return data ? JSON.parse(data) : { 
        theme: 'dark',
        dashboardLayout: [
          { id: 'balance', visible: true, label: 'Patrimônio' },
          { id: 'shortcuts', visible: true, label: 'Ações Rápidas' },
          { id: 'status', visible: true, label: 'Fluxo Mensal' },
          { id: 'debts', visible: true, label: 'Dívidas' },
          { id: 'recent', visible: true, label: 'Recentes' }
        ]
      } as any;
    } catch {
      return { 
        theme: 'dark',
        dashboardLayout: []
      } as any;
    }
  },

  saveSettings: (settings: AppSettings) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.SETTINGS), JSON.stringify(settings));
  },

  getDebts: (): Debt[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.DEBTS));
      const parsed = data ? JSON.parse(data) : [];
      return deduplicateById<Debt>(parsed);
    } catch {
      return [];
    }
  },

  saveDebts: (debts: Debt[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.DEBTS), JSON.stringify(deduplicateById(debts)));
  },

  getAccounts: (): Account[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.ACCOUNTS));
      if (!data) {
        return [];
      }
      const parsed: Account[] = deduplicateById<Account>(JSON.parse(data));
      if (!parsed || parsed.length === 0) {
        return [];
      }
      return deduplicateById(parsed);
    } catch {
      return [];
    }
  },

  saveAccounts: (accounts: Account[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.ACCOUNTS), JSON.stringify(deduplicateById(accounts)));
  },

  getBudgets: (): Budget[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.BUDGETS));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveBudgets: (budgets: Budget[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.BUDGETS), JSON.stringify(budgets));
  },

  getShows: (): Show[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.SHOWS));
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      const mapped = parsed.map((s: any, idx: number) => {
        const id = s.id || `show_${Date.now()}_${idx}`;
        let dateStr = s.date || s.eventDate || s.data || '';
        if (!dateStr || typeof dateStr !== 'string') {
          dateStr = s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        } else if (dateStr.includes('T')) {
          dateStr = dateStr.split('T')[0];
        }
        const cacheVal = Number(s.totalCache ?? s.cache ?? s.price ?? s.cacheCombined ?? s.amount ?? 0) || 0;
        const costsVal = Number(s.costs ?? s.totalCosts ?? 0) || 0;
        const contractor = (s.contractorName || s.name || s.title || 'Apresentação').trim();
        const showName = (s.name || s.title || contractor).trim();

        return {
          ...s,
          id,
          name: showName,
          contractorName: contractor,
          date: dateStr,
          time: s.time || '20:00',
          location: s.location || s.venue || '',
          city: s.city || '',
          totalCache: cacheVal,
          cacheCombined: cacheVal,
          cache: cacheVal,
          price: cacheVal,
          costs: costsVal,
          extraAmount: Number(s.extraAmount) || 0,
          status: s.status || 'Confirmado',
          payments: deduplicateById(Array.isArray(s.payments) ? s.payments : []),
          expenseItems: deduplicateById(Array.isArray(s.expenseItems) ? s.expenseItems : []),
          crewMembers: deduplicateById(Array.isArray(s.crewMembers) ? s.crewMembers : []),
          logistics: deduplicateById(Array.isArray(s.logistics) ? s.logistics : []),
          otherExpenses: deduplicateById(Array.isArray(s.otherExpenses) ? s.otherExpenses : []),
          receipts: deduplicateById(Array.isArray(s.receipts) ? s.receipts : []),
          createdAt: Number(s.createdAt) || Date.now(),
          scope: s.scope || 'BUSINESS'
        } as Show;
      });
      return deduplicateById<Show>(mapped);
    } catch {
      return [];
    }
  },

  saveShows: (shows: Show[]) => {
    if (isDemoModeActive) return;
    const cleanShows = deduplicateById(shows).map(s => ({
      ...s,
      payments: deduplicateById(Array.isArray(s.payments) ? s.payments : []),
      expenseItems: deduplicateById(Array.isArray(s.expenseItems) ? s.expenseItems : []),
      crewMembers: deduplicateById(Array.isArray(s.crewMembers) ? s.crewMembers : []),
      logistics: deduplicateById(Array.isArray(s.logistics) ? s.logistics : []),
      otherExpenses: deduplicateById(Array.isArray(s.otherExpenses) ? s.otherExpenses : [])
    }));
    safeSetItem(getKey(BASE_KEYS.SHOWS), JSON.stringify(cleanShows));
  },

  getVenues: (): Venue[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.VENUES));
      if (data) return deduplicateById<Venue>(JSON.parse(data));
      return [];
    } catch {
      return [];
    }
  },

  saveVenues: (venues: Venue[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.VENUES), JSON.stringify(deduplicateById(venues)));
  },

  getCrew: (): MusicianCrewMember[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.CREW));
      if (data) return deduplicateById<MusicianCrewMember>(JSON.parse(data));
      return [];
    } catch {
      return [];
    }
  },

  saveCrew: (crew: MusicianCrewMember[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.CREW), JSON.stringify(deduplicateById(crew)));
  },

  getLocomotionExpenses: (): MusicLocomotionExpense[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.LOCOMOTION));
      return data ? deduplicateById<MusicLocomotionExpense>(JSON.parse(data)) : [];
    } catch {
      return [];
    }
  },

  saveLocomotionExpenses: (expenses: MusicLocomotionExpense[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.LOCOMOTION), JSON.stringify(deduplicateById(expenses)));
  },

  getMusicCostItems: (): MusicCostItem[] => {
    if (isDemoModeActive) return [];
    try {
      const data = safeGetItem(getKey(BASE_KEYS.MUSIC_COSTS));
      return data ? deduplicateById<MusicCostItem>(JSON.parse(data)) : [];
    } catch {
      return [];
    }
  },

  saveMusicCostItems: (items: MusicCostItem[]) => {
    if (isDemoModeActive) return;
    safeSetItem(getKey(BASE_KEYS.MUSIC_COSTS), JSON.stringify(deduplicateById(items)));
  },
  
  clearData: () => {
    try {
      Object.values(BASE_KEYS).forEach(k => {
        localStorage.removeItem(k);
        if (currentUserId) {
          localStorage.removeItem(`${k}_${currentUserId}`);
        }
      });
    } catch (e) {
      console.warn('[StorageService] Falha ao limpar dados:', e);
    }
  },

  clearCurrentUserData: (userId: string) => {
    try {
      Object.values(BASE_KEYS).forEach(k => {
        localStorage.removeItem(`${k}_${userId}`);
      });
    } catch (e) {
      console.warn('[StorageService] Falha ao limpar dados do usuário:', e);
    }
  },

  createAutoBackup: () => {
    if (isDemoModeActive) return false;
    try {
      localStorage.removeItem(getKey(BASE_KEYS.AUTO_BACKUP));
      safeSetItem(getKey(BASE_KEYS.LAST_BACKUP_TIME), Date.now().toString());
      return true;
    } catch {
      return false;
    }
  },

  getAutoBackupInfo: () => {
    if (isDemoModeActive) return null;
    try {
      const timestampStr = safeGetItem(getKey(BASE_KEYS.LAST_BACKUP_TIME));
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
    if (isDemoModeActive) return false;
    try {
      const dataStr = safeGetItem(getKey(BASE_KEYS.AUTO_BACKUP));
      if (!dataStr) return true;
      const data = JSON.parse(dataStr);
      if (data.transactions) StorageService.saveTransactions(data.transactions);
      if (data.categories) StorageService.saveCategories(data.categories);
      if (data.settings) StorageService.saveSettings(data.settings);
      if (data.debts) StorageService.saveDebts(data.debts);
      if (data.accounts) StorageService.saveAccounts(data.accounts);
      if (data.budgets) StorageService.saveBudgets(data.budgets);
      if (data.shows) StorageService.saveShows(data.shows);
      localStorage.removeItem(getKey(BASE_KEYS.AUTO_BACKUP));
      return true;
    } catch {
      return false;
    }
  }
};
