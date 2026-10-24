import React, { useMemo } from 'react';
import { CreditCard, CalendarClock, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { getAccountVinculo } from '../services/financeAggregator';
import { getPurchaseCapacity } from '../services/purchaseAdvisorService';
import { computeDebtsMonthInsight, DebtFitTone } from '../services/debtsInsightService';

const toneUi: Record<
  DebtFitTone,
  { box: string; badge: string; icon: React.ReactNode }
> = {
  ok: {
    box: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/70',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 size={16} className="text-emerald-600" />
  },
  tight: {
    box: 'border-amber-200 bg-gradient-to-br from-white to-amber-50/70',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    icon: <AlertTriangle size={16} className="text-amber-600" />
  },
  heavy: {
    box: 'border-rose-200 bg-gradient-to-br from-white to-rose-50/70',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: <ShieldAlert size={16} className="text-rose-600" />
  }
};

export const DebtsFitBanner: React.FC = () => {
  const {
    debts,
    transactions,
    accounts,
    categories,
    shows,
    settings,
    isBlurred,
    getAccountBalance,
    getDebtProgress
  } = useFinance();

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

  const capacity = useMemo(
    () =>
      getPurchaseCapacity({
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

  const insight = useMemo(
    () =>
      computeDebtsMonthInsight({
        debts,
        transactions,
        getDebtProgress,
        safeCashHeadroom: capacity.spotPurchaseCapacity
      }),
    [debts, transactions, getDebtProgress, capacity.spotPurchaseCapacity]
  );

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const ui = toneUi[insight.fitTone];

  return (
    <section
      className={`rounded-3xl border shadow-sm p-4 sm:p-5 space-y-3 ${ui.box}`}
      aria-label="Dívidas deste mês"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#003882] text-[#fcca00] flex items-center justify-center shrink-0">
            <CreditCard size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Dívidas inteligentes
            </p>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Cabem no mês?
            </h2>
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${ui.badge}`}
        >
          {ui.icon}
          {insight.fitLabel}
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">{insight.fitHint}</p>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/80 border border-slate-100 px-2.5 py-2.5">
          <p className="text-[9px] font-bold uppercase text-slate-500">Ativas</p>
          <p className="text-sm font-black text-slate-900 mt-0.5">{insight.activeCount}</p>
        </div>
        <div className="rounded-2xl bg-white/80 border border-slate-100 px-2.5 py-2.5">
          <p className="text-[9px] font-bold uppercase text-rose-700">A pagar (mês)</p>
          <p className="text-sm font-black text-rose-700 mt-0.5 truncate">
            {formatCurrency(insight.monthInstallmentsPending)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/80 border border-slate-100 px-2.5 py-2.5">
          <p className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-0.5">
            <CalendarClock size={10} /> Próxima
          </p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            {insight.nextDueLabel || '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
        <span className="text-slate-500">Saldo devedor total</span>
        <span className="font-black text-slate-800">
          {formatCurrency(insight.totalRemaining)}
        </span>
      </div>
    </section>
  );
};
