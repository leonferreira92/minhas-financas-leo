import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";
import {
  Music,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Target,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Sliders,
  ShieldAlert,
  Calendar,
  Info,
} from "lucide-react";
import { DEFAULT_FINANCIAL_SETTINGS } from "../constants";
import {
  isEssentialExpense,
  isDebtExpense,
  isNeutralCashFlowMovement,
  isGoalMovement,
} from "../services/aiReportService";

export const ShowTargetSection: React.FC = () => {
  const {
    shows,
    transactions,
    categories,
    debts,
    settings,
    isBlurred,
    getDebtProgress,
  } = useFinance();

  const [customSavingsGoal, setCustomSavingsGoal] = useState<number | null>(
    null,
  );

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    if (isBlurred) return "R$ •••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const financialSettings = useMemo(() => {
    return settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
  }, [settings.financialSettings]);

  // ---------------------------------------------------------------------------
  // MOTOR DE CÁLCULO: MÉTRICAS DE SHOWS E CONVERSÃO EM METAS
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    // 1. Filtrar eventos válidos (exclui cancelados)
    const safeShows = Array.isArray(shows) ? shows : [];
    const validShows = safeShows.filter((s) => s && s.status !== "Cancelado");
    const totalShowsCount = validShows.length;

    // Calcular faturamento bruto, custos totais e lucro líquido de cada show
    let totalGrossRevenue = 0;
    let totalCosts = 0;
    let showsWithoutExpenses = 0;

    const showMonthsSet = new Set<string>();

    validShows.forEach((s) => {
      const gross = Number(s.totalCache) || 0;
      totalGrossRevenue += gross;

      if (s.date) {
        const ym = s.date.slice(0, 7);
        if (ym) showMonthsSet.add(ym);
      }

      const exp = s.expenses || {
        fuel: 0,
        food: 0,
        toll: 0,
        commission: 0,
        others: 0,
      };
      const cost =
        (Number(exp.fuel) || 0) +
        (Number(exp.food) || 0) +
        (Number(exp.toll) || 0) +
        (Number(exp.commission) || 0) +
        (Number(exp.others) || 0);

      totalCosts += cost;

      if (cost === 0 && !s.expensesLaunched) {
        showsWithoutExpenses++;
      }
    });

    const totalNetProfit = totalGrossRevenue - totalCosts;
    const monthsSpan = Math.max(1, showMonthsSet.size);

    // Indicadores médios por show
    const avgShowsPerMonth =
      totalShowsCount > 0 ? totalShowsCount / monthsSpan : 0;
    const avgGrossPerShow =
      totalShowsCount > 0 ? totalGrossRevenue / totalShowsCount : 0;
    const avgCostPerShow =
      totalShowsCount > 0 ? totalCosts / totalShowsCount : 0;
    const avgNetProfitPerShow =
      totalShowsCount > 0 ? totalNetProfit / totalShowsCount : 0;
    const profitMargin =
      avgGrossPerShow > 0 ? (avgNetProfitPerShow / avgGrossPerShow) * 100 : 0;

    // Confiabilidade histórica
    const isLowReliability = totalShowsCount > 0 && totalShowsCount < 3;
    const hasNoShows = totalShowsCount === 0;

    // -------------------------------------------------------------------------
    // 2. APURAÇÃO DOS CUSTOS MENSAIS REAIS (ESSENCIAL, ESTILO DE VIDA, DÍVIDAS)
    // -------------------------------------------------------------------------
    const validExpenseTxs = transactions.filter(
      (t) =>
        t.type === "expense" &&
        !isNeutralCashFlowMovement(t) &&
        !isGoalMovement(t),
    );

    const expenseMonthsSet = new Set<string>();
    validExpenseTxs.forEach((t) => {
      const ym = t.date.slice(0, 7);
      if (ym) expenseMonthsSet.add(ym);
    });
    const expenseMonthsCount = Math.max(1, expenseMonthsSet.size);

    let totalEssentialAll = 0;
    let totalAllExpenses = 0;

    validExpenseTxs.forEach((t) => {
      const amt = Number(t.amount) || 0;
      totalAllExpenses += amt;
      if (isEssentialExpense(t, categories, debts, financialSettings)) {
        totalEssentialAll += amt;
      }
    });

    const avgEssentialExpenses = totalEssentialAll / expenseMonthsCount;
    const avgTotalExpenses = totalAllExpenses / expenseMonthsCount;

    // Dívidas ativas
    const activeDebts = debts.filter((d) => {
      const prog = getDebtProgress(d.id);
      return prog.status !== "paid" && prog.remaining > 0.1;
    });
    const monthlyDebtInstallments = activeDebts.reduce((sum, d) => {
      const inst =
        Number(d.installmentAmount) ||
        Number(d.totalAmount) / (d.installmentCount || 1) ||
        0;
      return sum + inst;
    }, 0);

    // Custo Essencial Total Mensal = Despesas Essenciais + Parcelas de Dívidas
    const monthlyEssentialCost = avgEssentialExpenses + monthlyDebtInstallments;

    // Custo de Vida Atual Mensal = Despesas Totais + Parcelas de Dívidas
    const monthlyCurrentLivingCost = avgTotalExpenses + monthlyDebtInstallments;

    // -------------------------------------------------------------------------
    // 3. META MENSAL DE ECONOMIA
    // -------------------------------------------------------------------------
    const calculatedGoalsMonthlyPace = 0;

    const activeMonthlySavingsTarget =
      customSavingsGoal !== null
        ? customSavingsGoal
        : calculatedGoalsMonthlyPace > 0
          ? calculatedGoalsMonthlyPace
          : 1000;

    const totalLivingAndSavingsCost =
      monthlyCurrentLivingCost + activeMonthlySavingsTarget;

    // -------------------------------------------------------------------------
    // 4. QUANTIDADES DE SHOWS NECESSÁRIAS (BASEADAS NO LUCRO LÍQUIDO)
    // -------------------------------------------------------------------------
    let showsForEssential = 0;
    let showsForLiving = 0;
    let showsForLivingAndSavings = 0;
    let showsJustForSavings = 0;

    if (avgNetProfitPerShow > 0) {
      showsForEssential = Math.ceil(monthlyEssentialCost / avgNetProfitPerShow);
      showsForLiving = Math.ceil(
        monthlyCurrentLivingCost / avgNetProfitPerShow,
      );
      showsForLivingAndSavings = Math.ceil(
        totalLivingAndSavingsCost / avgNetProfitPerShow,
      );
      showsJustForSavings = Math.ceil(
        activeMonthlySavingsTarget / avgNetProfitPerShow,
      );
    }

    return {
      totalShowsCount,
      monthsSpan,
      avgShowsPerMonth,
      totalGrossRevenue,
      totalCosts,
      totalNetProfit,
      avgGrossPerShow,
      avgCostPerShow,
      avgNetProfitPerShow,
      profitMargin,
      isLowReliability,
      hasNoShows,
      showsWithoutExpenses,
      monthlyEssentialCost,
      monthlyCurrentLivingCost,
      activeMonthlySavingsTarget,
      totalLivingAndSavingsCost,
      showsForEssential,
      showsForLiving,
      showsForLivingAndSavings,
      showsJustForSavings,
    };
  }, [
    shows,
    transactions,
    categories,
    debts,
    financialSettings,
    customSavingsGoal,
    getDebtProgress,
  ]);

  return (
    <section className="bg-white rounded-[2.5rem] p-6 border border-slate-200/80 shadow-sm space-y-6">
      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Music size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Meta de Shows
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-200">
                {metrics.totalShowsCount}{" "}
                {metrics.totalShowsCount === 1
                  ? "evento cadastrado"
                  : "eventos cadastrados"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cálculo baseado no <strong>lucro líquido real</strong> dos seus
              eventos (cachá bruto menos custos)
            </p>
          </div>
        </div>

        <Link
          to="/musician-shows"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60 transition w-fit"
        >
          <span>Gerenciar Eventos</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* AVISO DE BAIXA CONFIABILIDADE OU AUSÊNCIA DE EVENTOS */}
      {metrics.hasNoShows ? (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
          <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-slate-800">
              Nenhum show ou evento cadastrado
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Para calcular o faturamento, custos e quantidade de apresentações
              necessárias para custear sua vida, registre seus eventos
              em"Gerenciar Eventos". Não inventamos valores estimados.
            </p>
          </div>
        </div>
      ) : metrics.isLowReliability ? (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-start space-x-2.5">
          <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-black text-amber-800 block">
              Aviso: Média com baixa confiabilidade estatística
            </span>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
              Foram cadastrados apenas {metrics.totalShowsCount} evento(s). À
              medida que você registrar mais apresentações e suas respectivas
              despesas reais (combustível, pedágio, alimentação, comissões), as
              projeções de shows se tornarão mais precisas.
            </p>
          </div>
        </div>
      ) : null}

      {/* CASO HAJA SHOWS CADASTRADOS SEM DESPESAS INFORMADAS */}
      {!metrics.hasNoShows && metrics.showsWithoutExpenses > 0 && (
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1.5">
            <Info size={13} className="text-amber-500 shrink-0" />
            <span>
              {metrics.showsWithoutExpenses} evento(s) ainda não têm custos de
              logástica cadastrados. O lucro líquido considerará despesas
              zeradas para esses eventos.
            </span>
          </span>
          <Link
            to="/musician-shows"
            className="text-amber-600 font-bold hover:underline shrink-0 ml-2"
          >
            Lançar Custos
          </Link>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* OS 4 INDICADORES MÉDIOS OBRIGATÓRIOS DO SHOW */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. NÚMERO MÉDIO DE SHOWS POR MÊS */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Média de Shows
            </span>
            <Calendar size={15} className="text-indigo-500" />
          </div>

          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-black text-slate-900 tabular-nums tracking-tight">
                {metrics.avgShowsPerMonth.toFixed(1)}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                shows/mês
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Distribuídos em {metrics.monthsSpan}{" "}
              {metrics.monthsSpan === 1 ? "mês" : "meses"}
            </span>
          </div>
        </div>

        {/* 2. FATURAMENTO MÉDIO POR SHOW (BRUTO) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Cachê Médio Bruto
            </span>
            <ArrowUpRight size={15} className="text-emerald-500" />
          </div>

          <div>
            <span className="text-xl font-black text-slate-900 tabular-nums tracking-tight block">
              {formatBRL(metrics.avgGrossPerShow)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Faturamento médio por evento
            </span>
          </div>
        </div>

        {/* 3. CUSTOS MÉDIOS POR SHOW */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Custos Médios
            </span>
            <ArrowDownRight size={15} className="text-rose-500" />
          </div>

          <div>
            <span className="text-xl font-black text-rose-600 tabular-nums tracking-tight block">
              {formatBRL(metrics.avgCostPerShow)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Combustível, pedágios e taxas
            </span>
          </div>
        </div>

        {/* 4. LUCRO MÉDIO LÍQUIDO POR SHOW */}
        <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              Lucro Líquido Real
            </span>
            <Sparkles size={15} className="text-amber-500" />
          </div>

          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-black text-amber-600 tabular-nums tracking-tight">
                {formatBRL(metrics.avgNetProfitPerShow)}
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-700/80 block mt-0.5">
              Margem líquida: {metrics.profitMargin.toFixed(0)}% do cachê
            </span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* AS 3 METAS DE QUANTIDADE DE SHOWS NECESSÁRIAS */}
      {/* --------------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Quantidade de Shows Necessária (Meta Mensal)
          </h3>
          <span className="text-[11px] text-slate-400">
            Calculado com base no lucro de{" "}
            <strong>{formatBRL(metrics.avgNetProfitPerShow)}/show</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* META 1: COBRIR O CUSTO ESSENCIAL */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Degrau 1: Sobrevivência
                </span>
                <ShieldAlert size={16} className="text-rose-500" />
              </div>

              <h4 className="text-sm font-black text-slate-900 mt-1">
                Custo Essencial
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Moradia, alimentação básica e parcelas de dívidas ativas (
                {formatBRL(metrics.monthlyEssentialCost)}/mês).
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-600">
                Necessários:
              </span>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-900 tabular-nums">
                  {metrics.avgNetProfitPerShow > 0
                    ? metrics.showsForEssential
                    : "—"}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1">
                  shows/mês
                </span>
              </div>
            </div>
          </div>

          {/* META 2: COBRIR O CUSTO DE VIDA ATUAL */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Degrau 2: Manutenção
                </span>
                <TrendingUp size={16} className="text-indigo-500" />
              </div>

              <h4 className="text-sm font-black text-slate-900 mt-1">
                Custo de Vida Atual
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Estilo de vida atual completo com lazer, assinaturas e dívidas (
                {formatBRL(metrics.monthlyCurrentLivingCost)}/mês).
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-600">
                Necessários:
              </span>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-600 tabular-nums">
                  {metrics.avgNetProfitPerShow > 0
                    ? metrics.showsForLiving
                    : "—"}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1">
                  shows/mês
                </span>
              </div>
            </div>
          </div>

          {/* META 3: ATINGIR META MENSAL DE ECONOMIA */}
          <div className="bg-emerald-50/30 rounded-2xl p-4 border border-emerald-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                  Degrau 3: Crescimento
                </span>
                <Target size={16} className="text-emerald-500" />
              </div>

              <div className="flex items-center justify-between mt-1">
                <h4 className="text-sm font-black text-slate-900">
                  Vida + Poupança
                </h4>
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] font-bold text-slate-400">
                    Meta:
                  </span>
                  <input
                    type="number"
                    value={metrics.activeMonthlySavingsTarget}
                    onChange={(e) =>
                      setCustomSavingsGoal(Number(e.target.value) || 0)
                    }
                    className="w-20 px-1.5 py-0.5 text-right text-[11px] font-black rounded-lg border border-emerald-300 bg-white text-emerald-700 tabular-nums"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Pagar todo o custo de vida (
                {formatBRL(metrics.monthlyCurrentLivingCost)}) e poupar{" "}
                {formatBRL(metrics.activeMonthlySavingsTarget)}/mês.
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-200/60 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-600">
                Necessários:
              </span>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-600 tabular-nums">
                  {metrics.avgNetProfitPerShow > 0
                    ? metrics.showsForLivingAndSavings
                    : "—"}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1">
                  shows/mês
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ EXPLICATIVO */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          <span>
            Os cálculos consideram estritamente o lucro líquido médio apurado (
            {formatBRL(metrics.avgNetProfitPerShow)}). Cachàs brutos foram
            deduzidos das despesas operacionais cadastradas.
          </span>
        </div>
      </div>
    </section>
  );
};
