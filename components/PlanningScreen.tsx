
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  Target, PieChart, TrendingUp, Plus, X, 
  ChevronRight, ArrowRight, Wallet, CheckCircle2, 
  AlertCircle, Sparkles, Filter, PiggyBank, Heart, 
  Activity, ShieldCheck, Flame, Info, Calendar
} from 'lucide-react';
import { getIcon, parseCurrencyInput } from '../constants';
import { GoalDetail } from './GoalDetail';
import { CalendarModal } from './CalendarModal';

export const PlanningScreen = () => {
  const { categories, budgets, transactions, goals, addGoal, saveBudget, deleteBudget, updateGoal, deleteGoal } = useFinance();
  const [activeView, setActiveView] = useState<'budget' | 'goals' | 'rule'>('budget');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'budget' | 'goal'>('budget');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgetUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    transactions
      .filter(t => t.date.startsWith(currentMonth) && t.type === 'expense')
      .forEach(t => {
        usage[t.categoryId] = (usage[t.categoryId] || 0) + t.amount;
      });
    return usage;
  }, [transactions, currentMonth]);

  const ruleData = useMemo(() => {
    let income = 0;
    let essential = 0;
    let personal = 0;
    let future = 0;

    transactions.filter(t => t.date.startsWith(currentMonth) && t.status === 'paid').forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') {
        const cat = categories.find(c => c.id === t.categoryId);
        const classification = cat?.classification || 'personal';
        if (classification === 'essential') essential += t.amount;
        else if (classification === 'personal') personal += t.amount;
        else if (classification === 'future') future += t.amount;
      }
    });

    const incomeSafe = income || 1;
    return {
      income,
      actual: {
        essential: (essential / incomeSafe) * 100,
        personal: (personal / incomeSafe) * 100,
        future: (future / incomeSafe) * 100
      },
      values: { essential, personal, future }
    };
  }, [transactions, categories, currentMonth]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100">
      
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-4 pb-4">
        <div className="flex justify-between items-center mb-6 px-1">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Planejamento</h1>
          <button 
            onClick={() => { setModalType(activeView === 'goals' ? 'goal' : 'budget'); setIsModalOpen(true); }}
            className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-90"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="flex bg-slate-200/50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
           {(['budget', 'goals', 'rule'] as const).map(tab => (
             <button
               key={tab}
               onClick={() => setActiveView(tab)}
               className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === tab ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400'}`}
             >
               {tab === 'budget' ? 'Teto' : tab === 'goals' ? 'Metas' : '50/30/20'}
             </button>
           ))}
        </div>
      </div>

      <div className="mt-6 px-1 space-y-8">
        {activeView === 'budget' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Teto de Gastos</p>
               <h2 className="text-3xl font-black mb-4">Seu Orçamento</h2>
               <p className="text-xs text-indigo-100/70">Gerencie os limites mensais por categoria.</p>
            </div>
            <div className="space-y-4">
              {budgets.length === 0 ? (
                <EmptyState icon={Activity} title="Sem orçamentos" desc="Defina limites de gastos para suas categorias." />
              ) : (
                budgets.map(budget => (
                  <BudgetCard key={budget.categoryId} budget={budget} usage={budgetUsage[budget.categoryId] || 0} categories={categories} onDelete={deleteBudget} />
                ))
              )}
            </div>
          </div>
        )}

        {activeView === 'goals' && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-amber-500 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <h2 className="text-3xl font-black mb-2">Seus Sonhos</h2>
                <p className="text-xs text-amber-50 opacity-90 leading-relaxed">Visualize o progresso das suas conquistas.</p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goals.length === 0 ? (
                  <EmptyState icon={PiggyBank} title="Qual o seu sonho?" desc="Comece criando sua primeira meta financeira." />
                ) : (
                  goals.map(goal => (
                    <GoalCard key={goal.id} goal={goal} onClick={() => setSelectedGoalId(goal.id)} />
                  ))
                )}
             </div>
          </div>
        )}

        {activeView === 'rule' && (
          <div className="space-y-8 animate-fade-in">
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-amber-500 to-emerald-500"></div>
                <Sparkles className="text-indigo-600 mx-auto mb-4" size={32} />
                <h2 className="text-2xl font-black mb-2 tracking-tight">Regra 50/30/20</h2>
                <p className="text-xs text-slate-400">Distribuição ideal da sua renda mensal</p>
             </div>
             <div className="space-y-4">
                <RuleCard label="Essencial" ideal={50} actual={ruleData.actual.essential} value={ruleData.values.essential} color="bg-indigo-500" icon={ShieldCheck} desc="Moradia, contas e alimentação." />
                <RuleCard label="Livre / Lazer" ideal={30} actual={ruleData.actual.personal} value={ruleData.values.personal} color="bg-amber-500" icon={Heart} desc="Hobbies, saídas e desejos." />
                <RuleCard label="Investimento" ideal={20} actual={ruleData.actual.future} value={ruleData.values.future} color="bg-emerald-500" icon={TrendingUp} desc="Reservas e planos futuros." />
             </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-slide-up">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-black tracking-tight dark:text-white">
                   {modalType === 'budget' ? 'Novo Teto' : 'Nova Meta'}
                 </h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"><X size={24}/></button>
              </div>
              {modalType === 'budget' ? (
                <BudgetForm categories={categories} onSave={(b) => { saveBudget(b); setIsModalOpen(false); }} />
              ) : (
                <GoalForm onSave={(g) => { addGoal({ ...g, createdAt: new Date().toISOString() }); setIsModalOpen(false); }} />
              )}
           </div>
        </div>
      )}

      {selectedGoalId && <GoalDetail goalId={selectedGoalId} onClose={() => setSelectedGoalId(null)} />}
    </div>
  );
};

const GoalCard = ({ goal, onClick }: any) => {
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const GoalIcon = getIcon(goal.icon);
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div onClick={onClick} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between h-48 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer">
       <div className="flex justify-between items-start relative z-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: goal.color }}>
             <GoalIcon size={24} />
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{goal.deadline ? new Date(goal.deadline).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) : 'S/ Prazo'}</p>
             <h3 className="text-lg font-black text-slate-800 dark:text-white mt-1">{goal.name}</h3>
          </div>
       </div>
       <div className="relative z-10 mt-auto">
          <div className="flex justify-between items-end mb-2">
             <span className="text-sm font-black text-slate-500 dark:text-slate-400">{formatCurrency(goal.currentAmount)}</span>
             <span className="text-lg font-black text-slate-800 dark:text-white">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: goal.color }}></div>
          </div>
       </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, desc }: any) => (
  <div className="text-center py-16 opacity-50 flex flex-col items-center">
    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
      <Icon size={32} className="text-slate-400" />
    </div>
    <h3 className="font-bold text-slate-700 dark:text-white mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-[200px]">{desc}</p>
  </div>
);

const RuleCard = ({ label, ideal, actual, value, color, icon: Icon, desc }: any) => {
  const isExceeded = actual > ideal;
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
       <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${color}`}><Icon size={20} /></div>
          <div>
            <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{label}</h4>
            <p className="text-[10px] text-slate-400">{desc}</p>
          </div>
       </div>
       <div className="relative h-2 bg-slate-50 dark:bg-slate-800 rounded-full mb-3 overflow-hidden">
          <div className={`h-full transition-all ${color}`} style={{ width: `${Math.min(100, actual)}%` }}></div>
          <div className="absolute top-0 bottom-0 border-l-2 border-white/50" style={{ left: `${ideal}%` }}></div>
       </div>
       <div className="flex justify-between font-black text-xs">
          <span className="text-slate-400">{formatCurrency(value)}</span>
          <div className="flex space-x-2">
            <span>{actual.toFixed(1)}%</span>
            <span className={isExceeded ? 'text-rose-500' : 'text-emerald-500'}>{isExceeded ? 'Ajustar' : 'Ideal'}</span>
          </div>
       </div>
    </div>
  );
};

const BudgetCard = ({ budget, usage, categories, onDelete }: any) => {
  const cat = categories.find((c: any) => c.id === budget.categoryId);
  const Icon = cat ? getIcon(cat.icon) : PieChart;
  const pct = Math.min(100, (usage / budget.limit) * 100);
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
       <div className="flex justify-between mb-4">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cat?.color }}>
                <Icon size={20} />
             </div>
             <div>
                <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase">{cat?.name}</h4>
                <span className="text-[10px] text-slate-400 font-bold">{formatCurrency(usage)} de {formatCurrency(budget.limit)}</span>
             </div>
          </div>
          <button onClick={() => onDelete(budget.categoryId)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><X size={18} /></button>
       </div>
       <div className="h-2.5 bg-slate-50 dark:bg-slate-800 rounded-full mb-2 overflow-hidden">
          <div className={`h-full transition-all duration-700 ${pct > 90 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }}></div>
       </div>
       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest mt-2">
          <span className={pct > 90 ? 'text-rose-500' : 'text-slate-400'}>{pct.toFixed(0)}% USADO</span>
          {pct > 90 && <span className="text-rose-500 flex items-center"><AlertCircle size={10} className="mr-1"/> Limite Próximo</span>}
       </div>
    </div>
  );
};

const BudgetForm = ({ categories, onSave }: any) => {
  const [catId, setCatId] = useState('');
  const [limit, setLimit] = useState('');
  return (
    <div className="space-y-6">
       <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Categoria</label>
          <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm dark:text-white transition">
            <option value="">Selecione...</option>
            {categories.filter((c: any) => c.type === 'expense').map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
       </div>
       <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Teto Mensal</label>
          <div className="relative">
             <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">R$</span>
             <input type="number" step="any" value={limit} onChange={e => setLimit(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-lg dark:text-white transition" placeholder="0" />
          </div>
       </div>
       <button onClick={() => onSave({ categoryId: catId, limit: parseCurrencyInput(limit) })} disabled={!catId || !limit} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-30 transition-all">Salvar Teto</button>
    </div>
  );
};

const GoalForm = ({ onSave }: any) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('0');
  const [deadline, setDeadline] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="space-y-6">
       <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">O que você quer conquistar?</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm dark:text-white transition" placeholder="Ex: Viagem para o Japão" />
       </div>
       <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Valor Alvo</label>
            <input type="number" step="any" value={target} onChange={e => setTarget(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm dark:text-white transition" placeholder="R$ 0" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Já tenho</label>
            <input type="number" step="any" value={current} onChange={e => setCurrent(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm dark:text-white transition" placeholder="R$ 0" />
          </div>
       </div>
       <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Prazo (Opcional)</label>
          <div 
             onClick={() => setIsCalendarOpen(true)}
             className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-2xl flex items-center justify-between cursor-pointer transition"
          >
             <span className={`font-bold text-sm ${deadline ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
               {deadline ? new Date(deadline + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}
             </span>
             <Calendar size={18} className="text-slate-400" />
          </div>
       </div>
       <button onClick={() => onSave({ name, targetAmount: parseCurrencyInput(target), currentAmount: parseCurrencyInput(current), deadline, color: '#f59e0b', icon: 'PiggyBank' })} disabled={!name || !target} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 disabled:opacity-30 transition-all">Criar Meta</button>
       
       <CalendarModal 
         isOpen={isCalendarOpen} 
         onClose={() => setIsCalendarOpen(false)} 
         selectedDate={deadline || new Date().toISOString().slice(0, 10)} 
         onSelect={(d) => setDeadline(d)} 
         title="Prazo da Meta"
      />
    </div>
  );
};
