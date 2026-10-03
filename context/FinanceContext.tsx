
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Transaction, Category, BalanceSummary, AppSettings, Debt, DebtStatus, SystemAlert, Account, TransactionType, Budget, DashboardWidgetConfig, Show, ShowPayment, FinancialSettings, ActiveScopeFilter, ScopeType, matchesScope, Venue, MusicianCrewMember, MusicLocomotionExpense, MusicCostItem } from '../types';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { APP_THEMES, DEFAULT_CATEGORIES, DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import { normalizeShowFinancials, syncShowWithTransactions, cancelShowFutureTransactions } from '../services/showFinanceSyncService';
import { generateUUID } from '../services/uuidHelper';
import { getLocalDateString, getCurrentMonthPrefix } from '../services/dateUtils';
import { User } from 'firebase/auth';
import { 
  subscribeToAuth, 
  signInWithGoogle, 
  logoutUser, 
  subscribeToUserAccounts, 
  subscribeToUserTransactions, 
  subscribeToUserShows,
  subscribeToUserDebts,
  subscribeToUserCategories,
  subscribeToUserBudgets,
  subscribeToUserSettings,
  saveAccountToFirestore,
  deleteAccountFromFirestore,
  saveTransactionToFirestore,
  deleteTransactionFromFirestore,
  saveShowToFirestore,
  deleteShowFromFirestore,
  saveDebtToFirestore,
  deleteDebtFromFirestore,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  saveBudgetToFirestore,
  deleteBudgetFromFirestore,
  saveSettingsToFirestore,
  syncLocalDataToFirestore,
  testFirestoreConnection,
  checkUserInitialized
} from '../services/firebaseService';

interface ExtendedSummary extends BalanceSummary {
  dailyBurnRate: number;
  safetyMargin: number;
  savingsRate: number;
  comparisonToLastMonth: number; // Porcentagem
  freeToSpend: number;
}

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  accounts: Account[];
  budgets: Budget[];
  shows: Show[];
  venues: Venue[];
  crew: MusicianCrewMember[];
  locomotionExpenses: MusicLocomotionExpense[];
  musicCostItems: MusicCostItem[];
  settings: AppSettings;
  isBlurred: boolean;
  toggleBlur: () => void;
  activeScope: ActiveScopeFilter;
  setActiveScope: (scope: ActiveScopeFilter) => void;
  
  // Methods
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => void;
  importTransactions: (newTxs: Array<Omit<Transaction, 'id' | 'createdAt'> & { id?: string }>) => void;
  updateTransaction: (t: Transaction) => void;
  updateTransactionSeries: (t: Transaction, updateFuture: boolean) => void;
  updateDebtTransaction: (t: Transaction, redistribute: boolean) => void;
  recalculateDebtSeries: (transactionId: string, newAmount: number) => void;
  deleteTransaction: (id: string, deleteSeries?: boolean) => void;
  checkTransactionImpact: (amount: number, date: string) => { compromisedTransaction: Transaction } | null;
  
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  
  addAccount: (a: Omit<Account, 'id'>) => void;
  updateAccount: (a: Account) => void;
  deleteAccount: (id: string) => void;
  reconcileBalance: (accountId: string, realBalance: number) => void;
  getAccountBalance: (accountId: string) => number;
  getDefaultAccountForScope: (scope?: ScopeType | ActiveScopeFilter) => string;
  
  addDebt: (debtData: Omit<Debt, 'id'>, installmentsData: any) => void;
  updateDebt: (id: string, name: string, installmentCount: number) => void;
  deleteDebt: (id: string) => void;
  getDebtProgress: (debtId: string) => { paid: number; remaining: number; status: DebtStatus; progress: number; totalReal: number };

  saveBudget: (b: Budget) => void;
  deleteBudget: (categoryId: string) => void;

  addShow: (s: Omit<Show, 'id' | 'createdAt'> & { id?: string }) => void;
  updateShow: (s: Show) => void;
  deleteShow: (id: string, deleteTransactions?: boolean) => void;
  cancelShowFutureFinancials: (showId: string) => void;

  // Career Sou Artista CRUD
  addVenue: (v: Omit<Venue, 'id' | 'createdAt'> & { id?: string }) => void;
  updateVenue: (v: Venue) => void;
  deleteVenue: (id: string) => void;

  addCrewMember: (m: Omit<MusicianCrewMember, 'id' | 'createdAt'> & { id?: string }) => void;
  updateCrewMember: (m: MusicianCrewMember) => void;
  deleteCrewMember: (id: string) => void;

  addLocomotionExpense: (l: Omit<MusicLocomotionExpense, 'id' | 'createdAt'> & { id?: string }, createTransaction?: boolean) => void;
  updateLocomotionExpense: (l: MusicLocomotionExpense) => void;
  deleteLocomotionExpense: (id: string, deleteTransaction?: boolean) => void;

  addMusicCostItem: (c: Omit<MusicCostItem, 'id' | 'createdAt'> & { id?: string }, createTransaction?: boolean) => void;
  updateMusicCostItem: (c: MusicCostItem) => void;
  deleteMusicCostItem: (id: string, deleteTransaction?: boolean) => void;

  getSystemAlerts: () => SystemAlert[];
  updateSettings: (s: Partial<AppSettings>) => void;
  updateFinancialSettings: (fs: Partial<FinancialSettings>) => void;
  getBalanceSummary: (month: string, projectionDate: string) => ExtendedSummary;
  refreshData: () => void;
  restoreAutoBackup: () => boolean;
  getBackupInfo: () => { timestamp: number; date: Date } | null;
  requestNotificationPermission: () => Promise<boolean>;

  // Firebase Auth & Cloud Sync
  currentUser: User | null;
  isAuthLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetConfig[] = [
  { id: 'balance', visible: true, label: 'Saldo e Resumo' },
  { id: 'radar', visible: true, label: 'Radar de Disponibilidade' },
  { id: 'shortcuts', visible: true, label: 'Atalhos Rápidos' },
  { id: 'status', visible: true, label: 'Status Mensal' },
  { id: 'recent', visible: true, label: 'Atividade Recente' },
  { id: 'debts', visible: false, label: 'Resumo de Dívidas' }
];

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [crew, setCrew] = useState<MusicianCrewMember[]>([]);
  const [locomotionExpenses, setLocomotionExpenses] = useState<MusicLocomotionExpense[]>([]);
  const [musicCostItems, setMusicCostItems] = useState<MusicCostItem[]>([]);

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        testFirestoreConnection();
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const uid = currentUser.uid;

    // Sincronização inicial inteligente: Se o usuário ainda não tiver sido inicializado no Firestore,
    // envia os dados locais existentes (localStorage) para a nuvem
    checkUserInitialized(uid).then((isInit) => {
      if (!isInit) {
        const localAccounts = StorageService.getAccounts();
        const localTransactions = StorageService.getTransactions();
        const localShows = StorageService.getShows();
        const localDebts = StorageService.getDebts();
        const localCategories = StorageService.getCategories();
        const localBudgets = StorageService.getBudgets();
        const localSettings = StorageService.getSettings();

        syncLocalDataToFirestore(uid, {
          accounts: localAccounts,
          transactions: localTransactions,
          shows: localShows,
          debts: localDebts,
          categories: localCategories,
          budgets: localBudgets,
          settings: localSettings
        });
      }
    });

    // 1. Escutador em tempo real: Contas Bancárias
    const unsubAccounts = subscribeToUserAccounts(uid, (cloudAccounts) => {
      setAccounts(cloudAccounts);
      StorageService.saveAccounts(cloudAccounts);
    });

    // 2. Escutador em tempo real: Transações / Lançamentos
    const unsubTransactions = subscribeToUserTransactions(uid, (cloudTxs) => {
      setTransactions(cloudTxs);
      StorageService.saveTransactions(cloudTxs);
    });

    // 3. Escutador em tempo real: Shows / Apresentações
    const unsubShows = subscribeToUserShows(uid, (cloudShows) => {
      setShows(cloudShows);
      StorageService.saveShows(cloudShows);
    });

    // 4. Escutador em tempo real: Dívidas / Parcelamentos
    const unsubDebts = subscribeToUserDebts(uid, (cloudDebts) => {
      setDebts(cloudDebts);
      StorageService.saveDebts(cloudDebts);
    });

    // 5. Escutador em tempo real: Categorias Customizadas
    const unsubCategories = subscribeToUserCategories(uid, (cloudCategories) => {
      if (cloudCategories && cloudCategories.length > 0) {
        setCategories(cloudCategories);
        StorageService.saveCategories(cloudCategories);
      }
    });

    // 6. Escutador em tempo real: Orçamentos (Budgets)
    const unsubBudgets = subscribeToUserBudgets(uid, (cloudBudgets) => {
      setBudgets(cloudBudgets);
      StorageService.saveBudgets(cloudBudgets);
    });

    // 7. Escutador em tempo real: Configurações do Usuário
    const unsubSettings = subscribeToUserSettings(uid, (cloudSettings) => {
      if (cloudSettings && Object.keys(cloudSettings).length > 0) {
        setSettings(prev => {
          const merged = { ...prev, ...cloudSettings };
          StorageService.saveSettings(merged);
          return merged;
        });
      }
    });

    return () => {
      unsubAccounts && unsubAccounts();
      unsubTransactions && unsubTransactions();
      unsubShows && unsubShows();
      unsubDebts && unsubDebts();
      unsubCategories && unsubCategories();
      unsubBudgets && unsubBudgets();
      unsubSettings && unsubSettings();
    };
  }, [currentUser]);
  const [settings, setSettings] = useState<AppSettings>({ 
    theme: 'light', 
    primaryColor: 'lime', 
    userName: 'Leo Ferreira',
    careerProjectName: 'Leo Ferreira',
    notificationInterval: 12,
    dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
    financialSettings: DEFAULT_FINANCIAL_SETTINGS
  } as AppSettings);
  const [isBlurred, setIsBlurred] = useState(() => {
    return localStorage.getItem('isBlurred') === 'true';
  });

  const [activeScope, setActiveScopeState] = useState<ActiveScopeFilter>(() => {
    const saved = localStorage.getItem('fin_app_scope');
    return (saved === 'PERSONAL' || saved === 'BUSINESS') ? saved : 'PERSONAL';
  });

  const setActiveScope = (scope: ActiveScopeFilter) => {
    setActiveScopeState(scope);
    localStorage.setItem('fin_app_scope', scope);
  };

  const getDefaultAccountForScope = useCallback((scope?: ScopeType | ActiveScopeFilter): string => {
    const targetScope = scope || activeScope;
    if (targetScope === 'BUSINESS') {
      if (settings.businessDefaultAccountId && accounts.some(a => a.id === settings.businessDefaultAccountId)) {
        return settings.businessDefaultAccountId;
      }
      const bizAcc = accounts.find(a => 
        a.scope === 'BUSINESS' || 
        a.vinculo === 'MUSICO' || 
        a.name.toLowerCase().includes('mercado') || 
        a.name.toLowerCase().includes('pj') ||
        a.name.toLowerCase().includes('show')
      );
      if (bizAcc) return bizAcc.id;
    } else {
      if (settings.personalDefaultAccountId && accounts.some(a => a.id === settings.personalDefaultAccountId)) {
        return settings.personalDefaultAccountId;
      }
      const persAcc = accounts.find(a => 
        a.scope === 'PERSONAL' || 
        a.vinculo === 'PESSOAL' || 
        a.name.toLowerCase().includes('brasil') || 
        a.name.toLowerCase().includes('corrente') ||
        a.name.toLowerCase().includes('bb')
      );
      if (persAcc) return persAcc.id;
    }
    return accounts.length > 0 ? accounts[0].id : 'acc_bb';
  }, [accounts, activeScope, settings]);

  const toggleBlur = () => {
    setIsBlurred(prev => {
      const newValue = !prev;
      localStorage.setItem('isBlurred', String(newValue));
      return newValue;
    });
  };

  const syncShowsWithTransactions = useCallback((currentTransactions: Transaction[], currentShows: Show[]) => {
    let showsChanged = false;

    // Sincroniza pagamentos vinculados com transações existentes sem NUNCA criar shows automáticos
    const updatedShows = currentShows.map(show => {
      let showReceiptsChanged = false;
      const updatedPayments = show.payments ? show.payments.map(p => {
        if (p.transactionId) {
          const correspondingTx = currentTransactions.find(tx => tx.id === p.transactionId);
          if (correspondingTx) {
            const txStatusMapped = correspondingTx.status === 'paid' ? 'Recebido' : 'Agendado';
            if (
              p.amount !== correspondingTx.amount ||
              p.expectedDate !== correspondingTx.date ||
              p.accountId !== correspondingTx.accountId ||
              p.status !== txStatusMapped
            ) {
              showReceiptsChanged = true;
              return {
                ...p,
                amount: correspondingTx.amount,
                expectedDate: correspondingTx.date,
                effectiveDate: correspondingTx.status === 'paid' ? correspondingTx.date : undefined,
                accountId: correspondingTx.accountId,
                status: txStatusMapped as any
              };
            }
          }
        }
        return p;
      }) : [];

      if (showReceiptsChanged) {
        showsChanged = true;
        return {
          ...show,
          payments: updatedPayments
        };
      }
      return show;
    });

    if (showsChanged) {
      setShows(updatedShows);
      StorageService.saveShows(updatedShows);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    // Pure Dark Spotify / Fintech theme permanent enforcement
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const colorKey = settings.primaryColor || 'lime';
    const palette = APP_THEMES[colorKey] || APP_THEMES['lime'];
    const root = document.documentElement;
    Object.keys(palette).forEach(shade => {
      root.style.setProperty(`--color-primary-${shade}`, palette[shade]);
    });
  }, [settings.primaryColor]);

  const refreshData = () => {
    let storedTransactions = StorageService.getTransactions();
    let storedCategories = StorageService.getCategories();
    const storedDebts = StorageService.getDebts();
    const storedAccounts = StorageService.getAccounts();
    const storedBudgets = StorageService.getBudgets();
    const storedSettings = StorageService.getSettings();

    // =========================================================================
    // DIRETRIZ: UNIFICAÇÃO AUTOMÁTICA DE CATEGORIAS DUPLICADAS (MIGRATION)
    // Fusão de "Cachê / Shows", "Cachês / Shows" e "Cachês Música Ao Vivo" em uma única: "Shows / Cachês" (cat_33)
    // =========================================================================
    const isDuplicateCacheCat = (name: string, id: string) => {
      if (id === 'cat_33') return false;
      const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return n.includes('cache') || n === 'shows' || n.includes('show /') || n.includes('shows /') || n.includes('/ show') || n.includes('/ cache');
    };

    const duplicateCatIds = new Set(
      storedCategories
        .filter(c => isDuplicateCacheCat(c.name, c.id))
        .map(c => c.id)
    );

    // Garantir que a categoria principal cat_33 (Shows / Cachês) exista de forma limpa
    let cat33 = storedCategories.find(c => c.id === 'cat_33');
    if (!cat33) {
      cat33 = {
        id: 'cat_33',
        name: 'Shows / Cachês',
        type: 'income',
        color: '#8b5cf6',
        icon: 'Music',
        classification: 'professional',
        scope: 'BUSINESS'
      };
      storedCategories.push(cat33);
    } else {
      cat33.name = 'Shows / Cachês';
      cat33.scope = 'BUSINESS';
      cat33.type = 'income';
    }

    // Garantir categoria "Equipamentos" para saídas do módulo de Música
    let catEquip = storedCategories.find(c => c.id === 'cat_equipamentos' || c.name.toLowerCase() === 'equipamentos');
    if (!catEquip) {
      catEquip = {
        id: 'cat_equipamentos',
        name: 'Equipamentos',
        type: 'expense',
        color: '#8b5cf6',
        icon: 'Hammer',
        classification: 'professional',
        scope: 'BUSINESS'
      };
      storedCategories.push(catEquip);
    } else {
      catEquip.id = 'cat_equipamentos';
      catEquip.name = 'Equipamentos';
      catEquip.scope = 'BUSINESS';
      catEquip.type = 'expense';
    }

    // Remover categorias duplicadas
    let finalCategories = storedCategories.filter(c => !duplicateCatIds.has(c.id));

    // Garantir defaults que faltem
    const existingNames = new Set(finalCategories.map(c => c.name.toLowerCase()));
    const missingDefaults = DEFAULT_CATEGORIES.filter(d => !existingNames.has(d.name.toLowerCase()) && !isDuplicateCacheCat(d.name, d.id));
    if (missingDefaults.length > 0) {
      const toAdd = missingDefaults.map(cat => ({
        ...cat,
        id: finalCategories.some(sc => sc.id === cat.id) ? generateUUID() : cat.id
      }));
      finalCategories = [...finalCategories, ...toAdd];
    }
    StorageService.saveCategories(finalCategories);

    // Migração das transações (preservando rigorosamente datas, valores e vínculos)
    let transactionsChanged = false;
    const migratedTransactions = storedTransactions.map(t => {
      let modified = false;
      let newCatId = t.categoryId;
      let newScope = t.scope;
      const descLower = (t.description || '').toLowerCase();

      // Transações com categoria duplicada ou cachê -> apontar para cat_33
      if (duplicateCatIds.has(t.categoryId) || t.categoryId === 'cat_33' || (descLower.includes('cachê') || descLower.includes('cache'))) {
        if (t.type === 'income') {
          if (newCatId !== 'cat_33') {
            newCatId = 'cat_33';
            modified = true;
          }
          if (newScope !== 'BUSINESS') {
            newScope = 'BUSINESS';
            modified = true;
          }
        }
      }

      // Transações de Equipamentos -> registrar como Saída da Empresa (Módulo Música)
      if (t.categoryId === 'cat_equipamentos' || descLower.includes('equipamento') || descLower.includes('pedal') || descLower.includes('amplificador') || descLower.includes('instrumento')) {
        if (t.type === 'expense') {
          if (newCatId !== 'cat_equipamentos' && !finalCategories.some(c => c.id === newCatId && c.scope === 'BUSINESS')) {
            newCatId = 'cat_equipamentos';
            modified = true;
          }
          if (newScope !== 'BUSINESS') {
            newScope = 'BUSINESS';
            modified = true;
          }
        }
      }

      // Remover 'BOTH' do escopo (obrigatoriamente PERSONAL ou BUSINESS)
      if (!newScope || newScope === 'BOTH') {
        const isBiz = newCatId === 'cat_33' || newCatId === 'cat_equipamentos' || !!t.showId || !!t.showExpenseId || descLower.includes('show') || descLower.includes('músico') || descLower.includes('musico');
        newScope = isBiz ? 'BUSINESS' : 'PERSONAL';
        modified = true;
      }

      if (modified) {
        transactionsChanged = true;
        return {
          ...t,
          categoryId: newCatId,
          scope: newScope,
          amount: Number(t.amount) || 0
        };
      }
      return {
        ...t,
        amount: Number(t.amount) || 0
      };
    });

    if (transactionsChanged) {
      storedTransactions = migratedTransactions;
      StorageService.saveTransactions(migratedTransactions);
    }

    setTransactions(storedTransactions);
    setCategories(finalCategories);
    setDebts(storedDebts);
    setAccounts(storedAccounts);
    setBudgets(storedBudgets);
    const storedShows = StorageService.getShows();

    setTransactions(storedTransactions);
    setShows(storedShows);
    setVenues(StorageService.getVenues());
    setCrew(StorageService.getCrew());
    setLocomotionExpenses(StorageService.getLocomotionExpenses());
    setMusicCostItems(StorageService.getMusicCostItems());
    
    const finalFinancialSettings: FinancialSettings = storedSettings.financialSettings ? {
      ...DEFAULT_FINANCIAL_SETTINGS,
      ...storedSettings.financialSettings
    } : {
      ...DEFAULT_FINANCIAL_SETTINGS,
      essentialCategoryIds: finalCategories.filter(c => c.classification === 'essential').map(c => c.id).length > 0 
        ? finalCategories.filter(c => c.classification === 'essential').map(c => c.id)
        : DEFAULT_FINANCIAL_SETTINGS.essentialCategoryIds,
      lifestyleCategoryIds: finalCategories.filter(c => c.classification === 'personal' || c.classification === 'discretionary').map(c => c.id).length > 0
        ? finalCategories.filter(c => c.classification === 'personal' || c.classification === 'discretionary').map(c => c.id)
        : DEFAULT_FINANCIAL_SETTINGS.lifestyleCategoryIds,
      professionalCategoryIds: finalCategories.filter(c => c.classification === 'professional').map(c => c.id).length > 0
        ? finalCategories.filter(c => c.classification === 'professional').map(c => c.id)
        : DEFAULT_FINANCIAL_SETTINGS.professionalCategoryIds
    };

    const mergedSettings = {
      ...storedSettings,
      dashboardLayout: storedSettings.dashboardLayout || DEFAULT_DASHBOARD_LAYOUT,
      financialSettings: finalFinancialSettings
    };
    setSettings(mergedSettings);
  };

  const saveTransactions = (ts: Transaction[]) => { 
    setTransactions(ts); 
    StorageService.saveTransactions(ts); 
  };
  const saveCategories = (cs: Category[]) => { 
    setCategories(cs); 
    StorageService.saveCategories(cs); 
  };
  const saveDebts = (ds: Debt[]) => { 
    setDebts(ds); 
    StorageService.saveDebts(ds); 
  };
  const saveAccounts = (as: Account[]) => { 
    setAccounts(as); 
    StorageService.saveAccounts(as); 
  };
  const saveBudgetsInternal = (bs: Budget[]) => { 
    setBudgets(bs); 
    StorageService.saveBudgets(bs); 
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
    if (currentUser) {
      saveSettingsToFirestore(currentUser.uid, updated);
    }
  };

  const updateFinancialSettings = (fs: Partial<FinancialSettings>) => {
    const currentFs = settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
    const updatedFs: FinancialSettings = {
      ...currentFs,
      ...fs
    };
    const updatedSettings: AppSettings = {
      ...settings,
      financialSettings: updatedFs
    };
    setSettings(updatedSettings);
    StorageService.saveSettings(updatedSettings);
    if (currentUser) {
      saveSettingsToFirestore(currentUser.uid, updatedSettings);
    }

    if (fs.essentialCategoryIds || fs.lifestyleCategoryIds || fs.professionalCategoryIds) {
      const ess = new Set(updatedFs.essentialCategoryIds);
      const life = new Set(updatedFs.lifestyleCategoryIds);
      const prof = new Set(updatedFs.professionalCategoryIds);

      const updatedCategories = categories.map(cat => {
        if (ess.has(cat.id)) return { ...cat, classification: 'essential' as const };
        if (life.has(cat.id)) return { ...cat, classification: 'personal' as const };
        if (prof.has(cat.id)) return { ...cat, classification: 'professional' as const };
        return cat;
      });
      setCategories(updatedCategories);
      StorageService.saveCategories(updatedCategories);
      if (currentUser) {
        updatedCategories.forEach(c => saveCategoryToFirestore(currentUser.uid, c));
      }
    }
  };

  const addAccount = (a: Omit<Account, 'id'>) => {
    const vinculo = a.vinculo || (a.scope === 'BUSINESS' ? 'MUSICO' : a.scope === 'PERSONAL' ? 'PESSOAL' : 'NEUTRO');
    const scope = a.scope || (vinculo === 'MUSICO' ? 'BUSINESS' : vinculo === 'PESSOAL' ? 'PERSONAL' : 'BOTH');
    const newAccount: Account = { ...a, vinculo, scope, id: generateUUID() };
    saveAccounts([...accounts, newAccount]);
    if (currentUser) {
      saveAccountToFirestore(currentUser.uid, newAccount);
    }
  };

  const updateAccount = (a: Account) => {
    const vinculo = a.vinculo || (a.scope === 'BUSINESS' ? 'MUSICO' : a.scope === 'PERSONAL' ? 'PESSOAL' : 'NEUTRO');
    const scope = a.scope || (vinculo === 'MUSICO' ? 'BUSINESS' : vinculo === 'PESSOAL' ? 'PERSONAL' : 'BOTH');
    const updatedAccount = { ...a, vinculo, scope };
    saveAccounts(accounts.map(acc => acc.id === a.id ? updatedAccount : acc));
    if (currentUser) {
      saveAccountToFirestore(currentUser.uid, updatedAccount);
    }
  };
  const deleteAccount = (id: string) => {
    saveAccounts(accounts.filter(a => a.id !== id));
    if (currentUser) {
      deleteAccountFromFirestore(currentUser.uid, id);
    }
  };

  const getAccountBalance = (accountId: string): number => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;
    let balance = Number(account.initialBalance || 0);
    transactions.forEach(t => {
      if (t.status === 'pending') return;
      if (t.accountId === accountId) {
        if (t.type === 'income' || (t.type === 'goal_withdraw' && account.type !== 'savings' && accountId !== 'acc_savings')) {
          balance += Number(t.amount);
        } else if (t.type === 'expense' || t.type === 'goal_deposit' || t.type === 'transfer' || (t.type === 'goal_withdraw' && (account.type === 'savings' || accountId === 'acc_savings'))) {
          balance -= Number(t.amount);
        } else if (t.type === 'adjustment') {
          balance += Number(t.amount);
        }
      }
      if (t.type === 'transfer' && t.destinationAccountId === accountId) {
        balance += Number(t.amount);
      }
      if (t.type === 'goal_deposit' && (account.type === 'savings' || accountId === 'acc_savings') && t.accountId !== accountId) {
        balance += Number(t.amount);
      }
    });
    return parseFloat(balance.toFixed(2));
  };

  const reconcileBalance = (accountId: string, realBalance: number) => {
    const diff = realBalance - getAccountBalance(accountId);
    if (Math.abs(diff) < 0.01) return;
    const cat = categories.find(c => c.id === 'cat_adjustment' || c.type === 'adjustment') || categories[0];
    addTransaction({
      amount: Number(diff.toFixed(2)),
      type: 'adjustment',
      description: 'Ajuste de Saldo',
      date: getLocalDateString(),
      status: 'paid',
      accountId,
      categoryId: cat ? cat.id : 'cat_adjustment'
    });
  };

  const addTransaction = (t: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => {
    const fixedGroupId = t.isFixed ? generateUUID() : undefined;
    const tid = t.id || generateUUID();
    const cleanAmount = Number(t.amount) || 0;
    const cleanScope: ScopeType = t.scope || ((t.categoryId === 'cat_33' || t.categoryId === 'cat_equipamentos' || !!t.showId) ? 'BUSINESS' : (activeScope === 'BUSINESS' ? 'BUSINESS' : 'PERSONAL'));

    const fullTx: Transaction = {
      ...t,
      id: tid,
      amount: cleanAmount,
      scope: cleanScope,
      createdAt: Date.now(),
      fixedGroupId
    };

    setTransactions(prev => {
      const txs = [...prev, fullTx];
      if (t.isFixed && fixedGroupId) {
        for (let i = 1; i < 12; i++) {
          const d = new Date(t.date + 'T12:00:00'); d.setMonth(d.getMonth() + i);
          const recurTx: Transaction = { ...t, id: generateUUID(), date: getLocalDateString(d), status: 'pending', createdAt: Date.now() + i, fixedGroupId, amount: cleanAmount, scope: cleanScope };
          txs.push(recurTx);
          if (currentUser) {
            saveTransactionToFirestore(currentUser.uid, recurTx);
          }
        }
      }
      StorageService.saveTransactions(txs);
      return txs;
    });

    if (currentUser) {
      saveTransactionToFirestore(currentUser.uid, fullTx);
    }

    if (t.showId) {
      const defaultAccId = getDefaultAccountForScope('BUSINESS');
      setShows(prevShows => {
        let modified = false;
        const updated = prevShows.map(show => {
          if (show.id !== t.showId) return show;
          modified = true;
          if (t.type === 'income') {
            let payments = Array.isArray(show.payments) ? [...show.payments] : [];
            const existingIdx = payments.findIndex(p => p.transactionId === tid || (t.showPaymentId && p.id === t.showPaymentId));
            const pType = t.showPaymentType || (t.description?.toLowerCase().includes('sinal') ? 'Sinal' : 'Parcela');
            
            const updatedPayment: ShowPayment = {
              id: (existingIdx >= 0 && payments[existingIdx].id) ? payments[existingIdx].id : (t.showPaymentId || generateUUID()),
              type: pType,
              amount: cleanAmount,
              status: t.status === 'paid' ? 'Recebido' : 'Agendado',
              expectedDate: t.date,
              effectiveDate: t.status === 'paid' ? t.date : undefined,
              accountId: t.accountId || defaultAccId,
              transactionId: tid
            };

            if (existingIdx >= 0) {
              payments[existingIdx] = updatedPayment;
            } else {
              payments.push(updatedPayment);
            }
            return normalizeShowFinancials({ ...show, payments }, defaultAccId);
          } else if (t.type === 'expense') {
            let expenses = Array.isArray(show.expenseItems) ? [...show.expenseItems] : [];
            const existingIdx = expenses.findIndex(e => e.transactionId === tid || (t.showExpenseId && e.id === t.showExpenseId));
            const updatedExpense = {
              id: (existingIdx >= 0 && expenses[existingIdx].id) ? expenses[existingIdx].id : (t.showExpenseId || generateUUID()),
              category: 'Outros',
              notes: t.description || 'Despesa do Show',
              amount: cleanAmount,
              date: t.date,
              accountId: t.accountId || defaultAccId,
              transactionId: tid
            };

            if (existingIdx >= 0) {
              expenses[existingIdx] = updatedExpense;
            } else {
              expenses.push(updatedExpense);
            }
            return normalizeShowFinancials({ ...show, expenseItems: expenses }, defaultAccId);
          }
          return show;
        });

        if (modified) {
          StorageService.saveShows(updated);
          if (currentUser) {
            const currentShow = updated.find(s => s.id === t.showId);
            if (currentShow) saveShowToFirestore(currentUser.uid, currentShow);
          }
          return updated;
        }
        return prevShows;
      });
    }
  };

  const importTransactions = (newTxs: Array<Omit<Transaction, 'id' | 'createdAt'> & { id?: string }>) => {
    setTransactions(prev => {
      const txs = [...prev];
      newTxs.forEach(t => {
        const tid = t.id || generateUUID();
        const cleanAmount = Number(t.amount) || 0;
        const cleanScope: ScopeType = (t.scope === 'BUSINESS' || t.categoryId === 'cat_33' || t.categoryId === 'cat_equipamentos') ? 'BUSINESS' : 'PERSONAL';
        const item: Transaction = {
          ...t,
          id: tid,
          amount: cleanAmount,
          scope: cleanScope,
          status: t.status || 'paid',
          createdAt: Date.now()
        };
        txs.push(item);
        if (currentUser) {
          saveTransactionToFirestore(currentUser.uid, item);
        }
      });
      StorageService.saveTransactions(txs);
      return txs;
    });
  };

  const updateTransaction = (updatedT: Transaction) => {
    const cleanAmount = Number(updatedT.amount) || 0;
    const cleanScope = (updatedT.scope === 'BUSINESS' || updatedT.categoryId === 'cat_33' || updatedT.categoryId === 'cat_equipamentos') ? 'BUSINESS' : 'PERSONAL';
    
    const cleanT: Transaction = {
      ...updatedT,
      amount: cleanAmount,
      scope: cleanScope
    };

    setTransactions(prev => {
      const txs = prev.map(t => t.id === cleanT.id ? cleanT : t);
      StorageService.saveTransactions(txs);
      return txs;
    });

    if (currentUser) {
      saveTransactionToFirestore(currentUser.uid, cleanT);
    }

    // Sincronização bidirecional automática com o módulo de Shows
    const defaultAccId = accounts.length > 0 ? accounts[0].id : 'acc_bank';
    setShows(prevShows => {
      let showsModified = false;
      const updatedShows = prevShows.map(show => {
        const isDirectMatch = show.id === cleanT.showId;
        const hasPaymentMatch = show.payments && show.payments.some(p => p.transactionId === cleanT.id || (cleanT.showPaymentId && p.id === cleanT.showPaymentId));
        const hasReceiptMatch = show.receipts && show.receipts.some(r => r.transactionId === cleanT.id);
        const hasExpenseMatch = show.expenseItems && show.expenseItems.some(e => e.transactionId === cleanT.id || (cleanT.showExpenseId && e.id === cleanT.showExpenseId));

        if (!isDirectMatch && !hasPaymentMatch && !hasReceiptMatch && !hasExpenseMatch) {
          return show;
        }

        let paymentChanged = false;
        let expenseChanged = false;

        let newPayments = Array.isArray(show.payments) ? [...show.payments] : [];
        if (cleanT.showPaymentId || cleanT.type === 'income') {
          newPayments = newPayments.map(p => {
            if ((cleanT.showPaymentId && p.id === cleanT.showPaymentId) || p.transactionId === cleanT.id) {
              paymentChanged = true;
              return {
                ...p,
                amount: cleanAmount,
                status: cleanT.status === 'paid' ? 'Recebido' as const : 'Agendado' as const,
                effectiveDate: cleanT.status === 'paid' ? (p.effectiveDate || cleanT.date) : undefined,
                expectedDate: cleanT.date || p.expectedDate,
                accountId: cleanT.accountId || p.accountId
              };
            }
            return p;
          });
        }

        let newExpenses = Array.isArray(show.expenseItems) ? [...show.expenseItems] : [];
        if (cleanT.showExpenseId || cleanT.type === 'expense') {
          newExpenses = newExpenses.map(e => {
            if ((cleanT.showExpenseId && e.id === cleanT.showExpenseId) || e.transactionId === cleanT.id) {
              expenseChanged = true;
              return {
                ...e,
                amount: cleanAmount,
                date: cleanT.date || e.date,
                accountId: cleanT.accountId || e.accountId
              };
            }
            return e;
          });
        }

        if (paymentChanged || expenseChanged || isDirectMatch) {
          showsModified = true;
          return normalizeShowFinancials({
            ...show,
            payments: newPayments,
            expenseItems: newExpenses
          }, defaultAccId);
        }

        return show;
      });

      if (showsModified) {
        StorageService.saveShows(updatedShows);
        if (currentUser) {
          updatedShows
            .filter(s => s.id === cleanT.showId || (s.payments && s.payments.some(p => p.transactionId === cleanT.id)) || (s.expenseItems && s.expenseItems.some(e => e.transactionId === cleanT.id)))
            .forEach(s => saveShowToFirestore(currentUser.uid, s));
        }
        return updatedShows;
      }
      return prevShows;
    });
  };
  
  const updateTransactionSeries = (updatedT: Transaction, updateFuture: boolean) => {
    if (!updateFuture || !updatedT.fixedGroupId) { updateTransaction(updatedT); return; }
    setTransactions(prev => {
      const txs = prev.map(t => {
        if (t.id === updatedT.id) return updatedT;
        if (t.fixedGroupId === updatedT.fixedGroupId && new Date(t.date) > new Date(updatedT.date)) {
          const mod = { ...t, amount: updatedT.amount, categoryId: updatedT.categoryId, description: updatedT.description, type: updatedT.type, accountId: updatedT.accountId };
          if (currentUser) {
            saveTransactionToFirestore(currentUser.uid, mod);
          }
          return mod;
        }
        return t;
      });
      StorageService.saveTransactions(txs);
      if (currentUser) {
        saveTransactionToFirestore(currentUser.uid, updatedT);
      }
      return txs;
    });
  };

  const updateDebtTransaction = (t: Transaction, redistribute: boolean) => {
    updateTransaction(t);
  };

  const recalculateDebtSeries = (transactionId: string, newAmount: number) => {
    const originalT = transactions.find(t => t.id === transactionId);
    if (!originalT || !originalT.debtId) return;

    const debt = debts.find(d => d.id === originalT.debtId);
    const allDebtTxs = transactions.filter(t => t.debtId === originalT.debtId);
    const totalContract = debt ? Number(debt.totalAmount) : allDebtTxs.reduce((s, t) => s + Number(t.amount || 0), 0);

    const futureInstallments = allDebtTxs
      .filter(t => 
        t.status === 'pending' && 
        t.id !== transactionId && 
        (
          (t.installmentNumber !== undefined && originalT.installmentNumber !== undefined)
            ? t.installmentNumber > originalT.installmentNumber
            : new Date(t.date + 'T12:00:00').getTime() >= new Date(originalT.date + 'T12:00:00').getTime()
        )
      )
      .sort((a, b) => {
        if (a.installmentNumber !== undefined && b.installmentNumber !== undefined) {
          return a.installmentNumber - b.installmentNumber;
        }
        return new Date(a.date + 'T12:00:00').getTime() - new Date(b.date + 'T12:00:00').getTime();
      });

    if (futureInstallments.length === 0) {
      updateTransaction({ ...originalT, amount: newAmount });
      return;
    }

    const otherPaidAmount = allDebtTxs
      .filter(t => t.id !== transactionId && t.status === 'paid')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const remainingForFuture = Math.max(0, parseFloat((totalContract - otherPaidAmount - newAmount).toFixed(2)));
    const basePerInstallment = Math.floor((remainingForFuture / futureInstallments.length) * 100) / 100;
    const allocatedSoFar = parseFloat((basePerInstallment * futureInstallments.length).toFixed(2));
    const remainderDiff = parseFloat((remainingForFuture - allocatedSoFar).toFixed(2));

    const futureMap = new Map<string, number>();
    futureInstallments.forEach((fi, idx) => {
      // Ajusta centavos residuais na última parcela para soma exata sem descartar nada
      const isLast = idx === futureInstallments.length - 1;
      const adjustedVal = isLast ? Math.max(0, parseFloat((basePerInstallment + remainderDiff).toFixed(2))) : basePerInstallment;
      futureMap.set(fi.id, adjustedVal);
    });

    const newTransactions = transactions.map(t => {
      if (t.id === transactionId) {
        return { ...t, amount: newAmount };
      }
      if (futureMap.has(t.id)) {
        return { ...t, amount: futureMap.get(t.id)! };
      }
      return t;
    });

    saveTransactions(newTransactions);
    if (currentUser) {
      newTransactions
        .filter(t => t.id === transactionId || futureMap.has(t.id))
        .forEach(t => saveTransactionToFirestore(currentUser.uid, t));
    }
  };

  const deleteTransaction = (id: string, deleteSeries: boolean = false) => {
    setTransactions(prev => {
      const target = prev.find(t => t.id === id);
      let txs;
      if (deleteSeries && target && target.fixedGroupId) {
        const toDelete = prev.filter(t => t.fixedGroupId === target.fixedGroupId);
        if (currentUser) {
          toDelete.forEach(t => deleteTransactionFromFirestore(currentUser.uid, t.id));
        }
        txs = prev.filter(t => t.fixedGroupId !== target.fixedGroupId);
      } else {
        txs = prev.filter(t => t.id !== id);
        if (currentUser) {
          deleteTransactionFromFirestore(currentUser.uid, id);
        }
      }
      StorageService.saveTransactions(txs);
      return txs;
    });

    // Se a transação estiver vinculada a um show, remove a associação no Módulo de Shows
    setShows(prevShows => {
      let modified = false;
      const updated = prevShows.map(show => {
        let paymentsChanged = false;
        let expensesChanged = false;

        const updatedPayments = (show.payments || []).filter(p => {
          if (p.transactionId === id) {
            paymentsChanged = true;
            return false; // Remove o pagamento vinculado se a transação do extrato for excluída
          }
          return true;
        });

        const updatedExpenses = (show.expenseItems || []).filter(e => {
          if (e.transactionId === id) {
            expensesChanged = true;
            return false;
          }
          return true;
        });

        if (paymentsChanged || expensesChanged) {
          modified = true;
          const newShow = {
            ...show,
            payments: updatedPayments,
            expenseItems: updatedExpenses
          };
          if (currentUser) {
            saveShowToFirestore(currentUser.uid, newShow);
          }
          return newShow;
        }
        return show;
      });

      if (modified) {
        StorageService.saveShows(updated);
        return updated;
      }
      return prevShows;
    });
  };

  const checkTransactionImpact = (amount: number, date: string): { compromisedTransaction: Transaction } | null => {
    const today = new Date();
    const currentMonthStr = today.toISOString().slice(0, 7);
    
    // Only check for current month expenses
    if (!date.startsWith(currentMonthStr)) return null;

    let runningBalance = accounts.reduce((s, acc) => s + getAccountBalance(acc.id), 0);
    runningBalance -= amount;

    // Get all pending transactions for the current month, sorted by date
    const pendingTxs = transactions
      .filter(t => t.status === 'pending' && t.date.startsWith(currentMonthStr))
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const t of pendingTxs) {
      if (t.type === 'income') {
        runningBalance += Number(t.amount);
      } else if (t.type === 'expense') {
        runningBalance -= Number(t.amount);
      }

      if (runningBalance < 0) {
        return { compromisedTransaction: t };
      }
    }

    return null;
  };

  const addDebt = (debtData: Omit<Debt, 'id'>, installmentsData: any) => {
    const debtId = generateUUID();
    const newDebt = { ...debtData, id: debtId };
    const newDebts = [...debts, newDebt];
    
    const newTransactions = [...transactions];
    const { downPayment, installments, firstDate, categoryId, accountId, autoPayPast, fixedInstallmentValue } = installmentsData;
    
    const today = new Date().toISOString().slice(0, 10);
    const createdAtBase = Date.now();

    if (downPayment && Number(downPayment) > 0) {
      newTransactions.push({
        id: generateUUID(),
        debtId,
        description: `Entrada Inicial - ${debtData.name}`,
        amount: Number(downPayment),
        type: 'expense',
        status: 'paid',
        date: today,
        categoryId,
        accountId,
        installmentNumber: 0,
        installmentTotal: installments,
        createdAt: createdAtBase
      });
    }

    const remainingAmount = debtData.totalAmount - (Number(downPayment) || 0);
    let installmentValue: number;

    if (fixedInstallmentValue && fixedInstallmentValue > 0) {
        installmentValue = fixedInstallmentValue;
    } else {
        installmentValue = remainingAmount / installments;
    }
    
    const [y, m, d] = firstDate.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d, 12, 0, 0);

    for (let i = 0; i < installments; i++) {
       const currentDate = new Date(baseDate);
       currentDate.setMonth(baseDate.getMonth() + i);
       const dateStr = currentDate.toISOString().slice(0, 10);

       let status: 'paid' | 'pending' = 'pending';
       if (autoPayPast && dateStr < today) {
          status = 'paid';
       }

       newTransactions.push({
         id: generateUUID(),
         debtId,
         description: `${debtData.name} (${i + 1}/${installments})`,
         amount: Number(installmentValue.toFixed(2)),
         type: 'expense',
         status: status,
         date: dateStr,
         categoryId,
         accountId,
         installmentNumber: i + 1,
         installmentTotal: installments,
         createdAt: createdAtBase + i + 1
       });
    }

    saveDebts(newDebts);
    saveTransactions(newTransactions);
    setDebts(newDebts);
    setTransactions(newTransactions);

    if (currentUser) {
      saveDebtToFirestore(currentUser.uid, newDebt);
      newTransactions.filter(t => t.debtId === debtId).forEach(t => saveTransactionToFirestore(currentUser.uid, t));
    }
  };

  const updateDebt = (id: string, name: string, installmentCount: number) => {
    const updatedDebts = debts.map(d => d.id === id ? { ...d, name, installmentCount } : d);
    const updatedTxs = transactions.map(t => t.debtId === id ? { ...t, description: `${name} (${t.installmentNumber}/${installmentCount})`, installmentTotal: installmentCount } : t);
    saveDebts(updatedDebts);
    saveTransactions(updatedTxs);

    if (currentUser) {
      const d = updatedDebts.find(item => item.id === id);
      if (d) saveDebtToFirestore(currentUser.uid, d);
      updatedTxs.filter(t => t.debtId === id).forEach(t => saveTransactionToFirestore(currentUser.uid, t));
    }
  };

  const deleteDebt = (id: string) => { 
    saveDebts(debts.filter(d => d.id !== id)); 
    saveTransactions(transactions.filter(t => t.debtId !== id)); 
    if (currentUser) {
      deleteDebtFromFirestore(currentUser.uid, id);
      transactions.filter(t => t.debtId === id).forEach(t => deleteTransactionFromFirestore(currentUser.uid, t.id));
    }
  };

  const getDebtProgress = (debtId: string) => {
    const txs = transactions.filter(t => t.debtId === debtId);
    if (txs.length === 0) return { paid: 0, remaining: 0, status: 'active' as DebtStatus, progress: 0, totalReal: 0 };
    
    const paidPrincipal = txs.filter(t => t.status === 'paid')
        .reduce((s, t) => s + (Number(t.amount) - (Number(t.interest) || 0)), 0);
    
    const debt = debts.find(d => d.id === debtId);
    const totalContract = debt ? Number(debt.totalAmount) : 0;
    
    const remaining = Math.max(0, totalContract - paidPrincipal);
    
    return { 
      paid: paidPrincipal, 
      remaining, 
      status: remaining <= 0.1 ? 'paid' : 'active' as DebtStatus, 
      progress: totalContract > 0 ? (paidPrincipal / totalContract) * 100 : 0,
      totalReal: totalContract 
    };
  };

  const addCategory = (c: Omit<Category, 'id'>) => {
    const newCat = { ...c, id: generateUUID() };
    saveCategories([...categories, newCat]);
    if (currentUser) {
      saveCategoryToFirestore(currentUser.uid, newCat);
    }
  };
  const updateCategory = (c: Category) => {
    saveCategories(categories.map(cat => cat.id === c.id ? c : cat));
    if (currentUser) {
      saveCategoryToFirestore(currentUser.uid, c);
    }
  };
  const deleteCategory = (id: string) => {
    saveCategories(categories.filter(c => c.id !== id));
    if (currentUser) {
      deleteCategoryFromFirestore(currentUser.uid, id);
    }
  };

  const saveBudget = (b: Budget) => {
    const idx = budgets.findIndex(item => item.categoryId === b.categoryId);
    const newBudgets = [...budgets];
    if (idx >= 0) newBudgets[idx] = b;
    else newBudgets.push(b);
    saveBudgetsInternal(newBudgets);
    if (currentUser) {
      saveBudgetToFirestore(currentUser.uid, b);
    }
  };
  const deleteBudget = (categoryId: string) => {
    saveBudgetsInternal(budgets.filter(b => b.categoryId !== categoryId));
    if (currentUser) {
      deleteBudgetFromFirestore(currentUser.uid, categoryId);
    }
  };

  const addShow = (s: Omit<Show, 'id' | 'createdAt'> & { id?: string }) => {
    const id = s.id || generateUUID();
    const defaultAccId = accounts.length > 0 ? accounts[0].id : 'acc_bank';
    const showWithId: Show = { ...s, id, createdAt: Date.now() };
    const normalized = normalizeShowFinancials(showWithId, defaultAccId);

    // Sincronizar automaticamente com as movimentações financeiras
    const { updatedShow, updatedTransactions } = syncShowWithTransactions(normalized, transactions, categories);

    setShows(prev => {
      const updated = [...prev, updatedShow];
      StorageService.saveShows(updated);
      return updated;
    });

    setTransactions(updatedTransactions);
    StorageService.saveTransactions(updatedTransactions);

    if (currentUser) {
      saveShowToFirestore(currentUser.uid, updatedShow);
      updatedTransactions.forEach(t => saveTransactionToFirestore(currentUser.uid, t));
    }
  };

  const updateShow = (s: Show) => {
    const defaultAccId = getDefaultAccountForScope('BUSINESS');
    const normalized = normalizeShowFinancials(s, defaultAccId);

    setTransactions(prevTxs => {
      let currentTxs = prevTxs;
      if (s.status === 'Cancelado') {
        currentTxs = cancelShowFutureTransactions(s.id, currentTxs);
      }

      let { updatedShow, updatedTransactions } = syncShowWithTransactions(normalized, currentTxs, categories);

      if (s.status === 'Cancelado') {
        updatedTransactions = cancelShowFutureTransactions(s.id, updatedTransactions);
      }

      StorageService.saveTransactions(updatedTransactions);

      setShows(prevShows => {
        const updated = prevShows.map(show => show.id === s.id ? updatedShow : show);
        StorageService.saveShows(updated);
        return updated;
      });

      if (currentUser) {
        saveShowToFirestore(currentUser.uid, updatedShow);
        updatedTransactions.forEach(t => saveTransactionToFirestore(currentUser.uid, t));
      }

      return updatedTransactions;
    });
  };

  const deleteShow = (id: string, deleteTransactions: boolean = false) => {
    setShows(prev => {
      const updated = prev.filter(show => show.id !== id);
      StorageService.saveShows(updated);
      return updated;
    });

    if (currentUser) {
      deleteShowFromFirestore(currentUser.uid, id);
    }

    if (deleteTransactions) {
      setTransactions(prev => {
        const toDelete = prev.filter(t => t.showId === id);
        if (currentUser) {
          toDelete.forEach(t => deleteTransactionFromFirestore(currentUser.uid, t.id));
        }
        const updated = prev.filter(t => t.showId !== id);
        StorageService.saveTransactions(updated);
        return updated;
      });
    }
  };

  const cancelShowFutureFinancials = (showId: string) => {
    setTransactions(prev => {
      const updated = cancelShowFutureTransactions(showId, prev);
      StorageService.saveTransactions(updated);
      if (currentUser) {
        updated.filter(t => t.showId === showId).forEach(t => saveTransactionToFirestore(currentUser.uid, t));
      }
      return updated;
    });
  };

  // --- CRUD: LOCAIS E BARES ---
  const addVenue = (v: Omit<Venue, 'id' | 'createdAt'> & { id?: string }) => {
    const newVenue: Venue = {
      ...v,
      id: v.id || `ven_${generateUUID()}`,
      createdAt: Date.now()
    };
    setVenues(prev => {
      const updated = [newVenue, ...prev];
      StorageService.saveVenues(updated);
      return updated;
    });
  };

  const updateVenue = (v: Venue) => {
    setVenues(prev => {
      const updated = prev.map(item => item.id === v.id ? v : item);
      StorageService.saveVenues(updated);
      return updated;
    });
  };

  const deleteVenue = (id: string) => {
    setVenues(prev => {
      const updated = prev.filter(item => item.id !== id);
      StorageService.saveVenues(updated);
      return updated;
    });
  };

  // --- CRUD: MÚSICOS E EQUIPE (FREELANCERS) ---
  const addCrewMember = (m: Omit<MusicianCrewMember, 'id' | 'createdAt'> & { id?: string }) => {
    const newCrew: MusicianCrewMember = {
      ...m,
      id: m.id || `crew_${generateUUID()}`,
      createdAt: Date.now()
    };
    setCrew(prev => {
      const updated = [newCrew, ...prev];
      StorageService.saveCrew(updated);
      return updated;
    });
  };

  const updateCrewMember = (m: MusicianCrewMember) => {
    setCrew(prev => {
      const updated = prev.map(item => item.id === m.id ? m : item);
      StorageService.saveCrew(updated);
      return updated;
    });
  };

  const deleteCrewMember = (id: string) => {
    setCrew(prev => {
      const updated = prev.filter(item => item.id !== id);
      StorageService.saveCrew(updated);
      return updated;
    });
  };

  // --- CRUD: DESLOCAMENTO E LOCOMOÇÃO ---
  const addLocomotionExpense = (l: Omit<MusicLocomotionExpense, 'id' | 'createdAt'> & { id?: string }, createTransaction: boolean = true) => {
    const newId = l.id || `loco_${generateUUID()}`;
    let txId = l.transactionId;

    if (createTransaction && l.amount > 0) {
      txId = `tx_loco_${generateUUID()}`;
      const defaultAcc = getDefaultAccountForScope('BUSINESS');
      addTransaction({
        id: txId,
        description: `Locomoção (${l.type.toUpperCase()}): ${l.title || 'Deslocamento'}`,
        amount: l.amount,
        type: 'expense',
        categoryId: 'cat_producao_shows',
        accountId: l.accountId || defaultAcc,
        date: l.date || getLocalDateString(),
        status: 'paid',
        scope: 'BUSINESS',
        showId: l.showId
      });
    }

    const newLoco: MusicLocomotionExpense = {
      ...l,
      id: newId,
      transactionId: txId,
      createdAt: Date.now()
    };

    setLocomotionExpenses(prev => {
      const updated = [newLoco, ...prev];
      StorageService.saveLocomotionExpenses(updated);
      return updated;
    });
  };

  const updateLocomotionExpense = (l: MusicLocomotionExpense) => {
    if (l.transactionId) {
      const existingTx = transactions.find(t => t.id === l.transactionId);
      if (existingTx) {
        updateTransaction({
          ...existingTx,
          amount: l.amount,
          date: l.date,
          description: `Locomoção (${l.type.toUpperCase()}): ${l.title || 'Deslocamento'}`,
          accountId: l.accountId || existingTx.accountId
        });
      }
    }
    setLocomotionExpenses(prev => {
      const updated = prev.map(item => item.id === l.id ? l : item);
      StorageService.saveLocomotionExpenses(updated);
      return updated;
    });
  };

  const deleteLocomotionExpense = (id: string, deleteTransactionRecord: boolean = true) => {
    const item = locomotionExpenses.find(l => l.id === id);
    if (item && item.transactionId && deleteTransactionRecord) {
      deleteTransaction(item.transactionId);
    }
    setLocomotionExpenses(prev => {
      const updated = prev.filter(l => l.id !== id);
      StorageService.saveLocomotionExpenses(updated);
      return updated;
    });
  };

  // --- CRUD: CUSTOS GERAIS DA MÚSICA (EQUIPAMENTOS, MARKETING, FIGURINO, ETC) ---
  const addMusicCostItem = (c: Omit<MusicCostItem, 'id' | 'createdAt'> & { id?: string }, createTransaction: boolean = true) => {
    const newId = c.id || `mcost_${generateUUID()}`;
    let txId = c.transactionId;

    if (createTransaction && c.amount > 0) {
      txId = `tx_mcost_${generateUUID()}`;
      const defaultAcc = getDefaultAccountForScope('BUSINESS');
      const catId = c.category === 'equipment' || c.category === 'accessories' || c.category === 'maintenance'
        ? 'cat_equipamentos'
        : c.category === 'marketing'
        ? 'cat_marketing'
        : 'cat_producao_shows';

      addTransaction({
        id: txId,
        description: `Música (${c.category.toUpperCase()}): ${c.title || 'Despesa'}`,
        amount: c.amount,
        type: 'expense',
        categoryId: catId,
        accountId: c.accountId || defaultAcc,
        date: c.date || getLocalDateString(),
        status: 'paid',
        scope: 'BUSINESS',
        showId: c.showId
      });
    }

    const newCost: MusicCostItem = {
      ...c,
      id: newId,
      transactionId: txId,
      createdAt: Date.now()
    };

    setMusicCostItems(prev => {
      const updated = [newCost, ...prev];
      StorageService.saveMusicCostItems(updated);
      return updated;
    });
  };

  const updateMusicCostItem = (c: MusicCostItem) => {
    if (c.transactionId) {
      const existingTx = transactions.find(t => t.id === c.transactionId);
      if (existingTx) {
        updateTransaction({
          ...existingTx,
          amount: c.amount,
          date: c.date,
          description: `Música (${c.category.toUpperCase()}): ${c.title || 'Despesa'}`,
          accountId: c.accountId || existingTx.accountId
        });
      }
    }
    setMusicCostItems(prev => {
      const updated = prev.map(item => item.id === c.id ? c : item);
      StorageService.saveMusicCostItems(updated);
      return updated;
    });
  };

  const deleteMusicCostItem = (id: string, deleteTransactionRecord: boolean = true) => {
    const item = musicCostItems.find(c => c.id === id);
    if (item && item.transactionId && deleteTransactionRecord) {
      deleteTransaction(item.transactionId);
    }
    setMusicCostItems(prev => {
      const updated = prev.filter(c => c.id !== id);
      StorageService.saveMusicCostItems(updated);
      return updated;
    });
  };

  const getBalanceSummary = (viewMonthStr: string, projectionDateStr: string, scopeOverride?: ActiveScopeFilter): ExtendedSummary => {
    const projLimit = new Date(projectionDateStr + 'T23:59:59').getTime();
    const today = new Date();
    const dayOfMonth = today.getDate() || 1;
    const currentScope = scopeOverride || activeScope;

    const filteredAccounts = accounts.filter(acc => matchesScope(acc.scope, currentScope));
    const accountsTotal = filteredAccounts.reduce((s, acc) => s + getAccountBalance(acc.id), 0);
    const realBalance = Number(accountsTotal.toFixed(2));

    const operatingAccountsTotal = filteredAccounts
      .filter(acc => !(acc.type === 'savings' || acc.name.toLowerCase().includes('economia') || acc.name.toLowerCase().includes('reserva')))
      .reduce((s, acc) => s + getAccountBalance(acc.id), 0);
    let projectedBalance = Number(operatingAccountsTotal.toFixed(2));

    let monthlyIncome = 0, monthlyExpense = 0, pendingIncome = 0, pendingExpense = 0;

    const filteredTransactions = transactions.filter(t => matchesScope(t.scope, currentScope));
    const cancelledShowIds = new Set(
      shows.filter(s => s.status === 'Cancelado').map(s => s.id)
    );

    filteredTransactions.forEach(t => {
      if (t.status === 'cancelled') return;
      if (t.showId && cancelledShowIds.has(t.showId) && t.status !== 'paid') return;
      const amount = Number(t.amount) || 0;
      const isPaid = t.status === 'paid';
      const tTime = new Date(t.date + 'T12:00:00').getTime();

      if (!isPaid && tTime <= projLimit) {
        if (t.type === 'income') projectedBalance += amount;
        else if (t.type === 'expense') projectedBalance -= amount;
      }

      if (t.date.startsWith(viewMonthStr)) {
        if (t.type === 'income') {
          if (isPaid) monthlyIncome += amount;
          else pendingIncome += amount;
        } else if (t.type === 'expense') {
          if (isPaid) monthlyExpense += amount;
          else pendingExpense += amount;
        }
      }
    });

    monthlyIncome = Number(monthlyIncome.toFixed(2));
    monthlyExpense = Number(monthlyExpense.toFixed(2));
    pendingIncome = Number(pendingIncome.toFixed(2));
    pendingExpense = Number(pendingExpense.toFixed(2));
    projectedBalance = Number(projectedBalance.toFixed(2));

    // Smart Metrics Calculation
    const dailyBurnRate = monthlyExpense > 0 ? Number((monthlyExpense / dayOfMonth).toFixed(2)) : 0;
    const safetyMargin = Number((realBalance - pendingExpense).toFixed(2));
    const savingsRate = monthlyIncome > 0 ? Number((((monthlyIncome - monthlyExpense) / monthlyIncome) * 100).toFixed(1)) : 0;
    const freeToSpend = Number((realBalance - pendingExpense).toFixed(2));

    return { 
      realBalance: Number(realBalance.toFixed(2)), 
      projectedBalance: Number(projectedBalance.toFixed(2)), 
      monthlyIncome, 
      monthlyExpense, 
      pendingIncome, 
      pendingExpense,
      dailyBurnRate,
      safetyMargin,
      savingsRate,
      comparisonToLastMonth: 0,
      freeToSpend,
      accountsTotal: Number(accountsTotal.toFixed(2))
    };
  };

  const getSystemAlerts = useCallback((): SystemAlert[] => {
    const alerts: SystemAlert[] = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const sum = getBalanceSummary(getCurrentMonthPrefix(today), getLocalDateString(today));
    transactions.forEach(t => {
      if (t.status === 'pending' && t.type === 'expense') {
        const d = new Date(t.date + 'T12:00:00'); d.setHours(0,0,0,0);
        const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
        if (diff <= 7) {
          alerts.push({ id: t.id, title: t.description, amount: Number(t.amount), date: t.date, type: diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'week', isCovered: sum.projectedBalance >= 0, transactionId: t.id });
        }
      }
    });
    return alerts;
  }, [transactions, accounts, activeScope]);

  const handleSignInWithGoogle = async () => {
    await signInWithGoogle();
  };

  const restoreAutoBackup = () => { if (StorageService.restoreAutoBackup()) { refreshData(); return true; } return false; };
  const getBackupInfo = () => StorageService.getAutoBackupInfo();
  const requestNotificationPermission = () => NotificationService.requestPermission();

  return (
    <FinanceContext.Provider value={{
      transactions, categories, debts, accounts, budgets, shows, venues, crew, locomotionExpenses, musicCostItems, settings, isBlurred, toggleBlur,
      activeScope, setActiveScope, getDefaultAccountForScope,
      addTransaction, importTransactions, updateTransaction, updateTransactionSeries, updateDebtTransaction, recalculateDebtSeries, deleteTransaction, checkTransactionImpact,
      addCategory, updateCategory, deleteCategory,
      addAccount, updateAccount, deleteAccount, reconcileBalance, getAccountBalance,
      addDebt, updateDebt, deleteDebt, getDebtProgress,
      saveBudget, deleteBudget,
      addShow, updateShow, deleteShow, cancelShowFutureFinancials,
      addVenue, updateVenue, deleteVenue,
      addCrewMember, updateCrewMember, deleteCrewMember,
      addLocomotionExpense, updateLocomotionExpense, deleteLocomotionExpense,
      addMusicCostItem, updateMusicCostItem, deleteMusicCostItem,
      getSystemAlerts, updateSettings, updateFinancialSettings, getBalanceSummary, refreshData,
      restoreAutoBackup, getBackupInfo, requestNotificationPermission,
      currentUser, isAuthLoading, signInWithGoogle: handleSignInWithGoogle, logoutUser
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance must be used within FinanceProvider");
  return context;
};
