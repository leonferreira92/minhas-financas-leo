import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  XCircle,
  Check,
  Wallet
} from 'lucide-react';
import { getIcon } from '../constants';
import { Transaction } from '../types';
import { TransactionForm } from './TransactionForm';

export const CalendarScreen: React.FC = () => {
  const { transactions, categories, updateTransaction, isBlurred } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const currentMonthStr = currentDate.toISOString().slice(0, 7);

  const daysArray = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentDate, daysInMonth, firstDayOfMonth]);

  const dailyData = useMemo(() => {
    const map: Record<number, { income: number; expense: number; transactions: Transaction[] }> = {};

    transactions.forEach(t => {
      if (t.status === 'cancelled') return;
      if (t.date && t.date.startsWith(currentMonthStr)) {
        const day = parseInt(t.date.split('-')[2], 10);
        if (!map[day]) map[day] = { income: 0, expense: 0, transactions: [] };
        map[day].transactions.push(t);
        if (t.type === 'income') map[day].income += Number(t.amount) || 0;
        else if (t.type === 'expense') map[day].expense += Number(t.amount) || 0;
      }
    });

    return map;
  }, [transactions, currentMonthStr]);

  const monthTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    Object.values(dailyData).forEach(day => {
      income += day.income;
      expense += day.expense;
    });
    return { income, expense, balance: income - expense };
  }, [dailyData]);

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

  const handleQuickPay = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    updateTransaction({ ...t, status: t.status === 'paid' ? 'pending' : 'paid' });
  };

  return (
    <div className="pb-24 animate-fade-in text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="sticky top-0 bg-slate-50/95 dark:bg-[#09090b]/95 backdrop-blur-xl z-20 pt-2 pb-4 px-1 border-b border-zinc-800/80">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
              Finanças pessoais
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Calendário
            </h1>
          </div>

          <div className="flex items-center space-x-1 bg-white dark:bg-[#18181b] rounded-2xl p-1 border border-zinc-800">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-black w-28 text-center capitalize text-white">
              {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-[#18181b] p-3 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center text-emerald-400 mb-1">
              <div className="p-1 bg-emerald-500/15 rounded-lg mr-1.5">
                <TrendingUp size={13} />
              </div>
              <span className="text-[9px] font-black uppercase truncate">Entradas</span>
            </div>
            <span className="text-xs font-black text-white tabular-nums">
              {formatCurrency(monthTotals.income)}
            </span>
          </div>

          <div className="bg-white dark:bg-[#18181b] p-3 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center text-rose-400 mb-1">
              <div className="p-1 bg-rose-500/15 rounded-lg mr-1.5">
                <TrendingDown size={13} />
              </div>
              <span className="text-[9px] font-black uppercase truncate">Saídas</span>
            </div>
            <span className="text-xs font-black text-white tabular-nums">
              {formatCurrency(monthTotals.expense)}
            </span>
          </div>

          <div className="bg-white dark:bg-[#18181b] p-3 rounded-2xl border border-zinc-800/80 flex flex-col justify-between">
            <div className="flex items-center text-sky-400 mb-1">
              <div className="p-1 bg-sky-500/15 rounded-lg mr-1.5">
                <Wallet size={13} />
              </div>
              <span className="text-[9px] font-black uppercase truncate">Saldo</span>
            </div>
            <span
              className={`text-xs font-black tabular-nums ${
                monthTotals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(monthTotals.balance)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-1 mt-4">
        <div className="grid grid-cols-7 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-black text-zinc-500 uppercase">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-2 gap-x-1.5">
          {daysArray.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="aspect-[4/5]" />;

            const data = dailyData[day];
            const hasIncome = data && data.income > 0;
            const hasExpense = data && data.expense > 0;
            const isSelected = selectedDay === day;
            const isToday =
              new Date().getDate() === day &&
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === currentDate.getFullYear();

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
                      ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105 z-10'
                          : isToday
                            ? 'bg-zinc-800/90 text-purple-400 border border-purple-500/50'
                            : 'bg-[#18181b] text-zinc-300 border border-zinc-800/80 hover:border-zinc-700'
                      }
                    `}
              >
                <span className={`text-xs ${isSelected || isToday ? 'font-black' : 'font-bold'}`}>
                  {day}
                </span>

                <div className="flex items-center space-x-1">
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

                <span
                  className={`text-[8px] font-bold tabular-nums ${isSelected ? 'text-purple-200' : balanceColor}`}
                >
                  {data && (data.income > 0 || data.expense > 0)
                    ? `${dayBalance > 0 ? '+' : ''}${
                        Math.abs(dayBalance) >= 1000
                          ? `${(dayBalance / 1000).toFixed(0)}k`
                          : Math.abs(dayBalance).toFixed(0)
                      }`
                    : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`
         fixed bottom-[75px] left-0 right-0 bg-[#18181b] text-white rounded-t-[2.5rem] shadow-2xl border-t border-zinc-800 transition-transform duration-300 z-30
         ${selectedDay ? 'translate-y-0' : 'translate-y-[115%]'}
         max-h-[55vh] flex flex-col
      `}
      >
        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setSelectedDay(null)}>
          <div className="w-12 h-1.5 bg-zinc-700 rounded-full cursor-pointer" />
        </div>

        <div className="px-5 py-3 flex justify-between items-center border-b border-zinc-800">
          <div>
            <h3 className="text-base font-black text-white">
              {selectedDay} de {currentDate.toLocaleDateString('pt-BR', { month: 'long' })}
            </h3>
            {selectedData && (
              <p className="text-[11px] text-zinc-400 font-medium">
                Saldo do dia:{' '}
                <span
                  className={
                    selectedData.income - selectedData.expense >= 0
                      ? 'text-emerald-400 font-bold'
                      : 'text-rose-400 font-bold'
                  }
                >
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8 no-scrollbar">
          <div className="space-y-2">
            {selectedTransactions.length === 0 ? (
              <div className="text-center py-6 text-zinc-500">
                <p className="text-xs font-bold">Nenhum lançamento nesta data.</p>
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
                        style={{
                          backgroundColor: t.status === 'paid' ? category?.color : undefined
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-black truncate ${t.status === 'pending' ? 'text-zinc-400' : 'text-white'}`}
                        >
                          {t.description}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase truncate">
                          {category?.name || 'Geral'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center space-x-2">
                      <div>
                        <p
                          className={`text-xs font-black tabular-nums ${isExpense ? 'text-zinc-200' : 'text-emerald-400'}`}
                        >
                          {isExpense ? '- ' : '+ '}
                          {formatCurrency(t.amount)}
                        </p>
                        <span className="text-[9px] text-zinc-500 block">
                          {t.status === 'pending' ? 'Agendado' : 'Efetivado'}
                        </span>
                      </div>

                      {t.status === 'pending' && (
                        <button
                          type="button"
                          onClick={e => handleQuickPay(e, t)}
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

      {isAddModalOpen && <TransactionForm onClose={() => setIsAddModalOpen(false)} />}

      {editingTransaction && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};
