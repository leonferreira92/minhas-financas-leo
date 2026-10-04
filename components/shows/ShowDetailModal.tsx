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
  Fuel, Receipt, ShieldCheck, RefreshCw
} from 'lucide-react';
import { getStatusConfig, getShowDisplayHierarchy } from './types';
import { 
  normalizeShowFinancials, 
  getShowFinancialSummary,
  resolveShowExpenseClassification
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
    unlinkTransactionFromShow,
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

  // Form states para adição rápida de Receita
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(openPaymentDirectly);
  const [payStatus, setPayStatus] = useState<'Recebido' | 'Agendado'>('Recebido');
  const [payType, setPayType] = useState<ShowPaymentType>('Cachê Principal');
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState(() => getLocalDateString());
  const [payAccountId, setPayAccountId] = useState(() => getDefaultAccountForScope('BUSINESS'));

  // Edição inline de Recebimento existente
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentType, setEditPaymentType] = useState<ShowPaymentType>('Cachê Principal');
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentNotes, setEditPaymentNotes] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState(() => getLocalDateString());
  const [editPayStatus, setEditPayStatus] = useState<'Recebido' | 'Agendado'>('Recebido');

  // Adição explícita de Hora Extra / Couvert / Gorjeta inline
  const [isAddExtraOpen, setIsAddExtraOpen] = useState(false);
  const [extraTypeInput, setExtraTypeInput] = useState<ShowPaymentType>('Hora Extra');
  const [extraValInput, setExtraValInput] = useState('');
  const [extraDescInput, setExtraDescInput] = useState('');
  const [extraStatusInput, setExtraStatusInput] = useState<'Recebido' | 'Agendado'>('Recebido');
  const [extraDateInput, setExtraDateInput] = useState(() => getLocalDateString());
  const [extraAccountIdInput, setExtraAccountIdInput] = useState(() => getDefaultAccountForScope('BUSINESS'));

  // Adição de equipe inline (Músicos/Apoio -> Cachê de Terceiros / Equipe)
  const [isAddCrewOpen, setIsAddCrewOpen] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [customCrewName, setCustomCrewName] = useState('');
  const [customCrewRole, setCustomCrewRole] = useState('Bateria');
  const [customCrewCache, setCustomCrewCache] = useState('');
  const [customCrewPix, setCustomCrewPix] = useState('');

  // Adição de logística inline (Deslocamento/Logística -> Combustível, Pedágio, Hospedagem)
  const [isAddLogisticsOpen, setIsAddLogisticsOpen] = useState(false);
  const [logSubcategory, setLogSubcategory] = useState<'Combustível' | 'Pedágio' | 'Hospedagem'>('Combustível');
  const [logType, setLogType] = useState<'fuel' | 'car_km' | 'toll' | 'lodging' | 'uber'>('fuel');
  const [logDesc, setLogDesc] = useState('');
  const [logAmount, setLogAmount] = useState('');
  const [logKm, setLogKm] = useState('');
  const [logPricePerKm, setLogPricePerKm] = useState('1.20');

  // Adição de Equipamentos/Som inline (Equipamentos/Som -> Aluguel, Manutenção, Insumos do Show)
  const [isAddOtherOpen, setIsAddOtherOpen] = useState(false);
  const [otherCat, setOtherCat] = useState<'Aluguel' | 'Manutenção' | 'Insumos do Show'>('Aluguel');
  const [otherDesc, setOtherDesc] = useState('');
  const [otherAmount, setOtherAmount] = useState('');

  // Estados de edição inline de custos existentes
  const [editingCrewIndex, setEditingCrewIndex] = useState<number | null>(null);
  const [editCrewName, setEditCrewName] = useState('');
  const [editCrewRole, setEditCrewRole] = useState('');
  const [editCrewCache, setEditCrewCache] = useState('');
  const [editCrewPix, setEditCrewPix] = useState('');

  const [editingLogisticsIndex, setEditingLogisticsIndex] = useState<number | null>(null);
  const [editLogSubcategory, setEditLogSubcategory] = useState<'Combustível' | 'Pedágio' | 'Hospedagem'>('Combustível');
  const [editLogDesc, setEditLogDesc] = useState('');
  const [editLogAmount, setEditLogAmount] = useState('');
  const [editLogKm, setEditLogKm] = useState('');

  const [editingOtherIndex, setEditingOtherIndex] = useState<number | null>(null);
  const [editOtherCat, setEditOtherCat] = useState<'Aluguel' | 'Manutenção' | 'Insumos do Show'>('Aluguel');
  const [editOtherDesc, setEditOtherDesc] = useState('');
  const [editOtherAmount, setEditOtherAmount] = useState('');

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
    setEditingPaymentIndex(null);
    setEditingPaymentId(null);
    setEditingCrewIndex(null);
    setEditingLogisticsIndex(null);
    setEditingOtherIndex(null);
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
  const displayHierarchy = getShowDisplayHierarchy(show);

  // =========================================================================
  // CÁLCULO DINÂMICO DE MÉTRICAS FINANCEIRAS DO SHOW (BASEADO EM LANÇAMENTOS VINCULADOS)
  // =========================================================================
  const finSummary = useMemo(() => {
    return getShowFinancialSummary(show, transactions);
  }, [show, transactions]);

  // Cachê Principal (soma das receitas de Cachê Principal/Parcelas vinculadas)
  const baseCache = finSummary.principalCacheTotal;
  // Extras (Horas Extras + Couvert/Gorjeta)
  const extraVal = finSummary.extraAmount;
  // Cachê Bruto Real = Soma de todas as Receitas com o showId correspondente (Cachê Principal + Horas Extras + Couvert/Gorjeta)
  const totalShowValue = finSummary.realGrossCache;
  const grossCache = finSummary.realGrossCache;

  // Recebimentos Efetivados no Caixa
  const totalReceived = finSummary.totalReceived;
  const remainingToReceive = finSummary.totalPending;
  const percentReceived = finSummary.percentReceived;

  // Normalização e Isolamento Estrito dos Custos em 3 Grupos:
  // 1. Deslocamento/Logística -> Combustível, Pedágio, Hospedagem (cat_logistica_shows)
  // 2. Músicos/Apoio -> Cachê de Terceiros / Equipe (cat_producao_shows)
  // 3. Equipamentos/Som -> Aluguel, Manutenção, Insumos do Show (cat_equipamentos)
  const normalizedCostBlocks = useMemo(() => {
    if (!show) return { crew: [], logistics: [], other: [], crewCost: 0, logisticsCost: 0, otherCost: 0, totalCosts: 0 };

    const crewItems: Array<{
      id: string;
      name: string;
      role: string;
      subcategory: string;
      amount: number;
      status: 'paid' | 'pending';
      pixKey?: string;
      transactionId?: string;
      origType: 'crew' | 'expenseItem' | 'tx';
      origIndex: number;
    }> = [];

    const logisticsItems: Array<{
      id: string;
      type: string;
      subcategory: 'Combustível' | 'Pedágio' | 'Hospedagem';
      description: string;
      amount: number;
      km?: number;
      pricePerKm?: number;
      status: 'paid' | 'pending';
      transactionId?: string;
      origType: 'logistics' | 'expenseItem' | 'tx';
      origIndex: number;
    }> = [];

    const otherItems: Array<{
      id: string;
      category: 'Aluguel' | 'Manutenção' | 'Insumos do Show';
      subcategory: 'Aluguel' | 'Manutenção' | 'Insumos do Show';
      description: string;
      amount: number;
      status: 'paid' | 'pending';
      transactionId?: string;
      origType: 'other' | 'expenseItem' | 'tx';
      origIndex: number;
    }> = [];

    const trackedTxIds = new Set<string>();
    const trackedExpenseIds = new Set<string>();

    // 1. Músicos / Apoio -> Cachê de Terceiros / Equipe
    (show.crewMembers || []).forEach((c, i) => {
      if (c.id && trackedExpenseIds.has(c.id)) return;
      if (c.transactionId && trackedTxIds.has(c.transactionId)) return;
      if (c.id) trackedExpenseIds.add(c.id);
      if (c.transactionId) trackedTxIds.add(c.transactionId);
      crewItems.push({
        id: c.id || `crew_${i}`,
        name: c.name,
        role: c.role || 'Músico / Equipe',
        subcategory: 'Cachê de Terceiros / Equipe',
        amount: Number(c.cacheAmount) || 0,
        status: c.status === 'paid' ? 'paid' : 'pending',
        pixKey: c.pixKey,
        transactionId: c.transactionId,
        origType: 'crew',
        origIndex: i
      });
    });

    // 2. Deslocamento / Logística -> Combustível, Pedágio, Hospedagem
    (show.logistics || []).forEach((l, i) => {
      if (l.id && trackedExpenseIds.has(l.id)) return;
      if (l.transactionId && trackedTxIds.has(l.transactionId)) return;
      if (l.id) trackedExpenseIds.add(l.id);
      if (l.transactionId) trackedTxIds.add(l.transactionId);
      const cls = resolveShowExpenseClassification({
        costGroup: 'logistica',
        subcategory: l.subcategory,
        logisticsType: l.type,
        description: l.description
      });
      logisticsItems.push({
        id: l.id || `log_${i}`,
        type: cls.logisticsType,
        subcategory: cls.subcategory as 'Combustível' | 'Pedágio' | 'Hospedagem',
        description: l.description || cls.subcategory,
        amount: Number(l.amount) || 0,
        km: l.km,
        pricePerKm: l.pricePerKm,
        status: l.status === 'paid' ? 'paid' : 'pending',
        transactionId: l.transactionId,
        origType: 'logistics',
        origIndex: i
      });
    });

    // 3. Equipamentos / Som -> Aluguel, Manutenção, Insumos do Show
    (show.otherExpenses || []).forEach((o, i) => {
      if (o.id && trackedExpenseIds.has(o.id)) return;
      if (o.transactionId && trackedTxIds.has(o.transactionId)) return;
      if (o.id) trackedExpenseIds.add(o.id);
      if (o.transactionId) trackedTxIds.add(o.transactionId);
      const cls = resolveShowExpenseClassification({
        costGroup: 'equipamentos',
        subcategory: o.subcategory || o.category,
        category: o.category,
        description: o.description
      });
      const sub = (cls.subcategory === 'Aluguel' || cls.subcategory === 'Manutenção' ? cls.subcategory : 'Insumos do Show') as
        | 'Aluguel'
        | 'Manutenção'
        | 'Insumos do Show';
      otherItems.push({
        id: o.id || `oth_${i}`,
        category: sub,
        subcategory: sub,
        description: o.description || sub,
        amount: Number(o.amount) || 0,
        status: o.status === 'paid' ? 'paid' : 'pending',
        transactionId: o.transactionId,
        origType: 'other',
        origIndex: i
      });
    });

    // 4. Processar expenseItems legados
    (show.expenseItems || []).forEach((e, i) => {
      if (e.id && trackedExpenseIds.has(e.id)) return;
      if (e.transactionId && trackedTxIds.has(e.transactionId)) return;
      if (e.id) trackedExpenseIds.add(e.id);
      if (e.transactionId) trackedTxIds.add(e.transactionId);

      const cls = resolveShowExpenseClassification({
        costGroup: e.costGroup,
        subcategory: e.subcategory || e.category,
        category: e.category,
        description: e.notes
      });

      if (cls.costGroup === 'logistica') {
        logisticsItems.push({
          id: e.id || `exp_log_${i}`,
          type: cls.logisticsType,
          subcategory: cls.subcategory as 'Combustível' | 'Pedágio' | 'Hospedagem',
          description: e.notes || cls.subcategory,
          amount: Number(e.amount) || 0,
          status: e.status === 'pending' ? 'pending' : 'paid',
          transactionId: e.transactionId,
          origType: 'expenseItem',
          origIndex: i
        });
      } else if (cls.costGroup === 'musicos') {
        crewItems.push({
          id: e.id || `exp_crew_${i}`,
          name: e.notes || 'Músico / Apoio',
          role: 'Cachê de Terceiros / Equipe',
          subcategory: 'Cachê de Terceiros / Equipe',
          amount: Number(e.amount) || 0,
          status: e.status === 'pending' ? 'pending' : 'paid',
          transactionId: e.transactionId,
          origType: 'expenseItem',
          origIndex: i
        });
      } else {
        const sub = (cls.subcategory === 'Aluguel' || cls.subcategory === 'Manutenção' ? cls.subcategory : 'Insumos do Show') as
          | 'Aluguel'
          | 'Manutenção'
          | 'Insumos do Show';
        otherItems.push({
          id: e.id || `exp_oth_${i}`,
          category: sub,
          subcategory: sub,
          description: e.notes || sub,
          amount: Number(e.amount) || 0,
          status: e.status === 'pending' ? 'pending' : 'paid',
          transactionId: e.transactionId,
          origType: 'expenseItem',
          origIndex: i
        });
      }
    });

    // 5. Processar quaisquer transações de despesa vinculadas ao showId no Extrato que ainda não estejam nas listas acima
    linkedExpenseTransactions.forEach((t, idx) => {
      if (!t || t.status === 'cancelled') return;
      if (trackedTxIds.has(t.id)) return;
      if (t.showExpenseId && trackedExpenseIds.has(t.showExpenseId)) return;

      const cls = resolveShowExpenseClassification({
        costGroup: t.costGroup,
        subcategory: t.subcategory,
        categoryId: t.categoryId,
        description: t.description
      });

      if (cls.costGroup === 'logistica') {
        logisticsItems.push({
          id: t.id,
          type: cls.logisticsType,
          subcategory: cls.subcategory as 'Combustível' | 'Pedágio' | 'Hospedagem',
          description: t.description || cls.subcategory,
          amount: Number(t.amount) || 0,
          status: t.status === 'paid' ? 'paid' : 'pending',
          transactionId: t.id,
          origType: 'tx',
          origIndex: idx
        });
      } else if (cls.costGroup === 'musicos') {
        crewItems.push({
          id: t.id,
          name: t.description || 'Músico / Apoio',
          role: 'Cachê de Terceiros / Equipe',
          subcategory: 'Cachê de Terceiros / Equipe',
          amount: Number(t.amount) || 0,
          status: t.status === 'paid' ? 'paid' : 'pending',
          transactionId: t.id,
          origType: 'tx',
          origIndex: idx
        });
      } else {
        const sub = (cls.subcategory === 'Aluguel' || cls.subcategory === 'Manutenção' ? cls.subcategory : 'Insumos do Show') as
          | 'Aluguel'
          | 'Manutenção'
          | 'Insumos do Show';
        otherItems.push({
          id: t.id,
          category: sub,
          subcategory: sub,
          description: t.description || sub,
          amount: Number(t.amount) || 0,
          status: t.status === 'paid' ? 'paid' : 'pending',
          transactionId: t.id,
          origType: 'tx',
          origIndex: idx
        });
      }
    });

    const crewCostVal = crewItems.reduce((s, c) => s + c.amount, 0);
    const logisticsCostVal = logisticsItems.reduce((s, l) => s + l.amount, 0);
    const otherCostVal = otherItems.reduce((s, o) => s + o.amount, 0);
    const totalCostsVal = crewCostVal + logisticsCostVal + otherCostVal;

    return {
      crew: crewItems,
      logistics: logisticsItems,
      other: otherItems,
      crewCost: crewCostVal,
      logisticsCost: logisticsCostVal,
      otherCost: otherCostVal,
      totalCosts: totalCostsVal
    };
  }, [show, linkedExpenseTransactions]);

  const { crewCost, logisticsCost, otherCost } = normalizedCostBlocks;
  const totalCosts = finSummary.totalExpenses;
  // Lucro Líquido Real = Cachê Bruto Real - (Soma de todas as Despesas vinculadas com o showId)
  const netProfit = finSummary.realNetProfit;
  const marginPercent = finSummary.profitMarginPercent;

  // --- AÇÕES DE EDIÇÃO E EXCLUSÃO DE EQUIPE (MÚSICOS / APOIO) ---
  const handleStartEditCrew = (idx: number, item: any) => {
    setEditingCrewIndex(idx);
    setEditCrewName(item.name || '');
    setEditCrewRole(item.role || 'Músico');
    setEditCrewCache(String(item.amount || ''));
    setEditCrewPix(item.pixKey || '');
  };

  const handleSaveEditCrewItem = (item: any) => {
    const amt = parseFloat(editCrewCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (item.origType === 'crew') {
      const updated = (show.crewMembers || []).map((c, i) => {
        if (i === item.origIndex) {
          return {
            ...c,
            name: editCrewName.trim() || c.name,
            role: editCrewRole.trim() || c.role,
            costGroup: 'musicos' as const,
            subcategory: 'Cachê de Terceiros / Equipe' as const,
            cacheAmount: amt,
            pixKey: editCrewPix.trim() || undefined
          };
        }
        return c;
      });
      updateShow({ ...show, crewMembers: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).map((e, i) => {
        if (i === item.origIndex) {
          return {
            ...e,
            category: 'Cachê de Terceiros / Equipe',
            subcategory: 'Cachê de Terceiros / Equipe',
            costGroup: 'musicos' as const,
            notes: editCrewName,
            amount: amt
          };
        }
        return e;
      });
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'tx' && item.transactionId) {
      const tx = transactions.find(t => t.id === item.transactionId);
      if (tx) {
        updateTransaction({
          ...tx,
          description: editCrewName.trim() || tx.description,
          amount: amt,
          costGroup: 'musicos',
          subcategory: 'Cachê de Terceiros / Equipe',
          categoryId: 'cat_producao_shows'
        });
      }
    }
    setEditingCrewIndex(null);
    showToast('Custo de Músicos/Apoio atualizado e saldo recalculado em tempo real!');
  };

  const handleRemoveCrewItem = (item: any) => {
    if (item.origType === 'crew') {
      const updated = (show.crewMembers || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, crewMembers: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'tx' && item.transactionId) {
      deleteTransaction(item.transactionId);
    }
    showToast('Custo de Músicos/Apoio removido e saldo recalculado!');
  };

  // --- AÇÕES DE EDIÇÃO E EXCLUSÃO DE LOGÍSTICA (COMBUSTÍVEL, PEDÁGIO, HOSPEDAGEM) ---
  const handleStartEditLogistics = (idx: number, item: any) => {
    setEditingLogisticsIndex(idx);
    setEditLogSubcategory(item.subcategory || 'Combustível');
    setEditLogDesc(item.description || '');
    setEditLogAmount(String(item.amount || ''));
    setEditLogKm(item.km ? String(item.km) : '');
  };

  const handleSaveEditLogisticsItem = (item: any) => {
    let amt = parseFloat(editLogAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const kmNum = parseFloat(editLogKm.replace(',', '.')) || undefined;
    if (kmNum && !amt) {
      amt = kmNum * 1.2;
    }
    const logTypeMapped =
      editLogSubcategory === 'Pedágio' ? 'toll' : editLogSubcategory === 'Hospedagem' ? 'lodging' : 'fuel';

    if (item.origType === 'logistics') {
      const updated = (show.logistics || []).map((l, i) => {
        if (i === item.origIndex) {
          return {
            ...l,
            type: logTypeMapped as 'fuel' | 'toll' | 'lodging',
            costGroup: 'logistica' as const,
            subcategory: editLogSubcategory,
            description: editLogDesc.trim() || editLogSubcategory,
            amount: amt,
            km: kmNum
          };
        }
        return l;
      });
      updateShow({ ...show, logistics: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).map((e, i) => {
        if (i === item.origIndex) {
          return {
            ...e,
            category: editLogSubcategory,
            subcategory: editLogSubcategory,
            costGroup: 'logistica' as const,
            notes: editLogDesc.trim() || editLogSubcategory,
            amount: amt
          };
        }
        return e;
      });
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'tx' && item.transactionId) {
      const tx = transactions.find(t => t.id === item.transactionId);
      if (tx) {
        updateTransaction({
          ...tx,
          description: editLogDesc.trim() || editLogSubcategory,
          amount: amt,
          costGroup: 'logistica',
          subcategory: editLogSubcategory,
          categoryId: 'cat_logistica_shows'
        });
      }
    }
    setEditingLogisticsIndex(null);
    showToast('Custo de Deslocamento/Logística atualizado e saldo recalculado!');
  };

  const handleRemoveLogisticsItem = (item: any) => {
    if (item.origType === 'logistics') {
      const updated = (show.logistics || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, logistics: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'tx' && item.transactionId) {
      deleteTransaction(item.transactionId);
    }
    showToast('Custo de Deslocamento/Logística removido e saldo recalculado!');
  };

  // --- AÇÕES DE EDIÇÃO E EXCLUSÃO DE EQUIPAMENTOS / SOM (ALUGUEL, MANUTENÇÃO, INSUMOS DO SHOW) ---
  const handleStartEditOther = (idx: number, item: any) => {
    setEditingOtherIndex(idx);
    const sub =
      item.subcategory === 'Aluguel' || item.subcategory === 'Manutenção' ? item.subcategory : 'Insumos do Show';
    setEditOtherCat(sub);
    setEditOtherDesc(item.description || '');
    setEditOtherAmount(String(item.amount || ''));
  };

  const handleSaveEditOtherItem = (item: any) => {
    const amt = parseFloat(editOtherAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (item.origType === 'other') {
      const updated = (show.otherExpenses || []).map((o, i) => {
        if (i === item.origIndex) {
          return {
            ...o,
            category: editOtherCat,
            subcategory: editOtherCat,
            costGroup: 'equipamentos' as const,
            description: editOtherDesc.trim() || editOtherCat,
            amount: amt
          };
        }
        return o;
      });
      updateShow({ ...show, otherExpenses: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).map((e, i) => {
        if (i === item.origIndex) {
          return {
            ...e,
            category: editOtherCat,
            subcategory: editOtherCat,
            costGroup: 'equipamentos' as const,
            notes: editOtherDesc.trim() || editOtherCat,
            amount: amt
          };
        }
        return e;
      });
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'tx' && item.transactionId) {
      const tx = transactions.find(t => t.id === item.transactionId);
      if (tx) {
        updateTransaction({
          ...tx,
          description: editOtherDesc.trim() || editOtherCat,
          amount: amt,
          costGroup: 'equipamentos',
          subcategory: editOtherCat,
          categoryId: 'cat_equipamentos'
        });
      }
    }
    setEditingOtherIndex(null);
    showToast('Custo de Equipamentos/Som atualizado e saldo recalculado!');
  };

  const handleRemoveOtherItem = (item: any) => {
    if (item.origType === 'other') {
      const updated = (show.otherExpenses || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, otherExpenses: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'tx' && item.transactionId) {
      deleteTransaction(item.transactionId);
    }
    showToast('Custo de Equipamentos/Som removido e saldo recalculado!');
  };

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

  // Atualizar Cachê Principal (sincronizando diretamente o lançamento vinculado de Cachê Principal)
  const handleSaveContractedCache = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newContractedCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (val < 0) return;

    const existingPayments = Array.isArray(show.payments) ? [...show.payments] : [];
    const principalIdx = existingPayments.findIndex(
      p => p.type === 'Cachê Principal' || p.type === 'Pagamento final' || p.type === 'Parcela'
    );

    if (principalIdx >= 0) {
      existingPayments[principalIdx] = {
        ...existingPayments[principalIdx],
        type: 'Cachê Principal',
        amount: val
      };
    } else if (val > 0) {
      existingPayments.unshift({
        id: generateUUID(),
        type: 'Cachê Principal',
        amount: val,
        expectedDate: show.date || getLocalDateString(),
        effectiveDate: show.status === 'Realizado' ? show.date || getLocalDateString() : undefined,
        accountId: defaultAccountId,
        status: show.status === 'Realizado' ? 'Recebido' : 'Agendado',
        notes: 'Cachê Principal do Evento'
      });
    }

    updateShow({ ...show, payments: existingPayments, totalCache: val, cacheCombined: val });
    setIsEditCacheModalOpen(false);
    showToast(`Cachê Principal atualizado para ${formatCurrency(val)} e recalculado em tempo real!`);
  };

  // Salvar Recebimento (Cachê Principal, Sinal, Parcela, Hora Extra, Couvert, Gorjeta)
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    const paymentId = generateUUID();
    const isPaid = payStatus === 'Recebido';
    const isInstallmentOfBase = payType === 'Sinal' || payType === 'Parcela' || payType === 'Restante';

    const basePayments: ShowPayment[] = [...(show.payments || [])];

    // Se for Sinal, Parcela ou Restante, abate do saldo Agendado de Cachê Principal/Restante para não duplicar o Cachê Bruto
    if (isInstallmentOfBase) {
      const pendingPrincipalIdx = basePayments.findIndex(
        p => p.status !== 'Recebido' && (p.type === 'Cachê Principal' || p.type === 'Restante' || p.type === 'Pagamento final')
      );
      if (pendingPrincipalIdx >= 0) {
        const pendingItem = basePayments[pendingPrincipalIdx];
        const remainingVal = Math.round(((Number(pendingItem.amount) || 0) - amt) * 100) / 100;
        if (remainingVal > 0.01) {
          basePayments[pendingPrincipalIdx] = {
            ...pendingItem,
            type: 'Restante',
            amount: remainingVal,
            notes: 'Restante do Cachê a Receber'
          };
        } else {
          basePayments.splice(pendingPrincipalIdx, 1);
        }
      }
    }

    const updatedPayments: ShowPayment[] = [
      ...basePayments,
      {
        id: paymentId,
        type: payType,
        amount: amt,
        expectedDate: payDate || show.date || getLocalDateString(),
        effectiveDate: isPaid ? payDate || show.date || getLocalDateString() : undefined,
        accountId: payAccountId || defaultAccountId,
        status: isPaid ? 'Recebido' : 'Agendado',
        notes: payNotes.trim() || `${payType} - ${show.contractorName || show.name}`
      }
    ];

    updateShow({
      ...show,
      payments: updatedPayments
    });
    setPayAmount('');
    setPayNotes('');
    setIsAddPaymentOpen(false);
    showToast(`${payType} de ${formatCurrency(amt)} vinculado ao show e recalculado!`);
  };

  // Salvar Hora Extra / Couvert / Gorjeta Inline
  const handleSaveExtraPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(extraValInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    const paymentId = generateUUID();
    const isPaid = extraStatusInput === 'Recebido';

    const updatedPayments: ShowPayment[] = [
      ...(show.payments || []),
      {
        id: paymentId,
        type: extraTypeInput,
        amount: amt,
        expectedDate: extraDateInput || show.date || getLocalDateString(),
        effectiveDate: isPaid ? extraDateInput || show.date || getLocalDateString() : undefined,
        accountId: extraAccountIdInput || defaultAccountId,
        status: isPaid ? 'Recebido' : 'Agendado',
        notes: extraDescInput.trim() || extraTypeInput
      }
    ];

    updateShow({
      ...show,
      extraNote: extraDescInput.trim() || show.extraNote || extraTypeInput,
      payments: updatedPayments
    });

    setExtraValInput('');
    setExtraDescInput('');
    setIsAddExtraOpen(false);
    showToast(`${extraTypeInput} de ${formatCurrency(amt)} registrado e somado ao Cachê Bruto Real!`);
  };

  // Edição e Exclusão de Lançamento de Receita do Show
  const handleStartEditPayment = (idx: number, p: ShowPayment) => {
    setEditingPaymentIndex(idx);
    setEditingPaymentId(p.id);
    setEditPaymentType(p.type || 'Cachê Principal');
    setEditPaymentAmount(String(p.amount || ''));
    setEditPaymentNotes(p.notes || '');
    setEditPaymentDate(p.effectiveDate || p.expectedDate || show.date || getLocalDateString());
    setEditPayStatus(p.status === 'Recebido' ? 'Recebido' : 'Agendado');
  };

  const handleSaveEditPayment = (idxOrId: number | string) => {
    const amt = parseFloat(editPaymentAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    const updatedPayments = (show.payments || []).map((p, idx) => {
      if (idx === idxOrId || p.id === idxOrId) {
        return {
          ...p,
          type: editPaymentType,
          amount: amt,
          notes: editPaymentNotes.trim(),
          status: editPayStatus,
          expectedDate: editPaymentDate || p.expectedDate || show.date || getLocalDateString(),
          effectiveDate: editPayStatus === 'Recebido' ? (editPaymentDate || p.effectiveDate || show.date || getLocalDateString()) : undefined
        };
      }
      return p;
    });

    updateShow({ ...show, payments: updatedPayments });
    setEditingPaymentIndex(null);
    setEditingPaymentId(null);
    showToast('Receita atualizada e saldo recalculado em tempo real!');
  };

  const handleTogglePaymentStatus = (idxOrId: number | string) => {
    const updatedPayments = (show.payments || []).map((p, idx) => {
      if (idx === idxOrId || p.id === idxOrId) {
        const nextStatus = p.status === 'Recebido' ? ('Agendado' as const) : ('Recebido' as const);
        return {
          ...p,
          status: nextStatus,
          effectiveDate: nextStatus === 'Recebido' ? p.effectiveDate || show.date || getLocalDateString() : undefined
        };
      }
      return p;
    });
    updateShow({ ...show, payments: updatedPayments });
    showToast('Status do recebimento atualizado!');
  };

  const handleRemovePaymentItem = (idxOrId: number | string) => {
    const target = (show.payments || []).find((p, idx) => idx === idxOrId || p.id === idxOrId);
    const updatedPayments = (show.payments || []).filter((p, idx) => idx !== idxOrId && p.id !== idxOrId);
    updateShow({ ...show, payments: updatedPayments });
    if (target?.transactionId) {
      deleteTransaction(target.transactionId);
    }
    showToast('Receita removida e Cachê Bruto Real recalculado!');
  };

  // Salvar Membro de Equipe Inline (Músicos/Apoio -> Cachê de Terceiros / Equipe)
  const handleAddCrewInline = () => {
    if (selectedCrewId) {
      const found = crew.find(c => c.id === selectedCrewId);
      if (found) {
        const updated = [
          ...(show.crewMembers || []),
          {
            id: generateUUID(),
            memberId: found.id,
            name: found.name,
            role: found.role,
            costGroup: 'musicos' as const,
            subcategory: 'Cachê de Terceiros / Equipe' as const,
            cacheAmount: found.defaultCache || 0,
            pixKey: found.pixKey,
            status: 'pending' as const
          }
        ];
        updateShow({ ...show, crewMembers: updated });
        setSelectedCrewId('');
        setIsAddCrewOpen(false);
        showToast(`${found.name} vinculado em Músicos/Apoio (Cachê de Terceiros / Equipe)!`);
        return;
      }
    }

    if (customCrewName.trim()) {
      const amt = parseFloat(customCrewCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      const updated = [
        ...(show.crewMembers || []),
        {
          id: generateUUID(),
          name: customCrewName.trim(),
          role: customCrewRole,
          costGroup: 'musicos' as const,
          subcategory: 'Cachê de Terceiros / Equipe' as const,
          cacheAmount: amt,
          pixKey: customCrewPix.trim() || undefined,
          status: 'pending' as const
        }
      ];
      updateShow({ ...show, crewMembers: updated });
      setCustomCrewName('');
      setCustomCrewCache('');
      setCustomCrewPix('');
      setIsAddCrewOpen(false);
      showToast(`${customCrewName} vinculado em Músicos/Apoio (Cachê de Terceiros / Equipe)!`);
    }
  };

  const handleToggleCrewStatus = (itemOrIdx: any) => {
    if (typeof itemOrIdx === 'number') {
      const updated = (show.crewMembers || []).map((c, i) =>
        i === itemOrIdx ? { ...c, status: c.status === 'paid' ? ('pending' as const) : ('paid' as const) } : c
      );
      updateShow({ ...show, crewMembers: updated });
    } else if (itemOrIdx?.origType === 'crew') {
      const updated = (show.crewMembers || []).map((c, i) =>
        i === itemOrIdx.origIndex ? { ...c, status: c.status === 'paid' ? ('pending' as const) : ('paid' as const) } : c
      );
      updateShow({ ...show, crewMembers: updated });
    } else if (itemOrIdx?.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).map((e, i) =>
        i === itemOrIdx.origIndex ? { ...e, status: e.status === 'paid' ? ('pending' as const) : ('paid' as const) } : e
      );
      updateShow({ ...show, expenseItems: updated });
    } else if (itemOrIdx?.origType === 'tx' && itemOrIdx.transactionId) {
      const tx = transactions.find(t => t.id === itemOrIdx.transactionId);
      if (tx) updateTransaction({ ...tx, status: tx.status === 'paid' ? 'pending' : 'paid' });
    }
    showToast('Status de pagamento da equipe atualizado!');
  };

  const handleRemoveCrew = (idx: number) => {
    const updated = (show.crewMembers || []).filter((_, i) => i !== idx);
    updateShow({ ...show, crewMembers: updated });
    showToast('Membro removido da equipe do show.');
  };

  // Salvar Logística Inline (Deslocamento/Logística -> Combustível, Pedágio, Hospedagem)
  const handleAddLogisticsInline = () => {
    let amt = parseFloat(logAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const kmNum = parseFloat(logKm.replace(',', '.')) || undefined;
    const priceNum = parseFloat(logPricePerKm.replace(',', '.')) || undefined;

    if (kmNum && priceNum && !amt) {
      amt = kmNum * priceNum;
    }

    if (amt <= 0) return;

    const mappedType: 'fuel' | 'toll' | 'lodging' =
      logSubcategory === 'Pedágio' ? 'toll' : logSubcategory === 'Hospedagem' ? 'lodging' : 'fuel';

    const updated = [
      ...(show.logistics || []),
      {
        id: generateUUID(),
        type: mappedType,
        costGroup: 'logistica' as const,
        subcategory: logSubcategory,
        description: logDesc.trim() || logSubcategory,
        amount: amt,
        km: kmNum,
        pricePerKm: priceNum,
        status: 'pending' as const
      }
    ];

    updateShow({ ...show, logistics: updated });
    setLogDesc('');
    setLogAmount('');
    setLogKm('');
    setIsAddLogisticsOpen(false);
    showToast(`Despesa de ${logSubcategory} vinculada em Deslocamento/Logística!`);
  };

  const handleToggleLogisticsStatus = (itemOrIdx: any) => {
    if (typeof itemOrIdx === 'number') {
      const updated = (show.logistics || []).map((l, i) =>
        i === itemOrIdx ? { ...l, status: l.status === 'paid' ? ('pending' as const) : ('paid' as const) } : l
      );
      updateShow({ ...show, logistics: updated });
    } else if (itemOrIdx?.origType === 'logistics') {
      const updated = (show.logistics || []).map((l, i) =>
        i === itemOrIdx.origIndex ? { ...l, status: l.status === 'paid' ? ('pending' as const) : ('paid' as const) } : l
      );
      updateShow({ ...show, logistics: updated });
    } else if (itemOrIdx?.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).map((e, i) =>
        i === itemOrIdx.origIndex ? { ...e, status: e.status === 'paid' ? ('pending' as const) : ('paid' as const) } : e
      );
      updateShow({ ...show, expenseItems: updated });
    } else if (itemOrIdx?.origType === 'tx' && itemOrIdx.transactionId) {
      const tx = transactions.find(t => t.id === itemOrIdx.transactionId);
      if (tx) updateTransaction({ ...tx, status: tx.status === 'paid' ? 'pending' : 'paid' });
    }
    showToast('Status da despesa de logística atualizado!');
  };

  const handleRemoveLogistics = (idx: number) => {
    const updated = (show.logistics || []).filter((_, i) => i !== idx);
    updateShow({ ...show, logistics: updated });
    showToast('Despesa de logística removida.');
  };

  // Salvar Equipamentos / Som Inline (Aluguel, Manutenção ou Insumos do Show)
  const handleAddOtherInline = () => {
    const amt = parseFloat(otherAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    const updated = [
      ...(show.otherExpenses || []),
      {
        id: generateUUID(),
        category: otherCat,
        subcategory: otherCat,
        costGroup: 'equipamentos' as const,
        description: otherDesc.trim() || otherCat,
        amount: amt,
        status: 'pending' as const
      }
    ];

    updateShow({ ...show, otherExpenses: updated });
    setOtherDesc('');
    setOtherAmount('');
    setIsAddOtherOpen(false);
    showToast(`Despesa de ${otherCat} vinculada em Equipamentos/Som!`);
  };

  const handleToggleOtherStatus = (itemOrIdx: any) => {
    if (typeof itemOrIdx === 'number') {
      const updated = (show.otherExpenses || []).map((o, i) =>
        i === itemOrIdx ? { ...o, status: o.status === 'paid' ? ('pending' as const) : ('paid' as const) } : o
      );
      updateShow({ ...show, otherExpenses: updated });
    } else if (itemOrIdx?.origType === 'other') {
      const updated = (show.otherExpenses || []).map((o, i) =>
        i === itemOrIdx.origIndex ? { ...o, status: o.status === 'paid' ? ('pending' as const) : ('paid' as const) } : o
      );
      updateShow({ ...show, otherExpenses: updated });
    } else if (itemOrIdx?.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).map((e, i) =>
        i === itemOrIdx.origIndex ? { ...e, status: e.status === 'paid' ? ('pending' as const) : ('paid' as const) } : e
      );
      updateShow({ ...show, expenseItems: updated });
    } else if (itemOrIdx?.origType === 'tx' && itemOrIdx.transactionId) {
      const tx = transactions.find(t => t.id === itemOrIdx.transactionId);
      if (tx) updateTransaction({ ...tx, status: tx.status === 'paid' ? 'pending' : 'paid' });
    }
    showToast('Status do custo de Equipamentos/Som atualizado!');
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
                <span className="text-[11px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-md flex items-center space-x-1">
                  <MapPin size={11} className="text-purple-400 shrink-0" />
                  <span>{displayHierarchy.cityTag}</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                {displayHierarchy.eventTitle}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-zinc-300 truncate">
                {displayHierarchy.contractorSubtitle}
              </p>
              <div className="flex items-center space-x-3 text-xs sm:text-sm text-zinc-400 font-medium pt-0.5">
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

            {/* Grid dos 4 Cards Financeiros (Cálculo Dinâmico por showId) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Cachê Bruto Real */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Cachê Bruto Real
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { setNewContractedCache(String(baseCache)); setIsEditCacheModalOpen(true); }}
                    className="text-zinc-500 hover:text-emerald-400 transition"
                    title="Editar Cachê Principal"
                  >
                    <Edit3 size={11} />
                  </button>
                </div>
                <div className="text-base sm:text-lg font-black text-white tabular-nums">
                  {formatCurrency(totalShowValue)}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {extraVal > 0 
                    ? `Base ${formatCurrency(baseCache)} + Extras ${formatCurrency(extraVal)}` 
                    : `Soma das receitas (#${show.id.slice(0, 5)})`}
                </div>
              </div>

              {/* 2. Sinal / Recebido */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Total Recebido</span>
                <div className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">
                  {formatCurrency(totalReceived)}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {remainingToReceive > 0 ? `Resta: ${formatCurrency(remainingToReceive)}` : '100% quitado no caixa'}
                </div>
              </div>

              {/* 3. Custos Vinculados (Logística + Equipe + Equipamentos/Som) */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Custos do Show</span>
                <div className="text-base sm:text-lg font-black text-rose-400 tabular-nums">
                  {formatCurrency(totalCosts)}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  Logística + Equipe + Equip./Som
                </div>
              </div>

              {/* 4. Lucro Líquido Real */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Lucro Líquido Real</span>
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
                <div className="text-[10px] text-zinc-500 truncate">Cachê Bruto − Despesas</div>
              </div>
            </div>

            {/* Termômetro de Lucro Real & Barra de Progresso do Recebimento */}
            <div className="space-y-3 pt-2 border-t border-zinc-800/80">
              {/* Termômetro de Lucro Real */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-zinc-400 flex items-center space-x-1.5">
                    <span>Termômetro de Lucro Real</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                      marginPercent >= 60 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                      marginPercent >= 30 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {marginPercent >= 60 ? 'Alta Rentabilidade' : marginPercent >= 30 ? 'Margem Moderada' : 'Margem Crítica'} ({marginPercent}%)
                    </span>
                  </span>
                  <span className={netProfit >= 0 ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}>
                    Livre: {formatCurrency(netProfit)} de {formatCurrency(totalShowValue)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${
                      marginPercent >= 60 ? 'bg-[#1ed760]' : marginPercent >= 30 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${totalShowValue > 0 ? Math.max(0, Math.min(100, Math.round((Math.max(0, netProfit) / totalShowValue) * 100))) : 0}%` }}
                    title={`Lucro Líquido: ${formatCurrency(netProfit)}`}
                  />
                  <div
                    className="h-full bg-rose-500/60 transition-all duration-300"
                    style={{ width: `${totalShowValue > 0 ? Math.max(0, Math.min(100, Math.round((totalCosts / totalShowValue) * 100))) : 0}%` }}
                    title={`Custos Vinculados: ${formatCurrency(totalCosts)}`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Equipe: {formatCurrency(crewCost)} • Logística: {formatCurrency(logisticsCost)} • Equip./Som: {formatCurrency(otherCost)}</span>
                  <span>Custos: {totalShowValue > 0 ? Math.round((totalCosts / totalShowValue) * 100) : 0}% do Cachê Bruto</span>
                </div>
              </div>

              {/* Barra de Progresso do Recebimento */}
              <div className="space-y-1.5 pt-1 border-t border-zinc-800/50">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>Progresso de Quitação do Cachê ({percentReceived}%)</span>
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
              </div>

              {/* INDICADORES INTELIGENTES DE PERFORMANCE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {/* Formato de Recebimento */}
                <div className="p-3 rounded-xl bg-[#0f0f11] border border-zinc-800 space-y-1">
                  <span className="text-[9px] font-black uppercase text-zinc-500 block">Formato de Recebimento</span>
                  <div className="text-xs font-black text-white">
                    {((show as any).revenueModel === 'couvert') ? 'Couvert Artístico' :
                     ((show as any).revenueModel === 'hybrid') ? 'Híbrido' : 'Cachê Fixo'}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {((show as any).revenueModel === 'couvert') && `Est: ${(show as any).estimatedPeople || 80} pessoas × R$ ${(show as any).couvertPrice || 15}`}
                    {((show as any).revenueModel === 'hybrid') && `R$ ${(show as any).guaranteedMinCache || 500} garante + ${(show as any).estimatedPeople || 80}p × ${(show as any).couvertPercentage || 100}%`}
                    {(!((show as any).revenueModel) || (show as any).revenueModel === 'fixed') && 'Valor fechado com o contratante'}
                  </div>
                </div>

                {/* Tempo Dedicado & Lucro/Hora */}
                <div className="p-3 rounded-xl bg-[#0f0f11] border border-zinc-800 space-y-1">
                  <span className="text-[9px] font-black uppercase text-zinc-500 block">Tempo & Lucro/Hora</span>
                  <div className="text-xs font-black text-[#1ed760] flex items-center justify-between">
                    <span>{formatCurrency(Math.round((netProfit / (Number((show as any).showHours || 2) + (Number((show as any).travelTimeMinutes || 0) / 60) + (Number((show as any).soundcheckTimeMinutes || 0) / 60))) * 100) / 100)}/h</span>
                    <span className="text-[10px] text-zinc-400 font-normal">({Number((show as any).showHours || 2) + Math.round(((Number((show as any).travelTimeMinutes || 0) + Number((show as any).soundcheckTimeMinutes || 0)) / 60) * 10) / 10}h total)</span>
                  </div>
                  <div className="text-[9px] text-zinc-400">
                    Show: {(show as any).showHours || 2}h • Desl/Mont: {Math.round((Number((show as any).travelTimeMinutes || 60) + Number((show as any).soundcheckTimeMinutes || 60)))} min
                  </div>
                </div>

                {/* Reserva para Equipamentos */}
                <div className="p-3 rounded-xl bg-[#0f0f11] border border-amber-500/20 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-amber-400 block">Reserva Equipamento</span>
                    <span className="text-xs font-black text-amber-400">{formatCurrency(Number((show as any).equipmentReserveAmount) || 0)}</span>
                  </div>
                  <div className="text-[9px] text-zinc-400">
                    Retido p/ manutenção estrutural.
                  </div>
                  <div className="text-[9px] text-purple-300 font-bold">
                    Lucro c/ Deprec: {formatCurrency(netProfit - (Number((show as any).equipmentReserveAmount) || 0))}
                  </div>
                </div>
              </div>

              {/* Ações rápidas para lançar sinal / parcela e hora extra / gorjeta */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => { setIsAddExtraOpen(prev => !prev); setIsAddPaymentOpen(false); }}
                  className="text-xs font-bold text-purple-300 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/50 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition active:scale-95"
                >
                  <Sparkles size={13} className="text-purple-400" />
                  <span>{isAddExtraOpen ? 'Fechar Hora Extra / Couvert' : '+ Hora Extra / Couvert / Gorjeta'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsAddPaymentOpen(prev => !prev); setIsAddExtraOpen(false); }}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition active:scale-95"
                >
                  <Plus size={13} />
                  <span>{isAddPaymentOpen ? 'Fechar Lançamento' : '+ Lançar Recebimento / Sinal'}</span>
                </button>
              </div>

              {/* Form de Adicionar Hora Extra / Couvert / Gorjeta */}
              {isAddExtraOpen && (
                <form onSubmit={handleSaveExtraPayment} className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-3 mt-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
                      <Sparkles size={14} className="text-purple-400" />
                      <span>Registrar Receita Adicional (Hora Extra / Couvert / Gorjeta)</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Soma ao Cachê Bruto Real com vínculo showId
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Modalidade</label>
                      <select
                        value={extraTypeInput}
                        onChange={e => setExtraTypeInput(e.target.value as ShowPaymentType)}
                        className="w-full bg-zinc-900 border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-xs text-purple-200 font-bold"
                      >
                        <option value="Extra">Horas Extras</option>
                        <option value="Couvert">Couvert / Gorjeta</option>
                        <option value="Bônus">Bônus / Adicional</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Valor Adicional (R$)</label>
                      <input
                        type="text"
                        placeholder="Ex: 200,00"
                        value={extraValInput}
                        onChange={e => setExtraValInput(e.target.value)}
                        className="w-full bg-zinc-900 border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-xs text-purple-300 font-bold"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Motivo / Descrição</label>
                      <input
                        type="text"
                        placeholder="Ex: +1h palco / Gorjeta mesa"
                        value={extraDescInput}
                        onChange={e => setExtraDescInput(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Data</label>
                      <input
                        type="date"
                        value={extraDateInput}
                        onChange={e => setExtraDateInput(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Situação</label>
                      <select
                        value={extraStatusInput}
                        onChange={e => setExtraStatusInput(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <option value="Recebido">Já Recebido (Caixa)</option>
                        <option value="Agendado">Previsto / Agendado</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <p className="text-[10px] text-zinc-400">
                      Cachê Bruto Real após lançamento: <strong className="text-white">{formatCurrency(totalShowValue)}</strong> + <strong className="text-purple-300">{formatCurrency(parseFloat(extraValInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0)}</strong> = <strong className="text-emerald-400">{formatCurrency(totalShowValue + (parseFloat(extraValInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0))}</strong>
                    </p>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsAddExtraOpen(false)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider"
                      >
                        Salvar Receita
                      </button>
                    </div>
                  </div>
                </form>
              )}

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
                        <option value="Cachê Principal">Cachê Principal</option>
                        <option value="Extra">Extra / Horas Extras</option>
                        <option value="Couvert">Couvert / Gorjeta</option>
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

              {/* LISTAGEM TRANSPARENTE DE ENTRADAS REGISTRADAS NO SHOW */}
              {((show.payments && show.payments.length > 0) || linkedIncomeTransactions.length > 0) && (
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Receitas Vinculadas ao Show ({((show.payments || []).length) + (linkedIncomeTransactions.filter(t => !(show.payments || []).some(p => p.transactionId === t.id)).length)})
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Cachê Bruto Real: <strong className="text-emerald-400">{formatCurrency(totalShowValue)}</strong>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Pagamentos registrados no show */}
                    {(show.payments || []).map((p, idx) => {
                      const isExtra = p.type === 'Extra' || p.type === 'Bônus' || p.type === 'Couvert';
                      const isEditing = editingPaymentIndex === idx;
                      if (isEditing) {
                        return (
                          <div key={p.id || idx} className="p-3 rounded-xl bg-zinc-900 border border-emerald-500/50 space-y-2 animate-fadeIn text-xs">
                            <span className="font-bold text-emerald-400 block">Editar Receita Vinculada ao Show</span>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <select
                                value={editPaymentType}
                                onChange={e => setEditPaymentType(e.target.value as ShowPaymentType)}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              >
                                <option value="Cachê Principal">Cachê Principal</option>
                                <option value="Sinal">Sinal</option>
                                <option value="Parcela">Parcela</option>
                                <option value="Restante">Restante</option>
                                <option value="Extra">Horas Extras</option>
                                <option value="Couvert">Couvert / Gorjeta</option>
                                <option value="Bônus">Bônus</option>
                              </select>
                              <input
                                type="text"
                                value={editPaymentNotes}
                                onChange={e => setEditPaymentNotes(e.target.value)}
                                placeholder="Descrição"
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                              <input
                                type="text"
                                value={editPaymentAmount}
                                onChange={e => setEditPaymentAmount(e.target.value)}
                                placeholder="Valor R$"
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                              />
                              <input
                                type="date"
                                value={editPaymentDate}
                                onChange={e => setEditPaymentDate(e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                              />
                            </div>
                            <div className="flex justify-end space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingPaymentIndex(null)}
                                className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs font-bold"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditPayment(idx)}
                                className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs"
                              >
                                Salvar Alteração
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={p.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 text-xs">
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${
                              isExtra ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                            }`}>
                              {p.type}
                            </span>
                            <span className="text-zinc-200 font-bold truncate max-w-[180px] sm:max-w-[240px]">
                              {p.notes || (isExtra ? 'Hora Extra / Gorjeta' : 'Cachê do Show')}
                            </span>
                            {p.effectiveDate && (
                              <span className="text-[10px] text-zinc-500 shrink-0">({formatDateBR(p.effectiveDate)})</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className={`font-black ${isExtra ? 'text-purple-300' : 'text-emerald-400'}`}>
                              {formatCurrency(p.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentStatus(idx)}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition ${
                                p.status === 'Recebido' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}
                              title="Alternar Recebido / Agendado"
                            >
                              {p.status}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEditPayment(idx, p)}
                              className="text-zinc-500 hover:text-emerald-400 p-1 transition"
                              title="Editar Receita"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePaymentItem(idx)}
                              className="text-zinc-500 hover:text-rose-400 p-1 transition"
                              title="Excluir Receita do Show"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Transações avulsas vinculadas via Auditoria / Extrato (sem duplicar) */}
                    {linkedIncomeTransactions
                      .filter(t => !(show.payments || []).some(p => p.transactionId === t.id))
                      .map(t => {
                        const isExtra = t.showPaymentType === 'Extra' || t.showPaymentType === 'Couvert' || t.showPaymentType === 'Bônus' || (t.description || '').toLowerCase().includes('hora extra');
                        return (
                          <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f0f11] border border-sky-900/30 text-xs">
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                isExtra ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50' : 'bg-sky-950/60 text-sky-300 border border-sky-800/50'
                              }`}>
                                {t.showPaymentType || (isExtra ? 'Extra (Extrato)' : 'Extrato Vinculado')}
                              </span>
                              <span className="text-zinc-200 font-bold truncate max-w-[180px] sm:max-w-[240px]">
                                {t.description}
                              </span>
                              {t.date && (
                                <span className="text-[10px] text-zinc-500 shrink-0">({formatDateBR(t.date)})</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className={`font-black ${isExtra ? 'text-purple-300' : 'text-emerald-400'}`}>
                                {formatCurrency(t.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateTransaction({ ...t, status: t.status === 'paid' ? 'pending' : 'paid' })}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition ${
                                  t.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {t.status === 'paid' ? 'Recebido' : 'Pendente'}
                              </button>
                              <button
                                type="button"
                                onClick={() => unlinkTransactionFromShow(t.id)}
                                className="text-zinc-500 hover:text-amber-400 p-1 transition text-[10px] font-bold"
                                title="Desvincular deste Show"
                              >
                                Desvincular
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTransaction(t.id)}
                                className="text-zinc-500 hover:text-rose-400 p-1 transition"
                                title="Excluir Lançamento"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BLOCO C: CUSTOS DIRETOS VINCULADOS AO EVENTO (ISOLAMENTO DE SUBCATEGORIAS) */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#17171a] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                <Users size={14} className="text-purple-400" />
                <span>Custos Diretos Isolados por Categoria do Show</span>
              </span>
              <span className="text-xs font-black text-rose-400">
                Total: {formatCurrency(totalCosts)}
              </span>
            </div>

            {/* 1. TABELA DE MÚSICOS / APOIO (Subcategoria: Cachê de Terceiros / Equipe) */}
            <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users size={14} className="text-purple-400" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Músicos / Apoio ({normalizedCostBlocks.crew.length})</span>
                    <span className="text-[10px] text-purple-400/80 font-medium">Subcategoria: Cachê de Terceiros / Equipe</span>
                  </div>
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
              {normalizedCostBlocks.crew.length > 0 ? (
                <div className="space-y-1.5">
                  {normalizedCostBlocks.crew.map((member, idx) => {
                    const isEditing = editingCrewIndex === idx;
                    if (isEditing) {
                      return (
                        <div key={member.id} className="p-3 rounded-lg bg-zinc-900 border border-purple-500/50 space-y-2 animate-fadeIn text-xs">
                          <span className="font-bold text-purple-300 block">Editar Músico / Apoio (Cachê de Terceiros / Equipe)</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={editCrewName}
                              onChange={e => setEditCrewName(e.target.value)}
                              placeholder="Nome"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={editCrewRole}
                              onChange={e => setEditCrewRole(e.target.value)}
                              placeholder="Função / Instrumento"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={editCrewCache}
                              onChange={e => setEditCrewCache(e.target.value)}
                              placeholder="Cachê R$"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingCrewIndex(null)}
                              className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditCrewItem(member)}
                              className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                            >
                              Salvar Alteração
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={member.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-bold text-zinc-200 truncate">{member.name}</span>
                            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded font-medium shrink-0">{member.role}</span>
                            <span className="text-[9px] text-purple-300 bg-purple-950/60 border border-purple-800/40 px-1.5 py-0.2 rounded font-bold shrink-0">
                              {member.subcategory || 'Cachê de Terceiros / Equipe'}
                            </span>
                          </div>
                          {member.pixKey && (
                            <span className="text-[10px] text-zinc-500 block truncate">PIX: {member.pixKey}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-black text-zinc-100">{formatCurrency(member.amount)}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleCrewStatus(member)}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                              member.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {member.status === 'paid' ? 'Pago' : 'A Pagar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditCrew(idx, member)}
                            className="text-zinc-500 hover:text-purple-400 p-1 transition"
                            title="Editar Custo da Equipe"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCrewItem(member)}
                            className="text-zinc-500 hover:text-rose-400 p-1 transition"
                            title="Excluir do Show e Extrato"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-zinc-500">
                  Nenhum músico ou apoio vinculado a este show.
                </div>
              )}

              {/* Form Inline Adicionar Equipe */}
              {isAddCrewOpen && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-purple-500/30 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300 block">Adicionar Músico / Apoio</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 font-bold">
                      Subcategoria: Cachê de Terceiros / Equipe
                    </span>
                  </div>
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
                        placeholder="Nome do músico / técnico"
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

            {/* 2. DESLOCAMENTO / LOGÍSTICA (Subcategorias: Combustível, Pedágio, Hospedagem) */}
            <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Fuel size={14} className="text-sky-400" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Deslocamento / Logística ({normalizedCostBlocks.logistics.length})</span>
                    <span className="text-[10px] text-sky-400/80 font-medium">Subcategorias: Combustível • Pedágio • Hospedagem</span>
                  </div>
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
              {normalizedCostBlocks.logistics.length > 0 ? (
                <div className="space-y-1.5">
                  {normalizedCostBlocks.logistics.map((item, idx) => {
                    const isEditing = editingLogisticsIndex === idx;
                    if (isEditing) {
                      return (
                        <div key={item.id} className="p-3 rounded-lg bg-zinc-900 border border-sky-500/50 space-y-2 animate-fadeIn text-xs">
                          <span className="font-bold text-sky-300 block">Editar Deslocamento / Logística</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={editLogDesc}
                              onChange={e => setEditLogDesc(e.target.value)}
                              placeholder="Descrição"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={editLogAmount}
                              onChange={e => setEditLogAmount(e.target.value)}
                              placeholder="Valor R$"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={editLogKm}
                              onChange={e => setEditLogKm(e.target.value)}
                              placeholder="KM (opcional)"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingLogisticsIndex(null)}
                              className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditLogisticsItem(item)}
                              className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                            >
                              Salvar Alteração
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-bold text-zinc-200 truncate">{item.description}</span>
                            <span className="text-[9px] text-sky-300 bg-sky-950/60 border border-sky-800/40 px-1.5 py-0.2 rounded font-bold shrink-0">
                              {item.subcategory || 'Combustível'}
                            </span>
                          </div>
                          {item.km && (
                            <span className="text-[10px] text-zinc-500 block truncate">{item.km} KM ({formatCurrency(item.pricePerKm || 1.2)}/KM)</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-black text-zinc-100">{formatCurrency(item.amount)}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleLogisticsStatus(item)}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                              item.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {item.status === 'paid' ? 'Pago' : 'A Pagar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditLogistics(idx, item)}
                            className="text-zinc-500 hover:text-sky-400 p-1 transition"
                            title="Editar Custo de Logística"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLogisticsItem(item)}
                            className="text-zinc-500 hover:text-rose-400 p-1 transition"
                            title="Excluir do Show e Extrato"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-zinc-500">
                  Nenhum custo de deslocamento/logística (Combustível, Pedágio, Hospedagem) neste show.
                </div>
              )}

              {/* Form Inline Adicionar Logística */}
              {isAddLogisticsOpen && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-sky-500/30 space-y-2 animate-fadeIn">
                  <span className="text-[11px] font-bold text-sky-300 block">Adicionar Deslocamento / Logística</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Subcategoria Obrigatória</label>
                      <select
                        value={logSubcategory}
                        onChange={e => {
                          const sub = e.target.value as 'Combustível' | 'Pedágio' | 'Hospedagem';
                          setLogSubcategory(sub);
                          if (sub === 'Pedágio') setLogType('toll');
                          else if (sub === 'Hospedagem') setLogType('lodging');
                          else setLogType('fuel');
                        }}
                        className="w-full bg-zinc-800 border border-sky-500/40 rounded-lg px-2.5 py-1.5 text-xs text-sky-200 font-bold"
                      >
                        <option value="Combustível">Combustível</option>
                        <option value="Pedágio">Pedágio</option>
                        <option value="Hospedagem">Hospedagem</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Modalidade</label>
                      <select
                        value={logType}
                        onChange={e => {
                          const t = e.target.value as any;
                          setLogType(t);
                          if (t === 'toll') setLogSubcategory('Pedágio');
                          else if (t === 'lodging') setLogSubcategory('Hospedagem');
                          else setLogSubcategory('Combustível');
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <option value="fuel">Abastecimento / Combustível</option>
                        <option value="car_km">Carro Próprio (Cálculo KM)</option>
                        <option value="toll">Pedágio / Estacionamento</option>
                        <option value="lodging">Hotel / Pousada / Hospedagem</option>
                        <option value="uber">Uber / 99 / Van</option>
                      </select>
                    </div>
                    {logType === 'car_km' ? (
                      <>
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">KM Rodado</label>
                          <input
                            type="text"
                            placeholder="Ex: 45"
                            value={logKm}
                            onChange={e => setLogKm(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">R$/KM</label>
                          <input
                            type="text"
                            placeholder="Ex: 1.20"
                            value={logPricePerKm}
                            onChange={e => setLogPricePerKm(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Descrição</label>
                          <input
                            type="text"
                            placeholder={`Ex: ${logSubcategory} show`}
                            value={logDesc}
                            onChange={e => setLogDesc(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Valor (R$)</label>
                          <input
                            type="text"
                            placeholder="Valor R$"
                            value={logAmount}
                            onChange={e => setLogAmount(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                          />
                        </div>
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
                      Salvar Logística
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. EQUIPAMENTOS / SOM (Subcategorias: Aluguel, Manutenção, Insumos do Show) */}
            <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Receipt size={14} className="text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Equipamentos / Som ({normalizedCostBlocks.other.length})</span>
                    <span className="text-[10px] text-amber-400/80 font-medium">Subcategorias: Aluguel • Manutenção • Insumos do Show</span>
                  </div>
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

              {/* Lista de Equipamentos / Som */}
              {normalizedCostBlocks.other.length > 0 ? (
                <div className="space-y-1.5">
                  {normalizedCostBlocks.other.map((item, idx) => {
                    const isEditing = editingOtherIndex === idx;
                    if (isEditing) {
                      return (
                        <div key={item.id} className="p-3 rounded-lg bg-zinc-900 border border-amber-500/50 space-y-2 animate-fadeIn text-xs">
                          <span className="font-bold text-amber-300 block">Editar Custo de Equipamentos / Som</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={editOtherCat}
                              onChange={e => setEditOtherCat(e.target.value)}
                              className="bg-zinc-800 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold"
                            >
                              <option value="Aluguel">Aluguel</option>
                              <option value="Manutenção">Manutenção</option>
                              <option value="Insumos do Show">Insumos do Show</option>
                            </select>
                            <input
                              type="text"
                              value={editOtherDesc}
                              onChange={e => setEditOtherDesc(e.target.value)}
                              placeholder="Descrição"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                            <input
                              type="text"
                              value={editOtherAmount}
                              onChange={e => setEditOtherAmount(e.target.value)}
                              placeholder="Valor R$"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingOtherIndex(null)}
                              className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs font-bold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditOtherItem(item)}
                              className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                            >
                              Salvar Alteração
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-bold text-zinc-200 truncate">{item.description}</span>
                            <span className="text-[9px] text-amber-300 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded font-bold shrink-0">
                              {item.subcategory || item.category || 'Insumos do Show'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-black text-zinc-100">{formatCurrency(item.amount)}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleOtherStatus(item)}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                              item.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {item.status === 'paid' ? 'Pago' : 'A Pagar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditOther(idx, item)}
                            className="text-zinc-500 hover:text-amber-400 p-1 transition"
                            title="Editar Custo de Equipamentos/Som"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveOtherItem(item)}
                            className="text-zinc-500 hover:text-rose-400 p-1 transition"
                            title="Excluir do Show e Extrato"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-zinc-500">
                  Nenhum custo de Equipamentos / Som (Aluguel, Manutenção ou Insumos do Show) cadastrado.
                </div>
              )}

              {/* Form Inline Adicionar Equipamentos / Som */}
              {isAddOtherOpen && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-amber-500/30 space-y-2 animate-fadeIn">
                  <span className="text-[11px] font-bold text-amber-300 block">Adicionar Custo de Equipamentos / Som</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Subcategoria Obrigatória</label>
                      <select
                        value={otherCat}
                        onChange={e => setOtherCat(e.target.value as 'Aluguel' | 'Manutenção' | 'Insumos do Show')}
                        className="w-full bg-zinc-800 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold"
                      >
                        <option value="Aluguel">Aluguel (PA / Som / Luz / Backline)</option>
                        <option value="Manutenção">Manutenção (Luthier / Reparo / Cabos)</option>
                        <option value="Insumos do Show">Insumos do Show (Cordas / Pilhas / Camarim / Apoio)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Descrição do Item</label>
                      <input
                        type="text"
                        placeholder="Ex: Locação PA / Cordas / Pilhas 9V"
                        value={otherDesc}
                        onChange={e => setOtherDesc(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Valor (R$)</label>
                      <input
                        type="text"
                        placeholder="Valor R$"
                        value={otherAmount}
                        onChange={e => setOtherAmount(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
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
                      Salvar Equipamento / Som
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
                <Phone size={14} className="text-emerald-400" />
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
