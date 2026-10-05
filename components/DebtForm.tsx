
import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Debt, DebtType, DebtCostCenterMode, CareerDebtSubcategory } from '../types';
import { 
  X, Check, CreditCard, Building, User, 
  Calendar, DollarSign, PieChart, CheckCircle2, 
  CarFront, ChevronRight, ArrowLeft, Info,
  Calculator, Landmark, ShieldCheck, RefreshCw, AlertTriangle,
  Music, Layers, SlidersHorizontal, Tag
} from 'lucide-react';
import { CalendarModal } from './CalendarModal';
import { parseCurrencyInput, CAREER_DEBT_SUBCATEGORIES } from '../constants';
import { getLocalDateString } from '../services/dateUtils';
import {
  resolveCareerSubcategoryMeta,
  resolveDefaultPersonalDebtCategoryId,
  DEFAULT_PERSONAL_DEBT_CATEGORY_ID,
  isVinyDebtOrTransaction,
  VINY_MUSIC_MAX_CEILING,
  VINY_MONTHLY_MUSIC_FIXED
} from '../services/financeAggregator';

interface Props {
  onClose: () => void;
  initialDebt?: Debt;
}

export const DebtForm: React.FC<Props> = ({ onClose, initialDebt }) => {
  const { addDebt, updateDebtCostCenter, categories, accounts, transactions, activeScope } = useFinance();
  const isEditing = Boolean(initialDebt);
  const [step, setStep] = useState(0);

  // Form State
  const [name, setName] = useState(initialDebt?.name || '');
  const [type, setType] = useState<DebtType>(initialDebt?.type || 'card_installment');
  const [totalAmount, setTotalAmount] = useState(
    initialDebt?.totalAmount ? String(initialDebt.totalAmount) : ''
  );

  // Cost Center & Subcategory State
  const [costCenterMode, setCostCenterMode] = useState<DebtCostCenterMode>(() => {
    if (initialDebt?.costCenterMode) return initialDebt.costCenterMode;
    if (initialDebt?.scope === 'BUSINESS') return 'TOTAL_BUSINESS';
    if (activeScope === 'BUSINESS' && !initialDebt) return 'TOTAL_BUSINESS';
    return 'TOTAL_PERSONAL';
  });

  const [musicSubcategory, setMusicSubcategory] = useState<CareerDebtSubcategory>(
    initialDebt?.musicSubcategory || 'Equipamentos / Instrumentos'
  );
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(() => {
    if (!initialDebt?.musicSubcategory) return false;
    return !CAREER_DEBT_SUBCATEGORIES.some(s => s.label === initialDebt.musicSubcategory);
  });

  const [businessStartInstallment, setBusinessStartInstallment] = useState<string>(
    initialDebt?.businessStartInstallment ? String(initialDebt.businessStartInstallment) : '1'
  );
  const [businessEndInstallment, setBusinessEndInstallment] = useState<string>(
    initialDebt?.businessEndInstallment
      ? String(initialDebt.businessEndInstallment)
      : initialDebt?.installmentCount
      ? String(Math.max(1, Math.floor(initialDebt.installmentCount / 2)))
      : '6'
  );
  const [includeDownPaymentInBusiness, setIncludeDownPaymentInBusiness] = useState<boolean>(
    initialDebt?.includeDownPaymentInBusiness ?? false
  );

  const [personalCategoryId, setPersonalCategoryId] = useState<string>(() =>
    resolveDefaultPersonalDebtCategoryId(
      categories,
      initialDebt?.personalCategoryId || initialDebt?.categoryId
    )
  );

  const [accountId, setAccountId] = useState(initialDebt?.accountId || '');
  
  const [downPayment, setDownPayment] = useState('');
  const [installments, setInstallments] = useState(
    initialDebt?.installmentCount ? String(initialDebt.installmentCount) : '12'
  );
  const [firstDate, setFirstDate] = useState(() => initialDebt?.startDate || getLocalDateString());
  
  const [installmentValue, setInstallmentValue] = useState(
    initialDebt?.installmentAmount ? String(initialDebt.installmentAmount) : ''
  );
  const [isManualInstallment, setIsManualInstallment] = useState(false);

  const [autoPayPast, setAutoPayPast] = useState(true);
  const [isRetroactive, setIsRetroactive] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (initialDebt?.musicSubcategory && isCustomSubcategory) {
      setCustomSubcategory(initialDebt.musicSubcategory);
    }
  }, [initialDebt, isCustomSubcategory]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const preferredAcc =
        costCenterMode !== 'TOTAL_PERSONAL'
          ? accounts.find(a => a.scope === 'BUSINESS' || a.vinculo === 'MUSICO') || accounts[0]
          : accounts.find(a => a.scope === 'PERSONAL' || a.vinculo === 'PESSOAL') || accounts[0];
      setAccountId(preferredAcc.id);
    }
  }, [accounts, accountId, costCenterMode]);

  useEffect(() => {
    const today = getLocalDateString();
    setIsRetroactive(firstDate < today);
  }, [firstDate]);

  useEffect(() => {
    if (!isManualInstallment) {
      const total = parseCurrencyInput(totalAmount);
      const entry = parseCurrencyInput(downPayment);
      const qty = Math.max(1, parseInt(installments) || 1);
      const calc = Math.max(0, (total - entry) / qty);
      setInstallmentValue(calc.toFixed(2));
    }
  }, [totalAmount, downPayment, installments, isManualInstallment]);

  const handleInstallmentChange = (val: string) => {
    setInstallmentValue(val);
    setIsManualInstallment(true);
    const instVal = parseCurrencyInput(val);
    const entry = parseCurrencyInput(downPayment);
    const qty = Math.max(1, parseInt(installments) || 1);
    const newTotal = entry + instVal * qty;
    setTotalAmount(newTotal.toFixed(2));
  };

  const totalParsed = parseCurrencyInput(totalAmount);
  const downParsed = parseCurrencyInput(downPayment);
  const qtyParsed = Math.max(1, parseInt(installments) || 1);
  const isEntryInvalid = !isEditing && downParsed > 0 && downParsed >= totalParsed;
  const isVinyContract = useMemo(
    () => isVinyDebtOrTransaction({ id: initialDebt?.id, name }),
    [initialDebt?.id, name]
  );

  // Total Amortizado Real das parcelas já pagas (para recálculo atômico do Saldo Devedor)
  const totalAmortizedReal = useMemo(() => {
    if (!initialDebt?.id) return 0;
    return Math.round(
      transactions
        .filter(t => t.debtId === initialDebt.id && t.status === 'paid')
        .reduce((s, t) => s + (Math.abs(Number(t.amount) || 0) - Math.max(0, Number(t.interest) || 0)), 0) * 100
    ) / 100;
  }, [initialDebt?.id, transactions]);

  const atomicRemainingBalance = useMemo(() => {
    return Math.max(0, Math.round((totalParsed - totalAmortizedReal) * 100) / 100);
  }, [totalParsed, totalAmortizedReal]);

  const effectiveMusicSubcategory = isCustomSubcategory
    ? customSubcategory.trim() || 'Equipamentos / Instrumentos'
    : musicSubcategory;

  const resolvedMusicMeta = useMemo(
    () => resolveCareerSubcategoryMeta(effectiveMusicSubcategory),
    [effectiveMusicSubcategory]
  );

  // Cálculo do resumo de divisão entre Música e Pessoal (respeitando o teto máximo de R$ 6.500,00 no Viny)
  const allocationPreview = useMemo(() => {
    const startIdx = Math.max(1, Math.min(qtyParsed, parseInt(businessStartInstallment) || 1));
    const endIdx = Math.max(startIdx, Math.min(qtyParsed, parseInt(businessEndInstallment) || qtyParsed));
    const instVal = parseCurrencyInput(installmentValue) || (totalParsed - downParsed) / qtyParsed;

    if (isVinyContract) {
      const musicCount = Math.min(10, Math.max(0, endIdx - startIdx + 1));
      const musicTotal = Math.min(VINY_MUSIC_MAX_CEILING, musicCount * VINY_MONTHLY_MUSIC_FIXED);
      const personalTotal = Math.max(0, Math.round((totalParsed - musicTotal) * 100) / 100);
      return {
        musicInstallmentsCount: musicCount,
        personalInstallmentsCount: Math.max(1, qtyParsed - musicCount),
        musicTotalAmount: musicTotal,
        personalTotalAmount: personalTotal,
        rangeLabel: `Parcelas ${startIdx} até ${endIdx} (Fev a Nov): R$ 650,00/mês na Música (Teto máx R$ 6.500,00) • Excedente + demais parcelas no Pessoal`
      };
    }

    if (costCenterMode === 'TOTAL_BUSINESS') {
      return {
        musicInstallmentsCount: qtyParsed,
        personalInstallmentsCount: 0,
        musicTotalAmount: totalParsed,
        personalTotalAmount: 0,
        rangeLabel: `Todas as ${qtyParsed} parcelas (100% Música / Carreira)`
      };
    }

    if (costCenterMode === 'TOTAL_PERSONAL') {
      return {
        musicInstallmentsCount: 0,
        personalInstallmentsCount: qtyParsed,
        musicTotalAmount: 0,
        personalTotalAmount: totalParsed,
        rangeLabel: `Todas as ${qtyParsed} parcelas (100% Pessoal)`
      };
    }

    const musicCount = endIdx - startIdx + 1;
    const personalCount = Math.max(0, qtyParsed - musicCount);
    const musicEntry = includeDownPaymentInBusiness ? downParsed : 0;
    const personalEntry = includeDownPaymentInBusiness ? 0 : downParsed;

    const musicTotal = musicCount * instVal + musicEntry;
    const personalTotal = personalCount * instVal + personalEntry;

    return {
      musicInstallmentsCount: musicCount,
      personalInstallmentsCount: personalCount,
      musicTotalAmount: Math.max(0, musicTotal),
      personalTotalAmount: Math.max(0, personalTotal),
      rangeLabel: `Parcelas ${startIdx} até ${endIdx} na Música (${musicCount}x) • ${personalCount}x no Pessoal`
    };
  }, [
    isVinyContract,
    costCenterMode,
    qtyParsed,
    businessStartInstallment,
    businessEndInstallment,
    installmentValue,
    totalParsed,
    downParsed,
    includeDownPaymentInBusiness
  ]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseCurrencyInput(totalAmount);
    if (!name.trim() || isNaN(total) || total <= 0 || !accountId || isEntryInvalid) return;

    const startInst = Math.max(1, Math.min(qtyParsed, parseInt(businessStartInstallment) || 1));
    const endInst = Math.max(startInst, Math.min(qtyParsed, parseInt(businessEndInstallment) || qtyParsed));
    const safePersonalCategoryId = resolveDefaultPersonalDebtCategoryId(categories, personalCategoryId);

    const effectiveCategoryId =
      costCenterMode === 'TOTAL_BUSINESS'
        ? resolvedMusicMeta.categoryId
        : safePersonalCategoryId;

    const debtScope =
      costCenterMode === 'TOTAL_BUSINESS'
        ? 'BUSINESS'
        : costCenterMode === 'INSTALLMENT_RANGE'
        ? 'BOTH'
        : 'PERSONAL';

    if (isEditing && initialDebt) {
      updateDebtCostCenter(initialDebt.id, {
        name: name.trim(),
        type,
        totalAmount: total,
        installmentCount: qtyParsed,
        startDate: firstDate,
        scope: debtScope,
        costCenterMode,
        businessStartInstallment: costCenterMode === 'INSTALLMENT_RANGE' ? startInst : 1,
        businessEndInstallment: costCenterMode === 'INSTALLMENT_RANGE' ? endInst : qtyParsed,
        includeDownPaymentInBusiness:
          costCenterMode === 'TOTAL_BUSINESS' ? true : includeDownPaymentInBusiness,
        musicSubcategory:
          costCenterMode !== 'TOTAL_PERSONAL' ? effectiveMusicSubcategory : undefined,
        categoryId: effectiveCategoryId,
        personalCategoryId: safePersonalCategoryId,
        accountId
      });
      onClose();
      return;
    }

    addDebt(
      {
        name: name.trim(),
        type,
        totalAmount: total,
        startDate: firstDate,
        installmentCount: qtyParsed,
        scope: debtScope,
        costCenterMode,
        businessStartInstallment: costCenterMode === 'INSTALLMENT_RANGE' ? startInst : 1,
        businessEndInstallment: costCenterMode === 'INSTALLMENT_RANGE' ? endInst : qtyParsed,
        includeDownPaymentInBusiness:
          costCenterMode === 'TOTAL_BUSINESS' ? true : includeDownPaymentInBusiness,
        musicSubcategory:
          costCenterMode !== 'TOTAL_PERSONAL' ? effectiveMusicSubcategory : undefined,
        categoryId: effectiveCategoryId,
        personalCategoryId: safePersonalCategoryId,
        accountId
      },
      {
        downPayment: parseCurrencyInput(downPayment),
        installments: qtyParsed,
        firstDate,
        categoryId: effectiveCategoryId,
        personalCategoryId: safePersonalCategoryId,
        autoPayPast,
        accountId,
        fixedInstallmentValue: parseCurrencyInput(installmentValue)
      }
    );
    onClose();
  };

  const personalExpenseCategories = useMemo(() => {
    const base = categories.filter(c => c.type === 'expense' && c.scope !== 'BUSINESS');
    const hasDebtCat = base.some(
      c =>
        c.id === DEFAULT_PERSONAL_DEBT_CATEGORY_ID ||
        c.name.toLowerCase().includes('dívida') ||
        c.name.toLowerCase().includes('divida') ||
        c.name.toLowerCase().includes('empréstimo')
    );
    const list = hasDebtCat
      ? [...base]
      : [
          {
            id: DEFAULT_PERSONAL_DEBT_CATEGORY_ID,
            name: 'Dívidas / Empréstimo Pessoal',
            type: 'expense' as const,
            color: '#6366f1',
            icon: 'CreditCard',
            classification: 'essential' as const,
            scope: 'PERSONAL' as const
          },
          ...base
        ];

    // Coloca 'Dívidas / Empréstimo Pessoal' no topo da lista para fácil seleção
    return list.sort((a, b) => {
      const aIsDebt = a.id === DEFAULT_PERSONAL_DEBT_CATEGORY_ID || a.name.toLowerCase().includes('dívida') || a.name.toLowerCase().includes('empréstimo');
      const bIsDebt = b.id === DEFAULT_PERSONAL_DEBT_CATEGORY_ID || b.name.toLowerCase().includes('dívida') || b.name.toLowerCase().includes('empréstimo');
      if (aIsDebt && !bIsDebt) return -1;
      if (!aIsDebt && bIsDebt) return 1;
      return 0;
    });
  }, [categories]);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
        <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-slide-up max-h-[94vh] overflow-y-auto no-scrollbar border-t border-white/10">
          
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              {!isEditing && (
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 0 ? 'bg-indigo-600 w-12' : 'bg-emerald-500 w-12'}`}></div>
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 1 ? 'bg-indigo-600 w-12' : 'bg-slate-100 dark:bg-slate-800 w-6'}`}></div>
                </div>
              )}
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tighter">
                {isEditing ? 'Editar Dívida & Centro de Custo' : step === 0 ? 'Nova Dívida / Parcelamento' : 'Plano de Parcelas'}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                {isEditing
                  ? 'Defina o vínculo com Música/Carreira ou Pessoal e a Subcategoria'
                  : step === 0
                  ? 'Passo 1: Dados, Centro de Custo e Subcategoria'
                  : 'Passo 2: Simulação e Intervalo de Parcelas'}
              </p>
            </div>
            <button onClick={onClose} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 transition-colors hover:text-rose-500 active:scale-95">
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 0 && (
              <div className="space-y-6 animate-fade-in">
                {/* Tipo da Dívida */}
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { id: 'card_installment', label: 'Parcelado', icon: CreditCard },
                    { id: 'bank', label: 'Empréstimo', icon: Landmark },
                    { id: 'car_financing', label: 'Veículo', icon: CarFront },
                    { id: 'person', label: 'Terceiros', icon: User },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const isSelected = type === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setType(opt.id as DebtType)}
                        className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-900 border-transparent text-slate-400'
                        }`}
                      >
                        <Icon size={22} strokeWidth={1.8} className="mb-1.5" />
                        <span className="text-[10px] font-black uppercase tracking-wider">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Título e Valor Total */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Título da Dívida / Acordo
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-base dark:text-white transition shadow-inner"
                      placeholder="Ex: Dívida com o Viny, Mesa de Som..."
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Valor Total (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-base">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={totalAmount}
                        onChange={(e) => {
                          setTotalAmount(e.target.value);
                          setIsManualInstallment(false);
                        }}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-lg text-slate-800 dark:text-white shadow-inner tabular-nums"
                        placeholder="12.435,00"
                      />
                    </div>
                  </div>
                </div>

                {/* Recálculo Atômico do Saldo Devedor (ao editar contrato existente) */}
                {isEditing && (
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Valor Total</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white tabular-nums">
                        {formatBRL(totalParsed)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-emerald-500 block">Amortizado Real</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatBRL(totalAmortizedReal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-rose-500 block">Saldo Restante</span>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatBRL(atomicRemainingBalance)}
                      </span>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* SEÇÃO PRINCIPAL: ASSOCIAÇÃO DE CENTRO DE CUSTO E SUBCATEGORIA      */}
                {/* ================================================================= */}
                <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Layers size={16} className="text-purple-500" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        Centro de Custo da Dívida / Parcelas
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      Impacta DRE da Música
                    </span>
                  </div>

                  {/* 3 Opções de Associação */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCostCenterMode('TOTAL_PERSONAL')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                        costCenterMode === 'TOTAL_PERSONAL'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm'
                          : 'bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <User size={16} className={costCenterMode === 'TOTAL_PERSONAL' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                        {costCenterMode === 'TOTAL_PERSONAL' && <CheckCircle2 size={14} className="text-indigo-500" />}
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase block leading-tight">Pessoal</span>
                        <span className="text-[9px] font-bold opacity-75 block mt-0.5">Valor Total (100%)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCostCenterMode('TOTAL_BUSINESS')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                        costCenterMode === 'TOTAL_BUSINESS'
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm'
                          : 'bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Music size={16} className={costCenterMode === 'TOTAL_BUSINESS' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'} />
                        {costCenterMode === 'TOTAL_BUSINESS' && <CheckCircle2 size={14} className="text-purple-500" />}
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase block leading-tight">Música / Carreira</span>
                        <span className="text-[9px] font-bold opacity-75 block mt-0.5">Valor Total (100%)</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCostCenterMode('INSTALLMENT_RANGE')}
                      className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                        costCenterMode === 'INSTALLMENT_RANGE'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                          : 'bg-white dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <SlidersHorizontal size={16} className={costCenterMode === 'INSTALLMENT_RANGE' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
                        {costCenterMode === 'INSTALLMENT_RANGE' && <CheckCircle2 size={14} className="text-amber-500" />}
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase block leading-tight">Intervalo de Parcelas</span>
                        <span className="text-[9px] font-bold opacity-75 block mt-0.5">Parte Música / Pessoal</span>
                      </div>
                    </button>
                  </div>

                  {/* Configuração de Intervalo de Parcelas (quando INSTALLMENT_RANGE) */}
                  {costCenterMode === 'INSTALLMENT_RANGE' && (
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-amber-500/30 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Intervalo vinculado a MÚSICA / CARREIRA
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Total de {qtyParsed} parcelas
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                            Qtd. Total Parcelas
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={installments}
                            onChange={(e) => {
                              setInstallments(e.target.value);
                              setIsManualInstallment(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-black text-sm dark:text-white tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-purple-500 block mb-1">
                            Da Parcela nº
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={qtyParsed}
                            value={businessStartInstallment}
                            onChange={(e) => setBusinessStartInstallment(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-500/40 font-black text-sm text-purple-700 dark:text-purple-300 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-purple-500 block mb-1">
                            Até a Parcela nº
                          </label>
                          <input
                            type="number"
                            min={businessStartInstallment || 1}
                            max={qtyParsed}
                            value={businessEndInstallment}
                            onChange={(e) => setBusinessEndInstallment(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-500/40 font-black text-sm text-purple-700 dark:text-purple-300 tabular-nums"
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        As parcelas de <strong>{businessStartInstallment || 1} a {businessEndInstallment || qtyParsed}</strong> entrarão no centro de custo <strong>MÚSICA / CARREIRA</strong>. As demais parcelas ficarão marcadas como <strong>PESSOAL</strong> e não entrarão nos relatórios da música.
                      </p>
                    </div>
                  )}

                  {/* Seletor de Subcategoria da Música (quando TOTAL_BUSINESS ou INSTALLMENT_RANGE) */}
                  {costCenterMode !== 'TOTAL_PERSONAL' && (
                    <div className="space-y-2 pt-1 animate-fade-in">
                      <label className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Tag size={12} />
                        <span>Subcategoria da Música / Carreira *</span>
                      </label>
                      <select
                        value={isCustomSubcategory ? '__custom__' : musicSubcategory}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomSubcategory(true);
                          } else {
                            setIsCustomSubcategory(false);
                            setMusicSubcategory(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3.5 bg-purple-50/70 dark:bg-purple-950/40 border-2 border-purple-500/40 focus:border-purple-500 rounded-2xl outline-none font-black text-xs text-purple-900 dark:text-purple-200 cursor-pointer"
                      >
                        {CAREER_DEBT_SUBCATEGORIES.map(sub => (
                          <option key={sub.id} value={sub.label} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                            {sub.label}
                          </option>
                        ))}
                        <option value="__custom__" className="bg-white dark:bg-slate-900 text-purple-600 font-bold">
                          + Outra Subcategoria Personalizada...
                        </option>
                      </select>

                      {isCustomSubcategory && (
                        <input
                          type="text"
                          value={customSubcategory}
                          onChange={(e) => setCustomSubcategory(e.target.value)}
                          placeholder="Digite a subcategoria (ex: Equipamentos / Instrumentos)"
                          className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-purple-500/50 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                        />
                      )}
                    </div>
                  )}

                  {/* Resumo de Alocação em Tempo Real */}
                  <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                        Resumo do Vínculo nos Relatórios
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 block">
                        {allocationPreview.rangeLabel}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      {allocationPreview.musicInstallmentsCount > 0 && (
                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase text-purple-500 block">Música</span>
                          <span className="font-black text-purple-600 dark:text-purple-400 tabular-nums">
                            {formatBRL(allocationPreview.musicTotalAmount)}
                          </span>
                        </div>
                      )}
                      {allocationPreview.personalInstallmentsCount > 0 && (
                        <div className="text-right">
                          <span className="text-[9px] font-black uppercase text-indigo-500 block">Pessoal</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {formatBRL(allocationPreview.personalTotalAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Categoria Pessoal (quando houver parcelas pessoais) e Conta Débito */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {costCenterMode !== 'TOTAL_BUSINESS' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Categoria (Parcelas Pessoais)
                      </label>
                      <select
                        value={personalCategoryId}
                        onChange={(e) => setPersonalCategoryId(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-xs dark:text-white cursor-pointer"
                      >
                        {personalExpenseCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={`space-y-1.5 ${costCenterMode === 'TOTAL_BUSINESS' ? 'sm:col-span-2' : ''}`}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Conta de Débito
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-black text-xs dark:text-white cursor-pointer"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-4 bg-slate-100 dark:bg-slate-900 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl active:scale-95 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!name.trim() || !totalAmount || !accountId}
                      className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center"
                    >
                      <Check size={18} className="mr-2" />
                      Salvar Alterações
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={!name.trim() || !totalAmount || !accountId}
                    className="w-full py-4.5 bg-indigo-600 disabled:bg-slate-200 disabled:dark:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.25em] rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center group"
                  >
                    Configurar Parcelas
                    <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            )}

            {step === 1 && !isEditing && (
              <div className="space-y-6 animate-fade-in">
                {/* Installment Simulator */}
                <div className="bg-slate-900 dark:bg-black rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden ring-4 ring-indigo-500/20">
                  <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-indigo-600 rounded-full blur-3xl opacity-40"></div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center">
                      <Calculator size={14} className="mr-2" /> {isManualInstallment ? 'Parcela Manual' : 'Parcela Estimada'}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                      costCenterMode === 'TOTAL_BUSINESS'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : costCenterMode === 'INSTALLMENT_RANGE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {costCenterMode === 'TOTAL_BUSINESS'
                        ? `🎸 Música: ${effectiveMusicSubcategory}`
                        : costCenterMode === 'INSTALLMENT_RANGE'
                        ? `🔀 Parcelas ${businessStartInstallment}-${businessEndInstallment} na Música`
                        : '👤 100% Pessoal'}
                    </span>
                  </div>
                  <div className="flex items-end space-x-3 relative border-b border-white/10 pb-3 mb-3">
                    <span className="text-2xl font-black text-indigo-400 mb-1.5">R$</span>
                    <input
                      type="number"
                      step="any"
                      value={installmentValue}
                      onChange={(e) => handleInstallmentChange(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-4xl font-black tracking-tighter text-white tabular-nums"
                      placeholder="0"
                    />
                    <span className="text-xs text-slate-500 font-black mb-2 uppercase tracking-widest shrink-0">/ Mês</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <span>Custo Efetivo Total</span>
                    <span className="text-white">{formatBRL(totalParsed)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 transition-all ${isEntryInvalid ? 'border-rose-500' : 'border-transparent focus-within:border-indigo-500 shadow-inner'}`}>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${isEntryInvalid ? 'text-rose-500' : 'text-slate-400'}`}>Entrada Inicial</label>
                    <div className="relative">
                      <span className={`absolute left-0 top-1/2 -translate-y-1/2 font-black text-base ${isEntryInvalid ? 'text-rose-300' : 'text-slate-400'}`}>R$</span>
                      <input
                        type="number"
                        step="any"
                        value={downPayment}
                        onChange={(e) => {
                          setDownPayment(e.target.value);
                          setIsManualInstallment(false);
                        }}
                        className={`w-full pl-7 bg-transparent outline-none font-black text-lg tabular-nums ${isEntryInvalid ? 'text-rose-500' : 'dark:text-white'}`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border-2 border-transparent focus-within:border-indigo-500 transition-all shadow-inner">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Qtd Parcelas</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={installments}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInstallments(val);
                          setIsManualInstallment(false);
                          if (costCenterMode !== 'INSTALLMENT_RANGE') {
                            setBusinessEndInstallment(val);
                          }
                        }}
                        className="w-full bg-transparent outline-none font-black text-lg dark:text-white tabular-nums"
                      />
                      <RefreshCw size={18} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Ajuste de Intervalo no Passo 2 caso INSTALLMENT_RANGE */}
                {costCenterMode === 'INSTALLMENT_RANGE' && (
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        Intervalo de Parcelas na Música ({effectiveMusicSubcategory})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Parcela Inicial (Música)</label>
                        <input
                          type="number"
                          min="1"
                          max={qtyParsed}
                          value={businessStartInstallment}
                          onChange={(e) => setBusinessStartInstallment(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-500/30 font-black text-sm dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Parcela Final (Música)</label>
                        <input
                          type="number"
                          min={businessStartInstallment || 1}
                          max={qtyParsed}
                          value={businessEndInstallment}
                          onChange={(e) => setBusinessEndInstallment(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-500/30 font-black text-sm dark:text-white"
                        />
                      </div>
                    </div>
                    {downParsed > 0 && (
                      <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={includeDownPaymentInBusiness}
                          onChange={(e) => setIncludeDownPaymentInBusiness(e.target.checked)}
                          className="rounded border-purple-400 text-purple-600 focus:ring-purple-500"
                        />
                        <span>Vincular também a Entrada Inicial ({formatBRL(downParsed)}) à Música</span>
                      </label>
                    )}
                  </div>
                )}

                {isEntryInvalid && (
                  <div className="flex items-center space-x-3 text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                    <AlertTriangle size={20} className="shrink-0" />
                    <span className="text-xs font-black uppercase tracking-tight leading-snug">A entrada não pode superar o total do contrato.</span>
                  </div>
                )}

                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl shadow-inner">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Início dos Pagamentos (1ª Parcela)</label>
                  <div
                    onClick={() => setIsCalendarOpen(true)}
                    className="flex items-center bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                  >
                    <Calendar size={18} className="text-indigo-500 mr-3" />
                    <span className="flex-1 font-black text-sm dark:text-white">{new Date(firstDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {isRetroactive && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between group">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none">
                        <ShieldCheck size={22} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] block">Histórico</span>
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                          Baixar parcelas passadas automaticamente?
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoPayPast(!autoPayPast)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${autoPayPast ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${autoPayPast ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="w-14 h-14 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-2xl active:scale-95 transition-all hover:bg-slate-200"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <button
                    type="submit"
                    disabled={isEntryInvalid || !installmentValue}
                    className="flex-1 h-14 bg-slate-900 dark:bg-indigo-600 disabled:opacity-30 text-white font-black text-xs uppercase tracking-[0.25em] rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center"
                  >
                    <Check size={20} className="mr-2" />
                    Finalizar Dívida
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={firstDate}
        onSelect={(d) => setFirstDate(d)}
        title="Primeiro Pagamento"
      />
    </>
  );
};
