import React, { useState, useMemo } from "react";
import { useFinance } from "../../context/FinanceContext";
import {
  Plus,
  CreditCard,
  Building,
  User,
  CheckCircle2,
  TrendingDown,
  CarFront,
  Eye,
  EyeOff,
} from "lucide-react";
import { DebtModal } from "./DebtModal";
import { DebtDetailModal } from "./DebtDetailModal";
import { ActiveDebtsPanel } from "../ActiveDebtsPanel";
import { isSomLeoDebtOrTransaction } from "../../services/financeAggregator";

export {
  DebtDetailModal,
  DebtDetailModal as DebtDetail,
} from "./DebtDetailModal";

export const DebtList: React.FC = () => {
  const { debts, transactions, getDebtProgress, isBlurred, toggleBlur } =
    useFinance();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "paid">("active");

  const formatCurrency = (val: number) => {
    if (isBlurred) return "R$ •••••";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const stats = useMemo(() => {
    const cleanDebts = debts.filter((d) => !isSomLeoDebtOrTransaction(d));
    const active = cleanDebts.filter(
      (d) => getDebtProgress(d.id).status === "active",
    );
    const paid = cleanDebts.filter(
      (d) => getDebtProgress(d.id).status === "paid",
    );

    const totalDebt = cleanDebts.reduce(
      (sum, d) => sum + (Number(d.totalAmount) || 0),
      0,
    );
    const totalPaid = cleanDebts.reduce(
      (sum, d) => sum + getDebtProgress(d.id).paid,
      0,
    );
    const totalRemaining = active.reduce(
      (sum, d) => sum + getDebtProgress(d.id).remaining,
      0,
    );

    // Compromisso mensal = soma das parcelas das dívidas com saldo > 0
    const monthlyCommitment = active.reduce((sum, d) => {
      const { remaining } = getDebtProgress(d.id);
      if (remaining <= 0.05) return sum;

      if (d.installmentAmount && d.installmentAmount > 0) {
        return sum + Number(d.installmentAmount);
      }

      const pendingTxs = transactions
        .filter((t) => t.debtId === d.id && t.status === "pending")
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      if (pendingTxs.length > 0 && Number(pendingTxs[0].amount) > 0) {
        return sum + Number(pendingTxs[0].amount);
      }

      const totalCount =
        d.installmentCount ||
        transactions.filter((t) => t.debtId === d.id).length ||
        1;
      if (totalCount > 0 && Number(d.totalAmount) > 0) {
        return sum + Number(d.totalAmount) / totalCount;
      }
      return sum;
    }, 0);

    return {
      active,
      paid,
      totalDebt,
      totalRemaining,
      totalPaid,
      monthlyCommitment,
      progress:
        totalDebt > 0 ? Math.min(100, (totalPaid / totalDebt) * 100) : 0,
    };
  }, [debts, transactions, getDebtProgress]);

  const getIcon = (type: string) => {
    switch (type) {
      case "bank":
        return Building;
      case "person":
        return User;
      case "car_financing":
        return CarFront;
      default:
        return CreditCard;
    }
  };

  const healthTone =
    stats.active.length === 0
      ? "good"
      : stats.progress >= 60
        ? "ok"
        : "bad";
  const healthStyles = {
    good: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    ok: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    bad: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  } as const;
  const healthLabel =
    stats.active.length === 0
      ? "Quitado"
      : stats.progress >= 60
        ? "Em dia"
        : "Atenção";

  return (
    <div className="space-y-5 pb-28 animate-fade-in text-slate-900 -mx-3.5 sm:mx-0">
      {/* HERO — mesmo DNA de Início / Lançamentos */}
      <div className="relative bg-gradient-to-b from-[#0F388A] via-[#0D2F74] to-slate-50 px-4 pt-3 pb-8 rounded-b-[2.5rem] shadow-xl overflow-hidden text-white">
        <div className="flex items-center justify-between pt-1 mb-4">
          <div>
            <p className="text-[11px] font-bold text-blue-200">Passivos</p>
            <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <CreditCard size={18} className="text-[#FACC15]" />
              Dívidas
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleBlur()}
              className="p-2.5 rounded-2xl bg-blue-950/60 border border-blue-500/30 text-blue-200 hover:text-white transition active:scale-95"
              title={isBlurred ? "Exibir valores" : "Ocultar valores"}
            >
              {isBlurred ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="p-2.5 rounded-2xl bg-[#FACC15] text-[#0F388A] border border-[#FACC15]/60 shadow-md transition active:scale-95"
              aria-label="Nova dívida"
              title="Nova dívida"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="rounded-3xl bg-[#0F388A] border border-[#FACC15]/40 ring-1 ring-[#FACC15]/20 p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-200">
                Compromisso mensal
              </p>
              <p className="mt-1.5 text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-white">
                {formatCurrency(stats.monthlyCommitment)}
              </p>
              <p className="text-[11px] text-blue-200 mt-1 font-medium">
                Soma das parcelas das {stats.active.length} dívida
                {stats.active.length === 1 ? "" : "s"} ativa
                {stats.active.length === 1 ? "" : "s"}
              </p>
            </div>
            <span
              className={`shrink-0 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border ${healthStyles[healthTone]}`}
            >
              {healthLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1">
                <TrendingDown size={10} /> Dívidas totais
              </p>
              <p className="text-sm font-black text-rose-300 tabular-nums mt-0.5">
                {formatCurrency(stats.totalDebt)}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-950/50 border border-blue-700/40 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-wider text-blue-300">
                Saldo restante
              </p>
              <p className="text-sm font-black text-white tabular-nums mt-0.5">
                {formatCurrency(stats.totalRemaining)}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-blue-700/40 pt-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
              <span className="text-blue-200">Progresso de amortização</span>
              <span className="text-emerald-300 tabular-nums">
                {stats.progress.toFixed(0)}% pago
              </span>
            </div>
            <div className="h-2.5 w-full bg-blue-950/60 rounded-full overflow-hidden border border-blue-700/40">
              <div
                className="h-full bg-gradient-to-r from-[#FACC15] to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-blue-200/90">
              <span>Amortizado: {formatCurrency(stats.totalPaid)}</span>
              <span>
                {stats.active.length} ativa
                {stats.active.length === 1 ? "" : "s"} · {stats.paid.length}{" "}
                quitada{stats.paid.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3.5 sm:px-0 space-y-5">
        <ActiveDebtsPanel
          onNewDebt={() => setIsFormOpen(true)}
          onSelectDebt={(id) => setSelectedDebtId(id)}
          compactSummary
        />

        {/* Tabs Ativas vs Quitadas */}
        <div className="flex space-x-2 p-1.5 bg-slate-100 rounded-[1.8rem] max-w-sm mx-auto border border-slate-200">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === "active"
                ? "bg-white text-[#0F388A] shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Em andamento ({stats.active.length})
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`flex-1 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === "paid"
                ? "bg-white text-[#10B981] shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Quitadas ({stats.paid.length})
          </button>
        </div>

        {/* Lista de Contratos / Dívidas */}
        <div className="space-y-4">
          {(activeTab === "active" ? stats.active : stats.paid).map((debt) => {
            const { paid, remaining, progress, status } = getDebtProgress(
              debt.id,
            );
            const Icon = getIcon(debt.type);

            return (
              <div
                key={debt.id}
                onClick={() => setSelectedDebtId(debt.id)}
                className="group bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 hover:border-[#0F388A]/40 transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        status === "paid"
                          ? "bg-emerald-50 text-[#10B981]"
                          : "bg-blue-50 text-[#0F388A]"
                      }`}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-[#0F388A] transition">
                          {debt.name}
                        </h3>
                        {status === "paid" && (
                          <CheckCircle2
                            size={16}
                            className="text-[#10B981] shrink-0"
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                        {debt.installmentCount} parcelas •{" "}
                        {debt.startDate
                          ? new Date(
                              debt.startDate + "T12:00:00",
                            ).toLocaleDateString("pt-BR")
                          : "Início"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 tabular-nums block">
                      {formatCurrency(remaining)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      {status === "paid" ? "Quitado" : "Saldo restante"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>Pago: {formatCurrency(paid)}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        status === "paid" ? "bg-[#10B981]" : "bg-[#0F388A]"
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}

          {(activeTab === "active" ? stats.active : stats.paid).length ===
            0 && (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8">
              <CreditCard size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-black uppercase text-slate-900">
                Nenhuma dívida{" "}
                {activeTab === "active" ? "em andamento" : "quitada"}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {activeTab === "active"
                  ? "Toque no botão + acima para cadastrar seu primeiro acordo ou parcelamento"
                  : "Suas dívidas finalizadas aparecerão aqui"}
              </p>
            </div>
          )}
        </div>
      </div>

      {isFormOpen && <DebtModal onClose={() => setIsFormOpen(false)} />}

      {selectedDebtId && (
        <DebtDetailModal
          debtId={selectedDebtId}
          onClose={() => setSelectedDebtId(null)}
        />
      )}
    </div>
  );
};

export const DebtsScreen: React.FC = () => {
  return <DebtList />;
};
