import React, { useState } from 'react';
import { ArrowRightLeft, BadgeDollarSign, Sparkles } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useProLaboreEstimate } from '../hooks/useProLaboreEstimate';
import { ProLaboreWithdrawModal } from './ProLaboreWithdrawModal';

/**
 * Card do Dashboard Pessoal: estimativa de pró-labore disponível
 * (leitura via useProLaboreEstimate) + atalho para registrar entrada em cat_7.
 */
export const ProLaboreEstimateCard: React.FC = () => {
  const { isBlurred } = useFinance();
  const estimate = useProLaboreEstimate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <>
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <BadgeDollarSign size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                Vida de Artista → Pessoal
              </p>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Estimativa de Pró-Labore Disponível
              </h3>
            </div>
          </div>
          {estimate.hasCompanyAccount && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
              <Sparkles size={10} />
              Caixa empresa
            </span>
          )}
        </div>

        <div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(estimate.availableEstimate)}
          </p>
          <p className="text-[11px] text-slate-600 mt-1 font-medium">
            Caixa legado {formatCurrency(estimate.companyCash)}
            {estimate.companyPendingBills > 0 && (
              <> · Pendências −{formatCurrency(estimate.companyPendingBills)}</>
            )}
            {estimate.recommendedReinvestment > 0 && (
              <> · Reserva −{formatCurrency(estimate.recommendedReinvestment)}</>
            )}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            Entrada registrada em: {estimate.categoryLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition active:scale-[0.98] shadow-sm flex items-center justify-center space-x-2"
        >
          <ArrowRightLeft size={14} strokeWidth={2.5} />
          <span>Registrar Pró-labore / Transferência</span>
        </button>
      </div>

      <ProLaboreWithdrawModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultAmount={
          estimate.availableEstimate > 0 ? estimate.availableEstimate : undefined
        }
      />
    </>
  );
};
