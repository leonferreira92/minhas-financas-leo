import React, { useState } from "react";
import { Category } from "../../types";
import {
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Lock,
  Star,
} from "lucide-react";
import { CategoryAvatar } from "./CategoryAvatar";

export interface CategoryAccordionGroup {
  parent: Category;
  children: Category[];
  monthTotal: number;
  usageCount: number;
  childUsage: Record<string, number>;
}

interface Props {
  groups: CategoryAccordionGroup[];
  formatCurrency: (n: number) => string;
  defaultCategoryId?: string;
  onOpenParent: (parent: Category) => void;
  onEditParent: (parent: Category) => void;
  onAddChild: (parent: Category) => void;
  onParentMenu: (parent: Category) => void;
  onEditChild: (child: Category) => void;
  onDeleteChild: (child: Category) => void;
  onChildMenu?: (child: Category) => void;
  flowType: "expense" | "income";
}

export const CategoryAccordion: React.FC<Props> = ({
  groups,
  formatCurrency,
  defaultCategoryId,
  onOpenParent,
  onEditParent,
  onAddChild,
  onParentMenu,
  onEditChild,
  onDeleteChild,
  onChildMenu,
  flowType,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 opacity-60">
        <p className="text-sm font-bold text-slate-600">
          Nenhuma categoria encontrada
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Toque em + para criar a primeira categoria mãe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {groups.map(({ parent, children, monthTotal, usageCount, childUsage }) => {
        const isOpen = Boolean(expanded[parent.id]);
        const subCount = children.length;
        const isDefault = defaultCategoryId === parent.id;

        return (
          <div
            key={parent.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-1.5 p-3.5">
              <button
                type="button"
                onClick={() => toggle(parent.id)}
                className="flex items-center gap-3 min-w-0 flex-1 text-left active:scale-[0.99] transition"
              >
                <CategoryAvatar
                  icon={parent.icon}
                  color={parent.color}
                  size="md"
                  variant="parent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-800 text-sm truncate">
                      {parent.name}
                    </h3>
                    {parent.isSystem && (
                      <Lock size={11} className="text-slate-300 shrink-0" />
                    )}
                    {isDefault && (
                      <Star
                        size={12}
                        className="text-amber-500 fill-amber-500 shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {subCount}{" "}
                      {subCount === 1 ? "subcategoria" : "subcategorias"}
                    </span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        flowType === "expense"
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(monthTotal)}
                      <span className="text-slate-400 font-medium"> /mês</span>
                    </span>
                    {usageCount > 0 && (
                      <>
                        <span className="text-[11px] text-slate-300">·</span>
                        <span className="text-[11px] text-blue-800 font-semibold">
                          {usageCount} lanç.
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-slate-300 shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(parent);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#0F388A] hover:bg-blue-50 transition active:scale-95"
                  title="Criar subcategoria"
                  aria-label={`Criar subcategoria em ${parent.name}`}
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onParentMenu(parent);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95"
                  title="Mais opções"
                  aria-label={`Opções de ${parent.name}`}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-slate-100 bg-slate-50/80 px-3 pb-3 pt-1">
                  <div className="flex items-center justify-between gap-2 px-1 py-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenParent(parent)}
                      className="text-[10px] font-black uppercase tracking-wider text-[#0F388A] hover:underline"
                    >
                      Ver lançamentos →
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditParent(parent)}
                      className="text-[10px] font-bold text-slate-400 hover:text-[#0F388A] flex items-center gap-1"
                    >
                      <Pencil size={11} /> Editar
                    </button>
                  </div>

                  {children.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => onAddChild(parent)}
                      className="w-full text-left text-[11px] text-slate-400 px-2 py-2.5 rounded-xl border border-dashed border-slate-200 hover:border-[#0F388A]/30 hover:text-[#0F388A] transition"
                    >
                      Sem subcategorias. Toque para criar.
                    </button>
                  ) : (
                    <ul className="space-y-1.5 pl-3 ml-2 border-l-2 border-slate-200/80">
                      {children.map((child) => {
                        const childCount = childUsage[child.id] || 0;
                        const childIsDefault = defaultCategoryId === child.id;
                        return (
                          <li
                            key={child.id}
                            className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-100/90 px-3 py-2.5 shadow-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CategoryAvatar
                                icon={child.icon}
                                color={child.color}
                                variant="child"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate flex items-center gap-1">
                                  {child.name}
                                  {childIsDefault && (
                                    <Star
                                      size={10}
                                      className="text-amber-500 fill-amber-500"
                                    />
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {childCount}{" "}
                                  {childCount === 1
                                    ? "lançamento"
                                    : "lançamentos"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onEditChild(child)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F388A] hover:bg-blue-50 transition"
                                aria-label={`Editar ${child.name}`}
                              >
                                <Pencil size={14} />
                              </button>
                              {onChildMenu ? (
                                <button
                                  type="button"
                                  onClick={() => onChildMenu(child)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                  aria-label={`Opções de ${child.name}`}
                                >
                                  <MoreHorizontal size={14} />
                                </button>
                              ) : (
                                !child.isSystem && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteChild(child)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                    aria-label={`Excluir ${child.name}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
