import { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  subscribeToCompanyAuth,
  subscribeToCompanySummary,
  getCompanyAuthUid
} from '../services/firebaseService';
import { getAccountVinculo } from '../services/financeAggregator';

export interface ProLaboreEstimate {
  /** Valor de `availableProLabore` no Firestore leo-ferreira-app (ou override / 0) */
  availableEstimate: number;
  firestoreAvailableProLabore: number | null;
  hasFirestoreSummary: boolean;
  isLoading: boolean;
  /** UID autenticado no projeto leo-ferreira-app (necessário para ler o doc) */
  companyUid: string | null;
  /** Sessão no Auth da empresa ainda não espelhada */
  needsCompanyAuth: boolean;
  manualOverride: number | null;
  setManualOverride: (value: number | null) => void;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  categoryId: 'cat_7';
  categoryLabel: string;
}

const PROLABORE_CATEGORY_ID = 'cat_7' as const;
const PROLABORE_CATEGORY_LABEL = 'Pró-labore / Transferência Vida de Artista';

/**
 * Lê `availableProLabore` em
 * leo-ferreira-app → users/{companyUid}/companySummary/current
 */
export function useProLaboreEstimate(): ProLaboreEstimate {
  const { currentUser, accounts } = useFinance();
  const [companyUid, setCompanyUid] = useState<string | null>(() => getCompanyAuthUid());
  const [firestoreValue, setFirestoreValue] = useState<number | null>(null);
  const [hasFirestoreSummary, setHasFirestoreSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [manualOverride, setManualOverride] = useState<number | null>(null);

  useEffect(() => {
    const unsubAuth = subscribeToCompanyAuth((user) => {
      setCompanyUid(user?.uid ?? null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setFirestoreValue(null);
      setHasFirestoreSummary(false);
      setIsLoading(false);
      return;
    }

    if (!companyUid) {
      setFirestoreValue(null);
      setHasFirestoreSummary(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = subscribeToCompanySummary(
      companyUid,
      (summary) => {
        if (summary == null) {
          setHasFirestoreSummary(false);
          setFirestoreValue(null);
        } else {
          setHasFirestoreSummary(true);
          const raw = Number(summary.availableProLabore);
          setFirestoreValue(Number.isFinite(raw) ? Math.max(0, raw) : 0);
        }
        setIsLoading(false);
      },
      () => {
        setHasFirestoreSummary(false);
        setFirestoreValue(null);
        setIsLoading(false);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [currentUser?.uid, companyUid]);

  const { sourceAccountId, destinationAccountId } = useMemo(() => {
    const companyAccounts = accounts.filter(
      a => a.enabled !== false && (getAccountVinculo(a) === 'MUSICO' || a.scope === 'BUSINESS')
    );
    const personalAccounts = accounts.filter(
      a => a.enabled !== false && (getAccountVinculo(a) === 'PESSOAL' || a.scope === 'PERSONAL')
    );
    const source =
      companyAccounts[0] || accounts.find(a => a.enabled !== false) || null;
    const dest =
      personalAccounts.find(a => a.id !== source?.id) ||
      accounts.find(a => a.enabled !== false && a.id !== source?.id) ||
      personalAccounts[0] ||
      null;
    return {
      sourceAccountId: source?.id || null,
      destinationAccountId: dest?.id || null
    };
  }, [accounts]);

  const availableEstimate = useMemo(() => {
    if (hasFirestoreSummary && firestoreValue !== null) {
      return firestoreValue;
    }
    if (manualOverride !== null && Number.isFinite(manualOverride)) {
      return Math.max(0, manualOverride);
    }
    return 0;
  }, [hasFirestoreSummary, firestoreValue, manualOverride]);

  return {
    availableEstimate,
    firestoreAvailableProLabore: firestoreValue,
    hasFirestoreSummary,
    isLoading,
    companyUid,
    needsCompanyAuth: Boolean(currentUser) && !companyUid,
    manualOverride,
    setManualOverride,
    sourceAccountId,
    destinationAccountId,
    categoryId: PROLABORE_CATEGORY_ID,
    categoryLabel: PROLABORE_CATEGORY_LABEL
  };
}
