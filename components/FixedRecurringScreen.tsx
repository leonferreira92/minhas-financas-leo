import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  CalendarPlus,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { Transaction, matchesScope } from "../types";
import { getIcon } from "../constants";
import { TransactionForm } from "./TransactionForm";
import {
  getCurrentMonthPrefix,
  getLocalDateString,
  formatDateBR,
} from "../services/dateUtils";
import { isLegacyArchivedTx } from "../services/legacyCutoffMigration";
import { isNeutralCashFlowMovement } from "../services/aiReportService";
import { shiftMonthPrefix } from "../services/monthCashPanel";

type TypeFilter = "all" | "expense" | "income";
type StatusFilter = "all" | "pending" | "paid" | "overdue";

interface FixedSeries {
  key: string;
  fixedGroupId?: string;
  description: string;
  type: "income" | "expense";
  categoryId: string;
  accountId: string;
  amount: number;
  dayOfMonth: number;
  items: Transaction[];
  currentMonthTx?: Transaction;
  nextPending?: Transaction;
  pendingCount: number;
  paidCount: number;
  lastDate: string;
  needsExtend: boolean;
}

const dayFromDate = (date?: string) => {
  if (!date || date.length < 10) return 1;
  return Math.min(28, Math.max(1, Number(date.slice(8, 10)) || 1));
};

export const FixedRecurringScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    transactions,
    categories,
    accounts,
    isBlurred,
    updateTransaction,
    deleteTransaction,
    extendFixedSeries,
    getAccountBalance,
  } = useFinance();

  const currentMonth = useMemo(() => getCurrentMonthPrefix(), []);
  const todayStr = useMemo(() => getLocalDateString(), []);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialType, setFormInitialType] = useState<"income" | "expense">(
    "expense",
  );
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    if (isBlurred) return "R$ •••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const seriesList = useMemo((): FixedSeries[] => {
    const fixedTxs = transactions.filter((t) => {
      if (!t || t.status === "cancelled") return false;
      if (isLegacyArchivedTx(t)) return false;
      if (isNeutralCashFlowMovement(t)) return false;
      if (t.debtId) return false;
      if (!matchesScope(t.scope, "PERSONAL")) return false;
      if (!(t.isFixed || t.fixedGroupId)) return false;
      return t.type === "income" || t.type === "expense";
    });

    const map = new Map<string, Transaction[]>();
    fixedTxs.forEach((t) => {
      const key = t.fixedGroupId
        ? `g:${t.fixedGroupId}`
        : `solo:${t.description}|${t.amount}|${t.categoryId}|${t.type}`;
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    });

    const result: FixedSeries[] = [];
    map.forEach((items, key) => {
      const sorted = [...items].sort((a, b) =>
        (a.date || "").localeCompare(b.date || ""),
      );
      const template =
        sorted.find((t) => t.date?.startsWith(currentMonth)) ||
        sorted[sorted.length - 1];
      const currentMonthTx = sorted.find((t) =>
        t.date?.startsWith(currentMonth),
      );
      const nextPending =
        sorted.find(
          (t) => t.status === "pending" && t.date && t.date >= todayStr,
        ) || sorted.find((t) => t.status === "pending");
      const lastDate = sorted[sorted.length - 1]?.date || "";
      const horizon = shiftMonthPrefix(currentMonth, 3);
      const needsExtend =
        Boolean(template.fixedGroupId) && lastDate.slice(0, 7) < horizon;

      result.push({
        key,
        fixedGroupId: template.fixedGroupId,
        description: template.description || "Sem descrição",
        type: template.type as "income" | "expense",
        categoryId: template.categoryId,
        accountId: template.accountId,
        amount: Math.abs(Number(template.amount) || 0),
        dayOfMonth: dayFromDate(template.date),
        items: sorted,
        currentMonthTx,
        nextPending,
        pendingCount: sorted.filter((t) => t.status === "pending").length,
        paidCount: sorted.filter((t) => t.status === "paid").length,
        lastDate,
        needsExtend,
      });
    });

    return result.sort((a, b) => {
      const aOver =
        a.currentMonthTx?.status === "pending" &&
        (a.currentMonthTx.date || "") < todayStr
          ? 0
          : 1;
      const bOver =
        b.currentMonthTx?.status === "pending" &&
        (b.currentMonthTx.date || "") < todayStr
          ? 0
          : 1;
      if (aOver !== bOver) return aOver - bOver;
      const aPend = a.currentMonthTx?.status === "pending" ? 0 : 1;
      const bPend = b.currentMonthTx?.status === "pending" ? 0 : 1;
      if (aPend !== bPend) return aPend - bPend;
      return (
        a.dayOfMonth - b.dayOfMonth ||
        a.description.localeCompare(b.description)
      );
    });
  }, [transactions, currentMonth, todayStr]);

  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      const cm = s.currentMonthTx;
      if (statusFilter === "pending") {
        return cm?.status === "pending" && (cm.date || "") >= todayStr;
      }
      if (statusFilter === "overdue") {
        return cm?.status === "pending" && (cm.date || "") < todayStr;
      }
      if (statusFilter === "paid") {
        return cm?.status === "paid";
      }
      return true;
    });
  }, [seriesList, typeFilter, statusFilter, todayStr]);

  const summary = useMemo(() => {
    const expenses = seriesList.filter((s) => s.type === "expense");
    const incomes = seriesList.filter((s) => s.type === "income");
    const monthExpense = expenses.reduce((s, x) => s + x.amount, 0);
    const monthIncome = incomes.reduce((s, x) => s + x.amount, 0);
    const pendingMonth = seriesList.filter(
      (s) => s.currentMonthTx?.status === "pending",
    ).length;
    const overdueMonth = seriesList.filter(
      (s) =>
        s.currentMonthTx?.status === "pending" &&
        (s.currentMonthTx.date || "") < todayStr,
    ).length;
    const paidMonth = seriesList.filter(
      (s) => s.currentMonthTx?.status === "paid",
    ).length;
    return {
      monthExpense,
      monthIncome,
      pendingMonth,
      overdueMonth,
      paidMonth,
      count: seriesList.length,
    };
  }, [seriesList, todayStr]);

  const personalCash = useMemo(() => {
    return accounts
      .filter((a) => a.enabled !== false && a.scope !== "BUSINESS")
      .reduce((s, a) => s + getAccountBalance(a.id), 0);
  }, [accounts, getAccountBalance]);

  const getCat = (id: string) => categories.find((c) => c.id === id);
  const getAcc = (id: string) => accounts.find((a) => a.id === id);

  const monthStatus = (s: FixedSeries): { label: string; tone: string } => {
    const tx = s.currentMonthTx;
    if (!tx)
      return {
        label: "Sem lançamento",
        tone: "bg-slate-100 text-slate-500 border-slate-200",
      };
    if (tx.status === "paid")
      return {
        label: "Pago",
        tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    if ((tx.date || "") < todayStr)
      return {
        label: "Atrasado",
        tone: "bg-rose-50 text-rose-700 border-rose-200",
      };
    return {
      label: "Pendente",
      tone: "bg-amber-50 text-amber-800 border-amber-200",
    };
  };

  const handleMarkPaid = (s: FixedSeries) => {
    const tx = s.currentMonthTx || s.nextPending;
    if (!tx || tx.status === "paid") return;
    updateTransaction({ ...tx, status: "paid" });
    showToast(`${s.description}: marcado como pago`);
  };

  const handleExtend = (s: FixedSeries) => {
    if (!s.fixedGroupId) {
      showToast(
        "Esta conta não tem série vinculada. Edite e marque como recorrente de novo.",
      );
      return;
    }
    const n = extendFixedSeries(s.fixedGroupId, 6);
    showToast(
      n > 0
        ? `+${n} meses adicionados à série`
        : "Série já cobre os próximos meses",
    );
  };

  const handleDeleteSeries = (s: FixedSeries) => {
    const ref = s.currentMonthTx || s.items[s.items.length - 1];
    if (!ref) return;
    deleteTransaction(ref.id, Boolean(s.fixedGroupId));
    setConfirmDeleteKey(null);
    setExpandedKey(null);
    showToast(
      s.fixedGroupId ? "Série recorrente removida" : "Lançamento removido",
    );
  };

  const openNew = (type: "income" | "expense") => {
    setFormInitialType(type);
    setEditingTx(null);
    setIsFormOpen(true);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  return (
    <div className="space-y-5 pb-28 animate-fade-in -mx-3.5 sm:mx-0">
      {/* Header */}
      <div className="relative bg-gradient-to-b from-[#0F388A] via-[#0F388A] to-slate-100 px-4 pt-3 pb-8 rounded-b-[2.5rem] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/mais")}
              className="p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-200 hover:text-white transition active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                Compromissos
              </p>
              <h1 className="text-lg font-black text-white tracking-tight leading-none flex items-center gap-2">
                <RefreshCw size={16} className="text-[#FACC15]" />
                Contas fixas
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openNew("expense")}
            className="px-3 py-2.5 rounded-xl bg-[#FACC15] text-[#0F388A] font-black text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Plus size={14} />
            Nova
          </button>
        </div>

        <div className="rounded-3xl bg-[#0F388A] border border-[#FACC15]/40 ring-1 ring-[#FACC15]/20 p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-200">
                Compromisso mensal · {monthLabel}
              </p>
              <p className="mt-1.5 text-3xl font-black text-white tabular-nums tracking-tight">
                {formatCurrency(summary.monthExpense)}
              </p>
              <p className="text-[11px] text-blue-200 mt-1 font-medium">
                {summary.count} série{summary.count === 1 ? "" : "s"} · despesas
                fixas previstas
              </p>
            </div>
            {summary.overdueMonth > 0 ? (
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border bg-rose-500/15 text-rose-200 border-rose-500/30">
                {summary.overdueMonth} atrasada
                {summary.overdueMonth > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                Em dia
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1">
                <ArrowDownRight size={10} /> Saídas
              </p>
              <p className="text-sm font-black text-rose-300 tabular-nums mt-0.5">
                {formatCurrency(summary.monthExpense)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <ArrowUpRight size={10} /> Entradas
              </p>
              <p className="text-sm font-black text-emerald-300 tabular-nums mt-0.5">
                {formatCurrency(summary.monthIncome)}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-950/50 border border-blue-700/40 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-300">
                Pendentes
              </p>
              <p className="text-sm font-black text-white tabular-nums mt-0.5">
                {summary.pendingMonth}
                <span className="text-[10px] text-blue-300 font-bold ml-1">
                  / {summary.count}
                </span>
              </p>
            </div>
          </div>

          {summary.monthExpense > 0 && (
            <p className="text-[10px] text-blue-200/90 font-medium border-t border-blue-700/40 pt-3">
              Caixa pessoal agora: {formatCurrency(personalCash)}
              {personalCash < summary.monthExpense
                ? ` · falta ${formatCurrency(summary.monthExpense - personalCash)} para cobrir as fixas do mês`
                : " · cobre as fixas do mês"}
            </p>
          )}
        </div>
      </div>

      <div className="px-3.5 sm:px-4 space-y-4 -mt-2">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(
            [
              ["all", "Todas"],
              ["expense", "Despesas"],
              ["income", "Receitas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTypeFilter(id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shrink-0 transition active:scale-95 ${
                typeFilter === id
                  ? "bg-[#0F388A] text-[#FACC15] border border-[#FACC15]/40"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="w-px bg-slate-200 shrink-0 self-stretch" />
          {(
            [
              ["all", "Mês"],
              ["overdue", "Atrasadas"],
              ["pending", "A pagar"],
              ["paid", "Pagas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shrink-0 transition active:scale-95 ${
                statusFilter === id
                  ? "bg-[#FACC15] text-[#0F388A]"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-blue-50 border border-blue-100 px-3.5 py-2.5 flex gap-2 text-[11px] text-blue-900 font-medium leading-relaxed">
          <Sparkles size={14} className="text-[#0F388A] shrink-0 mt-0.5" />
          <span>
            Ao criar, marque <strong>Recorrente</strong> no formulário — o
            sistema gera os próximos 12 meses. Aqui você paga, edita a série e
            estende o horizonte.
          </span>
        </div>

        {filteredSeries.length === 0 ? (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0F388A]/10 flex items-center justify-center text-[#0F388A]">
              <Repeat size={26} />
            </div>
            <h3 className="text-base font-black text-slate-800">
              Nenhuma conta fixa aqui
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Cadastre água, luz, internet, streaming ou salário como recorrente
              para acompanhar todo mês.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => openNew("expense")}
                className="px-4 py-2.5 rounded-xl bg-[#0F388A] text-[#FACC15] font-black text-xs uppercase active:scale-95"
              >
                + Despesa fixa
              </button>
              <button
                type="button"
                onClick={() => openNew("income")}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-xs uppercase active:scale-95"
              >
                + Receita fixa
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSeries.map((s) => {
              const cat = getCat(s.categoryId);
              const Icon = getIcon(cat?.icon || "Repeat");
              const status = monthStatus(s);
              const expanded = expandedKey === s.key;
              const isIncome = s.type === "income";

              return (
                <div
                  key={s.key}
                  className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-3.5 flex gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      <Icon size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">
                            {s.description}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                            {cat?.name || "Geral"} · dia{" "}
                            {String(s.dayOfMonth).padStart(2, "0")}
                            {getAcc(s.accountId)?.name
                              ? ` · ${getAcc(s.accountId)?.name}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-black tabular-nums ${
                              isIncome ? "text-emerald-600" : "text-slate-900"
                            }`}
                          >
                            {isIncome ? "+ " : "−"}
                            {formatCurrency(s.amount)}
                          </p>
                          <span
                            className={`inline-flex mt-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${status.tone}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {s.currentMonthTx?.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase flex items-center gap-1 active:scale-95"
                          >
                            <CheckCircle2 size={12} />
                            Pagar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTx(
                              s.currentMonthTx ||
                                s.nextPending ||
                                s.items[s.items.length - 1],
                            );
                            setIsFormOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase flex items-center gap-1 active:scale-95"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        {s.fixedGroupId && (
                          <button
                            type="button"
                            onClick={() => handleExtend(s)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 active:scale-95 ${
                              s.needsExtend
                                ? "bg-[#0F388A] text-[#FACC15]"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <CalendarPlus size={12} />
                            +6 meses
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedKey(expanded ? null : s.key)
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-500 text-[10px] font-black uppercase flex items-center gap-1 active:scale-95 ml-auto"
                        >
                          {expanded ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                          {s.pendingCount} abertas
                        </button>
                      </div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/80 px-3.5 py-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Próximos lançamentos da série
                      </p>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {s.items
                          .filter(
                            (t) =>
                              t.date &&
                              t.date.slice(0, 7) >=
                                shiftMonthPrefix(currentMonth, -1),
                          )
                          .slice(-8)
                          .map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-100 px-3 py-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {t.status === "paid" ? (
                                  <CheckCircle2
                                    size={14}
                                    className="text-emerald-500 shrink-0"
                                  />
                                ) : (t.date || "") < todayStr ? (
                                  <AlertTriangle
                                    size={14}
                                    className="text-rose-500 shrink-0"
                                  />
                                ) : (
                                  <Clock
                                    size={14}
                                    className="text-amber-500 shrink-0"
                                  />
                                )}
                                <span className="text-xs font-bold text-slate-700 tabular-nums">
                                  {formatDateBR(t.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black tabular-nums text-slate-800">
                                  {formatCurrency(
                                    Math.abs(Number(t.amount) || 0),
                                  )}
                                </span>
                                {t.status === "pending" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateTransaction({
                                        ...t,
                                        status: "paid",
                                      });
                                      showToast("Marcado como pago");
                                    }}
                                    className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg"
                                  >
                                    Pagar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>

                      {confirmDeleteKey === s.key ? (
                        <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 space-y-2">
                          <p className="text-xs text-rose-800 font-medium">
                            Remover{" "}
                            {s.fixedGroupId
                              ? "toda a série recorrente"
                              : "este lançamento"}
                            ?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteSeries(s)}
                              className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase"
                            >
                              Confirmar exclusão
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(null)}
                              className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey(s.key)}
                          className="w-full py-2 rounded-xl text-rose-600 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-rose-50 transition"
                        >
                          <Trash2 size={12} />
                          Excluir série
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#0F388A] text-[#FACC15] text-xs font-black shadow-xl border border-[#FACC15]/30 max-w-[90vw]">
          {toast}
        </div>
      )}

      {isFormOpen && (
        <TransactionForm
          initialType={formInitialType}
          initialIsFixed={!editingTx}
          transaction={editingTx || undefined}
          onClose={() => {
            setIsFormOpen(false);
            setEditingTx(null);
          }}
        />
      )}
    </div>
  );
};
