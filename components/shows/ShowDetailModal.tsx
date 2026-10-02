import React, { useState, useMemo, useEffect } from 'react';
import { Show, ShowStatus, ShowPayment, ShowPaymentType, Transaction } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, Calendar, Clock, MapPin, DollarSign, 
  CheckCircle2, AlertCircle, Edit3, Trash2, 
  Wallet, ArrowDownRight, ArrowUpRight,
  Check, Plus, AlertTriangle, Link2, Unlink,
  ChevronRight, ExternalLink, Sparkles, Tag, Info, Music,
  ArrowRight, Zap, Lock, HelpCircle, FileText, CheckCircle,
  Copy, Volume2, Navigation, Phone, MessageCircle
} from 'lucide-react';
import { getStatusConfig } from './types';
import { 
  normalizeShowFinancials, 
  getShowFinancialSummary 
} from '../../services/showFinanceSyncService';
import { generateUUID } from '../../services/uuidHelper';
import { useNavigate } from 'react-router-dom';
import { TransactionForm } from '../TransactionForm';
import { syncShowToGoogleCalendar, googleSignIn, getAccessToken } from '../../services/googleCalendarService';
import { ReciboModal } from './ReciboModal';

interface Props {
  show: Show | null;
  onClose: () => void;
  onEdit: (show: Show) => void;
  onDelete: (showId: string) => void;
  onUpdateStatus: (show: Show, newStatus: ShowStatus) => void;
  initialTab?: 'finance' | 'expenses' | 'details';
  openPaymentDirectly?: boolean;
}

const EXPENSE_CATEGORIES = [
  'Gasolina / Combustível',
  'Músicos Extras / Banda',
  'Alimentação',
  'Pedágio',
  'Estacionamento',
  'Hospedagem',
  'Comissão / Agenciamento',
  'Equipe Técnica / Roadie',
  'Outros Custos'
];

export const ShowDetailModal: React.FC<Props> = ({
  show: initialShow,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus,
  initialTab = 'finance',
  openPaymentDirectly = false
}) => {
  const navigate = useNavigate();
  const { shows, accounts, transactions, updateShow, updateTransaction, addTransaction, deleteTransaction, getDefaultAccountForScope } = useFinance();

  const [activeSection, setActiveSection] = useState<'finance' | 'expenses' | 'details'>(initialTab);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkPixModal, setShowLinkPixModal] = useState(false);
  
  // Selected transaction to edit in-place without losing drawer context
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Default Business Account
  const defaultAccountId = getDefaultAccountForScope('BUSINESS');

  // Sincronização em tempo real do show
  const show = useMemo(() => {
    if (!initialShow) return null;
    const found = shows.find(s => s.id === initialShow.id) || initialShow;
    try {
      return normalizeShowFinancials(found, defaultAccountId);
    } catch {
      return found;
    }
  }, [shows, initialShow, defaultAccountId]);

  // Transações vinculadas do extrato (fontes da verdade do caixa)
  const linkedTransactions = useMemo(() => {
    if (!transactions || !show?.id) return [];
    return transactions
      .filter(t => t && t.showId === show.id)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [transactions, show?.id]);

  const linkedIncomeTransactions = useMemo(() => {
    return linkedTransactions.filter(t => t.type === 'income');
  }, [linkedTransactions]);

  const linkedExpenseTransactions = useMemo(() => {
    return linkedTransactions.filter(t => t.type === 'expense');
  }, [linkedTransactions]);

  // Transações de Receita NÃO vinculadas que podem ser associadas com 1 clique
  const unlinkedIncomeTransactions = useMemo(() => {
    if (!transactions || !show?.id) return [];
    return transactions
      .filter(t => t.type === 'income' && !t.showId && (t.scope === 'BUSINESS' || t.categoryId === 'cat_33'))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [transactions, show?.id]);

  const getTodayISO = () => new Date().toISOString().slice(0, 10);
  const todayStr = useMemo(() => getTodayISO(), []);
  
  // O show é hoje ou já passou?
  const isDateTodayOrPast = show ? (show.date || '') <= todayStr : false;

  // Payment Form State (Recebimento / Parcela)
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(openPaymentDirectly);
  const [payStatus, setPayStatus] = useState<'Recebido' | 'Agendado'>('Recebido');
  const [payType, setPayType] = useState<ShowPaymentType>('Sinal');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => getTodayISO());
  const [payAccountId, setPayAccountId] = useState(defaultAccountId);
  const [payNotes, setPayNotes] = useState('');

  // Expense Form State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => getTodayISO());
  const [expStatus, setExpStatus] = useState<'paid' | 'pending'>('paid');
  const [expAccountId, setExpAccountId] = useState(defaultAccountId);
  const [expNotes, setExpNotes] = useState('');

  // Quick Edit Income State (Edição livre de Data, Valor e Conta Bancária)
  const [editingIncomeTx, setEditingIncomeTx] = useState<{
    id: string;
    date: string;
    amount: string;
    accountId: string;
    showPaymentType: ShowPaymentType;
    status: 'paid' | 'pending';
    description: string;
  } | null>(null);

  // Quick Edit Expense State (Alterar Data, Valor e Status Pago/A Pagar)
  const [editingExpenseTx, setEditingExpenseTx] = useState<{
    id: string;
    date: string;
    amount: string;
    accountId: string;
    status: 'paid' | 'pending';
    category: string;
    description: string;
  } | null>(null);

  // Horário de Passagem de Som
  const initialSoundcheck = useMemo(() => {
    if (!initialShow) return '';
    if ((initialShow as any).soundcheckTime) return String((initialShow as any).soundcheckTime);
    const match = (initialShow.notes || '').match(/passagem\s*(?:de\s*som)?[:\s]+(\d{1,2}:\d{2})/i);
    return match ? match[1] : '';
  }, [initialShow]);

  const [soundcheckTime, setSoundcheckTime] = useState(initialSoundcheck);
  const [quickSoundcheckInput, setQuickSoundcheckInput] = useState(initialSoundcheck);
  const [isQuickSettingSoundcheck, setIsQuickSettingSoundcheck] = useState(false);

  // Logistics Inline Edit State
  const [isEditingLogistics, setIsEditingLogistics] = useState(false);
  const [editLocation, setEditLocation] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editContractorName, setEditContractorName] = useState('');
  const [editContractorPhone, setEditContractorPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Modal para editar valor do cachê contratado
  const [isEditCacheModalOpen, setIsEditCacheModalOpen] = useState(false);
  const [newContractedCache, setNewContractedCache] = useState('');

  // Modal para Gerador de Recibo de Sinal (PDF / WhatsApp)
  const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);

  // Modal de conclusão do show (quando há saldo pendente ao marcar como Realizado)
  const [showCompletionModalOpen, setShowCompletionModalOpen] = useState(false);
  const [completionAccountId, setCompletionAccountId] = useState(defaultAccountId);

  // Auto-ajustar status da despesa conforme data selecionada
  useEffect(() => {
    if (expDate > todayStr) {
      setExpStatus('pending');
    }
  }, [expDate, todayStr]);

  // Reset form states on show switch
  useEffect(() => {
    setIsAddPaymentOpen(openPaymentDirectly);
    setIsAddExpenseOpen(false);
    setShowLinkPixModal(false);
    setShowDeleteConfirm(false);
    setIsEditCacheModalOpen(false);
    setShowCompletionModalOpen(false);
    setEditingTransaction(null);
    setDeletingTransaction(null);
    setEditingIncomeTx(null);
    setEditingExpenseTx(null);
    setIsEditingLogistics(false);
    setIsQuickSettingSoundcheck(false);
    setPayDate(getTodayISO());
    setExpDate(getTodayISO());
    setPayStatus('Recebido');
    setExpStatus('paid');
    if (initialShow) {
      const sc = (initialShow as any).soundcheckTime || '';
      setSoundcheckTime(sc);
      setQuickSoundcheckInput(sc);
      setEditLocation(initialShow.location || '');
      setEditCity(initialShow.city || '');
      setEditContractorName(initialShow.contractorName || initialShow.name || '');
      setEditContractorPhone(initialShow.contractorPhone || '');
      setEditNotes(initialShow.notes || '');
    }
  }, [initialShow?.id, openPaymentDirectly]);

  if (!show) return null;

  const statusCfg = getStatusConfig(show.status);
  const finSummary = getShowFinancialSummary(show, transactions);
  const isFullyPaid = finSummary.totalPending === 0 && finSummary.totalContracted > 0;

  const formatCurrency = (val?: number | string | null) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0).replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
  };

  const formatDateBR = (dStr?: string | null) => {
    if (!dStr) return '';
    try {
      const parts = String(dStr).split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
      const dt = new Date(String(dStr));
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {}
    return String(dStr || '');
  };

  const formatShortDate = (dStr?: string | null) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dStr;
  };

  // =========================================================================
  // HANDLERS: EDIÇÃO DO CACHÊ CONTRATADO
  // =========================================================================
  const handleOpenEditCache = () => {
    setNewContractedCache(String(finSummary.totalContracted || ''));
    setIsEditCacheModalOpen(true);
  };

  const handleSaveContractedCache = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newContractedCache.replace(',', '.')) || 0;
    if (val < 0) return;

    updateShow({
      ...show,
      totalCache: val,
      cacheCombined: val
    });

    setIsEditCacheModalOpen(false);
    showToast(`Valor do cachê contratado atualizado para ${formatCurrency(val)}!`);
  };

  // =========================================================================
  // HANDLERS: TRANSAÇÕES E RECEBIMENTOS
  // =========================================================================
  const handleLinkTransaction = (tx: Transaction, selectedType: ShowPaymentType = 'Parcela') => {
    updateTransaction({
      ...tx,
      showId: show.id,
      showPaymentType: selectedType,
      scope: 'BUSINESS',
      categoryId: 'cat_33'
    });
    setShowLinkPixModal(false);
    showToast(`Pix de ${formatCurrency(tx.amount)} vinculado com sucesso!`);
  };

  const handleChangePaymentType = (tx: Transaction, newType: ShowPaymentType) => {
    updateTransaction({
      ...tx,
      showPaymentType: newType
    });
    showToast(`Classificação alterada para ${newType}`);
  };

  const handleUnlinkTransaction = (tx: Transaction) => {
    updateTransaction({
      ...tx,
      showId: undefined,
      showPaymentType: undefined
    });
    showToast(`Transação desvinculada do show (mantida no caixa).`);
  };

  // Dar baixa rápida em recebimento pendente (marcar como recebido hoje)
  const handleConfirmPendingIncome = (tx: Transaction) => {
    updateTransaction({
      ...tx,
      status: 'paid',
      date: getTodayISO()
    });

    // Sincronizar também no payments do show se existir
    if (Array.isArray(show.payments)) {
      const updatedPayments = show.payments.map(p => {
        if (p.transactionId === tx.id) {
          return { ...p, status: 'Recebido' as const, effectiveDate: getTodayISO() };
        }
        return p;
      });
      updateShow({ ...show, payments: updatedPayments });
    }

    showToast(`Recebimento de ${formatCurrency(tx.amount)} confirmado no Caixa!`);
  };

  // Dar baixa rápida em despesa pendente
  const handleConfirmPendingExpense = (tx: Transaction) => {
    updateTransaction({
      ...tx,
      status: 'paid',
      date: getTodayISO()
    });
    showToast(`Despesa de ${formatCurrency(tx.amount)} marcada como Paga no Caixa!`);
  };

  // Excluir definitivamente transação do Caixa
  const handleConfirmDeleteTransaction = () => {
    if (!deletingTransaction) return;

    deleteTransaction(deletingTransaction.id);

    // Remove do array de pagamentos do show se existir
    if (Array.isArray(show.payments)) {
      const updatedPayments = show.payments.filter(p => p.transactionId !== deletingTransaction.id);
      updateShow({ ...show, payments: updatedPayments });
    }

    setDeletingTransaction(null);
    showToast('Transação excluída do Caixa da Empresa.');
  };

  // Salvar Edição Livre de Recebimento (Data, Valor, Conta Bancária)
  const handleSaveEditIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncomeTx) return;
    const amountVal = parseFloat(editingIncomeTx.amount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    const originalTx = transactions.find(t => t.id === editingIncomeTx.id);
    if (!originalTx) return;

    updateTransaction({
      ...originalTx,
      amount: amountVal,
      date: editingIncomeTx.date,
      accountId: editingIncomeTx.accountId,
      showPaymentType: editingIncomeTx.showPaymentType,
      status: editingIncomeTx.status,
      description: editingIncomeTx.description || originalTx.description
    });

    if (Array.isArray(show.payments)) {
      const updatedPayments = show.payments.map(p => {
        if (p.transactionId === editingIncomeTx.id) {
          return {
            ...p,
            amount: amountVal,
            effectiveDate: editingIncomeTx.status === 'paid' ? editingIncomeTx.date : p.effectiveDate,
            expectedDate: editingIncomeTx.date,
            accountId: editingIncomeTx.accountId,
            type: editingIncomeTx.showPaymentType,
            status: editingIncomeTx.status === 'paid' ? ('Recebido' as const) : ('Agendado' as const)
          };
        }
        return p;
      });
      updateShow({ ...show, payments: updatedPayments });
    }

    setEditingIncomeTx(null);
    showToast(`Recebimento de ${formatCurrency(amountVal)} atualizado com sucesso!`);
  };

  // Salvar Edição de Custo do Show (Data, Valor, Status Pago/A Pagar, Conta)
  const handleSaveEditExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseTx) return;
    const amountVal = parseFloat(editingExpenseTx.amount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    const originalTx = transactions.find(t => t.id === editingExpenseTx.id);
    if (!originalTx) return;

    updateTransaction({
      ...originalTx,
      amount: amountVal,
      date: editingExpenseTx.date,
      accountId: editingExpenseTx.accountId,
      status: editingExpenseTx.status,
      description: editingExpenseTx.description || originalTx.description
    });

    setEditingExpenseTx(null);
    showToast(`Despesa de ${formatCurrency(amountVal)} atualizada com sucesso!`);
  };

  // Salvar Horário de Passagem de Som
  const handleSaveSoundcheckDirect = (timeValue: string) => {
    setSoundcheckTime(timeValue);
    setQuickSoundcheckInput(timeValue);
    setIsQuickSettingSoundcheck(false);
    updateShow({
      ...show,
      soundcheckTime: timeValue
    } as any);
    showToast(timeValue ? `Passagem de som definida para ${timeValue}!` : 'Passagem de som limpa.');
  };

  // Salvar Edição de Logística Completa
  const handleSaveLogistics = (e: React.FormEvent) => {
    e.preventDefault();
    updateShow({
      ...show,
      location: editLocation.trim(),
      city: editCity.trim(),
      contractorName: editContractorName.trim() || show.contractorName,
      contractorPhone: editContractorPhone.trim(),
      notes: editNotes.trim(),
      soundcheckTime: soundcheckTime.trim()
    } as any);
    setIsEditingLogistics(false);
    showToast('Dados e logística da apresentação atualizados!');
  };

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado!`);
  };

  // Cadastrar novo recebimento ou programar parcela
  const handleSaveManualPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(payAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    const chosenDate = payDate || getTodayISO();
    const targetAccount = accounts.find(a => a.id === payAccountId);
    const accountLabel = targetAccount ? targetAccount.name : 'Conta';

    const isPaid = payStatus === 'Recebido';
    const txId = generateUUID();
    const paymentId = generateUUID();

    // 1. Criar transação no livro-razão (status 'paid' ou 'pending')
    const newTx: any = {
      id: txId,
      type: 'income',
      amount: amountVal,
      description: `Cachê: ${show.contractorName || show.name} (${payType})`,
      categoryId: 'cat_33',
      accountId: payAccountId,
      date: chosenDate,
      status: isPaid ? 'paid' : 'pending',
      scope: 'BUSINESS',
      showId: show.id,
      showPaymentType: payType,
      showPaymentId: paymentId
    };

    addTransaction(newTx);

    setPayAmount('');
    setPayNotes('');
    setIsAddPaymentOpen(false);

    showToast(
      isPaid 
        ? `${payType} de ${formatCurrency(amountVal)} registrado na ${accountLabel}!` 
        : `Parcela de ${formatCurrency(amountVal)} programada para ${formatDateBR(chosenDate)}!`
    );
  };

  // Cadastrar despesa do show
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    const chosenDate = expDate || getTodayISO();
    // Se data for futura, SEMPRE força 'pending' conforme solicitado pelo usuário
    const isFuture = chosenDate > todayStr;
    const finalStatus = isFuture ? 'pending' : expStatus;

    let catId = 'cat_producao_shows';
    const catLower = expCategory.toLowerCase();
    if (catLower.includes('combust')) catId = 'cat_21';
    else if (catLower.includes('aliment')) catId = 'cat_1';

    const newTx: any = {
      id: generateUUID(),
      type: 'expense',
      amount: amountVal,
      description: `Despesa Show (${show.contractorName || show.name}): ${expCategory}${expNotes ? ` - ${expNotes}` : ''}`,
      categoryId: catId,
      accountId: expAccountId,
      date: chosenDate,
      status: finalStatus,
      scope: 'BUSINESS',
      showId: show.id
    };

    addTransaction(newTx);
    setExpAmount('');
    setExpNotes('');
    setIsAddExpenseOpen(false);

    showToast(
      finalStatus === 'pending'
        ? `Despesa de ${formatCurrency(amountVal)} agendada como PENDENTE no Caixa!`
        : `Despesa de ${formatCurrency(amountVal)} lançada e paga no Caixa!`
    );
  };

  // =========================================================================
  // HANDLERS: ROTINA DO MÚSICO & MARCAR REALIZADO COM ACERTO INTELIGENTE
  // =========================================================================
  const handleInitiateMarkRealized = () => {
    if (!isDateTodayOrPast) {
      showToast(`Atenção: Só é possível marcar como realizado no dia do evento (${formatDateBR(show.date)}) ou após.`);
      return;
    }

    // Se ainda restar saldo pendente do cachê contratado, perguntar ao músico
    if (finSummary.totalPending > 0) {
      setCompletionAccountId(defaultAccountId);
      setShowCompletionModalOpen(true);
    } else {
      // Já está 100% quitado
      onUpdateStatus(show, 'Realizado');
      showToast('Show marcado como Realizado com sucesso!');
    }
  };

  // Conclusão com Quitação Imediata no Caixa
  const handleCompleteWithImmediatePayment = () => {
    const remainingVal = finSummary.totalPending;
    const txId = generateUUID();
    const paymentId = generateUUID();

    // 1. Criar transação de quitação no Caixa
    const newTx: any = {
      id: txId,
      type: 'income',
      amount: remainingVal,
      description: `Cachê: ${show.contractorName || show.name} (Quitação Final)`,
      categoryId: 'cat_33',
      accountId: completionAccountId,
      date: getTodayISO(),
      status: 'paid',
      scope: 'BUSINESS',
      showId: show.id,
      showPaymentType: 'Parcela',
      showPaymentId: paymentId
    };

    addTransaction(newTx);

    // 2. Atualizar show para Realizado
    const newPayment: ShowPayment = {
      id: paymentId,
      type: 'Parcela',
      amount: remainingVal,
      expectedDate: getTodayISO(),
      effectiveDate: getTodayISO(),
      accountId: completionAccountId,
      status: 'Recebido',
      notes: 'Quitação automática ao marcar show como Realizado',
      transactionId: txId
    };

    const existingPayments = Array.isArray(show.payments) ? show.payments : [];
    updateShow({
      ...show,
      status: 'Realizado',
      payments: [...existingPayments, newPayment]
    });

    setShowCompletionModalOpen(false);
    showToast(`Quitação de ${formatCurrency(remainingVal)} registrada e show finalizado!`);
  };

  // Conclusão com Transação Pendente no Caixa (A Receber)
  const handleCompleteWithPendingTransaction = () => {
    const remainingVal = finSummary.totalPending;
    const txId = generateUUID();
    const paymentId = generateUUID();

    // 1. Criar transação a receber (pendente) no Caixa
    const newTx: any = {
      id: txId,
      type: 'income',
      amount: remainingVal,
      description: `Cachê a receber: ${show.contractorName || show.name} (Saldo Pendente)`,
      categoryId: 'cat_33',
      accountId: completionAccountId,
      date: getTodayISO(),
      status: 'pending',
      scope: 'BUSINESS',
      showId: show.id,
      showPaymentType: 'Parcela',
      showPaymentId: paymentId
    };

    addTransaction(newTx);

    // 2. Atualizar show para Realizado
    const newPayment: ShowPayment = {
      id: paymentId,
      type: 'Parcela',
      amount: remainingVal,
      expectedDate: getTodayISO(),
      accountId: completionAccountId,
      status: 'Agendado',
      notes: 'Saldo pendente gerado ao finalizar o show',
      transactionId: txId
    };

    const existingPayments = Array.isArray(show.payments) ? show.payments : [];
    updateShow({
      ...show,
      status: 'Realizado',
      payments: [...existingPayments, newPayment]
    });

    setShowCompletionModalOpen(false);
    showToast(`Transação pendente de ${formatCurrency(remainingVal)} gerada no Caixa. Show finalizado!`);
  };

  // Conclusão sem novas transações (mantém histórico existente)
  const handleCompleteWithoutNewTransaction = () => {
    onUpdateStatus(show, 'Realizado');
    setShowCompletionModalOpen(false);
    showToast('Show marcado como Realizado!');
  };

  const handleSyncToCalendar = async () => {
    try {
      let token = await getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        token = res?.accessToken || null;
      }
      if (!token) {
        showToast('Não foi possível conectar ao Google Calendar');
        return;
      }
      const eventId = await syncShowToGoogleCalendar(show);
      if (eventId) {
        updateShow({ ...show, googleCalendarEventId: eventId });
        showToast('Show enviado para o Google Calendar!');
      }
    } catch (err: any) {
      showToast(`Erro ao sincronizar: ${err.message || 'Falha na API'}`);
    }
  };

  return (
    <>
      {/* TOAST FLUTUANTE DE FEEDBACK */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[140] bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-black animate-slide-up border border-emerald-400">
          <CheckCircle2 size={16} strokeWidth={3} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CONTAINER DO MODAL RESPONSIVO (Nenhum elemento cortado) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        
        {/* CARD PRINCIPAL */}
        <div className="w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-[#121212] rounded-2xl sm:rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
          
          {/* HEADER FIXO DO MODAL */}
          <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-zinc-800 bg-[#18181b] flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Music size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusCfg.badgeClass}`}>
                    {show.status}
                  </span>
                  {isFullyPaid && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500 text-zinc-950 flex items-center space-x-1">
                      <Check size={10} strokeWidth={3} />
                      <span>Cachê Quitado</span>
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                  {show.contractorName || show.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                onClick={handleSyncToCalendar}
                className="p-1.5 sm:p-2 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition flex items-center space-x-1 border border-emerald-500/20"
                title="Enviar/Sincronizar para o Google Calendar"
              >
                <Calendar size={15} />
                <span className="text-[10px] font-bold hidden sm:inline">Google Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => onEdit(show)}
                className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Editar Dados da Apresentação"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                title="Excluir Show"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition ml-1"
                title="Fechar Painel"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* CONTEÚDO INTERNO COM SCROLL FLUIDO (CUSTOM-SCROLLBAR) */}
          <div className="overflow-y-auto p-3.5 sm:p-5 space-y-4 custom-scrollbar flex-1 pb-16">
            
            {/* Seletor Rápido de Status & Regra de Realizado */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                <Calendar size={13} className="text-emerald-400" />
                <span className="font-bold text-zinc-200">
                  {formatDateBR(show.date)} • {show.time || '20:00'}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                {show.status !== 'Realizado' ? (
                  isDateTodayOrPast ? (
                    <button
                      type="button"
                      onClick={handleInitiateMarkRealized}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-black uppercase tracking-wider transition active:scale-95 shadow-md shadow-emerald-500/20 flex items-center space-x-1.5"
                    >
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      <span>Marcar como Realizado</span>
                    </button>
                  ) : (
                    <div 
                      className="px-3 py-1.5 rounded-xl bg-zinc-800/80 text-zinc-400 text-[11px] font-bold border border-zinc-700/60 flex items-center space-x-1.5 cursor-not-allowed"
                      title={`Disponível a partir do dia do show (${formatShortDate(show.date)})`}
                    >
                      <Lock size={12} className="text-zinc-500" />
                      <span>Realizado no dia ({formatShortDate(show.date)})</span>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStatus(show, 'Confirmado');
                      showToast('Show reaberto como Confirmado.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold uppercase transition"
                  >
                    Reabrir (Confirmado)
                  </button>
                )}
              </div>
            </div>

            {/* BOTÃO EM DESTAQUE: GERADOR DE RECIBO DE SINAL */}
            <button
              type="button"
              onClick={() => setIsReciboModalOpen(true)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition cursor-pointer"
            >
              <FileText size={17} strokeWidth={2.5} />
              <span>📄 GERAR RECIBO DE SINAL</span>
            </button>

            {/* ORGANIZAÇÃO DOS CARDS FINANCEIROS DO SHOW (1 coluna no celular, 3 colunas no PC) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#18181b] border border-zinc-800 space-y-3">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
                {/* 1. Cachê Contratado */}
                <div className="p-3 rounded-xl bg-[#121212] border border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                      Cachê Contratado
                    </span>
                    <button
                      type="button"
                      onClick={handleOpenEditCache}
                      className="text-zinc-500 hover:text-emerald-400 p-0.5 rounded transition"
                      title="Editar valor contratado do cachê"
                    >
                      <Edit3 size={11} />
                    </button>
                  </div>
                  <div className="mt-1">
                    <span className="text-base sm:text-lg font-black text-white tabular-nums block">
                      {formatCurrency(finSummary.totalContracted)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      Valor total acordado
                    </span>
                  </div>
                </div>

                {/* 2. Recebido (Sinal) */}
                <div className="p-3 rounded-xl bg-[#121212] border border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                      Recebido (Sinal)
                    </span>
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                      {finSummary.percentReceived}%
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-base sm:text-lg font-black text-emerald-400 tabular-nums block">
                      {formatCurrency(finSummary.totalReceived)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium truncate block">
                      {finSummary.totalPending > 0 ? `Falta: ${formatCurrency(finSummary.totalPending)}` : '100% quitado'}
                    </span>
                  </div>
                </div>

                {/* 3. Lucro Líquido Real (Cachê Recebido - Despesas) */}
                <div className="p-3 rounded-xl bg-[#121212] border border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-300">
                      Lucro Líquido Real
                    </span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">
                      Recebido - Custos
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className={`text-base sm:text-lg font-black tabular-nums block ${
                      (finSummary.totalReceived - finSummary.totalExpenses) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(finSummary.totalReceived - finSummary.totalExpenses)}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium truncate block">
                      {finSummary.totalExpenses > 0 ? `Despesas: -${formatCurrency(finSummary.totalExpenses)}` : 'Sem despesas'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso do Recebimento */}
              <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                  <span>Progresso do Recebimento</span>
                  <span className={finSummary.totalPending === 0 ? 'text-emerald-400' : 'text-amber-400 font-black'}>
                    {finSummary.totalPending === 0 
                      ? '✓ 100% Quitado' 
                      : `Falta Receber: ${formatCurrency(finSummary.totalPending)}`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      isFullyPaid ? 'bg-[#1ed760]' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${finSummary.percentReceived}%` }}
                  />
                </div>
              </div>
            </div>

            {/* ABAS INTERNAS FLUIDAS (flex-1 text-center py-2.5 sem cortar nem transbordar) */}
            <div className="flex bg-[#18181b] p-1 rounded-2xl border border-zinc-800 gap-1">
              <button
                type="button"
                onClick={() => setActiveSection('finance')}
                className={`flex-1 text-center py-2.5 px-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition ${
                  activeSection === 'finance'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="truncate block">[RECEBIMENTOS] ({linkedIncomeTransactions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('expenses')}
                className={`flex-1 text-center py-2.5 px-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition ${
                  activeSection === 'expenses'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="truncate block">[DESPESAS] ({linkedExpenseTransactions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('details')}
                className={`flex-1 text-center py-2.5 px-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition ${
                  activeSection === 'details'
                    ? 'bg-emerald-500 text-zinc-950 shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="truncate block">[DADOS & LOGÍSTICA]</span>
              </button>
            </div>
          
          {/* ========================================================================= */}
          {/* SEÇÃO 1: FINANCEIRO & RECEBIMENTOS VINCULADOS AO CAIXA                   */}
          {/* ========================================================================= */}
          {activeSection === 'finance' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Botões de Ação para Recebimentos */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Entradas Vinculadas no Caixa
                  </h4>
                  <span className="text-[10px] text-zinc-400">
                    Sinais, parcelas e gorjetas conectadas ao caixa da empresa
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {unlinkedIncomeTransactions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowLinkPixModal(true)}
                      className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 text-[11px] font-bold border border-purple-500/30 flex items-center space-x-1 transition"
                    >
                      <Link2 size={12} />
                      <span>Vincular Pix ({unlinkedIncomeTransactions.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPayDate(getTodayISO());
                      setIsAddPaymentOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-black uppercase tracking-wider flex items-center space-x-1 transition shadow-sm active:scale-95"
                  >
                    <Plus size={13} strokeWidth={3} />
                    <span>+ Receber / Programar</span>
                  </button>
                </div>
              </div>

              {/* Formulário: Registrar Entrada ou Programar Parcela */}
              {isAddPaymentOpen && (
                <form 
                  onSubmit={handleSaveManualPayment} 
                  className="p-4 sm:p-5 rounded-3xl bg-[#18181b] border-2 border-emerald-500/50 space-y-3.5 shadow-2xl shadow-emerald-500/10 animate-slide-up"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Zap size={16} />
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">
                        Lançar Recebimento de Show
                      </h5>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIsAddPaymentOpen(false)} 
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Seletor: Recebido Agora vs Programar Parcela Futura */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                      Status da Movimentação
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPayStatus('Recebido')}
                        className={`p-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition flex items-center justify-center space-x-1.5 ${
                          payStatus === 'Recebido'
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-sm'
                            : 'bg-[#121212] text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        <CheckCircle size={14} />
                        <span>Já Recebi (No Caixa)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPayStatus('Agendado')}
                        className={`p-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition flex items-center justify-center space-x-1.5 ${
                          payStatus === 'Agendado'
                            ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm'
                            : 'bg-[#121212] text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        <Clock size={14} />
                        <span>Programar (A Receber)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        Natureza do Valor
                      </label>
                      <select
                        value={payType}
                        onChange={e => setPayType(e.target.value as ShowPaymentType)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                      >
                        <option value="Sinal">Sinal / Entrada Antecipada</option>
                        <option value="Parcela">Parcela / Quitação do Cachê</option>
                        <option value="Extra">Hora Extra / Gorjeta (Adicional)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        Valor (R$) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder="Ex: 500"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-black text-emerald-400 outline-none focus:border-emerald-500"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        {payStatus === 'Recebido' ? 'Data do Recebimento' : 'Data Prevista para Receber'}
                      </label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        Conta / Destino
                      </label>
                      <select
                        value={payAccountId}
                        onChange={e => setPayAccountId(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                      Observação / Identificação (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Pix da noiva, dinheiro na saída..."
                      value={payNotes}
                      onChange={e => setPayNotes(e.target.value)}
                      className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsAddPaymentOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center space-x-1.5"
                    >
                      <Check size={15} strokeWidth={3} />
                      <span>{payStatus === 'Recebido' ? 'Confirmar Entrada' : 'Programar Recebimento'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Transações de Receita */}
              {linkedIncomeTransactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#18181b] border border-dashed border-zinc-800 text-center space-y-2">
                  <DollarSign size={24} className="mx-auto text-zinc-500" />
                  <p className="text-xs font-bold text-zinc-300">Nenhum recebimento vinculado ainda</p>
                  <p className="text-[11px] text-zinc-400">
                    Ao receber um Pix ou sinal adiantado, registre aqui para amortizar o saldo do show no Caixa da Empresa.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPayDate(getTodayISO());
                      setIsAddPaymentOpen(true);
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-sm inline-flex items-center space-x-1"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>Lançar Primeiro Pagamento</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedIncomeTransactions.map(tx => {
                    const acc = accounts.find(a => a.id === tx.accountId);
                    const pType = tx.showPaymentType || (tx.description.toLowerCase().includes('sinal') ? 'Sinal' : tx.description.toLowerCase().includes('extra') ? 'Extra' : 'Parcela');
                    const isPending = tx.status === 'pending';
                    const isEditingThis = editingIncomeTx?.id === tx.id;

                    if (isEditingThis && editingIncomeTx) {
                      return (
                        <form 
                          key={tx.id}
                          onSubmit={handleSaveEditIncome} 
                          className="p-3.5 rounded-2xl bg-[#121212] border-2 border-emerald-500/80 space-y-3 shadow-lg"
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                              Editar Recebimento Livremente
                            </span>
                            <button 
                              type="button" 
                              onClick={() => setEditingIncomeTx(null)} 
                              className="text-zinc-400 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Data de Recebimento *
                              </label>
                              <input
                                type="date"
                                required
                                value={editingIncomeTx.date}
                                onChange={e => setEditingIncomeTx({ ...editingIncomeTx, date: e.target.value })}
                                className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Valor (R$) *
                              </label>
                              <input
                                type="number"
                                step="any"
                                inputMode="decimal"
                                required
                                value={editingIncomeTx.amount}
                                onChange={e => setEditingIncomeTx({ ...editingIncomeTx, amount: e.target.value })}
                                className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-black text-emerald-400 outline-none focus:border-emerald-500 tabular-nums"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Conta Bancária *
                              </label>
                              <select
                                value={editingIncomeTx.accountId}
                                onChange={e => setEditingIncomeTx({ ...editingIncomeTx, accountId: e.target.value })}
                                className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                              >
                                {accounts.map(a => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Natureza
                              </label>
                              <select
                                value={editingIncomeTx.showPaymentType}
                                onChange={e => setEditingIncomeTx({ ...editingIncomeTx, showPaymentType: e.target.value as ShowPaymentType })}
                                className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                              >
                                <option value="Sinal">Sinal</option>
                                <option value="Parcela">Quitação / Parcela</option>
                                <option value="Extra">Extra / Gorjeta</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Situação
                              </label>
                              <select
                                value={editingIncomeTx.status}
                                onChange={e => setEditingIncomeTx({ ...editingIncomeTx, status: e.target.value as 'paid' | 'pending' })}
                                className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                              >
                                <option value="paid">Recebido (No Caixa)</option>
                                <option value="pending">A Receber (Pendente)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2 pt-1 border-t border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setEditingIncomeTx(null)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-sm flex items-center space-x-1"
                            >
                              <Check size={13} strokeWidth={3} />
                              <span>Salvar Recebimento</span>
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={tx.id}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs transition ${
                          isPending 
                            ? 'bg-[#18181b] border-amber-500/40' 
                            : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div 
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            setEditingIncomeTx({
                              id: tx.id,
                              date: tx.date || getTodayISO(),
                              amount: String(tx.amount || ''),
                              accountId: tx.accountId || defaultAccountId,
                              showPaymentType: (tx.showPaymentType || (tx.description.toLowerCase().includes('sinal') ? 'Sinal' : 'Parcela')) as ShowPaymentType,
                              status: (tx.status || 'paid') as 'paid' | 'pending',
                              description: tx.description
                            });
                          }}
                          title="Clique para editar este lançamento livremente"
                        >
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-xs font-black text-white hover:text-emerald-400 transition truncate">
                              {tx.description}
                            </span>

                            {/* Badge de Status: Recebido vs Pendente */}
                            {isPending ? (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                                <Clock size={10} />
                                <span>A Receber</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                                <Check size={10} strokeWidth={3} />
                                <span>No Caixa</span>
                              </span>
                            )}

                            {/* Seletor Rápido da Natureza da Parcela */}
                            <select
                              value={pType}
                              onClick={e => e.stopPropagation()}
                              onChange={e => handleChangePaymentType(tx, e.target.value as ShowPaymentType)}
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border outline-none cursor-pointer ${
                                pType === 'Extra' || pType === 'Bônus'
                                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                  : pType === 'Sinal'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              <option value="Sinal">Sinal</option>
                              <option value="Parcela">Quitação</option>
                              <option value="Extra">Extra/Gorjeta</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-1">
                            <span>{formatDateBR(tx.date)}</span>
                            {acc && <span>• {acc.name}</span>}
                            {tx.importedFromBank && <span className="text-purple-400 font-bold">• Extrato</span>}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/financeiro?tab=movimentacoes&txId=${tx.id}`);
                              }}
                              className="text-emerald-400 font-bold hover:underline inline-flex items-center"
                              title="Abrir no Extrato Completo"
                            >
                              <span>Extrato</span>
                              <ExternalLink size={10} className="ml-1" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 justify-between sm:justify-end">
                          <span className={`text-sm font-black tabular-nums ${
                            isPending 
                              ? 'text-amber-400' 
                              : pType === 'Extra' 
                              ? 'text-purple-400' 
                              : 'text-emerald-400'
                          }`}>
                            + {formatCurrency(tx.amount)}
                          </span>

                          {/* Se for pendente, permitir dar baixa rápida */}
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleConfirmPendingIncome(tx)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center space-x-1"
                              title="Confirmar recebimento no caixa agora"
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>Dar Baixa</span>
                            </button>
                          )}

                          {/* Editar Livremente */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIncomeTx({
                                id: tx.id,
                                date: tx.date || getTodayISO(),
                                amount: String(tx.amount || ''),
                                accountId: tx.accountId || defaultAccountId,
                                showPaymentType: (tx.showPaymentType || (tx.description.toLowerCase().includes('sinal') ? 'Sinal' : 'Parcela')) as ShowPaymentType,
                                status: (tx.status || 'paid') as 'paid' | 'pending',
                                description: tx.description
                              });
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                            title="Editar livremente Data, Valor e Conta"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Excluir do Caixa */}
                          <button
                            type="button"
                            onClick={() => setDeletingTransaction(tx)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                            title="Excluir Transação do Caixa"
                          >
                            <Trash2 size={14} />
                          </button>

                          {/* Desvincular */}
                          <button
                            type="button"
                            onClick={() => handleUnlinkTransaction(tx)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-950/30 transition"
                            title="Apenas desvincular do show (mantém no caixa)"
                          >
                            <Unlink size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SEÇÃO 2: DESPESAS DO EVENTO (LIGAÇÃO AO CAIXA)                            */}
          {/* ========================================================================= */}
          {activeSection === 'expenses' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Custos & Despesas do Show
                  </h4>
                  <span className="text-[10px] text-zinc-400">
                    Combustível, músicos extras, pedágio, alimentação e hospedagem
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-sm active:scale-95 transition"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>+ Lançar Custo</span>
                </button>
              </div>

              {/* Demonstrativo Resumido de Custos */}
              <div className="p-3.5 rounded-2xl bg-[#18181b] border border-zinc-800 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-400 block">Pagas no Caixa</span>
                  <span className="text-xs font-black text-rose-400 tabular-nums">
                    {formatCurrency(finSummary.paidExpenses)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-400 block">A Pagar (Pendente)</span>
                  <span className="text-xs font-black text-amber-400 tabular-nums">
                    {formatCurrency(finSummary.pendingExpenses)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-400 block">Total de Custos</span>
                  <span className="text-xs font-black text-white tabular-nums">
                    {formatCurrency(finSummary.totalExpenses)}
                  </span>
                </div>
              </div>

              {/* Formulário: Lançar Despesa */}
              {isAddExpenseOpen && (
                <form 
                  onSubmit={handleSaveExpense} 
                  className="p-4 sm:p-5 rounded-3xl bg-[#18181b] border border-rose-500/40 space-y-3.5 animate-slide-up shadow-xl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <h5 className="text-xs font-black text-rose-400 uppercase tracking-wider">
                      Lançar Nova Despesa do Evento
                    </h5>
                    <button 
                      type="button" 
                      onClick={() => setIsAddExpenseOpen(false)} 
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">
                          Categoria da Despesa
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {['Gasolina', 'Músicos', 'Alimentação', 'Pedágio', 'Outros'].map(chip => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              const found = EXPENSE_CATEGORIES.find(c => c.toLowerCase().includes(chip.toLowerCase()));
                              if (found) setExpCategory(found);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition ${
                              expCategory.toLowerCase().includes(chip.toLowerCase())
                                ? 'bg-rose-500 text-white border-rose-500'
                                : 'bg-[#121212] text-zinc-400 border-zinc-800 hover:text-white'
                            }`}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                      <select
                        value={expCategory}
                        onChange={e => setExpCategory(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-rose-500"
                      >
                        {EXPENSE_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        Valor (R$) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder="Ex: 150"
                        value={expAmount}
                        onChange={e => setExpAmount(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-black text-rose-400 outline-none focus:border-rose-500"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        Data do Custo
                      </label>
                      <input
                        type="date"
                        value={expDate}
                        onChange={e => setExpDate(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-rose-500"
                        required
                      />
                      {expDate > todayStr && (
                        <span className="text-[9px] text-amber-400 font-bold block mt-1">
                          ⚡ Data futura: Lançamento será salvo automaticamente como PENDENTE.
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        Conta de Saída
                      </label>
                      <select
                        value={expAccountId}
                        onChange={e => setExpAccountId(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-rose-500"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status quando data for hoje ou passada */}
                  {expDate <= todayStr && (
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                        Status do Pagamento
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExpStatus('paid')}
                          className={`p-2 rounded-xl text-xs font-bold border transition ${
                            expStatus === 'paid'
                              ? 'bg-rose-500 text-white border-rose-500 font-black'
                              : 'bg-[#121212] text-zinc-400 border-zinc-800'
                          }`}
                        >
                          Já foi Paga (Saiu do Caixa)
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpStatus('pending')}
                          className={`p-2 rounded-xl text-xs font-bold border transition ${
                            expStatus === 'pending'
                              ? 'bg-amber-500 text-zinc-950 border-amber-500 font-black'
                              : 'bg-[#121212] text-zinc-400 border-zinc-800'
                          }`}
                        >
                          A Pagar (Pendente)
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">
                      Observação / Detalhes (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Músico baterista convidado, posto Ipiranga..."
                      value={expNotes}
                      onChange={e => setExpNotes(e.target.value)}
                      className="w-full p-2 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-medium text-zinc-300 outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-1 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsAddExpenseOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-black uppercase hover:bg-rose-600 transition active:scale-95 shadow-md shadow-rose-500/20"
                    >
                      Confirmar Custo
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Despesas */}
              {linkedExpenseTransactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#18181b] border border-dashed border-zinc-800 text-center space-y-2">
                  <p className="text-xs font-bold text-zinc-400">Nenhum custo lançado para este show</p>
                  <p className="text-[11px] text-zinc-500">
                    Registre os gastos com viagem e equipe para saber com exatidão o seu lucro líquido do evento.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1"
                  >
                    <Plus size={14} strokeWidth={3} />
                    <span>Lançar Despesa</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedExpenseTransactions.map(tx => {
                    const isPending = tx.status === 'pending';
                    const isEditingThis = editingExpenseTx?.id === tx.id;

                    if (isEditingThis && editingExpenseTx) {
                      return (
                        <form
                          key={tx.id}
                          onSubmit={handleSaveEditExpense}
                          className="p-3.5 rounded-2xl bg-[#121212] border-2 border-rose-500/80 space-y-3 shadow-lg"
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                              Alterar Custo do Show
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingExpenseTx(null)}
                              className="text-zinc-400 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Data do Custo *
                              </label>
                              <input
                                type="date"
                                required
                                value={editingExpenseTx.date}
                                onChange={e => setEditingExpenseTx({ ...editingExpenseTx, date: e.target.value })}
                                className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-bold text-white outline-none focus:border-rose-500"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Valor (R$) *
                              </label>
                              <input
                                type="number"
                                step="any"
                                inputMode="decimal"
                                required
                                value={editingExpenseTx.amount}
                                onChange={e => setEditingExpenseTx({ ...editingExpenseTx, amount: e.target.value })}
                                className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-black text-rose-400 outline-none focus:border-rose-500 tabular-nums"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Status do Pagamento *
                              </label>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseTx({ ...editingExpenseTx, status: 'paid' })}
                                  className={`p-2 rounded-xl text-xs font-bold border transition ${
                                    editingExpenseTx.status === 'paid'
                                      ? 'bg-rose-500 text-white border-rose-500 font-black'
                                      : 'bg-[#18181b] text-zinc-400 border-zinc-700'
                                  }`}
                                >
                                  Pago
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingExpenseTx({ ...editingExpenseTx, status: 'pending' })}
                                  className={`p-2 rounded-xl text-xs font-bold border transition ${
                                    editingExpenseTx.status === 'pending'
                                      ? 'bg-amber-500 text-zinc-950 border-amber-500 font-black'
                                      : 'bg-[#18181b] text-zinc-400 border-zinc-700'
                                  }`}
                                >
                                  A Pagar
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                                Conta de Saída *
                              </label>
                              <select
                                value={editingExpenseTx.accountId}
                                onChange={e => setEditingExpenseTx({ ...editingExpenseTx, accountId: e.target.value })}
                                className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-bold text-white outline-none focus:border-rose-500"
                              >
                                {accounts.map(a => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">
                              Descrição / Identificação
                            </label>
                            <input
                              type="text"
                              value={editingExpenseTx.description}
                              onChange={e => setEditingExpenseTx({ ...editingExpenseTx, description: e.target.value })}
                              className="w-full p-2 bg-[#18181b] border border-zinc-700 rounded-xl text-xs font-medium text-white outline-none focus:border-rose-500"
                            />
                          </div>

                          <div className="flex justify-end space-x-2 pt-1 border-t border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setEditingExpenseTx(null)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-sm flex items-center space-x-1"
                            >
                              <Check size={13} strokeWidth={3} />
                              <span>Salvar Custo</span>
                            </button>
                          </div>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={tx.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                          isPending 
                            ? 'bg-[#18181b] border-amber-500/40' 
                            : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div 
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            setEditingExpenseTx({
                              id: tx.id,
                              date: tx.date || getTodayISO(),
                              amount: String(tx.amount || ''),
                              accountId: tx.accountId || defaultAccountId,
                              status: (tx.status || 'paid') as 'paid' | 'pending',
                              category: tx.categoryId || 'Outros',
                              description: tx.description
                            });
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-white hover:text-rose-400 transition truncate">
                              {tx.description}
                            </span>
                            {isPending ? (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                                <Clock size={10} />
                                <span>A Pagar</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
                                <Check size={10} strokeWidth={3} />
                                <span>Paga</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">
                            {formatDateBR(tx.date)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-sm font-black text-rose-400 tabular-nums">
                            - {formatCurrency(tx.amount)}
                          </span>

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleConfirmPendingExpense(tx)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center space-x-1"
                              title="Marcar despesa como paga agora"
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>Pagar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpenseTx({
                                id: tx.id,
                                date: tx.date || getTodayISO(),
                                amount: String(tx.amount || ''),
                                accountId: tx.accountId || defaultAccountId,
                                status: (tx.status || 'paid') as 'paid' | 'pending',
                                category: tx.categoryId || 'Outros',
                                description: tx.description
                              });
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                            title="Editar Custo do Show"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingTransaction(tx)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                            title="Excluir Despesa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SEÇÃO 3: DADOS & LOGÍSTICA                                               */}
          {/* ========================================================================= */}
          {activeSection === 'details' && (
            <div className="space-y-4 animate-fade-in text-xs">
              
              {/* Header da Aba com Ações */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Dados & Logística da Apresentação
                  </h4>
                  <span className="text-[10px] text-zinc-400">
                    Endereço, passagem de som e contato do contratante
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingLogistics(!isEditingLogistics)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold border border-zinc-700 flex items-center space-x-1 transition"
                  >
                    <Edit3 size={12} />
                    <span>{isEditingLogistics ? 'Fechar Edição' : 'Editar Dados'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(show)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center space-x-1 transition"
                  >
                    <span>Ficha Completa</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* MODO DE EDIÇÃO INLINE DE LOGÍSTICA */}
              {isEditingLogistics ? (
                <form 
                  onSubmit={handleSaveLogistics} 
                  className="p-4 sm:p-5 rounded-3xl bg-[#18181b] border-2 border-emerald-500/60 space-y-3.5 animate-slide-up shadow-xl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <h5 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Editar Logística & Contato
                    </h5>
                    <button 
                      type="button" 
                      onClick={() => setIsEditingLogistics(false)} 
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                        Endereço / Local do Show
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Cerimonial Vila Real, Rua das Flores 100"
                        value={editLocation}
                        onChange={e => setEditLocation(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Baependi - MG"
                        value={editCity}
                        onChange={e => setEditCity(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-black uppercase text-emerald-400 block mb-1 flex items-center space-x-1">
                        <Volume2 size={12} />
                        <span>Passagem de Som</span>
                      </label>
                      <input
                        type="time"
                        value={quickSoundcheckInput}
                        onChange={e => setQuickSoundcheckInput(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-400 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                        Início do Show
                      </label>
                      <input
                        type="time"
                        value={show.time || '20:00'}
                        onChange={e => updateShow({ ...show, time: e.target.value })}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                        Término do Show
                      </label>
                      <input
                        type="time"
                        value={show.endTime || ''}
                        onChange={e => updateShow({ ...show, endTime: e.target.value })}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                        Contratante / Responsável
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: João Silva"
                        value={editContractorName}
                        onChange={e => setEditContractorName(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        placeholder="(35) 99999-9999"
                        value={editContractorPhone}
                        onChange={e => setEditContractorPhone(e.target.value)}
                        className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                      Observações, Repertório & Informações de Apoio
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Informações técnicas de som, canaleta, repertório, equipe..."
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      className="w-full p-2.5 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-medium text-white outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsEditingLogistics(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-md"
                    >
                      Salvar Logística
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  
                  {/* CARD 1: ENDEREÇO DO LOCAL */}
                  <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center space-x-2 text-emerald-400">
                        <MapPin size={16} />
                        <h5 className="text-xs font-black uppercase tracking-wider text-white">
                          Endereço & Localização
                        </h5>
                      </div>
                      
                      <div className="flex items-center space-x-1.5">
                        {(show.location || show.city) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyText(`${show.location ? `${show.location}, ` : ''}${show.city || ''}`, 'Endereço')}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold flex items-center space-x-1 transition"
                              title="Copiar endereço completo"
                            >
                              <Copy size={11} />
                              <span>Copiar</span>
                            </button>

                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${show.location || ''} ${show.city || ''}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase flex items-center space-x-1 border border-emerald-500/30 transition"
                            >
                              <Navigation size={11} />
                              <span>Abrir Maps</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-sm font-bold text-white block">
                        {show.location || 'Local ainda não definido'}
                      </span>
                      <span className="text-xs text-zinc-400 block font-medium">
                        {show.city ? `Cidade: ${show.city}` : 'Cidade a definir'}
                      </span>
                    </div>
                  </div>

                  {/* CARD 2: HORÁRIO DE PASSAGEM DE SOM & APRESENTAÇÃO */}
                  <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center space-x-2 text-emerald-400">
                        <Volume2 size={16} />
                        <h5 className="text-xs font-black uppercase tracking-wider text-white">
                          Passagem de Som & Cronograma
                        </h5>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Passagem de Som com Edição Rápida */}
                      <div className="p-3 rounded-xl bg-[#121212] border border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center space-x-1">
                            <Volume2 size={12} className="text-emerald-400" />
                            <span>Passagem de Som</span>
                          </span>

                          {!isQuickSettingSoundcheck && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickSoundcheckInput(soundcheckTime);
                                setIsQuickSettingSoundcheck(true);
                              }}
                              className="text-[10px] text-emerald-400 font-bold hover:underline"
                            >
                              {soundcheckTime ? 'Alterar' : '+ Definir'}
                            </button>
                          )}
                        </div>

                        {isQuickSettingSoundcheck ? (
                          <div className="flex items-center space-x-1.5 animate-fade-in pt-1">
                            <input
                              type="time"
                              value={quickSoundcheckInput}
                              onChange={e => setQuickSoundcheckInput(e.target.value)}
                              className="p-1.5 bg-[#18181b] border border-emerald-500/50 rounded-lg text-xs font-bold text-white outline-none focus:border-emerald-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSoundcheckDirect(quickSoundcheckInput)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsQuickSettingSoundcheck(false)}
                              className="p-1.5 text-zinc-400 hover:text-white"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-baseline space-x-2">
                            <span className="text-base font-black text-white">
                              {soundcheckTime || 'Não agendada'}
                            </span>
                            {soundcheckTime && (
                              <span className="text-[9px] text-emerald-400 font-black uppercase bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                Confirmada
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Horário do Show */}
                      <div className="p-3 rounded-xl bg-[#121212] border border-zinc-800/80 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center space-x-1">
                          <Clock size={12} className="text-purple-400" />
                          <span>Show / Apresentação</span>
                        </span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-base font-black text-white">
                            {show.time || '20:00'}{show.endTime ? ` — ${show.endTime}` : ''}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          Data: {formatDateBR(show.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: CONTRATANTE & CONTATO */}
                  <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                      <div className="flex items-center space-x-2 text-emerald-400">
                        <Phone size={16} />
                        <h5 className="text-xs font-black uppercase tracking-wider text-white">
                          Contratante & Contato
                        </h5>
                      </div>
                      
                      {show.contractorPhone && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyText(show.contractorPhone || '', 'Telefone')}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold flex items-center space-x-1 transition"
                            title="Copiar telefone"
                          >
                            <Copy size={11} />
                            <span>Copiar</span>
                          </button>

                          <a
                            href={`https://wa.me/55${show.contractorPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-[10px] font-black uppercase flex items-center space-x-1 border border-[#25D366]/30 transition"
                          >
                            <MessageCircle size={11} />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-zinc-400 block">
                          Nome do Contratante
                        </span>
                        <span className="text-sm font-bold text-white mt-0.5 block">
                          {show.contractorName || show.name || 'Não informado'}
                        </span>
                        {show.eventType && (
                          <span className="text-[10px] text-zinc-400 block mt-0.5">
                            Tipo de Evento: {show.eventType}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase text-zinc-400 block">
                          Telefone / WhatsApp
                        </span>
                        <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                          {show.contractorPhone || 'Telefone não informado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CARD 4: OBSERVAÇÕES & REPERTÓRIO */}
                  <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800 space-y-2">
                    <span className="text-[10px] font-black uppercase text-zinc-400 block">
                      Observações, Repertório & Detalhes
                    </span>
                    <div className="bg-[#121212] p-3.5 rounded-xl border border-zinc-800/80">
                      <p className="text-zinc-300 font-medium text-xs whitespace-pre-line leading-relaxed">
                        {show.notes || 'Nenhuma observação ou orientação cadastrada para esta apresentação.'}
                      </p>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

      </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: RECIBO DE AGENDAMENTO & SINAL (GERAÇÃO PDF / WHATSAPP)            */}
      {/* ========================================================================= */}
      {isReciboModalOpen && (
        <ReciboModal
          isOpen={isReciboModalOpen}
          onClose={() => setIsReciboModalOpen(false)}
          show={show}
          sinalAmount={finSummary.totalReceived}
          totalCacheAmount={finSummary.totalContracted}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDITAR VALOR DO CACHÊ CONTRATADO                                  */}
      {/* ========================================================================= */}
      {isEditCacheModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[125] flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleSaveContractedCache}
            className="bg-[#18181b] text-white border border-zinc-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center">
                <Edit3 size={15} className="mr-2 text-emerald-400" />
                Ajustar Cachê Fechado
              </h3>
              <button 
                type="button" 
                onClick={() => setIsEditCacheModalOpen(false)} 
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Altere o valor acordado com o contratante. O saldo restante a receber e as métricas do show serão recalculados na hora.
            </p>

            <div>
              <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                Novo Valor do Cachê (R$) *
              </label>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                value={newContractedCache}
                onChange={e => setNewContractedCache(e.target.value)}
                className="w-full p-3 bg-[#121212] border border-zinc-800 rounded-xl text-base font-black text-emerald-400 outline-none focus:border-emerald-500 tabular-nums"
                autoFocus
              />
            </div>

            <div className="flex space-x-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsEditCacheModalOpen(false)}
                className="w-1/2 p-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase transition active:scale-95 shadow-md"
              >
                Salvar Valor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONCLUIR SHOW & ACERTO INTELIGENTE DO SALDO RESTANTE              */}
      {/* ========================================================================= */}
      {showCompletionModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[130] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#18181b] text-white border-2 border-emerald-500/60 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center space-x-2.5 text-emerald-400">
              <Sparkles size={20} />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Finalizar Show & Acerto de Contas
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#121212] border border-zinc-800 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Cachê Fechado:</span>
                <span className="font-bold text-white">{formatCurrency(finSummary.totalContracted)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Já Recebido no Caixa:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(finSummary.baseCacheReceived)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-zinc-800 font-black">
                <span className="text-amber-400">Saldo Ainda Pendente:</span>
                <span className="text-amber-400">{formatCurrency(finSummary.totalPending)}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 font-medium leading-relaxed">
              O show será marcado como <strong>Realizado</strong>. O que você deseja fazer com o saldo restante de <strong>{formatCurrency(finSummary.totalPending)}</strong>?
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">
                Conta de Depósito / Caixa
              </label>
              <select
                value={completionAccountId}
                onChange={e => setCompletionAccountId(e.target.value)}
                className="w-full p-2 bg-[#121212] border border-zinc-800 rounded-xl text-xs font-bold text-white outline-none"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-2">
              {/* Opção 1: Quitação Integral Imediata */}
              <button
                type="button"
                onClick={handleCompleteWithImmediatePayment}
                className="w-full p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md flex items-center justify-between"
              >
                <span>⚡ Recebi agora (Quitar no Caixa)</span>
                <ChevronRight size={16} />
              </button>

              {/* Opção 2: Gerar Transação Pendente */}
              <button
                type="button"
                onClick={handleCompleteWithPendingTransaction}
                className="w-full p-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-between"
              >
                <span>⏳ Gerar Transação Pendente (A Receber)</span>
                <ChevronRight size={16} />
              </button>

              {/* Opção 3: Manter como está */}
              <button
                type="button"
                onClick={handleCompleteWithoutNewTransaction}
                className="w-full p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-bold uppercase transition"
              >
                Manter como está (Apenas marcar realizado)
              </button>

              <button
                type="button"
                onClick={() => setShowCompletionModalOpen(false)}
                className="w-full py-2 text-zinc-500 hover:text-zinc-300 text-xs font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PARA VINCULAR PIX EXISTENTE DO EXTRATO                             */}
      {/* ========================================================================= */}
      {showLinkPixModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-[#18181b] text-white border border-zinc-800 rounded-3xl p-5 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center">
                <Link2 size={16} className="mr-2 text-emerald-400" />
                Vincular Pix do Extrato ao Show
              </h3>
              <button onClick={() => setShowLinkPixModal(false)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {unlinkedIncomeTransactions.map(tx => (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-[#121212] border border-zinc-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-white truncate">{tx.description}</h4>
                    <span className="text-[10px] text-zinc-400">{formatDateBR(tx.date)} • {formatCurrency(tx.amount)}</span>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLinkTransaction(tx, 'Sinal')}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase hover:bg-amber-500/25"
                    >
                      + Sinal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLinkTransaction(tx, 'Parcela')}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase hover:bg-emerald-500/25"
                    >
                      + Quitação
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR EXCLUSÃO DE TRANSAÇÃO DO CAIXA                          */}
      {/* ========================================================================= */}
      {deletingTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[130] flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-[#18181b] text-white border border-rose-900/60 rounded-3xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl text-center">
            <AlertTriangle size={36} className="mx-auto text-rose-500" />
            <h3 className="text-sm font-black text-white">Excluir Lançamento do Caixa?</h3>
            <p className="text-xs text-zinc-400">
              Você está excluindo a transação de <strong>{formatCurrency(deletingTransaction.amount)}</strong> ({deletingTransaction.description}). 
              Ela será removida do Caixa da Empresa e o saldo do show será atualizado.
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTransaction(null)}
                className="w-1/2 p-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTransaction}
                className="w-1/2 p-2.5 rounded-xl bg-rose-600 text-white text-xs font-black uppercase hover:bg-rose-700 transition"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DO SHOW */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[125] flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-[#18181b] text-white border border-rose-900/50 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl text-center">
            <AlertTriangle size={36} className="mx-auto text-rose-500" />
            <h3 className="text-base font-black text-white">Excluir Apresentação?</h3>
            <p className="text-xs text-zinc-400">
              Tem certeza de que deseja excluir este show? Os dados da agenda serão removidos.
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-1/2 p-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onDelete(show.id)}
                className="w-1/2 p-2.5 rounded-xl bg-rose-600 text-white text-xs font-black uppercase"
              >
                Excluir Show
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULÁRIO DE EDIÇÃO IN-PLACE DA TRANSAÇÃO */}
      {editingTransaction && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </>
  );
};
