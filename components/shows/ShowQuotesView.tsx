import React, { useMemo } from 'react';
import { Show, ShowStatus } from '../../types';
import { 
  FileText, Calendar, Clock, MapPin, DollarSign, 
  Check, ChevronRight, Plus, Sparkles, AlertCircle 
} from 'lucide-react';
import { getStatusConfig } from './types';

interface Props {
  shows: Show[];
  onSelectShow: (show: Show) => void;
  onConfirmQuote: (show: Show) => void;
  onOpenCreateModal: () => void;
}

export const ShowQuotesView: React.FC<Props> = ({
  shows,
  onSelectShow,
  onConfirmQuote,
  onOpenCreateModal
}) => {
  // Filter for unconfirmed quotes/opportunities
  const quotes = useMemo(() => {
    const safeShows = Array.isArray(shows) ? shows : [];
    return safeShows
      .filter(s => s && (s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado'))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [shows]);

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
          return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
      const dt = new Date(String(dStr));
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {}
    return String(dStr || '');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 block">
            Oportunidades em Negociação
          </span>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {quotes.length} {quotes.length === 1 ? 'Orçamento Pendente' : 'Orçamentos Pendentes'}
          </h3>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="px-3 py-2 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-sm flex items-center space-x-1"
        >
          <Plus size={14} strokeWidth={3} />
          <span>Novo Orçamento</span>
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center mx-auto">
            <FileText size={24} />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-white">Nenhum orçamento pendente</h4>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Cadastre propostas e orçamentos para acompanhar oportunidades antes de fechar a data oficial.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="mt-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider inline-flex items-center space-x-1 transition shadow-sm"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Criar Orçamento</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(show => {
            const statusCfg = getStatusConfig(show.status);

            return (
              <div
                key={show.id}
                onClick={() => onSelectShow(show)}
                className="p-4 rounded-[1.8rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700/60 transition cursor-pointer space-y-3 shadow-xs active:scale-[0.99] group"
              >
                {/* Header: Status + Cachê Proposto */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${statusCfg.badgeClass}`}>
                    {show.status}
                  </span>

                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(show.totalCache ?? show.cacheCombined ?? 0)}
                  </span>
                </div>

                {/* Contratante & Evento */}
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {show.contractorName || show.name}
                  </h4>
                  {show.eventType && (
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {show.eventType}
                    </p>
                  )}
                </div>

                {/* Data e Cidade */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center space-x-1.5">
                    <Calendar size={13} className="text-sky-600 shrink-0" />
                    <span className="capitalize">{formatDateLabel(show.date)}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{show.city || show.location || 'Cidade a definir'}</span>
                  </div>
                </div>

                {/* BOTÃO DE AÇÃO DIRETA: CONFIRMAR SHOW (TRANSFORMA ORÇAMENTO EM CONFIRMADO) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Proposta pronta para fechar?
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirmQuote(show);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm flex items-center space-x-1.5"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Confirmar Show</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
