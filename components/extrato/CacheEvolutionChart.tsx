import React, { useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';
import { Music, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const CacheEvolutionChart: React.FC = () => {
  const { shows, isBlurred, activeScope } = useFinance();

  const monthlyEvolution = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; avgCache: number; totalCosts: number; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      // Shows do mês
      const monthShows = shows.filter(s => s.status !== 'Cancelado' && (s.date || '').startsWith(key));
      
      let totalCacheMonth = 0;
      let totalCostsMonth = 0;

      monthShows.forEach(s => {
        const fin = getShowFinancialSummary(s);
        totalCacheMonth += fin.totalPredicted;
        totalCostsMonth += fin.totalExpenses;
      });

      const avgCache = monthShows.length > 0 ? totalCacheMonth / monthShows.length : 0;

      months.push({
        key,
        label,
        avgCache,
        totalCosts: totalCostsMonth,
        count: monthShows.length
      });
    }

    const maxVal = Math.max(...months.map(m => Math.max(m.avgCache, m.totalCosts)), 1);

    return { months, maxVal };
  }, [shows]);

  if (activeScope === 'PERSONAL') return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-[2rem] p-5 sm:p-6 shadow-xl border border-indigo-900/50 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <Music size={18} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
              Análise de Carreira Musical
            </span>
            <h3 className="text-base font-black text-white tracking-tight">
              Evolução do Cachê Médio x Custos de Produção (Últimos 6 Meses)
            </h3>
          </div>
        </div>
      </div>

      {/* Gráfico de barras / linhas comparativo em Tailwind */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
        {monthlyEvolution.months.map((m) => {
          const cacheHeight = Math.min(100, Math.max(12, Math.round((m.avgCache / monthlyEvolution.maxVal) * 100)));
          const costHeight = Math.min(100, Math.max(12, Math.round((m.totalCosts / monthlyEvolution.maxVal) * 100)));

          return (
            <div key={m.key} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">{m.label}</span>
                <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded-md font-bold text-slate-300">
                  {m.count} shows
                </span>
              </div>

              {/* Barras comparativas */}
              <div className="flex items-end justify-center space-x-2 h-28 pt-2 pb-1 border-b border-white/10">
                {/* Barra Cachê Médio */}
                <div className="flex flex-col items-center h-full justify-end group relative">
                  <div 
                    className="w-5 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500 hover:opacity-90"
                    style={{ height: `${cacheHeight}%` }}
                    title={`Cachê Médio: ${formatCurrency(m.avgCache)}`}
                  />
                  <span className="text-[8px] font-bold text-emerald-400 mt-1">Cachê</span>
                </div>

                {/* Barra Custos */}
                <div className="flex flex-col items-center h-full justify-end group relative">
                  <div 
                    className="w-5 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-lg transition-all duration-500 hover:opacity-90"
                    style={{ height: `${costHeight}%` }}
                    title={`Custos: ${formatCurrency(m.totalCosts)}`}
                  />
                  <span className="text-[8px] font-bold text-rose-400 mt-1">Custos</span>
                </div>
              </div>

              <div className="space-y-1 text-center">
                <div className="text-[10px] font-black text-emerald-300 tabular-nums">
                  {!isBlurred ? formatCurrency(m.avgCache) : '••••'}
                </div>
                <div className="text-[10px] font-black text-rose-300 tabular-nums">
                  {!isBlurred ? formatCurrency(m.totalCosts) : '••••'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
