import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  Home, ShoppingCart, Car, Gamepad2, Tv, 
  HeartPulse, ShoppingBag, Layers, AlertCircle, 
  TrendingUp, TrendingDown, Minus, Info, ChevronRight,
  Sparkles, Filter, CheckCircle2, Sliders
} from 'lucide-react';
import { 
  isTransferMovement, 
  isGoalMovement 
} from '../services/aiReportService';

interface CategoryGroupAnalysis {
  id: string;
  name: string;
  icon: any;
  color: string;
  mediaMensal: number | null;
  gastoMesAtual: number;
  diferenca: number | null;
  diffPercent: number | null;
  hasInsufficientHistory: boolean;
  historyMonthsCount: number;
  subcategories: string[];
}

export const SpendingAveragesSection: React.FC = () => {
  const { transactions, categories, isBlurred } = useFinance();
  const [viewMode, setViewMode] = useState<'groups' | 'detailed'>('groups');

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // ---------------------------------------------------------------------------
  // APURAÇÃO DE HISTÓRICO E MESES DISPONÍVEIS
  // ---------------------------------------------------------------------------
  const { 
    validExpenseTxs, 
    allMonths, 
    pastMonths, 
    hasOverallInsufficientHistory 
  } = useMemo(() => {
    // 1. Filtrar despesas operacionais reais (exclui transferências e cofrinhos)
    const filtered = transactions.filter(t => 
      t.type === 'expense' && 
      !isTransferMovement(t) && 
      !isGoalMovement(t)
    );

    const monthSet = new Set<string>();
    filtered.forEach(t => {
      const ym = t.date.slice(0, 7);
      if (ym) monthSet.add(ym);
    });

    const monthsArr = Array.from(monthSet).sort();
    const pastArr = monthsArr.filter(m => m < currentMonthPrefix);

    // Consideramos histórico insuficiente geral se não houver pelo menos 1 mês passado completo
    // ou se o histórico tiver apenas o mês corrente.
    const insufficient = pastArr.length === 0;

    return {
      validExpenseTxs: filtered,
      allMonths: monthsArr,
      pastMonths: pastArr,
      hasOverallInsufficientHistory: insufficient
    };
  }, [transactions, currentMonthPrefix]);

  // ---------------------------------------------------------------------------
  // DEFINIÇÃO DOS GRUPOS PRINCIPAIS SOLICITADOS PELO USUÁRIO:
  // - Moradia
  // - Alimentação/mercado
  // - Carro/transporte
  // - Lazer
  // - Streaming/assinaturas
  // - Saúde/academia
  // - Compras
  // - Outras categorias relevantes
  // ---------------------------------------------------------------------------
  const groupDefinitions = useMemo(() => {
    return [
      {
        id: 'group_moradia',
        name: 'Moradia',
        icon: Home,
        color: '#f97316',
        categoryIds: ['cat_2', 'cat_13'],
        keywords: ['moradia', 'aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'gás', 'gas', 'iptu', 'casa', 'energia', 'reforma', 'limpeza']
      },
      {
        id: 'group_alimentacao',
        name: 'Alimentação / Mercado',
        icon: ShoppingCart,
        color: '#ef4444',
        categoryIds: ['cat_1', 'cat_5', 'cat_22'],
        keywords: ['alimenta', 'mercado', 'supermercado', 'restaurante', 'delivery', 'comida', 'ifood', 'lanche', 'padaria', 'refeição', 'refeicao', 'hortifruti', 'açougue', 'acougue']
      },
      {
        id: 'group_transporte',
        name: 'Carro / Transporte',
        icon: Car,
        color: '#eab308',
        categoryIds: ['cat_3', 'cat_21'],
        keywords: ['carro', 'transporte', 'combustível', 'combustivel', 'gasolina', 'etanol', 'uber', '99', 'estacionamento', 'pedágio', 'pedagio', 'oficina', 'mecânico', 'mecanico', 'ipva', 'seguro auto', 'ônibus', 'onibus', 'metrô', 'metro']
      },
      {
        id: 'group_lazer',
        name: 'Lazer',
        icon: Gamepad2,
        color: '#8b5cf6',
        categoryIds: ['cat_16', 'cat_19', 'cat_28', 'cat_29'],
        keywords: ['lazer', 'cinema', 'teatro', 'diversão', 'diversao', 'jogo', 'game', 'viagem', 'férias', 'ferias', 'passeio', 'bar', 'praia', 'clube', 'hotel', 'balada']
      },
      {
        id: 'group_streaming',
        name: 'Streaming / Assinaturas',
        icon: Tv,
        color: '#f43f5e',
        categoryIds: ['cat_15', 'cat_14'],
        keywords: ['streaming', 'assinatura', 'netflix', 'spotify', 'amazon', 'prime', 'youtube', 'tv', 'internet', 'celular', 'telefonia', 'disney', 'hbo', 'max', 'globo', 'apple', 'icloud', 'software']
      },
      {
        id: 'group_saude',
        name: 'Saúde / Academia',
        icon: HeartPulse,
        color: '#10b981',
        categoryIds: ['cat_4', 'cat_11', 'cat_23'],
        keywords: ['saúde', 'saude', 'academia', 'médico', 'medico', 'remédio', 'remedio', 'farmácia', 'farmacia', 'esporte', 'dentista', 'consulta', 'exame', 'terapia', 'psicolog', 'crossfit', 'suplemento']
      },
      {
        id: 'group_compras',
        name: 'Compras',
        icon: ShoppingBag,
        color: '#ec4899',
        categoryIds: ['cat_9', 'cat_18', 'cat_20'],
        keywords: ['compra', 'roupa', 'calçado', 'calcado', 'sapato', 'vestuário', 'vestuario', 'presente', 'eletrônico', 'eletronico', 'shopee', 'mercado livre', 'amazon compras', 'beleza', 'salão', 'salao', 'barbeiro', 'perfume', 'cosmético', 'cosmetico']
      },
      {
        id: 'group_outras',
        name: 'Outras Categorias',
        icon: Layers,
        color: '#64748b',
        categoryIds: ['cat_12', 'cat_17', 'cat_26', 'cat_27'],
        keywords: ['curso', 'escola', 'faculdade', 'pet', 'veterinário', 'veterinario', 'seguro', 'imposto', 'taxa', 'multa', 'doação', 'doacao', 'dívida', 'divida', 'empréstimo', 'emprestimo', 'financiamento']
      }
    ];
  }, []);

  // Helper para testar se uma transação pertence a um grupo
  const matchesGroup = (t: any, group: typeof groupDefinitions[0]) => {
    if (group.id === 'group_outras') {
      // O grupo Outras pega o que não entrou nos 7 anteriores
      return false; // Será processado via fallback
    }

    if (group.categoryIds.includes(t.categoryId)) return true;

    const cat = categories.find(c => c.id === t.categoryId);
    const catName = (cat?.name || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();

    return group.keywords.some(k => catName.includes(k) || desc.includes(k));
  };

  // ---------------------------------------------------------------------------
  // CÁLCULO DAS MÉDIAS E COMPARAÇÕES POR GRUPO
  // ---------------------------------------------------------------------------
  const groupAnalyses: CategoryGroupAnalysis[] = useMemo(() => {
    const pastMonthsCount = pastMonths.length;

    return groupDefinitions.map(group => {
      // 1. Filtrar transações pertencentes a este grupo
      let groupTxs = validExpenseTxs.filter(t => {
        if (group.id === 'group_outras') {
          // Checa se NÃO bate com nenhum dos outros 7 grupos
          const matchesAnyOther = groupDefinitions
            .filter(g => g.id !== 'group_outras')
            .some(g => matchesGroup(t, g));
          return !matchesAnyOther;
        }
        return matchesGroup(t, group);
      });

      // 2. Transações dos meses passados
      const pastTxs = groupTxs.filter(t => t.date < currentMonthPrefix);
      const totalPast = pastTxs.reduce((s, t) => s + Number(t.amount), 0);

      // 3. Meses passados em que houve movimentação
      const distinctPastMonths = new Set(pastTxs.map(t => t.date.slice(0, 7)));

      // 4. Transações do mês atual
      const currentMonthTxs = groupTxs.filter(t => t.date.startsWith(currentMonthPrefix));
      const gastoMesAtual = currentMonthTxs.reduce((s, t) => s + Number(t.amount), 0);

      // Critério de histórico suficiente:
      // Se não há meses passados no histórico geral, OU este grupo nunca teve gastos em meses passados
      // e também não há base para média confiável, declaramos histórico insuficiente.
      const hasInsufficient = pastMonthsCount === 0 || (distinctPastMonths.size === 0 && totalPast === 0);

      let mediaMensal: number | null = null;
      let diferenca: number | null = null;
      let diffPercent: number | null = null;

      if (!hasInsufficient && pastMonthsCount > 0) {
        mediaMensal = totalPast / pastMonthsCount;
        diferenca = gastoMesAtual - mediaMensal;
        if (mediaMensal > 0) {
          diffPercent = (diferenca / mediaMensal) * 100;
        } else if (gastoMesAtual > 0) {
          diffPercent = 100;
        } else {
          diffPercent = 0;
        }
      }

      // Subcategorias envolvidas
      const subcatSet = new Set<string>();
      groupTxs.forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        if (cat) subcatSet.add(cat.name);
      });

      return {
        id: group.id,
        name: group.name,
        icon: group.icon,
        color: group.color,
        mediaMensal,
        gastoMesAtual,
        diferenca,
        diffPercent,
        hasInsufficientHistory: hasInsufficient,
        historyMonthsCount: distinctPastMonths.size,
        subcategories: Array.from(subcatSet)
      };
    });
  }, [validExpenseTxs, groupDefinitions, pastMonths, currentMonthPrefix, categories]);

  // ---------------------------------------------------------------------------
  // CÁLCULO POR CATEGORIA INDIVIDUAL (VISÃO DETALHADA)
  // ---------------------------------------------------------------------------
  const detailedCategoryAnalyses = useMemo(() => {
    const pastMonthsCount = pastMonths.length;

    // Apenas categorias com tipo expense e que tenham transações registradas
    const activeExpenseCategories = categories.filter(c => 
      c.type === 'expense' && 
      validExpenseTxs.some(t => t.categoryId === c.id)
    );

    return activeExpenseCategories.map(cat => {
      const catTxs = validExpenseTxs.filter(t => t.categoryId === cat.id);
      const pastTxs = catTxs.filter(t => t.date < currentMonthPrefix);
      const totalPast = pastTxs.reduce((s, t) => s + Number(t.amount), 0);
      const distinctPastMonths = new Set(pastTxs.map(t => t.date.slice(0, 7)));

      const currentMonthTxs = catTxs.filter(t => t.date.startsWith(currentMonthPrefix));
      const gastoMesAtual = currentMonthTxs.reduce((s, t) => s + Number(t.amount), 0);

      const hasInsufficient = pastMonthsCount === 0 || (distinctPastMonths.size === 0 && totalPast === 0);

      let mediaMensal: number | null = null;
      let diferenca: number | null = null;
      let diffPercent: number | null = null;

      if (!hasInsufficient && pastMonthsCount > 0) {
        mediaMensal = totalPast / pastMonthsCount;
        diferenca = gastoMesAtual - mediaMensal;
        if (mediaMensal > 0) {
          diffPercent = (diferenca / mediaMensal) * 100;
        } else if (gastoMesAtual > 0) {
          diffPercent = 100;
        } else {
          diffPercent = 0;
        }
      }

      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        mediaMensal,
        gastoMesAtual,
        diferenca,
        diffPercent,
        hasInsufficientHistory: hasInsufficient,
        historyMonthsCount: distinctPastMonths.size
      };
    }).sort((a, b) => (b.gastoMesAtual || 0) - (a.gastoMesAtual || 0));
  }, [categories, validExpenseTxs, pastMonths, currentMonthPrefix]);

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      
      {/* CABEÇALHO DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
              <TrendingUp size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Médias de Gastos
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  {pastMonths.length} {pastMonths.length === 1 ? 'mês base' : 'meses anteriores'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparativo automático entre seu padrão histórico e o consumo do mês atual
              </p>
            </div>
          </div>
        </div>

        {/* TOGGLE VISÃO PRINCIPAL / VISÃO DETALHADA */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl self-start sm:self-auto border border-slate-200 dark:border-slate-700/60">
          <button
            onClick={() => setViewMode('groups')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === 'groups'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Grupos Principais
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === 'detailed'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Por Categoria
          </button>
        </div>
      </div>

      {/* AVISO DE HISTÓRICO GERAL (CASO INSUFICIENTE) */}
      {hasOverallInsufficientHistory && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-900/60 flex items-start space-x-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Histórico Insuficiente para Cálculo de Médias</span>
            <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-400/90">
              O aplicativo registrou apenas movimentações do mês atual ({currentMonthPrefix}). Para não inventar médias artificiais, o sistema exige pelo menos 1 mês anterior fechado no histórico. Os valores abaixo mostram estritamente o gasto realizado no mês atual.
            </p>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 1. VISÃO DOS GRUPOS PRINCIPAIS SOLICITADOS                            */}
      {/* --------------------------------------------------------------------- */}
      {viewMode === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {groupAnalyses.map(group => {
            const IconComp = group.icon;
            const isAbove = group.diferenca !== null && group.diferenca > 1;
            const isBelow = group.diferenca !== null && group.diferenca < -1;
            const isNeutral = !isAbove && !isBelow;

            return (
              <div 
                key={group.id}
                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between space-y-3 transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Top bar: Icon, Name and Status Pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: group.color }}
                    >
                      <IconComp size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white">
                        {group.name}
                      </h3>
                      {group.subcategories.length > 0 && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                          {group.subcategories.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tag de comparação com a média */}
                  {group.hasInsufficientHistory ? (
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      Histórico Insuficiente
                    </span>
                  ) : isAbove ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900/50 flex items-center space-x-0.5">
                      <TrendingUp size={10} className="mr-0.5" />
                      <span>+{formatBRL(group.diferenca)} ({Math.round(group.diffPercent || 0)}%)</span>
                    </span>
                  ) : isBelow ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-900/50 flex items-center space-x-0.5">
                      <TrendingDown size={10} className="mr-0.5" />
                      <span>{formatBRL(group.diferenca)} ({Math.round(group.diffPercent || 0)}%)</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Na Média
                    </span>
                  )}
                </div>

                {/* 3 Valores: Média Mensal | Gasto no Mês Atual | Diferença */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 text-xs">
                  
                  {/* 1. MÉDIA MENSAL */}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Média Mensal
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums text-xs sm:text-sm mt-0.5 block">
                      {group.hasInsufficientHistory 
                        ? <span className="text-[10px] text-slate-400 font-normal italic">Insuficiente</span>
                        : formatBRL(group.mediaMensal)}
                    </span>
                  </div>

                  {/* 2. GASTO NO MÊS ATUAL */}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Mês Atual
                    </span>
                    <span className="font-black text-slate-900 dark:text-white tabular-nums text-xs sm:text-sm mt-0.5 block">
                      {formatBRL(group.gastoMesAtual)}
                    </span>
                  </div>

                  {/* 3. DIFERENÇA EM RELAÇÃO À MÉDIA */}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                      Diferença
                    </span>
                    <span className={`font-bold tabular-nums text-xs sm:text-sm mt-0.5 block ${
                      group.hasInsufficientHistory 
                        ? 'text-slate-400 font-normal italic text-[10px]'
                        : isAbove ? 'text-rose-600 dark:text-rose-400' 
                        : isBelow ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-slate-500'
                    }`}>
                      {group.hasInsufficientHistory 
                        ? '—' 
                        : (group.diferenca && group.diferenca > 0 ? `+${formatBRL(group.diferenca)}` : formatBRL(group.diferenca))}
                    </span>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. VISÃO POR CATEGORIA DETALHADA                                      */}
      {/* --------------------------------------------------------------------- */}
      {viewMode === 'detailed' && (
        <div className="space-y-2">
          {detailedCategoryAnalyses.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhuma movimentação de despesa cadastrada nas categorias até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {detailedCategoryAnalyses.map(cat => {
                const isAbove = cat.diferenca !== null && cat.diferenca > 1;
                const isBelow = cat.diferenca !== null && cat.diferenca < -1;

                return (
                  <div 
                    key={cat.id}
                    className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-xs ml-5 sm:ml-0">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Média</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                          {cat.hasInsufficientHistory ? '—' : formatBRL(cat.mediaMensal)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Mês Atual</span>
                        <span className="font-black text-slate-900 dark:text-white tabular-nums">
                          {formatBRL(cat.gastoMesAtual)}
                        </span>
                      </div>

                      <div className="min-w-[80px] text-right">
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Diferença</span>
                        <span className={`font-bold tabular-nums ${
                          cat.hasInsufficientHistory 
                            ? 'text-slate-400 italic text-[10px]'
                            : isAbove ? 'text-rose-600 dark:text-rose-400' 
                            : isBelow ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-slate-400'
                        }`}>
                          {cat.hasInsufficientHistory 
                            ? 'Insuficiente' 
                            : (cat.diferenca && cat.diferenca > 0 ? `+${formatBRL(cat.diferenca)}` : formatBRL(cat.diferenca))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RODA-PÉ DA SEÇÃO COM NOTA METODOLÓGICA */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
          <span>
            Transferências entre contas e aportes em cofrinhos são excluídos das médias.
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Base: despesas líquidas realizadas
        </span>
      </div>

    </section>
  );
};
