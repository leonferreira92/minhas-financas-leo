import React, { useState, useMemo, useEffect } from "react";
import { useFinance } from "../context/FinanceContext";
import {
  generateFinancialReportForAI,
  ReportPeriodType,
  getPeriodDateRange,
  formatBRL,
  detectCurrentMonthlyRent,
  buildScenarioAiPrompt,
  DECISION_SCENARIO_OPTIONS,
  getScenarioNetMonthlyImpact,
  type DecisionScenario,
  type DecisionScenarioType,
  type ScenarioSimulationResult,
} from "../services/aiReportService";
import { getCurrentMonthPrefix } from "../services/dateUtils";
import {
  Bot,
  Copy,
  Check,
  Download,
  ExternalLink,
  Calendar,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Wallet,
  PiggyBank,
  ArrowDownRight,
  FileText,
  ChevronLeft,
  Info,
  HelpCircle,
  Sliders,
  Home,
  Lightbulb,
  ShoppingBag,
  CreditCard,
  Repeat,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PERSONAL_ONLY_MODE } from "../services/personalOnlyMode";

export const AIReportScreen = () => {
  const {
    transactions,
    accounts,
    categories,
    debts,
    shows,
    settings,
    getAccountBalance,
    isBlurred,
  } = useFinance();

  // Relatório 100% pessoal: não injeta agenda de shows (txs históricas já no extrato/saldo)
  const reportShows = PERSONAL_ONLY_MODE ? [] : shows;

  const currentMonth = useMemo(() => getCurrentMonthPrefix(), []);

  // PADRÃO SOLICITADO: 'current_plus_6m' (Situação Atual + Próximos 6 Meses)
  const [periodType, setPeriodType] =
    useState<ReportPeriodType>("current_plus_6m");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  });

  const detectedRent = useMemo(
    () => detectCurrentMonthlyRent(transactions, categories, currentMonth),
    [transactions, categories, currentMonth],
  );

  const [scenarioEnabled, setScenarioEnabled] = useState(false);
  const [scenarioType, setScenarioType] =
    useState<DecisionScenarioType>("rent_replace");
  const [newRentInput, setNewRentInput] = useState("1000");
  const [currentRentInput, setCurrentRentInput] = useState("");
  const [scenarioStartMonth, setScenarioStartMonth] = useState(currentMonth);
  const [scenarioAmountInput, setScenarioAmountInput] = useState("500");
  const [installmentAmountInput, setInstallmentAmountInput] = useState("200");
  const [installmentCountInput, setInstallmentCountInput] = useState("10");
  const [rentPrefillDone, setRentPrefillDone] = useState(false);

  useEffect(() => {
    if (rentPrefillDone) return;
    if (detectedRent.amount > 0) {
      setCurrentRentInput(String(detectedRent.amount));
      setRentPrefillDone(true);
    }
  }, [detectedRent, rentPrefillDone]);

  const decisionScenario: DecisionScenario | null = useMemo(() => {
    if (!scenarioEnabled) return null;
    if (!/^\d{4}-\d{2}$/.test(scenarioStartMonth)) return null;

    if (scenarioType === "rent_replace") {
      const newRent = Number(String(newRentInput).replace(", ", ".")) || 0;
      const currentRent =
        Number(String(currentRentInput).replace(", ", ".")) || 0;
      if (newRent <= 0) return null;
      return {
        type: "rent_replace",
        newRentAmount: newRent,
        currentRentAmount: currentRent,
        startMonth: scenarioStartMonth,
        label: "Novo aluguel substituindo o atual",
      };
    }

    if (scenarioType === "new_fixed_cost") {
      const amount =
        Number(String(scenarioAmountInput).replace(", ", ".")) || 0;
      if (amount <= 0) return null;
      return {
        type: "new_fixed_cost",
        amount,
        startMonth: scenarioStartMonth,
        label: "Novo custo fixo mensal",
      };
    }

    if (scenarioType === "one_time_purchase") {
      const amount =
        Number(String(scenarioAmountInput).replace(", ", ".")) || 0;
      if (amount <= 0) return null;
      return {
        type: "one_time_purchase",
        amount,
        startMonth: scenarioStartMonth,
        label: "Compra à vista",
      };
    }

    if (scenarioType === "new_installment") {
      const installmentAmount =
        Number(String(installmentAmountInput).replace(", ", ".")) || 0;
      const installmentCount = Math.max(
        1,
        Math.floor(Number(installmentCountInput) || 1),
      );
      if (installmentAmount <= 0) return null;
      return {
        type: "new_installment",
        installmentAmount,
        installmentCount,
        startMonth: scenarioStartMonth,
        label: "Nova parcela mensal",
      };
    }

    return null;
  }, [
    scenarioEnabled,
    scenarioType,
    newRentInput,
    currentRentInput,
    scenarioStartMonth,
    scenarioAmountInput,
    installmentAmountInput,
    installmentCountInput,
  ]);

  const [copied, setCopied] = useState(false);
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);
  const [copiedScenario, setCopiedScenario] = useState(false);
  const [reportText, setReportText] = useState<string>("");
  const [scenarioSim, setScenarioSim] =
    useState<ScenarioSimulationResult | null>(null);

  const handleGenerate = () => {
    const result = generateFinancialReportForAI({
      periodType,
      customStartDate: customStart,
      customEndDate: customEnd,
      transactions,
      accounts,
      categories,
      debts,
      shows: reportShows,
      financialSettings: settings.financialSettings,
      getAccountBalance,
      decisionScenario,
    });
    setReportText(result.text);
    setScenarioSim(result.scenarioSim);
  };

  useEffect(() => {
    handleGenerate();
  }, [
    periodType,
    customStart,
    customEnd,
    transactions,
    accounts,
    categories,
    debts,
    reportShows,
    settings.financialSettings,
    decisionScenario,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Falha ao copiar texto: ", err);
    }
  };

  const handleExportTxt = () => {
    // BOM UTF-8 evita caracteres quebrados no Bloco de Notas / Windows
    const blob = new Blob(["\uFEFF" + reportText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Relatorio_Financeiro_IA_${today}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenAI = async (url: string) => {
    if (scenarioSim) {
      const prompt = buildScenarioAiPrompt(scenarioSim);
      await navigator.clipboard.writeText(
        `${prompt}\n\n[RELATÓRIO]:\n\n${reportText}`,
      );
    } else {
      await handleCopy();
    }
    window.open(url, "_blank");
  };

  const promptSuggestions = scenarioSim
    ? [buildScenarioAiPrompt(scenarioSim)]
    : [
        "Com base neste relatório, posso comprar [R$ valor do item] à vista agora sem me apertar nos próximos meses? ",
        "Qual é o valor exato que realmente posso gastar livremente hoje sem comprometer nenhuma conta futura? ",
        "Quais meses apresentam maior risco de caixa e onde devo concentrar cortes de despesas? ",
        "Faça uma análise crítica da minha capacidade de sobrevivência financeira e me mostre o melhor plano de ação.",
      ];

  const handleCopyPrompt = async (prompt: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(
        `${prompt}\n\n[RELATÓRIO]:\n\n${reportText}`,
      );
      setCopiedPromptIdx(idx);
      setTimeout(() => setCopiedPromptIdx(null), 2500);
    } catch (err) {
      console.error("Falha ao copiar prompt: ", err);
    }
  };

  const handleCopyScenarioPack = async () => {
    if (!scenarioSim) return;
    try {
      const prompt = buildScenarioAiPrompt(scenarioSim);
      await navigator.clipboard.writeText(
        `${prompt}\n\n[RELATÓRIO]:\n\n${reportText}`,
      );
      setCopiedScenario(true);
      setTimeout(() => setCopiedScenario(false), 2500);
    } catch (err) {
      console.error("Falha ao copiar pacote do cenário: ", err);
    }
  };

  const netImpact = decisionScenario
    ? getScenarioNetMonthlyImpact(decisionScenario)
    : 0;

  const scenarioHelp =
    scenarioType === "rent_replace"
      ? "Teste um novo aluguel no lugar do atual. O relatório compara o fluxo com e sem o cenário."
      : scenarioType === "new_fixed_cost"
        ? "Simule um gasto mensal novo (assinatura, academia, etc.) e veja o efeito no caixa."
        : scenarioType === "one_time_purchase"
          ? "Simule uma compra à vista no mês escolhido e o impacto no saldo projetado."
          : "Simule um parcelamento e veja se as parcelas cabem no horizonte do relatório.";

  const impactLabel =
    scenarioType === "one_time_purchase"
      ? "Valor único"
      : scenarioType === "new_installment"
        ? "Parcela / mês"
        : "Impacto / mês";

  const incompleteHint =
    scenarioType === "rent_replace"
      ? "Informe um novo aluguel maior que zero para calcular."
      : scenarioType === "new_installment"
        ? "Informe valor e quantidade de parcelas para calcular."
        : "Informe um valor maior que zero para calcular.";

  const verdictStyles = {
    comfortable: "bg-emerald-50 border-emerald-200 text-emerald-800",
    tight: "bg-amber-50 border-amber-200 text-amber-900",
    unsafe: "bg-rose-50 border-rose-200 text-rose-800",
  };

  // Resumo Executivo para os Cards Superiores
  const snapshot = useMemo(() => {
    const operationalAccounts = accounts.filter(
      (a) =>
        !(
          a.type === "savings" ||
          a.name.toLowerCase().includes("reserva") ||
          a.name.toLowerCase().includes("economia")
        ),
    );
    const available = operationalAccounts.reduce(
      (s, a) => s + getAccountBalance(a.id),
      0,
    );
    const reserved = 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthPrefix = todayStr.slice(0, 7);

    const pendingMonthExpenses = transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.status === "pending" &&
          (t.date <= todayStr || t.date.startsWith(currentMonthPrefix)),
      )
      .reduce((s, t) => s + Number(t.amount), 0);

    const free = available - pendingMonthExpenses;

    // Dívidas restantes
    const remainingDebts = debts.reduce((s, d) => {
      const debtTxs = transactions.filter((t) => t.debtId === d.id);
      const paid = debtTxs
        .filter((t) => t.status === "paid")
        .reduce((sub, t) => sub + Number(t.amount), 0);
      return s + Math.max(0, (Number(d.totalAmount) || 0) - paid);
    }, 0);

    return {
      available,
      reserved,
      pending: pendingMonthExpenses,
      free,
      remainingDebts,
    };
  }, [accounts, transactions, debts, getAccountBalance]);

  const activeRange = getPeriodDateRange(periodType, customStart, customEnd);

  return (
    <div className="pb-32 animate-fade-in text-slate-900 max-w-4xl mx-auto px-1 sm:px-2 w-full min-w-0 overflow-x-hidden">
      {/* Top Bar / Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start space-x-3 min-w-0">
          <Link
            to="/mais"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition active:scale-95 shadow-sm shrink-0"
            title="Voltar"
          >
            <ChevronLeft size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#0F388A] text-yellow-400 flex items-center justify-center shadow-sm shrink-0">
                <Bot size={18} />
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                Relatório Financeiro para IA
              </h1>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Estrutura rigorosa para análise de decisões no ChatGPT, Claude ou
              Gemini
            </p>
          </div>
        </div>

        {/* Quick Action Badges — wrap em mobile, sem ultrapassar a viewport */}
        <div className="flex flex-wrap items-center gap-2 w-full">
          <Link
            to="/financial-settings"
            className="px-3 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold transition active:scale-95 flex items-center space-x-1.5 shadow-sm"
            title="Configurar reserva mínima e classificação de categorias"
          >
            <Sliders size={14} />
            <span>Config. Reserva</span>
          </Link>

          <button
            onClick={handleGenerate}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 flex items-center space-x-1.5"
            title="Recalcular relatório"
          >
            <RefreshCw size={14} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportTxt}
            className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition active:scale-95 flex items-center space-x-1.5 shadow-sm"
            title="Baixar arquivo TXT"
          >
            <Download size={14} />
            <span>Exportar .TXT</span>
          </button>

          <button
            onClick={handleCopy}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center space-x-1.5 shadow-sm ${
              copied
                ? "bg-[#10B981] text-white"
                : "bg-[#0F388A] hover:bg-[#0D2F74] text-yellow-400"
            }`}
            title="Copiar relatório completo"
          >
            {copied ? (
              <Check size={14} strokeWidth={2.5} />
            ) : (
              <Copy size={14} />
            )}
            <span>{copied ? "Copiado!" : "Copiar Relatório"}</span>
          </button>
        </div>
      </div>

      {/* Snapshot Cards Bar: 4 Core Pillars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* 1. Dinheiro Hoje */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Dinheiro Hoje
            </span>
            <Wallet size={14} className="text-indigo-500" />
          </div>
          <span className="text-base font-black text-slate-800 tabular-nums block">
            {!isBlurred ? formatBRL(snapshot.available) : "R$ •••••"}
          </span>
          <span className="text-[10px] text-slate-400">
            Em caixa operacional
          </span>
        </div>

        {/* 2. Reservado */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Reservado
            </span>
            <PiggyBank size={14} className="text-amber-500" />
          </div>
          <span className="text-base font-black text-amber-600 tabular-nums block">
            {!isBlurred ? formatBRL(snapshot.reserved) : "R$ •••••"}
          </span>
          <span className="text-[10px] text-slate-400">
            Poupança e Reserva (intocável)
          </span>
        </div>

        {/* 3. Compromissos Imediatos */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Compromissos
            </span>
            <ArrowDownRight size={14} className="text-rose-500" />
          </div>
          <span className="text-base font-black text-rose-600 tabular-nums block">
            {!isBlurred ? formatBRL(snapshot.pending) : "R$ •••••"}
          </span>
          <span className="text-[10px] text-slate-400">A vencer no mês</span>
        </div>

        {/* 4. Caixa Livre Real */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Caixa Livre Real
            </span>
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
          <span
            className={`text-base font-black tabular-nums block ${snapshot.free >= 0 ? "text-emerald-600" : "text-rose-600"}`}
          >
            {!isBlurred ? formatBRL(snapshot.free) : "R$ •••••"}
          </span>
          <span className="text-[10px] text-slate-400">
            Após contas imediatas
          </span>
        </div>
      </div>

      {/* Simulador de decisão */}
      <div className="bg-white rounded-[2rem] p-5 shadow-xs border border-slate-200/80 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F388A] text-[#FACC15] flex items-center justify-center shrink-0">
              {scenarioType === "one_time_purchase" ? (
                <ShoppingBag size={18} />
              ) : scenarioType === "new_installment" ? (
                <CreditCard size={18} />
              ) : scenarioType === "new_fixed_cost" ? (
                <Repeat size={18} />
              ) : (
                <Home size={18} />
              )}
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Simular decisão
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {scenarioHelp}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScenarioEnabled((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition active:scale-95 shrink-0 ${
              scenarioEnabled
                ? "bg-[#0F388A] text-[#FACC15]"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {scenarioEnabled ? "Cenário ativo" : "Ativar cenário"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {DECISION_SCENARIO_OPTIONS.filter((o) => o.available).map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.description}
              disabled={!scenarioEnabled}
              onClick={() => {
                setScenarioType(opt.id);
                if (!scenarioEnabled) setScenarioEnabled(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition active:scale-95 disabled:opacity-50 ${
                scenarioEnabled && scenarioType === opt.id
                  ? "bg-blue-50 border-blue-200 text-[#0F388A]"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {scenarioEnabled && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {scenarioType === "rent_replace" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Aluguel atual (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={currentRentInput}
                    onChange={(e) => setCurrentRentInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {detectedRent.amount > 0
                      ? `Detectado: ${formatBRL(detectedRent.amount)} (${detectedRent.source})`
                      : "Não detectei aluguel nos lançamentos — preencha manualmente."}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Novo aluguel (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={newRentInput}
                    onChange={(e) => setNewRentInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Começa em
                  </label>
                  <input
                    type="month"
                    value={scenarioStartMonth}
                    onChange={(e) => setScenarioStartMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {(scenarioType === "new_fixed_cost" ||
              scenarioType === "one_time_purchase") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    {scenarioType === "one_time_purchase"
                      ? "Valor da compra (R$)"
                      : "Valor mensal (R$)"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={scenarioAmountInput}
                    onChange={(e) => setScenarioAmountInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    {scenarioType === "one_time_purchase"
                      ? "Mês da compra"
                      : "Começa em"}
                  </label>
                  <input
                    type="month"
                    value={scenarioStartMonth}
                    onChange={(e) => setScenarioStartMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {scenarioType === "new_installment" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Valor da parcela (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={installmentAmountInput}
                    onChange={(e) => setInstallmentAmountInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Quantidade (x)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={installmentCountInput}
                    onChange={(e) => setInstallmentCountInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Começa em
                  </label>
                  <input
                    type="month"
                    value={scenarioStartMonth}
                    onChange={(e) => setScenarioStartMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[9px] font-black uppercase text-slate-500">
                  {impactLabel}
                </p>
                <p
                  className={`text-sm font-black tabular-nums mt-0.5 ${
                    netImpact > 0
                      ? "text-rose-600"
                      : netImpact < 0
                        ? "text-emerald-600"
                        : "text-slate-800"
                  }`}
                >
                  {scenarioType !== "one_time_purchase" && netImpact > 0
                    ? "+ "
                    : ""}
                  {!isBlurred ? formatBRL(netImpact) : "••••"}
                </p>
              </div>
              {scenarioSim ? (
                <>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[9px] font-black uppercase text-slate-500">
                      Menor saldo
                    </p>
                    <p
                      className={`text-sm font-black tabular-nums mt-0.5 ${
                        scenarioSim.minBalance >= 0
                          ? "text-slate-800"
                          : "text-rose-600"
                      }`}
                    >
                      {!isBlurred ? formatBRL(scenarioSim.minBalance) : "••••"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[9px] font-black uppercase text-slate-500">
                      Meses no azul
                    </p>
                    <p className="text-sm font-black text-slate-800 tabular-nums mt-0.5">
                      {scenarioSim.monthsStillPositive}/
                      {scenarioSim.monthsInHorizon}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-[9px] font-black uppercase text-slate-500">
                      1º mês negativo
                    </p>
                    <p className="text-sm font-black text-slate-800 mt-0.5 truncate">
                      {scenarioSim.firstNegativeMonth || "Nenhum"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="col-span-2 sm:col-span-3 rounded-2xl bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-800 font-medium flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  {incompleteHint}
                </div>
              )}
            </div>

            {scenarioSim && (
              <div
                className={`rounded-2xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${verdictStyles[scenarioSim.verdict]}`}
              >
                <div className="flex items-start gap-2">
                  <Lightbulb size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide">
                      {scenarioSim.verdictLabel}
                    </p>
                    <p className="text-[11px] font-medium mt-0.5 leading-relaxed">
                      {scenarioSim.verdictTip}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScenarioPack}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition active:scale-95 shrink-0 flex items-center gap-1.5 ${
                    copiedScenario
                      ? "bg-emerald-600 text-white"
                      : "bg-[#0F388A] text-[#FACC15]"
                  }`}
                >
                  {copiedScenario ? <Check size={14} /> : <Copy size={14} />}
                  {copiedScenario ? "Copiado!" : "Copiar pergunta + relatório"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Period Selector Panel */}
      <div className="bg-white rounded-[2rem] p-5 shadow-xs border border-slate-200/80 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-indigo-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Horizonte de Análise do Relatório
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 self-start sm:self-auto">
            {activeRange.label}
          </span>
        </div>

        {/* Period Chips */}
        <div className="flex flex-wrap gap-2">
          {[
            {
              id: "current_plus_6m",
              label: "⭐ Situação Atual + Próximos 6 Meses (Padrão IA)",
            },
            { id: "current", label: "Situação Atual" },
            { id: "this_month", label: "Este Mês" },
            { id: "next_month", label: "Próximo Mês" },
            { id: "next_3_months", label: "Próximos 3 Meses" },
            { id: "next_6_months", label: "Próximos 6 Meses" },
            { id: "this_year", label: "Este Ano" },
            { id: "custom", label: "Personalizado" },
          ].map((p) => {
            const isSelected = periodType === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPeriodType(p.id as ReportPeriodType)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Inputs if"custom" is selected */}
        {periodType === "custom" && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-500">
                Início:
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-500">Fim:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Direct AI Launcher Bar (1-Click Copy & Open) */}
      <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900 to-slate-900 text-white rounded-[2rem] p-5 shadow-xl border border-indigo-500/20 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sparkles size={16} className="text-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
                Copiar e Abrir Direto na sua IA
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {scenarioSim
                ? "Copia a pergunta do cenário de aluguel + relatório completo e abre a IA"
                : "Copia o relatório estruturado e abre diretamente o chat da IA"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenAI("https://chatgpt.com")}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black transition active:scale-95 flex items-center space-x-1.5"
            >
              <span>ChatGPT</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>
            <button
              onClick={() => handleOpenAI("https://claude.ai")}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black transition active:scale-95 flex items-center space-x-1.5"
            >
              <span>Claude</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>
            <button
              onClick={() => handleOpenAI("https://gemini.google.com")}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black transition active:scale-95 flex items-center space-x-1.5"
            >
              <span>Gemini</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Questions to Ask the AI */}
      <div className="bg-white rounded-[2rem] p-5 shadow-xs border border-slate-200/80 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HelpCircle size={16} className="text-purple-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              {scenarioSim
                ? "Pergunta pronta do cenário (aluguel)"
                : "Perguntas prontas para a IA"}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            Copia a pergunta com o relatório já anexado
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {promptSuggestions.map((prompt, idx) => {
            const isJustCopied = copiedPromptIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => handleCopyPrompt(prompt, idx)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-200/70 text-left transition active:scale-[0.99] group flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">
                    Sugestão #{idx + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-700 line-clamp-2">
                    "{prompt}"
                  </p>
                </div>
                <div
                  className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                    isJustCopied
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-slate-400 group-hover:text-purple-600"
                  }`}
                >
                  {isJustCopied ? <Check size={14} /> : <Copy size={14} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pure Text Preview Window */}
      <div className="bg-slate-950 rounded-[2rem] p-5 shadow-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileText size={16} className="text-indigo-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Visualização do Texto Puro (Exportação Completa)
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
            <span>{reportText.split("\n").length} linhas</span>
            <span>•</span>
            <span>{reportText.length.toLocaleString("pt-BR")} caracteres</span>
          </div>
        </div>

        {/* Textarea / Code Box */}
        <div className="relative">
          <textarea
            readOnly
            value={reportText}
            rows={20}
            className="w-full bg-slate-900/90 text-emerald-300 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed select-all selection:bg-indigo-600 selection:text-white"
          />
        </div>

        {/* Bottom Bar: Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Info size={14} className="text-indigo-400" />
            <span>
              Dica: clique dentro da caixa para selecionar tudo com Ctrl+A.
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handleExportTxt}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <Download size={14} />
              <span>Baixar .TXT</span>
            </button>

            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center space-x-1.5 shadow-lg ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {copied ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <Copy size={14} />
              )}
              <span>
                {copied ? "Relatório Copiado!" : "Copiar Texto Completo"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
