
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  Plus, CreditCard, Building, User, ChevronRight, 
  CheckCircle2, TrendingDown, CarFront, Info, 
  ArrowUpRight, PieChart, Calendar, AlertCircle, ShieldCheck,
  Clock
} from 'lucide-react';
import { DebtForm } from './DebtForm';
import { DebtDetail } from './DebtDetail';
import { ActiveDebtsPanel } from './ActiveDebtsPanel';

export const DebtList = () => {
  const { debts, getDebtProgress } = useFinance();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'paid'>('active');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const stats = useMemo(() => {
    const active = debts.filter(d => getDebtProgress(d.id).status === 'active');
    const paid = debts.filter(d => getDebtProgress(d.id).status === 'paid');
    
    const totalDebt = debts.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalRemaining = active.reduce((sum, d) => sum + getDebtProgress(d.id).remaining, 0);
    const totalPaid = totalDebt - totalRemaining;
    
    return { 
      active, 
      paid, 
      totalDebt, 
      totalRemaining, 
      totalPaid,
      progress: totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0
    };
  }, [debts, getDebtProgress]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'bank': return Building;
      case 'person': return User;
      case 'car_financing': return CarFront;
      default: return CreditCard;
    }
  };

  const displayList = activeTab === 'active' ? stats.active : stats.paid;

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100 max-w-4xl mx-auto px-2">
      
      {/* Header Superior */}
      <div className="flex justify-between items-end pt-6 mb-8 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Dívidas</h1>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Gestão de Passivos</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center active:scale-90 transition-all group active:scale-95"
        >
           <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      {/* Hero Card: Fintech Style Summary */}
      <div className="relative bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 text-white shadow-2xl mb-10 overflow-hidden group">
         <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-30"></div>
         <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-emerald-500 rounded-full blur-[60px] opacity-10"></div>
         
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-10">
               <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10">
                  <TrendingDown size={28} className="text-indigo-400" />
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Saldo Devedor</span>
                  <h2 className="text-3xl font-black text-white tracking-tighter tabular-nums">{formatCurrency(stats.totalRemaining)}</h2>
               </div>
            </div>

            <div className="space-y-5">
               <div className="flex justify-between items-end">
                  <div className="flex items-center space-x-2">
                     <ShieldCheck size={14} className="text-emerald-400" />
                     <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{stats.progress.toFixed(0)}% Quitado</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 tabular-nums">{formatCurrency(stats.totalPaid)} amortizado</span>
               </div>
               <div className="h-3.5 bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                    style={{ width: `${stats.progress}%` }}
                  ></div>
               </div>
            </div>
         </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-[1.5rem] mb-8 border border-slate-100 dark:border-slate-800 shadow-sm">
         <button 
           onClick={() => setActiveTab('active')}
           className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center space-x-2 active:scale-95 ${activeTab === 'active' ? 'bg-slate-900 text-white shadow-lg scale-[1.02]' : 'text-slate-400'}`}
         >
           {/* Added Clock icon to fix error */}
           <Clock size={14} />
           <span>Ativas ({stats.active.length})</span>
         </button>
         <button 
           onClick={() => setActiveTab('paid')}
           className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center space-x-2 active:scale-95 ${activeTab === 'paid' ? 'bg-emerald-600 text-white shadow-lg scale-[1.02]' : 'text-slate-400'}`}
         >
           <CheckCircle2 size={14} />
           <span>Quitadas ({stats.paid.length})</span>
         </button>
      </div>

      {/* Debt List Rendering */}
      {activeTab === 'active' ? (
        <ActiveDebtsPanel onSelectDebt={(id) => setSelectedDebtId(id)} />
      ) : (
        <div className="space-y-5">
          {stats.paid.length === 0 ? (
            <div className="text-center py-24 opacity-30 flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <CreditCard size={40} className="text-slate-400" />
              </div>
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">Nenhum compromisso quitado</p>
            </div>
          ) : (
            stats.paid.map(debt => {
              const Icon = getIcon(debt.type);
              const { remaining, progress, status } = getDebtProgress(debt.id);
              const isPaid = true;

              return (
                <div 
                  key={debt.id} 
                  onClick={() => setSelectedDebtId(debt.id)}
                  className="group bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col active:scale-[0.97] transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
                        <Icon size={26} strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-800 dark:text-white text-lg leading-tight truncate">{debt.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {debt.installmentCount} Parcela(s)
                          </span>
                          <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {debt.type === 'card_installment' ? 'Crédito' : debt.type === 'bank' ? 'Bancário' : 'Outros'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black tracking-tight tabular-nums text-emerald-500">
                        Quitado
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black text-emerald-500 uppercase tracking-[0.1em]">
                      <span>Status da Quitação</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-full h-2 overflow-hidden p-0.5 border border-slate-100 dark:border-slate-800/50">
                      <div 
                        className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar size={12} className="text-indigo-400" />
                      <span>Desde {new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(debt.startDate))}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {isFormOpen && <DebtForm onClose={() => setIsFormOpen(false)} />}
      
      {selectedDebtId && (
        <DebtDetail 
          debtId={selectedDebtId} 
          onClose={() => setSelectedDebtId(null)} 
        />
      )}
    </div>
  );
};
