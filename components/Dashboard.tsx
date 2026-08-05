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
  Plus, Flame, PiggyBank, FolderTree, ArrowUpRight, 
  ArrowDownRight, Layers, Building2, User, Activity,
  Sliders, Calendar, Filter, Sparkle, ArrowRight,
  ChevronDown
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TransactionForm } from './TransactionForm';
import { TransactionType } from '../types';
import { CalendarModal } from './CalendarModal';
import { DashboardSkeleton } from './Skeleton';
import { GoalDetail } from './GoalDetail';
import { AccountBalanceModal } from './AccountBalanceModal';

export const Dashboard = () => {
  const { 
    getBalanceSummary, transactions, categories, getSystemAlerts, 
    accounts, settings, getAccountBalance, isBlurred, toggleBlur,
    goals, debts, getDebtProgress, shows
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

  // Custom Shortcuts Customization State
  const [showShortcutConfig, setShowShortcutConfig] = useState(false);
  const [enabledShortcuts, setEnabledShortcuts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fintech_shortcuts_v1');
      return saved ? JSON.parse(saved) : ['expense', 'income', 'show', 'transfer', 'goal', 'debt'];
    } catch {
      return ['expense', 'income', 'show', 'transfer', 'goal', 'debt'];
    }
  });

  const toggleShortcut = (id: string) => {
    const updated = enabledShortcuts.includes(id)
      ? enabledShortcuts.filter(s => s !== id)
      : [...enabledShortcuts, id];
    setEnabledShortcuts(updated);
    localStorage.setItem('fintech_shortcuts_v1', JSON.stringify(updated));
  };

  const [projectionDate, setProjectionDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  });

  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const alerts = useMemo(() => getSystemAlerts(), [transactions]);
  const summary = useMemo(() => getBalanceSummary(currentMonth, projectionDate), [transactions, currentMonth, projectionDate, accounts]);

  const freeToSpend = summary.freeToSpend;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // 1. INTELLIGENT ATTENTION PANEL DATA
  const attentionCards = useMemo(() => {
    const cards: Array<{
      id: string;
      title: string;
      subtitle: string;
      amount?: number;
      type: 'warning' | 'income' | 'show' | 'goal';
      badge: string;
      actionText: string;
      actionUrl?: string;
      onAction?: () => void;
    }> = [];

    // Check shows today
    const showsToday = (shows || []).filter(s => s.date === todayStr && s.status !== 'Cancelado');
    showsToday.forEach(s => {
      cards.push({
        id: `show_${s.id}`,
        title: `Show Confirmado Hoje! 🎸`,
        subtitle: `${s.contractorName} • ${s.time || 'Horário a definir'} em ${s.location || 'Local do evento'}`,
        amount: s.totalCache,
        type: 'show',
        badge: 'Hoje',
        actionText: 'Ver Show',
        actionUrl: '/shows'
      });
    });

    // Check pending incomes today
    const incomeToday = transactions.filter(t => t.type === 'income' && t.status === 'pending' && t.date === todayStr);
    incomeToday.forEach(t => {
      cards.push({
        id: `inc_${t.id}`,
        title: `Recebimento Previsto para Hoje 💰`,
        subtitle: t.description || 'Entrada programada',
        amount: t.amount,
        type: 'income',
        badge: 'Entrada Hoje',
        actionText: 'Ver Detalhes',
        actionUrl: '/transactions'
      });
    });

    // Check overdue or due today expenses
    const expensesDueTodayOrOverdue = transactions.filter(
      t => t.type === 'expense' && t.status === 'pending' && t.date <= todayStr
    );
    if (expensesDueTodayOrOverdue.length > 0) {
      const totalOverdue = expensesDueTodayOrOverdue.reduce((s, t) => s + t.amount, 0);
      const isOverdueStrict = expensesDueTodayOrOverdue.some(t => t.date < todayStr);
      cards.push({
        id: 'expenses_alert',
        title: isOverdueStrict ? 'Contas Vencidas ou Vencendo Hoje ⚠️' : 'Contas Vencendo Hoje 🔔',
        subtitle: `${expensesDueTodayOrOverdue.length} compromisso(s) pendente(s) necessitam da sua atenção`,
        amount: totalOverdue,
        type: 'warning',
        badge: isOverdueStrict ? 'Atenção Crítica' : 'Vence Hoje',
        actionText: 'Quitar / Pagar',
        actionUrl: '/transactions'
      });
    }

    // Check goals close to completion (>= 80%)
    (goals || []).forEach(g => {
      const prog = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
      if (prog >= 80 && prog < 100) {
        cards.push({
          id: `goal_${g.id}`,
          title: `Meta Quase Atingida! 🎯`,
          subtitle: `A meta "${g.name}" atingiu ${Math.round(prog)}% do objetivo!`,
          amount: g.targetAmount - g.currentAmount,
          type: 'goal',
          badge: `${Math.round(prog)}% Concluído`,
          actionText: 'Finalizar Meta',
          onAction: () => setSelectedGoalDetailId(g.id)
        });
      }
    });

    return cards;
  }, [shows, transactions, goals, todayStr]);

  // 2. INDICADORES INTELIGENTES (SMART METRICS)
  const smartMetrics = useMemo(() => {
    // Total Patrimony (Accounts + Goals)
    const accountsTotal = accounts.reduce((s, a) => s + getAccountBalance(a.id), 0);
    const goalsTotal = (goals || []).reduce((s, g) => s + (g.currentAmount || 0), 0);
    const totalPatrimony = accountsTotal + goalsTotal;

    // Monthly Flow
    const monthTx = transactions.filter(t => t.date.startsWith(currentMonth));
    const incomeTotal = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenseTotal = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Days of Financial Reserve Covered
    const dayOfMonth = Math.max(1, new Date().getDate());
    const dailyAvgExpense = expenseTotal > 0 ? (expenseTotal / dayOfMonth) : 50; // Fallback default
    const reserveDays = Math.round(totalPatrimony / Math.max(1, dailyAvgExpense));

    // Income Commitment Rate (%)
    const incomeCommitment = incomeTotal > 0 ? Math.min(100, Math.round((expenseTotal / incomeTotal) * 100)) : 0;

    // Health Score (0 - 100)
    let score = 70;
    if (incomeTotal > expenseTotal) score += 15;
    else score -= 15;

    if (freeToSpend > 0) score += 10;
    else score -= 20;

    if (reserveDays >= 90) score += 10;
    else if (reserveDays < 30) score -= 10;

    const overdueCount = transactions.filter(t => t.type === 'expense' && t.status === 'pending' && t.date < todayStr).length;
    if (overdueCount > 0) score -= 15;

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      totalPatrimony,
      incomeTotal,
      expenseTotal,
      dailyAvgExpense,
      reserveDays,
      incomeCommitment,
      healthScore: finalScore,
      healthLabel: finalScore >= 80 ? 'Excelente' : finalScore >= 60 ? 'Saudável' : 'Atenção'
    };
  }, [accounts, goals, transactions, currentMonth, freeToSpend, todayStr]);

  // 3. SHOWS DO MÊS (MODULO TRABALHO)
  const showsModuleData = useMemo(() => {
    const monthShows = (shows || []).filter(s => s.date && s.date.startsWith(currentMonth) && s.status !== 'Cancelado');
    const showsCount = monthShows.length;
    const totalCache = monthShows.reduce((s, show) => s + (show.totalCache || 0), 0);
    
    let cacheReceived = 0;
    monthShows.forEach(s => {
      if (s.receipts && s.receipts.length > 0) {
        cacheReceived += s.receipts
          .filter(r => r.status === 'Recebido')
          .reduce((sum, r) => sum + r.amount, 0);
      } else {
        cacheReceived += (s.cacheReceived || 0);
      }
    });

    const cachePending = Math.max(0, totalCache - cacheReceived);
    
    // Expenses
    let totalExpenses = 0;
    monthShows.forEach(s => {
      if (s.expenses) {
        totalExpenses += (s.expenses.fuel || 0) + (s.expenses.food || 0) + (s.expenses.toll || 0) + (s.expenses.commission || 0) + (s.expenses.others || 0);
      }
    });

    const netProfit = totalCache - totalExpenses;
    const profitMargin = totalCache > 0 ? Math.round((netProfit / totalCache) * 100) : 0;
    const receivedPercent = totalCache > 0 ? Math.round((cacheReceived / totalCache) * 100) : 0;

    return {
      showsCount,
      totalCache,
      cacheReceived,
      cachePending,
      totalExpenses,
      netProfit,
      profitMargin,
      receivedPercent
    };
  }, [shows, currentMonth]);

  // 4. RECENT TRANSACTIONS (MAX 4)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .slice(0, 4);
  }, [transactions]);

  // 5. GOALS DATA
  const goalsData = useMemo(() => {
    const list = goals || [];
    const totalTarget = list.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const totalSaved = list.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
    return { list, totalTarget, totalSaved, overallProgress };
  }, [goals]);

  // Shortcut Definitions
  const allShortcuts = [
    { id: 'expense', label: 'Nova Despesa', icon: ArrowDownRight, color: 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20', action: () => openTransactionModal('expense') },
    { id: 'income', label: 'Nova Receita', icon: ArrowUpRight, color: 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20', action: () => openTransactionModal('income') },
    { id: 'show', label: 'Novo Show', icon: Music, color: 'text-purple-500 bg-purple-500/10 hover:bg-purple-500/20', action: () => navigate('/shows') },
    { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft, color: 'text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20', action: () => openTransactionModal('transfer') },
    { id: 'goal', label: 'Minhas Metas', icon: Target, color: 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20', action: () => navigate('/metas') },
    { id: 'debt', label: 'Compromissos', icon: CreditCard, color: 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20', action: () => navigate('/debts') },
    { id: 'extrato', label: 'Ver Extrato', icon: Receipt, color: 'text-slate-500 bg-slate-500/10 hover:bg-slate-500/20', action: () => navigate('/transactions') },
    { id: 'flow', label: 'Fluxo DRE', icon: BarChart3, color: 'text-teal-500 bg-teal-500/10 hover:bg-teal-500/20', action: () => navigate('/flow') },
  ];

  const activeShortcutsList = allShortcuts.filter(s => enabledShortcuts.includes(s.id));

  const openTransactionModal = (type: TransactionType, catId?: string) => {
    setTransactionType(type);
    setTransactionCategoryId(catId);
    setIsTransactionModalOpen(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  if (!isLoaded) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 pb-28 text-slate-900 dark:text-slate-100 animate-fade-in max-w-7xl mx-auto">
      
      {/* HEADER EXECUTIVO LIMPO (ESTILO NOTION / NUBANK) */}
      <div className="flex justify-between items-center px-1 pt-2">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => navigate('/settings')}>
           <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 dark:from-indigo-600 dark:to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-900/10 dark:shadow-indigo-500/20 active:scale-95 transition-transform">
             {settings.userName?.charAt(0).toUpperCase() || 'F'}
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">{getGreeting()},</span>
             <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tight flex items-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
               <span>{settings.userName || 'Investidor'}</span>
               <ChevronRight size={14} className="ml-1 text-slate-400" />
             </h1>
           </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Date Modal Trigger */}
          <button
            onClick={() => setIsDateModalOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-2xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 transition-all active:scale-95 border border-slate-200/60 dark:border-slate-800"
          >
            <CalendarDays size={14} className="text-indigo-500" />
            <span>Projeção: {new Date(projectionDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', day: '2-digit' })}</span>
          </button>

          <Link 
            to="/alerts" 
            className="relative p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 transition-all active:scale-95 shadow-sm hover:border-indigo-300"
            title="Alertas do Sistema"
          >
             <Bell size={20} />
             {alerts.length > 0 && (
               <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse"></span>
             )}
          </Link>

          <Link 
            to="/settings" 
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 transition-all active:scale-95 shadow-sm hover:border-indigo-300"
            title="Configurações e Perfil"
          >
             <SettingsIcon size={20} />
          </Link>
        </div>
      </div>

      {/* 1. SEÇÃO PRINCIPAL: RESUMO FINANCEIRO (MAIOR DESTAQUE VISUAL) */}
      <div className="relative bg-slate-900 dark:bg-black rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl overflow-hidden border border-slate-800/80">
        {/* Glow de Fundo Elegante */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-purple-600/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          {/* Header Superior do Card Hero */}
          <div className="flex justify-between items-center">
            <div className="flex bg-white/10 backdrop-blur-xl rounded-2xl p-1 border border-white/10 shadow-inner">
               <button 
                onClick={() => setBalanceMode('real')} 
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${balanceMode === 'real' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 Saldo Disponível
               </button>
               <button 
                onClick={() => setBalanceMode('projected')} 
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${balanceMode === 'projected' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 Saldo Previsto
               </button>
            </div>

            <button 
              onClick={toggleBlur} 
              className="text-slate-400 hover:text-white transition-all p-2.5 bg-white/10 rounded-2xl border border-white/10 active:scale-95"
              title={isBlurred ? "Exibir valores" : "Ocultar valores"}
            >
              {!isBlurred ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {/* Valor Principal em Destaque Absoluto */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-90">
                {balanceMode === 'real' ? 'Quanto tenho hoje (Saldo Líquido)' : `Saldo Previsto até ${new Date(projectionDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              </p>
              {balanceMode === 'projected' && (
                <button 
                  onClick={() => setIsDateModalOpen(true)}
                  className="flex items-center space-x-1.5 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-xl text-[9px] font-black uppercase text-indigo-200 hover:bg-indigo-500/30 transition-all active:scale-95"
                >
                  <CalendarRange size={12} className="text-indigo-400" />
                  <span>Mudar Data</span>
                </button>
              )}
            </div>

            <div className="flex items-baseline">
              {!isBlurred ? (
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter tabular-nums leading-none">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-400 mr-2">R$</span>
                  <span>
                    {(balanceMode === 'real' ? summary.realBalance : summary.projectedBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </h2>
              ) : (
                <span className="text-4xl sm:text-5xl tracking-widest font-black text-slate-300">••••••••</span>
              )}
            </div>

            {/* Sub-Métricas: Dinheiro Livre para Gastar & Patrimônio */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-5 border-t border-white/10 mt-5">
              <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                <span className="text-[9px] font-black uppercase text-indigo-300 tracking-wider flex items-center">
                  <Zap size={11} className="mr-1 text-indigo-400" /> Posso Gastar (Livre)
                </span>
                <p className="text-base sm:text-lg font-black text-white mt-0.5 tabular-nums">
                  {!isBlurred ? formatCurrency(freeToSpend) : '••••'}
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center">
                  <PieChart size={11} className="mr-1 text-purple-400" /> Patrimônio Total
                </span>
                <p className="text-base sm:text-lg font-black text-white mt-0.5 tabular-nums">
                  {!isBlurred ? formatCurrency(smartMetrics.totalPatrimony) : '••••'}
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 col-span-2 sm:col-span-1">
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider flex items-center">
                  <TrendingUp size={11} className="mr-1 text-emerald-400" /> Receitas a Entrar
                </span>
                <p className="text-base sm:text-lg font-black text-emerald-300 mt-0.5 tabular-nums">
                  {!isBlurred ? formatCurrency(summary.pendingIncome) : '••••'}
                </p>
              </div>
            </div>
          </div>

          {/* Carrossel Integrado de Contas Vinculadas */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
              <span>Contas Bancárias ({accounts.length})</span>
              <span className="text-indigo-400 hover:underline cursor-pointer" onClick={() => navigate('/settings')}>
                Gerenciar Contas
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar flex items-center space-x-2.5 pb-1">
              {accounts.length === 0 ? (
                <button 
                  onClick={() => navigate('/settings')}
                  className="py-2.5 px-4 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-black uppercase text-indigo-300 hover:bg-white/10 transition flex items-center space-x-1.5"
                >
                  <Plus size={14} />
                  <span>Cadastrar Conta Bancária</span>
                </button>
              ) : (
                <>
                  {accounts.map(acc => (
                    <div 
                      key={acc.id} 
                      onClick={() => setSelectedAccountForBalanceEdit(acc)}
                      className="flex flex-col shrink-0 bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/30 hover:bg-white/15 rounded-2xl px-4 py-3 min-w-[140px] transition-all active:scale-95 cursor-pointer shadow-sm group/acc"
                      title="Clique para ajustar o saldo desta conta"
                    >
                      <div className="flex items-center justify-between mb-1">
                         <div className="flex items-center space-x-1.5">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }}></div>
                            <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest truncate max-w-[90px]">{acc.name}</span>
                         </div>
                         <ChevronRight size={12} className="text-slate-400 opacity-0 group-hover/acc:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-xs font-black tabular-nums text-white">
                        {!isBlurred ? formatCurrency(getAccountBalance(acc.id)) : '••••'}
                      </span>
                    </div>
                  ))}
                  <button 
                    onClick={() => navigate('/settings')}
                    className="flex items-center justify-center shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-3.5 py-3 text-[10px] font-black text-slate-300 transition active:scale-95"
                    title="Adicionar nova conta"
                  >
                    <Plus size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. PAINEL DE ATENÇÃO INTELIGENTE (APARECE APENAS QUANDO HOUVER NECESSIDADE) */}
      {attentionCards.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
              <AlertCircle size={14} className="mr-1.5 text-amber-500 animate-pulse" /> Painel de Atenção e Avisos ({attentionCards.length})
            </h3>
            <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
              Ação Necessária
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionCards.map(card => (
              <div 
                key={card.id}
                className={`p-4 rounded-3xl border shadow-sm flex items-center justify-between transition-all ${
                  card.type === 'warning' 
                    ? 'bg-rose-500/5 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-100'
                    : card.type === 'show'
                    ? 'bg-purple-500/5 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 text-purple-950 dark:text-purple-100'
                    : card.type === 'income'
                    ? 'bg-emerald-500/5 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-100'
                    : 'bg-indigo-500/5 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-100'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      card.type === 'warning' ? 'bg-rose-500 text-white' : 'bg-purple-600 text-white'
                    }`}>
                      {card.badge}
                    </span>
                    <h4 className="text-xs font-black truncate">{card.title}</h4>
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{card.subtitle}</p>
                  {card.amount !== undefined && (
                    <p className="text-xs font-black tabular-nums">
                      Valor: {!isBlurred ? formatCurrency(card.amount) : '••••'}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (card.onAction) card.onAction();
                    else if (card.actionUrl) navigate(card.actionUrl);
                  }}
                  className="shrink-0 px-3.5 py-2 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition active:scale-95 shadow-md"
                >
                  {card.actionText}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. INDICADORES INTELIGENTES EXECUTIVOS (SMART DECISION CENTER) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Saúde Financeira */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Saúde Financeira</span>
            <Activity size={16} className="text-indigo-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{smartMetrics.healthScore}</span>
            <span className="text-[10px] font-bold text-slate-400">/100</span>
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
            smartMetrics.healthScore >= 80 ? 'text-emerald-600' : smartMetrics.healthScore >= 60 ? 'text-indigo-600' : 'text-rose-600'
          }`}>
            Status: {smartMetrics.healthLabel}
          </span>
        </div>

        {/* Reserva Financeira em Dias */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Reserva de Emergência</span>
            <ShieldAlert size={16} className="text-purple-500" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{smartMetrics.reserveDays}</span>
            <span className="text-[10px] font-bold text-slate-400">dias</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            Custo Diário ~{formatCurrency(smartMetrics.dailyAvgExpense)}
          </span>
        </div>

        {/* Comprometimento da Renda */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Comprometimento</span>
            <BarChart3 size={16} className="text-amber-500" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{smartMetrics.incomeCommitment}%</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            das receitas em saídas
          </span>
        </div>

        {/* Progresso de Metas */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Progresso de Metas</span>
            <Target size={16} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">{goalsData.overallProgress}%</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            {!isBlurred ? formatCurrency(goalsData.totalSaved) : '••••'} guardados
          </span>
        </div>
      </div>

      {/* 4. SEÇÃO METAS FINANCEIRAS (FOCO EM PROGRESSO VISUAL) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PiggyBank size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Progresso de Metas</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Minhas Conquistas & Reservas</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/metas')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition active:scale-95 border border-indigo-100 dark:border-indigo-900/40"
          >
            <Plus size={13} />
            <span>Gerenciar</span>
          </button>
        </div>

        {goalsData.list.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400 border border-slate-100 dark:border-slate-800">
            <Target size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Nenhuma meta criada ainda</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Defina objetivos financeiros para guardar dinheiro com disciplina.</p>
            <button
              onClick={() => navigate('/metas')}
              className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition"
            >
              Criar Primeira Meta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {goalsData.list.map(goal => {
              const IconComp = getIcon(goal.icon);
              const prog = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
              
              return (
                <div 
                  key={goal.id}
                  onClick={() => setSelectedGoalDetailId(goal.id)}
                  className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm"
                        style={{ backgroundColor: goal.color }}
                      >
                        <IconComp size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {goal.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {!isBlurred ? formatCurrency(goal.currentAmount) : '••••'} de {!isBlurred ? formatCurrency(goal.targetAmount) : '••••'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      {prog}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${prog}%`, backgroundColor: goal.color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. SEÇÃO TRABALHO & EVENTOS (SHOWS DO MÊS) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Music size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trabalho & Eventos</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Shows do Mês ({showsModuleData.showsCount})</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/shows')}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-purple-700 transition active:scale-95 shadow-sm"
          >
            <Plus size={13} />
            <span>Gerenciar Shows</span>
          </button>
        </div>

        {/* Métricas Principais de Cachê do Mês */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20">
            <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider">Receita Prevista</span>
            <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white mt-0.5 tabular-nums">
              {!isBlurred ? formatCurrency(showsModuleData.totalCache) : '••••'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
            <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Valor Recebido</span>
            <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
              {!isBlurred ? formatCurrency(showsModuleData.cacheReceived) : '••••'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20">
            <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">A Receber</span>
            <p className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
              {!isBlurred ? formatCurrency(showsModuleData.cachePending) : '••••'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20">
            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Lucro Líquido</span>
            <p className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
              {!isBlurred ? formatCurrency(showsModuleData.netProfit) : '••••'}
            </p>
          </div>
        </div>

        {/* Barra de Progresso de Cachês Recebidos */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500">
            <span>Status dos Cachês ({showsModuleData.receivedPercent}% Pago)</span>
            <span>{!isBlurred ? formatCurrency(showsModuleData.cacheReceived) : '•••'} de {!isBlurred ? formatCurrency(showsModuleData.totalCache) : '•••'}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full transition-all duration-700" 
              style={{ width: `${showsModuleData.receivedPercent}%` }}
            ></div>
            <div 
              className="bg-amber-400 h-full transition-all duration-700" 
              style={{ width: `${100 - showsModuleData.receivedPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 6. FLUXO FINANCEIRO (DRE RESUMIDO) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fluxo Financeiro</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Balanço do Mês Atual</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/flow')}
            className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            Ver DRE Completo <ChevronRight size={12} className="ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
            <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Entradas</span>
            <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {!isBlurred ? formatCurrency(summary.monthlyIncome) : '••••'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20">
            <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">Saídas</span>
            <p className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
              {!isBlurred ? formatCurrency(summary.monthlyExpense) : '••••'}
            </p>
          </div>

          <div className={`p-3.5 rounded-2xl border ${summary.monthlyIncome >= summary.monthlyExpense ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Resultado</span>
            <p className={`text-sm sm:text-base font-black mt-1 tabular-nums ${summary.monthlyIncome >= summary.monthlyExpense ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {!isBlurred ? formatCurrency(summary.monthlyIncome - summary.monthlyExpense) : '••••'}
            </p>
          </div>
        </div>
      </div>

      {/* 7. ÚLTIMAS MOVIMENTAÇÕES RELEVANTES */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Clock size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Extrato Recente</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Últimas Movimentações</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/transactions')}
            className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            Ver Extrato <ChevronRight size={12} className="ml-0.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-center text-xs font-bold text-slate-400 py-6">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              const IconComp = cat ? getIcon(cat.icon) : Receipt;
              const isIncome = t.type === 'income';

              return (
                <div 
                  key={t.id}
                  onClick={() => navigate('/transactions')}
                  className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      <IconComp size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[180px] sm:max-w-[300px]">
                        {t.description || (cat ? cat.name : 'Transação')}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-black tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                      {isIncome ? '+' : '-'}{!isBlurred ? formatCurrency(t.amount) : '••••'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. ATALHOS PERSONALIZÁVEIS / CONFIGURÁVEIS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Sliders size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Acesso Rápido</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Atalhos Configuráveis</p>
            </div>
          </div>

          <button
            onClick={() => setShowShortcutConfig(!showShortcutConfig)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition active:scale-95 border border-slate-200 dark:border-slate-700"
          >
            {showShortcutConfig ? 'Concluir' : 'Personalizar'}
          </button>
        </div>

        {/* Modal/Toggle Configurator inside section */}
        {showShortcutConfig && (
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-2">
              Selecione os atalhos que deseja manter no seu painel:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allShortcuts.map(s => {
                const isChecked = enabledShortcuts.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleShortcut(s.id)}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl border text-[11px] font-bold transition active:scale-95 ${
                      isChecked
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <s.icon size={14} />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Render Active Shortcuts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {activeShortcutsList.map(item => (
            <button
              key={item.id}
              onClick={item.action}
              className="flex items-center space-x-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition-all active:scale-95 group text-left"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${item.color}`}>
                <item.icon size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* MODAIS AUXILIARES */}
      {isTransactionModalOpen && (
        <TransactionForm
          onClose={() => setIsTransactionModalOpen(false)}
          initialType={transactionType}
          initialCategoryId={transactionCategoryId}
        />
      )}

      {isCalendarOpen && (
        <CalendarModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          selectedDate={projectionDate}
          onSelect={(d) => {
            setProjectionDate(d);
            setIsCalendarOpen(false);
          }}
          title="Selecione a Data de Projeção"
        />
      )}

      {selectedGoalDetailId && (
        <GoalDetail
          goalId={selectedGoalDetailId}
          onClose={() => setSelectedGoalDetailId(null)}
        />
      )}

      {selectedAccountForBalanceEdit && (
        <AccountBalanceModal
          account={selectedAccountForBalanceEdit}
          onClose={() => setSelectedAccountForBalanceEdit(null)}
        />
      )}

      {/* Date Projection Modal */}
      {isDateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center">
                <CalendarDays size={16} className="mr-2 text-indigo-500" />
                Data de Projeção de Caixa
              </h3>
              <button onClick={() => setIsDateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Escolha até qual data deseja calcular todas as receitas e despesas previstas.
            </p>

            <input 
              type="date"
              value={projectionDate}
              onChange={e => setProjectionDate(e.target.value)}
              className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
            />

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  const now = new Date();
                  setProjectionDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
                  setIsDateModalOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider hover:bg-slate-200"
              >
                Fim do Mês
              </button>
              <button
                onClick={() => {
                  const future = new Date();
                  future.setDate(future.getDate() + 30);
                  setProjectionDate(future.toISOString().slice(0, 10));
                  setIsDateModalOpen(false);
                }}
                className="p-2.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700"
              >
                +30 Dias
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
