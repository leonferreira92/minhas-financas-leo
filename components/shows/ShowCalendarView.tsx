import React, { useState, useMemo } from 'react';
import { Show } from '../../types';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, MapPin, Plus, CheckCircle2, AlertTriangle, 
  Sparkles, Check, ChevronDown, Music, DollarSign, ArrowRight
} from 'lucide-react';
import { getStatusConfig } from './types';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';

interface Props {
  shows: Show[];
  onSelectShow: (show: Show) => void;
  onOpenCreateModal: (date?: string) => void;
}

export const ShowCalendarView: React.FC<Props> = ({
  shows,
  onSelectShow,
  onOpenCreateModal
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().slice(0, 10));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().slice(0, 10));
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

  // Shows mapped by date
  const showsByDate = useMemo(() => {
    const map: Record<string, Show[]> = {};
    shows.forEach(s => {
      if (!s.date) return;
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [shows]);

  // Shows for the selected day - sorted chronologically by time
  const showsOnSelectedDate = useMemo(() => {
    const list = showsByDate[selectedDateStr] || [];
    return [...list].sort((a, b) => (a.time || '20:00').localeCompare(b.time || '20:00'));
  }, [showsByDate, selectedDateStr]);

  const confirmedShowsOnSelectedDate = useMemo(() => {
    return showsOnSelectedDate.filter(s => s.status === 'Confirmado');
  }, [showsOnSelectedDate]);

  const hasQuotesOnSelectedDate = useMemo(() => {
    return showsOnSelectedDate.some(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado');
  }, [showsOnSelectedDate]);

  // Format currency helper
  const formatCurrency = (val?: number | string | null) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0).replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
  };

  const formatSelectedDateHeader = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = String(dateStr).split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const dt = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        if (!isNaN(dt.getTime())) {
          return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        }
      }
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      }
    } catch {}
    return String(dateStr);
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Month statistics summary
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const thisMonthShows = shows.filter(s => s.date && s.date.startsWith(monthPrefix));
    const confirmed = thisMonthShows.filter(s => s.status === 'Confirmado');
    const totalRevenue = confirmed.reduce((acc, s) => {
      const fin = getShowFinancialSummary(s);
      return acc + fin.totalPredicted;
    }, 0);
    return {
      totalShows: confirmed.length,
      totalRevenue,
      quotesCount: thisMonthShows.filter(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação').length
    };
  }, [shows, year, month]);

  return (
    <div className="space-y-4">
      {/* HEADER DO CALENDÁRIO COM NAVEGAÇÃO E RESUMO DO MÊS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize tracking-tight">
              {monthYearLabel}
            </h2>
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider transition active:scale-95"
            >
              Hoje
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 border border-slate-200/60 dark:border-slate-700"
              title="Mês Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 border border-slate-200/60 dark:border-slate-700"
              title="Próximo Mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* RESUMO RÁPIDO DO MÊS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Shows Confirmados</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {monthStats.totalShows} {monthStats.totalShows === 1 ? 'apresentação' : 'apresentações'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Faturamento Mês</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(monthStats.totalRevenue)}
            </span>
          </div>
          {monthStats.quotesCount > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block uppercase">Em Negociação</span>
              <span className="text-sm font-black text-amber-800 dark:text-amber-300">
                {monthStats.quotesCount} {monthStats.quotesCount === 1 ? 'orçamento' : 'orçamentos'}
              </span>
            </div>
          )}
        </div>

        {/* LEGENDA RÁPIDA DE DISPONIBILIDADE */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1 pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Confirmado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Orçamento / Em Negociação</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Múltiplos Shows no Dia</span>
          </div>
        </div>

        {/* DIAS DA SEMANA */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-400">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* GRADE DO CALENDÁRIO MENSAL */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarDays.map((item, idx) => {
            if (!item) {
              return <div key={`empty-${idx}`} className="h-12 sm:h-14" />;
            }

            const isSelected = item.dateStr === selectedDateStr;
            const isToday = item.dateStr === todayStr;
            const dayShows = showsByDate[item.dateStr] || [];

            const confirmedShows = dayShows.filter(s => s.status === 'Confirmado');
            const pendingShows = dayShows.filter(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado');
            const pastShows = dayShows.filter(s => s.status === 'Realizado');

            const hasMultiple = dayShows.length > 1;
            const hasMultipleConfirmed = confirmedShows.length > 1;

            return (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDateStr(item.dateStr)}
                className={`h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-between p-1 sm:p-1.5 transition-all relative active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 dark:ring-indigo-500 font-black z-10'
                    : isToday
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-300 dark:border-indigo-800'
                    : confirmedShows.length > 0
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200 border border-emerald-200/70 dark:border-emerald-900/50 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30'
                    : pendingShows.length > 0
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200 border border-amber-200/70 dark:border-amber-900/50 hover:bg-amber-100/50'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full px-0.5">
                  <span className="text-xs leading-none font-bold">
                    {item.day}
                  </span>

                  {/* BADGE DE MÚLTIPLOS SHOWS NO MESMO DIA */}
                  {hasMultiple && (
                    <span className={`text-[9px] font-black px-1 rounded-md leading-tight ${
                      isSelected 
                        ? 'bg-white text-indigo-900' 
                        : hasMultipleConfirmed 
                        ? 'bg-purple-600 text-white shadow-xs' 
                        : 'bg-amber-500 text-white shadow-xs'
                    }`}>
                      {dayShows.length}x
                    </span>
                  )}
                </div>

                {/* INDICADORES VISUAIS DE COMPROMISSO */}
                <div className="flex items-center space-x-1 h-2">
                  {confirmedShows.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500 shadow-xs'}`} />
                  )}
                  {pendingShows.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-500 shadow-xs'}`} />
                  )}
                  {pastShows.length > 0 && confirmedShows.length === 0 && pendingShows.length === 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-300' : 'bg-slate-400'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. VISÃO DO DIA: CONSULTA INSTANTÂNEA DE DISPONIBILIDADE E COMPROMISSOS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Cabeçalho do dia selecionado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                Visão do Dia • {formatShortDate(selectedDateStr)}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white capitalize mt-0.5">
              {formatSelectedDateHeader(selectedDateStr)}
            </h3>
          </div>

          {/* Badge de Status e Disponibilidade da Data */}
          <div>
            {confirmedShowsOnSelectedDate.length > 1 ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span>{confirmedShowsOnSelectedDate.length} Shows Confirmados</span>
              </span>
            ) : confirmedShowsOnSelectedDate.length === 1 ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Data Ocupada (1 Show Confirmado)</span>
              </span>
            ) : hasQuotesOnSelectedDate ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Em Negociação (Orçamento)</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={13} strokeWidth={3} />
                <span>Data Livre para Agendamento</span>
              </span>
            )}
          </div>
        </div>

        {/* LISTAGEM DOS COMPROMISSOS DO DIA ORDENADOS POR HORÁRIO */}
        {showsOnSelectedDate.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum compromisso marcado nesta data</p>
            <p className="text-[11px] text-slate-400 font-medium">Sua agenda está totalmente disponível neste dia.</p>
            
            <div className="pt-2 flex items-center justify-center space-x-2">
              <button
                onClick={() => onOpenCreateModal(selectedDateStr)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1 transition active:scale-95 shadow-sm"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Agendar Show</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {showsOnSelectedDate.map((show, idx) => {
              const statusCfg = getStatusConfig(show.status);
              const fin = getShowFinancialSummary(show);

              return (
                <div
                  key={show.id}
                  onClick={() => onSelectShow(show)}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer space-y-3 shadow-xs active:scale-[0.99] group"
                >
                  {/* Linha Principal no formato claro e direto: Horário — Nome / Evento */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{show.time || '20:00'}{show.endTime ? ` — ${show.endTime}` : ''}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusCfg.badgeClass}`}>
                          {show.status}
                        </span>

                        {show.eventType && (
                          <span className="text-[10px] text-slate-400 font-bold hidden sm:inline-block">
                            • {show.eventType}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {show.contractorName || show.name}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block tabular-nums">
                        {formatCurrency(fin.totalPredicted)}
                      </span>
                      {fin.totalPending > 0 && show.status === 'Confirmado' && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                          Falta: {formatCurrency(fin.totalPending)}
                        </span>
                      )}
                      {fin.totalPending === 0 && fin.totalPredicted > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                          100% Recebido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Linha de Cidade e Local */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 font-medium">
                    <div className="flex items-center space-x-1.5">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {show.city ? show.city : 'Cidade não definida'}
                      </span>
                      {show.location && (
                        <span className="text-slate-400 truncate max-w-[180px]">
                          • {show.location}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-0.5 group-hover:translate-x-1 transition-transform">
                      <span>Ver ficha</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => onOpenCreateModal(selectedDateStr)}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center justify-center space-x-1"
            >
              <Plus size={14} />
              <span>Adicionar Outro Show neste Dia</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
