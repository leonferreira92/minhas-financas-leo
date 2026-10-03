import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Landmark, Wallet, PiggyBank, Eye, EyeOff, Plus, 
  Music, ShieldAlert, ChevronRight, Calendar, Bell,
  ArrowUpRight, ArrowDownRight, CreditCard, Sparkles,
  UploadCloud, ArrowRightLeft, User, TrendingDown,
  BarChart3, FolderTree, Receipt, CheckCircle2, ChevronLeft,
  DollarSign
} from 'lucide-react';
import { Account, Show, ScopeType, matchesScope, Transaction } from '../types';
import { AccountBalanceModal } from './AccountBalanceModal';
import { TransactionForm } from './TransactionForm';
import { BankImportModal } from './BankImportModal';
import { ShowFormModal } from './shows/ShowFormModal';
import { getAccountVinculo, getMonthlyCareerMetrics } from '../services/financeAggregator';
import { getIcon } from '../constants';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    accounts, 
    shows, 
    transactions,
    categories,
    debts,
    settings,
    isBlurred, 
    toggleBlur, 
    activeScope,
    setActiveScope,
    getBalanceSummary, 
    getSystemAlerts,
    getAccountBalance,
    addShow,
    getDebtProgress
  } = useFinance();

  const userName = settings.userName || 'Leo';
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Carousel Active Card: 0 = Pessoal/Consolidado, 1 = Músico/Shows, 2 = Dívidas/Passivos
  const [activeCardIndex, setActiveCardIndex] = useState(
    activeScope === 'BUSINESS' ? 1 : 0
  );

  const carouselRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [txInitialScope, setTxInitialScope] = useState<ScopeType | undefined>(undefined);
  const [isNewShowModalOpen, setIsNewShowModalOpen] = useState(false);
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);

  const alerts = useMemo(() => getSystemAlerts(), [getSystemAlerts]);

  // Formatação de Moeda
  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // 1. PATRIMÔNIO CONSOLIDADO: Soma de todas as contas ativas
  const consolidatedPatrimony = useMemo(() => {
    return accounts
      .filter(a => a.enabled !== false)
      .reduce((acc, a) => acc + getAccountBalance(a.id), 0);
  }, [accounts, getAccountBalance]);

  // 2. CAIXA PESSOAL
  const personalCash = useMemo(() => {
    const personalAccounts = accounts.filter(a => a.enabled !== false && getAccountVinculo(a) !== 'MUSICO');
    return personalAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [accounts, getAccountBalance]);

  // 3. CAIXA MÚSICO / EMPRESA
  const musicCash = useMemo(() => {
    const musicAccounts = accounts.filter(a => a.enabled !== false && getAccountVinculo(a) === 'MUSICO');
    if (musicAccounts.length > 0) {
      return musicAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
    }
    let net = 0;
    transactions.forEach(t => {
      if (t.status !== 'paid') return;
      if (t.scope === 'BUSINESS' || t.categoryId === 'cat_33' || !!t.showId) {
        if (t.type === 'income') net += Number(t.amount) || 0;
        else if (t.type === 'expense') net -= Number(t.amount) || 0;
      }
    });
    return Math.max(0, net);
  }, [accounts, transactions, getAccountBalance]);

  // Cachês a Receber no Mês
  const monthMusicReceivables = useMemo(() => {
    return transactions
      .filter(t => t.status === 'pending' && t.type === 'income' && (t.scope === 'BUSINESS' || t.categoryId === 'cat_33' || !!t.showId))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  // Métricas de Dívidas / Parcelas Abertas do Mês
  const debtsMonthMetrics = useMemo(() => {
    const activeDebts = debts.filter(d => getDebtProgress(d.id).status === 'active');
    const totalRemainingDebts = activeDebts.reduce((s, d) => s + getDebtProgress(d.id).remaining, 0);

    // Parcelas de dívidas vencendo no mês
    const monthDebtTxs = transactions.filter(t => 
      t.debtId && 
      t.date && 
      t.date.startsWith(currentMonthStr)
    );
    const monthDebtPaid = monthDebtTxs.filter(t => t.status === 'paid').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthDebtPending = monthDebtTxs.filter(t => t.status === 'pending').reduce((s, t) => s + (Number(t.amount) || 0), 0);

    return {
      activeDebtsCount: activeDebts.length,
      totalRemainingDebts,
      monthDebtPending,
      monthDebtPaid
    };
  }, [debts, transactions, currentMonthStr, getDebtProgress]);

  // Gastos por Categoria no Mês (para o gráfico vertical)
  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type !== 'expense' || t.status === 'cancelled') return false;
      if (!t.date || !t.date.startsWith(currentMonthStr)) return false;
      if (!matchesScope(t.scope, activeScope)) return false;

      const amt = Number(t.amount) || 0;
      totalExpense += amt;
      const catId = t.categoryId || 'cat_other';
      map.set(catId, (map.get(catId) || 0) + amt);
    });

    const list = Array.from(map.entries()).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId) || {
        id: catId,
        name: 'Geral',
        color: '#3b82f6',
        icon: 'Tag'
      };
      const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      return { cat, amount, percentage };
    }).sort((a, b) => b.amount - a.amount);

    return {
      list: list.slice(0, 5),
      totalExpense
    };
  }, [transactions, categories, currentMonthStr, activeScope]);

  // Transações Recentes
  const recentTransactions = useMemo(() => {
    return transactions
      .filter(t => matchesScope(t.scope, activeScope) && t.status !== 'cancelled')
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5);
  }, [transactions, activeScope]);

  // Sincroniza o contexto de escopo ao mudar de card no carrossel
  const handleSelectCard = (index: number) => {
    setActiveCardIndex(index);
    if (index === 0) {
      setActiveScope('PERSONAL');
    } else if (index === 1) {
      setActiveScope('BUSINESS');
    } else if (index === 2) {
      setActiveScope('ALL');
    }

    if (carouselRef.current) {
      const cardWidth = carouselRef.current.offsetWidth * 0.9;
      carouselRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  // Escuta o scroll nativo do carrossel para atualizar o índice
  const handleScrollCarousel = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const cardWidth = carouselRef.current.offsetWidth * 0.85;
    const newIdx = Math.round(scrollLeft / cardWidth);
    if (newIdx !== activeCardIndex && newIdx >= 0 && newIdx <= 2) {
      setActiveCardIndex(newIdx);
      if (newIdx === 0) setActiveScope('PERSONAL');
      else if (newIdx === 1) setActiveScope('BUSINESS');
      else if (newIdx === 2) setActiveScope('ALL');
    }
  };

  const handleOpenAddExpense = () => {
    setTxInitialType('expense');
    setTxInitialScope(activeScope === 'BUSINESS' ? 'BUSINESS' : 'PERSONAL');
    setIsTxModalOpen(true);
  };

  const handleOpenAddIncome = () => {
    setTxInitialType('income');
    setTxInitialScope(activeScope === 'BUSINESS' ? 'BUSINESS' : 'PERSONAL');
    setIsTxModalOpen(true);
  };

  const handleOpenAddMusicExpense = () => {
    setTxInitialType('expense');
    setTxInitialScope('BUSINESS');
    setIsTxModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-28 animate-fade-in text-white -mx-3.5 sm:mx-0">
      
      {/* ========================================================================= */}
      {/* CAMADA 1: HEADER PRINCIPAL COM ESTILO BANCO DO BRASIL (HEADER AZUL)       */}
      {/* ========================================================================= */}
      <div className="relative bg-gradient-to-b from-[#002d6c] via-[#003882] to-[#09090b] px-4 pt-3 pb-6 rounded-b-[2.5rem] shadow-2xl overflow-hidden border-b border-blue-900/40">
        
        {/* Barra Superior: Saudação, Notificações e Perfil */}
        <div className="flex items-center justify-between pt-1 mb-5">
          <div className="flex items-center space-x-3">
            <div 
              onClick={() => navigate('/mais')}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#fcca00] to-amber-300 p-0.5 shadow-md cursor-pointer active:scale-95 transition"
            >
              <div className="w-full h-full rounded-full bg-[#002d6c] flex items-center justify-center text-[#fcca00] font-black text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-blue-200 block">Olá,</span>
              <h1 className="text-base font-black text-white tracking-tight leading-none">
                {userName}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Botão de Ocultar/Revelar Valores */}
            <button
              onClick={() => toggleBlur()}
              className="p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-200 hover:text-white transition active:scale-95"
              title={isBlurred ? "Exibir Valores" : "Ocultar Valores"}
            >
              {isBlurred ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            {/* Central de Notificações */}
            <button
              onClick={() => navigate('/mais?tab=alerts')}
              className="p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-200 hover:text-white transition active:scale-95 relative"
              title="Notificações"
            >
              <Bell size={16} />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#fcca00] shadow-[0_0_8px_#fcca00]" />
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARROSSEL HORIZONTAL DESLIZÁVEL (SWIPE / CARD SLIDER) - 3 VISÕES          */}
        {/* ========================================================================= */}
        <div className="relative">
          <div 
            ref={carouselRef}
            onScroll={handleScrollCarousel}
            className="overflow-x-auto no-scrollbar flex snap-x snap-mandatory gap-3 pb-1"
          >
            {/* CARD 1 (VISÃO CONSOLIDADA / PESSOAL) */}
            <div 
              onClick={() => handleSelectCard(0)}
              className={`snap-center shrink-0 w-[92%] sm:w-[94%] p-5 rounded-3xl transition-all duration-300 shadow-xl cursor-pointer ${
                activeCardIndex === 0
                  ? 'bg-gradient-to-br from-[#003882] via-[#002d6c] to-[#001f4d] border border-[#fcca00]/50 ring-1 ring-[#fcca00]/30'
                  : 'bg-zinc-900/90 border border-zinc-800 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-black text-blue-200 flex items-center gap-1.5">
                  <User size={14} className="text-[#fcca00]" />
                  Visão Pessoal & Saldo Livre
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fcca00]/20 text-[#fcca00] border border-[#fcca00]/30">
                  Dia a Dia
                </span>
              </div>

              <div className="mt-3">
                <h2 className="text-3xl font-black text-white tracking-tight">
                  {formatCurrency(personalCash)}
                </h2>
                <p className="text-[10px] text-blue-200 mt-1 font-medium">Saldo disponível para gastos pessoais</p>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-blue-700/40">
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenAddExpense(); }}
                  className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-black text-xs transition active:scale-95 flex items-center justify-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Nova Despesa</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenAddIncome(); }}
                  className="py-2 px-3 rounded-xl bg-[#fcca00] hover:bg-amber-400 text-zinc-950 font-black text-xs transition active:scale-95 shadow-md flex items-center justify-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Nova Receita</span>
                </button>
              </div>
            </div>

            {/* CARD 2 (VISÃO MÚSICO / SHOWS) */}
            <div 
              onClick={() => handleSelectCard(1)}
              className={`snap-center shrink-0 w-[92%] sm:w-[94%] p-5 rounded-3xl transition-all duration-300 shadow-xl cursor-pointer ${
                activeCardIndex === 1
                  ? 'bg-gradient-to-br from-[#1c1917] via-[#292524] to-[#121214] border border-[#fcca00]/70 ring-1 ring-[#fcca00]/40'
                  : 'bg-zinc-900/90 border border-zinc-800 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-black text-amber-200 flex items-center gap-1.5">
                  <Music size={14} className="text-[#fcca00]" />
                  Visão Músico / Shows
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-[#fcca00] border border-amber-500/30">
                  Carreira
                </span>
              </div>

              <div className="mt-3">
                <h2 className="text-3xl font-black text-[#fcca00] tracking-tight">
                  {formatCurrency(musicCash)}
                </h2>
                <div className="flex items-center space-x-2 text-[10px] text-zinc-300 mt-1 font-medium">
                  <span>A receber no mês:</span>
                  <span className="font-bold text-emerald-400">+{formatCurrency(monthMusicReceivables)}</span>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4 pt-3.5 border-t border-zinc-800">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/shows'); }}
                  className="py-2 px-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition active:scale-95 shadow-md flex items-center justify-center space-x-1"
                  title="Abrir Módulo Sou Artista"
                >
                  <Music size={13} />
                  <span>Carreira</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setIsNewShowModalOpen(true); }}
                  className="py-2 px-2 rounded-xl bg-[#fcca00] hover:bg-amber-400 text-zinc-950 font-black text-xs transition active:scale-95 shadow-md flex items-center justify-center space-x-1"
                >
                  <Plus size={13} />
                  <span>Novo Show</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenAddMusicExpense(); }}
                  className="py-2 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs transition active:scale-95 flex items-center justify-center space-x-1"
                >
                  <Plus size={13} />
                  <span>Despesa</span>
                </button>
              </div>
            </div>

            {/* CARD 3 (VISÃO PASSIVOS & DÍVIDAS) */}
            <div 
              onClick={() => handleSelectCard(2)}
              className={`snap-center shrink-0 w-[92%] sm:w-[94%] p-5 rounded-3xl transition-all duration-300 shadow-xl cursor-pointer ${
                activeCardIndex === 2
                  ? 'bg-gradient-to-br from-[#1a1114] via-[#241318] to-[#120a0d] border border-rose-500/60 ring-1 ring-rose-500/40'
                  : 'bg-zinc-900/90 border border-zinc-800 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-black text-rose-200 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-rose-400" />
                  Visão Passivos & Dívidas
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {debtsMonthMetrics.activeDebtsCount} ativas
                </span>
              </div>

              <div className="mt-3">
                <h2 className="text-3xl font-black text-rose-400 tracking-tight">
                  {formatCurrency(debtsMonthMetrics.totalRemainingDebts)}
                </h2>
                <div className="flex items-center space-x-2 text-[10px] text-zinc-300 mt-1 font-medium">
                  <span>Parcelas do mês a pagar:</span>
                  <span className="font-bold text-amber-300">{formatCurrency(debtsMonthMetrics.monthDebtPending)}</span>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-rose-900/30">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/dividas'); }}
                  className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-black text-xs transition active:scale-95 flex items-center justify-center space-x-1"
                >
                  <ShieldAlert size={14} />
                  <span>Gerenciar Dívidas</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setIsBankImportOpen(true); }}
                  className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs transition active:scale-95 flex items-center justify-center space-x-1"
                >
                  <UploadCloud size={14} />
                  <span>Conciliar Extrato</span>
                </button>
              </div>
            </div>

          </div>

          {/* Dots Indicadores do Carrossel */}
          <div className="flex items-center justify-center space-x-1.5 mt-3">
            {[0, 1, 2].map(idx => (
              <button
                key={idx}
                onClick={() => handleSelectCard(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeCardIndex === idx ? 'w-6 bg-[#fcca00]' : 'w-1.5 bg-blue-300/40 hover:bg-blue-200'
                }`}
              />
            ))}
          </div>
        </div>

      </div>

      <div className="px-3.5 sm:px-4 space-y-6">
        {/* ========================================================================= */}
        {/* GRID CENTRAL DE ACESSO RÁPIDO (ESTILO BANCO DO BRASIL)                    */}
        {/* ========================================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Serviços Rápidos
            </h3>
            <span className="text-[10px] text-zinc-400 font-medium">Funções frequentes</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {/* 1. Extrato */}
            <button
              onClick={() => navigate('/lancamentos')}
              className="p-3 rounded-2xl bg-[#141416] hover:bg-zinc-800/80 border border-zinc-800 transition active:scale-95 flex flex-col items-center justify-center text-center group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-[#003882] group-hover:text-[#fcca00] flex items-center justify-center mb-1.5 transition">
                <Receipt size={18} />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white leading-tight">
                Extrato
              </span>
            </button>

            {/* 2. Agenda Shows */}
            <button
              onClick={() => navigate('/shows')}
              className="p-3 rounded-2xl bg-[#141416] hover:bg-zinc-800/80 border border-zinc-800 transition active:scale-95 flex flex-col items-center justify-center text-center group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#fcca00] group-hover:bg-amber-500 group-hover:text-zinc-950 flex items-center justify-center mb-1.5 transition">
                <Music size={18} />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white leading-tight">
                Agenda Shows
              </span>
            </button>

            {/* 3. Dívidas */}
            <button
              onClick={() => navigate('/dividas')}
              className="p-3 rounded-2xl bg-[#141416] hover:bg-zinc-800/80 border border-zinc-800 transition active:scale-95 flex flex-col items-center justify-center text-center group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center mb-1.5 transition">
                <CreditCard size={18} />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white leading-tight">
                Dívidas
              </span>
            </button>

            {/* 4. Conciliação OFX/CSV */}
            <button
              onClick={() => setIsBankImportOpen(true)}
              className="p-3 rounded-2xl bg-[#141416] hover:bg-zinc-800/80 border border-zinc-800 transition active:scale-95 flex flex-col items-center justify-center text-center group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center mb-1.5 transition">
                <UploadCloud size={18} />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white leading-tight">
                Conciliação
              </span>
            </button>

            {/* 5. Relatório IA */}
            <button
              onClick={() => navigate('/relatorios?tab=ai')}
              className="p-3 rounded-2xl bg-[#141416] hover:bg-zinc-800/80 border border-zinc-800 transition active:scale-95 flex flex-col items-center justify-center text-center group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center mb-1.5 transition">
                <Sparkles size={18} />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white leading-tight">
                Relatório IA
              </span>
            </button>

            {/* 6. Categorias */}
            <button
              onClick={() => navigate('/mais?tab=categories')}
              className="p-3 rounded-2xl bg-[#141416] hover:bg-zinc-800/80 border border-zinc-800 transition active:scale-95 flex flex-col items-center justify-center text-center group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center mb-1.5 transition">
                <FolderTree size={18} />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white leading-tight">
                Categorias
              </span>
            </button>

            {/* 7. Gráficos/Gastos */}
            <button
              onClick={() => navigate('/gastos')}
              className="p-3 rounded-2xl bg-[#141416] hover:bg-zinc-800/80 border border-zinc-800 transition active:scale-95 flex flex-col items-center justify-center text-center group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center mb-1.5 transition">
                <BarChart3 size={18} />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white leading-tight">
                Meus Gastos
              </span>
            </button>

            {/* 8. Saldo das Contas */}
            <button
              onClick={() => navigate('/contas')}
              className="p-3 rounded-2xl bg-[#141416] hover:bg-zinc-800/80 border border-zinc-800 transition active:scale-95 flex flex-col items-center justify-center text-center group shadow-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center mb-1.5 transition">
                <Landmark size={18} />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 group-hover:text-white leading-tight">
                Contas
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CAMADA 2: PAINÉIS LADO A LADO NO DESKTOP (CONTAS & GASTOS DO MÊS)         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* PAINEL "SALDO DAS CONTAS" (RESUMO CONSOLIDADO) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#141416] border border-zinc-800 shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Landmark size={16} className="text-[#003882] dark:text-[#fcca00]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Saldo das Contas
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/contas')}
                  className="text-[11px] text-[#fcca00] hover:underline font-bold flex items-center gap-0.5"
                >
                  <span>Ver todas</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Lista Compacta de Contas */}
              <div className="divide-y divide-zinc-800/60 pt-1">
                {accounts.slice(0, 3).map(acc => {
                  const balance = getAccountBalance(acc.id);
                  return (
                    <div 
                      key={acc.id}
                      onClick={() => setSelectedAccountForEdit(acc)}
                      className="py-2.5 flex items-center justify-between hover:bg-zinc-800/40 px-1 rounded-xl transition cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${acc.color || '#003882'}20`, color: acc.color || '#003882' }}
                        >
                          <Landmark size={15} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate block">
                            {acc.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 block capitalize">
                            {acc.vinculo === 'MUSICO' ? 'Música' : 'Pessoal'}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-white">
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Total Consolidado:</span>
              <span className="text-sm font-black text-[#fcca00]">
                {formatCurrency(consolidatedPatrimony)}
              </span>
            </div>
          </div>

          {/* PAINEL ANÁLISE DE GASTOS ("MEUS GASTOS / GRÁFICOS") */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#141416] border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 size={16} className="text-[#fcca00]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Meus Gastos do Mês
                </h3>
              </div>
              <button
                onClick={() => navigate('/gastos')}
                className="text-[11px] text-[#fcca00] hover:underline font-bold flex items-center gap-0.5"
              >
                <span>Ver detalhes</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-white tracking-tight">
                  {formatCurrency(topCategories.totalExpense)}
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">Total gasto em {new Date().toLocaleDateString('pt-BR', { month: 'long' })}</p>
              </div>
              <button
                onClick={() => navigate('/gastos')}
                className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold hover:bg-blue-500/20 transition"
              >
                Gráficos completos
              </button>
            </div>

            {/* Mini Gráfico de Barras Verticais */}
            {topCategories.list.length === 0 ? (
              <div className="py-6 text-center text-zinc-400 text-xs">
                Nenhuma despesa registrada neste mês.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="h-28 flex items-end justify-between gap-2 px-1 border-b border-zinc-800 pb-2">
                  {topCategories.list.map(item => {
                    const maxAmt = topCategories.list[0]?.amount || 1;
                    const heightPct = Math.max(15, Math.round((item.amount / maxAmt) * 100));
                    return (
                      <div key={item.cat.id} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <span className="text-[9px] font-bold text-zinc-400 mb-1">
                          {item.percentage.toFixed(0)}%
                        </span>
                        <div className="w-full max-w-[28px] bg-zinc-800 rounded-t-md overflow-hidden flex flex-col justify-end" style={{ height: `${heightPct}%` }}>
                          <div 
                            className="w-full h-full rounded-t-md transition"
                            style={{ backgroundColor: item.cat.color || '#3b82f6' }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-zinc-400 mt-1 truncate w-full text-center">
                          {item.cat.name.slice(0, 5)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Lista dos Maiores Gastos */}
                <div className="space-y-1.5">
                  {topCategories.list.slice(0, 3).map((item, idx) => (
                    <div key={item.cat.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.cat.color || '#3b82f6' }}
                        />
                        <span className="text-zinc-300 font-bold truncate text-[11px]">{item.cat.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-white text-[11px]">{formatCurrency(item.amount)}</span>
                        <span className="text-[9px] text-zinc-400 ml-1.5">({item.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ATIVIDADE RECENTE (COM ATALHO PARA EXTRATO)                               */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Atividade Recente
            </h3>
            <button
              onClick={() => navigate('/lancamentos')}
              className="text-[11px] text-[#fcca00] hover:underline font-bold flex items-center gap-0.5"
            >
              <span>Ver extrato</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#141416] border border-zinc-800 text-center text-xs text-zinc-400">
              Nenhuma movimentação registrada recentemente.
            </div>
          ) : (
            <div className="rounded-2xl bg-[#141416] border border-zinc-800 overflow-hidden divide-y divide-zinc-800/60 shadow-xs">
              {recentTransactions.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const Icon = getIcon(cat?.icon || 'Tag');
                const isIncome = t.type === 'income';

                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/lancamentos?highlightId=${t.id}`)}
                    className="p-3.5 hover:bg-zinc-800/40 transition flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat?.color || '#3b82f6'}20`, color: cat?.color || '#3b82f6' }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate block">
                          {t.description}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          {cat?.name || 'Geral'} · {t.date}
                        </span>
                      </div>
                    </div>

                    <span className={`text-xs font-black ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(Number(t.amount) || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE LANÇAMENTO */}
      {isTxModalOpen && (
        <TransactionForm
          initialType={txInitialType}
          onClose={() => setIsTxModalOpen(false)}
        />
      )}

      {/* MODAL DE NOVO SHOW */}
      {isNewShowModalOpen && (
        <ShowFormModal
          isOpen={isNewShowModalOpen}
          onClose={() => setIsNewShowModalOpen(false)}
          existingShows={shows}
          onSave={(showData, initialDepositTx) => {
            addShow(showData as any);
            setIsNewShowModalOpen(false);
          }}
        />
      )}

      {/* MODAL DE IMPORTAÇÃO BANCÁRIA OFX/CSV */}
      {isBankImportOpen && (
        <BankImportModal
          isOpen={isBankImportOpen}
          onClose={() => setIsBankImportOpen(false)}
        />
      )}

      {/* MODAL DE CONCILIAÇÃO / AJUSTE DE CONTA */}
      {selectedAccountForEdit && (
        <AccountBalanceModal
          account={selectedAccountForEdit}
          onClose={() => setSelectedAccountForEdit(null)}
        />
      )}
    </div>
  );
};
