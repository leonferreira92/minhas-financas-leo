import React, { useMemo } from 'react';
import { Show } from '../../types';
import { 
  Calendar, Clock, MapPin, DollarSign, ChevronRight, 
  Sparkles, CheckCircle2, Music, Plus 
} from 'lucide-react';
import { getStatusConfig } from './types';

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
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter shows: future date, and only active ones (not Realizado, not Cancelado)
  const upcomingShows = useMemo(() => {
    return shows
      .filter(s => {
        const isNotFinished = s.status !== 'Realizado' && s.status !== 'Cancelado';
        const isFutureOrToday = s.date >= todayStr;
        return isNotFinished && isFutureOrToday;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [shows, todayStr]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDateLabel = (dStr: string) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const getDaysCountdownTag = (dStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dStr + 'T12:00:00');
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return { label: 'Hoje', color: 'bg-rose-500/10 text-rose-600 border-rose-200' };
    if (diff === 1) return { label: 'Amanhã', color: 'bg-amber-500/10 text-amber-600 border-amber-200' };
    return { label: `Em ${diff} dias`, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Summary */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
            Compromissos Agendados
          </span>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {upcomingShows.length} {upcomingShows.length === 1 ? 'Show Futuro' : 'Shows Futuros'}
          </h3>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-3 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-sm flex items-center space-x-1"
        >
          <Plus size={14} strokeWidth={3} />
          <span>Novo Show</span>
        </button>
      </div>

      {upcomingShows.length === 0 ? (
        <div className="p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Music size={24} />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-white">Nenhum próximo show confirmado</h4>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Todos os seus shows futuros aparecerão aqui organizados em ordem cronológica com horários e cidades.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="mt-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1 transition shadow-sm"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Cadastrar Apresentação</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingShows.map(show => {
            const statusCfg = getStatusConfig(show.status);
            const countdown = getDaysCountdownTag(show.date);

            return (
              <div
                key={show.id}
                onClick={() => onSelectShow(show)}
                className="p-4 rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition cursor-pointer space-y-3 shadow-xs active:scale-[0.99] group"
              >
                {/* Header: Status + Countdown + Cachê */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusCfg.badgeClass}`}>
                      {show.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${countdown.color}`}>
                      {countdown.label}
                    </span>
                  </div>

                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(show.totalCache)}
                  </span>
                </div>

                {/* Event Name & Contractor */}
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {show.contractorName || show.name}
                  </h4>
                  {show.eventType && (
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {show.eventType}
                    </p>
                  )}
                </div>

                {/* Date, Time, City */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <Calendar size={13} className="text-indigo-600 shrink-0" />
                    <span className="capitalize">{formatDateLabel(show.date)}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Clock size={13} className="text-indigo-600 shrink-0" />
                    <span>{show.time || '20:00'} {show.endTime ? `às ${show.endTime}` : ''}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 col-span-2">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">
                      {show.city ? `${show.city}` : ''} {show.location ? `• ${show.location}` : 'Local a definir'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
