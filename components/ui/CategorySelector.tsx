import React, { useMemo } from "react";
import { Category, ScopeType, TransactionType } from "../../types";
import { getIcon } from "../../constants";
import { Check, ChevronRight } from "lucide-react";
import {
  buildCategoryTree,
  getEffectiveCategorySelectionId,
  isParentCategory,
  getActiveCategories,
} from "../../services/categoryHierarchy";
import { CategoryAvatar } from "../categories/CategoryAvatar";

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string;
  /** ID da subcategoria selecionada (opcional) */
  selectedSubcategoryId?: string;
  onSelect: (categoryOrSubId: string) => void;
  columns?: "compact" | "modal" | "grouped";
  scope?: ScopeType;
  transactionType?: TransactionType;
  /** Exibe árvore mãe + filhas (padrão em modal) */
  hierarchical?: boolean;
}

/**
 * Calcula a luminância relativa WCAG de uma cor hexadecimal
 * e retorna'#000000' (preto) para fundos claros/neon ou'#FFFFFF' (branco) para fundos escuros.
 */
export const getHighContrastTextColor = (
  hexColor?: string,
): "#000000" | "#FFFFFF" => {
  if (!hexColor) return "#FFFFFF";
  const clean = hexColor.replace("#", "").trim();
  if (clean.length !== 6) return "#FFFFFF";
  const num = parseInt(clean, 16);
  if (isNaN(num)) return "#FFFFFF";
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.36 ? "#000000" : "#FFFFFF";
};

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelect,
  columns = "compact",
  scope = "PERSONAL",
  transactionType = "expense",
  hierarchical,
}) => {
  const effectiveSelected = getEffectiveCategorySelectionId(
    selectedCategoryId,
    selectedSubcategoryId,
  );

  const useTree =
    hierarchical ?? (columns === "modal" || columns === "grouped");

  const activeCats = useMemo(
    () => getActiveCategories(categories),
    [categories],
  );

  const tree = useMemo(
    () => buildCategoryTree(activeCats, transactionType),
    [activeCats, transactionType],
  );

  const flatList = useMemo(() => {
    if (useTree) return [];
    return activeCats.filter(
      (c) => !transactionType || c.type === transactionType,
    );
  }, [activeCats, transactionType, useTree]);

  const getSelectedCardClasses = () => {
    if (scope === "BUSINESS") {
      return {
        card: "is-selected is-selected-purple bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/25",
        iconWrap: "bg-black/30 text-white border border-white/25",
        iconColor: "#FFFFFF",
        label: "text-white font-black",
        checkBadge: "bg-white text-black",
      };
    }
    if (transactionType === "expense") {
      return {
        card: "is-selected is-selected-rose bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/25",
        iconWrap: "bg-black/30 text-white border border-white/25",
        iconColor: "#FFFFFF",
        label: "text-white font-black",
        checkBadge: "bg-white text-black",
      };
    }
    return {
      card: "is-selected is-selected-green bg-emerald-500 border-emerald-300 text-black shadow-lg shadow-emerald-500/25",
      iconWrap: "bg-black/20 text-black border border-black/20",
      iconColor: "#000000",
      label: "text-black font-black",
      checkBadge: "bg-black text-white",
    };
  };

  const activeStyle = getSelectedCardClasses();

  const renderChip = (cat: Category, opts?: { indented?: boolean; bold?: boolean }) => {
    const isSelected = effectiveSelected === cat.id;
    const indented = opts?.indented;
    const bold = opts?.bold ?? isParentCategory(cat);

    return (
      <button
        key={cat.id}
        type="button"
        aria-selected={isSelected}
        data-selected={isSelected ? "true" : "false"}
        onClick={() => onSelect(cat.id)}
        className={`category-selector-card group w-full ${
          columns === "compact" ? "p-3" : "p-3.5"
        } rounded-2xl border-2 flex items-center space-x-2.5 transition-all text-left active:scale-95 ${
          indented ? "ml-4 w-[calc(100%-1rem)] border-dashed" : ""
        } ${
          isSelected
            ? activeStyle.card
            : "border-slate-200/80 bg-slate-50/90 text-slate-800 hover:border-emerald-500/60 hover:bg-slate-100 hover:text-black"
        }`}
      >
        {isSelected ? (
          <div
            className={`category-icon-badge ${
              indented ? "w-7 h-7" : columns === "compact" ? "w-8 h-8" : "w-9 h-9"
            } rounded-full flex items-center justify-center shrink-0 ${activeStyle.iconWrap}`}
          >
            {React.createElement(getIcon(cat.icon), {
              size: indented ? 14 : columns === "compact" ? 16 : 18,
              style: { color: activeStyle.iconColor },
              strokeWidth: 2.5,
            })}
          </div>
        ) : (
          <CategoryAvatar
            icon={cat.icon}
            color={cat.color}
            size="sm"
            variant={indented ? "child" : "parent"}
          />
        )}

        <span
          className={`category-card-label text-xs truncate flex-1 ${
            isSelected
              ? activeStyle.label
              : bold
                ? "text-slate-800 font-black group-hover:text-black"
                : "text-slate-700 font-bold group-hover:text-black"
          }`}
        >
          {cat.name}
        </span>

        {isSelected && (
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 shadow-xs ${activeStyle.checkBadge}`}
          >
            <Check size={10} strokeWidth={3.5} />
          </span>
        )}
      </button>
    );
  };

  if (useTree) {
    const visibleTree = tree.filter(({ parent, children }) => {
      const inList =
        activeCats.some((c) => c.id === parent.id) ||
        children.some((ch) => activeCats.some((c) => c.id === ch.id));
      return inList;
    });

    return (
      <div className="space-y-3">
        {visibleTree.map(({ parent, children }) => {
          const parentInFilter = activeCats.some((c) => c.id === parent.id);
          const filteredChildren = children.filter((ch) =>
            activeCats.some((c) => c.id === ch.id),
          );
          // Se a busca/ranking só trouxe filhos, ainda mostra o pai como cabeçalho
          const showParent = parentInFilter || filteredChildren.length > 0;
          if (!showParent) return null;

          return (
            <div key={parent.id} className="space-y-1.5">
              {parentInFilter ? (
                renderChip(parent, { bold: true })
              ) : (
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  <ChevronRight size={12} className="text-slate-300" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {parent.name}
                  </span>
                </div>
              )}
              {filteredChildren.map((child) =>
                renderChip(child, { indented: true, bold: false }),
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const gridClass =
    columns === "compact"
      ? "grid grid-cols-2 sm:grid-cols-4 gap-2"
      : "grid grid-cols-2 gap-2.5 pr-1";

  return (
    <div className={gridClass}>
      {flatList.map((cat) => renderChip(cat))}
    </div>
  );
};
