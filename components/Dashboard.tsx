import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import {
  Landmark,
  Eye,
  EyeOff,
  Plus,
  ShieldAlert,
  ChevronRight,
  Bell,
  CreditCard,
  Sparkles,
  UploadCloud,
  BarChart3,
  FolderTree,
  Receipt,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle
} from 'lucide-react';
import { Account, matchesScope } from '../types';
import { AccountBalanceModal } from './AccountBalanceModal';
import { TransactionForm } from './TransactionForm';
import { BankImportModal } from './BankImportModal';
import { HowMuchCanISpendCard } from './HowMuchCanISpendCard';
import { getAccountVinculo } from '../services/financeAggregator';
import { getIcon } from '../constants';
import { PERSONAL_ONLY_MODE } from '../services/personalOnlyMode';
import { MonthCashPanel } from './MonthCashPanel';
import { computeMonthCashPanel } from '../services/monthCashPanel';
import { isNeutralCashFlowMovement } from '../services/aiReportService';
import { getCurrentMonthPrefix } from '../services/dateUtils';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts,
    transactions,
    categories,
    debts,
    budgets,
    settings,
    isBlurred,
    toggleBlur,
    activeScope,
    getSystemAlerts,
    getAccountBalance,
    getDebtProgress
  } = useFinance();

  const userName = settings.userName || 'Leo';
  const currentMonthStr = useMemo(() => getCurrentMonthPrefix(), []);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);

  const alerts = useMemo(() => getSystemAlerts(), [getSystemAlerts]);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = currentMonthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentMonthStr]);

  const panel = useMemo(
    () =>
      computeMonthCashPanel({
        accounts,
        transactions,
        getAccountBalance,
        monthPrefix: currentMonthStr
      }),
    [accounts, transactions, getAccountBalance, currentMonthStr]
  );

  const monthFlow = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      if (t.status === 'cancelled') return;
      if (isNeutralCashFlowMovement(t)) return;
      if (!t.date || !t.date.startsWith(currentMonthStr)) return;
      if (!matchesScope(t.scope, 'PERSONAL')) return;
      const amt = Math.abs(Number(t.amount) || 0);
      if (t.type === 'income') income += amt;
      else if (t.type === 'expense') expense += amt;
    });
    return {
      income: Number(income.toFixed(2)),
      expense: Number(expense.toFixed(2)),
      net: Number((income - expense).toFixed(2))
    };
  }, [transactions, currentMonthStr]);

  const health = useMemo(() => {
    if (panel.projected > 200) {
      return {
        tone: 'good' as const,
        label: 'No azul',
        tip: 'O mês fecha com folga se as contas previstas se confirmarem.'
      };
    }
    if (panel.projected >= 0) {
      return {
        tone: 'ok' as const,
        label: 'No limite',
        tip: 'Fecha perto de zero — evite gastos extras este mês.'
      };
    }
    return {
      tone: 'bad' as const,
      label: 'No vermelho',
      tip: 'Previsto negativo — revise o que ainda falta pagar ou adiar.'
    };
  }, [panel.projected]);

  const personalAccounts = useMemo(
    () =>
      accounts.filter(
        a => a.enabled !== false && getAccountVinculo(a) !== 'MUSICO' && a.scope !== 'BUSINESS'
      ),
    [accounts]
  );

  const debtsMonthMetrics = useMemo(() => {
    const activeDebts = debts.filter(d => getDebtProgress(d.id).status === 'active');
    const totalRemainingDebts = activeDebts.reduce((s, d) => s + getDebtProgress(d.id).remaining, 0);
    const monthDebtPending = transactions
      .filter(
        t =>
          t.debtId &&
          t.status === 'pending' &&
          t.date &&
          t.date.startsWith(currentMonthStr) &&
          matchesScope(t.scope, 'PERSONAL')
      )
      .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

    return {
      activeDebtsCount: activeDebts.length,
      totalRemainingDebts,
      monthDebtPending
    };
  }, [debts, transactions, currentMonthStr, getDebtProgress]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type !== 'expense' || t.status === 'cancelled') return;
      if (isNeutralCashFlowMovement(t)) return;
      if (!t.date || !t.date.startsWith(currentMonthStr)) return;
      if (!matchesScope(t.scope, activeScope === 'BUSINESS' && !PERSONAL_ONLY_MODE ? 'BUSINESS' : 'PERSONAL')) return;

      const amt = Math.abs(Number(t.amount) || 0);
      totalExpense += amt;
      const catId = t.categoryId || 'cat_other';
      map.set(catId, (map.get(catId) || 0) + amt);
    });

    const list = Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId) || {
          id: catId,
          name: 'Geral',
          color: '#3b82f6',
          icon: 'Tag'
        };
        const percentage = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
        return { cat, amount, percentage };
      })
      .sort((a, b) => b.amount - a.amount);

    return { list: list.slice(0, 5), totalExpense };
  }, [transactions, categories, currentMonthStr, activeScope]);

  const recentTransactions = useMemo(() => {
    return transactions
      .filter(t => matchesScope(t.scope, 'PERSONAL') && t.status !== 'cancelled')
      .sort(
        (a, b) =>
          (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)
      )
      .slice(0, 5);
  }, [transactions]);

  const topAlerts = useMemo(() => alerts.slice(0, 3), [alerts]);

  const budgetProgress = useMemo(() => {
    return budgets
      .map(b => {
        const limit = Number(b.limit) || 0;
        if (limit <= 0) return null;
        const spent = transactions
          .filter(
            t =>
              t.type === 'expense' &&
              t.status !== 'cancelled' &&
              t.categoryId === b.categoryId &&
              t.date &&
              t.date.startsWith(currentMonthStr) &&
              !isNeutralCashFlowMovement(t)
          )
          .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        const pct = Math.min(999, (spent / limit) * 100);
        const cat = categories.find(c => c.id === b.categoryId);
        return {
          categoryId: b.categoryId,
          name: cat?.name || 'Categoria',
          color: cat?.color || '#6366f1',
          spent,
          limit,
          pct
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [budgets, transactions, categories, currentMonthStr]);

  const healthStyles = {
    good: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ok: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    bad: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  };

  return (
    <div className="space-y-5 pb-28 animate-fade-in text-white -mx-3.5 sm:mx-0">
      {/* HERO — Saldo previsto em destaque */}
      <div className="relative bg-gradient-to-b from-[#002d6c] via-[#003882] to-slate-100 px-4 pt-3 pb-8 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between pt-1 mb-5">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => navigate('/mais')}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#fcca00] to-amber-300 p-0.5 shadow-md active:scale-95 transition"
            >
              <div className="w-full h-full rounded-full bg-[#002d6c] flex items-center justify-center text-[#fcca00] font-black text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
            </button>
            <div>
              <span className="text-[11px] font-bold text-blue-200 block">Olá,</span>
              <h1 className="text-base font-black text-white tracking-tight leading-none">{userName}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => toggleBlur()}
              className="p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-200 hover:text-white transition active:scale-95"
              title={isBlurred ? 'Exibir valores' : 'Ocultar valores'}
            >
              {isBlurred ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/mais?tab=alerts')}
              className="p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-200 hover:text-white transition active:scale-95 relative"
              title="Avisos"
            >
              <Bell size={16} />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#fcca00] shadow-[0_0_8px_#fcca00]" />
              )}
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-[#003882] border border-[#fcca00]/40 ring-1 ring-[#fcca00]/20 p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-200">
                Saldo previsto · {monthLabel}
              </p>
              <p
                className={`mt-1.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${
                  panel.projected >= 0 ? 'text-white' : 'text-rose-300'
                }`}
              >
                {formatCurrency(panel.projected)}
              </p>
              <p className="text-[11px] text-blue-200 mt-1 font-medium">
                Como o mês tende a fechar (saldo agora + a receber − a pagar)
              </p>
            </div>
            <span
              className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${healthStyles[health.tone]}`}
            >
              {health.label}
            </span>
          </div>

          <p className="text-xs text-blue-100/90 leading-relaxed border-t border-blue-700/40 pt-3">
            {health.tip}
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-blue-950/50 border border-blue-700/40 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-300">Agora</p>
              <p className="text-sm font-black text-white tabular-nums mt-0.5">
                {formatCurrency(panel.currentBalance)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300">A receber</p>
              <p className="text-sm font-black text-emerald-300 tabular-nums mt-0.5">
                {formatCurrency(panel.toReceive)}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-300">A pagar</p>
              <p className="text-sm font-black text-rose-300 tabular-nums mt-0.5">
                {formatCurrency(panel.toPay)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setTxInitialType('expense');
                setIsTxModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              Nova despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setTxInitialType('income');
                setIsTxModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-[#fcca00] hover:bg-amber-400 text-[#002d6c] font-black text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              Nova receita
            </button>
          </div>
        </div>
      </div>

      <div className="px-3.5 sm:px-4 space-y-5 -mt-2">
        {/* Alertas acionáveis */}
        {topAlerts.length > 0 && (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 text-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Avisos
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {alerts.length} item{alerts.length === 1 ? '' : 's'} pedem atenção
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/mais?tab=alerts')}
                className="text-[11px] font-black text-blue-700 flex items-center gap-0.5 active:scale-95"
              >
                Ver todos <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {topAlerts.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    navigate(a.actionPath || (a.transactionId ? '/lancamentos' : '/mais?tab=alerts'))
                  }
                  className="w-full text-left flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 hover:bg-slate-50 px-3 py-2.5 transition active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{a.title}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
                      {a.type === 'risk'
                        ? 'Risco'
                        : a.type === 'overdue'
                          ? 'Atrasado'
                          : a.type === 'today'
                            ? 'Hoje'
                            : a.type === 'tomorrow'
                              ? 'Amanhã'
                              : 'Em breve'}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-black tabular-nums shrink-0 ${
                      a.type === 'risk' || a.type === 'overdue' ? 'text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    {formatCurrency(a.amount)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quanto posso gastar */}
        <div className="text-slate-800">
          <HowMuchCanISpendCard />
        </div>

        {/* Orçamentos do mês */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 text-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Target size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Orçamentos
                </h3>
                <p className="text-[11px] text-slate-400 font-medium capitalize">{monthLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/planejamento')}
              className="text-[11px] font-black text-indigo-600 flex items-center gap-0.5 active:scale-95"
            >
              {budgetProgress.length > 0 ? 'Gerenciar' : 'Criar tetos'} <ChevronRight size={14} />
            </button>
          </div>

          {budgetProgress.length === 0 ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              Defina tetos por categoria para o app avisar quando o gasto se aproximar do limite.
            </p>
          ) : (
            <div className="space-y-3">
              {budgetProgress.map(b => {
                const barPct = Math.min(100, b.pct);
                const barColor =
                  b.pct >= 100 ? 'bg-rose-500' : b.pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';
                return (
                  <div key={b.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">{b.name}</span>
                      <span className="text-[11px] font-black tabular-nums text-slate-500 shrink-0">
                        {Math.round(b.pct)}% · {formatCurrency(b.spent)}
                        <span className="text-slate-400 font-bold"> / {formatCurrency(b.limit)}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Receitas × Despesas do mês */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 text-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Receitas × Despesas
            </h3>
            <span className="text-[10px] font-bold text-slate-400 capitalize">{monthLabel}</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                <TrendingUp size={12} />
                Entradas
              </div>
              <p className="text-base font-black text-emerald-700 tabular-nums mt-1">
                {formatCurrency(monthFlow.income)}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700">
                <TrendingDown size={12} />
                Saídas
              </div>
              <p className="text-base font-black text-rose-700 tabular-nums mt-1">
                {formatCurrency(monthFlow.expense)}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-800">
                <Minus size={12} />
                Saldo mês
              </div>
              <p
                className={`text-base font-black tabular-nums mt-1 ${
                  monthFlow.net >= 0 ? 'text-blue-900' : 'text-rose-700'
                }`}
              >
                {formatCurrency(monthFlow.net)}
              </p>
            </div>
          </div>
        </div>

        {/* Dívidas resumidas */}
        <button
          type="button"
          onClick={() => navigate('/dividas')}
          className="w-full text-left rounded-3xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 hover:border-rose-200 transition active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <CreditCard size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Dívidas</p>
                <p className="text-lg font-black text-slate-900 tabular-nums">
                  {formatCurrency(debtsMonthMetrics.totalRemainingDebts)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {debtsMonthMetrics.activeDebtsCount} ativas · parcelas do mês:{' '}
                  <span className="font-bold text-amber-700">
                    {formatCurrency(debtsMonthMetrics.monthDebtPending)}
                  </span>
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 shrink-0" />
          </div>
        </button>

        <MonthCashPanel />

        {/* Atalhos */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Atalhos</h3>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'Extrato', icon: Receipt, color: 'bg-blue-50 text-blue-800', go: () => navigate('/lancamentos') },
              { label: 'Contas', icon: Landmark, color: 'bg-emerald-50 text-emerald-700', go: () => navigate('/contas') },
              { label: 'Dívidas', icon: CreditCard, color: 'bg-rose-50 text-rose-600', go: () => navigate('/dividas') },
              { label: 'Conciliação', icon: UploadCloud, color: 'bg-violet-50 text-violet-700', go: () => setIsBankImportOpen(true) },
              { label: 'Inteligência', icon: Sparkles, color: 'bg-amber-50 text-amber-700', go: () => navigate('/inteligencia') },
              { label: 'Orçamentos', icon: FolderTree, color: 'bg-indigo-50 text-indigo-700', go: () => navigate('/planejamento') },
              { label: 'Meus gastos', icon: BarChart3, color: 'bg-sky-50 text-sky-700', go: () => navigate('/gastos') },
              { label: 'Avisos', icon: ShieldAlert, color: 'bg-orange-50 text-orange-700', go: () => navigate('/mais?tab=alerts') }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.go}
                  className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 transition active:scale-95 flex flex-col items-center justify-center text-center shadow-sm"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-1.5`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 text-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Landmark size={16} className="text-[#003882]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Saldo das contas</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/contas')}
                className="text-[11px] text-[#003882] hover:underline font-bold flex items-center gap-0.5"
              >
                Ver todas
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {personalAccounts.slice(0, 4).map(acc => {
                const balance = getAccountBalance(acc.id);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountForEdit(acc)}
                    className="w-full py-2.5 flex items-center justify-between hover:bg-slate-50 px-1 rounded-xl transition text-left"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${acc.color || '#003882'}20`, color: acc.color || '#003882' }}
                      >
                        <Landmark size={15} />
                      </div>
                      <span className="text-xs font-bold text-slate-800 truncate">{acc.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900">{formatCurrency(balance)}</span>
                  </button>
                );
              })}
              {personalAccounts.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">Nenhuma conta pessoal ativa.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
              <span className="text-sm font-black text-[#003882]">
                {formatCurrency(panel.currentBalance)}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 text-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 size={16} className="text-[#003882]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Gastos do mês</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/gastos')}
                className="text-[11px] text-[#003882] hover:underline font-bold flex items-center gap-0.5"
              >
                Detalhes
                <ChevronRight size={13} />
              </button>
            </div>

            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(topCategories.totalExpense)}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5 capitalize">Total em {monthLabel}</p>
            </div>

            {topCategories.list.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">Nenhuma despesa neste mês.</div>
            ) : (
              <div className="space-y-2">
                {topCategories.list.slice(0, 4).map(item => (
                  <div key={item.cat.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.cat.color || '#3b82f6' }}
                      />
                      <span className="text-slate-700 font-bold truncate text-[11px]">{item.cat.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 text-[11px]">{formatCurrency(item.amount)}</span>
                      <span className="text-[9px] text-slate-400 ml-1.5">({item.percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Atividade recente</h3>
            <button
              type="button"
              onClick={() => navigate('/lancamentos')}
              className="text-[11px] text-[#003882] hover:underline font-bold flex items-center gap-0.5"
            >
              Ver extrato
              <ChevronRight size={13} />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-400">
              Nenhuma movimentação recente.
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
              {recentTransactions.map(t => {
                const cat = categories.find(c => c.id === t.categoryId);
                const Icon = getIcon(cat?.icon || 'Tag');
                const isIncome = t.type === 'income';

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/lancamentos?highlightId=${t.id}`)}
                    className="w-full p-3.5 hover:bg-slate-50 transition flex items-center justify-between text-left"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${cat?.color || '#3b82f6'}20`,
                          color: cat?.color || '#3b82f6'
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate block">{t.description}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {cat?.name || 'Geral'} · {t.date}
                          {t.status === 'pending' ? ' · pendente' : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIncome ? '+' : '-'}
                      {formatCurrency(Math.abs(Number(t.amount) || 0))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isTxModalOpen && (
        <TransactionForm initialType={txInitialType} onClose={() => setIsTxModalOpen(false)} />
      )}

      {isBankImportOpen && (
        <BankImportModal isOpen={isBankImportOpen} onClose={() => setIsBankImportOpen(false)} />
      )}

      {selectedAccountForEdit && (
        <AccountBalanceModal
          account={selectedAccountForEdit}
          onClose={() => setSelectedAccountForEdit(null)}
        />
      )}
    </div>
  );
};
