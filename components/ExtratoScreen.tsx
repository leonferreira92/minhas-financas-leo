import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Receipt, Plus, Filter, UploadCloud, Sparkles, 
  ChevronLeft, ChevronRight, Clock, CheckCircle2, 
  ArrowUpRight, ArrowDownRight, Search, X, Calendar, 
  Landmark, Music, Tag, ArrowRightLeft, AlertCircle,
  Eye, EyeOff, Check, Trash2, Edit3
} from 'lucide-react';
import { Transaction, matchesScope, Account } from '../types';
import { getIcon } from '../constants';
import { TransactionForm } from './TransactionForm';
import { BankImportModal } from './BankImportModal';
import { ScopeSelector } from './ScopeSelector';
import { getLocalDateString, getCurrentMonthPrefix } from '../services/dateUtils';
import { useDraggableScroll } from '../hooks/useDraggableScroll';

type TypeStatusFilter = 'all' | 'paid' | 'pending' | 'shows' | 'accounts';

export const ExtratoScreen: React.FC = () => {
  const navigate = useNavigate();
  const { 
    transactions, 
    categories, 
    accounts, 
    isBlurred, 
    toggleBlur, 
    activeScope,
    updateTransaction,
    deleteTransaction,
    getAccountBalance
  } = useFinance();

  // Drag-to-scroll refs for all carousels
  const summaryCarouselRef = useDraggableScroll<HTMLDivElement>({ dragSpeed: 1.4 });
  const quickActionsRef = useDraggableScroll<HTMLDivElement>({ dragSpeed: 1.2 });
  const monthsRef = useDraggableScroll<HTMLDivElement>({ dragSpeed: 1.2 });
  const statusPillsRef = useDraggableScroll<HTMLDivElement>({ dragSpeed: 1.2 });

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Month selector
  const todayStr = useMemo(() => getLocalDateString(), []);
  const currentYearMonth = useMemo(() => getCurrentMonthPrefix(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [isFutureOnly, setIsFutureOnly] = useState(false);

  // Filter pills
  const [statusFilter, setStatusFilter] = useState<TypeStatusFilter>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Carousel Active Card (0: Saldo Atual, 1: Futuros/Cachês, 2: Comprometido)
  const [carouselIndex, setCarouselIndex] = useState(0);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Generate Months List for horizontal month slider
  const monthList = useMemo(() => {
    const list: { label: string; value: string; isCurrent: boolean }[] = [];
    const [currentY, currentM] = currentYearMonth.split('-').map(Number);

    for (let i = -3; i <= 3; i++) {
      const d = new Date(currentY, currentM - 1 + i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${y}-${m}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      list.push({
        label,
        value: val,
        isCurrent: val === currentYearMonth
      });
    }
    return list;
  }, [currentYearMonth]);

  const normalizeSearchText = (val?: string | null) =>
    (val || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // All filtered transactions for the view
  const filteredTransactions = useMemo(() => {
    const hasSearch = searchTerm.trim().length > 0;
    const normTerm = normalizeSearchText(searchTerm);

    return transactions.filter(t => {
      if (!t || t.status === 'cancelled') return false;

      // 1. Filtro por Conta (independente da pílula ativa, respeita a conta selecionada)
      if (selectedAccountId !== 'all') {
        if (t.accountId !== selectedAccountId && t.destinationAccountId !== selectedAccountId) {
          return false;
        }
      } else if (!hasSearch) {
        // Quando em "Todas as Contas" e sem busca textual ativa, filtra pelo escopo ativo (considerando também o escopo da conta)
        const acc = accounts.find(a => a.id === t.accountId);
        const scopeMatches = matchesScope(t.scope, activeScope) || (acc ? matchesScope(acc.scope, activeScope) : false);
        if (!scopeMatches) return false;
      }

      // 2. Filtro de Mês ou Futuros
      if (isFutureOnly) {
        if (!t.date || t.date < todayStr) return false;
      } else {
        if (!t.date || !t.date.startsWith(selectedMonth)) return false;
      }

      // 3. Status e Tipo (Pílulas)
      if (statusFilter === 'paid' && t.status !== 'paid') return false;
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'shows' && !(t.showId || t.categoryId === 'cat_33' || t.scope === 'BUSINESS')) return false;

      // 4. Termo de busca (considera de forma transparente todas as contas selecionadas ou a conta ativa)
      if (hasSearch) {
        const descMatch = normalizeSearchText(t.description).includes(normTerm);
        const showMatch = normalizeSearchText(t.showName).includes(normTerm);
        const cat = categories.find(c => c.id === t.categoryId);
        const catMatch = normalizeSearchText(cat?.name).includes(normTerm);
        const acc = accounts.find(a => a.id === t.accountId);
        const destAcc = t.destinationAccountId ? accounts.find(a => a.id === t.destinationAccountId) : undefined;
        const accMatch =
          normalizeSearchText(acc?.name).includes(normTerm) ||
          normalizeSearchText(destAcc?.name).includes(normTerm);
        const amtStr = String(Math.abs(Number(t.amount) || 0));
        const amtFormatted = formatCurrency(Math.abs(Number(t.amount) || 0)).toLowerCase();
        const amtMatch = amtStr.includes(normTerm) || amtFormatted.includes(normTerm);

        if (!descMatch && !showMatch && !catMatch && !accMatch && !amtMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Ordenação decrescente de data, pendentes com destaque
      return (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [transactions, activeScope, isFutureOnly, selectedMonth, statusFilter, selectedAccountId, searchTerm, todayStr, categories, accounts]);

  // Totais do Período Selecionado (baseados nas transações filtradas e contas selecionadas)
  const metrics = useMemo(() => {
    let saldoRealizado = 0;
    let entradasRealizadas = 0;
    let saidasRealizadas = 0;
    let futurosReceber = 0;
    let comprometidoPagar = 0;

    filteredTransactions.forEach(t => {
      const amount = Math.abs(Number(t.amount) || 0);
      const isInc =
        t.type === 'income' ||
        t.type === 'goal_withdraw' ||
        (t.type === 'transfer' && selectedAccountId !== 'all' && t.destinationAccountId === selectedAccountId);
      const isExp =
        t.type === 'expense' ||
        t.type === 'goal_deposit' ||
        (t.type === 'transfer' && (selectedAccountId === 'all' || t.accountId === selectedAccountId));

      if (t.status === 'paid') {
        if (isInc) {
          entradasRealizadas += amount;
          saldoRealizado += amount;
        } else if (isExp) {
          saidasRealizadas += amount;
          saldoRealizado -= amount;
        }
      } else if (t.status === 'pending') {
        if (isInc) {
          futurosReceber += amount;
        } else if (isExp) {
          comprometidoPagar += amount;
        }
      }
    });

    // Saldo Total das contas ativas correspondentes ao filtro de conta ou escopo
    const contasEscopo = accounts.filter(a => {
      if (a.enabled === false) return false;
      if (selectedAccountId !== 'all') return a.id === selectedAccountId;
      return matchesScope(a.scope, activeScope);
    });
    const saldoTotalContas = parseFloat(
      contasEscopo.reduce((s, a) => s + getAccountBalance(a.id), 0).toFixed(2)
    );

    return {
      saldoRealizado: parseFloat(saldoRealizado.toFixed(2)),
      entradasRealizadas: parseFloat(entradasRealizadas.toFixed(2)),
      saidasRealizadas: parseFloat(saidasRealizadas.toFixed(2)),
      futurosReceber: parseFloat(futurosReceber.toFixed(2)),
      comprometidoPagar: parseFloat(comprometidoPagar.toFixed(2)),
      saldoTotalContas,
      saldoProjetadoFinal: parseFloat((saldoTotalContas + futurosReceber - comprometidoPagar).toFixed(2))
    };
  }, [filteredTransactions, activeScope, selectedAccountId, accounts, getAccountBalance]);

  // Agrupamento dos Lançamentos por Data (Timeline) - Calculando "Saldo do dia" estritamente sobre filteredTransactions
  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      const d = t.date || 'Sem Data';
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });

    return Object.entries(groups).map(([date, txs]) => {
      const hasPaidInGroup = txs.some(t => t.status === 'paid');
      // Soma do "Saldo do dia" calculada exclusivamente sobre o array de transações filtradas (txs de filteredTransactions)
      const dayNet = txs.reduce((sum, t) => {
        if (t.status === 'cancelled') return sum;
        if (hasPaidInGroup && statusFilter !== 'pending' && !isFutureOnly && t.status !== 'paid') {
          return sum;
        }
        const amt = Math.abs(Number(t.amount) || 0);
        const isInc =
          t.type === 'income' ||
          t.type === 'goal_withdraw' ||
          (t.type === 'transfer' && selectedAccountId !== 'all' && t.destinationAccountId === selectedAccountId);
        return isInc ? sum + amt : sum - amt;
      }, 0);

      return {
        date,
        transactions: txs,
        dayNet: parseFloat(dayNet.toFixed(2))
      };
    });
  }, [filteredTransactions, statusFilter, isFutureOnly, selectedAccountId]);

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === 'Sem Data') return 'SEM DATA';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);

    if (dateStr === todayStr) {
      return `HOJE · ${d} DE ${dateObj.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${y}`;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (dateStr === yesterdayStr) {
      return `ONTEM · ${d} DE ${dateObj.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${y}`;
    }

    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
    return `${dayName}, ${d} DE ${dateObj.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${y}`;
  };

  const handleTogglePaid = (t: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = t.status === 'paid' ? 'pending' : 'paid';
    updateTransaction({
      ...t,
      status: newStatus
    });
  };

  const handleExportAIReport = () => {
    navigate('/relatorios?tab=ai');
  };

  return (
    <div className="space-y-4 pb-28 animate-fade-in text-white">
      {/* HEADER DA TELA */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt className="text-[#fcca00]" size={22} />
            <span>Extrato da Conta</span>
          </h1>
          <p className="text-[11px] text-zinc-400 font-medium">Movimentações passadas e lançamentos futuros</p>
        </div>

        <div className="flex items-center space-x-2">
          <ScopeSelector size="sm" />
          <button
            onClick={() => toggleBlur()}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition active:scale-95"
            title={isBlurred ? "Exibir Valores" : "Ocultar Valores"}
          >
            {isBlurred ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CARROSSEL DESLIZÁVEL NO TOPO DO EXTRATO (3 CARDS)                      */}
      {/* ========================================================================= */}
      <div className="relative">
        <div 
          ref={summaryCarouselRef}
          className="overflow-x-auto no-scrollbar flex snap-x snap-mandatory gap-3 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 cursor-grab active:cursor-grabbing select-none"
        >
          
          {/* CARD 1: SALDO ATUAL / REALIZADO */}
          <div 
            onClick={() => setCarouselIndex(0)}
            className="snap-center shrink-0 w-[88%] sm:w-[92%] p-5 rounded-3xl bg-gradient-to-br from-[#002d6c] via-[#003882] to-[#001d4a] border border-blue-500/40 shadow-xl cursor-pointer transition hover:border-blue-400"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-black text-blue-200 flex items-center gap-1.5">
                <Landmark size={14} className="text-[#fcca00]" />
                Saldo em Conta (Realizado)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/60 text-[#fcca00] border border-blue-400/20">
                Disponível
              </span>
            </div>

            <div className="mt-2.5">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {formatCurrency(metrics.saldoTotalContas)}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-blue-700/40 text-xs">
              <div>
                <span className="text-blue-300 text-[10px] font-bold uppercase block">Entradas Efetivadas</span>
                <span className="text-sm font-black text-emerald-400">+{formatCurrency(metrics.entradasRealizadas)}</span>
              </div>
              <div>
                <span className="text-blue-300 text-[10px] font-bold uppercase block">Saídas Pagas</span>
                <span className="text-sm font-black text-rose-400">-{formatCurrency(metrics.saidasRealizadas)}</span>
              </div>
            </div>
          </div>

          {/* CARD 2: LANÇAMENTOS FUTUROS / CACHÊS ABERTOS */}
          <div 
            onClick={() => setCarouselIndex(1)}
            className="snap-center shrink-0 w-[88%] sm:w-[92%] p-5 rounded-3xl bg-gradient-to-br from-[#121c2e] via-[#10243d] to-[#0d1726] border border-emerald-500/30 shadow-xl cursor-pointer transition hover:border-emerald-400/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-black text-emerald-300 flex items-center gap-1.5">
                <ArrowUpRight size={14} className="text-emerald-400" />
                Futuros & Cachês a Receber
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                A Entrar
              </span>
            </div>

            <div className="mt-2.5">
              <h2 className="text-3xl font-black text-emerald-400 tracking-tight">
                +{formatCurrency(metrics.futurosReceber)}
              </h2>
            </div>

            <div className="mt-4 pt-3.5 border-t border-emerald-800/30 text-xs flex items-center justify-between">
              <span className="text-zinc-400 text-[10px]">Cachês agendados e receitas pendentes</span>
              <span className="text-xs font-bold text-emerald-300">Entrada prevista</span>
            </div>
          </div>

          {/* CARD 3: TOTAL COMPROMETIDO DO MÊS */}
          <div 
            onClick={() => setCarouselIndex(2)}
            className="snap-center shrink-0 w-[88%] sm:w-[92%] p-5 rounded-3xl bg-gradient-to-br from-[#26151b] via-[#201015] to-[#140b0e] border border-rose-500/30 shadow-xl cursor-pointer transition hover:border-rose-400/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-black text-rose-300 flex items-center gap-1.5">
                <ArrowDownRight size={14} className="text-rose-400" />
                Total Comprometido do Mês
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/30">
                A Pagar
              </span>
            </div>

            <div className="mt-2.5">
              <h2 className="text-3xl font-black text-rose-400 tracking-tight">
                -{formatCurrency(metrics.comprometidoPagar)}
              </h2>
            </div>

            <div className="mt-4 pt-3.5 border-t border-rose-800/30 text-xs flex items-center justify-between">
              <span className="text-zinc-400 text-[10px]">Contas e parcelas a quitar</span>
              <span className="text-xs font-bold text-amber-300">Saída prevista</span>
            </div>
          </div>

        </div>

        {/* Indicadores de bolinha (dots) do carrossel */}
        <div className="flex items-center justify-center space-x-1.5 mt-2">
          {[0, 1, 2].map(idx => (
            <span 
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                carouselIndex === idx ? 'w-5 bg-[#fcca00]' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. AÇÕES RÁPIDAS DO EXTRATO (BOTÕES EM PÍLULA)                            */}
      {/* ========================================================================= */}
      <div 
        ref={quickActionsRef}
        className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 cursor-grab active:cursor-grabbing select-none"
      >
        <button
          onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
          className="px-3.5 py-2 rounded-2xl bg-[#003882] hover:bg-[#002d6c] text-[#fcca00] font-black text-xs transition active:scale-95 shadow-md flex items-center space-x-1.5 shrink-0 border border-blue-500/40"
        >
          <Plus size={15} />
          <span>+ Lançamento</span>
        </button>

        <button
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className={`px-3.5 py-2 rounded-2xl border font-bold text-xs transition active:scale-95 flex items-center space-x-1.5 shrink-0 ${
            showFiltersPanel || searchTerm || selectedAccountId !== 'all'
              ? 'bg-amber-500/20 text-[#fcca00] border-amber-500/40'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
          }`}
        >
          <Filter size={14} />
          <span>Filtros</span>
          {(searchTerm || selectedAccountId !== 'all') && (
            <span className="w-2 h-2 rounded-full bg-[#fcca00]" />
          )}
        </button>

        <button
          onClick={() => setIsBankImportOpen(true)}
          className="px-3.5 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition active:scale-95 flex items-center space-x-1.5 shrink-0"
        >
          <UploadCloud size={14} className="text-blue-400" />
          <span>Importar OFX/CSV</span>
        </button>

        <button
          onClick={handleExportAIReport}
          className="px-3.5 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition active:scale-95 flex items-center space-x-1.5 shrink-0"
        >
          <Sparkles size={14} className="text-purple-400" />
          <span>Relatório IA</span>
        </button>
      </div>

      {/* PAINEL EXPANSÍVEL DE BUSCA & FILTRO POR CONTA */}
      {showFiltersPanel && (
        <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-400" size={15} />
            <input
              type="text"
              placeholder="Buscar descrição, categoria ou conta..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-400 text-xs focus:border-blue-500 outline-none"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-[11px] font-bold text-zinc-400 shrink-0">Filtrar Conta:</label>
            <select
              value={selectedAccountId}
              onChange={e => setSelectedAccountId(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:border-blue-500 outline-none"
            >
              <option value="all">Todas as Contas</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FILTROS POR PERÍODO (MESES) & PÍLULAS DE STATUS                        */}
      {/* ========================================================================= */}
      
      {/* Seletor Horizontal de Meses */}
      <div 
        ref={monthsRef}
        className="overflow-x-auto no-scrollbar flex items-center space-x-1.5 py-1 border-b border-zinc-800/80 pb-2.5 cursor-grab active:cursor-grabbing select-none"
      >
        {monthList.map(item => {
          const isSelected = !isFutureOnly && selectedMonth === item.value;
          return (
            <button
              key={item.value}
              onClick={() => { setIsFutureOnly(false); setSelectedMonth(item.value); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 shrink-0 ${
                isSelected
                  ? 'bg-[#003882] text-[#fcca00] shadow-md border border-blue-500/50'
                  : item.isCurrent
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {item.label}
              {item.isCurrent && !isSelected && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#fcca00] inline-block" />
              )}
            </button>
          );
        })}

        {/* Botão de Futuros / Agendados */}
        <button
          onClick={() => setIsFutureOnly(true)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 shrink-0 flex items-center space-x-1 ${
            isFutureOnly
              ? 'bg-[#003882] text-[#fcca00] shadow-md border border-blue-500/50'
              : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock size={12} />
          <span>FUTUROS</span>
        </button>
      </div>

      {/* Pílulas de Seleção de Tipo / Status */}
      <div 
        ref={statusPillsRef}
        className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none"
      >
        {[
          { id: 'all', label: 'Tudo' },
          { id: 'paid', label: 'Realizado / Efetivado' },
          { id: 'pending', label: 'Pendente / Futuro' },
          { id: 'shows', label: 'Shows' },
          { id: 'accounts', label: 'Por Conta' }
        ].map(pill => {
          const isActive = statusFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => {
                setStatusFilter(pill.id as TypeStatusFilter);
                if (pill.id === 'accounts') setShowFiltersPanel(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 ${
                isActive
                  ? 'bg-white text-zinc-950 font-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. LISTAGEM TIMELINE AGRUPADA POR DATA (ESTILO BANCO DO BRASIL)           */}
      {/* ========================================================================= */}
      <div className="space-y-5 pt-2">
        {groupedByDate.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
            <Receipt size={32} className="mx-auto mb-2 text-zinc-400" />
            <p className="font-bold text-white mb-1">Nenhum lançamento encontrado</p>
            <p className="text-[11px]">Tente mudar os filtros ou clique em "+ Lançamento" para cadastrar.</p>
          </div>
        ) : (
          groupedByDate.map(group => {
            return (
              <div key={group.date} className="space-y-2">
                {/* CABEÇALHO DA DATA */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <h3 className="text-[11px] font-black tracking-wider text-zinc-300">
                    {formatDateHeader(group.date)}
                  </h3>
                </div>

                {/* ITENS DE LANÇAMENTO DAQUELA DATA */}
                <div className="rounded-2xl bg-[#141416] border border-zinc-800/80 overflow-hidden divide-y divide-zinc-800/60 shadow-xs">
                  {group.transactions.map(t => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    const acc = accounts.find(a => a.id === t.accountId);
                    const isIncome =
                      t.type === 'income' ||
                      t.type === 'goal_withdraw' ||
                      (t.type === 'transfer' && selectedAccountId !== 'all' && t.destinationAccountId === selectedAccountId);
                    const isPending = t.status === 'pending';
                    const Icon = getIcon(cat?.icon || 'Tag');

                    return (
                      <div
                        key={t.id}
                        onClick={() => { setEditingTransaction(t); setIsFormOpen(true); }}
                        className={`p-3.5 hover:bg-zinc-800/40 transition flex items-center justify-between cursor-pointer group ${
                          isPending ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        {/* Lado Esquerdo: Ícone da Categoria e Detalhes */}
                        <div className="flex items-center space-x-3 min-w-0">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                            style={{ 
                              backgroundColor: `${cat?.color || '#3b82f6'}20`, 
                              color: cat?.color || '#3b82f6' 
                            }}
                          >
                            <Icon size={18} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition">
                                {t.description || 'Sem descrição'}
                              </span>
                              {isPending && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-[#fcca00] border border-amber-500/30 uppercase shrink-0">
                                  Pendente
                                </span>
                              )}
                              {t.showId && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase shrink-0">
                                  Show
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-0.5">
                              <span className="truncate">{cat?.name || 'Geral'}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate text-zinc-300 font-medium">{acc?.name || 'Conta Padrão'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Lado Direito: Valor e Ação de Baixa */}
                        <div className="text-right shrink-0 flex items-center space-x-2.5">
                          <div>
                            <span className={`text-xs font-black block tracking-tight ${
                              isIncome ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {isIncome ? '+' : '-'}{formatCurrency(Math.abs(Number(t.amount) || 0))}
                            </span>
                            <span className="text-[9px] text-zinc-400 block font-medium">
                              {isPending ? 'Previsto' : 'Realizado'}
                            </span>
                          </div>

                          {/* Botão de Marcar como Pago / Recebido com 1 Toque */}
                          <button
                            onClick={(e) => handleTogglePaid(t, e)}
                            className={`p-1.5 rounded-lg border transition active:scale-95 ${
                              isPending
                                ? 'bg-zinc-800/80 hover:bg-emerald-950/60 border-zinc-700 text-zinc-400 hover:text-emerald-400'
                                : 'bg-emerald-950/40 border-emerald-600/30 text-emerald-400'
                            }`}
                            title={isPending ? "Confirmar baixa / pagamento" : "Marcar como pendente"}
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>

                          {/* Botão de Excluir Lançamento Direto */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTransaction(t.id);
                            }}
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/30 transition active:scale-95"
                            title="Excluir lançamento"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* SALDO DO DIA (Ao final de cada bloco concluído) */}
                <div className="flex items-center justify-end px-2 pt-0.5 pb-1 text-[10px] text-zinc-400 font-bold space-x-1.5">
                  <span>Saldo do dia:</span>
                  <span className={`font-black ${group.dayNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {group.dayNet >= 0 ? '+' : ''}{formatCurrency(group.dayNet)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE NOVO LANÇAMENTO / EDIÇÃO */}
      {isFormOpen && (
        <TransactionForm
          transaction={editingTransaction || undefined}
          onClose={() => { setIsFormOpen(false); setEditingTransaction(null); }}
        />
      )}

      {/* MODAL DE IMPORTAÇÃO BANCÁRIA OFX/CSV */}
      {isBankImportOpen && (
        <BankImportModal
          isOpen={isBankImportOpen}
          onClose={() => setIsBankImportOpen(false)}
        />
      )}
    </div>
  );
};
