import React, { useMemo, useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Receipt,
  CreditCard,
  Menu,
  Plus,
  Sparkles,
  LogOut,
  FolderTree,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { useFinance } from "../context/FinanceContext";

interface Props {
  children: React.ReactNode;
  onOpenAdd: (
    type?: "income" | "expense" | "transfer" | "goal_deposit" | "goal_withdraw",
  ) => void;
}

export const Layout: React.FC<Props> = ({ children, onOpenAdd }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    getSystemAlerts,
    settings,
    currentUser,
    isDemoMode,
    exitDemoMode,
    signInWithGoogle,
    logoutUser,
  } = useFinance();

  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!quickMenuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (
        quickMenuRef.current &&
        !quickMenuRef.current.contains(e.target as Node)
      ) {
        setQuickMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [quickMenuOpen]);

  const alerts = useMemo(() => getSystemAlerts(), [getSystemAlerts]);
  const hasAlerts = alerts.length > 0;

  // Active state determination for the 4 personal tabs
  const isHomeActive = location.pathname === "/";

  const isLancamentosActive = [
    "/lancamentos",
    "/extrato",
    "/financeiro",
    "/transactions",
    "/flow",
  ].some(
    (path) =>
      location.pathname === path ||
      location.pathname.startsWith("/lancamentos") ||
      location.pathname.startsWith("/extrato") ||
      location.pathname.startsWith("/financeiro"),
  );

  const isDividasActive = ["/dividas", "/debts"].some(
    (path) =>
      location.pathname === path ||
      location.pathname.startsWith("/dividas") ||
      location.pathname.startsWith("/debts"),
  );

  const isMaisActive = [
    "/mais",
    "/settings",
    "/financial-settings",
    "/categories",
    "/categorias",
    "/alerts",
    "/gastos",
    "/analise-gastos",
    "/visao-inteligente",
    "/contas",
    "/contas-fixas",
    "/fixas",
    "/relatorios",
    "/planejamento",
    "/orcamentos",
    "/inteligencia",
    "/insights",
  ].some(
    (path) =>
      location.pathname === path ||
      location.pathname.startsWith("/mais") ||
      location.pathname.startsWith("/relatorios") ||
      location.pathname.startsWith("/contas-fixas") ||
      location.pathname.startsWith("/planejamento") ||
      location.pathname.startsWith("/analise-gastos") ||
      location.pathname.startsWith("/visao-inteligente"),
  );

  const navItems = [
    { to: "/", label: "Início", icon: Home, isActive: isHomeActive },
    {
      to: "/lancamentos",
      label: "Lançamentos",
      icon: Receipt,
      isActive: isLancamentosActive,
    },
    {
      to: "/dividas",
      label: "Dívidas",
      icon: CreditCard,
      isActive: isDividasActive,
    },
    {
      to: "/mais",
      label: "Mais",
      icon: Menu,
      isActive: isMaisActive,
      hasBadge: hasAlerts,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand/20 selection:text-brand flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F388A] border-b border-[#0A255D] shadow-md text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer group select-none"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-400 text-[#0F388A] font-black text-sm flex items-center justify-center shadow-md transition group-hover:scale-105">
              MF
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-base tracking-tight leading-none">
                  Minhas Finanças
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-yellow-400 text-[#0F388A] font-sans shadow-sm">
                  Pro
                </span>
              </div>
              <span className="text-[11px] text-blue-100/90 font-medium">
                Seu controle financeiro
              </span>
            </div>
          </div>

          {/* Navegação Desktop (4 Abas) */}
          <nav className="hidden md:flex items-center space-x-1 bg-black/20 p-1.5 rounded-2xl border border-white/10">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`
 flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all
 ${
   item.isActive
     ? "bg-yellow-400 text-[#0F388A] shadow-sm"
     : "text-blue-100 hover:text-white hover:bg-white/10"
 }
`}
                >
                  <Icon size={16} strokeWidth={item.isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                  {item.hasBadge && (
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse ml-1" />
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Ações da Direita (Atalhos + Novo Lançamento + Usuário) */}
          <div className="flex items-center space-x-2.5">
            {/* Atalhos rápidos: Categorias / Contas */}
            <div className="relative" ref={quickMenuRef}>
              <button
                type="button"
                onClick={() => setQuickMenuOpen((v) => !v)}
                className="py-2 px-2.5 sm:px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/15 flex items-center gap-1.5 active:scale-95"
                aria-expanded={quickMenuOpen}
                aria-haspopup="menu"
                title="Atalhos rápidos"
              >
                <FolderTree size={15} />
                <span className="hidden lg:inline">Atalhos</span>
                <ChevronDown
                  size={12}
                  className={`opacity-70 transition ${quickMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {quickMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 rounded-2xl bg-white shadow-xl border border-slate-100 py-1.5 z-[60] animate-fade-in"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setQuickMenuOpen(false);
                      navigate("/categorias");
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition"
                  >
                    <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#0F388A] flex items-center justify-center">
                      <FolderTree size={16} />
                    </span>
                    <span>
                      <span className="block text-xs font-black text-slate-800">
                        Categorias
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        Essencialidade e hierarquia
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setQuickMenuOpen(false);
                      navigate("/contas");
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition"
                  >
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Wallet size={16} />
                    </span>
                    <span>
                      <span className="block text-xs font-black text-slate-800">
                        Contas
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        Bancos e carteiras
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onOpenAdd("expense")}
              className="py-2 px-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-[#0F388A] font-extrabold text-xs uppercase tracking-wide transition active:scale-95 shadow-sm flex items-center space-x-1.5"
            >
              <Plus size={15} strokeWidth={3} />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </button>

            {/* Perfil / Sessão */}
            {isDemoMode ? (
              <div className="flex items-center space-x-1.5 bg-black/25 border border-white/15 px-2 py-1 rounded-xl">
                <span className="text-[11px] text-yellow-300 font-bold hidden sm:inline">
                  Demo
                </span>
                <button
                  onClick={() => exitDemoMode()}
                  className="p-1 rounded-lg text-blue-100 hover:text-white transition"
                  title="Sair do Modo Demo"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : currentUser ? (
              <div className="flex items-center space-x-1.5 bg-black/25 border border-white/15 px-2.5 py-1 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-yellow-400 text-[#0F388A] font-black text-xs flex items-center justify-center">
                  {(settings.userName || "U").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white max-w-[90px] truncate hidden sm:inline">
                  {settings.userName || "Leo"}
                </span>
                <button
                  onClick={() => logoutUser()}
                  className="p-1 text-blue-100 hover:text-rose-300 transition"
                  title="Sair"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="py-1.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition border border-white/20"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ÁREA PRINCIPAL — pt-20 compensa header fixed (h-16) */}
      {/* ========================================================================= */}
      <main className="w-full flex-1 max-w-7xl mx-auto pt-20 px-3.5 sm:px-6 lg:px-8 pb-24 md:pb-10">
        {/* Banner de Demonstração (se ativo) */}
        {isDemoMode && (
          <div className="mb-5 p-3.5 rounded-2xl bg-white border border-yellow-300 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-yellow-100 text-yellow-800 shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-800">
                  Modo Demonstração Pessoal
                </p>
                <p className="text-[11px] text-slate-500">
                  Dados temporários em memória para navegação sem afetar o banco
                  principal.
                </p>
              </div>
            </div>
            <button
              onClick={() => exitDemoMode()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition border border-slate-300 shrink-0"
            >
              Sair
            </button>
          </div>
        )}

        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`
 relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-95
 ${
   item.isActive
     ? "text-[#0F388A] font-extrabold"
     : "text-slate-600 hover:text-slate-800 font-medium"
 }
`}
              >
                <div
                  className={`
 relative p-1 rounded-xl transition-colors
 ${item.isActive ? "bg-blue-50 text-[#0F388A]" : ""}
`}
                >
                  <Icon size={20} strokeWidth={item.isActive ? 2.5 : 2} />

                  {item.hasBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-white shadow-sm animate-pulse" />
                  )}
                </div>

                <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">
                  {item.label}
                </span>

                {item.isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-0.5" />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
