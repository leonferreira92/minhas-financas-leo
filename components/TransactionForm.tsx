
import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { 
  X, Check, Trash2, Bell, BellRing, Repeat, Copy, Layers, 
  Sparkles, Loader2, TrendingUp, ArrowRightLeft, Calculator, 
  AlertTriangle, RefreshCw, Lock, AlertCircle, Calendar as CalendarIcon,
  ChevronDown, Wallet
} from 'lucide-react';
import { getIcon } from '../constants';
import { GeminiService } from '../services/geminiService';
import { CalendarModal } from './CalendarModal';

interface Props {
  onClose: () => void;
  initialType?: TransactionType;
  initialCategoryId?: string;
  transaction?: Transaction | null;
}

export const TransactionForm: React.FC<Props> = ({ onClose, initialType = 'expense', initialCategoryId, transaction }) => {
  const { 
    addTransaction, updateTransactionSeries, updateDebtTransaction, 
    deleteTransaction, categories, transactions, accounts, checkTransactionImpact 
  } = useFinance();
  
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategoryId || '');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<TransactionStatus>('paid');
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [showRecurringEditModal, setShowRecurringEditModal] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [impact, setImpact] = useState<{ compromisedTransaction: Transaction } | null>(null);

  // Calendar Modal State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      if (transaction.debtId) {
          const originalBase = transaction.amount - (transaction.interest || 0);
          setBaseAmount(originalBase);
      }
      setDescription(transaction.description);
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId || accounts[0]?.id);
      setDestinationAccountId(transaction.destinationAccountId || '');
      setDate(transaction.date);
      setStatus(transaction.status);
      if (transaction.reminderDate) {
        setHasReminder(true);
        setReminderDate(transaction.reminderDate);
      }
      if (transaction.isFixed) {
        setIsFixed(true);
      }
    }
  }, [transaction]);

  useEffect(() => {
    if (type === 'expense' && amount && !isNaN(parseFloat(amount))) {
      const result = checkTransactionImpact(parseFloat(amount), date);
      setImpact(result);
    } else {
      setImpact(null);
    }
  }, [amount, date, type, checkTransactionImpact]);

  // Hook to check for future dates on NEW transactions
  const handleDateSelect = (newDate: string) => {
    setDate(newDate);
    // Only auto-change status if creating a new transaction
    if (!transaction) {
      const selected = new Date(newDate + 'T12:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to midnight
      
      if (selected > today) {
        setStatus('pending');
      } else {
        setStatus('paid');
      }
    }
  };

  const diffAmount = useMemo(() => {
    if (!transaction?.debtId) return 0;
    const currentVal = parseFloat(amount);
    if (isNaN(currentVal)) return 0;
    return currentVal - baseAmount;
  }, [amount, baseAmount, transaction]);

  const isAmountInvalid = transaction?.debtId && diffAmount < -0.01;

  const handleSmartFill = async () => {
    if (!description || description.length < 3) return;
    setIsPredicting(true);
    const prediction = await GeminiService.predictTransaction(description, transactions, categories);
    setIsPredicting(false);
    if (prediction) {
      if (prediction.categoryId) setCategoryId(prediction.categoryId);
      if (prediction.type) setType(prediction.type as TransactionType);
      if (prediction.amount && prediction.amount > 0) setAmount(prediction.amount.toString());
    }
  };

  const handleReminderToggle = () => {
    setHasReminder(!hasReminder);
    if (!hasReminder && !reminderDate) {
       const now = new Date();
       now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
       setReminderDate(now.toISOString().slice(0, 16));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    
    if (!val || val <= 0 || !description || !accountId) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    if (isAmountInvalid) {
        alert("Valor inválido para dívida.");
        return;
    }
    
    if (type !== 'transfer' && !categoryId) {
       alert("Selecione uma categoria.");
       return;
    }

    if (type === 'transfer') {
       if (!destinationAccountId) {
         alert("Selecione a conta de destino.");
         return;
       }
       if (accountId === destinationAccountId) {
         alert("Contas iguais.");
         return;
       }
    }

    const data: any = {
      type, amount: val, description, categoryId: type === 'transfer' ? '' : categoryId,
      accountId, destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      date, status,
      reminderDate: (status === 'pending' && hasReminder) ? reminderDate : undefined,
      reminderSent: (status === 'pending' && hasReminder && transaction?.reminderDate === reminderDate) ? transaction.reminderSent : false,
      isFixed,
      interest: (transaction?.debtId && diffAmount > 0.01) ? diffAmount : 0
    };

    if (transaction) {
      if (transaction.debtId) {
         updateDebtTransaction({ ...transaction, ...data }, false);
         onClose();
      } else if (transaction.fixedGroupId) {
         setShowRecurringEditModal(true);
      } else {
         updateTransactionSeries({ ...transaction, ...data }, false);
         onClose();
      }
    } else {
      addTransaction(data);
      onClose();
    }
  };

  const handleConfirmRecurringUpdate = (updateFuture: boolean) => {
    if (!transaction) return;
    const val = parseFloat(amount);
    const data: any = {
      type, amount: val, description, categoryId: type === 'transfer' ? '' : categoryId,
      accountId, destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      date, status,
      reminderDate: (status === 'pending' && hasReminder) ? reminderDate : undefined,
      reminderSent: (status === 'pending' && hasReminder && transaction?.reminderDate === reminderDate) ? transaction.reminderSent : false,
      isFixed
    };
    updateTransactionSeries({ ...transaction, ...data }, updateFuture);
    onClose();
  };

  const handleDelete = () => { if (transaction) setShowDeleteConfirm(true); };
  const confirmDelete = () => { if (transaction) { deleteTransaction(transaction.id); onClose(); } };
  const filteredCategories = categories.filter(c => c.type === type);

  // Styles based on Type
  const themeColor = type === 'expense' ? 'rose' : type === 'income' ? 'emerald' : 'blue';
  const ThemeIcon = type === 'expense' ? TrendingUp : type === 'income' ? TrendingUp : ArrowRightLeft;

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md h-[95dvh] sm:h-auto sm:max-h-[90dvh] rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl animate-slide-up flex flex-col relative overflow-hidden">
          
          {/* --- Header / Type Selector --- */}
          <div className="px-6 pt-6 pb-2 flex justify-between items-center z-20">
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full">
                <button onClick={() => { setType('expense'); setCategoryId(''); }} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all active:scale-95 ${type === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Despesa</button>
                <button onClick={() => { setType('income'); setCategoryId(''); }} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all active:scale-95 ${type === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Receita</button>
                <button onClick={() => { setType('transfer'); setCategoryId(''); setDescription('Transferência'); }} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all active:scale-95 ${type === 'transfer' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Transf.</button>
             </div>
             <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95">
               <X size={20} className="text-slate-500" />
             </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar pb-32">
            
            {/* --- Hero Amount Input --- */}
            <div className="flex flex-col items-center justify-center py-8 relative">
               <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isAmountInvalid ? 'text-rose-500' : 'text-slate-400'}`}>Valor da Transação</span>
               <div className="flex items-baseline justify-center relative w-full px-8">
                  <span className={`text-3xl font-black mr-2 ${amount ? (type === 'expense' ? 'text-rose-600' : type === 'income' ? 'text-emerald-600' : 'text-blue-600') : 'text-slate-300'}`}>R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min={transaction?.debtId ? baseAmount : 0.01} 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className={`w-full bg-transparent text-center text-6xl font-black outline-none placeholder:text-slate-200 dark:placeholder:text-slate-800 transition-colors ${type === 'expense' ? 'text-rose-600 caret-rose-600' : type === 'income' ? 'text-emerald-600 caret-emerald-600' : 'text-blue-600 caret-blue-600'}`}
                    placeholder="0" 
                    required 
                    autoFocus={!transaction}
                  />
               </div>
               {transaction?.debtId && diffAmount > 0.01 && (
                 <div className="mt-2 text-[10px] font-bold text-amber-500 flex items-center bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                    <TrendingUp size={12} className="mr-1" /> + R$ {diffAmount.toFixed(2)} (Juros)
                 </div>
               )}

               {impact && (
                 <div className="mt-4 mx-8 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-start space-x-3 animate-pulse">
                    <AlertTriangle className="text-rose-500 shrink-0" size={20} />
                    <div className="text-left">
                       <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">Alerta de Disponibilidade</p>
                       <p className="text-[11px] font-medium text-rose-500 dark:text-rose-300 leading-tight mt-1">
                          Esta compra compromete o pagamento da conta <span className="font-bold underline">{impact.compromisedTransaction.description}</span> no dia <span className="font-bold">{new Date(impact.compromisedTransaction.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>.
                       </p>
                    </div>
                 </div>
               )}
            </div>

            {/* --- Main Inputs Container --- */}
            <div className="px-6 space-y-6">
               
               {/* Description with AI */}
               {type !== 'transfer' && (
                 <div className="relative">
                    <input 
                      type="text" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 px-4 py-4 text-lg font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 rounded-t-2xl transition-all"
                      placeholder="Descrição (ex: Almoço)"
                      required 
                    />
                    {!transaction && (
                      <button 
                        type="button" 
                        onClick={handleSmartFill} 
                        disabled={isPredicting || !description} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition disabled:opacity-30 active:scale-95"
                      >
                        {isPredicting ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                      </button>
                    )}
                 </div>
               )}

               {/* Grid for Date, Status, Account */}
               <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setIsCalendarOpen(true)}
                    className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col justify-center cursor-pointer border border-transparent hover:border-indigo-200 transition-all active:scale-95"
                  >
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                        <CalendarIcon size={10} className="mr-1"/> Data
                     </span>
                     <span className="text-sm font-black text-slate-800 dark:text-white truncate">
                        {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric'})}
                     </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl flex items-center relative">
                     <select 
                       value={status} 
                       onChange={(e) => setStatus(e.target.value as TransactionStatus)} 
                       className="w-full h-full bg-transparent outline-none font-black text-sm text-slate-800 dark:text-white appearance-none px-3 z-10 cursor-pointer"
                     >
                        <option value="paid">{type === 'expense' ? 'Pago' : type === 'transfer' ? 'Realizado' : 'Recebido'}</option>
                        <option value="pending">Pendente</option>
                     </select>
                     <ChevronDown size={16} className="absolute right-4 text-slate-400 pointer-events-none" />
                     <span className="absolute top-2 left-5 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">Status</span>
                  </div>
                  
                  <div className={`col-span-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl flex items-center relative ${type === 'transfer' ? 'border-2 border-indigo-100 dark:border-indigo-900/30' : ''}`}>
                     <select 
                       value={accountId} 
                       onChange={(e) => setAccountId(e.target.value)} 
                       className="w-full h-full bg-transparent outline-none font-black text-sm text-slate-800 dark:text-white appearance-none pl-10 pr-4 py-4 cursor-pointer"
                     >
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                     </select>
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Wallet size={18} />
                     </div>
                     <ChevronDown size={16} className="absolute right-4 text-slate-400 pointer-events-none" />
                     <span className="absolute top-1 left-10 text-[9px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                        {type === 'transfer' ? 'De (Origem)' : 'Conta / Carteira'}
                     </span>
                  </div>

                  {type === 'transfer' && (
                    <div className="col-span-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl flex items-center relative border-2 border-indigo-100 dark:border-indigo-900/30">
                       <select 
                         value={destinationAccountId} 
                         onChange={(e) => setDestinationAccountId(e.target.value)} 
                         className="w-full h-full bg-transparent outline-none font-black text-sm text-slate-800 dark:text-white appearance-none pl-10 pr-4 py-4 cursor-pointer"
                       >
                          <option value="">Selecione...</option>
                          {accounts.filter(a => a.id !== accountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                       </select>
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                          <ArrowRightLeft size={18} />
                       </div>
                       <ChevronDown size={16} className="absolute right-4 text-slate-400 pointer-events-none" />
                       <span className="absolute top-1 left-10 text-[9px] font-black text-indigo-500 uppercase tracking-widest pointer-events-none">Para (Destino)</span>
                    </div>
                  )}
               </div>

               {/* Recurring & Reminder Toggles */}
               {!transaction && !transaction?.debtId && type !== 'transfer' && (
                  <div className="flex space-x-3">
                     <button 
                       type="button"
                       onClick={() => setIsFixed(!isFixed)}
                       className={`flex-1 py-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${isFixed ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                     >
                        <Repeat size={20} className="mb-1" />
                        <span className="text-[9px] font-black uppercase">Fixa Mensal</span>
                     </button>
                     
                     <button 
                       type="button"
                       onClick={handleReminderToggle}
                       className={`flex-1 py-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${hasReminder ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                     >
                        {hasReminder ? <BellRing size={20} className="mb-1" /> : <Bell size={20} className="mb-1" />}
                        <span className="text-[9px] font-black uppercase">Lembrete</span>
                     </button>
                  </div>
               )}

               {hasReminder && (
                  <div className="animate-fade-in">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Data Hora do Lembrete</label>
                     <input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="w-full px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm text-slate-700 dark:text-slate-200 outline-none font-bold" />
                  </div>
               )}

               {/* Category Grid */}
               {type !== 'transfer' && (
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Categoria</label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                        {filteredCategories.map(cat => {
                          const Icon = getIcon(cat.icon);
                          const isSelected = categoryId === cat.id;
                          return (
                            <button 
                              key={cat.id} 
                              type="button" 
                              onClick={() => setCategoryId(cat.id)} 
                              className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all aspect-square active:scale-95 ${isSelected ? `bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-xl scale-110 z-10` : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                              <Icon size={20} className="mb-1.5" />
                              <span className="text-[8px] font-bold text-center leading-tight line-clamp-1 w-full">{cat.name}</span>
                            </button>
                          );
                        })}
                    </div>
                 </div>
               )}
            </div>
          </form>

          {/* --- Floating Footer Actions --- */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 z-30 flex items-center space-x-4">
             {transaction && (
                <button 
                  type="button" 
                  onClick={handleDelete} 
                  className="w-16 h-16 rounded-[1.5rem] bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition active:scale-90"
                >
                   <Trash2 size={24} />
                </button>
             )}
             <button 
               onClick={handleSubmit} 
               disabled={isAmountInvalid}
               className={`flex-1 h-16 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-3 text-white ${isAmountInvalid ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed' : 'bg-lime-500 hover:bg-lime-600 dark:bg-lime-600 dark:hover:bg-lime-500 text-slate-900 shadow-lime-200 dark:shadow-none'}`}
             >
                <Check size={24} strokeWidth={3} />
                <span>{transaction ? 'Salvar' : 'Confirmar'}</span>
             </button>
          </div>

          {/* Delete Confirmation Overlay */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm animate-fade-in">
                <div className="text-center p-8">
                    <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                       <Trash2 size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Excluir Lançamento?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium max-w-[200px] mx-auto">Essa ação não pode ser desfeita.</p>
                    <div className="flex space-x-4 justify-center">
                        <button onClick={() => setShowDeleteConfirm(false)} className="px-6 py-3 text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl text-xs uppercase tracking-wider">Cancelar</button>
                        <button onClick={confirmDelete} className="px-8 py-3 text-white font-bold bg-rose-500 rounded-xl shadow-lg shadow-rose-200 dark:shadow-none text-xs uppercase tracking-wider">Sim, Excluir</button>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>

      <CalendarModal 
         isOpen={isCalendarOpen} 
         onClose={() => setIsCalendarOpen(false)} 
         selectedDate={date} 
         onSelect={handleDateSelect} 
      />

      {showRecurringEditModal && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
              <div className="flex justify-center mb-6 text-indigo-600 dark:text-indigo-400"><Layers size={56} /></div>
              <h3 className="text-xl font-black text-center text-slate-800 dark:text-white mb-2">Editar Recorrência</h3>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Este é um lançamento recorrente. Como deseja aplicar as mudanças?</p>
              <div className="space-y-3">
                 <button onClick={() => handleConfirmRecurringUpdate(false)} className="w-full py-4 px-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all rounded-2xl flex items-center group"><div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-xl mr-4 text-slate-500 group-hover:text-indigo-600"><Copy size={20} /></div><div className="text-left"><span className="block text-sm font-bold text-slate-800 dark:text-white">Apenas esta</span><span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Somente atual</span></div></button>
                 <button onClick={() => handleConfirmRecurringUpdate(true)} className="w-full py-4 px-5 bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-900/30 hover:border-indigo-500 transition-all rounded-2xl flex items-center group"><div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-xl mr-4 text-indigo-600"><Layers size={20} /></div><div className="text-left"><span className="block text-sm font-bold text-indigo-900 dark:text-indigo-100">Esta e futuras</span><span className="block text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Daqui para frente</span></div></button>
                 <button onClick={() => setShowRecurringEditModal(false)} className="w-full py-4 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest mt-2">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </>
  );
};
