import {
  Account,
  Category,
  Debt,
  FinancialSettings,
  Transaction
} from '../types';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import {
  isDiscretionaryExpense,
  isEssentialExpense,
  isGoalMovement,
  isTransferMovement
} from './aiReportService';
import { estimateMonthlyEssential, estimateMonthlyLifestyle } from './monthPanelService';

export type InsightTone = 'good' | 'warn' | 'action';

export interface SavingsTip {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  /** Economia potencial estimada (mensal), se aplicável */
  potentialMonthlySaving?: number;
  categoryId?: string;
  categoryName?: string;
}

export interface SavingsInsightsSnapshot {
  monthPrefix: string;
  monthLabel: string;
  thisMonthDiscretionary: number;
  avgDiscretionary3m: number;
  thisMonthEssential: number;
  tips: SavingsTip[];
  headline: string;
}

const monthPrefixes = (count: number, offsetStart = 0): string[] => {
  const out: string[] = [];
  const now = new Date();
  for (let i = offsetStart; i < offsetStart + count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
};

const sumByCategory = (
  transactions: Transaction[],
  month: string,
  predicate: (t: Transaction) => boolean
): Map<string, number> => {
  const map = new Map<string, number>();
  transactions.forEach(t => {
    if (!t.date?.startsWith(month) || t.status === 'cancelled') return;
    if (!predicate(t)) return;
    const id = t.categoryId || 'cat_other';
    map.set(id, (map.get(id) || 0) + Math.abs(Number(t.amount) || 0));
  });
  return map;
};

const totalOf = (map: Map<string, number>) =>
  Array.from(map.values()).reduce((a, b) => a + b, 0);

/**
 * Gera dicas simples de economia a partir do histórico (sem IA externa).
 */
export const computeSavingsInsights = (params: {
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  accounts: Account[];
  financialSettings?: FinancialSettings;
  getAccountBalance: (id: string) => number;
}): SavingsInsightsSnapshot => {
  const fs = { ...DEFAULT_FINANCIAL_SETTINGS, ...(params.financialSettings || {}) };
  const now = new Date();
  const monthPrefix = now.toISOString().slice(0, 7);
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const pastMonths = monthPrefixes(3, 1); // 3 meses anteriores

  const isDisc = (t: Transaction) =>
    isDiscretionaryExpense(t, params.categories, params.debts, fs);
  const isEss = (t: Transaction) =>
    isEssentialExpense(t, params.categories, params.debts, fs);

  const thisDiscMap = sumByCategory(params.transactions, monthPrefix, isDisc);
  const thisEssMap = sumByCategory(params.transactions, monthPrefix, isEss);
  const thisMonthDiscretionary = totalOf(thisDiscMap);
  const thisMonthEssential = totalOf(thisEssMap);

  // Média por categoria nos 3 meses anteriores (só meses com algum movimento)
  const pastDiscTotals: number[] = [];
  const pastCatAvg = new Map<string, number>();
  const pastCatCounts = new Map<string, number>();

  pastMonths.forEach(m => {
    const map = sumByCategory(params.transactions, m, isDisc);
    const tot = totalOf(map);
    if (tot > 0) pastDiscTotals.push(tot);
    map.forEach((val, catId) => {
      pastCatAvg.set(catId, (pastCatAvg.get(catId) || 0) + val);
      pastCatCounts.set(catId, (pastCatCounts.get(catId) || 0) + 1);
    });
  });

  pastCatAvg.forEach((sum, catId) => {
    const n = pastCatCounts.get(catId) || 1;
    pastCatAvg.set(catId, sum / n);
  });

  const avgDiscretionary3m =
    pastDiscTotals.length > 0
      ? pastDiscTotals.reduce((a, b) => a + b, 0) / pastDiscTotals.length
      : 0;

  const tips: SavingsTip[] = [];
  const getCatName = (id: string) =>
    params.categories.find(c => c.id === id)?.name || 'Outros';

  // 1) Categorias de lazer acima da média
  const spikes: { catId: string; now: number; avg: number; delta: number }[] = [];
  thisDiscMap.forEach((nowVal, catId) => {
    const avg = pastCatAvg.get(catId) || 0;
    if (nowVal >= 80 && (avg === 0 ? nowVal >= 150 : nowVal > avg * 1.25)) {
      spikes.push({
        catId,
        now: nowVal,
        avg,
        delta: nowVal - avg
      });
    }
  });
  spikes.sort((a, b) => b.delta - a.delta);

  spikes.slice(0, 3).forEach((s, idx) => {
    const name = getCatName(s.catId);
    const potential = Math.max(0, s.delta * 0.4); // meta realista: cortar ~40% do excesso
    tips.push({
      id: `spike_${s.catId}`,
      tone: 'action',
      title:
        s.avg > 0
          ? `${name} está acima do seu ritmo`
          : `${name} apareceu forte este mês`,
      detail:
        s.avg > 0
          ? `Você já gastou ${fmt(s.now)} aqui (média recente: ${fmt(s.avg)}). Se voltar perto da média, economiza cerca de ${fmt(potential)} neste mês.`
          : `Já são ${fmt(s.now)} em ${name}. Vale pausar novas compras nessa categoria até o fim do mês.`,
      potentialMonthlySaving: potential,
      categoryId: s.catId,
      categoryName: name
    });
    void idx;
  });

  // 2) Lazer total vs média
  if (avgDiscretionary3m > 0 && thisMonthDiscretionary > avgDiscretionary3m * 1.15) {
    const excess = thisMonthDiscretionary - avgDiscretionary3m;
    tips.push({
      id: 'lifestyle_total',
      tone: 'warn',
      title: 'Lazer e compras acima do habitual',
      detail: `No total de estilo de vida: ${fmt(thisMonthDiscretionary)} vs média de ${fmt(avgDiscretionary3m)}. Segurar cerca de ${fmt(excess * 0.5)} já deixa o mês mais leve.`,
      potentialMonthlySaving: excess * 0.5
    });
  } else if (
    avgDiscretionary3m > 0 &&
    thisMonthDiscretionary > 0 &&
    thisMonthDiscretionary <= avgDiscretionary3m * 0.9
  ) {
    tips.push({
      id: 'lifestyle_good',
      tone: 'good',
      title: 'Lazer sob controle',
      detail: `Você está gastando menos que a média recente em compras/lazer (${fmt(thisMonthDiscretionary)} vs ${fmt(avgDiscretionary3m)}). Bom ritmo.`
    });
  }

  // 3) Essenciais altos vs referência
  const essentialRef = estimateMonthlyEssential(
    params.transactions,
    params.categories,
    params.debts,
    fs
  );
  if (
    essentialRef > 0 &&
    thisMonthEssential > essentialRef * 1.2 &&
    thisMonthEssential - essentialRef > 100
  ) {
    tips.push({
      id: 'essential_high',
      tone: 'warn',
      title: 'Essenciais um pouco acima do normal',
      detail: `Contas essenciais do mês: ${fmt(thisMonthEssential)} (referência ~${fmt(essentialRef)}). Confira se não entrou algo duplicado ou fora do padrão.`
    });
  }

  // 4) Reserva / poupança
  const lifestyleRef = estimateMonthlyLifestyle(
    params.transactions,
    params.categories,
    params.debts,
    fs
  );
  const reserved = params.accounts
    .filter(a => a.enabled !== false && a.type === 'savings')
    .reduce((s, a) => s + params.getAccountBalance(a.id), 0);
  const targetMonths = fs.targetReserveMonths ?? 6;
  const minReserve = fs.minReserveAmount ?? 5000;
  const targetReserve = Math.max(
    minReserve,
    essentialRef > 0 ? essentialRef * targetMonths : 0
  );
  const deficit = Math.max(0, targetReserve - reserved);

  if (deficit > 200 && lifestyleRef > 100) {
    const cut = Math.min(lifestyleRef * 0.2, deficit / Math.max(targetMonths, 1));
    tips.push({
      id: 'feed_reserve',
      tone: 'action',
      title: 'Sobrou lazer? Alimente a reserva',
      detail: `Falta ${fmt(deficit)} para ${targetMonths} meses de segurança. Guardar ~${fmt(cut)}/mês (20% do lazer médio) acelera sem apertar o essencial.`,
      potentialMonthlySaving: cut
    });
  } else if (deficit <= 0 && targetReserve > 0) {
    tips.push({
      id: 'reserve_ok',
      tone: 'good',
      title: 'Caixa de segurança em dia',
      detail: `Sua reserva (${fmt(reserved)}) cobre a meta de ${targetMonths} meses. Pode focar em não aumentar o lazer sem necessidade.`
    });
  }

  // 5) Sem dados suficientes
  if (tips.length === 0) {
    const hasAnyExpense = params.transactions.some(
      t =>
        t.type === 'expense' &&
        t.status !== 'cancelled' &&
        !isTransferMovement(t) &&
        !isGoalMovement(t)
    );
    tips.push({
      id: 'need_data',
      tone: 'good',
      title: hasAnyExpense ? 'Ainda sem alertas claros' : 'Cadastre mais gastos',
      detail: hasAnyExpense
        ? 'Com o que está lançado, não há um corte óbvio agora. Continue registrando para o app afinar as dicas.'
        : 'Quanto mais você lança despesas por categoria, mais precisas ficam as sugestões de economia.'
    });
  }

  // Ordena: action > warn > good; limita a 4
  const toneRank: Record<InsightTone, number> = { action: 0, warn: 1, good: 2 };
  tips.sort((a, b) => toneRank[a.tone] - toneRank[b.tone]);
  const topTips = tips.slice(0, 4);

  const actionCount = topTips.filter(t => t.tone === 'action' || t.tone === 'warn').length;
  const headline =
    actionCount === 0
      ? 'Por enquanto, seus gastos estão equilibrados.'
      : actionCount === 1
        ? 'Tem 1 ponto claro para economizar este mês.'
        : `Tem ${actionCount} pontos claros para economizar este mês.`;

  return {
    monthPrefix,
    monthLabel,
    thisMonthDiscretionary,
    avgDiscretionary3m,
    thisMonthEssential,
    tips: topTips,
    headline
  };
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
