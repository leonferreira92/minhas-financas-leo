import React, { useMemo } from "react";
import { Category } from "../../types";
import { X, ArchiveRestore, Archive } from "lucide-react";
import { CategoryAvatar } from "./CategoryAvatar";

interface Props {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onUnarchive: (cat: Category) => void;
}

export const ArchivedCategoriesSheet: React.FC<Props> = ({
  open,
  categories,
  onClose,
  onUnarchive,
}) => {
  const archived = useMemo(
    () =>
      categories
        .filter((c) => c.archived)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [categories],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 p-5 animate-slide-up max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <Archive size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Histórico preservado
              </p>
              <h3 className="text-base font-black text-slate-800">
                Categorias arquivadas
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

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 min-h-0">
          {archived.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm font-bold text-slate-600">
                Nenhuma categoria arquivada
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ao arquivar, elas saem do formulário de novos lançamentos, mas
                continuam nos relatórios.
              </p>
            </div>
          ) : (
            archived.map((cat) => {
              const parent = cat.parentId
                ? categories.find((c) => c.id === cat.parentId)
                : null;
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryAvatar
                      icon={cat.icon}
                      color={cat.color}
                      size="md"
                      variant={cat.parentId ? "child" : "parent"}
                      className="opacity-80"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">
                        {cat.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">
                        {parent
                          ? `Sub de ${parent.name}`
                          : cat.type === "income"
                            ? "Receita"
                            : "Despesa"}
                        {cat.isSystem ? " · Sistema" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnarchive(cat)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-black uppercase tracking-wide active:scale-95 transition"
                  >
                    <ArchiveRestore size={14} />
                    Restaurar
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
