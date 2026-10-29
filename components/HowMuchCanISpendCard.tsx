import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";
import {
  ShoppingBag,
  ShieldCheck,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Sliders,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  PiggyBank,
} from "lucide-react";
import { useFinancialMetrics, SAFE_SPEND_ZERO_MESSAGE } from "../hooks/useFinancialMetrics";
import { useDebtMetrics } from "../hooks/useDebtMetrics";
import { getCurrentMonthPrefix, getLocalDateString } from "../services/dateUtils";
import {
  isNeutralCashFlowMovement,
  isGoalMovement,
  isIncomeGuaranteed,
} from "../services/aiReportService";
import { PERSONAL_ONLY_MODE } from "../services/personalOnlyMode";

export const HowMuchCanISpendCard: React.FC = () => {
  const { transactions, categories, shows, isBlurred } = useFinance();
  const effectiveShows = PERSONAL_ONLY_MODE ? [] : shows;

  const [showDetail, setShowDetail] = useState(false);

  const todayStr = useMemo(() => getLocalDateString(), []);
  const currentMonthPrefix = useMemo(
    () => getCurrentMonthPrefix(todayStr),
    [todayStr],
  );

  const { safeSpend } = useFinancialMetrics({
    monthPrefix: currentMonthPrefix,
    todayStr,
  });
  const debtMetrics = useDebtMetrics({ monthPrefix: currentMonthPrefix });

  const spotPurchaseCapacity = safeSpend.safeSpotPurchase;

  // Nova parcela mensal possível: folga após contas + dívidas do mês (sem inflar com reserva teórica)
  const maxPossibleInstallment = useMemo(() => {
    if (spotPurchaseCapacity <= 0) return 0;

    const monthsList: string[] = [];
    const [y, m] = currentMonthPrefix.split("-").map(Number);
    for (let i = 0; i < 6; i++) {
      const d = new Date(y, m - 1 + i, 1);
      monthsList.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }

    const nets = monthsList.map((monthStr, idx) => {
      const isCurrent = idx === 0;
      const inflow = transactions
        .filter(
          (t) =>
            t.type === "income" &&
            t.date?.startsWith(monthStr) &&
            (isCurrent ? t.status === "pending" && t.date >= todayStr : true) &&
            !isNeutralCashFlowMovement(t) &&
            !isGoalMovement(t) &&
            isIncomeGuaranteed(t, effectiveShows, categories),
        )
        .reduce((s, t) => s + Number(t.amount), 0);

      const outflowTx = transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.date?.startsWith(monthStr) &&
            (isCurrent ? t.status === "pending" && t.date >= todayStr : true) &&
            !isNeutralCashFlowMovement(t) &&
            !isGoalMovement(t),
        )
        .reduce((s, t) => s + Number(t.amount), 0);

      const debtDue =
        debtMetrics.scheduleByMonth[monthStr] ??
        (isCurrent ? debtMetrics.monthlyCommitment : 0);

      // Evita double-count: se outflow já inclui debt txs, debtDue via schedule
      // para meses futuros sem tx; no mês atual outflow já tem pendings.
      const outflows = isCurrent
        ? outflowTx
        : outflowTx > 0
          ? outflowTx
          : debtDue;

      return inflow - outflows;
    });

    const minNet = Math.min(...nets);
    if (minNet <= 0) return 0;
    return Math.max(0, Math.round(minNet * 0.7));
  }, [
    spotPurchaseCapacity,
    transactions,
    categories,
    effectiveShows,
    todayStr,
    currentMonthPrefix,
    debtMetrics,
  ]);

  const formatBRL = (val: number) => {
    if (isBlurred) return "R$ •••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const statusConfig = useMemo(() => {
    if (spotPurchaseCapacity > 1000) {
      return {
        badge: "Margem Disponível",
        badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
        textColor: "text-emerald-600",
        bgGradient: "from-emerald-50/50 to-indigo-50/30",
        borderColor: "border-emerald-200",
      };
    }
    if (spotPurchaseCapacity > 0) {
      return {
        badge: "Margem Limitada",
        badgeClass: "bg-amber-500/10 text-amber-700 border-amber-300",
        textColor: "text-amber-600",
        bgGradient: "from-amber-50/50 to-slate-50",
        borderColor: "border-amber-200",
      };
    }
    return {
      badge: "Sem Margem Segura",
      badgeClass: "bg-rose-500/10 text-rose-700 border-rose-300",
      textColor: "text-rose-600",
      bgGradient: "from-rose-50/50 to-slate-50",
      borderColor: "border-rose-200",
    };
  }, [spotPurchaseCapacity]);

  return (
    <section
      className={`rounded-[2.5rem] p-5 sm:p-6 bg-gradient-to-br ${statusConfig.bgGradient} bg-white border ${statusConfig.borderColor} shadow-sm space-y-5 relative overflow-hidden transition-all duration-300`}
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <ShoppingBag size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Posso gastar quanto?
              </h2>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
              >
                {statusConfig.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Limite seguro sem risco de desencaixe ou consumo da reserva
            </p>
          </div>
        </div>

        <Link
          to="/financial-settings"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition active:scale-95 shadow-xs"
          title="Ajustar Parâmetros da Reserva"
        >
          <Sliders size={16} />
        </Link>
      </div>

      <div className="p-4 sm:p-5 rounded-[2rem] bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
            Valor Disponível para Compra à Vista
          </span>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-3xl sm:text-4xl font-black tabular-nums tracking-tight ${statusConfig.textColor}`}
            >
              {formatBRL(spotPurchaseCapacity)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {spotPurchaseCapacity > 0
              ? "Teto máximo liberado hoje sem comprometer contas do mês ou a reserva."
              : SAFE_SPEND_ZERO_MESSAGE}
          </span>
        </div>

        <div className="sm:border-l sm:border-slate-100 sm:pl-5 pt-3 sm:pt-0 border-t border-slate-100 shrink-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1 flex items-center space-x-1">
            <CreditCard size={12} className="text-indigo-500" />
            <span>Nova Parcela Mensal Possível</span>
          </span>
          <span className="text-xl font-black text-indigo-600 tabular-nums block">
            {formatBRL(maxPossibleInstallment)}
            <span className="text-xs font-bold text-slate-400">/mês</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {maxPossibleInstallment > 0
              ? "Cabe no superávit mensal projetado"
              : "Sem folga mensal para novos parcelamentos"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
              <PiggyBank size={12} className="text-amber-500" />
              <span>Reserva Guardada</span>
            </span>
            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
              Real
            </span>
          </div>
          <div>
            <span className="text-sm font-black text-slate-800 tabular-nums block">
              {formatBRL(safeSpend.actualReserved)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Saldo efetivo em poupança/reserva (não a meta teórica)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
              <Calendar size={12} className="text-rose-500" />
              <span>Contas a Pagar no Mês</span>
            </span>
          </div>
          <div>
            <span className="text-sm font-black text-rose-600 tabular-nums block">
              {formatBRL(safeSpend.pendingBillsRestOfMonth)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Pendências até o fim do mês ativo
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider flex items-center space-x-1">
              <Lock size={12} className="text-indigo-500" />
              <span>Parcelas de Dívidas</span>
            </span>
          </div>
          <div>
            <span className="text-sm font-black text-indigo-600 tabular-nums block">
              {formatBRL(safeSpend.debtInstallmentsActiveMonth)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Que vencem neste mês (cronograma real)
            </span>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1.5">
        <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
          <Info size={14} className="text-indigo-600 shrink-0" />
          <span>Como este limite é calculado com segurança:</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Saldo operacional ? contas a pagar do mês ? parcelas de dívidas do mês.
          A reserva efetivamente guardada ({formatBRL(safeSpend.actualReserved)})
          fica fora do caixa operacional e não usa a meta teórica de 6 meses.
        </p>
        <p className="text-[10px] font-medium text-amber-600 flex items-center space-x-1 pt-0.5">
          <ShieldCheck size={12} className="shrink-0" />
          <span>
            Receitas incertas ou não confirmadas foram ignoradas no cálculo de
            novas parcelas.
          </span>
        </p>
      </div>

      <div>
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 font-bold text-xs flex items-center justify-between transition active:scale-98"
        >
          <span className="flex items-center space-x-1.5">
            <Sparkles size={14} className="text-indigo-500" />
            <span>
              {showDetail
                ? "Ocultar memória de cálculo detalhada"
                : "Ver memória de cálculo detalhada passo a passo"}
            </span>
          </span>
          {showDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showDetail && (
          <div className="mt-3 p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-3 animate-fade-in ">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Auditoria Matemática do Limite
            </span>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500">
                  (+) Saldo Operacional Atual
                </span>
                <span className="font-bold text-slate-800">
                  {formatBRL(safeSpend.memory.operationalBalance)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500">
                  (-) Contas a Pagar no Restante do Mês
                </span>
                <span className="font-bold text-rose-600">
                  -{formatBRL(safeSpend.memory.pendingBillsRestOfMonth)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500">
                  (-) Parcelas de Dívidas do Mês Ativo
                </span>
                <span className="font-bold text-rose-600">
                  -{formatBRL(safeSpend.memory.debtInstallmentsActiveMonth)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1.5">
                <span className="text-slate-500">
                  Reserva Efetivamente Guardada (fora do operacional)
                </span>
                <span className="font-bold text-amber-600">
                  {formatBRL(safeSpend.memory.actualReserved)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 font-black text-sm">
                <span className="text-slate-800">
                  (=) Limite Seguro para Compra à Vista
                </span>
                <span className={statusConfig.textColor}>
                  {formatBRL(safeSpend.memory.result)}
                </span>
              </div>
            </div>

            {safeSpend.message && (
              <p className="text-[11px] text-rose-600 font-medium pt-1 border-t border-slate-100">
                {safeSpend.message}
              </p>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Compromisso de dívidas neste mês:{" "}
                {formatBRL(debtMetrics.monthlyCommitment)}
              </span>
              <Link
                to="/financial-settings"
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center space-x-1"
              >
                <span>Alterar parâmetros</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
