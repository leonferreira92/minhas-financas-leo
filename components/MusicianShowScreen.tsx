import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { Show, ShowStatus } from '../types';
import { 
  Calendar as CalendarIcon, ListOrdered, FileText, 
  Archive, Plus, Music, Sparkles, AlertTriangle, 
  Bell, CheckCircle2, ChevronRight, X, Clock, FilePlus
} from 'lucide-react';
import { ShowCalendarView } from './shows/ShowCalendarView';
import { UpcomingShowsList } from './shows/UpcomingShowsList';
import { ShowQuotesView } from './shows/ShowQuotesView';
import { ShowHistoryView } from './shows/ShowHistoryView';
import { ShowDetailModal } from './shows/ShowDetailModal';
import { ShowFormModal } from './shows/ShowFormModal';
import { checkScheduleConflict } from './shows/conflictHelper';
import { generateShowSmartAlerts, ShowSmartAlert } from './shows/showAlertsHelper';

export type ShowScreenTab = 'agenda' | 'upcoming' | 'quotes' | 'history';

export const MusicianShowScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { shows, addShow, updateShow, deleteShow } = useFinance();

  const [activeTab, setActiveTab] = useState<ShowScreenTab>('agenda');
  
  // Modals state
  const [selectedShowForDetail, setSelectedShowForDetail] = useState<Show | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [showToEdit, setShowToEdit] = useState<Show | null>(null);
  const [prefilledDateForNewShow, setPrefilledDateForNewShow] = useState<string | undefined>();
  const [initialStatusForNewShow, setInitialStatusForNewShow] = useState<ShowStatus>('Confirmado');
  
  // Smart Alerts toggle
  const [showAlertsExpanded, setShowAlertsExpanded] = useState(false);

  // Deep-link from Financeiro/Extrato via ?showId=...
  useEffect(() => {
    const showId = searchParams.get('showId');
    if (showId) {
      const found = shows.find(s => s.id === showId);
      if (found) {
        setSelectedShowForDetail(found);
      }
    }
  }, [searchParams, shows]);

  // Compute smart alerts
  const smartAlerts = useMemo(() => {
    return generateShowSmartAlerts(shows);
  }, [shows]);

  // Count pending quotes for tab badge
  const pendingQuotesCount = useMemo(() => {
    return shows.filter(
      s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado'
    ).length;
  }, [shows]);

  // Count upcoming confirmed shows
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const upcomingConfirmedCount = useMemo(() => {
    return shows.filter(s => s.status === 'Confirmado' && (s.date || '') >= todayStr).length;
  }, [shows, todayStr]);

  const handleOpenCreateModal = (date?: string, status: ShowStatus = 'Confirmado') => {
    setShowToEdit(null);
    setPrefilledDateForNewShow(date);
    setInitialStatusForNewShow(status);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (show: Show) => {
    setSelectedShowForDetail(null);
    setShowToEdit(show);
    setIsFormModalOpen(true);
  };

  const handleSaveShow = (showData: Partial<Show>) => {
    if (showToEdit) {
      updateShow({
        ...showToEdit,
        ...showData
      } as Show);
    } else {
      addShow(showData as any);
    }
  };

  const handleQuickUpdateStatus = (show: Show, newStatus: ShowStatus) => {
    updateShow({
      ...show,
      status: newStatus
    });
    if (selectedShowForDetail && selectedShowForDetail.id === show.id) {
      setSelectedShowForDetail({
        ...selectedShowForDetail,
        status: newStatus
      });
    }
  };

  const handleConfirmQuote = (show: Show) => {
    // Check if there is conflict on this date/time before confirming
    const conflict = checkScheduleConflict(shows, show.date, show.time, show.endTime, show.id);
    if (conflict.hasConflict) {
      // If there's a conflict, open detail to let the user review
      setSelectedShowForDetail(show);
    } else {
      updateShow({
        ...show,
        status: 'Confirmado'
      });
    }
  };

  const handleAlertClick = (alert: ShowSmartAlert) => {
    if (alert.showId) {
      const found = shows.find(s => s.id === alert.showId);
      if (found) {
        setSelectedShowForDetail(found);
      }
    }
  };

  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { 
      id: 'upcoming', 
      label: 'Próximos', 
      icon: ListOrdered, 
      badge: upcomingConfirmedCount > 0 ? upcomingConfirmedCount : undefined,
      badgeColor: 'bg-emerald-500 text-white'
    },
    { 
      id: 'quotes', 
      label: 'Orçamentos', 
      icon: FileText, 
      badge: pendingQuotesCount > 0 ? pendingQuotesCount : undefined,
      badgeColor: 'bg-amber-500 text-white'
    },
    { id: 'history', label: 'Histórico', icon: Archive }
  ];

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* 5. ACESSO RÁPIDO: HEADER PRINCIPAL COM AÇÕES DIRETAS (NOVO SHOW / NOVO ORÇAMENTO) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">
            Agenda Profissional
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Shows & Apresentações
          </h1>
        </div>

        {/* BOTÕES DE ACESSO RÁPIDO */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenCreateModal(undefined, 'Orçamento')}
            className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider transition active:scale-95 border border-amber-300/60 dark:border-amber-700/60 flex items-center space-x-1.5"
          >
            <FilePlus size={15} strokeWidth={2.5} />
            <span>Novo Orçamento</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal(undefined, 'Confirmado')}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md flex items-center space-x-1.5"
          >
            <Plus size={15} strokeWidth={3} />
            <span>Novo Show</span>
          </button>
        </div>
      </div>

      {/* 4. ALERTAS INTELIGENTES (CONFLITOS, PRÓXIMOS, RECEBIMENTOS, PENDÊNCIAS) */}
      {smartAlerts.length > 0 && (
        <div className="rounded-2xl bg-slate-900 text-white p-3.5 shadow-md border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAlertsExpanded(!showAlertsExpanded)}
              className="flex items-center space-x-2 text-left"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Bell size={13} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-white">
                    {smartAlerts.length} {smartAlerts.length === 1 ? 'Alerta Importante' : 'Alertas Importantes'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (clique para {showAlertsExpanded ? 'recolher' : 'expandir'})
                  </span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowAlertsExpanded(!showAlertsExpanded)}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg bg-slate-800"
            >
              {showAlertsExpanded ? 'Ocultar' : 'Ver Todos'}
            </button>
          </div>

          {/* Se colapsado, mostra apenas o primeiro alerta como teaser rápido */}
          {!showAlertsExpanded && smartAlerts[0] && (
            <div 
              onClick={() => handleAlertClick(smartAlerts[0])}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 cursor-pointer text-xs transition border border-slate-700/60"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  smartAlerts[0].severity === 'high' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                }`} />
                <span className="font-bold text-slate-200 truncate">{smartAlerts[0].title}</span>
                <span className="text-slate-400 text-[11px] truncate hidden sm:inline">{smartAlerts[0].description}</span>
              </div>
              <span className="text-[11px] font-bold text-indigo-400 shrink-0 ml-2 flex items-center space-x-0.5">
                <span>{smartAlerts[0].actionLabel || 'Ver'}</span>
                <ChevronRight size={12} />
              </span>
            </div>
          )}

          {/* Se expandido, lista todos os alertas */}
          {showAlertsExpanded && (
            <div className="space-y-1.5 pt-1">
              {smartAlerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 cursor-pointer transition border border-slate-700/80 flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        alert.severity === 'high' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                      }`} />
                      <span className="text-xs font-black text-white">{alert.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium pl-3.5">
                      {alert.description}
                    </p>
                  </div>

                  <button className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider shrink-0 transition">
                    {alert.actionLabel || 'Abrir'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. NAVEGAÇÃO RÁPIDA ENTRE AS 4 ABAS: AGENDA / PRÓXIMOS / ORÇAMENTOS / HISTÓRICO */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 border-b border-slate-200/80 dark:border-slate-800 pb-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ShowScreenTab)}
                className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-black tracking-wide transition-all active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-indigo-900 text-white' : tab.badgeColor || 'bg-amber-100 text-amber-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}

      {/* 1. AGENDA (CALENDÁRIO MENSAL + VISÃO DO DIA) */}
      {activeTab === 'agenda' && (
        <ShowCalendarView
          shows={shows}
          onSelectShow={show => setSelectedShowForDetail(show)}
          onOpenCreateModal={date => handleOpenCreateModal(date, 'Confirmado')}
        />
      )}

      {/* 2. PRÓXIMOS SHOWS (CRONOLÓGICO COM DESTAQUE) */}
      {activeTab === 'upcoming' && (
        <UpcomingShowsList
          shows={shows}
          onSelectShow={show => setSelectedShowForDetail(show)}
          onOpenCreateModal={() => handleOpenCreateModal(undefined, 'Confirmado')}
        />
      )}

      {/* 3. ORÇAMENTOS (OPORTUNIDADES EM NEGOCIAÇÃO) */}
      {activeTab === 'quotes' && (
        <ShowQuotesView
          shows={shows}
          onSelectShow={show => setSelectedShowForDetail(show)}
          onConfirmQuote={handleConfirmQuote}
          onOpenCreateModal={() => handleOpenCreateModal(undefined, 'Orçamento')}
        />
      )}

      {/* 4. HISTÓRICO (SHOWS REALIZADOS E CANCELADOS) */}
      {activeTab === 'history' && (
        <ShowHistoryView
          shows={shows}
          onSelectShow={show => setSelectedShowForDetail(show)}
        />
      )}

      {/* MODAL: DETALHES DO SHOW (FICHA EM 4 SEÇÕES COM GESTÃO FINANCEIRA) */}
      {selectedShowForDetail && (
        <ShowDetailModal
          show={selectedShowForDetail}
          onClose={() => setSelectedShowForDetail(null)}
          onEdit={show => handleOpenEditModal(show)}
          onDelete={showId => deleteShow(showId, true)}
          onUpdateStatus={handleQuickUpdateStatus}
        />
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DO SHOW COM VERIFICAÇÃO DE CONFLITO */}
      <ShowFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setShowToEdit(null);
          setPrefilledDateForNewShow(undefined);
        }}
        onSave={handleSaveShow}
        existingShow={showToEdit}
        existingShows={shows}
        prefilledDate={prefilledDateForNewShow}
        initialStatus={initialStatusForNewShow}
      />
    </div>
  );
};
