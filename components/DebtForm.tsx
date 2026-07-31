
import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { DebtType } from '../types';
import { 
  X, Check, CreditCard, Building, User, 
  Calendar, DollarSign, PieChart, CheckCircle2, 
  CarFront, ChevronRight, ArrowLeft, Info,
  Calculator, Landmark, ShieldCheck, RefreshCw, AlertTriangle
} from 'lucide-react';
import { CalendarModal } from './CalendarModal';
import { parseCurrencyInput } from '../constants';

interface Props {
  onClose: () => void;
}

export const DebtForm: React.FC<Props> = ({ onClose }) => {
  const { addDebt, categories, accounts } = useFinance();
  const [step, setStep] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>('card_installment');
  const [totalAmount, setTotalAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  
  const [downPayment, setDownPayment] = useState('');
  const [installments, setInstallments] = useState('12');
  const [firstDate, setFirstDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [installmentValue, setInstallmentValue] = useState('');
  const [isManualInstallment, setIsManualInstallment] = useState(false);

  const [autoPayPast, setAutoPayPast] = useState(true);
  const [isRetroactive, setIsRetroactive] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setIsRetroactive(firstDate < today);
  }, [firstDate]);

  useEffect(() => {
    if (!isManualInstallment && step === 1) {
       const total = parseCurrencyInput(totalAmount);
       const entry = parseCurrencyInput(downPayment);
       const qty = parseInt(installments) || 1;
       const calc = Math.max(0, (total - entry) / qty);
       setInstallmentValue(calc.toFixed(2));
    }
  }, [totalAmount, downPayment, installments, step, isManualInstallment]);

  const handleInstallmentChange = (val: string) => {
    setInstallmentValue(val);
    setIsManualInstallment(true);
    const instVal = parseCurrencyInput(val);
    const entry = parseCurrencyInput(downPayment);
    const qty = parseInt(installments) || 1;
    const newTotal = entry + (instVal * qty);
    setTotalAmount(newTotal.toFixed(2));
  };

  const isEntryInvalid = parseCurrencyInput(downPayment) >= parseCurrencyInput(totalAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseCurrencyInput(totalAmount);
    if (!name || isNaN(total) || total <= 0 || !categoryId || !accountId || isEntryInvalid) return;

    addDebt({ name, type, totalAmount: total, startDate: firstDate, installmentCount: parseInt(installments) || 1 }, {
      downPayment: parseCurrencyInput(downPayment),
      installments: parseInt(installments) || 1,
      firstDate, categoryId, autoPayPast, accountId,
      fixedInstallmentValue: parseCurrencyInput(installmentValue)
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
        <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-slide-up max-h-[95vh] overflow-y-auto no-scrollbar border-t border-white/10">
          
          <div className="flex justify-between items-start mb-10">
            <div className="flex-1">
               <div className="flex items-center space-x-2 mb-4">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 0 ? 'bg-indigo-600 w-12' : 'bg-emerald-500 w-12'}`}></div>
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 1 ? 'bg-indigo-600 w-12' : 'bg-slate-100 dark:bg-slate-800 w-6'}`}></div>
               </div>
               <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                 {step === 0 ? 'Nova Dívida' : 'Simulação'}
               </h2>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                 {step === 0 ? 'Passo 1: O que é?' : 'Passo 2: O plano de quitação'}
               </p>
            </div>
            <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 transition-colors hover:text-rose-500 active:scale-95">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {step === 0 && (
              <div className="space-y-8 animate-fade-in">
                {/* ... (Type selection & Name input same as before) ... */}
                 <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'card_installment', label: 'Parcelado', icon: CreditCard },
                    { id: 'bank', label: 'Empréstimo', icon: Landmark },
                    { id: 'car_financing', label: 'Veículo', icon: CarFront },
                    { id: 'person', label: 'Pessoal', icon: User },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const isSelected = type === opt.id;
                    return (
                      <button key={opt.id} type="button" onClick={() => setType(opt.id as DebtType)} className={`p-5 rounded-[1.8rem] border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-100 dark:shadow-none' : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400'}`}>
                        <Icon size={32} strokeWidth={1.5} className="mb-3" />
                        <span className="text-[11px] font-black uppercase tracking-wider">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] outline-none font-bold text-xl dark:text-white transition shadow-inner" placeholder="Ex: iPhone 15..." autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Valor Total</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-2xl">R$</span>
                    <input type="number" step="any" value={totalAmount} onChange={(e) => { setTotalAmount(e.target.value); setIsManualInstallment(false); }} className="w-full pl-16 pr-6 py-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] outline-none font-black text-3xl text-slate-800 dark:text-white shadow-inner tabular-nums" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria</label>
                      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-xs dark:text-white appearance-none cursor-pointer">
                        <option value="">Escolher...</option>
                        {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Conta Débito</label>
                      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-xs dark:text-white appearance-none cursor-pointer">
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                   </div>
                </div>
                <button type="button" onClick={() => setStep(1)} disabled={!name || !totalAmount || !categoryId || !accountId} className="w-full py-5 bg-indigo-600 disabled:bg-slate-200 disabled:dark:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.3em] rounded-[1.8rem] shadow-2xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center group">
                  Configurar Parcelas <ChevronRight size={20} className="ml-3 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8 animate-fade-in">
                 {/* Installment Simulator */}
                 <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden ring-4 ring-indigo-500/20">
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-indigo-600 rounded-full blur-3xl opacity-40"></div>
                    <div className="flex justify-between items-center mb-6">
                       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center">
                          <Calculator size={14} className="mr-2" /> {isManualInstallment ? 'Parcela Manual' : 'Parcela Estimada'}
                       </span>
                       <PieChart size={20} className="text-slate-600" />
                    </div>
                    <div className="flex items-end space-x-3 relative border-b border-white/10 pb-4 mb-4">
                       <span className="text-2xl font-black text-indigo-400 mb-2">R$</span>
                       <input type="number" step="any" value={installmentValue} onChange={(e) => handleInstallmentChange(e.target.value)} className="w-full bg-transparent border-none outline-none text-5xl font-black tracking-tighter text-white tabular-nums" placeholder="0" />
                       <span className="text-xs text-slate-500 font-black mb-4 uppercase tracking-widest shrink-0">Mês</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                       <span>Custo Efetivo Total</span>
                       <span className="text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseCurrencyInput(totalAmount))}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-5">
                   <div className={`bg-slate-50 dark:bg-slate-900 p-5 rounded-[2rem] border-2 transition-all ${isEntryInvalid ? 'border-rose-500' : 'border-transparent focus-within:border-indigo-500 shadow-inner'}`}>
                     <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isEntryInvalid ? 'text-rose-500' : 'text-slate-400'}`}>Entrada</label>
                     <div className="relative">
                       <span className={`absolute left-0 top-1/2 -translate-y-1/2 font-black text-lg ${isEntryInvalid ? 'text-rose-300' : 'text-slate-400'}`}>R$</span>
                       <input type="number" step="any" value={downPayment} onChange={(e) => { setDownPayment(e.target.value); setIsManualInstallment(false); }} className={`w-full pl-8 bg-transparent outline-none font-black text-xl tabular-nums ${isEntryInvalid ? 'text-rose-500' : 'dark:text-white'}`} placeholder="0" />
                     </div>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-[2rem] border-2 border-transparent focus-within:border-indigo-500 transition-all shadow-inner">
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Qtd Parcelas</label>
                     <div className="flex items-center space-x-3">
                        <input type="number" min="1" value={installments} onChange={(e) => { setInstallments(e.target.value); setIsManualInstallment(false); }} className="w-full bg-transparent outline-none font-black text-xl dark:text-white tabular-nums" />
                        <RefreshCw size={20} className="text-slate-400" />
                     </div>
                   </div>
                 </div>
                 
                 {isEntryInvalid && (
                    <div className="flex items-center space-x-3 text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-5 rounded-[1.5rem] border border-rose-100 dark:border-rose-900/50">
                       <AlertTriangle size={24} className="shrink-0" />
                       <span className="text-xs font-black uppercase tracking-tight leading-snug">A entrada não pode superar o total do contrato.</span>
                    </div>
                 )}

                 <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] shadow-inner">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Início dos Pagamentos</label>
                   <div 
                     onClick={() => setIsCalendarOpen(true)}
                     className="flex items-center bg-white dark:bg-slate-800 rounded-2xl px-5 py-3 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                   >
                      <Calendar size={20} className="text-indigo-500 mr-4" />
                      <span className="flex-1 font-black text-sm dark:text-white">{new Date(firstDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                   </div>
                 </div>

                 {isRetroactive && (
                   <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between group">
                      <div className="flex items-center space-x-4">
                         <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none"><ShieldCheck size={26} /></div>
                         <div className="min-w-0"><span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] block mb-0.5">Histórico</span><span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Baixar parcelas passadas?</span></div>
                      </div>
                      <button type="button" onClick={() => setAutoPayPast(!autoPayPast)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${autoPayPast ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${autoPayPast ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                   </div>
                 )}

                 <div className="flex space-x-4 pt-4">
                   <button type="button" onClick={() => setStep(0)} className="w-16 h-16 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-2xl active:scale-95 transition-all hover:bg-slate-200"><ArrowLeft size={28} /></button>
                   <button type="submit" disabled={isEntryInvalid || !installmentValue} className="flex-1 h-16 bg-slate-900 dark:bg-indigo-600 disabled:opacity-30 text-white font-black text-xs uppercase tracking-[0.3em] rounded-[1.8rem] shadow-2xl transition-all active:scale-95 flex items-center justify-center"><Check size={24} className="mr-3" />Finalizar Plano</button>
                 </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <CalendarModal 
         isOpen={isCalendarOpen} 
         onClose={() => setIsCalendarOpen(false)} 
         selectedDate={firstDate} 
         onSelect={(d) => setFirstDate(d)} 
         title="Primeiro Pagamento"
      />
    </>
  );
};
