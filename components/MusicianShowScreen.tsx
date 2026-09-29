import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Show, ShowStatus } from '../types';
import { 
  Calendar as CalendarIcon, ListOrdered, FileText, 
  Archive, Plus, Music, Sparkles 
} from 'lucide-react';
import { ShowCalendarView } from './shows/ShowCalendarView';
import { UpcomingShowsList } from './shows/UpcomingShowsList';
import { ShowQuotesView } from './shows/ShowQuotesView';
import { ShowHistoryView } from './shows/ShowHistoryView';
import { ShowDetailModal } from './shows/ShowDetailModal';
import { ShowFormModal } from './shows/ShowFormModal';
import { checkScheduleConflict } from './shows/conflictHelper';

export type ShowScreenTab = 'agenda' | 'upcoming' | 'quotes' | 'history';

export const MusicianShowScreen: React.FC = () => {
  const { shows, addShow, updateShow, deleteShow } = useFinance();

  const [activeTab, setActiveTab] = useState<ShowScreenTab>('agenda');
  
  // Modals state
  const [selectedShowForDetail, setSelectedShowForDetail] = useState<Show | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [showToEdit, setShowToEdit] = useState<Show | null>(null);
  const [prefilledDateForNewShow, setPrefilledDateForNewShow] = useState<string | undefined>();

  // Count pending quotes for tab badge
  const pendingQuotesCount = shows.filter(
    s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado'
  ).length;

  const handleOpenCreateModal = (date?: string) => {
    setShowToEdit(null);
    setPrefilledDateForNewShow(date);
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

  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon },
    { id: 'upcoming', label: 'Próximos', icon: ListOrdered },
    { id: 'quotes', label: 'Orçamentos', icon: FileText, badge: pendingQuotesCount > 0 ? pendingQuotesCount : undefined },
    { id: 'history', label: 'Histórico', icon: Archive }
  ];

  return (
    <div className="space-y-5 pb-20 animate-fade-in">
      {/* HEADER PRINCIPAL */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">
            Agenda Profissional
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Shows & Eventos
          </h1>
        </div>

        <button
          onClick={() => handleOpenCreateModal()}
          className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md flex items-center space-x-1"
        >
          <Plus size={15} strokeWidth={3} />
          <span>Novo Show</span>
        </button>
      </div>

      {/* NAVEGAÇÃO ENTRE ABAS DO MÓDULO (AGENDA / PRÓXIMOS / ORÇAMENTOS / HISTÓRICO) */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 border-b border-slate-200/80 dark:border-slate-800 pb-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ShowScreenTab)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-indigo-800 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
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

      {/* 1. AGENDA (CALENDÁRIO MENSAL) */}
      {activeTab === 'agenda' && (
        <ShowCalendarView
          shows={shows}
          onSelectShow={show => setSelectedShowForDetail(show)}
          onOpenCreateModal={date => handleOpenCreateModal(date)}
        />
      )}

      {/* 2. PRÓXIMOS SHOWS (LISTA CRONOLÓGICA) */}
      {activeTab === 'upcoming' && (
        <UpcomingShowsList
          shows={shows}
          onSelectShow={show => setSelectedShowForDetail(show)}
          onOpenCreateModal={() => handleOpenCreateModal()}
        />
      )}

      {/* 3. ORÇAMENTOS (OPORTUNIDADES EM NEGOCIAÇÃO) */}
      {activeTab === 'quotes' && (
        <ShowQuotesView
          shows={shows}
          onSelectShow={show => setSelectedShowForDetail(show)}
          onConfirmQuote={handleConfirmQuote}
          onOpenCreateModal={() => handleOpenCreateModal()}
        />
      )}

      {/* 4. HISTÓRICO (SHOWS REALIZADOS E CANCELADOS) */}
      {activeTab === 'history' && (
        <ShowHistoryView
          shows={shows}
          onSelectShow={show => setSelectedShowForDetail(show)}
        />
      )}

      {/* MODAL: DETALHES DO SHOW (FICHA EM 4 SEÇÕES) */}
      <ShowDetailModal
        show={selectedShowForDetail}
        onClose={() => setSelectedShowForDetail(null)}
        onEdit={show => handleOpenEditModal(show)}
        onDelete={showId => deleteShow(showId)}
        onUpdateStatus={handleQuickUpdateStatus}
      />

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
      />
    </div>
  );
};
