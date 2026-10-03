import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  BarChart3, ChevronLeft, ChevronRight, TrendingDown, 
  ArrowUpRight, PieChart, Calendar, Filter, ArrowLeft,
  Sparkles, Layers, Wallet, Tag
} from 'lucide-react';
import { getIcon } from '../constants';
import { ScopeSelector } from './ScopeSelector';
import { matchesScope } from '../types';

export const ExpenseAnalysisScreen: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, categories, activeScope, isBlurred, accounts } = useFinance();

  // Current month state (YYYY-MM)
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Month navigation offset
  const changeMonth = (offset: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  // Month Label
  const monthName = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  // Filtered expense transactions for selected month & active scope
  const monthExpenses = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (!t.date || !t.date.startsWith(selectedMonth)) return false;
      if (t.status === 'cancelled') return false;
      return matchesScope(t.scope, activeScope);
    });
  }, [transactions, selectedMonth, activeScope]);

  // Total expense amount
  const totalExpense = useMemo(() => {
    return monthExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [monthExpenses]);

  // Total paid vs pending
  const paidExpense = useMemo(() => {
    return monthExpenses.filter(t => t.status === 'paid').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [monthExpenses]);

  const pendingExpense = useMemo(() => {
    return monthExpenses.filter(t => t.status === 'pending').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [monthExpenses]);

  // Aggregated categories sorted highest to lowest
  const categoryStats = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    monthExpenses.forEach(t => {
      const catId = t.categoryId || 'cat_other';
      const prev = map.get(catId) || { amount: 0, count: 0 };
      map.set(catId, {
        amount: prev.amount + (Number(t.amount) || 0),
        count: prev.count + 1
      });
    });

    const list = Array.from(map.entries()).map(([catId, data]) => {
      const cat = categories.find(c => c.id === catId) || {
        id: catId,
        name: catId === 'cat_other' ? 'Outros / Diversos' : 'Categoria Geral',
        color: '#64748b',
        icon: 'Tag',
        type: 'expense'
      };
      const percentage = totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0;
      return {
        cat,
        amount: data.amount,
        count: data.count,
        percentage
      };
    });

    return list.sort((a, b) => b.amount - a.amount);
  }, [monthExpenses, categories, totalExpense]);

  // Maximum value for bar scaling
  const maxCategoryAmount = useMemo(() => {
    if (categoryStats.length === 0) return 1;
    return Math.max(...categoryStats.map(c => c.amount));
  }, [categoryStats]);

  return (
    <div className="space-y-6 pb-24 animate-fade-in text-white">
      {/* HEADER SUPERIOR COM ESTILO INSTITUCIONAL BB */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition active:scale-95"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="text-[#fcca00]" size={22} />
              <span>Meus Gastos</span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">Análise e distribuição por categoria</p>
          </div>
        </div>

        <ScopeSelector size="sm" />
      </div>

      {/* SELETOR DE MÊS NAVEGÁVEL */}
      <div className="flex items-center justify-between bg-zinc-900/90 border border-zinc-800 rounded-2xl p-2 px-3 shadow-md">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition active:scale-95"
          title="Mês Anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center">
          <span className="text-[10px] uppercase tracking-widest text-[#fcca00] font-black">Período Selecionado</span>
          <p className="text-sm font-black text-white capitalize">{monthName}</p>
        </div>

        <button
          onClick={() => changeMonth(1)}
          className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition active:scale-95"
          title="Próximo Mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* CARD PRINCIPAL DE TOTAL DE GASTOS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002d6c] to-[#001838] border border-blue-600/30 p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-blue-200 flex items-center gap-1.5">
              <TrendingDown size={14} className="text-rose-400" />
              Total de Gastos no Mês
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-900/60 border border-blue-400/20 text-blue-300">
              {monthExpenses.length} lançamentos
            </span>
          </div>

          <div className="mt-3">
            <h2 className="text-3xl font-black text-white tracking-tight">
              {formatCurrency(totalExpense)}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-blue-700/40 text-xs">
            <div>
              <span className="text-blue-300 text-[10px] uppercase font-bold block">Efetivado (Pago)</span>
              <span className="text-sm font-black text-white">{formatCurrency(paidExpense)}</span>
            </div>
            <div>
              <span className="text-amber-300 text-[10px] uppercase font-bold block">Previsto (A Pagar)</span>
              <span className="text-sm font-black text-amber-200">{formatCurrency(pendingExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICO COM BARRAS VERTICAIS */}
      <div className="p-4 rounded-3xl bg-[#121214] border border-zinc-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <BarChart3 size={15} className="text-[#fcca00]" />
            <span>Distribuição Gráfica (Top Categorias)</span>
          </h3>
          <span className="text-[10px] text-zinc-400">Em % do total gasto</span>
        </div>

        {categoryStats.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 text-xs">
            Nenhuma despesa registrada neste período.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visualizador de Barras Verticais */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-1 border-b border-zinc-800">
              {categoryStats.slice(0, 6).map((item, idx) => {
                const heightPercent = maxCategoryAmount > 0 
                  ? Math.max(12, Math.round((item.amount / maxCategoryAmount) * 100)) 
                  : 12;

                return (
                  <div key={item.cat.id} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] font-black text-zinc-300 mb-1 opacity-90 group-hover:text-[#fcca00] transition">
                      {item.percentage.toFixed(0)}%
                    </span>
                    <div className="w-full max-w-[38px] bg-zinc-800 rounded-t-lg overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:scale-y-105" style={{ height: `${heightPercent}%` }}>
                      <div 
                        className="w-full h-full rounded-t-lg transition"
                        style={{ backgroundColor: item.cat.color || '#3b82f6' }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 mt-2 truncate w-full text-center">
                      {item.cat.name.slice(0, 7)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-center text-zinc-400">Exibindo as principais categorias com maior peso no orçamento</p>
          </div>
        )}
      </div>

      {/* LISTAGEM DETALHADA ORDENADA DO MAIOR PARA O MENOR */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
            Categorias Ordenadas por Valor
          </h3>
          <span className="text-[10px] text-zinc-400 font-bold">{categoryStats.length} categorias</span>
        </div>

        {categoryStats.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
            Nenhuma despesa para exibir no filtro atual.
          </div>
        ) : (
          <div className="space-y-2.5">
            {categoryStats.map((item, idx) => {
              const Icon = getIcon(item.cat.icon);
              return (
                <div 
                  key={item.cat.id}
                  className="p-3.5 rounded-2xl bg-[#18181b] border border-zinc-800 hover:border-zinc-700 transition flex flex-col gap-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                        style={{ backgroundColor: `${item.cat.color || '#6366f1'}20`, color: item.cat.color || '#6366f1' }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-white truncate">{item.cat.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0">
                            #{idx + 1}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block">
                          {item.count} {item.count === 1 ? 'transação' : 'transações'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-rose-400 block">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {item.percentage.toFixed(1)}% do total
                      </span>
                    </div>
                  </div>

                  {/* Barra de progresso percentual */}
                  <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: item.cat.color || '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
