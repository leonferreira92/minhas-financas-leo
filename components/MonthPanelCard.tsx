import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  TrendingDown,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  CircleAlert,
  ShoppingBag,
  Wallet
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useMonthInsights } from '../hooks/useMonthInsights';
import { MonthTrafficLight } from '../services/monthPanelService';
import { CanIBuyModal } from './CanIBuyModal';

const trafficStyles: Record<
  MonthTrafficLight,
  { ring: string; badge: string; dot: string; value: string }
> = {
  green: {
    ring: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/80',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    value: 'text-emerald-700'
  },
  yellow: {
    ring: 'border-amber-200 bg-gradient-to-br from-white to-amber-50/80',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    dot: 'bg-amber-400',
    value: 'text-amber-800'
  },
  red: {
    ring: 'border-rose-200 bg-gradient-to-br from-white to-rose-50/70',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    value: 'text-rose-700'
  }
};

export const MonthPanelCard: React.FC = () => {
  const navigate = useNavigate();
  const { isBlurred } = useFinance();
  const { monthPanel: m } = useMonthInsights();
  const [canBuyOpen, setCanBuyOpen] = useState(false);
  const style = trafficStyles[m.traffic];

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const monthTitle = m.monthLabel.charAt(0).toUpperCase() + m.monthLabel.slice(1);

  return (
    <>
      <section
        className={`rounded-3xl border shadow-sm p-4 sm:p-5 space-y-4 ${style.ring}`}
        aria-label="Painel do mês"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <CalendarDays size={13} className="text-[#003882]" />
              <span>Painel do mês</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
              {monthTitle}
            </h2>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${style.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {m.trafficLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/90 border border-slate-100 px-3 py-3">
            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wide flex items-center gap-1">
              <Wallet size={11} /> Saldo atual
            </p>
            <p className="text-xl font-black text-slate-900 mt-1 tracking-tight truncate">
              {formatCurrency(m.cashToday)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Contas pagas · sem reserva</p>
          </div>
          <div className="rounded-2xl bg-white/90 border border-slate-100 px-3 py-3">
            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">
              Previsto no mês
            </p>
            <p className={`text-xl font-black mt-1 tracking-tight truncate ${style.value}`}>
              {formatCurrency(m.projectedEndBalance)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Atual + a receber − a pagar</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-snug flex items-start gap-1.5">
          {m.traffic === 'red' ? (
            <CircleAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
          ) : m.projectedEndBalance >= m.cashToday ? (
            <TrendingUp size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <TrendingDown size={14} className="text-amber-600 shrink-0 mt-0.5" />
          )}
          <span>{m.trafficHint}</span>
        </p>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/80 border border-slate-100 px-2.5 py-2.5">
            <p className="text-[9px] font-bold uppercase text-emerald-700 tracking-wide flex items-center gap-0.5">
              <ArrowUpRight size={10} /> A receber
            </p>
            <p className="text-sm font-black text-emerald-700 mt-0.5 truncate">
              {formatCurrency(m.pendingIncome)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 border border-slate-100 px-2.5 py-2.5">
            <p className="text-[9px] font-bold uppercase text-rose-700 tracking-wide flex items-center gap-0.5">
              <ArrowDownRight size={10} /> A pagar
            </p>
            <p className="text-sm font-black text-rose-700 mt-0.5 truncate">
              {formatCurrency(m.pendingExpense)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 border border-slate-100 px-2.5 py-2.5">
            <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wide">Pago no mês</p>
            <p
              className={`text-sm font-black mt-0.5 truncate ${
                m.monthNetSoFar >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(m.monthNetSoFar)}
            </p>
          </div>
        </div>

        {m.overdueExpense > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900 font-medium">
            Inclui {formatCurrency(m.overdueExpense)} em despesas atrasadas (ainda pendentes).
          </div>
        )}

        <button
          type="button"
          onClick={() => setCanBuyOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-[#003882] hover:bg-[#002d6c] text-white font-extrabold text-sm transition active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
        >
          <ShoppingBag size={16} className="text-[#fcca00]" />
          Posso comprar?
        </button>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
          <p className="text-[11px] text-slate-500">
            {m.savingsTotal > 0 ? (
              <>
                Reserva:{' '}
                <span className="font-bold text-slate-700">{formatCurrency(m.savingsTotal)}</span>
              </>
            ) : (
              'Mesmos números do saldo no topo'
            )}
          </p>
          <button
            type="button"
            onClick={() => navigate('/lancamentos')}
            className="text-[11px] font-bold text-[#003882] hover:underline inline-flex items-center gap-0.5"
          >
            Ver lançamentos
            <ChevronRight size={13} />
          </button>
        </div>
      </section>

      {canBuyOpen && <CanIBuyModal onClose={() => setCanBuyOpen(false)} />}
    </>
  );
};
