import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { getIcon } from '../constants';
import { 
  ArrowDownCircle, CheckCircle2, Search, Filter, Clock, 
  Repeat, Calendar, XCircle, ChevronDown, TrendingUp, 
  TrendingDown, Check, Circle, Wallet, ArrowRightLeft, 
  ChevronLeft, ChevronRight, PiggyBank, Plus,
  ListFilter, X, Receipt, Music, Eye, EyeOff, Sparkles,
  ArrowUpRight, ArrowDownRight, MoreVertical, Edit3, Trash2
} from 'lucide-react';
import { Transaction } from '../types';
import { TransactionForm } from './TransactionForm';

export type PeriodPreset = 'this_month' | 'prev_month' | 'next_month' | 'this_year' | 'custom';
export type TypeFilter = 'all' | 'income' | 'expense';
export type StatusFilter = 'all' | 'paid' | 'pending';

export const TransactionList: React.FC = () => {
  const navigate = useNavigate();
  const { 
    transactions, 
    categories, 
    updateTransaction, 
    deleteTransaction,
    accounts, 
    isBlurred, 
    toggleBlur 
  } = useFinance();
  
  // Modal State for Editing / Creating Transaction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Deep linking highlight
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlightId') || searchParams.get('txId');

  // Device current local date
  const getDeviceToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const deviceToday = useMemo(() => getDeviceToday(), []);
  const currentYearMonth = useMemo(() => deviceToday.slice(0, 7), [deviceToday]);
  const currentYear = useMemo(() => deviceToday.slice(0, 4), [deviceToday]);

  // Filters State
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState('');
  const [accountIdFilter, setAccountIdFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Sincronizar navegação direta por highlightId
  useEffect(() => {
    if (highlightId && transactions.length > 0) {
      const found = transactions.find(t => t.id === highlightId);
      if (found) {
        if (found.date) {
          const txMonth = found.date.slice(0, 7);
          setSelectedMonth(txMonth);
          if (txMonth !== currentYearMonth) {
            setPeriodPreset('custom');
          }
        }
        setEditingTransaction(found);
        setTimeout(() => {
          const el = document.getElementById(`tx-${highlightId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 200);
      }
    }
  }, [highlightId, transactions, currentYearMonth]);

  // Handle Quick Period Preset changes
  const handlePeriodPresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const [currY, currM] = currentYearMonth.split('-').map(Number);
    if (preset === 'this_month') {
      setSelectedMonth(currentYearMonth);
    } else if (preset === 'prev_month') {
      const prevD = new Date(currY, currM - 2, 1);
      const prevY = prevD.getFullYear();
      const prevM = String(prevD.getMonth() + 1).padStart(2, '0');
      setSelectedMonth(`${prevY}-${prevM}`);
    } else if (preset === 'next_month') {
      const nextD = new Date(currY, currM, 1);
      const nextY = nextD.getFullYear();
      const nextM = String(nextD.getMonth() + 1).padStart(2, '0');
      setSelectedMonth(`${nextY}-${nextM}`);
    }
  };

  // Month navigation buttons (< e >)
  const changeMonthOffset = (offset: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    const newMonthStr = `${newY}-${newM}`;
    setSelectedMonth(newMonthStr);
    if (newMonthStr === currentYearMonth) {
      setPeriodPreset('this_month');
    } else {
      setPeriodPreset('custom');
    }
  };

  // Period label for display
  const periodLabel = useMemo(() => {
    if (periodPreset === 'this_year') {
      return `Ano de ${currentYear}`;
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [periodPreset, selectedMonth, currentYear]);

  // Currency formatting helper
  const formatCurrency = (val?: number | null) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  // 1. Filtragem principal de transações por período
  const periodTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      if (periodPreset === 'this_year') {
        return t.date.startsWith(currentYear);
      }
      return t.date.startsWith(selectedMonth);
    });
  }, [transactions, periodPreset, selectedMonth, currentYear]);

  // 2. Cálculo dos 4 KPI Cards do Período Selecionado
  const kpiData = useMemo(() => {
    let paidIncome = 0;
    let paidExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    periodTransactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const isInc = t.type === 'income' || t.type === 'goal_withdraw';
      const isExp = t.type === 'expense' || t.type === 'goal_deposit';

      if (t.status === 'paid') {
        if (isInc) paidIncome += amt;
        if (isExp) paidExpense += amt;
      } else {
        if (isInc) pendingIncome += amt;
        if (isExp) pendingExpense += amt;
      }
    });

    const netResult = Math.round((paidIncome - paidExpense) * 100) / 100;
    const netProjected = Math.round((pendingIncome - pendingExpense) * 100) / 100;

    return {
      paidIncome: Math.round(paidIncome * 100) / 100,
      paidExpense: Math.round(paidExpense * 100) / 100,
      netResult,
      pendingIncome: Math.round(pendingIncome * 100) / 100,
      pendingExpense: Math.round(pendingExpense * 100) / 100,
      netProjected
    };
  }, [periodTransactions]);

  // 3. Filtragem adicional da lista (tipo, status, categoria, conta, busca)
  const filteredTransactions = useMemo(() => {
    return periodTransactions
      .filter(t => {
        // Filtro por tipo
        if (typeFilter === 'income') return t.type === 'income' || t.type === 'goal_withdraw';
        if (typeFilter === 'expense') return t.type === 'expense' || t.type === 'goal_deposit';
        return true;
      })
      .filter(t => {
        // Filtro por status
        if (statusFilter === 'paid') return t.status === 'paid';
        if (statusFilter === 'pending') return t.status === 'pending';
        return true;
      })
      .filter(t => {
        if (categoryIdFilter) return t.categoryId === categoryIdFilter;
        return true;
      })
      .filter(t => {
        if (accountIdFilter) return t.accountId === accountIdFilter;
        return true;
      })
      .filter(t => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase().trim();
        const desc = (t.description || '').toLowerCase();
        const cat = categories.find(c => c.id === t.categoryId)?.name.toLowerCase() || '';
        const acc = accounts.find(a => a.id === t.accountId)?.name.toLowerCase() || '';
        const amtStr = String(t.amount || '');
        return desc.includes(term) || cat.includes(term) || acc.includes(term) || amtStr.includes(term);
      })
      .sort((a, b) => {
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [periodTransactions, typeFilter, statusFilter, categoryIdFilter, accountIdFilter, searchTerm, categories, accounts]);

  // 4. Agrupamento por data (Hoje, Ontem, Datas Anteriores)
  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const dateKey = t.date || 'Sem data';
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [filteredTransactions]);

  const formatDateLabel = (dateStr: string) => {
    if (dateStr === deviceToday) return 'HOJE';
    
    // Ontem
    const [y, m, d] = deviceToday.split('-').map(Number);
    const yestDate = new Date(y, m - 1, d - 1);
    const yestStr = `${yestDate.getFullYear()}-${String(yestDate.getMonth() + 1).padStart(2, '0')}-${String(yestDate.getDate()).padStart(2, '0')}`;
    if (dateStr === yestStr) return 'ONTEM';

    // Amanhã
    const tomDate = new Date(y, m - 1, d + 1);
    const tomStr = `${tomDate.getFullYear()}-${String(tomDate.getMonth() + 1).padStart(2, '0')}-${String(tomDate.getDate()).padStart(2, '0')}`;
    if (dateStr === tomStr) return 'AMANHÃ';

    try {
      const [dy, dm, dd] = dateStr.split('-').map(Number);
      const dt = new Date(dy, dm - 1, dd, 12, 0, 0);
      return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    } catch {
      return dateStr.toUpperCase();
    }
  };

  // Toggle rápido de status (Agendado <-> Efetivado com 1 clique)
  const handleToggleStatus = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    const newStatus = t.status === 'paid' ? 'pending' : 'paid';
    updateTransaction({
      ...t,
      status: newStatus
    });
  };

  // Excluir movimentação
  const handleDelete = (e: React.MouseEvent, txId: string) => {
    e.stopPropagation();
    deleteTransaction(txId);
    setDeletingTxId(null);
  };

  return (
    <div className="space-y-6 pb-28 animate-fade-in text-slate-900 dark:text-slate-100 max-w-5xl mx-auto px-1 sm:px-2">
      
      {/* 1. SELETOR DE PERÍODO & NAVEGAÇÃO TEMPORAL MODERNA */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Receipt size={20} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                Extrato Consolidado
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize">
                {periodLabel}
              </h2>
            </div>
          </div>

          {/* Navegação Rápida de Mês */}
          <div className="flex items-center space-x-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => changeMonthOffset(-1)}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition active:scale-95"
              title="Mês Anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="relative group px-2">
              <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider cursor-pointer">
                {periodPreset === 'this_year' ? currentYear : selectedMonth}
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedMonth(e.target.value);
                    setPeriodPreset('custom');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Escolher mês específico"
              />
            </div>

            <button
              onClick={() => changeMonthOffset(1)}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition active:scale-95"
              title="Próximo Mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Botões de Acesso Rápido de Período */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: 'this_month', label: 'Este Mês' },
            { id: 'prev_month', label: 'Mês Passado' },
            { id: 'next_month', label: 'Próximo Mês' },
            { id: 'this_year', label: 'Ano Atual' },
            { id: 'custom', label: 'Personalizado', icon: Calendar }
          ].map((preset) => {
            const isActive = periodPreset === preset.id;
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                onClick={() => handlePeriodPresetChange(preset.id as PeriodPreset)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 flex items-center space-x-1 border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {Icon && <Icon size={12} />}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CABEÇALHO DE TOTAIS & RESUMO FINANCEIRO (4 KPI CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* KPI 1: RECEITAS EFETIVADAS */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/60 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Receitas Efetivadas
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums block">
              {!isBlurred ? formatCurrency(kpiData.paidIncome) : '••••••'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Total recebido no período
            </span>
          </div>
        </div>

        {/* KPI 2: DESPESAS EFETIVADAS */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-950/60 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Despesas Efetivadas
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownRight size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums block">
              {!isBlurred ? formatCurrency(kpiData.paidExpense) : '••••••'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Total pago no período
            </span>
          </div>
        </div>

        {/* KPI 3: SALDO LÍQUIDO DO PERÍODO */}
        <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs space-y-2 relative overflow-hidden ${
          kpiData.netResult >= 0 
            ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' 
            : 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-wider ${
              kpiData.netResult >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            }`}>
              Saldo Líquido
            </span>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
              kpiData.netResult >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}>
              <Wallet size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className={`text-base sm:text-xl font-black tabular-nums block ${
              kpiData.netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {!isBlurred ? `${kpiData.netResult >= 0 ? '+' : ''}${formatCurrency(kpiData.netResult)}` : '••••••'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Receitas - Despesas
            </span>
          </div>
        </div>

        {/* KPI 4: PROJETADO / A RECEBER & A PAGAR */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-950/60 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Projetado / Pendente
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={16} strokeWidth={2.5} />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums block">
              {!isBlurred ? `+${formatCurrency(kpiData.pendingIncome)}` : '••••••'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block truncate">
              {kpiData.pendingExpense > 0 ? `A pagar: ${formatCurrency(kpiData.pendingExpense)}` : 'Nenhuma saída pendente'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. BARRA DE FILTROS RÁPIDOS E BUSCA */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Linha 1: Busca e Botão Novo Lançamento */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por show, contratante, categoria, valor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <XCircle size={15} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsNewTransactionModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-center space-x-1.5 shrink-0"
          >
            <Plus size={15} strokeWidth={3} />
            <span>Nova Movimentação</span>
          </button>
        </div>

        {/* Linha 2: Filtros de Tipo e Filtros de Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          
          {/* Tipo: Todos | Entradas | Saídas */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Todos os Tipos
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 ${
                typeFilter === 'income'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <TrendingUp size={11} />
              <span>Entradas (Shows)</span>
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 ${
                typeFilter === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              <TrendingDown size={11} />
              <span>Saídas (Despesas)</span>
            </button>
          </div>

          {/* Status: Todos | Efetivados | Agendados */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Todos Status
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <Check size={11} strokeWidth={3} />
              <span>Efetivados</span>
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              <Clock size={11} />
              <span>Agendados</span>
            </button>
          </div>

        </div>

        {/* Linha 3: Filtros secundários de Categoria & Conta */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <select
              value={categoryIdFilter}
              onChange={(e) => setCategoryIdFilter(e.target.value)}
              className={`pl-3 pr-8 py-1.5 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border outline-none appearance-none ${
                categoryIdFilter 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="">Todas as Categorias</option>
              {categories.slice().sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${categoryIdFilter ? 'text-white' : 'text-slate-400'}`} />
          </div>

          <div className="relative">
            <select
              value={accountIdFilter}
              onChange={(e) => setAccountIdFilter(e.target.value)}
              className={`pl-3 pr-8 py-1.5 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border outline-none appearance-none ${
                accountIdFilter 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <option value="">Todas as Contas</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${accountIdFilter ? 'text-white' : 'text-slate-400'}`} />
          </div>

          {(categoryIdFilter || accountIdFilter || searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setCategoryIdFilter('');
                setAccountIdFilter('');
                setSearchTerm('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
              className="text-[10px] font-black uppercase text-rose-500 hover:underline flex items-center space-x-1 pl-1"
            >
              <X size={12} />
              <span>Limpar Filtros</span>
            </button>
          )}

          <div className="ml-auto text-[10px] font-bold text-slate-400">
            Exibindo {filteredTransactions.length} de {periodTransactions.length} lançamentos
          </div>
        </div>

      </div>

      {/* 4. LISTA MODULAR DE MOVIMENTAÇÕES AGRUPADAS POR DATA */}
      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Receipt size={24} />
            </div>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Nenhuma movimentação encontrada
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              Não há lançamentos para os filtros selecionados no período de {periodLabel}.
            </p>
            <button
              onClick={() => setIsNewTransactionModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 inline-flex items-center space-x-1 transition shadow-sm"
            >
              <Plus size={14} strokeWidth={3} />
              <span>+ Adicionar Movimentação</span>
            </button>
          </div>
        ) : (
          (Object.entries(groupedTransactions) as [string, Transaction[]][]).map(([date, items]) => {
            const isToday = date === deviceToday;

            return (
              <div key={date} className="space-y-2.5">
                
                {/* Header de Grupo de Data */}
                <div className="flex items-center space-x-3 px-1">
                  <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    <Calendar size={11} />
                    <span>{formatDateLabel(date)}</span>
                  </div>
                  <div className="h-px bg-slate-200/80 dark:border-slate-800 flex-1" />
                </div>

                {/* Cards Modulares de Lançamento */}
                <div className="space-y-2">
                  {items.map((t) => {
                    const category = categories.find(c => c.id === t.categoryId);
                    const Icon = category ? getIcon(category.icon) : ArrowDownCircle;
                    const isExpense = t.type === 'expense' || t.type === 'goal_deposit';
                    const isIncome = t.type === 'income' || t.type === 'goal_withdraw';
                    const isPending = t.status === 'pending';
                    const account = accounts.find(a => a.id === t.accountId);
                    const isHighlighted = t.id === highlightId;

                    return (
                      <div
                        key={t.id}
                        id={`tx-${t.id}`}
                        onClick={() => setEditingTransaction(t)}
                        className={`group p-3.5 sm:p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isHighlighted
                            ? 'ring-2 ring-indigo-500 shadow-lg bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-400'
                            : isPending
                            ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border-amber-200/70 dark:border-amber-900/50 hover:bg-amber-500/[0.08]'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                        }`}
                      >
                        {/* Lado Esquerdo: Ícone + Título + Tags */}
                        <div className="flex items-center space-x-3.5 min-w-0 pr-1 flex-1">
                          
                          {/* Ícone Indicativo */}
                          <div className="relative shrink-0">
                            <div 
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${
                                isExpense 
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' 
                                  : isIncome 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' 
                                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50'
                              }`}
                            >
                              {t.type === 'transfer' ? (
                                <ArrowRightLeft size={19} />
                              ) : t.type === 'goal_deposit' || t.type === 'goal_withdraw' ? (
                                <PiggyBank size={19} />
                              ) : (
                                <Icon size={19} style={{ color: category?.color }} />
                              )}
                            </div>

                            {/* Badge Mini Indicador de Status */}
                            {isPending && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs" title="Lançamento Agendado/Pendente">
                                <Clock size={8} className="text-white" strokeWidth={3} />
                              </div>
                            )}
                          </div>

                          {/* Detalhes do Lançamento */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate">
                                {t.description || 'Sem descrição'}
                              </h4>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {/* Categoria */}
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                {t.type === 'transfer' ? 'Transferência' : category ? category.name : 'Geral'}
                              </span>

                              {/* Badge Efetivado / Agendado */}
                              {isPending ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/50 dark:border-amber-800 uppercase tracking-wider">
                                  <Clock size={9} className="mr-1 inline" /> Agendado
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-800 uppercase tracking-wider">
                                  <Check size={9} strokeWidth={3} className="mr-1 inline" /> Efetivado
                                </span>
                              )}

                              {/* Tag Show com Atalho Direto */}
                              {t.showId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/shows?showId=${t.showId}`);
                                  }}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-300/50 dark:border-purple-800 uppercase tracking-wider transition active:scale-95"
                                  title="Abrir detalhes deste show na agenda"
                                >
                                  <Music size={9} className="mr-1" /> Show
                                </button>
                              )}

                              {/* Tag Recorrente / Fixa */}
                              {t.isFixed && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 uppercase">
                                  <Repeat size={8} className="mr-0.5" /> Fixa
                                </span>
                              )}

                              {/* Tag Parcelamento */}
                              {t.installmentNumber && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 uppercase">
                                  {t.installmentNumber}/{t.installmentTotal}
                                </span>
                              )}

                              {/* Conta Bancária */}
                              {account && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 truncate max-w-[120px]">
                                  <Wallet size={8} className="mr-1 shrink-0" /> {account.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lado Direito: Valor + Atalhos de Ação Rápida */}
                        <div className="flex items-center space-x-2.5 shrink-0">
                          
                          {/* Valor em Destaque */}
                          <div className="text-right">
                            <span className={`text-xs sm:text-base font-black tabular-nums block ${
                              isExpense 
                                ? 'text-slate-900 dark:text-white' 
                                : isIncome 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-indigo-600 dark:text-indigo-400'
                            }`}>
                              {isExpense ? '- ' : isIncome ? '+ ' : ''}{!isBlurred ? formatCurrency(t.amount) : '••••••'}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              {isPending ? 'Projetado' : 'Liquidado'}
                            </span>
                          </div>

                          {/* Botão de 1 Clique para Alternar Status (Agendado <-> Efetivado) */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(e, t)}
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-xs shrink-0 ${
                              isPending
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-xs'
                            }`}
                            title={isPending ? "Clique para marcar como EFETIVADO (Recebido/Pago)" : "Clique para marcar como AGENDADO (Pendente)"}
                          >
                            {isPending ? (
                              <Clock size={16} />
                            ) : (
                              <Check size={17} strokeWidth={3} />
                            )}
                          </button>

                          {/* Botão Editar / Opções */}
                          <button
                            type="button"
                            onClick={() => setEditingTransaction(t)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:flex"
                            title="Editar Lançamento"
                          >
                            <Edit3 size={15} />
                          </button>

                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* MODAL EDITAR TRANSAÇÃO */}
      {editingTransaction && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}

      {/* MODAL NOVA TRANSAÇÃO */}
      {isNewTransactionModalOpen && (
        <TransactionForm
          onClose={() => setIsNewTransactionModalOpen(false)}
        />
      )}

    </div>
  );
};
