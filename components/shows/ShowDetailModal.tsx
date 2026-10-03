import React, { useState, useMemo, useEffect } from 'react';
import { Show, ShowStatus, ShowPayment, ShowPaymentType, ShowCrewItem, ShowLogisticsItem, ShowOtherExpenseItem, Transaction } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, Calendar, Clock, MapPin, DollarSign, 
  CheckCircle2, AlertCircle, Edit3, Trash2, 
  Wallet, ArrowDownRight, ArrowUpRight,
  Check, Plus, AlertTriangle, Link2, Unlink,
  ChevronRight, ExternalLink, Sparkles, Tag, Info, Music,
  ArrowRight, Zap, Lock, HelpCircle, FileText, CheckCircle,
  Copy, Volume2, Navigation, Phone, MessageCircle, Users, Car,
  Fuel, ShieldCheck, RefreshCw
} from 'lucide-react';
import { getStatusConfig } from './types';
import { 
  normalizeShowFinancials, 
  getShowFinancialSummary 
} from '../../services/showFinanceSyncService';
import { generateUUID } from '../../services/uuidHelper';
import { syncShowToGoogleCalendar, googleSignIn, getAccessToken } from '../../services/googleCalendarService';
import { ReciboModal } from './ReciboModal';
import { getLocalDateString } from '../../services/dateUtils';

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
  'Aluguel de Equipamentos',
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
  const { 
    shows, accounts, transactions, crew, updateShow, 
    updateTransaction, addTransaction, deleteTransaction, 
    getDefaultAccountForScope, isBlurred 
  } = useFinance();

  const [activeSection, setActiveSection] = useState<'finance' | 'expenses' | 'details'>('finance');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkPixModal, setShowLinkPixModal] = useState(false);
  
  // Modais de apoio
  const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);
  const [isEditCacheModalOpen, setIsEditCacheModalOpen] = useState(false);
  const [newContractedCache, setNewContractedCache] = useState('');
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Form states para adição rápida
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(openPaymentDirectly);
  const [payStatus, setPayStatus] = useState<'Recebido' | 'Agendado'>('Recebido');
  const [payType, setPayType] = useState<ShowPaymentType>('Sinal');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => getLocalDateString());
  const [payAccountId, setPayAccountId] = useState(() => getDefaultAccountForScope('BUSINESS'));

  // Adição de equipe inline
  const [isAddCrewOpen, setIsAddCrewOpen] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [customCrewName, setCustomCrewName] = useState('');
  const [customCrewRole, setCustomCrewRole] = useState('Bateria');
  const [customCrewCache, setCustomCrewCache] = useState('');
  const [customCrewPix, setCustomCrewPix] = useState('');

  // Adição de logística inline
  const [isAddLogisticsOpen, setIsAddLogisticsOpen] = useState(false);
  const [logType, setLogType] = useState<ShowLogisticsItem['type']>('uber');
  const [logDesc, setLogDesc] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [logKm, setLogKm] = useState('');
  const [logPricePerKm, setLogPricePerKm] = useState('1.20');

  // Adição de outras despesas inline
  const [isAddOtherOpen, setIsAddOtherOpen] = useState(false);
  const [otherCat, setOtherCat] = useState('Alimentação / Camarim');
  const [otherDesc, setOtherDesc] = useState('');
  const [otherAmount, setOtherAmount] = useState('');

  // Edição inline de Contato & Observações
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedContractor, setEditedContractor] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [editedSoundcheck, setEditedSoundcheck] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

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

  // Transações vinculadas do extrato
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

  const unlinkedIncomeTransactions = useMemo(() => {
    if (!transactions || !show?.id) return [];
    return transactions
      .filter(t => t.type === 'income' && !t.showId && (t.scope === 'BUSINESS' || t.categoryId === 'cat_33'))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [transactions, show?.id]);

  const todayStr = useMemo(() => getLocalDateString(), []);
  const isDateTodayOrPast = show ? (show.date || '') <= todayStr : false;

  // Reset form states on show switch
  useEffect(() => {
    setIsAddPaymentOpen(openPaymentDirectly);
    setIsAddCrewOpen(false);
    setIsAddLogisticsOpen(false);
    setIsAddOtherOpen(false);
    setShowLinkPixModal(false);
    setShowDeleteConfirm(false);
    setIsEditCacheModalOpen(false);
    setIsEditingNotes(false);
    setPayDate(getLocalDateString());
    setPayAccountId(defaultAccountId);
    if (initialShow) {
      setEditedContractor(initialShow.contractorName || initialShow.name || '');
      setEditedPhone(initialShow.contractorPhone || '');
      setEditedNotes(initialShow.notes || '');
      const sc = (initialShow as any).soundcheckTime || '';
      setEditedSoundcheck(sc);
    }
  }, [initialShow?.id, openPaymentDirectly, defaultAccountId]);

  if (!show) return null;

  const statusCfg = getStatusConfig(show.status);

  // =========================================================================
  // CÁLCULO INSTANTÂNEO DE MÉTRICAS FINANCEIRAS DO SHOW
  // =========================================================================
  const grossCache = Number(show.totalCache ?? show.cacheCombined) || 0;

  // 1. Recebimentos
  const totalReceived = linkedIncomeTransactions
    .filter(t => t.status === 'paid')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) +
    (show.payments || [])
      .filter(p => p.status === 'Recebido' && !linkedIncomeTransactions.some(t => t.id === p.transactionId))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const remainingToReceive = Math.max(0, grossCache - totalReceived);
  const percentReceived = grossCache > 0 ? Math.min(100, Math.round((totalReceived / grossCache) * 100)) : 100;

  // 2. Custos estruturados
  const crewCost = (show.crewMembers || []).reduce((sum, c) => sum + (Number(c.cacheAmount) || 0), 0);
  const logisticsCost = (show.logistics || []).reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const otherCost = (show.otherExpenses || []).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  // Custos de transações do caixa não cobertos pelos itens acima
  const extraExpensesFromTx = linkedExpenseTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  
  const totalCosts = crewCost + logisticsCost + otherCost + (show.crewMembers?.length ? 0 : extraExpensesFromTx);
  const netProfit = grossCache - totalCosts;
  const marginPercent = grossCache > 0 ? Math.round((netProfit / grossCache) * 100) : 0;

  // Status Badge do Pagamento: Pendente, Parcial ou Pago
  const paymentBadge = useMemo(() => {
    if (grossCache > 0 && remainingToReceive === 0) {
      return { label: 'Pago 100%', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    if (totalReceived > 0) {
      return { label: `Parcial (${percentReceived}%)`, bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
    return { label: 'Pendente', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
  }, [grossCache, remainingToReceive, totalReceived, percentReceived]);

  const formatCurrency = (val?: number | string | null) => {
    if (isBlurred) return 'R$ •••••';
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
    } catch {}
    return String(dStr || '');
  };

  // WhatsApp Link Helper
  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return null;
    const cleanNumber = phone.replace(/\D/g, '');
    const fullNumber = cleanNumber.length <= 11 ? `55${cleanNumber}` : cleanNumber;
    return `https://wa.me/${fullNumber}`;
  };

  // Sincronizar com Google Calendar
  const handleSyncGoogleCalendar = async () => {
    setIsSyncingCalendar(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes) {
          showToast('Falha na autenticação do Google Calendar');
          return;
        }
      }
      const eventId = await syncShowToGoogleCalendar(show);
      if (eventId) {
        updateShow({ ...show, googleCalendarEventId: eventId });
        showToast('Show sincronizado com sucesso no Google Calendar!');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao sincronizar com Google Calendar');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Alterar Status Comercial
  const handleChangeStatus = (newStatus: ShowStatus) => {
    onUpdateStatus(show, newStatus);
    showToast(`Status alterado para: ${newStatus}`);
  };

  // Atualizar Cachê
  const handleSaveContractedCache = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newContractedCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (val < 0) return;
    updateShow({ ...show, totalCache: val, cacheCombined: val });
    setIsEditCacheModalOpen(false);
    showToast(`Cachê atualizado para ${formatCurrency(val)}!`);
  };

  // Salvar Adiantamento / Recebimento
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    const txId = generateUUID();
    const paymentId = generateUUID();
    const isPaid = payStatus === 'Recebido';

    const newTx: any = {
      id: txId,
      type: 'income',
      amount: amt,
      description: `Cachê: ${show.contractorName || show.name} (${payType})`,
      categoryId: 'cat_33',
      accountId: payAccountId,
      date: payDate || getLocalDateString(),
      status: isPaid ? 'paid' : 'pending',
      scope: 'BUSINESS',
      showId: show.id,
      showPaymentType: payType,
      showPaymentId: paymentId
    };

    addTransaction(newTx);

    const updatedPayments: ShowPayment[] = [...(show.payments || []), {
      id: paymentId,
      type: payType,
      amount: amt,
      expectedDate: payDate || getLocalDateString(),
      effectiveDate: isPaid ? (payDate || getLocalDateString()) : undefined,
      accountId: payAccountId,
      status: isPaid ? 'Recebido' : 'Agendado',
      transactionId: txId
    }];

    updateShow({ ...show, payments: updatedPayments });
    setPayAmount('');
    setIsAddPaymentOpen(false);
    showToast(`${payType} de ${formatCurrency(amt)} registrado!`);
  };

  // Salvar Membro de Equipe Inline
  const handleAddCrewInline = () => {
    if (selectedCrewId) {
      const found = crew.find(c => c.id === selectedCrewId);
      if (found) {
        const updated = [...(show.crewMembers || []), {
          id: generateUUID(),
          memberId: found.id,
          name: found.name,
          role: found.role,
          cacheAmount: found.defaultCache || 0,
          pixKey: found.pixKey,
          status: 'pending' as const
        }];
        updateShow({ ...show, crewMembers: updated });
        setSelectedCrewId('');
        setIsAddCrewOpen(false);
        showToast(`${found.name} adicionado(a) à equipe do show!`);
        return;
      }
    }

    if (customCrewName.trim()) {
      const amt = parseFloat(customCrewCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const updated = [...(show.crewMembers || []), {
        id: generateUUID(),
        name: customCrewName.trim(),
        role: customCrewRole,
        cacheAmount: amt,
        pixKey: customCrewPix.trim() || undefined,
        status: 'pending' as const
      }];
      updateShow({ ...show, crewMembers: updated });
      setCustomCrewName('');
      setCustomCrewCache('');
      setCustomCrewPix('');
      setIsAddCrewOpen(false);
      showToast(`${customCrewName} adicionado(a) à equipe!`);
    }
  };

  const handleToggleCrewStatus = (idx: number) => {
    const updated = (show.crewMembers || []).map((c, i) => {
      if (i === idx) {
        return { ...c, status: c.status === 'paid' ? 'pending' as const : 'paid' as const };
      }
      return c;
    });
    updateShow({ ...show, crewMembers: updated });
    showToast('Status de pagamento da equipe atualizado!');
  };

  const handleRemoveCrew = (idx: number) => {
    const updated = (show.crewMembers || []).filter((_, i) => i !== idx);
    updateShow({ ...show, crewMembers: updated });
    showToast('Membro removido da equipe do show.');
  };

  // Salvar Logística Inline
  const handleAddLogisticsInline = () => {
    let amt = parseFloat(logAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const kmNum = parseFloat(logKm.replace(',', '.')) || undefined;
    const priceNum = parseFloat(logPricePerKm.replace(',', '.')) || undefined;

    if (logType === 'car_km' && kmNum && priceNum && !amt) {
      amt = kmNum * priceNum;
    }

    if (amt <= 0) return;

    const defaultLabels = {
      uber: 'Uber / 99',
      car_km: `Carro Próprio (${kmNum || 0} KM)`,
      toll: 'Pedágio',
      van: 'Transporte Banda / Van',
      fuel: 'Combustível',
      parking: 'Estacionamento',
      other: 'Outro Transporte'
    };

    const updated = [...(show.logistics || []), {
      id: generateUUID(),
      type: logType,
      description: logDesc.trim() || defaultLabels[logType],
      amount: amt,
      km: kmNum,
      pricePerKm: priceNum,
      status: 'pending' as const
    }];

    updateShow({ ...show, logistics: updated });
    setLogDesc('');
    setLogAmount('');
    setLogKm('');
    setIsAddLogisticsOpen(false);
    showToast('Custo logístico adicionado ao show!');
  };

  const handleToggleLogisticsStatus = (idx: number) => {
    const updated = (show.logistics || []).map((l, i) => {
      if (i === idx) {
        return { ...l, status: l.status === 'paid' ? 'pending' as const : 'paid' as const };
      }
      return l;
    });
    updateShow({ ...show, logistics: updated });
    showToast('Status da despesa de transporte atualizado!');
  };

  const handleRemoveLogistics = (idx: number) => {
    const updated = (show.logistics || []).filter((_, i) => i !== idx);
    updateShow({ ...show, logistics: updated });
    showToast('Despesa de transporte removida.');
  };

  // Salvar Outra Despesa Inline
  const handleAddOtherInline = () => {
    const amt = parseFloat(otherAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    const updated = [...(show.otherExpenses || []), {
      id: generateUUID(),
      category: otherCat,
      description: otherDesc.trim() || otherCat,
      amount: amt,
      status: 'pending' as const
    }];

    updateShow({ ...show, otherExpenses: updated });
    setOtherDesc('');
    setOtherAmount('');
    setIsAddOtherOpen(false);
    showToast('Despesa extra vinculada ao show!');
  };

  const handleRemoveOther = (idx: number) => {
    const updated = (show.otherExpenses || []).filter((_, i) => i !== idx);
    updateShow({ ...show, otherExpenses: updated });
    showToast('Despesa removida.');
  };

  // Salvar Edição de Notas & Contato
  const handleSaveNotesAndContact = (e: React.FormEvent) => {
    e.preventDefault();
    updateShow({
      ...show,
      contractorName: editedContractor.trim() || show.contractorName,
      contractorPhone: editedPhone.trim() || undefined,
      notes: editedNotes.trim() || undefined,
      soundcheckTime: editedSoundcheck.trim() || undefined
    } as any);
    setIsEditingNotes(false);
    showToast('Dados de contato e logística atualizados com sucesso!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[94vh] bg-[#121214] border-0 sm:border border-zinc-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* ========================================================================= */}
        {/* BLOCO A: CABEÇALHO & STATUS OPERACIONAL                                   */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 bg-[#16161a] border-b border-zinc-800/80 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                  {show.eventType || 'Show / Apresentação'}
                </span>
                <span className="text-xs text-zinc-400 flex items-center space-x-1">
                  <MapPin size={12} className="text-zinc-500" />
                  <span>{show.city || 'Cidade base'}</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                {show.name || show.location || 'Ficha do Show'}
              </h2>
              <div className="flex items-center space-x-3 text-xs sm:text-sm text-zinc-300 font-medium">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <Calendar size={13} />
                  <span>{formatDateBR(show.date)}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1 text-zinc-400">
                  <Clock size={13} />
                  <span>{show.time || '20:00'}{show.endTime ? ` às ${show.endTime}` : ''} ({show.duration || '3h'})</span>
                </span>
              </div>
            </div>

            {/* Ações de Fechar / Editar / Deletar */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => onEdit(show)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Editar Ficha Completa"
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                title="Excluir Show"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Status Comercial Seletor Rápido & Ações Rápidas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            
            {/* Seletor de Status Comercial */}
            <div className="flex items-center space-x-1.5 bg-[#0f0f11] p-1 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 px-2">Status:</span>
              {(['Orçamento', 'Confirmado', 'Realizado', 'Cancelado'] as ShowStatus[]).map((st) => {
                const isSelected = show.status === st || (st === 'Orçamento' && show.status === 'Aguardando confirmação');
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleChangeStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                      isSelected
                        ? st === 'Confirmado' ? 'bg-emerald-500 text-zinc-950 font-black shadow' :
                          st === 'Realizado' ? 'bg-purple-500 text-zinc-950 font-black shadow' :
                          st === 'Cancelado' ? 'bg-rose-600 text-white shadow' :
                          'bg-amber-500 text-zinc-950 font-black shadow'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>

            {/* Ações Rápidas em Destaque */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsReciboModalOpen(true)}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
              >
                <FileText size={14} strokeWidth={2.5} />
                <span>Gerar Recibo</span>
              </button>

              <button
                type="button"
                onClick={handleSyncGoogleCalendar}
                disabled={isSyncingCalendar}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 border border-zinc-700 active:scale-95 transition"
                title="Sincronizar com Google Agenda"
              >
                <Calendar size={14} className={isSyncingCalendar ? 'animate-spin text-emerald-400' : 'text-zinc-400'} />
                <span>{isSyncingCalendar ? 'Sincronizando...' : 'Google Calendar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPO DO MODAL (SCROLL)                                                   */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* TOAST FEEDBACK */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 size={15} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BLOCO B: RESUMO FINANCEIRO & TERMÔMETRO DE LUCRO                          */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#17171a] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <DollarSign size={14} className="text-emerald-400" />
                <span>Resumo Financeiro & Termômetro de Lucro</span>
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${paymentBadge.bg}`}>
                {paymentBadge.label}
              </span>
            </div>

            {/* Grid dos 4 Cards Financeiros */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Cachê Bruto */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Cachê Bruto</span>
                  <button 
                    type="button" 
                    onClick={() => { setNewContractedCache(String(grossCache)); setIsEditCacheModalOpen(true); }}
                    className="text-zinc-500 hover:text-emerald-400 transition"
                  >
                    <Edit3 size={11} />
                  </button>
                </div>
                <div className="text-base sm:text-lg font-black text-white tabular-nums">
                  {formatCurrency(grossCache)}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">Valor contratado</div>
              </div>

              {/* 2. Sinal / Recebido */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Sinal Recebido</span>
                <div className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
                  {formatCurrency(totalReceived)}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {remainingToReceive > 0 ? `Resta: ${formatCurrency(remainingToReceive)}` : '100% recebido'}
                </div>
              </div>

              {/* 3. Custo Total (Equipe + Logística + Extras) */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Custos Totais</span>
                <div className="text-base sm:text-lg font-black text-rose-400 tabular-nums">
                  {formatCurrency(totalCosts)}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">Equipe + Logística + Extras</div>
              </div>

              {/* 4. Lucro Líquido Real */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Lucro Líquido</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                    marginPercent >= 60 ? 'bg-emerald-500/20 text-emerald-400' :
                    marginPercent >= 30 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-rose-500/20 text-rose-400'
                  }`}>
                    {marginPercent}%
                  </span>
                </div>
                <div className={`text-base sm:text-lg font-black tabular-nums ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(netProfit)}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">Margem líquida real</div>
              </div>
            </div>

            {/* Termômetro de Lucro & Barra de Progresso */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                <span>Progresso do Recebimento</span>
                <span className={remainingToReceive === 0 ? 'text-emerald-400 font-black' : 'text-amber-400'}>
                  {remainingToReceive === 0 ? '✓ Cachê 100% Quitado' : `Falta receber: ${formatCurrency(remainingToReceive)}`}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    remainingToReceive === 0 ? 'bg-[#1ed760]' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percentReceived}%` }}
                />
              </div>

              {/* Ação rápida para lançar sinal / parcela */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentOpen(prev => !prev)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition"
                >
                  <Plus size={13} />
                  <span>{isAddPaymentOpen ? 'Fechar Lançamento' : 'Lançar Recebimento / Sinal'}</span>
                </button>
              </div>

              {/* Form de Adicionar Recebimento */}
              {isAddPaymentOpen && (
                <form onSubmit={handleSavePayment} className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800 space-y-3 mt-2 animate-fadeIn">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">Novo Recebimento de Cachê</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Tipo</label>
                      <select
                        value={payType}
                        onChange={e => setPayType(e.target.value as ShowPaymentType)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <option value="Sinal">Sinal</option>
                        <option value="Parcela">Parcela</option>
                        <option value="Restante">Restante / Quitação</option>
                        <option value="Extra">Extra / Horas Extras</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Valor (R$)</label>
                      <input
                        type="text"
                        placeholder="Ex: 500,00"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Data</label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Situação</label>
                      <select
                        value={payStatus}
                        onChange={e => setPayStatus(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <option value="Recebido">Já Recebido (Caixa)</option>
                        <option value="Agendado">Previsto / Agendado</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddPaymentOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider"
                    >
                      Salvar no Caixa
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BLOCO C: CUSTOS DIRETOS VINCULADOS AO EVENTO                              */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#17171a] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                <Users size={14} className="text-purple-400" />
                <span>Custos Diretos Vinculados ao Evento</span>
              </span>
              <span className="text-xs font-black text-rose-400">
                Total: {formatCurrency(totalCosts)}
              </span>
            </div>

            {/* 1. TABELA DE MÚSICOS & EQUIPE */}
            <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users size={14} className="text-purple-400" />
                  <span className="text-xs font-bold text-zinc-200">Músicos & Freelancers ({show.crewMembers?.length || 0})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-purple-400">{formatCurrency(crewCost)}</span>
                  <button
                    type="button"
                    onClick={() => setIsAddCrewOpen(prev => !prev)}
                    className="p-1 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition text-xs flex items-center space-x-1 px-2"
                  >
                    <Plus size={12} />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Lista de Equipe Cadastrada no Show */}
              {show.crewMembers && show.crewMembers.length > 0 ? (
                <div className="space-y-1.5">
                  {show.crewMembers.map((member, idx) => (
                    <div key={member.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-zinc-200">{member.name}</span>
                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded font-medium">{member.role}</span>
                        </div>
                        {member.pixKey && (
                          <span className="text-[10px] text-zinc-500 block">PIX: {member.pixKey}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-zinc-100">{formatCurrency(member.cacheAmount)}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleCrewStatus(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                            member.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {member.status === 'paid' ? 'Pago' : 'A Pagar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCrew(idx)}
                          className="text-zinc-500 hover:text-rose-400 p-1 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-zinc-500">
                  Nenhum músico ou técnico vinculado a este show.
                </div>
              )}

              {/* Form Inline Adicionar Equipe */}
              {isAddCrewOpen && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-purple-500/30 space-y-2 animate-fadeIn">
                  <span className="text-[11px] font-bold text-purple-300 block">Adicionar Músico ou Equipe</span>
                  {crew && crew.length > 0 && (
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Selecionar dos Cadastrados:</label>
                      <select
                        value={selectedCrewId}
                        onChange={e => setSelectedCrewId(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <option value="">-- Escolha um membro já cadastrado --</option>
                        {crew.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.role}) - Padrão: {formatCurrency(c.defaultCache || 0)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!selectedCrewId && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Nome do músico"
                        value={customCrewName}
                        onChange={e => setCustomCrewName(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                      <select
                        value={customCrewRole}
                        onChange={e => setCustomCrewRole(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <option value="Bateria">Bateria</option>
                        <option value="Baixo">Baixo</option>
                        <option value="Guitarra">Guitarra / Violão</option>
                        <option value="Teclado">Teclado / Piano</option>
                        <option value="Sanfona">Sanfona</option>
                        <option value="Percussão">Percussão</option>
                        <option value="Backing Vocal">Backing Vocal</option>
                        <option value="Roadie / Técnico">Roadie / Técnico</option>
                        <option value="Fotógrafo / Vídeo">Fotógrafo / Vídeo</option>
                        <option value="Outro">Outro</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Cachê R$"
                        value={customCrewCache}
                        onChange={e => setCustomCrewCache(e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                  )}
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddCrewOpen(false)}
                      className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCrewInline}
                      className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                    >
                      Salvar Membro
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. LOGÍSTICA & DESLOCAMENTO */}
            <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Car size={14} className="text-sky-400" />
                  <span className="text-xs font-bold text-zinc-200">Logística & Deslocamento ({show.logistics?.length || 0})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-sky-400">{formatCurrency(logisticsCost)}</span>
                  <button
                    type="button"
                    onClick={() => setIsAddLogisticsOpen(prev => !prev)}
                    className="p-1 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 transition text-xs flex items-center space-x-1 px-2"
                  >
                    <Plus size={12} />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Lista de Logística */}
              {show.logistics && show.logistics.length > 0 ? (
                <div className="space-y-1.5">
                  {show.logistics.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-zinc-200">{item.description}</span>
                        {item.km && (
                          <span className="text-[10px] text-zinc-500 block">{item.km} KM ({formatCurrency(item.pricePerKm || 1.2)}/KM)</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-zinc-100">{formatCurrency(item.amount)}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleLogisticsStatus(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                            item.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {item.status === 'paid' ? 'Pago' : 'A Pagar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLogistics(idx)}
                          className="text-zinc-500 hover:text-rose-400 p-1 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-zinc-500">
                  Nenhum custo de locomoção associado a este show.
                </div>
              )}

              {/* Form Inline Adicionar Logística */}
              {isAddLogisticsOpen && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-sky-500/30 space-y-2 animate-fadeIn">
                  <span className="text-[11px] font-bold text-sky-300 block">Adicionar Deslocamento / Transporte</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={logType}
                      onChange={e => setLogType(e.target.value as any)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="uber">Uber / 99</option>
                      <option value="car_km">Carro Próprio (KM)</option>
                      <option value="fuel">Combustível</option>
                      <option value="toll">Pedágio</option>
                      <option value="van">Van / Transporte Coletivo</option>
                      <option value="parking">Estacionamento</option>
                      <option value="other">Outro</option>
                    </select>
                    {logType === 'car_km' ? (
                      <>
                        <input
                          type="text"
                          placeholder="KM Rodado (ex: 45)"
                          value={logKm}
                          onChange={e => setLogKm(e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                        />
                        <input
                          type="text"
                          placeholder="R$/KM (ex: 1.20)"
                          value={logPricePerKm}
                          onChange={e => setLogPricePerKm(e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                        />
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Descrição (ex: Uber ida)"
                          value={logDesc}
                          onChange={e => setLogDesc(e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                        />
                        <input
                          type="text"
                          placeholder="Valor R$"
                          value={logAmount}
                          onChange={e => setLogAmount(e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                        />
                      </>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddLogisticsOpen(false)}
                      className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLogisticsInline}
                      className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                    >
                      Salvar Transporte
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. OUTRAS DESPESAS DO SHOW */}
            <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Fuel size={14} className="text-amber-400" />
                  <span className="text-xs font-bold text-zinc-200">Outras Despesas do Show ({show.otherExpenses?.length || 0})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-amber-400">{formatCurrency(otherCost)}</span>
                  <button
                    type="button"
                    onClick={() => setIsAddOtherOpen(prev => !prev)}
                    className="p-1 rounded-lg bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 transition text-xs flex items-center space-x-1 px-2"
                  >
                    <Plus size={12} />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Lista de Outras Despesas */}
              {show.otherExpenses && show.otherExpenses.length > 0 ? (
                <div className="space-y-1.5">
                  {show.otherExpenses.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-bold text-zinc-200">{item.description}</span>
                        <span className="text-[10px] text-zinc-500 block">{item.category}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-zinc-100">{formatCurrency(item.amount)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOther(idx)}
                          className="text-zinc-500 hover:text-rose-400 p-1 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-zinc-500">
                  Nenhuma despesa extra cadastrada (camarim, alimentação, aluguel de som).
                </div>
              )}

              {/* Form Inline Adicionar Outra Despesa */}
              {isAddOtherOpen && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-amber-500/30 space-y-2 animate-fadeIn">
                  <span className="text-[11px] font-bold text-amber-300 block">Adicionar Despesa Extra</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={otherCat}
                      onChange={e => setOtherCat(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="Alimentação / Camarim">Alimentação / Camarim</option>
                      <option value="Aluguel de Equipamentos / Som">Aluguel de Som / Equipamentos</option>
                      <option value="Hospedagem">Hospedagem</option>
                      <option value="Figurino / Vestuário">Figurino / Vestuário</option>
                      <option value="Comissão / Agenciamento">Comissão / Agenciamento</option>
                      <option value="Outros Custos">Outros Custos</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Descrição (ex: Jantar equipe)"
                      value={otherDesc}
                      onChange={e => setOtherDesc(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                    />
                    <input
                      type="text"
                      placeholder="Valor R$"
                      value={otherAmount}
                      onChange={e => setOtherAmount(e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddOtherOpen(false)}
                      className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddOtherInline}
                      className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                    >
                      Salvar Despesa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BLOCO D: CONTATO & OBSERVAÇÕES                                            */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#17171a] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <MessageCircle size={14} className="text-emerald-400" />
                <span>Contato & Observações Logísticas</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingNotes(prev => !prev)}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition"
              >
                <Edit3 size={12} />
                <span>{isEditingNotes ? 'Cancelar' : 'Editar Dados'}</span>
              </button>
            </div>

            {!isEditingNotes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contratante e WhatsApp */}
                <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Contratante / Responsável</span>
                  <div className="text-sm font-bold text-zinc-200">
                    {show.contractorName || show.name || 'Não informado'}
                  </div>
                  {show.contractorPhone ? (
                    <div className="flex items-center space-x-2 pt-1">
                      <a
                        href={getWhatsAppLink(show.contractorPhone) || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-black flex items-center space-x-1.5 transition"
                      >
                        <MessageCircle size={13} />
                        <span>Chamar no WhatsApp ({show.contractorPhone})</span>
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic">WhatsApp não cadastrado</div>
                  )}
                </div>

                {/* Observações Logísticas / Passagem de Som */}
                <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Notas & Observações do Show</span>
                  {(show as any).soundcheckTime && (
                    <div className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                      <Volume2 size={13} />
                      <span>Passagem de Som às {(show as any).soundcheckTime}</span>
                    </div>
                  )}
                  <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {show.notes || 'Nenhuma observação cadastrada (ex: levar extensão, tomadas 220v, traje sugerido).'}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveNotesAndContact} className="space-y-3 p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Nome do Contratante</label>
                    <input
                      type="text"
                      value={editedContractor}
                      onChange={e => setEditedContractor(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      placeholder="Ex: (11) 99999-9999"
                      value={editedPhone}
                      onChange={e => setEditedPhone(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Passagem de Som (Horário)</label>
                  <input
                    type="text"
                    placeholder="Ex: 18:30"
                    value={editedSoundcheck}
                    onChange={e => setEditedSoundcheck(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Observações & Requisitos Técnicos</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Passar som às 18h30, levar extensão 20m, 220v no palco."
                    value={editedNotes}
                    onChange={e => setEditedNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* MODAL DE EDIÇÃO DE CACHÊ */}
        {isEditCacheModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#18181b] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Editar Cachê Contratado</h3>
              <form onSubmit={handleSaveContractedCache} className="space-y-3">
                <input
                  type="text"
                  placeholder="Ex: 1500,00"
                  value={newContractedCache}
                  onChange={e => setNewContractedCache(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditCacheModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 font-black text-xs uppercase"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#18181b] border border-rose-500/30 rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-2 text-rose-400">
                <AlertTriangle size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">Excluir Apresentação</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tem certeza que deseja excluir o show <strong className="text-white">{show.name || show.contractorName}</strong>? Todas as despesas e vínculos deste evento serão removidos.
              </p>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(show.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase"
                >
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL GERADOR DE RECIBO */}
        {isReciboModalOpen && (
          <ReciboModal
            isOpen={isReciboModalOpen}
            onClose={() => setIsReciboModalOpen(false)}
            show={show}
          />
        )}

      </div>
    </div>
  );
};
