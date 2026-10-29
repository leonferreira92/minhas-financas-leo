import { Category, Transaction, TransactionType } from '../types';
import { ensureCategoryEssentiality } from './categoryEssentiality';

export const isParentCategory = (cat: Category): boolean =>
  cat.parentId == null || cat.parentId === '';

export const isSubcategory = (cat: Category): boolean => !isParentCategory(cat);

export function getParentCategories(
  categories: Category[],
  type?: TransactionType,
): Category[] {
  return categories
    .filter((c) => isParentCategory(c) && (!type || c.type === type))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function getChildCategories(
  categories: Category[],
  parentId: string,
): Category[] {
  return categories
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function getCategoryById(
  categories: Category[],
  id?: string | null,
): Category | undefined {
  if (!id) return undefined;
  return categories.find((c) => c.id === id);
}

/** Resolve seleção no seletor: sub → salva pai em categoryId + subcategoryId */
export function resolveCategorySelection(
  selectedId: string,
  categories: Category[],
): { categoryId: string; subcategoryId?: string } {
  const selected = getCategoryById(categories, selectedId);
  if (!selected) {
    return { categoryId: selectedId };
  }
  if (selected.parentId) {
    return {
      categoryId: selected.parentId,
      subcategoryId: selected.id,
    };
  }
  return { categoryId: selected.id };
}

/** ID efetivo para exibir no seletor (prefere a sub se houver) */
export function getEffectiveCategorySelectionId(
  categoryId?: string,
  subcategoryId?: string,
): string {
  return subcategoryId || categoryId || '';
}

export function getDisplayCategory(
  categories: Category[],
  categoryId?: string,
  subcategoryId?: string,
): Category | undefined {
  if (subcategoryId) {
    const sub = getCategoryById(categories, subcategoryId);
    if (sub) return sub;
  }
  return getCategoryById(categories, categoryId);
}

export function getCategoryBreadcrumb(
  categories: Category[],
  categoryId?: string,
  subcategoryId?: string,
): string {
  const parent = getCategoryById(categories, categoryId);
  const sub = subcategoryId
    ? getCategoryById(categories, subcategoryId)
    : undefined;
  if (parent && sub) return `${parent.name} › ${sub.name}`;
  if (sub) return sub.name;
  if (parent) return parent.name;
  return 'A Classificar';
}

/** Agrupa mães + filhos para selects / listas Mobills */
export function buildCategoryTree(
  categories: Category[],
  type?: TransactionType,
): Array<{ parent: Category; children: Category[] }> {
  return getParentCategories(categories, type).map((parent) => ({
    parent,
    children: getChildCategories(categories, parent.id),
  }));
}

export function transactionMatchesCategoryFilter(
  t: Pick<Transaction, 'categoryId' | 'subcategoryId'>,
  filterId: string,
  categories: Category[],
): boolean {
  if (!filterId) return true;
  if (t.categoryId === filterId || t.subcategoryId === filterId) return true;

  const children = getChildCategories(categories, filterId);
  if (children.length === 0) return false;
  return children.some(
    (c) => t.categoryId === c.id || t.subcategoryId === c.id,
  );
}

/**
 * Filtro hierárquico: categoria mãe + subcategoria opcional.
 * subcategoryId vazio = todas as subs da mãe.
 */
export function transactionMatchesHierarchyFilter(
  t: Pick<Transaction, 'categoryId' | 'subcategoryId'>,
  categoryId: string,
  subcategoryId: string | undefined,
  categories: Category[],
): boolean {
  if (!categoryId && !subcategoryId) return true;

  if (subcategoryId) {
    return (
      t.subcategoryId === subcategoryId ||
      t.categoryId === subcategoryId
    );
  }

  return transactionMatchesCategoryFilter(t, categoryId, categories);
}

/** Monta query string para drill-down Categorias → Extrato */
export function buildExtratoCategoryQuery(
  categoryId: string,
  subcategoryId?: string | null,
): string {
  const params = new URLSearchParams();
  params.set('categoryId', categoryId);
  if (subcategoryId) params.set('subcategoryId', subcategoryId);
  return params.toString();
}

export function normalizeCategoryRecord(cat: Category, systemIds: Set<string>): Category {
  return ensureCategoryEssentiality({
    ...cat,
    parentId: cat.parentId ?? null,
    isSystem: cat.isSystem ?? systemIds.has(cat.id),
    archived: Boolean(cat.archived),
  });
}

/** Categorias disponíveis para novos lançamentos (não arquivadas). */
export function getActiveCategories(categories: Category[]): Category[] {
  const archivedIds = new Set(
    categories.filter((c) => c.archived).map((c) => c.id),
  );
  return categories.filter((c) => {
    if (c.archived) return false;
    // Filho de mãe arquivada também some do seletor
    if (c.parentId && archivedIds.has(c.parentId)) return false;
    return true;
  });
}

export function countCategoryUsage(
  transactions: Array<Pick<Transaction, 'categoryId' | 'subcategoryId'>>,
): Record<string, number> {
  const stats: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.categoryId) stats[t.categoryId] = (stats[t.categoryId] || 0) + 1;
    if (t.subcategoryId) {
      stats[t.subcategoryId] = (stats[t.subcategoryId] || 0) + 1;
    }
  });
  return stats;
}

export function sumMonthAmountForCategory(
  transactions: Transaction[],
  categoryId: string,
  categories: Category[],
  monthPrefix: string,
  type: 'expense' | 'income' = 'expense',
): number {
  return transactions.reduce((sum, t) => {
    if (!t?.date?.startsWith(monthPrefix)) return sum;
    if (t.status === 'cancelled') return sum;
    if (type === 'expense' && t.type !== 'expense' && t.type !== 'goal_deposit') {
      return sum;
    }
    if (type === 'income' && t.type !== 'income' && t.type !== 'goal_withdraw') {
      return sum;
    }
    if (!transactionMatchesCategoryFilter(t, categoryId, categories)) return sum;
    return sum + Math.abs(Number(t.amount) || 0);
  }, 0);
}
