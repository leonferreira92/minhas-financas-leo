import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, 
  Layers, Calendar, ChevronRight, ArrowRightLeft, Sparkles, Filter 
} from 'lucide-react';
import { getShowFinancialSummary } from '../services/showFinanceSyncService';
import { ProLaboreWithdrawModal } from './ProLaboreWithdrawModal';

export type DREPeriodPreset = 'current_month' | 'prev_month' | 'last_3_months' | 'custom';

interface Props {
  className?: string;
}

export const CareerDRECard: React.FC<Props> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { shows, transactions, accounts, categories, isBlurred, activeScope } = useFinance();

  const [periodPreset, setPeriodPreset] = useState<DREPeriodPreset>('current_month');
  const [isProLaboreModalOpen, setIsProLaboreModalOpen] = useState(false);

  // Custom date range state (when 'custom' is selected)
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    return d.toISOString().slice(0, 10);
  });

  // Calculate actual Date Range based on periodPreset
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth(); // 0-indexed

    if (periodPreset === 'current_month') {
      const start = new Date(currYear, currMonth, 1).toISOString().slice(0, 10);
      const end = new Date(currYear, currMonth + 1, 0).toISOString().slice(0, 10);
      const label = new Date(currYear, currMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return { periodStart: start, periodEnd: end, periodLabel: label.charAt(0).toUpperCase() + label.slice(1) };
    }

    if (periodPreset === 'prev_month') {
      const start = new Date(currYear, currMonth - 1, 1).toISOString().slice(0, 10);
      const end = new Date(currYear, currMonth, 0).toISOString().slice(0, 10);
      const label = new Date(currYear, currMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return { periodStart: start, periodEnd: end, periodLabel: label.charAt(0).toUpperCase() + label.slice(1) };
    }

    if (periodPreset === 'last_3_months') {
      const start = new Date(currYear, currMonth - 2, 1).toISOString().slice(0, 10);
      const end = new Date(currYear, currMonth + 1, 0).toISOString().slice(0, 10);
      const labelStart = new Date(currYear, currMonth - 2, 1).toLocaleDateString('pt-BR', { month: 'short' });
      const labelEnd = new Date(currYear, currMonth, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      return { periodStart: start, periodEnd: end, periodLabel: `${labelStart} - ${labelEnd}` };
    }

    // custom
    return {
      periodStart: customStart,
      periodEnd: customEnd,
      periodLabel: `Personalizado (${customStart.slice(5)} a ${customEnd.slice(5)})`
    };
  }, [periodPreset, customStart, customEnd]);

  // Compute DRE Metrics for the period
  const metrics = useMemo(() => {
    let grossRevenue = 0;
    let totalExpenses = 0;
    let showsCount = 0;

    // 1. Shows no período
    shows.forEach(show => {
      if (show.status === 'Cancelado') return;
      if (!show.date || show.date < periodStart || show.date > periodEnd) return;

      showsCount++;
      const fin = getShowFinancialSummary(show);
      grossRevenue += fin.totalPredicted;
      totalExpenses += fin.totalExpenses;
    });

    // 2. Transações de cachê isoladas no período (sem showId vinculado)
    const unlinkedCacheTxs = transactions.filter(t => 
      !t.showId &&
      t.date >= periodStart && t.date <= periodEnd &&
      t.type === 'income' &&
      (t.categoryId === 'cat_33' || t.description.toLowerCase().includes('cachê') || t.description.toLowerCase().includes('cache'))
    );
    unlinkedCacheTxs.forEach(t => {
      grossRevenue += Number(t.amount) || 0;
    });

    // 3. Custos operacionais extras da música no período (sem showId vinculado)
    const unlinkedShowExpenseTxs = transactions.filter(t =>
      !t.showId &&
      !t.showExpenseId &&
      t.date >= periodStart && t.date <= periodEnd &&
      t.type === 'expense' &&
      (t.scope === 'BUSINESS' || t.description.toLowerCase().includes('músico') || t.description.toLowerCase().includes('musico') || t.description.toLowerCase().includes('equipamento') || t.description.toLowerCase().includes('ensaio') || t.description.toLowerCase().includes('produção'))
    );
    unlinkedShowExpenseTxs.forEach(t => {
      totalExpenses += Number(t.amount) || 0;
    });

    // 4. Lucro Líquido
    const netProfit = grossRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // 5. Pró-Labore Retirado no período
    const proLaboreTxs = transactions.filter(t => {
      if (!t.date || t.date < periodStart || t.date > periodEnd) return false;
      if (t.status === 'pending') return false; // Apenas saídas realizadas

      const desc = (t.description || '').toLowerCase();
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = (cat?.name || '').toLowerCase();
      
      const isNamedProLabore = desc.includes('pró-labore') || desc.includes('pro-labore') || desc.includes('pro labore') || catName.includes('pró-labore') || catName.includes('pro-labore');

      // Saída da empresa (despesa) com tag de pró-labore
      if (t.type === 'expense' && isNamedProLabore) {
        return true;
      }

      // Transferência identificada como pró-labore
      if (t.type === 'transfer' && isNamedProLabore) {
        return true;
      }

      // Transferência de conta Business para conta Personal
      if (t.type === 'transfer' && t.accountId && t.destinationAccountId) {
        const sourceAcc = accounts.find(a => a.id === t.accountId);
        const destAcc = accounts.find(a => a.id === t.destinationAccountId);
        if (sourceAcc?.scope === 'BUSINESS' && destAcc?.scope === 'PERSONAL') {
          return true;
        }
      }

      return false;
    });

    const proLaboreTotal = proLaboreTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
      grossRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      proLaboreTotal,
      showsCount
    };
  }, [shows, transactions, accounts, categories, periodStart, periodEnd]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Navegação clicável para o extrato com o filtro aplicado
  const handleNavigateExtrato = (params: { type?: string; scope?: string; search?: string }) => {
    const query = new URLSearchParams();
    query.set('tab', 'movimentacoes');
    if (params.type) query.set('type', params.type);
    if (params.scope) query.set('scope', params.scope);
    if (params.search) query.set('search', params.search);
    if (periodPreset === 'current_month' || periodPreset === 'prev_month') {
      query.set('month', periodStart.slice(0, 7));
    }
    navigate(`/financeiro?${query.toString()}`);
  };

  return (
    <>
      <div className={`bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-[2.2rem] p-5 sm:p-6 shadow-xl border border-indigo-900/50 relative overflow-hidden ${className}`}>
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-52 h-52 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header do DRE & Botão de Retirar Pró-Labore */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
                  DRE Operacional da Carreira
                </span>
                <span className="text-[9px] bg-purple-900/80 text-purple-200 px-2 py-0.5 rounded-full font-bold">
                  {periodLabel}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-white">
                Faturamento & Custos da Música
              </h4>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {/* Botão de Ação Direta: Retirar Pró-Labore */}
            <button
              onClick={() => setIsProLaboreModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-purple-950/40 active:scale-95 transition flex items-center space-x-1.5"
              title="Transferir saldo de shows para a conta pessoal"
            >
              <ArrowRightLeft size={14} strokeWidth={2.5} />
              <span>Retirar Pró-Labore</span>
            </button>
          </div>
        </div>

        {/* 2. Seletor de Período Estilo Bancário */}
        <div className="relative z-10 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-2xl">
            <button
              onClick={() => setPeriodPreset('current_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                periodPreset === 'current_month' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês Atual (Padrão)
            </button>

            <button
              onClick={() => setPeriodPreset('prev_month')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                periodPreset === 'prev_month' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês Anterior
            </button>

            <button
              onClick={() => setPeriodPreset('last_3_months')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                periodPreset === 'last_3_months' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Últimos 3 Meses
            </button>

            <button
              onClick={() => setPeriodPreset('custom')}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                periodPreset === 'custom' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Personalizado
            </button>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Margem Líquida
            </span>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg inline-block ${metrics.profitMargin >= 50 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {metrics.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Inputs de Data quando Personalizado */}
        {periodPreset === 'custom' && (
          <div className="relative z-10 flex items-center gap-2 pt-1 pb-2">
            <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">De:</span>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none"
              />
            </div>
            <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Até:</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none"
              />
            </div>
          </div>
        )}

        {/* 3. Grid com 4 Indicadores DRE CLICÁVEIS */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          {/* Card 1: Faturamento Bruto de Cachês */}
          <div 
            onClick={() => handleNavigateExtrato({ type: 'income', scope: 'BUSINESS' })}
            className="group bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 hover:border-emerald-500/40 transition cursor-pointer active:scale-95"
            title="Clique para ver receitas da música no Extrato"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 group-hover:text-emerald-300 transition">
                Faturamento Bruto
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <ArrowUpRight size={13} strokeWidth={3} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight text-emerald-400 tabular-nums">
                {!isBlurred ? formatCurrency(metrics.grossRevenue) : 'R$ ••••••'}
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 group-hover:text-slate-300 transition flex items-center justify-between">
                <span>{metrics.showsCount} shows no período</span>
                <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition" />
              </p>
            </div>
          </div>

          {/* Card 2: Custos Operacionais */}
          <div 
            onClick={() => handleNavigateExtrato({ type: 'expense', scope: 'BUSINESS' })}
            className="group bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 hover:border-rose-500/40 transition cursor-pointer active:scale-95"
            title="Clique para ver custos da música no Extrato"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 group-hover:text-rose-300 transition">
                Custos Operacionais
              </span>
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
                <ArrowDownRight size={13} strokeWidth={3} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight text-rose-400 tabular-nums">
                {!isBlurred ? formatCurrency(metrics.totalExpenses) : 'R$ ••••••'}
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 group-hover:text-slate-300 transition flex items-center justify-between">
                <span>Logística & Músicos</span>
                <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition" />
              </p>
            </div>
          </div>

          {/* Card 3: Lucro Líquido do Módulo */}
          <div 
            onClick={() => handleNavigateExtrato({ scope: 'BUSINESS' })}
            className="group bg-indigo-950/70 border border-indigo-500/30 rounded-2xl p-3.5 flex flex-col justify-between hover:border-indigo-400/60 hover:bg-indigo-950/90 transition cursor-pointer active:scale-95"
            title="Clique para ver todas as movimentações de shows no Extrato"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300 group-hover:text-white transition">
                Lucro Líquido
              </span>
              <div className="w-6 h-6 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center group-hover:scale-110 transition">
                <TrendingUp size={13} strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <div className={`text-base sm:text-lg font-black tracking-tight tabular-nums ${metrics.netProfit >= 0 ? 'text-indigo-200' : 'text-rose-400'}`}>
                {!isBlurred ? formatCurrency(metrics.netProfit) : 'R$ ••••••'}
              </div>
              <p className="text-[9px] text-indigo-300/80 mt-0.5 flex items-center justify-between">
                <span>Resultado real</span>
                <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition" />
              </p>
            </div>
          </div>

          {/* Card 4: Pró-Labore Retirado */}
          <div 
            onClick={() => handleNavigateExtrato({ search: 'pró-labore' })}
            className="group bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 hover:border-purple-500/40 transition cursor-pointer active:scale-95"
            title="Clique para ver retiradas de pró-labore no Extrato"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 group-hover:text-purple-300 transition">
                Pró-Labore Retirado
              </span>
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center group-hover:scale-110 transition">
                <Wallet size={13} strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight text-purple-300 tabular-nums">
                {!isBlurred ? formatCurrency(metrics.proLaboreTotal) : 'R$ ••••••'}
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 group-hover:text-slate-300 transition flex items-center justify-between">
                <span>Shows → Pessoal</span>
                <ChevronRight size={11} className="opacity-0 group-hover:opacity-100 transition" />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Retirada de Pró-Labore */}
      <ProLaboreWithdrawModal
        isOpen={isProLaboreModalOpen}
        onClose={() => setIsProLaboreModalOpen(false)}
        defaultAmount={metrics.netProfit > 0 ? Math.round(metrics.netProfit * 0.7) : undefined}
      />
    </>
  );
};
