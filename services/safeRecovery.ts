import { loadBackupIntoStorage, BACKUP_DATA } from './backupImporter';
import { StorageService } from './storageService';
import { AppSettings, Transaction } from '../types';
import { replaceUserCloudWithLocalData, ReplaceCloudResult } from './firebaseService';

/**
 * Flag legada do rollback 21/10.
 * Mantida só para selar dispositivos que ainda tenham o código antigo /
 * pending de wipe — NÃO dispara mais restore automático.
 */
export const SAFE_RESTORE_FLAG = 'fin_safe_restore_20261024';
export const SAFE_RESTORE_CLOUD_PENDING = 'fin_safe_restore_cloud_pending';

/** Marca que o auto-restore foi aposentado neste aparelho (nunca mais reaplica 21/10 sozinho). */
export const AUTO_RESTORE_RETIRED_FLAG = 'fin_auto_restore_retired_v1';

const stripCutoffFlagFromLocalSettings = () => {
  try {
    const settings = StorageService.getSettings() as AppSettings & {
      legacyPersonalCutoffApplied?: string;
    };
    if (settings.legacyPersonalCutoffApplied) {
      delete settings.legacyPersonalCutoffApplied;
      StorageService.saveSettings(settings);
    }
  } catch {
    // ignore
  }
};

/**
 * Aposenta o auto-restore/wipe do backup 21/10.
 * - Limpa pending que bloqueava o sync cloud (desktop ↔ celular).
 * - Sela a flag antiga para o código velho não restaurar de novo.
 * Idempotente; seguro chamar em todo login.
 */
export const retireAutoRestoreMechanisms = (): void => {
  try {
    localStorage.removeItem(SAFE_RESTORE_CLOUD_PENDING);
    // Sela como "já rodou" para builds antigos que ainda chamem ensureSafeRestoreOnce
    if (!localStorage.getItem(SAFE_RESTORE_FLAG)) {
      localStorage.setItem(SAFE_RESTORE_FLAG, 'retired');
    }
    localStorage.setItem(AUTO_RESTORE_RETIRED_FLAG, String(Date.now()));
  } catch {
    // ignore
  }
};

/**
 * Restaura dados locais do backup oficial (21/10).
 * SOMENTE via ação manual explícita — nunca no login.
 */
export const applyOfficialBackupRestore = (userId?: string | null): boolean => {
  const ok = loadBackupIntoStorage(userId || null);
  if (!ok) return false;

  stripCutoffFlagFromLocalSettings();

  try {
    localStorage.setItem(SAFE_RESTORE_FLAG, String(Date.now()));
    localStorage.setItem(SAFE_RESTORE_CLOUD_PENDING, '1');
  } catch {
    // ignore
  }

  console.info('[safeRecovery] Backup oficial 21/10 restaurado no storage local (manual)', {
    transactions: BACKUP_DATA.transactions.length,
    accounts: BACKUP_DATA.accounts.length,
    userId: userId || 'root'
  });

  return true;
};

/**
 * Reset completo MANUAL: local = backup 21/10 + substitui Firestore por esse snapshot.
 * Uso: desastre / recuperação — apaga lançamentos posteriores a 21/10 no cloud.
 */
export const resetOfficialBackupAndWipeCloud = async (
  userId?: string | null
): Promise<{ localOk: boolean; cloud?: ReplaceCloudResult }> => {
  try {
    localStorage.removeItem(SAFE_RESTORE_FLAG);
  } catch {
    // ignore
  }

  const localOk = applyOfficialBackupRestore(userId || null);
  if (!localOk) {
    return { localOk: false };
  }

  if (!userId) {
    clearCloudSyncPending();
    return {
      localOk: true,
      cloud: {
        success: true,
        deleted: {},
        written: {},
        message: 'Restaurado só no dispositivo (sem login). Faça login para limpar o Firestore.'
      }
    };
  }

  const payload = {
    accounts: StorageService.getAccounts(),
    transactions: StorageService.getTransactions(),
    debts: StorageService.getDebts(),
    categories: StorageService.getCategories(),
    budgets: StorageService.getBudgets(),
    settings: StorageService.getSettings(),
    shows: StorageService.getShows()
  };

  const cloud = await replaceUserCloudWithLocalData(userId, payload);
  if (cloud.success) {
    clearCloudSyncPending();
    retireAutoRestoreMechanisms();
  }
  return { localOk: true, cloud };
};

/**
 * Publica o estado ATUAL deste aparelho no Firestore (substitui o cloud).
 * Use no desktop/celular que tiver os lançamentos corretos — depois o outro
 * dispositivo recebe via autosync.
 */
export const pushCurrentLocalToCloud = async (
  userId: string
): Promise<ReplaceCloudResult> => {
  retireAutoRestoreMechanisms();

  const payload = {
    accounts: StorageService.getAccounts(),
    transactions: StorageService.getTransactions(),
    debts: StorageService.getDebts(),
    categories: StorageService.getCategories(),
    budgets: StorageService.getBudgets(),
    settings: StorageService.getSettings(),
    shows: StorageService.getShows()
  };

  return replaceUserCloudWithLocalData(userId, payload);
};

/**
 * @deprecated Não restaura mais. Só aposenta mecanismos legados.
 * Mantido para não quebrar imports; sempre retorna false.
 */
export const ensureSafeRestoreOnce = (_userId?: string | null): boolean => {
  retireAutoRestoreMechanisms();
  return false;
};

/** Transações com marcação de migração quebrada não devem voltar ao caixa. */
export const sanitizeCloudTransaction = (t: Transaction): Transaction => {
  if ((t as Transaction & { legacyArchived?: boolean }).legacyArchived) {
    return { ...t, status: 'cancelled' };
  }
  return t;
};

export const isCloudSyncPendingAfterRestore = (): boolean => {
  try {
    return localStorage.getItem(SAFE_RESTORE_CLOUD_PENDING) === '1';
  } catch {
    return false;
  }
};

export const clearCloudSyncPending = (): void => {
  try {
    localStorage.removeItem(SAFE_RESTORE_CLOUD_PENDING);
  } catch {
    // ignore
  }
};
