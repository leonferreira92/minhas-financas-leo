import React, { useMemo } from 'react';
import { Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  Calendar, Clock, MapPin, DollarSign, ChevronRight, 
  Sparkles, CheckCircle2, Music, Plus, ArrowRight,
  TrendingUp, AlertCircle, Award, Star
} from 'lucide-react';
import { getStatusConfig } from './types';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';

interface Props {
  shows: Show[];
  onSelectShow: (show: Show) => void;
  onOpenCreateModal: () => void;
}

export const UpcomingShowsList: React.FC<Props> = ({
  shows,
  onSelectShow,
  onOpenCreateModal
}) => {
  const { transactions } = useFinance();
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter shows: future or today date, and status === 'Confirmado'
  // Sort strictly cronologically: date ASC, then time ASC
  const upcomingConfirmedShows = useMemo(() => {
    return shows
      .filter(s => {
        const isConfirmed = s.status === 'Confirmado';
        const isFutureOrToday = (s.date || '') >= todayStr;
        return isConfirmed && isFutureOrToday;
      })
      .sort((a, b) => {
        const dateCmp = (a.date || '').localeCompare(b.date || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.time || '20:00').localeCompare(b.time || '20:00');
      });
  }, [shows, todayStr]);

  const nextShow = upcomingConfirmedShows[0] || null;
  const remainingUpcomingShows = upcomingConfirmedShows.slice(1);

  const formatCurrency = (val?: number | string | null) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0).replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
  };

  const formatDateFull = (dStr?: string | null) => {
    if (!dStr) return '';
    try {
      const parts = String(dStr).split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        }
      }
      const dt = new Date(String(dStr));
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      }
    } catch {}
    return String(dStr || '');
  };

  const formatDateShort = (dStr?: string | null) => {
    if (!dStr) return '';
    try {
      const parts = String(dStr).split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
        }
      }
    } catch {}
    return String(dStr || '');
  };

  const getDaysCountdownTag = (dStr?: string | null) => {
    if (!dStr) return { label: 'Data a definir', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', isUrgent: false };
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(String(dStr).includes('T') ? String(dStr) : `${dStr}T12:00:00`);
      target.setHours(0, 0, 0, 0);
      const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (isNaN(diff)) {
        return { label: 'Agendado', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', isUrgent: false };
      }
      if (diff === 0) return { label: 'É Hoje!', color: 'bg-rose-500 text-white font-black shadow-sm', isUrgent: true };
      if (diff === 1) return { label: 'É Amanhã!', color: 'bg-amber-500 text-white font-black shadow-sm', isUrgent: true };
      if (diff < 0) return { label: 'Hoje', color: 'bg-slate-100 text-slate-500 border-slate-200', isUrgent: false };
      if (diff <= 7) return { label: `Em ${diff} dias`, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800', isUrgent: false };
      return { label: `Em ${diff} dias`, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', isUrgent: false };
    } catch {
      return { label: 'Agendado', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', isUrgent: false };
    }
  };

  // Financial summary for all upcoming confirmed shows
  const upcomingTotals = useMemo(() => {
    let totalContracted = 0;
    let totalPending = 0;
    let thisWeekCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    upcomingConfirmedShows.forEach(show => {
      const fin = getShowFinancialSummary(show, transactions);
      totalContracted += fin.totalContracted;
      totalPending += fin.totalPending;

      if (show.date) {
        const target = new Date(`${show.date}T12:00:00`);
        target.setHours(0, 0, 0, 0);
        const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 7) {
          thisWeekCount++;
        }
      }
    });

    return { totalContracted, totalPending, thisWeekCount };
  }, [upcomingConfirmedShows]);

  return (
    <div className="space-y-5">
      {/* HEADER DA VISÃO PRÓXIMOS SHOWS */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Cronograma de Apresentações
          </span>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Próximos Shows Confirmados
          </h2>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md flex items-center space-x-1"
        >
          <Plus size={15} strokeWidth={3} />
          <span>Novo Show</span>
        </button>
      </div>

      {/* CARDS DE RESUMO RÁPIDO DO CRONOGRAMA */}
      {upcomingConfirmedShows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Esta Semana</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
              {upcomingTotals.thisWeekCount} {upcomingTotals.thisWeekCount === 1 ? 'show agendado' : 'shows agendados'}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Contratado</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(upcomingTotals.totalContracted)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Ainda a Receber</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {formatCurrency(upcomingTotals.totalPending)}
            </span>
          </div>
        </div>
      )}

      {/* ESTADO VAZIO: NENHUM SHOW FUTURO */}
      {upcomingConfirmedShows.length === 0 ? (
        <div className="p-10 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Music size={28} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Nenhum próximo show confirmado</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Todos os seus shows futuros confirmados aparecerão aqui em ordem cronológica com horários, cidades e status dos pagamentos.
            </p>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1.5 transition active:scale-95 shadow-md"
          >
            <Plus size={15} strokeWidth={3} />
            <span>Cadastrar Novo Show</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* DESTAQUE ESPECIAL: O PRÓXIMO SHOW MAIS IMEDIATO */}
          {nextShow && (() => {
            const countdown = getDaysCountdownTag(nextShow.date);
            const fin = getShowFinancialSummary(nextShow, transactions);

            return (
              <div
                onClick={() => onSelectShow(nextShow)}
                className="relative overflow-hidden p-5 sm:p-6 rounded-[2.2rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white border border-indigo-700/50 shadow-xl cursor-pointer active:scale-[0.99] transition-all group"
              >
                {/* Glow decorativo de fundo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

                <div className="relative z-10 space-y-4">
                  {/* Badge de Destaque Superior */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-sm">
                        <Star size={11} fill="currentColor" />
                        <span>Próximo Show da Agenda</span>
                      </span>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${countdown.color}`}>
                        {countdown.label}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-indigo-200 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                      <span>Ver ficha completa</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>

                  {/* Nome do Contratante / Evento */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                      {nextShow.contractorName || nextShow.name}
                    </h3>
                    {nextShow.eventType && (
                      <p className="text-xs text-indigo-300/90 font-bold uppercase tracking-wider mt-0.5">
                        {nextShow.eventType}
                      </p>
                    )}
                  </div>

                  {/* Grid de Informações: Data, Horário, Cidade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-800/60 text-xs text-indigo-100 font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} className="text-amber-400 shrink-0" />
                      <span className="capitalize font-bold">
                        {formatDateFull(nextShow.date)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-amber-400 shrink-0" />
                      <span className="font-bold">
                        {nextShow.time || '20:00'}{nextShow.endTime ? ` às ${nextShow.endTime}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 sm:col-span-2">
                      <MapPin size={16} className="text-amber-400 shrink-0" />
                      <span className="truncate">
                        <strong className="text-white font-bold">{nextShow.city || 'Cidade a definir'}</strong>
                        {nextShow.location ? ` • ${nextShow.location}` : ''}
                      </span>
                    </div>
                  </div>

                    {/* Resumo Financeiro no Destaque: Valor e Quanto Falta Receber */}
                  <div className="pt-3 border-t border-indigo-800/60 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block">
                        {fin.extraAmount > 0 ? 'Total Previsto (Cachê + Extras)' : 'Cachê Contratado'}
                      </span>
                      <span className="text-lg font-black text-emerald-400 tabular-nums">
                        {formatCurrency(fin.totalPredicted)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 block">Quanto Falta Receber</span>
                      {fin.totalPending > 0 ? (
                        <span className="text-base font-black text-amber-300 tabular-nums">
                          {formatCurrency(fin.totalPending)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-xs font-black text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-2.5 py-0.5 rounded-lg">
                          <CheckCircle2 size={12} />
                          <span>100% Recebido</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* DEMAIS SHOWS FUTUROS NA SEQUÊNCIA */}
          {remainingUpcomingShows.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1">
                Apresentações Seguintes ({remainingUpcomingShows.length})
              </span>

              {remainingUpcomingShows.map(show => {
                const countdown = getDaysCountdownTag(show.date);
                const fin = getShowFinancialSummary(show, transactions);

                return (
                  <div
                    key={show.id}
                    onClick={() => onSelectShow(show)}
                    className="p-4 sm:p-5 rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-700 transition cursor-pointer space-y-3 shadow-xs active:scale-[0.99] group"
                  >
                    {/* Linha Superior: Data + Countdown + Valor & Falta Receber */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center space-x-1">
                          <Calendar size={13} />
                          <span className="capitalize">{formatDateShort(show.date)}</span>
                        </span>

                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                          <Clock size={12} className="text-indigo-600" />
                          <span>{show.time || '20:00'}{show.endTime ? ` — ${show.endTime}` : ''}</span>
                        </span>

                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${countdown.color}`}>
                          {countdown.label}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums block">
                          {formatCurrency(fin.totalPredicted)}
                        </span>
                        {fin.totalPending > 0 ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                            Falta: {formatCurrency(fin.totalPending)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                            100% Recebido
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contratante / Evento */}
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {show.contractorName || show.name}
                      </h4>
                      {show.eventType && (
                        <p className="text-[11px] text-slate-400 font-medium">
                          {show.eventType}
                        </p>
                      )}
                    </div>

                    {/* Cidade e Local */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
                      <div className="flex items-center space-x-1.5 truncate max-w-[240px]">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {show.city || 'Cidade a definir'}
                        </span>
                        {show.location && (
                          <span className="text-slate-400 truncate">
                            • {show.location}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-0.5 group-hover:translate-x-1 transition-transform">
                        <span>Ficha</span>
                        <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
