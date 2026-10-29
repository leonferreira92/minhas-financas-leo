import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";
import { Category, TransactionType, ScopeType } from "../types";
import {
  Plus,
  ChevronLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  User,
  Music,
  AlertTriangle,
  Trash2,
  Layers,
} from "lucide-react";
import { PERSONAL_ONLY_MODE } from "../services/personalOnlyMode";
import {
  buildCategoryTree,
  countCategoryUsage,
  sumMonthAmountForCategory,
} from "../services/categoryHierarchy";
import { getCurrentMonthPrefix } from "../services/dateUtils";
import {
  CategoryFormModal,
  CategoryFormValues,
} from "./categories/CategoryFormModal";
import { CategoryAccordion } from "./categories/CategoryAccordion";

export const CategoryList = () => {
  const navigate = useNavigate();
  const {
    categories,
    transactions,
    addCategory,
    updateCategory,
    deleteCategory,
    activeScope,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<TransactionType>("expense");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "PERSONAL" | "BUSINESS">(
    PERSONAL_ONLY_MODE ? "PERSONAL" : "ALL",
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [forceParentId, setForceParentId] = useState<string | null>(null);
  const [newChoiceOpen, setNewChoiceOpen] = useState(false);

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(
    null,
  );
  const [deleteBlockMessage, setDeleteBlockMessage] = useState<string | null>(
    null,
  );

  const monthPrefix = useMemo(() => getCurrentMonthPrefix(), []);
  const usageStats = useMemo(
    () => countCategoryUsage(transactions),
    [transactions],
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const scopedCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.type !== activeTab) return false;
      if (c.type === "transfer" || c.type === "adjustment") return false;
      if (scopeFilter === "ALL") return true;
      return (c.scope || "PERSONAL") === scopeFilter;
    });
  }, [categories, activeTab, scopeFilter]);

  const accordionGroups = useMemo(() => {
    const tree = buildCategoryTree(scopedCategories, activeTab);
    // Inclui só mães que passam no filtro de scope (já filtrado)
    return tree
      .filter((g) => scopedCategories.some((c) => c.id === g.parent.id))
      .map((g) => ({
        parent: g.parent,
        children: g.children,
        monthTotal: sumMonthAmountForCategory(
          transactions,
          g.parent.id,
          categories,
          monthPrefix,
          activeTab === "income" ? "income" : "expense",
        ),
        usageCount: usageStats[g.parent.id] || 0,
        childUsage: Object.fromEntries(
          g.children.map((ch) => [ch.id, usageStats[ch.id] || 0]),
        ),
      }));
  }, [
    scopedCategories,
    activeTab,
    transactions,
    categories,
    monthPrefix,
    usageStats,
  ]);

  const openNewParent = () => {
    setEditing(null);
    setForceParentId(null);
    setNewChoiceOpen(false);
    setIsModalOpen(true);
  };

  const openNewChild = (parent?: Category) => {
    setEditing(null);
    setForceParentId(parent?.id || null);
    setNewChoiceOpen(false);
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForceParentId(null);
    setIsModalOpen(true);
  };

  const handleSave = (values: CategoryFormValues) => {
    if (editing) {
      updateCategory({
        ...editing,
        name: values.name,
        type: values.type,
        color: values.color,
        icon: values.icon,
        scope: values.scope,
        parentId: values.parentId,
        isSystem: editing.isSystem,
      });
    } else {
      addCategory({
        name: values.name,
        type: values.type,
        color: values.color,
        icon: values.icon,
        scope: values.scope,
        parentId: values.parentId,
        isSystem: false,
      });
    }
    setIsModalOpen(false);
    setEditing(null);
    setForceParentId(null);
  };

  const requestDelete = (cat: Category) => {
    if (cat.isSystem) {
      setDeleteBlockMessage(
        "Categorias do sistema não podem ser excluídas.",
      );
      return;
    }
    const children = categories.filter((c) => c.parentId === cat.id);
    if (children.length > 0) {
      setDeleteBlockMessage(
        `Exclua ou mova as ${children.length} subcategoria(s) antes de remover esta categoria mãe.`,
      );
      return;
    }
    const count = usageStats[cat.id] || 0;
    if (count > 0) {
      setDeleteBlockMessage(
        `Esta categoria não pode ser excluída pois possui ${count} lançamento(s) associado(s).`,
      );
      return;
    }
    setDeleteConfirmationId(cat.id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmationId) return;
    deleteCategory(deleteConfirmationId);
    setDeleteConfirmationId(null);
    setIsModalOpen(false);
    setEditing(null);
  };

  const openExtrato = (cat: Category) => {
    navigate(`/lancamentos?category=${encodeURIComponent(cat.id)}`);
  };

  return (
    <div className="pb-24 animate-fade-in text-slate-900 min-h-screen relative max-w-full overflow-x-hidden">
      <div className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-20 px-1 pt-2 pb-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <Link
              to="/settings"
              className="p-2 hover:bg-white rounded-full transition text-slate-500 shrink-0"
            >
              <ChevronLeft size={24} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                Categorias
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Estrutura hierárquica · mães e subcategorias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNewChoiceOpen(true)}
            className="shrink-0 px-3 py-2 rounded-xl bg-[#0F388A] text-[#FACC15] text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Plus size={14} />
            Nova
          </button>
        </div>

        {!PERSONAL_ONLY_MODE && (
          <div className="bg-slate-200/80 p-1 rounded-2xl grid grid-cols-3 gap-1 mb-2">
            {(
              [
                ["ALL", "Todas"],
                ["PERSONAL", "Pessoal"],
                ["BUSINESS", "Músico"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setScopeFilter(id)}
                className={`py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                  scopeFilter === id
                    ? id === "BUSINESS"
                      ? "bg-purple-600 text-white shadow-xs"
                      : id === "PERSONAL"
                        ? "bg-[#0F388A] text-[#FACC15] shadow-xs"
                        : "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {id === "PERSONAL" && <User size={12} />}
                {id === "BUSINESS" && <Music size={12} />}
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="bg-slate-100 p-1 rounded-xl flex space-x-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("expense")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-all active:scale-95 ${
              activeTab === "expense"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowDownCircle size={15} className="mr-1.5" /> Despesas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("income")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center transition-all active:scale-95 ${
              activeTab === "income"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <ArrowUpCircle size={15} className="mr-1.5" /> Receitas
          </button>
        </div>
      </div>

      <div className="px-1 mt-2">
        <CategoryAccordion
          groups={accordionGroups}
          formatCurrency={formatCurrency}
          flowType={activeTab === "income" ? "income" : "expense"}
          onOpenParent={openExtrato}
          onEditParent={openEdit}
          onAddChild={openNewChild}
          onEditChild={openEdit}
          onDeleteChild={requestDelete}
        />
      </div>

      <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-end px-6 max-w-md mx-auto pointer-events-none">
        <button
          type="button"
          onClick={() => setNewChoiceOpen(true)}
          className="w-14 h-14 bg-[#0F388A] text-[#FACC15] rounded-full shadow-lg shadow-blue-900/20 flex items-center justify-center pointer-events-auto transition-transform active:scale-90"
          aria-label="Nova categoria"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Escolha: mãe ou sub */}
      {newChoiceOpen && (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-3 animate-slide-up">
            <h3 className="text-base font-black text-slate-800 px-1">
              O que deseja criar?
            </h3>
            <button
              type="button"
              onClick={openNewParent}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-[#0F388A]/40 bg-slate-50 text-left active:scale-[0.99] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0F388A]/10 text-[#0F388A] flex items-center justify-center">
                <Layers size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">
                  Categoria mãe
                </p>
                <p className="text-[11px] text-slate-500">
                  Grupo principal no extrato e relatórios
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => openNewChild()}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-[#0F388A]/40 bg-slate-50 text-left active:scale-[0.99] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">
                  Subcategoria
                </p>
                <p className="text-[11px] text-slate-500">
                  Detalhe vinculado a uma categoria mãe
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setNewChoiceOpen(false)}
              className="w-full py-3 text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <CategoryFormModal
        open={isModalOpen}
        editing={editing}
        defaultType={activeTab}
        defaultScope={
          (activeScope === "BUSINESS" ? "BUSINESS" : "PERSONAL") as ScopeType
        }
        forceParentId={forceParentId}
        categories={categories}
        usageCount={editing ? usageStats[editing.id] || 0 : 0}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
          setForceParentId(null);
        }}
        onSave={handleSave}
        onDelete={
          editing
            ? () => {
                requestDelete(editing);
              }
            : undefined
        }
      />

      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-scale-in text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">
              Excluir categoria?
            </h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmationId(null)}
                className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 rounded-2xl text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-4 text-white font-bold bg-rose-600 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-200"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteBlockMessage && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-scale-in text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">
              Não é possível excluir
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
              {deleteBlockMessage}
            </p>
            <button
              type="button"
              onClick={() => setDeleteBlockMessage(null)}
              className="w-full py-3.5 text-[#FACC15] font-bold bg-[#0F388A] rounded-2xl text-xs uppercase tracking-wider shadow-md"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
