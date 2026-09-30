import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Wallet, Landmark, PiggyBank, Eye, EyeOff, Plus, 
  Music, AlertTriangle, ShieldCheck, ChevronRight, 
  Calendar, MapPin, Pencil, CheckCircle2, Clock, 
  ArrowUpRight, ArrowDownRight, CreditCard, Sparkles,
  ArrowRight
} from 'lucide-react';
import { Account, AccountType, Show, ScopeType, matchesScope } from '../types';
import { AccountBalanceModal } from './AccountBalanceModal';
import { TransactionForm } from './TransactionForm';
import { ScopeSelector } from './ScopeSelector';
import { CareerDRECard } from './CareerDRECard';

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

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Summary
  const summary = useMemo(() => {
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    return getBalanceSummary(currentMonth, endOfMonth.toISOString().slice(0, 10));
  }, [getBalanceSummary, currentMonth, accounts, transactions, activeScope]);

  // Contas filtradas pelo escopo
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => matchesScope(a.scope, activeScope));
  }, [accounts, activeScope]);

  // Total Patrimony: sum of all active accounts
  const consolidatedPatrimony = useMemo(() => {
    return accounts.filter(a => a.enabled !== false).reduce((acc, a) => acc + getAccountBalance(a.id), 0);
  }, [accounts, getAccountBalance]);

  // DIRETRIZ 1 & 4: Isolamento de Caixas a partir de 01/10/2026
  // Saldo de Caixa dos Shows: Movimentações pagas de música a partir de 01/10/2026 + contas dedicadas a BUSINESS
  const businessCash = useMemo(() => {
    const businessAccountsInitial = accounts
      .filter(a => a.scope === 'BUSINESS')
      .reduce((s, a) => s + (Number(a.initialBalance) || 0), 0);

    let netFlow = 0;
    transactions.forEach(t => {
      if (t.status !== 'paid') return;
      if (t.date >= '2026-10-01') {
        if (t.scope === 'BUSINESS') {
          if (t.type === 'income') netFlow += Number(t.amount) || 0;
          else if (t.type === 'expense') netFlow -= Number(t.amount) || 0;
        }
      }
    });

    return parseFloat((businessAccountsInitial + netFlow).toFixed(2));
  }, [accounts, transactions]);

  // Caixa Pessoal (Patrimônio / Reserva): Histórico acumulado até 30/09/2026 + fluxos pessoais a partir de 01/10/2026
  const personalCash = useMemo(() => {
    return parseFloat((consolidatedPatrimony - businessCash).toFixed(2));
  }, [consolidatedPatrimony, businessCash]);

  // Total exibido de acordo com o escopo ativo
  const totalPatrimony = useMemo(() => {
    if (activeScope === 'BUSINESS') return businessCash;
    if (activeScope === 'PERSONAL') return personalCash;
    return consolidatedPatrimony;
  }, [activeScope, businessCash, personalCash, consolidatedPatrimony]);

  // Dinheiro Disponível (em contas ativas operacionais)
  const availableMoney = totalPatrimony;

  // Próximo Show (se houver)
  const nextShow = useMemo<Show | null>(() => {
    if (activeScope === 'PERSONAL') return null;
    const upcoming = shows
      .filter(s => s.status !== 'Cancelado' && s.date >= todayStr && matchesScope(s.scope, activeScope))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    
    return upcoming.length > 0 ? upcoming[0] : null;
  }, [shows, todayStr, activeScope]);

  // Alertas Importantes (no máximo 2 ou 3)
  const priorityAlerts = useMemo(() => {
    const systemAlerts = getSystemAlerts();
    return systemAlerts.slice(0, 3);
  }, [getSystemAlerts]);

  // Account modal states
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

  // Helper for date tag
  const formatShowDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-5 pb-16 animate-fade-in">
      {/* 1. HEADER SUPERIOR COM SELETOR DE ESCOPO GLOBAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
            Visão Rápida
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Olá, seja bem-vindo
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {/* Seletor Global de Escopo: [ 🔄 Todos | 👤 Pessoal | 🎤 Shows ] */}
          <ScopeSelector size="sm" />

          <button
            onClick={() => {
              setTxType('expense');
              setIsTxModalOpen(true);
            }}
            className="px-3 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition shadow-sm flex items-center space-x-1"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Novo</span>
          </button>

          <button
            onClick={toggleBlur}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 shadow-sm"
            title={isBlurred ? "Exibir Valores" : "Ocultar Valores"}
          >
            {isBlurred ? <EyeOff size={18} className="text-indigo-500" /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* DRE SIMPLIFICADO DE SHOWS (Quando 'BUSINESS' ou 'ALL' ativo) */}
      {(activeScope === 'BUSINESS' || activeScope === 'ALL') && (
        <CareerDRECard />
      )}

      {/* 2. CARD PRINCIPAL: PATRIMÔNIO TOTAL & DINHEIRO DISPONÍVEL */}
      <div className="relative overflow-hidden bg-slate-900 dark:bg-slate-900 text-white rounded-[2.2rem] p-6 shadow-xl border border-slate-800/80 space-y-5">
        {/* Glow ambient accents */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* PATRIMÔNIO / CAIXA CONFORME ESCOPO */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                {activeScope === 'BUSINESS' ? 'Saldo do Caixa dos Shows (Empresa)' : activeScope === 'PERSONAL' ? 'Caixa Pessoal (Patrimônio & Reserva)' : 'Patrimônio Total'}
              </span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 text-indigo-300">
                {activeScope === 'BUSINESS' ? 'Shows' : activeScope === 'PERSONAL' ? 'Pessoal' : 'Consolidado'}
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-white mt-0.5">
              {!isBlurred ? formatCurrency(totalPatrimony) : 'R$ •••••••'}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
              {activeScope === 'BUSINESS' 
                ? (settings.careerProjectName ? `Operação oficial • ${settings.careerProjectName}` : 'Operação oficial do Projeto') 
                : 'Contas bancárias + Caixa Livre Real'}
            </p>
          </div>

          {/* DIVISÃO EM 2 COLUNAS: DINHEIRO DISPONÍVEL & LIVRE P/ GASTAR */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Dinheiro Disponível
              </span>
              <span className="text-base font-black tabular-nums text-emerald-400 block mt-0.5">
                {!isBlurred ? formatCurrency(availableMoney) : '••••'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                {activeScope === 'BUSINESS' ? 'Disponível no caixa de shows' : 'Saldo em contas ativas'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Livre p/ Gastar
              </span>
              <span className={`text-base font-black tabular-nums block mt-0.5 ${summary.freeToSpend >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                {!isBlurred ? formatCurrency(summary.freeToSpend) : '••••'}
              </span>
              <span className="text-[9px] text-slate-400 font-medium block truncate mt-0.5">
                Após contas pendentes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ALERTAS IMPORTANTES (NO MÁXIMO 2 OU 3) */}
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
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-3 text-emerald-700 dark:text-emerald-400">
            <ShieldCheck size={20} strokeWidth={2.5} className="shrink-0" />
            <div className="text-xs font-bold">
              Tudo em dia! Nenhuma pendência urgente no momento.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {priorityAlerts.map(alert => {
              const isUrgent = alert.type === 'overdue' || alert.type === 'risk' || alert.type === 'today';
              return (
                <div 
                  key={alert.id}
                  onClick={() => navigate('/mais?tab=alerts')}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer active:scale-[0.99] ${
                    isUrgent
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
                      : alert.type === 'tomorrow'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300'
                      : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <AlertTriangle size={16} className="shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-xs font-black truncate">{alert.title}</h4>
                      <p className="text-[10px] opacity-80 truncate">
                        {alert.type === 'overdue' ? 'Vencida' : alert.type === 'today' ? 'Vence hoje' : alert.type === 'tomorrow' ? 'Vence amanhã' : 'Atenção'}: {formatCurrency(alert.amount)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="shrink-0 ml-2 opacity-60" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. CARD DO PRÓXIMO SHOW (SE HOUVER) */}
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
            className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-indigo-500/10 border border-sky-500/20 hover:border-sky-500/40 transition cursor-pointer space-y-2.5 shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
                  <Music size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-sky-700 dark:text-sky-400 block tracking-wider">
                    Próximo Show
                  </span>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {nextShow.contractorName || nextShow.name || 'Show Agendado'}
                  </h4>
                </div>
              </div>

              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {!isBlurred ? formatCurrency(nextShow.totalCache ?? nextShow.cacheCombined) : '••••'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-sky-100 dark:border-sky-900/40 font-medium">
              <span className="flex items-center">
                <Calendar size={12} className="mr-1 text-sky-600" />
                {formatShowDate(nextShow.date)} {nextShow.time ? `às ${nextShow.time}` : ''}
              </span>
              {nextShow.location && (
                <span className="flex items-center truncate max-w-[140px]">
                  <MapPin size={12} className="mr-1 text-slate-400 shrink-0" />
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
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <Music size={16} />
              </div>
              <span className="text-xs font-bold">Nenhum show futuro agendado</span>
            </div>
            <button className="text-[10px] font-black text-sky-600 uppercase tracking-wider">
              + Agendar
            </button>
          </div>
        )}
      </div>

      {/* 5. VALORES POR CONTA (MINHAS CONTAS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Valores por Conta
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              {accounts.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsNewAccountModalOpen(true)}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline flex items-center"
            >
              <Plus size={12} className="mr-0.5" strokeWidth={3} /> Nova Conta
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Nenhuma conta cadastrada</p>
            <button
              onClick={() => setIsNewAccountModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
            >
              Criar Primeira Conta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {accounts.map(acc => {
              const balance = getAccountBalance(acc.id);
              const AccIcon = getAccountIcon(acc.type);

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountForEdit(acc)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition cursor-pointer flex items-center justify-between shadow-xs active:scale-[0.99] group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: acc.color || '#6366f1' }}
                    >
                      <AccIcon size={16} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {acc.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium capitalize block truncate">
                        {acc.type === 'bank' ? 'Conta Corrente' : acc.type === 'wallet' ? 'Carteira' : acc.type === 'savings' ? 'Poupança' : 'Investimento'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-xs font-black tabular-nums block ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                      {!isBlurred ? formatCurrency(balance) : '••••'}
                    </span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Ajustar
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. ATALHO CONVITE PARA O FINANCEIRO */}
      <div 
        onClick={() => navigate('/financeiro')}
        className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between cursor-pointer hover:bg-indigo-100/70 transition active:scale-[0.99]"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Wallet size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200">
              Gestão Financeira Completa
            </h4>
            <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400 font-medium">
              Movimentações, dívidas, metas, análises e projeções
            </p>
          </div>
        </div>

        <ArrowRight size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center">
              <Landmark size={18} className="mr-2 text-indigo-600 dark:text-indigo-400" />
              Nova Conta ou Carteira
            </h3>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Nome da Conta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank, Carteira..."
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Tipo
                  </label>
                  <select
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value as AccountType)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="bank">Conta Corrente</option>
                    <option value="wallet">Carteira</option>
                    <option value="savings">Poupança / Reserva</option>
                    <option value="investment">Investimento</option>
                    <option value="other">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newAccBalance}
                    onChange={e => setNewAccBalance(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Módulo da Conta */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Módulo / Conta Pertencente
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccScope('PERSONAL')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                      newAccScope !== 'BUSINESS'
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
                    🎸 Músico / Empresa
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 p-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition shadow-md"
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
    </div>
  );
};
