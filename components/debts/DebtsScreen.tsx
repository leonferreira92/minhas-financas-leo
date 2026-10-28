import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import {
  Plus,
  CreditCard,
  Building,
  User,
  CheckCircle2,
  TrendingDown,
  CarFront
} from 'lucide-react';
import { DebtModal } from './DebtModal';
import { DebtDetailModal } from './DebtDetailModal';
import { ActiveDebtsPanel } from '../ActiveDebtsPanel';
import { isSomLeoDebtOrTransaction } from '../../services/financeAggregator';

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
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Dívidas
          </h1>
          <p className="text-[10px] font-black text-blue-800 uppercase tracking-[0.18em] mt-1">
            Financiamentos, cartão e parcelas
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-14 h-14 bg-[#003882] text-[#fcca00] rounded-[1.5rem] shadow-xl shadow-blue-900/20 flex items-center justify-center active:scale-90 transition-all group"
        >
          <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      <div className="mb-8">
        <ActiveDebtsPanel onNewDebt={() => setIsFormOpen(true)} />
      </div>

      <div className="bg-gradient-to-br from-[#002d6c] via-[#003882] to-[#001838] rounded-[2.5rem] p-7 sm:p-9 text-white shadow-xl relative overflow-hidden mb-8 border border-blue-500/20">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#fcca00]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-200 block mb-1">
                Saldo devedor
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
                className="h-full bg-gradient-to-r from-[#fcca00] to-emerald-400 rounded-full transition-all duration-1000 ease-out"
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
              ? 'bg-white text-blue-900 shadow-md'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Em andamento ({stats.active.length})
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

          return (
            <div
              key={debt.id}
              onClick={() => setSelectedDebtId(debt.id)}
              className="group bg-white rounded-[2.2rem] p-6 shadow-sm border border-slate-200 hover:border-blue-300 transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-base group-hover:text-blue-900 transition">
                        {debt.name}
                      </h3>
                      {status === 'paid' && (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {debt.installmentCount} parcelas • {debt.startDate ? new Date(debt.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-slate-800 tabular-nums block">
                    {formatCurrency(remaining)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {status === 'paid' ? 'Quitado' : 'Restante'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Pago: {formatCurrency(paid)}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      status === 'paid' ? 'bg-emerald-500' : 'bg-[#003882]'
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
