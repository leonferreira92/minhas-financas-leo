import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Wallet, Landmark, PiggyBank, Eye, EyeOff, Plus, 
  Music, AlertTriangle, ShieldCheck, ChevronRight, 
  Calendar, MapPin, Pencil, CheckCircle2, Clock, 
  ArrowUpRight, ArrowDownRight, CreditCard, Sparkles,
  ArrowRight, UploadCloud, ArrowRightLeft, Layers, User,
  TrendingUp, TrendingDown, Calculator, FilePlus, Receipt,
  Check
} from 'lucide-react';
import { Account, AccountType, Show, ScopeType, matchesScope, Transaction } from '../types';
import { AccountBalanceModal } from './AccountBalanceModal';
import { TransactionForm } from './TransactionForm';
import { ScopeSelector } from './ScopeSelector';
import { BankImportModal } from './BankImportModal';
import { ProLaboreWithdrawModal } from './ProLaboreWithdrawModal';
import { CachePricingCalculatorModal } from './shows/CachePricingCalculatorModal';
import { AuthHeaderWidget } from './AuthHeaderWidget';
import { getAccountVinculo, getMonthlyCareerMetrics, parseCurrencyInput } from '../services/financeAggregator';
import { getIcon } from '../constants';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    accounts, 
    shows, 
    transactions,
    categories,
    settings,
    isBlurred, 
    toggleBlur, 
    activeScope,
    getBalanceSummary, 
    getSystemAlerts,
    getAccountBalance,
    addAccount
  } = useFinance();

  const careerName = settings.careerProjectName || 'Leo Ferreira';
  const userName = settings.userName || 'Leo';
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Summary do Mês
  const summary = useMemo(() => {
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    return getBalanceSummary(currentMonthStr, endOfMonth.toISOString().slice(0, 10));
  }, [getBalanceSummary, currentMonthStr, accounts, transactions, activeScope]);

  // Filtragem Dinâmica das Contas Bancárias por Módulo
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      if (activeScope === 'ALL') return true;
      if (activeScope === 'BUSINESS') {
        return a.scope === 'BUSINESS' || 
          getAccountVinculo(a) === 'MUSICO' ||
          a.name.toLowerCase().includes('pj') || 
          a.name.toLowerCase().includes('empresa') || 
          a.name.toLowerCase().includes('shows') || 
          a.name.toLowerCase().includes('show');
      }
      return a.scope !== 'BUSINESS' && getAccountVinculo(a) !== 'MUSICO';
    });
  }, [accounts, activeScope]);

  // 1. PATRIMÔNIO CONSOLIDADO: Soma de todas as contas ativas
  const consolidatedPatrimony = useMemo(() => {
    return accounts
      .filter(a => a.enabled !== false)
      .reduce((acc, a) => acc + getAccountBalance(a.id), 0);
  }, [accounts, getAccountBalance]);

  // 2. CAIXA MÚSICO / EMPRESA: Soma das contas com vinculo == 'MUSICO'
  const businessCash = useMemo(() => {
    const musicAccounts = accounts.filter(a => a.enabled !== false && getAccountVinculo(a) === 'MUSICO');

    if (musicAccounts.length > 0) {
      const musicBal = musicAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
      return parseFloat(musicBal.toFixed(2));
    }

    let netFlow = 0;
    transactions.forEach(t => {
      if (t.status !== 'paid') return;
      if (t.scope === 'BUSINESS' || t.categoryId === 'cat_33' || !!t.showId) {
        if (t.type === 'income') netFlow += Number(t.amount) || 0;
        else if (t.type === 'expense') netFlow -= Number(t.amount) || 0;
      }
    });

    return Math.max(0, parseFloat(netFlow.toFixed(2)));
  }, [accounts, transactions, getAccountBalance]);

  // 3. CAIXA PESSOAL: Soma das contas vinculadas ao Pessoal e Neutro
  const personalCash = useMemo(() => {
    const personalAccounts = accounts.filter(a => a.enabled !== false && getAccountVinculo(a) !== 'MUSICO');
    const total = personalAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
    return parseFloat(total.toFixed(2));
  }, [accounts, getAccountBalance]);

  // Total exibido de acordo com o escopo ativo
  const totalPatrimony = useMemo(() => {
    if (activeScope === 'BUSINESS') return businessCash;
    if (activeScope === 'PERSONAL') return personalCash;
    return consolidatedPatrimony;
  }, [activeScope, businessCash, personalCash, consolidatedPatrimony]);

  // Métricas de Carreira (Músico - Regime de Caixa Estrito)
  const careerMonthMetrics = useMemo(() => {
    const metrics = getMonthlyCareerMetrics(transactions, currentMonthStr);
    return {
      faturamentoMes: metrics.faturamentoReal,
      custosMes: metrics.custosReais,
      lucroLiquido: metrics.lucroLiquido,
      margemLucro: metrics.margemLucro,
      incomeCount: metrics.incomeCount,
      expenseCount: metrics.expenseCount
    };
  }, [transactions, currentMonthStr]);

  // Métricas do Mês Pessoal
  const personalMonthMetrics = useMemo(() => {
    const monthStart = `${currentMonthStr}-01`;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = `${currentMonthStr}-${String(lastDay).padStart(2, '0')}`;

    const personalIncomeTxs = transactions.filter(t => {
      if (!t.date || t.date < monthStart || t.date > monthEnd) return false;
      if (t.type !== 'income') return false;
      return t.scope !== 'BUSINESS';
    });
    const personalIncome = personalIncomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const personalExpenseTxs = transactions.filter(t => {
      if (!t.date || t.date < monthStart || t.date > monthEnd) return false;
      if (t.type !== 'expense') return false;
      return t.scope !== 'BUSINESS';
    });
    const personalExpensePaid = personalExpenseTxs.filter(t => t.status === 'paid').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const personalExpensePending = personalExpenseTxs.filter(t => t.status === 'pending').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const personalTotalExpense = personalExpensePaid + personalExpensePending;

    return {
      personalIncome,
      personalExpensePaid,
      personalExpensePending,
      personalTotalExpense,
      freeToSpend: personalCash - personalExpensePending
    };
  }, [transactions, currentMonthStr, personalCash]);

  // Próximo Show (se houver)
  const nextShow = useMemo<Show | null>(() => {
    if (activeScope === 'PERSONAL') return null;
    const upcoming = shows
      .filter(s => s.status !== 'Cancelado' && (s.date || '') >= todayStr && matchesScope(s.scope, activeScope))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [shows, todayStr, activeScope]);

  // Transações recentes para o Feed Estilo FinPay
  const recentTransactions = useMemo(() => {
    return transactions
      .filter(t => matchesScope(t.scope, activeScope))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5);
  }, [transactions, activeScope]);

  // Alertas Importantes
  const priorityAlerts = useMemo(() => {
    const systemAlerts = getSystemAlerts();
    return systemAlerts.slice(0, 2);
  }, [getSystemAlerts]);

  // Modals state
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('bank');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccColor, setNewAccColor] = useState('#22c55e');
  const [newAccScope, setNewAccScope] = useState<ScopeType>('BOTH');

  // Quick transaction modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense' | 'transfer'>('expense');

  // Bank Statement Import modal
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);

  // Pró-Labore modal
  const [isProLaboreModalOpen, setIsProLaboreModalOpen] = useState(false);

  // Calculadora Smart Cachê 360 modal
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'wallet': return Wallet;
      case 'bank': return Landmark;
      case 'savings': return PiggyBank;
      case 'investment': return CreditCard;
      default: return Landmark;
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    const initialBal = parseFloat(newAccBalance.replace(',', '.')) || 0;
    addAccount({
      name: newAccName.trim(),
      type: newAccType,
      color: newAccColor,
      initialBalance: initialBal,
      enabled: true,
      scope: newAccScope
    });
    setNewAccName('');
    setNewAccType('bank');
    setNewAccBalance('');
    setNewAccColor('#22c55e');
    setNewAccScope('BOTH');
    setIsNewAccountModalOpen(false);
  };

  const formatShowDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-5 pb-8 animate-fade-in text-white">
      
      {/* 1. HEADER DO USUÁRIO (FIGMA iBank / FinPay) */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Avatar Estilizado Fintech */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-zinc-950 font-black flex items-center justify-center text-sm shadow-md shadow-emerald-500/20 shrink-0 border border-emerald-300/40">
            {userName.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block truncate">
                {activeScope === 'BUSINESS' ? `Operação • ${careerName}` : activeScope === 'PERSONAL' ? 'Finanças Pessoais' : 'Visão Consolidada'}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-lg font-black text-white tracking-tight truncate">
              Olá, {userName} 👋
            </h1>
          </div>
        </div>

        {/* Botões Rápidos Topo */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Visibilidade do Saldo */}
          <button
            onClick={toggleBlur}
            className="p-2.5 rounded-2xl bg-[#18181b] border border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700 transition active:scale-95 shadow-xs"
            title={isBlurred ? "Exibir Valores" : "Ocultar Valores"}
          >
            {isBlurred ? <EyeOff size={17} className="text-emerald-400" /> : <Eye size={17} />}
          </button>

          {/* Importar Extrato */}
          <button
            onClick={() => setIsBankImportOpen(true)}
            className="p-2.5 rounded-2xl bg-[#18181b] border border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700 transition active:scale-95 shadow-xs"
            title="Importar extrato bancário .OFX ou .CSV"
          >
            <UploadCloud size={17} />
          </button>
        </div>
      </div>

      {/* 1.5. BARRA DE AUTENTICAÇÃO / LOGIN E NUVEM */}
      <AuthHeaderWidget />

      {/* 2. SELETOR DE MÓDULOS [ VISÃO GERAL | PESSOAL | EMPRESA ] */}
      <ScopeSelector size="sm" fullWidth={true} />

      {/* SE FOR VISÃO GERAL ('ALL'): EXPERIÊNCIA MINIMALISTA E CONSOLIDADA */}
      {activeScope === 'ALL' ? (
        <div className="space-y-4 animate-fade-in">
          {/* Card Consolidado Minimalista */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#18181b] via-[#151b17] to-[#122e1b]/50 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Saldo Geral Consolidado
                </span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Total
                </span>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-white">
                  {!isBlurred ? formatCurrency(consolidatedPatrimony) : 'R$ •••••••'}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Patrimônio total somando contas pessoais e da empresa musical
                </p>
              </div>

              {/* Divisão Pessoal x Empresa */}
              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-zinc-800/80">
                <div className="p-3 rounded-2xl bg-[#121212]/80 border border-zinc-800/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <User size={12} className="text-emerald-400" />
                    <span>Caixa Pessoal</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-white tabular-nums">
                    {!isBlurred ? formatCurrency(personalCash) : '••••'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#121212]/80 border border-zinc-800/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <Music size={12} className="text-purple-400" />
                    <span>Caixa Empresa</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-purple-300 tabular-nums">
                    {!isBlurred ? formatCurrency(businessCash) : '••••'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2 GRANDES CARDS DE ENTRADA NOS DOIS APPS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Entrar no App Pessoal */}
            <div 
              onClick={() => {
                navigate('/financeiro');
              }}
              className="p-5 rounded-3xl bg-[#18181b] border border-zinc-800 hover:border-emerald-500/40 transition cursor-pointer space-y-3 group active:scale-[0.99] shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <User size={20} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                  Acessar <ChevronRight size={14} className="ml-0.5" />
                </span>
              </div>
              <div>
                <h3 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                  Módulo Pessoal
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Controle de gastos diários, cartões de crédito, contas fixas e metas.
                </p>
              </div>
            </div>

            {/* Entrar no App Empresa */}
            <div 
              onClick={() => {
                navigate('/shows');
              }}
              className="p-5 rounded-3xl bg-[#18181b] border border-zinc-800 hover:border-purple-500/40 transition cursor-pointer space-y-3 group active:scale-[0.99] shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Music size={20} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black uppercase text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                  Acessar <ChevronRight size={14} className="ml-0.5" />
                </span>
              </div>
              <div>
                <h3 className="text-base font-black text-white group-hover:text-purple-400 transition-colors">
                  Módulo Empresa (Shows)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Agenda de apresentações, acerto de cachês, despesas e propostas.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 3. CARD PRINCIPAL DE CAIXA DEDICADO DO MÓDULO */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#18181b] via-[#1b1c22] to-[#122e1b]/40 border border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/60 space-y-4 group">
            
            {/* Ambient Glow Sutil */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              
              {/* Header do Card com Tag de Módulo */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  {activeScope === 'BUSINESS' ? 'Caixa Operacional da Empresa' : 'Saldo Pessoal Disponível'}
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  activeScope === 'BUSINESS' 
                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  {activeScope === 'BUSINESS' ? 'Empresa / Shows' : 'Finanças Pessoais'}
                </span>
              </div>

              {/* Saldo Principal */}
              <div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-white">
                  {!isBlurred ? formatCurrency(totalPatrimony) : 'R$ •••••••'}
                </div>
                
                <div className="flex items-center space-x-2 text-[11px] text-zinc-400 font-medium mt-1">
                  {activeScope === 'BUSINESS' ? (
                    <>
                      <span className={`font-bold ${careerMonthMetrics.margemLucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Lucro no mês: {!isBlurred ? formatCurrency(careerMonthMetrics.lucroLiquido) : '••••'}
                      </span>
                      <span>•</span>
                      <span>Margem: {careerMonthMetrics.margemLucro.toFixed(0)}%</span>
                    </>
                  ) : (
                    <>
                      <span className="text-zinc-300 font-bold">
                        Livre p/ Gastar: {!isBlurred ? formatCurrency(personalMonthMetrics.freeToSpend) : '••••'}
                      </span>
                      <span>•</span>
                      <span className="text-rose-400 font-medium">Contas: {!isBlurred ? formatCurrency(personalMonthMetrics.personalExpensePending) : '••••'}</span>
                    </>
                  )}
                </div>
              </div>

              {/* BOTÕES RÁPIDOS DE AÇÃO */}
              <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-4 gap-2">
                
                {/* 1. Lançar */}
                <button
                  onClick={() => {
                    setTxType('expense');
                    setIsTxModalOpen(true);
                  }}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121212] hover:bg-zinc-800/80 border border-zinc-800/80 text-white transition-all active:scale-95 group/btn"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-1 group-hover/btn:bg-emerald-500 group-hover/btn:text-zinc-950 transition-colors">
                    <Plus size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-300 tracking-tight whitespace-nowrap">
                    + Lançar
                  </span>
                </button>

                {/* 2. Nova Proposta / Show */}
                <button
                  onClick={() => navigate('/shows')}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121212] hover:bg-zinc-800/80 border border-zinc-800/80 text-white transition-all active:scale-95 group/btn"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center mb-1 group-hover/btn:bg-sky-500 group-hover/btn:text-white transition-colors">
                    <FilePlus size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-300 tracking-tight whitespace-nowrap">
                    {activeScope === 'BUSINESS' ? 'Novo Show' : 'Show'}
                  </span>
                </button>

                {/* 3. Calculadora Smart Cachê 360 */}
                <button
                  onClick={() => setIsCalculatorOpen(true)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121212] hover:bg-zinc-800/80 border border-zinc-800/80 text-white transition-all active:scale-95 group/btn"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-1 group-hover/btn:bg-amber-500 group-hover/btn:text-zinc-950 transition-colors">
                    <Calculator size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-300 tracking-tight whitespace-nowrap">
                    Smart Cachê
                  </span>
                </button>

                {/* 4. Extrato ou Pró-Labore */}
                {activeScope === 'BUSINESS' ? (
                  <button
                    onClick={() => setIsProLaboreModalOpen(true)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121212] hover:bg-zinc-800/80 border border-zinc-800/80 text-white transition-all active:scale-95 group/btn"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-1 group-hover/btn:bg-purple-500 group-hover/btn:text-white transition-colors">
                      <ArrowRightLeft size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-300 tracking-tight whitespace-nowrap">
                      Pró-Labore
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/financeiro')}
                    className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#121212] hover:bg-zinc-800/80 border border-zinc-800/80 text-white transition-all active:scale-95 group/btn"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-1 group-hover/btn:bg-indigo-500 group-hover/btn:text-white transition-colors">
                      <Receipt size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-300 tracking-tight whitespace-nowrap">
                      Extrato
                    </span>
                  </button>
                )}

              </div>

            </div>
          </div>

          {/* 4. AVISOS & PENDÊNCIAS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Avisos & Pendências
              </span>
              {priorityAlerts.length > 0 && (
                <button
                  onClick={() => navigate('/mais?tab=alerts')}
                  className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:underline"
                >
                  Ver Todos ({getSystemAlerts().length})
                </button>
              )}
            </div>

            {priorityAlerts.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-[#18181b] border border-zinc-800/80 flex items-center space-x-3 text-emerald-400 text-xs font-bold">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck size={16} strokeWidth={2.5} />
                </div>
                <span className="truncate text-zinc-200">Tudo em dia! Nenhuma pendência urgente.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {priorityAlerts.map(alert => {
                  const isUrgent = alert.type === 'overdue' || alert.type === 'risk' || alert.type === 'today';
                  return (
                    <div 
                      key={alert.id}
                      onClick={() => navigate('/mais?tab=alerts')}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer active:scale-[0.99] ${
                        isUrgent
                          ? 'bg-rose-950/20 border-rose-900/50 text-rose-300'
                          : alert.type === 'tomorrow'
                          ? 'bg-amber-950/20 border-amber-900/50 text-amber-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <AlertTriangle size={15} className="shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-xs font-black truncate text-white">{alert.title}</h4>
                          <p className="text-[10px] opacity-80 truncate">
                            {alert.type === 'overdue' ? 'Vencida' : alert.type === 'today' ? 'Vence hoje' : 'Vence em breve'}: {formatCurrency(alert.amount)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="shrink-0 ml-1 opacity-60" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. PRÓXIMO SHOW */}
          {activeScope === 'BUSINESS' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Próximo Show na Agenda
                </span>
                <button
                  onClick={() => navigate('/shows')}
                  className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:underline flex items-center"
                >
                  Agenda Completa <ChevronRight size={12} className="ml-0.5" />
                </button>
              </div>

              {nextShow ? (
                <div 
                  onClick={() => navigate('/shows')}
                  className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80 hover:border-emerald-500/40 transition cursor-pointer space-y-2.5 shadow-xs active:scale-[0.99] group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Music size={18} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase text-emerald-400 block tracking-wider truncate">
                          Show Confirmado
                        </span>
                        <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                          {nextShow.contractorName || nextShow.name || 'Apresentação'}
                        </h4>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-400 tabular-nums block">
                        {!isBlurred ? formatCurrency(nextShow.totalCache ?? nextShow.cacheCombined ?? 0) : '••••'}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-medium block">Cachê Acordado</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/80 font-medium">
                    <span className="flex items-center">
                      <Calendar size={13} className="mr-1 text-emerald-400 shrink-0" />
                      {formatShowDate(nextShow.date)} {nextShow.time ? `às ${nextShow.time}` : ''}
                    </span>
                    {nextShow.location && (
                      <span className="flex items-center truncate max-w-[150px]">
                        <MapPin size={12} className="mr-0.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{nextShow.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => navigate('/shows')}
                  className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80 flex items-center justify-between text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0">
                      <Music size={15} />
                    </div>
                    <span className="text-xs font-bold truncate">Nenhum show futuro agendado</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider shrink-0">
                    + Agendar
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 6. FEED DE ATIVIDADE RECENTE */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Últimas Movimentações
              </span>
              <button
                onClick={() => navigate('/financeiro')}
                className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:underline flex items-center"
              >
                Ver Extrato <ChevronRight size={12} className="ml-0.5" />
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#18181b] border border-dashed border-zinc-800 text-center space-y-2">
                <Receipt size={24} className="mx-auto text-zinc-500" />
                <p className="text-xs font-bold text-zinc-400">Nenhuma movimentação recente</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentTransactions.map(t => {
                  const category = categories.find(c => c.id === t.categoryId);
                  const Icon = category ? getIcon(category.icon) : Wallet;
                  const isIncome = t.type === 'income';
                  const isPending = t.status === 'pending';

                  return (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/financeiro?txId=${t.id}`)}
                      className="p-3 rounded-2xl bg-[#18181b] border border-zinc-800/80 hover:border-zinc-700 transition cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] group"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isIncome 
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700/60'
                        }`}>
                          {t.type === 'transfer' ? (
                            <ArrowRightLeft size={16} />
                          ) : (
                            <Icon size={16} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                            {t.description || 'Lançamento'}
                          </h4>
                          <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-medium">
                            <span>{formatDateLabel(t.date)}</span>
                            <span>•</span>
                            <span className="truncate">{category ? category.name : 'Geral'}</span>
                            {isPending && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400 font-bold">Agendado</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-black tabular-nums block ${
                          isIncome ? 'text-emerald-400' : 'text-zinc-200'
                        }`}>
                          {!isBlurred ? `${isIncome ? '+' : '-'}${formatCurrency(t.amount)}` : '••••'}
                        </span>
                        <span className="text-[9px] text-zinc-500 block">
                          {isPending ? 'Pendente' : 'Efetivado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 7. VALORES POR CONTA BANCÁRIA / CARTEIRAS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {activeScope === 'BUSINESS' ? 'Contas da Empresa' : activeScope === 'PERSONAL' ? 'Contas Pessoais' : 'Valores por Conta'}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400">
              {filteredAccounts.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBankImportOpen(true)}
              className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider hover:underline flex items-center"
            >
              <UploadCloud size={11} className="mr-0.5" /> Importar
            </button>
            <span className="text-zinc-700">•</span>
            <button
              onClick={() => setIsNewAccountModalOpen(true)}
              className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:underline flex items-center"
            >
              <Plus size={11} className="mr-0.5" strokeWidth={3} /> Nova
            </button>
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#18181b] text-center space-y-2 border border-dashed border-zinc-800">
            <p className="text-xs font-bold text-zinc-500">Nenhuma conta cadastrada neste módulo</p>
            <button
              onClick={() => setIsNewAccountModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-500 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider"
            >
              Criar Conta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredAccounts.map(acc => {
              const balance = getAccountBalance(acc.id);
              const AccIcon = getAccountIcon(acc.type);

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountForEdit(acc)}
                  className="p-3.5 rounded-2xl bg-[#18181b] border border-zinc-800/80 hover:border-zinc-700 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.99] group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-950 font-black shrink-0 shadow-xs"
                      style={{ backgroundColor: acc.color || '#22c55e' }}
                    >
                      <AccIcon size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-white truncate">
                        {acc.name}
                      </h4>
                      <span className="text-[9px] text-zinc-400 font-medium capitalize block truncate">
                        {acc.type === 'bank' ? 'Conta Bancária' : acc.type === 'wallet' ? 'Carteira' : acc.type === 'savings' ? 'Poupança' : 'Investimento'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-xs font-black tabular-nums block ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                      {!isBlurred ? formatCurrency(balance) : '••••'}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Ajustar
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL EDIÇÃO SALDO DA CONTA */}
      {selectedAccountForEdit && (
        <AccountBalanceModal
          account={selectedAccountForEdit}
          onClose={() => setSelectedAccountForEdit(null)}
        />
      )}

      {/* MODAL NOVA CONTA */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-[#18181b] text-white border border-zinc-800 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center">
              <Landmark size={16} className="mr-2 text-emerald-400" />
              Nova Conta ou Carteira
            </h3>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                  Nome da Conta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank, Banco do Brasil, Carteira..."
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                    Tipo
                  </label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as AccountType)}
                    className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none"
                  >
                    <option value="bank">Conta Bancária</option>
                    <option value="wallet">Carteira Física</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                  Módulo Pertencente
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccScope('PERSONAL')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                      newAccScope === 'PERSONAL'
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-xs'
                        : 'bg-[#121212] text-zinc-400 border-zinc-800'
                    }`}
                  >
                    👤 Pessoal
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccScope('BUSINESS')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                      newAccScope === 'BUSINESS'
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-xs'
                        : 'bg-[#121212] text-zinc-400 border-zinc-800'
                    }`}
                  >
                    🎸 Músico
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="w-1/2 p-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 p-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider hover:bg-emerald-400 active:scale-95 transition shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK TRANSACTION MODAL */}
      {isTxModalOpen && (
        <TransactionForm
          onClose={() => setIsTxModalOpen(false)}
          initialType={txType}
        />
      )}

      {/* BANK IMPORT MODAL */}
      <BankImportModal
        isOpen={isBankImportOpen}
        onClose={() => setIsBankImportOpen(false)}
      />

      {/* PRO-LABORE WITHDRAW MODAL */}
      <ProLaboreWithdrawModal
        isOpen={isProLaboreModalOpen}
        onClose={() => setIsProLaboreModalOpen(false)}
      />

      {/* SMART CACHÊ 360 CALCULATOR MODAL */}
      <CachePricingCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
};
