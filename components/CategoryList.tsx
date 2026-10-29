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
  MoreHorizontal,
} from "lucide-react";
import { PERSONAL_ONLY_MODE } from "../services/personalOnlyMode";
import {
  buildCategoryTree,
  buildExtratoCategoryQuery,
  countCategoryUsage,
} from "../services/categoryHierarchy";
import {
  PERIOD_OPTIONS,
  CategoryPeriodKey,
  averageMonthlyForCategory,
} from "../services/categoryEssentiality";
import {
  CategoryFormModal,
  CategoryFormValues,
} from "./categories/CategoryFormModal";
import { CategoryAccordion } from "./categories/CategoryAccordion";
import {
  CategoryActionsSheet,
  CategoryAction,
} from "./categories/CategoryActionsSheet";
import { MoveTransactionsModal } from "./categories/MoveTransactionsModal";
import { ArchivedCategoriesSheet } from "./categories/ArchivedCategoriesSheet";

export const CategoryList = () => {
  const navigate = useNavigate();
  const {
    categories,
    transactions,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategoryTransactions,
    activeScope,
    settings,
    updateSettings,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<TransactionType>("expense");
  const [scopeFilter, setScopeFilter] = useState<"ALL" | "PERSONAL" | "BUSINESS">(
    PERSONAL_ONLY_MODE ? "PERSONAL" : "ALL",
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [forceParentId, setForceParentId] = useState<string | null>(null);
  const [newChoiceOpen, setNewChoiceOpen] = useState(false);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsGlobal, setActionsGlobal] = useState(false);
  const [actionsCategory, setActionsCategory] = useState<Category | null>(null);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveFromId, setMoveFromId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(
    null,
  );
  const [deleteBlockMessage, setDeleteBlockMessage] = useState<string | null>(
    null,
  );
  const [period, setPeriod] = useState<CategoryPeriodKey>("6m");

  const usageStats = useMemo(
    () => countCategoryUsage(transactions),
    [transactions],
  );

  const defaultCategoryId =
    activeTab === "income"
      ? settings.defaultIncomeCategoryId
      : settings.defaultExpenseCategoryId;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const scopedCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.archived) return false;
      if (c.type !== activeTab) return false;
      if (c.type === "transfer" || c.type === "adjustment") return false;
      if (scopeFilter === "ALL") return true;
      return (c.scope || "PERSONAL") === scopeFilter;
    });
  }, [categories, activeTab, scopeFilter]);

  const accordionGroups = useMemo(() => {
    const flowType = activeTab === "income" ? "income" : "expense";
    const tree = buildCategoryTree(scopedCategories, activeTab);
    return tree
      .filter((g) => scopedCategories.some((c) => c.id === g.parent.id))
      .map((g) => {
        const children = g.children.filter((ch) => !ch.archived);
        return {
          parent: g.parent,
          children,
          monthTotal: averageMonthlyForCategory(
            transactions,
            g.parent.id,
            categories,
            period,
            flowType,
          ),
          usageCount: usageStats[g.parent.id] || 0,
          childUsage: Object.fromEntries(
            children.map((ch) => [ch.id, usageStats[ch.id] || 0]),
          ),
          childMonthTotals: Object.fromEntries(
            children.map((ch) => [
              ch.id,
              averageMonthlyForCategory(
                transactions,
                ch.id,
                categories,
                period,
                flowType,
              ),
            ]),
          ),
        };
      });
  }, [
    scopedCategories,
    activeTab,
    transactions,
    categories,
    period,
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

  const openGlobalMenu = () => {
    setActionsGlobal(true);
    setActionsCategory(null);
    setActionsOpen(true);
  };

  const openCategoryMenu = (cat: Category) => {
    setActionsGlobal(false);
    setActionsCategory(cat);
    setActionsOpen(true);
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
        essentiality: values.essentiality,
        isSystem: editing.isSystem,
        archived: editing.archived,
      });
    } else {
      addCategory({
        name: values.name,
        type: values.type,
        color: values.color,
        icon: values.icon,
        scope: values.scope,
        parentId: values.parentId,
        essentiality: values.essentiality,
        isSystem: false,
        archived: false,
      });
    }
    setIsModalOpen(false);
    setEditing(null);
    setForceParentId(null);
  };

  const setAsDefault = (cat: Category) => {
    if (cat.type === "income") {
      updateSettings({ defaultIncomeCategoryId: cat.id });
    } else {
      updateSettings({ defaultExpenseCategoryId: cat.id });
    }
    showToast(`“${cat.name}” definida como padrão`);
  };

  const archiveCategory = (cat: Category, archived: boolean) => {
    updateCategory({ ...cat, archived });
    if (
      archived &&
      (settings.defaultExpenseCategoryId === cat.id ||
        settings.defaultIncomeCategoryId === cat.id)
    ) {
      updateSettings(
        cat.type === "income"
          ? { defaultIncomeCategoryId: undefined }
          : { defaultExpenseCategoryId: undefined },
      );
    }
    showToast(
      archived
        ? `“${cat.name}” arquivada`
        : `“${cat.name}” restaurada`,
    );
  };

  const handleAction = (action: CategoryAction) => {
    const cat = actionsCategory;
    switch (action) {
      case "create_sub":
        openNewChild(cat || undefined);
        break;
      case "edit":
        if (cat) openEdit(cat);
        break;
      case "move_transactions":
        setMoveFromId(cat?.id || null);
        setMoveOpen(true);
        break;
      case "set_default":
        if (cat) setAsDefault(cat);
        break;
      case "archive":
        if (cat) archiveCategory(cat, true);
        break;
      case "unarchive":
        if (cat) archiveCategory(cat, false);
        break;
      case "view_archived":
        setArchivedOpen(true);
        break;
      default:
        break;
    }
  };

  const requestDelete = (cat: Category) => {
    if (cat.isSystem) {
      const msg =
        "Categorias do sistema não podem ser excluídas. Você pode arquivá-las.";
      setDeleteBlockMessage(msg);
      showToast(msg);
      return;
    }
    const children = categories.filter(
      (c) => c.parentId === cat.id && !c.archived,
    );
    if (children.length > 0) {
      const msg = `Exclua, mova ou arquive as ${children.length} subcategoria(s) antes de remover esta categoria mãe.`;
      setDeleteBlockMessage(msg);
      showToast(msg);
      return;
    }
    const count = usageStats[cat.id] || 0;
    if (count > 0) {
      const msg =
        "Não é possível excluir uma categoria com lançamentos vinculados. Use a opção 'Mover Transações' primeiro ou Arquive-a.";
      setDeleteBlockMessage(msg);
      showToast(msg);
      return;
    }
    setDeleteConfirmationId(cat.id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmationId) return;
    const result = deleteCategory(deleteConfirmationId);
    setDeleteConfirmationId(null);
    setIsModalOpen(false);
    setEditing(null);
    if (result.success) {
      showToast("Categoria excluída com sucesso!");
    } else {
      const msg =
        result.error ||
        "Não foi possível excluir a categoria.";
      setDeleteBlockMessage(msg);
      showToast(msg);
    }
  };

  const openExtrato = (cat: Category, subcategory?: Category) => {
    const parentId = subcategory?.parentId || cat.id;
    const subId = subcategory?.id;
    const qs = buildExtratoCategoryQuery(parentId, subId);
    navigate(`/lancamentos?${qs}`);
  };

  const handleMoveConfirm = (fromId: string, toId: string) => {
    const n = moveCategoryTransactions(fromId, toId);
    setMoveOpen(false);
    setMoveFromId(null);
    showToast(
      n > 0
        ? `${n} lançamento${n === 1 ? "" : "s"} movido${n === 1 ? "" : "s"}`
        : "Nenhum lançamento para mover",
    );
  };

  return (
    <div className="pb-24 animate-fade-in text-slate-900 min-h-screen relative max-w-full overflow-x-hidden">
      <div className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-20 px-1 pt-2 pb-2">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2 min-w-0">
            <Link
              to="/mais"
              className="p-2 hover:bg-white rounded-full transition text-slate-500 shrink-0"
            >
              <ChevronLeft size={24} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                Categorias
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Estrutura hierárquica · estilo Mobills
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openGlobalMenu}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition active:scale-95"
              aria-label="Mais opções"
              title="Mais opções"
            >
              <MoreHorizontal size={18} />
            </button>
            <button
              type="button"
              onClick={() => setNewChoiceOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#0F388A] text-[#FACC15] text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Plus size={14} />
              Nova
            </button>
          </div>
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

        <div className="mt-2 flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriod(opt.key)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 border ${
                  active
                    ? "bg-white border-slate-300 text-slate-800 shadow-xs"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-1 mt-2">
        <CategoryAccordion
          groups={accordionGroups}
          formatCurrency={formatCurrency}
          defaultCategoryId={defaultCategoryId}
          flowType={activeTab === "income" ? "income" : "expense"}
          onOpenParent={(parent) => openExtrato(parent)}
          onOpenChild={(child, parent) => openExtrato(parent, child)}
          onEditParent={openEdit}
          onAddChild={openNewChild}
          onParentMenu={openCategoryMenu}
          onEditChild={openEdit}
          onDeleteChild={requestDelete}
          onChildMenu={openCategoryMenu}
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

      {newChoiceOpen && (
        <div className="fixed inset-0 bg-black/50 z-[55] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-3 animate-slide-up">
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
        categories={categories.filter((c) => !c.archived)}
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

      <CategoryActionsSheet
        open={actionsOpen}
        global={actionsGlobal}
        category={actionsCategory}
        isDefault={
          Boolean(
            actionsCategory &&
              (actionsCategory.type === "income"
                ? settings.defaultIncomeCategoryId === actionsCategory.id
                : settings.defaultExpenseCategoryId === actionsCategory.id),
          )
        }
        onClose={() => setActionsOpen(false)}
        onAction={handleAction}
      />

      <MoveTransactionsModal
        open={moveOpen}
        categories={categories}
        transactions={transactions}
        initialFromId={moveFromId}
        flowType={activeTab === "income" ? "income" : "expense"}
        onClose={() => {
          setMoveOpen(false);
          setMoveFromId(null);
        }}
        onConfirm={handleMoveConfirm}
      />

      <ArchivedCategoriesSheet
        open={archivedOpen}
        categories={categories}
        onClose={() => setArchivedOpen(false)}
        onUnarchive={(cat) => archiveCategory(cat, false)}
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

      {toast && (
        <div
          className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[120] px-4 py-2.5 rounded-2xl text-xs font-black shadow-xl max-w-[90vw] animate-fade-in text-center ${
            toast.includes("sucesso")
              ? "bg-emerald-600 text-white border border-emerald-400/40"
              : toast.includes("Não é possível") ||
                  toast.includes("não podem") ||
                  toast.includes("Não foi possível")
                ? "bg-rose-600 text-white border border-rose-400/40"
                : "bg-[#0F388A] text-[#FACC15] border border-[#FACC15]/30"
          }`}
        >
          {toast}
        </div>
      )}
    </div>
  );
};
