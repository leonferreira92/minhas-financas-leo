
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Transaction, Category, BalanceSummary, AppSettings, Debt, DebtStatus, SystemAlert, Account, TransactionType, Budget, DashboardWidgetConfig, Show, FinancialSettings, ActiveScopeFilter, ScopeType, matchesScope } from '../types';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { APP_THEMES, DEFAULT_CATEGORIES, DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import { normalizeShowFinancials, syncShowWithTransactions, cancelShowFutureTransactions } from '../services/showFinanceSyncService';
import { generateUUID } from '../services/uuidHelper';

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

  getSystemAlerts: () => SystemAlert[];
  updateSettings: (s: Partial<AppSettings>) => void;
  updateFinancialSettings: (fs: Partial<FinancialSettings>) => void;
  getBalanceSummary: (month: string, projectionDate: string) => ExtendedSummary;
  refreshData: () => void;
  restoreAutoBackup: () => boolean;
  getBackupInfo: () => { timestamp: number; date: Date } | null;
  requestNotificationPermission: () => Promise<boolean>;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
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
    return (saved === 'PERSONAL' || saved === 'BUSINESS') ? saved : 'ALL';
  });

  const setActiveScope = (scope: ActiveScopeFilter) => {
    setActiveScopeState(scope);
    localStorage.setItem('fin_app_scope', scope);
  };

  const toggleBlur = () => {
    setIsBlurred(prev => {
      const newValue = !prev;
      localStorage.setItem('isBlurred', String(newValue));
      return newValue;
    });
  };

  const syncShowsWithTransactions = useCallback((currentTransactions: Transaction[], currentShows: Show[]) => {
    let showsChanged = false;
    let updatedShows = [...currentShows];

    // 1. Check for any transaction of category "cat_33" that is NOT linked to any show
    const cacheTransactions = currentTransactions.filter(t => t.categoryId === 'cat_33');
    
    cacheTransactions.forEach(t => {
      // Is this transaction linked to any receipt or payment in any show?
      const isLinked = updatedShows.some(show => 
        (show.receipts && show.receipts.some(r => r.transactionId === t.id)) ||
        (show.payments && show.payments.some(p => p.transactionId === t.id)) ||
        (t.showId && show.id === t.showId) ||
        (t.showPaymentId && show.payments && show.payments.some(p => p.id === t.showPaymentId))
      );

      if (!isLinked) {
        // Not linked! Let's auto-create a Show for it
        const showId = generateUUID();
        const newShow: Show = {
          id: showId,
          name: t.description || 'Show / Evento',
          contractorName: t.description || 'Contratante Geral',
          location: 'Geral',
          date: t.date,
          time: '20:00',
          totalCache: t.amount,
          cacheCombined: t.amount,
          cacheReceived: t.status === 'paid' ? t.amount : 0,
          paymentMethod: 'Pix',
          notes: `Importado automaticamente a partir do lançamento de receita em "${t.description}"`,
          status: t.status === 'paid' ? 'Realizado' : 'Confirmado',
          payments: [{
            id: generateUUID(),
            amount: t.amount,
            expectedDate: t.date,
            effectiveDate: t.status === 'paid' ? t.date : undefined,
            accountId: t.accountId,
            status: t.status === 'paid' ? 'Recebido' : 'Agendado',
            type: 'Pagamento final',
            transactionId: t.id
          }],
          receipts: [{
            id: generateUUID(),
            amount: t.amount,
            expectedDate: t.date,
            effectiveDate: t.status === 'paid' ? t.date : undefined,
            accountId: t.accountId,
            paymentMethod: 'Pix',
            status: t.status === 'paid' ? 'Recebido' : 'Previsto',
            type: 'Pagamento final',
            transactionId: t.id,
            isImported: true
          }],
          expensesLaunched: false,
          expenses: {
            fuel: 0,
            food: 0,
            toll: 0,
            commission: 0,
            others: 0
          },
          createdAt: t.createdAt || Date.now(),
          isImported: true
        };
        updatedShows.push(newShow);
        showsChanged = true;
      }
    });

    // 2. Check for any show that is linked to a transaction of category "cat_33"
    // we want to make sure the values, dates, accounts, status are in perfect sync!
    updatedShows = updatedShows.map(show => {
      let showReceiptsChanged = false;
      const updatedReceipts = show.receipts ? show.receipts.map(r => {
        if (r.transactionId) {
          const correspondingTx = currentTransactions.find(tx => tx.id === r.transactionId);
          if (correspondingTx) {
            const txStatusMapped = correspondingTx.status === 'paid' ? 'Recebido' : 'Previsto';
            if (
              r.amount !== correspondingTx.amount ||
              r.expectedDate !== correspondingTx.date ||
              r.accountId !== correspondingTx.accountId ||
              r.status !== txStatusMapped
            ) {
              showReceiptsChanged = true;
              return {
                ...r,
                amount: correspondingTx.amount,
                expectedDate: correspondingTx.date,
                effectiveDate: correspondingTx.status === 'paid' ? correspondingTx.date : undefined,
                accountId: correspondingTx.accountId,
                status: txStatusMapped as any
              };
            }
          } else {
            showReceiptsChanged = true;
            return {
              ...r,
              transactionId: undefined
            };
          }
        }
        return r;
      }) : [];

      if (showReceiptsChanged) {
        showsChanged = true;
        const totalReceivedSum = updatedReceipts
          .filter(r => r.status === 'Recebido')
          .reduce((sum, r) => sum + r.amount, 0);

        let totalCacheVal = show.totalCache;
        if (show.isImported && updatedReceipts.length === 1) {
          totalCacheVal = updatedReceipts[0].amount;
        }

        return {
          ...show,
          receipts: updatedReceipts,
          totalCache: totalCacheVal,
          cacheCombined: totalCacheVal,
          cacheReceived: totalReceivedSum
        };
      }
      return show;
    });

    // 3. Remove imported shows whose transaction was deleted or moved to a different category
    const finalShowsList: Show[] = [];
    updatedShows.forEach(show => {
      if (show.isImported) {
        const hasActiveTx = 
          (show.receipts && show.receipts.some(r => 
            r.transactionId && currentTransactions.some(tx => tx.id === r.transactionId && tx.categoryId === 'cat_33')
          )) ||
          (show.payments && show.payments.some(p => 
            p.transactionId && currentTransactions.some(tx => tx.id === p.transactionId && tx.categoryId === 'cat_33')
          )) ||
          currentTransactions.some(tx => tx.showId === show.id && tx.categoryId === 'cat_33');

        if (!hasActiveTx) {
          showsChanged = true;
          return;
        }
      }
      finalShowsList.push(show);
    });

    if (showsChanged) {
      setShows(finalShowsList);
      StorageService.saveShows(finalShowsList);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (transactions.length > 0 || shows.length > 0) {
      syncShowsWithTransactions(transactions, shows);
    }
  }, [transactions, shows, syncShowsWithTransactions]);

  useEffect(() => {
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.theme]);

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
    // DIRETRIZ 3: UNIFICAÇÃO AUTOMÁTICA DE CATEGORIAS DUPLICADAS (MIGRATION)
    // Fusão de "Cachês Música Ao Vivo" e "Shows / Cachês" em uma única: "Shows / Cachês"
    // =========================================================================
    const isLiveMusicCacheCat = (name: string) => {
      const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return n.includes('cache') && (n.includes('ao vivo') || n.includes('musica ao vivo'));
    };

    const duplicateCatIds = new Set(
      storedCategories
        .filter(c => isLiveMusicCacheCat(c.name) && c.id !== 'cat_33')
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

    // Remover categorias duplicadas "Cachês Música Ao Vivo"
    let finalCategories = storedCategories.filter(c => !duplicateCatIds.has(c.id));

    // Garantir defaults que faltem
    const existingNames = new Set(finalCategories.map(c => c.name.toLowerCase()));
    const missingDefaults = DEFAULT_CATEGORIES.filter(d => !existingNames.has(d.name.toLowerCase()) && !isLiveMusicCacheCat(d.name));
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

    // Self-healing: ensure all show receipts (including future/pending ones) have synced transactions
    let txModified = false;
    let showsModified = false;
    let finalTransactions = [...storedTransactions];
    let finalShows = [...storedShows];

    finalShows = finalShows.map(show => {
      let currentShowChanged = false;
      const updatedReceipts = (show.receipts || []).map(r => {
        const txExists = r.transactionId && finalTransactions.some(tx => tx.id === r.transactionId);
        if (!txExists && r.amount > 0) {
          const newTxId = r.transactionId || generateUUID();
          finalTransactions.push({
            id: newTxId,
            date: r.expectedDate || show.date,
            amount: r.amount,
            type: 'income',
            categoryId: 'cat_33',
            description: `Recebimento [${r.type || 'Parcela'}] - Show: ${show.name}`,
            status: r.status === 'Recebido' ? 'paid' : 'pending',
            accountId: r.accountId || 'acc_bank',
            createdAt: show.createdAt || Date.now()
          });
          txModified = true;
          currentShowChanged = true;
          return { ...r, transactionId: newTxId };
        }
        return r;
      });

      if (currentShowChanged) {
        showsModified = true;
        return { ...show, receipts: updatedReceipts };
      }
      return show;
    });

    if (txModified) {
      StorageService.saveTransactions(finalTransactions);
    }
    if (showsModified) {
      StorageService.saveShows(finalShows);
    }

    setTransactions(finalTransactions);
    setShows(finalShows);
    
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

  const saveTransactions = (ts: Transaction[]) => { setTransactions(ts); StorageService.saveTransactions(ts); };
  const saveCategories = (cs: Category[]) => { setCategories(cs); StorageService.saveCategories(cs); };
  const saveDebts = (ds: Debt[]) => { setDebts(ds); StorageService.saveDebts(ds); };
  const saveAccounts = (as: Account[]) => { setAccounts(as); StorageService.saveAccounts(as); };
  const saveBudgetsInternal = (bs: Budget[]) => { setBudgets(bs); StorageService.saveBudgets(bs); };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
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
    }
  };

  const addAccount = (a: Omit<Account, 'id'>) => saveAccounts([...accounts, { ...a, id: generateUUID() }]);
  const updateAccount = (a: Account) => saveAccounts(accounts.map(acc => acc.id === a.id ? a : acc));
  const deleteAccount = (id: string) => saveAccounts(accounts.filter(a => a.id !== id));

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
      date: new Date().toISOString().slice(0, 10),
      status: 'paid',
      accountId,
      categoryId: cat ? cat.id : 'cat_adjustment'
    });
  };

  const addTransaction = (t: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => {
    const fixedGroupId = t.isFixed ? generateUUID() : undefined;
    setTransactions(prev => {
      const txs = [...prev];
      const tid = t.id || generateUUID();
      txs.push({ ...t, id: tid, createdAt: Date.now(), fixedGroupId });
      if (t.isFixed && fixedGroupId) {
        for (let i = 1; i < 12; i++) {
          const d = new Date(t.date); d.setMonth(d.getMonth() + i);
          txs.push({ ...t, id: generateUUID(), date: d.toISOString().slice(0, 10), status: 'pending', createdAt: Date.now() + i, fixedGroupId });
        }
      }
      StorageService.saveTransactions(txs);
      return txs;
    });
  };

  const importTransactions = (newTxs: Array<Omit<Transaction, 'id' | 'createdAt'> & { id?: string }>) => {
    setTransactions(prev => {
      const txs = [...prev];
      newTxs.forEach(t => {
        const tid = t.id || generateUUID();
        const cleanAmount = Number(t.amount) || 0;
        const cleanScope: ScopeType = (t.scope === 'BUSINESS' || t.categoryId === 'cat_33' || t.categoryId === 'cat_equipamentos') ? 'BUSINESS' : 'PERSONAL';
        txs.push({
          ...t,
          id: tid,
          amount: cleanAmount,
          scope: cleanScope,
          status: t.status || 'paid',
          createdAt: Date.now()
        });
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
          return { ...t, amount: updatedT.amount, categoryId: updatedT.categoryId, description: updatedT.description, type: updatedT.type, accountId: updatedT.accountId };
        }
        return t;
      });
      StorageService.saveTransactions(txs);
      return txs;
    });
  };

  const updateDebtTransaction = (t: Transaction, redistribute: boolean) => {
    updateTransaction(t);
  };

  const recalculateDebtSeries = (transactionId: string, newAmount: number) => {
    const originalT = transactions.find(t => t.id === transactionId);
    if (!originalT || !originalT.debtId) return;

    const oldAmount = Number(originalT.amount);
    const difference = Number(newAmount) - oldAmount;

    if (Math.abs(difference) < 0.01) {
        updateTransaction({ ...originalT, amount: newAmount });
        return;
    }

    const futureInstallments = transactions
      .filter(t => 
        t.debtId === originalT.debtId && 
        t.status === 'pending' && 
        t.id !== transactionId && 
        new Date(t.date) > new Date(originalT.date)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (futureInstallments.length === 0) {
       updateTransaction({ ...originalT, amount: newAmount });
       return;
    }

    const adjustmentPerInstallment = (difference * -1) / futureInstallments.length;

    const newTransactions = transactions.map(t => {
       if (t.id === transactionId) {
          return { ...t, amount: newAmount };
       }
       if (futureInstallments.some(fi => fi.id === t.id)) {
          const adjustedAmount = Math.max(0, Number(t.amount) + adjustmentPerInstallment);
          return { ...t, amount: parseFloat(adjustedAmount.toFixed(2)) };
       }
       return t;
    });

    saveTransactions(newTransactions);
  };

  const deleteTransaction = (id: string, deleteSeries: boolean = false) => {
    setTransactions(prev => {
      const target = prev.find(t => t.id === id);
      let txs;
      if (deleteSeries && target && target.fixedGroupId) {
        txs = prev.filter(t => t.fixedGroupId !== target.fixedGroupId);
      } else {
        txs = prev.filter(t => t.id !== id);
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
          return {
            ...show,
            payments: updatedPayments,
            expenseItems: updatedExpenses
          };
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
        description: `Entrada - ${debtData.name}`,
        amount: Number(downPayment),
        type: 'expense',
        status: 'paid',
        date: today,
        categoryId,
        accountId,
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
  };

  const updateDebt = (id: string, name: string, installmentCount: number) => {
    saveDebts(debts.map(d => d.id === id ? { ...d, name, installmentCount } : d));
    saveTransactions(transactions.map(t => t.debtId === id ? { ...t, description: `${name} (${t.installmentNumber}/${installmentCount})`, installmentTotal: installmentCount } : t));
  };

  const deleteDebt = (id: string) => { saveDebts(debts.filter(d => d.id !== id)); saveTransactions(transactions.filter(t => t.debtId !== id)); };

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

  const addCategory = (c: Omit<Category, 'id'>) => saveCategories([...categories, { ...c, id: generateUUID() }]);
  const updateCategory = (c: Category) => saveCategories(categories.map(cat => cat.id === c.id ? c : cat));
  const deleteCategory = (id: string) => saveCategories(categories.filter(c => c.id !== id));

  const saveBudget = (b: Budget) => {
    const idx = budgets.findIndex(item => item.categoryId === b.categoryId);
    const newBudgets = [...budgets];
    if (idx >= 0) newBudgets[idx] = b;
    else newBudgets.push(b);
    saveBudgetsInternal(newBudgets);
  };
  const deleteBudget = (categoryId: string) => saveBudgetsInternal(budgets.filter(b => b.categoryId !== categoryId));

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
  };

  const updateShow = (s: Show) => {
    const defaultAccId = accounts.length > 0 ? accounts[0].id : 'acc_bank';
    const normalized = normalizeShowFinancials(s, defaultAccId);

    // Se o show foi cancelado, remove/ajusta as receitas futuras agendadas
    let currentTxs = transactions;
    if (s.status === 'Cancelado') {
      currentTxs = cancelShowFutureTransactions(s.id, currentTxs);
    }

    // Sincronizar movimentações
    const { updatedShow, updatedTransactions } = syncShowWithTransactions(normalized, currentTxs, categories);

    setShows(prev => {
      const updated = prev.map(show => show.id === s.id ? updatedShow : show);
      StorageService.saveShows(updated);
      return updated;
    });

    setTransactions(updatedTransactions);
    StorageService.saveTransactions(updatedTransactions);
  };

  const deleteShow = (id: string, deleteTransactions: boolean = false) => {
    setShows(prev => {
      const updated = prev.filter(show => show.id !== id);
      StorageService.saveShows(updated);
      return updated;
    });

    if (deleteTransactions) {
      setTransactions(prev => {
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

    filteredTransactions.forEach(t => {
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
    const sum = getBalanceSummary(today.toISOString().slice(0,7), today.toISOString().slice(0,10));
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

  const restoreAutoBackup = () => { if (StorageService.restoreAutoBackup()) { refreshData(); return true; } return false; };
  const getBackupInfo = () => StorageService.getAutoBackupInfo();
  const requestNotificationPermission = () => NotificationService.requestPermission();

  return (
    <FinanceContext.Provider value={{
      transactions, categories, debts, accounts, budgets, shows, settings, isBlurred, toggleBlur,
      activeScope, setActiveScope,
      addTransaction, importTransactions, updateTransaction, updateTransactionSeries, updateDebtTransaction, recalculateDebtSeries, deleteTransaction, checkTransactionImpact,
      addCategory, updateCategory, deleteCategory,
      addAccount, updateAccount, deleteAccount, reconcileBalance, getAccountBalance,
      addDebt, updateDebt, deleteDebt, getDebtProgress,
      saveBudget, deleteBudget,
      addShow, updateShow, deleteShow, cancelShowFutureFinancials,
      getSystemAlerts, updateSettings, updateFinancialSettings, getBalanceSummary, refreshData,
      restoreAutoBackup, getBackupInfo, requestNotificationPermission
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
