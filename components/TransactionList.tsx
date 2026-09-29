import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { getIcon } from '../constants';
import { 
  ArrowDownCircle, CheckCircle2, Search, Filter, Clock, 
  Repeat, Calendar, XCircle, ChevronDown, TrendingUp, 
  TrendingDown, Check, Circle, Wallet, ArrowRightLeft, 
  Layers, ChevronLeft, ChevronRight, PiggyBank, Plus,
  ListFilter, X, Receipt, Music
} from 'lucide-react';
import { Transaction } from '../types';
import { TransactionForm } from './TransactionForm';
import { PanoramaCard } from './extrato/PanoramaCard';
import { MonthFlowOverview } from './extrato/MonthFlowOverview';
import { CategoryBreakdown } from './extrato/CategoryBreakdown';
import { UpcomingCommitments } from './extrato/UpcomingCommitments';

export const TransactionList = () => {
  const navigate = useNavigate();
  const { transactions, categories, updateTransaction, accounts, getBalanceSummary, isBlurred, toggleBlur } = useFinance();
  
  // Modal State for Editing Transaction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);

  // Filters State
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState('');
  const [accountIdFilter, setAccountIdFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Balance Summary calculation
  const lastDayOfMonth = useMemo(() => {
    const [y, m] = monthFilter.split('-').map(Number);
    return new Date(y, m, 0).toISOString().slice(0, 10);
  }, [monthFilter]);

  const summaryData = useMemo(() => {
    return getBalanceSummary(monthFilter, lastDayOfMonth);
  }, [getBalanceSummary, monthFilter, lastDayOfMonth]);

  // Handle Month Navigation
  const changeMonth = (direction: number) => {
    const [year, month] = monthFilter.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setMonthFilter(date.toISOString().slice(0, 7));
  };

  const formatMonthDisplay = (isoMonth: string) => {
    const [year, month] = isoMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Filtered & Sorted Transactions List
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(monthFilter))
      .filter(t => {
        // Filter by Type/Status
        if (activeFilter === 'all') return true;
        if (activeFilter === 'pending') return t.status === 'pending';
        if (activeFilter === 'income') return t.type === 'income' || t.type === 'goal_withdraw';
        if (activeFilter === 'expense') return t.type === 'expense' || t.type === 'goal_deposit';
        return t.type === activeFilter;
      })
      .filter(t => {
        if (categoryIdFilter) return t.categoryId === categoryIdFilter;
        return true;
      })
      .filter(t => {
        if (accountIdFilter) return t.accountId === accountIdFilter;
        return true;
      })
      .filter(t => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          t.description.toLowerCase().includes(term) ||
          t.amount.toString().includes(term)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, monthFilter, activeFilter, categoryIdFilter, accountIdFilter, searchTerm]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const dateKey = t.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); 
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) return 'HOJE';
    if (isYesterday) return 'ONTEM';
    if (isTomorrow) return 'AMANHÃ';
    
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date).toUpperCase();
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleToggleStatus = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    updateTransaction({ ...t, status: t.status === 'paid' ? 'pending' : 'paid' });
  };

  // Selected Month formatted string
  const monthNameFormatted = useMemo(() => {
    const [y, m] = monthFilter.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [monthFilter]);

  return (
    <div className="pb-32 sm:pb-24 animate-fade-in text-slate-900 dark:text-slate-100 min-h-screen space-y-6 max-w-5xl mx-auto px-2 sm:px-4 pt-2">
      
      {/* 1. CABEÇALHO COMPACTO E MODERNO */}
      <div className="flex items-center justify-between px-1 py-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm sticky top-2 z-30">
        <div className="flex items-center space-x-2 pl-2">
          <h1 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Extrato</h1>
        </div>

        {/* Compact Month Navigation */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/80 dark:border-slate-700">
          <button 
            onClick={() => changeMonth(-1)} 
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-300 active:scale-95"
            title="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="relative group px-1">
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider px-2 block cursor-pointer">
              {formatMonthDisplay(monthFilter)}
            </span>
            <input 
              type="month" 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          <button 
            onClick={() => changeMonth(1)} 
            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition text-slate-600 dark:text-slate-300 active:scale-95"
            title="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={() => setIsNewTransactionModalOpen(true)}
          className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition active:scale-95 shadow-md flex items-center justify-center mr-1"
          title="Nova Transação"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* 2. CARD DE PANORAMA FINANCEIRO */}
      <PanoramaCard
        resultadoAtual={summaryData.monthlyIncome - summaryData.monthlyExpense}
        totalEntradas={summaryData.monthlyIncome}
        totalSaidas={summaryData.monthlyExpense}
        aReceber={summaryData.pendingIncome}
        aPagar={summaryData.pendingExpense}
        saldoProjetado={summaryData.projectedBalance}
        isBlurred={isBlurred}
        onToggleBlur={toggleBlur}
        monthName={monthNameFormatted}
      />

      {/* 3. FLUXO DO MÊS */}
      <MonthFlowOverview
        transactions={transactions}
        selectedMonthStr={monthFilter}
        isBlurred={isBlurred}
      />

      {/* 4. PARA ONDE ESTÁ INDO MEU DINHEIRO? */}
      <CategoryBreakdown
        transactions={transactions}
        categories={categories}
        selectedMonthStr={monthFilter}
        isBlurred={isBlurred}
        selectedCategoryId={categoryIdFilter}
        onSelectCategory={(catId) => {
          setCategoryIdFilter(catId);
          // Scroll smoothly to transactions list
          document.getElementById('movimentacoes-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 5. PRÓXIMOS COMPROMISSOS */}
      <UpcomingCommitments
        transactions={transactions}
        categories={categories}
        selectedMonthStr={monthFilter}
        isBlurred={isBlurred}
        onSelectTransaction={(t) => setEditingTransaction(t)}
        onToggleStatus={handleToggleStatus}
      />

      {/* 6. MOVIMENTAÇÕES DETALHADAS */}
      <div id="movimentacoes-section" className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ListFilter size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Extrato Detalhado</h3>
              <p className="text-sm font-black text-slate-800 dark:text-white">Movimentações ({filteredTransactions.length})</p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar lançamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-xs font-medium outline-none text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-indigo-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-0.5">
                <XCircle size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Primary Filter Tabs: TODAS | ENTRADAS | SAÍDAS | PENDENTES */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'TODAS' },
            { id: 'income', label: 'ENTRADAS', icon: TrendingUp },
            { id: 'expense', label: 'SAÍDAS', icon: TrendingDown },
            { id: 'pending', label: 'PENDENTES', icon: Clock }
          ].map(f => {
            const isActive = activeFilter === f.id;
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 active:scale-95 border ${
                  isActive 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {Icon && <Icon size={12} />}
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Dropdown Filters (Category & Account) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryIdFilter}
              onChange={(e) => setCategoryIdFilter(e.target.value)}
              className={`pl-3 pr-8 py-1.5 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border outline-none appearance-none ${
                categoryIdFilter 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="">Todas as Categorias</option>
              {categories.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${categoryIdFilter ? 'text-white' : 'text-slate-400'}`} />
          </div>

          {/* Account Dropdown */}
          <div className="relative">
            <select
              value={accountIdFilter}
              onChange={(e) => setAccountIdFilter(e.target.value)}
              className={`pl-3 pr-8 py-1.5 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border outline-none appearance-none ${
                accountIdFilter 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="">Todas as Contas</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${accountIdFilter ? 'text-white' : 'text-slate-400'}`} />
          </div>

          {(categoryIdFilter || accountIdFilter || searchTerm) && (
            <button
              onClick={() => {
                setCategoryIdFilter('');
                setAccountIdFilter('');
                setSearchTerm('');
              }}
              className="text-[10px] font-bold uppercase text-rose-500 hover:underline flex items-center space-x-1 pl-1"
            >
              <X size={12} />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* Grouped Transactions List */}
        <div className="space-y-5 pt-2">
          {Object.keys(groupedTransactions).length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Nenhum lançamento encontrado
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Altere os filtros ou adicione uma nova movimentação.
              </p>
            </div>
          ) : (
            (Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([date, items]) => (
              <div key={date} className="space-y-2">
                
                {/* Date Group Header */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                    {formatDateLabel(date)}
                  </span>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                </div>

                <div className="space-y-2">
                  {items.map(t => {
                    const category = categories.find(c => c.id === t.categoryId);
                    const Icon = category ? getIcon(category.icon) : ArrowDownCircle;
                    const isExpense = t.type === 'expense' || t.type === 'goal_deposit';
                    const isIncome = t.type === 'income' || t.type === 'goal_withdraw';
                    const isPending = t.status === 'pending';
                    const account = accounts.find(a => a.id === t.accountId);

                    return (
                      <div
                        key={t.id}
                        onClick={() => setEditingTransaction(t)}
                        className={`group p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isPending
                            ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.015] border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-500/[0.06]'
                            : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          {/* Icon with Status Badge */}
                          <div className="relative shrink-0">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                              style={{ 
                                backgroundColor: isExpense ? '#fef2f2' : isIncome ? '#ecfdf5' : '#f1f5f9',
                                color: isExpense ? '#ef4444' : isIncome ? '#10b981' : '#3b82f6'
                              }}
                            >
                              {t.type === 'transfer' ? (
                                <ArrowRightLeft size={18} />
                              ) : t.type === 'goal_deposit' || t.type === 'goal_withdraw' ? (
                                <PiggyBank size={18} />
                              ) : (
                                <Icon size={18} style={{ color: category?.color }} />
                              )}
                            </div>

                            {isPending && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                <Clock size={7} className="text-white" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0">
                            <h4 className={`text-xs font-black truncate ${isPending ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-white'}`}>
                              {t.description}
                            </h4>

                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                {t.type === 'transfer' ? 'Transferência' : category ? category.name : 'Geral'}
                              </span>

                              {/* Badges */}
                              {isPending ? (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 uppercase">
                                  Pendente
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 uppercase">
                                  Pago
                                </span>
                              )}

                              {t.isFixed && (
                                <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 uppercase">
                                  <Repeat size={8} className="mr-0.5" /> Fixa
                                </span>
                              )}

                              {t.installmentNumber && (
                                <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-black bg-orange-50 dark:bg-orange-950/50 text-orange-600 uppercase">
                                  {t.installmentNumber}/{t.installmentTotal}
                                </span>
                              )}

                              {account && (
                                <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-medium text-slate-400 bg-slate-200/60 dark:bg-slate-700/60">
                                  <Wallet size={8} className="mr-0.5" /> {account.name}
                                </span>
                              )}

                              {t.showId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/shows?showId=${t.showId}`);
                                  }}
                                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-black bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 uppercase transition"
                                  title="Acessar Detalhes do Show Vinculado"
                                >
                                  <Music size={8} className="mr-0.5" /> Show
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Status Action */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="text-right">
                            <span className={`text-xs sm:text-sm font-black tabular-nums block ${
                              isExpense ? 'text-slate-800 dark:text-white' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                            }`}>
                              {isExpense ? '- ' : isIncome ? '+ ' : ''}{!isBlurred ? formatCurrency(t.amount) : '••••'}
                            </span>
                          </div>

                          {/* Quick Toggle Paid / Pending Button */}
                          <button
                            onClick={(e) => handleToggleStatus(e, t)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                              isPending
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 dark:border-emerald-800'
                                : 'text-emerald-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                            title={isPending ? "Marcar como Pago" : "Marcar como Pendente"}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL EDITAR TRANSAÇÃO */}
      {editingTransaction && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* MODAL NOVA TRANSAÇÃO */}
      {isNewTransactionModalOpen && (
        <TransactionForm
          onClose={() => setIsNewTransactionModalOpen(false)}
        />
      )}
    </div>
  );
};
