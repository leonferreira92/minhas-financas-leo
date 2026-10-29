import {
  Category,
  CategoryEssentiality,
  Transaction,
  TransactionType,
} from '../types';
import { getCurrentMonthPrefix } from './dateUtils';

export type CategoryPeriodKey = '3m' | '6m' | 'year';

export interface EssentialityOption {
  value: CategoryEssentiality;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  /** Classes Tailwind para pill selecionada */
  pillActive: string;
  /** Classes Tailwind para badge compacto */
  badge: string;
  dot: string;
}

export const ESSENTIALITY_OPTIONS: EssentialityOption[] = [
  {
    value: 'essential',
    label: 'Essencial',
    shortLabel: 'Essencial',
    emoji: '🟢',
    description:
      'Gastos essenciais são usados para calcular seu Custo Mínimo de Sobrevivência.',
    pillActive: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  {
    value: 'lifestyle',
    label: 'Estilo de Vida',
    shortLabel: 'Estilo',
    emoji: '🔵',
    description:
      'Gastos de lazer e desejos — o que sobra após cobrir o essencial.',
    pillActive: 'border-sky-500 bg-sky-50 text-sky-700',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
  },
  {
    value: 'investment',
    label: 'Investimento',
    shortLabel: 'Invest.',
    emoji: '🟣',
    description:
      'Aportes e reservas que constroem seu patrimônio e segurança futura.',
    pillActive: 'border-violet-500 bg-violet-50 text-violet-700',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  {
    value: 'debt',
    label: 'Dívida',
    shortLabel: 'Dívida',
    emoji: '🔴',
    description:
      'Parcelas e empréstimos — compromissos financeiros a quitar.',
    pillActive: 'border-rose-500 bg-rose-50 text-rose-700',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
];

export const PERIOD_OPTIONS: Array<{
  key: CategoryPeriodKey;
  label: string;
  months: number | 'year';
}> = [
  { key: '3m', label: 'Últimos 3 Meses', months: 3 },
  { key: '6m', label: 'Últimos 6 Meses (Padrão)', months: 6 },
  { key: 'year', label: 'Este Ano', months: 'year' },
];

const DEBT_CATEGORY_IDS = new Set(['cat_dividas']);

/** Default para categorias novas com base no tipo de fluxo. */
export function getDefaultEssentiality(
  type: TransactionType,
): CategoryEssentiality {
  if (type === 'income' || type === 'goal_deposit' || type === 'goal_withdraw') {
    return 'investment';
  }
  return 'lifestyle';
}

/** Mapeia classification legado → essentiality. */
export function mapClassificationToEssentiality(
  classification?: Category['classification'],
  categoryId?: string,
): CategoryEssentiality | undefined {
  if (categoryId && DEBT_CATEGORY_IDS.has(categoryId)) return 'debt';
  if (!classification) return undefined;
  switch (classification) {
    case 'essential':
      return 'essential';
    case 'personal':
    case 'discretionary':
    case 'extraordinary':
      return 'lifestyle';
    case 'future':
      return 'investment';
    case 'professional':
      return 'lifestyle';
    default:
      return undefined;
  }
}

/** Resolve essentiality efetiva (campo novo → legado → default por tipo). */
export function resolveCategoryEssentiality(
  cat: Pick<Category, 'id' | 'type' | 'essentiality' | 'classification'> | undefined | null,
): CategoryEssentiality {
  if (!cat) return 'lifestyle';
  if (cat.essentiality) return cat.essentiality;
  if (DEBT_CATEGORY_IDS.has(cat.id)) return 'debt';
  const fromLegacy = mapClassificationToEssentiality(cat.classification, cat.id);
  if (fromLegacy) return fromLegacy;
  return getDefaultEssentiality(cat.type);
}

export function getEssentialityOption(
  value: CategoryEssentiality,
): EssentialityOption {
  return (
    ESSENTIALITY_OPTIONS.find((o) => o.value === value) ||
    ESSENTIALITY_OPTIONS[1]
  );
}

/** Garante essentiality preenchida (migração / normalização). */
export function ensureCategoryEssentiality(cat: Category): Category {
  if (cat.essentiality) return cat;
  return {
    ...cat,
    essentiality: resolveCategoryEssentiality(cat),
  };
}

/** Prefixos YYYY-MM da janela de período (mais antigo → mais recente). */
export function getPeriodMonthPrefixes(
  period: CategoryPeriodKey,
  referenceDate?: Date | string | number | null,
): string[] {
  const current = getCurrentMonthPrefix(referenceDate);
  const [yStr, mStr] = current.split('-');
  const year = Number(yStr);
  const month = Number(mStr); // 1-12

  if (period === 'year') {
    const prefixes: string[] = [];
    for (let m = 1; m <= month; m++) {
      prefixes.push(`${year}-${String(m).padStart(2, '0')}`);
    }
    return prefixes;
  }

  const count = period === '3m' ? 3 : 6;
  const prefixes: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    prefixes.push(`${yy}-${mm}`);
  }
  return prefixes;
}

function findCategory(
  categories: Category[],
  id?: string | null,
): Category | undefined {
  if (!id) return undefined;
  return categories.find((c) => c.id === id);
}

function matchesCategoryOrChildren(
  t: Pick<Transaction, 'categoryId' | 'subcategoryId'>,
  categoryId: string,
  categories: Category[],
): boolean {
  if (t.categoryId === categoryId || t.subcategoryId === categoryId) return true;
  return categories.some(
    (c) =>
      c.parentId === categoryId &&
      (t.categoryId === c.id || t.subcategoryId === c.id),
  );
}

export function sumPeriodAmountForCategory(
  transactions: Transaction[],
  categoryId: string,
  categories: Category[],
  monthPrefixes: string[],
  type: 'expense' | 'income' = 'expense',
): number {
  if (monthPrefixes.length === 0) return 0;
  const prefixSet = new Set(monthPrefixes);
  return transactions.reduce((sum, t) => {
    const ym = t?.date?.slice(0, 7);
    if (!ym || !prefixSet.has(ym)) return sum;
    if (t.status === 'cancelled') return sum;
    if (type === 'expense' && t.type !== 'expense' && t.type !== 'goal_deposit') {
      return sum;
    }
    if (type === 'income' && t.type !== 'income' && t.type !== 'goal_withdraw') {
      return sum;
    }
    if (!matchesCategoryOrChildren(t, categoryId, categories)) return sum;
    return sum + Math.abs(Number(t.amount) || 0);
  }, 0);
}

/** Média mensal na janela (total ÷ quantidade de meses do seletor). */
export function averageMonthlyForCategory(
  transactions: Transaction[],
  categoryId: string,
  categories: Category[],
  period: CategoryPeriodKey,
  type: 'expense' | 'income' = 'expense',
): number {
  const prefixes = getPeriodMonthPrefixes(period);
  const total = sumPeriodAmountForCategory(
    transactions,
    categoryId,
    categories,
    prefixes,
    type,
  );
  const months = Math.max(1, prefixes.length);
  return total / months;
}

export interface EssentialityTotals {
  totalEssential: number;
  totalLifestyle: number;
  totalInvestment: number;
  totalDebt: number;
  /** Média mensal dos gastos essenciais na janela (Custo Mínimo de Sobrevivência). */
  survivalCost: number;
  monthsInWindow: number;
}

/**
 * Total gasto no período agrupado por essencialidade da categoria
 * (usa subcategoria quando houver; senão a mãe).
 */
export function calculateEssentialityTotals(
  transactions: Transaction[],
  categories: Category[],
  options?: {
    period?: CategoryPeriodKey;
    monthPrefixes?: string[];
    /** Se true, só conta despesas (padrão). */
    expensesOnly?: boolean;
  },
): EssentialityTotals {
  const prefixes =
    options?.monthPrefixes ||
    getPeriodMonthPrefixes(options?.period ?? '6m');
  const prefixSet = new Set(prefixes);
  const expensesOnly = options?.expensesOnly !== false;
  const monthsInWindow = Math.max(1, prefixes.length);

  let totalEssential = 0;
  let totalLifestyle = 0;
  let totalInvestment = 0;
  let totalDebt = 0;

  transactions.forEach((t) => {
    const ym = t?.date?.slice(0, 7);
    if (!ym || !prefixSet.has(ym)) return;
    if (t.status === 'cancelled') return;
    if (expensesOnly) {
      if (t.type !== 'expense' && t.type !== 'goal_deposit') return;
    }

    const cat =
      findCategory(categories, t.subcategoryId) ||
      findCategory(categories, t.categoryId);
    const ess = resolveCategoryEssentiality(cat);
    const amt = Math.abs(Number(t.amount) || 0);

    switch (ess) {
      case 'essential':
        totalEssential += amt;
        break;
      case 'lifestyle':
        totalLifestyle += amt;
        break;
      case 'investment':
        totalInvestment += amt;
        break;
      case 'debt':
        totalDebt += amt;
        break;
    }
  });

  return {
    totalEssential,
    totalLifestyle,
    totalInvestment,
    totalDebt,
    survivalCost: totalEssential / monthsInWindow,
    monthsInWindow,
  };
}
