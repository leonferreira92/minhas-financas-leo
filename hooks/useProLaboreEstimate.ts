import { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { subscribeToCompanySummary } from '../services/firebaseService';
import { getAccountVinculo } from '../services/financeAggregator';

export interface ProLaboreEstimate {
  /** Valor de `availableProLabore` no Firestore (ou override manual / 0) */
  availableEstimate: number;
  /** Valor bruto lido do Firestore (null se documento ausente) */
  firestoreAvailableProLabore: number | null;
  /** Documento `users/{uid}/companySummary/current` existe */
  hasFirestoreSummary: boolean;
  /** Ainda aguardando primeira resposta do snapshot */
  isLoading: boolean;
  /** Override manual temporário quando o doc ainda não existe */
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
 * Lê a estimativa REAL de pró-labore exposta pelo Vida de Artista em
 * `users/{uid}/companySummary/current.availableProLabore`.
 * Sem cálculos locais (20%, pendências, etc.).
 */
export function useProLaboreEstimate(): ProLaboreEstimate {
  const { currentUser, accounts } = useFinance();
  const [firestoreValue, setFirestoreValue] = useState<number | null>(null);
  const [hasFirestoreSummary, setHasFirestoreSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [manualOverride, setManualOverride] = useState<number | null>(null);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) {
      setFirestoreValue(null);
      setHasFirestoreSummary(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = subscribeToCompanySummary(
      uid,
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
  }, [currentUser?.uid]);

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
    manualOverride,
    setManualOverride,
    sourceAccountId,
    destinationAccountId,
    categoryId: PROLABORE_CATEGORY_ID,
    categoryLabel: PROLABORE_CATEGORY_LABEL
  };
}
