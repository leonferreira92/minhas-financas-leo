import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { Show, ShowStatus, Venue, MusicianCrewMember } from '../types';
import { 
  Music, Calendar as CalendarIcon, ListOrdered, FileText, 
  Archive, Plus, Sparkles, AlertTriangle, Bell, CheckCircle2, 
  ChevronRight, X, Clock, FilePlus, TrendingUp, DollarSign, 
  ArrowUpRight, ChevronLeft, Calculator, Building2, Users, 
  Car, Hammer, Layers, BarChart3
} from 'lucide-react';
import { PerformanceDashboard } from './career/PerformanceDashboard';
import { CalendarWithDrawer } from './career/CalendarWithDrawer';
import { ShowsManagementView } from './career/ShowsManagementView';
import { VenuesManagementView } from './career/VenuesManagementView';
import { CrewManagementView } from './career/CrewManagementView';
import { LocomotionModuleView } from './career/LocomotionModuleView';
import { GearAndCostsView } from './career/GearAndCostsView';
import { ShowQuotesView } from './shows/ShowQuotesView';
import { ShowDetailModal } from './shows/ShowDetailModal';
import { ShowFormModal } from './shows/ShowFormModal';
import { CachePricingCalculatorModal } from './shows/CachePricingCalculatorModal';
import { GoogleCalendarSyncModal } from './shows/GoogleCalendarSyncModal';
import { checkScheduleConflict } from './shows/conflictHelper';
import { generateShowSmartAlerts, ShowSmartAlert } from './shows/showAlertsHelper';
import { generateUUID } from '../services/uuidHelper';

export type CareerTab = 
  | 'performance' 
  | 'agenda' 
  | 'shows' 
  | 'locomocao' 
  | 'custos' 
  | 'equipe' 
  | 'locais' 
  | 'orcamentos';

export const MusicianShowScreen: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    shows, 
    transactions, 
    settings, 
    addShow, 
    updateShow, 
    deleteShow, 
    addTransaction 
  } = useFinance();

  const initialTabParam = searchParams.get('tab') as CareerTab;
  const [activeTab, setActiveTab] = useState<CareerTab>(initialTabParam || 'performance');

  // Modals & Drawer state
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [openPaymentDirectly, setOpenPaymentDirectly] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isGoogleCalendarOpen, setIsGoogleCalendarOpen] = useState(false);
  const [showToEdit, setShowToEdit] = useState<Show | null>(null);
  const [prefilledDateForNewShow, setPrefilledDateForNewShow] = useState<string | undefined>();
  const [initialStatusForNewShow, setInitialStatusForNewShow] = useState<ShowStatus>('Confirmado');
  const [prefilledVenueData, setPrefilledVenueData] = useState<{ location?: string; city?: string; totalCache?: number } | undefined>();
  
  // Smart Alerts toggle
  const [showAlertsExpanded, setShowAlertsExpanded] = useState(false);

  // Sync tab with URL search params if needed
  useEffect(() => {
    const tab = searchParams.get('tab') as CareerTab;
    if (tab && ['performance', 'agenda', 'shows', 'locomocao', 'custos', 'equipe', 'locais', 'orcamentos'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Deep-link from Financeiro/Extrato via ?showId=...
  useEffect(() => {
    const showId = searchParams.get('showId');
    if (showId) {
      setSelectedShowId(showId);
    }
  }, [searchParams]);

  // Selected Show
  const selectedShowForDetail = useMemo(() => {
    if (!selectedShowId) return null;
    return shows.find(s => s.id === selectedShowId) || null;
  }, [shows, selectedShowId]);

  // Compute smart alerts
  const smartAlerts = useMemo(() => {
    return generateShowSmartAlerts(shows);
  }, [shows]);

  // Pending quotes count
  const pendingQuotesCount = useMemo(() => {
    return shows.filter(
      s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação' || s.status === 'Agendado'
    ).length;
  }, [shows]);

  const handleOpenCreateModal = (date?: string, status: ShowStatus = 'Confirmado', venueData?: { location?: string; city?: string; totalCache?: number }) => {
    setShowToEdit(null);
    setPrefilledDateForNewShow(date);
    setInitialStatusForNewShow(status);
    setPrefilledVenueData(venueData);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (show: Show) => {
    setSelectedShowId(null);
    setShowToEdit(show);
    setPrefilledVenueData(undefined);
    setIsFormModalOpen(true);
  };

  const handleSaveShow = (showData: Partial<Show>, initialDepositTx?: any) => {
    if (showToEdit) {
      updateShow({
        ...showToEdit,
        ...showData
      } as Show);
    } else {
      const newShowId = `show_${generateUUID()}`;
      const finalShow: Show = {
        location: '',
        ...showData,
        id: newShowId,
        name: showData.name || showData.contractorName || 'Show',
        contractorName: showData.contractorName || showData.name || 'Show',
        date: showData.date || new Date().toISOString().slice(0, 10),
        time: showData.time || '20:00',
        totalCache: showData.totalCache || 0,
        status: showData.status || 'Confirmado',
        scope: 'BUSINESS',
        createdAt: Date.now()
      };

      if (initialDepositTx) {
        finalShow.payments = (finalShow.payments || []).map(p => ({
          ...p,
          transactionId: initialDepositTx.id
        }));
      }

      addShow(finalShow);

      if (initialDepositTx) {
        addTransaction({
          ...initialDepositTx,
          showId: newShowId
        });
      }
    }
  };

  const handleQuickUpdateStatus = (show: Show, newStatus: ShowStatus) => {
    updateShow({
      ...show,
      status: newStatus
    });
  };

  const handleConfirmQuote = (show: Show) => {
    const conflict = checkScheduleConflict(shows, show.date, show.time, show.endTime, show.id);
    if (conflict.hasConflict) {
      setSelectedShowId(show.id);
    } else {
      updateShow({
        ...show,
        status: 'Confirmado'
      });
    }
  };

  const handleAlertClick = (alert: ShowSmartAlert) => {
    if (alert.showId) {
      setSelectedShowId(alert.showId);
    }
  };

  // 8 ABAS DO MÓDULO EMPRESA / MÚSICO DEDICADO
  const careerTabs: { id: CareerTab; label: string; icon: any; badge?: number; badgeColor?: string }[] = [
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'agenda', label: 'Agenda & Drawer', icon: CalendarIcon },
    { id: 'shows', label: 'Shows & Fichas', icon: Music },
    { id: 'locomocao', label: 'Locomoção & KM', icon: Car },
    { id: 'custos', label: 'Custos da Música', icon: Hammer },
    { id: 'equipe', label: 'Músicos & Equipe', icon: Users },
    { id: 'locais', label: 'Locais & Bares', icon: Building2 },
    { 
      id: 'orcamentos', 
      label: 'Orçamentos', 
      icon: FileText,
      badge: pendingQuotesCount > 0 ? pendingQuotesCount : undefined,
      badgeColor: 'bg-amber-500 text-white'
    }
  ];

  return (
    <div className="space-y-5 animate-fade-in w-full max-w-full">
      
      {/* ========================================================================= */}
      {/* 1. HEADER EXCLUSIVO "SOU ARTISTA" / GESTÃO DE CARREIRA                    */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#1c122c] via-[#16131f] to-[#121214] p-4 sm:p-6 rounded-3xl border border-purple-500/30 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30 flex items-center space-x-1.5 shadow-sm">
                <Music size={11} />
                <span>Módulo Sou Artista • Gestão de Carreira</span>
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {settings.careerProjectName || settings.musicianArtisticName || 'Leo Ferreira • Carreira Musical'}
            </h1>
            <p className="text-xs text-zinc-400">
              Controle completo de cachês, equipe, logística, locomoção e lucratividade real.
            </p>
          </div>

          {/* BOTÕES DE AÇÃO RÁPIDA */}
          <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-2">
            <button
              onClick={() => setIsGoogleCalendarOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#1ed760] text-xs font-black uppercase tracking-wider transition active:scale-95 border border-emerald-500/30 flex items-center space-x-1.5 shadow-sm"
              title="Sincronizar Agenda com Google Calendar"
            >
              <CalendarIcon size={15} strokeWidth={2.5} />
              <span className="hidden sm:inline">Google Calendar</span>
            </button>

            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-black uppercase tracking-wider transition active:scale-95 border border-purple-500/30 flex items-center space-x-1.5"
              title="Calculadora Smart Cachê 360"
            >
              <Calculator size={15} strokeWidth={2.5} />
              <span className="hidden sm:inline">Calculadora Cachê</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal(undefined, 'Confirmado')}
              className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md shadow-purple-500/25 flex items-center space-x-1.5"
            >
              <Plus size={16} strokeWidth={3} />
              <span>Novo Show</span>
            </button>
          </div>
        </div>

        {/* ALERTAS INTELIGENTES (SE HOUVER CONFLITOS OU SHOWS PRÓXIMOS) */}
        {smartAlerts.length > 0 && (
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-900/60 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="font-bold text-zinc-200 truncate">
                {smartAlerts[0].title}: {smartAlerts[0].description}
              </span>
            </div>

            <button
              onClick={() => handleAlertClick(smartAlerts[0])}
              className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider shrink-0 transition ml-2"
            >
              Ver
            </button>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. BARRA DE NAVEGAÇÃO DE ABAS SUPERIORES LIMPAS (RESPONSIVA)              */}
      {/* ========================================================================= */}
      <div className="overflow-x-auto no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-2 min-w-max">
          {careerTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchParams({ tab: tab.id });
                }}
                className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black tracking-wide transition-all active:scale-95 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                    : 'bg-[#121214] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-purple-900 text-white' : tab.badgeColor || 'bg-amber-500 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO DINÂMICO DA ABA ATIVA DO MÓDULO SOU ARTISTA                   */}
      {/* ========================================================================= */}
      
      {/* ABA 1: PERFORMANCE DASHBOARD */}
      {activeTab === 'performance' && (
        <PerformanceDashboard
          shows={shows}
          transactions={transactions}
          onSelectShow={show => setSelectedShowId(show.id)}
          onOpenCreateShow={() => handleOpenCreateModal(undefined, 'Confirmado')}
        />
      )}

      {/* ABA 2: CALENDÁRIO COM GAVETA LATERAL (DRAWER) */}
      {activeTab === 'agenda' && (
        <CalendarWithDrawer
          shows={shows}
          onSelectShow={show => setSelectedShowId(show.id)}
          onOpenCreateShow={date => handleOpenCreateModal(date, 'Confirmado')}
        />
      )}

      {/* ABA 3: GESTÃO DETALHADA DE SHOWS & FICHAS */}
      {activeTab === 'shows' && (
        <ShowsManagementView
          shows={shows}
          onSelectShow={show => setSelectedShowId(show.id)}
          onOpenCreateShow={status => handleOpenCreateModal(undefined, status || 'Confirmado')}
        />
      )}

      {/* ABA 4: LOCOMOÇÃO (UBER, COMBUSTÍVEL & KM RODADO) */}
      {activeTab === 'locomocao' && (
        <LocomotionModuleView
          shows={shows}
          onOpenCreateShow={() => handleOpenCreateModal(undefined, 'Confirmado')}
        />
      )}

      {/* ABA 5: CUSTOS DA MÚSICA & EQUIPAMENTOS */}
      {activeTab === 'custos' && (
        <GearAndCostsView
          shows={shows}
        />
      )}

      {/* ABA 6: MÚSICOS & EQUIPE (FREELANCERS) */}
      {activeTab === 'equipe' && (
        <CrewManagementView />
      )}

      {/* ABA 7: LOCAIS & BARES */}
      {activeTab === 'locais' && (
        <VenuesManagementView
          onOpenCreateShowWithVenue={(venueName, address, city, defaultCache) => {
            handleOpenCreateModal(undefined, 'Confirmado', {
              location: address || venueName,
              city,
              totalCache: defaultCache
            });
          }}
        />
      )}

      {/* ABA 8: ORÇAMENTOS & COTAÇÕES */}
      {activeTab === 'orcamentos' && (
        <ShowQuotesView
          shows={shows}
          onSelectShow={show => setSelectedShowId(show.id)}
          onConfirmQuote={handleConfirmQuote}
          onOpenCreateModal={() => handleOpenCreateModal(undefined, 'Orçamento')}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER LATERAL: FICHA COMPLETA & LANÇAMENTOS DO SHOW              */}
      {/* ========================================================================= */}
      {selectedShowForDetail && (
        <ShowDetailModal
          show={selectedShowForDetail}
          openPaymentDirectly={openPaymentDirectly}
          onClose={() => {
            setSelectedShowId(null);
            setOpenPaymentDirectly(false);
          }}
          onEdit={show => handleOpenEditModal(show)}
          onDelete={showId => {
            deleteShow(showId, true);
            setSelectedShowId(null);
            setOpenPaymentDirectly(false);
          }}
          onUpdateStatus={handleQuickUpdateStatus}
        />
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DE SHOW */}
      <ShowFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setShowToEdit(null);
          setPrefilledDateForNewShow(undefined);
          setPrefilledVenueData(undefined);
        }}
        onSave={handleSaveShow}
        existingShow={showToEdit}
        existingShows={shows}
        prefilledDate={prefilledDateForNewShow}
        initialStatus={initialStatusForNewShow}
      />

      {/* FERRAMENTA: CALCULADORA DE PRECIFICAÇÃO DE CACHÊ SMART CACHÊ 360 */}
      <CachePricingCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onCreateQuote={(calculatedCache, contractorName, notes, date, location) => {
          setShowToEdit(null);
          setPrefilledDateForNewShow(date);
          setInitialStatusForNewShow('Orçamento');
          setPrefilledVenueData({
            location,
            totalCache: calculatedCache
          });
          setIsFormModalOpen(true);
        }}
      />

      {/* FERRAMENTA: SINCRONIZAÇÃO GOOGLE CALENDAR */}
      <GoogleCalendarSyncModal
        isOpen={isGoogleCalendarOpen}
        onClose={() => setIsGoogleCalendarOpen(false)}
        shows={shows}
        onUpdateShow={updateShow}
      />

    </div>
  );
};
