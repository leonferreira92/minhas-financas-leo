import {
  Account,
  Category,
  Debt,
  DebtStatus,
  FinancialSettings,
  Show,
  Transaction
} from '../types';
import { DEFAULT_FINANCIAL_SETTINGS } from '../constants';
import { isGoalMovement, isTransferMovement } from './aiReportService';
import { computeIncomeTarget } from './monthPanelService';

export type PurchaseVerdict = 'go' | 'careful' | 'wait';
export type PreferredPath = 'cash' | 'installments' | 'mixed' | 'wait' | 'none';

export interface PurchaseRoute {
  id: string;
  title: string;
  detail: string;
  recommended: boolean;
}

export interface PurchaseCapacity {
  /** Caixa pessoal operacional (sem poupança) */
  cashAvailableToday: number;
  /** Contas a pagar pendentes a partir de hoje */
  pendingCommitmentsFromToday: number;
  /** Quanto ainda falta para a meta de reserva (informativo) */
  reserveDeficit: number;
  targetSafetyReserve: number;
  targetReserveMonths: number;
  monthlyEssential: number;
  monthlyLifestyle: number;
  /** Quanto guardar / mês para montar a reserva (meta em construção) */
  monthlyReserveContribution: number;
  /** Média de entradas dos últimos 3 meses */
  avgIncomeLast3Months: number;
  /** Essenciais + parcela da reserva + parcelas de dívidas já existentes */
  safeMonthlyNeed: number;
  /** Folga mensal = média de ganho − necessidade segura */
  monthlySurplus: number;
  /**
   * Limite à vista: caixa − a pagar − colchão mínimo (1 mês de essencial * 0,25).
   * NÃO desconta o déficit total da reserva de uma vez.
   */
  spotPurchaseCapacity: number;
  /**
   * Parcela máxima saudável: 85% da folga mensal (independente do à vista).
   */
  maxMonthlyInstallment: number;
  /** Parcelas de dívidas já ativas (estimativa mensal) */
  existingDebtInstallments: number;
  /** Explicação curta dos números-base */
  howItWorks: string[];
}

export interface PurchaseAdvice extends PurchaseCapacity {
  amount: number;
  verdict: PurchaseVerdict;
  verdictLabel: string;
  summary: string;
  preferredPath: PreferredPath;
  bestInstallments: number | null;
  installmentValue: number;
  routes: PurchaseRoute[];
}

type BalanceFn = (accountId: string) => number;
type DebtProgressFn = (debtId: string) => { status: DebtStatus | string; remaining: number };

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const computeExistingDebtInstallments = (
  debts: Debt[],
  transactions: Transaction[],
  getDebtProgress: DebtProgressFn,
  monthPrefix: string
): number => {
  const active = debts.filter(d => {
    const prog = getDebtProgress(d.id);
    return prog.status !== 'paid' && prog.remaining > 0.1;
  });

  return active.reduce((sum, d) => {
    if (d.installmentAmount && d.installmentAmount > 0) {
      return sum + Number(d.installmentAmount);
    }
    const tx = transactions.find(
      t => t.debtId === d.id && t.date?.startsWith(monthPrefix)
    );
    if (tx) return sum + Math.abs(Number(tx.amount) || 0);
    const count = Math.max(1, d.installmentCount || 1);
    return sum + Number(d.totalAmount) / count;
  }, 0);
};

const computeCapacity = (params: {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  shows: Show[];
  financialSettings?: FinancialSettings;
  getAccountBalance: BalanceFn;
  getDebtProgress: DebtProgressFn;
  cashAccountIds?: string[];
}): PurchaseCapacity => {
  const fs = { ...DEFAULT_FINANCIAL_SETTINGS, ...(params.financialSettings || {}) };
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthPrefix = todayStr.slice(0, 7);

  const operational = params.accounts.filter(a => {
    if (a.enabled === false) return false;
    if (a.type === 'savings') return false;
    if (params.cashAccountIds) return params.cashAccountIds.includes(a.id);
    return true;
  });

  const cashAvailableToday = operational.reduce(
    (s, a) => s + params.getAccountBalance(a.id),
    0
  );

  const incomeTarget = computeIncomeTarget({
    accounts: params.accounts,
    transactions: params.transactions,
    categories: params.categories,
    debts: params.debts,
    financialSettings: fs,
    getAccountBalance: params.getAccountBalance
  });

  const pendingCommitmentsFromToday = params.transactions
    .filter(
      t =>
        t.type === 'expense' &&
        t.status === 'pending' &&
        t.date >= todayStr &&
        !isTransferMovement(t) &&
        !isGoalMovement(t)
    )
    .reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const existingDebtInstallments = computeExistingDebtInstallments(
    params.debts,
    params.transactions,
    params.getDebtProgress,
    monthPrefix
  );

  const monthlyEssential = incomeTarget.essentialMonthly;
  const monthlyLifestyle = incomeTarget.lifestyleMonthly;
  const monthlyReserveContribution = incomeTarget.monthlyReserveContribution;
  const avgIncomeLast3Months = incomeTarget.avgIncomeLast3Months;
  const targetReserveMonths = incomeTarget.targetReserveMonths;
  const targetSafetyReserve = incomeTarget.targetReserveAmount;
  const reserveDeficit = incomeTarget.reserveDeficit;

  // Necessidade mensal segura: viver + ir montando reserva + parcelas já assumidas
  const safeMonthlyNeed =
    monthlyEssential + monthlyReserveContribution + existingDebtInstallments;

  const monthlySurplus = avgIncomeLast3Months - safeMonthlyNeed;

  // Colchão líquido mínimo (não zera a compra só porque a reserva de 6 meses ainda não está completa)
  const liquidCushion = monthlyEssential > 0 ? monthlyEssential * 0.25 : 0;

  const spotPurchaseCapacity = Math.max(
    0,
    cashAvailableToday - pendingCommitmentsFromToday - liquidCushion
  );

  // Parcela desacoplada do à vista: baseada na folga da média de ganho
  const maxMonthlyInstallment =
    monthlySurplus > 0 ? Math.max(0, Math.round(monthlySurplus * 0.85)) : 0;

  const howItWorks = [
    `Média de ganho (3 meses): ${fmt(avgIncomeLast3Months)}`,
    `Mês seguro (essencial + reserva + parcelas atuais): ${fmt(safeMonthlyNeed)}`,
    `Folga mensal: ${fmt(monthlySurplus)}`,
    `À vista = caixa ${fmt(cashAvailableToday)} − a pagar ${fmt(pendingCommitmentsFromToday)} − colchão ${fmt(liquidCushion)}`,
    `Parcela máx. = 85% da folga mensal (não depende do à vista)`,
    reserveDeficit > 0
      ? `Reserva de ${targetReserveMonths} meses ainda em construção (falta ${fmt(reserveDeficit)}) — isso não bloqueia compra sozinho`
      : `Reserva de ${targetReserveMonths} meses já atingida`
  ];

  return {
    cashAvailableToday,
    pendingCommitmentsFromToday,
    reserveDeficit,
    targetSafetyReserve,
    targetReserveMonths,
    monthlyEssential,
    monthlyLifestyle,
    monthlyReserveContribution,
    avgIncomeLast3Months,
    safeMonthlyNeed,
    monthlySurplus,
    spotPurchaseCapacity,
    maxMonthlyInstallment,
    existingDebtInstallments,
    howItWorks
  };
};

/**
 * Analisa compra com base em média de ganho, mês seguro e à vista vs parcelas.
 */
export const analyzePurchase = (params: {
  amount: number;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  shows: Show[];
  financialSettings?: FinancialSettings;
  getAccountBalance: BalanceFn;
  getDebtProgress: DebtProgressFn;
  cashAccountIds?: string[];
}): PurchaseAdvice => {
  const amount = Math.max(0, Number(params.amount) || 0);
  const capacity = computeCapacity(params);
  const routes: PurchaseRoute[] = [];

  if (amount <= 0) {
    return {
      ...capacity,
      amount: 0,
      verdict: 'wait',
      verdictLabel: 'Informe um valor',
      summary: 'Digite o preço do que você quer comprar. A análise usa sua média de ganho e o mês seguro.',
      preferredPath: 'none',
      bestInstallments: null,
      installmentValue: 0,
      routes: []
    };
  }

  const cashOk = amount <= capacity.spotPurchaseCapacity + 0.009;

  // Melhor N de parcelas (2–12) que cabe na folga mensal
  let bestInstallments: number | null = null;
  let installmentValue = 0;
  if (capacity.maxMonthlyInstallment > 0) {
    for (let n = 2; n <= 12; n++) {
      const parcela = amount / n;
      if (parcela <= capacity.maxMonthlyInstallment + 0.009) {
        bestInstallments = n;
        installmentValue = parcela;
        break;
      }
    }
  }

  // —— Rotas ——
  if (cashOk) {
    routes.push({
      id: 'spot',
      title: 'Comprar à vista',
      detail: `Cabe no limite à vista de ${fmt(capacity.spotPurchaseCapacity)}. Você mantém o colchão e as contas a pagar cobertas.`,
      recommended: true
    });
  } else {
    routes.push({
      id: 'spot',
      title: 'À vista — aperta o caixa',
      detail: `Limite à vista agora: ${fmt(capacity.spotPurchaseCapacity)}. Faltam ${fmt(Math.max(0, amount - capacity.spotPurchaseCapacity))} sem mexer no colchão de emergência curto.`,
      recommended: false
    });
  }

  if (bestInstallments) {
    const preferInstallments = !cashOk;
    routes.push({
      id: 'installments',
      title: `Parcelar em ${bestInstallments}× de ${fmt(installmentValue)}`,
      detail: `A parcela cabe na folga da sua média de ganho (até ${fmt(capacity.maxMonthlyInstallment)}/mês), sem furar o mês seguro.`,
      recommended: preferInstallments
    });
  } else if (capacity.maxMonthlyInstallment > 0) {
    const needN = Math.ceil(amount / capacity.maxMonthlyInstallment);
    routes.push({
      id: 'installments',
      title: 'Parcelar — parcela alta demais',
      detail:
        needN > 12
          ? `Mesmo em 12× (${fmt(amount / 12)}/mês) passa da folga de ${fmt(capacity.maxMonthlyInstallment)}.`
          : `Caberia em cerca de ${needN}×, mas a folga segura é só ${fmt(capacity.maxMonthlyInstallment)}/mês.`,
      recommended: false
    });
  } else {
    routes.push({
      id: 'installments',
      title: 'Parcelar — sem folga na média',
      detail:
        capacity.avgIncomeLast3Months <= 0
          ? 'Cadastre mais receitas nos últimos meses para o app calcular sua média de ganho.'
          : `Sua média (${fmt(capacity.avgIncomeLast3Months)}) não cobre o mês seguro (${fmt(capacity.safeMonthlyNeed)}). Nova parcela apertaria o essencial.`,
      recommended: false
    });
  }

  // Mistura: entrada com o que cabe à vista + resto parcelado
  if (!cashOk && capacity.spotPurchaseCapacity > 50 && capacity.maxMonthlyInstallment > 0) {
    const down = capacity.spotPurchaseCapacity;
    const rest = amount - down;
    for (let n = 2; n <= 12; n++) {
      const parcela = rest / n;
      if (parcela <= capacity.maxMonthlyInstallment + 0.009) {
        routes.push({
          id: 'mixed',
          title: `Entrada ${fmt(down)} + ${n}× de ${fmt(parcela)}`,
          detail: 'Usa o que sobra à vista e parcela só o restante dentro da folga mensal.',
          recommended: !routes.some(r => r.recommended)
        });
        break;
      }
    }
  }

  // Juntar cortando lazer
  if (!cashOk && !bestInstallments && capacity.monthlyLifestyle > 0) {
    const gap = amount - capacity.spotPurchaseCapacity;
    const monthsToSave = Math.ceil(gap / Math.max(capacity.monthlyLifestyle * 0.5, 1));
    routes.push({
      id: 'cut_lifestyle',
      title:
        monthsToSave <= 1
          ? 'Segurar lazer neste mês e comprar'
          : `Juntar ~${monthsToSave} meses segurando lazer`,
      detail: `Seu lazer médio é ${fmt(capacity.monthlyLifestyle)}/mês. Cortando metade, dá para juntar sem tocar no essencial.`,
      recommended: !routes.some(r => r.recommended)
    });
  }

  if (!routes.some(r => r.recommended)) {
    routes.push({
      id: 'wait',
      title: 'Esperar um mês melhor',
      detail: `Priorize o mês seguro (${fmt(capacity.safeMonthlyNeed)}). Quando a média de ganho subir ou as contas pendentes caírem, tente de novo.`,
      recommended: true
    });
  }

  // Veredito + caminho preferido
  let verdict: PurchaseVerdict = 'wait';
  let verdictLabel = 'Melhor esperar';
  let summary = 'Agora a compra atrapalharia o mês seguro ou a folga da média de ganho.';
  let preferredPath: PreferredPath = 'wait';

  const rec = routes.find(r => r.recommended);

  if (cashOk) {
    verdict = 'go';
    verdictLabel = 'Pode comprar à vista';
    summary =
      bestInstallments && installmentValue < amount
        ? `À vista é a melhor opção. Parcelar também caberia (${bestInstallments}×), mas pagar agora evita compromisso futuro.`
        : 'À vista cabe no caixa depois das contas a pagar, mantendo um colchão mínimo.';
    preferredPath = 'cash';
    // Marca à vista como ideal; desmarca parcela se ambas ok
    routes.forEach(r => {
      r.recommended = r.id === 'spot';
    });
  } else if (rec?.id === 'installments' && bestInstallments) {
    verdict = 'careful';
    verdictLabel = `Melhor parcelar em ${bestInstallments}×`;
    summary = `À vista aperta o caixa. Em ${bestInstallments}× de ${fmt(installmentValue)} a parcela cabe na folga da sua média de ganho, sem furar essenciais + reserva em construção.`;
    preferredPath = 'installments';
  } else if (rec?.id === 'mixed') {
    verdict = 'careful';
    verdictLabel = 'Dá com entrada + parcelas';
    summary = 'Nem tudo à vista, nem tudo parcelado — o meio-termo protege o colchão e a folga mensal.';
    preferredPath = 'mixed';
  } else if (rec?.id === 'cut_lifestyle') {
    verdict = 'careful';
    verdictLabel = 'Só se cortar lazer';
    summary = 'Sem folga à vista nem na média para parcelar. Dá para juntar reduzindo compras/lazer.';
    preferredPath = 'wait';
  }

  return {
    ...capacity,
    amount,
    verdict,
    verdictLabel,
    summary,
    preferredPath,
    bestInstallments: cashOk ? null : bestInstallments,
    installmentValue: cashOk ? 0 : installmentValue,
    routes
  };
};

export const getPurchaseCapacity = computeCapacity;
