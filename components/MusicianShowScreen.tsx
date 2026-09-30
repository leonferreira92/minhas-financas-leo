import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { Show, ShowStatus } from '../types';
import { 
  Calendar as CalendarIcon, ListOrdered, FileText, 
  Archive, Plus, Music, Sparkles, AlertTriangle, 
  Bell, CheckCircle2, ChevronRight, X, Clock, FilePlus,
  TrendingUp, DollarSign, ArrowUpRight, ChevronLeft, Calendar
} from 'lucide-react';
import { ShowCalendarView } from './shows/ShowCalendarView';
import { UpcomingShowsList } from './shows/UpcomingShowsList';
import { ShowQuotesView } from './shows/ShowQuotesView';
import { ShowHistoryView } from './shows/ShowHistoryView';
import { ShowDetailModal } from './shows/ShowDetailModal';
import { ShowFormModal } from './shows/ShowFormModal';
import { checkScheduleConflict } from './shows/conflictHelper';
import { generateShowSmartAlerts, ShowSmartAlert } from './shows/showAlertsHelper';
import { getShowFinancialSummary } from '../services/showFinanceSyncService';

export type ShowScreenTab = 'agenda' | 'upcoming' | 'quotes' | 'history';

export const MusicianShowScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { shows, transactions, addShow, updateShow, deleteShow } = useFinance();

  const [activeTab, setActiveTab] = useState<ShowScreenTab>('agenda');
  
  // Modals & Drawer state
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [showToEdit, setShowToEdit] = useState<Show | null>(null);
  const [prefilledDateForNewShow, setPrefilledDateForNewShow] = useState<string | undefined>();
  const [initialStatusForNewShow, setInitialStatusForNewShow] = useState<ShowStatus>('Confirmado');
  
  // Smart Alerts toggle
  const [showAlertsExpanded, setShowAlertsExpanded] = useState(false);

  // Month navigation for Monthly Metrics Dashboard
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth(); // 0-indexed
  const selectedMonthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const monthLabel = useMemo(() => {
    return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(selectedYear, selectedMonth + 1, 1));
  };

  const handleGoCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Derive active selected show reactively from context
  const selectedShowForDetail = useMemo(() => {
    if (!selectedShowId) return null;
    return shows.find(s => s.id === selectedShowId) || null;
  }, [shows, selectedShowId]);

  // Deep-link from Financeiro/Extrato via ?showId=...
  useEffect(() => {
    const showId = searchParams.get('showId');
    if (showId) {
      setSelectedShowId(showId);
    }
  }, [searchParams]);

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

  const getDeviceToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => getDeviceToday(), []);
  
  const upcomingConfirmedCount = useMemo(() => {
    return shows.filter(s => s.status === 'Confirmado' && (s.date || '') >= todayStr).length;
  }, [shows, todayStr]);

  // =========================================================================
  // 2. MÉTRICAS E DASHBOARD DO MÊS SELECIONADO (CONFORME REGRAS DE NEGÓCIO)
  // =========================================================================
  const monthlyMetrics = useMemo(() => {
    const monthShows = shows.filter(s => s.date && s.date.startsWith(selectedMonthPrefix));

    // Shows Realizados / Concluídos no mês
    const isCompletedStatus = (st?: string) => {
      if (!st) return false;
      const lower = st.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return lower === 'realizado' || lower === 'concluido';
    };

    const completedShows = monthShows.filter(s => isCompletedStatus(s.status));
    const confirmedShows = monthShows.filter(s => s.status === 'Confirmado');

    // 1. Apresentações Realizadas: Conta todos os shows do mês onde status == 'realizado' OU 'concluido'
    const completedCount = completedShows.length;

    // 2. Faturamento do Mês (Regime de Caixa / Entradas Reais no Mês)
    const monthIncomeTxs = transactions.filter(t => {
      if (!t.date || !t.date.startsWith(selectedMonthPrefix)) return false;
      if (t.type !== 'income' || t.status !== 'paid') return false;
      const desc = (t.description || '').toLowerCase();
      if (desc.includes('recebimento de pró-labore') || desc.includes('recebimento de pro-labore')) return false;

      return (
        t.scope === 'BUSINESS' ||
        t.categoryId === 'cat_33' ||
        !!t.showId ||
        desc.includes('cachê') ||
        desc.includes('cache') ||
        desc.includes('show')
      );
    });
    const cashInflowsMonth = monthIncomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // 3. Faturamento Bruto Contratado dos Shows Realizados no mês
    const monthlyGrossRevenue = completedShows.reduce((sum, s) => {
      const fin = getShowFinancialSummary(s, transactions);
      return sum + fin.totalPredicted;
    }, 0);

    // 4. A Receber (Shows Realizados): Soma o saldo restante dos shows já realizados no mês que ainda não foram 100% quitados
    const pendingToReceiveRealizados = completedShows.reduce((sum, s) => {
      const fin = getShowFinancialSummary(s, transactions);
      return sum + fin.totalPending;
    }, 0);

    // 5. Recebido Efetivo dos Shows Realizados
    const totalReceivedRealizados = completedShows.reduce((sum, s) => {
      const fin = getShowFinancialSummary(s, transactions);
      return sum + fin.totalReceived;
    }, 0);

    // 6. Shows Confirmados / Projetado no mês
    const confirmedRevenue = confirmedShows.reduce((sum, s) => {
      const fin = getShowFinancialSummary(s, transactions);
      return sum + fin.totalPredicted;
    }, 0);

    return {
      completedCount,
      cashInflowsMonth: Math.round(cashInflowsMonth * 100) / 100,
      monthlyGrossRevenue: Math.round(monthlyGrossRevenue * 100) / 100,
      pendingToReceiveRealizados: Math.round(pendingToReceiveRealizados * 100) / 100,
      totalReceivedRealizados: Math.round(totalReceivedRealizados * 100) / 100,
      confirmedCount: confirmedShows.length,
      confirmedRevenue: Math.round(confirmedRevenue * 100) / 100
    };
  }, [shows, transactions, selectedMonthPrefix]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleOpenCreateModal = (date?: string, status: ShowStatus = 'Confirmado') => {
    setShowToEdit(null);
    setPrefilledDateForNewShow(date);
    setInitialStatusForNewShow(status);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (show: Show) => {
    setSelectedShowId(null);
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
    <div className="space-y-4 pb-20 animate-fade-in max-w-full">
      {/* 1. HEADER PRINCIPAL COM AÇÕES DIRETAS (NOVO SHOW / NOVO ORÇAMENTO) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-100 dark:border-purple-900/50 flex items-center space-x-1">
              <Music size={11} className="mr-1 inline" /> Gestão de Carreira
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Agenda & Financeiro de Shows
          </h1>
        </div>

        {/* BOTÕES DE ACESSO RÁPIDO */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenCreateModal(undefined, 'Orçamento')}
            className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-black uppercase tracking-wider transition active:scale-95 border border-amber-300/60 dark:border-amber-700/60 flex items-center space-x-1.5"
          >
            <FilePlus size={15} strokeWidth={2.5} />
            <span>Novo Orçamento</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal(undefined, 'Confirmado')}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md shadow-purple-500/20 flex items-center space-x-1.5"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Novo Show</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DASHBOARD & MÉTRICAS DO MÊS (APRESENTAÇÕES, FATURAMENTO, A RECEBER) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        {/* Barra de Navegação do Mês */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Desempenho em
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize tracking-tight">
              {monthLabel}
            </h2>
            <button
              onClick={handleGoCurrentMonth}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-wider transition active:scale-95"
            >
              Mês Atual
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

        {/* 3 KPI Cards Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* KPI 1: Apresentações Realizadas */}
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Apresentações Realizadas
              </span>
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Music size={14} />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-black text-purple-900 dark:text-purple-100">
                {monthlyMetrics.completedCount}
              </span>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                {monthlyMetrics.completedCount === 1 ? 'show concluído' : 'shows concluídos'}
              </span>
            </div>
            <p className="text-[10px] text-purple-500/80 dark:text-purple-400/70 font-medium">
              Eventos com status Realizado no mês
            </p>
          </div>

          {/* KPI 2: Faturamento do Mês (Entradas Reais / Regime de Caixa) */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Faturamento do Mês
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign size={14} />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(monthlyMetrics.cashInflowsMonth)}
              </span>
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 font-medium">
              Entradas reais de Pix/Cachês em {monthLabel}
            </p>
          </div>

          {/* KPI 3: A Receber (Shows Realizados) */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                A Receber (Shows Realizados)
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock size={14} />
              </div>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className={`text-2xl font-black tabular-nums ${
                monthlyMetrics.pendingToReceiveRealizados > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
              }`}>
                {formatCurrency(monthlyMetrics.pendingToReceiveRealizados)}
              </span>
            </div>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/70 font-medium">
              {monthlyMetrics.pendingToReceiveRealizados === 0 
                ? '✓ 100% dos shows realizados já quitados' 
                : 'Saldo restante pendente de quitação'}
            </p>
          </div>

        </div>
      </div>

      {/* 4. ALERTAS INTELIGENTES (CONFLITOS, PRÓXIMOS, RECEBIMENTOS) */}
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

      {/* 5. NAVEGAÇÃO ENTRE AS 4 ABAS: AGENDA / PRÓXIMOS / ORÇAMENTOS / HISTÓRICO */}
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
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-purple-900 text-white' : tab.badgeColor || 'bg-amber-100 text-amber-700'
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
          onSelectShow={show => setSelectedShowId(show.id)}
          onOpenCreateModal={date => handleOpenCreateModal(date, 'Confirmado')}
        />
      )}

      {/* 2. PRÓXIMOS SHOWS (CRONOLÓGICO COM BARRA DE PROGRESSO) */}
      {activeTab === 'upcoming' && (
        <UpcomingShowsList
          shows={shows}
          onSelectShow={show => setSelectedShowId(show.id)}
          onOpenCreateModal={() => handleOpenCreateModal(undefined, 'Confirmado')}
        />
      )}

      {/* 3. ORÇAMENTOS (OPORTUNIDADES EM NEGOCIAÇÃO) */}
      {activeTab === 'quotes' && (
        <ShowQuotesView
          shows={shows}
          onSelectShow={show => setSelectedShowId(show.id)}
          onConfirmQuote={handleConfirmQuote}
          onOpenCreateModal={() => handleOpenCreateModal(undefined, 'Orçamento')}
        />
      )}

      {/* 4. HISTÓRICO (SHOWS REALIZADOS E CANCELADOS) */}
      {activeTab === 'history' && (
        <ShowHistoryView
          shows={shows}
          onSelectShow={show => setSelectedShowId(show.id)}
        />
      )}

      {/* DRAWER LATERAL / SLIDE-OVER: DETALHES DO SHOW & GESTÃO FINANCEIRA */}
      {selectedShowForDetail && (
        <ShowDetailModal
          show={selectedShowForDetail}
          onClose={() => setSelectedShowId(null)}
          onEdit={show => handleOpenEditModal(show)}
          onDelete={showId => {
            deleteShow(showId, true);
            setSelectedShowId(null);
          }}
          onUpdateStatus={handleQuickUpdateStatus}
        />
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DO SHOW */}
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
