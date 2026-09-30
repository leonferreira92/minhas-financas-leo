import React, { useState, useMemo } from 'react';
import { Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
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
  const { transactions } = useFinance();
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

        {/* LEGENDA RÁPIDA DE DISPONIBILIDADE */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 px-1 pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Confirmado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Realizado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Orçamento</span>
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
            const completedShows = dayShows.filter(s => s.status === 'Realizado');
            const pendingShows = dayShows.filter(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado');

            const hasMultiple = dayShows.length > 1;

            return (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDateStr(item.dateStr)}
                className={`h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-between p-1 sm:p-1.5 transition-all relative active:scale-95 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400 dark:ring-purple-500 font-black z-10'
                    : isToday
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-800'
                    : confirmedShows.length > 0
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200 border border-emerald-200/70 dark:border-emerald-900/50 hover:bg-emerald-100/50'
                    : completedShows.length > 0
                    ? 'bg-purple-50/70 dark:bg-purple-950/20 text-slate-800 dark:text-slate-200 border border-purple-200/70 dark:border-purple-900/50 hover:bg-purple-100/50'
                    : pendingShows.length > 0
                    ? 'bg-amber-50/70 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200 border border-amber-200/70 dark:border-amber-900/50 hover:bg-amber-100/50'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full px-0.5">
                  <span className="text-xs leading-none font-bold">
                    {item.day}
                  </span>

                  {/* BADGE DE MÚLTIPLOS SHOWS */}
                  {hasMultiple && (
                    <span className={`text-[9px] font-black px-1 rounded-md leading-tight ${
                      isSelected 
                        ? 'bg-white text-purple-900' 
                        : 'bg-purple-600 text-white shadow-xs'
                    }`}>
                      {dayShows.length}x
                    </span>
                  )}
                </div>

                {/* INDICADORES VISUAIS */}
                <div className="flex items-center space-x-1 h-2">
                  {confirmedShows.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500 shadow-xs'}`} />
                  )}
                  {completedShows.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500 shadow-xs'}`} />
                  )}
                  {pendingShows.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-500 shadow-xs'}`} />
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
              Visão do Dia • {formatShortDate(selectedDateStr)}
            </span>
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
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>1 Show Confirmado</span>
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

        {/* LISTAGEM DOS COMPROMISSOS DO DIA */}
        {showsOnSelectedDate.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum compromisso marcado nesta data</p>
            <p className="text-[11px] text-slate-400 font-medium">Sua agenda está totalmente disponível neste dia.</p>
            
            <div className="pt-2 flex items-center justify-center space-x-2">
              <button
                onClick={() => onOpenCreateModal(selectedDateStr)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1 transition active:scale-95 shadow-sm"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Agendar Show</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {showsOnSelectedDate.map(show => {
              const statusCfg = getStatusConfig(show.status);
              const fin = getShowFinancialSummary(show, transactions);
              const pct = fin.totalPredicted > 0 ? Math.min(100, Math.round((fin.totalReceived / fin.totalPredicted) * 100)) : 0;
              const is100 = fin.totalPending === 0 && fin.totalPredicted > 0;

              return (
                <div
                  key={show.id}
                  onClick={() => onSelectShow(show)}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer space-y-3 shadow-xs active:scale-[0.99] group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/50 flex items-center space-x-1">
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

                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {show.contractorName || show.name}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 dark:text-white block tabular-nums">
                        {formatCurrency(fin.totalPredicted)}
                      </span>
                      {fin.totalPending > 0 && show.status === 'Confirmado' && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                          Falta: {formatCurrency(fin.totalPending)}
                        </span>
                      )}
                      {is100 && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                          100% Recebido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BARRA DE PROGRESSO DO PAGAMENTO */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                      <span>Recebido: {formatCurrency(fin.totalReceived)} ({pct}%)</span>
                      <span>{is100 ? '✓ Quitado' : `Saldo: ${formatCurrency(fin.totalPending)}`}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          is100 ? 'bg-emerald-500' : pct > 0 ? 'bg-purple-600' : 'bg-slate-300'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
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

                    <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 flex items-center space-x-0.5 group-hover:translate-x-1 transition-transform">
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
