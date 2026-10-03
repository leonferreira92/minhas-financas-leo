/**
 * Utilitários de manipulação de data estritamente no fuso horário do Brasil (America/Sao_Paulo / UTC-3).
 * Evita o bug de conversão UTC (ex: toISOString() após as 21h que avança para o dia seguinte).
 */

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna a data atual ou fornecida no formato 'YYYY-MM-DD' estritamente no fuso local/BR.
 */
export function getLocalDateString(dateInput?: Date | string | number | null): string {
  if (!dateInput) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof dateInput === 'string') {
    // Se já estiver no formato YYYY-MM-DD puro, retorna diretamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    // Se vier com timestamp ou ISO, converte com segurança
    const parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const d = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o prefixo do mês atual 'YYYY-MM' em formato local.
 */
export function getCurrentMonthPrefix(dateInput?: Date | string | number | null): string {
  const dateStr = getLocalDateString(dateInput);
  return dateStr.slice(0, 7);
}

/**
 * Converte 'YYYY-MM-DD' para objeto Date local seguro (ao meio-dia) evitando virada de fuso.
 */
export function parseLocalDateSafe(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(dateStr);
}

/**
 * Formata 'YYYY-MM-DD' para 'DD/MM/YYYY' sem deslocamento de timezone.
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '--/--/----';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formata 'YYYY-MM-DD' para 'DD de Mês' ou 'DD/MM'.
 */
export function formatDayMonthBR(dateStr?: string | null): string {
  if (!dateStr) return '--/--';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

/**
 * Formata data por extenso em português (ex: "Sexta, 02 de Outubro").
 */
export function formatDateExtensiveBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const dateObj = parseLocalDateSafe(dateStr);
  return dateObj.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    timeZone: BRAZIL_TIMEZONE
  });
}
