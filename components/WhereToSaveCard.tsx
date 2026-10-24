import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Target,
  ChevronRight,
  PiggyBank
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  computeSavingsInsights,
  InsightTone
} from '../services/savingsInsightsService';

const toneUi: Record<
  InsightTone,
  { icon: React.ReactNode; border: string; badge: string }
> = {
  good: {
    icon: <CheckCircle2 size={14} className="text-emerald-600" />,
    border: 'border-emerald-100 bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800'
  },
  warn: {
    icon: <AlertTriangle size={14} className="text-amber-600" />,
    border: 'border-amber-100 bg-amber-50/60',
    badge: 'bg-amber-100 text-amber-900'
  },
  action: {
    icon: <Target size={14} className="text-[#003882]" />,
    border: 'border-blue-100 bg-[#003882]/5',
    badge: 'bg-[#003882]/10 text-[#003882]'
  }
};

export const WhereToSaveCard: React.FC = () => {
  const navigate = useNavigate();
  const {
    transactions,
    categories,
    debts,
    accounts,
    settings,
    isBlurred,
    getAccountBalance
  } = useFinance();

  const insights = useMemo(
    () =>
      computeSavingsInsights({
        transactions,
        categories,
        debts,
        accounts,
        financialSettings: settings.financialSettings,
        getAccountBalance
      }),
    [
      transactions,
      categories,
      debts,
      accounts,
      settings.financialSettings,
      getAccountBalance
    ]
  );

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const potentialTotal = insights.tips.reduce(
    (s, t) => s + (t.potentialMonthlySaving || 0),
    0
  );

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 space-y-4"
      aria-label="Onde economizar"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <Lightbulb size={13} className="text-[#fcca00]" />
            <span>Relatório inteligente</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
            Onde economizar
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            {insights.headline}
          </p>
        </div>
        {potentialTotal > 0 && (
          <div className="shrink-0 text-right rounded-2xl bg-[#fcca00]/20 border border-[#fcca00]/40 px-2.5 py-1.5">
            <p className="text-[9px] font-bold uppercase text-amber-900">Pode sobrar</p>
            <p className="text-sm font-black text-blue-950">
              ~{formatCurrency(potentialTotal)}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {insights.tips.map(tip => {
          const ui = toneUi[tip.tone];
          return (
            <div
              key={tip.id}
              className={`rounded-2xl border px-3.5 py-3 ${ui.border}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{ui.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-black text-slate-900">{tip.title}</p>
                    {tip.potentialMonthlySaving != null && tip.potentialMonthlySaving > 0 && (
                      <span
                        className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${ui.badge}`}
                      >
                        ~{formatCurrency(tip.potentialMonthlySaving)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    {tip.detail}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 flex items-center gap-1">
          <PiggyBank size={11} />
          Baseado no seu histórico — sem inventar números
        </p>
        <button
          type="button"
          onClick={() => navigate('/gastos')}
          className="text-[11px] font-bold text-[#003882] hover:underline inline-flex items-center gap-0.5"
        >
          Ver gráficos
          <ChevronRight size={13} />
        </button>
      </div>
    </section>
  );
};
