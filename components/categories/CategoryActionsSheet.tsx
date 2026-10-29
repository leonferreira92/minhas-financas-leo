import React from "react";
import { Category } from "../../types";
import {
  X,
  FolderPlus,
  ArrowRightLeft,
  Star,
  Archive,
  Pencil,
  ArchiveRestore,
  List,
} from "lucide-react";
import { CategoryAvatar } from "./CategoryAvatar";

export type CategoryAction =
  | "create_sub"
  | "move_transactions"
  | "set_default"
  | "archive"
  | "unarchive"
  | "edit"
  | "view_archived";

interface Props {
  open: boolean;
  /** null = menu global da tela */
  category: Category | null;
  isDefault?: boolean;
  onClose: () => void;
  onAction: (action: CategoryAction) => void;
  /** Menu do header (sem categoria específica) */
  global?: boolean;
}

export const CategoryActionsSheet: React.FC<Props> = ({
  open,
  category,
  isDefault = false,
  onClose,
  onAction,
  global = false,
}) => {
  if (!open) return null;

  const items: Array<{
    id: CategoryAction;
    label: string;
    hint?: string;
    icon: React.ReactNode;
    tone?: "default" | "amber" | "rose" | "emerald";
    show: boolean;
  }> = global
    ? [
        {
          id: "create_sub",
          label: "Criar subcategoria",
          hint: "Escolher a categoria mãe depois",
          icon: <FolderPlus size={18} />,
          show: true,
        },
        {
          id: "move_transactions",
          label: "Mover transações",
          hint: "Reatribuir lançamentos em lote",
          icon: <ArrowRightLeft size={18} />,
          show: true,
        },
        {
          id: "view_archived",
          label: "Categorias arquivadas",
          hint: "Ver e restaurar ocultas",
          icon: <List size={18} />,
          show: true,
        },
      ]
    : [
        {
          id: "create_sub",
          label: "Criar subcategoria",
          hint: category ? `Em “${category.name}”` : undefined,
          icon: <FolderPlus size={18} />,
          show: Boolean(category && !category.parentId),
        },
        {
          id: "edit",
          label: "Editar categoria",
          icon: <Pencil size={18} />,
          show: Boolean(category),
        },
        {
          id: "move_transactions",
          label: "Mover transações",
          hint: "Transferir lançamentos desta categoria",
          icon: <ArrowRightLeft size={18} />,
          show: Boolean(category),
        },
        {
          id: "set_default",
          label: isDefault ? "Categoria padrão ✓" : "Definir como padrão",
          hint: "Usada ao abrir novo lançamento",
          icon: <Star size={18} className={isDefault ? "fill-current" : ""} />,
          tone: "amber",
          show: Boolean(category),
        },
        {
          id: category?.archived ? "unarchive" : "archive",
          label: category?.archived ? "Desarquivar" : "Arquivar categoria",
          hint: category?.archived
            ? "Volta a aparecer em novos lançamentos"
            : "Oculta em novos lançamentos; histórico permanece",
          icon: category?.archived ? (
            <ArchiveRestore size={18} />
          ) : (
            <Archive size={18} />
          ),
          tone: category?.archived ? "emerald" : "rose",
          show: Boolean(category),
        },
      ];

  const toneClass = (tone?: string) => {
    if (tone === "amber") return "text-amber-600 bg-amber-50";
    if (tone === "rose") return "text-rose-600 bg-rose-50";
    if (tone === "emerald") return "text-emerald-600 bg-emerald-50";
    return "text-[#0F388A] bg-blue-50";
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 animate-slide-up p-5 pb-8 sm:pb-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {category ? (
              <CategoryAvatar
                icon={category.icon}
                color={category.color}
                size="md"
                variant={category.parentId ? "child" : "parent"}
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#0F388A] text-[#FACC15] flex items-center justify-center font-black text-sm">
                ···
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {global ? "Ações" : "Opções da categoria"}
              </p>
              <h3 className="text-base font-black text-slate-800 truncate">
                {category?.name || "Categorias"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          {items
            .filter((i) => i.show)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onAction(item.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-left transition active:scale-[0.99]"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneClass(item.tone)}`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-800">
                    {item.label}
                  </p>
                  {item.hint && (
                    <p className="text-[11px] text-slate-500 font-medium truncate">
                      {item.hint}
                    </p>
                  )}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
