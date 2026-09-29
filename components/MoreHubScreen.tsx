import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sliders, FolderTree, Settings as SettingsIcon, Bell, 
  ShieldCheck, HelpCircle, Layers, ChevronRight 
} from 'lucide-react';
import { FinancialSettingsScreen } from './FinancialSettingsScreen';
import { CategoryList } from './CategoryList';
import { Settings } from './Settings';
import { AlertsScreen } from './AlertsScreen';

export type MoreTab = 'financial' | 'categories' | 'settings' | 'alerts';

interface Props {
  initialTab?: MoreTab;
}

export const MoreHubScreen: React.FC<Props> = ({ initialTab = 'financial' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') as MoreTab) || initialTab;
  const [activeTab, setActiveTab] = useState<MoreTab>(tabParam);

  useEffect(() => {
    if (searchParams.get('tab') && searchParams.get('tab') !== activeTab) {
      setActiveTab(searchParams.get('tab') as MoreTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: MoreTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'financial', label: 'Parâmetros Financeiros', icon: Sliders, desc: 'Reserva mínima e tipos' },
    { id: 'categories', label: 'Categorias', icon: FolderTree, desc: 'Grupos e cores' },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon, desc: 'Backup e sistema' },
    { id: 'alerts', label: 'Alertas', icon: Bell, desc: 'Avisos e pendências' }
  ];

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Ajustes & Mais
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Mais
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
                onClick={() => handleTabChange(tab.id as MoreTab)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO */}
      <div>
        {activeTab === 'financial' && <FinancialSettingsScreen />}
        {activeTab === 'categories' && <CategoryList />}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'alerts' && <AlertsScreen />}
      </div>
    </div>
  );
};
