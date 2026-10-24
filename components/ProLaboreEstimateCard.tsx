import React, { useState } from 'react';
import { ArrowRightLeft, BadgeDollarSign, CloudOff, Loader2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useProLaboreEstimate } from '../hooks/useProLaboreEstimate';
import { ProLaboreWithdrawModal } from './ProLaboreWithdrawModal';
import { parseCurrencyInput } from '../constants';

/**
 * Card do Dashboard: `availableProLabore` de
 * `users/{uid}/companySummary/current` (Vida de Artista).
 */
export const ProLaboreEstimateCard: React.FC = () => {
  const { isBlurred } = useFinance();
  const estimate = useProLaboreEstimate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const showManualFallback = !estimate.isLoading && !estimate.hasFirestoreSummary;

  const handleApplyManual = () => {
    const parsed = parseCurrencyInput(manualInput);
    if (parsed > 0) {
      estimate.setManualOverride(parsed);
    } else {
      estimate.setManualOverride(null);
    }
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
          {estimate.hasFirestoreSummary ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              Firestore
            </span>
          ) : showManualFallback ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0 flex items-center gap-1">
              <CloudOff size={10} />
              Sem sync
            </span>
          ) : null}
        </div>

        <div>
          {estimate.isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 py-1">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-xs font-medium">Carregando estimativa da empresa…</span>
            </div>
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(estimate.availableEstimate)}
            </p>
          )}
          <p className="text-[10px] text-slate-500 mt-1">
            {estimate.hasFirestoreSummary
              ? 'Fonte: companySummary/current · availableProLabore'
              : 'Documento ainda não disponível — use 0 ou valor manual temporário'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Entrada registrada em: {estimate.categoryLabel}
          </p>
        </div>

        {showManualFallback && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              step="any"
              min="0"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Valor manual (R$)"
              className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={handleApplyManual}
              className="shrink-0 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-wide transition"
            >
              Aplicar
            </button>
          </div>
        )}

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
