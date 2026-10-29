import React, { useMemo, useState, useEffect } from "react";
import { Category } from "../../types";
import {
  buildCategoryTree,
  getActiveCategories,
  transactionMatchesCategoryFilter,
} from "../../services/categoryHierarchy";
import { X, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { CategoryAvatar } from "./CategoryAvatar";

interface Props {
  open: boolean;
  categories: Category[];
  transactions: Array<{ categoryId: string; subcategoryId?: string }>;
  initialFromId?: string | null;
  flowType?: "expense" | "income" | "all";
  onClose: () => void;
  onConfirm: (fromId: string, toId: string) => void;
}

export const MoveTransactionsModal: React.FC<Props> = ({
  open,
  categories,
  transactions,
  initialFromId = null,
  flowType = "all",
  onClose,
  onConfirm,
}) => {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  const selectable = useMemo(() => {
    const base = getActiveCategories(categories).filter((c) => {
      if (c.type === "transfer" || c.type === "adjustment") return false;
      if (flowType === "all") return c.type === "expense" || c.type === "income";
      return c.type === flowType;
    });
    return base;
  }, [categories, flowType]);

  const tree = useMemo(() => {
    const types =
      flowType === "all"
        ? (["expense", "income"] as const)
        : ([flowType] as const);
    return types.flatMap((t) => buildCategoryTree(selectable, t));
  }, [selectable, flowType]);

  useEffect(() => {
    if (!open) return;
    setFromId(initialFromId || "");
    setToId("");
  }, [open, initialFromId]);

  const matchCount = useMemo(() => {
    if (!fromId) return 0;
    return transactions.filter((t) =>
      transactionMatchesCategoryFilter(t, fromId, categories),
    ).length;
  }, [fromId, transactions, categories]);

  if (!open) return null;

  const fromCat = categories.find((c) => c.id === fromId);
  const toCat = categories.find((c) => c.id === toId);
  const canSubmit = Boolean(fromId && toId && fromId !== toId && matchCount > 0);

  const renderOptions = () =>
    tree.map(({ parent, children }) => (
      <optgroup key={parent.id} label={parent.name}>
        <option value={parent.id}>{parent.name}</option>
        {children.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {"  "}↳ {ch.name}
          </option>
        ))}
      </optgroup>
    ));

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 p-5 sm:p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F388A]/10 text-[#0F388A] flex items-center justify-center">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Reestruturação
              </p>
              <h3 className="text-base font-black text-slate-800">
                Mover transações
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed">
          Reatribui em lote todos os lançamentos da categoria de origem para o
          destino. Ideal para organizar o histórico sem editar um a um.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
              De (origem)
            </label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:border-[#0F388A]"
            >
              <option value="">Selecione...</option>
              {renderOptions()}
            </select>
            {fromId && (
              <p className="mt-1.5 text-[11px] font-semibold text-slate-500 px-1">
                {matchCount} lançamento{matchCount === 1 ? "" : "s"} encontrado
                {matchCount === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <ArrowRightLeft size={16} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
              Para (destino)
            </label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold outline-none focus:border-[#0F388A]"
            >
              <option value="">Selecione...</option>
              {renderOptions()}
            </select>
          </div>

          {fromCat && toCat && fromId !== toId && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <CategoryAvatar
                  icon={fromCat.icon}
                  color={fromCat.color}
                  size="sm"
                  variant={fromCat.parentId ? "child" : "parent"}
                />
                <span className="text-xs font-bold text-slate-700 truncate">
                  {fromCat.name}
                </span>
              </div>
              <ArrowRightLeft size={14} className="text-slate-300 shrink-0" />
              <div className="flex items-center gap-2 min-w-0 justify-end">
                <span className="text-xs font-bold text-slate-700 truncate">
                  {toCat.name}
                </span>
                <CategoryAvatar
                  icon={toCat.icon}
                  color={toCat.color}
                  size="sm"
                  variant={toCat.parentId ? "child" : "parent"}
                />
              </div>
            </div>
          )}

          {fromId && matchCount === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-[11px] font-medium">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Nenhum lançamento vinculado a esta categoria.
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 text-xs font-black uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onConfirm(fromId, toId);
            }}
            className="flex-1 py-3.5 rounded-2xl bg-[#0F388A] text-[#FACC15] text-xs font-black uppercase tracking-wider disabled:opacity-40 shadow-md"
          >
            Mover {matchCount > 0 ? `(${matchCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};
