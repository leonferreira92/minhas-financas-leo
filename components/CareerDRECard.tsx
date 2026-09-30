import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TrendingUp, DollarSign, Wrench, Wallet, ArrowRight, Music, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { getShowFinancialSummary } from '../services/showFinanceSyncService';

interface Props {
  className?: string;
}

export const CareerDRECard: React.FC<Props> = ({ className = '' }) => {
  const { shows, transactions, accounts, isBlurred, activeScope } = useFinance();

  const metrics = useMemo(() => {
    // 1. Faturamento Bruto de Cachês (Soma dos cachês + extras recebidos ou previstos de todos os shows)
    let grossRevenue = 0;
    let totalExpenses = 0;

    shows.forEach(show => {
      if (show.status === 'Cancelado') return;
      const fin = getShowFinancialSummary(show);
      // Faturamento realizado + agendado
      grossRevenue += fin.totalPredicted;
      totalExpenses += fin.totalExpenses;
    });

    // Adiciona também transações isoladas de categoria Cachê que não tenham showId vinculado
    const unlinkedCacheTxs = transactions.filter(t => 
      !t.showId && 
      (t.categoryId === 'cat_33' || t.description.toLowerCase().includes('cachê') || t.description.toLowerCase().includes('cache')) &&
      t.type === 'income'
    );
    unlinkedCacheTxs.forEach(t => {
      grossRevenue += Number(t.amount) || 0;
    });

    // 2. Custos Operacionais extras fora dos shows
    const unlinkedShowExpenseTxs = transactions.filter(t =>
      !t.showId &&
      !t.showExpenseId &&
      t.type === 'expense' &&
      (t.scope === 'BUSINESS' || t.description.toLowerCase().includes('músico') || t.description.toLowerCase().includes('musico') || t.description.toLowerCase().includes('equipamento') || t.description.toLowerCase().includes('ensaio'))
    );
    unlinkedShowExpenseTxs.forEach(t => {
      totalExpenses += Number(t.amount) || 0;
    });

    // 3. Lucro Líquido
    const netProfit = grossRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // 4. Pró-Labore Retirado (Transferências da conta de Shows para conta Pessoal ou com descrição de pró-labore/retirada)
    const proLaboreTxs = transactions.filter(t => {
      if (t.type !== 'transfer' && t.type !== 'expense') return false;
      const desc = t.description.toLowerCase();
      const isNamedProLabore = desc.includes('pró-labore') || desc.includes('pro-labore') || desc.includes('pro labore') || desc.includes('retirada');
      
      if (isNamedProLabore) return true;

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
      showsCount: shows.filter(s => s.status !== 'Cancelado').length
    };
  }, [shows, transactions, accounts]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-[2rem] p-5 sm:p-6 shadow-xl border border-indigo-900/50 relative overflow-hidden ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header do DRE */}
      <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <Layers size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
                DRE Operacional da Carreira
              </span>
              <span className="text-[9px] bg-purple-900/80 text-purple-200 px-2 py-0.5 rounded-full font-bold">
                {activeScope === 'BUSINESS' ? 'Foco Shows' : 'Consolidado'}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-white">
              Resumo Financeiro da Carreira Musical
            </h4>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Margem Líquida
          </span>
          <span className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block ${metrics.profitMargin >= 50 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            {metrics.profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Grid com 4 Indicadores DRE */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        {/* 1. Faturamento Bruto de Cachês */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
              Faturamento Bruto
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight size={13} strokeWidth={3} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black tracking-tight text-emerald-400 tabular-nums">
              {!isBlurred ? formatCurrency(metrics.grossRevenue) : 'R$ ••••••'}
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Cachês & Extras ({metrics.showsCount} shows)
            </p>
          </div>
        </div>

        {/* 2. Custos Operacionais */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
              Custos Operacionais
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowDownRight size={13} strokeWidth={3} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black tracking-tight text-rose-400 tabular-nums">
              {!isBlurred ? formatCurrency(metrics.totalExpenses) : 'R$ ••••••'}
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Logística / Músicos / Produção
            </p>
          </div>
        </div>

        {/* 3. Lucro Líquido do Módulo */}
        <div className="bg-indigo-950/70 border border-indigo-500/30 rounded-2xl p-3.5 flex flex-col justify-between hover:border-indigo-400/50 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300">
              Lucro Líquido
            </span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center">
              <TrendingUp size={13} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className={`text-base sm:text-lg font-black tracking-tight tabular-nums ${metrics.netProfit >= 0 ? 'text-indigo-200' : 'text-rose-400'}`}>
              {!isBlurred ? formatCurrency(metrics.netProfit) : 'R$ ••••••'}
            </div>
            <p className="text-[9px] text-indigo-300/80 mt-0.5">
              Resultado operacional real
            </p>
          </div>
        </div>

        {/* 4. Pró-Labore Retirado */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
              Pró-Labore Retirado
            </span>
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
              <Wallet size={13} strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-black tracking-tight text-purple-300 tabular-nums">
              {!isBlurred ? formatCurrency(metrics.proLaboreTotal) : 'R$ ••••••'}
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Shows → Caixa Pessoal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
