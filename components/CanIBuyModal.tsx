import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  CreditCard,
  Banknote,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
  TrendingUp,
  Shield
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
  const navigate = useNavigate();
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
  const [showHow, setShowHow] = useState(true);
  const [showMath, setShowMath] = useState(false);
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

  const openSettings = () => {
    onClose();
    navigate('/mais?tab=financial');
  };

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
                Média de ganho · mês seguro · à vista vs parcelas
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
          {/* Como usar */}
          <div className="rounded-2xl border border-blue-100 bg-[#003882]/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHow(v => !v)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left"
            >
              <span className="text-xs font-black text-[#003882] flex items-center gap-1.5">
                <HelpCircle size={14} />
                Como usar (leia uma vez)
              </span>
              {showHow ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showHow && (
              <div className="px-3.5 pb-3.5 text-[11px] text-slate-600 space-y-1.5 leading-relaxed border-t border-blue-100/80 pt-2.5">
                <p>
                  1. Olhe os números abaixo: <strong>média de ganho</strong>,{' '}
                  <strong>mês seguro</strong>, <strong>à vista</strong> e{' '}
                  <strong>parcela máx.</strong>
                </p>
                <p>
                  2. Digite o preço. O app diz se é melhor <strong>à vista</strong> ou{' '}
                  <strong>em quantas vezes</strong>, sem furar o essencial nem a reserva
                  em construção.
                </p>
                <p>
                  3. “Mês seguro” = essenciais + guardar a reserva de{' '}
                  {advice.targetReserveMonths} meses + parcelas que você já tem. A reserva{' '}
                  <strong>não precisa estar completa</strong> para liberar compra.
                </p>
                <button
                  type="button"
                  onClick={openSettings}
                  className="inline-flex items-center gap-1 font-bold text-[#003882] hover:underline pt-1"
                >
                  <Sliders size={12} />
                  Ajustar essenciais, lazer e meses de reserva
                </button>
              </div>
            )}
          </div>

          {/* Base do cálculo — sempre visível */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <TrendingUp size={11} /> Média de ganho
              </p>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {formatCurrency(advice.avgIncomeLast3Months)}
              </p>
              <p className="text-[9px] text-slate-500">últimos 3 meses</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <Shield size={11} /> Mês seguro
              </p>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {formatCurrency(advice.safeMonthlyNeed)}
              </p>
              <p className="text-[9px] text-slate-500">essencial + reserva + parcelas</p>
            </div>
            <div className="rounded-2xl border border-[#003882]/15 bg-[#003882]/5 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase text-[#003882] flex items-center gap-1">
                <Banknote size={11} /> À vista agora
              </p>
              <p className="text-sm font-black text-[#003882] mt-0.5">
                {formatCurrency(advice.spotPurchaseCapacity)}
              </p>
              <p className="text-[9px] text-slate-500">caixa − a pagar − colchão</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase text-violet-800 flex items-center gap-1">
                <CreditCard size={11} /> Parcela máx.
              </p>
              <p className="text-sm font-black text-violet-900 mt-0.5">
                {formatCurrency(advice.maxMonthlyInstallment)}
                <span className="text-[10px] font-bold text-violet-600">/mês</span>
              </p>
              <p className="text-[9px] text-slate-500">
                folga {formatCurrency(advice.monthlySurplus)}
              </p>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Quanto custa o que você quer?
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
            {advice.spotPurchaseCapacity > 0 && (
              <p className="text-[10px] text-slate-500">
                Dica: valores até{' '}
                <strong className="text-[#003882]">
                  {formatCurrency(advice.spotPurchaseCapacity)}
                </strong>{' '}
                tendem a liberar à vista.
              </p>
            )}
          </label>

          {amount > 0 && (
            <>
              <div className={`rounded-2xl border p-3.5 space-y-2 ${ui.box}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {ui.icon}
                    <span className="text-sm font-black text-slate-900 truncate">
                      {advice.verdictLabel}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${ui.badge}`}
                  >
                    {formatCurrency(amount)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{advice.summary}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#003882]" />
                  À vista ou parcelado?
                </p>
                {advice.routes.map(route => (
                  <div
                    key={route.id}
                    className={`rounded-2xl border px-3.5 py-3 ${
                      route.recommended
                        ? 'border-[#003882]/35 bg-[#003882]/5 ring-1 ring-[#003882]/10'
                        : 'border-slate-100 bg-white opacity-85'
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

          {/* Contas da conta */}
          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMath(v => !v)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left bg-slate-50/80"
            >
              <span className="text-[11px] font-bold text-slate-600">
                Ver de onde saem os números
              </span>
              {showMath ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showMath && (
              <ul className="px-3.5 py-3 space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100">
                {advice.howItWorks.map((line, i) => (
                  <li key={i} className="leading-snug flex gap-2">
                    <span className="text-slate-300 shrink-0">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
