import React, { useState, useMemo } from 'react';
import { Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, MapPin, Plus, CheckCircle2, AlertTriangle, AlertCircle,
  Sparkles, Music, DollarSign, ArrowRight, X, Phone, Users, Fuel
} from 'lucide-react';
import { getStatusConfig } from '../shows/types';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';
import { getLocalDateString } from '../../services/dateUtils';

interface Props {
  shows: Show[];
  onSelectShow: (show: Show) => void;
  onOpenCreateShow: (date?: string) => void;
}

export const CalendarWithDrawer: React.FC<Props> = ({
  shows,
  onSelectShow,
  onOpenCreateShow
}) => {
  const { transactions, isBlurred } = useFinance();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => getLocalDateString());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(getLocalDateString(today));
    setIsDrawerOpen(true);
  };

  // Build calendar matrix
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Empty padding slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr
      });
    }

    return days;
  }, [year, month]);

  // Shows mapped by date (com tratamento de data super seguro)
  const showsByDate = useMemo(() => {
    const map: Record<string, Show[]> = {};
    shows.forEach(s => {
      if (!s) return;
      let d = s.date;
      if (!d || typeof d !== 'string') {
        d = s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      } else if (d.includes('T')) {
        d = d.split('T')[0];
      }
      if (!map[d]) map[d] = [];
      map[d].push(s);
    });
    return map;
  }, [shows]);

  // Shows for the selected day - sorted chronologically
  const showsOnSelectedDate = useMemo(() => {
    const list = showsByDate[selectedDateStr] || [];
    return [...list].sort((a, b) => (a.time || '20:00').localeCompare(b.time || '20:00'));
  }, [showsByDate, selectedDateStr]);

  const confirmedShowsOnSelectedDate = useMemo(() => {
    return showsOnSelectedDate.filter(s => s.status === 'Confirmado');
  }, [showsOnSelectedDate]);

  // Financial totals of the selected day
  const selectedDayFinancials = useMemo(() => {
    let grossContracted = 0;
    let totalExpenses = 0;
    let netProfit = 0;

    showsOnSelectedDate.forEach(s => {
      if (s.status === 'Cancelado') return;
      const fin = getShowFinancialSummary(s, transactions);
      grossContracted += fin.totalContracted;
      totalExpenses += fin.totalExpenses;
      netProfit += fin.netProfit;
    });

    return {
      grossContracted,
      totalExpenses,
      netProfit
    };
  }, [showsOnSelectedDate, transactions]);

  const handleSelectDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsDrawerOpen(true);
  };

  const todayStr = useMemo(() => getLocalDateString(), []);

  const formatSelectedDateHeader = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const dt = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      }
    } catch {}
    return dateStr;
  };

  return (
    <div className="relative space-y-4">
      
      {/* 1. CALENDÁRIO PRINCIPAL */}
      <div className="bg-[#141416] rounded-3xl p-5 border border-zinc-800 space-y-4 shadow-sm">
        
        {/* CABEÇALHO DO CALENDÁRIO COM NAVEGAÇÃO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon size={18} className="text-purple-400" />
            <h2 className="text-base sm:text-lg font-black text-white capitalize tracking-tight">
              {monthYearLabel}
            </h2>
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-wider transition border border-purple-500/20 active:scale-95"
            >
              Hoje
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-[#18181b] text-zinc-400 hover:text-white transition active:scale-95 border border-zinc-800"
              title="Mês Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-[#18181b] text-zinc-400 hover:text-white transition active:scale-95 border border-zinc-800"
              title="Próximo Mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* LEGENDA DE MARCADORES */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-zinc-400 px-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1ed760] shadow-[0_0_6px_#1ed760]" />
            <span>Confirmado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span>Realizado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Orçamento</span>
          </div>
        </div>

        {/* CABEÇALHO DOS DIAS DA SEMANA */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-zinc-500">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* GRADE DO CALENDÁRIO */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((item, idx) => {
            if (!item) {
              return <div key={`empty-${idx}`} className="h-14 sm:h-16" />;
            }

            const isSelected = item.dateStr === selectedDateStr;
            const isToday = item.dateStr === todayStr;
            const dayShows = showsByDate[item.dateStr] || [];

            const confirmedShows = dayShows.filter(s => s.status === 'Confirmado');
            const completedShows = dayShows.filter(s => s.status === 'Realizado');
            const pendingShows = dayShows.filter(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação');

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => handleSelectDay(item.dateStr)}
                className={`h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-between p-1.5 transition-all relative active:scale-95 group ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xl shadow-purple-600/30 font-black ring-2 ring-purple-400 z-10'
                    : isToday
                    ? 'bg-[#18181b] text-purple-400 font-bold border-2 border-purple-500/50'
                    : 'bg-[#121214] text-zinc-300 border border-zinc-800/80 hover:border-purple-500/50 hover:bg-[#18181b]'
                }`}
                title={`Clique para abrir os detalhes de ${item.day}/${month + 1}`}
              >
                <div className="flex items-center justify-between w-full px-1">
                  <span className="text-xs font-black leading-none">
                    {item.day}
                  </span>
                  {dayShows.length > 0 && (
                    <span className={`text-[9px] px-1 rounded-full font-bold ${
                      isSelected ? 'bg-purple-900 text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {dayShows.length}
                    </span>
                  )}
                </div>

                {/* MARCADORES COLORIDOS NO DIA */}
                <div className="flex items-center justify-center space-x-1 h-2 mb-0.5">
                  {confirmedShows.length > 0 && (
                    <span className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-[#1ed760] shadow-[0_0_6px_#1ed760]'
                    }`} />
                  )}
                  {completedShows.length > 0 && (
                    <span className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-purple-400'
                    }`} />
                  )}
                  {pendingShows.length > 0 && (
                    <span className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-amber-400'
                    }`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ATALHO RÁPIDO DO DIA SELECIONADO NA VISÃO INLINE */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400">Dia selecionado:</span>
            <span className="font-bold text-white capitalize">{formatSelectedDateHeader(selectedDateStr)}</span>
          </div>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold border border-purple-500/30 transition flex items-center space-x-1"
          >
            <span>Abrir Gaveta Lateral</span>
            <ArrowRight size={13} />
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. GAVETA LATERAL (DRAWER / SLIDE-OVER)                                    */}
      {/* ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
          
          {/* Backdrop Click to close */}
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)} />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md sm:max-w-lg bg-[#141416] border-l border-zinc-800 min-h-screen shadow-2xl p-5 sm:p-6 overflow-y-auto space-y-5 animate-slide-left z-10">
            
            {/* Header do Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 block">
                  Agenda & Detalhes do Dia
                </span>
                <h3 className="text-lg font-black text-white capitalize mt-0.5">
                  {formatSelectedDateHeader(selectedDateStr)}
                </h3>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-2xl bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status e Resumo do Dia */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1c142b] to-[#121214] border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-purple-300">
                  {showsOnSelectedDate.length === 0 ? 'Data Livre' : `${showsOnSelectedDate.length} Apresentação(ões)`}
                </span>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenCreateShow(selectedDateStr);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider flex items-center space-x-1 shadow-sm"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>Novo Show</span>
                </button>
              </div>

              {showsOnSelectedDate.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-900/40 text-center">
                  <div className="p-2 rounded-xl bg-purple-950/40">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block">Cachê Bruto</span>
                    <span className="text-xs font-black text-white tabular-nums block mt-0.5">
                      {formatCurrency(selectedDayFinancials.grossContracted)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-purple-950/40">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block">Custos / Equipe</span>
                    <span className="text-xs font-black text-rose-400 tabular-nums block mt-0.5">
                      {formatCurrency(selectedDayFinancials.totalExpenses)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-purple-950/40">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase block">Lucro Líquido</span>
                    <span className="text-xs font-black text-emerald-400 tabular-nums block mt-0.5">
                      {formatCurrency(selectedDayFinancials.netProfit)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* LISTAGEM DOS SHOWS DA DATA */}
            {showsOnSelectedDate.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#121214] border border-dashed border-zinc-800 text-center space-y-3">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                <p className="text-sm font-bold text-white">Nenhum evento agendado para este dia</p>
                <p className="text-xs text-zinc-400">Sua agenda está disponível para novas contratações.</p>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenCreateShow(selectedDateStr);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Agendar Show nesta Data</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-black uppercase text-zinc-400 block px-1">
                  Shows Agendados:
                </span>

                {showsOnSelectedDate.map(show => {
                  const statusCfg = getStatusConfig(show.status);
                  const fin = getShowFinancialSummary(show, transactions);

                  return (
                    <div
                      key={show.id}
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onSelectShow(show);
                      }}
                      className="p-4 rounded-2xl bg-[#18181b] hover:bg-zinc-800/80 border border-zinc-800 hover:border-purple-500/40 transition cursor-pointer space-y-3 group shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 flex items-center space-x-1">
                              <Clock size={12} />
                              <span>{show.time || '20:00'}{show.endTime ? ` — ${show.endTime}` : ''}</span>
                            </span>

                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusCfg.badgeClass}`}>
                              {show.status}
                            </span>
                          </div>

                          <h4 className="text-sm font-black text-white mt-1.5 group-hover:text-purple-400 transition-colors">
                            {show.location && show.location.trim() !== '' ? show.location : `Show - ${show.contractorName || show.name || 'Contratante'}`}
                          </h4>
                          <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            Contratante: {show.contractorName || show.name || 'Não informado'} • {show.city || 'Cidade a definir'}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-white tabular-nums block">
                            {formatCurrency(fin.totalPredicted)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400 block">
                            Lucro: {formatCurrency(fin.netProfit)}
                          </span>
                        </div>
                      </div>

                      {/* Botão de abrir ficha */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-purple-400 font-bold">
                        <span>Ver Ficha Completa</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
