import React, { useState, useMemo } from 'react';
import { Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, MapPin, Plus, CheckCircle2, AlertTriangle, AlertCircle,
  Sparkles, Check, ChevronDown, Music, DollarSign, ArrowRight
} from 'lucide-react';
import { getStatusConfig, getShowDisplayHierarchy } from './types';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';
import { getLocalDateString } from '../../services/dateUtils';

interface Props {
  shows: Show[];
  onSelectShow: (show: Show, initialTab?: 'finance' | 'expenses' | 'details', openPaymentDirectly?: boolean) => void;
  onOpenCreateModal: (date?: string) => void;
  onQuickAddPayment?: (show: Show) => void;
  currentDate?: Date;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onGoToday?: () => void;
}

export const ShowCalendarView: React.FC<Props> = ({
  shows,
  onSelectShow,
  onOpenCreateModal,
  onQuickAddPayment,
  currentDate: externalDate,
  onPrevMonth: externalPrevMonth,
  onNextMonth: externalNextMonth,
  onGoToday: externalGoToday
}) => {
  const { transactions } = useFinance();
  const [internalDate, setInternalDate] = useState(() => new Date());
  const currentDate = externalDate || internalDate;

  const [selectedDateStr, setSelectedDateStr] = useState(() => getLocalDateString());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthYearLabel = useMemo(() => {
    return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  // Navigate months
  const handlePrevMonth = () => {
    if (externalPrevMonth) {
      externalPrevMonth();
    } else {
      setInternalDate(new Date(year, month - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (externalNextMonth) {
      externalNextMonth();
    } else {
      setInternalDate(new Date(year, month + 1, 1));
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    if (externalGoToday) {
      externalGoToday();
    } else {
      setInternalDate(today);
    }
    setSelectedDateStr(getLocalDateString(today));
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
    const safeShows = Array.isArray(shows) ? shows : [];
    safeShows.forEach(s => {
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
      {/* HEADER DO CALENDÁRIO COM NAVEGAÇÃO */}
      <div className="bg-[#18181b] rounded-3xl p-4 sm:p-5 border border-zinc-800/80 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-black text-white capitalize tracking-tight">
              {monthYearLabel}
            </h2>
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-wider transition active:scale-95"
            >
              Hoje
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-[#121212] text-zinc-400 hover:text-white transition active:scale-95 border border-zinc-800"
              title="Mês Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-[#121212] text-zinc-400 hover:text-white transition active:scale-95 border border-zinc-800"
              title="Próximo Mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* LEGENDA RÁPIDA DISCRETA */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-zinc-400 px-1 pt-0.5">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1ed760] shadow-[0_0_6px_#1ed760]" />
            <span>Confirmado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Realizado</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Orçamento</span>
          </div>
        </div>

        {/* DIAS DA SEMANA */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-zinc-500">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* GRADE DO CALENDÁRIO MENSAL (MINIMALISTA COM PONTOS NEON) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarDays.map((item, idx) => {
            if (!item) {
              return <div key={`empty-${idx}`} className="h-11 sm:h-12" />;
            }

            const isSelected = item.dateStr === selectedDateStr;
            const isToday = item.dateStr === todayStr;
            const dayShows = showsByDate[item.dateStr] || [];

            const confirmedShows = dayShows.filter(s => s.status === 'Confirmado');
            const completedShows = dayShows.filter(s => s.status === 'Realizado');
            const pendingShows = dayShows.filter(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado');

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setSelectedDateStr(item.dateStr)}
                className={`h-11 sm:h-12 rounded-xl sm:rounded-2xl flex flex-col items-center justify-between p-1 transition-all relative active:scale-95 group ${
                  isSelected
                    ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/25 font-black z-10'
                    : isToday
                    ? 'bg-zinc-800/80 text-emerald-400 font-bold border border-emerald-500/40'
                    : 'bg-[#121212] text-zinc-300 border border-zinc-800/60 hover:border-zinc-700'
                }`}
                title={`${item.day}/${month + 1}: ${dayShows.length} evento(s). Clique para ver detalhes da data.`}
              >
                <span className="text-xs leading-none font-bold mt-0.5">
                  {item.day}
                </span>

                {/* INDICADORES MINIMALISTAS (PONTOS NEON SEM POLUIÇÃO) */}
                <div className="flex items-center justify-center space-x-1 h-2 mb-0.5">
                  {confirmedShows.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected 
                        ? 'bg-zinc-950' 
                        : 'bg-[#1ed760] shadow-[0_0_6px_#1ed760]'
                    }`} />
                  )}
                  {completedShows.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-zinc-950' : 'bg-purple-400'
                    }`} />
                  )}
                  {pendingShows.length > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-zinc-950' : 'bg-amber-400'
                    }`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. VISÃO DO DIA: CONSULTA INSTANTÂNEA E ATALHOS RÁPIDOS */}
      <div className="bg-[#18181b] rounded-3xl p-5 border border-zinc-800/80 shadow-sm space-y-4">
        
        {/* Cabeçalho do dia selecionado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Visão do Dia • {formatShortDate(selectedDateStr)}
            </span>
            <h3 className="text-base font-black text-white capitalize mt-0.5">
              {formatSelectedDateHeader(selectedDateStr)}
            </h3>
          </div>

          {/* Badges e Ação Direta de Agendamento */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <div>
              {confirmedShowsOnSelectedDate.length > 1 ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span>{confirmedShowsOnSelectedDate.length} Shows Confirmados</span>
                </span>
              ) : confirmedShowsOnSelectedDate.length === 1 ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-[#1ed760] shadow-[0_0_6px_#1ed760]" />
                  <span>1 Show Confirmado</span>
                </span>
              ) : hasQuotesOnSelectedDate ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Em Negociação (Orçamento)</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={13} strokeWidth={3} />
                  <span>Data Livre</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onOpenCreateModal(selectedDateStr)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1 transition active:scale-95 shadow-sm"
              title={`Cadastrar novo show em ${formatShortDate(selectedDateStr)}`}
            >
              <Plus size={14} strokeWidth={3} />
              <span>Novo Show</span>
            </button>
          </div>
        </div>

        {/* LISTAGEM DOS COMPROMISSOS DO DIA */}
        {showsOnSelectedDate.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#121212] border border-dashed border-zinc-800 text-center space-y-2">
            <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
            <p className="text-xs font-bold text-white">Nenhum compromisso marcado nesta data</p>
            <p className="text-[11px] text-zinc-400 font-medium">Sua agenda está totalmente livre neste dia.</p>
            
            <div className="pt-2 flex items-center justify-center space-x-2">
              <button
                type="button"
                onClick={() => onOpenCreateModal(selectedDateStr)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1 transition active:scale-95 shadow-sm"
              >
                <Plus size={14} strokeWidth={3} />
                <span>Agendar Show</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Análise de Compatibilidade de Horários (quando há 2 ou mais shows no mesmo dia) */}
            {showsOnSelectedDate.length > 1 && (() => {
              // Checa se há qualquer sobreposição entre os shows do dia
              const parseMins = (tStr?: string) => {
                if (!tStr) return 1200;
                const [h, m] = tStr.split(':').map(Number);
                return (isNaN(h) ? 20 : h) * 60 + (isNaN(m) ? 0 : m);
              };

              let hasConflict = false;
              let conflictDetail = '';

              for (let i = 0; i < showsOnSelectedDate.length; i++) {
                for (let j = i + 1; j < showsOnSelectedDate.length; j++) {
                  const s1 = showsOnSelectedDate[i];
                  const s2 = showsOnSelectedDate[j];
                  if (s1.status === 'Cancelado' || s2.status === 'Cancelado') continue;

                  const start1 = parseMins(s1.time);
                  let end1 = s1.endTime ? parseMins(s1.endTime) : start1 + 180;
                  if (end1 < start1) end1 += 1440;

                  const start2 = parseMins(s2.time);
                  let end2 = s2.endTime ? parseMins(s2.endTime) : start2 + 180;
                  if (end2 < start2) end2 += 1440;

                  if (start1 < end2 && end1 > start2) {
                    hasConflict = true;
                    conflictDetail = `Sobreposição entre "${s1.contractorName || s1.name}" (${s1.time || '20:00'}) e "${s2.contractorName || s2.name}" (${s2.time || '20:00'})`;
                    break;
                  }
                }
                if (hasConflict) break;
              }

              return hasConflict ? (
                <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start space-x-2.5 text-xs">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center space-x-1 font-black text-rose-200">
                      <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                      <span>Conflito de Horário Detectado</span>
                    </div>
                    <span className="text-[11px] opacity-90 block mt-0.5">{conflictDetail}. Verifique os horários de início e término e o tempo de deslocamento.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 flex items-center space-x-2 text-xs">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span className="font-bold text-[11px]">
                    Múltiplos shows no mesmo dia: Horários compatíveis sem sobreposição!
                  </span>
                </div>
              );
            })()}

            {showsOnSelectedDate.map(show => {
              const statusCfg = getStatusConfig(show.status);
              const fin = getShowFinancialSummary(show, transactions);
              const pct = fin.totalPredicted > 0 ? Math.min(100, Math.round((fin.totalReceived / fin.totalPredicted) * 100)) : 0;
              const is100 = fin.totalPending === 0 && fin.totalPredicted > 0;
              const hierarchy = getShowDisplayHierarchy(show);

              return (
                <div
                  key={show.id}
                  onClick={() => onSelectShow(show)}
                  className="p-4 rounded-2xl bg-[#121212] hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer space-y-3 shadow-xs active:scale-[0.99] group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 flex items-center space-x-1">
                          <Clock size={12} />
                          <span>{show.time || '20:00'}{show.endTime ? ` — ${show.endTime}` : ''}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusCfg.badgeClass}`}>
                          {show.status}
                        </span>

                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/90 text-zinc-200 border border-zinc-700">
                          <MapPin size={10} className="text-emerald-400 shrink-0" />
                          <span>{hierarchy.cityTag}</span>
                        </span>
                      </div>

                      <h4 className="text-base font-black text-white mt-1.5 truncate group-hover:text-emerald-400 transition-colors">
                        {hierarchy.eventTitle}
                      </h4>
                      <p className="text-xs text-zinc-400 font-bold mt-0.5 truncate">
                        {hierarchy.contractorSubtitle}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-white block tabular-nums">
                        {formatCurrency(fin.totalPredicted)}
                      </span>
                      {fin.totalPending > 0 && show.status === 'Confirmado' && (
                        <span className="text-[10px] font-bold text-amber-400 block">
                          Falta: {formatCurrency(fin.totalPending)}
                        </span>
                      )}
                      {is100 && (
                        <span className="text-[10px] font-bold text-emerald-400 block">
                          100% Recebido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BARRA DE PROGRESSO DO PAGAMENTO */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                      <span>Recebido: {formatCurrency(fin.totalReceived)} ({pct}%)</span>
                      <span className={is100 ? 'text-emerald-400' : 'text-amber-400'}>
                        {is100 ? '✓ Quitado' : `Saldo: ${formatCurrency(fin.totalPending)}`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          is100 ? 'bg-[#1ed760]' : pct > 0 ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* DETALHES & ACESSO À FICHA COMPLETA */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/80 font-medium">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <MapPin size={13} className="text-zinc-500 shrink-0" />
                      <span className="font-semibold text-zinc-300 truncate">
                        {show.city || 'Cidade a definir'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 text-emerald-400 font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                      <span>Ver Ficha do Evento</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => onOpenCreateModal(selectedDateStr)}
              className="w-full py-2.5 rounded-xl border border-dashed border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/40 text-xs font-bold transition flex items-center justify-center space-x-1"
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
