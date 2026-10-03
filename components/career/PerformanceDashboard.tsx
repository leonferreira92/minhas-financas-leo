import React, { useState, useMemo } from 'react';
import { Show, Transaction } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';
import { 
  Music, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, 
  Percent, Award, Calendar, BarChart3, PieChart, Sparkles, 
  MapPin, Users, Fuel, Briefcase, ChevronRight, CheckCircle2, Clock
} from 'lucide-react';

interface Props {
  shows: Show[];
  transactions: Transaction[];
  onSelectShow?: (show: Show) => void;
  onOpenCreateShow?: () => void;
}

export const PerformanceDashboard: React.FC<Props> = ({
  shows,
  transactions,
  onSelectShow,
  onOpenCreateShow
}) => {
  const { isBlurred } = useFinance();
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m' | 'year' | 'all'>('6m');
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonthIdx = currentDate.getMonth();

  // Generate Month list based on selected time range
  const monthsData = useMemo(() => {
    const count = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : timeRange === '12m' ? 12 : timeRange === 'year' ? 12 : 12;
    const list: { monthKey: string; label: string; year: number; month: number }[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthIdx - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      list.push({ monthKey: key, label, year: y, month: m });
    }
    return list;
  }, [timeRange, currentYear, currentMonthIdx]);

  // Calculate monthly metrics for chart
  const chartSeries = useMemo(() => {
    return monthsData.map(m => {
      const monthShows = shows.filter(s => s.date && s.date.startsWith(m.monthKey) && s.status !== 'Cancelado');
      
      // Receitas do Mês (Entradas Reais via transações de shows/música ou cachê contratado de shows realizados)
      const incomeTxs = transactions.filter(t => {
        if (!t.date || !t.date.startsWith(m.monthKey)) return false;
        if (t.type !== 'income' || t.status !== 'paid') return false;
        const desc = (t.description || '').toLowerCase();
        if (desc.includes('recebimento de pró-labore') || desc.includes('recebimento de pro-labore')) return false;
        return t.scope === 'BUSINESS' || t.categoryId === 'cat_33' || !!t.showId || desc.includes('cachê') || desc.includes('show');
      });
      const revenue = incomeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Despesas do Mês (Custos de equipe, equipamentos, combustível, marketing, etc.)
      const expenseTxs = transactions.filter(t => {
        if (!t.date || !t.date.startsWith(m.monthKey)) return false;
        if (t.type !== 'expense' || t.status !== 'paid') return false;
        return t.scope === 'BUSINESS' || !!t.showId || t.categoryId === 'cat_producao_shows' || t.categoryId === 'cat_equipamentos' || t.categoryId === 'cat_marketing';
      });
      const expenses = expenseTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const profit = Math.round((revenue - expenses) * 100) / 100;
      const showsCount = monthShows.length;

      return {
        key: m.monthKey,
        label: m.label,
        revenue,
        expenses,
        profit,
        showsCount
      };
    });
  }, [monthsData, shows, transactions]);

  // Overall Global Career Performance Metrics
  const globalMetrics = useMemo(() => {
    const validShows = shows.filter(s => s.status !== 'Cancelado');
    const totalShowsCount = validShows.length;
    const completedShowsCount = validShows.filter(s => s.status === 'Realizado').length;
    const confirmedShowsCount = validShows.filter(s => s.status === 'Confirmado').length;
    const quotesShowsCount = validShows.filter(s => s.status === 'Orçamento' || s.status === 'Aguardando confirmação').length;

    // Receita Total Bruta de Cachês
    const totalGrossRevenue = validShows.reduce((sum, s) => {
      const fin = getShowFinancialSummary(s, transactions);
      return sum + fin.totalContracted;
    }, 0);

    // Custos Totais da Música
    const totalMusicExpenses = transactions
      .filter(t => t.status === 'paid' && t.type === 'expense' && (
        t.scope === 'BUSINESS' || 
        !!t.showId || 
        t.categoryId === 'cat_producao_shows' || 
        t.categoryId === 'cat_equipamentos' || 
        t.categoryId === 'cat_marketing'
      ))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Total Efetivamente Recebido em Caixa
    const totalReceivedInCash = transactions
      .filter(t => t.status === 'paid' && t.type === 'income' && (
        t.scope === 'BUSINESS' || 
        t.categoryId === 'cat_33' || 
        !!t.showId
      ))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Lucro Líquido Real
    const netRealProfit = totalGrossRevenue - totalMusicExpenses;
    const netCashProfit = totalReceivedInCash - totalMusicExpenses;

    // Margem de Lucro Real (%)
    const profitMargin = totalGrossRevenue > 0 ? (netRealProfit / totalGrossRevenue) * 100 : 0;

    // Ticket Médio por Show (Receita Média e Lucro Médio)
    const averageTicketPerShow = totalShowsCount > 0 ? totalGrossRevenue / totalShowsCount : 0;
    const averageProfitPerShow = totalShowsCount > 0 ? netRealProfit / totalShowsCount : 0;

    // Média de Lucro Mensal (com base nos meses do período analisado)
    const activeMonthsWithActivity = chartSeries.filter(m => m.revenue > 0 || m.showsCount > 0);
    const monthsDivisor = Math.max(1, activeMonthsWithActivity.length || chartSeries.length);
    const totalPeriodProfit = chartSeries.reduce((s, m) => s + m.profit, 0);
    const averageMonthlyProfit = totalPeriodProfit / monthsDivisor;

    return {
      totalShowsCount,
      completedShowsCount,
      confirmedShowsCount,
      quotesShowsCount,
      totalGrossRevenue,
      totalReceivedInCash,
      totalMusicExpenses,
      netRealProfit,
      netCashProfit,
      profitMargin,
      averageTicketPerShow,
      averageProfitPerShow,
      averageMonthlyProfit
    };
  }, [shows, transactions, chartSeries]);

  // Breakdown by Event Type
  const eventTypesBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; totalRevenue: number }>();
    shows.filter(s => s.status !== 'Cancelado').forEach(s => {
      const type = s.eventType || 'Bar / Pub / Restaurante';
      const existing = map.get(type) || { count: 0, totalRevenue: 0 };
      const fin = getShowFinancialSummary(s, transactions);
      map.set(type, {
        count: existing.count + 1,
        totalRevenue: existing.totalRevenue + fin.totalContracted
      });
    });

    return Array.from(map.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      totalRevenue: data.totalRevenue,
      percentage: globalMetrics.totalGrossRevenue > 0 ? (data.totalRevenue / globalMetrics.totalGrossRevenue) * 100 : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [shows, transactions, globalMetrics.totalGrossRevenue]);

  // Chart Dimensions & Calculations for SVG
  const maxVal = Math.max(...chartSeries.map(d => Math.max(d.revenue, d.expenses, d.profit, 1000)), 3000);
  const chartHeight = 180;
  const chartWidth = 560;
  const paddingX = 40;
  const paddingY = 25;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const getX = (index: number) => {
    if (chartSeries.length <= 1) return paddingX + innerWidth / 2;
    return paddingX + (index / (chartSeries.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, val);
    return paddingY + innerHeight - (clamped / maxVal) * innerHeight;
  };

  // Build SVG Path strings
  const revenuePoints = chartSeries.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const expensePoints = chartSeries.map((d, i) => `${getX(i)},${getY(d.expenses)}`).join(' ');
  const profitPoints = chartSeries.map((d, i) => `${getX(i)},${getY(d.profit)}`).join(' ');

  return (
    <div className="space-y-6">
      
      {/* 1. SELETOR DE PERÍODO & INTRO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121214] p-4 rounded-3xl border border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
              Dashboard de Performance & Lucratividade
            </h2>
            <p className="text-[11px] text-zinc-400">
              Métricas consolidadas de cachês, equipe, logística e ticket médio.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800 self-start sm:self-auto">
          {(['3m', '6m', '12m'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 ${
                timeRange === range
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {range === '3m' ? '3 Meses' : range === '6m' ? '6 Meses' : '12 Meses'}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARDS PRINCIPAIS DE PERFORMANCE (REQUISITO 1 DO BRIEFING)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* CARD 1: TOTAL DE SHOWS */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-purple-950/40 via-[#16131f] to-[#121214] border border-purple-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
              <Music size={12} className="text-purple-400" />
              Total de Shows
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
              {globalMetrics.completedShowsCount} feitos
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {globalMetrics.totalShowsCount}
            </span>
            <span className="text-xs text-purple-300 font-bold">apresentações</span>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium">
            {globalMetrics.confirmedShowsCount} confirmados • {globalMetrics.quotesShowsCount} em negociação
          </p>
        </div>

        {/* CARD 2: RECEITA BRUTA */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-[#101c15] to-[#121214] border border-emerald-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
              <DollarSign size={12} className="text-emerald-400" />
              Receita Bruta
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
              Cachês
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
              {formatCurrency(globalMetrics.totalGrossRevenue)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium">
            Entradas no caixa: {formatCurrency(globalMetrics.totalReceivedInCash)}
          </p>
        </div>

        {/* CARD 3: CUSTOS TOTAIS DA MÚSICA */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-rose-950/40 via-[#1c1214] to-[#121214] border border-rose-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1">
              <ArrowDownRight size={12} className="text-rose-400" />
              Custos Totais
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
              Despesas
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-400 tabular-nums">
              {formatCurrency(globalMetrics.totalMusicExpenses)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium">
            Equipe, logística, locomoção e infra
          </p>
        </div>

        {/* CARD 4: LUCRO LÍQUIDO REAL */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-blue-950/40 via-[#101726] to-[#121214] border border-blue-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1">
              <TrendingUp size={12} className="text-blue-400" />
              Lucro Líquido Real
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
              {globalMetrics.profitMargin.toFixed(0)}% margem
            </span>
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-xl sm:text-2xl font-black tabular-nums ${
              globalMetrics.netRealProfit >= 0 ? 'text-blue-400' : 'text-rose-400'
            }`}>
              {formatCurrency(globalMetrics.netRealProfit)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium">
            Receita bruta menos todos os custos
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. MÉDIAS E INDICADORES ESTRATÉGICOS (MÉDIA MENSAL & TICKET MÉDIO)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* TICKET MÉDIO POR APRESENTAÇÃO */}
        <div className="p-5 rounded-3xl bg-[#141416] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Award size={16} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Ticket Médio por Show
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-bold">Por apresentação</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase">Cachê Médio</span>
              <span className="text-lg font-black text-amber-300 tabular-nums block mt-1">
                {formatCurrency(globalMetrics.averageTicketPerShow)}
              </span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5 block">Valor bruto contratado</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase">Lucro Médio</span>
              <span className="text-lg font-black text-emerald-400 tabular-nums block mt-1">
                {formatCurrency(globalMetrics.averageProfitPerShow)}
              </span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5 block">Lucro limpo por evento</span>
            </div>
          </div>
        </div>

        {/* MÉDIA DE LUCRO MENSAL */}
        <div className="p-5 rounded-3xl bg-[#141416] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Percent size={16} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Média de Lucro Mensal
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-bold">Histórico do período</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase">Lucro Médio / Mês</span>
              <span className="text-lg font-black text-emerald-400 tabular-nums block mt-1">
                {formatCurrency(globalMetrics.averageMonthlyProfit)}
              </span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5 block">Média líquida mensal</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-400 block uppercase">Margem Operacional</span>
              <span className="text-lg font-black text-purple-400 tabular-nums block mt-1">
                {globalMetrics.profitMargin.toFixed(1)}%
              </span>
              <span className="text-[9px] text-zinc-400 font-medium mt-0.5 block">Eficiência de custos</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. GRÁFICO DE FLUXO DE CAIXA MENSAL (RECEITA VS DESPESA VS LUCRO)         */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#141416] border border-zinc-800 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <BarChart3 size={16} className="text-purple-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Fluxo de Caixa Mensal da Música
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Comparativo de Receitas (Cachês), Despesas (Equipe/Logística) e Lucro Líquido Real.
            </p>
          </div>

          {/* Legenda do Gráfico */}
          <div className="flex items-center space-x-4 text-xs font-bold">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              <span className="text-zinc-300">Receita</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]" />
              <span className="text-zinc-300">Despesa</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
              <span className="text-zinc-300">Lucro</span>
            </div>
          </div>
        </div>

        {/* GRÁFICO SVG RESPONSIVO */}
        <div className="w-full overflow-x-auto no-scrollbar py-2">
          <div className="min-w-[500px] sm:min-w-full">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 sm:h-52 overflow-visible">
              <defs>
                <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines Horizontais */}
              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const y = paddingY + innerHeight * (1 - ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#27272a"
                      strokeDasharray="3,3"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 6}
                      y={y + 3}
                      textAnchor="end"
                      fill="#71717a"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {formatCurrency(maxVal * ratio).replace('R$', '').trim()}
                    </text>
                  </g>
                );
              })}

              {/* Linha de Lucro (Sombreado) */}
              <path
                d={`M ${getX(0)},${paddingY + innerHeight} L ${profitPoints.split(' ').join(' L ')} L ${getX(chartSeries.length - 1)},${paddingY + innerHeight} Z`}
                fill="url(#profitAreaGrad)"
              />

              {/* Linha 1: Receita (Verde) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={revenuePoints}
              />

              {/* Linha 2: Despesas (Rosa) */}
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeDasharray="4,3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={expensePoints}
              />

              {/* Linha 3: Lucro (Roxo Sólido) */}
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={profitPoints}
              />

              {/* Pontos Interativos e Labels */}
              {chartSeries.map((d, i) => {
                const x = getX(i);
                const yRev = getY(d.revenue);
                const yExp = getY(d.expenses);
                const yProf = getY(d.profit);
                const isHovered = activeChartPoint === i;

                return (
                  <g key={d.key} onMouseEnter={() => setActiveChartPoint(i)} className="cursor-pointer">
                    {/* Linha vertical de foco */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1={paddingY}
                        x2={x}
                        y2={paddingY + innerHeight}
                        stroke="#8b5cf6"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    )}

                    {/* Círculo Receita */}
                    <circle cx={x} cy={yRev} r={isHovered ? "5" : "3.5"} fill="#10b981" stroke="#141416" strokeWidth="2" />
                    {/* Círculo Despesa */}
                    <circle cx={x} cy={yExp} r={isHovered ? "5" : "3.5"} fill="#f43f5e" stroke="#141416" strokeWidth="2" />
                    {/* Círculo Lucro */}
                    <circle cx={x} cy={yProf} r={isHovered ? "6" : "4.5"} fill="#a855f7" stroke="#ffffff" strokeWidth="2" />

                    {/* Mês no Eixo X */}
                    <text
                      x={x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fill={isHovered ? "#ffffff" : "#a1a1aa"}
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Detalhe do mês selecionado ou resumo em cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800">
          {chartSeries.slice(-4).map(m => (
            <div key={m.key} className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span>{m.label}</span>
                <span className="text-purple-400">{m.showsCount} {m.showsCount === 1 ? 'show' : 'shows'}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-emerald-400 font-bold">+{formatCurrency(m.revenue)}</span>
                <span className="text-xs text-rose-400 font-bold">-{formatCurrency(m.expenses)}</span>
              </div>
              <div className="text-xs font-black text-white pt-0.5 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400">Lucro:</span>
                <span className={m.profit >= 0 ? 'text-purple-400' : 'text-rose-400'}>{formatCurrency(m.profit)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. RAIO-X POR TIPO DE EVENTO & FATURAMENTO POR FORMATO                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* EVENTOS POR CATEGORIA */}
        <div className="p-5 rounded-3xl bg-[#141416] border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieChart size={16} className="text-purple-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Faturamento por Tipo de Evento
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 font-bold">Mix de Shows</span>
          </div>

          <div className="space-y-3 pt-1">
            {eventTypesBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">Nenhum show registrado com categoria ainda.</p>
            ) : (
              eventTypesBreakdown.map((item, idx) => (
                <div key={item.type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="font-bold text-zinc-200">{item.type}</span>
                      <span className="text-[10px] text-zinc-400">({item.count} {item.count === 1 ? 'show' : 'shows'})</span>
                    </div>
                    <span className="font-black text-white">{formatCurrency(item.totalRevenue)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DICAS DE CARREIRA E ESTRATÉGIA MUSICAL */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1b152b] to-[#121214] border border-purple-500/30 space-y-3">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-300">
              Insights de Carreira (Sou Artista)
            </h3>
          </div>

          <div className="space-y-2.5 text-xs text-zinc-300">
            <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-900/50 flex items-start space-x-2.5">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Margem de Lucro Recomendada</span>
                <span className="text-[11px] text-zinc-400">
                  Sua margem atual está em <strong>{globalMetrics.profitMargin.toFixed(0)}%</strong>. O ideal para artistas independentes é manter margem líquida acima de <strong>60%</strong> após cachês de equipe e locomoção.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-900/50 flex items-start space-x-2.5">
              <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Previsibilidade de Caixa</span>
                <span className="text-[11px] text-zinc-400">
                  Cadastre o pagamento de sinal (ex: 50% no fechamento e 50% na data do show) para manter seu fluxo de caixa positivo antes mesmo do evento acontecer!
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
