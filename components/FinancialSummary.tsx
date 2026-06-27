
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ChevronLeft, Calendar, TrendingUp, TrendingDown, DollarSign, Wallet, Clock, ArrowRight, ChevronRight, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CalendarModal } from './CalendarModal';
import * as XLSX from 'xlsx';

export const FinancialSummary = () => {
  const { getBalanceSummary, transactions, categories, accounts, isBlurred } = useFinance();
  
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [projectionDate, setProjectionDate] = useState(() => {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return endOfMonth.toISOString().slice(0, 10);
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Derived Data
  const summary = useMemo(() => 
    getBalanceSummary(currentMonth, projectionDate), 
  [currentMonth, projectionDate, getBalanceSummary]);

  const totalMonthlyIncome = summary.monthlyIncome + summary.pendingIncome;
  const totalMonthlyExpense = summary.monthlyExpense + summary.pendingExpense;
  const monthlyDifference = totalMonthlyIncome - totalMonthlyExpense;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const changeMonth = (direction: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setCurrentMonth(date.toISOString().slice(0, 7));
  };

  const formatMonthDisplay = (isoMonth: string) => {
    const [year, month] = isoMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const exportToExcel = () => {
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const data = monthTransactions.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const acc = accounts.find(a => a.id === t.accountId);
      return {
        Data: t.date,
        Descrição: t.description,
        Categoria: cat?.name || 'Geral',
        Conta: acc?.name || 'N/A',
        Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
        Valor: t.amount,
        Status: t.status === 'paid' ? 'Pago' : 'Pendente'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
    XLSX.writeFile(workbook, `Relatorio_Financeiro_${currentMonth}.xlsx`);
  };

  return (
    <div className="pb-24 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Link to="/" className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400 active:scale-95">
             <ChevronLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Resumo Financeiro</h1>
        </div>
        <button 
          onClick={exportToExcel}
          className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all hover:bg-indigo-700 flex items-center space-x-2"
          title="Exportar Excel"
        >
          <Download size={20} />
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Exportar</span>
        </button>
      </div>

      {/* --- Section 1: Monthly Flow --- */}
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center px-1">
           <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fluxo Mensal</h2>
           
           <div className="flex items-center bg-white dark:bg-slate-900 rounded-full px-1 py-1 shadow-sm border border-slate-100 dark:border-slate-800">
             <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-indigo-600 dark:text-indigo-400">
                <ChevronLeft size={16} />
             </button>
             <div className="relative mx-1">
               <span className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize w-24 text-center block pointer-events-none">
                  {formatMonthDisplay(currentMonth)}
               </span>
               <input 
                 type="month" 
                 value={currentMonth}
                 onChange={(e) => setCurrentMonth(e.target.value)}
                 className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
               />
             </div>
             <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-indigo-600 dark:text-indigo-400">
                <ChevronRight size={16} />
             </button>
           </div>
        </div>

        {/* Main Monthly Result Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
           <div className="grid grid-cols-3 gap-4 text-center divide-x divide-slate-100 dark:divide-slate-800">
              <div>
                 <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Receitas</span>
                 <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{isBlurred ? '••••' : formatCurrency(totalMonthlyIncome)}</span>
              </div>
              <div>
                 <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Despesas</span>
                 <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{isBlurred ? '••••' : formatCurrency(totalMonthlyExpense)}</span>
              </div>
              <div>
                 <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Diferença</span>
                 <span className={`text-sm font-bold ${monthlyDifference >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`}>
                    {isBlurred ? '••••' : formatCurrency(monthlyDifference)}
                 </span>
              </div>
           </div>
        </div>

        {/* Breakdown Details */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
           {/* Income Breakdown */}
           <div className="p-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center mb-3">
                 <div className="bg-emerald-100 dark:bg-emerald-900/50 p-1.5 rounded-lg mr-3 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp size={16} />
                 </div>
                 <span className="font-bold text-slate-700 dark:text-slate-200">Detalhe Receitas</span>
              </div>
              <div className="space-y-2 pl-10">
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Recebido (Pago)</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{isBlurred ? '••••' : formatCurrency(summary.monthlyIncome)}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center"><Clock size={10} className="mr-1 text-amber-500"/> Pendente</span>
                    <span className="font-medium text-slate-400 dark:text-slate-500">{isBlurred ? '••••' : formatCurrency(summary.pendingIncome)}</span>
                 </div>
              </div>
           </div>

           {/* Expense Breakdown */}
           <div className="p-4">
              <div className="flex items-center mb-3">
                 <div className="bg-rose-100 dark:bg-rose-900/50 p-1.5 rounded-lg mr-3 text-rose-600 dark:text-rose-400">
                    <TrendingDown size={16} />
                 </div>
                 <span className="font-bold text-slate-700 dark:text-slate-200">Detalhe Despesas</span>
              </div>
              <div className="space-y-2 pl-10">
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Pago</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400">{isBlurred ? '••••' : formatCurrency(summary.monthlyExpense)}</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center"><Clock size={10} className="mr-1 text-amber-500"/> Pendente</span>
                    <span className="font-medium text-amber-600 dark:text-amber-500">{isBlurred ? '••••' : formatCurrency(summary.pendingExpense)}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* --- Section 2: Balance & Projection --- */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Projeção de Caixa</h2>
        
        {/* Real Balance */}
        <div className="bg-slate-900 dark:bg-slate-800 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between">
           <div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center mb-1">
                <Wallet size={12} className="mr-1"/> Saldo Real
              </span>
              <span className="text-2xl font-bold">{isBlurred ? '••••' : formatCurrency(summary.realBalance)}</span>
              <p className="text-[10px] text-slate-500 mt-1">Considera saldo inicial + transações efetivadas.</p>
           </div>
           <div className="bg-white/10 p-2 rounded-full">
              <DollarSign size={24} className="text-emerald-400" />
           </div>
        </div>

        {/* Projected Balance */}
        <div className="bg-indigo-600 dark:bg-indigo-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
           <div className="absolute -right-4 -top-4 text-indigo-500 dark:text-indigo-800 opacity-20">
              <TrendingUp size={100} />
           </div>
           
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <label className="text-indigo-200 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider flex items-center">
                  <ArrowRight size={12} className="mr-1"/> Saldo Previsto
                </label>
                <button 
                  onClick={() => setIsCalendarOpen(true)}
                  className="relative bg-indigo-700/50 dark:bg-indigo-800/50 border border-indigo-500 dark:border-indigo-700 rounded px-2 py-1 flex items-center hover:bg-indigo-700 transition"
                >
                   <span className="text-xs font-semibold text-white">{new Date(projectionDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                   <Calendar size={12} className="ml-1.5 opacity-70" />
                </button>
              </div>

              <span className="text-3xl font-bold">{isBlurred ? '••••' : formatCurrency(summary.projectedBalance)}</span>
              
              <div className="mt-4 pt-4 border-t border-indigo-500/30 flex justify-between text-xs text-indigo-100 dark:text-indigo-200">
                 <span>Saldo Real</span>
                 <span>+</span>
                 <span>Pendentes até a data</span>
              </div>
           </div>
        </div>
      </div>

      <CalendarModal 
         isOpen={isCalendarOpen} 
         onClose={() => setIsCalendarOpen(false)} 
         selectedDate={projectionDate} 
         onSelect={(d) => setProjectionDate(d)} 
         title="Data da Projeção"
      />
    </div>
  );
};
