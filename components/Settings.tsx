import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Moon,
  Download,
  Palette,
  Plus,
  X,
  Wallet,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Landmark,
  User,
  Bell,
  Clock,
  ChevronLeft,
  LayoutGrid,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  PiggyBank,
  Sliders,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";
import { Account } from "../types";
import { parseCurrencyInput } from "../constants";

export const Settings = () => {
  const {
    settings,
    updateSettings,
    transactions,
    categories,
    debts,
    accounts,
    budgets,
    addAccount,
    updateAccount,
    deleteAccount,
    reconcileBalance,
    getAccountBalance,
    getBackupInfo,
    currentUser,
  } = useFinance();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);

  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
    isAlert?: boolean;
  } | null>(null);

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<
    "wallet" | "bank" | "savings" | "investment" | "other"
  >("bank");
  const [accColor, setAccColor] = useState("#6366f1");

  const [reconcileAccountId, setReconcileAccountId] = useState("");
  const [actualBalance, setActualBalance] = useState("");

  const backupInfo = getBackupInfo();

  const openAccountModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setAccName(acc.name);
      setAccType(
        acc.type as "wallet" | "bank" | "savings" | "investment" | "other",
      );
      setAccColor(acc.color);
    } else {
      setEditingAccount(null);
      setAccName("");
      setAccType("bank");
      setAccColor("#6366f1");
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = () => {
    if (!accName) return;
    const accountData = {
      name: accName,
      type: accType,
      color: accColor,
      initialBalance: editingAccount ? editingAccount.initialBalance : 0,
      enabled: true,
    };

    if (editingAccount) {
      updateAccount({ ...editingAccount, ...accountData });
    } else {
      addAccount(accountData);
    }
    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = (acc: Account) => {
    setConfirmation({
      title: "Excluir Conta",
      message:
        "Deseja excluir esta conta e desvincular todas as transações associadas? ",
      onConfirm: () => {
        deleteAccount(acc.id);
        setIsAccountModalOpen(false);
      },
    });
  };

  const openReconcileModal = (acc: Account) => {
    setReconcileAccountId(acc.id);
    setActualBalance(getAccountBalance(acc.id).toString());
    setIsReconcileModalOpen(true);
  };

  const handleReconcile = () => {
    if (!reconcileAccountId) return;
    const val = parseCurrencyInput(actualBalance);
    if (isNaN(val)) return;
    reconcileBalance(reconcileAccountId, val);
    setIsReconcileModalOpen(false);
  };

  const toggleWidget = (id: string) => {
    const newLayout = settings.dashboardLayout.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w,
    );
    updateSettings({ dashboardLayout: newLayout });
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const newLayout = [...settings.dashboardLayout];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLayout.length) return;

    [newLayout[index], newLayout[targetIndex]] = [
      newLayout[targetIndex],
      newLayout[index],
    ];
    updateSettings({ dashboardLayout: newLayout });
  };

  const colors = [
    { key: "indigo", label: "Lime", hex: "#84cc16" },
    { key: "blue", label: "Azul", hex: "#3b82f6" },
    { key: "emerald", label: "Verde", hex: "#10b981" },
    { key: "violet", label: "Roxo", hex: "#8b5cf6" },
    { key: "rose", label: "Rosa", hex: "#f43f5e" },
    { key: "orange", label: "Laranja", hex: "#f97316" },
  ];

  const handleExport = () => {
    const data = {
      version: "1.1",
      timestamp: new Date().toISOString(),
      transactions,
      categories,
      settings,
      debts,
      accounts,
      budgets,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `financas_pro_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "wallet":
        return Wallet;
      case "savings":
        return PiggyBank;
      case "investment":
        return TrendingUp;
      case "bank":
      default:
        return Landmark;
    }
  };

  return (
    <div className="pb-32 animate-fade-in text-slate-900 max-w-md mx-auto relative">
      <div className="sticky top-0 bg-slate-50/80 backdrop-blur-lg z-30 pt-4 pb-4 px-2 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center">
          <Link
            to="/"
            className="p-2 mr-2 hover:bg-white rounded-full transition-all active:scale-90"
          >
            <ChevronLeft size={24} className="text-slate-500" />
          </Link>
          <h1 className="text-xl font-black tracking-tight text-slate-800">
            Ajustes
          </h1>
        </div>
        <div className="w-8"></div>
      </div>

      <div className="space-y-6 px-3 pt-4">
        {/* Perfil e preferências */}
        <section className="bg-white rounded-[2.2rem] p-6 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>

          <div className="flex items-center space-x-4 relative z-10 mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#0F388A] to-[#0F388A] rounded-[1.2rem] flex items-center justify-center text-slate-900 font-black shadow-lg shadow-blue-900/10 shrink-0">
              <User size={32} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-blue-800 uppercase tracking-widest block mb-1">
                Nome de Usuário
              </label>
              <input
                value={settings.userName || ""}
                onChange={(e) => updateSettings({ userName: e.target.value })}
                placeholder="Seu Nome"
                className="w-full bg-transparent text-xl font-black text-slate-900 outline-none placeholder:text-slate-400 border-b border-slate-200 focus:border-emerald-400 transition-colors pb-1"
              />
              {currentUser?.email && (
                <span className="text-[10px] text-slate-500 block mt-1.5 truncate">
                  {currentUser.email}
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3 mb-6 relative z-10">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              Conta padrão nos lançamentos
            </span>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <select
                value={
                  settings.personalDefaultAccountId || accounts[0]?.id || ""
                }
                onChange={(e) =>
                  updateSettings({ personalDefaultAccountId: e.target.value })
                }
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
            <button
              onClick={() => {
                const next =
                  settings.notificationInterval === 0
                    ? 12
                    : settings.notificationInterval === 12
                      ? 24
                      : 0;
                updateSettings({ notificationInterval: next });
              }}
              className="bg-slate-50 p-4 rounded-2xl flex flex-col items-start border border-slate-200 transition active:scale-95 text-left"
            >
              <div className="flex justify-between w-full mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Alertas de Vencimento
                </span>
                <Bell
                  size={16}
                  className={
                    settings.notificationInterval
                      ? "text-emerald-400"
                      : "text-zinc-600"
                  }
                />
              </div>
              <span className="text-sm font-bold text-slate-900">
                {settings.notificationInterval
                  ? `A cada ${settings.notificationInterval}h`
                  : "Desligado"}
              </span>
            </button>

            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-start border border-slate-200">
              <div className="flex justify-between w-full mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Tema
                </span>
                <Moon size={16} className="text-emerald-400" />
              </div>
              <span className="text-sm font-bold text-slate-900">Escuro</span>
            </div>

            <Link
              to="/financial-settings"
              className="bg-slate-50 hover:bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-200 transition active:scale-95 col-span-1 sm:col-span-2"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl">
                  <Sliders size={18} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-black text-slate-900 block">
                    Parâmetros Financeiros
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Reserva mínima, meses de proteção
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </Link>

            <Link
              to="/categories"
              className="bg-slate-50 hover:bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-200 transition active:scale-95 col-span-1 sm:col-span-2"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl">
                  <LayoutGrid size={18} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-slate-900 block">
                    Categorias
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Etiquetas de receitas e despesas
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-500" />
            </Link>
          </div>
        </section>

        {/* Contas */}
        <section>
          <div className="flex justify-between items-center mb-3 px-2">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Minhas Contas
            </h2>
            <button
              onClick={() => openAccountModal()}
              className="p-2 bg-[#0F388A] hover:bg-[#0F388A] text-[#FACC15] rounded-xl shadow-lg shadow-blue-900/10 active:scale-90 transition-all font-black"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>

          <div className="space-y-3">
            {accounts.map((acc) => {
              const Icon = getAccountIcon(acc.type);
              const balance = getAccountBalance(acc.id);
              return (
                <div
                  key={acc.id}
                  onClick={() => openAccountModal(acc)}
                  className="bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900 font-bold shadow-sm transition-transform group-hover:scale-110"
                      style={{ backgroundColor: acc.color }}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">
                        {acc.name}
                      </h3>
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                        {acc.type === "wallet"
                          ? "Carteira"
                          : acc.type === "bank"
                            ? "Conta Bancária"
                            : acc.type === "savings"
                              ? "Reserva"
                              : "Investimento"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-black text-sm ${balance >= 0 ? "text-slate-900" : "text-rose-400"}`}
                    >
                      R${" "}
                      {balance.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openReconcileModal(acc);
                      }}
                      className="flex items-center text-[9px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg mt-1 transition-colors"
                    >
                      <RefreshCw size={10} className="mr-1" /> Ajustar Saldo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Backup seguro (só export) + status de sync */}
        <section className="bg-white rounded-[2.2rem] overflow-hidden border border-slate-200">
          <div className="p-5">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center">
              <Clock size={14} className="mr-2 text-emerald-400" /> Sync e cópia
              de segurança
            </h2>

            <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-800/40 mb-4 space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wide">
                  {currentUser
                    ? "Sincronizado na nuvem"
                    : "Sem login — só neste aparelho"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed pl-4">
                Desktop e celular usam a mesma conta automaticamente. Não é
                preciso “publicar” nem restaurar banco.
              </p>
              {backupInfo && (
                <p className="text-[10px] text-slate-500 pl-4">
                  Cópia local:{" "}
                  {backupInfo.date.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            <button
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-slate-50 border border-slate-200 rounded-2xl transition active:scale-95 text-slate-900"
            >
              <Download size={18} className="text-emerald-400" />
              <span className="text-xs font-bold text-slate-700">
                Baixar backup JSON
              </span>
            </button>
            <p className="text-[10px] text-slate-500 mt-2 text-center px-2 leading-relaxed">
              Só salva uma cópia no seu computador/celular. Não altera o banco.
            </p>
          </div>
        </section>

        <button
          onClick={() => setIsLayoutModalOpen(true)}
          className="w-full py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center justify-center"
        >
          <Palette size={14} className="mr-2" /> Personalizar Dashboard
        </button>
      </div>

      {isLayoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-end sm:items-center justify-center backdrop-blur-md animate-fade-in p-0 sm:p-4">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                Organizar Início
              </h3>
              <button
                onClick={() => setIsLayoutModalOpen(false)}
                className="p-2 bg-slate-50 rounded-full transition-all active:scale-90"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              {settings.dashboardLayout.map((widget, index) => (
                <div
                  key={widget.id}
                  className="bg-slate-50 border border-slate-100 p-4 rounded-3xl flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => moveWidget(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-slate-300 hover:text-indigo-500 disabled:opacity-20"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveWidget(index, "down")}
                        disabled={index === settings.dashboardLayout.length - 1}
                        className="p-1 text-slate-300 hover:text-indigo-500 disabled:opacity-20"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                      {widget.label}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleWidget(widget.id)}
                    className={`p-2 rounded-xl transition-all ${widget.visible ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-400 opacity-50"}`}
                  >
                    {widget.visible ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                Cor de Destaque
              </h4>
              <div className="flex justify-between items-center px-1">
                {colors.map((c) => {
                  const isSelected =
                    (settings.primaryColor || "indigo") === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => updateSettings({ primaryColor: c.key })}
                      className={`w-10 h-10 rounded-full transition-all flex items-center justify-center relative ${isSelected ? "scale-110 shadow-xl shadow-blue-900/10 ring-4 ring-white" : "hover:scale-105 opacity-60 hover:opacity-100"}`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <CheckCircle2
                          size={18}
                          className="text-slate-900 drop-shadow-md"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setIsLayoutModalOpen(false)}
              className="w-full mt-8 py-5 bg-[#0F388A] text-[#FACC15] rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-[#0F388A] active:scale-[0.98] transition-all"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-end sm:items-center justify-center backdrop-blur-md animate-fade-in p-0 sm:p-4">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-slide-up">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingAccount ? "Editar Conta" : "Nova Conta"}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-2 bg-slate-50 rounded-full transition-all active:scale-90"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Identificação
                </label>
                <input
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] outline-none font-bold text-lg"
                  placeholder="Ex: Nubank, Bradesco..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Categoria
                </label>
                <div className="flex p-1 bg-slate-50 rounded-2xl">
                  {(["bank", "wallet", "savings", "investment"] as const).map(
                    (t) => (
                      <button
                        key={t}
                        onClick={() => setAccType(t)}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${accType === t ? "bg-white text-indigo-600 shadow-md scale-[1.02]" : "text-slate-400"}`}
                      >
                        {t === "bank"
                          ? "Banco"
                          : t === "wallet"
                            ? "Bolso"
                            : t === "savings"
                              ? "Reserva"
                              : "Inv."}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">
                  Cor
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#ec4899"].map(
                    (c) => (
                      <button
                        key={c}
                        onClick={() => setAccColor(c)}
                        className={`aspect-square rounded-2xl transition-all relative ${accColor === c ? "scale-110 ring-4 ring-white shadow-lg" : "opacity-60 hover:opacity-100"}`}
                        style={{ backgroundColor: c }}
                      >
                        {accColor === c && (
                          <CheckCircle2
                            size={16}
                            className="text-slate-900 mx-auto drop-shadow-md"
                          />
                        )}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="pt-4 flex flex-col space-y-3">
                <button
                  onClick={handleSaveAccount}
                  className="w-full py-5 bg-[#0F388A] text-[#FACC15] rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-[#0F388A] active:scale-[0.98] transition-all"
                >
                  Confirmar Conta
                </button>

                {editingAccount && (
                  <button
                    onClick={() => handleDeleteAccount(editingAccount)}
                    className="w-full py-4 text-rose-500 font-bold text-xs uppercase tracking-widest hover:bg-rose-50 rounded-[1.5rem] transition"
                  >
                    Excluir Definitivamente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isReconcileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in ">
          <div className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-scale-in ">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
                <RefreshCw size={36} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                Ajuste de Saldo
              </h3>
              <p className="text-xs text-slate-500 mt-2 px-4">
                Informe o saldo real do banco para alinhar o app.
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Saldo no App
                </span>
                <span className="text-lg font-black text-slate-800">
                  R${" "}
                  {reconcileAccountId
                    ? getAccountBalance(reconcileAccountId).toLocaleString(
                        "pt-BR",
                        { minimumFractionDigits: 2 },
                      )
                    : "0,00"}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Novo Saldo Real
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">
                    R$
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={actualBalance}
                    onChange={(e) => setActualBalance(e.target.value)}
                    className="w-full pl-14 pr-5 py-5 bg-white border-2 border-indigo-100 focus:border-indigo-500 rounded-[1.5rem] outline-none font-black text-2xl shadow-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsReconcileModalOpen(false)}
                  className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReconcile}
                  className="flex-1 py-4 bg-[#0F388A] text-[#FACC15] rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-[#0F388A] transition active:scale-[0.98]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in ">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-scale-in text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmation.isAlert ? "bg-indigo-100 text-indigo-600" : "bg-rose-100 text-rose-600"}`}
            >
              {confirmation.isAlert ? (
                <CheckCircle2 size={32} />
              ) : (
                <AlertTriangle size={32} />
              )}
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">
              {confirmation.title}
            </h3>
            <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed whitespace-pre-line">
              {confirmation.message}
            </p>

            <div className="flex space-x-3">
              {!confirmation.isAlert && (
                <button
                  onClick={() => setConfirmation(null)}
                  className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 rounded-2xl text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  if (confirmation.onConfirm) confirmation.onConfirm();
                  setConfirmation(null);
                }}
                className={`flex-1 py-4 text-slate-900 font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg ${confirmation.isAlert ? "bg-[#0F388A] w-full" : "bg-rose-600 shadow-rose-200"}`}
              >
                {confirmation.isAlert ? "OK" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
