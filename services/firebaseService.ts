import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { 
  doc, 
  getDocFromServer, 
  getDoc,
  collection, 
  setDoc, 
  onSnapshot, 
  deleteDoc, 
  query,
  writeBatch
} from 'firebase/firestore';
import { Account, Transaction, Show, ShowStatus, Category, Debt, Budget, AppSettings } from '../types';
import { app, auth, db, googleProvider, firebaseConfig } from '../src/firebase/config';

export { app, auth, db, googleProvider, firebaseConfig };

/**
 * Remove recursivamente propriedades undefined para evitar erro
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: any = {};
    for (const key of Object.keys(data)) {
      const val = (data as any)[key];
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val);
      }
    }
    return result;
  }
  return data;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
}

// Test connectivity on initial boot
export async function testFirestoreConnection() {
  try {
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'users', auth.currentUser.uid));
    }
  } catch (error) {
    console.warn('Firestore offline ou em cache local.');
  }
}

// Authentication Helpers
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Erro ao fazer login com Google:', error);
    throw error;
  }
};

export const signInGuest = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Erro ao entrar como convidado:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  await firebaseSignOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Check if user record is initialized in Firestore
export const checkUserInitialized = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() && !!userDoc.data()?.initialized;
  } catch (err) {
    return false;
  }
};

export const markUserInitialized = async (userId: string, email?: string | null) => {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      email: email || null,
      initialized: true,
      lastSyncAt: Date.now()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

// =========================================================================
// REALTIME FIRESTORE DATA SYNC HELPERS (onSnapshot)
// =========================================================================

// 1. Contas Bancárias / Carteiras
export const subscribeToUserAccounts = (
  userId: string, 
  onData: (accounts: Account[]) => void,
  onError?: (error: unknown) => void
) => {
  const path = `users/${userId}/accounts`;
  try {
    const q = query(collection(db, 'users', userId, 'accounts'));
    return onSnapshot(q, (snapshot) => {
      const items: Account[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Account);
      });
      onData(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      if (onError) onError(err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  }
};

// 2. Transações
export const subscribeToUserTransactions = (
  userId: string, 
  onData: (transactions: Transaction[]) => void,
  onError?: (error: unknown) => void
) => {
  const path = `users/${userId}/transactions`;
  try {
    const q = query(collection(db, 'users', userId, 'transactions'));
    return onSnapshot(q, (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
      });
      onData(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      if (onError) onError(err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  }
};

// Helper para normalizar documentos de Shows vindos do Firestore ou Storage
export function normalizeShowDoc(docId: string, raw: any): Show {
  const data = raw || {};
  
  // Extração segura da data (garante YYYY-MM-DD sem undefined)
  let dateStr = data.date || data.eventDate || data.data || '';
  if (!dateStr || typeof dateStr !== 'string') {
    if (data.createdAt && typeof data.createdAt === 'number') {
      dateStr = new Date(data.createdAt).toISOString().slice(0, 10);
    } else {
      dateStr = new Date().toISOString().slice(0, 10);
    }
  } else if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }

  // Extração segura de cachê / valor contratado
  const cacheVal = Number(
    data.totalCache !== undefined && data.totalCache !== null
      ? data.totalCache
      : data.cache !== undefined && data.cache !== null
      ? data.cache
      : data.price !== undefined && data.price !== null
      ? data.price
      : data.cacheCombined !== undefined && data.cacheCombined !== null
      ? data.cacheCombined
      : data.amount !== undefined && data.amount !== null
      ? data.amount
      : 0
  ) || 0;

  // Extração segura de custos
  const costsVal = Number(
    data.costs !== undefined && data.costs !== null
      ? data.costs
      : data.totalCosts !== undefined && data.totalCosts !== null
      ? data.totalCosts
      : 0
  ) || 0;

  // Extração segura de status
  let status: ShowStatus = data.status || 'Confirmado';
  if ((status as any) === 'Agendado') {
    status = 'Aguardando confirmação';
  }

  const contractor = (data.contractorName || data.name || data.title || 'Apresentação').trim();
  const showName = (data.name || data.title || contractor).trim();

  const showObj: Show & { cache?: number; price?: number; costs?: number } = {
    ...data,
    id: docId || data.id || `show_${Date.now()}`,
    name: showName,
    contractorName: contractor,
    date: dateStr,
    time: data.time || '20:00',
    location: data.location || data.venue || '',
    city: data.city || '',
    totalCache: cacheVal,
    cacheCombined: cacheVal,
    cache: cacheVal,
    price: cacheVal,
    costs: costsVal,
    extraAmount: Number(data.extraAmount) || 0,
    status: status,
    payments: Array.isArray(data.payments) ? data.payments : [],
    expenseItems: Array.isArray(data.expenseItems) ? data.expenseItems : [],
    crewMembers: Array.isArray(data.crewMembers) ? data.crewMembers : [],
    logistics: Array.isArray(data.logistics) ? data.logistics : [],
    otherExpenses: Array.isArray(data.otherExpenses) ? data.otherExpenses : [],
    receipts: Array.isArray(data.receipts) ? data.receipts : [],
    createdAt: Number(data.createdAt) || Date.now(),
    scope: data.scope || 'BUSINESS'
  };

  return showObj;
}

// 3. Shows / Apresentações
export const subscribeToUserShows = (
  userId: string, 
  onData: (shows: Show[]) => void,
  onError?: (error: unknown) => void
) => {
  const path = `users/${userId}/shows`;
  try {
    const q = query(collection(db, 'users', userId, 'shows'));
    return onSnapshot(q, (snapshot) => {
      const items: Show[] = [];
      snapshot.forEach((docSnap) => {
        items.push(normalizeShowDoc(docSnap.id, docSnap.data()));
      });
      onData(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      if (onError) onError(err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  }
};

// 4. Dívidas / Parcelamentos
export const subscribeToUserDebts = (
  userId: string, 
  onData: (debts: Debt[]) => void,
  onError?: (error: unknown) => void
) => {
  const path = `users/${userId}/debts`;
  try {
    const q = query(collection(db, 'users', userId, 'debts'));
    return onSnapshot(q, (snapshot) => {
      const items: Debt[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Debt);
      });
      onData(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      if (onError) onError(err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  }
};

// 5. Categorias Customizadas
export const subscribeToUserCategories = (
  userId: string, 
  onData: (categories: Category[]) => void,
  onError?: (error: unknown) => void
) => {
  const path = `users/${userId}/categories`;
  try {
    const q = query(collection(db, 'users', userId, 'categories'));
    return onSnapshot(q, (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Category);
      });
      onData(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      if (onError) onError(err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  }
};

// 6. Orçamentos (Budgets)
export const subscribeToUserBudgets = (
  userId: string, 
  onData: (budgets: Budget[]) => void,
  onError?: (error: unknown) => void
) => {
  const path = `users/${userId}/budgets`;
  try {
    const q = query(collection(db, 'users', userId, 'budgets'));
    return onSnapshot(q, (snapshot) => {
      const items: Budget[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ categoryId: docSnap.id, ...docSnap.data() } as Budget);
      });
      onData(items);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      if (onError) onError(err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    if (onError) onError(err);
  }
};

// 7. Configurações do Usuário (Settings)
export const subscribeToUserSettings = (
  userId: string, 
  onData: (settings: Partial<AppSettings>) => void,
  onError?: (error: unknown) => void
) => {
  const path = `users/${userId}/settings/app`;
  try {
    return onSnapshot(doc(db, 'users', userId, 'settings', 'app'), (docSnap) => {
      if (docSnap.exists()) {
        onData(docSnap.data() as Partial<AppSettings>);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      if (onError) onError(err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    if (onError) onError(err);
  }
};

// =========================================================================
// WRITE OPERATIONS (PERSISTÊNCIA FIRESTORE)
// =========================================================================

export const saveAccountToFirestore = async (userId: string, account: Account) => {
  const path = `users/${userId}/accounts/${account.id}`;
  try {
    const sanitized = sanitizeForFirestore(account);
    await setDoc(doc(db, 'users', userId, 'accounts', account.id), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteAccountFromFirestore = async (userId: string, accountId: string) => {
  const path = `users/${userId}/accounts/${accountId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'accounts', accountId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const saveTransactionToFirestore = async (userId: string, transaction: Transaction) => {
  const path = `users/${userId}/transactions/${transaction.id}`;
  try {
    const sanitized = sanitizeForFirestore(transaction);
    await setDoc(doc(db, 'users', userId, 'transactions', transaction.id), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteTransactionFromFirestore = async (userId: string, transactionId: string) => {
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const saveShowToFirestore = async (userId: string, show: Show) => {
  const path = `users/${userId}/shows/${show.id}`;
  try {
    const sanitized = sanitizeForFirestore(show);
    await setDoc(doc(db, 'users', userId, 'shows', show.id), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteShowFromFirestore = async (userId: string, showId: string) => {
  const path = `users/${userId}/shows/${showId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'shows', showId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const saveDebtToFirestore = async (userId: string, debt: Debt) => {
  const path = `users/${userId}/debts/${debt.id}`;
  try {
    const sanitized = sanitizeForFirestore(debt);
    await setDoc(doc(db, 'users', userId, 'debts', debt.id), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteDebtFromFirestore = async (userId: string, debtId: string) => {
  const path = `users/${userId}/debts/${debtId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'debts', debtId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const saveCategoryToFirestore = async (userId: string, category: Category) => {
  const path = `users/${userId}/categories/${category.id}`;
  try {
    const sanitized = sanitizeForFirestore(category);
    await setDoc(doc(db, 'users', userId, 'categories', category.id), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteCategoryFromFirestore = async (userId: string, categoryId: string) => {
  const path = `users/${userId}/categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const saveBudgetToFirestore = async (userId: string, budget: Budget) => {
  const path = `users/${userId}/budgets/${budget.categoryId}`;
  try {
    const sanitized = sanitizeForFirestore(budget);
    await setDoc(doc(db, 'users', userId, 'budgets', budget.categoryId), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteBudgetFromFirestore = async (userId: string, categoryId: string) => {
  const path = `users/${userId}/budgets/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'budgets', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const saveSettingsToFirestore = async (userId: string, settings: Partial<AppSettings>) => {
  const path = `users/${userId}/settings/app`;
  try {
    const sanitized = sanitizeForFirestore(settings);
    await setDoc(doc(db, 'users', userId, 'settings', 'app'), sanitized, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

// Sincronização inicial em lote (upload de dados locais para Firestore na primeira vez)
export const syncLocalDataToFirestore = async (userId: string, localData: {
  transactions?: Transaction[];
  shows?: Show[];
  debts?: Debt[];
  accounts?: Account[];
  categories?: Category[];
  budgets?: Budget[];
  settings?: AppSettings;
}) => {
  try {
    const promises: Promise<any>[] = [];

    if (localData.accounts && localData.accounts.length > 0) {
      localData.accounts.forEach(acc => promises.push(saveAccountToFirestore(userId, acc)));
    }
    if (localData.transactions && localData.transactions.length > 0) {
      localData.transactions.forEach(tx => promises.push(saveTransactionToFirestore(userId, tx)));
    }
    if (localData.shows && localData.shows.length > 0) {
      localData.shows.forEach(s => promises.push(saveShowToFirestore(userId, s)));
    }
    if (localData.debts && localData.debts.length > 0) {
      localData.debts.forEach(d => promises.push(saveDebtToFirestore(userId, d)));
    }
    if (localData.categories && localData.categories.length > 0) {
      localData.categories.forEach(c => promises.push(saveCategoryToFirestore(userId, c)));
    }
    if (localData.budgets && localData.budgets.length > 0) {
      localData.budgets.forEach(b => promises.push(saveBudgetToFirestore(userId, b)));
    }
    if (localData.settings) {
      promises.push(saveSettingsToFirestore(userId, localData.settings));
    }

    await Promise.allSettled(promises);
    await markUserInitialized(userId);
  } catch (err) {
    console.warn('Erro ao sincronizar dados locais para o Firestore:', err);
  }
};
