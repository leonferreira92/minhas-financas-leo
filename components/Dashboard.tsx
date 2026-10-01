import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Wallet, Landmark, PiggyBank, Eye, EyeOff, Plus, 
  Music, AlertTriangle, ShieldCheck, ChevronRight, 
  Calendar, MapPin, Pencil, CheckCircle2, Clock, 
  ArrowUpRight, ArrowDownRight, CreditCard, Sparkles,
  ArrowRight, UploadCloud, ArrowRightLeft, Layers, User,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { Account, AccountType, Show, ScopeType, matchesScope } from '../types';
import { AccountBalanceModal } from './AccountBalanceModal';
import { TransactionForm } from './TransactionForm';
import { ScopeSelector } from './ScopeSelector';
import { BankImportModal } from './BankImportModal';
import { ProLaboreWithdrawModal } from './ProLaboreWithdrawModal';
import { getAccountVinculo, getMonthlyCareerMetrics, parseCurrencyInput } from '../services/financeAggregator';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    accounts, 
    shows, 
    transactions,
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
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Summary do Mês
  const summary = useMemo(() => {
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    return getBalanceSummary(currentMonthStr, endOfMonth.toISOString().slice(0, 10));
  }, [getBalanceSummary, currentMonthStr, accounts, transactions, activeScope]);

  // DIRETRIZ 4: Filtragem Dinâmica das Contas Bancárias por Módulo
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      if (activeScope === 'ALL') return true;
      if (activeScope === 'BUSINESS') {
        return a.scope === 'BUSINESS' || 
          a.name.toLowerCase().includes('pj') || 
          a.name.toLowerCase().includes('empresa') || 
          a.name.toLowerCase().includes('shows') || 
          a.name.toLowerCase().includes('show') || 
          a.name.toLowerCase().includes('música') || 
          a.name.toLowerCase().includes('musica');
      }
      // Módulo PESSOAL: apenas contas não exclusivas de empresa
      return a.scope !== 'BUSINESS';
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

    // Se nenhuma conta for atrelada como MUSICO, calcula pelo fluxo liquido das movimentacoes de escopo BUSINESS
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

  // Dinheiro Disponível
  const availableMoney = totalPatrimony;

  // DIRETRIZ 2: Métricas do Mês para Card Resumo da Carreira (Músico - Regime de Caixa Estrito)
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

  // DIRETRIZ 2: Métricas do Mês para Card Resumo Pessoal
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
      .filter(s => s.status !== 'Cancelado' && s.date >= todayStr && matchesScope(s.scope, activeScope))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [shows, todayStr, activeScope]);

  // Alertas Importantes (no máximo 2)
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
  const [newAccColor, setNewAccColor] = useState('#6366f1');
  const [newAccScope, setNewAccScope] = useState<ScopeType>('BOTH');

  // Quick transaction modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense' | 'transfer'>('expense');

  // Bank Statement Import modal
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);

  // Pró-Labore modal
  const [isProLaboreModalOpen, setIsProLaboreModalOpen] = useState(false);

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
    setNewAccColor('#6366f1');
    setNewAccScope('BOTH');
    setIsNewAccountModalOpen(false);
  };

  const formatShowDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 sm:space-y-5 pb-16 animate-fade-in">
      
      {/* 1. TOPO: SAUDAÇÃO + AÇÕES RÁPIDAS + SELETOR DE MÓDULO */}
      <div className="space-y-3 pt-1">
        {/* Linha 1: Saudação e Ações Compactas */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 block truncate">
              {activeScope === 'BUSINESS' ? `Operação • ${careerName}` : activeScope === 'PERSONAL' ? 'Finanças Pessoais' : 'Visão Consolidada'}
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              Olá, {settings.userName || 'Leo'} 👋
            </h1>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Ocultar/Exibir Valores */}
            <button
              onClick={toggleBlur}
              className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 shadow-xs"
              title={isBlurred ? "Exibir Valores" : "Ocultar Valores"}
            >
              {isBlurred ? <EyeOff size={16} className="text-indigo-500" /> : <Eye size={16} />}
            </button>

            {/* Importar Extrato */}
            <button
              onClick={() => setIsBankImportOpen(true)}
              className="px-2.5 sm:px-3 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[11px] font-black uppercase tracking-wider transition active:scale-95 shadow-xs flex items-center space-x-1"
              title="Importar extrato bancário .OFX ou .CSV"
            >
              <UploadCloud size={14} strokeWidth={2.5} />
              <span className="hidden xs:inline sm:inline">Importar</span>
            </button>

            {/* Nova Movimentação */}
            <button
              onClick={() => {
                setTxType('expense');
                setIsTxModalOpen(true);
              }}
              className="px-3 sm:px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider transition active:scale-95 shadow-xs flex items-center space-x-1"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Novo</span>
            </button>
          </div>
        </div>

        {/* Linha 2: Barra de Módulos [ TUDO | PESSOAL | MÚSICO ] 100% responsiva */}
        <ScopeSelector size="sm" fullWidth={true} />
      </div>

      {/* 2. DOBRA 1: CARD RESUMO UNIFICADO (DESIGN SYSTEM MODERNO FINTECH) */}
      
      {/* CASO A: MÓDULO MÚSICO / EMPRESA SELECIONADO */}
      {activeScope === 'BUSINESS' && (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-purple-800/30 space-y-4">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            {/* Header do Card Carreira */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300 truncate">
                  Resumo da Carreira • {careerName}
                </span>
              </div>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 text-purple-200 border border-purple-400/20 shrink-0">
                Mês Atual
              </span>
            </div>

            {/* Métrica Principal: Lucro Líquido do Mês */}
            <div>
              <span className="text-[11px] text-slate-300 font-medium block">
                Lucro Líquido do Mês
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-0.5 truncate">
                {!isBlurred ? formatCurrency(careerMonthMetrics.lucroLiquido) : 'R$ •••••••'}
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium mt-1">
                <span className={`font-bold ${careerMonthMetrics.margemLucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Margem: {careerMonthMetrics.margemLucro.toFixed(0)}%
                </span>
                <span>•</span>
                <span>Caixa de Shows: {!isBlurred ? formatCurrency(businessCash) : '••••'}</span>
              </div>
            </div>

            {/* Divisão em 2 Colunas: Faturamento e Custos */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2.5">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                  Faturamento (Shows)
                </span>
                <span className="text-sm sm:text-base font-black tabular-nums text-emerald-400 block mt-0.5 truncate">
                  {!isBlurred ? formatCurrency(careerMonthMetrics.faturamentoMes) : '••••'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                  {careerMonthMetrics.incomeCount} {careerMonthMetrics.incomeCount === 1 ? 'recebimento' : 'recebimentos'}
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                  Custos & Equipamentos
                </span>
                <span className="text-sm sm:text-base font-black tabular-nums text-rose-300 block mt-0.5 truncate">
                  {!isBlurred ? formatCurrency(careerMonthMetrics.custosMes) : '••••'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                  {careerMonthMetrics.expenseCount} {careerMonthMetrics.expenseCount === 1 ? 'despesa' : 'despesas'}
                </span>
              </div>
            </div>

            {/* Botão de Destaque: Retirar Pró-Labore */}
            <div className="pt-1">
              <button
                onClick={() => setIsProLaboreModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-purple-950/40 active:scale-95 transition flex items-center justify-center space-x-2"
                title="Transferir saldo de shows para a conta pessoal"
              >
                <ArrowRightLeft size={14} strokeWidth={2.5} />
                <span>Retirar Pró-Labore para o Pessoal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASO B: MÓDULO PESSOAL SELECIONADO */}
      {activeScope === 'PERSONAL' && (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-indigo-800/30 space-y-4">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            {/* Header do Card Pessoal */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                Caixa & Reserva Pessoal
              </span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-indigo-400/20">
                Pessoal
              </span>
            </div>

            {/* Métrica Principal: Saldo Pessoal / Reserva */}
            <div>
              <span className="text-[11px] text-slate-300 font-medium block">
                Saldo da Reserva / Pessoal
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white mt-0.5 truncate">
                {!isBlurred ? formatCurrency(personalCash) : 'R$ •••••••'}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Contas bancárias e carteira física pessoal
              </p>
            </div>

            {/* Divisão em 2 Colunas: Compromissos do Mês & Livre p/ Gastar */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2.5">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                  Compromissos do Mês
                </span>
                <span className="text-sm sm:text-base font-black tabular-nums text-rose-300 block mt-0.5 truncate">
                  {!isBlurred ? formatCurrency(personalMonthMetrics.personalTotalExpense) : '••••'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                  {formatCurrency(personalMonthMetrics.personalExpensePending)} a pagar
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                  Livre p/ Gastar
                </span>
                <span className={`text-sm sm:text-base font-black tabular-nums block mt-0.5 truncate ${
                  personalMonthMetrics.freeToSpend >= 0 ? 'text-indigo-300' : 'text-rose-400'
                }`}>
                  {!isBlurred ? formatCurrency(personalMonthMetrics.freeToSpend) : '••••'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                  Após contas pendentes
                </span>
              </div>
            </div>

            {/* Atalho Rápido Pessoal */}
            <div className="pt-1 flex items-center space-x-2">
              <button
                onClick={() => navigate('/financeiro')}
                className="w-full py-2 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
              >
                <span>Ver Extrato Pessoal</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASO C: MÓDULO TUDO (CONSOLIDADO) */}
      {activeScope === 'ALL' && (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-800/80 space-y-4">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Patrimônio Total Consolidado
              </span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 text-indigo-300">
                Consolidado
              </span>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white truncate">
                {!isBlurred ? formatCurrency(totalPatrimony) : 'R$ •••••••'}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                Caixa dos Shows + Contas Bancárias Pessoais
              </p>
            </div>

            {/* Divisão dos Caixas: Pessoal vs Músico */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2.5">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                  👤 Caixa Pessoal
                </span>
                <span className="text-sm sm:text-base font-black tabular-nums text-indigo-300 block mt-0.5 truncate">
                  {!isBlurred ? formatCurrency(personalCash) : '••••'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                  Reserva acumulada
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block truncate">
                  🎸 Caixa Músico
                </span>
                <span className="text-sm sm:text-base font-black tabular-nums text-purple-300 block mt-0.5 truncate">
                  {!isBlurred ? formatCurrency(businessCash) : '••••'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                  Caixa operacional
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DOBRA 2: ALERTAS / CONTAS PENDENTES DO MÊS (CARDS COMPACTOS) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Avisos & Pendências
          </span>
          {priorityAlerts.length > 0 && (
            <button
              onClick={() => navigate('/mais?tab=alerts')}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline"
            >
              Ver Todos ({getSystemAlerts().length})
            </button>
          )}
        </div>

        {priorityAlerts.length === 0 ? (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-2.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <ShieldCheck size={18} strokeWidth={2.5} className="shrink-0" />
            <span className="truncate">Tudo em dia! Nenhuma conta vencida ou pendência urgente.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {priorityAlerts.map(alert => {
              const isUrgent = alert.type === 'overdue' || alert.type === 'risk' || alert.type === 'today';
              return (
                <div 
                  key={alert.id}
                  onClick={() => navigate('/mais?tab=alerts')}
                  className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer active:scale-[0.99] ${
                    isUrgent
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                      : alert.type === 'tomorrow'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                      : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <AlertTriangle size={15} className="shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-black truncate">{alert.title}</h4>
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

      {/* 4. DOBRA 3: BLOCO CONDICIONAL (SE MÚSICO -> PRÓXIMOS SHOWS; SE PESSOAL -> SALDOS DAS CONTAS) */}
      
      {/* 4.1 BLOCO PRÓXIMOS SHOWS (Exibido para MÚSICO ou TUDO) */}
      {(activeScope === 'BUSINESS' || (activeScope === 'ALL' && nextShow)) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Agenda de Shows
            </span>
            <button
              onClick={() => navigate('/shows')}
              className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider hover:underline flex items-center"
            >
              Ver Shows <ChevronRight size={12} className="ml-0.5" />
            </button>
          </div>

          {nextShow ? (
            <div 
              onClick={() => navigate('/shows')}
              className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-indigo-500/10 border border-sky-500/20 hover:border-sky-500/40 transition cursor-pointer space-y-2 shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Music size={15} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase text-sky-700 dark:text-sky-400 block tracking-wider truncate">
                      Próximo Show Agendado
                    </span>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {nextShow.contractorName || nextShow.name || 'Show Agendado'}
                    </h4>
                  </div>
                </div>

                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                  {!isBlurred ? formatCurrency(nextShow.totalCache ?? nextShow.cacheCombined) : '••••'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-sky-100 dark:border-sky-900/40 font-medium">
                <span className="flex items-center">
                  <Calendar size={12} className="mr-1 text-sky-600 shrink-0" />
                  {formatShowDate(nextShow.date)} {nextShow.time ? `às ${nextShow.time}` : ''}
                </span>
                {nextShow.location && (
                  <span className="flex items-center truncate max-w-[150px]">
                    <MapPin size={11} className="mr-0.5 text-slate-400 shrink-0" />
                    <span className="truncate">{nextShow.location}</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div 
              onClick={() => navigate('/shows')}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                  <Music size={14} />
                </div>
                <span className="text-xs font-bold truncate">Nenhum show futuro agendado</span>
              </div>
              <span className="text-[10px] font-black text-sky-600 uppercase tracking-wider shrink-0">
                + Agendar
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4.2 BLOCO VALORES POR CONTA (Exibido para PESSOAL, TUDO ou MÚSICO se houver contas filtradas) */}
      {(activeScope === 'PERSONAL' || activeScope === 'ALL' || (activeScope === 'BUSINESS' && filteredAccounts.length > 0)) && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {activeScope === 'BUSINESS' ? 'Contas da Empresa' : activeScope === 'PERSONAL' ? 'Contas Pessoais' : 'Valores por Conta'}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {filteredAccounts.length}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsBankImportOpen(true)}
                className="text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-wider hover:underline flex items-center"
              >
                <UploadCloud size={11} className="mr-0.5" /> Importar
              </button>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                onClick={() => setIsNewAccountModalOpen(true)}
                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline flex items-center"
              >
                <Plus size={11} className="mr-0.5" strokeWidth={3} /> Nova
              </button>
            </div>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500">Nenhuma conta cadastrada neste módulo</p>
              <button
                onClick={() => setIsNewAccountModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
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
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.99] group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: acc.color || '#6366f1' }}
                      >
                        <AccIcon size={15} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {acc.name}
                        </h4>
                        <span className="text-[9px] text-slate-400 font-medium capitalize block truncate">
                          {acc.type === 'bank' ? 'Conta Bancária' : acc.type === 'wallet' ? 'Carteira' : acc.type === 'savings' ? 'Poupança' : 'Investimento'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className={`text-xs font-black tabular-nums block ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                        {!isBlurred ? formatCurrency(balance) : '••••'}
                      </span>
                      <span className="text-[8px] text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        Ajustar
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. ATALHO CONVITE PARA O FINANCEIRO */}
      <div 
        onClick={() => navigate('/financeiro')}
        className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between cursor-pointer hover:bg-indigo-100/70 transition active:scale-[0.99]"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Wallet size={16} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 truncate">
              Gestão Financeira Completa
            </h4>
            <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400 font-medium truncate">
              Extrato, dívidas, metas, análises e DRE
            </p>
          </div>
        </div>

        <ArrowRight size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center">
              <Landmark size={16} className="mr-2 text-indigo-600 dark:text-indigo-400" />
              Nova Conta ou Carteira
            </h3>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Nome da Conta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nubank, Banco do Brasil, Carteira..."
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Tipo
                  </label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as AccountType)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="bank">Conta Bancária</option>
                    <option value="wallet">Carteira Física</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Módulo Pertencente
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccScope('PERSONAL')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                      newAccScope === 'PERSONAL'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    👤 Pessoal
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccScope('BUSINESS')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                      newAccScope === 'BUSINESS'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
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
                  className="w-1/2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 p-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition shadow-md"
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
    </div>
  );
};
