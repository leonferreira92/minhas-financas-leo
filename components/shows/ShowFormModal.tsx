import React, { useState, useEffect, useMemo } from 'react';
import { Show, ShowStatus, ShowPayment, ShowCrewItem, ShowLogisticsItem, ShowOtherExpenseItem } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, Calendar, Clock, MapPin, User, DollarSign, 
  FileText, AlertTriangle, Check, Sparkles, AlertCircle,
  Phone, Wallet, ArrowDownRight, Users, Car, Hammer,
  Plus, Trash2, Calculator, TrendingUp, ShieldCheck, ChevronDown
} from 'lucide-react';
import { EVENT_TYPES, SHOW_STATUSES } from './types';
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

  // --- BLOCO B: RESUMO FINANCEIRO ---
  const [totalCache, setTotalCache] = useState('');
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
      setName(existingShow.name || existingShow.contractorName || '');
      setContractorName(existingShow.contractorName || existingShow.name || '');
      setContractorPhone(existingShow.contractorPhone || '');
      setEventType(existingShow.eventType || EVENT_TYPES[0]);
      setDate(existingShow.date || getLocalDateString());
      setTime(existingShow.time || '20:00');
      setEndTime(existingShow.endTime || '23:00');
      setDuration(existingShow.duration || '3h');
      setCity(existingShow.city || '');
      setLocation(existingShow.location || '');
      const cacheVal = existingShow.totalCache ?? existingShow.cacheCombined;
      setTotalCache(cacheVal !== undefined && cacheVal !== null ? String(cacheVal) : '');
      setStatus((existingShow.status === 'Agendado' ? 'Aguardando confirmação' : existingShow.status) || 'Confirmado');
      setNotes(existingShow.notes || '');

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
      setStatus(initialStatus || 'Confirmado');
      setNotes('');
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
    const grossCache = parseFloat(totalCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    const depVal = hasImmediateDeposit ? (parseFloat(depositAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0) : 0;

    // 1. Custos de Equipe
    const crewCost = crewMembers.reduce((sum, m) => sum + (Number(m.cacheAmount) || 0), 0);

    // 2. Custos de Logística
    const logisticsCost = logistics.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    // 3. Outras Despesas
    const otherCost = otherExpenses.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    // Total de Custos
    const totalCosts = crewCost + logisticsCost + otherCost;

    // Lucro Líquido Real = Cachê Bruto - Custo Total
    const netProfit = grossCache - totalCosts;

    // Margem de Lucro (%)
    const marginPercent = grossCache > 0 ? (netProfit / grossCache) * 100 : 0;

    // Saldo Restante a Receber
    const remainingToReceive = Math.max(0, grossCache - depVal);

    return {
      grossCache,
      depVal,
      remainingToReceive,
      crewCost,
      logisticsCost,
      otherCost,
      totalCosts,
      netProfit,
      marginPercent
    };
  }, [totalCache, hasImmediateDeposit, depositAmount, crewMembers, logistics, otherExpenses]);

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
    const finalContractor = contractorName.trim() || name.trim();
    if (!finalContractor) return;

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
    const depVal = financialSummaryLive.depVal;

    const paymentsList: ShowPayment[] = existingShow?.payments ? [...existingShow.payments] : [];
    let initialDepositTx: any = null;

    if (!existingShow && depVal > 0) {
      const txId = generateUUID();
      const paymentId = generateUUID();

      paymentsList.push({
        id: paymentId,
        type: 'Sinal',
        amount: depVal,
        status: 'Recebido',
        expectedDate: depositDate,
        effectiveDate: depositDate,
        accountId: depositAccountId,
        transactionId: txId,
        notes: 'Sinal cadastrado junto ao show'
      });

      initialDepositTx = {
        id: txId,
        description: `Sinal: ${name || contractorName || 'Show'}`,
        amount: depVal,
        type: 'income',
        categoryId: 'cat_33',
        accountId: depositAccountId,
        date: depositDate,
        status: 'paid',
        scope: 'BUSINESS',
        showPaymentType: 'Sinal'
      };
    }

    const showPayload: Partial<Show> = {
      name: name.trim() || contractorName.trim() || 'Show',
      contractorName: contractorName.trim() || name.trim() || 'Show',
      contractorPhone: contractorPhone.trim() || undefined,
      eventType,
      date,
      time,
      endTime: endTime.trim() || undefined,
      duration: duration.trim() || undefined,
      city: city.trim() || undefined,
      location: location.trim() || name.trim() || 'A definir',
      totalCache: cacheVal,
      status,
      notes: notes.trim() || undefined,
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
          {/* 1. BLOCO A: CABEÇALHO & STATUS OPERACIONAL                                */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#18181b] border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Calendar size={13} />
                BLOCO A • Cabeçalho & Status Operacional
              </span>
              <span className="text-[10px] text-zinc-500 font-bold">Informações Básicas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nome do Local / Evento */}
              <div>
                <label className="text-zinc-300 font-bold block mb-1">
                  Nome do Local / Evento *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!contractorName) setContractorName(e.target.value);
                  }}
                  placeholder="Ex: Bar do Zé, Casamento Sítio Palmeiras..."
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-purple-500"
                />
                {/* Sugestões de Locais Cadastrados */}
                {venues.length > 0 && !existingShow && (
                  <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1.5">
                    <span className="text-[9px] text-zinc-500 font-bold shrink-0">Bares:</span>
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

            {/* Data, Horário de Início, Término e Duração */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-zinc-300 font-bold block mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Início *</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Término</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Duração</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ex: 3h, 4h"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Endereço e Cidade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-zinc-300 font-bold block mb-1">Endereço / Local</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Rua, Bairro ou Nome do Espaço"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-bold block mb-1">Cidade / UF</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo - SP"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
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
          {/* 2. BLOCO B: RESUMO FINANCEIRO & TERMÔMETRO DE LUCRO EM TEMPO REAL         */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1b152b] via-[#16131f] to-[#121214] border border-purple-500/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <DollarSign size={13} className="text-emerald-400" />
                BLOCO B • Resumo Financeiro & Termômetro de Lucro
              </span>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                Cálculo Instantâneo
              </span>
            </div>

            {/* Cachê Bruto e Sinal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-zinc-200 font-bold block mb-1">
                  Cachê Bruto Combinado (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={totalCache}
                  onChange={(e) => setTotalCache(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-[#121214] border border-zinc-800 rounded-2xl p-3 text-lg font-black text-emerald-400 focus:outline-none focus:border-purple-500"
                />
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
            </div>

            {/* TERMÔMETRO DE LUCRO (4 CARDS VISUAIS) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-3 rounded-2xl bg-[#121214]/80 border border-zinc-800 space-y-0.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase block">Cachê Bruto</span>
                <span className="text-sm font-black text-white tabular-nums block">
                  {formatCurrency(financialSummaryLive.grossCache)}
                </span>
                <span className="text-[9px] text-zinc-500 block">
                  {hasImmediateDeposit ? `Sinal: ${formatCurrency(financialSummaryLive.depVal)}` : 'Sem sinal'}
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
              <div className="p-3 rounded-2xl bg-[#121214] border border-zinc-800 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    placeholder="Descrição (ex: Van 6 pessoas)"
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
                    + Lançar Logística
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
