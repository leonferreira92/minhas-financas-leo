import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import {
  Plus,
  CreditCard,
  Building,
  User,
  ChevronRight,
  CheckCircle2,
  TrendingDown,
  CarFront,
  Calendar,
  ShieldCheck,
  Clock,
  Music,
  ArrowLeft,
  Edit2,
  Trash2,
  Check,
  SlidersHorizontal,
  Tag
} from 'lucide-react';
import { Transaction } from '../../types';
import { parseCurrencyInput } from '../../constants';
import { DebtModal, InstallmentRecalcModal } from './DebtModal';
import { ActiveDebtsPanel } from '../ActiveDebtsPanel';
import {
  resolveDebtInstallmentCostCenter,
  isSomLeoDebtOrTransaction,
  isVinyDebtOrTransaction,
  calculateVinyCostCenterSummary,
  buildVinyAllocationMap,
  extractInstallmentNumber,
  VINY_MUSIC_START_INSTALLMENT,
  VINY_MUSIC_END_INSTALLMENT,
  VINY_MONTHLY_MUSIC_FIXED,
  VINY_MUSIC_MAX_CEILING
} from '../../services/financeAggregator';

interface DebtDetailProps {
  debtId: string;
  onClose: () => void;
}

export const DebtDetail: React.FC<DebtDetailProps> = ({ debtId, onClose }) => {
  const {
    debts,
    transactions,
    getDebtProgress,
    deleteDebt,
    updateTransaction,
    updateDebt,
    toggleInstallmentCostCenter,
    recalculateDebtSeries
  } = useFinance();

  const [recalcTransaction, setRecalcTransaction] = useState<Transaction | null>(null);
  const [isEditingDebtName, setIsEditingDebtName] = useState(false);
  const [isEditingTotalInline, setIsEditingTotalInline] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const debt = debts.find(d => d.id === debtId);
  const isViny = useMemo(() => isVinyDebtOrTransaction(debt), [debt]);

  useEffect(() => {
    if (debt) {
      setEditName(debt.name);
      setEditTotalAmount(String(debt.totalAmount || 0));
    }
  }, [debt]);

  const debtTransactions = useMemo(
    () =>
      transactions
        .filter(t => t.debtId === debtId && t.status !== 'cancelled')
        .sort((a, b) => {
          const aNum = extractInstallmentNumber(a);
          const bNum = extractInstallmentNumber(b);
          if (aNum !== bNum) return aNum - bNum;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }),
    [transactions, debtId]
  );

  const vinyMap = useMemo(
    () => (isViny && debt ? buildVinyAllocationMap(debtTransactions, [debt]) : new Map()),
    [isViny, debt, debtTransactions]
  );

  // Estatísticas dinâmicas de Centro de Custo desta Dívida
  const costCenterSummary = useMemo(() => {
    if (!debt) {
      return {
        musicPaidTotal: 0,
        musicPendingTotal: 0,
        musicContractTotal: 0,
        musicCount: 0,
        personalPaidTotal: 0,
        personalPendingTotal: 0,
        personalContractTotal: 0,
        personalCount: 0
      };
    }

    if (isViny) {
      const vinySummary = calculateVinyCostCenterSummary(debtTransactions, debt.totalAmount);
      return {
        musicPaidTotal: vinySummary.musicPaidTotal,
        musicPendingTotal: vinySummary.musicPendingTotal,
        musicContractTotal: vinySummary.musicContractTotal,
        musicCount: vinySummary.musicCount,
        personalPaidTotal: vinySummary.personalPaidTotal,
        personalPendingTotal: vinySummary.personalPendingTotal,
        personalContractTotal: vinySummary.personalContractTotal,
        personalCount: vinySummary.personalCount
      };
    }

    let musicPaidTotal = 0;
    let musicPendingTotal = 0;
    let musicCount = 0;
    let personalPaidTotal = 0;
    let personalPendingTotal = 0;
    let personalCount = 0;

    debtTransactions.forEach(t => {
      const instNum = extractInstallmentNumber(t) || 1;
      const effectiveScope =
        t.scope === 'BUSINESS' || t.scope === 'PERSONAL'
          ? t.scope
          : resolveDebtInstallmentCostCenter(debt, instNum, t.amount).scope;

      const amt = Math.abs(Number(t.amount) || 0);
      if (effectiveScope === 'BUSINESS') {
        musicCount += 1;
        if (t.status === 'paid') musicPaidTotal += amt;
        else if (t.status === 'pending') musicPendingTotal += amt;
      } else {
        personalCount += 1;
        if (t.status === 'paid') personalPaidTotal += amt;
        else if (t.status === 'pending') personalPendingTotal += amt;
      }
    });

    return {
      musicPaidTotal: Math.round(musicPaidTotal * 100) / 100,
      musicPendingTotal: Math.round(musicPendingTotal * 100) / 100,
      musicContractTotal: Math.round((musicPaidTotal + musicPendingTotal) * 100) / 100,
      musicCount,
      personalPaidTotal: Math.round(personalPaidTotal * 100) / 100,
      personalPendingTotal: Math.round(personalPendingTotal * 100) / 100,
      personalContractTotal: Math.round((personalPaidTotal + personalPendingTotal) * 100) / 100,
      personalCount
    };
  }, [debt, isViny, debtTransactions]);

  if (!debt) return null;

  const { paid, remaining, progress, status, totalReal } = getDebtProgress(debtId);
  const isPaid = status === 'paid';

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).format(
      new Date(date + 'T12:00:00')
    );

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteDebt(debtId);
      onClose();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const handleSaveEditName = () => {
    if (!editName.trim()) {
      setIsEditingDebtName(false);
      return;
    }
    updateDebt(debtId, editName.trim(), debt.installmentCount);
    setIsEditingDebtName(false);
  };

  const handleSaveEditTotalInline = () => {
    const newTotal = parseCurrencyInput(editTotalAmount);
    if (!isNaN(newTotal) && newTotal >= 0) {
      updateDebt(debtId, debt.name, debt.installmentCount, {
        totalAmount: newTotal
      });
    }
    setIsEditingTotalInline(false);
  };

  const toggleTransactionStatus = (e: React.MouseEvent, t: Transaction) => {
    e.stopPropagation();
    updateTransaction({
      ...t,
      status: t.status === 'paid' ? 'pending' : 'paid'
    });
  };

  const handleToggleInstallmentScope = (
    e: React.MouseEvent,
    t: Transaction,
    currentScope: 'BUSINESS' | 'PERSONAL'
  ) => {
    e.stopPropagation();
    const nextScope = currentScope === 'BUSINESS' ? 'PERSONAL' : 'BUSINESS';
    toggleInstallmentCostCenter(
      t.id,
      nextScope,
      debt.musicSubcategory || 'Equipamentos / Instrumentos'
    );
  };

  const effectiveMode =
    debt.costCenterMode || (debt.scope === 'BUSINESS' ? 'TOTAL_BUSINESS' : 'TOTAL_PERSONAL');

  return (
    <>
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[100] overflow-y-auto animate-slide-up flex flex-col no-scrollbar">
        {/* Top Navbar */}
        <div className="sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl z-20 px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-500 active:scale-95 transition-all"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex-1 text-center px-4">
            {isEditingDebtName ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-black text-center outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                onBlur={handleSaveEditName}
                onKeyDown={e => e.key === 'Enter' && handleSaveEditName()}
              />
            ) : (
              <div className="flex flex-col items-center">
                <h2
                  onClick={() => setIsEditingDebtName(true)}
                  className="font-black text-slate-800 dark:text-white truncate uppercase tracking-tighter text-base flex items-center cursor-pointer group"
                >
                  {debt.name}{' '}
                  <Edit2
                    size={12}
                    className="ml-2 opacity-0 group-hover:opacity-50 transition-opacity"
                  />
                </h2>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {debt.installmentCount} Parcelas
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-all active:scale-95"
              title="Editar Valor Total, Parcelas e Centro de Custo"
            >
              <SlidersHorizontal size={20} />
            </button>
            <button
              onClick={handleDelete}
              className={`p-2.5 rounded-2xl transition-all flex items-center space-x-2 active:scale-95 ${
                showDeleteConfirm
                  ? 'bg-rose-600 text-white w-auto px-5'
                  : 'bg-slate-50 dark:bg-slate-900 text-rose-500 hover:bg-rose-100'
              }`}
            >
              <Trash2 size={22} strokeWidth={showDeleteConfirm ? 3 : 1.5} />
              {showDeleteConfirm && (
                <span className="text-[10px] font-black uppercase tracking-widest">Confirmar?</span>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto w-full flex-1 px-5 pt-6 pb-32">
          {/* CARD DE CENTRO DE CUSTO E IMPACTO NO DRE DA MÚSICA */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    effectiveMode === 'TOTAL_BUSINESS' || costCenterSummary.musicCount > 0
                      ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                      : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {effectiveMode === 'TOTAL_BUSINESS' || costCenterSummary.musicCount > 0 ? (
                    <Music size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                    Centro de Custo Vinculado
                  </span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {isViny
                      ? `🔀 MISTO DINÂMICO: Parcelas ${VINY_MUSIC_START_INSTALLMENT} a ${VINY_MUSIC_END_INSTALLMENT} (Som) + Pessoal`
                      : effectiveMode === 'TOTAL_BUSINESS'
                      ? '🎸 MÚSICA / CARREIRA (Valor Total)'
                      : effectiveMode === 'INSTALLMENT_RANGE'
                      ? `🔀 MISTO: Parcelas ${debt.businessStartInstallment || 1} a ${
                          debt.businessEndInstallment || debt.installmentCount
                        } na Música`
                      : costCenterSummary.musicCount > 0
                      ? `🔀 MISTO (${costCenterSummary.musicCount}x Música / ${costCenterSummary.personalCount}x Pessoal)`
                      : '👤 PESSOAL (Valor Total)'}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm shrink-0"
              >
                Editar Dívida
              </button>
            </div>

            {(effectiveMode !== 'TOTAL_PERSONAL' || costCenterSummary.musicCount > 0 || isViny) && (
              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <Tag size={12} />
                    Subcategoria da Música:
                  </span>
                  <span className="font-black text-purple-900 dark:text-purple-200">
                    {debt.musicSubcategory || 'Equipamentos / Instrumentos'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-purple-200/50 dark:border-purple-800/40">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      {isViny
                        ? `Pago na Música (Alocado: ${formatCurrency(costCenterSummary.musicContractTotal)})`
                        : 'Pago na Música (DRE)'}
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(costCenterSummary.musicPaidTotal)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block">
                      Pago no Pessoal (Fora do DRE)
                    </span>
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {formatCurrency(costCenterSummary.personalPaidTotal)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress & Dynamic Total Value Editor Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-7 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-8 relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>

            <div className="relative w-36 h-36 mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-800"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,102,241,0.5)] ${
                    isPaid ? 'text-emerald-500' : 'text-indigo-600'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-3xl font-black tracking-tighter tabular-nums ${
                    isPaid ? 'text-emerald-500' : 'text-slate-800 dark:text-white'
                  }`}
                >
                  {progress.toFixed(0)}
                  <span className="text-lg">%</span>
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Quitado
                </span>
              </div>
            </div>

            {/* Valor Total Editável + Amortizado + Saldo Restante */}
            <div className="grid grid-cols-3 gap-3 w-full pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="text-center">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">
                  Valor Total
                </span>
                {isEditingTotalInline ? (
                  <div className="flex items-center justify-center space-x-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editTotalAmount}
                      onChange={e => setEditTotalAmount(e.target.value)}
                      onBlur={handleSaveEditTotalInline}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEditTotalInline()}
                      className="w-24 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 text-xs font-black text-center outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white tabular-nums"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditTotalAmount(String(totalReal));
                      setIsEditingTotalInline(true);
                    }}
                    className="inline-flex items-center justify-center gap-1 text-sm sm:text-base font-black text-slate-800 dark:text-white tabular-nums hover:text-indigo-500 transition group"
                    title="Clique para editar o Valor Total e recalcular proporcionalmente as parcelas pendentes"
                  >
                    <span>{formatCurrency(totalReal)}</span>
                    <Edit2 size={11} className="opacity-50 group-hover:opacity-100 text-indigo-500" />
                  </button>
                )}
              </div>

              <div className="text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Amortizado
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-500 tabular-nums">
                  {formatCurrency(paid)}
                </span>
              </div>

              <div className="text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Saldo Restante
                </span>
                <span
                  className={`text-sm sm:text-base font-black tabular-nums ${
                    isPaid ? 'text-emerald-500' : 'text-rose-500 dark:text-rose-400'
                  }`}
                >
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </div>

          {/* List Section Title */}
          <div className="flex justify-between items-center mb-4 px-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
              <Clock size={14} className="mr-2" /> Cronograma de Parcelas
            </h3>
            <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded-lg uppercase tracking-widest">
              Toque na parcela p/ editar valor
            </span>
          </div>

          {/* Installment Schedule List */}
          <div className="space-y-3.5">
            {debtTransactions.map((t, index) => {
              const isTPaid = t.status === 'paid';
              const isOverdue = !isTPaid && new Date(t.date) < new Date();
              const cleanInstallmentAmount = Math.max(
                0,
                Math.round((Math.abs(Number(t.amount)) || 0) * 100) / 100
              );
              const instNum = extractInstallmentNumber(t) || index + 1;
              const isDownPayment =
                t.installmentNumber === 0 ||
                (t.description || '').toLowerCase().includes('entrada');

              // Atribuição Dinâmica da DRE da Música (Sem Valores Impossíveis)
              const vinyAlloc = isViny ? vinyMap.get(t.id) : undefined;
              const inVinySoundRange =
                isViny &&
                !isDownPayment &&
                instNum >= VINY_MUSIC_START_INSTALLMENT &&
                instNum <= VINY_MUSIC_END_INSTALLMENT;

              // Garantia matemática estrita: em NENHUMA hipótese o valor de Música supera cleanInstallmentAmount ou R$ 650,00
              const dynamicMusicAmount = isViny
                ? inVinySoundRange
                  ? Math.min(
                      cleanInstallmentAmount,
                      VINY_MONTHLY_MUSIC_FIXED,
                      vinyAlloc ? vinyAlloc.musicAmount : cleanInstallmentAmount
                    )
                  : 0
                : 0;

              const dynamicPersonalAmount = isViny
                ? Math.max(
                    0,
                    Math.round((cleanInstallmentAmount - dynamicMusicAmount) * 100) / 100
                  )
                : 0;

              const effectiveScope: 'BUSINESS' | 'PERSONAL' = isViny
                ? dynamicMusicAmount > 0
                  ? 'BUSINESS'
                  : 'PERSONAL'
                : t.scope === 'BUSINESS' || t.scope === 'PERSONAL'
                ? t.scope
                : resolveDebtInstallmentCostCenter(debt, instNum, cleanInstallmentAmount).scope;

              const isMusicInstallment = effectiveScope === 'BUSINESS';
              const subcatLabel =
                t.subcategory || debt.musicSubcategory || 'Equipamentos / Instrumentos';

              return (
                <div
                  key={t.id}
                  className={`group flex items-center p-4 rounded-[2rem] border transition-all active:scale-[0.99] ${
                    isTPaid
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50'
                      : isOverdue
                      ? 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-900/50 shadow-md ring-1 ring-rose-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <button
                    onClick={e => toggleTransactionStatus(e, t)}
                    className={`flex-none w-11 h-11 rounded-[1.1rem] flex items-center justify-center transition-all active:scale-95 ${
                      isTPaid
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-300 hover:bg-emerald-100 hover:text-emerald-600'
                    }`}
                    title={isTPaid ? 'Marcar como pendente' : 'Dar baixa (Pagar parcela)'}
                  >
                    <Check size={20} strokeWidth={4} />
                  </button>

                  <div
                    className="flex-1 ml-4 cursor-pointer min-w-0"
                    onClick={() => setRecalcTransaction(t)}
                  >
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className={`text-xs font-black uppercase tracking-wider truncate ${
                            isTPaid
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {!isDownPayment
                            ? `Parcela ${instNum}/${debt.installmentCount}`
                            : 'Entrada Inicial'}
                        </span>
                        {isTPaid && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                            Paga
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-black tabular-nums shrink-0 flex items-center gap-1 ${
                          isTPaid
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isOverdue
                            ? 'text-rose-500'
                            : 'text-slate-800 dark:text-white'
                        }`}
                      >
                        {formatCurrency(cleanInstallmentAmount)}
                        <Edit2 size={10} className="opacity-40 group-hover:opacity-100 text-indigo-400" />
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
                      <div className="flex items-center space-x-2">
                        <Calendar
                          size={10}
                          className={isOverdue ? 'text-rose-400' : 'text-slate-400'}
                        />
                        <span
                          className={`text-[10px] font-black uppercase tracking-tighter ${
                            isOverdue ? 'text-rose-500' : 'text-slate-400'
                          }`}
                        >
                          {formatDate(t.date)} {isOverdue && '• ATRASADO'}
                        </span>
                      </div>

                      {/* Etiquetas de Rateio Dinâmico abaixo de cada parcela */}
                      {isViny ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {dynamicMusicAmount > 0 && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 flex items-center space-x-1">
                              <Music size={10} />
                              <span>
                                Música {formatCurrency(dynamicMusicAmount)}
                              </span>
                            </span>
                          )}
                          {dynamicPersonalAmount > 0 && (
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                              <User size={10} />
                              <span>
                                Pessoal {formatCurrency(dynamicPersonalAmount)}
                              </span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={e => handleToggleInstallmentScope(e, t, effectiveScope)}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition active:scale-95 flex items-center space-x-1 ${
                            isMusicInstallment
                              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/25'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title="Clique para alternar esta parcela entre MÚSICA / CARREIRA e PESSOAL"
                        >
                          {isMusicInstallment ? (
                            <>
                              <Music size={10} />
                              <span className="truncate max-w-[210px]">
                                Música {formatCurrency(cleanInstallmentAmount)} • {subcatLabel}
                              </span>
                            </>
                          ) : (
                            <>
                              <User size={10} />
                              <span>Pessoal {formatCurrency(cleanInstallmentAmount)}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de Edição Completa da Dívida / Valor Total / Centro de Custo */}
      {isEditModalOpen && (
        <DebtModal initialDebt={debt} onClose={() => setIsEditModalOpen(false)} />
      )}

      {/* Modal de Recálculo Dinâmico de Parcela Individual */}
      {recalcTransaction && (
        <InstallmentRecalcModal
          debt={debt}
          transaction={recalcTransaction}
          debtTransactions={debtTransactions}
          onClose={() => setRecalcTransaction(null)}
          onSave={(id, amount) => {
            recalculateDebtSeries(id, amount);
            setRecalcTransaction(null);
          }}
        />
      )}
    </>
  );
};

export const DebtList: React.FC = () => {
  const { debts, getDebtProgress } = useFinance();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'paid'>('active');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const stats = useMemo(() => {
    const cleanDebts = debts.filter(d => !isSomLeoDebtOrTransaction(d));
    const active = cleanDebts.filter(d => getDebtProgress(d.id).status === 'active');
    const paid = cleanDebts.filter(d => getDebtProgress(d.id).status === 'paid');

    const totalDebt = cleanDebts.reduce((sum, d) => sum + (Number(d.totalAmount) || 0), 0);
    const totalPaid = cleanDebts.reduce((sum, d) => sum + getDebtProgress(d.id).paid, 0);
    const totalRemaining = active.reduce((sum, d) => sum + getDebtProgress(d.id).remaining, 0);

    return {
      active,
      paid,
      totalDebt,
      totalRemaining,
      totalPaid,
      progress: totalDebt > 0 ? Math.min(100, (totalPaid / totalDebt) * 100) : 0
    };
  }, [debts, getDebtProgress]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return Building;
      case 'person':
        return User;
      case 'car_financing':
        return CarFront;
      default:
        return CreditCard;
    }
  };

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100 max-w-4xl mx-auto px-2">
      {/* Header Superior */}
      <div className="flex justify-between items-end pt-6 mb-8 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            Dívidas
          </h1>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">
            Gestão de Passivos & Rateio Dinâmico DRE
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center active:scale-90 transition-all group"
        >
          <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      {/* Hero Card: Fintech Style Summary */}
      <div className="relative bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 text-white shadow-2xl mb-10 overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-emerald-500 rounded-full blur-[60px] opacity-10"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div className="p-3 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10">
              <TrendingDown size={28} className="text-indigo-400" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">
                Saldo Devedor Restante
              </span>
              <h2 className="text-3xl font-black text-white tracking-tighter tabular-nums">
                {formatCurrency(stats.totalRemaining)}
              </h2>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-end">
              <div className="flex items-center space-x-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                  {stats.progress.toFixed(0)}% Quitado
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                {formatCurrency(stats.totalPaid)} amortizado
              </span>
            </div>
            <div className="h-3.5 bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                style={{ width: `${stats.progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-[1.5rem] mb-8 border border-slate-100 dark:border-slate-800 shadow-sm">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center space-x-2 active:scale-95 ${
            activeTab === 'active'
              ? 'bg-slate-900 text-white shadow-lg scale-[1.02]'
              : 'text-slate-400'
          }`}
        >
          <Clock size={14} />
          <span>Ativas ({stats.active.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center space-x-2 active:scale-95 ${
            activeTab === 'paid'
              ? 'bg-emerald-600 text-white shadow-lg scale-[1.02]'
              : 'text-slate-400'
          }`}
        >
          <CheckCircle2 size={14} />
          <span>Quitadas ({stats.paid.length})</span>
        </button>
      </div>

      {/* Debt List Rendering */}
      {activeTab === 'active' ? (
        <ActiveDebtsPanel onSelectDebt={id => setSelectedDebtId(id)} />
      ) : (
        <div className="space-y-5">
          {stats.paid.length === 0 ? (
            <div className="text-center py-24 opacity-30 flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <CreditCard size={40} className="text-slate-400" />
              </div>
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                Nenhum compromisso quitado
              </p>
            </div>
          ) : (
            stats.paid.map(debt => {
              const Icon = getIcon(debt.type);
              const isViny = isVinyDebtOrTransaction(debt);
              const sampleInstallment =
                Number(debt.installmentAmount) ||
                Math.round(
                  ((Number(debt.totalAmount) || 0) / Math.max(1, debt.installmentCount || 1)) * 100
                ) / 100;
              const vinyEffectiveMonthlyMusic = Math.min(
                sampleInstallment,
                VINY_MONTHLY_MUSIC_FIXED
              );

              return (
                <div
                  key={debt.id}
                  onClick={() => setSelectedDebtId(debt.id)}
                  className="group bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col active:scale-[0.97] transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
                        <Icon size={26} strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-800 dark:text-white text-lg leading-tight truncate">
                            {debt.name}
                          </h3>
                          {isViny ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                              <Music size={10} />
                              <span>
                                Rateio DRE: {formatCurrency(vinyEffectiveMonthlyMusic)}/mês + Pessoal
                              </span>
                            </span>
                          ) : debt.costCenterMode === 'TOTAL_BUSINESS' ||
                            debt.scope === 'BUSINESS' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                              <Music size={10} />
                              <span>
                                Música • {debt.musicSubcategory || 'Equipamentos / Instrumentos'}
                              </span>
                            </span>
                          ) : debt.costCenterMode === 'INSTALLMENT_RANGE' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                              <Music size={10} />
                              <span>
                                Parcelas {debt.businessStartInstallment || 1}-
                                {debt.businessEndInstallment || debt.installmentCount} na Música
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                              <User size={10} />
                              <span>Pessoal</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {debt.installmentCount} Parcela(s)
                          </span>
                          <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {debt.type === 'card_installment'
                              ? 'Crédito'
                              : debt.type === 'bank'
                              ? 'Bancário'
                              : 'Outros'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black tracking-tight tabular-nums text-emerald-500">
                        Quitado
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black text-emerald-500 uppercase tracking-[0.1em]">
                      <span>Status da Quitação</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-full h-2 overflow-hidden p-0.5 border border-slate-100 dark:border-slate-800/50">
                      <div
                        className="h-full rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar size={12} className="text-indigo-400" />
                      <span>
                        Desde{' '}
                        {new Intl.DateTimeFormat('pt-BR', {
                          month: 'short',
                          year: 'numeric'
                        }).format(new Date(debt.startDate))}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {isFormOpen && <DebtModal onClose={() => setIsFormOpen(false)} />}

      {selectedDebtId && (
        <DebtDetail debtId={selectedDebtId} onClose={() => setSelectedDebtId(null)} />
      )}
    </div>
  );
};

export const DebtsScreen: React.FC = () => {
  return <DebtList />;
};
