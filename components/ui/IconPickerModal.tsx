import React, { useMemo, useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import {
  ICON_CATEGORIES,
  searchIcons,
  type IconCategoryId,
  ICONS_COUNT,
} from "../../src/constants/icons";
import { CategoryIcon } from "./CategoryIcon";

interface IconPickerModalProps {
  open: boolean;
  selectedIcon: string;
  /** Cor usada nas miniaturas do grid (estilo Mobills) */
  previewColor?: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
}

type TabId = IconCategoryId | "all";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "Todos" },
  ...ICON_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

/**
 * Modal de seleção de ícones estilo Mobills:
 * busca em tempo real + abas por categoria + grid de bolinhas coloridas.
 */
export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  open,
  selectedIcon,
  previewColor = "#0F388A",
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabId>("all");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTab("all");
  }, [open]);

  const filtered = useMemo(
    () => searchIcons(query, tab === "all" ? "all" : tab),
    [query, tab],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Selecionar ícone"
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col animate-slide-up"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <CategoryIcon
              iconName={selectedIcon}
              color={previewColor}
              size="md"
            />
            <div className="min-w-0">
              <h2 className="text-base font-black text-slate-800">
                Escolher ícone
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {filtered.length} de {ICONS_COUNT} opções
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition active:scale-95"
            aria-label="Fechar"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 shrink-0 space-y-3">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar: mercado, carro, saúde..."
              autoFocus
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                    active
                      ? "bg-[#0F388A] text-[#FACC15] shadow-md"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-5 no-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 font-medium">
              Nenhum ícone encontrado para “{query}”
            </div>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 pt-1">
              {filtered.map((item) => {
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    title={`${item.label} (${item.name})`}
                    onClick={() => {
                      onSelect(item.name);
                      onClose();
                    }}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl transition-all active:scale-95 ${
                      isSelected
                        ? "bg-blue-50 ring-2 ring-[#0F388A]/40"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`rounded-full p-2.5 flex items-center justify-center transition-transform ${
                        isSelected ? "scale-110 shadow-md" : "opacity-90"
                      }`}
                      style={{ backgroundColor: previewColor }}
                    >
                      <item.component
                        size={18}
                        className="text-white"
                        strokeWidth={2.3}
                        style={{ color: "#fff" }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IconPickerModal;
