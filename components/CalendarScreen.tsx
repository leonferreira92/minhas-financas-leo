import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, 
  Calendar as CalendarIcon, XCircle, Plus, Music, MapPin, 
  Clock, ArrowRight, Check, CheckCircle2 
} from 'lucide-react';
import { getIcon } from '../constants';
import { Transaction, Show } from '../types';
import { TransactionForm } from './TransactionForm';

export const CalendarScreen: React.FC = () => {
  const navigate = useNavigate();
  const { transactions, categories, shows, updateTransaction, isBlurred } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // --- Calendar Logic ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday
  
  const currentMonthStr = currentDate.toISOString().slice(0, 7); // YYYY-MM
  
  const daysArray = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [currentDate, daysInMonth, firstDayOfMonth]);

  // --- Unified Data Processing: Transações + Shows ---
  const dailyData = useMemo(() => {
    const map: Record<number, { income: number; expense: number; transactions: Transaction[]; shows: Show[] }> = {};
    
    // Process transactions
    transactions.forEach(t => {
      if (t.status === 'cancelled') return;
      if (t.date && t.date.startsWith(currentMonthStr)) {
        const parts = t.date.split('-');
        const day = parseInt(parts[2], 10);
        if (!map[day]) map[day] = { income: 0, expense: 0, transactions: [], shows: [] };
        
        map[day].transactions.push(t);
        if (t.type === 'income') map[day].income += Number(t.amount) || 0;
        else if (t.type === 'expense') map[day].expense += Number(t.amount) || 0;
      }
    });

    // Process shows
    shows.forEach(s => {
      if (s.status === 'Cancelado') return;
      if (s.date && s.date.startsWith(currentMonthStr)) {
        const parts = s.date.split('-');
        const day = parseInt(parts[2], 10);
        if (!map[day]) map[day] = { income: 0, expense: 0, transactions: [], shows: [] };
        
        map[day].shows.push(s);
      }
    });

    return map;
  }, [transactions, shows, currentMonthStr]);

  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let showsCount = 0;
    let showsTotalCache = 0;

    Object.values(dailyData).forEach(day => {
      income += day.income;
      expense += day.expense;
      showsCount += day.shows.length;
      day.shows.forEach(s => {
        showsTotalCache += Number(s.totalCache || s.cacheCombined || 0);
      });
    });

    return { 
      income, 
      expense, 
      balance: income - expense,
      showsCount,
      showsTotalCache
    };
  }, [dailyData]);

  // --- Handlers ---
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(selectedDay === day ? null : day);
  };

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const selectedData = selectedDay ? dailyData[selectedDay] : null;
  const selectedTransactions = selectedData 
    ? selectedData.transactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    : [];
  const selectedShows = selectedData ? selectedData.shows : [];

  const handleQuickPay = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    updateTransaction({ ...t, status: t.status === 'paid' ? 'pending' : 'paid' });
  };

  return (
    <div className="pb-24 animate-fade-in text-slate-900 dark:text-slate-100 min-h-screen">
      
      {/* --- Header --- */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-[#09090b]/95 backdrop-blur-xl z-20 pt-2 pb-4 px-1 border-b border-zinc-800/80">
        <div className="flex justify-between items-center mb-4">
           <div>
             <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
               Visão Unificada
             </span>
             <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
               Agenda & Calendário
             </h1>
           </div>

           <div className="flex items-center space-x-1 bg-white dark:bg-[#18181b] rounded-2xl p-1 border border-zinc-800">
              <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition">
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-black w-28 text-center capitalize text-white">
                {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition">
                <ChevronRight size={18} />
              </button>
           </div>
        </div>

        {/* Monthly Summary Chips: Entradas, Saídas e Shows */}
        <div className="grid grid-cols-3 gap-2">
           <div className="bg-white dark:bg-[#18181b] p-3 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
              <div className="flex items-center text-emerald-400 mb-1">
                 <div className="p-1 bg-emerald-500/15 rounded-lg mr-1.5"><TrendingUp size={13}/></div>
                 <span className="text-[9px] font-black uppercase truncate">Entradas</span>
              </div>
              <span className="text-xs font-black text-white tabular-nums">{formatCurrency(monthTotals.income)}</span>
           </div>

           <div className="bg-white dark:bg-[#18181b] p-3 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
              <div className="flex items-center text-rose-400 mb-1">
                 <div className="p-1 bg-rose-500/15 rounded-lg mr-1.5"><TrendingDown size={13}/></div>
                 <span className="text-[9px] font-black uppercase truncate">Saídas</span>
              </div>
              <span className="text-xs font-black text-white tabular-nums">{formatCurrency(monthTotals.expense)}</span>
           </div>

           <div className="bg-white dark:bg-[#18181b] p-3 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
              <div className="flex items-center text-purple-400 mb-1">
                 <div className="p-1 bg-purple-500/15 rounded-lg mr-1.5"><Music size={13}/></div>
                 <span className="text-[9px] font-black uppercase truncate">{monthTotals.showsCount} {monthTotals.showsCount === 1 ? 'Show' : 'Shows'}</span>
              </div>
              <span className="text-xs font-black text-white tabular-nums">{formatCurrency(monthTotals.showsTotalCache)}</span>
           </div>
        </div>
      </div>

      {/* --- Calendar Grid --- */}
      <div className="px-1 mt-4">
         {/* Weekdays */}
         <div className="grid grid-cols-7 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-zinc-500 uppercase">{d}</div>
            ))}
         </div>

         {/* Days */}
         <div className="grid grid-cols-7 gap-y-2 gap-x-1.5">
            {daysArray.map((day, i) => {
               if (day === null) return <div key={`empty-${i}`} className="aspect-[4/5]" />;
               
               const data = dailyData[day];
               const hasIncome = data && data.income > 0;
               const hasExpense = data && data.expense > 0;
               const hasShows = data && data.shows.length > 0;
               const isSelected = selectedDay === day;
               const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
               
               const dayBalance = data ? data.income - data.expense : 0;
               let balanceColor = 'text-zinc-500';
               if (dayBalance > 0) balanceColor = 'text-emerald-400';
               if (dayBalance < 0) balanceColor = 'text-rose-400';

               return (
                  <button 
                    key={day} 
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative aspect-[4/5] rounded-2xl flex flex-col items-center justify-between p-1.5 transition-all duration-200 active:scale-95
                      ${isSelected 
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 z-10' 
                        : isToday 
                           ? 'bg-zinc-800/90 text-purple-400 border border-purple-500/50' 
                           : 'bg-[#18181b] text-zinc-300 border border-zinc-800/80 hover:border-zinc-700'}
                    `}
                  >
                     <span className={`text-xs ${isSelected || isToday ? 'font-black' : 'font-bold'}`}>{day}</span>
                     
                     {/* Dots Indicators: Shows (Roxo), Entradas (Verde), Saídas (Vermelho) */}
                     <div className="flex items-center space-x-1">
                        {hasShows && (
                          <div 
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-400 shadow-[0_0_6px_#c084fc]'}`} 
                            title={`${data.shows.length} show(s)`}
                          />
                        )}
                        {hasIncome && (
                          <div 
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-200' : 'bg-emerald-500'}`}
                          />
                        )}
                        {hasExpense && (
                          <div 
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-rose-200' : 'bg-rose-500'}`}
                          />
                        )}
                     </div>

                     {/* Saldo ou Quantidade de Shows */}
                     <span className={`text-[8px] font-bold tabular-nums ${isSelected ? 'text-purple-200' : balanceColor}`}>
                        {hasShows 
                          ? `🎸 ${data.shows.length}` 
                          : data && (data.income > 0 || data.expense > 0)
                          ? `${dayBalance > 0 ? '+' : ''}${Math.abs(dayBalance) >= 1000 ? `${(dayBalance/1000).toFixed(0)}k` : Math.abs(dayBalance).toFixed(0)}`
                          : ''}
                     </span>
                  </button>
               );
            })}
         </div>
      </div>

      {/* --- Details Sheet (Bottom) --- */}
      <div className={`
         fixed bottom-[75px] left-0 right-0 bg-[#18181b] text-white rounded-t-[2.5rem] shadow-2xl border-t border-zinc-800 transition-transform duration-300 z-30
         ${selectedDay ? 'translate-y-0' : 'translate-y-[115%]'}
         max-h-[55vh] flex flex-col
      `}>
         {/* Handle Bar */}
         <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setSelectedDay(null)}>
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full cursor-pointer"></div>
         </div>

         {/* Header */}
         <div className="px-5 py-3 flex justify-between items-center border-b border-zinc-800">
            <div>
               <h3 className="text-base font-black text-white">
                 {selectedDay} de {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}
               </h3>
               {selectedData && (
                 <p className="text-[11px] text-zinc-400 font-medium">
                    {selectedShows.length > 0 && <span className="text-purple-400 font-bold mr-2">🎸 {selectedShows.length} Show(s)</span>}
                    Saldo do dia: <span className={selectedData.income - selectedData.expense >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {formatCurrency(selectedData.income - selectedData.expense)}
                    </span>
                 </p>
               )}
            </div>
            <button 
              onClick={() => setSelectedDay(null)}
              className="p-2 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white"
            >
               <XCircle size={18} />
            </button>
         </div>

         {/* List: Shows + Transactions */}
         <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8 no-scrollbar">
            
            {/* 1. SEÇÃO DE SHOWS DA DATA */}
            {selectedShows.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider flex items-center">
                  <Music size={12} className="mr-1" /> Shows & Apresentações do Dia
                </span>
                
                {selectedShows.map(show => (
                  <div
                    key={show.id}
                    onClick={() => navigate(`/shows?showId=${show.id}`)}
                    className="p-3.5 rounded-2xl bg-[#121212] hover:bg-zinc-800 border border-purple-500/30 hover:border-purple-500/60 transition cursor-pointer flex items-center justify-between gap-3 shadow-xs group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <Music size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-black text-white truncate group-hover:text-purple-300">
                            {show.contractorName || show.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800">
                            {show.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-0.5">
                          <span className="flex items-center"><Clock size={10} className="mr-0.5" /> {show.time || '20:00'}</span>
                          {show.city && <span className="flex items-center truncate"><MapPin size={10} className="mr-0.5" /> {show.city}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center space-x-2">
                      <div>
                        <span className="text-xs font-black text-emerald-400 block tabular-nums">
                          {formatCurrency(show.totalCache || show.cacheCombined || 0)}
                        </span>
                        <span className="text-[9px] text-zinc-500 block">Cachê</span>
                      </div>
                      <ArrowRight size={14} className="text-zinc-500 group-hover:text-white transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. SEÇÃO DE TRANSAÇÕES FINANCEIRAS */}
            <div className="space-y-2">
              {selectedShows.length > 0 && (
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block pt-2">
                  Movimentações Financeiras
                </span>
              )}

              {selectedTransactions.length === 0 && selectedShows.length === 0 ? (
                <div className="text-center py-6 text-zinc-500">
                  <p className="text-xs font-bold">Nenhum lançamento ou show nesta data.</p>
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-3 text-xs font-black uppercase text-purple-400 bg-purple-500/15 hover:bg-purple-500/25 px-4 py-2 rounded-xl transition"
                  >
                     + Adicionar Movimentação
                  </button>
                </div>
              ) : (
                selectedTransactions.map(t => {
                  const category = categories.find(c => c.id === t.categoryId);
                  const Icon = category ? getIcon(category.icon) : CalendarIcon;
                  const isExpense = t.type === 'expense';
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => setEditingTransaction(t)}
                      className="bg-[#121212] hover:bg-zinc-800 p-3 rounded-2xl flex items-center justify-between transition cursor-pointer border border-zinc-800/80 active:scale-[0.99]"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div 
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${t.status === 'pending' ? 'bg-zinc-800 text-zinc-400' : ''}`} 
                          style={{ backgroundColor: t.status === 'paid' ? category?.color : undefined }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-black truncate ${t.status === 'pending' ? 'text-zinc-400' : 'text-white'}`}>{t.description}</p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase truncate">{category?.name || 'Geral'}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center space-x-2">
                        <div>
                          <p className={`text-xs font-black tabular-nums ${isExpense ? 'text-zinc-200' : 'text-emerald-400'}`}>
                            {isExpense ? '- ' : '+ '}{formatCurrency(t.amount)}
                          </p>
                          <span className="text-[9px] text-zinc-500 block">
                            {t.status === 'pending' ? 'Agendado' : 'Efetivado'}
                          </span>
                        </div>

                        {t.status === 'pending' && (
                          <button 
                            type="button"
                            onClick={(e) => handleQuickPay(e, t)} 
                            className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-emerald-500 hover:text-white transition"
                            title="Efetivar agora"
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
         </div>
      </div>

      {isAddModalOpen && (
        <TransactionForm onClose={() => setIsAddModalOpen(false)} />
      )}

      {editingTransaction && (
         <TransactionForm 
            transaction={editingTransaction}
            onClose={() => setEditingTransaction(null)}
         />
      )}

    </div>
  );
};
