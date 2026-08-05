
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getIcon } from '../constants';
import { 
  Eye, EyeOff, TrendingUp, TrendingDown, Bell, 
  Settings as SettingsIcon, CreditCard, Sparkles, 
  PieChart, Clock, Target, CalendarDays, PlusCircle, 
  ArrowUpCircle, ChevronRight, Receipt, BarChart3,
  AlertCircle, Wallet, X, CalendarRange, Check, Zap,
  ArrowRightLeft, Music, Mic, Laptop, Car, Plane,
  Briefcase, ShieldAlert, DollarSign, CheckCircle2,
  Plus, Flame, PiggyBank
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TransactionForm } from './TransactionForm';
import { TransactionType } from '../types';
import { CalendarModal } from './CalendarModal';
import { DashboardSkeleton } from './Skeleton';
import { GoalDetail } from './GoalDetail';
import { AccountBalanceModal } from './AccountBalanceModal';

const HubButton = ({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };
  
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-all group"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 transition-all group-hover:scale-110 ${colorMap[color] || colorMap.blue}`}>
        <Icon size={24} strokeWidth={2} />
      </div>
      <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">{label}</span>
    </button>
  );
};

export const Dashboard = () => {
  const { 
    getBalanceSummary, transactions, categories, getSystemAlerts, 
    accounts, settings, getAccountBalance, isBlurred, toggleBlur,
    updateTransaction, goals, debts, getDebtProgress, shows
  } = useFinance();
  
  const navigate = useNavigate();
  const [balanceMode, setBalanceMode] = useState<'real' | 'projected'>('real');
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedGoalDetailId, setSelectedGoalDetailId] = useState<string | null>(null);
  const [selectedAccountForBalanceEdit, setSelectedAccountForBalanceEdit] = useState<any | null>(null);
  
  // State for Transaction Modal Actions
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [transactionCategoryId, setTransactionCategoryId] = useState<string | undefined>(undefined);
  
  const [projectionDate, setProjectionDate] = useState(() => {
    const now = new Date();
    // Default to last day of current month
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  });

  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    // Simulate loading for skeleton demo
    const timer = setTimeout(() => setIsLoaded(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const alerts = useMemo(() => getSystemAlerts(), [transactions]);
  const summary = useMemo(() => getBalanceSummary(currentMonth, projectionDate), [transactions, currentMonth, projectionDate, accounts]);

  const freeToSpend = summary.freeToSpend;
  const freeToSpendPercent = Math.max(0, Math.min(100, (freeToSpend / (summary.realBalance + summary.pendingIncome)) * 100));

  const recentTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return [...transactions]
      .filter(t => t.date <= todayStr) // Filtra para evitar que lançamentos futuros inundem a dashboard de atividades recentes
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .slice(0, 5); // Aumentado para 5 para uma visualização mais completa
  }, [transactions]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const reservaConquistasData = useMemo(() => {
    const activeGoals = goals || [];
    const totalTarget = activeGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const totalSaved = activeGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const progressPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
    return { activeGoals, totalTarget, totalSaved, progressPercent };
  }, [goals]);

  const showsVsSalaryData = useMemo(() => {
    const nowStr = new Date().toISOString().slice(0, 7);
    const monthIncomes = transactions.filter(t => t.type === 'income' && t.date.startsWith(nowStr));

    // Get current month active shows registered in Musician Module
    const currentMonthShows = (shows || []).filter(s => s.date && s.date.startsWith(nowStr) && s.status !== 'Cancelado');
    const registeredShowsCount = currentMonthShows.length;
    const registeredShowsCache = currentMonthShows.reduce((sum, s) => sum + (s.totalCache || 0), 0);

    let showsTotal = 0;
    let showsCount = 0;
    let salaryTotal = 0;
    let otherTotal = 0;

    monthIncomes.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = (cat?.name || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const isShow = 
        t.categoryId === 'cat_33' ||
        /show|cachê|cache|música|musica|artista|gig|evento|banda|casamento/i.test(catName) ||
        /show|cachê|cache|música|musica|gig|evento|banda|casamento/i.test(desc);
      
      const isSalary = 
        !isShow && (
          t.categoryId === 'cat_6' ||
          /salário|salario|holerite|adiantamento|pró-labore|pro-labore/i.test(catName) ||
          /salário|salario|holerite|adiantamento/i.test(desc)
        );

      if (isShow) {
        showsTotal += t.amount;
        showsCount += 1;
      } else if (isSalary) {
        salaryTotal += t.amount;
      } else {
        otherTotal += t.amount;
      }
    });

    // If registered shows exist in current month, ensure count and cache reflect them accurately
    if (registeredShowsCount > 0) {
      showsCount = Math.max(showsCount, registeredShowsCount);
      if (showsTotal === 0 && registeredShowsCache > 0) {
        showsTotal = registeredShowsCache;
      }
    }

    const totalMonthIncome = showsTotal + salaryTotal + otherTotal;
    const showsPercent = totalMonthIncome > 0 ? Math.round((showsTotal / totalMonthIncome) * 100) : 0;
    const salaryPercent = totalMonthIncome > 0 ? Math.round((salaryTotal / totalMonthIncome) * 100) : 0;
    const otherPercent = totalMonthIncome > 0 ? Math.round((otherTotal / totalMonthIncome) * 100) : 0;

    return {
      showsTotal,
      showsCount,
      salaryTotal,
      otherTotal,
      totalMonthIncome,
      showsPercent,
      salaryPercent,
      otherPercent
    };
  }, [transactions, categories, shows]);

  const receitaMesData = useMemo(() => {
    const nowStr = new Date().toISOString().slice(0, 7);
    const monthIncomes = transactions.filter(t => t.type === 'income' && t.date.startsWith(nowStr));
    const total = monthIncomes.reduce((sum, t) => sum + t.amount, 0);
    const paid = monthIncomes.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const pending = monthIncomes.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    const percentPaid = total > 0 ? Math.round((paid / total) * 100) : 100;

    return { total, paid, pending, percentPaid };
  }, [transactions]);

  const dividasRestantesData = useMemo(() => {
    const activeDebts = (debts || []).filter(d => {
      const prog = getDebtProgress(d.id);
      return prog.remaining > 0 && prog.status === 'active';
    });

    let totalRemaining = 0;
    let totalOriginal = 0;
    let totalPaid = 0;

    activeDebts.forEach(d => {
      const prog = getDebtProgress(d.id);
      totalRemaining += prog.remaining;
      totalOriginal += prog.totalReal;
      totalPaid += prog.paid;
    });

    const progressPercent = totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0;

    return {
      activeDebts,
      activeCount: activeDebts.length,
      totalRemaining,
      totalOriginal,
      totalPaid,
      progressPercent
    };
  }, [debts]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const applyPreset = (type: 'endMonth' | 'plus30') => {
    const now = new Date();
    if (type === 'endMonth') {
      setProjectionDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
    } else {
      const future = new Date();
      future.setDate(now.getDate() + 30);
      setProjectionDate(future.toISOString().slice(0, 10));
    }
    setIsDateModalOpen(false);
  };

  const openTransactionModal = (type: TransactionType, catId?: string) => {
    setTransactionType(type);
    setTransactionCategoryId(catId);
    setIsTransactionModalOpen(true);
  };

  const openCalendar = () => {
    setIsCalendarOpen(true);
  };

  const handleDateSelect = (d: string) => {
    setProjectionDate(d);
    setIsDateModalOpen(false);
  };

  if (!isLoaded) return <DashboardSkeleton />;

  return (
    <div className={`space-y-8 pb-32 transition-opacity duration-700 opacity-100 text-slate-900 dark:text-slate-100`}>
      
      {/* Header Contextual */}
      <div className="flex justify-between items-center px-1 pt-4">
        <div className="flex items-center space-x-3">
           <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:rotate-6 active:scale-95">
             {settings.userName?.charAt(0).toUpperCase() || 'F'}
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">{getGreeting()},</span>
             <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tight">{settings.userName || 'Investidor'}</h1>
           </div>
        </div>
        <div className="flex items-center space-x-2">
           <Link to="/alerts" className="relative p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 border border-slate-100 dark:border-slate-800 transition-all active:scale-95 shadow-sm">
             <Bell size={22} />
             {alerts.length > 0 && <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-rose-500 rounded-full border-[3px] border-white dark:border-slate-950 animate-pulse"></span>}
          </Link>
          <Link to="/settings" className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 border border-slate-100 dark:border-slate-800 transition-all active:scale-95 shadow-sm">
             <SettingsIcon size={22} />
          </Link>
        </div>
      </div>

      {/* Hero Card */}
      <div className="relative bg-slate-900 dark:bg-black rounded-[2.8rem] p-8 text-white shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600 rounded-full blur-[100px] opacity-40 transition-opacity group-hover:opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-emerald-500 rounded-full blur-[80px] opacity-10"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 border border-white/10 shadow-inner">
               <button 
                onClick={() => setBalanceMode('real')} 
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${balanceMode === 'real' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 Saldo Real
               </button>
               <button 
                onClick={() => setBalanceMode('projected')} 
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${balanceMode === 'projected' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 Previsto
               </button>
            </div>
            <button onClick={toggleBlur} className="text-slate-400 hover:text-white transition-all p-2 bg-white/5 rounded-2xl border border-white/5 active:scale-95">
              {!isBlurred ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          
          <div className="mb-6">
             <div className="flex items-center justify-between mb-2 ml-1">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] opacity-70">
                  {balanceMode === 'real' ? 'Patrimônio Consolidado' : 'Horizonte de Caixa'}
                </p>
                {balanceMode === 'projected' && (
                  <button 
                    onClick={() => setIsDateModalOpen(true)}
                    className="flex items-center space-x-1.5 bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase text-indigo-100 hover:bg-indigo-500/30 transition-all active:scale-95"
                  >
                    <CalendarRange size={12} className="text-indigo-400" />
                    <span>{new Date(projectionDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                    <ChevronRight size={10} className="text-indigo-500" />
                  </button>
                )}
             </div>

             <h2 className="text-5xl font-black tracking-tighter tabular-nums leading-none flex items-baseline">
              {!isBlurred ? (
                <>
                  <span className="text-2xl font-bold text-slate-500 mr-2">R$</span>
                  <span className="truncate">
                    {(balanceMode === 'real' ? summary.realBalance : summary.projectedBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </>
              ) : (
                <span className="text-4xl tracking-widest">••••••••</span>
              )}
             </h2>

             {/* Carrossel de Contas */}
             <div className="mt-8 -mx-1 overflow-x-auto no-scrollbar flex items-center space-x-3 px-1">
                {accounts.length === 0 ? (
                  <div className="py-2 px-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black uppercase text-slate-500">Nenhuma conta ativa</div>
                ) : (
                  accounts.map(acc => (
                    <div 
                      key={acc.id} 
                      onClick={() => setSelectedAccountForBalanceEdit(acc)}
                      className="flex flex-col shrink-0 bg-white/5 backdrop-blur-md border border-white/10 hover:border-white/20 hover:bg-white/10 rounded-2xl px-4 py-2.5 min-w-[120px] transition-transform active:scale-95 cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center space-x-2 mb-1">
                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: acc.color }}></div>
                         <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest truncate max-w-[80px]">{acc.name}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums">
                        {!isBlurred ? formatCurrency(getAccountBalance(acc.id)) : '••••'}
                      </span>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>

      {/* PAINEL PRINCIPAL DO DIA A DIA (INDICADORES EXECUTIVOS) */}
      <div className="px-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
            <Flame size={14} className="mr-2 text-indigo-500" /> Painel Principal do Dia a Dia
          </h3>
          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
            Resumo Diário
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Reserva para Conquistas */}
          <div 
            onClick={() => navigate('/metas')}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            {/* Efeito de brilho de fundo sutil */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none -mr-10 -mt-10"></div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <Target size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conta Economias & Metas</h4>
                    <p className="text-sm font-black text-slate-800 dark:text-white">Reservas & Objetivos Inteligentes</p>
                  </div>
                </div>
                
                {/* Botão + Nova Conquista direto no card */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/metas');
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-sm hover:shadow"
                  title="Criar ou gerenciar metas"
                >
                  <Plus size={13} />
                  <span>Gerenciar</span>
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight tabular-nums">
                    {!isBlurred ? formatCurrency(reservaConquistasData.totalSaved) : '••••••••'}
                    <span className="text-xs font-bold text-slate-400 ml-1.5">
                      / {!isBlurred ? formatCurrency(reservaConquistasData.totalTarget) : '••••'}
                    </span>
                  </p>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                    {reservaConquistasData.progressPercent}% Salvo
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-400 rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${Math.min(100, reservaConquistasData.progressPercent)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Carrossel/Lista Rápida Interativa de Conquistas */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>Conquistas ({reservaConquistasData.activeGoals.length}) • Clique para Detalhes</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black group-hover:underline flex items-center">
                  Painel de Metas <ChevronRight size={12} className="ml-0.5" />
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {reservaConquistasData.activeGoals.slice(0, 3).map(goal => {
                  const IconComp = getIcon(goal.icon);
                  const goalProg = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGoalDetailId(goal.id);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all active:scale-95"
                    >
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px]"
                        style={{ backgroundColor: goal.color }}
                      >
                        <IconComp size={10} />
                      </div>
                      <span className="truncate max-w-[110px]">{goal.name}</span>
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                        {goalProg}%
                      </span>
                    </button>
                  );
                })}
                {reservaConquistasData.activeGoals.length === 0 && (
                  <div className="flex items-center justify-between w-full p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    <span>Crie uma reserva para viagem, setup ou reserva de emergência</span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-2 py-1 rounded-lg">Criar</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Shows Fechados no Mês (Origem da Renda: Shows vs Salário) */}
          <div 
            onClick={() => navigate('/shows')}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <Music size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receitas de Música</h4>
                    <p className="text-sm font-black text-slate-800 dark:text-white">Shows Fechados no Mês</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/shows');
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-violet-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-violet-600 transition-all active:scale-95 shadow-sm"
                >
                  <Plus size={12} />
                  <span>Gerenciar</span>
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight tabular-nums">
                      {showsVsSalaryData.showsCount} {showsVsSalaryData.showsCount === 1 ? 'Show Fechado' : 'Shows Fechados'}
                    </p>
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mt-0.5">
                      {!isBlurred ? formatCurrency(showsVsSalaryData.showsTotal) : '••••'} <span className="text-slate-400 font-medium">em cachês neste mês</span>
                    </p>
                  </div>
                  <span className="text-xs font-black text-slate-400">
                    {showsVsSalaryData.showsPercent}% da receita
                  </span>
                </div>

                {/* Barra proporcional Shows x Salário x Outros */}
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3 flex">
                  <div 
                    className="h-full bg-violet-500 transition-all duration-1000"
                    style={{ width: `${showsVsSalaryData.showsPercent}%` }}
                    title={`Shows: ${showsVsSalaryData.showsPercent}%`}
                  ></div>
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${showsVsSalaryData.salaryPercent}%` }}
                    title={`Salário: ${showsVsSalaryData.salaryPercent}%`}
                  ></div>
                  <div 
                    className="h-full bg-slate-300 dark:bg-slate-700 transition-all duration-1000"
                    style={{ width: `${showsVsSalaryData.otherPercent}%` }}
                    title={`Outros: ${showsVsSalaryData.otherPercent}%`}
                  ></div>
                </div>
              </div>
            </div>

            {/* Legenda comparativa de onde vem o dinheiro */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>Origem da Receita no Mês</span>
                <span className="text-violet-500 group-hover:underline flex items-center">
                  Ver Extrato <ChevronRight size={12} className="ml-0.5" />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="p-2 rounded-xl bg-violet-500/5 dark:bg-violet-950/20 border border-violet-500/20 text-center">
                  <p className="text-[8px] font-black uppercase text-violet-500 tracking-wider">🎤 Shows</p>
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 tabular-nums truncate">
                    {!isBlurred ? formatCurrency(showsVsSalaryData.showsTotal) : '••••'}
                  </p>
                  <span className="text-[8px] font-bold text-slate-400">{showsVsSalaryData.showsPercent}%</span>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 text-center">
                  <p className="text-[8px] font-black uppercase text-blue-500 tracking-wider">💼 Salário</p>
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 tabular-nums truncate">
                    {!isBlurred ? formatCurrency(showsVsSalaryData.salaryTotal) : '••••'}
                  </p>
                  <span className="text-[8px] font-bold text-slate-400">{showsVsSalaryData.salaryPercent}%</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-500/5 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">📦 Outros</p>
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 tabular-nums truncate">
                    {!isBlurred ? formatCurrency(showsVsSalaryData.otherTotal) : '••••'}
                  </p>
                  <span className="text-[8px] font-bold text-slate-400">{showsVsSalaryData.otherPercent}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Receita do Mês */}
          <div 
            onClick={() => navigate('/transactions')}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entradas</h4>
                    <p className="text-sm font-black text-slate-800 dark:text-white">Receita do Mês</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight tabular-nums">
                    {!isBlurred ? formatCurrency(receitaMesData.total) : '••••••••'}
                  </p>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {receitaMesData.percentPaid}% Recebido
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, receitaMesData.percentPaid)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Recebido vs Previsto */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/10">
                  <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">Já Recebido</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white tabular-nums mt-0.5">
                    {!isBlurred ? formatCurrency(receitaMesData.paid) : '••••'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">A Receber (Previsto)</p>
                  <p className="text-sm font-black text-slate-600 dark:text-slate-300 tabular-nums mt-0.5">
                    {!isBlurred ? formatCurrency(receitaMesData.pending) : '••••'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Dívidas Restantes */}
          <div 
            onClick={() => navigate('/debts')}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <TrendingDown size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compromissos</h4>
                    <p className="text-sm font-black text-slate-800 dark:text-white">Dívidas Restantes</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl ${dividasRestantesData.activeCount === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                  {dividasRestantesData.activeCount === 0 ? 'Quitado' : `${dividasRestantesData.activeCount} ${dividasRestantesData.activeCount === 1 ? 'Ativa' : 'Ativas'}`}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight tabular-nums">
                    {!isBlurred ? formatCurrency(dividasRestantesData.totalRemaining) : '••••••••'}
                  </p>
                  <span className="text-xs font-bold text-slate-400">
                    {dividasRestantesData.progressPercent}% Quitado
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, dividasRestantesData.progressPercent)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Quitado vs Restante */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>Progresso das Dívidas</span>
                <span className="text-rose-500 group-hover:underline flex items-center">
                  Gerenciar <ChevronRight size={12} className="ml-0.5" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Já Pago</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white tabular-nums mt-0.5">
                    {!isBlurred ? formatCurrency(dividasRestantesData.totalPaid) : '••••'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/10">
                  <p className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest">A Quitar</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white tabular-nums mt-0.5">
                    {!isBlurred ? formatCurrency(dividasRestantesData.totalRemaining) : '••••'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Radar de Disponibilidade Widget */}
      {settings.dashboardLayout.find(w => w.id === 'radar')?.visible && (
        <div className="px-1">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                 <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center">
                       <Zap size={12} className="mr-1.5 text-indigo-500" /> Radar de Disponibilidade
                    </h3>
                    <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                       {isBlurred ? '••••' : formatCurrency(freeToSpend)}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dinheiro Livre (Free to Spend)</span>
                 </div>
                 <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
                    <PieChart size={24} />
                 </div>
              </div>

              <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                 <div 
                   className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${freeToSpend <= 0 ? 'bg-rose-500' : freeToSpendPercent < 20 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                   style={{ width: `${freeToSpendPercent}%` }}
                 ></div>
              </div>
              
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                 <span>Comprometido</span>
                 <span className={freeToSpend <= 0 ? 'text-rose-500' : 'text-indigo-500'}>
                    {freeToSpend <= 0 ? 'Limite Atingido' : `${Math.round(100 - freeToSpendPercent)}% Reservado`}
                 </span>
              </div>
           </div>
        </div>
      )}

      {/* Hub de Navegação Rápida */}
      <div className="px-1 space-y-4">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center">
            <Sparkles size={12} className="mr-2 text-indigo-500" /> Centro de Comando
         </h3>
         <div className="grid grid-cols-3 gap-3">
            <HubButton icon={Receipt} label="Extrato" color="indigo" onClick={() => navigate('/transactions')} />
            <HubButton icon={Music} label="Shows" color="purple" onClick={() => navigate('/shows')} />
            <HubButton icon={CalendarDays} label="Agenda" color="blue" onClick={() => navigate('/calendar')} />
            <HubButton icon={CreditCard} label="Dívidas" color="rose" onClick={() => navigate('/debts')} />
            <HubButton icon={BarChart3} label="Análise" color="purple" onClick={() => navigate('/insights')} />
            <HubButton icon={PieChart} label="Resumo" color="emerald" onClick={() => navigate('/summary')} />
         </div>
      </div>

      {/* Ações de Lançamento Direto (Funcionais) */}
      <div className="flex space-x-3 px-1">
         <button 
           onClick={() => openTransactionModal('expense')}
           className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-all"
         >
            <PlusCircle size={18} />
            <span>Lançar</span>
         </button>
         <button 
           onClick={() => openTransactionModal('transfer')}
           className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-white py-4 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm"
         >
            <ArrowUpCircle size={18} className="text-indigo-500" />
            <span>Transferir</span>
         </button>
      </div>

      {/* Últimas Atividades */}
      <div className="px-1 space-y-4">
         <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Últimas Atividades</h3>
            <Link to="/transactions" className="text-[10px] font-black text-indigo-500 uppercase flex items-center hover:text-indigo-600 transition-colors">
               Ver Tudo <ChevronRight size={14} className="ml-0.5" />
            </Link>
         </div>
         <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            {recentTransactions.length === 0 ? (
               <div className="text-center py-12 opacity-30">
                  <Clock size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-xs font-black uppercase text-slate-400">Sem registros recentes</p>
               </div>
            ) : (
               <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentTransactions.map(t => {
                     const cat = categories.find(c => c.id === t.categoryId);
                     const Icon = t.type === 'transfer' ? ArrowRightLeft : (t.type === 'goal_deposit' || t.type === 'goal_withdraw' ? PiggyBank : (cat ? getIcon(cat.icon) : Clock));
                     const isPending = t.status === 'pending';
                     const todayStr = new Date().toISOString().slice(0, 10);
                     const isOverdue = isPending && t.date < todayStr;
                     const isToday = isPending && t.date === todayStr;

                     const fromAcc = accounts.find(a => a.id === t.accountId);
                     const toAcc = accounts.find(a => a.id === t.destinationAccountId);

                     const descriptionText = t.type === 'transfer'
                       ? (fromAcc && toAcc ? `${fromAcc.name} ➔ ${toAcc.name}` : 'Transferência entre Contas')
                       : t.description;

                     const categoryName = t.type === 'transfer' ? 'Transferência' : (t.type === 'goal_deposit' ? 'Aporte em Meta' : t.type === 'goal_withdraw' ? 'Resgate de Meta' : (cat?.name || 'Geral'));

                     return (
                        <div 
                          key={t.id} 
                          onClick={() => navigate('/transactions')} 
                          className="flex items-center justify-between p-4.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group"
                        >
                           <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 group-hover:scale-105 transition-all shrink-0"
                                style={{ 
                                  backgroundColor: t.type === 'transfer' || t.type === 'goal_deposit' || t.type === 'goal_withdraw' ? 'rgba(99, 102, 241, 0.1)' : (cat ? `${cat.color}15` : 'rgba(148, 163, 184, 0.1)'),
                                  color: t.type === 'transfer' || t.type === 'goal_deposit' || t.type === 'goal_withdraw' ? '#6366f1' : (cat?.color || '#64748b')
                                }}
                              >
                                 <Icon size={18} strokeWidth={2.5} />
                              </div>
                              <div className="min-w-0 flex-1 pr-2">
                                 <div className="flex items-center space-x-2">
                                    <p className="text-sm font-black text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                       {descriptionText}
                                    </p>
                                    {isOverdue && (
                                       <span className="shrink-0 px-1.5 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-wider rounded-md animate-pulse">
                                          Atrasado
                                       </span>
                                    )}
                                    {isToday && (
                                       <span className="shrink-0 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-wider rounded-md">
                                          Hoje
                                       </span>
                                    )}
                                    {isPending && !isOverdue && !isToday && (
                                       <span className="shrink-0 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[8px] font-black uppercase tracking-wider rounded-md">
                                          Pendente
                                       </span>
                                    )}
                                 </div>
                                 <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{categoryName}</span>
                                    {fromAcc && t.type !== 'transfer' && (
                                       <>
                                          <span className="text-[9px] text-slate-300 dark:text-slate-700">•</span>
                                          <span className="text-[9px] font-semibold uppercase tracking-wider truncate max-w-[80px]" style={{ color: fromAcc.color }}>
                                             {fromAcc.name}
                                          </span>
                                       </>
                                    )}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center space-x-3.5 shrink-0 ml-2">
                              <div className="text-right">
                                 <p className={`text-sm font-black tabular-nums ${
                                    t.type === 'expense' || t.type === 'goal_deposit'
                                      ? 'text-rose-500 dark:text-rose-400' 
                                      : t.type === 'income' || t.type === 'goal_withdraw'
                                        ? 'text-emerald-500' 
                                        : 'text-slate-500 dark:text-slate-400'
                                 }`}>
                                    {t.type === 'expense' || t.type === 'goal_deposit' ? '-' : t.type === 'income' || t.type === 'goal_withdraw' ? '+' : '⇄'} {formatCurrency(t.amount)}
                                 </p>
                                 <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase mt-0.5">
                                    {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                 </p>
                              </div>

                              {isPending && (
                                 <button
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      updateTransaction({ ...t, status: 'paid' });
                                   }}
                                   title="Baixar Lançamento"
                                   className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white flex items-center justify-center transition-all active:scale-90 border border-emerald-100/50 dark:border-emerald-900/30"
                                 >
                                    <Check size={14} strokeWidth={3} />
                                 </button>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
      </div>

      {/* Modal de Horizonte de Caixa */}
      {isDateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-slide-up border-t border-white/10">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase tracking-widest">Horizonte</h2>
                 <button onClick={() => setIsDateModalOpen(false)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => applyPreset('endMonth')} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-transparent hover:border-indigo-500 transition-all text-left">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mês Atual</span>
                       <span className="text-sm font-bold dark:text-white">Até o Fim</span>
                    </button>
                    <button onClick={() => applyPreset('plus30')} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-transparent hover:border-indigo-500 transition-all text-left">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Próximos</span>
                       <span className="text-sm font-bold dark:text-white">30 Dias</span>
                    </button>
                 </div>

                 <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block px-1">Data Personalizada</label>
                    <button 
                      onClick={openCalendar}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between text-slate-800 dark:text-white font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <span>{new Date(projectionDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <CalendarRange size={20} className="text-indigo-500" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Calendar Modal Component */}
      <CalendarModal 
         isOpen={isCalendarOpen} 
         onClose={() => setIsCalendarOpen(false)} 
         selectedDate={projectionDate} 
         onSelect={handleDateSelect} 
         title="Horizonte de Caixa"
      />

      {/* Modal de Transação Rápida */}
      {isTransactionModalOpen && (
        <TransactionForm 
          onClose={() => {
            setIsTransactionModalOpen(false);
            setTransactionCategoryId(undefined);
          }}
          initialType={transactionType}
          initialCategoryId={transactionCategoryId}
        />
      )}

      {/* Modal de Detalhes da Meta com IA */}
      {selectedGoalDetailId && (
        <GoalDetail
          goalId={selectedGoalDetailId}
          onClose={() => setSelectedGoalDetailId(null)}
        />
      )}

      {/* Modal de Edição de Saldo e Detalhes da Conta */}
      {selectedAccountForBalanceEdit && (
        <AccountBalanceModal
          account={selectedAccountForBalanceEdit}
          onClose={() => setSelectedAccountForBalanceEdit(null)}
        />
      )}
    </div>
  );
};
