import { useEffect, useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  subscribeToCompanyAuth,
  subscribeToCompanySummary,
  getCompanyAuthUid,
  linkCompanyAuthWithEmail
} from '../services/firebaseService';
import { getAccountVinculo } from '../services/financeAggregator';

export interface ProLaboreEstimate {
  availableEstimate: number;
  firestoreAvailableProLabore: number | null;
  hasFirestoreSummary: boolean;
  isLoading: boolean;
  companyUid: string | null;
  needsCompanyAuth: boolean;
  /** Erro da última leitura / login empresa */
  statusMessage: string | null;
  linkCompanyWithEmail: (email: string, password: string) => Promise<void>;
  isLinkingCompany: boolean;
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
 *
 * Exige Auth no projeto leo-ferreira-app (mesmo UID do painel Vida de Artista).
 */
export function useProLaboreEstimate(): ProLaboreEstimate {
  const { currentUser, accounts } = useFinance();
  const [companyUid, setCompanyUid] = useState<string | null>(() => getCompanyAuthUid());
  const [firestoreValue, setFirestoreValue] = useState<number | null>(null);
  const [hasFirestoreSummary, setHasFirestoreSummary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [manualOverride, setManualOverride] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLinkingCompany, setIsLinkingCompany] = useState(false);

  useEffect(() => {
    const unsubAuth = subscribeToCompanyAuth((user) => {
      setCompanyUid(user?.uid ?? null);
      if (user?.uid) {
        setStatusMessage(null);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setFirestoreValue(null);
      setHasFirestoreSummary(false);
      setIsLoading(false);
      setStatusMessage(null);
      return;
    }

    if (!companyUid) {
      setFirestoreValue(null);
      setHasFirestoreSummary(false);
      setIsLoading(false);
      setStatusMessage(
        'Sem sessão no leo-ferreira-app. Entre com o mesmo e-mail/senha do Vida de Artista.'
      );
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Lendo users/${companyUid}/companySummary/current…`);

    const unsub = subscribeToCompanySummary(
      companyUid,
      (summary) => {
        if (summary == null) {
          setHasFirestoreSummary(false);
          setFirestoreValue(null);
          setStatusMessage(
            `Doc não encontrado para UID ${companyUid.slice(0, 8)}… Abra o painel Vida de Artista logado para publicar o espelho.`
          );
        } else {
          setHasFirestoreSummary(true);
          const raw = Number(summary.availableProLabore);
          const value = Number.isFinite(raw) ? Math.max(0, raw) : 0;
          setFirestoreValue(value);
          setStatusMessage(
            value > 0
              ? null
              : 'Espelho encontrado: availableProLabore = 0 (valor publicado pela empresa).'
          );
          console.info('[useProLaboreEstimate] companySummary', {
            companyUid,
            availableProLabore: value,
            raw: summary
          });
        }
        setIsLoading(false);
      },
      (err) => {
        setHasFirestoreSummary(false);
        setFirestoreValue(null);
        setIsLoading(false);
        const msg = err instanceof Error ? err.message : String(err);
        setStatusMessage(`Erro ao ler Firestore leo-ferreira-app: ${msg}`);
        console.warn('[useProLaboreEstimate] snapshot error', err);
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [currentUser?.uid, companyUid]);

  const linkCompanyWithEmail = async (email: string, password: string) => {
    setIsLinkingCompany(true);
    setStatusMessage(null);
    try {
      const user = await linkCompanyAuthWithEmail(email, password);
      setCompanyUid(user.uid);
      setStatusMessage(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Falha no login empresa: ${msg}`);
      throw err;
    } finally {
      setIsLinkingCompany(false);
    }
  };

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
    statusMessage,
    linkCompanyWithEmail,
    isLinkingCompany,
    manualOverride,
    setManualOverride,
    sourceAccountId,
    destinationAccountId,
    categoryId: PROLABORE_CATEGORY_ID,
    categoryLabel: PROLABORE_CATEGORY_LABEL
  };
}
