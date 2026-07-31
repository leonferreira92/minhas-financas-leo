import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { GeminiService } from '../services/geminiService';
import { 
  Sparkles, Bot, TrendingDown, Lightbulb, 
  Utensils, Car, ShoppingBag, PiggyBank, Target, 
  Activity, ShieldCheck, Flame, Thermometer,
  ShoppingCart, GraduationCap, PawPrint, Dumbbell, 
  Stethoscope, Tv, Gamepad2, Coins, Bus, Pizza, 
  Scissors, Microscope, AlertTriangle, Heart, TrendingUp,
  ChevronRight, X, Check, ArrowRightLeft,
  Calendar, Edit3, Trash2, Clock, CheckCircle, Info
} from 'lucide-react';
import { 
  AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts';
import { ICON_MAP, getIcon, parseCurrencyInput } from '../constants';
import { Transaction } from '../types';
import { TransactionForm } from './TransactionForm';

const AI_ICON_MAP: any = { 
  ...ICON_MAP,
  Utensils, Car, ShoppingBag, PiggyBank, Target, Lightbulb, TrendingDown,
  ShoppingCart, GraduationCap, PawPrint, Dumbbell, Stethoscope, Tv, Gamepad2,
  Coins, Bus, Pizza, Scissors
};

interface AITip {
  title: string;
  description: string;
  impact: 'Baixo' | 'Médio' | 'Alto';
  icon: string;
}

export const FinancialInsights = () => {
  const { 
    transactions, 
    categories, 
    debts, 
    accounts,
    getDebtProgress, 
    updateCategory,
    addTransaction,
    deleteTransaction
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'diagnose' | 'suggestions' | 'fixed'>('diagnose');
  const [tips, setTips] = useState<AITip[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [hasLoadedTips, setHasLoadedTips] = useState(false);
  
  // State para o Modal de Detalhes da Classificação
  const [selectedClassification, setSelectedClassification] = useState<'essential' | 'personal' | 'future' | null>(null);

  // Suggestions state
  const [analysisTargetMonth, setAnalysisTargetMonth] = useState<'current' | 'next'>('next');
  const [selectedSuggestionToCreate, setSelectedSuggestionToCreate] = useState<string | null>(null);
  const [suggestionAmount, setSuggestionAmount] = useState<string>('');
  const [suggestionDate, setSuggestionDate] = useState<string>('');
  const [suggestionAccount, setSuggestionAccount] = useState<string>('');
  const [ignoredSuggestions, setIgnoredSuggestions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ignoredSuggestions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Fixed expenses states
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransactionInfo, setDeletingTransactionInfo] = useState<{ id: string; hasSeries: boolean } | null>(null);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- CORE ANALYTICS ENGINE ---
  const analysis = useMemo(() => {
    if (transactions.length === 0) return null;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthlyTxs = transactions.filter(t => t.date.startsWith(currentMonth));
    
    if (monthlyTxs.length === 0) return null;

    const monthlyExpenses = monthlyTxs.filter(t => t.type === 'expense');
    const monthlyIncomes = monthlyTxs.filter(t => t.type === 'income');

    const totalExpense = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = monthlyIncomes.reduce((sum, t) => sum + t.amount, 0);

    const catMap: Record<string, number> = {};
    monthlyExpenses.forEach(t => {
      catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
    });

    const categoryList = Object.entries(catMap)
      .map(([id, value]) => {
        const cat = categories.find(c => c.id === id);
        return {
          id,
          name: cat?.name || 'Outros',
          value,
          color: cat?.color || '#cbd5e1',
          icon: cat?.icon || 'DollarSign',
          classification: cat?.classification || 'personal',
          originalCategory: cat // Referência para update
        };
      })
      .sort((a, b) => b.value - a.value);

    const classificationTotals = {
      essential: categoryList.filter(c => c.classification === 'essential').reduce((s, c) => s + c.value, 0),
      personal: categoryList.filter(c => c.classification === 'personal').reduce((s, c) => s + c.value, 0),
      future: categoryList.filter(c => c.classification === 'future').reduce((s, c) => s + c.value, 0)
    };

    const safeIncome = totalIncome > 0 ? totalIncome : 1; 
    
    const margin = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (margin / totalIncome) : (totalExpense > 0 ? -1 : 0);
    const sScore = Math.min(100, Math.max(0, (savingsRate + 0.1) * 100)); 

    const essentialRatio = classificationTotals.essential / safeIncome;
    const eScore = totalIncome === 0 && classificationTotals.essential > 0 
       ? 0 
       : Math.min(100, Math.max(0, (0.6 - essentialRatio + 0.5) * 100)); 

    const debtScore = debts.length > 0 
      ? (debts.reduce((s, d) => s + getDebtProgress(d.id).progress, 0) / debts.length)
      : 100;

    const flowScore = margin >= 0 ? 100 : 0;

    const rawScore = (sScore * 0.4) + (eScore * 0.3) + (debtScore * 0.2) + (flowScore * 0.1);
    const finalScore = Math.round(Math.min(100, Math.max(0, rawScore)));

    const symptoms = [];
    if (totalIncome === 0 && totalExpense > 0) symptoms.push({ label: 'Falta de Receita', type: 'danger', icon: AlertTriangle, text: 'Você registrou gastos mas nenhuma entrada este mês.' });
    else {
        if (essentialRatio > 0.6) symptoms.push({ label: 'Custo Fixo Alto', type: 'warning', icon: Thermometer, text: 'Custos essenciais consomem +60% da renda.' });
        if (classificationTotals.personal > classificationTotals.essential) symptoms.push({ label: 'Desequilíbrio de Lazer', type: 'warning', icon: Pizza, text: 'Gastos pessoais superam os essenciais.' });
        if (margin < 0) symptoms.push({ label: 'Déficit Mensal', type: 'danger', icon: Flame, text: 'Você gastou mais do que recebeu.' });
        if (classificationTotals.future === 0 && totalIncome > 0 && margin > 0) symptoms.push({ label: 'Dinheiro Parado', type: 'info', icon: PiggyBank, text: 'Sobrou dinheiro, mas você não registrou investimentos.' });
    }

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyTrend: Record<string, number> = {};
    monthlyExpenses.forEach(t => {
      const day = t.date.slice(8, 10);
      dailyTrend[day] = (dailyTrend[day] || 0) + t.amount;
    });
    
    let accumulated = 0;
    const trendData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      accumulated += dailyTrend[day] || 0;
      return { day, amount: accumulated, daily: dailyTrend[day] || 0 };
    });

    return {
      totalExpense,
      totalIncome,
      categoryList,
      classificationTotals,
      finalScore,
      trendData,
      symptoms,
      topCategory: categoryList[0],
      margin
    };
  }, [transactions, categories, debts, getDebtProgress]);

  // --- PAST EXPENSES SUGGESTION ALGORITHM ---
  const targetMonthStr = useMemo(() => {
    const today = new Date();
    if (analysisTargetMonth === 'current') {
      return today.toISOString().slice(0, 7);
    } else {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return nextMonth.toISOString().slice(0, 7);
    }
  }, [analysisTargetMonth]);

  const prevMonths = useMemo(() => {
    const [year, month] = targetMonthStr.split('-').map(Number);
    const months = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(year, month - 1 - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }
    return months;
  }, [targetMonthStr]);

  const suggestions = useMemo(() => {
    if (transactions.length === 0) return [];

    const targetMonthExpenses = transactions.filter(t => t.date.startsWith(targetMonthStr) && t.type === 'expense');
    const existingDescriptions = new Set(targetMonthExpenses.map(t => t.description.toLowerCase().trim()));

    const pastExpenses = transactions.filter(t => {
      const isPastMonth = prevMonths.includes(t.date.slice(0, 7));
      return isPastMonth && t.type === 'expense';
    });

    const grouped: Record<string, {
      description: string;
      amounts: number[];
      categoryId: string;
      days: number[];
      occurrences: number;
      lastDate: string;
    }> = {};

    pastExpenses.forEach(t => {
      const key = t.description.toLowerCase().trim();
      if (ignoredSuggestions.includes(key)) return;
      if (existingDescriptions.has(key)) return;

      const day = Number(t.date.slice(8, 10)) || 5;

      if (!grouped[key]) {
        grouped[key] = {
          description: t.description,
          amounts: [t.amount],
          categoryId: t.categoryId,
          days: [day],
          occurrences: 1,
          lastDate: t.date
        };
      } else {
        grouped[key].amounts.push(t.amount);
        grouped[key].days.push(day);
        grouped[key].occurrences += 1;
        if (t.date > grouped[key].lastDate) {
          grouped[key].lastDate = t.date;
          grouped[key].categoryId = t.categoryId;
        }
      }
    });

    return Object.values(grouped).map(item => {
      const avgAmount = item.amounts.reduce((a, b) => a + b, 0) / item.amounts.length;
      const sortedDays = [...item.days].sort();
      const medianDay = sortedDays[Math.floor(sortedDays.length / 2)];
      
      return {
        description: item.description,
        estimatedAmount: avgAmount,
        categoryId: item.categoryId,
        suggestedDay: medianDay,
        occurrences: item.occurrences,
        lastDate: item.lastDate
      };
    }).sort((a, b) => b.occurrences - a.occurrences);
  }, [transactions, targetMonthStr, prevMonths, ignoredSuggestions]);

  // --- FIXED EXPENSES MANAGER DATA ---
  const fixedExpensesList = useMemo(() => {
    const fixedTxs = transactions.filter(t => t.isFixed);
    
    const groups: Record<string, {
      id: string;
      fixedGroupId?: string;
      description: string;
      categoryId: string;
      amount: number;
      type: string;
      transactions: Transaction[];
    }> = {};

    fixedTxs.forEach(t => {
      const key = t.fixedGroupId || `${t.description.toLowerCase().trim()}-${t.categoryId}`;
      if (!groups[key]) {
        groups[key] = {
          id: t.id,
          fixedGroupId: t.fixedGroupId,
          description: t.description,
          categoryId: t.categoryId,
          amount: t.amount,
          type: t.type,
          transactions: [t]
        };
      } else {
        groups[key].transactions.push(t);
      }
    });

    return Object.values(groups).map(g => {
      const sortedTxs = [...g.transactions].sort((a, b) => a.date.localeCompare(b.date));
      const totalCount = sortedTxs.length;
      const paidCount = sortedTxs.filter(t => t.status === 'paid').length;
      const pendingCount = totalCount - paidCount;
      
      const todayStr = new Date().toISOString().slice(0, 10);
      const nextPending = sortedTxs.find(t => t.status === 'pending' && t.date >= todayStr) || sortedTxs.find(t => t.status === 'pending') || sortedTxs[sortedTxs.length - 1];

      return {
        ...g,
        id: nextPending ? nextPending.id : g.id,
        totalCount,
        paidCount,
        pendingCount,
        nextPendingDate: nextPending ? nextPending.date : null,
        nextPendingTransaction: nextPending || null
      };
    });
  }, [transactions]);

  const handleIgnoreSuggestion = (description: string) => {
    const updated = [...ignoredSuggestions, description.toLowerCase().trim()];
    setIgnoredSuggestions(updated);
    localStorage.setItem('ignoredSuggestions', JSON.stringify(updated));
  };

  const handleGenerateTips = async () => {
    if (!analysis) return;
    setLoadingTips(true);
    try {
      const currentMonthStr = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const result = await GeminiService.analyzeFinances({
        transactions,
        categories,
        currentMonth: currentMonthStr,
        metrics: {
          monthlyAverageExpense: analysis.totalExpense,
          topCategoryName: analysis.topCategory?.name || 'Geral',
          topCategoryValue: analysis.topCategory?.value || 0,
          realBalance: analysis.margin,
          projectedBalance: analysis.margin,
          savingsRate: analysis.totalIncome > 0 ? (analysis.margin / analysis.totalIncome) : 0
        }
      });
      if (result?.tips) {
        setTips(result.tips);
        setHasLoadedTips(true);
      }
    } catch (e) {
      console.error("AI Error:", e);
      setTips([{
        title: "Erro na Análise",
        description: "Não foi possível conectar à inteligência. Tente novamente em instantes.",
        impact: "Baixo",
        icon: "AlertTriangle"
      }]);
    } finally {
      setLoadingTips(false);
    }
  };

  const handleReclassify = (catId: string, newClass: 'essential' | 'personal' | 'future') => {
    const cat = categories.find(c => c.id === catId);
    if (cat) {
      updateCategory({ ...cat, classification: newClass });
    }
  };

  const getHealthStatus = (score: number) => {
    if (score >= 85) return { label: 'Excelente', color: 'text-emerald-500', bg: 'bg-emerald-500', desc: 'Saúde financeira robusta. Continue assim!' };
    if (score >= 65) return { label: 'Saudável', color: 'text-indigo-500', bg: 'bg-indigo-500', desc: 'Bom controle, com espaço para melhorias pontuais.' };
    if (score >= 40) return { label: 'Atenção', color: 'text-amber-500', bg: 'bg-amber-500', desc: 'Sinais de alerta. Reveja gastos supérfluos.' };
    return { label: 'Crítica', color: 'text-rose-500', bg: 'bg-rose-500', desc: 'Risco financeiro. Ação imediata necessária.' };
  };

  if (!analysis) {
    return (
      <div className="pb-24 animate-fade-in p-8 min-h-[70vh] flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
             <Microscope className="text-slate-300 dark:text-slate-600" size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Laboratório Vazio</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] mt-2 mb-6">
            Adicione transações neste mês para que possamos gerar um diagnóstico preciso.
          </p>
      </div>
    );
  }

  const status = getHealthStatus(analysis.finalScore);

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100 px-1">
      
      {/* Dynamic Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-6 shadow-xs">
        <button
          onClick={() => setActiveTab('diagnose')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 ${
            activeTab === 'diagnose'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Diagnóstico Geral
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
            activeTab === 'suggestions'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Esquecidos
          {suggestions.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('fixed')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 ${
            activeTab === 'fixed'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Despesas Fixas
        </button>
      </div>

      {/* --- PANEL 1: DIAGNOSE --- */}
      {activeTab === 'diagnose' && (
        <div className="space-y-6">
          {/* Score Gauge */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center relative overflow-hidden">
             <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b ${analysis.finalScore > 60 ? 'from-emerald-50/50 dark:from-emerald-900/10' : 'from-rose-50/50 dark:from-rose-900/10'} to-transparent opacity-50`}></div>
             
             <div className="relative w-48 h-48 mb-6 z-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                  <circle 
                    cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 85}
                    strokeDashoffset={2 * Math.PI * 85 * (1 - analysis.finalScore / 100)}
                    strokeLinecap="round"
                    className={`${status.color} transition-all duration-1000 ease-out`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter">{analysis.finalScore}</span>
                   <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${status.color}`}>Score</span>
                </div>
             </div>
             <h2 className={`text-2xl font-black mb-2 relative z-10 ${status.color}`}>{status.label}</h2>
             <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[250px] leading-relaxed relative z-10">{status.desc}</p>
          </div>

          {/* Diagnostic Symptoms */}
          {analysis.symptoms.length > 0 && (
            <div className="space-y-3">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Sintomas e Avisos</h3>
               {analysis.symptoms.map((s, idx) => {
                 const SIcon = s.icon;
                 return (
                   <div key={idx} className={`p-4 rounded-[2rem] border flex items-start space-x-4 bg-white dark:bg-slate-900 ${s.type === 'danger' ? 'border-rose-100 dark:border-rose-900/30' : s.type === 'warning' ? 'border-amber-100 dark:border-amber-900/30' : 'border-blue-100 dark:border-blue-900/30'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${s.type === 'danger' ? 'bg-rose-50 dark:bg-rose-950 text-rose-500' : s.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950 text-amber-500' : 'bg-blue-50 dark:bg-blue-950 text-blue-500'}`}>
                         <SIcon size={20} />
                      </div>
                      <div>
                         <span className="text-xs font-black text-slate-800 dark:text-white block leading-tight mb-1">{s.label}</span>
                         <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{s.text}</p>
                      </div>
                   </div>
                 )
               })}
            </div>
          )}

          {/* Distribution Pulse */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição Real</h3>
                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md animate-pulse">Toque para detalhar</span>
             </div>
             
             <div className="space-y-6">
                <div className="h-6 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden p-1 cursor-pointer">
                   <div onClick={() => setSelectedClassification('essential')} className="h-full bg-indigo-500 rounded-l-full hover:bg-indigo-400 transition-all duration-300 relative group" style={{ width: `${(analysis.classificationTotals.essential / (analysis.totalExpense || 1)) * 100}%` }}>
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   </div>
                   <div onClick={() => setSelectedClassification('personal')} className="h-full bg-rose-500 transition-all duration-300 border-l border-white dark:border-slate-900 hover:bg-rose-400 relative group" style={{ width: `${(analysis.classificationTotals.personal / (analysis.totalExpense || 1)) * 100}%` }}>
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   </div>
                   <div onClick={() => setSelectedClassification('future')} className="h-full bg-emerald-500 rounded-r-full transition-all duration-300 border-l border-white dark:border-slate-900 hover:bg-emerald-400 relative group" style={{ width: `${(analysis.classificationTotals.future / (analysis.totalExpense || 1)) * 100}%` }}>
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                   {[
                     { id: 'essential', label: 'Essencial', val: analysis.classificationTotals.essential, color: 'text-indigo-500', icon: ShieldCheck },
                     { id: 'personal', label: 'Pessoal', val: analysis.classificationTotals.personal, color: 'text-rose-500', icon: Heart },
                     { id: 'future', label: 'Futuro', val: analysis.classificationTotals.future, color: 'text-emerald-500', icon: TrendingUp }
                   ].map((item, i) => {
                     const Icon = item.icon;
                     return (
                       <div 
                          key={i} 
                          onClick={() => setSelectedClassification(item.id as any)}
                          className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl text-center border border-slate-100 dark:border-slate-800/50 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group"
                       >
                          <div className={`flex justify-center mb-1 ${item.color} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform`}>
                             <Icon size={16} />
                          </div>
                          <span className={`text-[8px] font-black uppercase block mb-1 ${item.color}`}>{item.label}</span>
                          <span className="text-[10px] font-black text-slate-800 dark:text-white block truncate">{formatCurrency(item.val)}</span>
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>

          {/* Spending Accumulation Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acúmulo de Gastos</h3>
                <Activity size={14} className="text-slate-300" />
             </div>
             <div className="h-32 w-full -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={analysis.trendData}>
                      <defs>
                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                        formatter={(value: number) => [formatCurrency(value), 'Acumulado']}
                        labelFormatter={(label) => `Dia ${label}`}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fill="url(#colorTrend)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* AI Advice Consultation */}
          <div>
             <div className="flex justify-between items-center mb-4 px-3">
                <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] flex items-center">
                   <Sparkles size={14} className="text-indigo-500 mr-2" />
                   Dicas Inteligentes
                </h2>
                {hasLoadedTips && (
                   <button onClick={handleGenerateTips} className="text-[9px] font-black text-indigo-500 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full">Atualizar</button>
                )}
             </div>

             {loadingTips ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 animate-pulse">
                   <Bot size={32} className="text-indigo-500 animate-bounce mb-3" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Consultando Especialista...</p>
                </div>
             ) : tips.length > 0 ? (
                <div className="space-y-4">
                   {tips.map((tip, idx) => {
                      const IconComp = AI_ICON_MAP[tip.icon] || Lightbulb;
                      return (
                         <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-start space-x-4 animate-slide-up">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[1.2rem] flex items-center justify-center shrink-0">
                               <IconComp size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-start mb-1">
                                  <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{tip.title}</h3>
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ml-2 ${tip.impact === 'Alto' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                    {tip.impact}
                                  </span>
                               </div>
                               <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{tip.description}</p>
                            </div>
                         </div>
                      )
                   })}
                </div>
             ) : (
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[3rem] text-white text-center shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                   <Bot className="mx-auto mb-4 text-white/90" size={40} />
                   <h3 className="text-lg font-black mb-2">Check-up Completo</h3>
                   <p className="text-xs text-indigo-100 mb-6 font-medium leading-relaxed max-w-[260px] mx-auto">
                     Nossa IA analisa seus padrões de consumo e encontra oportunidades ocultas de economia.
                   </p>
                   <button 
                     onClick={handleGenerateTips}
                     className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                   >
                     Iniciar Diagnóstico
                   </button>
                </div>
             )}
          </div>
        </div>
      )}

      {/* --- PANEL 2: SUGGESTIONS --- */}
      {activeTab === 'suggestions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-2 px-1">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Detector de Esquecimentos</h3>
              <p className="text-[10px] text-slate-400 font-medium">Lançamentos de meses passados não registrados no alvo</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-xs">
              <button
                onClick={() => {
                  setAnalysisTargetMonth('current');
                  setSelectedSuggestionToCreate(null);
                }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  analysisTargetMonth === 'current'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Este Mês
              </button>
              <button
                onClick={() => {
                  setAnalysisTargetMonth('next');
                  setSelectedSuggestionToCreate(null);
                }}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  analysisTargetMonth === 'next'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Próximo Mês
              </button>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="text-emerald-500" size={28} />
              </div>
              <h4 className="text-base font-black text-slate-800 dark:text-white">Tudo em Ordem!</h4>
              <p className="text-xs text-slate-400 max-w-[280px] mt-1 leading-relaxed">
                Nenhum lançamento comum dos meses passados parece estar faltando em seu planejamento para {analysisTargetMonth === 'current' ? 'este mês' : 'o próximo mês'}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, idx) => {
                const cat = categories.find(c => c.id === suggestion.categoryId);
                const CatIcon = getIcon(cat?.icon || 'DollarSign');
                const isExpanding = selectedSuggestionToCreate === suggestion.description;

                return (
                  <div 
                    key={idx} 
                    className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs transition-all ${
                      isExpanding ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/60'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: cat?.color || '#a8a29e' }}>
                          <CatIcon size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{suggestion.description}</h4>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Categoria: {cat?.name || 'Não categorizado'} • Presente em {suggestion.occurrences} {suggestion.occurrences === 1 ? 'mês' : 'meses'} anteriores
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-800 dark:text-white block">
                          {formatCurrency(suggestion.estimatedAmount)}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400 block">Média anterior</span>
                      </div>
                    </div>

                    {!isExpanding && (
                      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md">
                          Estimado para o dia {suggestion.suggestedDay}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleIgnoreSuggestion(suggestion.description)}
                            className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-rose-600 rounded-lg transition bg-slate-50 dark:bg-slate-800"
                          >
                            Ignorar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSuggestionToCreate(suggestion.description);
                              setSuggestionAmount(suggestion.estimatedAmount.toFixed(2));
                              setSuggestionDate(`${targetMonthStr}-${String(suggestion.suggestedDay).padStart(2, '0')}`);
                              setSuggestionAccount(accounts[0]?.id || '');
                            }}
                            className="px-4 py-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
                          >
                            Lançar
                          </button>
                        </div>
                      </div>
                    )}

                    {isExpanding && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-slide-up space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Valor (R$)</label>
                            <input
                              type="number"
                              step="any"
                              value={suggestionAmount}
                              onChange={(e) => setSuggestionAmount(e.target.value)}
                              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Data Venc.</label>
                            <input
                              type="date"
                              value={suggestionDate}
                              onChange={(e) => setSuggestionDate(e.target.value)}
                              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Conta Ingress.</label>
                            <select
                              value={suggestionAccount}
                              onChange={(e) => setSuggestionAccount(e.target.value)}
                              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                            >
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-1">
                          <button
                            onClick={() => setSelectedSuggestionToCreate(null)}
                            className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => {
                              addTransaction({
                                description: suggestion.description,
                                amount: parseCurrencyInput(suggestionAmount) || suggestion.estimatedAmount,
                                categoryId: suggestion.categoryId,
                                date: suggestionDate,
                                accountId: suggestionAccount,
                                type: 'expense',
                                status: 'pending'
                              });
                              setSelectedSuggestionToCreate(null);
                            }}
                            className="px-4 py-1.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm"
                          >
                            Registrar Despesa
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- PANEL 3: FIXED EXPENSES --- */}
      {activeTab === 'fixed' && (
        <div className="space-y-6">
          <div className="mb-2 px-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Gestão de Contratos e Despesas Fixas</h3>
            <p className="text-[10px] text-slate-400 font-medium">Controle total sobre assinaturas e compromissos fixados</p>
          </div>

          {fixedExpensesList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950 rounded-full flex items-center justify-center mb-4">
                <Calendar size={28} className="text-indigo-500" />
              </div>
              <h4 className="text-base font-black text-slate-800 dark:text-white">Nenhum Contrato Ativo</h4>
              <p className="text-xs text-slate-400 max-w-[280px] mt-1 leading-relaxed">
                Ao cadastrar novas despesas cotidianas recorrentes (aluguel, streaming, internet), marque a opção "Despesa Fixa" para que elas surjam e sejam administradas centralizadamente nesta seção.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {fixedExpensesList.map((item, idx) => {
                const cat = categories.find(c => c.id === item.categoryId);
                const CatIcon = getIcon(cat?.icon || 'DollarSign');
                const percentPaid = item.totalCount > 0 ? (item.paidCount / item.totalCount) * 100 : 0;

                return (
                  <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: cat?.color || '#cbd5e1' }}>
                          <CatIcon size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white">{item.description}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">Categoria: {cat?.name || 'Outros'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-800 dark:text-white block">
                          {formatCurrency(item.amount)}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">Mensal</span>
                      </div>
                    </div>

                    {/* Progress Bar of Installments */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                        <span>Ciclo de Lançamento</span>
                        <span>{item.paidCount} de {item.totalCount} parcelas pagas ({Math.round(percentPaid)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-100 dark:border-slate-900">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${percentPaid}%` }}></div>
                      </div>
                    </div>

                    {/* Vencimento e Ações */}
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                      <div className="flex items-center space-x-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-medium">
                          Próximo vencimento: {item.nextPendingDate ? new Date(item.nextPendingDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Finalizado'}
                        </span>
                      </div>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            if (item.nextPendingTransaction) {
                              setEditingTransaction(item.nextPendingTransaction);
                            } else {
                              setEditingTransaction(item.transactions[0]);
                            }
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl transition"
                          title="Editar Série"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingTransactionInfo({
                              id: item.id,
                              hasSeries: !!item.fixedGroupId
                            });
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition"
                          title="Excluir Série"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- Detailed Classification Modal --- */}
      {selectedClassification && (
         <div className="fixed inset-0 bg-slate-950/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar border-t border-white/10 flex flex-col">
               
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-3">
                     <div className={`p-3 rounded-2xl ${
                        selectedClassification === 'essential' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' :
                        selectedClassification === 'personal' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                        'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                     }`}>
                        {selectedClassification === 'essential' ? <ShieldCheck size={24} /> : selectedClassification === 'personal' ? <Heart size={24} /> : <TrendingUp size={24} />}
                     </div>
                     <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                           {selectedClassification === 'essential' ? 'Gastos Essenciais' : selectedClassification === 'personal' ? 'Estilo de Vida' : 'Futuro & Invest.'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Detalhamento por categoria</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedClassification(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition hover:bg-slate-200 dark:hover:bg-slate-700">
                     <X size={20} className="text-slate-500" />
                  </button>
               </div>

               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl mb-6 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total do Grupo</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white">
                     {formatCurrency(analysis.categoryList.filter(c => c.classification === selectedClassification).reduce((acc, curr) => acc + curr.value, 0))}
                  </span>
               </div>

               <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {analysis.categoryList.filter(c => c.classification === selectedClassification).map(cat => {
                     const Icon = getIcon(cat.icon);
                     return (
                        <div key={cat.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl flex flex-col space-y-3 group transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                           <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-3">
                                 <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: cat.color }}>
                                    <Icon size={18} />
                                 </div>
                                 <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-white block">{cat.name}</span>
                                    <span className="text-[10px] font-medium text-slate-400">
                                       {((cat.value / (analysis.totalExpense || 1)) * 100).toFixed(1)}% dos gastos
                                    </span>
                                 </div>
                              </div>
                              <span className="text-sm font-black text-slate-800 dark:text-white">{formatCurrency(cat.value)}</span>
                           </div>
                           
                           {/* Quick Reclassify Toolbar */}
                           <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex items-center">
                                 <ArrowRightLeft size={10} className="mr-1" /> Reclassificar:
                              </span>
                              <div className="flex space-x-1">
                                 <button 
                                    onClick={() => handleReclassify(cat.id, 'essential')}
                                    className={`p-1.5 rounded-lg transition ${selectedClassification === 'essential' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-500'}`}
                                    title="Essencial"
                                 >
                                    <ShieldCheck size={14} />
                                 </button>
                                 <button 
                                    onClick={() => handleReclassify(cat.id, 'personal')}
                                    className={`p-1.5 rounded-lg transition ${selectedClassification === 'personal' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500'}`}
                                    title="Pessoal"
                                 >
                                    <Heart size={14} />
                                 </button>
                                 <button 
                                    onClick={() => handleReclassify(cat.id, 'future')}
                                    className={`p-1.5 rounded-lg transition ${selectedClassification === 'future' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-500'}`}
                                    title="Futuro"
                                 >
                                    <TrendingUp size={14} />
                                 </button>
                              </div>
                           </div>
                        </div>
                     );
                  })}
                  
                  {analysis.categoryList.filter(c => c.classification === selectedClassification).length === 0 && (
                     <div className="text-center py-8 opacity-50">
                        <p className="text-sm font-medium text-slate-500">Nenhuma categoria classificada aqui.</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* --- Editing Transaction modal helper integration --- */}
      {editingTransaction && (
        <TransactionForm 
          onClose={() => setEditingTransaction(null)} 
          transaction={editingTransaction} 
        />
      )}

      {/* --- Series Delete Confirmation Modal --- */}
      {deletingTransactionInfo && (
        <div className="fixed inset-0 bg-slate-950/60 z-[150] flex items-end sm:items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-6 shadow-2xl animate-slide-up border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950 text-rose-500 rounded-full flex items-center justify-center mb-2">
                <Trash2 size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Como deseja excluir?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Esta despesa faz parte de um plano ou recorrência de despesas fixas.
                </p>
              </div>
              
              <div className="w-full space-y-2 pt-2">
                <button
                  onClick={() => {
                    deleteTransaction(deletingTransactionInfo.id, false);
                    setDeletingTransactionInfo(null);
                  }}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs transition active:scale-95"
                >
                  Excluir Apenas Esta Ocorrência
                </button>
                {deletingTransactionInfo.hasSeries && (
                  <button
                    onClick={() => {
                      deleteTransaction(deletingTransactionInfo.id, true);
                      setDeletingTransactionInfo(null);
                    }}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs transition shadow-sm active:scale-95"
                  >
                    Excluir Toda a Série Recorrente
                  </button>
                )}
                <button
                  onClick={() => setDeletingTransactionInfo(null)}
                  className="w-full py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs transition active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
