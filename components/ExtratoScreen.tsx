import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import {
  Receipt,
  Plus,
  Filter,
  UploadCloud,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
  Calendar,
  Landmark,
  Eye,
  EyeOff,
  Check,
  Trash2,
  Handshake,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { Transaction, matchesScope } from '../types';
import { getIcon } from '../constants';
import { TransactionForm } from './TransactionForm';
import { BankImportModal } from './BankImportModal';
import { getLocalDateString, getCurrentMonthPrefix } from '../services/dateUtils';
import { PERSONAL_ONLY_MODE } from '../services/personalOnlyMode';
import { isLegacyArchivedTx } from '../services/legacyCutoffMigration';
import { isLoanMovement, isNeutralCashFlowMovement } from '../services/aiReportService';
import { computeChainedMonthProjection } from '../services/monthCashPanel';

type TypeStatusFilter = 'all' | 'paid' | 'pending' | 'shows' | 'accounts';
type ViewMode = 'month' | 'future';

const shiftMonth = (ym: string, delta: number): string => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const formatMonthShort = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '');
};

export const ExtratoScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    transactions,
    categories,
    accounts,
    debts,
    isBlurred,
    toggleBlur,
    activeScope,
    updateTransaction,
    deleteTransaction,
    getAccountBalance,
    getDebtProgress
  } = useFinance();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [txInitialType, setTxInitialType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthPickerRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => getLocalDateString(), []);
  const currentYearMonth = useMemo(() => getCurrentMonthPrefix(), []);
  const monthFromUrl = searchParams.get('month');
  const statusFromUrl = searchParams.get('status');
  const highlightId = searchParams.get('highlightId');

  const [selectedMonth, setSelectedMonth] = useState<string>(
    monthFromUrl && /^\d{4}-\d{2}$/.test(monthFromUrl) ? monthFromUrl : currentYearMonth
  );
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const [statusFilter, setStatusFilter] = useState<TypeStatusFilter>(() => {
    if (statusFromUrl === 'paid' || statusFromUrl === 'pending' || statusFromUrl === 'all') {
      return statusFromUrl;
    }
    return 'all';
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (monthFromUrl && /^\d{4}-\d{2}$/.test(monthFromUrl)) {
      setSelectedMonth(monthFromUrl);
      setViewMode('month');
    }
    if (statusFromUrl === 'paid' || statusFromUrl === 'pending' || statusFromUrl === 'all') {
      setStatusFilter(statusFromUrl);
    }
  }, [monthFromUrl, statusFromUrl]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`tx-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, selectedMonth, statusFilter, viewMode, transactions]);

  useEffect(() => {
    if (showMonthPicker && monthPickerRef.current) {
      monthPickerRef.current.showPicker?.();
      monthPickerRef.current.focus();
    }
  }, [showMonthPicker]);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const normalizeSearchText = (val?: string | null) =>
    (val || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  /** Meses com lançamento real — atalhos inteligentes, sem limite ±3 */
  const monthsWithActivity = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (!t?.date || t.status === 'cancelled' || isLegacyArchivedTx(t)) return;
      set.add(t.date.slice(0, 7));
    });
    set.add(currentYearMonth);
    set.add(selectedMonth);
    return Array.from(set).sort().reverse();
  }, [transactions, currentYearMonth, selectedMonth]);

  const nearbyMonths = useMemo(() => {
    // Faixa visual curta ao redor do mês escolhido (navegação rápida)
    return [-2, -1, 0, 1, 2].map(delta => {
      const value = shiftMonth(selectedMonth, delta);
      return {
        value,
        label: formatMonthShort(value),
        isCurrent: value === currentYearMonth,
        isSelected: value === selectedMonth && viewMode === 'month'
      };
    });
  }, [selectedMonth, currentYearMonth, viewMode]);

  const filteredTransactions = useMemo(() => {
    const hasSearch = searchTerm.trim().length > 0;
    const normTerm = normalizeSearchText(searchTerm);
    const isFutureOnly = viewMode === 'future';

    return transactions
      .filter(t => {
        if (!t || t.status === 'cancelled') return false;
        if (isLegacyArchivedTx(t)) return false;

        if (selectedAccountId !== 'all') {
          if (t.accountId !== selectedAccountId && t.destinationAccountId !== selectedAccountId) {
            return false;
          }
        } else if (!hasSearch) {
          const acc = accounts.find(a => a.id === t.accountId);
          const scopeMatches =
            matchesScope(t.scope, activeScope) || (acc ? matchesScope(acc.scope, activeScope) : false);
          if (!scopeMatches) return false;
        }

        const isHighlighted = Boolean(highlightId && t.id === highlightId);
        if (!isHighlighted) {
          if (isFutureOnly) {
            if (!t.date) return false;
            if (t.status === 'pending' && t.type === 'expense' && t.date < todayStr) {
              // inclui atrasada
            } else if (t.date < todayStr) {
              return false;
            }
          } else if (selectedMonth === currentYearMonth) {
            // Mês atual: despesas pendentes atrasadas entram na lista (igual ao previsto do Início)
            const monthStart = `${selectedMonth}-01`;
            if (!t.date) return false;
            if (t.type === 'expense' && t.status === 'pending') {
              if (!(t.date.startsWith(selectedMonth) || t.date < monthStart)) return false;
            } else if (!t.date.startsWith(selectedMonth)) {
              return false;
            }
          } else {
            if (!t.date || !t.date.startsWith(selectedMonth)) return false;
          }
        }

        if (statusFilter === 'paid' && t.status !== 'paid') return false;
        if (statusFilter === 'pending' && t.status !== 'pending') return false;
        if (
          statusFilter === 'shows' &&
          !(t.showId || t.categoryId === 'cat_33' || t.scope === 'BUSINESS')
        ) {
          return false;
        }

        if (hasSearch) {
          const descMatch = normalizeSearchText(t.description).includes(normTerm);
          const showMatch = normalizeSearchText(t.showName).includes(normTerm);
          const cat = categories.find(c => c.id === t.categoryId);
          const catMatch = normalizeSearchText(cat?.name).includes(normTerm);
          const acc = accounts.find(a => a.id === t.accountId);
          const destAcc = t.destinationAccountId
            ? accounts.find(a => a.id === t.destinationAccountId)
            : undefined;
          const accMatch =
            normalizeSearchText(acc?.name).includes(normTerm) ||
            normalizeSearchText(destAcc?.name).includes(normTerm);
          const amtStr = String(Math.abs(Number(t.amount) || 0));
          const amtFormatted = formatCurrency(Math.abs(Number(t.amount) || 0)).toLowerCase();
          const amtMatch = amtStr.includes(normTerm) || amtFormatted.includes(normTerm);
          if (!descMatch && !showMatch && !catMatch && !accMatch && !amtMatch) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)
      );
  }, [
    transactions,
    activeScope,
    viewMode,
    selectedMonth,
    statusFilter,
    selectedAccountId,
    searchTerm,
    todayStr,
    categories,
    accounts,
    highlightId,
    currentYearMonth,
    isBlurred
  ]);

  const projection = useMemo(() => {
    // Conta específica: mantém recorte simples (sem encadear dívidas globais)
    if (selectedAccountId !== 'all') {
      const accBalance = getAccountBalance(selectedAccountId);
      let receive = 0;
      let pay = 0;
      let overdueCount = 0;
      let overdueAmount = 0;
      filteredTransactions.forEach(t => {
        if (t.status !== 'pending') return;
        if (isNeutralCashFlowMovement(t)) return;
        const amount = Math.abs(Number(t.amount) || 0);
        if (t.type === 'income' || t.type === 'goal_withdraw') receive += amount;
        else if (t.type === 'expense' || t.type === 'goal_deposit') {
          pay += amount;
          if (t.date && t.date < todayStr) {
            overdueCount += 1;
            overdueAmount += amount;
          }
        }
      });
      return {
        mode: 'current' as const,
        currentBalance: Number(accBalance.toFixed(2)),
        monthToReceive: Number(receive.toFixed(2)),
        monthToPay: Number(pay.toFixed(2)),
        monthSyntheticDebt: 0,
        chainToReceive: Number(receive.toFixed(2)),
        chainToPay: Number(pay.toFixed(2)),
        projected: Number((accBalance + receive - pay).toFixed(2)),
        monthsInChain: [selectedMonth],
        overdueCount,
        overdueAmount: Number(overdueAmount.toFixed(2))
      };
    }

    return computeChainedMonthProjection({
      accounts,
      transactions,
      debts,
      getAccountBalance,
      getDebtRemaining: id => getDebtProgress(id).remaining,
      targetMonth: selectedMonth,
      mode: viewMode === 'future' ? 'future' : 'month'
    });
  }, [
    selectedAccountId,
    filteredTransactions,
    todayStr,
    selectedMonth,
    viewMode,
    accounts,
    transactions,
    debts,
    getAccountBalance,
    getDebtProgress
  ]);

  const metrics = useMemo(() => {
    let entradasRealizadas = 0;
    let saidasRealizadas = 0;
    let pendingCount = 0;

    filteredTransactions.forEach(t => {
      const amount = Math.abs(Number(t.amount) || 0);
      const isInc =
        t.type === 'income' ||
        t.type === 'goal_withdraw' ||
        (t.type === 'transfer' &&
          selectedAccountId !== 'all' &&
          t.destinationAccountId === selectedAccountId);
      const isExp =
        t.type === 'expense' ||
        t.type === 'goal_deposit' ||
        (t.type === 'transfer' && (selectedAccountId === 'all' || t.accountId === selectedAccountId));

      if (t.status === 'paid') {
        if (isInc) entradasRealizadas += amount;
        else if (isExp) saidasRealizadas += amount;
      } else if (t.status === 'pending') {
        pendingCount += 1;
      }
    });

    return {
      entradasRealizadas: Number(entradasRealizadas.toFixed(2)),
      saidasRealizadas: Number(saidasRealizadas.toFixed(2)),
      futurosReceber: projection.monthToReceive,
      comprometidoPagar: projection.monthToPay,
      saldoTotalContas: projection.currentBalance,
      saldoProjetadoFinal: projection.projected,
      monthSyntheticDebt: projection.monthSyntheticDebt,
      chainToReceive: projection.chainToReceive,
      chainToPay: projection.chainToPay,
      projectionMode: projection.mode,
      monthsInChain: projection.monthsInChain,
      overdueCount: projection.overdueCount,
      overdueAmount: projection.overdueAmount,
      pendingCount,
      txCount: filteredTransactions.length
    };
  }, [filteredTransactions, selectedAccountId, projection]);

  const insight = useMemo(() => {
    if (viewMode === 'future' || metrics.projectionMode === 'agenda') {
      if (metrics.overdueCount > 0) {
        return {
          tone: 'bad' as const,
          label: 'Atenção',
          tip: `Você tem ${metrics.overdueCount} conta${metrics.overdueCount > 1 ? 's' : ''} atrasada${metrics.overdueCount > 1 ? 's' : ''} (${formatCurrency(metrics.overdueAmount)}). Priorize essas baixas.`
        };
      }
      if (metrics.comprometidoPagar > metrics.futurosReceber + metrics.saldoTotalContas) {
        return {
          tone: 'bad' as const,
          label: 'Apertado',
          tip: 'O que falta pagar supera saldo + a receber. Revise datas ou adiamentos.'
        };
      }
      return {
        tone: 'ok' as const,
        label: 'Agenda',
        tip: 'Tudo que ainda está aberto daqui pra frente — inclusive atrasados.'
      };
    }

    if (metrics.projectionMode === 'past') {
      return {
        tone: 'ok' as const,
        label: 'Histórico',
        tip: 'Mês já passou. O previsto só aplica pendências ainda abertas desse mês sobre o caixa de hoje — não reescreve o histórico pago.'
      };
    }

    if (metrics.overdueCount > 0) {
      return {
        tone: 'bad' as const,
        label: 'Atrasos',
        tip: `${metrics.overdueCount} despesa${metrics.overdueCount > 1 ? 's' : ''} vencida${metrics.overdueCount > 1 ? 's' : ''} ainda aberta${metrics.overdueCount > 1 ? 's' : ''}. Elas entram no previsto.`
      };
    }

    if (metrics.projectionMode === 'future') {
      const chainNote =
        metrics.monthsInChain.length > 1
          ? ` Encadeado de ${formatMonthShort(metrics.monthsInChain[0])} até ${formatMonthShort(metrics.monthsInChain[metrics.monthsInChain.length - 1])} (caixa hoje + pendências desses meses${metrics.monthSyntheticDebt > 0 ? ' + parcelas de dívidas projetadas' : ''}).`
          : '';
      if (metrics.saldoProjetadoFinal > 200) {
        return { tone: 'good' as const, label: 'No azul', tip: `Projeção até este mês com folga.${chainNote}` };
      }
      if (metrics.saldoProjetadoFinal >= 0) {
        return { tone: 'ok' as const, label: 'No limite', tip: `Projeção até este mês perto de zero.${chainNote}` };
      }
      return {
        tone: 'bad' as const,
        label: 'No vermelho',
        tip: `Projeção até este mês negativa — faltam receitas ou sobram contas no caminho.${chainNote}`
      };
    }

    if (metrics.saldoProjetadoFinal > 200) {
      return {
        tone: 'good' as const,
        label: 'No azul',
        tip: 'Se as pendências do mês se confirmarem, fecha com folga.'
      };
    }
    if (metrics.saldoProjetadoFinal >= 0) {
      return {
        tone: 'ok' as const,
        label: 'No limite',
        tip: 'Fecha perto de zero — evite gastos extras neste mês.'
      };
    }
    return {
      tone: 'bad' as const,
      label: 'No vermelho',
      tip: 'Previsto negativo — revise o que ainda falta pagar ou receber.'
    };
  }, [viewMode, metrics, isBlurred]);

  const topSpendHint = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.forEach(t => {
      if (t.type !== 'expense' || t.status === 'cancelled') return;
      if (isNeutralCashFlowMovement(t)) return;
      const amt = Math.abs(Number(t.amount) || 0);
      const id = t.categoryId || 'other';
      map.set(id, (map.get(id) || 0) + amt);
    });
    const top = Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0];
    if (!top || top[1] <= 0) return null;
    const cat = categories.find(c => c.id === top[0]);
    return { name: cat?.name || 'Geral', amount: top[1] };
  }, [filteredTransactions, categories]);

  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      const d = t.date || 'Sem Data';
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });

    const isFutureOnly = viewMode === 'future';
    return Object.entries(groups).map(([date, txs]) => {
      const hasPaidInGroup = txs.some(t => t.status === 'paid');
      const dayNet = txs.reduce((sum, t) => {
        if (t.status === 'cancelled') return sum;
        if (hasPaidInGroup && statusFilter !== 'pending' && !isFutureOnly && t.status !== 'paid') {
          return sum;
        }
        const amt = Math.abs(Number(t.amount) || 0);
        const isInc =
          t.type === 'income' ||
          t.type === 'goal_withdraw' ||
          (t.type === 'transfer' &&
            selectedAccountId !== 'all' &&
            t.destinationAccountId === selectedAccountId);
        return isInc ? sum + amt : sum - amt;
      }, 0);

      return {
        date,
        transactions: txs,
        dayNet: Number(dayNet.toFixed(2))
      };
    });
  }, [filteredTransactions, statusFilter, viewMode, selectedAccountId]);

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === 'Sem Data') return 'SEM DATA';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);

    if (dateStr === todayStr) {
      return `HOJE · ${d} DE ${dateObj.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${y}`;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    if (dateStr === yesterdayStr) {
      return `ONTEM · ${d} DE ${dateObj.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${y}`;
    }

    const dayName = dateObj
      .toLocaleDateString('pt-BR', { weekday: 'short' })
      .replace('.', '')
      .toUpperCase();
    return `${dayName}, ${d} DE ${dateObj.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${y}`;
  };

  const handleTogglePaid = (t: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTransaction({
      ...t,
      status: t.status === 'paid' ? 'pending' : 'paid'
    });
  };

  const healthStyles = {
    good: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ok: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    bad: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
  };

  const periodTitle =
    viewMode === 'future' ? 'Agenda futura' : formatMonthLabel(selectedMonth);

  return (
    <div className="space-y-5 pb-28 animate-fade-in text-white -mx-3.5 sm:mx-0">
      {/* HERO — mesmo DNA da Home */}
      <div className="relative bg-gradient-to-b from-[#002d6c] via-[#003882] to-slate-100 px-4 pt-3 pb-8 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between pt-1 mb-4">
          <div>
            <p className="text-[11px] font-bold text-blue-200">Lançamentos</p>
            <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <Receipt size={18} className="text-[#fcca00]" />
              Extrato inteligente
            </h1>
          </div>
          <div className="flex items-center gap-2">
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
              onClick={() => navigate('/relatorios?tab=ai')}
              className="p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-200 hover:text-[#fcca00] transition active:scale-95"
              title="Relatório IA"
            >
              <Sparkles size={16} />
            </button>
          </div>
        </div>

        {/* Seletor de período livre */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={viewMode === 'future'}
              onClick={() => {
                setViewMode('month');
                setSelectedMonth(shiftMonth(selectedMonth, -1));
              }}
              className="p-2 rounded-xl bg-blue-950/50 border border-blue-500/30 text-blue-100 disabled:opacity-40 active:scale-95"
              title="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('month');
                setShowMonthPicker(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-[#003882] border border-[#fcca00]/40 text-white font-black text-sm capitalize flex items-center justify-center gap-2 active:scale-[0.99] transition"
            >
              <Calendar size={15} className="text-[#fcca00]" />
              {periodTitle}
            </button>

            <button
              type="button"
              disabled={viewMode === 'future'}
              onClick={() => {
                setViewMode('month');
                setSelectedMonth(shiftMonth(selectedMonth, 1));
              }}
              className="p-2 rounded-xl bg-blue-950/50 border border-blue-500/30 text-blue-100 disabled:opacity-40 active:scale-95"
              title="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>

            <input
              ref={monthPickerRef}
              type="month"
              value={selectedMonth}
              onChange={e => {
                if (e.target.value) {
                  setSelectedMonth(e.target.value);
                  setViewMode('month');
                  setShowMonthPicker(false);
                }
              }}
              onBlur={() => setShowMonthPicker(false)}
              className="sr-only"
              aria-label="Escolher mês"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {nearbyMonths.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setViewMode('month');
                  setSelectedMonth(m.value);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 transition active:scale-95 ${
                  m.isSelected
                    ? 'bg-[#fcca00] text-[#002d6c]'
                    : m.isCurrent
                    ? 'bg-blue-950/70 text-white border border-blue-400/40'
                    : 'bg-blue-950/40 text-blue-200 border border-transparent'
                }`}
              >
                {m.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setViewMode('future')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 transition active:scale-95 flex items-center gap-1 ${
                viewMode === 'future'
                  ? 'bg-[#fcca00] text-[#002d6c]'
                  : 'bg-blue-950/40 text-blue-200'
              }`}
            >
              <Clock size={10} />
              Futuros
            </button>
            {selectedMonth !== currentYearMonth && viewMode === 'month' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(currentYearMonth);
                  setViewMode('month');
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 bg-white/10 text-[#fcca00] border border-[#fcca00]/30"
              >
                Ir ao mês atual
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-[#003882] border border-[#fcca00]/40 ring-1 ring-[#fcca00]/20 p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-200">
                Saldo previsto · {periodTitle}
              </p>
              <p
                className={`mt-1.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${
                  metrics.saldoProjetadoFinal >= 0 ? 'text-white' : 'text-rose-300'
                }`}
              >
                {formatCurrency(metrics.saldoProjetadoFinal)}
              </p>
              <p className="text-[11px] text-blue-200 mt-1 font-medium">
                {metrics.projectionMode === 'future'
                  ? 'Caixa de hoje ± pendências desde o mês atual até este'
                  : metrics.projectionMode === 'agenda'
                  ? 'Caixa de hoje + tudo aberto na agenda'
                  : metrics.projectionMode === 'past'
                  ? 'Caixa de hoje ± pendências remanescentes deste mês'
                  : 'Como o mês tende a fechar (agora + a receber − a pagar)'}
              </p>
            </div>
            <span
              className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${healthStyles[insight.tone]}`}
            >
              {insight.label}
            </span>
          </div>

          <p className="text-xs text-blue-100/90 leading-relaxed border-t border-blue-700/40 pt-3 flex gap-2">
            <Lightbulb size={14} className="text-[#fcca00] shrink-0 mt-0.5" />
            <span>{insight.tip}</span>
          </p>

          {metrics.projectionMode === 'future' && metrics.monthsInChain.length > 1 && (
            <p className="text-[10px] text-blue-200/90 font-medium">
              Acumulado na trilha: +{formatCurrency(metrics.chainToReceive)} a receber · −
              {formatCurrency(metrics.chainToPay)} a pagar
              {metrics.monthSyntheticDebt > 0
                ? ` (neste mês: ${formatCurrency(metrics.monthSyntheticDebt)} de parcelas de dívida sem lançamento)`
                : ''}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-blue-950/50 border border-blue-700/40 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1">
                <Landmark size={10} /> Agora
              </p>
              <p className="text-sm font-black text-white tabular-nums mt-0.5">
                {formatCurrency(metrics.saldoTotalContas)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('pending');
                setViewMode(viewMode === 'future' ? 'future' : 'month');
              }}
              className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-2.5 text-left active:scale-[0.98] transition"
            >
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <ArrowUpRight size={10} /> A receber
              </p>
              <p className="text-sm font-black text-emerald-300 tabular-nums mt-0.5">
                {formatCurrency(metrics.futurosReceber)}
              </p>
              {metrics.projectionMode === 'future' && (
                <p className="text-[8px] text-emerald-400/80 font-bold mt-0.5">só este mês</p>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-2.5 text-left active:scale-[0.98] transition"
            >
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1">
                <ArrowDownRight size={10} /> A pagar
              </p>
              <p className="text-sm font-black text-rose-300 tabular-nums mt-0.5">
                {formatCurrency(metrics.comprometidoPagar)}
              </p>
              {metrics.projectionMode === 'future' && (
                <p className="text-[8px] text-rose-400/80 font-bold mt-0.5">só este mês</p>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setTxInitialType('expense');
                setEditingTransaction(null);
                setIsFormOpen(true);
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
                setEditingTransaction(null);
                setIsFormOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-[#fcca00] hover:bg-amber-400 text-[#002d6c] font-black text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              Nova receita
            </button>
          </div>
        </div>
      </div>

      <div className="px-3.5 sm:px-4 space-y-4 -mt-2">
        {/* Fluxo do período */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 text-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Movimento do período
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              {metrics.txCount} lançamento{metrics.txCount === 1 ? '' : 's'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                <TrendingUp size={12} />
                Entradas pagas
              </div>
              <p className="text-base font-black text-emerald-700 tabular-nums mt-1">
                {formatCurrency(metrics.entradasRealizadas)}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700">
                <TrendingDown size={12} />
                Saídas pagas
              </div>
              <p className="text-base font-black text-rose-700 tabular-nums mt-1">
                {formatCurrency(metrics.saidasRealizadas)}
              </p>
            </div>
          </div>

          {(metrics.overdueCount > 0 || topSpendHint) && (
            <div className="mt-3 space-y-2">
              {metrics.overdueCount > 0 && (
                <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-3 py-2.5">
                  <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                    <span className="font-black">{metrics.overdueCount} atrasada{metrics.overdueCount > 1 ? 's' : ''}</span>
                    {' · '}
                    {formatCurrency(metrics.overdueAmount)} ainda em aberto
                  </p>
                </div>
              )}
              {topSpendHint && (
                <div className="flex items-start gap-2 rounded-2xl bg-blue-50 border border-blue-100 px-3 py-2.5">
                  <Lightbulb size={14} className="text-[#003882] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                    Maior gasto neste filtro:{' '}
                    <span className="font-black text-[#003882]">{topSpendHint.name}</span>
                    {' · '}
                    {formatCurrency(topSpendHint.amount)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ações + filtros */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`px-3.5 py-2 rounded-2xl border font-bold text-xs transition active:scale-95 flex items-center gap-1.5 shrink-0 ${
              showFiltersPanel || searchTerm || selectedAccountId !== 'all'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <Filter size={14} />
            Filtros
            {(searchTerm || selectedAccountId !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-[#fcca00]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsBankImportOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-xs transition active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <UploadCloud size={14} className="text-blue-700" />
            Importar
          </button>
          <button
            type="button"
            onClick={() => navigate('/relatorios?tab=ai')}
            className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-xs transition active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <Sparkles size={14} className="text-amber-600" />
            Relatório IA
          </button>
        </div>

        {showFiltersPanel && (
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm text-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar descrição, categoria ou conta..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:border-blue-500 outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-500 shrink-0">Conta:</label>
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:border-blue-500 outline-none"
              >
                <option value="all">Todas as contas</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            {monthsWithActivity.length > 1 && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">Meses com movimento</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {monthsWithActivity.map(ym => (
                    <button
                      key={ym}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(ym);
                        setViewMode('month');
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize ${
                        ym === selectedMonth && viewMode === 'month'
                          ? 'bg-[#003882] text-[#fcca00]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {formatMonthShort(ym)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'paid', label: 'Realizado' },
            { id: 'pending', label: 'Pendente' },
            ...(!PERSONAL_ONLY_MODE ? [{ id: 'shows', label: 'Shows' }] : []),
            { id: 'accounts', label: 'Por conta' }
          ].map(pill => {
            const isActive = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => {
                  setStatusFilter(pill.id as TypeStatusFilter);
                  if (pill.id === 'accounts') setShowFiltersPanel(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 ${
                  isActive
                    ? 'bg-[#003882] text-[#fcca00] shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="space-y-5 pt-1">
          {groupedByDate.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white border border-slate-200 text-slate-400 text-xs">
              <Receipt size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-700 mb-1">Nenhum lançamento neste filtro</p>
              <p className="text-[11px]">
                Troque o mês, abra Futuros ou cadastre um novo lançamento.
              </p>
            </div>
          ) : (
            groupedByDate.map(group => (
              <div key={group.date} className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-black tracking-wider text-slate-500">
                    {formatDateHeader(group.date)}
                  </h3>
                  <span
                    className={`text-[10px] font-black ${
                      group.dayNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {group.dayNet >= 0 ? '+' : ''}
                    {formatCurrency(group.dayNet)}
                  </span>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden divide-y divide-slate-100 shadow-sm">
                  {group.transactions.map(t => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    const acc = accounts.find(a => a.id === t.accountId);
                    const isIncome =
                      t.type === 'income' ||
                      t.type === 'goal_withdraw' ||
                      (t.type === 'transfer' &&
                        selectedAccountId !== 'all' &&
                        t.destinationAccountId === selectedAccountId);
                    const isPending = t.status === 'pending';
                    const isOverdue = isPending && t.type === 'expense' && t.date && t.date < todayStr;
                    const Icon = getIcon(cat?.icon || 'Tag');

                    return (
                      <div
                        key={t.id}
                        id={`tx-${t.id}`}
                        onClick={() => {
                          setEditingTransaction(t);
                          setIsFormOpen(true);
                        }}
                        className={`p-3.5 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer group ${
                          highlightId === t.id
                            ? 'bg-blue-50 ring-1 ring-inset ring-blue-300'
                            : isOverdue
                            ? 'bg-rose-50/60'
                            : isPending
                            ? 'bg-amber-50/40'
                            : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3.5 min-w-0 pr-3 flex-1">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              backgroundColor: `${cat?.color || '#3b82f6'}20`,
                              color: cat?.color || '#3b82f6'
                            }}
                          >
                            <Icon size={18} />
                          </div>

                          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-slate-800 block leading-relaxed break-words group-hover:text-[#003882] transition">
                              {t.description || 'Sem descrição'}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isOverdue && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white uppercase">
                                  Atrasada
                                </span>
                              )}
                              {isPending && !isOverdue && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-400 text-black uppercase">
                                  Pendente
                                </span>
                              )}
                              {isLoanMovement(t) && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-sky-600 text-white uppercase inline-flex items-center gap-1">
                                  <Handshake size={10} strokeWidth={2.5} />
                                  {t.loanPerson ? `Emprést. · ${t.loanPerson}` : 'Empréstimo'}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 truncate">
                                {cat?.name || 'Geral'} · {acc?.name || 'Conta'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center space-x-2">
                          <div>
                            <span
                              className={`text-xs font-black block tabular-nums ${
                                isIncome ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {isIncome ? '+' : '-'}
                              {formatCurrency(Math.abs(Number(t.amount) || 0))}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-medium">
                              {isPending ? 'Previsto' : 'Realizado'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={e => handleTogglePaid(t, e)}
                            className={`p-1.5 rounded-lg border transition active:scale-95 ${
                              isPending
                                ? 'bg-slate-50 hover:bg-emerald-50 border-slate-200 text-slate-400 hover:text-emerald-600'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}
                            title={isPending ? 'Confirmar pagamento' : 'Marcar como pendente'}
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              deleteTransaction(t.id);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 transition active:scale-95"
                            title="Excluir"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isFormOpen && (
        <TransactionForm
          transaction={editingTransaction || undefined}
          initialType={txInitialType}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTransaction(null);
          }}
        />
      )}

      {isBankImportOpen && (
        <BankImportModal isOpen={isBankImportOpen} onClose={() => setIsBankImportOpen(false)} />
      )}
    </div>
  );
};
