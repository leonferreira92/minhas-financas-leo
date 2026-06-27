
import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { getIcon } from '../constants';
import { 
  Eye, EyeOff, TrendingUp, TrendingDown, Bell, 
  Settings as SettingsIcon, CreditCard, Sparkles, 
  PieChart, Clock, Target, CalendarDays, PlusCircle, 
  ArrowUpCircle, ChevronRight, Receipt, BarChart3,
  AlertCircle, Wallet, X, CalendarRange, Check, Zap,
  ArrowRightLeft
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TransactionForm } from './TransactionForm';
import { TransactionType } from '../types';
import { CalendarModal } from './CalendarModal';
import { DashboardSkeleton } from './Skeleton';

const HubButton = ({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };
  
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-all group"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 transition-all group-hover:scale-110 ${colorMap[color] || colorMap.blue}`}>
        <Icon size={24} strokeWidth={2} />
      </div>
      <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center">{label}</span>
    </button>
  );
};

export const Dashboard = () => {
  const { 
    getBalanceSummary, transactions, categories, getSystemAlerts, 
    accounts, settings, getAccountBalance, isBlurred, toggleBlur,
    updateTransaction
  } = useFinance();
  
  const navigate = useNavigate();
  const [balanceMode, setBalanceMode] = useState<'real' | 'projected'>('real');
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // State for Transaction Modal Actions
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  
  const [projectionDate, setProjectionDate] = useState(() => {
    const now = new Date();
    // Default to last day of current month
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  });

  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    // Simulate loading for skeleton demo
    const timer = setTimeout(() => setIsLoaded(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const alerts = useMemo(() => getSystemAlerts(), [transactions]);
  const summary = useMemo(() => getBalanceSummary(currentMonth, projectionDate), [transactions, currentMonth, projectionDate, accounts]);

  const freeToSpend = summary.freeToSpend;
  const freeToSpendPercent = Math.max(0, Math.min(100, (freeToSpend / (summary.realBalance + summary.pendingIncome)) * 100));

  const recentTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return [...transactions]
      .filter(t => t.date <= todayStr) // Filtra para evitar que lançamentos futuros inundem a dashboard de atividades recentes
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .slice(0, 5); // Aumentado para 5 para uma visualização mais completa
  }, [transactions]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const applyPreset = (type: 'endMonth' | 'plus30') => {
    const now = new Date();
    if (type === 'endMonth') {
      setProjectionDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
    } else {
      const future = new Date();
      future.setDate(now.getDate() + 30);
      setProjectionDate(future.toISOString().slice(0, 10));
    }
    setIsDateModalOpen(false);
  };

  const openTransactionModal = (type: TransactionType) => {
    setTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  const openCalendar = () => {
    setIsCalendarOpen(true);
  };

  const handleDateSelect = (d: string) => {
    setProjectionDate(d);
    setIsDateModalOpen(false);
  };

  if (!isLoaded) return <DashboardSkeleton />;

  return (
    <div className={`space-y-8 pb-32 transition-opacity duration-700 opacity-100 text-slate-900 dark:text-slate-100`}>
      
      {/* Header Contextual */}
      <div className="flex justify-between items-center px-1 pt-4">
        <div className="flex items-center space-x-3">
           <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:rotate-6 active:scale-95">
             {settings.userName?.charAt(0).toUpperCase() || 'F'}
           </div>
           <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">{getGreeting()},</span>
             <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tight">{settings.userName || 'Investidor'}</h1>
           </div>
        </div>
        <div className="flex items-center space-x-2">
           <Link to="/alerts" className="relative p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 border border-slate-100 dark:border-slate-800 transition-all active:scale-95 shadow-sm">
             <Bell size={22} />
             {alerts.length > 0 && <span className="absolute top-2.5 right-2.5 w-3 h-3 bg-rose-500 rounded-full border-[3px] border-white dark:border-slate-950 animate-pulse"></span>}
          </Link>
          <Link to="/settings" className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 border border-slate-100 dark:border-slate-800 transition-all active:scale-95 shadow-sm">
             <SettingsIcon size={22} />
          </Link>
        </div>
      </div>

      {/* Hero Card */}
      <div className="relative bg-slate-900 dark:bg-black rounded-[2.8rem] p-8 text-white shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600 rounded-full blur-[100px] opacity-40 transition-opacity group-hover:opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-emerald-500 rounded-full blur-[80px] opacity-10"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 border border-white/10 shadow-inner">
               <button 
                onClick={() => setBalanceMode('real')} 
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${balanceMode === 'real' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 Saldo Real
               </button>
               <button 
                onClick={() => setBalanceMode('projected')} 
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${balanceMode === 'projected' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 Previsto
               </button>
            </div>
            <button onClick={toggleBlur} className="text-slate-400 hover:text-white transition-all p-2 bg-white/5 rounded-2xl border border-white/5 active:scale-95">
              {!isBlurred ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
          
          <div className="mb-6">
             <div className="flex items-center justify-between mb-2 ml-1">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] opacity-70">
                  {balanceMode === 'real' ? 'Patrimônio Consolidado' : 'Horizonte de Caixa'}
                </p>
                {balanceMode === 'projected' && (
                  <button 
                    onClick={() => setIsDateModalOpen(true)}
                    className="flex items-center space-x-1.5 bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase text-indigo-100 hover:bg-indigo-500/30 transition-all active:scale-95"
                  >
                    <CalendarRange size={12} className="text-indigo-400" />
                    <span>{new Date(projectionDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                    <ChevronRight size={10} className="text-indigo-500" />
                  </button>
                )}
             </div>

             <h2 className="text-5xl font-black tracking-tighter tabular-nums leading-none flex items-baseline">
              {!isBlurred ? (
                <>
                  <span className="text-2xl font-bold text-slate-500 mr-2">R$</span>
                  <span className="truncate">
                    {(balanceMode === 'real' ? summary.realBalance : summary.projectedBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </>
              ) : (
                <span className="text-4xl tracking-widest">••••••••</span>
              )}
             </h2>

             {/* Carrossel de Contas */}
             <div className="mt-8 -mx-1 overflow-x-auto no-scrollbar flex items-center space-x-3 px-1">
                {accounts.length === 0 ? (
                  <div className="py-2 px-4 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black uppercase text-slate-500">Nenhuma conta ativa</div>
                ) : (
                  accounts.map(acc => (
                    <div key={acc.id} className="flex flex-col shrink-0 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 min-w-[120px] transition-transform active:scale-95">
                      <div className="flex items-center space-x-2 mb-1">
                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: acc.color }}></div>
                         <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest truncate max-w-[80px]">{acc.name}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums">
                        {!isBlurred ? formatCurrency(getAccountBalance(acc.id)) : '••••'}
                      </span>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Radar de Disponibilidade Widget */}
      {settings.dashboardLayout.find(w => w.id === 'radar')?.visible && (
        <div className="px-1">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group active:scale-[0.98] transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                 <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center">
                       <Zap size={12} className="mr-1.5 text-indigo-500" /> Radar de Disponibilidade
                    </h3>
                    <p className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                       {isBlurred ? '••••' : formatCurrency(freeToSpend)}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dinheiro Livre (Free to Spend)</span>
                 </div>
                 <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
                    <PieChart size={24} />
                 </div>
              </div>

              <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                 <div 
                   className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${freeToSpend <= 0 ? 'bg-rose-500' : freeToSpendPercent < 20 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                   style={{ width: `${freeToSpendPercent}%` }}
                 ></div>
              </div>
              
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                 <span>Comprometido</span>
                 <span className={freeToSpend <= 0 ? 'text-rose-500' : 'text-indigo-500'}>
                    {freeToSpend <= 0 ? 'Limite Atingido' : `${Math.round(100 - freeToSpendPercent)}% Reservado`}
                 </span>
              </div>
           </div>
        </div>
      )}

      {/* Hub de Navegação Rápida */}
      <div className="px-1 space-y-4">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center">
            <Sparkles size={12} className="mr-2 text-indigo-500" /> Centro de Comando
         </h3>
         <div className="grid grid-cols-3 gap-3">
            <HubButton icon={Receipt} label="Extrato" color="indigo" onClick={() => navigate('/transactions')} />
            <HubButton icon={CalendarDays} label="Agenda" color="blue" onClick={() => navigate('/calendar')} />
            <HubButton icon={CreditCard} label="Dívidas" color="rose" onClick={() => navigate('/debts')} />
            <HubButton icon={BarChart3} label="Análise" color="purple" onClick={() => navigate('/insights')} />
            <HubButton icon={PieChart} label="Resumo" color="emerald" onClick={() => navigate('/summary')} />
            <HubButton icon={AlertCircle} label="Alertas" color="amber" onClick={() => navigate('/alerts')} />
         </div>
      </div>

      {/* Ações de Lançamento Direto (Funcionais) */}
      <div className="flex space-x-3 px-1">
         <button 
           onClick={() => openTransactionModal('expense')}
           className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center space-x-2 active:scale-95 transition-all"
         >
            <PlusCircle size={18} />
            <span>Lançar</span>
         </button>
         <button 
           onClick={() => openTransactionModal('transfer')}
           className="flex-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-white py-4 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm"
         >
            <ArrowUpCircle size={18} className="text-indigo-500" />
            <span>Transferir</span>
         </button>
      </div>

      {/* Últimas Atividades */}
      <div className="px-1 space-y-4">
         <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Últimas Atividades</h3>
            <Link to="/transactions" className="text-[10px] font-black text-indigo-500 uppercase flex items-center hover:text-indigo-600 transition-colors">
               Ver Tudo <ChevronRight size={14} className="ml-0.5" />
            </Link>
         </div>
         <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            {recentTransactions.length === 0 ? (
               <div className="text-center py-12 opacity-30">
                  <Clock size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-xs font-black uppercase text-slate-400">Sem registros recentes</p>
               </div>
            ) : (
               <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentTransactions.map(t => {
                     const cat = categories.find(c => c.id === t.categoryId);
                     const Icon = t.type === 'transfer' ? ArrowRightLeft : (cat ? getIcon(cat.icon) : Clock);
                     const isPending = t.status === 'pending';
                     const todayStr = new Date().toISOString().slice(0, 10);
                     const isOverdue = isPending && t.date < todayStr;
                     const isToday = isPending && t.date === todayStr;

                     const fromAcc = accounts.find(a => a.id === t.accountId);
                     const toAcc = accounts.find(a => a.id === t.destinationAccountId);

                     const descriptionText = t.type === 'transfer'
                       ? (fromAcc && toAcc ? `${fromAcc.name} ➔ ${toAcc.name}` : 'Transferência entre Contas')
                       : t.description;

                     const categoryName = t.type === 'transfer' ? 'Transferência' : (cat?.name || 'Geral');

                     return (
                        <div 
                          key={t.id} 
                          onClick={() => navigate('/transactions')} 
                          className="flex items-center justify-between p-4.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group"
                        >
                           <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 group-hover:scale-105 transition-all shrink-0"
                                style={{ 
                                  backgroundColor: t.type === 'transfer' ? 'rgba(99, 102, 241, 0.1)' : (cat ? `${cat.color}15` : 'rgba(148, 163, 184, 0.1)'),
                                  color: t.type === 'transfer' ? '#6366f1' : (cat?.color || '#64748b')
                                }}
                              >
                                 <Icon size={18} strokeWidth={2.5} />
                              </div>
                              <div className="min-w-0 flex-1 pr-2">
                                 <div className="flex items-center space-x-2">
                                    <p className="text-sm font-black text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                       {descriptionText}
                                    </p>
                                    {isOverdue && (
                                       <span className="shrink-0 px-1.5 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-wider rounded-md animate-pulse">
                                          Atrasado
                                       </span>
                                    )}
                                    {isToday && (
                                       <span className="shrink-0 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-wider rounded-md">
                                          Hoje
                                       </span>
                                    )}
                                    {isPending && !isOverdue && !isToday && (
                                       <span className="shrink-0 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[8px] font-black uppercase tracking-wider rounded-md">
                                          Pendente
                                       </span>
                                    )}
                                 </div>
                                 <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{categoryName}</span>
                                    {fromAcc && t.type !== 'transfer' && (
                                       <>
                                          <span className="text-[9px] text-slate-300 dark:text-slate-700">•</span>
                                          <span className="text-[9px] font-semibold uppercase tracking-wider truncate max-w-[80px]" style={{ color: fromAcc.color }}>
                                             {fromAcc.name}
                                          </span>
                                       </>
                                    )}
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center space-x-3.5 shrink-0 ml-2">
                              <div className="text-right">
                                 <p className={`text-sm font-black tabular-nums ${
                                    t.type === 'expense' 
                                      ? 'text-rose-500 dark:text-rose-400' 
                                      : t.type === 'income' 
                                        ? 'text-emerald-500' 
                                        : 'text-slate-500 dark:text-slate-400'
                                 }`}>
                                    {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : '⇄'} {formatCurrency(t.amount)}
                                 </p>
                                 <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase mt-0.5">
                                    {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                 </p>
                              </div>

                              {isPending && (
                                 <button
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      updateTransaction({ ...t, status: 'paid' });
                                   }}
                                   title="Baixar Lançamento"
                                   className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white flex items-center justify-center transition-all active:scale-90 border border-emerald-100/50 dark:border-emerald-900/30"
                                 >
                                    <Check size={14} strokeWidth={3} />
                                 </button>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>
      </div>

      {/* Modal de Horizonte de Caixa */}
      {isDateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-slide-up border-t border-white/10">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase tracking-widest">Horizonte</h2>
                 <button onClick={() => setIsDateModalOpen(false)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => applyPreset('endMonth')} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-transparent hover:border-indigo-500 transition-all text-left">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mês Atual</span>
                       <span className="text-sm font-bold dark:text-white">Até o Fim</span>
                    </button>
                    <button onClick={() => applyPreset('plus30')} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-transparent hover:border-indigo-500 transition-all text-left">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Próximos</span>
                       <span className="text-sm font-bold dark:text-white">30 Dias</span>
                    </button>
                 </div>

                 <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block px-1">Data Personalizada</label>
                    <button 
                      onClick={openCalendar}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between text-slate-800 dark:text-white font-black hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <span>{new Date(projectionDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <CalendarRange size={20} className="text-indigo-500" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Calendar Modal Component */}
      <CalendarModal 
         isOpen={isCalendarOpen} 
         onClose={() => setIsCalendarOpen(false)} 
         selectedDate={projectionDate} 
         onSelect={handleDateSelect} 
         title="Horizonte de Caixa"
      />

      {/* Modal de Transação Rápida */}
      {isTransactionModalOpen && (
        <TransactionForm 
          onClose={() => setIsTransactionModalOpen(false)}
          initialType={transactionType}
        />
      )}
    </div>
  );
};
