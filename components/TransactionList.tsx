
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getIcon } from '../constants';
import { ArrowDownCircle, CheckCircle2, Search, Filter, Clock, Bell, Repeat, Calendar, XCircle, ChevronDown, TrendingUp, TrendingDown, Check, Circle, Wallet, ArrowRightLeft, Layers, ChevronLeft, ChevronRight, PiggyBank } from 'lucide-react';
import { Transaction } from '../types';
import { TransactionForm } from './TransactionForm';

export const TransactionList = () => {
  const { transactions, categories, updateTransaction, accounts } = useFinance();
  
  // Modal State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Filters State
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedTransactions = useMemo(() => {
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
        // Filter by Category
        if (categoryIdFilter) return t.categoryId === categoryIdFilter;
        return true;
      })
      .filter(t => searchTerm ? t.description.toLowerCase().includes(searchTerm.toLowerCase()) : true)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, monthFilter, activeFilter, categoryIdFilter, searchTerm]);

  // Calculate totals based on filtered view
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let pendingCount = 0;
    
    sortedTransactions.forEach(t => {
      if (t.type === 'income' || t.type === 'goal_withdraw') income += t.amount;
      else if (t.type === 'expense' || t.type === 'goal_deposit') expense += t.amount;
      if (t.status === 'pending') pendingCount++;
    });
    return { income, expense, total: income - expense, pendingCount };
  }, [sortedTransactions]);

  // Group by date
  const grouped = sortedTransactions.reduce((acc, t) => {
    const dateKey = t.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); 
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Hoje';
    if (isYesterday) return 'Ontem';
    
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleToggleStatus = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    updateTransaction({ ...t, status: t.status === 'paid' ? 'pending' : 'paid' });
  };

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

  return (
    <div className="pb-24 animate-fade-in relative text-slate-900 dark:text-slate-100 min-h-screen">
      
      {/* --- Intelligent Header --- */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl z-30 pt-2 pb-0 transition-colors border-b border-slate-200 dark:border-slate-800/50 shadow-sm">
        <div className="px-4 pb-3">
           
           {/* Top Bar: Title & Month Navigation */}
           <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Extrato</h1>
              
              {/* Improved Month Selector */}
              <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 rounded-full p-1 border border-slate-200 dark:border-slate-800 shadow-sm">
                 <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400 active:scale-95">
                    <ChevronLeft size={18} />
                 </button>
                 <div className="relative group px-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize w-24 text-center block pointer-events-none truncate">
                       {formatMonthDisplay(monthFilter)}
                    </span>
                    <input 
                       type="month" 
                       value={monthFilter}
                       onChange={(e) => setMonthFilter(e.target.value)}
                       className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                 </div>
                 <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400 active:scale-95">
                    <ChevronRight size={18} />
                 </button>
              </div>
           </div>

           {/* Contextual Summary Card */}
           <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 mb-4 flex items-center justify-between">
              {activeFilter === 'pending' ? (
                 <div className="flex items-center space-x-3 w-full">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl">
                       <Clock size={24} />
                    </div>
                    <div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendentes</span>
                       <div className="flex items-baseline space-x-1">
                          <span className="text-lg font-black text-slate-800 dark:text-white">{summary.pendingCount}</span>
                          <span className="text-xs font-medium text-slate-400">transações</span>
                       </div>
                    </div>
                 </div>
              ) : (
                 <>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado</span>
                      <span className={`text-2xl font-black tracking-tight ${summary.total >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                         {formatCurrency(summary.total)}
                      </span>
                   </div>
                   <div className="flex space-x-4 text-right">
                      <div>
                         <span className="block text-[9px] font-bold text-slate-400 uppercase">Entrada</span>
                         <span className="block text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.income)}</span>
                      </div>
                      <div>
                         <span className="block text-[9px] font-bold text-slate-400 uppercase">Saída</span>
                         <span className="block text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(summary.expense)}</span>
                      </div>
                   </div>
                 </>
              )}
           </div>

           {/* Smart Filters (Chips) */}
           <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
              
              {/* Category Filter Dropdown masked as Chip */}
              <div className="relative shrink-0">
                 <Layers size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none ${categoryIdFilter ? 'text-white' : 'text-slate-500'}`} />
                 <select
                    value={categoryIdFilter}
                    onChange={(e) => setCategoryIdFilter(e.target.value)}
                    className={`appearance-none pl-8 pr-8 py-2 rounded-full text-xs font-bold transition-all border outline-none cursor-pointer ${
                       categoryIdFilter 
                       ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                       : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                 >
                    <option value="">Categorias</option>
                    {categories.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                 </select>
                 <ChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${categoryIdFilter ? 'text-white' : 'text-slate-400'}`} />
              </div>

              {[
                { id: 'all', label: 'Todos' },
                { id: 'income', label: 'Receitas', icon: TrendingUp },
                { id: 'expense', label: 'Despesas', icon: TrendingDown },
                { id: 'pending', label: 'Pendentes', icon: Clock }
              ].map(f => {
                const isActive = activeFilter === f.id;
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id as any)}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border shrink-0 active:scale-95 ${
                       isActive 
                         ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' 
                         : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                     {Icon && <Icon size={12} />}
                     <span>{f.label}</span>
                  </button>
                )
              })}
           </div>

           {/* Search Bar */}
           <div className="mt-3 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                 type="text" 
                 placeholder="Buscar por nome, valor..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-900/50 border border-transparent focus:border-indigo-500/50 rounded-xl text-sm font-medium outline-none text-slate-800 dark:text-white placeholder:text-slate-400 transition-all focus:bg-white dark:focus:bg-slate-900"
              />
              {searchTerm && (
                 <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                   <XCircle size={16} />
                 </button>
               )}
           </div>
        </div>
      </div>

      {/* --- Transactions List --- */}
      <div className="px-4 mt-4 space-y-6">
        {Object.keys(grouped).length === 0 ? (
           <div className="text-center py-20 opacity-60 flex flex-col items-center">
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                 <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-800 dark:text-white font-bold text-lg mb-1">Nenhum lançamento</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                 Não encontramos transações para os filtros aplicados.
              </p>
           </div>
        ) : (
          (Object.entries(grouped) as [string, Transaction[]][]).map(([date, items]) => (
            <div key={date} className="relative">
              
              {/* Date Header */}
              <div className="flex items-center mb-3 sticky top-[220px] z-10">
                 <div className="bg-slate-200 dark:bg-slate-800 h-px flex-1"></div>
                 <span className="mx-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-950 px-2 rounded-full">
                    {formatDate(date)}
                 </span>
                 <div className="bg-slate-200 dark:bg-slate-800 h-px flex-1"></div>
              </div>
              
              <div className="space-y-3 relative">
                 {/* Timeline vertical line */}
                 <div className="absolute left-6 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800 -z-10"></div>

                 {items.map((t) => {
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
                      className={`group relative bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 hover:border-indigo-100 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer ${isPending ? 'bg-amber-500/[0.015] dark:bg-amber-500/[0.01]' : ''}`}
                    >
                      <div className="flex items-center">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-sm border border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-800 z-10 relative group-hover:scale-105 transition-transform`}>
                           {t.type === 'transfer' ? (
                             <ArrowRightLeft size={20} className="text-blue-500" />
                           ) : t.type === 'goal_deposit' || t.type === 'goal_withdraw' ? (
                             <PiggyBank size={20} className="text-indigo-500" />
                           ) : (
                             <Icon size={20} style={{ color: category?.color || '#64748b' }} />
                           )}
                           
                           {/* Status Mini Indicator */}
                           {isPending && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                 <Clock size={8} className="text-white" />
                              </div>
                           )}
                        </div>
                        
                        {/* Main Info */}
                        <div className="flex-1 min-w-0 mr-2">
                          <h4 className={`text-sm font-bold truncate ${isPending ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-white'}`}>
                             {t.description}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {t.type === 'transfer' ? 'Transferência' : (t.type === 'goal_deposit' ? 'Aporte em Meta' : t.type === 'goal_withdraw' ? 'Resgate de Meta' : category?.name)}
                             </span>

                             {/* Tags/Badges */}
                             {isPending && (
                               <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/20 dark:border-amber-900/40 uppercase">
                                  Pendente
                               </span>
                             )}
                             {t.isFixed && (
                               <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 uppercase">
                                  <Repeat size={8} className="mr-1" /> Fixa
                               </span>
                             )}
                             {t.installmentNumber && (
                               <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 uppercase">
                                  {t.installmentNumber}/{t.installmentTotal}
                               </span>
                             )}
                             {account && (
                               <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800">
                                  <Wallet size={8} className="mr-1" /> {account.name}
                               </span>
                             )}
                          </div>
                        </div>

                        {/* Amount & Action */}
                        <div className="flex flex-col items-end justify-center">
                          <span className={`text-sm font-black tabular-nums mb-1 ${
                            isPending 
                              ? 'text-slate-400' 
                              : isExpense 
                                ? 'text-slate-800 dark:text-white' 
                                : isIncome 
                                  ? 'text-emerald-500' 
                                  : 'text-slate-500 dark:text-slate-400'
                          }`}>
                              {isExpense ? '- ' : isIncome ? '+ ' : '⇄ '}{formatCurrency(t.amount)}
                          </span>
                          
                          {/* Quick Action Button */}
                          <button 
                             onClick={(e) => handleToggleStatus(e, t)}
                             className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                                isPending 
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200' 
                                  : 'text-slate-300 hover:text-slate-500'
                             }`}
                          >
                             {isPending ? <Check size={16} strokeWidth={3} /> : <CheckCircle2 size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <TransactionForm 
           transaction={editingTransaction} 
           onClose={() => setEditingTransaction(null)} 
        />
      )}
    </div>
  );
};
