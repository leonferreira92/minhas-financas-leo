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

  // Adição explícita de Hora Extra / Gorjeta inline
  const [isAddExtraOpen, setIsAddExtraOpen] = useState(false);
  const [extraValInput, setExtraValInput] = useState('');
  const [extraDescInput, setExtraDescInput] = useState('');
  const [extraStatusInput, setExtraStatusInput] = useState<'Recebido' | 'Agendado'>('Recebido');
  const [extraDateInput, setExtraDateInput] = useState(() => getLocalDateString());
  const [extraAccountIdInput, setExtraAccountIdInput] = useState(() => getDefaultAccountForScope('BUSINESS'));

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

  // Estados de edição inline de custos existentes
  const [editingCrewIndex, setEditingCrewIndex] = useState<number | null>(null);
  const [editCrewName, setEditCrewName] = useState('');
  const [editCrewRole, setEditCrewRole] = useState('');
  const [editCrewCache, setEditCrewCache] = useState('');
  const [editCrewPix, setEditCrewPix] = useState('');

  const [editingLogisticsIndex, setEditingLogisticsIndex] = useState<number | null>(null);
  const [editLogType, setEditLogType] = useState<ShowLogisticsItem['type']>('fuel');
  const [editLogDesc, setEditLogDesc] = useState('');
  const [editLogAmount, setEditLogAmount] = useState('');
  const [editLogKm, setEditLogKm] = useState('');

  const [editingOtherIndex, setEditingOtherIndex] = useState<number | null>(null);
  const [editOtherCat, setEditOtherCat] = useState('Outros Custos');
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
  // CÁLCULO INSTANTÂNEO DE MÉTRICAS FINANCEIRAS DO SHOW (REGRA DE SOBRESCRITA & EXTRAS)
  // =========================================================================
  const finSummary = useMemo(() => {
    return getShowFinancialSummary(show, transactions);
  }, [show, transactions]);

  // Cachê Base Contratado
  const baseCache = finSummary.baseContracted ?? (Number(show.totalCache ?? show.cacheCombined) || 0);
  // Extras (Hora Extra, Gorjeta)
  const extraVal = finSummary.extraContracted ?? finSummary.extraAmount ?? (Number(show.extraAmount) || 0);
  // O valor total do show deve ser exclusivamente: [Cachê Base Contratado] + [Extras / Hora Extra / Gorjeta]
  const totalShowValue = finSummary.totalPredicted ?? (baseCache + extraVal);
  const grossCache = totalShowValue;

  // Recebimentos no Caixa (Regra de Sobrescrita: transação vinculada define/sobrescreve, nunca soma em duplicidade)
  const totalReceived = finSummary.totalReceived;
  const remainingToReceive = finSummary.totalPending;
  const percentReceived = finSummary.percentReceived;

  // Normalização e Agrupamento de Custos Diretos com Compatibilidade Multichaves / Aliases
  const normalizedCostBlocks = useMemo(() => {
    if (!show) return { crew: [], logistics: [], other: [], crewCost: 0, logisticsCost: 0, otherCost: 0, totalCosts: 0 };

    const logisticsAliases = ['combustivel', 'combustível', 'gasolina', 'etanol', 'diesel', 'fuel', 'logistica', 'logística', 'deslocamento', 'transporte', 'uber', '99', 'taxi', 'táxi', 'carro', 'car_km', 'km', 'trajeto', 'viagem', 'pedagio', 'pedágio', 'toll', 'van', 'estacionamento', 'parking', 'passagem'];
    const crewAliases = ['musico', 'músico', 'musicos', 'músicos', 'freelancer', 'freelancers', 'equipe', 'cache', 'cachê', 'membros', 'banda', 'tecnico', 'técnico', 'roadie', 'bateria', 'baixo', 'guitarra', 'teclado', 'sanfona', 'percussao', 'percussão', 'vocal', 'backing', 'fotógrafo', 'fotografo', 'video', 'vídeo', 'som'];

    const crewItems: Array<{ id: string; name: string; role: string; amount: number; status: 'paid' | 'pending'; pixKey?: string; origType: 'crew' | 'expenseItem'; origIndex: number }> = [];
    const logisticsItems: Array<{ id: string; type: string; description: string; amount: number; km?: number; pricePerKm?: number; status: 'paid' | 'pending'; origType: 'logistics' | 'expenseItem' | 'legacy'; origIndex: number }> = [];
    const otherItems: Array<{ id: string; category: string; description: string; amount: number; status: 'paid' | 'pending'; origType: 'other' | 'expenseItem' | 'legacy'; origIndex: number }> = [];

    // 1. Integrantes de Equipe registrados
    (show.crewMembers || []).forEach((c, i) => {
      crewItems.push({
        id: c.id || `crew_${i}`,
        name: c.name,
        role: c.role || 'Músico',
        amount: Number(c.cacheAmount) || 0,
        status: c.status === 'paid' ? 'paid' : 'pending',
        pixKey: c.pixKey,
        origType: 'crew',
        origIndex: i
      });
    });

    // 2. Logística e Deslocamento registrados
    (show.logistics || []).forEach((l, i) => {
      logisticsItems.push({
        id: l.id || `log_${i}`,
        type: l.type || 'fuel',
        description: l.description || 'Deslocamento',
        amount: Number(l.amount) || 0,
        km: l.km,
        pricePerKm: l.pricePerKm,
        status: l.status === 'paid' ? 'paid' : 'pending',
        origType: 'logistics',
        origIndex: i
      });
    });

    // 3. Outras Despesas registradas
    (show.otherExpenses || []).forEach((o, i) => {
      otherItems.push({
        id: o.id || `oth_${i}`,
        category: o.category || 'Outras Despesas',
        description: o.description || o.category || 'Despesa Extra',
        amount: Number(o.amount) || 0,
        status: o.status === 'paid' ? 'paid' : 'pending',
        origType: 'other',
        origIndex: i
      });
    });

    // 4. Processar expenseItems por aliases de categoria
    (show.expenseItems || []).forEach((e, i) => {
      const text = ((e.category || '') + ' ' + (e.notes || '')).toLowerCase();
      const isLogistics = logisticsAliases.some(a => text.includes(a));
      const isCrew = crewAliases.some(a => text.includes(a));

      if (isLogistics) {
        logisticsItems.push({
          id: e.id || `exp_log_${i}`,
          type: 'fuel',
          description: e.notes || e.category || 'Combustível / Transporte',
          amount: Number(e.amount) || 0,
          status: 'paid',
          origType: 'expenseItem',
          origIndex: i
        });
      } else if (isCrew) {
        crewItems.push({
          id: e.id || `exp_crew_${i}`,
          name: e.notes || e.category || 'Músico Convidado',
          role: e.category || 'Músico',
          amount: Number(e.amount) || 0,
          status: 'paid',
          origType: 'expenseItem',
          origIndex: i
        });
      } else {
        otherItems.push({
          id: e.id || `exp_oth_${i}`,
          category: e.category || 'Outras Despesas',
          description: e.notes || e.category || 'Despesa Extra',
          amount: Number(e.amount) || 0,
          status: 'paid',
          origType: 'expenseItem',
          origIndex: i
        });
      }
    });

    // 4.5. Processar transações avulsas de despesa do livro-razão vinculadas ao show (sem showExpenseId)
    if (linkedExpenseTransactions && linkedExpenseTransactions.length > 0) {
      linkedExpenseTransactions.forEach(t => {
        if (!t) return;
        const isAssociated = crewItems.some(c => c.id === t.showExpenseId) ||
                             logisticsItems.some(l => l.id === t.showExpenseId) ||
                             otherItems.some(o => o.id === t.showExpenseId);
        
        if (!isAssociated && !t.showExpenseId) {
          otherItems.push({
            id: t.id,
            category: 'Outros Custos',
            description: t.description || 'Despesa Avulsa',
            amount: Number(t.amount) || 0,
            status: t.status === 'paid' ? 'paid' : 'pending',
            origType: 'other',
            origIndex: -2
          });
        }
      });
    }

    // 5. Objeto de despesas legadas (fuel, toll, food, commission, others)
    if (show.expenses) {
      if (show.expenses.fuel > 0 && logisticsItems.length === 0) {
        logisticsItems.push({
          id: 'legacy_fuel',
          type: 'fuel',
          description: 'Combustível / Gasolina',
          amount: Number(show.expenses.fuel),
          status: 'paid',
          origType: 'legacy',
          origIndex: -1
        });
      }
      if (show.expenses.toll > 0 && !logisticsItems.some(l => l.description.toLowerCase().includes('pedágio') || l.description.toLowerCase().includes('pedagio'))) {
        logisticsItems.push({
          id: 'legacy_toll',
          type: 'toll',
          description: 'Pedágio',
          amount: Number(show.expenses.toll),
          status: 'paid',
          origType: 'legacy',
          origIndex: -1
        });
      }
      if (show.expenses.food > 0 && !otherItems.some(o => o.description.toLowerCase().includes('alimentação') || o.description.toLowerCase().includes('lanche'))) {
        otherItems.push({
          id: 'legacy_food',
          category: 'Alimentação / Camarim',
          description: 'Alimentação / Lanche',
          amount: Number(show.expenses.food),
          status: 'paid',
          origType: 'legacy',
          origIndex: -1
        });
      }
      if (show.expenses.others > 0) {
        otherItems.push({
          id: 'legacy_others',
          category: 'Outros Custos',
          description: 'Outras Despesas do Show',
          amount: Number(show.expenses.others),
          status: 'paid',
          origType: 'legacy',
          origIndex: -1
        });
      }
    }

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
  }, [show]);

  const { crewCost, logisticsCost, otherCost, totalCosts } = normalizedCostBlocks;

  // --- AÇÕES DE EDIÇÃO E EXCLUSÃO DE EQUIPE ---
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
          return { ...e, category: editCrewRole, notes: editCrewName, amount: amt };
        }
        return e;
      });
      updateShow({ ...show, expenseItems: updated });
    }
    setEditingCrewIndex(null);
    showToast('Membro da equipe atualizado e sincronizado com o Extrato!');
  };

  const handleRemoveCrewItem = (item: any) => {
    if (item.origType === 'crew') {
      const updated = (show.crewMembers || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, crewMembers: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, expenseItems: updated });
    }
    showToast('Membro removido e lançamento excluído do Extrato!');
  };

  // --- AÇÕES DE EDIÇÃO E EXCLUSÃO DE LOGÍSTICA ---
  const handleStartEditLogistics = (idx: number, item: any) => {
    setEditingLogisticsIndex(idx);
    setEditLogType(item.type || 'fuel');
    setEditLogDesc(item.description || '');
    setEditLogAmount(String(item.amount || ''));
    setEditLogKm(item.km ? String(item.km) : '');
  };

  const handleSaveEditLogisticsItem = (item: any) => {
    let amt = parseFloat(editLogAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const kmNum = parseFloat(editLogKm.replace(',', '.')) || undefined;
    if (editLogType === 'car_km' && kmNum && !amt) {
      amt = kmNum * 1.2;
    }

    if (item.origType === 'logistics') {
      const updated = (show.logistics || []).map((l, i) => {
        if (i === item.origIndex) {
          return {
            ...l,
            type: editLogType,
            description: editLogDesc.trim() || l.description,
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
          return { ...e, category: 'Combustível', notes: editLogDesc.trim(), amount: amt };
        }
        return e;
      });
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'legacy') {
      const updatedExpenses = { ...(show.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 }) };
      if (item.id === 'legacy_fuel') updatedExpenses.fuel = amt;
      if (item.id === 'legacy_toll') updatedExpenses.toll = amt;
      updateShow({ ...show, expenses: updatedExpenses });
    }
    setEditingLogisticsIndex(null);
    showToast('Transporte atualizado e sincronizado com o Extrato!');
  };

  const handleRemoveLogisticsItem = (item: any) => {
    if (item.origType === 'logistics') {
      const updated = (show.logistics || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, logistics: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'legacy') {
      const updatedExpenses = { ...(show.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 }) };
      if (item.id === 'legacy_fuel') updatedExpenses.fuel = 0;
      if (item.id === 'legacy_toll') updatedExpenses.toll = 0;
      updateShow({ ...show, expenses: updatedExpenses });
    }
    showToast('Transporte removido e lançamento excluído do Extrato!');
  };

  // --- AÇÕES DE EDIÇÃO E EXCLUSÃO DE OUTRAS DESPESAS ---
  const handleStartEditOther = (idx: number, item: any) => {
    setEditingOtherIndex(idx);
    setEditOtherCat(item.category || 'Outros Custos');
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
            description: editOtherDesc.trim() || o.description,
            amount: amt
          };
        }
        return o;
      });
      updateShow({ ...show, otherExpenses: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).map((e, i) => {
        if (i === item.origIndex) {
          return { ...e, category: editOtherCat, notes: editOtherDesc.trim(), amount: amt };
        }
        return e;
      });
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'legacy') {
      const updatedExpenses = { ...(show.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 }) };
      if (item.id === 'legacy_food') updatedExpenses.food = amt;
      if (item.id === 'legacy_others') updatedExpenses.others = amt;
      updateShow({ ...show, expenses: updatedExpenses });
    }
    setEditingOtherIndex(null);
    showToast('Despesa extra atualizada e sincronizada com o Extrato!');
  };

  const handleRemoveOtherItem = (item: any) => {
    if (item.origType === 'other') {
      const updated = (show.otherExpenses || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, otherExpenses: updated });
    } else if (item.origType === 'expenseItem') {
      const updated = (show.expenseItems || []).filter((_, i) => i !== item.origIndex);
      updateShow({ ...show, expenseItems: updated });
    } else if (item.origType === 'legacy') {
      const updatedExpenses = { ...(show.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 }) };
      if (item.id === 'legacy_food') updatedExpenses.food = 0;
      if (item.id === 'legacy_others') updatedExpenses.others = 0;
      updateShow({ ...show, expenses: updatedExpenses });
    }
    showToast('Despesa extra removida e lançamento excluído do Extrato!');
  };
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

    const extraTotal = updatedPayments.filter(p => p.type === 'Extra' || p.type === 'Bônus').reduce((s, p) => s + (Number(p.amount) || 0), 0);

    updateShow({ 
      ...show, 
      payments: updatedPayments,
      extraAmount: extraTotal > 0 ? extraTotal : (show.extraAmount || undefined)
    });
    setPayAmount('');
    setIsAddPaymentOpen(false);
    showToast(`${payType} de ${formatCurrency(amt)} registrado!`);
  };

  // Salvar Hora Extra / Gorjeta Inline
  const handleSaveExtraPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(extraValInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    const txId = generateUUID();
    const paymentId = generateUUID();
    const isPaid = extraStatusInput === 'Recebido';

    const newTx: any = {
      id: txId,
      type: 'income',
      amount: amt,
      description: `Hora Extra / Gorjeta: ${show.contractorName || show.name}${extraDescInput ? ` (${extraDescInput})` : ''}`,
      categoryId: 'cat_33',
      accountId: extraAccountIdInput,
      date: extraDateInput || getLocalDateString(),
      status: isPaid ? 'paid' : 'pending',
      scope: 'BUSINESS',
      showId: show.id,
      showPaymentType: 'Extra',
      showPaymentId: paymentId
    };

    addTransaction(newTx);

    const updatedPayments: ShowPayment[] = [...(show.payments || []), {
      id: paymentId,
      type: 'Extra',
      amount: amt,
      expectedDate: extraDateInput || getLocalDateString(),
      effectiveDate: isPaid ? (extraDateInput || getLocalDateString()) : undefined,
      accountId: extraAccountIdInput,
      status: isPaid ? 'Recebido' : 'Agendado',
      transactionId: txId,
      notes: extraDescInput.trim() || 'Hora Extra / Gorjeta'
    }];

    const extraTotal = updatedPayments.filter(p => p.type === 'Extra' || p.type === 'Bônus').reduce((s, p) => s + (Number(p.amount) || 0), 0);

    updateShow({
      ...show,
      extraAmount: extraTotal,
      extraNote: extraDescInput.trim() || show.extraNote || 'Hora Extra / Gorjeta',
      payments: updatedPayments
    });

    setExtraValInput('');
    setExtraDescInput('');
    setIsAddExtraOpen(false);
    showToast(`Hora Extra / Gorjeta de ${formatCurrency(amt)} registrada com sucesso!`);
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
              {/* 1. Cachê Bruto / Valor Final */}
              <div className="p-3.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    {extraVal > 0 ? 'Valor Final do Show' : 'Cachê Bruto'}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { setNewContractedCache(String(baseCache)); setIsEditCacheModalOpen(true); }}
                    className="text-zinc-500 hover:text-emerald-400 transition"
                    title="Editar Cachê Base"
                  >
                    <Edit3 size={11} />
                  </button>
                </div>
                <div className="text-base sm:text-lg font-black text-white tabular-nums">
                  {formatCurrency(totalShowValue)}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {extraVal > 0 
                    ? `Base ${formatCurrency(baseCache)} + Extra ${formatCurrency(extraVal)}` 
                    : 'Valor contratado'}
                </div>
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

              {/* INDICADORES INTELIGENTES DE PERFORMANCE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
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
                  <span>{isAddExtraOpen ? 'Fechar Hora Extra' : '+ Adicionar Hora Extra / Gorjeta'}</span>
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

              {/* Form de Adicionar Hora Extra / Gorjeta */}
              {isAddExtraOpen && (
                <form onSubmit={handleSaveExtraPayment} className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-3 mt-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
                      <Sparkles size={14} className="text-purple-400" />
                      <span>Registrar Hora Extra / Gorjeta no Evento</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Soma ao total do show sem duplicar
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
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
                        placeholder="Ex: 1h extra / Gorjeta"
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
                      Total pós-extra: <strong className="text-white">{formatCurrency(baseCache)}</strong> + <strong className="text-purple-300">{formatCurrency(parseFloat(extraValInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0)}</strong> = <strong className="text-emerald-400">{formatCurrency(baseCache + (parseFloat(extraValInput.replace(/[^\d.,]/g, '').replace(',', '.')) || 0))}</strong>
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
                        Salvar Extra
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

              {/* LISTAGEM TRANSPARENTE DE ENTRADAS REGISTRADAS NO SHOW */}
              {((show.payments && show.payments.length > 0) || linkedIncomeTransactions.length > 0) && (
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Entradas & Recebimentos Vinculados ({((show.payments || []).length) + (linkedIncomeTransactions.filter(t => !(show.payments || []).some(p => p.transactionId === t.id)).length)})
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {remainingToReceive === 0 ? '✓ Todos quitados' : `Restam ${formatCurrency(remainingToReceive)}`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Pagamentos registrados no show */}
                    {(show.payments || []).map((p, idx) => {
                      const isExtra = p.type === 'Extra' || p.type === 'Bônus';
                      return (
                        <div key={p.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f0f11] border border-zinc-800/80 text-xs">
                          <div className="flex items-center space-x-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isExtra ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                            }`}>
                              {p.type}
                            </span>
                            <span className="text-zinc-200 font-bold truncate max-w-[200px]">
                              {p.notes || (isExtra ? 'Hora Extra / Gorjeta' : 'Cachê')}
                            </span>
                            {p.effectiveDate && (
                              <span className="text-[10px] text-zinc-500">({formatDateBR(p.effectiveDate)})</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2.5">
                            <span className={`font-black ${isExtra ? 'text-purple-300' : 'text-emerald-400'}`}>
                              {formatCurrency(p.amount)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              p.status === 'Recebido' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Transações avulsas vinculadas via Extrato (sem duplicar) */}
                    {linkedIncomeTransactions
                      .filter(t => !(show.payments || []).some(p => p.transactionId === t.id))
                      .map(t => {
                        const isExtra = t.showPaymentType === 'Extra' || (t.description || '').toLowerCase().includes('hora extra');
                        return (
                          <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f0f11] border border-sky-900/30 text-xs">
                            <div className="flex items-center space-x-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isExtra ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50' : 'bg-sky-950/60 text-sky-300 border border-sky-800/50'
                              }`}>
                                {isExtra ? 'Extra (Extrato)' : 'Pix / Extrato'}
                              </span>
                              <span className="text-zinc-200 font-bold truncate max-w-[200px]">
                                {t.description}
                              </span>
                              {t.date && (
                                <span className="text-[10px] text-zinc-500">({formatDateBR(t.date)})</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2.5">
                              <span className={`font-black ${isExtra ? 'text-purple-300' : 'text-emerald-400'}`}>
                                {formatCurrency(t.amount)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                t.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {t.status === 'paid' ? 'Recebido' : 'Pendente'}
                              </span>
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
                  <span className="text-xs font-bold text-zinc-200">Músicos & Freelancers ({normalizedCostBlocks.crew.length})</span>
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
                          <span className="font-bold text-purple-300 block">Editar Músico / Equipe</span>
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
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-zinc-200 truncate">{member.name}</span>
                            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.2 rounded font-medium shrink-0">{member.role}</span>
                          </div>
                          {member.pixKey && (
                            <span className="text-[10px] text-zinc-500 block truncate">PIX: {member.pixKey}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-black text-zinc-100">{formatCurrency(member.amount)}</span>
                          {member.origType === 'crew' && (
                            <button
                              type="button"
                              onClick={() => handleToggleCrewStatus(member.origIndex)}
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                                member.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {member.status === 'paid' ? 'Pago' : 'A Pagar'}
                            </button>
                          )}
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
                  <Fuel size={14} className="text-sky-400" />
                  <span className="text-xs font-bold text-zinc-200">Logística & Deslocamento ({normalizedCostBlocks.logistics.length})</span>
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
                          <span className="font-bold text-sky-300 block">Editar Deslocamento / Transporte</span>
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
                          <span className="font-bold text-zinc-200 block truncate">{item.description}</span>
                          {item.km && (
                            <span className="text-[10px] text-zinc-500 block truncate">{item.km} KM ({formatCurrency(item.pricePerKm || 1.2)}/KM)</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-black text-zinc-100">{formatCurrency(item.amount)}</span>
                          {item.origType === 'logistics' && (
                            <button
                              type="button"
                              onClick={() => handleToggleLogisticsStatus(item.origIndex)}
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition ${
                                item.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {item.status === 'paid' ? 'Pago' : 'A Pagar'}
                            </button>
                          )}
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
                  <Receipt size={14} className="text-amber-400" />
                  <span className="text-xs font-bold text-zinc-200">Outras Despesas do Show ({normalizedCostBlocks.other.length})</span>
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
              {normalizedCostBlocks.other.length > 0 ? (
                <div className="space-y-1.5">
                  {normalizedCostBlocks.other.map((item, idx) => {
                    const isEditing = editingOtherIndex === idx;
                    if (isEditing) {
                      return (
                        <div key={item.id} className="p-3 rounded-lg bg-zinc-900 border border-amber-500/50 space-y-2 animate-fadeIn text-xs">
                          <span className="font-bold text-amber-300 block">Editar Despesa Extra</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={editOtherCat}
                              onChange={e => setEditOtherCat(e.target.value)}
                              placeholder="Categoria"
                              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
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
                          <span className="font-bold text-zinc-200 block truncate">{item.description}</span>
                          <span className="text-[10px] text-zinc-500 block truncate">{item.category}</span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-black text-zinc-100">{formatCurrency(item.amount)}</span>
                          <button
                            type="button"
                            onClick={() => handleStartEditOther(idx, item)}
                            className="text-zinc-500 hover:text-amber-400 p-1 transition"
                            title="Editar Despesa Extra"
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
