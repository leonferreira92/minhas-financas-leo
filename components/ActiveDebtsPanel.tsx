import React, { useMemo, useEffect } from "react";
import { useFinance } from "../context/FinanceContext";
import {
  CreditCard,
  Calendar,
  ShieldCheck,
  TrendingDown,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  Info,
  Music,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { Debt } from "../types";
import { formatMonthYearBR } from "../services/aiReportService";
import {
  isSomLeoDebtOrTransaction,
  isVinyDebtOrTransaction,
  VINY_MUSIC_START_INSTALLMENT,
  VINY_MUSIC_END_INSTALLMENT,
  VINY_MONTHLY_MUSIC_FIXED,
  VINY_MUSIC_MAX_CEILING,
  reconcileUnifiedVinyDebt,
} from "../services/financeAggregator";
import { PERSONAL_ONLY_MODE } from "../services/personalOnlyMode";
import { StorageService } from "../services/storageService";
import {
  saveDebtToFirestore,
  deleteDebtFromFirestore,
  saveTransactionToFirestore,
  deleteTransactionFromFirestore,
} from "../services/firebaseService";
import { DebtModal } from "./debts/DebtModal";

interface ActiveDebtItem {
  debt: Debt;
  remainingAmount: number;
  installmentAmount: number;
  paidCount: number;
  remainingCount: number;
  totalCount: number;
  endMonthYear: string;
  endDateRaw: string;
}

interface Props {
  onSelectDebt?: (debtId: string) => void;
  onNewDebt?: () => void;
  /** Quando true, omite o card grande de compromisso (já exibido no Hero da página). */
  compactSummary?: boolean;
}

export const ActiveDebtsPanel: React.FC<Props> = ({
  onSelectDebt,
  compactSummary = false,
}) => {
  const {
    debts,
    transactions,
    isBlurred,
    getDebtProgress,
    refreshData,
    currentUser,
  } = useFinance();
  const [editingDebt, setEditingDebt] = React.useState<Debt | null>(null);

  // Unificação automática do contrato único'Viny' e remoção do card duplicado'Som Léo'
  useEffect(() => {
    if (!Array.isArray(debts) || debts.length === 0) return;

    const result = reconcileUnifiedVinyDebt(debts, transactions);

    if (result.changed) {
      StorageService.saveDebts(result.debts);
      StorageService.saveTransactions(result.transactions);

      if (currentUser) {
        result.deletedDebtIds.forEach((delDebtId) => {
          deleteDebtFromFirestore(currentUser.uid, delDebtId);
        });
        result.deletedTransactionIds.forEach((delTxId) => {
          deleteTransactionFromFirestore(currentUser.uid, delTxId);
        });
        result.debts.forEach((d) => {
          if (isVinyDebtOrTransaction(d)) {
            saveDebtToFirestore(currentUser.uid, d);
          }
        });
        result.transactions.forEach((t) => {
          const parent = result.debts.find((d) => d.id === t.debtId);
          if (isVinyDebtOrTransaction(parent, t)) {
            saveTransactionToFirestore(currentUser.uid, t);
          }
        });
      }

      refreshData();
    }
  }, [debts, transactions, currentUser, refreshData]);

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    if (isBlurred) return "R$ •••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const parsedDebtsData = useMemo(() => {
    const items: ActiveDebtItem[] = [];

    debts.forEach((debt) => {
      // Garantir que o card duplicado'Som Léo' nunca seja renderizado
      if (isSomLeoDebtOrTransaction(debt)) {
        return;
      }

      const { remaining } = getDebtProgress(debt.id);

      // REGRA OBRIGATÓRIA: Não considerar dívidas com saldo restante igual a R$0 como obrigações futuras
      if (remaining <= 0.05) {
        return;
      }

      const linkedTxs = transactions.filter((t) => t.debtId === debt.id);
      const paidTxs = linkedTxs.filter((t) => t.status === "paid");
      const pendingTxs = linkedTxs
        .filter((t) => t.status === "pending")
        .sort((a, b) => a.date.localeCompare(b.date));

      // Contagem de parcelas
      const totalCount =
        debt.installmentCount || (linkedTxs.length > 0 ? linkedTxs.length : 1);
      const paidCount = paidTxs.length;
      const remainingCount =
        pendingTxs.length > 0
          ? pendingTxs.length
          : Math.max(0, totalCount - paidCount);

      // Valor da parcela
      let installmentAmount = 0;
      if (debt.installmentAmount && debt.installmentAmount > 0) {
        installmentAmount = Number(debt.installmentAmount);
      } else if (pendingTxs.length > 0 && Number(pendingTxs[0].amount) > 0) {
        installmentAmount = Number(pendingTxs[0].amount);
      } else if (totalCount > 0 && Number(debt.totalAmount) > 0) {
        installmentAmount = Number(debt.totalAmount) / totalCount;
      }

      // Mês previsto para término
      let endMonthYear = "não informado";
      let endDateRaw = "";

      if (pendingTxs.length > 0) {
        const lastTx = pendingTxs[pendingTxs.length - 1];
        endDateRaw = lastTx.date;
        endMonthYear = formatMonthYearBR(lastTx.date.slice(0, 7));
      } else if (debt.startDate && remainingCount > 0) {
        const start = new Date(debt.startDate + "T12:00:00");
        const estEnd = new Date(
          start.getFullYear(),
          start.getMonth() + totalCount - 1,
          1,
        );
        endDateRaw = estEnd.toISOString().slice(0, 10);
        endMonthYear = formatMonthYearBR(estEnd.toISOString().slice(0, 7));
      }

      items.push({
        debt,
        remainingAmount: remaining,
        installmentAmount,
        paidCount,
        remainingCount,
        totalCount,
        endMonthYear,
        endDateRaw,
      });
    });

    // Ordenar pelas dívidas que terminam primeiro
    items.sort((a, b) => {
      if (!a.endDateRaw) return 1;
      if (!b.endDateRaw) return -1;
      return a.endDateRaw.localeCompare(b.endDateRaw);
    });

    // -------------------------------------------------------------------------
    // RESUMO: PARCELAS ATUAIS POR MÊS E CRONOGRAMA DE QUEDA
    // -------------------------------------------------------------------------
    const totalCommittedPerMonth = items.reduce(
      (sum, item) => sum + item.installmentAmount,
      0,
    );

    // Agrupar dívidas por data/mês de término para calcular como o total mensal cai
    const reliefTimelineMap: Record<
      string,
      { monthYear: string; debtsEnding: ActiveDebtItem[]; reliefAmount: number }
    > = {};

    items.forEach((item) => {
      if (item.endMonthYear && item.endMonthYear !== "não informado") {
        const key = item.endDateRaw.slice(0, 7);
        if (!reliefTimelineMap[key]) {
          reliefTimelineMap[key] = {
            monthYear: item.endMonthYear,
            debtsEnding: [],
            reliefAmount: 0,
          };
        }
        reliefTimelineMap[key].debtsEnding.push(item);
        reliefTimelineMap[key].reliefAmount += item.installmentAmount;
      }
    });

    const reliefMilestones = Object.entries(reliefTimelineMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => ({ key, ...data }));

    // Calcular o saldo remanescente mensal após cada quitação
    let runningCommitted = totalCommittedPerMonth;
    const reliefSchedule = reliefMilestones.map((m) => {
      const drop = m.reliefAmount;
      runningCommitted = Math.max(0, runningCommitted - drop);
      return {
        monthYear: m.monthYear,
        debtsNames: m.debtsEnding.map((d) => d.debt.name).join(", "),
        reliefAmount: drop,
        newCommittedPerMonth: runningCommitted,
      };
    });

    return {
      items,
      totalCommittedPerMonth,
      reliefSchedule,
    };
  }, [debts, transactions, isBlurred, getDebtProgress]);

  if (parsedDebtsData.items.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm text-center py-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#10B981] flex items-center justify-center mx-auto mb-3">
          <ShieldCheck size={28} />
        </div>
        <h3 className="text-base font-black text-slate-900">
          Nenhuma Dívida Ativa
        </h3>
        <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
          Todas as dívidas cadastradas estão quitadas com saldo R$ 0,00 ou não
          há obrigações ativas registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------------------- */}
      {/* CARD DE RESUMO / CRONOGRAMA DE ALÍVIO */}
      {/* --------------------------------------------------------------------- */}
      {(!compactSummary || parsedDebtsData.reliefSchedule.length > 0) && (
        <div className="bg-white text-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            {!compactSummary && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 block mb-1">
                      Comprometimento mensal
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-slate-900">
                      Parcelas atuais por mês:{" "}
                      {formatBRL(parsedDebtsData.totalCommittedPerMonth)}
                    </h2>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-[#0F388A] border border-blue-100 w-fit">
                    {parsedDebtsData.items.length}{" "}
                    {parsedDebtsData.items.length === 1
                      ? "dívida ativa"
                      : "dívidas ativas"}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Soma exata das parcelas mensais de todos os passivos com saldo
                  devedor pendente. Dívidas com saldo R$ 0,00 são
                  desconsideradas.
                </p>
              </>
            )}

            {parsedDebtsData.reliefSchedule.length > 0 && (
              <div
                className={`${compactSummary ? "" : "pt-4 border-t border-slate-100 "}space-y-2.5`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                  Cronograma de Alívio do Fluxo de Caixa:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {parsedDebtsData.reliefSchedule.map((milestone, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-[#0F388A]">
                          {milestone.monthYear}
                        </span>
                        <span className="text-[10px] font-black text-[#10B981] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                          -{formatBRL(milestone.reliefAmount)}/mês
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 truncate">
                        Fim de:{" "}
                        <strong className="text-slate-900">
                          {milestone.debtsNames}
                        </strong>
                      </p>

                      <div className="pt-1 text-[10px] text-slate-600 border-t border-slate-200 flex items-center justify-between gap-2">
                        <span>Parcelas caem para:</span>
                        <strong
                          className={`tabular-nums font-black ${
                            milestone.newCommittedPerMonth === 0
                              ? "text-[#10B981]"
                              : "text-slate-900"
                          }`}
                        >
                          {milestone.newCommittedPerMonth === 0
                            ? "R$ 0,00 (Quitado!)"
                            : formatBRL(milestone.newCommittedPerMonth)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* PAINEL DETALHADO DE CADA DÍVIDA ATIVA */}
      {/* --------------------------------------------------------------------- */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Detalhamento Individual das Dívidas
          </h3>
          <span className="text-[11px] text-slate-600">
            Total Comprometido:{" "}
            <strong className="text-slate-900">
              {formatBRL(parsedDebtsData.totalCommittedPerMonth)}/mês
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {parsedDebtsData.items.map((item) => {
            const pct =
              item.totalCount > 0
                ? (item.paidCount / item.totalCount) * 100
                : 0;
            const isViny = isVinyDebtOrTransaction(item.debt);
            const vinyMonthlyMusic = Math.min(
              item.installmentAmount,
              VINY_MONTHLY_MUSIC_FIXED,
            );
            const vinyMonthlyPersonal = Math.max(
              0,
              Math.round((item.installmentAmount - vinyMonthlyMusic) * 100) /
                100,
            );

            return (
              <div
                key={item.debt.id}
                onClick={() => onSelectDebt && onSelectDebt(item.debt.id)}
                className={`bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm transition hover:shadow-md ${onSelectDebt ? "cursor-pointer active:scale-[0.99]" : ""}`}
              >
                {/* TOPO: NOME, TIPO E PREVISÃO DE TÉRMINO */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#EF4444] flex items-center justify-center shrink-0">
                      <CreditCard size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-slate-900 leading-tight">
                          {item.debt.name}
                        </h4>
                        {!PERSONAL_ONLY_MODE &&
                          (isViny ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-purple-500/15 text-purple-600 border border-purple-500/30">
                              <Music size={10} />
                              <span>
                                Rateio DRE: Música {formatBRL(vinyMonthlyMusic)}
                                {vinyMonthlyPersonal > 0
                                  ? ` + Pessoal ${formatBRL(vinyMonthlyPersonal)}`
                                  : " (Som)"}
                              </span>
                            </span>
                          ) : item.debt.costCenterMode === "TOTAL_BUSINESS" ||
                            item.debt.scope === "BUSINESS" ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-purple-500/15 text-purple-600 border border-purple-500/30">
                              <Music size={10} />
                              <span>
                                Música •{" "}
                                {item.debt.musicSubcategory ||
                                  "Equipamentos / Instrumentos"}
                              </span>
                            </span>
                          ) : item.debt.costCenterMode ===
                            "INSTALLMENT_RANGE" ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-500/15 text-amber-600 border border-amber-500/30">
                              <Music size={10} />
                              <span>
                                Parcelas{" "}
                                {item.debt.businessStartInstallment || 1}-
                                {item.debt.businessEndInstallment ||
                                  item.totalCount}{" "}
                                na Música (
                                {item.debt.musicSubcategory ||
                                  "Equipamentos / Instrumentos"}
                                )
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 text-slate-500">
                              <User size={10} />
                              <span>Pessoal</span>
                            </span>
                          ))}
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.debt.type === "bank"
                            ? "Empréstimo Bancário"
                            : item.debt.type === "car_financing"
                              ? "Financiamento Veículo"
                              : item.debt.type === "card_installment"
                                ? "Cartão Parcelado"
                                : "Acordo Geral"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.paidCount} de {item.totalCount} parcelas pagas
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDebt(item.debt);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-[#0F388A] hover:bg-blue-100 text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 transition active:scale-95"
                      title="Editar dívida"
                    >
                      <SlidersHorizontal size={12} />
                      <span>Editar</span>
                    </button>

                    <div className="sm:text-right">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                        Término previsto
                      </span>
                      <span className="text-xs font-black text-[#0F388A] block">
                        {item.endMonthYear}
                      </span>
                    </div>
                  </div>
                </div>

                {/* GRID DE VALORES: SALDO RESTANTE, PARCELA, PARCELAS RESTANTES, PAGAS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5">
                  {/* Saldo Restante */}
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Saldo Restante
                    </span>
                    <span className="text-sm font-black text-[#EF4444] tabular-nums block mt-1">
                      {formatBRL(item.remainingAmount)}
                    </span>
                  </div>

                  {/* Valor da Parcela */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Valor da Parcela
                    </span>
                    <span className="text-sm font-black text-slate-900 tabular-nums block mt-1">
                      {formatBRL(item.installmentAmount)}
                    </span>
                  </div>

                  {/* Parcelas Restantes */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Parcelas Restantes
                    </span>
                    <span className="text-sm font-black text-slate-900 tabular-nums block mt-1">
                      {item.remainingCount}{" "}
                      {item.remainingCount === 1 ? "restante" : "restantes"}
                    </span>
                  </div>

                  {/* Parcelas Já Pagas */}
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">
                      Parcelas Já Pagas
                    </span>
                    <span className="text-sm font-black text-[#10B981] tabular-nums block mt-1">
                      {item.paidCount} {item.paidCount === 1 ? "paga" : "pagas"}
                    </span>
                  </div>
                </div>

                {!PERSONAL_ONLY_MODE && isViny && (
                  <div className="mb-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-black text-purple-600 uppercase tracking-wider block text-[10px]">
                        Rateio Dinâmico Viny • Parcelas{" "}
                        {VINY_MUSIC_START_INSTALLMENT} a{" "}
                        {VINY_MUSIC_END_INSTALLMENT} (Fev a Nov)
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Destina{" "}
                        <strong>{formatBRL(vinyMonthlyMusic)}/parcela</strong>{" "}
                        para a <strong>DRE da Música (Equipamentos/Som)</strong>
                        {""}
                        {vinyMonthlyPersonal > 0
                          ? `e o excedente de ${formatBRL(vinyMonthlyPersonal)}/parcela + demais meses para PESSOAL.`
                          : "• Parcelas 1 e 12 alocadas em PESSOAL."}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-600">
                    <span>Progresso</span>
                    <span className="tabular-nums font-bold text-slate-900">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0F388A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingDebt && (
        <DebtModal
          initialDebt={editingDebt}
          onClose={() => setEditingDebt(null)}
        />
      )}
    </div>
  );
};
