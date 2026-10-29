import React, { useMemo, useState, useEffect } from "react";
import { Category, ScopeType, TransactionType } from "../../types";
import {
  CATEGORY_COLOR_PALETTE,
  getIcon,
  ICON_MAP,
} from "../../constants";
import { getParentCategories } from "../../services/categoryHierarchy";
import { PERSONAL_ONLY_MODE } from "../../services/personalOnlyMode";
import {
  X,
  CheckCircle2,
  Search,
  Lock,
  Trash2,
  Layers,
  FolderTree,
  User,
  Music,
} from "lucide-react";

export type CategoryFormMode = "parent" | "child";

export interface CategoryFormValues {
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  scope: ScopeType;
  parentId: string | null;
  isSystem?: boolean;
}

interface Props {
  open: boolean;
  editing?: Category | null;
  defaultType: TransactionType;
  defaultScope: ScopeType;
  /** Força criação como subcategoria deste pai */
  forceParentId?: string | null;
  categories: Category[];
  usageCount?: number;
  onClose: () => void;
  onSave: (values: CategoryFormValues) => void;
  onDelete?: () => void;
}

export const CategoryFormModal: React.FC<Props> = ({
  open,
  editing,
  defaultType,
  defaultScope,
  forceParentId = null,
  categories,
  usageCount = 0,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>(defaultType);
  const [scope, setScope] = useState<ScopeType>(defaultScope);
  const [color, setColor] = useState(CATEGORY_COLOR_PALETTE[0]);
  const [icon, setIcon] = useState("ShoppingBag");
  const [mode, setMode] = useState<CategoryFormMode>("parent");
  const [parentId, setParentId] = useState<string>("");
  const [iconSearch, setIconSearch] = useState("");

  const parentOptions = useMemo(
    () =>
      getParentCategories(categories, type).filter(
        (c) => !editing || c.id !== editing.id,
      ),
    [categories, type, editing],
  );

  const iconNames = useMemo(() => {
    const all = Object.keys(ICON_MAP);
    const term = iconSearch.trim().toLowerCase();
    if (!term) return all;
    return all.filter((n) => n.toLowerCase().includes(term));
  }, [iconSearch]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setScope(editing.scope || "PERSONAL");
      setColor(editing.color);
      setIcon(editing.icon);
      const isChild = Boolean(editing.parentId);
      setMode(isChild ? "child" : "parent");
      setParentId(editing.parentId || "");
    } else {
      setName("");
      setType(defaultType);
      setScope(defaultScope);
      setColor(
        CATEGORY_COLOR_PALETTE[
          Math.floor(Math.random() * CATEGORY_COLOR_PALETTE.length)
        ],
      );
      setIcon("ShoppingBag");
      if (forceParentId) {
        setMode("child");
        setParentId(forceParentId);
        const parent = categories.find((c) => c.id === forceParentId);
        if (parent) {
          setType(parent.type);
          setColor(parent.color);
          setScope(parent.scope || "PERSONAL");
        }
      } else {
        setMode("parent");
        setParentId("");
      }
    }
    setIconSearch("");
  }, [open, editing, defaultType, defaultScope, forceParentId, categories]);

  if (!open) return null;

  const lockedType = Boolean(editing && usageCount > 0);
  const isSystem = Boolean(editing?.isSystem);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (mode === "child" && !parentId) return;
    onSave({
      name: name.trim(),
      type,
      color,
      icon,
      scope,
      parentId: mode === "child" ? parentId : null,
      isSystem: editing?.isSystem,
    });
  };

  const PreviewIcon = getIcon(icon);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[92vh] overflow-y-auto no-scrollbar border border-slate-100">
        <div className="flex justify-between items-center mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {mode === "child" ? "Subcategoria" : "Categoria mãe"}
            </p>
            <h2 className="text-lg font-black text-slate-800">
              {editing ? "Editar" : "Nova"}{" "}
              {mode === "child" ? "Subcategoria" : "Categoria"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition active:scale-95"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${color}33`, color }}
            >
              <PreviewIcon size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-800 truncate">
                {name.trim() || "Nome da categoria"}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                {mode === "child"
                  ? parentOptions.find((p) => p.id === parentId)?.name ||
                    "Selecione a categoria mãe"
                  : "Categoria principal"}
              </p>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
              Nome
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-base font-bold outline-none transition placeholder:font-normal"
              placeholder="Ex: Mercado, Feira, Combustível"
              autoFocus
            />
          </div>

          {/* Mãe vs Sub */}
          {!forceParentId && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                Tipo de estrutura
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSystem && Boolean(editing?.parentId)}
                  onClick={() => setMode("parent")}
                  className={`py-3 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    mode === "parent"
                      ? "border-[#0F388A] bg-blue-50 text-[#0F388A]"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  <Layers size={14} />
                  Categoria mãe
                </button>
                <button
                  type="button"
                  disabled={isSystem && !editing?.parentId}
                  onClick={() => setMode("child")}
                  className={`py-3 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    mode === "child"
                      ? "border-[#0F388A] bg-blue-50 text-[#0F388A]"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  <FolderTree size={14} />
                  Subcategoria
                </button>
              </div>
            </div>
          )}

          {mode === "child" && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                Categoria mãe
              </label>
              <select
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                  const p = categories.find((c) => c.id === e.target.value);
                  if (p) {
                    setType(p.type);
                    setScope(p.scope || "PERSONAL");
                  }
                }}
                disabled={Boolean(forceParentId)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-500"
              >
                <option value="">Selecione...</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!PERSONAL_ONLY_MODE && mode === "parent" && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                Módulo
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("PERSONAL")}
                  className={`py-3 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    scope === "PERSONAL"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  <User size={14} /> Pessoal
                </button>
                <button
                  type="button"
                  onClick={() => setScope("BUSINESS")}
                  className={`py-3 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    scope === "BUSINESS"
                      ? "border-purple-600 bg-purple-50 text-purple-600"
                      : "border-slate-100 bg-slate-50 text-slate-400"
                  }`}
                >
                  <Music size={14} /> Músico
                </button>
              </div>
            </div>
          )}

          {mode === "parent" && (
            <div>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Tipo de fluxo
                </label>
                {lockedType && (
                  <span className="flex items-center text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-bold">
                    <Lock size={10} className="mr-1" /> Bloqueado
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  disabled={lockedType}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${
                    type === "expense"
                      ? "border-rose-500 bg-rose-50 text-rose-600"
                      : "border-slate-100 bg-white text-slate-400"
                  } disabled:opacity-50`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType("income")}
                  disabled={lockedType}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${
                    type === "income"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                      : "border-slate-100 bg-white text-slate-400"
                  } disabled:opacity-50`}
                >
                  Receita
                </button>
              </div>
            </div>
          )}

          {/* Cores */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
              Cor
            </label>
            <div className="flex flex-wrap gap-2.5">
              {CATEGORY_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                    color === c
                      ? "scale-110 ring-2 ring-offset-2 ring-indigo-500 shadow-md"
                      : "hover:scale-105 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <CheckCircle2
                      size={14}
                      className="text-white drop-shadow-md"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Ícones */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
              Ícone
            </label>
            <div className="relative mb-2">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Buscar ícone..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto no-scrollbar p-1">
              {iconNames.map((iconName) => {
                const IconComp = ICON_MAP[iconName];
                const isSelected = icon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    title={iconName}
                    onClick={() => setIcon(iconName)}
                    className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-[#0F388A] text-[#FACC15] shadow-lg scale-105"
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <IconComp size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex space-x-3">
            {editing && onDelete && !isSystem && (
              <button
                type="button"
                onClick={onDelete}
                disabled={usageCount > 0}
                className="flex-none w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 transition disabled:opacity-40"
                title={
                  usageCount > 0
                    ? "Categoria em uso"
                    : "Excluir categoria"
                }
              >
                <Trash2 size={20} />
              </button>
            )}
            {editing && isSystem && (
              <div className="flex-none p-3 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-[10px] font-bold leading-tight max-w-[100px]">
                <span className="flex flex-col items-center">
                  <Lock size={14} className="mb-1" />
                  Sistema
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!name.trim() || (mode === "child" && !parentId)}
              className="flex-1 h-12 bg-[#0F388A] hover:bg-[#0F388A] text-[#FACC15] rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-blue-900/10 transition-transform active:scale-95 flex items-center justify-center disabled:opacity-50"
            >
              {editing ? "Salvar alterações" : "Criar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
