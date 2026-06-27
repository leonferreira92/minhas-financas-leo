import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { AlertTriangle, Calendar, CheckCircle2, ChevronLeft, Bell, Clock, Wallet, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SystemAlert } from '../types';

export const AlertsScreen = () => {
  const { getSystemAlerts, updateTransaction, transactions, accounts, getBalanceSummary } = useFinance();
  const navigate = useNavigate();
  
  const alerts = useMemo(() => getSystemAlerts(), [transactions]);

  // --- Summary Calculations ---
  const summaryData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().slice(0, 10);

    const dueIn7Days = alerts
      .filter(a => a.type !== 'risk')
      .reduce((sum, a) => sum + a.amount, 0);

    const totalAvailable = accounts.reduce((sum, acc) => {
      // Usamos uma lógica simplificada de saldo real aqui
      let bal = acc.initialBalance;
      transactions.forEach(t => {
        if (t.status === 'paid' && t.accountId === acc.id) {
          if (t.type === 'income') bal += t.amount;
          else if (t.type === 'expense' || t.type === 'transfer') bal -= t.amount;
        }
        if (t.type === 'transfer' && t.destinationAccountId === acc.id && t.status === 'paid') {
          bal += t.amount;
        }
      });
      return sum + bal;
    }, 0);

    return {
      dueIn7Days,
      totalAvailable,
      margin: totalAvailable - dueIn7Days
    };
  }, [alerts, accounts, transactions]);

  // --- Grouping Alerts ---
  const groupedAlerts = useMemo(() => {
    const groups = {
      critical: [] as SystemAlert[],
      today: [] as SystemAlert[],
      upcoming: [] as SystemAlert[]
    };

    alerts.forEach(a => {
      if (a.type === 'risk' || a.type === 'overdue') groups.critical.push(a);
      else if (a.type === 'today') groups.today.push(a);
      else groups.upcoming.push(a);
    });

    return groups;
  }, [alerts]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const handlePay = (alert: SystemAlert) => {
    if (!alert.transactionId) return;
    const t = transactions.find(tr => tr.id === alert.transactionId);
    if (t) {
      updateTransaction({ ...t, status: 'paid' });
    }
  };

  const renderAlertCard = (alert: SystemAlert) => {
    const isRisk = alert.type === 'risk';
    const transaction = transactions.find(t => t.id === alert.transactionId);
    const account = accounts.find(acc => acc.id === transaction?.accountId);

    let statusStyle = {
      bg: 'bg-white dark:bg-slate-900',
      border: 'border-slate-100 dark:border-slate-800',
      accent: 'text-slate-500',
      label: 'Agendado'
    };

    if (alert.type === 'risk' || alert.type === 'overdue') {
      statusStyle = { bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-900/50', accent: 'text-rose-600 dark:text-rose-400', label: alert.type === 'risk' ? 'RISCO' : 'ATRASADO' };
    } else if (alert.type === 'today') {
      statusStyle = { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/50', accent: 'text-amber-600 dark:text-amber-400', label: 'HOJE' };
    } else if (alert.type === 'tomorrow') {
      statusStyle = { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-900/50', accent: 'text-blue-600 dark:text-blue-400', label: 'AMANHÃ' };
    }

    return (
      <div key={alert.id} className={`${statusStyle.bg} border ${statusStyle.border} rounded-2xl p-4 shadow-sm transition-all hover:scale-[1.01]`}>
        <div className="flex justify-between items-start mb-3">
           <div className="flex items-center space-x-2">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${statusStyle.accent} bg-white dark:bg-black/20 border border-current opacity-80 uppercase`}>
                {statusStyle.label}
              </span>
              {!isRisk && (
                <span className="text-[10px] font-bold text-slate-400 flex items-center">
                   <Calendar size={10} className="mr-1" /> {formatDate(alert.date)}
                </span>
              )}
           </div>
           {account && (
             <div className="flex items-center text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                <Wallet size={10} className="mr-1" /> {account.name}
             </div>
           )}
        </div>
        
        <div className="flex justify-between items-center mb-3">
           <h3 className={`font-bold text-sm ${isRisk ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>{alert.title}</h3>
           <span className={`font-bold text-base ${statusStyle.accent}`}>{formatCurrency(alert.amount)}</span>
        </div>

        {!isRisk && (
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800/50">
             <div className="flex items-center">
                {alert.isCovered ? (
                  <div className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={12} className="mr-1" /> Saldo OK
                  </div>
                ) : (
                  <div className="flex items-center text-[10px] font-bold text-rose-500">
                    <AlertCircle size={12} className="mr-1" /> Insuficiente
                  </div>
                )}
             </div>
             <button 
               onClick={() => handlePay(alert)}
               className="bg-indigo-600 text-white text-[11px] font-bold py-1.5 px-4 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition flex items-center"
             >
               Baixar <ArrowRight size={12} className="ml-1" />
             </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-24 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* --- Sticky Header --- */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-2 pb-4 px-1">
        <div className="flex items-center space-x-2 mb-6">
          <Link to="/" className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400">
             <ChevronLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Alertas</h1>
        </div>

        {/* --- Weekly Summary Card --- */}
        <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
           <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Próximos 7 Dias</span>
                 <Bell size={16} className="opacity-60" />
              </div>
              <div className="flex items-end justify-between mb-4">
                 <div>
                    <p className="text-xs opacity-70 mb-1">Total a Pagar</p>
                    <h2 className="text-3xl font-black">{formatCurrency(summaryData.dueIn7Days)}</h2>
                 </div>
                 <div className="text-right">
                    <p className="text-xs opacity-70 mb-1">Margem</p>
                    <p className={`font-bold ${summaryData.margin >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                       {formatCurrency(summaryData.margin)}
                    </p>
                 </div>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-1000 ${summaryData.margin >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                   style={{ width: `${Math.min(100, Math.max(5, (summaryData.totalAvailable / (summaryData.dueIn7Days || 1)) * 100))}%` }}
                 ></div>
              </div>
           </div>
        </div>
      </div>

      <div className="px-1 space-y-8 mt-4">
        {alerts.length === 0 ? (
          <div className="text-center py-20 opacity-50">
             <div className="bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={32} />
             </div>
             <h3 className="font-bold text-slate-700 dark:text-white mb-1">Tudo em dia!</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum pagamento pendente para o período.</p>
          </div>
        ) : (
          <>
             {/* Critical Section */}
             {groupedAlerts.critical.length > 0 && (
               <section className="space-y-3">
                  <h2 className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-2 flex items-center">
                     <AlertTriangle size={12} className="mr-1.5" /> Atenção & Atrasados
                  </h2>
                  <div className="space-y-3">
                     {groupedAlerts.critical.map(renderAlertCard)}
                  </div>
               </section>
             )}

             {/* Today Section */}
             {groupedAlerts.today.length > 0 && (
               <section className="space-y-3">
                  <h2 className="text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest px-2 flex items-center">
                     <Clock size={12} className="mr-1.5" /> Vencendo Hoje
                  </h2>
                  <div className="space-y-3">
                     {groupedAlerts.today.map(renderAlertCard)}
                  </div>
               </section>
             )}

             {/* Upcoming Section */}
             {groupedAlerts.upcoming.length > 0 && (
               <section className="space-y-3">
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center">
                     <Calendar size={12} className="mr-1.5" /> Próximos Compromissos
                  </h2>
                  <div className="space-y-3">
                     {groupedAlerts.upcoming.map(renderAlertCard)}
                  </div>
               </section>
             )}
          </>
        )}
      </div>
    </div>
  );
};
