import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Scissors,
  Flame,
  AlertTriangle,
  FolderTree,
  Target,
  TrendingUp,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import {
  useFinancialMetrics,
  CategoryPeriodKey,
} from "../hooks/useFinancialMetrics";
import { PERIOD_OPTIONS } from "../services/categoryEssentiality";
import { getCurrentMonthPrefix } from "../services/dateUtils";
import { DEFAULT_FINANCIAL_SETTINGS } from "../constants";

const RULE_TARGETS = {
  essential: 50,
  lifestyle: 30,
  future: 20,
} as const;

const DONUT_COLORS = {
  essential: "#10b981",
  lifestyle: "#0ea5e9",
  future: "#8b5cf6",
} as const;

function formatCurrency(val: number, blurred?: boolean) {
  if (blurred) return "R$ •••••";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
}

/**
 * Visão Inteligente & Análise de Gastos
 * KPIs baseados na essencialidade definida em /categorias (SSOT).
 */
export const ExpenseAnalysisScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    transactions,
    accounts,
    settings,
    getAccountBalance,
    isBlurred,
  } = useFinance();

  const [period, setPeriod] = useState<CategoryPeriodKey>("1m");
  const metrics = useFinancialMetrics({ period });

  const financialSettings =
    settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;

  const totalReserved = useMemo(() => {
    return accounts
      .filter((a) => a.type === "savings")
      .reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  }, [accounts, getAccountBalance]);

  const reserveMonthsCovered =
    metrics.survivalCost > 0 ? totalReserved / metrics.survivalCost : 0;

  const totalSpend =
    metrics.totalEssential +
    metrics.totalLifestyle +
    metrics.totalInvestment +
    metrics.totalDebt;

  const futureTotal = metrics.totalInvestment + metrics.totalDebt;

  const actualPct = useMemo(() => {
    if (totalSpend <= 0) {
      return { essential: 0, lifestyle: 0, future: 0 };
    }
    return {
      essential: (metrics.totalEssential / totalSpend) * 100,
      lifestyle: (metrics.totalLifestyle / totalSpend) * 100,
      future: (futureTotal / totalSpend) * 100,
    };
  }, [
    totalSpend,
    metrics.totalEssential,
    metrics.totalLifestyle,
    futureTotal,
  ]);

  const donutData = useMemo(
    () => [
      {
        key: "essential",
        name: "Necessidades",
        value: metrics.totalEssential,
        color: DONUT_COLORS.essential,
        target: RULE_TARGETS.essential,
        actual: actualPct.essential,
      },
      {
        key: "lifestyle",
        name: "Desejos",
        value: metrics.totalLifestyle,
        color: DONUT_COLORS.lifestyle,
        target: RULE_TARGETS.lifestyle,
        actual: actualPct.lifestyle,
      },
      {
        key: "future",
        name: "Invest. & Dívidas",
        value: futureTotal,
        color: DONUT_COLORS.future,
        target: RULE_TARGETS.future,
        actual: actualPct.future,
      },
    ],
    [
      metrics.totalEssential,
      metrics.totalLifestyle,
      futureTotal,
      actualPct,
    ],
  );

  const burnRate = useMemo(() => {
    const now = new Date();
    const monthPrefix = getCurrentMonthPrefix(now);
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();

    let monthExpense = 0;
    let monthIncome = 0;

    transactions.forEach((t) => {
      if (!t.date?.startsWith(monthPrefix)) return;
      if (t.status === "cancelled") return;
      const amt = Math.abs(Number(t.amount) || 0);
      if (t.type === "expense" || t.type === "goal_deposit") {
        monthExpense += amt;
      } else if (t.type === "income" || t.type === "goal_withdraw") {
        monthIncome += amt;
      }
    });

    const projected =
      dayOfMonth > 0 ? (monthExpense / dayOfMonth) * daysInMonth : 0;
    const overBudget = monthIncome > 0 && projected > monthIncome;
    const overAmount = overBudget ? projected - monthIncome : 0;

    return {
      monthExpense,
      monthIncome,
      projected,
      dayOfMonth,
      daysInMonth,
      overBudget,
      overAmount,
      dailyBurn: dayOfMonth > 0 ? monthExpense / dayOfMonth : 0,
    };
  }, [transactions]);

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.key === period)?.label || "Período";

  return (
    <div className="space-y-5 pb-28 animate-fade-in text-slate-800 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/mais")}
            className="mt-0.5 p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-900 hover:border-blue-200 transition active:scale-95 shadow-sm shrink-0"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 inline-flex items-center gap-1">
              <Sparkles size={10} /> Análise inteligente
            </span>
            <h1 className="text-xl font-black text-slate-900 mt-1.5 tracking-tight">
              Visão Inteligente
            </h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Custo essencial, margem de corte, regra 50/30/20 e burn rate
            </p>
          </div>
        </div>
        <Link
          to="/categorias"
          className="shrink-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600 hover:text-blue-900 hover:border-blue-200 transition flex items-center gap-1.5 shadow-sm"
        >
          <FolderTree size={14} />
          <span className="hidden sm:inline">Categorias</span>
        </Link>
      </div>

      {/* Period selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        {PERIOD_OPTIONS.map((opt) => {
          const active = period === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriod(opt.key)}
              className={`px-2.5 py-2.5 rounded-xl text-[11px] font-black transition active:scale-95 ${
                active
                  ? "bg-[#0F388A] text-[#FACC15] shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* COMPONENTE 1 — Custo de Sobrevivência Mínimo */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-50 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                <ShieldCheck size={12} />
                Sobrevivência
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {periodLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mb-1">
              Custo de Sobrevivência Mínimo
            </p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.survivalCost, isBlurred)}
              <span className="text-xs font-bold text-slate-400 ml-1">/mês</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Média mensal das categorias{" "}
              <span className="font-bold text-emerald-700">Essenciais</span>
            </p>

            <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Sua reserva atual de{" "}
                <span className="font-black text-slate-900">
                  {formatCurrency(totalReserved, isBlurred)}
                </span>{" "}
                cobre{" "}
                <span className="font-black text-emerald-700">
                  {reserveMonthsCovered.toFixed(1)} meses
                </span>{" "}
                do seu custo essencial
                {financialSettings.targetReserveMonths
                  ? ` (meta: ${financialSettings.targetReserveMonths}m)`
                  : ""}
                .
              </p>
              <div className="mt-2.5 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    reserveMonthsCovered >=
                    (financialSettings.targetReserveMonths || 6)
                      ? "bg-emerald-500"
                      : reserveMonthsCovered >= 3
                        ? "bg-amber-400"
                        : "bg-rose-400"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (reserveMonthsCovered /
                        (financialSettings.targetReserveMonths || 6)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* COMPONENTE 2 — Margem de Corte Automática */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-sky-50 pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-100 px-2 py-1 rounded-lg inline-flex items-center gap-1">
                <Scissors size={12} />
                Margem de corte
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {periodLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mb-1">
              Estilo de Vida / Não Essencial
            </p>
            <h2 className="text-2xl font-black text-sky-700 tracking-tight">
              {formatCurrency(metrics.totalLifestyle, isBlurred)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Total no período · média{" "}
              <span className="font-bold text-slate-700">
                {formatCurrency(
                  metrics.totalLifestyle / Math.max(1, metrics.monthsInWindow),
                  isBlurred,
                )}
              </span>
              /mês
            </p>

            <div className="mt-4 p-3 rounded-2xl bg-sky-50 border border-sky-100">
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-800 mb-1">
                Margem de Manobra para Economia
              </p>
              <p className="text-[11px] text-sky-900/80 leading-relaxed">
                Esse valor é o que você pode cortar primeiro sem afetar o custo
                essencial de sobrevivência.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* COMPONENTE 3 — 50/30/20 Donut */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center border border-violet-100">
              <Target size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Distribuição 50 / 30 / 20
              </h3>
              <p className="text-[11px] text-slate-500">
                Real vs meta recomendada · {periodLabel}
              </p>
            </div>
          </div>
        </div>

        {totalSpend <= 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Sem despesas classificadas neste período.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mt-2">
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) =>
                      formatCurrency(Number(value) || 0, isBlurred)
                    }
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total
                </span>
                <span className="text-sm font-black text-slate-900">
                  {formatCurrency(totalSpend, isBlurred)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {donutData.map((row) => {
                const delta = row.actual - row.target;
                const over = delta > 2;
                const under = delta < -2;
                return (
                  <div
                    key={row.key}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="text-xs font-black text-slate-800 truncate">
                          {row.name}
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        {row.actual.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                      <span>Meta {row.target}%</span>
                      <span
                        className={
                          over
                            ? "text-rose-600"
                            : under
                              ? "text-emerald-600"
                              : "text-slate-500"
                        }
                      >
                        {over
                          ? `+${delta.toFixed(0)}pp acima`
                          : under
                            ? `${delta.toFixed(0)}pp abaixo`
                            : "no alvo"}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full opacity-30"
                        style={{
                          width: `${row.target}%`,
                          backgroundColor: row.color,
                        }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${Math.min(100, row.actual)}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                      {formatCurrency(row.value, isBlurred)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* COMPONENTE 4 — Burn Rate / Projeção Fim de Mês */}
      <div
        className={`p-5 rounded-3xl border shadow-sm relative overflow-hidden ${
          burnRate.overBudget
            ? "bg-rose-50 border-rose-200"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                burnRate.overBudget
                  ? "bg-rose-100 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}
            >
              <Flame size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Projeção de Fim de Mês
              </h3>
              <p className="text-[11px] text-slate-500">
                Burn rate · dia {burnRate.dayOfMonth} de {burnRate.daysInMonth}
              </p>
            </div>
          </div>
          {burnRate.overBudget && (
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg inline-flex items-center gap-1">
              <AlertTriangle size={11} />
              Alerta
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Gasto atual
            </span>
            <span className="text-sm font-black text-slate-900">
              {formatCurrency(burnRate.monthExpense, isBlurred)}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Ritmo / dia
            </span>
            <span className="text-sm font-black text-slate-900">
              {formatCurrency(burnRate.dailyBurn, isBlurred)}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/80 border border-slate-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Projeção mês
            </span>
            <span
              className={`text-sm font-black ${
                burnRate.overBudget ? "text-rose-700" : "text-slate-900"
              }`}
            >
              {formatCurrency(burnRate.projected, isBlurred)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-slate-100">
          {burnRate.overBudget ? (
            <>
              <AlertTriangle
                size={16}
                className="text-rose-600 shrink-0 mt-0.5"
              />
              <p className="text-[11px] text-rose-900 leading-relaxed">
                A projeção de{" "}
                <span className="font-black">
                  {formatCurrency(burnRate.projected, isBlurred)}
                </span>{" "}
                ultrapassa a receita prevista do mês (
                {formatCurrency(burnRate.monthIncome, isBlurred)}) em{" "}
                <span className="font-black">
                  {formatCurrency(burnRate.overAmount, isBlurred)}
                </span>
                . Considere reduzir a margem de estilo de vida.
              </p>
            </>
          ) : (
            <>
              <TrendingUp
                size={16}
                className="text-emerald-600 shrink-0 mt-0.5"
              />
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {burnRate.monthIncome > 0 ? (
                  <>
                    No ritmo atual, a projeção fica{" "}
                    <span className="font-black text-emerald-700">
                      {formatCurrency(
                        Math.max(0, burnRate.monthIncome - burnRate.projected),
                        isBlurred,
                      )}
                    </span>{" "}
                    abaixo da receita do mês (
                    {formatCurrency(burnRate.monthIncome, isBlurred)}).
                  </>
                ) : (
                  <>
                    Ainda não há receita registrada neste mês para comparar com
                    a projeção de gastos.
                  </>
                )}
              </p>
            </>
          )}
        </div>

        <p className="text-[10px] text-slate-400 mt-3 font-medium">
          Fórmula: (gasto atual ÷ dia {burnRate.dayOfMonth}) ×{" "}
          {burnRate.daysInMonth} dias
        </p>
      </div>
    </div>
  );
};
