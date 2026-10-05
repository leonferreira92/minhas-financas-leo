
import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  X, Trash2, Calendar, CheckCircle2, 
  Circle, Edit2, Save, TrendingUp, 
  ArrowLeft, CreditCard, Clock, Check,
  AlertCircle, ChevronRight, Landmark, Calculator, AlertTriangle,
  Music, User, Layers, SlidersHorizontal, Tag
} from 'lucide-react';
import { Transaction } from '../types';
import { parseCurrencyInput } from '../constants';
import { DebtForm } from './DebtForm';
import {
  resolveDebtInstallmentCostCenter,
  isVinyDebtOrTransaction,
  calculateVinyCostCenterSummary,
  buildVinyAllocationMap,
  VINY_MUSIC_MAX_CEILING,
  VINY_MONTHLY_MUSIC_FIXED
} from '../services/financeAggregator';

interface Props {
  debtId: string;
  onClose: () => void;
}

export const DebtDetail: React.FC<Props> = ({ debtId, onClose }) => {
  const {
    debts,
    transactions,
    getDebtProgress,
    deleteDebt,
    updateTransaction,
    updateDebt,
    toggleInstallmentCostCenter,
    recalculateDebtSeries
  } = useFinance();
  const [recalcTransaction, setRecalcTransaction] = useState<Transaction | null>(null);
  const [isEditingDebt, setIsEditingDebt] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const debt = debts.find(d => d.id === debtId);
  const isViny = useMemo(() => isVinyDebtOrTransaction(debt), [debt]);
  
  useEffect(() => {
    if (debt) {
      setEditName(debt.name);
    }
  }, [debt]);

  const debtTransactions = useMemo(() => 
    transactions
      .filter(t => t.debtId === debtId)
      .sort((a, b) => {
        const aIsDown = a.installmentNumber === 0 || (a.description || '').toLowerCase().includes('entrada');
        const bIsDown = b.installmentNumber === 0 || (b.description || '').toLowerCase().includes('entrada');
        if (aIsDown && !bIsDown) return -1;
        if (!aIsDown && bIsDown) return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }),
  [transactions, debtId]);

  const vinyMap = useMemo(
    () => (isViny && debt ? buildVinyAllocationMap(debtTransactions, [debt]) : new Map()),
    [isViny, debt, debtTransactions]
  );

  // Estatísticas de Centro de Custo desta Dívida (com teto de R$ 6.500,00 garantido no Viny)
  const costCenterSummary = useMemo(() => {
    if (!debt) {
      return {
        musicPaidTotal: 0,
        musicPendingTotal: 0,
        musicCount: 0,
        personalPaidTotal: 0,
        personalCount: 0
      };
    }

    if (isViny) {
      const vinySummary = calculateVinyCostCenterSummary(debtTransactions, debt.totalAmount);
      return {
        musicPaidTotal: vinySummary.musicPaidTotal,
        musicPendingTotal: vinySummary.musicPendingTotal,
        musicCount: vinySummary.musicCount,
        personalPaidTotal: vinySummary.personalPaidTotal,
        personalCount: vinySummary.personalCount
      };
    }

    let musicPaidTotal = 0;
    let musicPendingTotal = 0;
    let musicCount = 0;
    let personalPaidTotal = 0;
    let personalCount = 0;

    debtTransactions.forEach(t => {
      const effectiveScope =
        t.scope === 'BUSINESS' || t.scope === 'PERSONAL'
          ? t.scope
          : resolveDebtInstallmentCostCenter(debt, t.installmentNumber ?? 1).scope;

      const amt = Number(t.amount) || 0;
      if (effectiveScope === 'BUSINESS') {
        musicCount += 1;
        if (t.status === 'paid') musicPaidTotal += amt;
        else if (t.status === 'pending') musicPendingTotal += amt;
      } else {
        personalCount += 1;
        if (t.status === 'paid') personalPaidTotal += amt;
      }
    });

    return {
      musicPaidTotal,
      musicPendingTotal,
      musicCount,
      personalPaidTotal,
      personalCount
    };
  }, [debt, isViny, debtTransactions]);

  if (!debt) return null;

  const { paid, remaining, progress, status } = getDebtProgress(debtId);
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

  const handleToggleInstallmentScope = (e: React.MouseEvent, t: Transaction, currentScope: 'BUSINESS' | 'PERSONAL') => {
    e.stopPropagation();
    const nextScope = currentScope === 'BUSINESS' ? 'PERSONAL' : 'BUSINESS';
    toggleInstallmentCostCenter(t.id, nextScope, debt.musicSubcategory || 'Equipamentos / Instrumentos');
  };

  const effectiveMode =
    debt.costCenterMode || (debt.scope === 'BUSINESS' ? 'TOTAL_BUSINESS' : 'TOTAL_PERSONAL');

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

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-all active:scale-95"
              title="Editar Centro de Custo / Subcategoria"
            >
              <SlidersHorizontal size={20} />
            </button>
            <button 
              onClick={handleDelete} 
              className={`p-2.5 rounded-2xl transition-all flex items-center space-x-2 active:scale-95 ${showDeleteConfirm ? 'bg-rose-600 text-white w-auto px-5' : 'bg-slate-50 dark:bg-slate-900 text-rose-500 hover:bg-rose-100'}`}
            >
               <Trash2 size={22} strokeWidth={showDeleteConfirm ? 3 : 1.5} />
               {showDeleteConfirm && <span className="text-[10px] font-black uppercase tracking-widest">Confirmar?</span>}
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full flex-1 px-5 pt-6 pb-32">
          
          {/* CARD DE CENTRO DE CUSTO E IMPACTO NO DRE DA MÚSICA */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  effectiveMode === 'TOTAL_BUSINESS' || costCenterSummary.musicCount > 0
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {effectiveMode === 'TOTAL_BUSINESS' || costCenterSummary.musicCount > 0 ? (
                    <Music size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                    Centro de Custo Vinculado
                  </span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {effectiveMode === 'TOTAL_BUSINESS'
                      ? '🎸 MÚSICA / CARREIRA (Valor Total)'
                      : effectiveMode === 'INSTALLMENT_RANGE'
                      ? `🔀 MISTO: Parcelas ${debt.businessStartInstallment || 1} a ${debt.businessEndInstallment || debt.installmentCount} na Música`
                      : costCenterSummary.musicCount > 0
                      ? `🔀 MISTO (${costCenterSummary.musicCount}x Música / ${costCenterSummary.personalCount}x Pessoal)`
                      : '👤 PESSOAL (Valor Total)'}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm shrink-0"
              >
                Configurar
              </button>
            </div>

            {(effectiveMode !== 'TOTAL_PERSONAL' || costCenterSummary.musicCount > 0) && (
              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <Tag size={12} />
                    Subcategoria da Música:
                  </span>
                  <span className="font-black text-purple-900 dark:text-purple-200">
                    {debt.musicSubcategory || 'Equipamentos / Instrumentos'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-purple-200/50 dark:border-purple-800/40">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      {isViny ? `Pago na Música (Teto ${formatCurrency(VINY_MUSIC_MAX_CEILING)})` : 'Pago na Música (DRE)'}
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(costCenterSummary.musicPaidTotal)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      Pago no Pessoal (Fora do DRE)
                    </span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {formatCurrency(costCenterSummary.personalPaidTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Orbit Visualizer */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-8 relative overflow-hidden flex flex-col items-center text-center">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
             
             <div className="relative w-36 h-36 mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                   <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                   <circle 
                     cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" 
                     strokeDasharray={2 * Math.PI * 70}
                     strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                     strokeLinecap="round"
                     className={`transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,102,241,0.5)] ${isPaid ? 'text-emerald-500' : 'text-indigo-600'}`}
                   />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className={`text-3xl font-black tracking-tighter tabular-nums ${isPaid ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                      {progress.toFixed(0)}<span className="text-lg">%</span>
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
          <div className="flex justify-between items-center mb-4 px-3">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Clock size={14} className="mr-2" /> Cronograma de Parcelas
             </h3>
             <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                {isViny ? `Teto DRE Música: ${formatCurrency(VINY_MUSIC_MAX_CEILING)}` : 'Toque no selo p/ alternar Música / Pessoal'}
             </span>
          </div>

          {/* Installment Grid/List */}
          <div className="space-y-3.5">
             {debtTransactions.map((t) => {
               const isTPaid = t.status === 'paid';
               const isOverdue = !isTPaid && new Date(t.date) < new Date();
               const vinyAlloc = isViny ? vinyMap.get(t.id) : undefined;
               const effectiveScope: 'BUSINESS' | 'PERSONAL' = vinyAlloc
                 ? vinyAlloc.musicAmount > 0
                   ? 'BUSINESS'
                   : 'PERSONAL'
                 : t.scope === 'BUSINESS' || t.scope === 'PERSONAL'
                 ? t.scope
                 : resolveDebtInstallmentCostCenter(debt, t.installmentNumber ?? 1).scope;
               const isMusicInstallment = effectiveScope === 'BUSINESS';
               const subcatLabel =
                 t.subcategory || debt.musicSubcategory || 'Equipamentos / Instrumentos';
               
               return (
                 <div 
                    key={t.id} 
                    className={`group flex items-center p-4 rounded-[2rem] border transition-all active:scale-[0.99] ${
                       isTPaid 
                         ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50' 
                         : isOverdue 
                            ? 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/50 shadow-md ring-1 ring-rose-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'
                    }`}
                 >
                    <button 
                      onClick={(e) => toggleTransactionStatus(e, t)}
                      className={`flex-none w-11 h-11 rounded-[1.1rem] flex items-center justify-center transition-all active:scale-95 ${
                         isTPaid 
                           ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none' 
                           : 'bg-slate-100 dark:bg-slate-800 text-slate-300 hover:bg-emerald-100 hover:text-emerald-600'
                      }`}
                      title={isTPaid ? 'Marcar como pendente' : 'Dar baixa (Pagar parcela)'}
                    >
                       <Check size={20} strokeWidth={4} />
                    </button>
                    
                    <div className="flex-1 ml-4 cursor-pointer min-w-0" onClick={() => setRecalcTransaction(t)}>
                       <div className="flex justify-between items-center mb-1 gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className={`text-xs font-black uppercase tracking-wider truncate ${isTPaid ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                              {t.installmentNumber ? `Parcela ${t.installmentNumber}/${debt.installmentCount}` : 'Entrada Inicial'}
                            </span>
                            {isTPaid && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                Paga
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-black tabular-nums shrink-0 ${isTPaid ? 'text-emerald-600 dark:text-emerald-400' : isOverdue ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
                            {formatCurrency(t.amount)}
                          </span>
                       </div>

                       <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                          <div className="flex items-center space-x-2">
                             <Calendar size={10} className={isOverdue ? 'text-rose-400' : 'text-slate-400'} />
                             <span className={`text-[10px] font-black uppercase tracking-tighter ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                                {formatDate(t.date)} {isOverdue && '• ATRASADO'}
                             </span>
                          </div>

                          {/* Badge interativo para alternar Centro de Custo desta parcela */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleInstallmentScope(e, t, effectiveScope)}
                            className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition active:scale-95 flex items-center space-x-1 ${
                              isMusicInstallment
                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/25'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                            title="Clique para alternar esta parcela entre MÚSICA / CARREIRA e PESSOAL"
                          >
                            {isMusicInstallment ? (
                              <>
                                <Music size={10} />
                                <span className="truncate max-w-[200px]">
                                  {vinyAlloc
                                    ? vinyAlloc.personalAmount > 0
                                      ? `Música ${formatCurrency(vinyAlloc.musicAmount)} + Pessoal ${formatCurrency(vinyAlloc.personalAmount)}`
                                      : `Música ${formatCurrency(vinyAlloc.musicAmount)} • Som`
                                    : `Música • ${subcatLabel}`}
                                </span>
                              </>
                            ) : (
                              <>
                                <User size={10} />
                                <span>Pessoal • Dívidas</span>
                              </>
                            )}
                          </button>
                       </div>
                    </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>

      {/* Modal de Edição de Centro de Custo / Subcategoria da Dívida */}
      {isEditModalOpen && (
        <DebtForm
          initialDebt={debt}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

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
   const diff = parseCurrencyInput(amount) - transaction.amount;

   return (
      <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
         <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-in">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">
                  Ajustar {transaction.installmentNumber && transaction.installmentNumber > 0 ? `Parcela ${transaction.installmentNumber}` : 'Entrada Inicial'}
               </h3>
               <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors active:scale-95"><X size={20}/></button>
            </div>

            <div className="space-y-8">
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                     Novo Valor {transaction.installmentNumber && transaction.installmentNumber > 0 ? 'da Parcela' : 'da Entrada Inicial'}
                  </label>
                  <div className="relative">
                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">R$</span>
                     <input 
                        type="number" 
                        step="any"
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
                  onClick={() => onSave(transaction.id, parseCurrencyInput(amount))}
                  className="w-full py-5 bg-slate-900 dark:bg-indigo-600 hover:scale-[1.02] text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl transition-all active:scale-95"
               >
                  Confirmar Recalculo
               </button>
            </div>
         </div>
      </div>
   );
};
