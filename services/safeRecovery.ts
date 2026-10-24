import { loadBackupIntoStorage, BACKUP_DATA } from './backupImporter';
import { StorageService } from './storageService';
import { AppSettings, Transaction } from '../types';
import { replaceUserCloudWithLocalData, ReplaceCloudResult } from './firebaseService';

/** Uma vez por navegador: restaura o JSON oficial de 21/10/2026 após o rollback. */
export const SAFE_RESTORE_FLAG = 'fin_safe_restore_20261024';
export const SAFE_RESTORE_CLOUD_PENDING = 'fin_safe_restore_cloud_pending';

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
 * Restaura dados locais do backup oficial (21/10).
 * Remove flags de migrações quebradas (corte legado, etc.).
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

  console.info('[safeRecovery] Backup oficial 21/10 restaurado no storage local', {
    transactions: BACKUP_DATA.transactions.length,
    accounts: BACKUP_DATA.accounts.length,
    userId: userId || 'root'
  });

  return true;
};

/**
 * Reset completo: local = backup 21/10 + apaga órfãos no Firestore e grava o snapshot.
 * Use quando o cloud ainda tiver OFX/ajustes posteriores ao backup.
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
  }
  return { localOk: true, cloud };
};

/** Roda no máximo uma vez por origem (localStorage). */
export const ensureSafeRestoreOnce = (userId?: string | null): boolean => {
  try {
    if (localStorage.getItem(SAFE_RESTORE_FLAG)) return false;
  } catch {
    return false;
  }
  return applyOfficialBackupRestore(userId);
};

/** Transações vindas do cloud com marcação da migração quebrada não devem voltar ao caixa. */
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
