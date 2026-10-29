import React, { useState } from "react";
import { Category } from "../../types";
import { getIcon } from "../../constants";
import {
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Lock,
} from "lucide-react";

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
  onOpenParent: (parent: Category) => void;
  onEditParent: (parent: Category) => void;
  onAddChild: (parent: Category) => void;
  onEditChild: (child: Category) => void;
  onDeleteChild: (child: Category) => void;
  flowType: "expense" | "income";
}

export const CategoryAccordion: React.FC<Props> = ({
  groups,
  formatCurrency,
  onOpenParent,
  onEditParent,
  onAddChild,
  onEditChild,
  onDeleteChild,
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
        const Icon = getIcon(parent.icon);
        const isOpen = Boolean(expanded[parent.id]);
        const subCount = children.length;

        return (
          <div
            key={parent.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            {/* Card mãe */}
            <div className="flex items-center gap-2 p-3.5">
              <button
                type="button"
                onClick={() => {
                  toggle(parent.id);
                }}
                className="flex items-center gap-3 min-w-0 flex-1 text-left active:scale-[0.99] transition"
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${parent.color}33`,
                    color: parent.color,
                  }}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-800 text-sm truncate">
                      {parent.name}
                    </h3>
                    {parent.isSystem && (
                      <Lock size={11} className="text-slate-300 shrink-0" />
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

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild(parent);
                  }}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-[#0F388A] hover:bg-blue-50 transition active:scale-95"
                  title="Adicionar subcategoria"
                  aria-label={`Adicionar subcategoria em ${parent.name}`}
                >
                  <Plus size={15} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditParent(parent);
                  }}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 hover:text-[#0F388A] hover:bg-blue-50 transition active:scale-95"
                  title="Editar categoria"
                  aria-label={`Editar ${parent.name}`}
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>

            {/* Filhos (acordeão) */}
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="border-t border-slate-100 bg-slate-50/70 px-3 pb-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenParent(parent)}
                    className="w-full text-left text-[10px] font-black uppercase tracking-wider text-[#0F388A] px-2 py-2 hover:underline"
                  >
                    Ver lançamentos desta categoria →
                  </button>

                  {children.length === 0 ? (
                    <p className="text-[11px] text-slate-400 px-2 py-2">
                      Sem subcategorias. Use + para criar.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 pl-3 ml-2 border-l-2 border-slate-200">
                      {children.map((child) => {
                        const ChildIcon = getIcon(child.icon);
                        const childCount = childUsage[child.id] || 0;
                        return (
                          <li
                            key={child.id}
                            className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-100 px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${child.color}33`,
                                  color: child.color,
                                }}
                              >
                                <ChildIcon size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">
                                  {child.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {childCount}{" "}
                                  {childCount === 1
                                    ? "lançamento"
                                    : "lançamentos"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => onEditChild(child)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F388A] hover:bg-blue-50 transition"
                                aria-label={`Editar ${child.name}`}
                              >
                                <Pencil size={14} />
                              </button>
                              {!child.isSystem && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteChild(child)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  aria-label={`Excluir ${child.name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
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
