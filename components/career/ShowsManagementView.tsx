import React, { useState, useMemo } from 'react';
import { Show, ShowStatus } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  Calendar, MapPin, DollarSign, Clock, Users, Fuel, 
  ArrowRight, Plus, Search, Filter, CheckCircle2, 
  AlertTriangle, TrendingUp, Sparkles, FileText, ChevronRight
} from 'lucide-react';
import { getStatusConfig } from '../shows/types';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';

interface Props {
  shows: Show[];
  onSelectShow: (show: Show) => void;
  onOpenCreateShow: (status?: ShowStatus) => void;
}

export const ShowsManagementView: React.FC<Props> = ({
  shows,
  onSelectShow,
  onOpenCreateShow
}) => {
  const { transactions, isBlurred } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'cache_desc' | 'profit_desc'>('date_desc');

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredShows = useMemo(() => {
    return shows
      .filter(s => {
        const matchSearch = searchTerm === '' ||
          (s.contractorName && s.contractorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.location && s.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.city && s.city.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchStatus = statusFilter === 'all' || s.status === statusFilter;

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return (b.date || '').localeCompare(a.date || '');
        if (sortBy === 'date_asc') return (a.date || '').localeCompare(b.date || '');
        if (sortBy === 'cache_desc') return (b.totalCache || 0) - (a.totalCache || 0);
        if (sortBy === 'profit_desc') {
          const profA = getShowFinancialSummary(a, transactions).netProfit;
          const profB = getShowFinancialSummary(b, transactions).netProfit;
          return profB - profA;
        }
        return 0;
      });
  }, [shows, transactions, searchTerm, statusFilter, sortBy]);

  return (
    <div className="space-y-5">
      
      {/* HEADER & AÇÕES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121214] p-4 rounded-3xl border border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
            <TrendingUp size={20} className="text-purple-400" />
            <span>Gestão Detalhada de Shows & Lucratividade</span>
          </h2>
          <p className="text-[11px] text-zinc-400">
            Ficha de cada apresentação com cachê bruto, custos de equipe/logística e margem líquida.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => onOpenCreateShow('Orçamento')}
            className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-500/30 transition active:scale-95 flex items-center space-x-1"
          >
            <FileText size={14} />
            <span>Orçamento</span>
          </button>

          <button
            onClick={() => onOpenCreateShow('Confirmado')}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-purple-500/20"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Novo Show</span>
          </button>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por contratante, cidade ou local do show..."
            className="w-full bg-[#121214] border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#121214] border border-zinc-800 rounded-2xl px-3 py-2.5 text-xs text-zinc-300 font-bold focus:outline-none focus:border-purple-500"
          >
            <option value="all">Todos os Status</option>
            <option value="Confirmado">Confirmados</option>
            <option value="Realizado">Realizados</option>
            <option value="Orçamento">Orçamentos</option>
            <option value="Cancelado">Cancelados</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#121214] border border-zinc-800 rounded-2xl px-3 py-2.5 text-xs text-zinc-300 font-bold focus:outline-none focus:border-purple-500"
          >
            <option value="date_desc">Mais Recentes</option>
            <option value="date_asc">Mais Antigos</option>
            <option value="profit_desc">Maior Lucro</option>
            <option value="cache_desc">Maior Cachê</option>
          </select>
        </div>
      </div>

      {/* LISTAGEM DE CARDS */}
      {filteredShows.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121214] border border-dashed border-zinc-800 text-center space-y-3">
          <Calendar size={32} className="mx-auto text-zinc-600" />
          <p className="text-sm font-bold text-white">Nenhum show encontrado</p>
          <p className="text-xs text-zinc-400">Tente ajustar seus filtros ou adicione uma nova apresentação.</p>
          <button
            onClick={() => onOpenCreateShow('Confirmado')}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs inline-flex items-center space-x-1"
          >
            <Plus size={14} />
            <span>Cadastrar Show</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShows.map(show => {
            const statusCfg = getStatusConfig(show.status);
            const fin = getShowFinancialSummary(show, transactions);
            const isCompleted = show.status === 'Realizado';
            const totalCosts = fin.totalExpenses;
            const marginPct = fin.totalPredicted > 0 ? (fin.netProfit / fin.totalPredicted) * 100 : 0;

            return (
              <div
                key={show.id}
                onClick={() => onSelectShow(show)}
                className="p-4 sm:p-5 rounded-3xl bg-[#141416] border border-zinc-800 hover:border-purple-500/40 transition cursor-pointer flex flex-col justify-between space-y-3 group shadow-xs active:scale-[0.99]"
              >
                <div className="space-y-2.5">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 flex items-center space-x-1">
                          <Calendar size={12} />
                          <span>{show.date}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusCfg.badgeClass}`}>
                          {show.status}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white mt-1.5 group-hover:text-purple-400 transition-colors">
                        {show.contractorName || show.name}
                      </h3>
                    </div>

                    <span className="text-xs font-black text-zinc-400 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-800">
                      {show.time || '20:00'}
                    </span>
                  </div>

                  {/* Local e Cidade */}
                  <div className="flex items-center space-x-1.5 text-xs text-zinc-300">
                    <MapPin size={13} className="text-purple-400 shrink-0" />
                    <span className="truncate">{show.city || show.location || 'Local a definir'}</span>
                  </div>

                  {/* PAINEL DE METRICAS FINANCEIRAS DO SHOW (REQUISITO 2) */}
                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                    
                    {/* Linha 1: Cachê Bruto */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-bold">Cachê Bruto:</span>
                      <span className="font-black text-white tabular-nums">
                        {formatCurrency(fin.totalPredicted)}
                      </span>
                    </div>

                    {/* Linha 2: Custos de Equipe & Logística */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-bold">Custos da Música:</span>
                      <span className="font-bold text-rose-400 tabular-nums">
                        -{formatCurrency(totalCosts)}
                      </span>
                    </div>

                    {/* Linha 3: Lucro Líquido Real & Margem */}
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-800 font-black">
                      <span className="text-purple-300 uppercase text-[10px]">Lucro Líquido:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-emerald-400 tabular-nums">
                          {formatCurrency(fin.netProfit)}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          ({marginPct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso do Recebimento */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                      <span>Recebido: {formatCurrency(fin.totalReceived)}</span>
                      <span className={fin.totalPending === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                        {fin.totalPending === 0 ? '✓ 100% Quitado' : `Falta: ${formatCurrency(fin.totalPending)}`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${fin.totalPending === 0 ? 'bg-[#1ed760]' : 'bg-purple-500'}`}
                        style={{ width: `${fin.totalPredicted > 0 ? (fin.totalReceived / fin.totalPredicted) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer do Card */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-purple-400 font-bold">
                  <span>Ver Ficha e Lançar Pagamento</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
