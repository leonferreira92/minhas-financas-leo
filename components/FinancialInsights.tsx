
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
  ChevronRight, X, Check, ArrowRightLeft
} from 'lucide-react';
import { 
  AreaChart, Area, ResponsiveContainer, Tooltip
} from 'recharts';
import { ICON_MAP, getIcon } from '../constants';

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
  const { transactions, categories, debts, getDebtProgress, updateCategory } = useFinance();
  const [tips, setTips] = useState<AITip[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [hasLoadedTips, setHasLoadedTips] = useState(false);
  
  // State para o Modal de Detalhes da Classificação
  const [selectedClassification, setSelectedClassification] = useState<'essential' | 'personal' | 'future' | null>(null);

  const analysis = useMemo(() => {
    if (transactions.length === 0) return null;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const monthlyTxs = transactions.filter(t => t.date.startsWith(currentMonth));
    
    // Se não houver transações no mês atual, usar o mês anterior ou retornar null para pedir dados
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

    // --- Score de Saúde Financeira 2.0 (Blindado contra Renda Zero) ---
    
    // Previne divisão por zero
    const safeIncome = totalIncome > 0 ? totalIncome : 1; 
    
    // 1. Taxa de Poupança (Peso 40%)
    const margin = totalIncome - totalExpense;
    // Se renda for 0 e gastou algo, poupança é negativa (-100% ou pior)
    const savingsRate = totalIncome > 0 ? (margin / totalIncome) : (totalExpense > 0 ? -1 : 0);
    const sScore = Math.min(100, Math.max(0, (savingsRate + 0.1) * 100)); // Ajuste de curva

    // 2. Proporção Essencial (Peso 30%)
    const essentialRatio = classificationTotals.essential / safeIncome;
    // Se gastou mais de 50% em essencial, perde pontos. Se renda 0, perde tudo.
    const eScore = totalIncome === 0 && classificationTotals.essential > 0 
       ? 0 
       : Math.min(100, Math.max(0, (0.6 - essentialRatio + 0.5) * 100)); // Alvo: < 50% gastos essenciais

    // 3. Controle de Dívidas (Peso 20%)
    const debtScore = debts.length > 0 
      ? (debts.reduce((s, d) => s + getDebtProgress(d.id).progress, 0) / debts.length)
      : 100;

    // 4. Fluxo de Caixa (Peso 10%)
    const flowScore = margin >= 0 ? 100 : 0;

    const rawScore = (sScore * 0.4) + (eScore * 0.3) + (debtScore * 0.2) + (flowScore * 0.1);
    const finalScore = Math.round(Math.min(100, Math.max(0, rawScore)));

    // Sintomas de Diagnóstico
    const symptoms = [];
    if (totalIncome === 0 && totalExpense > 0) symptoms.push({ label: 'Falta de Receita', type: 'danger', icon: AlertTriangle, text: 'Você registrou gastos mas nenhuma entrada este mês.' });
    else {
        if (essentialRatio > 0.6) symptoms.push({ label: 'Custo Fixo Alto', type: 'warning', icon: Thermometer, text: 'Custos essenciais consomem +60% da renda.' });
        if (classificationTotals.personal > classificationTotals.essential) symptoms.push({ label: 'Desequilíbrio de Lazer', type: 'warning', icon: Pizza, text: 'Gastos pessoais superam os essenciais.' });
        if (margin < 0) symptoms.push({ label: 'Déficit Mensal', type: 'danger', icon: Flame, text: 'Você gastou mais do que recebeu.' });
        if (classificationTotals.future === 0 && totalIncome > 0 && margin > 0) symptoms.push({ label: 'Dinheiro Parado', type: 'info', icon: PiggyBank, text: 'Sobrou dinheiro, mas você não registrou investimentos.' });
    }

    // Trend Data
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyTrend: Record<string, number> = {};
    monthlyExpenses.forEach(t => {
      const day = t.date.slice(8, 10);
      dailyTrend[day] = (dailyTrend[day] || 0) + t.amount;
    });
    
    // Accumulate for area chart effect
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

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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
            Adicione transações neste mês para que nossa IA possa gerar um diagnóstico preciso.
          </p>
      </div>
    );
  }

  const status = getHealthStatus(analysis.finalScore);

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100 px-1">
      
      {/* --- Section: Score Gauge --- */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 flex flex-col items-center text-center relative overflow-hidden">
         {/* Background Glow */}
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

      {/* --- Section: Diagnostic Symptoms --- */}
      {analysis.symptoms.length > 0 && (
        <div className="mb-6 space-y-3">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Diagnóstico</h3>
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

      {/* --- Section: Distribution Pulse (Interactive) --- */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 relative">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição Real</h3>
            <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md animate-pulse">Toque para detalhar</span>
         </div>
         
         <div className="space-y-6">
            {/* Clickable Progress Bar */}
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

      {/* --- Section: Spending Area --- */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
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

      {/* --- Section: AI Consultation --- */}
      <div className="mb-6 px-1">
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
            <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
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

    </div>
  );
};
