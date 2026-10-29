import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useFinance } from "../context/FinanceContext";
import {
  Search,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Wallet,
  CreditCard,
  Sparkles,
  Sliders,
  Receipt,
  Landmark,
  BarChart3,
  FolderTree,
  Plus,
  Target,
  ShieldAlert,
  RefreshCw,
  UploadCloud,
  Database,
  Bell,
  X,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { AuthHeaderWidget } from "./AuthHeaderWidget";
import { TransactionForm } from "./TransactionForm";
import { BankImportModal } from "./BankImportModal";
import { Settings } from "./Settings";
import { FinancialSettingsScreen } from "./FinancialSettingsScreen";
import { CategoryList } from "./CategoryList";
import { AlertsScreen } from "./AlertsScreen";

interface MenuItem {
  id: string;
  title: string;
  desc: string;
  icon: any;
  action: () => void;
  badge?: string;
  keywords: string;
}

interface MenuCategory {
  id: string;
  title: string;
  icon: any;
  accent: string;
  iconBg: string;
  items: MenuItem[];
}

const resolveSubScreen = (
  pathname: string,
  tab: string | null,
): "settings" | "financial" | "categories" | "alerts" | null => {
  if (pathname.includes("/categories") || tab === "categories") return "categories";
  if (pathname.includes("/financial-settings") || tab === "financial")
    return "financial";
  if (pathname.includes("/alerts") || tab === "alerts") return "alerts";
  if (pathname.includes("/settings") || tab === "settings") return "settings";
  return null;
};

export const MoreHubScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const directTab = searchParams.get("tab");

  const { getSystemAlerts } = useFinance();
  const alertsCount = useMemo(
    () => getSystemAlerts().length,
    [getSystemAlerts],
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);
  const [activeSubScreen, setActiveSubScreen] = useState<
    "settings" | "financial" | "categories" | "alerts" | null
  >(() => resolveSubScreen(location.pathname, directTab));

  useEffect(() => {
    setActiveSubScreen(resolveSubScreen(location.pathname, directTab));
  }, [location.pathname, directTab]);

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    day: true,
    plan: true,
    debts: false,
    reports: false,
    system: false,
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const menuCategories: MenuCategory[] = useMemo(
    () => [
      {
        id: "day",
        title: "Dia a dia",
        icon: Wallet,
        accent: "text-blue-800",
        iconBg: "bg-blue-50",
        items: [
          {
            id: "extrato",
            title: "Extrato",
            desc: "Receitas, despesas e transferências",
            icon: Receipt,
            action: () => navigate("/lancamentos"),
            keywords:
              "extrato transacoes lancamentos movimentacoes receitas despesas",
          },
          {
            id: "contas",
            title: "Contas e saldos",
            desc: "Bancos, carteira e conciliação",
            icon: Landmark,
            action: () => navigate("/contas"),
            keywords: "contas bancos carteiras saldo patrimonio",
          },
          {
            id: "novo_lancamento",
            title: "Novo lançamento",
            desc: "Receita, despesa ou transferência",
            icon: Plus,
            action: () => setIsTxModalOpen(true),
            badge: "Rápido",
            keywords: "novo lancamento despesa receita adicionar",
          },
          {
            id: "categorias_pessoais",
            title: "Categorias",
            desc: "Organizar gastos e receitas",
            icon: FolderTree,
            action: () => setActiveSubScreen("categories"),
            keywords: "categorias grupos classificacao",
          },
        ],
      },
      {
        id: "plan",
        title: "Planejamento",
        icon: Target,
        accent: "text-indigo-700",
        iconBg: "bg-indigo-50",
        items: [
          {
            id: "planejamento",
            title: "Orçamentos",
            desc: "Tetos por categoria e regra 50/30/20",
            icon: Target,
            action: () => navigate("/planejamento"),
            keywords: "orcamento planejamento tetos metas 50 30 20",
          },
          {
            id: "inteligencia",
            title: "Visão inteligente",
            desc: "Quanto posso gastar e projeções",
            icon: Sparkles,
            action: () => navigate("/inteligencia"),
            keywords: "inteligencia insights posso gastar custo vida projecao",
          },
          {
            id: "gastos",
            title: "Análise de gastos",
            desc: "Distribuição por categoria no mês",
            icon: BarChart3,
            action: () => navigate("/gastos"),
            keywords: "gastos graficos analise categorias consumo",
          },
          {
            id: "parametros_financeiros",
            title: "Reserva e regras",
            desc: "Reserva mínima e categorias essenciais",
            icon: Sliders,
            action: () => setActiveSubScreen("financial"),
            keywords: "parametros reserva metas configuracao",
          },
        ],
      },
      {
        id: "debts",
        title: "Dívidas e fixas",
        icon: CreditCard,
        accent: "text-rose-700",
        iconBg: "bg-rose-50",
        items: [
          {
            id: "controle_dividas",
            title: "Dívidas",
            desc: "Financiamentos, cartão e quitação",
            icon: ShieldAlert,
            action: () => navigate("/dividas"),
            keywords: "dividas financiamento emprestimo quitacao",
          },
          {
            id: "contas_fixas",
            title: "Contas fixas",
            desc: "Água, luz, internet e recorrentes",
            icon: RefreshCw,
            action: () => navigate("/contas-fixas"),
            keywords:
              "contas fixas pendentes recorrentes agendadas agua luz internet",
          },
          {
            id: "parcelamentos",
            title: "Parcelamentos",
            desc: "Parcelas abertas de cartão e bancos",
            icon: CreditCard,
            action: () => navigate("/dividas"),
            keywords: "parcelas parcelamento cartao credito",
          },
        ],
      },
      {
        id: "reports",
        title: "Relatórios",
        icon: FileText,
        accent: "text-amber-700",
        iconBg: "bg-amber-50",
        items: [
          {
            id: "relatorio_ia",
            title: "Relatório para IA",
            desc: "Diagnóstico e simulação de decisões",
            icon: Sparkles,
            action: () => navigate("/relatorios?tab=ai"),
            badge: "IA",
            keywords: "ia inteligência gemini relatorio diagnostico cenario",
          },
          {
            id: "relatorios",
            title: "Balanço e fluxo",
            desc: "Resumo mensal, fluxo e calendário",
            icon: FileText,
            action: () => navigate("/relatorios?tab=summary"),
            keywords: "balanco fluxo calendario relatorios",
          },
          {
            id: "importador_extrato",
            title: "Importar extrato",
            desc: "Arquivos OFX ou CSV do banco",
            icon: UploadCloud,
            action: () => setIsBankImportOpen(true),
            keywords: "importar extrato ofx csv banco",
          },
          {
            id: "central_alertas",
            title: "Central de alertas",
            desc: "Vencimentos, orçamentos e caixa",
            icon: Bell,
            action: () => setActiveSubScreen("alerts"),
            badge: alertsCount > 0 ? `${alertsCount}` : undefined,
            keywords: "alertas avisos vencimentos notificacoes",
          },
        ],
      },
      {
        id: "system",
        title: "Conta e dados",
        icon: Database,
        accent: "text-slate-600",
        iconBg: "bg-slate-100",
        items: [
          {
            id: "config_gerais",
            title: "Sincronização e backup",
            desc: "Conta Google, nuvem e restauração",
            icon: Database,
            action: () => setActiveSubScreen("settings"),
            keywords:
              "firebase nuvem conta google sync sincronizacao banco backup",
          },
          {
            id: "backup_json",
            title: "Exportar / importar JSON",
            desc: "Cópia de segurança dos seus dados",
            icon: ShieldCheck,
            action: () => setActiveSubScreen("settings"),
            keywords: "backup restauracao json exportar importar",
          },
        ],
      },
    ],
    [navigate, alertsCount],
  );

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    const matches: MenuItem[] = [];
    menuCategories.forEach((cat) => {
      cat.items.forEach((item) => {
        if (
          item.title.toLowerCase().includes(term) ||
          item.desc.toLowerCase().includes(term) ||
          item.keywords.toLowerCase().includes(term)
        ) {
          matches.push(item);
        }
      });
    });
    return matches;
  }, [searchTerm, menuCategories]);

  const renderMenuRow = (item: MenuItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={item.action}
        className="w-full p-3.5 px-4 hover:bg-slate-50 transition flex items-center justify-between text-left group active:scale-[0.99]"
      >
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 group-hover:text-blue-800 group-hover:bg-blue-50 flex items-center justify-center shrink-0 transition">
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-800 group-hover:text-blue-900 transition truncate">
                {item.title}
              </span>
              {item.badge && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 block truncate">
              {item.desc}
            </span>
          </div>
        </div>
        <ChevronRight
          size={15}
          className="text-slate-300 group-hover:text-blue-800 transition shrink-0"
        />
      </button>
    );
  };

  if (activeSubScreen) {
    return (
      <div className="space-y-4 pb-28 animate-fade-in text-slate-800">
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => setActiveSubScreen(null)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-blue-900 hover:border-blue-200 transition active:scale-95 shadow-sm"
          >
            <ChevronLeft size={16} />
            <span>Voltar ao menu</span>
          </button>
        </div>

        {activeSubScreen === "settings" && <Settings />}
        {activeSubScreen === "financial" && <FinancialSettingsScreen />}
        {activeSubScreen === "categories" && <CategoryList />}
        {activeSubScreen === "alerts" && <AlertsScreen />}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 animate-fade-in text-slate-800">
      <div className="rounded-[1.75rem] bg-gradient-to-br from-[#0F388A] via-[#0F388A] to-[#0a4a9e] p-5 shadow-lg text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#FACC15]/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FACC15]">
              Finanças pessoais
            </span>
            <h1 className="text-xl font-black tracking-tight mt-1">Menu</h1>
            <p className="text-[11px] text-blue-100/90 font-medium mt-0.5">
              Tudo o que você precisa para controlar seu dinheiro
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubScreen("settings")}
            className="p-2.5 rounded-2xl bg-blue-950/50 hover:bg-blue-950/70 border border-blue-500/30 text-blue-100 hover:text-[#FACC15] transition active:scale-95 shrink-0"
            title="Configurações"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3.5 top-3.5 text-slate-400"
          size={17}
        />
        <input
          type="text"
          placeholder="Buscar: extrato, orçamento, dívidas, backup..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-9 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <AuthHeaderWidget />

      {filteredResults !== null ? (
        <div className="space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
            Resultados ({filteredResults.length})
          </span>
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 text-xs shadow-sm">
              Nenhuma função encontrada para &quot;{searchTerm}&quot;.
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredResults.map(renderMenuRow)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {menuCategories.map((category) => {
            const isOpen = openSections[category.id] ?? false;
            const CategoryIcon = category.icon;

            return (
              <div
                key={category.id}
                className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(category.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50/80 transition text-left"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl ${category.iconBg} ${category.accent} shrink-0`}
                    >
                      <CategoryIcon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight">
                        {category.title}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {category.items.length} opções
                      </span>
                    </div>
                  </div>
                  <div
                    className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-blue-800" : ""
                    }`}
                  >
                    <ChevronDown size={17} />
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {category.items.map(renderMenuRow)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isTxModalOpen && (
        <TransactionForm onClose={() => setIsTxModalOpen(false)} />
      )}
      {isBankImportOpen && (
        <BankImportModal
          isOpen={isBankImportOpen}
          onClose={() => setIsBankImportOpen(false)}
        />
      )}
    </div>
  );
};
