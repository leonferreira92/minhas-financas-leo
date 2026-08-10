import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  Target, PieChart, TrendingUp, Plus, X, 
  ChevronRight, ChevronLeft, ArrowRight, Wallet, CheckCircle2, 
  AlertCircle, Sparkles, Filter, PiggyBank, Heart, 
  Activity, ShieldCheck, Flame, Info, Calendar,
  ArrowUpRight, ArrowDownRight, ShieldAlert, Check,
  AlertTriangle, Lock, HelpCircle, Edit3, Layers, RefreshCw
} from 'lucide-react';
import { getIcon, parseCurrencyInput } from '../constants';
import { GoalDetail } from './GoalDetail';
import { CalendarModal } from './CalendarModal';
import { Category, Transaction } from '../types';

export const PlanningScreen = () => {
  const { 
    categories, 
    budgets, 
    transactions, 
    goals, 
    accounts,
    debts,
    addGoal, 
    saveBudget, 
    deleteBudget, 
    updateGoal, 
    deleteGoal,
    updateTransaction,
    updateCategory
  } = useFinance();

  // Active Tab View in Planning
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'budgets' | 'goals' | 'rule'>('overview');
  
  // Selected Month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'budget' | 'goal' | 'categoryGroup'>('budget');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const formattedMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [selectedMonth]);

  // Currency Formatter
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // ==========================================
  // 1. CÁLCULO DOS 4 PILARES DO NOVO MODELO
  // ==========================================

  // A) DINHEIRO DISPONÍVEL (Saldo real líquido em contas ativas hoje)
  const availableCash = useMemo(() => {
    return accounts
      .filter(a => a.enabled !== false)
      .reduce((sum, acc) => {
        // Calculate account balance
        const initial = Number(acc.initialBalance) || 0;
        const txSum = transactions
          .filter(t => t.accountId === acc.id && t.status === 'paid')
          .reduce((s, t) => {
            if (t.type === 'income') return s + Number(t.amount);
            if (t.type === 'expense') return s - Number(t.amount);
            if (t.type === 'transfer') return s - Number(t.amount);
            if (t.type === 'adjustment') return s + Number(t.amount);
            return s;
          }, 0);
        const destSum = transactions
          .filter(t => t.destinationAccountId === acc.id && t.status === 'paid' && t.type === 'transfer')
          .reduce((s, t) => s + Number(t.amount), 0);

        return sum + (initial + txSum + destSum);
      }, 0);
  }, [accounts, transactions]);

  // B) DINHEIRO COMPROMETIDO (Despesas e dívidas pendentes no mês selecionado)
  const monthPendingExpenses = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense' && t.status === 'pending')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedMonth]);

  const committedAmount = useMemo(() => {
    return monthPendingExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
  }, [monthPendingExpenses]);

  // C) METAS (Dinheiro reservado nos cofrinhos)
  const goalsTotal = useMemo(() => {
    return goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  }, [goals]);

  // D) LIVRE PARA GASTAR = Dinheiro Disponível - Dinheiro Comprometido - Metas
  const freeToSpend = useMemo(() => {
    return availableCash - committedAmount - goalsTotal;
  }, [availableCash, committedAmount, goalsTotal]);

  // ==========================================
  // 2. RECEITAS FUTURAS & DESPESAS PAGO DO MÊS
  // ==========================================

  const monthPendingIncomes = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === 'income' && t.status === 'pending')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedMonth]);

  const totalPendingIncomeMonth = useMemo(() => {
    return monthPendingIncomes.reduce((sum, t) => sum + Number(t.amount), 0);
  }, [monthPendingIncomes]);

  const monthPaidExpenses = useMemo(() => {
    return transactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense' && t.status === 'paid')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions, selectedMonth]);

  // ==========================================
  // 3. TAXA DE COBERTURA DO MÊS
  // ==========================================
  // Formula: dinheiro disponível destinado aos compromissos / total de compromissos pendentes do período
  const coverageData = useMemo(() => {
    if (committedAmount <= 0) {
      return {
        pct: 100,
        isCovered: true,
        gap: 0,
        label: 'Compromissos Cobertos'
      };
    }
    const pct = Math.min(999, Math.round((availableCash / committedAmount) * 100));
    const isCovered = availableCash >= committedAmount;
    const gap = Math.max(0, committedAmount - availableCash);

    return {
      pct,
      isCovered,
      gap,
      label: isCovered ? 'Compromissos Cobertos' : `Falta ${formatCurrency(gap)} para cobrir pendências`
    };
  }, [availableCash, committedAmount]);

  // ==========================================
  // 4. SALDO PROJETADO DO MÊS
  // ==========================================
  const projectedBalanceMonth = useMemo(() => {
    return availableCash + totalPendingIncomeMonth - committedAmount;
  }, [availableCash, totalPendingIncomeMonth, committedAmount]);

  // ==========================================
  // 5. ORÇAMENTO DE TETOS DE GASTOS
  // ==========================================
  const budgetUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    transactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense')
      .forEach(t => {
        usage[t.categoryId] = (usage[t.categoryId] || 0) + Number(t.amount);
      });
    return usage;
  }, [transactions, selectedMonth]);

  // ==========================================
  // 6. GRUPOS DE PLANEJAMENTO (Essencial, Dívidas, Metas, Livre)
  // ==========================================
  const planningGroupsData = useMemo(() => {
    let essencial = 0;
    let dividas = 0;
    let metasGroup = 0;
    let livreGroup = 0;

    const expenseTransactions = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense');
    const totalExpenses = expenseTransactions.reduce((s, t) => s + Number(t.amount), 0) || 1;

    expenseTransactions.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const nameLower = (cat?.name || t.description || '').toLowerCase();
      
      // Categorização Inteligente Adaptativa
      if (t.debtId || nameLower.includes('dívida') || nameLower.includes('divida') || nameLower.includes('financiamento') || nameLower.includes('acordo') || nameLower.includes('empréstimo') || nameLower.includes('emprestimo')) {
        dividas += Number(t.amount);
      } else if (cat?.classification === 'essential' || nameLower.includes('moradia') || nameLower.includes('aluguel') || nameLower.includes('mercado') || nameLower.includes('alimentação') || nameLower.includes('luz') || nameLower.includes('água') || nameLower.includes('saúde') || nameLower.includes('transporte')) {
        essencial += Number(t.amount);
      } else if (cat?.classification === 'future' || t.goalId || nameLower.includes('cofrinho') || nameLower.includes('meta') || nameLower.includes('reserva') || nameLower.includes('investimento')) {
        metasGroup += Number(t.amount);
      } else {
        livreGroup += Number(t.amount);
      }
    });

    return {
      total: totalExpenses === 1 ? 0 : totalExpenses,
      essencial,
      dividas,
      metasGroup,
      livreGroup,
      pcts: {
        essencial: (essencial / totalExpenses) * 100,
        dividas: (dividas / totalExpenses) * 100,
        metasGroup: (metasGroup / totalExpenses) * 100,
        livreGroup: (livreGroup / totalExpenses) * 100
      }
    };
  }, [transactions, categories, selectedMonth]);

  // ==========================================
  // 7. REGRA 50/30/20 (REFERENCIAL SECUNDÁRIO)
  // ==========================================
  const ruleData = useMemo(() => {
    let income = 0;
    let essential = 0;
    let personal = 0;
    let future = 0;

    transactions.filter(t => t.date.startsWith(selectedMonth) && t.status === 'paid').forEach(t => {
      if (t.type === 'income') income += Number(t.amount);
      else if (t.type === 'expense') {
        const cat = categories.find(c => c.id === t.categoryId);
        const classification = cat?.classification || 'personal';
        if (classification === 'essential') essential += Number(t.amount);
        else if (classification === 'personal') personal += Number(t.amount);
        else if (classification === 'future') future += Number(t.amount);
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
  }, [transactions, categories, selectedMonth]);

  // Mark transaction paid / received
  const handleToggleStatus = (t: Transaction) => {
    const newStatus = t.status === 'paid' ? 'pending' : 'paid';
    updateTransaction({
      ...t,
      status: newStatus
    });
  };

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100 max-w-md mx-auto">
      
      {/* HEADER & MONTH SELECTOR */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-4 pb-3 border-b border-slate-200/50 dark:border-slate-800/50 mb-6">
        
        {/* Title + Action */}
        <div className="flex justify-between items-center mb-4 px-1">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              Planejamento
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Adaptativo
              </span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400">Orçamento focado em Renda Variável</p>
          </div>

          <button 
            onClick={() => { 
              setModalType(activeTab === 'goals' ? 'goal' : 'budget'); 
              setIsModalOpen(true); 
            }}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center"
            title="Novo Item"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Month Selector Bar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-3">
          <button 
            onClick={handlePrevMonth} 
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition active:scale-90"
            aria-label="Mês Anterior"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
              Mês Selecionado
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight">
              {formattedMonthLabel}
            </span>
          </div>

          <button 
            onClick={handleNextMonth} 
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition active:scale-90"
            aria-label="Próximo Mês"
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/60 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          {[
            { id: 'overview', label: 'Decisão' },
            { id: 'groups', label: 'Grupos' },
            { id: 'budgets', label: 'Tetos' },
            { id: 'goals', label: 'Cofrinhos' },
            { id: 'rule', label: '50/30/20' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all
                ${activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md scale-[1.02]' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BANNER EXPLICATIVO DO MODO ADAPTATIVO */}
      <div className="mb-6 px-1">
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start space-x-3 text-indigo-900 dark:text-indigo-200">
          <Info size={20} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium leading-relaxed">
            <strong className="font-black text-indigo-700 dark:text-indigo-300">Regra de Renda Variável:</strong> O planejamento prioriza o <u className="decoration-indigo-400 underline-offset-2">dinheiro disponível hoje</u>. Entradas futuras entram na projeção, mas nunca liberam saldo para gastos antes de serem recebidas.
          </p>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: VISÃO GERAL DE DECISÃO (OS 4 PILARES & LISTAS)   */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in px-1">
          
          {/* OS 4 QUADROS FUNDAMENTAIS */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">
              Quadro de Liquidez & Obrigações
            </span>

            {/* GRID DOS 3 INDICADORES SECUNDÁRIOS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* 1. DINHEIRO DISPONÍVEL */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dinheiro Disponível</span>
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Wallet size={16} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                    {formatCurrency(availableCash)}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Saldo real nas contas hoje
                  </p>
                </div>
              </div>

              {/* 2. DINHEIRO COMPROMETIDO */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">Comprometido</span>
                  <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertCircle size={16} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                    {formatCurrency(committedAmount)}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Despesas e dívidas pendentes
                  </p>
                </div>
              </div>

              {/* 3. METAS / COFRINHOS */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Metas</span>
                  <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <PiggyBank size={16} strokeWidth={2.5} />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                    {formatCurrency(goalsTotal)}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Reservado para objetivos
                  </p>
                </div>
              </div>

            </div>

            {/* 4. INDICADOR PRINCIPAL: LIVRE PARA GASTAR (HERO CARD Evidente) */}
            <div className={`
              rounded-[2.2rem] p-6 shadow-xl relative overflow-hidden transition-all duration-300 border-2
              ${freeToSpend >= 0 
                ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-indigo-500/40' 
                : 'bg-gradient-to-br from-rose-950 via-slate-900 to-rose-950 text-white border-rose-500/50'
              }
            `}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${freeToSpend >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <Sparkles size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-200">
                    Principal Indicador de Decisão
                  </span>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${freeToSpend >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                  {freeToSpend >= 0 ? 'Saldo Livre' : 'Déficit no Mês'}
                </span>
              </div>

              <div className="relative z-10 mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Livre para Gastar</span>
                <h2 className="text-4xl font-black tracking-tight text-white mt-1">
                  {formatCurrency(freeToSpend)}
                </h2>
              </div>

              <p className="text-xs text-slate-300/90 leading-relaxed relative z-10 font-medium">
                {freeToSpend >= 0 
                  ? 'Você pode utilizar este valor para gastos discricionários sem comprometer suas obrigações cadastradas nem seus cofrinhos.'
                  : 'Atenção: Suas obrigações pendentes e metas superam o dinheiro disponível hoje. Evite novas despesas até efetivar entradas.'
                }
              </p>
            </div>
          </div>

          {/* ========================================== */}
          {/* SEÇÃO: TAXA DE COBERTURA DO MÊS            */}
          {/* ========================================== */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block">
                  Indicador de Segurança
                </span>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Cobertura do Mês</h3>
              </div>

              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-black text-xs border ${coverageData.isCovered ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                {coverageData.isCovered ? <Check size={16} strokeWidth={3} /> : <AlertTriangle size={16} strokeWidth={2.5} />}
                <span>{coverageData.label}</span>
              </div>
            </div>

            {/* Barra de Progresso de Cobertura */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-black">
                <span className="text-slate-400">Compromissos pendentes: {formatCurrency(committedAmount)}</span>
                <span className={coverageData.isCovered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                  {coverageData.pct}% COBERTO
                </span>
              </div>

              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 relative">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${coverageData.isCovered ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, coverageData.pct)}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium leading-normal">
              Mostra quanto das suas contas e dívidas pendentes já está garantido pelo seu dinheiro em conta. Receitas previstas não entram no cálculo.
            </p>
          </div>

          {/* ========================================== */}
          {/* SEÇÃO: PRÓXIMAS ENTRADAS (RECEITAS FUTURAS)*/}
          {/* ========================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  Próximas Entradas
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-extrabold">
                    {monthPendingIncomes.length}
                  </span>
                </h3>
                <p className="text-[11px] font-medium text-slate-400">Receitas previstas para o período</p>
              </div>

              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2.5 py-1 rounded-xl">
                Previsto: {formatCurrency(totalPendingIncomeMonth)}
              </span>
            </div>

            {monthPendingIncomes.length === 0 ? (
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                <p className="text-xs font-medium text-slate-400">Nenhuma receita futura/prevista cadastrada para este mês.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {monthPendingIncomes.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  const Icon = cat ? getIcon(cat.icon) : ArrowUpRight;

                  return (
                    <div 
                      key={t.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-indigo-500/40 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                          {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{t.description}</h4>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {cat?.name || 'Receita Variável'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-3">
                        <div>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                            +{formatCurrency(Number(t.amount))}
                          </span>
                          <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            PREVISTO
                          </span>
                        </div>

                        <button
                          onClick={() => handleToggleStatus(t)}
                          className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                          title="Marcar como recebido"
                        >
                          Efetivar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================== */}
          {/* SEÇÃO: PRÓXIMOS COMPROMISSOS (DESPESAS)    */}
          {/* ========================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  Próximos Compromissos
                  <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-extrabold">
                    {monthPendingExpenses.length}
                  </span>
                </h3>
                <p className="text-[11px] font-medium text-slate-400">Contas e obrigações a pagar</p>
              </div>

              <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase bg-rose-500/10 px-2.5 py-1 rounded-xl">
                Total: {formatCurrency(committedAmount)}
              </span>
            </div>

            {monthPendingExpenses.length === 0 ? (
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ Nenhuma conta pendente para este mês!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {monthPendingExpenses.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);

                  return (
                    <div 
                      key={t.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-rose-500/40 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                          {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{t.description}</h4>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {cat?.name || 'Compromisso'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-3">
                        <div>
                          <span className="text-xs font-black text-slate-800 dark:text-white block">
                            {formatCurrency(Number(t.amount))}
                          </span>
                          <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                            PENDENTE
                          </span>
                        </div>

                        <button
                          onClick={() => handleToggleStatus(t)}
                          className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95"
                          title="Marcar como pago"
                        >
                          Pagar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================== */}
          {/* SEÇÃO: SALDO PROJETADO DO MÊS             */}
          {/* ========================================== */}
          <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl space-y-4 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />

            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 block mb-1">
                Visão de Futuro
              </span>
              <h3 className="text-lg font-black tracking-tight">Projeção do Mês (Saldo Projetado)</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Disponível Agora</span>
                <span className="text-base font-black text-emerald-400 mt-1 block">
                  {formatCurrency(availableCash)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Projeção Final</span>
                <span className="text-base font-black text-indigo-300 mt-1 block">
                  {formatCurrency(projectedBalanceMonth)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] font-medium leading-relaxed">
              <strong>SALDO PROJETADO ≠ DINHEIRO DISPONÍVEL.</strong> A projeção soma receitas previstas que ainda podem mudar. Tome decisões do dia a dia usando apenas o 'Disponível Agora'.
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: SISTEMA DE GRUPOS DE PLANEJAMENTO                 */}
      {/* ======================================================== */}
      {activeTab === 'groups' && (
        <div className="space-y-6 animate-fade-in px-1">
          <div className="bg-indigo-600 rounded-[2.2rem] p-6 text-white shadow-xl relative overflow-hidden">
            <h2 className="text-2xl font-black mb-1">Grupos de Planejamento</h2>
            <p className="text-xs text-indigo-100 opacity-90">
              Classificação em 4 grandes eixos para controle estratégico de gastos.
            </p>
          </div>

          {/* Os 4 Grupos */}
          <div className="space-y-4">
            
            {/* 1. ESSENCIAL */}
            <GroupCard 
              title="Essencial" 
              icon={ShieldCheck} 
              color="bg-indigo-500 text-indigo-500" 
              amount={planningGroupsData.essencial} 
              pct={planningGroupsData.pcts.essencial} 
              desc="Moradia, alimentação, luz, saúde e transporte básico." 
              formatCurrency={formatCurrency}
            />

            {/* 2. DÍVIDAS */}
            <GroupCard 
              title="Dívidas & Acordos" 
              icon={ShieldAlert} 
              color="bg-rose-500 text-rose-500" 
              amount={planningGroupsData.dividas} 
              pct={planningGroupsData.pcts.dividas} 
              desc="Parcelamentos, financiamentos e quitação de credores." 
              formatCurrency={formatCurrency}
            />

            {/* 3. METAS */}
            <GroupCard 
              title="Metas & Reservas" 
              icon={PiggyBank} 
              color="bg-amber-500 text-amber-500" 
              amount={planningGroupsData.metasGroup} 
              pct={planningGroupsData.pcts.metasGroup} 
              desc="Aportes em cofrinhos e construção de patrimônio." 
              formatCurrency={formatCurrency}
            />

            {/* 4. LIVRE / LAZER */}
            <GroupCard 
              title="Livre / Lazer" 
              icon={Heart} 
              color="bg-emerald-500 text-emerald-500" 
              amount={planningGroupsData.livreGroup} 
              pct={planningGroupsData.pcts.livreGroup} 
              desc="Hobbies, jantares, compras e gastos discricionários." 
              formatCurrency={formatCurrency}
            />

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: TETOS DE GASTOS (LIMITES POR CATEGORIA)           */}
      {/* ======================================================== */}
      {activeTab === 'budgets' && (
        <div className="space-y-6 animate-fade-in px-1">
          <div className="bg-indigo-600 rounded-[2.2rem] p-6 text-white shadow-xl relative overflow-hidden flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Limites Adaptativos</p>
              <h2 className="text-2xl font-black">Tetos de Gastos</h2>
              <p className="text-xs text-indigo-100 opacity-90">Defina limites teto para cada categoria de despesa.</p>
            </div>

            <button 
              onClick={() => { setModalType('budget'); setIsModalOpen(true); }}
              className="p-3 bg-white text-indigo-600 rounded-2xl shadow-md font-bold active:scale-95 transition"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {budgets.length === 0 ? (
              <EmptyState icon={Activity} title="Sem tetos definidos" desc="Crie limites de gastos para suas categorias para receber alertas." />
            ) : (
              budgets.map(budget => (
                <AdaptiveBudgetCard 
                  key={budget.categoryId} 
                  budget={budget} 
                  usage={budgetUsage[budget.categoryId] || 0} 
                  categories={categories} 
                  onDelete={deleteBudget} 
                  formatCurrency={formatCurrency}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: METAS & COFRINHOS                                 */}
      {/* ======================================================== */}
      {activeTab === 'goals' && (
        <div className="space-y-6 animate-fade-in px-1">
          <div className="bg-amber-500 rounded-[2.2rem] p-6 text-white shadow-xl relative overflow-hidden flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90 mb-1">Objetivos Financeiros</p>
              <h2 className="text-2xl font-black">Seus Cofrinhos</h2>
              <p className="text-xs text-amber-50 opacity-90 leading-relaxed">
                Dinheiro destinado aos cofrinhos é reserva patrimonial.
              </p>
            </div>

            <button 
              onClick={() => { setModalType('goal'); setIsModalOpen(true); }}
              className="p-3 bg-white text-amber-600 rounded-2xl shadow-md font-bold active:scale-95 transition"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {goals.length === 0 ? (
              <EmptyState icon={PiggyBank} title="Nenhum cofrinho criado" desc="Comece definindo seu primeiro objetivo financeiro." />
            ) : (
              goals.map(goal => (
                <GoalCard key={goal.id} goal={goal} onClick={() => setSelectedGoalId(goal.id)} formatCurrency={formatCurrency} />
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: MATRIZ 50/30/20 (REFERENCIAL SECUNDÁRIO)          */}
      {/* ======================================================== */}
      {activeTab === 'rule' && (
        <div className="space-y-6 animate-fade-in px-1">
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 text-center relative overflow-hidden">
            <Sparkles className="text-indigo-600 mx-auto mb-2" size={28} />
            <h2 className="text-xl font-black mb-1 tracking-tight">Regra 50/30/20 (Referência)</h2>
            <p className="text-xs text-slate-400">Guia proporcional clássico para análise de distribuição</p>
          </div>

          <div className="space-y-4">
            <RuleCard label="Essencial" ideal={50} actual={ruleData.actual.essential} value={ruleData.values.essential} color="bg-indigo-500" icon={ShieldCheck} desc="Moradia, contas e alimentação." formatCurrency={formatCurrency} />
            <RuleCard label="Livre / Lazer" ideal={30} actual={ruleData.actual.personal} value={ruleData.values.personal} color="bg-amber-500" icon={Heart} desc="Hobbies, saídas e desejos." formatCurrency={formatCurrency} />
            <RuleCard label="Investimento" ideal={20} actual={ruleData.actual.future} value={ruleData.values.future} color="bg-emerald-500" icon={TrendingUp} desc="Reservas e planos futuros." formatCurrency={formatCurrency} />
          </div>
        </div>
      )}

      {/* MODAL CRIAÇÃO DE TETO OU META */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-6 shadow-2xl animate-slide-up border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight dark:text-white">
                {modalType === 'budget' ? 'Novo Teto de Gasto' : 'Novo Cofrinho / Meta'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                <X size={20}/>
              </button>
            </div>

            {modalType === 'budget' ? (
              <BudgetForm categories={categories} onSave={(b: any) => { saveBudget(b); setIsModalOpen(false); }} />
            ) : (
              <GoalForm onSave={(g: any) => { addGoal({ ...g, createdAt: new Date().toISOString() }); setIsModalOpen(false); }} />
            )}
          </div>
        </div>
      )}

      {/* MODAL DETALHE DA META */}
      {selectedGoalId && (
        <GoalDetail goalId={selectedGoalId} onClose={() => setSelectedGoalId(null)} />
      )}

    </div>
  );
};

// ==========================================
// SUBCOMPONENTS COM ALERTAS PROGRESSIVOS
// ==========================================

const GroupCard = ({ title, icon: Icon, color, amount, pct, desc, formatCurrency }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${color.split(' ')[0]}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{title}</h4>
          <p className="text-[10px] text-slate-400 font-medium">{desc}</p>
        </div>
      </div>

      <div className="text-right">
        <span className="text-sm font-black text-slate-800 dark:text-white block">{formatCurrency(amount)}</span>
        <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
          {pct.toFixed(0)}% do total
        </span>
      </div>
    </div>

    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full transition-all duration-700 ${color.split(' ')[0]}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  </div>
);

const AdaptiveBudgetCard = ({ budget, usage, categories, onDelete, formatCurrency }: any) => {
  const cat = categories.find((c: any) => c.id === budget.categoryId);
  const Icon = cat ? getIcon(cat.icon) : PieChart;
  const pct = (usage / budget.limit) * 100;
  const remaining = budget.limit - usage;

  // Alertas progressivos em 4 níveis (com texto + cor)
  let alertBadge = { label: 'Normal', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', bar: 'bg-emerald-500' };
  if (pct > 100) {
    alertBadge = { label: 'Limite Ultrapassado', color: 'bg-rose-500/20 text-rose-600 border-rose-500/30', bar: 'bg-rose-600' };
  } else if (pct >= 90) {
    alertBadge = { label: 'Próximo do Limite', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', bar: 'bg-rose-500' };
  } else if (pct >= 70) {
    alertBadge = { label: 'Atenção', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', bar: 'bg-amber-500' };
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: cat?.color || '#6366f1' }}>
            <Icon size={20} />
          </div>
          <div>
            <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{cat?.name || 'Categoria'}</h4>
            <span className="text-[10px] text-slate-400 font-bold block">
              {formatCurrency(usage)} de {formatCurrency(budget.limit)}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${alertBadge.color}`}>
            {alertBadge.label}
          </span>

          <button onClick={() => onDelete(budget.categoryId)} className="text-slate-300 hover:text-rose-500 transition p-1">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-700 ${alertBadge.bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>

      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
        <span>{pct.toFixed(0)}% Usado</span>
        <span className={remaining < 0 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}>
          {remaining >= 0 ? `Resta: ${formatCurrency(remaining)}` : `Excedido: ${formatCurrency(Math.abs(remaining))}`}
        </span>
      </div>
    </div>
  );
};

const GoalCard = ({ goal, onClick, formatCurrency }: any) => {
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const GoalIcon = getIcon(goal.icon);

  return (
    <div 
      onClick={onClick} 
      className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 hover:scale-[1.01] transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: goal.color }}>
            <GoalIcon size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Cofrinho</span>
            <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight">{goal.name}</h3>
          </div>
        </div>

        <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
          {goal.deadline ? new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase() : 'S/ Prazo'}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-end text-xs font-black">
          <span className="text-slate-400">Acumulado: {formatCurrency(goal.currentAmount)}</span>
          <span className="text-slate-800 dark:text-white font-extrabold">{pct.toFixed(0)}%</span>
        </div>

        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
        </div>
      </div>

      <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
        <span>Objetivo: {formatCurrency(goal.targetAmount)}</span>
        <span>Falta: {formatCurrency(remaining)}</span>
      </div>
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, desc }: any) => (
  <div className="text-center py-12 opacity-60 flex flex-col items-center">
    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
      <Icon size={28} className="text-slate-400" />
    </div>
    <h3 className="font-bold text-slate-700 dark:text-white mb-1 text-sm">{title}</h3>
    <p className="text-xs text-slate-500 max-w-[220px]">{desc}</p>
  </div>
);

const RuleCard = ({ label, ideal, actual, value, color, icon: Icon, desc, formatCurrency }: any) => {
  const isExceeded = actual > ideal;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{label}</h4>
          <p className="text-[10px] text-slate-400">{desc}</p>
        </div>
      </div>

      <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${color}`} style={{ width: `${Math.min(100, actual)}%` }} />
        <div className="absolute top-0 bottom-0 border-l-2 border-white/80" style={{ left: `${ideal}%` }} />
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

const BudgetForm = ({ categories, onSave }: any) => {
  const [catId, setCatId] = useState('');
  const [limit, setLimit] = useState('');

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Categoria</label>
        <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm dark:text-white transition">
          <option value="">Selecione...</option>
          {categories.filter((c: any) => c.type === 'expense').map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Teto Mensal</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-base">R$</span>
          <input type="number" step="any" value={limit} onChange={e => setLimit(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-base dark:text-white transition" placeholder="0" />
        </div>
      </div>
      <button onClick={() => onSave({ categoryId: catId, limit: parseCurrencyInput(limit) })} disabled={!catId || !limit} className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 disabled:opacity-30 transition-all">
        Salvar Teto
      </button>
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
    <div className="space-y-5">
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">O que você quer conquistar?</label>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm dark:text-white transition" placeholder="Ex: Equipamento Novo" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Valor Alvo</label>
          <input type="number" step="any" value={target} onChange={e => setTarget(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm dark:text-white transition" placeholder="R$ 0" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Já tenho</label>
          <input type="number" step="any" value={current} onChange={e => setCurrent(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm dark:text-white transition" placeholder="R$ 0" />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Prazo (Opcional)</label>
        <div 
          onClick={() => setIsCalendarOpen(true)}
          className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-2xl flex items-center justify-between cursor-pointer transition"
        >
          <span className={`font-bold text-xs ${deadline ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
            {deadline ? new Date(deadline + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem prazo'}
          </span>
          <Calendar size={18} className="text-slate-400" />
        </div>
      </div>
      <button onClick={() => onSave({ name, targetAmount: parseCurrencyInput(target), currentAmount: parseCurrencyInput(current), deadline, color: '#f59e0b', icon: 'PiggyBank' })} disabled={!name || !target} className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 disabled:opacity-30 transition-all">
        Criar Cofrinho
      </button>
      
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
