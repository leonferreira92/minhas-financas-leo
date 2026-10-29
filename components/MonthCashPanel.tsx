import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { computeMonthCashPanel } from "../services/monthCashPanel";
import { getCurrentMonthPrefix } from "../services/dateUtils";

/**
 * Painel do mês — Saldo agora · A receber · A pagar · Previsto
 * (alinhado ao Extrato do mês; inclui atrasadas em a pagar).
 */
export const MonthCashPanel: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, transactions, getAccountBalance, isBlurred } = useFinance();
  const [openList, setOpenList] = useState<"receive" | "pay" | null>(null);

  const monthPrefix = useMemo(() => getCurrentMonthPrefix(), []);

  const panel = useMemo(
    () =>
      computeMonthCashPanel({
        accounts,
        transactions,
        getAccountBalance,
        monthPrefix,
      }),
    [accounts, transactions, getAccountBalance, monthPrefix],
  );

  const formatCurrency = (val: number) => {
    if (isBlurred) return "R$ •••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatMonthLabel = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };

  const openExtratoPending = () => {
    navigate(`/lancamentos?status=pending&month=${monthPrefix}`);
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 text-slate-800">
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Detalhe do mês
          </h3>
          <p className="text-[10px] text-slate-400 font-medium capitalize mt-0.5">
            {formatMonthLabel(monthPrefix)} · mesmo filtro do Extrato
          </p>
        </div>
        <button
          type="button"
          onClick={openExtratoPending}
          className="text-[11px] text-[#0F388A] hover:underline font-bold flex items-center gap-0.5"
        >
          <span>Ver no extrato</span>
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <Wallet size={12} className="text-blue-700" />
            Saldo agora
          </div>
          <p className="text-lg font-black text-slate-900 tabular-nums">
            {formatCurrency(panel.currentBalance)}
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
            <Target size={12} className="text-[#FACC15]" />
            Previsto
          </div>
          <p
            className={`text-lg font-black tabular-nums ${
              panel.projected >= 0 ? "text-[#0F388A]" : "text-rose-600"
            }`}
          >
            {formatCurrency(panel.projected)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpenList(openList === "receive" ? null : "receive")}
          className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-left space-y-1 active:scale-[0.99] transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              <ArrowDownLeft size={12} />A receber
            </div>
            <ChevronDown
              size={14}
              className={`text-emerald-600/70 transition ${openList === "receive" ? "rotate-180" : ""}`}
            />
          </div>
          <p className="text-base font-black text-emerald-700 tabular-nums">
            {formatCurrency(panel.toReceive)}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            {panel.receiveItems.length} no extrato deste mês
          </p>
        </button>

        <button
          type="button"
          onClick={() => setOpenList(openList === "pay" ? null : "pay")}
          className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-left space-y-1 active:scale-[0.99] transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-700">
              <ArrowUpRight size={12} />A pagar
            </div>
            <ChevronDown
              size={14}
              className={`text-rose-600/70 transition ${openList === "pay" ? "rotate-180" : ""}`}
            />
          </div>
          <p className="text-base font-black text-rose-700 tabular-nums">
            {formatCurrency(panel.toPay)}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            {panel.payItems.length} pendente
            {panel.payItems.length === 1 ? "" : "s"}
            {panel.payItems.some(
              (t) => t.date && !t.date.startsWith(monthPrefix),
            )
              ? " (inclui atrasadas)"
              : ""}
          </p>
        </button>
      </div>

      {openList && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 overflow-hidden divide-y divide-slate-100">
          {(openList === "receive" ? panel.receiveItems : panel.payItems)
            .length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">
              Nenhum lançamento pendente neste mês.
            </p>
          ) : (
            (openList === "receive" ? panel.receiveItems : panel.payItems).map(
              (t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/lancamentos?highlightId=${t.id}&month=${monthPrefix}&status=pending`,
                    )
                  }
                  className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-white transition text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {t.description}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {t.date}
                      {t.date && !t.date.startsWith(monthPrefix)
                        ? " · atrasada"
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-black tabular-nums shrink-0 ${
                      openList === "receive"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(Number(t.amount) || 0))}
                  </span>
                </button>
              ),
            )
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-400 px-0.5 leading-relaxed">
        Previsto = saldo agora + a receber − a pagar · transferências entre
        contas não entram.
      </p>
    </div>
  );
};
