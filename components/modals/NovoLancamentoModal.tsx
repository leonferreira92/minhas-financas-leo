import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Check,
  Calculator,
  Delete,
  ChevronRight,
  Search,
  Calendar as CalendarIcon,
  Wallet,
  ArrowRightLeft,
  Repeat,
  AlertTriangle,
} from "lucide-react";
import { useFinance } from "../../context/FinanceContext";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  ScopeType,
} from "../../types";
import { parseCurrencyInput } from "../../services/financeAggregator";
import {
  resolveCategorySelection,
  getEffectiveCategorySelectionId,
  getActiveCategories,
} from "../../services/categoryHierarchy";
import { getLocalDateString } from "../../services/dateUtils";
import {
  PERSONAL_ONLY_MODE,
  isBusinessCategory,
} from "../../services/personalOnlyMode";
import { CategoryIcon } from "../ui/CategoryIcon";
import { CategorySelector } from "../ui/CategorySelector";

interface Props {
  onClose: () => void;
  initialType?: TransactionType;
  initialCategoryId?: string;
  initialIsFixed?: boolean;
  transaction?: Transaction | null;
}

type DrawerKind = "category" | "account" | "destAccount" | null;

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

const shiftDate = (iso: string, days: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Modal de Novo Lançamento — layout amplo estilo Mobills.
 * Drawer interno para categoria/conta (sem empilhar modais).
 */
export const NovoLancamentoModal: React.FC<Props> = ({
  onClose,
  initialType = "expense",
  initialCategoryId,
  initialIsFixed = false,
  transaction,
}) => {
  const {
    addTransaction,
    updateTransaction,
    updateTransactionSeries,
    updateDebtTransaction,
    categories,
    accounts,
    getDefaultAccountForScope,
    settings,
  } = useFinance();

  const resolveInitialSelection = () => {
    if (transaction) {
      return {
        categoryId: transaction.categoryId || "",
        subcategoryId: transaction.subcategoryId,
      };
    }
    const seed =
      initialCategoryId ||
      (initialType === "income"
        ? settings.defaultIncomeCategoryId
        : settings.defaultExpenseCategoryId) ||
      "";
    if (!seed) return { categoryId: "", subcategoryId: undefined as string | undefined };
    return resolveCategorySelection(seed, categories);
  };

  const initialSelection = resolveInitialSelection();

  const [type, setType] = useState<TransactionType>(
    transaction?.type || initialType,
  );
  const [amountStr, setAmountStr] = useState(() =>
    transaction ? String(transaction.amount) : "",
  );
  const [calcExpr, setCalcExpr] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [description, setDescription] = useState(
    transaction?.description || "",
  );
  const [categoryId, setCategoryId] = useState(initialSelection.categoryId);
  const [subcategoryId, setSubcategoryId] = useState<string | undefined>(
    initialSelection.subcategoryId,
  );
  const [accountId, setAccountId] = useState(
    transaction?.accountId || "",
  );
  const [destinationAccountId, setDestinationAccountId] = useState(
    transaction?.destinationAccountId || "",
  );
  const [date, setDate] = useState(
    () => transaction?.date || getLocalDateString(),
  );
  const [status, setStatus] = useState<TransactionStatus>(
    transaction?.status ||
      (initialIsFixed && !transaction ? "pending" : "paid"),
  );
  const [isFixed, setIsFixed] = useState(
    Boolean(transaction?.isFixed || (initialIsFixed && !transaction)),
  );
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showRecurringEditModal, setShowRecurringEditModal] = useState(false);
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(
    null,
  );

  const today = getLocalDateString();
  const yesterday = shiftDate(today, -1);

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const def = getDefaultAccountForScope("PERSONAL");
      setAccountId(transaction?.accountId || def || accounts[0].id);
    }
  }, [accounts, accountId, getDefaultAccountForScope, transaction]);

  const amountValue = useMemo(() => {
    if (calcExpr) {
      try {
        // Expressão segura: só dígitos e + - * /
        if (!/^[\d.\s+\-*/()]+$/.test(calcExpr)) return parseCurrencyInput(amountStr);
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${calcExpr})`)();
        return typeof result === "number" && Number.isFinite(result)
          ? result
          : parseCurrencyInput(amountStr);
      } catch {
        return parseCurrencyInput(amountStr);
      }
    }
    return parseCurrencyInput(amountStr);
  }, [amountStr, calcExpr]);

  const moduleCategories = useMemo(() => {
    return getActiveCategories(categories).filter((c) => {
      if (c.type !== type) return false;
      if (PERSONAL_ONLY_MODE && isBusinessCategory(c)) return false;
      return (c.scope || "PERSONAL") !== "BUSINESS" || !PERSONAL_ONLY_MODE;
    });
  }, [categories, type]);

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return moduleCategories;
    return moduleCategories.filter((c) => c.name.toLowerCase().includes(term));
  }, [moduleCategories, categorySearch]);

  const selectedCategory = useMemo(() => {
    const eff = getEffectiveCategorySelectionId(categoryId, subcategoryId);
    return categories.find((c) => c.id === eff) || categories.find((c) => c.id === categoryId);
  }, [categories, categoryId, subcategoryId]);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const selectedDest = accounts.find((a) => a.id === destinationAccountId);

  const typeAccent =
    type === "income"
      ? "text-emerald-600"
      : type === "transfer"
        ? "text-indigo-600"
        : "text-rose-600";

  const typeBg =
    type === "income"
      ? "bg-emerald-500"
      : type === "transfer"
        ? "bg-indigo-500"
        : "bg-rose-500";

  const handleTypeChange = (next: TransactionType) => {
    setType(next);
    setCategoryId("");
    setSubcategoryId(undefined);
    if (next === "transfer") {
      setStatus("paid");
    }
  };

  const handleSelectCategory = (id: string) => {
    const resolved = resolveCategorySelection(id, categories);
    setCategoryId(resolved.categoryId);
    setSubcategoryId(resolved.subcategoryId);
    setDrawer(null);
    setCategorySearch("");
  };

  const appendKey = (key: string) => {
    if (key === "C") {
      setCalcExpr("");
      setAmountStr("");
      return;
    }
    if (key === "back") {
      setCalcExpr((prev) => prev.slice(0, -1));
      return;
    }
    if (key === "=" || key === "done") {
      const val = amountValue;
      setAmountStr(val > 0 ? val.toFixed(2) : "");
      setCalcExpr("");
      if (key === "done") setShowKeypad(false);
      return;
    }
    setCalcExpr((prev) => {
      const next = prev + key;
      setAmountStr(next);
      return next;
    });
  };

  const buildPayload = () => {
    const val = amountValue;
    const hierarchyResolved =
      type === "transfer"
        ? { categoryId: "cat_transfer", subcategoryId: undefined as string | undefined }
        : resolveCategorySelection(
            getEffectiveCategorySelectionId(categoryId, subcategoryId) ||
              categoryId,
            categories,
          );

    return {
      type,
      amount: val,
      description: description.trim(),
      categoryId: hierarchyResolved.categoryId,
      subcategoryId: hierarchyResolved.subcategoryId,
      accountId,
      destinationAccountId:
        type === "transfer" ? destinationAccountId : undefined,
      date,
      status,
      isFixed,
      interest: 0,
      scope: "PERSONAL" as ScopeType,
      importedFromBank: transaction?.importedFromBank,
      originalBankDescription: transaction?.originalBankDescription,
      bankFitId: transaction?.bankFitId,
    };
  };

  const handleSave = () => {
    const val = amountValue;
    if (!val || val <= 0 || !description.trim() || !accountId) {
      setValidationError(
        "Preencha o valor, a descrição e a conta de lançamento.",
      );
      return;
    }
    if (type !== "transfer" && !categoryId) {
      setValidationError("Selecione uma categoria.");
      return;
    }
    if (type === "transfer") {
      if (!destinationAccountId) {
        setValidationError("Selecione a conta de destino.");
        return;
      }
      if (accountId === destinationAccountId) {
        setValidationError("Origem e destino devem ser diferentes.");
        return;
      }
    }
    setValidationError(null);
    const data = buildPayload();

    if (transaction) {
      if (transaction.debtId) {
        updateDebtTransaction({ ...transaction, ...data }, true);
        onClose();
        return;
      }
      if (transaction.fixedGroupId) {
        setPendingData(data);
        setShowRecurringEditModal(true);
        return;
      }
      updateTransaction({ ...transaction, ...data });
      onClose();
      return;
    }
    addTransaction(data);
    onClose();
  };

  const keypadKeys = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["C", "0", ".", "+"],
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-[2px] animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={transaction ? "Editar lançamento" : "Novo lançamento"}
        className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[96vh] flex flex-col overflow-hidden animate-slide-up border border-slate-100"
      >
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition active:scale-95"
            aria-label="Fechar"
          >
            <X size={18} className="text-slate-500" />
          </button>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            {transaction ? "Editar" : "Novo lançamento"}
          </h2>
          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-2 rounded-xl bg-[#0F388A] text-[#FACC15] text-[11px] font-black uppercase tracking-wide active:scale-95 shadow-sm"
          >
            Salvar
          </button>
        </div>

        {/* Tipo */}
        <div className="px-4 pb-3 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {(
              [
                ["expense", "Despesa"],
                ["income", "Receita"],
                ["transfer", "Transfer."],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                disabled={Boolean(transaction?.debtId)}
                onClick={() => handleTypeChange(id)}
                className={`py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  type === id
                    ? id === "income"
                      ? "bg-emerald-500 text-white shadow-md"
                      : id === "transfer"
                        ? "bg-indigo-500 text-white shadow-md"
                        : "bg-rose-500 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 space-y-4">
          {/* Valor destaque */}
          <div className="rounded-3xl bg-slate-50 border border-slate-200/80 p-5 text-center relative">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
              Valor
            </p>
            <button
              type="button"
              onClick={() => setShowKeypad((v) => !v)}
              className={`text-4xl sm:text-5xl font-black tabular-nums leading-none ${typeAccent} active:scale-[0.98] transition`}
            >
              {formatBRL(amountValue || 0)}
            </button>
            {calcExpr && (
              <p className="mt-2 text-xs font-mono text-slate-400 truncate">
                {calcExpr}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowKeypad((v) => !v)}
              className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition ${
                showKeypad
                  ? `${typeBg} text-white`
                  : "bg-white border border-slate-200 text-slate-500"
              }`}
            >
              <Calculator size={12} />
              {showKeypad ? "Ocultar teclado" : "Calculadora"}
            </button>

            {showKeypad && (
              <div className="mt-4 space-y-2 animate-fade-in">
                {keypadKeys.map((row) => (
                  <div key={row.join("-")} className="grid grid-cols-4 gap-2">
                    {row.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => appendKey(k)}
                        className={`h-12 rounded-2xl font-black text-lg active:scale-95 transition ${
                          ["+", "-", "*", "/", "C"].includes(k)
                            ? "bg-slate-200 text-slate-700"
                            : "bg-white border border-slate-200 text-slate-800"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => appendKey("back")}
                    className="h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center active:scale-95"
                  >
                    <Delete size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => appendKey("=")}
                    className="h-12 rounded-2xl bg-slate-800 text-white font-black active:scale-95"
                  >
                    =
                  </button>
                  <button
                    type="button"
                    onClick={() => appendKey("done")}
                    className={`h-12 rounded-2xl ${typeBg} text-white font-black uppercase text-xs tracking-wider active:scale-95`}
                  >
                    Pronto
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
              Descrição
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === "expense"
                  ? "Ex: Almoço, Mercado, Uber"
                  : type === "income"
                    ? "Ex: Salário, Freelance"
                    : "Ex: Transferência para reserva"
              }
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none text-sm font-bold placeholder:font-medium placeholder:text-slate-400 transition"
            />
          </div>

          {/* Pills: Categoria + Conta */}
          <div className="space-y-2.5">
            {type !== "transfer" && (
              <button
                type="button"
                onClick={() => setDrawer("category")}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 transition active:scale-[0.99] text-left"
              >
                {selectedCategory ? (
                  <CategoryIcon
                    iconName={selectedCategory.icon}
                    color={selectedCategory.color}
                    size="sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-black">
                    ?
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Categoria
                  </p>
                  <p className="text-sm font-black text-slate-800 truncate">
                    {selectedCategory?.name || "Selecionar categoria"}
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-300 shrink-0" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setDrawer("account")}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 transition active:scale-[0.99] text-left"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: selectedAccount?.color || "#64748b" }}
              >
                <Wallet size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {type === "transfer" ? "Conta origem" : "Conta / Banco"}
                </p>
                <p className="text-sm font-black text-slate-800 truncate">
                  {selectedAccount?.name || "Selecionar conta"}
                </p>
              </div>
              <ChevronRight size={18} className="text-slate-300 shrink-0" />
            </button>

            {type === "transfer" && (
              <button
                type="button"
                onClick={() => setDrawer("destAccount")}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-indigo-50/80 border-2 border-indigo-100 hover:border-indigo-200 transition active:scale-[0.99] text-left"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                  <ArrowRightLeft size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                    Conta destino
                  </p>
                  <p className="text-sm font-black text-slate-800 truncate">
                    {selectedDest?.name || "Selecionar destino"}
                  </p>
                </div>
                <ChevronRight size={18} className="text-indigo-300 shrink-0" />
              </button>
            )}
          </div>

          {/* Data chips */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
              Data
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => {
                  setDate(today);
                  if (!transaction) setStatus("paid");
                }}
                className={`px-3.5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition ${
                  date === today
                    ? "bg-[#0F388A] text-[#FACC15]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  setDate(yesterday);
                  if (!transaction) setStatus("paid");
                }}
                className={`px-3.5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition ${
                  date === yesterday
                    ? "bg-[#0F388A] text-[#FACC15]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                Ontem
              </button>
              <label
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider cursor-pointer transition ${
                  date !== today && date !== yesterday
                    ? "bg-[#0F388A] text-[#FACC15]"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <CalendarIcon size={12} />
                {date !== today && date !== yesterday
                  ? new Date(date + "T12:00:00").toLocaleDateString("pt-BR")
                  : "Outra"}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDate(v);
                    if (!transaction) {
                      const selected = new Date(v + "T12:00:00");
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      setStatus(selected > now ? "pending" : "paid");
                    }
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Status PAGO / PENDENTE */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
              Status
            </p>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setStatus("paid")}
                className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                  status === "paid"
                    ? "bg-emerald-500 text-white shadow-md"
                    : "text-slate-500"
                }`}
              >
                <Check size={14} strokeWidth={3} />
                {type === "income" ? "Recebido" : "Pago"}
              </button>
              <button
                type="button"
                onClick={() => setStatus("pending")}
                className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${
                  status === "pending"
                    ? "bg-amber-400 text-amber-950 shadow-md"
                    : "text-slate-500"
                }`}
              >
                Pendente
              </button>
            </div>
          </div>

          {/* Recorrente */}
          <button
            type="button"
            onClick={() => setIsFixed((v) => !v)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition ${
              isFixed
                ? "border-indigo-300 bg-indigo-50"
                : "border-slate-100 bg-slate-50"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isFixed ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              <Repeat size={14} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-slate-800">Conta fixa / Recorrente</p>
              <p className="text-[11px] text-slate-400 font-medium">
                Repete nos próximos meses
              </p>
            </div>
            <div
              className={`w-11 h-6 rounded-full p-0.5 transition ${
                isFixed ? "bg-indigo-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isFixed ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </button>

          {validationError && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {validationError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            className={`w-full h-14 rounded-2xl ${typeBg} text-white font-black text-sm uppercase tracking-wider shadow-lg active:scale-[0.98] transition`}
          >
            {transaction ? "Salvar alterações" : "Salvar lançamento"}
          </button>
        </div>

        {/* Drawer interno (categoria / conta) — sem modal empilhado */}
        {drawer && (
          <div className="absolute inset-0 z-10 flex flex-col justify-end bg-black/40 animate-fade-in">
            <div className="bg-white rounded-t-3xl max-h-[78%] flex flex-col shadow-2xl animate-slide-up border-t border-slate-100">
              <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  {drawer === "category"
                    ? "Categoria"
                    : drawer === "destAccount"
                      ? "Conta destino"
                      : "Conta / Banco"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setDrawer(null);
                    setCategorySearch("");
                  }}
                  className="p-2 rounded-full bg-slate-100"
                >
                  <X size={16} className="text-slate-500" />
                </button>
              </div>

              {drawer === "category" && (
                <div className="px-4 pb-2 shrink-0">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Buscar categoria..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 pb-6 no-scrollbar">
                {drawer === "category" ? (
                  <CategorySelector
                    categories={filteredCategories}
                    selectedCategoryId={categoryId}
                    selectedSubcategoryId={subcategoryId}
                    onSelect={handleSelectCategory}
                    columns="modal"
                    hierarchical
                    scope="PERSONAL"
                    transactionType={type}
                  />
                ) : (
                  <div className="space-y-2 pt-1">
                    {accounts
                      .filter((a) => a.enabled !== false)
                      .filter((a) =>
                        drawer === "destAccount" ? a.id !== accountId : true,
                      )
                      .map((acc) => {
                        const selected =
                          drawer === "destAccount"
                            ? destinationAccountId === acc.id
                            : accountId === acc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              if (drawer === "destAccount") {
                                setDestinationAccountId(acc.id);
                              } else {
                                setAccountId(acc.id);
                              }
                              setDrawer(null);
                            }}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition active:scale-[0.99] ${
                              selected
                                ? "border-[#0F388A] bg-blue-50"
                                : "border-slate-100 bg-slate-50"
                            }`}
                          >
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                              style={{ backgroundColor: acc.color || "#64748b" }}
                            >
                              <Wallet size={16} />
                            </div>
                            <span className="flex-1 text-left text-sm font-black text-slate-800">
                              {acc.name}
                            </span>
                            {selected && (
                              <Check size={16} className="text-[#0F388A]" strokeWidth={3} />
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmação de série recorrente */}
        {showRecurringEditModal && transaction && pendingData && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-6 animate-fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
              <h3 className="text-lg font-black text-slate-800 text-center">
                Lançamento recorrente
              </h3>
              <p className="text-xs text-slate-500 text-center font-medium">
                Atualizar somente este ou também os futuros?
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    updateTransaction({ ...transaction, ...pendingData } as Transaction);
                    setShowRecurringEditModal(false);
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider"
                >
                  Somente este
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateTransactionSeries(
                      { ...transaction, ...pendingData } as Transaction,
                      true,
                    );
                    setShowRecurringEditModal(false);
                    onClose();
                  }}
                  className="w-full py-3 rounded-2xl bg-[#0F388A] text-[#FACC15] text-xs font-black uppercase tracking-wider"
                >
                  Este e futuros
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecurringEditModal(false);
                    setPendingData(null);
                  }}
                  className="w-full py-2 text-xs font-bold text-slate-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovoLancamentoModal;
