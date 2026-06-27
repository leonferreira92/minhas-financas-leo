
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  ChevronLeft, Edit2, MoreVertical, X, 
  Calculator, CheckCircle2, TrendingUp,
  Calendar, Info, Sparkles, PiggyBank,
  Plus, ArrowRight, Star, Target
} from 'lucide-react';
import { getIcon } from '../constants';
import { 
  AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { GeminiService } from '../services/geminiService';

interface Props {
  goalId: string;
  onClose: () => void;
}

export const GoalDetail: React.FC<Props> = ({ goalId, onClose }) => {
  const { goals, updateGoal, deleteGoal, transactions, categories, addTransaction, accounts } = useFinance();
  const [activeTab, setActiveTab] = useState<'details' | 'deposits'>('details');
  const [simValue, setSimValue] = useState('');
  const [aiStrategy, setAiStrategy] = useState<{ strategy: string; reduction: number } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  
  const goal = goals.find(g => g.id === goalId);

  // Histórico real de depósitos da meta
  const depositHistory = useMemo(() => {
    // Aqui assumimos que depósitos são transações que têm alguma relação com a meta (campo que poderia ser adicionado)
    // Por enquanto, usamos dados simulados para o gráfico de tendência
    return [
      { name: 'Mar', value: goal ? goal.currentAmount * 0.4 : 0 },
      { name: 'Abr', value: goal ? goal.currentAmount * 0.5 : 0 },
      { name: 'Mai', value: goal ? goal.currentAmount * 0.55 : 0 },
      { name: 'Jun', value: goal ? goal.currentAmount * 0.7 : 0 },
      { name: 'Jul', value: goal ? goal.currentAmount * 0.85 : 0 },
      { name: 'Ago', value: goal ? goal.currentAmount : 0 },
    ];
  }, [goal]);

  useEffect(() => {
    if (goal && !aiStrategy && !isLoadingAi) {
      loadAiStrategy();
    }
  }, [goal]);

  const loadAiStrategy = async () => {
    if (!goal) return;
    setIsLoadingAi(true);
    const result = await GeminiService.analyzeGoalStrategy(goal, transactions, categories);
    if (result) setAiStrategy({ strategy: result.strategy, reduction: result.estimatedDaysReduction });
    setIsLoadingAi(false);
  };

  if (!goal) return null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  const deadlineDate = goal.deadline ? new Date(goal.deadline) : new Date();
  const monthsRemaining = useMemo(() => {
    const now = new Date();
    const diff = (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth());
    return diff > 0 ? diff : 1;
  }, [deadlineDate]);

  const idealPerMonth = remainingAmount / monthsRemaining;

  // Simulação dinâmica
  const simResult = useMemo(() => {
    const val = parseFloat(simValue);
    if (isNaN(val) || val <= 0) return null;
    const months = remainingAmount / val;
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + Math.ceil(months));
    return { months: Math.ceil(months), date: completionDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  }, [simValue, remainingAmount]);

  const GoalIcon = getIcon(goal.icon);

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] overflow-y-auto animate-slide-up flex flex-col no-scrollbar">
      
      {/* --- Dynamic Header --- */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-500 text-white pt-4 shrink-0 shadow-lg">
        <div className="px-4 flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-black tracking-tight">{goal.name}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-white/10 rounded-full transition"><Edit2 size={20} /></button>
            <button className="p-2 hover:bg-white/10 rounded-full transition"><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex px-4">
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-4 text-[10px] font-black tracking-[0.2em] border-b-4 transition-all uppercase ${activeTab === 'details' ? 'border-white opacity-100' : 'border-transparent opacity-50'}`}
          >
            Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('deposits')}
            className={`flex-1 py-4 text-[10px] font-black tracking-[0.2em] border-b-4 transition-all uppercase ${activeTab === 'deposits' ? 'border-white opacity-100' : 'border-transparent opacity-50'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* --- Main Scrollable Area --- */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-5 space-y-6 pb-32">
        
        {/* Progress Orbit Section */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center">
           <div className="relative w-48 h-48 mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="96" cy="96" r="80" 
                  stroke="currentColor" strokeWidth="12" fill="transparent" 
                  className="text-slate-100 dark:text-slate-800"
                />
                <circle 
                  cx="96" cy="96" r="80" 
                  stroke="currentColor" strokeWidth="12" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={2 * Math.PI * 80 * (1 - pct / 100)}
                  strokeLinecap="round"
                  className="text-blue-500 transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-1 shadow-lg shadow-blue-200 dark:shadow-none bg-blue-600`}>
                    <GoalIcon size={32} />
                 </div>
                 <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">{pct.toFixed(0)}%</span>
              </div>
           </div>
           
           <div className="text-center space-y-1">
              <p className="text-2xl font-black text-blue-600">{formatCurrency(goal.currentAmount)}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alvo: {formatCurrency(goal.targetAmount)}</p>
           </div>
        </div>

        {/* Quick Insights Bar */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ideal p/ Mês</span>
              <p className="text-base font-black text-slate-800 dark:text-white">{formatCurrency(idealPerMonth)}</p>
           </div>
           <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Restante</span>
              <p className="text-base font-black text-rose-500">{formatCurrency(remainingAmount)}</p>
           </div>
        </div>

        {/* AI Strategy Tooltip */}
        <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
           <div className="flex items-center space-x-3 mb-3">
              <Sparkles className="text-yellow-300 animate-pulse" size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Estratégia da IA</h3>
           </div>
           {isLoadingAi ? (
             <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-150"></div>
             </div>
           ) : aiStrategy ? (
             <div className="space-y-3">
                <p className="text-sm font-medium leading-relaxed italic opacity-90">"{aiStrategy.strategy}"</p>
                <div className="flex items-center text-[10px] font-black bg-white/20 px-3 py-1.5 rounded-full self-start w-fit">
                   <TrendingUp size={12} className="mr-1.5" /> ATINGIR {aiStrategy.reduction} DIAS MAIS RÁPIDO
                </div>
             </div>
           ) : (
             <button onClick={loadAiStrategy} className="text-xs font-bold underline">Toque para analisar</button>
           )}
        </div>

        {/* Milestones / Marcos */}
        <div className="space-y-3">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Marcos da Jornada</h3>
           <div className="grid grid-cols-3 gap-2">
              {[25, 50, 75].map(m => (
                <div key={m} className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition ${pct >= m ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300'}`}>
                   {pct >= m ? <CheckCircle2 size={16} className="mb-1" /> : <Star size={16} className="mb-1" />}
                   <span className="text-[10px] font-black">{m}%</span>
                </div>
              ))}
           </div>
        </div>

        {/* Interactive Simulator */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="flex items-center space-x-2 mb-4">
              <Calculator size={18} className="text-blue-500" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Simulador de Esforço</h3>
           </div>
           <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">Se eu começar a poupar mensalmente:</p>
           <div className="flex items-center space-x-3 mb-6">
              <div className="relative flex-1">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                 <input 
                   type="number" 
                   value={simValue}
                   onChange={e => setSimValue(e.target.value)}
                   className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl text-base font-black outline-none dark:text-white transition"
                   placeholder="0,00"
                 />
              </div>
           </div>
           {simResult && (
             <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 flex items-center justify-between border border-blue-100 dark:border-blue-800 animate-fade-in">
                <div>
                   <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Previsão de Conclusão</span>
                   <p className="text-sm font-black text-blue-700 dark:text-blue-300">{simResult.date}</p>
                </div>
                <div className="text-right">
                   <p className="text-xs font-black text-blue-600">{simResult.months} meses</p>
                </div>
             </div>
           )}
        </div>

        {/* Trend Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evolução do Saldo</h3>
              <div className="flex items-center text-[10px] font-black text-emerald-500">
                 <TrendingUp size={12} className="mr-1" /> CRESCENTE
              </div>
           </div>
           <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={depositHistory}>
                    <defs>
                       <linearGradient id="goalGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <Area 
                       type="monotone" 
                       dataKey="value" 
                       stroke="#3b82f6" 
                       strokeWidth={3}
                       fillOpacity={1} 
                       fill="url(#goalGradient)" 
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

      </div>

      {/* --- Floating Quick Action --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center space-x-3 pointer-events-auto">
         <button 
           onClick={() => setIsDepositModalOpen(true)}
           className="bg-blue-600 text-white px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-300 dark:shadow-none flex items-center group active:scale-95 transition-transform"
         >
            <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform" />
            Depositar
         </button>
      </div>

      {/* --- Quick Deposit Modal --- */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Novo Depósito</h2>
                 <button onClick={() => setIsDepositModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <DepositForm 
                onSave={(amount) => {
                  updateGoal({ ...goal, currentAmount: goal.currentAmount + amount });
                  setIsDepositModalOpen(false);
                }} 
              />
           </div>
        </div>
      )}
    </div>
  );
};

// Form auxiliar para depósitos rápidos
const DepositForm = ({ onSave }: { onSave: (amount: number) => void }) => {
  const [val, setVal] = useState('');
  return (
    <div className="space-y-6">
       <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor do Depósito</label>
          <div className="relative">
             <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">R$</span>
             <input 
               type="number" 
               value={val} 
               onChange={e => setVal(e.target.value)} 
               className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] dark:text-white outline-none font-black text-2xl" 
               placeholder="0,00"
               autoFocus
             />
          </div>
       </div>
       <button 
         onClick={() => onSave(parseFloat(val))}
         disabled={!val || parseFloat(val) <= 0}
         className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 disabled:opacity-30 transition-all"
       >
         Confirmar Depósito
       </button>
    </div>
  );
};
