import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, Bot, FileSpreadsheet, Activity, 
  Calendar as CalendarIcon, Download, Sparkles 
} from 'lucide-react';
import { AIReportScreen } from './AIReportScreen';
import { FinancialSummary } from './FinancialSummary';
import { MonthlyFlow } from './MonthlyFlow';
import { CalendarScreen } from './CalendarScreen';

export type ReportTab = 'ai' | 'summary' | 'flow' | 'calendar';

interface Props {
  initialTab?: ReportTab;
}

export const ReportsHubScreen: React.FC<Props> = ({ initialTab = 'ai' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as ReportTab) || initialTab;
  const [activeTab, setActiveTab] = useState<ReportTab>(tabParam);

  useEffect(() => {
    if (searchParams.get('tab') && searchParams.get('tab') !== activeTab) {
      setActiveTab(searchParams.get('tab') as ReportTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'ai', label: 'Relatório para IA', icon: Bot, badge: 'Destaque' },
    { id: 'summary', label: 'Balanço Mensal', icon: FileSpreadsheet },
    { id: 'flow', label: 'Fluxo Realizado/Projetado', icon: Activity },
    { id: 'calendar', label: 'Agenda & Calendário', icon: CalendarIcon }
  ];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-100 dark:border-purple-900/50">
            Relatórios & Exportações
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Relatórios
          </h1>
        </div>
      </div>

      {/* SUB-MENU DE ABAS ROLÁVEL */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 border-b border-slate-200/80 dark:border-slate-800 pb-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as ReportTab)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider ${
                    isActive ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div>
        {activeTab === 'ai' && <AIReportScreen />}
        {activeTab === 'summary' && <FinancialSummary />}
        {activeTab === 'flow' && <MonthlyFlow />}
        {activeTab === 'calendar' && <CalendarScreen />}
      </div>
    </div>
  );
};
