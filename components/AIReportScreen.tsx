import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  generateFinancialReportForAI, 
  ReportPeriodType, 
  getPeriodDateRange, 
  formatBRL 
} from '../services/aiReportService';
import { 
  Bot, Copy, Check, Download, ExternalLink, Calendar, 
  Sparkles, ShieldCheck, AlertTriangle, ArrowRight, 
  RefreshCw, Wallet, PiggyBank, ArrowDownRight, FileText,
  ChevronLeft, Info, HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AIReportScreen = () => {
  const { 
    transactions, 
    accounts, 
    categories, 
    goals, 
    debts, 
    shows, 
    getAccountBalance,
    isBlurred
  } = useFinance();

  const [periodType, setPeriodType] = useState<ReportPeriodType>('current');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const [copied, setCopied] = useState(false);
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null);
  const [reportText, setReportText] = useState<string>('');

  // Re-generate report when period or financial data changes
  const handleGenerate = () => {
    const text = generateFinancialReportForAI({
      periodType,
      customStartDate: customStart,
      customEndDate: customEnd,
      transactions,
      accounts,
      categories,
      goals,
      debts,
      shows,
      getAccountBalance
    });
    setReportText(text);
  };

  // Initial generation
  useEffect(() => {
    handleGenerate();
  }, [periodType, customStart, customEnd, transactions, accounts, categories, goals, debts, shows]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar texto:', err);
    }
  };

  // Export as .TXT file
  const handleExportTxt = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Relatorio_Financeiro_IA_${today}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Quick action: Copy and open external AI platform
  const handleOpenAI = async (url: string) => {
    await handleCopy();
    window.open(url, '_blank');
  };

  // Copy single prompt suggestion
  const promptSuggestions = [
    'Com base neste relatório, posso fazer uma compra de [R$ valor] agora sem comprometer minhas contas?',
    'Qual é o valor exato que realmente posso gastar livremente nos próximos dias?',
    'Quais são meus maiores gargalos financeiros e onde posso economizar?',
    'Como está a lucratividade dos meus shows? Qual é a margem mínima de cachê que devo negociar?',
    'Quanto preciso faturar no próximo mês para cobrir compromissos e ainda guardar dinheiro no cofrinho?'
  ];

  const handleCopyPrompt = async (prompt: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(`${prompt}\n\n[COLE O RELATÓRIO ABAIXO]:\n\n${reportText}`);
      setCopiedPromptIdx(idx);
      setTimeout(() => setCopiedPromptIdx(null), 2500);
    } catch (err) {
      console.error('Falha ao copiar prompt:', err);
    }
  };

  // Quick financial snapshot for header pills
  const snapshot = useMemo(() => {
    const operationalAccounts = accounts.filter(
      a => !(a.type === 'savings' || a.name.toLowerCase().includes('reserva') || a.name.toLowerCase().includes('cofrinho'))
    );
    const available = operationalAccounts.reduce((s, a) => s + getAccountBalance(a.id), 0);
    const reserved = goals.reduce((s, g) => s + (Number(g.currentAmount) || 0), 0);
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const pendingMonthExpenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'pending' && t.date.startsWith(currentMonthPrefix))
      .reduce((s, t) => s + Number(t.amount), 0);
    const free = available - pendingMonthExpenses;
    const netWorth = available + reserved;

    return {
      available,
      reserved,
      pending: pendingMonthExpenses,
      free,
      netWorth
    };
  }, [accounts, goals, transactions, getAccountBalance]);

  const activeRange = getPeriodDateRange(periodType, customStart, customEnd);

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100 max-w-4xl mx-auto">
      
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <Link 
            to="/" 
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition active:scale-95 shadow-xs"
            title="Voltar"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <Bot size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Relatório Financeiro para IA
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exportação estruturada em texto puro para análise no ChatGPT, Claude ou Gemini
            </p>
          </div>
        </div>

        {/* Quick Action Badges */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleGenerate}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 flex items-center space-x-1.5"
            title="Recalcular relatório"
          >
            <RefreshCw size={14} />
            <span>Atualizar</span>
          </button>
          
          <button
            onClick={handleExportTxt}
            className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition active:scale-95 flex items-center space-x-1.5 shadow-xs"
            title="Baixar arquivo TXT"
          >
            <Download size={14} />
            <span>Exportar .TXT</span>
          </button>

          <button
            onClick={handleCopy}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center space-x-1.5 shadow-md ${
              copied 
                ? 'bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="Copiar relatório completo"
          >
            {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
            <span>{copied ? 'Copiado!' : 'Copiar Relatório'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot Cards Bar: 4 Core Pillars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {/* 1. Disponível */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Disponível Imediato</span>
            <Wallet size={14} className="text-indigo-500" />
          </div>
          <span className="text-base font-black text-slate-800 dark:text-white tabular-nums block">
            {!isBlurred ? formatBRL(snapshot.available) : 'R$ •••••'}
          </span>
          <span className="text-[10px] text-slate-400">Em contas operacionais</span>
        </div>

        {/* 2. Reservado */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Reservado</span>
            <PiggyBank size={14} className="text-amber-500" />
          </div>
          <span className="text-base font-black text-amber-600 dark:text-amber-400 tabular-nums block">
            {!isBlurred ? formatBRL(snapshot.reserved) : 'R$ •••••'}
          </span>
          <span className="text-[10px] text-slate-400">Em metas e cofrinhos</span>
        </div>

        {/* 3. Comprometido */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Comprometido</span>
            <ArrowDownRight size={14} className="text-rose-500" />
          </div>
          <span className="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums block">
            {!isBlurred ? formatBRL(snapshot.pending) : 'R$ •••••'}
          </span>
          <span className="text-[10px] text-slate-400">Contas do mês a pagar</span>
        </div>

        {/* 4. Saldo Livre */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Saldo Livre Real</span>
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
          <span className={`text-base font-black tabular-nums block ${snapshot.free >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {!isBlurred ? formatBRL(snapshot.free) : 'R$ •••••'}
          </span>
          <span className="text-[10px] text-slate-400">Após contas do mês</span>
        </div>
      </div>

      {/* Period Selector Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Escolher Período do Relatório
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
            {activeRange.label}
          </span>
        </div>

        {/* Period Chips */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'current', label: 'Situação Atual' },
            { id: 'this_month', label: 'Este Mês' },
            { id: 'last_month', label: 'Mês Anterior' },
            { id: 'last_30_days', label: 'Últimos 30 dias' },
            { id: 'last_3_months', label: 'Últimos 3 meses' },
            { id: 'last_6_months', label: 'Últimos 6 meses' },
            { id: 'this_year', label: 'Este Ano' },
            { id: 'custom', label: 'Personalizado' },
          ].map(p => {
            const isSelected = periodType === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPeriodType(p.id as ReportPeriodType)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Inputs if "custom" is selected */}
        {periodType === 'custom' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-500">Início:</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-500">Fim:</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Direct AI Launcher Bar (1-Click Copy & Open) */}
      <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900 to-slate-900 text-white rounded-[2rem] p-5 shadow-xl border border-indigo-500/20 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sparkles size={16} className="text-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-indigo-200">
                Copiar e Abrir Direto na sua IA Favorita
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Copia o relatório financeiro automaticamente para a área de transferência e abre o chat
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenAI('https://chatgpt.com')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black transition active:scale-95 flex items-center space-x-1.5"
            >
              <span>ChatGPT</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>
            <button
              onClick={() => handleOpenAI('https://claude.ai')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black transition active:scale-95 flex items-center space-x-1.5"
            >
              <span>Claude</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>
            <button
              onClick={() => handleOpenAI('https://gemini.google.com')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black transition active:scale-95 flex items-center space-x-1.5"
            >
              <span>Gemini</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Questions to Ask the AI */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HelpCircle size={16} className="text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Perguntas Prontas para Fazer à IA (Copiar com 1 Clique)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            Copia a pergunta já com o relatório colado
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {promptSuggestions.map((prompt, idx) => {
            const isJustCopied = copiedPromptIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => handleCopyPrompt(prompt, idx)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200/70 dark:border-slate-800 text-left transition active:scale-[0.99] group flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                    Sugestão #{idx + 1}
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">
                    "{prompt}"
                  </p>
                </div>
                <div className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                  isJustCopied 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white dark:bg-slate-700 text-slate-400 group-hover:text-purple-600'
                }`}>
                  {isJustCopied ? <Check size={14} /> : <Copy size={14} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pure Text Preview Window */}
      <div className="bg-slate-950 rounded-[2rem] p-5 shadow-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FileText size={16} className="text-indigo-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Visualização do Texto Puro (Exportação)
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
            <span>{reportText.split('\n').length} linhas</span>
            <span>•</span>
            <span>{reportText.length.toLocaleString('pt-BR')} caracteres</span>
          </div>
        </div>

        {/* Textarea / Code Box */}
        <div className="relative">
          <textarea
            readOnly
            value={reportText}
            rows={18}
            className="w-full bg-slate-900/90 text-emerald-300 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y leading-relaxed select-all selection:bg-indigo-600 selection:text-white"
          />
        </div>

        {/* Bottom Bar: Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Info size={14} className="text-indigo-400" />
            <span>Dica: clique dentro da caixa para selecionar tudo com Ctrl+A (ou use os botões abaixo).</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handleExportTxt}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <Download size={14} />
              <span>Baixar .TXT</span>
            </button>

            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center space-x-1.5 shadow-lg ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
              <span>{copied ? 'Relatório Copiado!' : 'Copiar Texto Completo'}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
