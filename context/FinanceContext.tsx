
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Transaction, Category, BalanceSummary, AppSettings, Debt, DebtStatus, SystemAlert, Account, TransactionType, TransactionStatus, Budget, DashboardWidgetConfig, Show, ShowPayment, ShowPaymentType, ShowCostGroup, ShowExpenseSubcategory, ShowLogisticsSubcategory, ShowEquipmentSubcategory, FinancialSettings, ActiveScopeFilter, ScopeType, matchesScope, Venue, MusicianCrewMember, MusicLocomotionExpense, MusicCostItem } from '../types';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { APP_THEMES, DEFAULT_CATEGORIES, DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import {
  normalizeShowFinancials,
  syncShowWithTransactions,
  cancelShowFutureTransactions,
  validateShowTransaction,
  resolveShowExpenseClassification,
  resolveIncomeCategoryId,
  getShowFinancialSummary,
  reconcileAllShowsAndTransactions,
  isShowOrMusicIncomeTransaction,
  deduplicateItemsById
} from '../services/showFinanceSyncService';
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
  linkTransactionToShow: (
    transactionId: string,
    showId: string,
    options?: {
      paymentType?: ShowPaymentType;
      costGroup?: ShowCostGroup;
      subcategory?: ShowExpenseSubcategory;
    }
  ) => void;
  unlinkTransactionFromShow: (transactionId: string) => void;

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

export const isAccountActive = (acc: Account | null | undefined): boolean => {
  if (!acc || !acc.id) return false;
  const anyAcc = acc as any;
  if (acc.enabled === false) return false;
  if (anyAcc.archived === true || anyAcc.isArchived === true) return false;
  if (anyAcc.hidden === true || anyAcc.isHidden === true) return false;
  if (anyAcc.deleted === true || anyAcc.isDeleted === true) return false;
  if (anyAcc.status === 'archived' || anyAcc.status === 'hidden' || anyAcc.status === 'inactive') return false;
  return true;
};

const loadPersistedAccountsRaw = (): Account[] => {
  try {
    const raw = localStorage.getItem('fin_app_accounts');
    if (raw) {
      const parsed: Account[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const active = deduplicateItemsById(parsed).filter(isAccountActive);
        const rawTxs = localStorage.getItem('fin_app_transactions');
        const txs: Transaction[] = rawTxs ? JSON.parse(rawTxs) : [];
        const hasSavingsTx = Array.isArray(txs) && txs.some(
          t => t && (t.accountId === 'acc_savings' || t.destinationAccountId === 'acc_savings' || t.type === 'goal_deposit' || t.type === 'goal_withdraw')
        );
        // Evita que a conta fantasma 'Economia' auto-injetada pelo StorageService altere a contagem do Patrimônio Consolidado ao recarregar
        if (active.length > 1 && !hasSavingsTx) {
          return active.filter(
            a => !(a.id === 'acc_savings' && a.name === 'Economia' && Number(a.initialBalance || 0) === 0)
          );
        }
        return active;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar contas persistidas:', e);
  }
  return deduplicateItemsById(StorageService.getAccounts()).filter(isAccountActive);
};

const normalizeTransactionRecord = (t: Transaction, accountsList: Account[]): Transaction => {
  const rawAmt = Number(t.amount) || 0;
  const cleanAmount = Math.abs(rawAmt);
  let cleanType: TransactionType = t.type;

  // Normaliza ajustes legados para confiar estritamente em 'income' | 'expense' com Math.abs(amount)
  if (cleanType === 'adjustment') {
    cleanType = rawAmt < 0 ? 'expense' : 'income';
  }

  let cleanScope = t.scope;
  if (t.accountId && (t.description === 'Ajuste de Saldo' || t.categoryId === 'cat_adjustment' || !cleanScope || cleanScope === 'BOTH')) {
    const targetAcc = accountsList.find(a => a.id === t.accountId);
    if (targetAcc && (t.description === 'Ajuste de Saldo' || t.categoryId === 'cat_adjustment')) {
      cleanScope = (targetAcc.scope === 'BUSINESS' || targetAcc.vinculo === 'MUSICO') ? 'BUSINESS' : 'PERSONAL';
    }
  }

  if (!cleanScope || cleanScope === 'BOTH') {
    const descLower = (t.description || '').toLowerCase();
    const isBiz =
      t.categoryId === 'cat_33' ||
      t.categoryId === 'cat_equipamentos' ||
      t.categoryId === 'cat_logistica_shows' ||
      t.categoryId === 'cat_producao_shows' ||
      Boolean(t.showId) ||
      Boolean(t.showExpenseId) ||
      descLower.includes('show') ||
      descLower.includes('músico') ||
      descLower.includes('musico');
    cleanScope = isBiz ? 'BUSINESS' : 'PERSONAL';
  }

  return {
    ...t,
    amount: cleanAmount,
    type: cleanType,
    status: t.status || 'paid',
    scope: cleanScope
  };
};

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>(() => loadPersistedAccountsRaw());
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const initialAccs = loadPersistedAccountsRaw();
    return deduplicateItemsById(StorageService.getTransactions()).map(t => normalizeTransactionRecord(t, initialAccs));
  });
  const [categories, setCategories] = useState<Category[]>(() => deduplicateItemsById(StorageService.getCategories()));
  const [debts, setDebts] = useState<Debt[]>(() => deduplicateItemsById(StorageService.getDebts()));
  const [budgets, setBudgets] = useState<Budget[]>(() => StorageService.getBudgets());
  const [shows, setShows] = useState<Show[]>(() => deduplicateItemsById(StorageService.getShows()));
  const [venues, setVenues] = useState<Venue[]>(() => StorageService.getVenues());
  const [crew, setCrew] = useState<MusicianCrewMember[]>(() => StorageService.getCrew());
  const [locomotionExpenses, setLocomotionExpenses] = useState<MusicLocomotionExpense[]>(() => StorageService.getLocomotionExpenses());
  const [musicCostItems, setMusicCostItems] = useState<MusicCostItem[]>(() => StorageService.getMusicCostItems());

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

    // 1. Escutador em tempo real: Contas Bancárias (filtrando contas arquivadas/ocultas)
    const unsubAccounts = subscribeToUserAccounts(uid, (cloudAccounts) => {
      const cleanAccounts = deduplicateItemsById(cloudAccounts).filter(isAccountActive);
      setAccounts(cleanAccounts);
      StorageService.saveAccounts(cleanAccounts);
    });

    // 2. Escutador em tempo real: Transações / Lançamentos
    const unsubTransactions = subscribeToUserTransactions(uid, (cloudTxs) => {
      setAccounts(currentAccs => {
        const normalizedTxs = deduplicateItemsById(cloudTxs).map(t => normalizeTransactionRecord(t, currentAccs));
        setTransactions(normalizedTxs);
        StorageService.saveTransactions(normalizedTxs);
        return currentAccs;
      });
    });

    // 3. Escutador em tempo real: Shows / Apresentações
    const unsubShows = subscribeToUserShows(uid, (cloudShows) => {
      const cleanShows = deduplicateItemsById(cloudShows).map(s => {
        const hadDupPayments = Array.isArray(s.payments) && deduplicateItemsById(s.payments).length !== s.payments.length;
        const hadDupCrew = Array.isArray(s.crewMembers) && deduplicateItemsById(s.crewMembers).length !== s.crewMembers.length;
        const hadDupLog = Array.isArray(s.logistics) && deduplicateItemsById(s.logistics).length !== s.logistics.length;
        const hadDupOther = Array.isArray(s.otherExpenses) && deduplicateItemsById(s.otherExpenses).length !== s.otherExpenses.length;
        const hadDupExp = Array.isArray(s.expenseItems) && deduplicateItemsById(s.expenseItems).length !== s.expenseItems.length;

        const normalized = normalizeShowFinancials(s, 'acc_mp');
        if (hadDupPayments || hadDupCrew || hadDupLog || hadDupOther || hadDupExp) {
          saveShowToFirestore(uid, normalized);
        }
        return normalized;
      });
      setShows(cleanShows);
      StorageService.saveShows(cleanShows);
    });

    // 4. Escutador em tempo real: Dívidas / Parcelamentos
    const unsubDebts = subscribeToUserDebts(uid, (cloudDebts) => {
      const cleanDebts = deduplicateItemsById(cloudDebts);
      setDebts(cleanDebts);
      StorageService.saveDebts(cleanDebts);
    });

    // 5. Escutador em tempo real: Categorias Customizadas
    const unsubCategories = subscribeToUserCategories(uid, (cloudCategories) => {
      if (cloudCategories && cloudCategories.length > 0) {
        const cleanCategories = deduplicateItemsById(cloudCategories);
        setCategories(cleanCategories);
        StorageService.saveCategories(cleanCategories);
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
    const storedAccounts = loadPersistedAccountsRaw();
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

    // Garantir categoria "Equipamentos & Som" para saídas do módulo de Música
    const duplicateEquipCatIds = new Set(
      storedCategories
        .filter(c => c.id !== 'cat_equipamentos' && c.name.toLowerCase() === 'equipamentos')
        .map(c => c.id)
    );
    let catEquip = storedCategories.find(c => c.id === 'cat_equipamentos');
    if (!catEquip) {
      catEquip = {
        id: 'cat_equipamentos',
        name: 'Equipamentos & Som',
        type: 'expense',
        color: '#8b5cf6',
        icon: 'Hammer',
        classification: 'professional',
        scope: 'BUSINESS'
      };
      storedCategories.push(catEquip);
    } else {
      catEquip.name = 'Equipamentos & Som';
      catEquip.scope = 'BUSINESS';
      catEquip.type = 'expense';
    }

    // Garantir categoria "Deslocamento / Logística" (cat_logistica_shows)
    let catLogistica = storedCategories.find(c => c.id === 'cat_logistica_shows');
    if (!catLogistica) {
      catLogistica = {
        id: 'cat_logistica_shows',
        name: 'Deslocamento / Logística',
        type: 'expense',
        color: '#f59e0b',
        icon: 'Fuel',
        classification: 'professional',
        scope: 'BUSINESS'
      };
      storedCategories.push(catLogistica);
    } else {
      catLogistica.scope = 'BUSINESS';
      catLogistica.type = 'expense';
    }

    // Garantir categoria "Músicos / Apoio (Equipe)" (cat_producao_shows)
    let catMusicos = storedCategories.find(c => c.id === 'cat_producao_shows');
    if (!catMusicos) {
      catMusicos = {
        id: 'cat_producao_shows',
        name: 'Músicos / Apoio (Equipe)',
        type: 'expense',
        color: '#a855f7',
        icon: 'Users',
        classification: 'professional',
        scope: 'BUSINESS'
      };
      storedCategories.push(catMusicos);
    } else {
      catMusicos.scope = 'BUSINESS';
      catMusicos.type = 'expense';
    }

    // Remover categorias duplicadas
    let finalCategories = deduplicateItemsById(
      storedCategories.filter(c => !duplicateCatIds.has(c.id) && !duplicateEquipCatIds.has(c.id))
    );

    // Garantir defaults que faltem
    const existingIds = new Set(finalCategories.map(c => c.id));
    const existingNames = new Set(finalCategories.map(c => c.name.toLowerCase()));
    const missingDefaults = DEFAULT_CATEGORIES.filter(
      d => !existingIds.has(d.id) && !existingNames.has(d.name.toLowerCase()) && !isDuplicateCacheCat(d.name, d.id)
    );
    if (missingDefaults.length > 0) {
      finalCategories = [...finalCategories, ...missingDefaults];
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
      if (
        t.categoryId === 'cat_equipamentos' || 
        descLower.includes('equipamento') || 
        descLower.includes('pedal') || 
        descLower.includes('amplificador') || 
        descLower.includes('instrumento') || 
        descLower.includes('mesa de som') || 
        descLower.includes('mesa') || 
        descLower.includes('luthier') || 
        descLower.includes('violao') || 
        descLower.includes('violão') || 
        descLower.includes('guitarra')
      ) {
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
        const isBiz = newCatId === 'cat_33' || newCatId === 'cat_equipamentos' || newCatId === 'cat_logistica_shows' || newCatId === 'cat_producao_shows' || !!t.showId || !!t.showExpenseId || descLower.includes('show') || descLower.includes('músico') || descLower.includes('musico');
        newScope = isBiz ? 'BUSINESS' : 'PERSONAL';
        modified = true;
      }

      if (modified || t.type === 'adjustment' || Number(t.amount) < 0) {
        transactionsChanged = true;
        return normalizeTransactionRecord(
          {
            ...t,
            categoryId: newCatId,
            scope: newScope
          },
          storedAccounts
        );
      }
      return normalizeTransactionRecord(t, storedAccounts);
    });

    if (transactionsChanged) {
      storedTransactions = migratedTransactions;
      StorageService.saveTransactions(migratedTransactions);
    }

    const rawShows = StorageService.getShows();
    const defaultBizAcc = storedAccounts.find(a => a.scope === 'BUSINESS' || a.vinculo === 'MUSICO')?.id || (storedAccounts[0]?.id || 'acc_mp');
    const normalizedShows = deduplicateItemsById(
      rawShows
        .filter(s => s && s.id && !String(s.id).startsWith('show_legacy_'))
        .map(s => normalizeShowFinancials(s, defaultBizAcc))
    );
    const normalizedTransactions = deduplicateItemsById(migratedTransactions);

    StorageService.saveShows(normalizedShows);
    StorageService.saveTransactions(normalizedTransactions);
    StorageService.saveAccounts(storedAccounts);

    setCategories(finalCategories);
    setDebts(storedDebts);
    setAccounts(storedAccounts);
    setBudgets(storedBudgets);
    setTransactions(normalizedTransactions);
    setShows(normalizedShows);
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
    const clean = deduplicateItemsById(as).filter(isAccountActive);
    setAccounts(clean); 
    StorageService.saveAccounts(clean); 
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

  // =========================================================================
  // 1. DERIVED STATE: SALDO DE CADA CONTA REATIVO E CONSISTENTE (REGIME DE CAIXA ESTRITO)
  // =========================================================================
  const activeAccounts = useMemo(() => {
    return deduplicateItemsById(accounts).filter(isAccountActive);
  }, [accounts]);

  const accountBalancesMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeAccounts.forEach(acc => {
      map[acc.id] = Number(acc.initialBalance || 0);
    });

    transactions.forEach(t => {
      if (!t || t.status !== 'paid') return;
      const amt = Math.abs(Number(t.amount) || 0);
      if (amt === 0) return;

      if (t.accountId && map[t.accountId] !== undefined) {
        const account = activeAccounts.find(a => a.id === t.accountId);
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
        activeAccounts.forEach(acc => {
          if ((acc.type === 'savings' || acc.id === 'acc_savings') && t.accountId !== acc.id) {
            map[acc.id] = (map[acc.id] || 0) + amt;
          }
        });
      }
    });

    Object.keys(map).forEach(accId => {
      map[accId] = parseFloat(map[accId].toFixed(2));
    });

    return map;
  }, [activeAccounts, transactions]);

  const derivedAccounts = useMemo(() => {
    return activeAccounts.map(acc => ({
      ...acc,
      balance: accountBalancesMap[acc.id] ?? parseFloat(Number(acc.initialBalance || 0).toFixed(2))
    }));
  }, [activeAccounts, accountBalancesMap]);

  const getAccountBalance = useCallback((accountId: string): number => {
    if (accountBalancesMap[accountId] !== undefined) {
      return accountBalancesMap[accountId];
    }
    const account = activeAccounts.find(a => a.id === accountId);
    if (!account) return 0;
    return parseFloat(Number(account.initialBalance || 0).toFixed(2));
  }, [accountBalancesMap, activeAccounts]);

  const reconcileBalance = (accountId: string, realBalance: number) => {
    const currentBalance = getAccountBalance(accountId);
    const diff = parseFloat((realBalance - currentBalance).toFixed(2));
    if (Math.abs(diff) < 0.01) return;
    const targetAcc = activeAccounts.find(a => a.id === accountId);
    const accScope: ScopeType =
      targetAcc && (targetAcc.scope === 'BUSINESS' || targetAcc.vinculo === 'MUSICO')
        ? 'BUSINESS'
        : 'PERSONAL';
    const cat = categories.find(c => c.id === 'cat_adjustment' || c.type === 'adjustment') || categories[0];
    const absDiff = Math.abs(diff);
    const type: TransactionType = diff > 0 ? 'income' : 'expense';

    addTransaction({
      amount: Number(absDiff.toFixed(2)),
      type,
      description: 'Ajuste de Saldo',
      date: getLocalDateString(),
      status: 'paid',
      accountId,
      scope: accScope,
      categoryId: cat ? cat.id : 'cat_adjustment'
    });
  };

  const addTransaction = (t: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => {
    const fixedGroupId = t.isFixed ? generateUUID() : undefined;
    const tid = t.id || generateUUID();
    const cleanAmount = Math.abs(Number(t.amount)) || 0;
    const isShowTx = Boolean(t.showId) || Boolean(t.isEventTransaction) || Boolean(t.showPaymentId) || Boolean(t.showExpenseId) || Boolean(t.costGroup);

    let resolvedCategoryId = t.categoryId;
    let resolvedCostGroup = t.costGroup;
    let resolvedSubcategory = t.subcategory;

    if (isShowTx) {
      if (t.type === 'income') {
        resolvedCategoryId = resolvedCategoryId || resolveIncomeCategoryId(categories);
      } else if (t.type === 'expense') {
        const cls = resolveShowExpenseClassification({
          costGroup: t.costGroup,
          subcategory: t.subcategory,
          categoryId: t.categoryId,
          description: t.description
        });
        resolvedCategoryId = cls.categoryId;
        resolvedCostGroup = cls.costGroup;
        resolvedSubcategory = cls.subcategory;
      }

      const validation = validateShowTransaction({ ...t, categoryId: resolvedCategoryId }, true);
      if (!validation.valid) {
        console.error(validation.error);
        throw new Error(validation.error);
      }
    }

    const cleanScope: ScopeType =
      t.scope ||
      (isShowTx ||
      resolvedCategoryId === 'cat_33' ||
      resolvedCategoryId === 'cat_equipamentos' ||
      resolvedCategoryId === 'cat_logistica_shows' ||
      resolvedCategoryId === 'cat_producao_shows'
        ? 'BUSINESS'
        : activeScope === 'BUSINESS'
        ? 'BUSINESS'
        : 'PERSONAL');

    let finalTxDate = t.date;
    let finalTxStatus = t.status || 'paid';
    let resolvedShowName = t.showName;
    if (t.showId) {
      const targetShow = shows.find(s => s.id === t.showId);
      if (targetShow) {
        resolvedShowName = targetShow.contractorName || targetShow.name;
        if (!finalTxDate && targetShow.date) {
          finalTxDate = targetShow.date;
        }
        if (!t.status && t.type === 'expense' && targetShow.status !== 'Realizado') {
          finalTxStatus = 'pending';
        }
      }
    }

    const resolvedShowPaymentId =
      t.showId && t.type === 'income' ? (t.showPaymentId || generateUUID()) : t.showPaymentId;
    const resolvedShowExpenseId =
      t.showId && t.type === 'expense' ? (t.showExpenseId || generateUUID()) : t.showExpenseId;

    const fullTx: Transaction = {
      ...t,
      id: tid,
      amount: cleanAmount,
      date: finalTxDate,
      status: finalTxStatus,
      categoryId: resolvedCategoryId,
      category: resolvedCategoryId,
      costGroup: resolvedCostGroup,
      subcategory: resolvedSubcategory,
      showName: resolvedShowName,
      showPaymentId: resolvedShowPaymentId,
      showExpenseId: resolvedShowExpenseId,
      isEventTransaction: isShowTx ? true : t.isEventTransaction,
      scope: cleanScope,
      createdAt: Date.now(),
      fixedGroupId
    };

    const recurTxs: Transaction[] = [];
    if (t.isFixed && fixedGroupId) {
      for (let i = 1; i < 12; i++) {
        const d = new Date(t.date + 'T12:00:00');
        d.setMonth(d.getMonth() + i);
        const recurTx: Transaction = {
          ...fullTx,
          id: generateUUID(),
          date: getLocalDateString(d),
          status: 'pending',
          createdAt: Date.now() + i,
          fixedGroupId,
          amount: cleanAmount,
          scope: cleanScope
        };
        recurTxs.push(recurTx);
      }
    }

    setTransactions(prev => {
      const txs = deduplicateItemsById([...prev, fullTx, ...recurTxs]);
      StorageService.saveTransactions(txs);
      return txs;
    });

    if (currentUser) {
      saveTransactionToFirestore(currentUser.uid, fullTx);
      recurTxs.forEach(recurTx => saveTransactionToFirestore(currentUser.uid, recurTx));
    }

    if (fullTx.showId) {
      const defaultAccId = getDefaultAccountForScope('BUSINESS');
      const targetShowInState = shows.find(s => s.id === fullTx.showId);
      if (targetShowInState) {
        let updatedTargetShow: Show = targetShowInState;
        if (fullTx.type === 'income') {
          const payments = Array.isArray(targetShowInState.payments) ? [...targetShowInState.payments] : [];
          const descLower = (fullTx.description || '').toLowerCase();
          const isOvertime =
            fullTx.showPaymentType === 'Hora Extra' ||
            fullTx.showPaymentType === 'Extra' ||
            descLower.includes('hora extra');
          const isCouvert =
            fullTx.showPaymentType === 'Couvert' ||
            fullTx.showPaymentType === 'Gorjeta' ||
            fullTx.showPaymentType === 'Bônus' ||
            descLower.includes('couvert') ||
            descLower.includes('gorjeta');

          const pType: ShowPaymentType =
            fullTx.showPaymentType ||
            (isOvertime
              ? 'Hora Extra'
              : isCouvert
              ? 'Couvert'
              : descLower.includes('sinal')
              ? 'Sinal'
              : 'Cachê Principal');

          const existingIdx = payments.findIndex(
            p => p.transactionId === tid || (resolvedShowPaymentId && p.id === resolvedShowPaymentId)
          );

          const updatedPayment: ShowPayment = {
            id:
              existingIdx >= 0 && payments[existingIdx].id
                ? payments[existingIdx].id
                : resolvedShowPaymentId || generateUUID(),
            type: pType,
            amount: cleanAmount,
            status: fullTx.status === 'paid' ? 'Recebido' : 'Agendado',
            expectedDate: fullTx.date,
            effectiveDate: fullTx.status === 'paid' ? fullTx.date : undefined,
            accountId: fullTx.accountId || defaultAccId,
            notes: fullTx.description,
            transactionId: tid
          };

          if (existingIdx >= 0) {
            payments[existingIdx] = updatedPayment;
          } else {
            payments.push(updatedPayment);
          }

          updatedTargetShow = normalizeShowFinancials({ ...targetShowInState, payments }, defaultAccId);
        } else if (fullTx.type === 'expense') {
          const cls = resolveShowExpenseClassification({
            costGroup: fullTx.costGroup,
            subcategory: fullTx.subcategory,
            categoryId: fullTx.categoryId,
            description: fullTx.description
          });
          const expId = resolvedShowExpenseId || generateUUID();

          if (cls.costGroup === 'logistica') {
            const logistics = Array.isArray(targetShowInState.logistics) ? [...targetShowInState.logistics] : [];
            const existingIdx = logistics.findIndex(l => l.transactionId === tid || l.id === expId);
            const item = {
              id: existingIdx >= 0 && logistics[existingIdx].id ? logistics[existingIdx].id : expId,
              type: cls.logisticsType,
              costGroup: 'logistica' as const,
              subcategory: cls.subcategory as ShowLogisticsSubcategory,
              description: fullTx.description || cls.subcategory,
              amount: cleanAmount,
              status: (fullTx.status === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending',
              transactionId: tid
            };
            if (existingIdx >= 0) logistics[existingIdx] = item;
            else logistics.push(item);
            updatedTargetShow = normalizeShowFinancials({ ...targetShowInState, logistics }, defaultAccId);
          } else if (cls.costGroup === 'musicos') {
            const crewMembers = Array.isArray(targetShowInState.crewMembers) ? [...targetShowInState.crewMembers] : [];
            const existingIdx = crewMembers.findIndex(c => c.transactionId === tid || c.id === expId);
            const item = {
              id: existingIdx >= 0 && crewMembers[existingIdx].id ? crewMembers[existingIdx].id : expId,
              name: fullTx.description || 'Músico / Apoio',
              role: 'Cachê de Terceiros / Equipe',
              costGroup: 'musicos' as const,
              subcategory: 'Cachê de Terceiros / Equipe' as const,
              cacheAmount: cleanAmount,
              status: (fullTx.status === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending',
              transactionId: tid
            };
            if (existingIdx >= 0) crewMembers[existingIdx] = item;
            else crewMembers.push(item);
            updatedTargetShow = normalizeShowFinancials({ ...targetShowInState, crewMembers }, defaultAccId);
          } else {
            const otherExpenses = Array.isArray(targetShowInState.otherExpenses) ? [...targetShowInState.otherExpenses] : [];
            const existingIdx = otherExpenses.findIndex(o => o.transactionId === tid || o.id === expId);
            const item = {
              id: existingIdx >= 0 && otherExpenses[existingIdx].id ? otherExpenses[existingIdx].id : expId,
              category: cls.subcategory,
              subcategory: cls.subcategory as ShowEquipmentSubcategory,
              costGroup: 'equipamentos' as const,
              description: fullTx.description || cls.subcategory,
              amount: cleanAmount,
              status: (fullTx.status === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending',
              transactionId: tid
            };
            if (existingIdx >= 0) otherExpenses[existingIdx] = item;
            else otherExpenses.push(item);
            updatedTargetShow = normalizeShowFinancials({ ...targetShowInState, otherExpenses }, defaultAccId);
          }
        }

        setShows(prevShows => {
          const updated = prevShows.map(show => (show.id === updatedTargetShow.id ? updatedTargetShow : show));
          StorageService.saveShows(updated);
          return deduplicateItemsById(updated);
        });

        if (currentUser) {
          saveShowToFirestore(currentUser.uid, updatedTargetShow);
        }
      }
    }
  };

  const importTransactions = (newTxs: Array<Omit<Transaction, 'id' | 'createdAt'> & { id?: string }>) => {
    const itemsToAdd: Transaction[] = newTxs.map((t, idx) => {
      const tid = t.id || generateUUID();
      const cleanAmount = Math.abs(Number(t.amount)) || 0;
      const cleanScope: ScopeType = (t.scope === 'BUSINESS' || t.categoryId === 'cat_33' || t.categoryId === 'cat_equipamentos' || t.categoryId === 'cat_logistica_shows' || t.categoryId === 'cat_producao_shows') ? 'BUSINESS' : 'PERSONAL';
      return {
        ...t,
        id: tid,
        amount: cleanAmount,
        scope: cleanScope,
        status: t.status || 'paid',
        createdAt: Date.now() + idx
      };
    });

    setTransactions(prev => {
      const txs = deduplicateItemsById([...prev, ...itemsToAdd]);
      StorageService.saveTransactions(txs);
      return txs;
    });

    if (currentUser) {
      itemsToAdd.forEach(item => saveTransactionToFirestore(currentUser.uid, item));
    }
  };

  const updateTransaction = (updatedT: Transaction) => {
    const cleanAmount = Math.abs(Number(updatedT.amount)) || 0;
    const isShowTx = Boolean(updatedT.showId) || Boolean(updatedT.isEventTransaction);

    let resolvedCategoryId = updatedT.categoryId;
    let resolvedCostGroup = updatedT.costGroup;
    let resolvedSubcategory = updatedT.subcategory;

    if (isShowTx && updatedT.showId) {
      if (updatedT.type === 'income') {
        resolvedCategoryId = resolvedCategoryId || resolveIncomeCategoryId(categories);
      } else if (updatedT.type === 'expense') {
        const cls = resolveShowExpenseClassification({
          costGroup: updatedT.costGroup,
          subcategory: updatedT.subcategory,
          categoryId: updatedT.categoryId,
          description: updatedT.description
        });
        resolvedCategoryId = cls.categoryId;
        resolvedCostGroup = cls.costGroup;
        resolvedSubcategory = cls.subcategory;
      }

      const validation = validateShowTransaction({ ...updatedT, categoryId: resolvedCategoryId }, true);
      if (!validation.valid) {
        console.error(validation.error);
        throw new Error(validation.error);
      }
    }

    const cleanScope =
      updatedT.scope === 'BUSINESS' ||
      Boolean(updatedT.showId) ||
      resolvedCategoryId === 'cat_33' ||
      resolvedCategoryId === 'cat_equipamentos' ||
      resolvedCategoryId === 'cat_logistica_shows' ||
      resolvedCategoryId === 'cat_producao_shows'
        ? 'BUSINESS'
        : 'PERSONAL';

    const cleanT: Transaction = {
      ...updatedT,
      amount: cleanAmount,
      categoryId: resolvedCategoryId,
      category: resolvedCategoryId,
      costGroup: resolvedCostGroup,
      subcategory: resolvedSubcategory,
      isEventTransaction: Boolean(updatedT.showId),
      scope: cleanScope
    };

    setTransactions(prev => {
      const txs = prev.map(t => (t.id === cleanT.id ? cleanT : t));
      StorageService.saveTransactions(txs);
      return txs;
    });

    if (currentUser) {
      saveTransactionToFirestore(currentUser.uid, cleanT);
    }

    // Sincronização bidirecional automática com o módulo de Shows
    const defaultAccId = getDefaultAccountForScope('BUSINESS');
    setShows(prevShows => {
      let showsModified = false;
      const updatedShows = prevShows.map(show => {
        const isDirectMatch = show.id === cleanT.showId;
        const hasPaymentMatch =
          show.payments &&
          show.payments.some(p => p.transactionId === cleanT.id || (cleanT.showPaymentId && p.id === cleanT.showPaymentId));
        const hasCrewMatch =
          show.crewMembers &&
          show.crewMembers.some(c => c.transactionId === cleanT.id || (cleanT.showExpenseId && c.id === cleanT.showExpenseId));
        const hasLogisticsMatch =
          show.logistics &&
          show.logistics.some(l => l.transactionId === cleanT.id || (cleanT.showExpenseId && l.id === cleanT.showExpenseId));
        const hasOtherMatch =
          show.otherExpenses &&
          show.otherExpenses.some(o => o.transactionId === cleanT.id || (cleanT.showExpenseId && o.id === cleanT.showExpenseId));
        const hasExpenseMatch =
          show.expenseItems &&
          show.expenseItems.some(e => e.transactionId === cleanT.id || (cleanT.showExpenseId && e.id === cleanT.showExpenseId));

        if (!isDirectMatch && !hasPaymentMatch && !hasCrewMatch && !hasLogisticsMatch && !hasOtherMatch && !hasExpenseMatch) {
          return show;
        }

        showsModified = true;

        // Se a transação foi desvinculada deste show (cleanT.showId !== show.id), remove dos itens deste show
        if (cleanT.showId !== show.id) {
          const filteredShow: Show = {
            ...show,
            payments: (show.payments || []).filter(p => p.transactionId !== cleanT.id && p.id !== cleanT.showPaymentId),
            crewMembers: (show.crewMembers || []).filter(c => c.transactionId !== cleanT.id && c.id !== cleanT.showExpenseId),
            logistics: (show.logistics || []).filter(l => l.transactionId !== cleanT.id && l.id !== cleanT.showExpenseId),
            otherExpenses: (show.otherExpenses || []).filter(o => o.transactionId !== cleanT.id && o.id !== cleanT.showExpenseId),
            expenseItems: (show.expenseItems || []).filter(e => e.transactionId !== cleanT.id && e.id !== cleanT.showExpenseId)
          };
          return normalizeShowFinancials(filteredShow, defaultAccId);
        }

        let newPayments = Array.isArray(show.payments) ? [...show.payments] : [];
        if (cleanT.type === 'income') {
          let matched = false;
          newPayments = newPayments.map(p => {
            if ((cleanT.showPaymentId && p.id === cleanT.showPaymentId) || p.transactionId === cleanT.id) {
              matched = true;
              return {
                ...p,
                type: cleanT.showPaymentType || p.type || 'Cachê Principal',
                amount: cleanAmount,
                status: cleanT.status === 'paid' ? ('Recebido' as const) : ('Agendado' as const),
                effectiveDate: cleanT.status === 'paid' ? p.effectiveDate || cleanT.date : undefined,
                expectedDate: cleanT.date || p.expectedDate,
                accountId: cleanT.accountId || p.accountId
              };
            }
            return p;
          });
          if (!matched) {
            newPayments.push({
              id: cleanT.showPaymentId || generateUUID(),
              type: cleanT.showPaymentType || 'Cachê Principal',
              amount: cleanAmount,
              status: cleanT.status === 'paid' ? 'Recebido' : 'Agendado',
              expectedDate: cleanT.date,
              effectiveDate: cleanT.status === 'paid' ? cleanT.date : undefined,
              accountId: cleanT.accountId || defaultAccId,
              notes: cleanT.description,
              transactionId: cleanT.id
            });
          }
        }

        const newCrew = (show.crewMembers || []).map(c => {
          if (c.transactionId === cleanT.id || (cleanT.showExpenseId && c.id === cleanT.showExpenseId)) {
            return {
              ...c,
              cacheAmount: cleanAmount,
              status: (cleanT.status === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending'
            };
          }
          return c;
        });

        const newLogistics = (show.logistics || []).map(l => {
          if (l.transactionId === cleanT.id || (cleanT.showExpenseId && l.id === cleanT.showExpenseId)) {
            return {
              ...l,
              amount: cleanAmount,
              status: (cleanT.status === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending'
            };
          }
          return l;
        });

        const newOther = (show.otherExpenses || []).map(o => {
          if (o.transactionId === cleanT.id || (cleanT.showExpenseId && o.id === cleanT.showExpenseId)) {
            return {
              ...o,
              amount: cleanAmount,
              status: (cleanT.status === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending'
            };
          }
          return o;
        });

        const newExpenses = (show.expenseItems || []).map(e => {
          if ((cleanT.showExpenseId && e.id === cleanT.showExpenseId) || e.transactionId === cleanT.id) {
            return {
              ...e,
              amount: cleanAmount,
              date: cleanT.date || e.date,
              accountId: cleanT.accountId || e.accountId,
              status: (cleanT.status === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending'
            };
          }
          return e;
        });

        return normalizeShowFinancials(
          {
            ...show,
            payments: newPayments,
            crewMembers: newCrew,
            logistics: newLogistics,
            otherExpenses: newOther,
            expenseItems: newExpenses
          },
          defaultAccId
        );
      });

      if (showsModified) {
        StorageService.saveShows(updatedShows);
        if (currentUser) {
          updatedShows.forEach(s => saveShowToFirestore(currentUser.uid, s));
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
    const targetTx = transactions.find(t => t.id === id);

    setTransactions(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      let toDelete: Transaction[] = [];
      let remainingTxs: Transaction[] = [];

      if (deleteSeries && target.fixedGroupId) {
        toDelete = prev.filter(t => t.fixedGroupId === target.fixedGroupId);
        remainingTxs = prev.filter(t => t.fixedGroupId !== target.fixedGroupId);
      } else {
        toDelete = [target];
        remainingTxs = prev.filter(t => t.id !== id);
      }

      // Garante que cada transação restante preserve amount positivo (Math.abs) e type estrito ('income' | 'expense'),
      // de modo que o estorno no Derived State (accountBalancesMap) opere matematicamente sem duplo sinal negativo:
      // - Excluir DESPESA ('expense') -> Remove subtração (-Math.abs(amount)), aumentando o saldo em +Math.abs(amount)
      // - Excluir RECEITA ('income') -> Remove adição (+Math.abs(amount)), reduzindo o saldo em -Math.abs(amount)
      const normalizedRemaining = remainingTxs.map(t => normalizeTransactionRecord(t, activeAccounts));

      if (currentUser) {
        toDelete.forEach(t => deleteTransactionFromFirestore(currentUser.uid, t.id));
      }

      StorageService.saveTransactions(normalizedRemaining);
      return normalizedRemaining;
    });

    // Se a transação estiver vinculada a um show, remove a associação sem jamais recriar pagamentos sintéticos
    const defaultAccId = getDefaultAccountForScope('BUSINESS');
    setShows(prevShows => {
      let modified = false;
      const updated = prevShows.map(show => {
        let changed = false;

        const updatedPayments = (show.payments || []).filter(p => {
          if (p.transactionId === id || (targetTx?.showPaymentId && p.id === targetTx.showPaymentId)) {
            changed = true;
            return false;
          }
          return true;
        });

        const updatedCrew = (show.crewMembers || []).filter(c => {
          if (c.transactionId === id || (targetTx?.showExpenseId && c.id === targetTx.showExpenseId)) {
            changed = true;
            return false;
          }
          return true;
        });

        const updatedLogistics = (show.logistics || []).filter(l => {
          if (l.transactionId === id || (targetTx?.showExpenseId && l.id === targetTx.showExpenseId)) {
            changed = true;
            return false;
          }
          return true;
        });

        const updatedOther = (show.otherExpenses || []).filter(o => {
          if (o.transactionId === id || (targetTx?.showExpenseId && o.id === targetTx.showExpenseId)) {
            changed = true;
            return false;
          }
          return true;
        });

        const updatedExpenses = (show.expenseItems || []).filter(e => {
          if (e.transactionId === id || (targetTx?.showExpenseId && e.id === targetTx.showExpenseId)) {
            changed = true;
            return false;
          }
          return true;
        });

        if (changed || (targetTx?.showId && show.id === targetTx.showId)) {
          modified = true;
          const remainingGross = updatedPayments
            .filter(p => p && p.status !== 'Cancelado')
            .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
          const remainingReceived = updatedPayments
            .filter(p => p && p.status === 'Recebido')
            .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
          const remainingExtra = updatedPayments
            .filter(p => p && (p.type === 'Extra' || p.type === 'Hora Extra' || p.type === 'Couvert' || p.type === 'Gorjeta' || p.type === 'Bônus'))
            .reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);

          const newShow: Show = {
            ...show,
            totalCache: remainingGross,
            cacheCombined: remainingGross,
            cacheReceived: remainingReceived,
            extraAmount: remainingExtra,
            payments: updatedPayments,
            crewMembers: updatedCrew,
            logistics: updatedLogistics,
            otherExpenses: updatedOther,
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
      const exists = prev.some(sh => sh.id === updatedShow.id);
      const updated = exists
        ? prev.map(sh => (sh.id === updatedShow.id ? updatedShow : sh))
        : [...prev, updatedShow];
      StorageService.saveShows(updated);
      return deduplicateItemsById(updated);
    });

    setTransactions(updatedTransactions);
    StorageService.saveTransactions(updatedTransactions);

    if (currentUser) {
      saveShowToFirestore(currentUser.uid, updatedShow);
      updatedTransactions.filter(t => t.showId === updatedShow.id).forEach(t => saveTransactionToFirestore(currentUser.uid, t));
    }
  };

  const updateShow = (s: Show) => {
    const defaultAccId = getDefaultAccountForScope('BUSINESS');
    const normalized = normalizeShowFinancials(s, defaultAccId);

    let currentTxs = transactions;
    if (s.status === 'Cancelado') {
      currentTxs = cancelShowFutureTransactions(s.id, currentTxs);
    }

    const prevShowTxIds = new Set(currentTxs.filter(t => t.showId === s.id).map(t => t.id));
    let { updatedShow, updatedTransactions } = syncShowWithTransactions(normalized, currentTxs, categories);

    if (s.status === 'Cancelado') {
      updatedTransactions = cancelShowFutureTransactions(s.id, updatedTransactions);
    }

    const nextShowTxIds = new Set(updatedTransactions.filter(t => t.showId === s.id).map(t => t.id));

    setTransactions(updatedTransactions);
    StorageService.saveTransactions(updatedTransactions);

    setShows(prevShows => {
      const exists = prevShows.some(show => show.id === s.id);
      const updated = exists
        ? prevShows.map(show => (show.id === s.id ? updatedShow : show))
        : [...prevShows, updatedShow];
      StorageService.saveShows(updated.filter(sh => !String(sh.id).startsWith('show_legacy_')));
      return deduplicateItemsById(updated);
    });

    if (currentUser) {
      saveShowToFirestore(currentUser.uid, updatedShow);
      updatedTransactions.filter(t => t.showId === s.id).forEach(t => saveTransactionToFirestore(currentUser.uid, t));
      prevShowTxIds.forEach(oldId => {
        if (!nextShowTxIds.has(oldId)) {
          deleteTransactionFromFirestore(currentUser.uid, oldId);
        }
      });
    }
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

  const linkTransactionToShow = (
    transactionId: string,
    showId: string,
    options?: {
      paymentType?: ShowPaymentType;
      costGroup?: ShowCostGroup;
      subcategory?: ShowExpenseSubcategory;
    }
  ) => {
    if (!showId || !showId.trim()) {
      throw new Error('Validação falhou: O showId é obrigatório para vincular uma transação a um evento.');
    }

    const targetShow = shows.find(s => s.id === showId);
    const targetTx = transactions.find(t => t.id === transactionId);
    if (!targetShow || !targetTx) return;

    const defaultAccId = getDefaultAccountForScope('BUSINESS');
    const showTitle = (targetShow.contractorName || targetShow.name || 'Show').trim();
    const incomeCatId = resolveIncomeCategoryId(categories);

    let updatedTx: Transaction;
    let syntheticPendingTxIdToRemove: string | null = null;
    let updatedShowObj: Show = { ...targetShow };

    if (targetTx.type === 'income') {
      const descLower = (targetTx.description || '').toLowerCase();
      const paymentType: ShowPaymentType =
        options?.paymentType ||
        targetTx.showPaymentType ||
        (descLower.includes('hora extra')
          ? 'Hora Extra'
          : descLower.includes('couvert')
          ? 'Couvert'
          : descLower.includes('gorjeta')
          ? 'Gorjeta'
          : 'Cachê Principal');

      let payments = Array.isArray(updatedShowObj.payments) ? [...updatedShowObj.payments] : [];
      let paymentId = targetTx.showPaymentId || generateUUID();

      // Se estamos vinculando um recebimento real de Cachê Principal e o show tinha uma parcela sintética agendada pendente, substitui sem duplicar
      const existingPendingIdx =
        paymentType === 'Cachê Principal'
          ? payments.findIndex(p => p.status !== 'Recebido' && p.type === 'Cachê Principal')
          : -1;

      if (existingPendingIdx >= 0) {
        const pendingPayment = payments[existingPendingIdx];
        paymentId = pendingPayment.id || paymentId;
        if (pendingPayment.transactionId && pendingPayment.transactionId !== transactionId) {
          syntheticPendingTxIdToRemove = pendingPayment.transactionId;
        }
        payments[existingPendingIdx] = {
          ...pendingPayment,
          id: paymentId,
          type: paymentType,
          amount: Number(targetTx.amount) || 0,
          status: targetTx.status === 'paid' ? 'Recebido' : 'Agendado',
          expectedDate: targetTx.date || updatedShowObj.date,
          effectiveDate: targetTx.status === 'paid' ? targetTx.date : undefined,
          accountId: targetTx.accountId || defaultAccId,
          notes: targetTx.description,
          transactionId: targetTx.id
        };
      } else {
        const existingIdx = payments.findIndex(p => p.transactionId === targetTx.id || p.id === paymentId);
        const newPayment: ShowPayment = {
          id: paymentId,
          type: paymentType,
          amount: Number(targetTx.amount) || 0,
          status: targetTx.status === 'paid' ? 'Recebido' : 'Agendado',
          expectedDate: targetTx.date || updatedShowObj.date,
          effectiveDate: targetTx.status === 'paid' ? targetTx.date : undefined,
          accountId: targetTx.accountId || defaultAccId,
          notes: targetTx.description,
          transactionId: targetTx.id
        };
        if (existingIdx >= 0) payments[existingIdx] = newPayment;
        else payments.push(newPayment);
      }

      updatedTx = {
        ...targetTx,
        showId: targetShow.id,
        showName: showTitle,
        showPaymentId: paymentId,
        showPaymentType: paymentType,
        categoryId: incomeCatId,
        category: incomeCatId,
        isEventTransaction: true,
        scope: 'BUSINESS'
      };

      const check = validateShowTransaction(updatedTx, true);
      if (!check.valid) throw new Error(check.error);

      updatedShowObj = normalizeShowFinancials({ ...updatedShowObj, payments }, defaultAccId);
    } else {
      const cls = resolveShowExpenseClassification({
        costGroup: options?.costGroup || targetTx.costGroup,
        subcategory: options?.subcategory || targetTx.subcategory,
        categoryId: targetTx.categoryId,
        description: targetTx.description
      });
      const expenseId = targetTx.showExpenseId || generateUUID();

      updatedTx = {
        ...targetTx,
        showId: targetShow.id,
        showName: showTitle,
        showExpenseId: expenseId,
        costGroup: cls.costGroup,
        subcategory: cls.subcategory,
        categoryId: cls.categoryId,
        category: cls.categoryId,
        isEventTransaction: true,
        scope: 'BUSINESS'
      };

      const check = validateShowTransaction(updatedTx, true);
      if (!check.valid) throw new Error(check.error);

      if (cls.costGroup === 'logistica') {
        const logistics = Array.isArray(updatedShowObj.logistics) ? [...updatedShowObj.logistics] : [];
        if (!logistics.some(l => l.transactionId === targetTx.id || l.id === expenseId)) {
          logistics.push({
            id: expenseId,
            type: cls.logisticsType,
            costGroup: 'logistica',
            subcategory: cls.subcategory as ShowLogisticsSubcategory,
            description: targetTx.description || cls.subcategory,
            amount: Number(targetTx.amount) || 0,
            status: targetTx.status === 'paid' ? 'paid' : 'pending',
            transactionId: targetTx.id
          });
        }
        updatedShowObj = normalizeShowFinancials({ ...updatedShowObj, logistics }, defaultAccId);
      } else if (cls.costGroup === 'musicos') {
        const crewMembers = Array.isArray(updatedShowObj.crewMembers) ? [...updatedShowObj.crewMembers] : [];
        if (!crewMembers.some(c => c.transactionId === targetTx.id || c.id === expenseId)) {
          crewMembers.push({
            id: expenseId,
            name: targetTx.description || 'Músico / Apoio',
            role: 'Cachê de Terceiros / Equipe',
            costGroup: 'musicos',
            subcategory: 'Cachê de Terceiros / Equipe',
            cacheAmount: Number(targetTx.amount) || 0,
            status: targetTx.status === 'paid' ? 'paid' : 'pending',
            transactionId: targetTx.id
          });
        }
        updatedShowObj = normalizeShowFinancials({ ...updatedShowObj, crewMembers }, defaultAccId);
      } else {
        const otherExpenses = Array.isArray(updatedShowObj.otherExpenses) ? [...updatedShowObj.otherExpenses] : [];
        if (!otherExpenses.some(o => o.transactionId === targetTx.id || o.id === expenseId)) {
          otherExpenses.push({
            id: expenseId,
            category: cls.subcategory,
            subcategory: cls.subcategory as ShowEquipmentSubcategory,
            costGroup: 'equipamentos',
            description: targetTx.description || cls.subcategory,
            amount: Number(targetTx.amount) || 0,
            status: targetTx.status === 'paid' ? 'paid' : 'pending',
            transactionId: targetTx.id
          });
        }
        updatedShowObj = normalizeShowFinancials({ ...updatedShowObj, otherExpenses }, defaultAccId);
      }
    }

    const nextTransactions = transactions
      .filter(t => t.id !== syntheticPendingTxIdToRemove)
      .map(t => (t.id === transactionId ? updatedTx : t));

    const summary = getShowFinancialSummary(updatedShowObj, nextTransactions);
    updatedShowObj = {
      ...updatedShowObj,
      totalCache: summary.realGrossCache,
      cacheCombined: summary.realGrossCache,
      cacheReceived: summary.totalReceived,
      extraAmount: summary.extraAmount
    };

    const nextShows = shows.map(s => (s.id === showId ? updatedShowObj : s));

    setTransactions(nextTransactions);
    StorageService.saveTransactions(nextTransactions);
    setShows(nextShows);
    StorageService.saveShows(nextShows);

    if (currentUser) {
      if (syntheticPendingTxIdToRemove) {
        deleteTransactionFromFirestore(currentUser.uid, syntheticPendingTxIdToRemove);
      }
      saveTransactionToFirestore(currentUser.uid, updatedTx);
      saveShowToFirestore(currentUser.uid, updatedShowObj);
    }
  };

  const unlinkTransactionFromShow = (transactionId: string) => {
    const targetTx = transactions.find(t => t.id === transactionId);
    if (!targetTx || !targetTx.showId) return;

    const affectedShowId = targetTx.showId;
    const defaultAccId = getDefaultAccountForScope('BUSINESS');

    const updatedTx: Transaction = {
      ...targetTx,
      showId: undefined,
      showName: undefined,
      showPaymentId: undefined,
      showPaymentType: undefined,
      showExpenseId: undefined,
      costGroup: undefined,
      subcategory: undefined,
      isEventTransaction: false
    };

    const nextTransactions = transactions.map(t => (t.id === transactionId ? updatedTx : t));
    setTransactions(nextTransactions);
    StorageService.saveTransactions(nextTransactions);

    if (currentUser) {
      saveTransactionToFirestore(currentUser.uid, updatedTx);
    }

    setShows(prevShows => {
      const nextShows = prevShows.map(s => {
        if (s.id !== affectedShowId) return s;

        const cleaned: Show = {
          ...s,
          payments: (s.payments || []).filter(
            p => p.transactionId !== transactionId && p.id !== targetTx.showPaymentId
          ),
          crewMembers: (s.crewMembers || []).filter(
            c => c.transactionId !== transactionId && c.id !== targetTx.showExpenseId
          ),
          logistics: (s.logistics || []).filter(
            l => l.transactionId !== transactionId && l.id !== targetTx.showExpenseId
          ),
          otherExpenses: (s.otherExpenses || []).filter(
            o => o.transactionId !== transactionId && o.id !== targetTx.showExpenseId
          ),
          expenseItems: (s.expenseItems || []).filter(
            e => e.transactionId !== transactionId && e.id !== targetTx.showExpenseId
          )
        };

        const normalized = normalizeShowFinancials(cleaned, defaultAccId);
        const summary = getShowFinancialSummary(normalized, nextTransactions);
        const finalShow: Show = {
          ...normalized,
          totalCache: summary.realGrossCache,
          cacheCombined: summary.realGrossCache,
          cacheReceived: summary.totalReceived,
          extraAmount: summary.extraAmount
        };

        if (currentUser) {
          saveShowToFirestore(currentUser.uid, finalShow);
        }
        return finalShow;
      });

      StorageService.saveShows(nextShows);
      return nextShows;
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

      let txDate = l.date || getLocalDateString();
      let txStatus: TransactionStatus = 'paid';
      if (l.showId) {
        const targetShow = shows.find(s => s.id === l.showId);
        if (targetShow) {
          if (targetShow.date) txDate = targetShow.date;
          if (targetShow.status !== 'Realizado') txStatus = 'pending';
        }
      }

      addTransaction({
        id: txId,
        description: `Locomoção (${l.type.toUpperCase()}): ${l.title || 'Deslocamento'}`,
        amount: l.amount,
        type: 'expense',
        categoryId: 'cat_logistica_shows',
        costGroup: 'logistica',
        subcategory: l.type === 'toll' || l.type === 'parking' ? 'Pedágio' : l.type === 'lodging' ? 'Hospedagem' : 'Combustível',
        accountId: l.accountId || defaultAcc,
        date: txDate,
        status: txStatus,
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

      let txDate = c.date || getLocalDateString();
      let txStatus: TransactionStatus = 'paid';
      if (c.showId) {
        const targetShow = shows.find(s => s.id === c.showId);
        if (targetShow) {
          if (targetShow.date) txDate = targetShow.date;
          if (targetShow.status !== 'Realizado') txStatus = 'pending';
        }
      }

      addTransaction({
        id: txId,
        description: `Música (${c.category.toUpperCase()}): ${c.title || 'Despesa'}`,
        amount: c.amount,
        type: 'expense',
        categoryId: catId,
        accountId: c.accountId || defaultAcc,
        date: txDate,
        status: txStatus,
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

    const filteredAccounts = activeAccounts.filter(acc => matchesScope(acc.scope, currentScope));
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
      const amount = Math.abs(Number(t.amount)) || 0;
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

  const normalizedTransactions = useMemo(() => {
    return deduplicateItemsById(transactions).map(t => normalizeTransactionRecord(t, activeAccounts));
  }, [transactions, activeAccounts]);

  const normalizedShows = useMemo(() => {
    const defaultBizAcc =
      activeAccounts.find(a => a.scope === 'BUSINESS' || a.vinculo === 'MUSICO')?.id ||
      (activeAccounts[0]?.id || 'acc_mp');
    return deduplicateItemsById(shows).map(s => normalizeShowFinancials(s, defaultBizAcc));
  }, [shows, activeAccounts]);

  const handleSignInWithGoogle = async () => {
    await signInWithGoogle();
  };

  const restoreAutoBackup = () => { if (StorageService.restoreAutoBackup()) { refreshData(); return true; } return false; };
  const getBackupInfo = () => StorageService.getAutoBackupInfo();
  const requestNotificationPermission = () => NotificationService.requestPermission();

  return (
    <FinanceContext.Provider value={{
      transactions: normalizedTransactions, categories, debts, accounts: derivedAccounts, budgets, shows: normalizedShows, venues, crew, locomotionExpenses, musicCostItems, settings, isBlurred, toggleBlur,
      activeScope, setActiveScope, getDefaultAccountForScope,
      addTransaction, importTransactions, updateTransaction, updateTransactionSeries, updateDebtTransaction, recalculateDebtSeries, deleteTransaction, checkTransactionImpact,
      addCategory, updateCategory, deleteCategory,
      addAccount, updateAccount, deleteAccount, reconcileBalance, getAccountBalance,
      addDebt, updateDebt, deleteDebt, getDebtProgress,
      saveBudget, deleteBudget,
      addShow, updateShow, deleteShow, cancelShowFutureFinancials, linkTransactionToShow, unlinkTransactionFromShow,
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
