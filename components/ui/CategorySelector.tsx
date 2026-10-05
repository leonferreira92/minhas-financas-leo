import React from 'react';
import { Category, ScopeType, TransactionType } from '../../types';
import { getIcon } from '../../constants';
import { Check } from 'lucide-react';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  columns?: 'compact' | 'modal';
  scope?: ScopeType;
  transactionType?: TransactionType;
}

/**
 * Calcula a luminância relativa WCAG de uma cor hexadecimal
 * e retorna '#000000' (preto) para fundos claros/neon ou '#FFFFFF' (branco) para fundos escuros.
 */
export const getHighContrastTextColor = (hexColor?: string): '#000000' | '#FFFFFF' => {
  if (!hexColor) return '#FFFFFF';
  const clean = hexColor.replace('#', '').trim();
  if (clean.length !== 6) return '#FFFFFF';
  const num = parseInt(clean, 16);
  if (isNaN(num)) return '#FFFFFF';
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.36 ? '#000000' : '#FFFFFF';
};

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onSelect,
  columns = 'compact',
  scope = 'PERSONAL',
  transactionType = 'expense'
}) => {
  const gridClass =
    columns === 'compact'
      ? 'grid grid-cols-2 sm:grid-cols-4 gap-2'
      : 'grid grid-cols-2 gap-2.5 pr-1';

  // Cor de fundo de seleção ativa com contraste garantido (#000000 ou #FFFFFF)
  const getSelectedCardClasses = () => {
    if (scope === 'BUSINESS') {
      // Fundo Roxo -> Texto e Ícone Branco Absoluto (#FFFFFF)
      return {
        card: 'is-selected is-selected-purple bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/25',
        iconWrap: 'bg-black/30 text-white border border-white/25',
        iconColor: '#FFFFFF',
        label: 'text-white font-black',
        checkBadge: 'bg-white text-black'
      };
    }
    if (transactionType === 'expense') {
      // Fundo Rosa/Vermelho -> Texto e Ícone Branco Absoluto (#FFFFFF)
      return {
        card: 'is-selected is-selected-rose bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/25',
        iconWrap: 'bg-black/30 text-white border border-white/25',
        iconColor: '#FFFFFF',
        label: 'text-white font-black',
        checkBadge: 'bg-white text-black'
      };
    }
    // Fundo Verde Neon (Receita / Pessoal) -> Texto e Ícone Preto Absoluto (#000000)
    return {
      card: 'is-selected is-selected-green bg-emerald-500 border-emerald-300 text-black shadow-lg shadow-emerald-500/25',
      iconWrap: 'bg-black/20 text-black border border-black/20',
      iconColor: '#000000',
      label: 'text-black font-black',
      checkBadge: 'bg-black text-white'
    };
  };

  const activeStyle = getSelectedCardClasses();

  return (
    <div className={gridClass}>
      {categories.map((cat) => {
        const Icon = getIcon(cat.icon);
        const isSelected = selectedCategoryId === cat.id;
        const badgeBg = cat.color || '#6366f1';
        const badgeIconContrast = getHighContrastTextColor(badgeBg);

        return (
          <button
            key={cat.id}
            type="button"
            aria-selected={isSelected}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={() => onSelect(cat.id)}
            className={`category-selector-card group ${
              columns === 'compact' ? 'p-3' : 'p-3.5'
            } rounded-2xl border-2 flex items-center space-x-2.5 transition-all text-left active:scale-95 ${
              isSelected
                ? activeStyle.card
                : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:border-emerald-500/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white'
            }`}
          >
            <div
              className={`category-icon-badge ${
                columns === 'compact' ? 'w-8 h-8' : 'w-9 h-9'
              } rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                isSelected ? activeStyle.iconWrap : 'ring-1 ring-black/10 dark:ring-white/15'
              }`}
              style={!isSelected ? { backgroundColor: badgeBg, color: badgeIconContrast } : undefined}
            >
              <Icon
                size={columns === 'compact' ? 16 : 18}
                style={{ color: isSelected ? activeStyle.iconColor : badgeIconContrast }}
                strokeWidth={2.5}
              />
            </div>

            <span
              className={`category-card-label text-xs truncate flex-1 ${
                isSelected
                  ? activeStyle.label
                  : 'text-slate-800 dark:text-slate-100 font-bold group-hover:text-black dark:group-hover:text-white'
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
      })}
    </div>
  );
};
