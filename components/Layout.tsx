import React, { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Receipt, Music, CreditCard, Menu, 
  Plus, TrendingUp, Sparkles, User, Landmark, 
  UploadCloud, Settings, Bell, ShieldCheck, ChevronRight,
  LogOut, LogIn
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface Props {
  children: React.ReactNode;
  onOpenAdd: (type?: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw') => void;
}

export const Layout: React.FC<Props> = ({ children, onOpenAdd }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    getSystemAlerts, 
    activeScope, 
    setActiveScope, 
    settings, 
    currentUser, 
    signInWithGoogle, 
    logoutUser 
  } = useFinance();

  const alerts = useMemo(() => getSystemAlerts(), [getSystemAlerts]);
  const hasAlerts = alerts.length > 0;

  // Determine active states for navigation tabs
  const isHomeActive = location.pathname === '/';
  
  const isLancamentosActive = [
    '/lancamentos', '/extrato', '/financeiro', '/transactions', '/flow'
  ].some(path => location.pathname === path || location.pathname.startsWith('/lancamentos') || location.pathname.startsWith('/financeiro'));

  const isShowsActive = location.pathname.startsWith('/shows');

  const isDividasActive = [
    '/dividas', '/debts'
  ].some(path => location.pathname === path || location.pathname.startsWith('/dividas') || location.pathname.startsWith('/debts'));

  const isMaisActive = [
    '/mais', '/settings', '/financial-settings', '/categories', '/alerts', '/gastos', '/contas', '/relatorios'
  ].some(path => location.pathname === path || location.pathname.startsWith('/mais') || location.pathname.startsWith('/relatorios'));

  const navItems = [
    { to: '/', label: 'Início', icon: Home, isActive: isHomeActive },
    { to: '/lancamentos', label: 'Lançamentos', icon: Receipt, isActive: isLancamentosActive },
    { to: '/shows', label: 'Shows & Carreira', icon: Music, isActive: isShowsActive, badge: 'Sou Artista' },
    { to: '/dividas', label: 'Dívidas', icon: CreditCard, isActive: isDividasActive },
    { to: '/mais', label: 'Menu / Ajustes', icon: Menu, isActive: isMaisActive, hasBadge: hasAlerts },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] font-sans text-white selection:bg-[#003882]/50 selection:text-[#fcca00] flex flex-col md:flex-row">
      
      {/* ========================================================================= */}
      {/* 1. SIDEBAR DESKTOP (VISÍVEL APENAS EM TELAS MÉDIAS/GRANDES - md:)          */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#121214] border-r border-zinc-800 shrink-0 min-h-screen fixed left-0 top-0 bottom-0 z-30 justify-between p-4 lg:p-5 overflow-y-auto">
        
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 px-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#003882] to-[#002d6c] border border-blue-500/40 p-0.5 shadow-md flex items-center justify-center text-[#fcca00] font-black text-lg">
              FP
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-white text-base tracking-tight leading-none">Finanças Pro</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-[#fcca00]/20 text-[#fcca00] border border-[#fcca00]/30">
                  v2.5
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">Fintech & Sou Artista</span>
            </div>
          </div>

          {/* Seletor Rápido de Módulo (Pessoal vs Carreira) */}
          <div className="p-1 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-2 gap-1 text-xs font-bold">
            <button
              onClick={() => {
                setActiveScope('PERSONAL');
                navigate('/');
              }}
              className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
                activeScope === 'PERSONAL'
                  ? 'bg-[#003882] text-[#fcca00] font-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User size={13} />
              <span>Pessoal</span>
            </button>

            <button
              onClick={() => {
                setActiveScope('BUSINESS');
                navigate('/shows');
              }}
              className={`py-2 px-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 ${
                activeScope === 'BUSINESS'
                  ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Music size={13} />
              <span>Música</span>
            </button>
          </div>

          {/* Botão de Lançamento Rápido */}
          <div className="space-y-2">
            <button
              onClick={() => onOpenAdd('expense')}
              className="w-full py-3 px-4 rounded-2xl bg-[#003882] hover:bg-blue-700 text-[#fcca00] font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-blue-900/40 flex items-center justify-center space-x-2 border border-blue-500/40"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Novo Lançamento</span>
            </button>
            
            <button
              onClick={() => navigate('/shows')}
              className="w-full py-2.5 px-4 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-black text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-2 border border-purple-500/30"
            >
              <Music size={15} />
              <span>Gestão de Shows</span>
            </button>
          </div>

          {/* Menu Links */}
          <nav className="space-y-1 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`
                    flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all
                    ${item.isActive 
                      ? 'bg-zinc-800 text-[#fcca00] font-black border border-zinc-700 shadow-sm' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={18} strokeWidth={item.isActive ? 2.5 : 2} className={item.isActive ? 'text-[#fcca00]' : 'text-zinc-400'} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {item.badge}
                    </span>
                  )}

                  {item.hasBadge && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fcca00] shadow-[0_0_6px_#fcca00] animate-pulse" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer do Sidebar Desktop (Perfil / Auth) */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#fcca00] to-amber-300 text-zinc-950 font-black text-xs flex items-center justify-center shrink-0">
                {(settings.userName || 'Leo').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-white truncate block">
                  {settings.userName || 'Leo Ferreira'}
                </span>
                <span className="text-[10px] text-zinc-400 block truncate">
                  {currentUser ? 'Sincronizado na Nuvem' : 'Armazenamento Local'}
                </span>
              </div>
            </div>

            {currentUser ? (
              <button
                onClick={() => logoutUser()}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
                title="Sair da Conta"
              >
                <LogOut size={14} />
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="p-1.5 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 transition text-[10px] font-bold"
                title="Conectar com Google"
              >
                Entrar
              </button>
            )}
          </div>
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL (100% RESPONSIVO EM TODAS AS TELAS)         */}
      {/* ========================================================================= */}
      <main className="w-full md:pl-64 lg:pl-72 min-h-screen bg-[#09090b] text-white relative pb-28 md:pb-12 overflow-x-hidden flex-1">
        
        {/* Container Central com Expansão Ampla no Desktop */}
        <div className="p-3.5 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. BARRA INFERIOR FLUTUANTE FINTECH (VISÍVEL APENAS NO CELULAR - md:hidden) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-3 left-0 right-0 z-40 px-3 sm:px-4 pointer-events-none md:hidden">
        <div className="max-w-md mx-auto pointer-events-auto">
          <nav className="bg-[#121214]/95 backdrop-blur-2xl border border-zinc-800/90 rounded-2xl sm:rounded-3xl p-1.5 shadow-2xl shadow-black/90 flex items-center justify-between gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`
                    relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-95 group
                    ${item.isActive 
                      ? 'text-[#fcca00] font-black' 
                      : 'text-zinc-400 hover:text-zinc-200 font-medium'
                    }
                  `}
                >
                  {/* Subtle active container */}
                  <div className={`
                    relative p-1 rounded-xl transition-all duration-200
                    ${item.isActive ? 'bg-[#003882] text-[#fcca00] shadow-[0_0_12px_rgba(0,56,130,0.5)] border border-blue-500/40' : 'group-hover:bg-zinc-800/40'}
                  `}>
                    <Icon size={19} strokeWidth={item.isActive ? 2.5 : 2} />

                    {/* Badge de Alerta no Menu */}
                    {item.hasBadge && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#fcca00] border-2 border-[#121214] shadow-sm animate-pulse" />
                    )}
                  </div>

                  <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                    {item.label}
                  </span>

                  {/* Active dot indicator */}
                  {item.isActive && (
                    <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#fcca00] shadow-[0_0_6px_#fcca00]" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

    </div>
  );
};
