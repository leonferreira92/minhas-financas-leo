import React, { useMemo } from 'react';
import { Transaction, Category } from '../../types';
import { getIcon } from '../../constants';
import { PieChart, ChevronRight, Layers, ArrowRight } from 'lucide-react';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonthStr: string;
  isBlurred: boolean;
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  transactions,
  categories,
  selectedMonthStr,
  isBlurred,
  selectedCategoryId,
  onSelectCategory
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const categoryExpenses = useMemo(() => {
    // Filter expenses in selected month
    const monthExpenses = transactions.filter(
      t => t.date.startsWith(selectedMonthStr) && (t.type === 'expense' || t.type === 'goal_deposit')
    );

    const totalExpenseSum = monthExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Group by category
    const catMap: Record<string, { total: number; count: number }> = {};
    monthExpenses.forEach(t => {
      const catId = t.categoryId || 'uncategorized';
      if (!catMap[catId]) catMap[catId] = { total: 0, count: 0 };
      catMap[catId].total += Number(t.amount) || 0;
      catMap[catId].count += 1;
    });

    // Convert to array and sort descending by total
    const list = Object.entries(catMap).map(([catId, data]) => {
      const category = categories.find(c => c.id === catId);
      const percentage = totalExpenseSum > 0 ? Math.round((data.total / totalExpenseSum) * 100) : 0;
      return {
        catId,
        name: category ? category.name : 'Outras Despesas',
        color: category?.color || '#64748b',
        icon: category?.icon || 'Receipt',
        total: data.total,
        count: data.count,
        percentage
      };
    }).sort((a, b) => b.total - a.total);

    return { list, totalExpenseSum };
  }, [transactions, categories, selectedMonthStr]);

  return (
    <div id="para-onde-esta-indo-meu-dinheiro-section" className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <PieChart size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Distribuição</h3>
            <p className="text-sm font-black text-slate-800 dark:text-white">Para Onde Está Indo Meu Dinheiro?</p>
          </div>
        </div>

        {selectedCategoryId && (
          <button
            onClick={() => onSelectCategory('')}
            className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 transition"
          >
            Limpar Filtro
          </button>
        )}
      </div>

      {categoryExpenses.list.length === 0 ? (
        <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Nenhuma despesa registrada neste mês</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categoryExpenses.list.map(cat => {
            const IconComp = getIcon(cat.icon);
            const isSelected = selectedCategoryId === cat.catId;

            return (
              <div
                key={cat.catId}
                onClick={() => onSelectCategory(isSelected ? '' : cat.catId)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 shadow-sm'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-100 dark:border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconComp size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cat.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {cat.count} {cat.count === 1 ? 'lançamento' : 'lançamentos'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center space-x-3 shrink-0">
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white tabular-nums">
                        {!isBlurred ? formatCurrency(cat.total) : '••••'}
                      </p>
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                        {cat.percentage}% do total
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Proportional Progress Bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(3, cat.percentage)}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
