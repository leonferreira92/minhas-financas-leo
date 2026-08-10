import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, Plus, Target, Menu, X, 
  ArrowUpRight, ArrowDownRight, ArrowRightLeft, PiggyBank, 
  Music, CreditCard, TrendingUp, Calendar, Sparkles, 
  Bell, FolderTree, Settings, ChevronRight, PieChart, 
  Activity, Wallet, ShieldAlert, Layers
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onOpenAdd: (type?: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw') => void;
}

export const Layout: React.FC<Props> = ({ children, onOpenAdd }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Check if current path belongs to primary 3 tabs, otherwise "MAIS" is active
  const primaryPaths = ['/', '/transactions', '/planning'];
  const isMoreActive = !primaryPaths.includes(location.pathname);

  const handleQuickAction = (actionType: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw' | 'show') => {
    setIsQuickActionOpen(false);
    if (actionType === 'show') {
      navigate('/shows');
    } else {
      onOpenAdd(actionType);
    }
  };

  const handleNavigateMore = (path: string) => {
    setIsMoreMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-700 transition-colors duration-200">
      
      {/* Container Principal com padding inferior amplo para nunca encobrir conteúdo */}
      <main className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 sm:border-x sm:border-slate-200/80 dark:sm:border-slate-800/80 shadow-2xl relative transition-colors duration-200 pb-36">
        <div className="p-4 sm:p-5">
          {children}
        </div>
      </main>

      {/* NAVBAR INFERIOR FIXA E RESPONSIVA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-[env(safe-area-inset-bottom,16px)]">
        <div className="max-w-md mx-auto relative px-2 sm:px-4">
          
          <nav className="flex justify-between items-center h-[68px] relative z-10">
            {/* 1. VISÃO GERAL */}
            <NavLink 
              to="/" 
              className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95
                ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                    <LayoutDashboard size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5">Visão Geral</span>
                </>
              )}
            </NavLink>

            {/* 2. EXTRATO */}
            <NavLink 
              to="/transactions" 
              className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95
                ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                    <Receipt size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5">Extrato</span>
                </>
              )}
            </NavLink>

            {/* 3. BOTÃO CENTRAL (NOVA MOVIMENTAÇÃO) */}
            <div className="flex-1 flex justify-center items-center h-full">
              <button 
                onClick={() => setIsQuickActionOpen(true)}
                className="relative -top-5 flex flex-col items-center justify-center group active:scale-90 transition-transform"
                aria-label="Nova Movimentação"
              >
                {/* Visual Glow */}
                <div className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-full blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
                
                <div className="relative w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-500 dark:from-indigo-500 dark:to-indigo-400 rounded-2xl shadow-lg flex items-center justify-center text-white border-4 border-slate-50 dark:border-slate-950 transition-all duration-300 group-hover:scale-105">
                  <Plus size={28} strokeWidth={3} className={`transition-transform duration-300 ${isQuickActionOpen ? 'rotate-45' : ''}`} />
                </div>
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-0.5">
                  Novo
                </span>
              </button>
            </div>

            {/* 4. PLANEJAMENTO */}
            <NavLink 
              to="/planning" 
              className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95
                ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                    <Target size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5">Planejamento</span>
                </>
              )}
            </NavLink>

            {/* 5. MAIS */}
            <button 
              onClick={() => setIsMoreMenuOpen(true)}
              className={`
                flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-200 active:scale-95
                ${isMoreActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'}
              `}
            >
              <div className={`relative p-1 rounded-xl transition-all ${isMoreActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''}`}>
                <Menu size={20} strokeWidth={isMoreActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Mais</span>
            </button>
          </nav>
        </div>
      </div>

      {/* MODAL / BOTTOM SHEET: QUICK ACTIONS (NOVA MOVIMENTAÇÃO) */}
      {isQuickActionOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsQuickActionOpen(false)} 
          />
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 z-10 animate-slide-up space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                  <Plus size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Nova Movimentação</h3>
                  <p className="text-[11px] font-medium text-slate-400">Selecione o tipo de registro rápido</p>
                </div>
              </div>

              <button 
                onClick={() => setIsQuickActionOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Receita */}
              <button
                onClick={() => handleQuickAction('income')}
                className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <ArrowUpRight size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 block">Receita</span>
                  <span className="text-[10px] text-slate-400 font-medium">Entradas e salários</span>
                </div>
              </button>

              {/* Despesa */}
              <button
                onClick={() => handleQuickAction('expense')}
                className="p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                  <ArrowDownRight size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-rose-700 dark:text-rose-400 block">Despesa</span>
                  <span className="text-[10px] text-slate-400 font-medium">Contas e compras</span>
                </div>
              </button>

              {/* Transferência */}
              <button
                onClick={() => handleQuickAction('transfer')}
                className="p-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <ArrowRightLeft size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 block">Transferência</span>
                  <span className="text-[10px] text-slate-400 font-medium">Entre suas contas</span>
                </div>
              </button>

              {/* Aporte Cofrinho */}
              <button
                onClick={() => handleQuickAction('goal_deposit')}
                className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <PiggyBank size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 block">Guardar Dinheiro</span>
                  <span className="text-[10px] text-slate-400 font-medium">Aporte no cofrinho</span>
                </div>
              </button>

              {/* Resgate Cofrinho */}
              <button
                onClick={() => handleQuickAction('goal_withdraw')}
                className="p-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <PiggyBank size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-purple-700 dark:text-purple-400 block">Resgatar Valor</span>
                  <span className="text-[10px] text-slate-400 font-medium">Retirar do cofrinho</span>
                </div>
              </button>

              {/* Novo Show / Cachê */}
              <button
                onClick={() => handleQuickAction('show')}
                className="p-4 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-left transition-all active:scale-95 group flex flex-col justify-between h-24"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                  <Music size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xs font-black text-sky-700 dark:text-sky-400 block">Novo Show</span>
                  <span className="text-[10px] text-slate-400 font-medium">Agenda & Cachês</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET / DRAWER: MENU MAIS */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsMoreMenuOpen(false)} 
          />
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 z-10 animate-slide-up space-y-6 max-h-[88vh] overflow-y-auto no-scrollbar">
            
            {/* Drawer Drag Indicator & Header */}
            <div>
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                    <Layers size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">Menu Principal</h3>
                    <p className="text-[11px] font-medium text-slate-400">Acesse todas as telas do sistema</p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* GROUPS */}
            <div className="space-y-6 pb-4">
              
              {/* GRUPO 1: FINANCEIRO */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 block px-1">
                  Financeiro
                </span>

                <div className="grid grid-cols-1 gap-1.5">
                  <DrawerMenuItem
                    icon={ArrowUpRight}
                    iconBg="bg-emerald-500/10 text-emerald-600"
                    title="Receitas"
                    subtitle="Entradas e rendimentos"
                    onClick={() => handleNavigateMore('/transactions')}
                  />
                  <DrawerMenuItem
                    icon={ArrowDownRight}
                    iconBg="bg-rose-500/10 text-rose-600"
                    title="Despesas"
                    subtitle="Saídas e pagamentos"
                    onClick={() => handleNavigateMore('/transactions')}
                  />
                  <DrawerMenuItem
                    icon={Receipt}
                    iconBg="bg-indigo-500/10 text-indigo-600"
                    title="Extrato Completo"
                    subtitle="Todas as movimentações"
                    onClick={() => handleNavigateMore('/transactions')}
                  />
                  <DrawerMenuItem
                    icon={Wallet}
                    iconBg="bg-sky-500/10 text-sky-600"
                    title="Contas & Carteiras"
                    subtitle="Balanço por conta bancária"
                    onClick={() => handleNavigateMore('/summary')}
                  />
                </div>
              </div>

              {/* GRUPO 2: PLANEJAMENTO */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 block px-1">
                  Planejamento
                </span>

                <div className="grid grid-cols-1 gap-1.5">
                  <DrawerMenuItem
                    icon={Target}
                    iconBg="bg-indigo-500/10 text-indigo-600"
                    title="Orçamento & Teto de Gastos"
                    subtitle="Limites e Regra 50/30/20"
                    onClick={() => handleNavigateMore('/planning')}
                  />
                  <DrawerMenuItem
                    icon={PiggyBank}
                    iconBg="bg-amber-500/10 text-amber-600"
                    title="Cofrinhos & Objetivos"
                    subtitle="Metas e acumuladores"
                    onClick={() => handleNavigateMore('/metas')}
                  />
                  <DrawerMenuItem
                    icon={ShieldAlert}
                    iconBg="bg-rose-500/10 text-rose-600"
                    title="Dívidas & Credores"
                    subtitle="Gerenciador de quitações"
                    onClick={() => handleNavigateMore('/debts')}
                  />
                  <DrawerMenuItem
                    icon={Activity}
                    iconBg="bg-purple-500/10 text-purple-600"
                    title="Planejamento Mensal"
                    subtitle="Fluxo de caixa e previsões"
                    onClick={() => handleNavigateMore('/flow')}
                  />
                </div>
              </div>

              {/* GRUPO 3: NEGÓCIO */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 block px-1">
                  Negócio & Agenda
                </span>

                <div className="grid grid-cols-1 gap-1.5">
                  <DrawerMenuItem
                    icon={Music}
                    iconBg="bg-sky-500/10 text-sky-600"
                    title="Shows & Cachês"
                    subtitle="Gestão de eventos e recebimentos"
                    onClick={() => handleNavigateMore('/shows')}
                  />
                  <DrawerMenuItem
                    icon={Calendar}
                    iconBg="bg-indigo-500/10 text-indigo-600"
                    title="Agenda Financeira"
                    subtitle="Calendário de vencimentos"
                    onClick={() => handleNavigateMore('/calendar')}
                  />
                </div>
              </div>

              {/* GRUPO 4: ANÁLISES & SISTEMA */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 block px-1">
                  Análises & Sistema
                </span>

                <div className="grid grid-cols-1 gap-1.5">
                  <DrawerMenuItem
                    icon={Sparkles}
                    iconBg="bg-purple-500/10 text-purple-600"
                    title="Relatórios & Insights IA"
                    subtitle="Análise inteligente de padrão"
                    onClick={() => handleNavigateMore('/insights')}
                  />
                  <DrawerMenuItem
                    icon={Bell}
                    iconBg="bg-amber-500/10 text-amber-600"
                    title="Central de Alertas"
                    subtitle="Lembretes e avisos importantes"
                    onClick={() => handleNavigateMore('/alerts')}
                  />
                  <DrawerMenuItem
                    icon={FolderTree}
                    iconBg="bg-indigo-500/10 text-indigo-600"
                    title="Categorias"
                    subtitle="Gerenciar grupos e cores"
                    onClick={() => handleNavigateMore('/categories')}
                  />
                  <DrawerMenuItem
                    icon={Settings}
                    iconBg="bg-slate-500/10 text-slate-600"
                    title="Configurações"
                    subtitle="Preferências e backup"
                    onClick={() => handleNavigateMore('/settings')}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Componente para itens do menu Drawer
const DrawerMenuItem = ({ 
  icon: Icon, 
  iconBg, 
  title, 
  subtitle, 
  onClick 
}: { 
  icon: any; 
  iconBg: string; 
  title: string; 
  subtitle: string; 
  onClick: () => void; 
}) => (
  <button
    onClick={onClick}
    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-slate-100 dark:border-slate-800 transition flex items-center justify-between group text-left active:scale-[0.99]"
  >
    <div className="flex items-center space-x-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div>
        <h4 className="text-xs font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {title}
        </h4>
        <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>
      </div>
    </div>
    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
  </button>
);
