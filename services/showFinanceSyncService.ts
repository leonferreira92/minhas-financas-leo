import {
  Show,
  ShowPayment,
  ShowPaymentType,
  ShowExpenseItem,
  ShowCrewItem,
  ShowLogisticsItem,
  ShowOtherExpenseItem,
  ShowCostGroup,
  ShowLogisticsSubcategory,
  ShowCrewSubcategory,
  ShowEquipmentSubcategory,
  ShowExpenseSubcategory,
  Transaction,
  Category,
  TransactionStatus
} from '../types';
import { generateUUID } from './uuidHelper';

export interface ShowCostGroupDefinition {
  group: ShowCostGroup;
  label: string;
  categoryId: string;
  subcategories: string[];
}

export const SHOW_COST_GROUPS: Record<ShowCostGroup, ShowCostGroupDefinition> = {
  logistica: {
    group: 'logistica',
    label: 'Deslocamento / Logística',
    categoryId: 'cat_logistica_shows',
    subcategories: ['Combustível', 'Pedágio', 'Hospedagem']
  },
  musicos: {
    group: 'musicos',
    label: 'Músicos / Apoio',
    categoryId: 'cat_producao_shows',
    subcategories: ['Cachê de Terceiros / Equipe']
  },
  equipamentos: {
    group: 'equipamentos',
    label: 'Equipamentos / Som',
    categoryId: 'cat_equipamentos',
    subcategories: ['Aluguel', 'Manutenção', 'Insumos do Show']
  }
};

export interface ShowFinancialSummary {
  totalContracted: number;     // Cachê Bruto Real (Soma de todas as Receitas vinculadas com showId)
  baseContracted: number;      // Soma das Receitas de Cachê Principal / Parcelas vinculadas
  extraAmount: number;         // Soma de Horas Extras + Couvert/Gorjeta vinculadas
  extraContracted: number;     // Extras vinculados
  totalPredicted: number;      // Cachê Bruto Real = Soma de todas as Receitas com showId
  realGrossCache: number;      // Cachê Bruto Real = Soma de todas as Receitas com showId (Principal + Horas Extras + Couvert/Gorjeta)
  principalCacheTotal: number; // Total de Cachê Principal / Parcelas
  overtimeTotal: number;       // Total de Horas Extras
  couvertTipsTotal: number;    // Total de Couvert / Gorjeta
  baseCacheReceived: number;   // Total recebido (pago) do cachê principal
  extraReceived: number;       // Total recebido (pago) de Horas Extras + Couvert/Gorjeta
  totalReceived: number;       // Total efetivamente recebido (status === 'paid')
  totalPending: number;        // Saldo pendente de recebimento = Math.max(0, realGrossCache - totalReceived)
  percentReceived: number;     // % quitada do Cachê Bruto Real (0 a 100%)
  totalScheduled: number;      // Total agendado em lançamentos pendentes
  paidExpenses: number;        // Total de despesas pagas vinculadas ao showId
  pendingExpenses: number;     // Total de despesas pendentes vinculadas ao showId
  totalExpenses: number;       // Soma de todas as Despesas vinculadas com o showId
  logisticsExpenses: number;   // Total de custos de Deslocamento/Logística (Combustível, Pedágio, Hospedagem)
  crewExpenses: number;        // Total de custos de Músicos/Apoio (Cachê de Terceiros / Equipe)
  equipmentExpenses: number;   // Total de custos de Equipamentos/Som (Aluguel, Manutenção, Insumos do Show)
  netProfit: number;           // Lucro Líquido Real = Cachê Bruto Real - Soma de todas as Despesas vinculadas com o showId
  realNetProfit: number;       // Lucro Líquido Real = Cachê Bruto Real - Total de Despesas vinculadas
  realizedNetProfit: number;   // Caixa Líquido Realizado = Total Recebido Pago - Despesas Pagas
  projectedProfit: number;     // Alias para Lucro Líquido Real (Cachê Bruto Real - Despesas Vinculadas)
  profitMarginPercent: number; // % Termômetro de Lucro (realNetProfit / realGrossCache * 100)
  costRatioPercent: number;    // % Comprometimento de Custos (totalExpenses / realGrossCache * 100)
  equipmentReserveAmount: number; // Fundo de reserva / depreciação do equipamento
  netProfitAfterReserve: number;  // Lucro líquido real após dedução do fundo de reserva
  projectedProfitAfterReserve: number; // Lucro após fundo de reserva
  totalTimeHours: number;      // Tempo total dedicado (deslocamento + passagem de som + show)
  profitPerHour: number;       // Lucro por hora trabalhada
  netProfitPerHour: number;    // Lucro líquido por hora trabalhada
  remainingToSchedule: number; // Valor previsto ainda não parcelado/agendado
  isOverTotal: boolean;        // Compatibilidade de interface
  excessAmount: number;        // Compatibilidade de interface
}

/**
 * Validação rigorosa de arquitetura:
 * Se a transação pertencer a um evento/show, o `showId` e a `categoryId` não podem ser nulos ou indefinidos.
 */
export function validateShowTransaction(
  tx: Partial<Transaction>,
  forceEventValidation = false
): { valid: boolean; error?: string } {
  const isEventTx =
    forceEventValidation ||
    Boolean(tx.isEventTransaction) ||
    Boolean(tx.showId) ||
    Boolean(tx.showPaymentId) ||
    Boolean(tx.showExpenseId) ||
    Boolean(tx.costGroup) ||
    tx.categoryId === 'cat_33' ||
    tx.categoryId === 'cat_logistica_shows';

  if (!isEventTx) {
    return { valid: true };
  }

  if (!tx.showId || typeof tx.showId !== 'string' || !tx.showId.trim()) {
    return {
      valid: false,
      error: 'Transações pertencentes a um show/evento exigem obrigatoriamente um showId válido.'
    };
  }

  if (!tx.categoryId || typeof tx.categoryId !== 'string' || !tx.categoryId.trim()) {
    return {
      valid: false,
      error: 'Transações pertencentes a um show/evento exigem obrigatoriamente uma categoryId válida.'
    };
  }

  return { valid: true };
}

/**
 * Classifica rigorosamente qualquer despesa de show em um dos 3 grupos isolados e suas subcategorias oficiais:
 * - Deslocamento/Logística -> Combustível, Pedágio, Hospedagem (cat_logistica_shows)
 * - Músicos/Apoio -> Cachê de Terceiros / Equipe (cat_producao_shows)
 * - Equipamentos/Som -> Aluguel, Manutenção, Insumos do Show (cat_equipamentos)
 */
export function resolveShowExpenseClassification(input: {
  costGroup?: ShowCostGroup;
  subcategory?: string;
  category?: string;
  categoryId?: string;
  logisticsType?: string;
  description?: string;
  role?: string;
}): {
  costGroup: ShowCostGroup;
  subcategory: ShowExpenseSubcategory;
  categoryId: string;
  logisticsType: 'fuel' | 'toll' | 'lodging';
} {
  const rawSub = (input.subcategory || input.category || '').trim();
  const rawDesc = `${rawSub} ${input.description || ''} ${input.role || ''} ${input.logisticsType || ''}`.toLowerCase();

  // 1. Verificar grupo explícito ou inferir por palavras-chave
  if (
    input.costGroup === 'musicos' ||
    rawSub === 'Cachê de Terceiros / Equipe' ||
    Boolean(input.role) ||
    input.categoryId === 'cat_producao_shows' ||
    rawDesc.includes('músico') ||
    rawDesc.includes('musico') ||
    rawDesc.includes('equipe') ||
    rawDesc.includes('freelancer') ||
    rawDesc.includes('roadie') ||
    rawDesc.includes('técnico') ||
    rawDesc.includes('tecnico') ||
    rawDesc.includes('cachê de terceiros') ||
    rawDesc.includes('bateria') ||
    rawDesc.includes('baixo') ||
    rawDesc.includes('guitarra') ||
    rawDesc.includes('violão') ||
    rawDesc.includes('teclado') ||
    rawDesc.includes('sanfona') ||
    rawDesc.includes('percussão') ||
    rawDesc.includes('backing')
  ) {
    return {
      costGroup: 'musicos',
      subcategory: 'Cachê de Terceiros / Equipe',
      categoryId: 'cat_producao_shows',
      logisticsType: 'fuel'
    };
  }

  if (
    input.costGroup === 'logistica' ||
    rawSub === 'Combustível' ||
    rawSub === 'Pedágio' ||
    rawSub === 'Hospedagem' ||
    Boolean(input.logisticsType) ||
    input.categoryId === 'cat_logistica_shows' ||
    input.categoryId === 'cat_21' ||
    rawDesc.includes('combust') ||
    rawDesc.includes('gasolina') ||
    rawDesc.includes('etanol') ||
    rawDesc.includes('diesel') ||
    rawDesc.includes('posto') ||
    rawDesc.includes('abastec') ||
    rawDesc.includes('pedágio') ||
    rawDesc.includes('pedagio') ||
    rawDesc.includes('hosped') ||
    rawDesc.includes('hotel') ||
    rawDesc.includes('pousada') ||
    rawDesc.includes('airbnb') ||
    rawDesc.includes('diária') ||
    rawDesc.includes('uber') ||
    rawDesc.includes('deslocamento') ||
    rawDesc.includes('frete') ||
    rawDesc.includes('van') ||
    rawDesc.includes('estacionamento')
  ) {
    let subcategory: ShowLogisticsSubcategory = 'Combustível';
    let logisticsType: 'fuel' | 'toll' | 'lodging' = 'fuel';

    if (
      rawSub === 'Pedágio' ||
      input.logisticsType === 'toll' ||
      input.logisticsType === 'parking' ||
      rawDesc.includes('pedágio') ||
      rawDesc.includes('pedagio') ||
      rawDesc.includes('estacionamento')
    ) {
      subcategory = 'Pedágio';
      logisticsType = 'toll';
    } else if (
      rawSub === 'Hospedagem' ||
      input.logisticsType === 'lodging' ||
      rawDesc.includes('hosped') ||
      rawDesc.includes('hotel') ||
      rawDesc.includes('pousada') ||
      rawDesc.includes('airbnb')
    ) {
      subcategory = 'Hospedagem';
      logisticsType = 'lodging';
    } else {
      subcategory = 'Combustível';
      logisticsType = 'fuel';
    }

    return {
      costGroup: 'logistica',
      subcategory,
      categoryId: 'cat_logistica_shows',
      logisticsType
    };
  }

  // 3. Caso contrário: Equipamentos/Som -> Aluguel, Manutenção ou Insumos do Show
  let equipSub: ShowEquipmentSubcategory = 'Insumos do Show';
  if (
    rawSub === 'Aluguel' ||
    rawDesc.includes('aluguel') ||
    rawDesc.includes('locação') ||
    rawDesc.includes('locacao') ||
    rawDesc.includes('som') ||
    rawDesc.includes('iluminação') ||
    rawDesc.includes('palco') ||
    rawDesc.includes('gerador')
  ) {
    equipSub = 'Aluguel';
  } else if (
    rawSub === 'Manutenção' ||
    rawDesc.includes('manutenção') ||
    rawDesc.includes('manutencao') ||
    rawDesc.includes('luthier') ||
    rawDesc.includes('reparo') ||
    rawDesc.includes('conserto')
  ) {
    equipSub = 'Manutenção';
  } else {
    equipSub = 'Insumos do Show';
  }

  return {
    costGroup: 'equipamentos',
    subcategory: equipSub,
    categoryId: 'cat_equipamentos',
    logisticsType: 'fuel'
  };
}

/**
 * Localiza ou determina a categoria apropriada para receita de show
 */
export function resolveIncomeCategoryId(categories: Category[]): string {
  if (!categories || categories.length === 0) return 'cat_33';
  const showCat = categories.find(
    c =>
      c.id === 'cat_33' ||
      (c.type === 'income' &&
        (c.name.toLowerCase().includes('show') ||
          c.name.toLowerCase().includes('cachê') ||
          c.name.toLowerCase().includes('cache')))
  );
  if (showCat) return showCat.id;
  const anyIncome = categories.find(c => c.type === 'income');
  return anyIncome ? anyIncome.id : 'cat_33';
}

/**
 * Extrai o valor base do cachê salvo no objeto do show (incluindo campos legados cache/price/cacheCombined).
 */
export function getShowBaseCacheValue(show: Show | null | undefined): number {
  if (!show) return 0;
  const s = show as any;
  const candidates = [
    Number(show.totalCache) || 0,
    Number(show.cacheCombined) || 0,
    Number(s.cache) || 0,
    Number(s.price) || 0,
    Number(s.amount) || 0,
    Number(show.cacheReceived) || 0
  ];
  return Math.max(0, ...candidates);
}

/**
 * Verifica se uma transação de receita pertence à categoria de Shows / Música.
 */
export function isShowOrMusicIncomeTransaction(tx: Transaction | null | undefined, categories?: Category[]): boolean {
  if (!tx || tx.type !== 'income' || tx.status === 'cancelled') return false;
  const desc = `${tx.description || ''} ${tx.originalBankDescription || ''}`.toLowerCase();
  if (desc.includes('recebimento de pró-labore') || desc.includes('recebimento de pro-labore') || desc.includes('ajuste de saldo')) {
    return false;
  }

  if (tx.showId || tx.isEventTransaction || tx.showPaymentId) return true;
  if (tx.categoryId === 'cat_33' || tx.category === 'cat_33') return true;

  if (Array.isArray(categories) && tx.categoryId) {
    const cat = categories.find(c => c.id === tx.categoryId);
    if (cat) {
      const catName = (cat.name || '').toLowerCase();
      if (
        catName.includes('show') ||
        catName.includes('cachê') ||
        catName.includes('cache') ||
        catName.includes('música') ||
        catName.includes('musica')
      ) {
        return true;
      }
    }
  }

  if (
    desc.includes('cachê') ||
    desc.includes('cache') ||
    desc.includes('show') ||
    desc.includes('apresentação') ||
    desc.includes('apresentacao') ||
    desc.includes('couvert') ||
    desc.includes('gorjeta') ||
    desc.includes('hora extra') ||
    desc.includes('contratante')
  ) {
    return true;
  }

  if (tx.scope === 'BUSINESS') {
    return true;
  }

  return false;
}

export function deduplicateItemsById<T extends { id?: string; transactionId?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seenIds = new Set<string>();
  const seenTxIds = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item) continue;
    const id = item.id || generateUUID();
    if (seenIds.has(id)) continue;
    if (item.transactionId && seenTxIds.has(item.transactionId)) continue;
    seenIds.add(id);
    if (item.transactionId) seenTxIds.add(item.transactionId);
    result.push(item.id === id ? item : { ...item, id });
  }
  return result;
}

/**
 * Converte dados legados ou incompletos de um Show para o formato moderno e seguro.
 */
export function normalizeShowFinancials(show: Show, fallbackAccountId: string): Show {
  if (!show) {
    throw new Error('Show não fornecido para normalização');
  }

  const normalized: Show = { ...show };
  const showDate = normalized.date || new Date().toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  const initialCache = getShowBaseCacheValue(normalized);
  const initialExtra = Number(normalized.extraAmount) || 0;

  // 1. Normalizar Pagamentos (Receitas do Show)
  let currentPayments: ShowPayment[] = [];
  if (Array.isArray(normalized.payments) && normalized.payments.length > 0) {
    currentPayments = normalized.payments.map((p, idx) => {
      const isPaidStatus =
        p.status === 'Recebido' ||
        normalized.status === 'Realizado' ||
        (normalized.status === 'Confirmado' && showDate <= todayStr && Number(normalized.cacheReceived) >= initialCache && initialCache > 0);
      return {
        id: p.id || generateUUID(),
        type: p.type || (idx === 0 && normalized.payments!.length === 1 ? 'Cachê Principal' : 'Parcela'),
        amount: Number(p.amount) || 0,
        expectedDate: p.expectedDate || showDate,
        effectiveDate: p.effectiveDate || (isPaidStatus ? showDate : undefined),
        accountId: p.accountId || fallbackAccountId,
        status: p.status === 'Cancelado' ? 'Cancelado' : isPaidStatus ? 'Recebido' : 'Agendado',
        notes: p.notes || '',
        transactionId: p.transactionId
      };
    });
  } else if (Array.isArray(normalized.receipts) && normalized.receipts.length > 0) {
    currentPayments = normalized.receipts.map(r => ({
      id: r.id || generateUUID(),
      type:
        r.type === 'Sinal'
          ? 'Sinal'
          : r.type === 'Bônus'
          ? 'Bônus'
          : r.type === 'Pagamento final'
          ? 'Pagamento final'
          : 'Cachê Principal',
      amount: Number(r.amount) || 0,
      expectedDate: r.expectedDate || showDate,
      effectiveDate: r.effectiveDate,
      accountId: r.accountId || fallbackAccountId,
      status: r.status === 'Recebido' || normalized.status === 'Realizado' ? 'Recebido' : 'Agendado',
      transactionId: r.transactionId
    }));
  }

  // Se o array de payments estava vazio (ex: [] vindo do StorageService) mas o show possui valor base, cria o pagamento inicial
  if (currentPayments.length === 0 && initialCache > 0) {
    const isAlreadyRealized =
      normalized.status === 'Realizado' ||
      (Number(normalized.cacheReceived) >= initialCache && initialCache > 0) ||
      (normalized.status === 'Confirmado' && showDate <= todayStr);
    currentPayments = [
      {
        id: generateUUID(),
        type: 'Cachê Principal',
        amount: initialCache,
        expectedDate: showDate,
        effectiveDate: isAlreadyRealized ? showDate : undefined,
        accountId: fallbackAccountId,
        status: isAlreadyRealized ? 'Recebido' : 'Agendado',
        notes: 'Cachê Principal do Evento'
      }
    ];
    if (initialExtra > 0) {
      currentPayments.push({
        id: generateUUID(),
        type: 'Hora Extra',
        amount: initialExtra,
        expectedDate: showDate,
        effectiveDate: isAlreadyRealized ? showDate : undefined,
        accountId: fallbackAccountId,
        status: isAlreadyRealized ? 'Recebido' : 'Agendado',
        notes: 'Extra / Adicional do Evento'
      });
    }
  }

  normalized.payments = deduplicateItemsById(currentPayments);
  currentPayments = normalized.payments;

  const trackedExpenseIds = new Set<string>();
  const trackedExpenseTxIds = new Set<string>();

  // Normalizar Equipe / Músicos
  if (Array.isArray(normalized.crewMembers)) {
    normalized.crewMembers = deduplicateItemsById(
      normalized.crewMembers.map(m => ({
        ...m,
        id: m.id || generateUUID(),
        costGroup: 'musicos' as const,
        subcategory: 'Cachê de Terceiros / Equipe' as const,
        cacheAmount: Number(m.cacheAmount) || 0
      }))
    );
    normalized.crewMembers.forEach(m => {
      if (m.id) trackedExpenseIds.add(m.id);
      if (m.transactionId) trackedExpenseTxIds.add(m.transactionId);
    });
  }

  // Normalizar Logística
  if (Array.isArray(normalized.logistics)) {
    normalized.logistics = deduplicateItemsById(
      normalized.logistics.map(l => {
        const cls = resolveShowExpenseClassification({
          costGroup: 'logistica',
          subcategory: l.subcategory,
          logisticsType: l.type,
          description: l.description
        });
        return {
          ...l,
          id: l.id || generateUUID(),
          type: cls.logisticsType,
          costGroup: 'logistica' as const,
          subcategory: cls.subcategory as ShowLogisticsSubcategory,
          amount: Number(l.amount) || 0
        };
      })
    );
    normalized.logistics.forEach(l => {
      if (l.id) trackedExpenseIds.add(l.id);
      if (l.transactionId) trackedExpenseTxIds.add(l.transactionId);
    });
  }

  // Normalizar Equipamentos / Outras Despesas do Show
  if (Array.isArray(normalized.otherExpenses)) {
    normalized.otherExpenses = deduplicateItemsById(
      normalized.otherExpenses.map(o => {
        const cls = resolveShowExpenseClassification({
          costGroup: 'equipamentos',
          subcategory: o.subcategory || o.category,
          category: o.category,
          description: o.description
        });
        return {
          ...o,
          id: o.id || generateUUID(),
          category: cls.subcategory,
          subcategory: cls.subcategory as ShowEquipmentSubcategory,
          costGroup: 'equipamentos' as const,
          amount: Number(o.amount) || 0
        };
      })
    );
    normalized.otherExpenses.forEach(o => {
      if (o.id) trackedExpenseIds.add(o.id);
      if (o.transactionId) trackedExpenseTxIds.add(o.transactionId);
    });
  }

  // Normalizar Despesas legadas (expenseItems) sem duplicar itens já presentes em crewMembers/logistics/otherExpenses
  if (Array.isArray(normalized.expenseItems) && normalized.expenseItems.length > 0) {
    normalized.expenseItems = deduplicateItemsById(
      normalized.expenseItems
        .filter(e => {
          if (!e) return false;
          if (e.id && trackedExpenseIds.has(e.id)) return false;
          if (e.transactionId && trackedExpenseTxIds.has(e.transactionId)) return false;
          return true;
        })
        .map(e => {
          const cls = resolveShowExpenseClassification({
            costGroup: e.costGroup,
            subcategory: e.subcategory || e.category,
            category: e.category,
            description: e.notes
          });
          return {
            id: e.id || generateUUID(),
            category: cls.subcategory,
            subcategory: cls.subcategory,
            costGroup: cls.costGroup,
            amount: Number(e.amount) || 0,
            date: e.date || showDate,
            accountId: e.accountId || fallbackAccountId,
            notes: e.notes || '',
            status: e.status || 'paid',
            transactionId: e.transactionId
          };
        })
    );
  }

  // Recalcular valores dinâmicos sem jamais zerar o cachê base caso não haja pagamentos em memória
  const activePayments = currentPayments.filter(p => p && p.status !== 'Cancelado');
  const dynamicGross = activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const dynamicReceived = activePayments
    .filter(p => p.status === 'Recebido')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const dynamicExtra = activePayments
    .filter(p => p.type === 'Extra' || p.type === 'Hora Extra' || p.type === 'Couvert' || p.type === 'Gorjeta' || p.type === 'Bônus')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const finalGross = dynamicGross > 0 ? dynamicGross : initialCache;
  const finalReceived =
    dynamicReceived > 0
      ? dynamicReceived
      : normalized.status === 'Realizado'
      ? finalGross
      : Number(normalized.cacheReceived) || 0;

  normalized.totalCache = finalGross;
  normalized.cacheCombined = finalGross;
  normalized.cacheReceived = finalReceived;
  normalized.extraAmount = dynamicExtra > 0 ? dynamicExtra : initialExtra;

  // Normalizar Contratante e Nome
  const contractor = (normalized.contractorName || normalized.name || 'Apresentação').trim();
  normalized.contractorName = contractor;
  normalized.name = normalized.name ? normalized.name.trim() : contractor;

  // Normalizar Status
  if (normalized.status === 'Agendado') {
    normalized.status = 'Aguardando confirmação';
  } else if (!normalized.status) {
    normalized.status = 'Confirmado';
  }

  // Normalizar Dados de Agenda
  normalized.date = showDate;
  normalized.time = normalized.time || '20:00';
  normalized.location = normalized.location || '';
  normalized.city = normalized.city || '';
  normalized.eventType = normalized.eventType || 'Show / Apresentação';
  normalized.createdAt = normalized.createdAt || Date.now();

  return normalized;
}

/**
 * Verifica se um lançamento de receita é classificado como Hora Extra ou Couvert/Gorjeta
 */
function classifyShowIncomeNature(item: {
  paymentType?: ShowPaymentType | string;
  description?: string;
}): 'principal' | 'overtime' | 'couvert_tips' {
  const pType = (item.paymentType || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();

  if (
    pType === 'hora extra' ||
    pType === 'extra' ||
    desc.includes('hora extra') ||
    desc.includes('horas extras') ||
    desc.includes('adicional de tempo')
  ) {
    return 'overtime';
  }

  if (
    pType === 'couvert' ||
    pType === 'gorjeta' ||
    pType === 'bônus' ||
    pType === 'bonus' ||
    desc.includes('couvert') ||
    desc.includes('gorjeta') ||
    desc.includes('caixinha') ||
    desc.includes('portaria') ||
    desc.includes('bilheteria')
  ) {
    return 'couvert_tips';
  }

  return 'principal';
}

/**
 * CÁLCULO DINÂMICO E RECÁLCULO LÍQUIDO DO SHOW:
 * - Cachê Bruto do Show = Soma das receitas vinculadas ao `showId` (ou o valor base do show se não houver lançamentos em extrato).
 * - Custos = Soma das despesas com o `showId`.
 * - Lucro Líquido = Cachê Bruto - Custos.
 */
export function getShowFinancialSummary(
  show: Show | null | undefined,
  transactions?: Transaction[]
): ShowFinancialSummary {
  if (!show) {
    return {
      totalContracted: 0,
      baseContracted: 0,
      extraAmount: 0,
      extraContracted: 0,
      totalPredicted: 0,
      realGrossCache: 0,
      principalCacheTotal: 0,
      overtimeTotal: 0,
      couvertTipsTotal: 0,
      baseCacheReceived: 0,
      extraReceived: 0,
      totalReceived: 0,
      totalPending: 0,
      percentReceived: 0,
      totalScheduled: 0,
      paidExpenses: 0,
      pendingExpenses: 0,
      totalExpenses: 0,
      logisticsExpenses: 0,
      crewExpenses: 0,
      equipmentExpenses: 0,
      netProfit: 0,
      realNetProfit: 0,
      realizedNetProfit: 0,
      projectedProfit: 0,
      profitMarginPercent: 0,
      costRatioPercent: 0,
      equipmentReserveAmount: 0,
      netProfitAfterReserve: 0,
      projectedProfitAfterReserve: 0,
      totalTimeHours: 0,
      profitPerHour: 0,
      netProfitPerHour: 0,
      remainingToSchedule: 0,
      isOverTotal: false,
      excessAmount: 0
    };
  }

  let principalCacheTotal = 0;
  let overtimeTotal = 0;
  let couvertTipsTotal = 0;
  let baseCacheReceived = 0;
  let extraReceived = 0;
  let totalScheduled = 0;

  const countedIncomeTxIds = new Set<string>();
  const countedPaymentIds = new Set<string>();

  // 1. Apuração dinâmica a partir das Receitas vinculadas com showId no extrato
  const linkedIncomeTxs = Array.isArray(transactions)
    ? transactions.filter(t => t && t.showId === show.id && t.type === 'income' && t.status !== 'cancelled')
    : [];

  linkedIncomeTxs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (amt <= 0) return;

    if (t.id) countedIncomeTxIds.add(t.id);
    if (t.showPaymentId) countedPaymentIds.add(t.showPaymentId);

    const nature = classifyShowIncomeNature({
      paymentType: t.showPaymentType,
      description: t.description
    });

    if (nature === 'overtime') {
      overtimeTotal += amt;
    } else if (nature === 'couvert_tips') {
      couvertTipsTotal += amt;
    } else {
      principalCacheTotal += amt;
    }

    if (t.status === 'paid') {
      if (nature === 'principal') {
        baseCacheReceived += amt;
      } else {
        extraReceived += amt;
      }
    } else if (t.status === 'pending') {
      totalScheduled += amt;
    }
  });

  // Se não houver transações vinculadas no extrato (ou houver pagamentos adicionais em edição no show), considera show.payments
  if (Array.isArray(show.payments) && show.payments.length > 0) {
    show.payments.forEach(p => {
      if (!p || p.status === 'Cancelado') return;
      if (p.id && countedPaymentIds.has(p.id)) return;
      if (p.transactionId && countedIncomeTxIds.has(p.transactionId)) return;
      // Se já houver transações vinculadas ao show e este item tinha um transactionId que não existe mais, ignora
      if (linkedIncomeTxs.length > 0 && p.transactionId && !countedIncomeTxIds.has(p.transactionId)) {
        return;
      }

      const amt = Number(p.amount) || 0;
      if (amt <= 0) return;

      const nature = classifyShowIncomeNature({
        paymentType: p.type,
        description: p.notes
      });

      if (nature === 'overtime') {
        overtimeTotal += amt;
      } else if (nature === 'couvert_tips') {
        couvertTipsTotal += amt;
      } else {
        principalCacheTotal += amt;
      }

      if (p.status === 'Recebido') {
        if (nature === 'principal') {
          baseCacheReceived += amt;
        } else {
          extraReceived += amt;
        }
      } else {
        totalScheduled += amt;
      }
    });
  }

  // Fallback para o valor base do show se não houver lançamentos vinculados em extrato nem em payments
  const baseShowValue = getShowBaseCacheValue(show);
  const baseExtraValue = Number(show.extraAmount) || 0;
  const currentSum = principalCacheTotal + overtimeTotal + couvertTipsTotal;

  if (currentSum <= 0 && baseShowValue > 0) {
    if (baseExtraValue > 0 && baseShowValue > baseExtraValue) {
      principalCacheTotal = baseShowValue - baseExtraValue;
      overtimeTotal = baseExtraValue;
    } else {
      principalCacheTotal = baseShowValue;
      overtimeTotal = baseExtraValue;
    }
  }

  const extraAmount = Math.round((overtimeTotal + couvertTipsTotal) * 100) / 100;
  // Cachê Bruto do Show = Soma das receitas vinculadas ao showId (ou o valor base do show se não houver lançamentos em extrato)
  const realGrossCache = Math.round((principalCacheTotal + overtimeTotal + couvertTipsTotal) * 100) / 100;

  const todayStr = new Date().toISOString().slice(0, 10);
  let totalReceived = Math.round((baseCacheReceived + extraReceived) * 100) / 100;

  // Se não houve recebimento computado por transação paga, mas o show está Realizado ou possui cacheReceived / data passada confirmada
  if (totalReceived <= 0 && realGrossCache > 0 && linkedIncomeTxs.length === 0) {
    const savedReceived = Number(show.cacheReceived) || 0;
    const isPastConfirmed = show.status === 'Confirmado' && Boolean(show.date && show.date <= todayStr);
    if (show.status === 'Realizado' || isPastConfirmed) {
      baseCacheReceived = principalCacheTotal;
      extraReceived = extraAmount;
      totalReceived = realGrossCache;
      totalScheduled = 0;
    } else if (savedReceived > 0) {
      baseCacheReceived = Math.min(principalCacheTotal, savedReceived);
      extraReceived = Math.max(0, savedReceived - baseCacheReceived);
      totalReceived = savedReceived;
    }
  } else if (totalReceived <= 0 && realGrossCache > 0 && show.status === 'Realizado') {
    baseCacheReceived = principalCacheTotal;
    extraReceived = extraAmount;
    totalReceived = realGrossCache;
  }

  const totalPending = Math.max(0, Math.round((realGrossCache - totalReceived) * 100) / 100);

  const percentReceived =
    realGrossCache > 0 ? Math.min(100, Math.round((totalReceived / realGrossCache) * 100)) : 0;

  // 2. Custos = Soma das despesas com o showId (e custos vinculados na estrutura do show caso ainda não sincronizados)
  let paidExpenses = 0;
  let pendingExpenses = 0;
  let logisticsExpenses = 0;
  let crewExpenses = 0;
  let equipmentExpenses = 0;

  const countedExpenseTxIds = new Set<string>();
  const countedExpenseItemIds = new Set<string>();

  const linkedExpenseTxs = Array.isArray(transactions)
    ? transactions.filter(t => t && t.showId === show.id && t.type === 'expense' && t.status !== 'cancelled')
    : [];

  linkedExpenseTxs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (amt <= 0) return;

    if (t.id) countedExpenseTxIds.add(t.id);
    if (t.showExpenseId) countedExpenseItemIds.add(t.showExpenseId);

    if (t.status === 'paid') {
      paidExpenses += amt;
    } else {
      pendingExpenses += amt;
    }

    const cls = resolveShowExpenseClassification({
      costGroup: t.costGroup,
      subcategory: t.subcategory,
      categoryId: t.categoryId,
      description: t.description
    });

    if (cls.costGroup === 'logistica') {
      logisticsExpenses += amt;
    } else if (cls.costGroup === 'musicos') {
      crewExpenses += amt;
    } else {
      equipmentExpenses += amt;
    }
  });

  // Complementar com itens do show apenas quando não houver transação correspondente já contabilizada
  if (Array.isArray(show.crewMembers)) {
    show.crewMembers.forEach(c => {
      if (!c) return;
      if (c.id && countedExpenseItemIds.has(c.id)) return;
      if (c.transactionId && countedExpenseTxIds.has(c.transactionId)) return;
      if (linkedExpenseTxs.length > 0 && c.transactionId && !countedExpenseTxIds.has(c.transactionId)) return;

      const amt = Number(c.cacheAmount) || 0;
      if (amt <= 0) return;

      crewExpenses += amt;
      if (c.status === 'paid') {
        paidExpenses += amt;
      } else {
        pendingExpenses += amt;
      }
    });
  }

  if (Array.isArray(show.logistics)) {
    show.logistics.forEach(l => {
      if (!l) return;
      if (l.id && countedExpenseItemIds.has(l.id)) return;
      if (l.transactionId && countedExpenseTxIds.has(l.transactionId)) return;
      if (linkedExpenseTxs.length > 0 && l.transactionId && !countedExpenseTxIds.has(l.transactionId)) return;

      const amt = Number(l.amount) || 0;
      if (amt <= 0) return;

      logisticsExpenses += amt;
      if (l.status === 'paid') {
        paidExpenses += amt;
      } else {
        pendingExpenses += amt;
      }
    });
  }

  if (Array.isArray(show.otherExpenses)) {
    show.otherExpenses.forEach(o => {
      if (!o) return;
      if (o.id && countedExpenseItemIds.has(o.id)) return;
      if (o.transactionId && countedExpenseTxIds.has(o.transactionId)) return;
      if (linkedExpenseTxs.length > 0 && o.transactionId && !countedExpenseTxIds.has(o.transactionId)) return;

      const amt = Number(o.amount) || 0;
      if (amt <= 0) return;

      equipmentExpenses += amt;
      if (o.status === 'paid') {
        paidExpenses += amt;
      } else {
        pendingExpenses += amt;
      }
    });
  }

  if (Array.isArray(show.expenseItems)) {
    show.expenseItems.forEach(e => {
      if (!e) return;
      if (e.id && countedExpenseItemIds.has(e.id)) return;
      if (e.transactionId && countedExpenseTxIds.has(e.transactionId)) return;
      if (linkedExpenseTxs.length > 0 && e.transactionId && !countedExpenseTxIds.has(e.transactionId)) return;

      const amt = Number(e.amount) || 0;
      if (amt <= 0) return;

      const cls = resolveShowExpenseClassification({
        costGroup: e.costGroup,
        subcategory: e.subcategory || e.category,
        category: e.category,
        description: e.notes
      });

      if (cls.costGroup === 'logistica') {
        logisticsExpenses += amt;
      } else if (cls.costGroup === 'musicos') {
        crewExpenses += amt;
      } else {
        equipmentExpenses += amt;
      }

      if (e.status === 'pending') {
        pendingExpenses += amt;
      } else {
        paidExpenses += amt;
      }
    });
  }

  let totalExpenses = Math.round((paidExpenses + pendingExpenses) * 100) / 100;
  if (totalExpenses <= 0 && Number((show as any).costs) > 0 && linkedExpenseTxs.length === 0) {
    totalExpenses = Number((show as any).costs) || 0;
    paidExpenses = totalExpenses;
  }

  // Lucro Líquido = Cachê Bruto - Custos
  const realNetProfit = Math.round((realGrossCache - totalExpenses) * 100) / 100;
  const realizedNetProfit = Math.round((totalReceived - paidExpenses) * 100) / 100;

  const profitMarginPercent =
    realGrossCache > 0 ? Math.round((realNetProfit / realGrossCache) * 100) : 0;
  const costRatioPercent =
    realGrossCache > 0 ? Math.min(100, Math.round((totalExpenses / realGrossCache) * 100)) : 0;

  // Fundo de Reserva / Depreciação de Equipamentos
  const equipmentReserveAmount = Math.max(0, Number(show.equipmentReserveAmount) || 0);
  const netProfitAfterReserve = Math.round((realNetProfit - equipmentReserveAmount) * 100) / 100;
  const projectedProfitAfterReserve = netProfitAfterReserve;

  // Tempo Dedicado Total e Métrica de Hora Trabalhada (Horas)
  const showDuration = Number(show.showDurationHours) || parseFloat(show.duration || '3') || 3;
  const travelHours = (Number(show.travelTimeMinutes) || 0) / 60;
  const soundcheckHours = (Number(show.soundcheckTimeMinutes) || 0) / 60;
  const totalTimeHours = Math.max(0.5, Math.round((showDuration + travelHours + soundcheckHours) * 10) / 10);

  const profitPerHour = Math.round((netProfitAfterReserve / totalTimeHours) * 100) / 100;
  const netProfitPerHour = profitPerHour;

  return {
    totalContracted: Math.round(principalCacheTotal * 100) / 100,
    baseContracted: Math.round(principalCacheTotal * 100) / 100,
    extraAmount,
    extraContracted: extraAmount,
    totalPredicted: realGrossCache,
    realGrossCache,
    principalCacheTotal: Math.round(principalCacheTotal * 100) / 100,
    overtimeTotal: Math.round(overtimeTotal * 100) / 100,
    couvertTipsTotal: Math.round(couvertTipsTotal * 100) / 100,
    baseCacheReceived: Math.round(baseCacheReceived * 100) / 100,
    extraReceived: Math.round(extraReceived * 100) / 100,
    totalReceived,
    totalPending,
    percentReceived,
    totalScheduled: Math.round(totalScheduled * 100) / 100,
    paidExpenses: Math.round(paidExpenses * 100) / 100,
    pendingExpenses: Math.round(pendingExpenses * 100) / 100,
    totalExpenses,
    logisticsExpenses: Math.round(logisticsExpenses * 100) / 100,
    crewExpenses: Math.round(crewExpenses * 100) / 100,
    equipmentExpenses: Math.round(equipmentExpenses * 100) / 100,
    netProfit: realNetProfit,
    realNetProfit,
    realizedNetProfit,
    projectedProfit: realNetProfit,
    profitMarginPercent,
    costRatioPercent,
    equipmentReserveAmount,
    netProfitAfterReserve,
    projectedProfitAfterReserve,
    totalTimeHours,
    profitPerHour,
    netProfitPerHour,
    remainingToSchedule: 0,
    isOverTotal: false,
    excessAmount: 0
  };
}

/**
 * Sincroniza um Show com a lista de movimentações financeiras de forma bidirecional e sem duplicações.
 * Garante que TODA transação (Receita ou Despesa) criada a partir do show receba obrigatoriamente
 * `showId`, `categoryId`, `costGroup` e `subcategory`.
 */
export function syncShowWithTransactions(
  show: Show,
  existingTransactions: Transaction[],
  categories: Category[]
): {
  updatedShow: Show;
  updatedTransactions: Transaction[];
} {
  if (!show || !show.id) {
    throw new Error('Show inválido: show.id é obrigatório para sincronizar transações.');
  }

  const updatedShow: Show = { ...show };
  let txs = deduplicateItemsById(Array.isArray(existingTransactions) ? [...existingTransactions] : []);

  const incomeCatId = resolveIncomeCategoryId(categories);
  const showTitle = (updatedShow.contractorName || updatedShow.name || 'Show').trim();
  const isShowCancelled = updatedShow.status === 'Cancelado';
  const showDate = updatedShow.date || new Date().toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  const defaultExpenseStatus: TransactionStatus =
    showDate > todayStr && updatedShow.status !== 'Realizado' ? 'pending' : 'paid';

  const activeShowIncomeTxIds = new Set<string>();
  const activeShowExpenseTxIds = new Set<string>();

  // 1. SINCRONIZAR PAGAMENTOS (RECEITAS DO SHOW)
  const currentPayments = deduplicateItemsById(Array.isArray(updatedShow.payments) ? [...updatedShow.payments] : []);

  const updatedPayments = currentPayments.map(payment => {
    const p: ShowPayment = {
      ...payment,
      id: payment.id || generateUUID(),
      type: payment.type || 'Cachê Principal',
      amount: Number(payment.amount) || 0
    };
    const isReceived = p.status === 'Recebido';
    const txDate = isReceived && p.effectiveDate ? p.effectiveDate : p.expectedDate || showDate;
    const txStatus: TransactionStatus = isReceived ? 'paid' : isShowCancelled ? 'cancelled' : 'pending';
    const baseDesc = p.notes
      ? `Show: ${showTitle} - ${p.notes} (${p.type})`
      : `Show: ${showTitle} (${p.type || 'Cachê Principal'})`;
    const txDescription =
      isShowCancelled && !isReceived
        ? baseDesc.startsWith('[CANCELADO]')
          ? baseDesc
          : `[CANCELADO] ${baseDesc}`
        : baseDesc;
    const txAmount = isShowCancelled && !isReceived ? 0 : p.amount;

    let txIndex = p.transactionId
      ? txs.findIndex(t => t && t.id === p.transactionId && !activeShowIncomeTxIds.has(t.id))
      : -1;
    if (txIndex < 0) {
      txIndex = txs.findIndex(
        t => t && t.showId === updatedShow.id && t.showPaymentId === p.id && !activeShowIncomeTxIds.has(t.id)
      );
    }

    if (txIndex >= 0) {
      const existingTx = txs[txIndex];
      p.transactionId = existingTx.id;
      activeShowIncomeTxIds.add(existingTx.id);
      const updatedTx: Transaction = {
        ...existingTx,
        amount: txAmount,
        date: txDate,
        accountId: p.accountId || existingTx.accountId || 'acc_mp',
        status: txStatus,
        description: existingTx.importedFromBank ? existingTx.description : txDescription,
        showId: updatedShow.id,
        showName: showTitle,
        showPaymentId: p.id,
        showPaymentType: p.type,
        isEventTransaction: true,
        scope: 'BUSINESS',
        categoryId: incomeCatId,
        category: incomeCatId
      };
      const check = validateShowTransaction(updatedTx, true);
      if (!check.valid) throw new Error(check.error);
      txs[txIndex] = updatedTx;
    } else if (p.amount > 0 && !isShowCancelled) {
      const newTxId = generateUUID();
      p.transactionId = newTxId;
      activeShowIncomeTxIds.add(newTxId);
      const newTx: Transaction = {
        id: newTxId,
        amount: p.amount,
        date: txDate,
        type: 'income',
        status: txStatus,
        description: txDescription,
        showId: updatedShow.id,
        showName: showTitle,
        showPaymentType: p.type,
        showPaymentId: p.id,
        isEventTransaction: true,
        scope: 'BUSINESS',
        categoryId: incomeCatId,
        category: incomeCatId,
        accountId: p.accountId || 'acc_mp',
        createdAt: Date.now()
      };
      const check = validateShowTransaction(newTx, true);
      if (!check.valid) throw new Error(check.error);
      txs.push(newTx);
    }

    return p;
  });

  // Incorporar eventuais receitas avulsas vinculadas via Extrato/Auditoria que ainda não possuíam showPaymentId
  txs.forEach((t, idx) => {
    if (
      t &&
      t.showId === updatedShow.id &&
      t.type === 'income' &&
      t.status !== 'cancelled' &&
      !activeShowIncomeTxIds.has(t.id)
    ) {
      // Se esta transação já tinha um showPaymentId (seja porque o pagamento foi excluído do show,
      // seja porque outro lançamento já ocupou esse showPaymentId), não re-adiciona para evitar duplicação de key
      if (t.showPaymentId) {
        return;
      }

      const newPaymentId = generateUUID();
      const nature = classifyShowIncomeNature({
        paymentType: t.showPaymentType,
        description: t.description
      });
      const resolvedPaymentType: ShowPaymentType =
        t.showPaymentType ||
        (nature === 'overtime'
          ? 'Hora Extra'
          : nature === 'couvert_tips'
          ? 'Couvert'
          : 'Cachê Principal');

      updatedPayments.push({
        id: newPaymentId,
        type: resolvedPaymentType,
        amount: Number(t.amount) || 0,
        expectedDate: t.date || showDate,
        effectiveDate: t.status === 'paid' ? t.date || showDate : undefined,
        accountId: t.accountId || 'acc_mp',
        status: t.status === 'paid' ? 'Recebido' : 'Agendado',
        notes: t.description,
        transactionId: t.id
      });

      activeShowIncomeTxIds.add(t.id);
      txs[idx] = {
        ...t,
        showId: updatedShow.id,
        showName: showTitle,
        showPaymentId: newPaymentId,
        showPaymentType: resolvedPaymentType,
        isEventTransaction: true,
        scope: 'BUSINESS',
        categoryId: t.categoryId || incomeCatId,
        category: t.categoryId || incomeCatId
      };
    }
  });

  updatedShow.payments = deduplicateItemsById(updatedPayments);

  // 2. SINCRONIZAR CUSTOS DE MÚSICOS / APOIO -> Cachê de Terceiros / Equipe (cat_producao_shows)
  if (Array.isArray(updatedShow.crewMembers)) {
    updatedShow.crewMembers = deduplicateItemsById(updatedShow.crewMembers).map(member => {
      const m: ShowCrewItem = {
        ...member,
        id: member.id || generateUUID(),
        costGroup: 'musicos',
        subcategory: 'Cachê de Terceiros / Equipe',
        cacheAmount: Number(member.cacheAmount) || 0
      };
      const amt = m.cacheAmount;

      if (amt > 0 && !isShowCancelled) {
        const itemDesc = `[Músicos/Apoio - Cachê de Terceiros / Equipe] ${m.name}${m.role ? ' (' + m.role + ')' : ''} - ${showTitle}`;
        const itemStatus: TransactionStatus = m.status === 'paid' ? 'paid' : defaultExpenseStatus;
        const catId = 'cat_producao_shows';

        let txIdx = m.transactionId
          ? txs.findIndex(t => t && t.id === m.transactionId && !activeShowExpenseTxIds.has(t.id))
          : -1;
        if (txIdx < 0) {
          txIdx = txs.findIndex(
            t => t && t.showId === updatedShow.id && t.showExpenseId === m.id && !activeShowExpenseTxIds.has(t.id)
          );
        }

        if (txIdx >= 0) {
          const existingTxId = txs[txIdx].id;
          m.transactionId = existingTxId;
          activeShowExpenseTxIds.add(existingTxId);
          const updatedTx: Transaction = {
            ...txs[txIdx],
            amount: amt,
            description: itemDesc,
            date: showDate,
            status: itemStatus,
            type: 'expense',
            scope: 'BUSINESS',
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: m.id,
            costGroup: 'musicos',
            subcategory: 'Cachê de Terceiros / Equipe',
            isEventTransaction: true,
            categoryId: catId,
            category: catId
          };
          const check = validateShowTransaction(updatedTx, true);
          if (!check.valid) throw new Error(check.error);
          txs[txIdx] = updatedTx;
        } else {
          const newTxId = generateUUID();
          m.transactionId = newTxId;
          activeShowExpenseTxIds.add(newTxId);
          const newTx: Transaction = {
            id: newTxId,
            amount: amt,
            date: showDate,
            type: 'expense',
            status: itemStatus,
            description: itemDesc,
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: m.id,
            costGroup: 'musicos',
            subcategory: 'Cachê de Terceiros / Equipe',
            isEventTransaction: true,
            scope: 'BUSINESS',
            categoryId: catId,
            category: catId,
            accountId: updatedShow.expenseAccountId || 'acc_mp',
            createdAt: Date.now()
          };
          const check = validateShowTransaction(newTx, true);
          if (!check.valid) throw new Error(check.error);
          txs.push(newTx);
        }
      }
      return m;
    });
  }

  // 3. SINCRONIZAR DESLOCAMENTO / LOGÍSTICA -> Combustível, Pedágio, Hospedagem (cat_logistica_shows)
  if (Array.isArray(updatedShow.logistics)) {
    updatedShow.logistics = deduplicateItemsById(updatedShow.logistics).map(item => {
      const cls = resolveShowExpenseClassification({
        costGroup: 'logistica',
        subcategory: item.subcategory,
        logisticsType: item.type,
        description: item.description
      });

      const l: ShowLogisticsItem = {
        ...item,
        id: item.id || generateUUID(),
        type: cls.logisticsType,
        costGroup: 'logistica',
        subcategory: cls.subcategory as ShowLogisticsSubcategory,
        description: item.description || cls.subcategory,
        amount: Number(item.amount) || 0
      };
      const amt = l.amount;

      if (amt > 0 && !isShowCancelled) {
        const itemDesc = `[Logística - ${cls.subcategory}] ${l.description || cls.subcategory} - ${showTitle}`;
        const itemStatus: TransactionStatus = l.status === 'paid' ? 'paid' : defaultExpenseStatus;
        const catId = 'cat_logistica_shows';

        let txIdx = l.transactionId
          ? txs.findIndex(t => t && t.id === l.transactionId && !activeShowExpenseTxIds.has(t.id))
          : -1;
        if (txIdx < 0) {
          txIdx = txs.findIndex(
            t => t && t.showId === updatedShow.id && t.showExpenseId === l.id && !activeShowExpenseTxIds.has(t.id)
          );
        }

        if (txIdx >= 0) {
          const existingTxId = txs[txIdx].id;
          l.transactionId = existingTxId;
          activeShowExpenseTxIds.add(existingTxId);
          const updatedTx: Transaction = {
            ...txs[txIdx],
            amount: amt,
            description: itemDesc,
            date: showDate,
            status: itemStatus,
            type: 'expense',
            scope: 'BUSINESS',
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: l.id,
            costGroup: 'logistica',
            subcategory: cls.subcategory,
            isEventTransaction: true,
            categoryId: catId,
            category: catId
          };
          const check = validateShowTransaction(updatedTx, true);
          if (!check.valid) throw new Error(check.error);
          txs[txIdx] = updatedTx;
        } else {
          const newTxId = generateUUID();
          l.transactionId = newTxId;
          activeShowExpenseTxIds.add(newTxId);
          const newTx: Transaction = {
            id: newTxId,
            amount: amt,
            date: showDate,
            type: 'expense',
            status: itemStatus,
            description: itemDesc,
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: l.id,
            costGroup: 'logistica',
            subcategory: cls.subcategory,
            isEventTransaction: true,
            scope: 'BUSINESS',
            categoryId: catId,
            category: catId,
            accountId: updatedShow.expenseAccountId || 'acc_mp',
            createdAt: Date.now()
          };
          const check = validateShowTransaction(newTx, true);
          if (!check.valid) throw new Error(check.error);
          txs.push(newTx);
        }
      }
      return l;
    });
  }

  // 4. SINCRONIZAR EQUIPAMENTOS / SOM -> Aluguel, Manutenção, Insumos do Show (cat_equipamentos)
  if (Array.isArray(updatedShow.otherExpenses)) {
    updatedShow.otherExpenses = deduplicateItemsById(updatedShow.otherExpenses).map(item => {
      const cls = resolveShowExpenseClassification({
        costGroup: 'equipamentos',
        subcategory: item.subcategory || item.category,
        category: item.category,
        description: item.description
      });

      const o: ShowOtherExpenseItem = {
        ...item,
        id: item.id || generateUUID(),
        category: cls.subcategory,
        subcategory: cls.subcategory as ShowEquipmentSubcategory,
        costGroup: 'equipamentos',
        description: item.description || cls.subcategory,
        amount: Number(item.amount) || 0
      };
      const amt = o.amount;

      if (amt > 0 && !isShowCancelled) {
        const itemDesc = `[Equipamentos/Som - ${cls.subcategory}] ${o.description || cls.subcategory} - ${showTitle}`;
        const itemStatus: TransactionStatus = o.status === 'paid' ? 'paid' : defaultExpenseStatus;
        const catId = 'cat_equipamentos';

        let txIdx = o.transactionId
          ? txs.findIndex(t => t && t.id === o.transactionId && !activeShowExpenseTxIds.has(t.id))
          : -1;
        if (txIdx < 0) {
          txIdx = txs.findIndex(
            t => t && t.showId === updatedShow.id && t.showExpenseId === o.id && !activeShowExpenseTxIds.has(t.id)
          );
        }

        if (txIdx >= 0) {
          const existingTxId = txs[txIdx].id;
          o.transactionId = existingTxId;
          activeShowExpenseTxIds.add(existingTxId);
          const updatedTx: Transaction = {
            ...txs[txIdx],
            amount: amt,
            description: itemDesc,
            date: showDate,
            status: itemStatus,
            type: 'expense',
            scope: 'BUSINESS',
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: o.id,
            costGroup: 'equipamentos',
            subcategory: cls.subcategory,
            isEventTransaction: true,
            categoryId: catId,
            category: catId
          };
          const check = validateShowTransaction(updatedTx, true);
          if (!check.valid) throw new Error(check.error);
          txs[txIdx] = updatedTx;
        } else {
          const newTxId = generateUUID();
          o.transactionId = newTxId;
          activeShowExpenseTxIds.add(newTxId);
          const newTx: Transaction = {
            id: newTxId,
            amount: amt,
            date: showDate,
            type: 'expense',
            status: itemStatus,
            description: itemDesc,
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: o.id,
            costGroup: 'equipamentos',
            subcategory: cls.subcategory,
            isEventTransaction: true,
            scope: 'BUSINESS',
            categoryId: catId,
            category: catId,
            accountId: updatedShow.expenseAccountId || 'acc_mp',
            createdAt: Date.now()
          };
          const check = validateShowTransaction(newTx, true);
          if (!check.valid) throw new Error(check.error);
          txs.push(newTx);
        }
      }
      return o;
    });
  }

  // 5. SINCRONIZAR EXPENSEITEMS (COMPATIBILIDADE E ISOLAMENTO POR SUBCATEGORIA)
  if (Array.isArray(updatedShow.expenseItems)) {
    updatedShow.expenseItems = deduplicateItemsById(updatedShow.expenseItems).map(item => {
      const cls = resolveShowExpenseClassification({
        costGroup: item.costGroup,
        subcategory: item.subcategory || item.category,
        category: item.category,
        description: item.notes
      });

      const e: ShowExpenseItem = {
        ...item,
        id: item.id || generateUUID(),
        category: cls.subcategory,
        subcategory: cls.subcategory,
        costGroup: cls.costGroup,
        amount: Number(item.amount) || 0
      };
      const amt = e.amount;

      if (amt > 0 && !isShowCancelled) {
        const groupLabel = SHOW_COST_GROUPS[cls.costGroup].label;
        const itemDesc = `[${groupLabel} - ${cls.subcategory}] ${e.notes || cls.subcategory} - ${showTitle}`;
        const itemStatus: TransactionStatus = e.status || defaultExpenseStatus;
        const catId = cls.categoryId;

        let txIdx = e.transactionId
          ? txs.findIndex(t => t && t.id === e.transactionId && !activeShowExpenseTxIds.has(t.id))
          : -1;
        if (txIdx < 0) {
          txIdx = txs.findIndex(
            t => t && t.showId === updatedShow.id && t.showExpenseId === e.id && !activeShowExpenseTxIds.has(t.id)
          );
        }

        if (txIdx >= 0) {
          const existingTxId = txs[txIdx].id;
          e.transactionId = existingTxId;
          activeShowExpenseTxIds.add(existingTxId);
          txs[txIdx] = {
            ...txs[txIdx],
            amount: amt,
            description: itemDesc,
            date: e.date || showDate,
            status: itemStatus,
            type: 'expense',
            scope: 'BUSINESS',
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: e.id,
            costGroup: cls.costGroup,
            subcategory: cls.subcategory,
            isEventTransaction: true,
            categoryId: catId,
            category: catId
          };
        } else {
          const newTxId = generateUUID();
          e.transactionId = newTxId;
          activeShowExpenseTxIds.add(newTxId);
          txs.push({
            id: newTxId,
            amount: amt,
            date: e.date || showDate,
            type: 'expense',
            status: itemStatus,
            description: itemDesc,
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: e.id,
            costGroup: cls.costGroup,
            subcategory: cls.subcategory,
            isEventTransaction: true,
            scope: 'BUSINESS',
            categoryId: catId,
            category: catId,
            accountId: e.accountId || updatedShow.expenseAccountId || 'acc_mp',
            createdAt: Date.now()
          });
        }
      }
      return e;
    });
  }

  // 6. LIMPEZA AUTOMÁTICA DE TRANSAÇÕES ÓRFÃS (RECEITAS E DESPESAS EXCLUÍDAS DO SHOW)
  if (!isShowCancelled) {
    txs = txs.filter(t => {
      if (!t || t.showId !== updatedShow.id) return true;

      if (t.type === 'income') {
        if (t.showPaymentId && !activeShowIncomeTxIds.has(t.id)) {
          return false; // Receita excluída ou duplicada do show -> remove transação órfã
        }
      }

      if (t.type === 'expense') {
        if (t.showExpenseId && !activeShowExpenseTxIds.has(t.id)) {
          return false; // Despesa excluída ou duplicada do show -> remove transação órfã
        }
      }

      return true;
    });
  }

  // 7. CLASSIFICAR E INTEGRAR DESPESAS AVULSAS VINCULADAS AO SHOW NO EXTRATO
  // Garante que nenhuma despesa vinculada ao show fique perdida como "Despesa Geral"
  txs = txs.map(t => {
    if (
      !isShowCancelled &&
      t &&
      t.showId === updatedShow.id &&
      t.type === 'expense' &&
      !t.showExpenseId &&
      !activeShowExpenseTxIds.has(t.id)
    ) {
      const cls = resolveShowExpenseClassification({
        costGroup: t.costGroup,
        subcategory: t.subcategory,
        categoryId: t.categoryId,
        description: t.description
      });
      const newExpenseId = generateUUID();

      if (cls.costGroup === 'logistica') {
        updatedShow.logistics = [
          ...(updatedShow.logistics || []),
          {
            id: newExpenseId,
            type: cls.logisticsType,
            costGroup: 'logistica',
            subcategory: cls.subcategory as ShowLogisticsSubcategory,
            description: t.description || cls.subcategory,
            amount: Number(t.amount) || 0,
            status: t.status === 'paid' ? 'paid' : 'pending',
            transactionId: t.id
          }
        ];
      } else if (cls.costGroup === 'musicos') {
        updatedShow.crewMembers = [
          ...(updatedShow.crewMembers || []),
          {
            id: newExpenseId,
            name: t.description || 'Músico / Equipe',
            role: 'Equipe / Apoio',
            costGroup: 'musicos',
            subcategory: 'Cachê de Terceiros / Equipe',
            cacheAmount: Number(t.amount) || 0,
            status: t.status === 'paid' ? 'paid' : 'pending',
            transactionId: t.id
          }
        ];
      } else {
        updatedShow.otherExpenses = [
          ...(updatedShow.otherExpenses || []),
          {
            id: newExpenseId,
            category: cls.subcategory,
            subcategory: cls.subcategory as ShowEquipmentSubcategory,
            costGroup: 'equipamentos',
            description: t.description || cls.subcategory,
            amount: Number(t.amount) || 0,
            status: t.status === 'paid' ? 'paid' : 'pending',
            transactionId: t.id
          }
        ];
      }

      return {
        ...t,
        showId: updatedShow.id,
        showName: showTitle,
        showExpenseId: newExpenseId,
        costGroup: cls.costGroup,
        subcategory: cls.subcategory,
        categoryId: cls.categoryId,
        category: cls.categoryId,
        isEventTransaction: true,
        scope: 'BUSINESS'
      };
    }
    return t;
  });

  // 8. Recalcular propriedades de resumo no próprio show a partir dos lançamentos reais vinculados
  updatedShow.payments = deduplicateItemsById(updatedShow.payments || []);
  updatedShow.crewMembers = deduplicateItemsById(updatedShow.crewMembers || []);
  updatedShow.logistics = deduplicateItemsById(updatedShow.logistics || []);
  updatedShow.otherExpenses = deduplicateItemsById(updatedShow.otherExpenses || []);
  updatedShow.expenseItems = deduplicateItemsById(updatedShow.expenseItems || []);
  txs = deduplicateItemsById(txs);

  const summary = getShowFinancialSummary(updatedShow, txs);
  updatedShow.totalCache = summary.realGrossCache;
  updatedShow.cacheCombined = summary.realGrossCache;
  updatedShow.cacheReceived = summary.totalReceived;
  updatedShow.extraAmount = summary.extraAmount;

  return {
    updatedShow,
    updatedTransactions: txs
  };
}

export function cancelShowFutureTransactions(showId: string, transactions: Transaction[]): Transaction[] {
  return transactions.map(t => {
    if (t.showId === showId && (t.status === 'pending' || t.status === 'cancelled')) {
      return {
        ...t,
        status: 'cancelled' as const,
        amount: 0,
        description: t.description.startsWith('[CANCELADO]') ? t.description : `[CANCELADO] ${t.description}`
      };
    }
    return t;
  });
}

export interface ShowAuditResult {
  auditedShows: Array<{
    show: Show;
    financialSummary: ShowFinancialSummary;
    linkedTransactions: Transaction[];
    linkedExpenseTransactions: Transaction[];
    statusMessage: string;
  }>;
  suggestedMatches: Array<{
    transaction: Transaction;
    candidateShow: Show;
    matchReason: string;
    confidence: 'high' | 'medium';
  }>;
  unlinkedExtratoIncomes: Transaction[];
  unlinkedExtratoExpenses: Transaction[];
  totalAuditedReceived: number;
  totalExcludedExtratoIncome: number;
}

/**
 * Limpa prefixos comuns de descrição de extrato para exibir nome amigável em receitas legadas de show/música.
 */
function formatLegacyShowTitle(description?: string): string {
  const raw = (description || 'Show / Cachê Musical').trim();
  const cleaned = raw
    .replace(/^show:\s*/i, '')
    .replace(/\s*\(cachê principal\)\s*$/i, '')
    .replace(/\s*\(pagamento final\)\s*$/i, '')
    .trim();
  return cleaned || raw;
}

/**
 * Reconcilia de forma determinística todos os Shows e todas as Transações da categoria Shows/Música,
 * garantindo que:
 * 1. TODAS as receitas categorizadas como Shows/Música (mesmo as lançadas antes de existir `showId`)
 *    entrem no total acumulado do Dashboard e dos gráficos mensais sem duplicação.
 * 2. Cada show tenha seu Cachê Bruto, Custos e Lucro Líquido recalculados dinamicamente.
 */
export function reconcileAllShowsAndTransactions(
  shows: Show[],
  transactions: Transaction[],
  categories: Category[],
  defaultAccountId = 'acc_mp'
): {
  reconciledShows: Show[];
  reconciledTransactions: Transaction[];
} {
  const incomeCatId = resolveIncomeCategoryId(categories);
  const safeCategories = Array.isArray(categories) ? categories : [];

  // 1. Filtrar shows reais cadastrados (removendo eventuais entradas virtuais antigas para recriar de forma limpa)
  const baseShows = deduplicateItemsById(
    (Array.isArray(shows) ? shows : [])
      .filter(s => s && s.id && !String(s.id).startsWith('show_legacy_'))
      .map(s => normalizeShowFinancials(s, defaultAccountId))
  );

  const showById = new Map<string, Show>();
  baseShows.forEach(s => showById.set(s.id, s));

  // 2. Normalizar transações e identificar receitas de Shows/Música sem showId válido
  let workingTxs: Transaction[] = deduplicateItemsById(Array.isArray(transactions) ? transactions : []).map(t => {
    if (!t) return t;
    const isMusicIncome = isShowOrMusicIncomeTransaction(t, safeCategories);
    if (isMusicIncome) {
      return {
        ...t,
        amount: Number(t.amount) || 0,
        categoryId: t.categoryId === 'cat_33' || !t.categoryId ? incomeCatId : t.categoryId,
        category: t.categoryId === 'cat_33' || !t.categoryId ? incomeCatId : t.categoryId,
        scope: 'BUSINESS'
      };
    }
    return {
      ...t,
      amount: Number(t.amount) || 0
    };
  });

  // Rastrear quais transações já estão referenciadas dentro de payments de algum show
  const txIdToShowIdFromPayments = new Map<string, string>();
  baseShows.forEach(s => {
    (s.payments || []).forEach(p => {
      if (p && p.transactionId) {
        txIdToShowIdFromPayments.set(p.transactionId, s.id);
      }
    });
  });

  // 3. Vincular transações de Shows/Música órfãs (sem showId) a shows existentes compatíveis
  workingTxs = workingTxs.map(t => {
    if (!t || t.type !== 'income' || t.status === 'cancelled') return t;
    if (!isShowOrMusicIncomeTransaction(t, safeCategories)) return t;

    // Se já tem showId válido apontando para um show existente
    if (t.showId && showById.has(t.showId)) {
      return t;
    }

    // Se algum pagamento de show já aponta para esta transação
    const mappedShowId = txIdToShowIdFromPayments.get(t.id);
    if (mappedShowId && showById.has(mappedShowId)) {
      const targetShow = showById.get(mappedShowId)!;
      return {
        ...t,
        showId: targetShow.id,
        showName: targetShow.contractorName || targetShow.name,
        isEventTransaction: true,
        scope: 'BUSINESS'
      };
    }

    // Tentar casar com show existente na mesma data (ou nome exato na descrição gerada pelo próprio sistema "Show: Nome")
    const descLower = (t.description || '').toLowerCase();
    const candidateShow = baseShows.find(s => {
      if (s.status === 'Cancelado') return false;
      const sTitle = (s.contractorName || s.name || '').toLowerCase().trim();
      const isSystemGeneratedForShow =
        sTitle.length > 2 && (descLower.startsWith(`show: ${sTitle}`) || descLower === sTitle);
      if (isSystemGeneratedForShow && (!t.date || t.date === s.date)) {
        return true;
      }
      if (t.date && s.date === t.date) {
        const baseVal = getShowBaseCacheValue(s);
        const hasOtherLinkedIncome = workingTxs.some(
          other => other.id !== t.id && other.showId === s.id && other.type === 'income' && other.status !== 'cancelled'
        );
        if (!hasOtherLinkedIncome && (Math.abs(baseVal - t.amount) < 1 || baseVal === 0)) {
          return true;
        }
      }
      return false;
    });

    if (candidateShow) {
      // Substituir pagamento sintético não vinculado no show candidato para não duplicar
      const payments = Array.isArray(candidateShow.payments) ? [...candidateShow.payments] : [];
      const unlinkedIdx = payments.findIndex(
        p => !p.transactionId || !workingTxs.some(x => x && x.id === p.transactionId)
      );
      const payId =
        unlinkedIdx >= 0
          ? payments[unlinkedIdx].id
          : t.showPaymentId && !payments.some(p => p.id === t.showPaymentId)
          ? t.showPaymentId
          : generateUUID();

      if (unlinkedIdx >= 0) {
        payments[unlinkedIdx] = {
          ...payments[unlinkedIdx],
          id: payId,
          amount: Number(t.amount) || 0,
          status: t.status === 'paid' ? 'Recebido' : 'Agendado',
          expectedDate: t.date || candidateShow.date,
          effectiveDate: t.status === 'paid' ? t.date : undefined,
          accountId: t.accountId || defaultAccountId,
          transactionId: t.id
        };
      } else {
        payments.push({
          id: payId,
          type: t.showPaymentType || 'Cachê Principal',
          amount: Number(t.amount) || 0,
          status: t.status === 'paid' ? 'Recebido' : 'Agendado',
          expectedDate: t.date || candidateShow.date,
          effectiveDate: t.status === 'paid' ? t.date : undefined,
          accountId: t.accountId || defaultAccountId,
          notes: t.description,
          transactionId: t.id
        });
      }

      candidateShow.payments = payments;
      return {
        ...t,
        showId: candidateShow.id,
        showName: candidateShow.contractorName || candidateShow.name,
        showPaymentId: payId,
        isEventTransaction: true,
        scope: 'BUSINESS'
      };
    }

    return t;
  });

  // 4. Sincronizar todos os shows existentes com workingTxs
  const syncedShows: Show[] = [];
  baseShows.forEach(s => {
    const res = syncShowWithTransactions(s, workingTxs, safeCategories);
    workingTxs = res.updatedTransactions;
    syncedShows.push(res.updatedShow);
  });

  const syncedShowIds = new Set(syncedShows.map(s => s.id));

  // 5. Para TODA receita categorizada como Shows/Música que foi lançada antes de existir `showId`
  //    (e não corresponde a nenhum show cadastrado), garantir um registro de Show vinculado
  //    para que o Dashboard de Performance e todos os totalizadores incluam 100% do faturamento de Shows/Música.
  const legacyShows: Show[] = [];
  workingTxs = workingTxs.map(t => {
    if (!t || t.type !== 'income' || t.status === 'cancelled') return t;
    if (!isShowOrMusicIncomeTransaction(t, safeCategories)) return t;
    if (t.showId && syncedShowIds.has(t.showId)) return t;

    const legacyShowId =
      t.showId && String(t.showId).startsWith('show_legacy_')
        ? t.showId
        : `show_legacy_${t.id}`;
    const paymentId = t.showPaymentId || `pay_legacy_${t.id}`;
    const title = formatLegacyShowTitle(t.description);
    const txDate = t.date || new Date().toISOString().slice(0, 10);
    const amt = Number(t.amount) || 0;
    const isPaid = t.status === 'paid';

    const legacyShow: Show = {
      id: legacyShowId,
      name: title,
      contractorName: title,
      date: txDate,
      time: '20:00',
      location: title,
      city: '',
      eventType: 'Show / Apresentação',
      status: isPaid ? 'Realizado' : 'Confirmado',
      totalCache: amt,
      cacheCombined: amt,
      cacheReceived: isPaid ? amt : 0,
      extraAmount: 0,
      payments: [
        {
          id: paymentId,
          type: t.showPaymentType || 'Cachê Principal',
          amount: amt,
          expectedDate: txDate,
          effectiveDate: isPaid ? txDate : undefined,
          accountId: t.accountId || defaultAccountId,
          status: isPaid ? 'Recebido' : 'Agendado',
          notes: t.description || title,
          transactionId: t.id
        }
      ],
      crewMembers: [],
      logistics: [],
      otherExpenses: [],
      expenseItems: [],
      scope: 'BUSINESS',
      createdAt: t.createdAt || Date.now()
    };

    legacyShows.push(legacyShow);
    syncedShowIds.add(legacyShowId);

    return {
      ...t,
      showId: legacyShowId,
      showName: title,
      showPaymentId: paymentId,
      showPaymentType: t.showPaymentType || 'Cachê Principal',
      categoryId: t.categoryId || incomeCatId,
      category: t.categoryId || incomeCatId,
      isEventTransaction: true,
      scope: 'BUSINESS'
    };
  });

  return {
    reconciledShows: deduplicateItemsById([...syncedShows, ...legacyShows]),
    reconciledTransactions: deduplicateItemsById(workingTxs)
  };
}

/**
 * Auditoria de Receitas de Cachê e Extratos (incluindo receitas legadas da categoria Shows/Música)
 */
export function auditShowTransactionsAndExtracts(
  shows: Show[],
  transactions: Transaction[]
): ShowAuditResult {
  const safeShows = Array.isArray(shows) ? shows.filter(s => s && s.id && s.status !== 'Cancelado') : [];
  const safeTxs = Array.isArray(transactions) ? transactions : [];

  const showMap = new Map<string, Show>();
  safeShows.forEach(s => showMap.set(s.id, s));

  let totalAuditedReceived = 0;
  const auditedShows = safeShows.map(show => {
    const fin = getShowFinancialSummary(show, safeTxs);
    totalAuditedReceived += fin.totalReceived;
    const linked = safeTxs.filter(t => t && t.showId === show.id && t.type === 'income' && t.status !== 'cancelled');
    const linkedExpenses = safeTxs.filter(
      t => t && t.showId === show.id && t.type === 'expense' && t.status !== 'cancelled'
    );

    let statusMessage = 'Pendente de recebimento';
    if (fin.totalReceived >= fin.realGrossCache && fin.realGrossCache > 0) {
      statusMessage = '100% Recebido / Quitado';
    } else if (fin.totalReceived > 0) {
      statusMessage = `Parcialmente recebido (${fin.percentReceived}%)`;
    }

    return {
      show,
      financialSummary: fin,
      linkedTransactions: linked,
      linkedExpenseTransactions: linkedExpenses,
      statusMessage
    };
  });

  // Transações de receita no extrato que NÃO estão vinculadas a nenhum show em safeShows
  const unlinkedIncomes = safeTxs.filter(t => {
    if (!t || t.type !== 'income' || t.status === 'cancelled') return false;
    if (t.showId && showMap.has(t.showId)) return false;
    const desc = (t.description || '').toLowerCase();
    if (desc.includes('recebimento de pró-labore') || desc.includes('recebimento de pro-labore')) return false;
    return true;
  });

  // Despesas profissionais ou no extrato sem vínculo de show (para permitir vinculação rápida na auditoria)
  const unlinkedExpenses = safeTxs.filter(t => {
    if (!t || t.type !== 'expense' || t.status === 'cancelled') return false;
    if (t.showId && showMap.has(t.showId)) return false;
    const desc = (t.description || '').toLowerCase();
    if (desc.includes('pró-labore') || desc.includes('pro-labore')) return false;
    return (
      t.scope === 'BUSINESS' ||
      t.categoryId === 'cat_logistica_shows' ||
      t.categoryId === 'cat_producao_shows' ||
      t.categoryId === 'cat_equipamentos' ||
      t.categoryId === 'cat_21' ||
      desc.includes('combust') ||
      desc.includes('pedágio') ||
      desc.includes('pedagio') ||
      desc.includes('hosped') ||
      desc.includes('músico') ||
      desc.includes('musico') ||
      desc.includes('show')
    );
  });

  const suggestedMatches: Array<{
    transaction: Transaction;
    candidateShow: Show;
    matchReason: string;
    confidence: 'high' | 'medium';
  }> = [];

  const excludedExtratoIncomes: Transaction[] = [];

  unlinkedIncomes.forEach(t => {
    const desc = `${t.description || ''} ${t.originalBankDescription || ''}`.toLowerCase();
    const isMusicOrShowCategory = isShowOrMusicIncomeTransaction(t);
    const isShowRelated =
      isMusicOrShowCategory ||
      desc.includes('evento') ||
      desc.includes('pix');

    // Se a receita já está categorizada como Shows/Música e está paga, soma no total auditado mesmo que ainda não tenha showId
    if (isMusicOrShowCategory && t.status === 'paid') {
      totalAuditedReceived += Number(t.amount) || 0;
    }

    if (!isShowRelated) {
      excludedExtratoIncomes.push(t);
      return;
    }

    let matchedShow: Show | null = null;
    let matchReason = '';
    let confidence: 'high' | 'medium' = 'medium';

    // A. Busca por data exata
    if (t.date) {
      const sameDateShow = safeShows.find(s => !String(s.id).startsWith('show_legacy_') && s.date === t.date);
      if (sameDateShow) {
        matchedShow = sameDateShow;
        matchReason = `Mesma data do show (${sameDateShow.date})`;
        confidence = 'high';
      }
    }

    // B. Busca por proximidade de data (+- 4 dias) e valor
    if (!matchedShow && t.amount > 0 && t.date) {
      const txTime = new Date(t.date).getTime();
      const closeShow = safeShows.find(s => {
        if (!s.date || String(s.id).startsWith('show_legacy_')) return false;
        const showTime = new Date(s.date).getTime();
        const diffDays = Math.abs(txTime - showTime) / (1000 * 60 * 60 * 24);
        if (diffDays <= 4) {
          const fin = getShowFinancialSummary(s, safeTxs);
          return Math.abs(fin.realGrossCache - t.amount) < 1 || Math.abs(fin.totalContracted - t.amount) < 1;
        }
        return false;
      });

      if (closeShow) {
        matchedShow = closeShow;
        matchReason = `Valor compatível (${closeShow.contractorName || closeShow.name}) e data próxima`;
        confidence = 'medium';
      }
    }

    // C. Busca por nome do contratante ou local na descrição
    if (!matchedShow) {
      const nameMatch = safeShows.find(s => {
        if (String(s.id).startsWith('show_legacy_')) return false;
        const contractor = (s.contractorName || '').toLowerCase().trim();
        const venue = (s.location || '').toLowerCase().trim();
        return (contractor.length > 2 && desc.includes(contractor)) || (venue.length > 2 && desc.includes(venue));
      });

      if (nameMatch) {
        matchedShow = nameMatch;
        matchReason = `Nome do contratante/local na descrição: "${nameMatch.contractorName || nameMatch.name}"`;
        confidence = 'high';
      }
    }

    if (matchedShow) {
      suggestedMatches.push({
        transaction: t,
        candidateShow: matchedShow,
        matchReason,
        confidence
      });
    } else if (!isMusicOrShowCategory) {
      excludedExtratoIncomes.push(t);
    }
  });

  const totalExcludedExtratoIncome = excludedExtratoIncomes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return {
    auditedShows,
    suggestedMatches,
    unlinkedExtratoIncomes: excludedExtratoIncomes,
    unlinkedExtratoExpenses: unlinkedExpenses,
    totalAuditedReceived: Math.round(totalAuditedReceived * 100) / 100,
    totalExcludedExtratoIncome: Math.round(totalExcludedExtratoIncome * 100) / 100
  };
}

/**
 * Identifica despesas de combustível ocorridas em dia de shows ou vinculadas a shows
 * para exibição prioritária na aba 'Locomoção'
 */
export function getShowDayFuelExpenses(shows: Show[], transactions: Transaction[]) {
  const safeShows = Array.isArray(shows) ? shows.filter(s => s && s.id && s.status !== 'Cancelado') : [];
  const safeTxs = Array.isArray(transactions) ? transactions : [];

  const showDatesMap = new Map<string, Show>();
  const showIdMap = new Map<string, Show>();

  safeShows.forEach(s => {
    if (s.date) showDatesMap.set(s.date, s);
    if (s.id) showIdMap.set(s.id, s);
  });

  const fuelTxs = safeTxs.filter(t => {
    if (!t || t.type !== 'expense' || t.status === 'cancelled') return false;
    const desc = `${t.description || ''} ${t.originalBankDescription || ''}`.toLowerCase();
    const isFuelCategory =
      t.categoryId === 'cat_21' ||
      t.categoryId === 'cat_combustivel' ||
      (t.categoryId === 'cat_logistica_shows' && (!t.subcategory || t.subcategory === 'Combustível'));
    const isFuelDesc =
      desc.includes('posto') ||
      desc.includes('gasolina') ||
      desc.includes('combustivel') ||
      desc.includes('combustível') ||
      desc.includes('etanol') ||
      desc.includes('shell') ||
      desc.includes('ipiranga') ||
      desc.includes('petrobras') ||
      desc.includes('abastec');

    if (!isFuelCategory && !isFuelDesc) return false;

    const isShowDay = t.date ? showDatesMap.has(t.date) : false;
    const hasShowId = t.showId ? showIdMap.has(t.showId) : false;

    return isShowDay || hasShowId;
  });

  return fuelTxs.map(t => {
    const matchedShow = (t.showId ? showIdMap.get(t.showId) : null) || (t.date ? showDatesMap.get(t.date) : null);
    return {
      transaction: t,
      matchedShow,
      showName: matchedShow ? matchedShow.contractorName || matchedShow.name : 'Show Registrado',
      date: t.date,
      amount: Number(t.amount) || 0
    };
  });
}
