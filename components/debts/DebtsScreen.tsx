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
  Tag,
  Calculator,
  Sparkles
} from 'lucide-react';
import { Transaction } from '../../types';
import { parseCurrencyInput } from '../../constants';
import { DebtModal, InstallmentRecalcModal } from './DebtModal';
import { DebtDetailModal } from './DebtDetailModal';
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
  VINY_MONTHLY_MUSIC_FIXED
} from '../../services/financeAggregator';

export { DebtDetailModal, DebtDetailModal as DebtDetail } from './DebtDetailModal';

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

      {/* Painel Unificado de Dívidas Ativas e Rateio com DRE */}
      <div className="mb-8">
        <ActiveDebtsPanel onNewDebt={() => setIsFormOpen(true)} />
      </div>

      {/* Hero Stats Card */}
      <div className="bg-slate-900 dark:bg-black rounded-[3rem] p-7 sm:p-9 text-white shadow-2xl relative overflow-hidden mb-8 ring-4 ring-indigo-500/10">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 block mb-1">
                Saldo Devedor Consolidado
              </span>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums">
                {formatCurrency(stats.totalRemaining)}
              </h2>
            </div>
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <TrendingDown size={24} className="text-rose-400" />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
              <span className="text-slate-400">Progresso de Amortização</span>
              <span className="text-emerald-400 tabular-nums">{stats.progress.toFixed(0)}% Pago</span>
            </div>
            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${stats.progress}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                Total Original
              </span>
              <span className="font-black text-white tabular-nums text-sm sm:text-base">
                {formatCurrency(stats.totalDebt)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block">
                Total Amortizado
              </span>
              <span className="font-black text-emerald-400 tabular-nums text-sm sm:text-base">
                {formatCurrency(stats.totalPaid)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Ativas vs Quitadas */}
      <div className="flex space-x-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-[1.8rem] mb-6 max-w-sm mx-auto border border-slate-200/60 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
            activeTab === 'active'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Em Andamento ({stats.active.length})
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
            activeTab === 'paid'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Quitadas ({stats.paid.length})
        </button>
      </div>

      {/* Lista de Contratos / Dívidas */}
      <div className="space-y-4">
        {(activeTab === 'active' ? stats.active : stats.paid).map(debt => {
          const { paid, remaining, progress, status } = getDebtProgress(debt.id);
          const Icon = getIcon(debt.type);
          const isViny = isVinyDebtOrTransaction(debt);
          const start = debt.businessStartInstallment ?? VINY_MUSIC_START_INSTALLMENT;
          const end = debt.businessEndInstallment ?? VINY_MUSIC_END_INSTALLMENT;

          return (
            <div
              key={debt.id}
              onClick={() => setSelectedDebtId(debt.id)}
              className="group bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : isViny || debt.scope === 'BUSINESS'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {debt.name}
                      </h3>
                      {status === 'paid' && (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {debt.installmentCount} Parcelas • {debt.startDate ? new Date(debt.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-slate-800 dark:text-white tabular-nums block">
                    {formatCurrency(remaining)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {status === 'paid' ? 'Quitado' : 'Saldo Restante'}
                  </span>
                </div>
              </div>

              {/* Badges de Centro de Custo */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {isViny ? (
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Music size={11} />
                    <span>Som Viny (P{start}-P{end} Música • P{end + 1}+ Pessoal)</span>
                  </span>
                ) : debt.scope === 'BUSINESS' ? (
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Music size={11} />
                    <span>100% Música / DRE</span>
                  </span>
                ) : debt.costCenterMode === 'INSTALLMENT_RANGE' ? (
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <SlidersHorizontal size={11} />
                    <span>Parcelas {start} a {end} na Música</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <User size={11} />
                    <span>100% Pessoal</span>
                  </span>
                )}
              </div>

              {/* Barra de Progresso Individual */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Pago: {formatCurrency(paid)}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      status === 'paid' ? 'bg-emerald-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}

        {(activeTab === 'active' ? stats.active : stats.paid).length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8">
            <CreditCard size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-sm font-black uppercase text-slate-600 dark:text-slate-300">
              Nenhuma dívida {activeTab === 'active' ? 'em andamento' : 'quitada'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'active'
                ? 'Toque no botão + acima para cadastrar seu primeiro acordo ou parcelamento'
                : 'Suas dívidas finalizadas aparecerão aqui'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Criação de Dívida */}
      {isFormOpen && <DebtModal onClose={() => setIsFormOpen(false)} />}

      {/* Modal de Detalhes da Dívida */}
      {selectedDebtId && (
        <DebtDetailModal debtId={selectedDebtId} onClose={() => setSelectedDebtId(null)} />
      )}
    </div>
  );
};

export const DebtsScreen: React.FC = () => {
  return <DebtList />;
};
