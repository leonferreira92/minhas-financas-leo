import { Transaction, Category, AppSettings, Debt, Account, Budget, Show, Venue, MusicianCrewMember, MusicLocomotionExpense, MusicCostItem } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../constants';

const KEYS = {
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
  getTransactions: (): Transaction[] => {
    try {
      const data = safeGetItem(KEYS.TRANSACTIONS);
      const parsed = data ? JSON.parse(data) : [];
      return deduplicateById<Transaction>(parsed);
    } catch {
      return [];
    }
  },

  saveTransactions: (transactions: Transaction[]) => {
    safeSetItem(KEYS.TRANSACTIONS, JSON.stringify(deduplicateById(transactions)));
  },

  getCategories: (): Category[] => {
    try {
      const data = safeGetItem(KEYS.CATEGORIES);
      const parsed = data ? JSON.parse(data) : DEFAULT_CATEGORIES;
      return deduplicateById<Category>(parsed);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories: (categories: Category[]) => {
    safeSetItem(KEYS.CATEGORIES, JSON.stringify(deduplicateById(categories)));
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
      const parsed = data ? JSON.parse(data) : [];
      return deduplicateById<Debt>(parsed);
    } catch {
      return [];
    }
  },

  saveDebts: (debts: Debt[]) => {
    safeSetItem(KEYS.DEBTS, JSON.stringify(deduplicateById(debts)));
  },

  getAccounts: (): Account[] => {
    try {
      const data = safeGetItem(KEYS.ACCOUNTS);
      if (!data) {
        safeSetItem(KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
        return DEFAULT_ACCOUNTS;
      }
      const parsed: Account[] = deduplicateById<Account>(JSON.parse(data));
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
      return deduplicateById(result);
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  },

  saveAccounts: (accounts: Account[]) => {
    safeSetItem(KEYS.ACCOUNTS, JSON.stringify(deduplicateById(accounts)));
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
    const cleanShows = deduplicateById(shows).map(s => ({
      ...s,
      payments: deduplicateById(Array.isArray(s.payments) ? s.payments : []),
      expenseItems: deduplicateById(Array.isArray(s.expenseItems) ? s.expenseItems : []),
      crewMembers: deduplicateById(Array.isArray(s.crewMembers) ? s.crewMembers : []),
      logistics: deduplicateById(Array.isArray(s.logistics) ? s.logistics : []),
      otherExpenses: deduplicateById(Array.isArray(s.otherExpenses) ? s.otherExpenses : [])
    }));
    safeSetItem(KEYS.SHOWS, JSON.stringify(cleanShows));
  },

  getVenues: (): Venue[] => {
    try {
      const data = safeGetItem(KEYS.VENUES);
      if (data) return deduplicateById<Venue>(JSON.parse(data));
      const defaultVenues: Venue[] = [
        { id: 'ven_1', name: 'Bar do Zé Pub', contactName: 'Zé Carlos', phone: '(11) 98765-4321', city: 'São Paulo - SP', address: 'Vila Madalena, 120', defaultCache: 1200, category: 'Bar / Pub', notes: 'Som próprio no local. Horário de início 21h.' },
        { id: 'ven_2', name: 'Villa Country Hall', contactName: 'Marcos Gerente', phone: '(11) 97654-3210', city: 'São Paulo - SP', address: 'Av. das Américas, 400', defaultCache: 2500, category: 'Casa de Show', notes: 'Passagem de som às 18h pontual. 2h de show.' },
        { id: 'ven_3', name: 'Espaço Jardim Festas', contactName: 'Camila Cerimonial', phone: '(11) 99123-4567', city: 'Campinas - SP', address: 'Rodovia Campinas, Km 12', defaultCache: 3500, category: 'Casamento / Privado', notes: 'Casamentos e eventos corporativos. Pontualidade rigorosa.' }
      ];
      safeSetItem(KEYS.VENUES, JSON.stringify(defaultVenues));
      return defaultVenues;
    } catch {
      return [];
    }
  },

  saveVenues: (venues: Venue[]) => {
    safeSetItem(KEYS.VENUES, JSON.stringify(deduplicateById(venues)));
  },

  getCrew: (): MusicianCrewMember[] => {
    try {
      const data = safeGetItem(KEYS.CREW);
      if (data) return deduplicateById<MusicianCrewMember>(JSON.parse(data));
      const defaultCrew: MusicianCrewMember[] = [
        { id: 'crew_1', name: 'Rodrigo Bateria', role: 'Bateria', defaultCache: 350, phone: '(11) 98111-2233', pixKey: 'rodrigo.batera@email.com', pixKeyType: 'Email', notes: 'Traz bateria e microfones próprios' },
        { id: 'crew_2', name: 'Mateus Baixo', role: 'Contrabaixo', defaultCache: 300, phone: '(11) 98222-3344', pixKey: '123.456.789-00', pixKeyType: 'CPF', notes: 'Baixo 5 cordas + In-Ear' },
        { id: 'crew_3', name: 'Lucas Sanfona & Teclado', role: 'Teclado / Sanfona', defaultCache: 400, phone: '(11) 98333-4455', pixKey: '(11) 98333-4455', pixKeyType: 'Telefone', notes: 'Nord Stage + Acordeon 120 baixos' },
        { id: 'crew_4', name: 'Danilo Som & Roadie', role: 'Técnico de Som & Roadie', defaultCache: 250, phone: '(11) 98444-5566', pixKey: 'danilo.audio@pix.me', pixKeyType: 'Aleatória', notes: 'Mesa digital Behringer X32' }
      ];
      safeSetItem(KEYS.CREW, JSON.stringify(defaultCrew));
      return defaultCrew;
    } catch {
      return [];
    }
  },

  saveCrew: (crew: MusicianCrewMember[]) => {
    safeSetItem(KEYS.CREW, JSON.stringify(deduplicateById(crew)));
  },

  getLocomotionExpenses: (): MusicLocomotionExpense[] => {
    try {
      const data = safeGetItem(KEYS.LOCOMOTION);
      return data ? deduplicateById<MusicLocomotionExpense>(JSON.parse(data)) : [];
    } catch {
      return [];
    }
  },

  saveLocomotionExpenses: (expenses: MusicLocomotionExpense[]) => {
    safeSetItem(KEYS.LOCOMOTION, JSON.stringify(deduplicateById(expenses)));
  },

  getMusicCostItems: (): MusicCostItem[] => {
    try {
      const data = safeGetItem(KEYS.MUSIC_COSTS);
      return data ? deduplicateById<MusicCostItem>(JSON.parse(data)) : [];
    } catch {
      return [];
    }
  },

  saveMusicCostItems: (items: MusicCostItem[]) => {
    safeSetItem(KEYS.MUSIC_COSTS, JSON.stringify(deduplicateById(items)));
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
