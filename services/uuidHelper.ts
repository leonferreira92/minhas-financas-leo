/**
 * Utilitário seguro para geração de identificadores únicos.
 * Funciona em todos os navegadores, iframes e ambientes sem SecureContext (HTTP/sandbox).
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback se ocorrer erro de contexto de segurança
    }
  }

  // Fallback RFC4122 v4 compatível
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
