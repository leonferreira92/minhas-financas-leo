
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  X, Trash2, Calendar, CheckCircle2, 
  Circle, Edit2, Save, TrendingUp, 
  ArrowLeft, CreditCard, Clock, Check,
  AlertCircle, ChevronRight, Landmark, Calculator, AlertTriangle
} from 'lucide-react';
import { Transaction } from '../types';

interface Props {
  debtId: string;
  onClose: () => void;
}

export const DebtDetail: React.FC<Props> = ({ debtId, onClose }) => {
  const { debts, transactions, getDebtProgress, deleteDebt, updateTransaction, updateDebt, recalculateDebtSeries } = useFinance();
  const [recalcTransaction, setRecalcTransaction] = useState<Transaction | null>(null);
  const [isEditingDebt, setIsEditingDebt] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const debt = debts.find(d => d.id === debtId);
  
  useEffect(() => {
    if (debt) {
      setEditName(debt.name);
    }
  }, [debt]);

  const debtTransactions = useMemo(() => 
    transactions
      .filter(t => t.debtId === debtId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  [transactions, debtId]);

  if (!debt) return null;

  const { paid, remaining, progress, status, totalReal } = getDebtProgress(debtId);
  const isPaid = status === 'paid';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (date: string) => 
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(date + 'T12:00:00'));

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteDebt(debtId);
      onClose();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const handleSaveEditName = () => {
    if (!editName) return;
    updateDebt(debtId, editName, debt.installmentCount);
    setIsEditingDebt(false);
  };

  const toggleTransactionStatus = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    updateTransaction({
      ...t,
      status: t.status === 'paid' ? 'pending' : 'paid'
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[100] overflow-y-auto animate-slide-up flex flex-col no-scrollbar">
        
        {/* Fintech Navbar Detail */}
        <div className="sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl z-20 px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-500 active:scale-95 transition-all">
             <ArrowLeft size={24} />
          </button>
          
          <div className="flex-1 text-center px-4">
             {isEditingDebt ? (
               <input 
                 value={editName}
                 onChange={e => setEditName(e.target.value)}
                 className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-black text-center outline-none focus:ring-2 focus:ring-indigo-500"
                 autoFocus
                 onBlur={handleSaveEditName}
                 onKeyDown={(e) => e.key === 'Enter' && handleSaveEditName()}
               />
             ) : (
               <div className="flex flex-col items-center">
                  <h2 
                    onClick={() => setIsEditingDebt(true)}
                    className="font-black text-slate-800 dark:text-white truncate uppercase tracking-tighter text-base flex items-center cursor-pointer group"
                  >
                    {debt.name} <Edit2 size={12} className="ml-2 opacity-0 group-hover:opacity-50 transition-opacity"/>
                  </h2>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{debt.installmentCount} Parcelas</span>
               </div>
             )}
          </div>

          <button 
            onClick={handleDelete} 
            className={`p-2.5 rounded-2xl transition-all flex items-center space-x-2 active:scale-95 ${showDeleteConfirm ? 'bg-rose-600 text-white w-auto px-5' : 'bg-slate-50 dark:bg-slate-900 text-rose-500 hover:bg-rose-100'}`}
          >
             <Trash2 size={22} strokeWidth={showDeleteConfirm ? 3 : 1.5} />
             {showDeleteConfirm && <span className="text-[10px] font-black uppercase tracking-widest">Confirmar?</span>}
          </button>
        </div>

        <div className="max-w-md mx-auto w-full flex-1 px-5 pt-8 pb-32">
          
          {/* Progress Orbit Visualizer */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800 mb-10 relative overflow-hidden flex flex-col items-center text-center">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
             
             <div className="relative w-40 h-40 mb-8">
                <svg className="w-full h-full transform -rotate-90">
                   <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                   <circle 
                     cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="10" fill="transparent" 
                     strokeDasharray={2 * Math.PI * 74}
                     strokeDashoffset={2 * Math.PI * 74 * (1 - progress / 100)}
                     strokeLinecap="round"
                     className={`transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,102,241,0.5)] ${isPaid ? 'text-emerald-500' : 'text-indigo-600'}`}
                   />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className={`text-4xl font-black tracking-tighter tabular-nums ${isPaid ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                      {progress.toFixed(0)}<span className="text-xl">%</span>
                   </span>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quitado</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8 w-full">
                <div className="text-center">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Amortizado</span>
                   <span className="text-xl font-black text-emerald-500 tabular-nums">{formatCurrency(paid)}</span>
                </div>
                <div className="text-center">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Restante</span>
                   <span className={`text-xl font-black tabular-nums ${isPaid ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                      {formatCurrency(remaining)}
                   </span>
                </div>
             </div>
          </div>

          {/* List Section Title */}
          <div className="flex justify-between items-center mb-6 px-3">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Clock size={14} className="mr-2" /> Cronograma de Pagamentos
             </h3>
             <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                Interativo
             </span>
          </div>

          {/* Installment Grid/List */}
          <div className="space-y-4">
             {debtTransactions.map((t, index) => {
               const isTPaid = t.status === 'paid';
               const isOverdue = !isTPaid && new Date(t.date) < new Date();
               
               return (
                 <div 
                    key={t.id} 
                    className={`group flex items-center p-5 rounded-[2rem] border transition-all active:scale-[0.98] ${
                       isTPaid 
                         ? 'bg-slate-50/50 dark:bg-slate-900/30 border-transparent opacity-60' 
                         : isOverdue 
                            ? 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/50 shadow-md ring-1 ring-rose-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'
                    }`}
                 >
                    <button 
                      onClick={(e) => toggleTransactionStatus(e, t)}
                      className={`flex-none w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all active:scale-95 ${
                         isTPaid 
                           ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none' 
                           : 'bg-slate-100 dark:bg-slate-800 text-slate-300 hover:bg-emerald-100 hover:text-emerald-600'
                      }`}
                    >
                       <Check size={22} strokeWidth={4} />
                    </button>
                    
                    <div className="flex-1 ml-5 cursor-pointer" onClick={() => setRecalcTransaction(t)}>
                       <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs font-black uppercase tracking-widest ${isTPaid ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            Parcela {t.installmentNumber}
                          </span>
                          <span className={`text-base font-black tabular-nums ${isTPaid ? 'text-slate-400 line-through' : isOverdue ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
                            {formatCurrency(t.amount)}
                          </span>
                       </div>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                             <Calendar size={10} className={isOverdue ? 'text-rose-400' : 'text-slate-400'} />
                             <span className={`text-[10px] font-black uppercase tracking-tighter ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                                {formatDate(t.date)} {isOverdue && '• ATRASADO'}
                             </span>
                          </div>
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-[9px] font-black text-indigo-500 uppercase">Ajustar</span>
                             <Edit2 size={12} className="text-indigo-400" />
                          </div>
                       </div>
                    </div>
                 </div>
               )
             })}
          </div>
        </div>
      </div>

      {/* Recalculate Logic Modal */}
      {recalcTransaction && (
         <RecalculateModal 
            transaction={recalcTransaction} 
            onClose={() => setRecalcTransaction(null)}
            onSave={(id, amount) => {
               recalculateDebtSeries(id, amount);
               setRecalcTransaction(null);
            }}
         />
      )}
    </>
  );
};

const RecalculateModal = ({ transaction, onClose, onSave }: { transaction: Transaction, onClose: () => void, onSave: (id: string, amount: number) => void }) => {
   const [amount, setAmount] = useState(transaction.amount.toString());
   const diff = parseFloat(amount) - transaction.amount;

   return (
      <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
         <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-in">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">Ajustar Parcela {transaction.installmentNumber}</h3>
               <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors active:scale-95"><X size={20}/></button>
            </div>

            <div className="space-y-8">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Novo Valor da Parcela</label>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">R$</span>
                     <input 
                        type="number" 
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] text-3xl font-black outline-none dark:text-white tabular-nums shadow-inner"
                        autoFocus
                     />
                  </div>
               </div>

               {Math.abs(diff) > 0.01 && (
                  <div className={`p-5 rounded-2xl border flex items-start space-x-4 ${diff > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400'}`}>
                     <Calculator size={24} className="shrink-0 mt-1" />
                     <div>
                        <span className="block text-[11px] font-black uppercase tracking-widest mb-1.5">Recalculo de Fluxo</span>
                        <p className="text-[11px] leading-relaxed font-bold opacity-80">
                           {diff > 0 
                              ? `Amortização antecipada: as próximas parcelas diminuirão automaticamente para manter o contrato.`
                              : `Redução atual: a diferença de R$ ${Math.abs(diff).toFixed(2)} será redistribuída nas próximas parcelas.`
                           }
                        </p>
                     </div>
                  </div>
               )}

               <button 
                  onClick={() => onSave(transaction.id, parseFloat(amount))}
                  className="w-full py-5 bg-slate-900 dark:bg-indigo-600 hover:scale-[1.02] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95"
               >
                  Confirmar Recalculo
               </button>
            </div>
         </div>
      </div>
   );
};
