import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  FileSpreadsheet,
  Activity,
  Calendar as CalendarIcon,
} from "lucide-react";
import { AIReportScreen } from "./AIReportScreen";
import { FinancialSummary } from "./FinancialSummary";
import { MonthlyFlow } from "./MonthlyFlow";
import { CalendarScreen } from "./CalendarScreen";

export type ReportTab = "ai" | "summary" | "flow" | "calendar";

interface Props {
  initialTab?: ReportTab;
}

export const ReportsHubScreen: React.FC<Props> = ({ initialTab = "ai" }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get("tab") as ReportTab) || initialTab;
  const [activeTab, setActiveTab] = useState<ReportTab>(tabParam);

  useEffect(() => {
    if (searchParams.get("tab") && searchParams.get("tab") !== activeTab) {
      setActiveTab(searchParams.get("tab") as ReportTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs = [
    { id: "ai", label: "Relatório IA", icon: Bot, badge: "IA" },
    { id: "summary", label: "Balanço", icon: FileSpreadsheet },
    { id: "flow", label: "Fluxo", icon: Activity },
    { id: "calendar", label: "Calendário", icon: CalendarIcon },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-5 pb-20 animate-fade-in ">
      <div className="flex flex-col gap-3 pt-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F388A] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Finanças pessoais
          </span>
          <h1 className="text-xl font-black text-slate-900 mt-1.5 tracking-tight">
            Relatórios
          </h1>
          <p className="text-[11px] text-slate-600 font-medium mt-0.5">
            Diagnóstico, balanço, fluxo e calendário do seu caixa
          </p>
        </div>

        {/* Sub-header de abas: scroll horizontal sem colidir com navbar */}
        <div className="w-full overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          <div
            className="inline-flex min-w-full sm:min-w-0 gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm"
            role="tablist"
            aria-label="Tipos de relatório"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id as ReportTab)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 whitespace-nowrap shrink-0 ${
                    isActive
                      ? "bg-[#0F388A] text-yellow-400 shadow-sm"
                      : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        isActive
                          ? "bg-[#0A255D] text-yellow-400"
                          : "bg-amber-50 text-amber-800 border border-amber-100"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="w-full min-w-0">
        {activeTab === "ai" && <AIReportScreen />}
        {activeTab === "summary" && <FinancialSummary />}
        {activeTab === "flow" && <MonthlyFlow />}
        {activeTab === "calendar" && <CalendarScreen />}
      </div>
    </div>
  );
};
