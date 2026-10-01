import React, { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  TrendingUp, Calendar, CheckCircle2, DollarSign, 
  ArrowUpRight, ShieldCheck, Sparkles, AlertCircle 
} from 'lucide-react';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';

interface Props {
  className?: string;
}

export const CareerLiquidityProjectionCard: React.FC<Props> = ({ className = '' }) => {
  const { shows, transactions, accounts, isBlurred } = useFinance();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute 30, 60, 90 day milestones
  const projection = useMemo(() => {
    const now = new Date();
    
    const date30 = new Date(now); date30.setDate(date30.getDate() + 30);
    const date60 = new Date(now); date60.setDate(date60.getDate() + 60);
    const date90 = new Date(now); date90.setDate(date90.getDate() + 90);

    const d30Str = date30.toISOString().slice(0, 10);
    const d60Str = date60.toISOString().slice(0, 10);
    const d90Str = date90.toISOString().slice(0, 10);

    // Current Cash Balance in Music Accounts
    const musicAccounts = accounts.filter(a => a.enabled !== false && (a.vinculo === 'MUSICO' || a.scope === 'BUSINESS'));
    const currentMusicCash = musicAccounts.reduce((sum, a) => {
      // getAccountBalance calculation
      return sum + (Number(a.initialBalance) || 0);
    }, 0);

    // Confirmed future shows in 30, 60, 90 days
    const activeShows = shows.filter(s => s.status !== 'Cancelado' && s.date >= todayStr);

    let inflows30 = 0, inflows60 = 0, inflows90 = 0;
    let showsCount30 = 0, showsCount60 = 0, showsCount90 = 0;

    activeShows.forEach(s => {
      const fin = getShowFinancialSummary(s, transactions);
      const pendingVal = fin.totalPending;

      if (s.date <= d30Str) {
        inflows30 += pendingVal;
        showsCount30++;
      } else if (s.date <= d60Str) {
        inflows60 += pendingVal;
        showsCount60++;
      } else if (s.date <= d90Str) {
        inflows90 += pendingVal;
        showsCount90++;
      }
    });

    return {
      currentMusicCash,
      inflows30,
      inflows60,
      inflows90,
      showsCount30,
      showsCount60,
      showsCount90,
      totalProjectedInflows: inflows30 + inflows60 + inflows90,
      totalFutureShows: showsCount30 + showsCount60 + showsCount90
    };
  }, [shows, transactions, accounts, todayStr]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className={`p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-800/30 space-y-4 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 block">
              Previsibilidade da Carreira
            </span>
            <h3 className="text-sm font-black text-white">
              Projeção de Liquidez (30 / 60 / 90 Dias)
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/10 text-indigo-200 border border-indigo-400/20 flex items-center space-x-1">
          <Sparkles size={11} className="text-amber-400" />
          <span>{projection.totalFutureShows} {projection.totalFutureShows === 1 ? 'show futuro' : 'shows futuros'}</span>
        </span>
      </div>

      {/* Grid 30/60/90 Dias */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        
        {/* 30 Dias */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>Próximos 30 Dias</span>
            <span className="text-purple-300">{projection.showsCount30} shows</span>
          </div>
          <div className="text-base font-black tabular-nums text-emerald-400 truncate">
            {!isBlurred ? formatCurrency(projection.inflows30) : '••••'}
          </div>
          <span className="text-[9px] text-slate-400 block truncate">Entradas garantidas contratadas</span>
        </div>

        {/* 60 Dias */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>31 a 60 Dias</span>
            <span className="text-purple-300">{projection.showsCount60} shows</span>
          </div>
          <div className="text-base font-black tabular-nums text-emerald-400 truncate">
            {!isBlurred ? formatCurrency(projection.inflows60) : '••••'}
          </div>
          <span className="text-[9px] text-slate-400 block truncate">Receita futura agendada</span>
        </div>

        {/* 90 Dias */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
            <span>61 a 90 Dias</span>
            <span className="text-purple-300">{projection.showsCount90} shows</span>
          </div>
          <div className="text-base font-black tabular-nums text-emerald-400 truncate">
            {!isBlurred ? formatCurrency(projection.inflows90) : '••••'}
          </div>
          <span className="text-[9px] text-slate-400 block truncate">Projeção a médio prazo</span>
        </div>

      </div>

      {/* Resumo Consolidado Projetado */}
      <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200">
            Total Garantido Contratado a Receber nos Próximos 90 Dias:
          </span>
        </div>
        <span className="text-sm font-black tabular-nums text-emerald-400 shrink-0 ml-2">
          {!isBlurred ? formatCurrency(projection.totalProjectedInflows) : '••••'}
        </span>
      </div>

    </div>
  );
};
