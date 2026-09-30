import React, { useState, useMemo, useEffect } from 'react';
import { Show, ShowStatus, ShowPayment, ShowExpenseItem, ShowPaymentType, ShowPaymentStatus } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, Calendar, Clock, MapPin, DollarSign, 
  CheckCircle2, AlertCircle, Edit3, Trash2, 
  Wallet, ArrowDownRight, 
  Check, Plus, AlertTriangle, 
  ChevronRight, ExternalLink, Sparkles, Tag, Info
} from 'lucide-react';
import { getStatusConfig } from './types';
import { 
  normalizeShowFinancials, 
  getShowFinancialSummary 
} from '../../services/showFinanceSyncService';
import { generateUUID } from '../../services/uuidHelper';
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
  // 1. TODAS AS DECLARAÇÕES DE HOOKS NO TOPO ABSOLUTO (SEM CONDICIONAIS OU RETORNOS ANTECIPADOS)
  const navigate = useNavigate();
  const { shows, accounts, transactions, updateShow } = useFinance();

  const [activeSection, setActiveSection] = useState<'finance' | 'info' | 'contract' | 'history'>('finance');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  // Extras modal state
  const [isEditExtrasOpen, setIsEditExtrasOpen] = useState(false);
  const [extraInput, setExtraInput] = useState('');

  // Default Account
  const defaultAccountId = accounts && accounts.length > 0 ? accounts[0].id : 'acc_bank';

  // Local state for instant zero-latency reactivity
  const [localShow, setLocalShow] = useState<Show | null>(() => {
    if (!initialShow) return null;
    try {
      return normalizeShowFinancials(initialShow, defaultAccountId);
    } catch {
      return initialShow;
    }
  });

  // Keep localShow in sync when context shows or initialShow changes
  useEffect(() => {
    if (initialShow?.id) {
      const found = shows.find(s => s.id === initialShow.id) || initialShow;
      try {
        setLocalShow(normalizeShowFinancials(found, defaultAccountId));
      } catch {
        setLocalShow(found);
      }
    } else {
      setLocalShow(null);
    }
  }, [shows, initialShow?.id, defaultAccountId]);

  const show = localShow;

  // Transações vinculadas (incondicional)
  const linkedTransactions = useMemo(() => {
    if (!transactions || !show?.id) return [];
    return transactions
      .filter(t => t && t.showId === show.id)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [transactions, show?.id]);

  // Payment Form State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [payType, setPayType] = useState<ShowPaymentType>('Sinal');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => initialShow?.date || new Date().toISOString().slice(0, 10));
  const [payEffectiveDate, setPayEffectiveDate] = useState(() => initialShow?.date || new Date().toISOString().slice(0, 10));
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

  // Sincronizar estados dos formulários quando o show selecionado mudar
  useEffect(() => {
    setIsAddPaymentOpen(false);
    setIsAddExpenseOpen(false);
    setIsEditExtrasOpen(false);
    setEditingPaymentId(null);
    setPaymentWarning(null);
    if (initialShow?.date) {
      setPayDate(initialShow.date);
      setPayEffectiveDate(initialShow.date);
      setExpDate(initialShow.date);
    }
    setExtraInput(String(initialShow?.extraAmount || ''));
    setPayAccountId(defaultAccountId);
    setExpAccountId(defaultAccountId);
  }, [initialShow?.id, initialShow?.date, initialShow?.extraAmount, defaultAccountId]);

  // 2. APÓS TODOS OS HOOKS DECLARADOS, VERIFICAÇÃO DE DADOS
  if (!show) return null;

  // Data atual do dispositivo (local timezone)
  const getDeviceToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getDeviceToday();
  const statusCfg = getStatusConfig(show.status);
  const finSummary = getShowFinancialSummary(show);

  const formatCurrency = (val?: number | string | null) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0).replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
  };

  const formatDateBR = (dStr?: string | null) => {
    if (!dStr) return '';
    try {
      const s = String(dStr);
      if (s.includes('-')) {
        const [y, m, d] = s.split('-');
        const numY = Number(y);
        const numM = Number(m);
        const numD = Number(d);
        if (!isNaN(numY) && !isNaN(numM) && !isNaN(numD)) {
          const date = new Date(numY, numM - 1, numD, 12, 0, 0);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
          }
        }
      }
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      }
      return s;
    } catch {
      return String(dStr || '');
    }
  };

  // Handler de mudança de data do pagamento com ajuste inteligente de status
  const handlePaymentDateChange = (newDate: string) => {
    setPayDate(newDate);
    setPaymentWarning(null);
    if (newDate > todayStr) {
      // Se a data for futura, ajusta status automaticamente para Agendado
      setPayStatus('Agendado');
    }
  };

  // Abrir modal de criação de pagamento (data preenchida com o dia atual do dispositivo)
  const handleOpenAddPayment = (suggestType?: ShowPaymentType) => {
    setEditingPaymentId(null);
    setPaymentWarning(null);

    const remaining = finSummary.remainingToSchedule;
    if (suggestType) {
      setPayType(suggestType);
    } else if (show.payments && show.payments.length > 0) {
      setPayType(remaining > 0 ? 'Restante' : 'Parcela');
    } else {
      setPayType('Sinal');
    }

    const deviceDate = getDeviceToday();
    setPayAmount(remaining > 0 ? String(remaining) : '');
    setPayDate(deviceDate);
    setPayEffectiveDate(deviceDate);
    setPayAccountId(defaultAccountId);
    setPayStatus('Agendado');
    setPayNotes('');
    setIsAddPaymentOpen(true);
  };

  // Abrir modal de edição de pagamento existente com TODOS os campos editáveis
  const handleOpenEditPayment = (payment: ShowPayment) => {
    setEditingPaymentId(payment.id);
    setPaymentWarning(null);
    setPayType(payment.type || 'Parcela');
    setPayAmount(String(payment.amount || ''));
    
    const deviceDate = getDeviceToday();
    const pDate = payment.expectedDate || deviceDate;
    setPayDate(pDate);
    setPayEffectiveDate(payment.effectiveDate || (pDate <= deviceDate ? pDate : deviceDate));
    setPayAccountId(payment.accountId || defaultAccountId);
    setPayStatus(pDate > deviceDate ? 'Agendado' : (payment.status || 'Agendado'));
    setPayNotes(payment.notes || '');
    setIsAddPaymentOpen(true);
  };

  // Salvar Pagamento (criação ou edição com validação de total previsto e status por data)
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(payAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    // Regra: Total dos pagamentos <= Valor contratado + Extras
    const currentSumWithoutThis = (show.payments || [])
      .filter(p => p.id !== editingPaymentId)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    
    const newTotal = currentSumWithoutThis + amountVal;
    const totalPredicted = finSummary.totalPredicted;

    if (newTotal > totalPredicted + 0.01) {
      const diff = newTotal - totalPredicted;
      setPaymentWarning(
        `A soma dos pagamentos (${formatCurrency(newTotal)}) ultrapassa o valor total previsto do show (${formatCurrency(totalPredicted)} = ${formatCurrency(finSummary.totalContracted)} contratado + ${formatCurrency(finSummary.extraAmount)} extras) em ${formatCurrency(diff)}. Ajuste o valor da parcela ou adicione o valor em Extras.`
      );
      return;
    }

    // Lógica inteligente de status por data:
    // Se a data for FUTURA, o status obrigatoriamente deve ser Agendado (Pendente)
    const isFutureDate = payDate > todayStr;
    const finalStatus: ShowPaymentStatus = isFutureDate ? 'Agendado' : payStatus;
    const finalEffectiveDate = finalStatus === 'Recebido' 
      ? (payEffectiveDate || (payDate <= todayStr ? payDate : todayStr)) 
      : undefined;

    const currentPayments = [...(show.payments || [])];
    if (editingPaymentId) {
      const idx = currentPayments.findIndex(p => p.id === editingPaymentId);
      if (idx >= 0) {
        currentPayments[idx] = {
          ...currentPayments[idx],
          type: payType,
          amount: amountVal,
          expectedDate: payDate,
          effectiveDate: finalEffectiveDate,
          accountId: payAccountId,
          status: finalStatus,
          notes: payNotes.trim()
        };
      }
    } else {
      currentPayments.push({
        id: generateUUID(),
        type: payType,
        amount: amountVal,
        expectedDate: payDate,
        effectiveDate: finalEffectiveDate,
        accountId: payAccountId,
        status: finalStatus,
        notes: payNotes.trim()
      });
    }

    const updatedShow: Show = normalizeShowFinancials({
      ...show,
      payments: currentPayments
    }, defaultAccountId);

    setLocalShow(updatedShow);
    updateShow(updatedShow);
    setIsAddPaymentOpen(false);
    setEditingPaymentId(null);
  };

  // Toggle single payment status (Agendado <-> Recebido)
  const handleTogglePaymentStatus = (payment: ShowPayment) => {
    const isCurrentlyReceived = payment.status === 'Recebido';
    let newStatus: ShowPaymentStatus;
    let newEffectiveDate: string | undefined;

    if (isCurrentlyReceived) {
      newStatus = 'Agendado';
      newEffectiveDate = undefined;
    } else {
      newStatus = 'Recebido';
      newEffectiveDate = payment.effectiveDate || (payment.expectedDate <= todayStr ? payment.expectedDate : todayStr);
    }

    const updatedPayments = (show.payments || []).map(p => {
      if (p.id === payment.id) {
        return {
          ...p,
          status: newStatus,
          effectiveDate: newEffectiveDate
        };
      }
      return p;
    });

    const updatedShow: Show = normalizeShowFinancials({
      ...show,
      payments: updatedPayments
    }, defaultAccountId);

    setLocalShow(updatedShow);
    updateShow(updatedShow);
  };

  // Delete payment
  const handleDeletePayment = (paymentId: string) => {
    const updatedPayments = (show.payments || []).filter(p => p.id !== paymentId);
    const updatedShow: Show = normalizeShowFinancials({
      ...show,
      payments: updatedPayments
    }, defaultAccountId);

    setLocalShow(updatedShow);
    updateShow(updatedShow);
  };

  // Salvar Extras do Show
  const handleSaveExtras = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(extraInput.replace(',', '.')) || 0;
    const updatedShow: Show = normalizeShowFinancials({
      ...show,
      extraAmount: Math.max(0, val)
    }, defaultAccountId);

    setLocalShow(updatedShow);
    updateShow(updatedShow);
    setIsEditExtrasOpen(false);
  };

  // Salvar Despesa
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    const currentExpenses = [...(show.expenseItems || [])];
    currentExpenses.push({
      id: generateUUID(),
      category: expCategory,
      amount: amountVal,
      date: expDate,
      accountId: expAccountId,
      notes: expNotes.trim()
    });

    const updatedShow: Show = normalizeShowFinancials({
      ...show,
      expenseItems: currentExpenses
    }, defaultAccountId);

    setLocalShow(updatedShow);
    updateShow(updatedShow);

    setIsAddExpenseOpen(false);
    setExpAmount('');
    setExpNotes('');
  };

  // Delete Expense
  const handleDeleteExpense = (expenseId: string) => {
    const updatedExpenses = (show.expenseItems || []).filter(e => e.id !== expenseId);
    const updatedShow: Show = normalizeShowFinancials({
      ...show,
      expenseItems: updatedExpenses
    }, defaultAccountId);

    setLocalShow(updatedShow);
    updateShow(updatedShow);
  };

  // Navegar exatamente para a movimentação no Extrato
  const handleNavigateToTransaction = (transactionId?: string) => {
    if (transactionId) {
      navigate(`/financeiro?tab=movimentacoes&highlightId=${transactionId}`);
    } else {
      navigate('/financeiro?tab=movimentacoes');
    }
    onClose();
  };

  // Cancel Show prompt
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
              title="Editar Dados do Show"
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

        {/* Top Highlight: Contratante e Local */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {show.contractorName || show.name || 'Apresentação'}
          </h2>
          <p className="text-xs text-slate-500 font-medium flex items-center">
            <Calendar size={13} className="mr-1 text-indigo-600" />
            {formatDateBR(show.date)} {show.city ? `• ${show.city}` : ''}
          </p>
        </div>

        {/* Abas da Ficha: Financeiro, Informações, Contratação, Histórico */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex space-x-3 text-xs font-bold">
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
          
          {/* SEÇÃO 1: FINANCEIRO COMPLETO (RELAÇÃO CONTRATADO / PAGAMENTOS / EXTRATO) */}
          {activeSection === 'finance' && (
            <div className="space-y-6">
              
              {/* 1.1 RESUMO FINANCEIRO DO SHOW (7 INDICADORES COM ATUALIZAÇÃO REATIVA INSTANTÂNEA) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl border border-slate-800">
                
                {/* Linha 1: Contratação, Extras e Total Previsto */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Contratação
                    </span>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-base font-bold text-slate-200">
                        Cachê: {formatCurrency(finSummary.totalContracted)}
                      </span>
                      {finSummary.extraAmount > 0 && (
                        <span className="text-xs font-bold text-amber-400">
                          + {formatCurrency(finSummary.extraAmount)} Extras
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 pt-0.5">
                      <span className="text-xs text-slate-400">Total Previsto:</span>
                      <span className="text-sm font-black text-indigo-300">
                        {formatCurrency(finSummary.totalPredicted)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <button
                      onClick={() => {
                        setExtraInput(String(show.extraAmount || ''));
                        setIsEditExtrasOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/30 transition"
                    >
                      {show.extraAmount ? 'Editar Extras' : '+ Adicionar Extra'}
                    </button>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Lucro Líquido
                      </span>
                      <span className={`text-lg font-black tabular-nums ${finSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(finSummary.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Linha 2: Subgrid com Recebido, A Receber e Despesas */}
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

                {/* Explicação da regra de Lucro Líquido */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Lucro Líquido = Recebido - Despesas</span>
                  <span className="font-bold text-slate-300">
                    {formatCurrency(finSummary.totalReceived)} - {formatCurrency(finSummary.totalExpenses)}
                  </span>
                </div>
              </div>

              {/* 1.2 SEÇÃO PAGAMENTOS & RECEBIMENTOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center">
                      <Wallet size={15} className="mr-1.5 text-indigo-600" />
                      Pagamentos do Show ({show.payments?.length || 0})
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Sinais, parcelas e extras efetivados ou agendados
                    </p>
                  </div>

                  <button
                    onClick={() => handleOpenAddPayment()}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center space-x-1"
                  >
                    <Plus size={13} strokeWidth={3} />
                    <span>Adicionar Pagamento</span>
                  </button>
                </div>

                {/* Lista de Pagamentos ou Mensagem de Nenhum Cadastrado */}
                {(!show.payments || show.payments.length === 0) ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Nenhum pagamento cadastrado.
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      O valor contratado é de {formatCurrency(finSummary.totalContracted)}. Cadastre um sinal, parcela ou pagamento quando houver negociação.
                    </p>
                    <button
                      onClick={() => handleOpenAddPayment('Sinal')}
                      className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1 transition shadow-sm"
                    >
                      <Plus size={13} strokeWidth={3} />
                      <span>+ Adicionar Pagamento</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {show.payments.map((p, idx) => {
                      const isReceived = p.status === 'Recebido';
                      const acc = accounts.find(a => a.id === p.accountId);

                      return (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-3 min-w-0">
                              {/* Botão de Toggle Rápido Status */}
                              <button
                                onClick={() => handleTogglePaymentStatus(p)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition active:scale-95 shadow-xs shrink-0 ${
                                  isReceived
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                }`}
                                title={isReceived ? 'Clique para marcar como Agendado/Pendente' : 'Clique para marcar como Recebido'}
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
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  }`}>
                                    {p.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Data Prevista: <strong className="text-slate-600 dark:text-slate-300 font-bold">{formatDateBR(p.expectedDate)}</strong>
                                  {isReceived && p.effectiveDate && (
                                    <span> • Recebido em: {formatDateBR(p.effectiveDate)}</span>
                                  )}
                                  {acc ? ` • ${acc.name}` : ''}
                                </p>
                                {p.notes && (
                                  <p className="text-[10px] text-slate-500 italic mt-0.5 truncate">
                                    "{p.notes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className={`text-sm font-black tabular-nums block ${isReceived ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                                {formatCurrency(p.amount)}
                              </span>
                            </div>
                          </div>

                          {/* Ações do Pagamento: Editar, Ver no Extrato, Excluir */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-bold">
                            <div className="flex items-center space-x-2">
                              {p.transactionId && (
                                <button
                                  onClick={() => handleNavigateToTransaction(p.transactionId)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                                >
                                  <ExternalLink size={11} />
                                  <span>Ver no Extrato</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleOpenEditPayment(p)}
                                className="px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition flex items-center space-x-1"
                              >
                                <Edit3 size={11} />
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                title="Remover pagamento"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
                      Despesas do Show ({show.expenseItems?.length || 0})
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
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 pr-2">
                              <h5 className="text-xs font-black text-slate-800 dark:text-white">
                                {e.category} {e.notes ? `(${e.notes})` : ''}
                              </h5>
                              <p className="text-[10px] text-slate-400">
                                {formatDateBR(e.date)} {acc ? `• ${acc.name}` : ''}
                              </p>
                            </div>

                            <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">
                              -{formatCurrency(e.amount)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-bold">
                            {e.transactionId ? (
                              <button
                                onClick={() => handleNavigateToTransaction(e.transactionId)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                              >
                                <ExternalLink size={11} />
                                <span>Ver no Extrato</span>
                              </button>
                            ) : <span />}

                            <button
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
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
                    Movimentações Vinculadas no Extrato ({linkedTransactions.length})
                  </span>
                  <button
                    onClick={() => handleNavigateToTransaction()}
                    className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline flex items-center"
                  >
                    Ver Todas no Extrato <ChevronRight size={12} />
                  </button>
                </div>

                {linkedTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">
                    Nenhuma movimentação gerada ainda no Financeiro.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {linkedTransactions.map(tx => (
                      <div
                        key={tx.id}
                        onClick={() => handleNavigateToTransaction(tx.id)}
                        className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {tx.description}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {formatDateBR(tx.date)} • {tx.status === 'paid' ? 'Efetivado' : 'Projetado/Agendado'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`font-black tabular-nums ${
                            tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                          <ChevronRight size={12} className="text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SEÇÃO 2: INFORMAÇÕES DO SHOW */}
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
                  <span className="text-xs font-bold text-slate-500">Valor Contratado (Cachê):</span>
                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(show.totalCache ?? show.cacheCombined)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-bold text-slate-500">Extras Adicionais:</span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatCurrency(show.extraAmount || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-bold text-slate-500">Valor Total Previsto:</span>
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {formatCurrency(finSummary.totalPredicted)}
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
                    {show.createdAt && !isNaN(new Date(show.createdAt).getTime()) ? new Date(show.createdAt).toLocaleDateString('pt-BR') : 'Original'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Identificador:</span>
                  <span className="font-mono text-[10px] text-slate-500">{String(show.id || '').slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Situação:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{show.status}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL ADICIONAR / EDITAR EXTRAS */}
        {isEditExtrasOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center">
                  <Tag size={16} className="mr-2 text-amber-500" />
                  Extras da Contratação
                </h3>
                <button onClick={() => setIsEditExtrasOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Informe valores adicionais acordados com o contratante que aumentam o valor total previsto do show.
              </p>

              <form onSubmit={handleSaveExtras} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Valor de Extras (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={extraInput}
                    onChange={e => setExtraInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-black tabular-nums text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cachê Base:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(finSummary.totalContracted)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Extras:</span>
                    <span className="font-bold text-amber-500">+{formatCurrency(parseFloat(extraInput.replace(',', '.')) || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Novo Total Previsto:</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(finSummary.totalContracted + (parseFloat(extraInput.replace(',', '.')) || 0))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditExtrasOpen(false)}
                    className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 p-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase hover:bg-indigo-700 shadow-md"
                  >
                    Salvar Extras
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL ADICIONAR / EDITAR PAGAMENTO COM LÓGICA INTELIGENTE DE DATA & STATUS */}
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
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
                  <div className="flex items-center space-x-1.5 font-black">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                    <span>Aviso de Validação</span>
                  </div>
                  <p>{paymentWarning}</p>
                </div>
              )}

              <form onSubmit={handleSavePayment} className="space-y-3.5">
                
                {/* 1. TIPOS DE PAGAMENTOS & 2. STATUS */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Tipo de Pagamento *
                    </label>
                    <select
                      value={payType}
                      onChange={e => setPayType(e.target.value as ShowPaymentType)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    >
                      <option value="Sinal">Sinal</option>
                      <option value="Parcela">Parcela</option>
                      <option value="Restante">Restante</option>
                      <option value="Pagamento final">Pagamento final</option>
                      <option value="Extra">Extra / Adicional</option>
                      <option value="Bônus">Bônus</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Status *
                    </label>
                    <select
                      value={payDate > todayStr ? 'Agendado' : payStatus}
                      onChange={e => {
                        const newSt = e.target.value as ShowPaymentStatus;
                        if (payDate > todayStr && newSt === 'Recebido') {
                          setPaymentWarning('Para registrar como Recebido agora, a data do pagamento deve ser hoje ou anterior.');
                          setPayStatus('Agendado');
                        } else {
                          setPayStatus(newSt);
                          setPaymentWarning(null);
                        }
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    >
                      <option value="Agendado">Agendado (Pendente)</option>
                      <option value="Recebido" disabled={payDate > todayStr}>
                        Recebido (Pago) {payDate > todayStr ? '(Data futura)' : ''}
                      </option>
                    </select>
                  </div>
                </div>

                {/* 3. VALOR (R$) */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={payAmount}
                    onChange={e => {
                      setPayAmount(e.target.value);
                      setPaymentWarning(null);
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black tabular-nums text-slate-800 dark:text-white"
                  />
                </div>

                {/* 4. DATA (com ajuste inteligente por data futura) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={payStatus === 'Recebido' && payDate <= todayStr ? '' : 'col-span-2'}>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Data Prevista / Pagamento *
                    </label>
                    <input
                      type="date"
                      required
                      value={payDate}
                      onChange={e => handlePaymentDateChange(e.target.value)}
                      onClick={e => {
                        try {
                          (e.currentTarget as any).showPicker?.();
                        } catch {}
                      }}
                      onFocus={e => {
                        try {
                          (e.currentTarget as any).showPicker?.();
                        } catch {}
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                    />
                    {payDate > todayStr && (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block mt-1 flex items-center">
                        <Info size={10} className="mr-1 inline shrink-0" />
                        Data futura: status definido como Agendado (Pendente).
                      </span>
                    )}
                  </div>

                  {/* DATA DE RECEBIMENTO QUANDO RECEBIDO */}
                  {payStatus === 'Recebido' && payDate <= todayStr && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Data Efetiva de Recebimento
                      </label>
                      <input
                        type="date"
                        value={payEffectiveDate}
                        onChange={e => setPayEffectiveDate(e.target.value)}
                        onClick={e => {
                          try {
                            (e.currentTarget as any).showPicker?.();
                          } catch {}
                        }}
                        onFocus={e => {
                          try {
                            (e.currentTarget as any).showPicker?.();
                          } catch {}
                        }}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* 5. CONTA DESTINO */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Conta Bancária / Destino *
                  </label>
                  <select
                    value={payAccountId}
                    onChange={e => setPayAccountId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* 6. OBSERVAÇÕES (OPCIONAL) */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pix adiantamento, restante no final do show..."
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPaymentOpen(false)}
                    className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 p-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase hover:bg-indigo-700 shadow-md"
                  >
                    {editingPaymentId ? 'Salvar Alterações' : 'Cadastrar Pagamento'}
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0,00"
                      value={expAmount}
                      onChange={e => setExpAmount(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black tabular-nums text-slate-800 dark:text-white"
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Conta de Saída</label>
                    <select
                      value={expAccountId}
                      onChange={e => setExpAccountId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
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
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(false)}
                    className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase"
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
                <p>• Valores já recebidos ({formatCurrency(finSummary.totalReceived)}) permanecem protegidos no Financeiro.</p>
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
