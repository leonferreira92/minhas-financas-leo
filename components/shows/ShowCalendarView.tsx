import React, { useState, useMemo } from 'react';
import { Show } from '../../types';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, MapPin, Plus, CheckCircle2, AlertTriangle, 
  Sparkles, Check, ChevronDown 
} from 'lucide-react';
import { getStatusConfig } from './types';

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

  // Shows mapped by date (excluding Realizado/Cancelado from primary alert clutter)
  const showsByDate = useMemo(() => {
    const map: Record<string, Show[]> = {};
    shows.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [shows]);

  // Shows for the selected day
  const showsOnSelectedDate = useMemo(() => {
    return showsByDate[selectedDateStr] || [];
  }, [showsByDate, selectedDateStr]);

  const confirmedShowsOnSelectedDate = useMemo(() => {
    return showsOnSelectedDate.filter(s => s.status === 'Confirmado');
  }, [showsOnSelectedDate]);

  const hasQuotesOnSelectedDate = useMemo(() => {
    return showsOnSelectedDate.some(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação');
  }, [showsOnSelectedDate]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatSelectedDateHeader = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="space-y-4">
      {/* HEADER DO CALENDÁRIO: NAVEGAÇÃO ENTRE MESES & BOTÃO HOJE */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white capitalize tracking-tight">
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

        {/* LEGENDA RÁPIDA DE DISPONIBILIDADE */}
        <div className="flex items-center space-x-4 text-[10px] font-bold text-slate-400 px-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Confirmado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Aguardando / Orçamento</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>Realizado / Histórico</span>
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

        {/* GRADE DO CALENDÁRIO */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item, idx) => {
            if (!item) {
              return <div key={`empty-${idx}`} className="h-10 sm:h-12" />;
            }

            const isSelected = item.dateStr === selectedDateStr;
            const isToday = item.dateStr === todayStr;
            const dayShows = showsByDate[item.dateStr] || [];

            const hasConfirmed = dayShows.some(s => s.status === 'Confirmado');
            const hasPendingOrQuote = dayShows.some(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado');
            const hasPast = dayShows.some(s => s.status === 'Realizado');

            return (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDateStr(item.dateStr)}
                className={`h-11 sm:h-13 rounded-2xl flex flex-col items-center justify-between p-1.5 transition-all relative active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 dark:ring-indigo-500 font-black'
                    : isToday
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-900/60'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-xs leading-none">
                  {item.day}
                </span>

                {/* Dots de Shows na Data */}
                <div className="flex items-center space-x-1 h-2">
                  {hasConfirmed && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500 shadow-xs'}`} />
                  )}
                  {hasPendingOrQuote && !hasConfirmed && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-500'}`} />
                  )}
                  {hasPast && !hasConfirmed && !hasPendingOrQuote && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-300' : 'bg-slate-400'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* PAINEL DO DIA SELECIONADO: VERIFICAÇÃO INSTANTÂNEA DE DISPONIBILIDADE */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Cabeçalho do dia selecionado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
              Consulta de Disponibilidade
            </span>
            <h3 className="text-sm font-black text-slate-900 dark:text-white capitalize">
              {formatSelectedDateHeader(selectedDateStr)}
            </h3>
          </div>

          {/* Badge de Status da Data */}
          <div>
            {confirmedShowsOnSelectedDate.length > 0 ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Data Ocupada ({confirmedShowsOnSelectedDate.length} confirmado)</span>
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

        {/* Shows na data selecionada */}
        {showsOnSelectedDate.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum compromisso marcado nesta data</p>
            <p className="text-[11px] text-slate-400 font-medium">Sua agenda está 100% livre neste dia.</p>
            
            <button
              onClick={() => onOpenCreateModal(selectedDateStr)}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1 transition active:scale-95 shadow-sm"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Agendar Show Neste Dia</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {showsOnSelectedDate.map(show => {
              const statusCfg = getStatusConfig(show.status);
              return (
                <div
                  key={show.id}
                  onClick={() => onSelectShow(show)}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer space-y-2 shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusCfg.badgeClass}`}>
                          {show.status}
                        </span>
                        {show.eventType && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            {show.eventType}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                        {show.contractorName || show.name}
                      </h4>
                    </div>

                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(show.totalCache)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-medium">
                    <span className="flex items-center">
                      <Clock size={12} className="mr-1 text-indigo-600" />
                      {show.time || '20:00'} {show.endTime ? `às ${show.endTime}` : ''}
                    </span>
                    {(show.city || show.location) && (
                      <span className="flex items-center truncate max-w-[160px]">
                        <MapPin size={12} className="mr-1 text-slate-400 shrink-0" />
                        <span className="truncate">{show.city || show.location}</span>
                      </span>
                    )}
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
