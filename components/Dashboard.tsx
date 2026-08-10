import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { TransactionForm } from './TransactionForm';
import { CalendarModal } from './CalendarModal';
import { GoalDetail } from './GoalDetail';
import { AccountBalanceModal } from './AccountBalanceModal';
import { 
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, 
  ChevronRight, Eye, EyeOff, ShieldCheck, AlertTriangle, ShieldAlert, 
  Info, Plus, Music, PiggyBank, Receipt, Sliders, X, 
  CheckCircle2, Clock, ArrowRightLeft, Target, PieChart, Bell, 
  Sparkles, CalendarDays, Check
} from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../constants';
import * as Icons from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    transactions, 
    categories, 
    accounts, 
    goals, 
    shows, 
    isBlurred, 
    toggleBlur,
    getBalanceSummary,
    updateTransaction,
    getSystemAlerts
  } = useFinance();

  // Local state for month selection & projection
  const [currentMonth, setCurrentMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [projectionDate, setProjectionDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });

  // Modals state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw'>('expense');
  const [transactionCategoryId, setTransactionCategoryId] = useState<string | undefined>();
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedGoalDetailId, setSelectedGoalDetailId] = useState<string | null>(null);
  const [selectedAccountForBalanceEdit, setSelectedAccountForBalanceEdit] = useState<any>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [showShortcutConfig, setShowShortcutConfig] = useState(false);

  // Explanatory Modals
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isFreeSpendModalOpen, setIsFreeSpendModalOpen] = useState(false);

  // Shortcuts config state
  const [enabledShortcuts, setEnabledShortcuts] = useState<string[]>(() => {
    const saved = localStorage.getItem('fin_home_shortcuts');
    return saved ? JSON.parse(saved) : ['expense', 'income', 'show', 'transfer', 'goal_deposit', 'extrato', 'planning'];
  });

  const toggleShortcut = (id: string) => {
    const updated = enabledShortcuts.includes(id) 
      ? enabledShortcuts.filter(s => s !== id) 
      : [...enabledShortcuts, id];
    setEnabledShortcuts(updated);
    localStorage.setItem('fin_home_shortcuts', JSON.stringify(updated));
  };

  // Metric summaries from FinanceContext
  const summary = useMemo(() => {
    return getBalanceSummary(currentMonth, projectionDate);
  }, [getBalanceSummary, currentMonth, projectionDate, transactions, accounts, goals]);

  // System alerts count
  const alerts = useMemo(() => getSystemAlerts(), [getSystemAlerts]);

  // Derived financial health status
  const financialHealth = useMemo(() => {
    const avail = summary.realBalance;
    const pendingExp = summary.pendingExpense;
    const pendingInc = summary.pendingIncome;
    const projectedResult = summary.projectedBalance;

    if (projectedResult < 0 || (avail < pendingExp && avail + pendingInc < pendingExp)) {
      return {
        status: 'RISCO' as const,
        color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50',
        badgeColor: 'bg-rose-500 text-white',
        icon: ShieldAlert,
        label: 'Situação de Risco',
        desc: 'Atenção: Suas obrigações pendentes superam os recursos disponíveis e previstos.'
      };
    } else if (avail < pendingExp) {
      return {
        status: 'ATENÇÃO' as const,
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
        badgeColor: 'bg-amber-500 text-white',
        icon: AlertTriangle,
        label: 'Requer Atenção',
        desc: 'Necessário receber entradas previstas no mês para cobrir todos os compromissos.'
      };
    } else {
      return {
        status: 'CONTROLADO' as const,
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
        badgeColor: 'bg-emerald-500 text-white',
        icon: ShieldCheck,
        label: 'Situação Controlada',
        desc: 'Seus recursos atuais e receitas cobrem com folga suas despesas registradas.'
      };
    }
  }, [summary]);

  // Upcoming Pending Expenses (Próximos Compromissos)
  const upcomingCommitments = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && t.status === 'pending')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [transactions]);

  // Shows breakdown for variable income
  const monthlyShowsSummary = useMemo(() => {
    const monthShows = shows.filter(s => s.date.startsWith(currentMonth));
    const count = monthShows.length;
    let totalContracted = 0;
    let totalReceived = 0;
    let totalPending = 0;

    monthShows.forEach(show => {
      totalContracted += (Number(show.totalCache) || 0);
      if (show.receipts && show.receipts.length > 0) {
        show.receipts.forEach(r => {
          if (r.status === 'Recebido') totalReceived += (Number(r.amount) || 0);
          else totalPending += (Number(r.amount) || 0);
        });
      } else {
        if (show.status === 'Realizado') totalReceived += (Number(show.totalCache) || 0);
        else totalPending += (Number(show.totalCache) || 0);
      }
    });

    const pctReceived = totalContracted > 0 ? Math.min(100, Math.round((totalReceived / totalContracted) * 100)) : 0;

    return {
      count,
      totalContracted: Number(totalContracted.toFixed(2)),
      totalReceived: Number(totalReceived.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
      pctReceived
    };
  }, [shows, currentMonth]);

  // Recent transactions (Últimas Movimentações)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [transactions]);

  // Helper for dynamic category icons
  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Receipt;
  };

  // Helper for formatting currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Mark pending expense as paid directly
  const handleMarkAsPaid = (t: any) => {
    updateTransaction({
      ...t,
      status: 'paid'
    });
  };

  // Open modal helper for shortcut buttons
  const handleOpenModal = (type: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw') => {
    setTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  // Master list of available shortcuts
  const allShortcuts = [
    { id: 'expense', label: 'Nova Despesa', icon: ArrowDownRight, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', action: () => handleOpenModal('expense') },
    { id: 'income', label: 'Nova Receita', icon: ArrowUpRight, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', action: () => handleOpenModal('income') },
    { id: 'show', label: 'Novo Show', icon: Music, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', action: () => navigate('/shows') },
    { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft, color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', action: () => handleOpenModal('transfer') },
    { id: 'goal_deposit', label: 'Aporte Cofrinho', icon: PiggyBank, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', action: () => handleOpenModal('goal_deposit') },
    { id: 'extrato', label: 'Ver Extrato', icon: Receipt, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', action: () => navigate('/transactions') },
    { id: 'planning', label: 'Planejamento', icon: Target, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', action: () => navigate('/planning') },
    { id: 'alerts', label: 'Central Alertas', icon: Bell, color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', action: () => navigate('/alerts') }
  ];

  const activeShortcutsList = allShortcuts.filter(s => enabledShortcuts.includes(s.id));

  // Calculate day tags for upcoming commitments
  const getDaysTag = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const itemDate = new Date(dateStr + 'T12:00:00');
    itemDate.setHours(0,0,0,0);

    const diffDays = Math.round((itemDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Vencido', color: 'bg-rose-500/10 text-rose-600 border-rose-200' };
    if (diffDays === 0) return { label: 'Hoje', color: 'bg-amber-500/10 text-amber-600 border-amber-200' };
    if (diffDays === 1) return { label: 'Amanhã', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' };
    return { label: `Em ${diffDays} dias`, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* HEADER SUPERIOR: PERFIL & AÇÕES DE PAINEL */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">
              Cockpit Financeiro 2.0
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight flex items-center">
            Visão Geral
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Calendar projection date button */}
          <button
            onClick={() => setIsDateModalOpen(true)}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 shadow-sm flex items-center space-x-1"
            title="Alterar Data de Projeção"
          >
            <CalendarDays size={18} className="text-indigo-600 dark:text-indigo-400" />
          </button>

          {/* Alerts Counter */}
          <button
            onClick={() => navigate('/alerts')}
            className="relative p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 shadow-sm"
            title="Alertas do Sistema"
          >
            <Bell size={18} />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {alerts.length}
              </span>
            )}
          </button>

          {/* Blur Toggle */}
          <button
            onClick={toggleBlur}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 shadow-sm"
            title={isBlurred ? "Exibir Valores" : "Ocultar Valores"}
          >
            {isBlurred ? <EyeOff size={18} className="text-indigo-500" /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* SEÇÃO 1: PAINEL PRINCIPAL DE SITUAÇÃO FINANCEIRA (CARD FINTECH) */}
      <div className="relative overflow-hidden bg-slate-900 dark:bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-2xl border border-slate-800/80 space-y-6">
        
        {/* Glow ambient background accents */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar of Situation Card: Label + Health Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300">
              <Wallet size={18} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              Disponível Agora
            </span>
          </div>

          {/* Health Status Badge */}
          <button
            onClick={() => setIsHealthModalOpen(true)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition active:scale-95 backdrop-blur-md ${financialHealth.color}`}
          >
            <financialHealth.icon size={13} />
            <span>{financialHealth.status}</span>
            <Info size={12} className="ml-0.5 opacity-80" />
          </button>
        </div>

        {/* Big Highlight Number: Disponível Agora (Saldo Real em Contas Operacionais) */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-white">
              {!isBlurred ? formatCurrency(summary.realBalance) : 'R$ •••••••'}
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-400">
            Total efetivo em contas bancárias e carteiras operacionais
          </p>
        </div>

        {/* Sub-grid of derived core metrics (3 columns) */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
          
          {/* LIVRE PARA GASTAR */}
          <div 
            onClick={() => setIsFreeSpendModalOpen(true)}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Livre p/ Gastar</span>
              <Info size={12} className="group-hover:text-indigo-400 transition-colors" />
            </div>
            <span className={`text-sm font-black tabular-nums block ${summary.freeToSpend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {!isBlurred ? formatCurrency(summary.freeToSpend) : '••••'}
            </span>
            <span className="text-[9px] text-slate-400 font-medium block mt-0.5 truncate">
              Após contas do mês
            </span>
          </div>

          {/* COMPROMETIDO / A PAGAR */}
          <div 
            onClick={() => navigate('/transactions?type=expense&status=pending')}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">A Pagar (Mês)</span>
              <ArrowDownRight size={12} className="text-rose-400" />
            </div>
            <span className="text-sm font-black tabular-nums text-rose-400 block">
              {!isBlurred ? formatCurrency(summary.pendingExpense) : '••••'}
            </span>
            <span className="text-[9px] text-slate-400 font-medium block mt-0.5 truncate">
              Obrigações pendentes
            </span>
          </div>

          {/* A RECEBER */}
          <div 
            onClick={() => navigate('/transactions?type=income&status=pending')}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer group col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">A Receber (Mês)</span>
              <ArrowUpRight size={12} className="text-emerald-400" />
            </div>
            <span className="text-sm font-black tabular-nums text-emerald-400 block">
              {!isBlurred ? formatCurrency(summary.pendingIncome) : '••••'}
            </span>
            <span className="text-[9px] text-slate-400 font-medium block mt-0.5 truncate">
              Receitas previstas
            </span>
          </div>

        </div>

        {/* Footer info: Saldo Projetado ao final do mês */}
        <div className="relative z-10 p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
              Saldo Projetado (até {new Date(projectionDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })})
            </span>
            <p className="text-[10px] text-slate-400 font-medium">
              Calculado: Saldo Atual + A Receber - A Pagar
            </p>
          </div>
          <span className={`text-base font-black tabular-nums ${summary.projectedBalance >= 0 ? 'text-indigo-200' : 'text-rose-400'}`}>
            {!isBlurred ? formatCurrency(summary.projectedBalance) : '••••'}
          </span>
        </div>

      </div>

      {/* SEÇÃO 2: PRÓXIMOS COMPROMISSOS (FLUXO FUTURO) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Clock size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fluxo Futuro</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Próximos Vencimentos</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/transactions')}
            className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            Ver Extrato <ChevronRight size={12} className="ml-0.5" />
          </button>
        </div>

        {upcomingCommitments.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-1 border border-dashed border-slate-200 dark:border-slate-800">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tudo em dia!</p>
            <p className="text-[11px] text-slate-400 font-medium">Nenhuma despesa pendente agendada para os próximos dias.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingCommitments.map(item => {
              const daysTag = getDaysTag(item.date);
              const cat = categories.find(c => c.id === item.categoryId);
              const IconComp = cat ? getIcon(cat.icon) : Receipt;

              return (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 transition flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                      <IconComp size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                          {item.description}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider shrink-0 ${daysTag.color}`}>
                          {daysTag.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Vencimento: {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 ml-2">
                    <span className="text-xs font-black tabular-nums text-slate-900 dark:text-white">
                      {!isBlurred ? formatCurrency(item.amount) : '••••'}
                    </span>
                    
                    <button
                      onClick={() => handleMarkAsPaid(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm flex items-center space-x-1"
                      title="Marcar como Pago"
                    >
                      <Check size={12} strokeWidth={3} />
                      <span className="hidden sm:inline">Pagar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO 3: METAS E RESERVAS (COFRINHOS) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <PiggyBank size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Poupança e Objetivos</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Metas & Cofrinhos</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/metas')}
            className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            Gerenciar <ChevronRight size={12} className="ml-0.5" />
          </button>
        </div>

        {/* Card Resumo do Total em Reservas */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
              Total Guardado em Reservas
            </span>
            <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white mt-0.5 block">
              {!isBlurred ? formatCurrency(summary.goalsTotal || 0) : 'R$ •••••••'}
            </span>
          </div>

          <button
            onClick={() => handleOpenModal('goal_deposit')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-md flex items-center space-x-1"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Aporte</span>
          </button>
        </div>

        {/* Grid de Metas Ativas (max 2) */}
        {goals.length === 0 ? (
          <p className="text-center text-xs font-bold text-slate-400 py-3">
            Nenhuma meta cadastrada. Clique em gerenciar para criar seu primeiro cofrinho.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {goals.slice(0, 2).map(goal => {
              const current = Number(goal.currentAmount) || 0;
              const target = Number(goal.targetAmount) || 1;
              const pct = Math.min(100, Math.round((current / target) * 100));

              return (
                <div 
                  key={goal.id}
                  onClick={() => setSelectedGoalDetailId(goal.id)}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                      {goal.name}
                    </h4>
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                    <span>{!isBlurred ? formatCurrency(current) : '••••'}</span>
                    <span>Meta: {!isBlurred ? formatCurrency(target) : '••••'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO 4: RENDA VARIÁVEL / SHOWS DO MÊS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Music size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Renda Variável</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Shows & Eventos do Mês</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/shows')}
            className="text-[10px] font-black uppercase text-sky-600 dark:text-sky-400 hover:underline flex items-center"
          >
            Gerenciar Shows <ChevronRight size={12} className="ml-0.5" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-sky-900 dark:text-sky-200">
              {monthlyShowsSummary.count} {monthlyShowsSummary.count === 1 ? 'Show Contratado' : 'Shows Contratados'} no Mês
            </span>
            <span className="text-xs font-black text-sky-600 dark:text-sky-400">
              {monthlyShowsSummary.pctReceived}% Recebido
            </span>
          </div>

          {/* Progress Bar of Cache received */}
          <div className="w-full bg-sky-200/60 dark:bg-sky-900/50 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-sky-600 dark:bg-sky-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${monthlyShowsSummary.pctReceived}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-sky-900/30">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Total Cachês</span>
              <span className="text-xs font-black text-slate-800 dark:text-white tabular-nums">
                {!isBlurred ? formatCurrency(monthlyShowsSummary.totalContracted) : '••••'}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-sky-900/30">
              <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">Recebido</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {!isBlurred ? formatCurrency(monthlyShowsSummary.totalReceived) : '••••'}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-sky-900/30">
              <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 block">A Receber</span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {!isBlurred ? formatCurrency(monthlyShowsSummary.totalPending) : '••••'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 5: FLUXO DO MÊS (REALIZADO VS PROJETADO) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <PieChart size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Balanço do Mês</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Realizado vs Projetado</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/flow')}
            className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
          >
            Ver Detalhes <ChevronRight size={12} className="ml-0.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* PAINEL REALIZADO */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                1. Realizado (Até Hoje)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600">
                Efetivado
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Entradas:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {!isBlurred ? formatCurrency(summary.monthlyIncome) : '••••'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Saídas:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {!isBlurred ? formatCurrency(summary.monthlyExpense) : '••••'}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 font-black">
                <span className="text-slate-800 dark:text-slate-200">Resultado Atual:</span>
                <span className={`tabular-nums ${summary.monthlyIncome - summary.monthlyExpense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {!isBlurred ? formatCurrency(summary.monthlyIncome - summary.monthlyExpense) : '••••'}
                </span>
              </div>
            </div>
          </div>

          {/* PAINEL PROJETADO */}
          <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                2. Projetado (Fim do Mês)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Estimativa
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Entradas Totais:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {!isBlurred ? formatCurrency(summary.monthlyIncome + summary.pendingIncome) : '••••'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Saídas Totais:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {!isBlurred ? formatCurrency(summary.monthlyExpense + summary.pendingExpense) : '••••'}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-indigo-100 dark:border-indigo-900/40 font-black">
                <span className="text-indigo-900 dark:text-indigo-200">Resultado Projetado:</span>
                <span className={`tabular-nums ${(summary.monthlyIncome + summary.pendingIncome) - (summary.monthlyExpense + summary.pendingExpense) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {!isBlurred ? formatCurrency((summary.monthlyIncome + summary.pendingIncome) - (summary.monthlyExpense + summary.pendingExpense)) : '••••'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SEÇÃO 6: ÚLTIMAS MOVIMENTAÇÕES */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Receipt size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Atividade Recente</h3>
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
          <p className="text-center text-xs font-bold text-slate-400 py-4">Nenhuma movimentação registrada.</p>
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
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      <IconComp size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                        {t.description || (cat ? cat.name : 'Transação')}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-xs font-black tabular-nums block ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                      {isIncome ? '+' : '-'}{!isBlurred ? formatCurrency(t.amount) : '••••'}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${t.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {t.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEÇÃO 7: ACESSOS RÁPIDOS (ATALHOS CONFIGURÁVEIS) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Sliders size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Atalhos</h3>
              <p className="text-base font-black text-slate-800 dark:text-white">Acesso Rápido</p>
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
              Selecione os atalhos exibidos na sua Home:
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
              className="flex items-center space-x-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition active:scale-95 group text-left"
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

      {/* MODAL EXPLICATIVO: SITUAÇÃO DO MÊS */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <financialHealth.icon size={20} className={financialHealth.color.split(' ')[1]} />
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider">
                  Diagnóstico: {financialHealth.status}
                </h3>
              </div>
              <button onClick={() => setIsHealthModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              {financialHealth.desc}
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Disponível Agora:</span>
                <span className="font-bold tabular-nums">{formatCurrency(summary.realBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Despesas a Pagar (Mês):</span>
                <span className="font-bold text-rose-600 tabular-nums">-{formatCurrency(summary.pendingExpense)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receitas a Receber (Mês):</span>
                <span className="font-bold text-emerald-600 tabular-nums">+{formatCurrency(summary.pendingIncome)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-black">
                <span>Resultado Projetado:</span>
                <span className="tabular-nums">{formatCurrency(summary.projectedBalance)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsHealthModalOpen(false)}
              className="w-full p-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* MODAL EXPLICATIVO: LIVRE PARA GASTAR */}
      {isFreeSpendModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Info size={20} className="text-indigo-500" />
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider">
                  Como é Calculado?
                </h3>
              </div>
              <button onClick={() => setIsFreeSpendModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              O valor <strong>Livre para Gastar</strong> é a quantia do seu saldo atual que não está reservada para pagar contas pendentes do mês.
            </p>

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2 text-xs border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Atual Disponível:</span>
                <span className="font-bold tabular-nums">{formatCurrency(summary.realBalance)}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>(-) Despesas Pendentes Mês:</span>
                <span className="font-bold tabular-nums">-{formatCurrency(summary.pendingExpense)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-indigo-200 dark:border-indigo-800 font-black text-indigo-900 dark:text-indigo-200 text-sm">
                <span>= Livre para Gastar:</span>
                <span className="tabular-nums">{formatCurrency(summary.freeToSpend)}</span>
              </div>
            </div>

            <button
              onClick={() => setIsFreeSpendModalOpen(false)}
              className="w-full p-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: PROJEÇÃO DE CAIXA / DATA */}
      {isDateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center">
                <CalendarDays size={16} className="mr-2 text-indigo-500" />
                Data Limit de Projeção
              </h3>
              <button onClick={() => setIsDateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Selecione até qual data limite deseja calcular o saldo projetado considerando contas a vencer.
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

      {/* AUXILIARY MODALS */}
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

    </div>
  );
};
