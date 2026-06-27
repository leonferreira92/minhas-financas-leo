
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ChevronLeft, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Calendar as CalendarIcon, XCircle, Plus } from 'lucide-react';
import { getIcon } from '../constants';
import { Transaction } from '../types';
import { TransactionForm } from './TransactionForm';

export const CalendarScreen = () => {
  const { transactions, categories, updateTransaction } = useFinance();
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

  // --- Data Processing ---
  const dailyData = useMemo(() => {
    const map: Record<number, { income: number; expense: number; transactions: Transaction[] }> = {};
    
    transactions.forEach(t => {
      if (t.date.startsWith(currentMonthStr)) {
        const day = parseInt(t.date.split('-')[2]);
        if (!map[day]) map[day] = { income: 0, expense: 0, transactions: [] };
        
        map[day].transactions.push(t);
        if (t.type === 'income') map[day].income += t.amount;
        else if (t.type === 'expense') map[day].expense += t.amount;
      }
    });
    return map;
  }, [transactions, currentMonthStr]);

  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    Object.values(dailyData).forEach((day: { income: number; expense: number }) => {
      income += day.income;
      expense += day.expense;
    });
    return { income, expense, balance: income - expense };
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

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const selectedDateStr = selectedDay 
    ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;

  const selectedTransactions = selectedDay && dailyData[selectedDay] 
    ? dailyData[selectedDay].transactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    : [];

  const handleQuickPay = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    updateTransaction({ ...t, status: t.status === 'paid' ? 'pending' : 'paid' });
  };

  return (
    <div className="pb-24 animate-fade-in text-slate-900 dark:text-slate-100 min-h-screen">
      
      {/* --- Header --- */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl z-20 pt-2 pb-4 px-1 shadow-sm border-b border-slate-200 dark:border-slate-800/50">
        <div className="flex justify-between items-center mb-4">
           <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Calendário</h1>
           <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 rounded-full p-1 border border-slate-200 dark:border-slate-800">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronLeft size={20} /></button>
              <span className="text-sm font-bold w-32 text-center capitalize">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"><ChevronRight size={20} /></button>
           </div>
        </div>

        {/* Monthly Summary Chips */}
        <div className="flex justify-between space-x-2">
           <div className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
              <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                 <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg mr-2"><TrendingUp size={14}/></div>
                 <span className="text-[10px] font-black uppercase">Entradas</span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatCurrency(monthTotals.income)}</span>
           </div>
           <div className="flex-1 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
              <div className="flex items-center text-rose-600 dark:text-rose-400">
                 <div className="p-1.5 bg-rose-100 dark:bg-rose-900/50 rounded-lg mr-2"><TrendingDown size={14}/></div>
                 <span className="text-[10px] font-black uppercase">Saídas</span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatCurrency(monthTotals.expense)}</span>
           </div>
        </div>
      </div>

      {/* --- Calendar Grid --- */}
      <div className="px-1 mt-4">
         {/* Weekdays */}
         <div className="grid grid-cols-7 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>
            ))}
         </div>

         {/* Days */}
         <div className="grid grid-cols-7 gap-y-2 gap-x-1">
            {daysArray.map((day, i) => {
               if (day === null) return <div key={`empty-${i}`} className="aspect-[4/5]" />;
               
               const data = dailyData[day];
               const hasIncome = data && data.income > 0;
               const hasExpense = data && data.expense > 0;
               const isSelected = selectedDay === day;
               const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
               
               // Balance Calculation for visual cue
               const dayBalance = data ? data.income - data.expense : 0;
               let balanceColor = 'text-slate-300 dark:text-slate-600';
               if (dayBalance > 0) balanceColor = 'text-emerald-400';
               if (dayBalance < 0) balanceColor = 'text-rose-400';

               return (
                  <button 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative aspect-[4/5] rounded-2xl flex flex-col items-center justify-start pt-2 transition-all duration-200
                      ${isSelected 
                        ? 'bg-indigo-600 text-white shadow-lg scale-105 z-10' 
                        : isToday 
                           ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' 
                           : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'}
                    `}
                  >
                     <span className={`text-sm font-bold ${isSelected || isToday ? 'font-black' : ''}`}>{day}</span>
                     
                     {/* Dots Indicators */}
                     <div className="flex space-x-1 mt-1.5">
                        {hasIncome && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`}></div>}
                        {hasExpense && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-rose-300' : 'bg-rose-500'}`}></div>}
                     </div>

                     {/* Tiny Balance (Optional) */}
                     {data && (
                        <span className={`mt-auto mb-2 text-[8px] font-bold ${isSelected ? 'text-indigo-200' : balanceColor}`}>
                           {dayBalance > 0 ? '+' : ''}{Math.abs(dayBalance) >= 1000 ? `${(dayBalance/1000).toFixed(0)}k` : Math.abs(dayBalance).toFixed(0)}
                        </span>
                     )}
                  </button>
               )
            })}
         </div>
      </div>

      {/* --- Details Sheet (Bottom) --- */}
      <div className={`
         fixed bottom-[80px] left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-none border-t border-slate-100 dark:border-slate-800 transition-transform duration-500 z-10
         ${selectedDay ? 'translate-y-0' : 'translate-y-[110%]'}
         max-h-[50vh] flex flex-col
      `}>
         {/* Handle Bar */}
         <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setSelectedDay(null)}>
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer"></div>
         </div>

         {/* Header */}
         <div className="px-6 py-3 flex justify-between items-center border-b border-slate-50 dark:border-slate-800">
            <div>
               <h3 className="text-lg font-black text-slate-800 dark:text-white">
                 {selectedDay} de {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}
               </h3>
               {dailyData[selectedDay || 0] && (
                 <p className="text-xs text-slate-500 font-medium">
                    Saldo do dia: <span className={dailyData[selectedDay || 0].income - dailyData[selectedDay || 0].expense >= 0 ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                      {formatCurrency(dailyData[selectedDay || 0].income - dailyData[selectedDay || 0].expense)}
                    </span>
                 </p>
               )}
            </div>
            <button 
              onClick={() => setSelectedDay(null)}
              className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400"
            >
               <XCircle size={20} />
            </button>
         </div>

         {/* Transactions List */}
         <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8 no-scrollbar">
            {selectedTransactions.length === 0 ? (
               <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">Nenhum lançamento neste dia.</p>
                  <button 
                    onClick={() => { setIsAddModalOpen(true); }}
                    className="mt-4 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl"
                  >
                     + Adicionar Novo
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
                       className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex items-center justify-between active:scale-[0.98] transition cursor-pointer border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
                     >
                        <div className="flex items-center space-x-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${t.status === 'pending' ? 'bg-slate-300 dark:bg-slate-700' : ''}`} style={{ backgroundColor: t.status === 'paid' ? category?.color : undefined }}>
                              <Icon size={18} />
                           </div>
                           <div>
                              <p className={`text-sm font-bold ${t.status === 'pending' ? 'text-slate-500' : 'text-slate-800 dark:text-white'}`}>{t.description}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{category?.name}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={`text-sm font-bold ${isExpense ? 'text-slate-800 dark:text-white' : 'text-emerald-500'}`}>
                              {isExpense ? '-' : '+'} {formatCurrency(t.amount)}
                           </p>
                           {t.status === 'pending' && (
                              <button onClick={(e) => handleQuickPay(e, t)} className="text-[9px] font-bold text-emerald-500 uppercase mt-1 border border-emerald-200 dark:border-emerald-900 px-1.5 rounded hover:bg-emerald-50">
                                 Marcar Pago
                              </button>
                           )}
                        </div>
                     </div>
                  )
               })
            )}
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
