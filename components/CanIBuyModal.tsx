import React, { useMemo, useState } from 'react';
import {
  X,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  CreditCard,
  Banknote
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { parseCurrencyInput } from '../constants';
import { getAccountVinculo } from '../services/financeAggregator';
import {
  analyzePurchase,
  PurchaseVerdict
} from '../services/purchaseAdvisorService';

interface Props {
  onClose: () => void;
}

const verdictUi: Record<
  PurchaseVerdict,
  { badge: string; icon: React.ReactNode; box: string }
> = {
  go: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 size={18} className="text-emerald-600" />,
    box: 'border-emerald-200 bg-emerald-50/80'
  },
  careful: {
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    icon: <AlertTriangle size={18} className="text-amber-600" />,
    box: 'border-amber-200 bg-amber-50/80'
  },
  wait: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <Clock size={18} className="text-slate-500" />,
    box: 'border-slate-200 bg-slate-50'
  }
};

export const CanIBuyModal: React.FC<Props> = ({ onClose }) => {
  const {
    accounts,
    transactions,
    categories,
    debts,
    shows,
    settings,
    isBlurred,
    getAccountBalance,
    getDebtProgress
  } = useFinance();

  const [rawAmount, setRawAmount] = useState('');
  const amount = parseCurrencyInput(rawAmount);

  const cashAccountIds = useMemo(
    () =>
      accounts
        .filter(
          a =>
            a.enabled !== false &&
            a.type !== 'savings' &&
            getAccountVinculo(a) !== 'MUSICO' &&
            a.scope !== 'BUSINESS'
        )
        .map(a => a.id),
    [accounts]
  );

  const advice = useMemo(
    () =>
      analyzePurchase({
        amount,
        accounts,
        transactions,
        categories,
        debts,
        shows,
        financialSettings: settings.financialSettings,
        getAccountBalance,
        getDebtProgress,
        cashAccountIds
      }),
    [
      amount,
      accounts,
      transactions,
      categories,
      debts,
      shows,
      settings.financialSettings,
      getAccountBalance,
      getDebtProgress,
      cashAccountIds
    ]
  );

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const ui = verdictUi[advice.verdict];

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 sm:px-5 py-4 bg-white/95 backdrop-blur border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#003882] text-[#fcca00] flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Posso comprar?
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                Análise simples · essenciais e reserva protegidos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Quanto custa?
            </span>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="0,00"
                value={rawAmount}
                onChange={e => setRawAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003882]/30 focus:border-[#003882]"
              />
            </div>
          </label>

          {/* Limites rápidos */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <Banknote size={11} /> À vista seguro
              </p>
              <p className="text-sm font-black text-[#003882] mt-0.5">
                {formatCurrency(advice.spotPurchaseCapacity)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <CreditCard size={11} /> Parcela máx.
              </p>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                {formatCurrency(advice.maxMonthlyInstallment)}
                <span className="text-[10px] font-bold text-slate-500">/mês</span>
              </p>
            </div>
          </div>

          {amount > 0 && (
            <>
              <div className={`rounded-2xl border p-3.5 space-y-2 ${ui.box}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {ui.icon}
                    <span className="text-sm font-black text-slate-900">
                      {advice.verdictLabel}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${ui.badge}`}
                  >
                    {formatCurrency(amount)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{advice.summary}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#003882]" />
                  Melhor rota
                </p>
                {advice.routes.map(route => (
                  <div
                    key={route.id}
                    className={`rounded-2xl border px-3.5 py-3 ${
                      route.recommended
                        ? 'border-[#003882]/35 bg-[#003882]/5 ring-1 ring-[#003882]/10'
                        : 'border-slate-100 bg-white opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-black text-slate-900">{route.title}</p>
                      {route.recommended && (
                        <span className="shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#fcca00] text-blue-950">
                          Ideal
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {route.detail}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
            A análise usa só o que está cadastrado: caixa pessoal, contas a pagar, parcelas,
            reserva configurada e média de essenciais/lazer. Não inventa receitas futuras.
          </p>
        </div>
      </div>
    </div>
  );
};
