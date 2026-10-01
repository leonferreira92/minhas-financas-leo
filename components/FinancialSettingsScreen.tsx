import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Sliders, ShieldCheck, ChevronLeft, Save, Check, 
  Sparkles, Info, HelpCircle, Layers, CheckCircle2,
  DollarSign, Calendar, TrendingUp, AlertTriangle, ArrowRight
} from 'lucide-react';
import { FinancialSettings, Category } from '../types';
import { DEFAULT_FINANCIAL_SETTINGS, getIcon, parseCurrencyInput } from '../constants';
import { isEssentialExpense } from '../services/aiReportService';

export const FinancialSettingsScreen: React.FC = () => {
  const { 
    categories, 
    accounts, 
    transactions, 
    debts, 
    settings, 
    updateFinancialSettings, 
    getAccountBalance 
  } = useFinance();

  const currentSettings: FinancialSettings = useMemo(() => {
    return settings.financialSettings || DEFAULT_FINANCIAL_SETTINGS;
  }, [settings.financialSettings]);

  const [minReserve, setMinReserve] = useState<string>(() => {
    return (currentSettings.minReserveAmount ?? 5000).toString();
  });

  const [targetMonths, setTargetMonths] = useState<number>(() => {
    return currentSettings.targetReserveMonths ?? 6;
  });

  const [essentialIds, setEssentialIds] = useState<string[]>(() => {
    return currentSettings.essentialCategoryIds || [];
  });

  const [lifestyleIds, setLifestyleIds] = useState<string[]>(() => {
    return currentSettings.lifestyleCategoryIds || [];
  });

  const [professionalIds, setProfessionalIds] = useState<string[]>(() => {
    return currentSettings.professionalCategoryIds || [];
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Categorias de despesa disponíveis
  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense');
  }, [categories]);

  // Saldo reservado atual (poupança)
  const totalReservedToday = useMemo(() => {
    const savings = accounts.filter(a => a.type === 'savings').reduce((s, a) => s + getAccountBalance(a.id), 0);
    return savings;
  }, [accounts, getAccountBalance]);

  // Custo essencial mensal calculado com as categorias marcadas
  const monthlyEssentialEstimate = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);
    
    // Tenta calcular o mês atual
    const thisMonthTxs = transactions.filter(t => 
      t.type === 'expense' && 
      t.date.startsWith(currentMonthPrefix) &&
      essentialIds.includes(t.categoryId)
    );
    const thisMonthSum = thisMonthTxs.reduce((s, t) => s + Number(t.amount), 0);
    if (thisMonthSum > 0) return thisMonthSum;

    // Se mês atual for 0, média dos últimos 3 meses
    const pastMonths: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      pastMonths.push(d.toISOString().slice(0, 7));
    }
    const pastTxs = transactions.filter(t => 
      t.type === 'expense' && 
      pastMonths.some(m => t.date.startsWith(m)) &&
      essentialIds.includes(t.categoryId)
    );
    const totalPast = pastTxs.reduce((s, t) => s + Number(t.amount), 0);
    return pastMonths.length > 0 && totalPast > 0 ? totalPast / pastMonths.length : 0;
  }, [transactions, essentialIds]);

  const parsedMinReserve = parseCurrencyInput(minReserve) || 0;
  const targetFromMonths = monthlyEssentialEstimate > 0 ? (targetMonths * monthlyEssentialEstimate) : 0;
  const targetSafetyReserve = Math.max(parsedMinReserve, targetFromMonths);
  const reserveCoveragePct = targetSafetyReserve > 0 
    ? Math.min(100, Math.round((totalReservedToday / targetSafetyReserve) * 100)) 
    : 100;

  // Toggle category between groups
  const handleAssignCategory = (catId: string, type: 'essential' | 'lifestyle' | 'professional') => {
    // Remove de todos
    const newEssential = essentialIds.filter(id => id !== catId);
    const newLifestyle = lifestyleIds.filter(id => id !== catId);
    const newProfessional = professionalIds.filter(id => id !== catId);

    if (type === 'essential') {
      if (!essentialIds.includes(catId)) newEssential.push(catId);
    } else if (type === 'lifestyle') {
      if (!lifestyleIds.includes(catId)) newLifestyle.push(catId);
    } else if (type === 'professional') {
      if (!professionalIds.includes(catId)) newProfessional.push(catId);
    }

    setEssentialIds(newEssential);
    setLifestyleIds(newLifestyle);
    setProfessionalIds(newProfessional);
  };

  const handleSave = () => {
    const val = parseCurrencyInput(minReserve) || 0;
    const newSettings: FinancialSettings = {
      minReserveAmount: val,
      targetReserveMonths: targetMonths,
      essentialCategoryIds: essentialIds,
      lifestyleCategoryIds: lifestyleIds,
      professionalCategoryIds: professionalIds,
    };

    updateFinancialSettings(newSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100 max-w-xl mx-auto px-2 sm:px-4">
      
      {/* Header com Navegação */}
      <div className="flex items-center justify-between mb-6 pt-2">
        <div className="flex items-center space-x-3">
          <Link 
            to="/settings" 
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition active:scale-95 shadow-xs"
            title="Voltar aos Ajustes"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Sliders size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Configurações Financeiras
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Parâmetros de reserva, meses de sobrevivência e classificação de despesas
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center space-x-1.5 shadow-md ${
            savedSuccess 
              ? 'bg-emerald-600 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {savedSuccess ? <Check size={16} /> : <Save size={16} />}
          <span>{savedSuccess ? 'Salvo!' : 'Salvar'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-slide-up">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Configurações atualizadas com sucesso! Os cálculos de capacidade de compra e visão financeira já foram recalculados.</span>
        </div>
      )}

      {/* CARD RESUMO DE RESERVA */}
      <div className="p-5 rounded-[2rem] bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800 relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center space-x-1">
            <ShieldCheck size={14} />
            <span>Diagnóstico de Proteção</span>
          </span>
          <span className="text-xs font-bold text-slate-300">
            {reserveCoveragePct}% Coberto
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
          <div 
            className={`h-full transition-all duration-500 ${
              reserveCoveragePct >= 100 
                ? 'bg-emerald-400' 
                : reserveCoveragePct >= 50 
                ? 'bg-amber-400' 
                : 'bg-rose-400'
            }`}
            style={{ width: `${reserveCoveragePct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-0.5">Reservado Hoje (Poupança)</span>
            <span className="text-base font-black text-white">{formatBRL(totalReservedToday)}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 block mb-0.5">Meta Total Adotada</span>
            <span className="text-base font-black text-amber-300">{formatBRL(targetSafetyReserve)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* SEÇÃO 1: RESERVA MÍNIMA E MESES */}
        <div className="p-5 rounded-[2rem] bg-[#18181b] border border-zinc-800 shadow-xs space-y-5">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
              1
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Reserva Financeira e Sobrevivência
            </h2>
          </div>

          {/* Campo 1: Valor da Reserva Mínima em R$ */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Reserva Mínima Desejada (R$)
            </label>
            <p className="text-[11px] text-zinc-400 mb-2">
              Patrimônio intocável em reservas e poupança que protege contra imprevistos. O sistema só autoriza gastos discricionários quando esse montante estiver guarnecido.
            </p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 font-bold text-sm">
                R$
              </div>
              <input
                type="text"
                value={minReserve}
                onChange={(e) => setMinReserve(e.target.value)}
                placeholder="5000"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#121212] border border-zinc-700/80 text-white font-black text-base outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Campo 2: Quantidade de Meses de Reserva */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-300">
                Quantidade de Meses de Reserva Desejada
              </label>
              <span className="text-xs font-black text-emerald-400">
                {targetMonths} meses
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2.5">
              Quantos meses de despesas essenciais você deseja ter garantidos de reserva para emergências.
            </p>

            <div className="grid grid-cols-4 gap-2">
              {[3, 6, 9, 12].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetMonths(m)}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition active:scale-95 border ${
                    targetMonths === m
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-sm'
                      : 'bg-[#121212] border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {m} meses
                </button>
              ))}
            </div>

            {monthlyEssentialEstimate > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-[#121212] border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Custo Essencial Estimado ({targetMonths}m):</span>
                <span className="font-bold text-white">
                  {formatBRL(targetFromMonths)} ({formatBRL(monthlyEssentialEstimate)}/mês)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SEÇÃO 2: CLASSIFICAÇÃO DE CATEGORIAS */}
        <div className="p-5 rounded-[2rem] bg-[#18181b] border border-zinc-800 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-black text-xs border border-purple-500/30">
                2
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Classificação de Categorias
              </h2>
            </div>
            <span className="text-[10px] text-zinc-400 font-bold">
              {expenseCategories.length} categorias
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Selecione em qual pilar cada categoria de despesa se enquadra. Essa classificação é usada para calcular seu custo básico de subsistência, seus investimentos de trabalho e seu saldo realmente livre.
          </p>

          {/* Legenda dos 3 pilares */}
          <div className="grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-wider text-center">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Essencial
            </div>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Estilo de Vida
            </div>
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30">
              Profissional
            </div>
          </div>

          {/* Lista de Categorias de Despesas */}
          <div className="space-y-2 pt-2">
            {expenseCategories.map(cat => {
              const IconComp = getIcon(cat.icon);
              const isEss = essentialIds.includes(cat.id);
              const isLife = lifestyleIds.includes(cat.id);
              const isProf = professionalIds.includes(cat.id);

              return (
                <div 
                  key={cat.id}
                  className="p-3 rounded-2xl bg-[#121212] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center space-x-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-950 font-bold shrink-0 shadow-xs"
                      style={{ backgroundColor: cat.color || '#10b981' }}
                    >
                      <IconComp size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {cat.name}
                      </span>
                    </div>
                  </div>

                  {/* 3 Botoes de selecao rapida */}
                  <div className="grid grid-cols-3 gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAssignCategory(cat.id, 'essential')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition active:scale-95 border ${
                        isEss
                          ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                          : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Essencial
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAssignCategory(cat.id, 'lifestyle')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition active:scale-95 border ${
                        isLife
                          ? 'bg-purple-500 text-white border-purple-500 shadow-xs'
                          : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Estilo de Vida
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAssignCategory(cat.id, 'professional')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition active:scale-95 border ${
                        isProf
                          ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                          : 'bg-[#18181b] border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Profissional
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão de Salvar no final */}
          <div className="pt-3">
            <button
              onClick={handleSave}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm uppercase tracking-wider transition active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
            >
              <Save size={18} strokeWidth={2.5} />
              <span>Salvar Parâmetros Financeiros</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
