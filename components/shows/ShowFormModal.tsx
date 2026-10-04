import React, { useState, useEffect, useMemo } from 'react';
import { Show, ShowStatus, ShowPayment, ShowCrewItem, ShowLogisticsItem, ShowOtherExpenseItem } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, Calendar, Clock, MapPin, User, DollarSign, 
  FileText, AlertTriangle, Check, Sparkles, AlertCircle,
  Phone, Wallet, ArrowDownRight, Users, Car, Hammer,
  Plus, Trash2, Calculator, TrendingUp, ShieldCheck, ChevronDown
} from 'lucide-react';
import { EVENT_TYPES, SHOW_STATUSES, getShowDisplayHierarchy } from './types';
import { checkScheduleConflict, ConflictResult } from './conflictHelper';
import { generateUUID } from '../../services/uuidHelper';
import { getLocalDateString } from '../../services/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (showData: Partial<Show>, initialDepositTx?: any) => void;
  existingShow?: Show | null;
  existingShows: Show[];
  prefilledDate?: string;
  initialStatus?: ShowStatus;
  prefilledVenueData?: { location?: string; city?: string; totalCache?: number };
}

export const ShowFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  existingShow,
  existingShows,
  prefilledDate,
  initialStatus,
  prefilledVenueData
}) => {
  const { accounts, crew, venues, isBlurred } = useFinance();
  const defaultAccountId = accounts && accounts.length > 0 ? accounts[0].id : 'acc_bank';

  // --- BLOCO A: CABEÇALHO & STATUS OPERACIONAL ---
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [date, setDate] = useState(() => prefilledDate || getLocalDateString());
  const [time, setTime] = useState('20:00');
  const [endTime, setEndTime] = useState('23:00');
  const [duration, setDuration] = useState('3h');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<ShowStatus>(() => initialStatus || 'Confirmado');

  // --- BLOCO B: RESUMO FINANCEIRO & MODELO DE RECEITA ---
  const [totalCache, setTotalCache] = useState('');
  const [showExtraField, setShowExtraField] = useState(false);
  const [extraAmount, setExtraAmount] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [revenueModel, setRevenueModel] = useState<'fixed' | 'couvert' | 'hybrid'>('fixed');
  const [estimatedPeople, setEstimatedPeople] = useState('80');
  const [couvertPrice, setCouvertPrice] = useState('15');
  const [guaranteedMinCache, setGuaranteedMinCache] = useState('500');
  const [couvertPercentage, setCouvertPercentage] = useState('100');

  // Tempo Dedicado
  const [travelTimeMinutes, setTravelTimeMinutes] = useState('60');
  const [soundcheckTimeMinutes, setSoundcheckTimeMinutes] = useState('60');
  const [showHours, setShowHours] = useState('2');

  // Fundo de Depreciação / Reserva para Equipamento
  const [equipmentReserveAmount, setEquipmentReserveAmount] = useState('20');

  // Calculadora de Logística (Veículo Próprio)
  const [transportDistanceKm, setTransportDistanceKm] = useState('40');
  const [carKmPerLiter, setCarKmPerLiter] = useState('10');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState('6.00');
  const [tollCost, setTollCost] = useState('15');

  const [hasImmediateDeposit, setHasImmediateDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAccountId, setDepositAccountId] = useState(defaultAccountId);
  const [depositDate, setDepositDate] = useState(() => getLocalDateString());

  // --- BLOCO C: CUSTOS DIRETOS DO SHOW ---
  const [crewMembers, setCrewMembers] = useState<ShowCrewItem[]>([]);
  const [logistics, setLogistics] = useState<ShowLogisticsItem[]>([]);
  const [otherExpenses, setOtherExpenses] = useState<ShowOtherExpenseItem[]>([]);

  // Helpers de adição em Bloco C
  const [selectedCrewToAdd, setSelectedCrewToAdd] = useState<string>('');
  const [customCrewName, setCustomCrewName] = useState('');
  const [customCrewRole, setCustomCrewRole] = useState('Bateria');
  const [customCrewCache, setCustomCrewCache] = useState('');

  // Logística helper
  const [logisticsType, setLogisticsType] = useState<ShowLogisticsItem['type']>('fuel');
  const [logisticsDesc, setLogisticsDesc] = useState('');
  const [logisticsAmount, setLogisticsAmount] = useState('');
  const [logisticsKm, setLogisticsKm] = useState('');
  const [logisticsPricePerKm, setLogisticsPricePerKm] = useState('1.20');

  // Outras despesas helper
  const [otherCat, setOtherCat] = useState('Alimentação / Camarim');
  const [otherDesc, setOtherDesc] = useState('');
  const [otherAmount, setOtherAmount] = useState('');

  // --- BLOCO D: CONTATO & OBSERVAÇÕES ---
  const [contractorName, setContractorName] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Conflict warning state
  const [conflictPrompt, setConflictPrompt] = useState<ConflictResult | null>(null);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Live conflict feedback while user edits date & time
  const liveConflict = useMemo(() => {
    if (status !== 'Confirmado') return { hasConflict: false };
    return checkScheduleConflict(existingShows, date, time, endTime, existingShow?.id);
  }, [existingShows, date, time, endTime, existingShow?.id, status]);

  // Carrega dados se for edição ou novo
  useEffect(() => {
    if (existingShow) {
      const hierarchy = getShowDisplayHierarchy(existingShow);
      setName(existingShow.name || hierarchy.eventTitle || '');
      setContractorName(existingShow.contractorName || '');
      setContractorPhone(existingShow.contractorPhone || '');
      setEventType(existingShow.eventType || EVENT_TYPES[0]);
      setDate(existingShow.date || getLocalDateString());
      setTime(existingShow.time || '20:00');
      setEndTime(existingShow.endTime || '23:00');
      setDuration(existingShow.duration || '3h');
      setCity(existingShow.city || '');
      setLocation(existingShow.location && existingShow.location !== 'A definir' ? existingShow.location : '');
      const cacheVal = existingShow.totalCache ?? existingShow.cacheCombined;
      setTotalCache(cacheVal !== undefined && cacheVal !== null ? String(cacheVal) : '');
      
      const existingExtra = existingShow.extraAmount || (existingShow.payments || [])
        .filter(p => p.type === 'Extra' || p.type === 'Bônus')
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      if (existingExtra > 0) {
        setShowExtraField(true);
        setExtraAmount(String(existingExtra));
        setExtraNote(existingShow.extraNote || '');
      } else {
        setShowExtraField(false);
        setExtraAmount('');
        setExtraNote('');
      }

      setStatus((existingShow.status === 'Agendado' ? 'Aguardando confirmação' : existingShow.status) || 'Confirmado');
      setNotes(existingShow.notes || '');

      setRevenueModel(existingShow.revenueModel || 'fixed');
      setEstimatedPeople(existingShow.estimatedPeople ? String(existingShow.estimatedPeople) : '80');
      setCouvertPrice(existingShow.couvertPrice ? String(existingShow.couvertPrice) : '15');
      setGuaranteedMinCache(existingShow.guaranteedMinCache ? String(existingShow.guaranteedMinCache) : '500');
      setCouvertPercentage(existingShow.couvertPercentage ? String(existingShow.couvertPercentage) : '100');

      setTravelTimeMinutes(existingShow.travelTimeMinutes ? String(existingShow.travelTimeMinutes) : '60');
      setSoundcheckTimeMinutes(existingShow.soundcheckTimeMinutes ? String(existingShow.soundcheckTimeMinutes) : '60');
      setShowHours(existingShow.showHours ? String(existingShow.showHours) : '2');

      setEquipmentReserveAmount(existingShow.equipmentReserveAmount !== undefined ? String(existingShow.equipmentReserveAmount) : '20');

      setTransportDistanceKm(existingShow.transportDistanceKm ? String(existingShow.transportDistanceKm) : '40');
      setCarKmPerLiter(existingShow.carKmPerLiter ? String(existingShow.carKmPerLiter) : '10');
      setFuelPricePerLiter(existingShow.fuelPricePerLiter ? String(existingShow.fuelPricePerLiter) : '6.00');
      setTollCost(existingShow.tollCost ? String(existingShow.tollCost) : '15');

      setCrewMembers(existingShow.crewMembers || []);
      setLogistics(existingShow.logistics || []);
      setOtherExpenses(existingShow.otherExpenses || []);
      setHasImmediateDeposit(false);
      setDepositAmount('');
    } else {
      setName(prefilledVenueData?.location || '');
      setContractorName('');
      setContractorPhone('');
      setEventType(EVENT_TYPES[0]);
      setDate(prefilledDate || getLocalDateString());
      setTime('20:00');
      setEndTime('23:00');
      setDuration('3h');
      setCity(prefilledVenueData?.city || '');
      setLocation(prefilledVenueData?.location || '');
      setTotalCache(prefilledVenueData?.totalCache ? String(prefilledVenueData.totalCache) : '');
      setShowExtraField(false);
      setExtraAmount('');
      setExtraNote('');
      setStatus(initialStatus || 'Confirmado');
      setNotes('');
      setRevenueModel('fixed');
      setEstimatedPeople('80');
      setCouvertPrice('15');
      setGuaranteedMinCache('500');
      setCouvertPercentage('100');
      setTravelTimeMinutes('60');
      setSoundcheckTimeMinutes('60');
      setShowHours('2');
      setEquipmentReserveAmount('20');
      setTransportDistanceKm('40');
      setCarKmPerLiter('10');
      setFuelPricePerLiter('6.00');
      setTollCost('15');
      setCrewMembers([]);
      setLogistics([]);
      setOtherExpenses([]);
      setHasImmediateDeposit(false);
      setDepositAmount('');
      setDepositAccountId(defaultAccountId);
      setDepositDate(getLocalDateString());
    }
    setConflictPrompt(null);
  }, [existingShow, prefilledDate, initialStatus, isOpen, defaultAccountId, prefilledVenueData]);

  // =========================================================================
  // RECALCULO INSTANTÂNEO EM TEMPO REAL: CUSTOS, LUCRO LÍQUIDO E MARGEM (%)
  // =========================================================================
  const financialSummaryLive = useMemo(() => {
    let grossCache = parseFloat(totalCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

    const people = Math.max(0, parseFloat(estimatedPeople) || 0);
    const cPrice = Math.max(0, parseFloat(couvertPrice.replace(',', '.')) || 0);
    const minCache = Math.max(0, parseFloat(guaranteedMinCache.replace(',', '.')) || 0);
    const cPct = Math.max(0, parseFloat(couvertPercentage) || 100) / 100;

    if (revenueModel === 'couvert') {
      grossCache = people * cPrice;
    } else if (revenueModel === 'hybrid') {
      grossCache = minCache + (people * cPrice * cPct);
    }

    // REGRA DE RECEITA DO SHOW:
    // O valor total do show deve ser exclusivamente: [Cachê Base Contratado] + [Extras / Hora Extra / Gorjeta].
    const extraVal = showExtraField ? (parseFloat(extraAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0) : 0;
    const totalShowValue = grossCache + extraVal;

    const depVal = hasImmediateDeposit ? (parseFloat(depositAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0) : 0;

    // 1. Custos de Equipe
    const crewCost = crewMembers.reduce((sum, m) => sum + (Number(m.cacheAmount) || 0), 0);

    // 2. Custos de Logística
    const logisticsCost = logistics.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    // 3. Outras Despesas
    const otherCost = otherExpenses.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    // Total de Custos
    const totalCosts = crewCost + logisticsCost + otherCost;

    // Fundo de Depreciação / Reserva para Equipamento
    const reserveVal = Math.max(0, parseFloat(equipmentReserveAmount.replace(',', '.')) || 0);

    // Lucro Líquido Real = Valor Total do Evento - Custo Total
    const netProfit = totalShowValue - totalCosts;
    const netProfitAfterReserve = netProfit - reserveVal;

    // Tempo Dedicado Total (Horas)
    const sHours = Math.max(0.5, parseFloat(showHours) || 2);
    const tMins = Math.max(0, parseFloat(travelTimeMinutes) || 0);
    const scMins = Math.max(0, parseFloat(soundcheckTimeMinutes) || 0);
    const totalDedicatedHours = Math.max(0.5, Math.round((sHours + (tMins / 60) + (scMins / 60)) * 10) / 10);

    // Lucro por Hora Trabalhada
    const profitPerHour = Math.round((netProfit / totalDedicatedHours) * 100) / 100;

    // Margem de Lucro (%) calculada sobre o total final do evento
    const marginPercent = totalShowValue > 0 ? (netProfit / totalShowValue) * 100 : 0;

    // Saldo Restante a Receber
    const remainingToReceive = Math.max(0, totalShowValue - depVal);

    return {
      grossCache,
      extraVal,
      totalShowValue,
      depVal,
      remainingToReceive,
      crewCost,
      logisticsCost,
      otherCost,
      totalCosts,
      reserveVal,
      netProfit,
      netProfitAfterReserve,
      totalDedicatedHours,
      profitPerHour,
      marginPercent
    };
  }, [
    totalCache, revenueModel, estimatedPeople, couvertPrice, guaranteedMinCache, couvertPercentage,
    showExtraField, extraAmount,
    hasImmediateDeposit, depositAmount, crewMembers, logistics, otherExpenses, equipmentReserveAmount,
    showHours, travelTimeMinutes, soundcheckTimeMinutes
  ]);

  if (!isOpen) return null;

  // Adicionar Membro da Equipe
  const handleAddCrewMember = () => {
    if (selectedCrewToAdd) {
      const found = crew.find(c => c.id === selectedCrewToAdd);
      if (found) {
        setCrewMembers(prev => [
          ...prev,
          {
            id: generateUUID(),
            memberId: found.id,
            name: found.name,
            role: found.role,
            cacheAmount: found.defaultCache || 0,
            pixKey: found.pixKey,
            status: 'pending'
          }
        ]);
        setSelectedCrewToAdd('');
        return;
      }
    }

    if (customCrewName.trim()) {
      const cacheNum = parseFloat(customCrewCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      setCrewMembers(prev => [
        ...prev,
        {
          id: generateUUID(),
          name: customCrewName.trim(),
          role: customCrewRole,
          cacheAmount: cacheNum,
          status: 'pending'
        }
      ]);
      setCustomCrewName('');
      setCustomCrewCache('');
    }
  };

  const handleRemoveCrewMember = (id?: string, idx?: number) => {
    setCrewMembers(prev => prev.filter((item, i) => item.id ? item.id !== id : i !== idx));
  };

  const handleUpdateCrewCache = (idx: number, newCache: number) => {
    setCrewMembers(prev => prev.map((item, i) => i === idx ? { ...item, cacheAmount: newCache } : item));
  };

  // Adicionar Logística
  const handleAddLogistics = () => {
    let amt = parseFloat(logisticsAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const kmNum = parseFloat(logisticsKm.replace(',', '.')) || undefined;
    const priceNum = parseFloat(logisticsPricePerKm.replace(',', '.')) || undefined;

    if (logisticsType === 'car_km' && kmNum && priceNum && !amt) {
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

    setLogistics(prev => [
      ...prev,
      {
        id: generateUUID(),
        type: logisticsType,
        description: logisticsDesc.trim() || defaultLabels[logisticsType],
        amount: amt,
        km: kmNum,
        pricePerKm: priceNum,
        status: 'pending'
      }
    ]);

    setLogisticsDesc('');
    setLogisticsAmount('');
    setLogisticsKm('');
  };

  const handleRemoveLogistics = (idx: number) => {
    setLogistics(prev => prev.filter((_, i) => i !== idx));
  };

  // Adicionar Outra Despesa
  const handleAddOtherExpense = () => {
    const amt = parseFloat(otherAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    setOtherExpenses(prev => [
      ...prev,
      {
        id: generateUUID(),
        category: otherCat,
        description: otherDesc.trim() || otherCat,
        amount: amt,
        status: 'pending'
      }
    ]);

    setOtherDesc('');
    setOtherAmount('');
  };

  const handleRemoveOtherExpense = (idx: number) => {
    setOtherExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEventName = name.trim() || location.trim() || contractorName.trim();
    if (!finalEventName) return;

    // Check conflict if status is 'Confirmado'
    if (status === 'Confirmado') {
      const conflict = checkScheduleConflict(
        existingShows,
        date,
        time,
        endTime,
        existingShow?.id
      );

      if (conflict.hasConflict) {
        setConflictPrompt(conflict);
        return;
      }
    }

    executeSave();
  };

  const executeSave = () => {
    const cacheVal = financialSummaryLive.grossCache;
    const extraVal = financialSummaryLive.extraVal;
    const depVal = financialSummaryLive.depVal;

    const paymentsList: ShowPayment[] = existingShow?.payments ? [...existingShow.payments] : [];
    let initialDepositTx: any = null;

    if (!existingShow && depVal > 0) {
      const paymentId = generateUUID();

      paymentsList.push({
        id: paymentId,
        type: 'Sinal',
        amount: depVal,
        status: 'Recebido',
        expectedDate: depositDate,
        effectiveDate: depositDate,
        accountId: depositAccountId,
        notes: 'Sinal cadastrado junto ao show'
      });

      const remainingCache = Math.max(0, cacheVal - depVal);
      if (remainingCache > 0) {
        const isRealized = status === 'Realizado';
        paymentsList.push({
          id: generateUUID(),
          type: 'Cachê Principal',
          amount: remainingCache,
          status: isRealized ? 'Recebido' : 'Agendado',
          expectedDate: date,
          effectiveDate: isRealized ? date : undefined,
          accountId: defaultAccountId,
          notes: 'Restante do Cachê Principal'
        });
      }
    } else if (!existingShow && cacheVal > 0 && extraVal > 0) {
      const isRealized = status === 'Realizado';
      paymentsList.push({
        id: generateUUID(),
        type: 'Cachê Principal',
        amount: cacheVal,
        status: isRealized ? 'Recebido' : 'Agendado',
        expectedDate: date,
        effectiveDate: isRealized ? date : undefined,
        accountId: defaultAccountId,
        notes: 'Cachê Principal do Evento'
      });
    }

    // Gerenciar acréscimo de Hora Extra / Gorjeta nos pagamentos do show
    if (extraVal > 0) {
      const extraIdx = paymentsList.findIndex(p => p.type === 'Extra' || p.type === 'Bônus');
      if (extraIdx >= 0) {
        paymentsList[extraIdx] = {
          ...paymentsList[extraIdx],
          amount: extraVal,
          notes: extraNote.trim() || paymentsList[extraIdx].notes || 'Hora Extra / Gorjeta'
        };
      } else {
        paymentsList.push({
          id: generateUUID(),
          type: 'Extra',
          amount: extraVal,
          status: 'Recebido',
          expectedDate: date,
          accountId: defaultAccountId,
          notes: extraNote.trim() || 'Hora Extra / Gorjeta'
        });
      }
    } else {
      const extraIdx = paymentsList.findIndex(p => (p.type === 'Extra' || p.type === 'Bônus') && !p.transactionId);
      if (extraIdx >= 0) {
        paymentsList.splice(extraIdx, 1);
      }
    }

    const resolvedEventName = name.trim() || location.trim() || contractorName.trim() || 'Show';
    const resolvedContractorName = contractorName.trim() || resolvedEventName;

    const showPayload: Partial<Show> = {
      name: resolvedEventName,
      contractorName: resolvedContractorName,
      contractorPhone: contractorPhone.trim() || undefined,
      eventType,
      date,
      time,
      endTime: endTime.trim() || undefined,
      duration: duration.trim() || undefined,
      city: city.trim() || undefined,
      location: location.trim() || resolvedEventName,
      totalCache: cacheVal,
      extraAmount: extraVal > 0 ? extraVal : undefined,
      extraNote: extraVal > 0 ? (extraNote.trim() || undefined) : undefined,
      status,
      notes: notes.trim() || undefined,
      revenueModel,
      estimatedPeople: parseFloat(estimatedPeople) || undefined,
      couvertPrice: parseFloat(couvertPrice.replace(',', '.')) || undefined,
      guaranteedMinCache: parseFloat(guaranteedMinCache.replace(',', '.')) || undefined,
      couvertPercentage: parseFloat(couvertPercentage) || undefined,
      travelTimeMinutes: parseFloat(travelTimeMinutes) || undefined,
      soundcheckTimeMinutes: parseFloat(soundcheckTimeMinutes) || undefined,
      showHours: parseFloat(showHours) || undefined,
      equipmentReserveAmount: parseFloat(equipmentReserveAmount.replace(',', '.')) || undefined,
      transportDistanceKm: parseFloat(transportDistanceKm) || undefined,
      carKmPerLiter: parseFloat(carKmPerLiter) || undefined,
      fuelPricePerLiter: parseFloat(fuelPricePerLiter.replace(',', '.')) || undefined,
      tollCost: parseFloat(tollCost.replace(',', '.')) || undefined,
      crewMembers,
      logistics,
      otherExpenses,
      payments: paymentsList
    };

    onSave(showPayload, initialDepositTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#141416] border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* HEADER DO MODAL */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {existingShow ? 'Editar Ficha do Show' : 'Novo Show & Gestão de Custos'}
              </h2>
              <p className="text-xs text-zinc-400">
                Preencha os dados do evento, equipe, logística e acompanhe o lucro real instantaneamente.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* ALERTA DE CONFLITO EM TEMPO REAL */}
        {liveConflict.hasConflict && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 flex items-start space-x-2.5 text-xs">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Aviso de Agenda:</span>
              <span className="text-[11px] opacity-90">{liveConflict.message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          
          {/* ========================================================================= */}
          {/* 1. BLOCO A: IDENTIFICAÇÃO HIERÁRQUICA DO EVENTO (FLUXO 1 A 4)             */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#18181b] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Calendar size={13} />
                BLOCO A • Identificação Estruturada do Show (1 → 4)
              </span>
              <span className="text-[10px] text-zinc-400 font-bold">Hierarquia Sincronizada com o Card</span>
            </div>

            {/* PASSOS 1 E 2: 1. NOME DO EVENTO / CASA  &  2. CONTRATANTE / CLIENTE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* 1. Nome do Evento / Casa (Título Principal do Card) */}
              <div>
                <label className="text-zinc-200 font-black block mb-1">
                  1. Nome do Evento / Casa * <span className="text-[10px] font-bold text-purple-400">(Título Principal)</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Show Haras Casa Velha"
                  className="w-full bg-[#121214] border border-purple-500/40 rounded-xl p-2.5 text-white font-black text-sm focus:outline-none focus:border-purple-500"
                />
                {/* Sugestões de Locais Cadastrados */}
                {venues.length > 0 && !existingShow && (
                  <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1.5">
                    <span className="text-[9px] text-zinc-500 font-bold shrink-0">Casas:</span>
                    {venues.slice(0, 3).map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setName(v.name);
                          setLocation(v.address || v.name);
                          setCity(v.city || '');
                          if (v.defaultCache) setTotalCache(String(v.defaultCache));
                        }}
                        className="px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium whitespace-nowrap transition"
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Contratante / Cliente (Subtítulo do Card) */}
              <div>
                <label className="text-zinc-200 font-black block mb-1">
                  2. Contratante / Cliente * <span className="text-[10px] font-bold text-emerald-400">(Subtítulo)</span>
                </label>
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="Ex: LSA Tecnologia"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white font-bold text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* PASSO 3: 3. CIDADE / UF (TAG DO CARD) + ENDEREÇO / TIPO DE EVENTO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 3. Cidade / UF (Tag do Card) */}
              <div>
                <label className="text-zinc-200 font-black block mb-1">
                  3. Cidade / UF * <span className="text-[10px] font-bold text-sky-400">(Tag / Cidade)</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Cruzília - MG"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Endereço / Espaço Complementar */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Endereço / Espaço (Opcional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Rua, Rodovia ou Referência"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Tipo de Evento */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Tipo de Evento</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PASSO 4: 4. DATA, HORÁRIO & VALOR DO CACHÊ (R$) */}
            <div className="p-3.5 rounded-2xl bg-[#121214]/90 border border-zinc-800/90 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                4. Data, Horário & Valor do Cachê Combinado
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Data do Show *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-emerald-400 font-black block mb-1">Valor / Cachê (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCache}
                    onChange={(e) => setTotalCache(e.target.value)}
                    placeholder="Ex: 2500.00"
                    className="w-full bg-[#18181b] border border-emerald-500/40 rounded-xl p-2.5 text-emerald-400 font-black focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Horário Início *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-bold block mb-1">Término / Duração</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="3h"
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-center focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PRÉVIA EM TEMPO REAL DO CARD DE SHOW (SINCRONISMO ESTRITO) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-[#141416] to-[#121214] border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">Prévia do Card:</span>
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-300">
                    <MapPin size={10} />
                    <span>{city.trim() || 'Cruzília - MG'}</span>
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black text-white truncate">
                  {name.trim() || 'Show Haras Casa Velha'}
                </div>
                <div className="text-xs font-bold text-zinc-400 truncate">
                  Contratante: {contractorName.trim() || name.trim() || 'LSA Tecnologia'}
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-sm font-black text-emerald-400 tabular-nums block">
                  {formatCurrency(financialSummaryLive.totalShowValue)}
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Lucro Líquido: {formatCurrency(financialSummaryLive.netProfit)}
                </span>
              </div>
            </div>

            {/* Status Comercial */}
            <div>
              <label className="text-zinc-300 font-bold block mb-1.5">Status Comercial do Show</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'Confirmado', label: 'Confirmado', color: 'bg-emerald-500 text-zinc-950 font-black' },
                  { value: 'Orçamento', label: 'Orçamento / Pendente', color: 'bg-amber-500 text-zinc-950 font-black' },
                  { value: 'Realizado', label: 'Concluído / Realizado', color: 'bg-purple-600 text-white font-black' },
                  { value: 'Cancelado', label: 'Cancelado', color: 'bg-rose-600 text-white font-black' }
                ].map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatus(item.value as ShowStatus)}
                    className={`py-2 px-2.5 rounded-xl text-xs transition border active:scale-95 ${
                      status === item.value
                        ? `${item.color} border-transparent shadow-md`
                        : 'bg-[#121214] text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. BLOCO B: RESUMO FINANCEIRO & MODELO DE RECEITA                         */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1b152b] via-[#16131f] to-[#121214] border border-purple-500/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <DollarSign size={13} className="text-emerald-400" />
                BLOCO B • Modelo de Receita & Resumo Financeiro
              </span>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                Cálculo Instantâneo
              </span>
            </div>

            {/* SELEÇÃO DO MODELO DE RECEITA */}
            <div className="space-y-3">
              <div>
                <label className="text-zinc-300 font-bold block mb-1.5">Formato de Recebimento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'fixed', label: 'Cachê Fixo' },
                    { value: 'couvert', label: 'Couvert Artístico' },
                    { value: 'hybrid', label: 'Híbrido' }
                  ].map(item => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRevenueModel(item.value as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition border ${
                        revenueModel === item.value
                          ? 'bg-purple-600 text-white border-transparent shadow-md'
                          : 'bg-[#121214] text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* INPUTS DINÂMICOS DO MODELO DE RECEITA */}
              {revenueModel === 'fixed' && (
                <div>
                  <label className="text-zinc-200 font-bold block mb-1">
                    Cachê Fixo Combinado (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCache}
                    onChange={(e) => setTotalCache(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#121214] border border-zinc-800 rounded-2xl p-3 text-lg font-black text-emerald-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {revenueModel === 'couvert' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#121214] border border-zinc-800 animate-fade-in">
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">Pessoas Estimadas</label>
                    <input
                      type="number"
                      value={estimatedPeople}
                      onChange={(e) => setEstimatedPeople(e.target.value)}
                      placeholder="Ex: 80"
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">Couvert (R$/pessoa)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={couvertPrice}
                      onChange={(e) => setCouvertPrice(e.target.value)}
                      placeholder="Ex: 15.00"
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-[#1ed760] font-bold"
                    />
                  </div>
                  <div className="col-span-2 text-right text-xs text-zinc-400">
                    Cachê Previsto Estimado: <strong className="text-emerald-400 font-black">{formatCurrency(financialSummaryLive.grossCache)}</strong>
                  </div>
                </div>
              )}

              {revenueModel === 'hybrid' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#121214] border border-zinc-800 animate-fade-in">
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">Cachê Mínimo Garantido (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={guaranteedMinCache}
                      onChange={(e) => setGuaranteedMinCache(e.target.value)}
                      placeholder="Ex: 500"
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-[#1ed760] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">Couvert (R$/pessoa)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={couvertPrice}
                      onChange={(e) => setCouvertPrice(e.target.value)}
                      placeholder="Ex: 15.00"
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">Pessoas Estimadas</label>
                    <input
                      type="number"
                      value={estimatedPeople}
                      onChange={(e) => setEstimatedPeople(e.target.value)}
                      placeholder="Ex: 80"
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 font-bold block mb-1">% de Repasse p/ Artista</label>
                    <input
                      type="number"
                      value={couvertPercentage}
                      onChange={(e) => setCouvertPercentage(e.target.value)}
                      placeholder="Ex: 100"
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div className="col-span-2 text-right text-xs text-zinc-400">
                    Cachê Previsto Estimado: <strong className="text-emerald-400 font-black">{formatCurrency(financialSummaryLive.grossCache)}</strong>
                  </div>
                </div>
              )}
              {/* CAMPO ESPECÍFICO PARA HORA EXTRA / GORJETA */}
              <div className="space-y-2 pt-1">
                {!showExtraField ? (
                  <button
                    type="button"
                    onClick={() => setShowExtraField(true)}
                    className="w-full py-2.5 px-3 rounded-2xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    <Sparkles size={14} className="text-purple-400" />
                    <span>+ Adicionar Hora Extra / Gorjeta</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-800/40 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                        <Sparkles size={14} />
                        Acréscimos ao Cachê (Hora Extra / Gorjeta)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowExtraField(false);
                          setExtraAmount('');
                          setExtraNote('');
                        }}
                        className="text-[10px] text-zinc-400 hover:text-rose-400 font-bold transition"
                      >
                        Remover Extra
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                          Valor Adicional (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={extraAmount}
                          onChange={(e) => setExtraAmount(e.target.value)}
                          placeholder="Ex: 200,00"
                          className="w-full bg-[#121214] border border-purple-500/30 rounded-xl p-2.5 text-base font-black text-purple-300 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                          Motivo / Descrição do Extra
                        </label>
                        <input
                          type="text"
                          value={extraNote}
                          onChange={(e) => setExtraNote(e.target.value)}
                          placeholder="Ex: 1h extra de apresentação / Gorjeta"
                          className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      O valor total do show será exclusivamente: <strong className="text-white">{formatCurrency(financialSummaryLive.grossCache)}</strong> (Cachê Base) + <strong className="text-purple-300">{formatCurrency(financialSummaryLive.extraVal)}</strong> (Extra) = <strong className="text-emerald-400">{formatCurrency(financialSummaryLive.totalShowValue)}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sinal / Adiantamento */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pt-1">
                <label className="text-zinc-300 font-bold flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasImmediateDeposit}
                    onChange={(e) => setHasImmediateDeposit(e.target.checked)}
                    className="rounded accent-purple-600 w-4 h-4"
                  />
                  <span>Recebeu Sinal / Entrada no Fechamento?</span>
                </label>
              </div>

              {hasImmediateDeposit && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
                  <input
                    type="number"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Valor do Sinal (R$)"
                    className="bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white font-bold"
                  />
                  <select
                    value={depositAccountId}
                    onChange={(e) => setDepositAccountId(e.target.value)}
                    className="bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* MÉTRICA DE TEMPO DEDICADO & LUCRO POR HORA */}
            <div className="p-3 rounded-2xl bg-[#121214]/80 border border-zinc-800 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 block">
                Métrica de Tempo Dedicado & Lucratividade por Hora
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-zinc-400 font-bold block mb-0.5 text-[9px]">Deslocamento (min)</label>
                  <input
                    type="number"
                    value={travelTimeMinutes}
                    onChange={(e) => setTravelTimeMinutes(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-0.5 text-[9px]">Montagem / Som (min)</label>
                  <input
                    type="number"
                    value={soundcheckTimeMinutes}
                    onChange={(e) => setSoundcheckTimeMinutes(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-bold block mb-0.5 text-[9px]">Show (horas)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={showHours}
                    onChange={(e) => setShowHours(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-300 pt-1 border-t border-zinc-800/80">
                <span>Tempo Dedicado: <strong className="text-purple-400">{financialSummaryLive.totalDedicatedHours}h</strong></span>
                <span>Lucro Líquido p/ Hora: <strong className="text-[#1ed760]">{formatCurrency(financialSummaryLive.profitPerHour)}/h</strong></span>
              </div>
            </div>

            {/* FUNDO DE DEPRECIAÇÃO / RESERVA PARA EQUIPAMENTO */}
            <div className="p-3 rounded-2xl bg-[#121214]/80 border border-amber-500/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-amber-400 font-black uppercase text-[10px] tracking-wider">
                  Reserva p/ Equipamentos (Fundo de Depreciação / Show)
                </label>
                <span className="text-xs font-black text-amber-400">{formatCurrency(financialSummaryLive.reserveVal)}</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={equipmentReserveAmount}
                onChange={(e) => setEquipmentReserveAmount(e.target.value)}
                placeholder="Ex: 20.00"
                className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs font-bold"
              />
              <p className="text-[9px] text-zinc-500">
                Esse valor será deduzido do Lucro Líquido do show e acumulado no card de "Reserva para Equipamentos".
              </p>
            </div>

            {/* TERMÔMETRO DE LUCRO (4 CARDS VISUAIS ATUALIZADOS) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-[#121214]/80 border border-zinc-800 space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">
                  {financialSummaryLive.extraVal > 0 ? 'Valor Final do Show' : 'Cachê Bruto'}
                </span>
                <span className="text-sm font-black text-white tabular-nums block">
                  {formatCurrency(financialSummaryLive.totalShowValue)}
                </span>
                <span className="text-[9px] text-zinc-500 block truncate">
                  {financialSummaryLive.extraVal > 0 
                    ? `Base ${formatCurrency(financialSummaryLive.grossCache)} + Extra ${formatCurrency(financialSummaryLive.extraVal)}`
                    : hasImmediateDeposit ? `Sinal: ${formatCurrency(financialSummaryLive.depVal)}` : 'Sem sinal'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#121214]/80 border border-zinc-800 space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Custos Totais</span>
                <span className="text-sm font-black text-rose-400 tabular-nums block">
                  -{formatCurrency(financialSummaryLive.totalCosts)}
                </span>
                <span className="text-[9px] text-zinc-500 block">
                  Equipe + Logística + Extras
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/50 space-y-0.5">
                <span className="text-[9px] font-bold text-purple-300 uppercase block">Lucro Líquido Real</span>
                <span className={`text-sm font-black tabular-nums block ${
                  financialSummaryLive.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(financialSummaryLive.netProfit)}
                </span>
                <span className="text-[9px] text-purple-300 font-bold block">
                  Margem: {financialSummaryLive.marginPercent.toFixed(0)}%
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#121214]/80 border border-zinc-800 space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Saldo Restante</span>
                <span className="text-sm font-black text-amber-400 tabular-nums block">
                  {formatCurrency(financialSummaryLive.remainingToReceive)}
                </span>
                <span className="text-[9px] text-zinc-500 block">
                  {financialSummaryLive.remainingToReceive === 0 ? '✓ 100% pago' : 'A receber no show'}
                </span>
              </div>
            </div>

            {/* Barra Visual do Termômetro */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                <span>Eficiência de Margem do Evento:</span>
                <span className={
                  financialSummaryLive.marginPercent >= 60 ? 'text-emerald-400' :
                  financialSummaryLive.marginPercent >= 30 ? 'text-amber-400' : 'text-rose-400'
                }>
                  {financialSummaryLive.marginPercent >= 60 ? '🔥 Excelente Margem (>60%)' :
                   financialSummaryLive.marginPercent >= 30 ? '⚖️ Margem Saudável (30-60%)' : '⚠️ Margem Baixa (<30%)'}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    financialSummaryLive.marginPercent >= 60 ? 'bg-gradient-to-r from-emerald-500 to-[#1ed760]' :
                    financialSummaryLive.marginPercent >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(5, Math.min(100, financialSummaryLive.marginPercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. BLOCO C: CUSTOS DIRETOS VINCULADOS AO EVENTO                           */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#18181b] border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Users size={13} />
                BLOCO C • Custos Diretos Vinculados ao Evento
              </span>
              <span className="text-[10px] text-rose-400 font-bold">
                Total Custos: -{formatCurrency(financialSummaryLive.totalCosts)}
              </span>
            </div>

            {/* 3.1 TABELA DE MÚSICOS & EQUIPE (FREELANCERS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                  <Users size={14} className="text-purple-400" />
                  <span>1. Músicos & Equipe (Freelancers)</span>
                </h4>
                <span className="text-[10px] text-zinc-400 font-bold">
                  Subtotal: {formatCurrency(financialSummaryLive.crewCost)}
                </span>
              </div>

              {/* Seletor rápido de equipe cadastrada ou novo avulso */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-[#121214] border border-zinc-800">
                {crew.length > 0 && (
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">
                      Selecionar Músico Cadastrado no App:
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedCrewToAdd}
                        onChange={(e) => setSelectedCrewToAdd(e.target.value)}
                        className="flex-1 bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs"
                      >
                        <option value="">Selecione um integrante...</option>
                        {crew.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.role}) • Diária: R$ {c.defaultCache}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddCrewMember}
                        className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Ou adicionar membro avulso */}
                <div>
                  <input
                    type="text"
                    value={customCrewName}
                    onChange={(e) => setCustomCrewName(e.target.value)}
                    placeholder="Nome Avulso (ex: Baterista convidado)"
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={customCrewRole}
                    onChange={(e) => setCustomCrewRole(e.target.value)}
                    placeholder="Instrumento (ex: Sanfona)"
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs"
                  />
                </div>

                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    value={customCrewCache}
                    onChange={(e) => setCustomCrewCache(e.target.value)}
                    placeholder="Cachê (R$)"
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCrewMember}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white shrink-0"
                    title="Adicionar"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {/* Lista dos membros adicionados ao show */}
              {crewMembers.length > 0 && (
                <div className="space-y-1.5">
                  {crewMembers.map((m, idx) => (
                    <div key={m.id || idx} className="p-2.5 rounded-xl bg-[#121214] border border-zinc-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                        <span className="font-bold text-white truncate">{m.name}</span>
                        <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded-md">
                          {m.role}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] text-zinc-400 font-medium">Cachê:</span>
                        <input
                          type="number"
                          value={m.cacheAmount}
                          onChange={(e) => handleUpdateCrewCache(idx, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#18181b] border border-zinc-700 rounded-lg p-1 text-right font-black text-rose-400 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCrewMember(m.id, idx)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3.2 LOGÍSTICA & DESLOCAMENTO */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                  <Car size={14} className="text-amber-400" />
                  <span>2. Logística & Deslocamento</span>
                </h4>
                <span className="text-[10px] text-zinc-400 font-bold">
                  Subtotal: {formatCurrency(financialSummaryLive.logisticsCost)}
                </span>
              </div>

              {/* Adicionar transporte */}
              <div className="p-4 rounded-2xl bg-[#121214] border border-zinc-800 space-y-4">
                {/* CALCULADORA INTELIGENTE DE LOGÍSTICA (VEÍCULO PRÓPRIO) */}
                <div className="p-3 rounded-xl bg-[#18181b] border border-sky-500/20 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                    Calculadora Inteligente de Logística (Veículo Próprio)
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-0.5">Distância (KM ida/volta)</label>
                      <input
                        type="number"
                        value={transportDistanceKm}
                        onChange={(e) => setTransportDistanceKm(e.target.value)}
                        className="w-full bg-[#121214] border border-zinc-800 rounded-lg p-1.5 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-0.5">Consumo (KM/L)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={carKmPerLiter}
                        onChange={(e) => setCarKmPerLiter(e.target.value)}
                        className="w-full bg-[#121214] border border-zinc-800 rounded-lg p-1.5 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-0.5">Preço Litro (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fuelPricePerLiter}
                        onChange={(e) => setFuelPricePerLiter(e.target.value)}
                        className="w-full bg-[#121214] border border-zinc-800 rounded-lg p-1.5 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-zinc-400 block mb-0.5">Pedágio (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tollCost}
                        onChange={(e) => setTollCost(e.target.value)}
                        className="w-full bg-[#121214] border border-zinc-800 rounded-lg p-1.5 text-white font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                    <span>Custo Estimado: <strong>{formatCurrency((parseFloat(transportDistanceKm) / (parseFloat(carKmPerLiter) || 10)) * parseFloat(fuelPricePerLiter) + (parseFloat(tollCost) || 0))}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        const dist = parseFloat(transportDistanceKm) || 0;
                        const cons = parseFloat(carKmPerLiter) || 10;
                        const price = parseFloat(fuelPricePerLiter) || 0;
                        const toll = parseFloat(tollCost) || 0;
                        const calcCost = (dist / cons) * price + toll;
                        if (calcCost > 0) {
                          setLogistics(prev => [
                            ...prev,
                            {
                              id: generateUUID(),
                              type: 'car_km',
                              description: `Veículo Próprio (${dist} KM ida/volta)`,
                              amount: Math.round(calcCost * 100) / 100,
                              km: dist,
                              pricePerKm: Math.round((price / cons) * 100) / 100,
                              status: 'pending'
                            }
                          ]);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black text-[9px] uppercase tracking-wider transition"
                    >
                      Aplicar na Logística do Show
                    </button>
                  </div>
                </div>

                {/* Formulário Avulso / Outros Deslocamentos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <select
                    value={logisticsType}
                    onChange={(e) => setLogisticsType(e.target.value as any)}
                    className="bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs"
                  >
                    <option value="fuel">Combustível</option>
                    <option value="car_km">Carro Próprio / KM</option>
                    <option value="uber">Uber / App</option>
                    <option value="van">Van / Banda</option>
                    <option value="toll">Pedágio</option>
                    <option value="parking">Estacionamento</option>
                  </select>

                  <input
                    type="text"
                    value={logisticsDesc}
                    onChange={(e) => setLogisticsDesc(e.target.value)}
                    placeholder="Descrição (ex: Uber ida)"
                    className="bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs"
                  />

                  {logisticsType === 'car_km' ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={logisticsKm}
                        onChange={(e) => {
                          setLogisticsKm(e.target.value);
                          const k = parseFloat(e.target.value) || 0;
                          const p = parseFloat(logisticsPricePerKm) || 1.2;
                          setLogisticsAmount((k * p).toFixed(2));
                        }}
                        placeholder="KM Rodados"
                        className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      value={logisticsAmount}
                      onChange={(e) => setLogisticsAmount(e.target.value)}
                      placeholder="Valor (R$)"
                      className="bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs font-bold"
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleAddLogistics}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs"
                  >
                    + Outra Logística
                  </button>
                </div>
              </div>

              {/* Lista dos itens de logística */}
              {logistics.length > 0 && (
                <div className="space-y-1.5">
                  {logistics.map((l, idx) => (
                    <div key={l.id || idx} className="p-2.5 rounded-xl bg-[#121214] border border-zinc-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="font-bold text-white truncate">{l.description}</span>
                        {l.km && (
                          <span className="text-[10px] text-zinc-400">({l.km} km)</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-black text-rose-400">
                          -{formatCurrency(l.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLogistics(idx)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3.3 OUTRAS DESPESAS (CAMARIM, ALUGUEL DE SOM/LUZ, ALIMENTAÇÃO) */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
                  <Hammer size={14} className="text-sky-400" />
                  <span>3. Outras Despesas do Show</span>
                </h4>
                <span className="text-[10px] text-zinc-400 font-bold">
                  Subtotal: {formatCurrency(financialSummaryLive.otherCost)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-[#121214] border border-zinc-800">
                <select
                  value={otherCat}
                  onChange={(e) => setOtherCat(e.target.value)}
                  className="bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs"
                >
                  <option value="Alimentação / Camarim">Alimentação / Camarim</option>
                  <option value="Aluguel Som & Luz">Aluguel Som & Luz</option>
                  <option value="Hospedagem">Hospedagem</option>
                  <option value="Comissão / Agenciamento">Comissão / Agenciamento</option>
                  <option value="Outros">Outras Despesas</option>
                </select>

                <input
                  type="text"
                  value={otherDesc}
                  onChange={(e) => setOtherDesc(e.target.value)}
                  placeholder="Detalhes da despesa"
                  className="bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs sm:col-span-2"
                />

                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={otherAmount}
                    onChange={(e) => setOtherAmount(e.target.value)}
                    placeholder="R$"
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl p-2 text-white text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddOtherExpense}
                    className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs shrink-0"
                  >
                    + Lançar
                  </button>
                </div>
              </div>

              {/* Lista de outras despesas */}
              {otherExpenses.length > 0 && (
                <div className="space-y-1.5">
                  {otherExpenses.map((o, idx) => (
                    <div key={o.id || idx} className="p-2.5 rounded-xl bg-[#121214] border border-zinc-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                        <span className="font-bold text-white truncate">{o.description}</span>
                        <span className="text-[10px] text-zinc-400">({o.category})</span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-black text-rose-400">
                          -{formatCurrency(o.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOtherExpense(idx)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 4. BLOCO D: CONTATO & OBSERVAÇÕES                                         */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#18181b] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Phone size={13} />
                BLOCO D • Contato & Observações
              </span>
              <span className="text-[10px] text-zinc-500 font-bold">Contratante e Notas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Nome do Contratante</label>
                <input
                  type="text"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="Ex: João Silva (Noivo), Gerente Bar"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={contractorPhone}
                  onChange={(e) => setContractorPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-zinc-300 font-bold block mb-1">
                Notas & Observações Logísticas
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Passar som às 19h pontual, levar extensão de 20m, alimentação inclusa para 4 pessoas..."
                className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* BOTÕES DE FINALIZAÇÃO */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-purple-600/30 flex items-center space-x-2"
            >
              <Check size={16} strokeWidth={3} />
              <span>{existingShow ? 'Salvar Alterações' : 'Cadastrar Show'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
