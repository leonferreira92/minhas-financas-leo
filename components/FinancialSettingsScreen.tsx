import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";
import {
  Sliders,
  ShieldCheck,
  ChevronLeft,
  Save,
  Check,
  CheckCircle2,
  FolderTree,
  ArrowRight,
} from "lucide-react";
import {
  DEFAULT_FINANCIAL_SETTINGS,
  parseCurrencyInput,
} from "../constants";
import { useFinancialMetrics } from "../hooks/useFinancialMetrics";

/**
 * Parâmetros de reserva / sobrevivência.
 * Classificação de categorias (essencialidade) vive exclusivamente em /categorias.
 */
export const FinancialSettingsScreen: React.FC = () => {
  const {
    accounts,
    settings,
    updateFinancialSettings,
    getAccountBalance,
  } = useFinance();

  const { survivalCost } = useFinancialMetrics({ period: "3m" });

  const currentSettings = useMemo(() => {
    return settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
  }, [settings.financialSettings]);

  const [minReserve, setMinReserve] = useState<string>(() => {
    return (currentSettings.minReserveAmount ?? 5000).toString();
  });

  const [targetMonths, setTargetMonths] = useState<number>(() => {
    return currentSettings.targetReserveMonths ?? 6;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const totalReservedToday = useMemo(() => {
    return accounts
      .filter((a) => a.type === "savings")
      .reduce((s, a) => s + getAccountBalance(a.id), 0);
  }, [accounts, getAccountBalance]);

  const monthlyEssentialEstimate = survivalCost;
  const parsedMinReserve = parseCurrencyInput(minReserve) || 0;
  const targetFromMonths =
    monthlyEssentialEstimate > 0 ? targetMonths * monthlyEssentialEstimate : 0;
  const targetSafetyReserve = Math.max(parsedMinReserve, targetFromMonths);
  const reserveCoveragePct =
    targetSafetyReserve > 0
      ? Math.min(
          100,
          Math.round((totalReservedToday / targetSafetyReserve) * 100),
        )
      : 100;

  const handleSave = () => {
    const val = parseCurrencyInput(minReserve) || 0;
    // Só reserva — essencialidade vive em /categorias (não reescreve listas legadas).
    updateFinancialSettings({
      minReserveAmount: val,
      targetReserveMonths: targetMonths,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <div className="pb-32 animate-fade-in text-slate-900 max-w-xl mx-auto px-2 sm:px-4">
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center space-x-3">
          <Link
            to="/mais"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition active:scale-95 shadow-xs"
            title="Voltar ao menu"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0F388A] to-[#0F388A] text-[#FACC15] flex items-center justify-center shadow-md">
                <Sliders size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Reserva e regras
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reserva mínima e meses de proteção de emergência
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center space-x-1.5 shadow-md ${
            savedSuccess
              ? "bg-emerald-600 text-slate-900"
              : "bg-[#0F388A] hover:bg-[#0F388A] text-[#FACC15]"
          }`}
        >
          {savedSuccess ? <Check size={16} /> : <Save size={16} />}
          <span>{savedSuccess ? "Salvo!" : "Salvar"}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-slide-up">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>
            Configurações atualizadas com sucesso! Os cálculos de cobertura de
            reserva já foram recalculados.
          </span>
        </div>
      )}

      <div className="p-5 rounded-[2rem] bg-gradient-to-br from-slate-900 to-[#0F388A] text-slate-900 shadow-xl border border-slate-800 relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center space-x-1">
            <ShieldCheck size={14} />
            <span>Diagnóstico de Proteção</span>
          </span>
          <span className="text-xs font-bold text-slate-300">
            {reserveCoveragePct}% Coberto
          </span>
        </div>

        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all duration-500 ${
              reserveCoveragePct >= 100
                ? "bg-emerald-400"
                : reserveCoveragePct >= 50
                  ? "bg-amber-400"
                  : "bg-rose-400"
            }`}
            style={{ width: `${reserveCoveragePct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-0.5">
              Reservado Hoje (Poupança)
            </span>
            <span className="text-base font-black text-white">
              {formatBRL(totalReservedToday)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-0.5">
              Meta Total Adotada
            </span>
            <span className="text-base font-black text-amber-300">
              {formatBRL(targetSafetyReserve)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-[2rem] bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
              1
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Reserva Financeira e Sobrevivência
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Reserva Mínima Desejada (R$)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Patrimônio intocável em reservas e poupança que protege contra
              imprevistos.
            </p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                R$
              </div>
              <input
                type="text"
                value={minReserve}
                onChange={(e) => setMinReserve(e.target.value)}
                placeholder="5000"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-black text-base outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-600">
                Quantidade de Meses de Reserva Desejada
              </label>
              <span className="text-xs font-black text-emerald-400">
                {targetMonths} meses
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Quantos meses de despesas essenciais você deseja ter garantidos de
              reserva para emergências.
            </p>

            <div className="grid grid-cols-4 gap-2">
              {[3, 6, 9, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetMonths(m)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition active:scale-95 border ${
                    targetMonths === m
                      ? "bg-emerald-500 text-slate-900 border-emerald-500 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {m} meses
                </button>
              ))}
            </div>

            {monthlyEssentialEstimate > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Custo Essencial Estimado ({targetMonths}m):</span>
                <span className="font-bold text-slate-900">
                  {formatBRL(targetFromMonths)} (
                  {formatBRL(monthlyEssentialEstimate)}/mês)
                </span>
              </div>
            )}
          </div>
        </div>

        <Link
          to="/categorias"
          className="p-4 rounded-[1.5rem] bg-white border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-200 hover:bg-blue-50/40 transition group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <FolderTree size={18} />
            </div>
            <div>
              <span className="text-sm font-black text-slate-900 block">
                Classificar categorias
              </span>
              <span className="text-[11px] text-slate-500">
                Essencial, Estilo de Vida, Investimento e Dívida — gerencie em
                Categorias
              </span>
            </div>
          </div>
          <ArrowRight
            size={16}
            className="text-slate-300 group-hover:text-blue-800 transition"
          />
        </Link>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-[#0F388A] hover:bg-[#0F388A] text-[#FACC15] font-black text-sm uppercase tracking-wider transition active:scale-95 shadow-lg shadow-blue-900/10 flex items-center justify-center space-x-2"
        >
          <Save size={18} strokeWidth={2.5} />
          <span>Salvar Parâmetros de Reserva</span>
        </button>
      </div>
    </div>
  );
};
