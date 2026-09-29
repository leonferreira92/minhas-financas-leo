import React, { useState, useMemo, useEffect } from 'react';
import { Show, ShowStatus, ShowPayment, ShowExpenseItem, ShowPaymentType, ShowPaymentStatus } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, Calendar, Clock, MapPin, User, DollarSign, 
  FileText, CheckCircle2, AlertCircle, Edit3, Trash2, 
  TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, 
  Check, ArrowRight, Sparkles, Plus, AlertTriangle, 
  Receipt, ArrowRightLeft, ShieldCheck, ChevronRight, CornerDownRight 
} from 'lucide-react';
import { getStatusConfig } from './types';
import { 
  normalizeShowFinancials, 
  getShowFinancialSummary, 
  syncShowWithTransactions, 
  cancelShowFutureTransactions 
} from '../../services/showFinanceSyncService';
import { useNavigate } from 'react-router-dom';

interface Props {
  show: Show | null;
  onClose: () => void;
  onEdit: (show: Show) => void;
  onDelete: (showId: string) => void;
  onUpdateStatus: (show: Show, newStatus: ShowStatus) => void;
}

const EXPENSE_CATEGORIES = [
  'Combustível',
  'Alimentação',
  'Pedágio',
  'Estacionamento',
  'Comissão',
  'Hospedagem',
  'Outros'
];

export const ShowDetailModal: React.FC<Props> = ({
  show: initialShow,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus
}) => {
  const navigate = useNavigate();
  const { accounts, categories, transactions, updateShow } = useFinance();

  const [activeSection, setActiveSection] = useState<'info' | 'finance' | 'contract' | 'history'>('finance');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  // Normalized show state
  const defaultAccountId = accounts.length > 0 ? accounts[0].id : 'acc_bank';
  const show = useMemo(() => {
    if (!initialShow) return null;
    return normalizeShowFinancials(initialShow, defaultAccountId);
  }, [initialShow, defaultAccountId]);

  // Payment Form State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [payType, setPayType] = useState<ShowPaymentType>('Parcela');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => initialShow?.date || new Date().toISOString().slice(0, 10));
  const [payAccountId, setPayAccountId] = useState(defaultAccountId);
  const [payStatus, setPayStatus] = useState<ShowPaymentStatus>('Agendado');
  const [payNotes, setPayNotes] = useState('');
  const [paymentWarning, setPaymentWarning] = useState<string | null>(null);

  // Expense Form State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => initialShow?.date || new Date().toISOString().slice(0, 10));
  const [expAccountId, setExpAccountId] = useState(defaultAccountId);
  const [expNotes, setExpNotes] = useState('');

  if (!show) return null;

  const statusCfg = getStatusConfig(show.status);
  const finSummary = getShowFinancialSummary(show);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDateBR = (dStr: string) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Transactions linked to this show
  const linkedTransactions = useMemo(() => {
    return transactions
      .filter(t => t.showId === show.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, show.id]);

  // Handle open add payment modal with auto remaining balance calculation
  const handleOpenAddPayment = (suggestRestante = false) => {
    setEditingPaymentId(null);
    setPaymentWarning(null);

    const remaining = finSummary.remainingToSchedule;
    if (suggestRestante || (show.payments && show.payments.length > 0)) {
      setPayType(remaining > 0 ? 'Restante' : 'Parcela');
    } else {
      setPayType('Sinal');
    }

    setPayAmount(remaining > 0 ? String(remaining) : '');
    setPayDate(show.date || new Date().toISOString().slice(0, 10));
    setPayAccountId(defaultAccountId);
    setPayStatus('Agendado');
    setPayNotes('');
    setIsAddPaymentOpen(true);
  };

  // Save payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(payAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    // Check if total exceeds totalCache
    const currentSumWithoutThis = (show.payments || [])
      .filter(p => p.id !== editingPaymentId)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const newTotal = currentSumWithoutThis + amountVal;
    if (newTotal > show.totalCache + 0.01 && payType !== 'Extra') {
      setPaymentWarning(`A soma dos pagamentos (R$ ${newTotal.toFixed(2)}) ultrapassa o cachê contratado (R$ ${show.totalCache.toFixed(2)}). Se este valor é adicional, selecione o tipo "Extra" ou reajuste o valor do show.`);
      return;
    }

    const currentPayments = [...(show.payments || [])];
    if (editingPaymentId) {
      const idx = currentPayments.findIndex(p => p.id === editingPaymentId);
      if (idx >= 0) {
        currentPayments[idx] = {
          ...currentPayments[idx],
          type: payType,
          amount: amountVal,
          expectedDate: payDate,
          effectiveDate: payStatus === 'Recebido' ? (currentPayments[idx].effectiveDate || payDate) : undefined,
          accountId: payAccountId,
          status: payStatus,
          notes: payNotes.trim()
        };
      }
    } else {
      currentPayments.push({
        id: crypto.randomUUID(),
        type: payType,
        amount: amountVal,
        expectedDate: payDate,
        effectiveDate: payStatus === 'Recebido' ? payDate : undefined,
        accountId: payAccountId,
        status: payStatus,
        notes: payNotes.trim()
      });
    }

    const updatedShow: Show = {
      ...show,
      payments: currentPayments
    };

    updateShow(updatedShow);
    setIsAddPaymentOpen(false);
    setEditingPaymentId(null);
  };

  // Toggle single payment status
  const handleTogglePaymentStatus = (payment: ShowPayment) => {
    const newStatus: ShowPaymentStatus = payment.status === 'Recebido' ? 'Agendado' : 'Recebido';
    const updatedPayments = (show.payments || []).map(p => {
      if (p.id === payment.id) {
        return {
          ...p,
          status: newStatus,
          effectiveDate: newStatus === 'Recebido' ? (p.effectiveDate || new Date().toISOString().slice(0, 10)) : undefined
        };
      }
      return p;
    });

    updateShow({
      ...show,
      payments: updatedPayments
    });
  };

  // Delete payment
  const handleDeletePayment = (paymentId: string) => {
    const updatedPayments = (show.payments || []).filter(p => p.id !== paymentId);
    updateShow({
      ...show,
      payments: updatedPayments
    });
  };

  // Save Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    const currentExpenses = [...(show.expenseItems || [])];
    currentExpenses.push({
      id: crypto.randomUUID(),
      category: expCategory,
      amount: amountVal,
      date: expDate,
      accountId: expAccountId,
      notes: expNotes.trim()
    });

    updateShow({
      ...show,
      expenseItems: currentExpenses
    });

    setIsAddExpenseOpen(false);
    setExpAmount('');
    setExpNotes('');
  };

  // Delete Expense
  const handleDeleteExpense = (expenseId: string) => {
    const updatedExpenses = (show.expenseItems || []).filter(e => e.id !== expenseId);
    updateShow({
      ...show,
      expenseItems: updatedExpenses
    });
  };

  // Adjust total cache to match payments
  const handleAdjustCacheToPayments = () => {
    const currentSum = (show.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    updateShow({
      ...show,
      totalCache: currentSum
    });
    setPaymentWarning(null);
  };

  // Quick Schedule remaining button
  const handleQuickScheduleRemaining = () => {
    const remaining = finSummary.remainingToSchedule;
    if (remaining <= 0) return;

    const currentPayments = [...(show.payments || [])];
    currentPayments.push({
      id: crypto.randomUUID(),
      type: 'Restante',
      amount: remaining,
      expectedDate: show.date,
      accountId: defaultAccountId,
      status: 'Agendado'
    });

    updateShow({
      ...show,
      payments: currentPayments
    });
  };

  // Handle Cancel Show with confirmation of pending transactions
  const handleInitiateCancel = () => {
    const pendingSum = finSummary.totalPending;
    if (pendingSum > 0) {
      setShowCancelPrompt(true);
    } else {
      onUpdateStatus(show, 'Cancelado');
    }
  };

  const handleConfirmCancelWithProjectionCleanup = (cleanProjections: boolean) => {
    setShowCancelPrompt(false);
    if (cleanProjections) {
      // Mark pending payments as Cancelled and remove pending transactions
      const updatedPayments = (show.payments || []).map(p => {
        if (p.status === 'Agendado' || p.status === 'Previsto') {
          return { ...p, status: 'Cancelado' as ShowPaymentStatus };
        }
        return p;
      });

      updateShow({
        ...show,
        status: 'Cancelado',
        payments: updatedPayments
      });
    } else {
      onUpdateStatus(show, 'Cancelado');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 z-10 max-h-[92vh] overflow-y-auto no-scrollbar">
        
        {/* Header com Status & Ações */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusCfg.badgeClass}`}>
              {show.status}
            </span>
            {show.eventType && (
              <span className="text-[10px] font-bold text-slate-400">
                • {show.eventType}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onEdit(show)}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Editar Show"
            >
              <Edit3 size={17} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              title="Excluir Show"
            >
              <Trash2 size={17} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top Highlight: Contratante e Resumo do Cachê */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {show.contractorName || show.name || 'Apresentação'}
          </h2>
          <p className="text-xs text-slate-500 font-medium flex items-center">
            <Calendar size={13} className="mr-1 text-indigo-600" />
            {formatDateBR(show.date)} {show.city ? `• ${show.city}` : ''}
          </p>
        </div>

        {/* Abas da Ficha: Financeiro (Destaque), Informações, Contratação, Histórico */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex space-x-2 text-xs font-bold">
            <button
              onClick={() => setActiveSection('finance')}
              className={`pb-2 px-1 border-b-2 transition flex items-center space-x-1 ${
                activeSection === 'finance'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <DollarSign size={14} />
              <span>Financeiro</span>
            </button>
            <button
              onClick={() => setActiveSection('info')}
              className={`pb-2 px-1 border-b-2 transition ${
                activeSection === 'info'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Informações
            </button>
            <button
              onClick={() => setActiveSection('contract')}
              className={`pb-2 px-1 border-b-2 transition ${
                activeSection === 'contract'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Contratação
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`pb-2 px-1 border-b-2 transition ${
                activeSection === 'history'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Conteúdo das Seções */}
        <div className="p-6 space-y-5">
          
          {/* SEÇÃO 1: FINANCEIRO COMPLETO (INTEGRAÇÃO AUTOMÁTICA) */}
          {activeSection === 'finance' && (
            <div className="space-y-6">
              
              {/* 1.1 RESUMO FINANCEIRO DO SHOW */}
              <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Valor Contratado
                    </span>
                    <span className="text-xl font-black tabular-nums text-white">
                      {formatCurrency(finSummary.totalContracted)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Lucro Líquido
                    </span>
                    <span className={`text-xl font-black tabular-nums ${finSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(finSummary.netProfit)}
                    </span>
                  </div>
                </div>

                {/* Subgrid: Recebido, A Receber, Despesas */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block">
                      Recebido
                    </span>
                    <span className="text-xs font-black text-emerald-300 tabular-nums block mt-0.5">
                      {formatCurrency(finSummary.totalReceived)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 block">
                      A Receber
                    </span>
                    <span className="text-xs font-black text-amber-300 tabular-nums block mt-0.5">
                      {formatCurrency(finSummary.totalPending)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 block">
                      Despesas
                    </span>
                    <span className="text-xs font-black text-rose-300 tabular-nums block mt-0.5">
                      {formatCurrency(finSummary.totalExpenses)}
                    </span>
                  </div>
                </div>

                {/* Alerta de Lucro Líquido e Fórmula */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Fórmula: Recebido - Despesas</span>
                  <span className="font-bold text-slate-300">
                    {formatCurrency(finSummary.totalReceived)} - {formatCurrency(finSummary.totalExpenses)}
                  </span>
                </div>
              </div>

              {/* Alerta se faltar agendar restante */}
              {finSummary.remainingToSchedule > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300">
                    <Clock size={16} className="shrink-0" />
                    <div>
                      <span className="text-xs font-black block">
                        Falta agendar {formatCurrency(finSummary.remainingToSchedule)}
                      </span>
                      <span className="text-[10px] opacity-80">
                        O cachê ainda não foi totalmente parcelado ou quitado.
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleQuickScheduleRemaining}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm shrink-0 ml-2"
                  >
                    Agendar Restante
                  </button>
                </div>
              )}

              {/* Alerta se ultrapassar o valor contratado */}
              {finSummary.isOverTotal && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2 text-rose-800 dark:text-rose-300">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                    <span className="text-xs font-black">
                      Total dos pagamentos ultrapassa o cachê em {formatCurrency(finSummary.excessAmount)}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    Teve um extra ou reajuste no cachê combinado?
                  </p>
                  <button
                    onClick={handleAdjustCacheToPayments}
                    className="px-3 py-1 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-rose-700"
                  >
                    Reajustar Cachê do Show para {formatCurrency(finSummary.totalReceived + finSummary.totalPending)}
                  </button>
                </div>
              )}

              {/* 1.2 SEÇÃO PAGAMENTOS & PARCELAMENTO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center">
                      <Wallet size={15} className="mr-1.5 text-indigo-600" />
                      Pagamentos & Parcelas
                    </h3>
                    <p className="text-[10px] text-slate-400">Sinal e parcelas sincronizadas com o Financeiro</p>
                  </div>

                  <button
                    onClick={() => handleOpenAddPayment(false)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-[10px] font-black uppercase tracking-wider transition flex items-center space-x-1"
                  >
                    <Plus size={12} strokeWidth={3} />
                    <span>Adicionar Parcela</span>
                  </button>
                </div>

                {(!show.payments || show.payments.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    Nenhum pagamento cadastrado para este show.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {show.payments.map((p, idx) => {
                      const isReceived = p.status === 'Recebido';
                      const acc = accounts.find(a => a.id === p.accountId);

                      return (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <button
                              onClick={() => handleTogglePaymentStatus(p)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-95 shadow-xs ${
                                isReceived
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              }`}
                              title={isReceived ? 'Clique para marcar como Agendado' : 'Clique para marcar como Recebido'}
                            >
                              {isReceived ? <Check size={16} strokeWidth={3} /> : <Clock size={16} />}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <h5 className="text-xs font-black text-slate-800 dark:text-white">
                                  {p.type} {show.payments && show.payments.length > 1 ? `#${idx + 1}` : ''}
                                </h5>
                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                                  isReceived
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                  {p.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Previsto: {formatDateBR(p.expectedDate)} {acc ? `• ${acc.name}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            <span className={`text-xs font-black tabular-nums ${isReceived ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                              {formatCurrency(p.amount)}
                            </span>

                            <button
                              onClick={() => handleDeletePayment(p.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              title="Remover parcela"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 1.3 SEÇÃO DESPESAS DO SHOW */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center">
                      <ArrowDownRight size={15} className="mr-1.5 text-rose-600" />
                      Despesas do Show
                    </h3>
                    <p className="text-[10px] text-slate-400">Combustível, alimentação, pedágio e outros custos</p>
                  </div>

                  <button
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[10px] font-black uppercase tracking-wider transition flex items-center space-x-1"
                  >
                    <Plus size={12} strokeWidth={3} />
                    <span>Nova Despesa</span>
                  </button>
                </div>

                {(!show.expenseItems || show.expenseItems.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    Nenhuma despesa lançada para este show.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {show.expenseItems.map(e => {
                      const acc = accounts.find(a => a.id === e.accountId);
                      return (
                        <div
                          key={e.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <h5 className="text-xs font-black text-slate-800 dark:text-white">
                              {e.category} {e.notes ? `(${e.notes})` : ''}
                            </h5>
                            <p className="text-[10px] text-slate-400">
                              {formatDateBR(e.date)} {acc ? `• ${acc.name}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">
                              -{formatCurrency(e.amount)}
                            </span>

                            <button
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              title="Remover despesa"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 1.4 LISTA RESUMIDA DAS MOVIMENTAÇÕES NO FINANCEIRO */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Movimentações no Extrato ({linkedTransactions.length})
                  </span>
                  <button
                    onClick={() => navigate('/financeiro?tab=movimentacoes')}
                    className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline flex items-center"
                  >
                    Ver no Extrato <ChevronRight size={12} />
                  </button>
                </div>

                {linkedTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">Nenhuma movimentação gerada ainda.</p>
                ) : (
                  <div className="space-y-1.5">
                    {linkedTransactions.map(tx => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {tx.description}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {formatDateBR(tx.date)} • {tx.status === 'paid' ? 'Efetivado' : 'Projetado/Agendado'}
                          </span>
                        </div>

                        <span className={`font-black tabular-nums shrink-0 ${
                          tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SEÇÃO 2: INFORMAÇÕES */}
          {activeSection === 'info' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Data da Apresentação</span>
                <p className="text-xs font-bold text-slate-800 dark:text-white capitalize flex items-center">
                  <Calendar size={14} className="mr-1.5 text-indigo-600" />
                  {formatDateBR(show.date)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Horário</span>
                <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                  <Clock size={14} className="mr-1.5 text-indigo-600" />
                  {show.time || '20:00'} {show.endTime ? `às ${show.endTime}` : ''} {show.duration ? `(${show.duration})` : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Cidade</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                    <MapPin size={14} className="mr-1.5 text-indigo-600" />
                    {show.city || 'Não informada'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Local / Endereço</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {show.location || 'A definir'}
                  </p>
                </div>
              </div>

              {show.notes && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Observações</span>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {show.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO 3: CONTRATAÇÃO & STATUS */}
          {activeSection === 'contract' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Status Atual:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${statusCfg.badgeClass}`}>
                    {show.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-bold text-slate-500">Valor Total Contratado:</span>
                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(show.totalCache)}
                  </span>
                </div>
              </div>

              {/* Botões de Ação Rápida de Status */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Alterar Status do Show
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  {show.status !== 'Confirmado' && (
                    <button
                      onClick={() => onUpdateStatus(show, 'Confirmado')}
                      className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <Check size={14} strokeWidth={3} />
                      <span>Confirmar Show</span>
                    </button>
                  )}

                  {show.status !== 'Realizado' && (
                    <button
                      onClick={() => onUpdateStatus(show, 'Realizado')}
                      className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/20 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 size={14} strokeWidth={2.5} />
                      <span>Marcar Realizado</span>
                    </button>
                  )}

                  {show.status !== 'Orçamento' && (
                    <button
                      onClick={() => onUpdateStatus(show, 'Orçamento')}
                      className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/20 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <span>Mover p/ Orçamento</span>
                    </button>
                  )}

                  {show.status !== 'Cancelado' && (
                    <button
                      onClick={handleInitiateCancel}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <span>Cancelar Show</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 4: HISTÓRICO */}
          {activeSection === 'history' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Data de Cadastro:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {show.createdAt ? new Date(show.createdAt).toLocaleDateString('pt-BR') : 'Original'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Identificador:</span>
                  <span className="font-mono text-[10px] text-slate-500">{show.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Situação:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{show.status}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL ADICIONAR / EDITAR PAGAMENTO */}
        {isAddPaymentOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center">
                  <Wallet size={16} className="mr-2 text-indigo-600" />
                  {editingPaymentId ? 'Editar Pagamento' : 'Novo Pagamento do Show'}
                </h3>
                <button onClick={() => setIsAddPaymentOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              {paymentWarning && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  {paymentWarning}
                </div>
              )}

              <form onSubmit={handleSavePayment} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Tipo</label>
                    <select
                      value={payType}
                      onChange={e => setPayType(e.target.value as ShowPaymentType)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      <option value="Sinal">Sinal</option>
                      <option value="Parcela">Parcela</option>
                      <option value="Restante">Restante</option>
                      <option value="Pagamento final">Pagamento final</option>
                      <option value="Extra">Extra / Adicional</option>
                      <option value="Bônus">Bônus</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status</label>
                    <select
                      value={payStatus}
                      onChange={e => setPayStatus(e.target.value as ShowPaymentStatus)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      <option value="Agendado">Agendado (Pendente)</option>
                      <option value="Recebido">Recebido (Pago)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={payAmount}
                    onChange={e => {
                      setPayAmount(e.target.value);
                      setPaymentWarning(null);
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black tabular-nums"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={payDate}
                      onChange={e => setPayDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Conta de Destino</label>
                    <select
                      value={payAccountId}
                      onChange={e => setPayAccountId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Observações (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Pix, restante no final..."
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPaymentOpen(false)}
                    className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-black uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 p-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase hover:bg-indigo-700 shadow-md"
                  >
                    Salvar Parcela
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL ADICIONAR DESPESA */}
        {isAddExpenseOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center">
                  <ArrowDownRight size={16} className="mr-2 text-rose-600" />
                  Nova Despesa do Show
                </h3>
                <button onClick={() => setIsAddExpenseOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Categoria</label>
                    <select
                      value={expCategory}
                      onChange={e => setExpCategory(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={expAmount}
                      onChange={e => setExpAmount(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={expDate}
                      onChange={e => setExpDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Conta de Saída</label>
                    <select
                      value={expAccountId}
                      onChange={e => setExpAccountId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Observações (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Gasolina ida e volta, pedágio rodovia..."
                    value={expNotes}
                    onChange={e => setExpNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(false)}
                    className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-black uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 p-3 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase hover:bg-rose-700 shadow-md"
                  >
                    Salvar Despesa
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DIÁLOGO INTELIGENTE DE CANCELAMENTO */}
        {showCancelPrompt && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3 text-rose-600">
                <AlertCircle size={24} />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Cancelar Show & Projeções
                </h3>
              </div>
              
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Este show possui <strong>{formatCurrency(finSummary.totalPending)}</strong> em receitas futuras agendadas.
              </p>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 space-y-1">
                <p>• Valores já recebidos ({formatCurrency(finSummary.totalReceived)}) permanecem protegidos.</p>
                <p>• As parcelas pendentes não devem constar como dinheiro garantido futuro.</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleConfirmCancelWithProjectionCleanup(true)}
                  className="w-full p-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition"
                >
                  Cancelar Show e Limpar Receitas Futuras
                </button>
                <button
                  onClick={() => handleConfirmCancelWithProjectionCleanup(false)}
                  className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Apenas Mudar Status p/ Cancelado
                </button>
                <button
                  onClick={() => setShowCancelPrompt(false)}
                  className="w-full p-2 text-slate-400 text-xs hover:underline"
                >
                  Voltar sem Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3 text-rose-600">
                <AlertCircle size={22} />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Excluir Apresentação?
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tem certeza que deseja excluir o show de <strong>{show.contractorName || show.name}</strong>? Suas movimentações vinculadas serão removidas com segurança.
              </p>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-black uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete(show.id);
                    onClose();
                  }}
                  className="w-1/2 p-3 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase tracking-wider hover:bg-rose-700"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
