
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Transaction, Category, BalanceSummary, AppSettings, Debt, DebtStatus, SystemAlert, Account, TransactionType, Budget, Goal, DashboardWidgetConfig, Show } from '../types';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
import { APP_THEMES, DEFAULT_CATEGORIES } from '../constants';

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
  goals: Goal[];
  shows: Show[];
  settings: AppSettings;
  isBlurred: boolean;
  toggleBlur: () => void;
  
  // Methods
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => void;
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
  addGoal: (g: Omit<Goal, 'id'> & { id?: string }) => void;
  updateGoal: (g: Goal) => void;
  deleteGoal: (id: string) => void;

  addShow: (s: Omit<Show, 'id' | 'createdAt'> & { id?: string }) => void;
  updateShow: (s: Show) => void;
  deleteShow: (id: string) => void;

  getSystemAlerts: () => SystemAlert[];
  updateSettings: (s: Partial<AppSettings>) => void;
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    theme: 'light', 
    primaryColor: 'lime', 
    notificationInterval: 12,
    dashboardLayout: DEFAULT_DASHBOARD_LAYOUT
  } as AppSettings);
  const [isBlurred, setIsBlurred] = useState(() => {
    return localStorage.getItem('isBlurred') === 'true';
  });

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
      // Is this transaction linked to any receipt in any show?
      const isLinked = updatedShows.some(show => 
        show.receipts && show.receipts.some(r => r.transactionId === t.id)
      );

      if (!isLinked) {
        // Not linked! Let's auto-create a Show for it
        const showId = crypto.randomUUID();
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
          receipts: [{
            id: crypto.randomUUID(),
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
        const hasActiveTx = show.receipts && show.receipts.some(r => 
          r.transactionId && currentTransactions.some(tx => tx.id === r.transactionId && tx.categoryId === 'cat_33')
        );
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
    const storedTransactions = StorageService.getTransactions();
    const storedCategories = StorageService.getCategories();
    const storedDebts = StorageService.getDebts();
    const storedAccounts = StorageService.getAccounts();
    const storedBudgets = StorageService.getBudgets();
    const storedGoals = StorageService.getGoals();
    const storedSettings = StorageService.getSettings();

    const existingNames = new Set(storedCategories.map(c => c.name.toLowerCase()));
    const missingDefaults = DEFAULT_CATEGORIES.filter(d => !existingNames.has(d.name.toLowerCase()));
    
    let finalCategories = storedCategories;
    
    if (missingDefaults.length > 0) {
      const toAdd = missingDefaults.map(cat => ({
         ...cat,
         id: storedCategories.some(sc => sc.id === cat.id) ? crypto.randomUUID() : cat.id
      }));

      finalCategories = [...storedCategories, ...toAdd];
      StorageService.saveCategories(finalCategories);
    }

    setTransactions(storedTransactions);
    setCategories(finalCategories);
    setDebts(storedDebts);
    setAccounts(storedAccounts);
    setBudgets(storedBudgets);
    setGoals(storedGoals);
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
          const newTxId = r.transactionId || crypto.randomUUID();
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
    if (storedGoals.length > 0 && !localStorage.getItem('fin_app_goals')) {
      StorageService.saveGoals(storedGoals);
    }
    
    const mergedSettings = {
      ...storedSettings,
      dashboardLayout: storedSettings.dashboardLayout || DEFAULT_DASHBOARD_LAYOUT
    };
    setSettings(mergedSettings);
  };

  const saveTransactions = (ts: Transaction[]) => { setTransactions(ts); StorageService.saveTransactions(ts); };
  const saveCategories = (cs: Category[]) => { setCategories(cs); StorageService.saveCategories(cs); };
  const saveDebts = (ds: Debt[]) => { setDebts(ds); StorageService.saveDebts(ds); };
  const saveAccounts = (as: Account[]) => { setAccounts(as); StorageService.saveAccounts(as); };
  const saveBudgetsInternal = (bs: Budget[]) => { setBudgets(bs); StorageService.saveBudgets(bs); };
  const saveGoalsInternal = (gs: Goal[]) => { setGoals(gs); StorageService.saveGoals(gs); };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const addAccount = (a: Omit<Account, 'id'>) => saveAccounts([...accounts, { ...a, id: crypto.randomUUID() }]);
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
    const fixedGroupId = t.isFixed ? crypto.randomUUID() : undefined;
    setTransactions(prev => {
      const txs = [...prev];
      const tid = t.id || crypto.randomUUID();
      txs.push({ ...t, id: tid, createdAt: Date.now(), fixedGroupId });
      if (t.isFixed && fixedGroupId) {
        for (let i = 1; i < 12; i++) {
          const d = new Date(t.date); d.setMonth(d.getMonth() + i);
          txs.push({ ...t, id: crypto.randomUUID(), date: d.toISOString().slice(0, 10), status: 'pending', createdAt: Date.now() + i, fixedGroupId });
        }
      }
      StorageService.saveTransactions(txs);
      return txs;
    });
  };

  const updateTransaction = (updatedT: Transaction) => {
    setTransactions(prev => {
      const txs = prev.map(t => t.id === updatedT.id ? updatedT : t);
      StorageService.saveTransactions(txs);
      return txs;
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
    const debtId = crypto.randomUUID();
    const newDebt = { ...debtData, id: debtId };
    const newDebts = [...debts, newDebt];
    
    const newTransactions = [...transactions];
    const { downPayment, installments, firstDate, categoryId, accountId, autoPayPast, fixedInstallmentValue } = installmentsData;
    
    const today = new Date().toISOString().slice(0, 10);
    const createdAtBase = Date.now();

    if (downPayment && Number(downPayment) > 0) {
      newTransactions.push({
        id: crypto.randomUUID(),
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
         id: crypto.randomUUID(),
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

  const addCategory = (c: Omit<Category, 'id'>) => saveCategories([...categories, { ...c, id: crypto.randomUUID() }]);
  const updateCategory = (c: Category) => saveCategories(categories.map(cat => cat.id === c.id ? cat : cat));
  const deleteCategory = (id: string) => saveCategories(categories.filter(c => c.id !== id));

  const saveBudget = (b: Budget) => {
    const idx = budgets.findIndex(item => item.categoryId === b.categoryId);
    const newBudgets = [...budgets];
    if (idx >= 0) newBudgets[idx] = b;
    else newBudgets.push(b);
    saveBudgetsInternal(newBudgets);
  };
  const deleteBudget = (categoryId: string) => saveBudgetsInternal(budgets.filter(b => b.categoryId !== categoryId));
  const addGoal = (g: Omit<Goal, 'id'> & { id?: string }) => {
    setGoals(prev => {
      const goalId = g.id || crypto.randomUUID();
      const updated = [...prev, { ...g, id: goalId }];
      StorageService.saveGoals(updated);
      return updated;
    });
  };
  const updateGoal = (g: Goal) => {
    setGoals(prev => {
      const updated = prev.map(goal => goal.id === g.id ? g : goal);
      StorageService.saveGoals(updated);
      return updated;
    });
  };
  const deleteGoal = (id: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== id);
      StorageService.saveGoals(updated);
      return updated;
    });
  };

  const addShow = (s: Omit<Show, 'id' | 'createdAt'> & { id?: string }) => {
    setShows(prev => {
      const id = s.id || crypto.randomUUID();
      const updated = [...prev, { ...s, id, createdAt: Date.now() }];
      StorageService.saveShows(updated);
      return updated;
    });
  };

  const updateShow = (s: Show) => {
    setShows(prev => {
      const updated = prev.map(show => show.id === s.id ? s : show);
      StorageService.saveShows(updated);
      return updated;
    });
  };

  const deleteShow = (id: string) => {
    setShows(prev => {
      const updated = prev.filter(show => show.id !== id);
      StorageService.saveShows(updated);
      return updated;
    });
  };

  const getBalanceSummary = (viewMonthStr: string, projectionDateStr: string): ExtendedSummary => {
    const projLimit = new Date(projectionDateStr + 'T23:59:59').getTime();
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    const accountsTotal = accounts.reduce((s, acc) => s + getAccountBalance(acc.id), 0);
    const goalsTotal = goals.reduce((s, g) => s + (Number(g.currentAmount) || 0), 0);
    let realBalance = accountsTotal;

    const operatingAccountsTotal = accounts
      .filter(acc => !(acc.type === 'savings' || acc.name.toLowerCase().includes('economia') || acc.name.toLowerCase().includes('reserva')))
      .reduce((s, acc) => s + getAccountBalance(acc.id), 0);
    let projectedBalance = operatingAccountsTotal;

    let monthlyIncome = 0, monthlyExpense = 0, pendingIncome = 0, pendingExpense = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount) || 0;
      const isPaid = t.status === 'paid';
      const tTime = new Date(t.date + 'T12:00:00').getTime();

      if (!isPaid && tTime <= projLimit) {
        if (t.type === 'income') projectedBalance += amount;
        else if (t.type === 'expense') projectedBalance -= amount;
      }

      if (t.date.startsWith(viewMonthStr)) {
        if (t.type === 'income') {
          monthlyIncome += isPaid ? amount : 0;
          if (!isPaid) pendingIncome += amount;
        } else if (t.type === 'expense') {
          monthlyExpense += isPaid ? amount : 0;
          if (!isPaid) pendingExpense += amount;
        }
      }
    });

    // Smart Metrics Calculation
    const dailyBurnRate = monthlyExpense > 0 ? monthlyExpense / dayOfMonth : 0;
    const safetyMargin = realBalance - pendingExpense;
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;
    const freeToSpend = realBalance + pendingIncome - pendingExpense;

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
      comparisonToLastMonth: 0, // Simplificado para este MVP
      freeToSpend: Number(freeToSpend.toFixed(2)),
      accountsTotal: Number(accountsTotal.toFixed(2)),
      goalsTotal: Number(goalsTotal.toFixed(2))
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
  }, [transactions, accounts]);

  const restoreAutoBackup = () => { if (StorageService.restoreAutoBackup()) { refreshData(); return true; } return false; };
  const getBackupInfo = () => StorageService.getAutoBackupInfo();
  const requestNotificationPermission = () => NotificationService.requestPermission();

  return (
    <FinanceContext.Provider value={{
      transactions, categories, debts, accounts, budgets, goals, shows, settings, isBlurred, toggleBlur,
      addTransaction, updateTransaction, updateTransactionSeries, updateDebtTransaction, recalculateDebtSeries, deleteTransaction, checkTransactionImpact,
      addCategory, updateCategory, deleteCategory,
      addAccount, updateAccount, deleteAccount, reconcileBalance, getAccountBalance,
      addDebt, updateDebt, deleteDebt, getDebtProgress,
      saveBudget, deleteBudget, addGoal, updateGoal, deleteGoal,
      addShow, updateShow, deleteShow,
      getSystemAlerts, updateSettings, getBalanceSummary, refreshData,
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
