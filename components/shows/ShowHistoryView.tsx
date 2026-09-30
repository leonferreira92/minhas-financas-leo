import React, { useState, useMemo } from 'react';
import { Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  Calendar, MapPin, DollarSign, Search, Filter, 
  ChevronRight, Archive, CheckCircle2, XCircle, Check
} from 'lucide-react';
import { getStatusConfig } from './types';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';

interface Props {
  shows: Show[];
  onSelectShow: (show: Show) => void;
}

export const ShowHistoryView: React.FC<Props> = ({
  shows,
  onSelectShow
}) => {
  const { transactions } = useFinance();
  const [filterType, setFilterType] = useState<'all' | 'realizado' | 'cancelado'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter shows that are finished, cancelled, or passed
  const historyShows = useMemo(() => {
    return shows
      .filter(s => {
        const isHistoricalStatus = s.status === 'Realizado' || s.status === 'Cancelado';
        const isPastDate = s.date < todayStr;
        return isHistoricalStatus || isPastDate;
      })
      .filter(s => {
        if (filterType === 'realizado') return s.status === 'Realizado';
        if (filterType === 'cancelado') return s.status === 'Cancelado';
        return true;
      })
      .filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const contractor = (s.contractorName || s.name || '').toLowerCase();
        const city = (s.city || '').toLowerCase();
        const loc = (s.location || '').toLowerCase();
        return contractor.includes(q) || city.includes(q) || loc.includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
  }, [shows, filterType, searchQuery, todayStr]);

  const formatCurrency = (val?: number | string | null) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0).replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
  };

  const formatDateLabel = (dStr?: string | null) => {
    if (!dStr) return '';
    try {
      const parts = String(dStr).split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
      const dt = new Date(String(dStr));
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {}
    return String(dStr || '');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
            Arquivo de Apresentações
          </span>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {historyShows.length} {historyShows.length === 1 ? 'Show no Histórico' : 'Shows no Histórico'}
          </h3>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por contratante, cidade ou local..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full p-3 pl-10 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 shadow-xs"
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
        </div>

        <div className="flex space-x-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${
              filterType === 'all'
                ? 'bg-slate-800 dark:bg-slate-700 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('realizado')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${
              filterType === 'realizado'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            Realizados
          </button>
          <button
            onClick={() => setFilterType('cancelado')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${
              filterType === 'cancelado'
                ? 'bg-rose-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            Cancelados
          </button>
        </div>
      </div>

      {historyShows.length === 0 ? (
        <div className="p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2 shadow-xs">
          <Archive size={24} className="mx-auto text-slate-400" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Nenhum show histórico encontrado</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {historyShows.map(show => {
            const statusCfg = getStatusConfig(show.status);
            const fin = getShowFinancialSummary(show, transactions);
            const pct = fin.totalPredicted > 0 ? Math.min(100, Math.round((fin.totalReceived / fin.totalPredicted) * 100)) : 0;
            const is100 = fin.totalPending === 0 && fin.totalPredicted > 0;

            return (
              <div
                key={show.id}
                onClick={() => onSelectShow(show)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition cursor-pointer space-y-2.5 shadow-xs active:scale-[0.99] group"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase border ${statusCfg.badgeClass}`}>
                        {show.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatDateLabel(show.date)}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate mt-1">
                      {show.contractorName || show.name}
                    </h4>

                    <p className="text-[10px] text-slate-400 truncate">
                      {show.city || show.location || 'Local a definir'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-black tabular-nums text-slate-900 dark:text-white block">
                      {formatCurrency(fin.totalPredicted)}
                    </span>
                    {is100 ? (
                      <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center justify-end space-x-0.5">
                        <Check size={10} strokeWidth={3} />
                        <span>100% Quitado</span>
                      </span>
                    ) : fin.totalPending > 0 ? (
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 block">
                        Falta: {formatCurrency(fin.totalPending)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Progress bar */}
                {show.status !== 'Cancelado' && (
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        is100 ? 'bg-emerald-500' : pct > 0 ? 'bg-purple-600' : 'bg-slate-300'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
