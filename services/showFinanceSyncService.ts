import { Show, ShowPayment, ShowExpenseItem, Transaction, Category, TransactionStatus } from '../types';
import { generateUUID } from './uuidHelper';

export interface ShowFinancialSummary {
  totalContracted: number;     // Valor contratado (cachê base)
  baseContracted: number;      // Cachê Base Contratado
  extraAmount: number;         // Valor de extras adicionados
  extraContracted: number;     // Extras Contratados
  totalPredicted: number;      // Valor total previsto = Valor contratado + Extras
  baseCacheReceived: number;   // Total recebido do cachê base (Sinais + Quitações)
  extraReceived: number;       // Total recebido de Horas Extras, Gorjetas e Adicionais
  totalReceived: number;       // Total geral recebido = baseCacheReceived + extraReceived
  totalPending: number;        // Saldo restante do cachê base = Math.max(0, totalContracted - baseCacheReceived)
  percentReceived: number;     // % quitada do cachê base (0 a 100%)
  totalScheduled: number;      // Total agendado em parcelas pendentes
  paidExpenses: number;        // Total de despesas pagas
  pendingExpenses: number;     // Total de despesas pendentes/agendadas
  totalExpenses: number;       // Total de despesas registradas
  netProfit: number;           // Lucro líquido = Total recebido - Total de despesas pagas
  projectedProfit: number;     // Lucro líquido projetado = Total previsto - Total de despesas
  equipmentReserveAmount: number; // Fundo de reserva / depreciação do equipamento
  netProfitAfterReserve: number;  // Lucro líquido real após dedução do fundo de reserva
  projectedProfitAfterReserve: number; // Lucro projetado após fundo de reserva
  totalTimeHours: number;      // Tempo total dedicado (deslocamento + passagem de som + show)
  profitPerHour: number;       // Lucro projetado por hora trabalhada
  netProfitPerHour: number;    // Lucro realizado por hora trabalhada
  remainingToSchedule: number; // Valor previsto ainda não parcelado/agendado
  isOverTotal: boolean;        // Se a soma dos pagamentos excede o total previsto
  excessAmount: number;        // Valor excedente se houver
}

/**
 * Converte dados legados ou incompletos de um Show para o formato moderno e seguro.
 * NÃO cria parcelas automáticas se o show não tiver pagamentos cadastrados.
 */
export function normalizeShowFinancials(show: Show, fallbackAccountId: string): Show {
  if (!show) {
    throw new Error('Show não fornecido para normalização');
  }

  const normalized: Show = { ...show };

  // 1. Normalizar Cachê Total Contratado e Extras
  const totalCacheVal = Number(
    normalized.totalCache !== undefined && normalized.totalCache !== null
      ? normalized.totalCache
      : normalized.cacheCombined !== undefined && normalized.cacheCombined !== null
      ? normalized.cacheCombined
      : 0
  ) || 0;

  const extraAmountVal = Number(normalized.extraAmount) || 0;
  
  // Normalizar Pagamentos primeiro para calcular extras
  let currentPayments: ShowPayment[] = [];
  if (Array.isArray(normalized.payments) && normalized.payments.length > 0) {
    currentPayments = normalized.payments.map((p, idx) => ({
      id: p.id || generateUUID(),
      type: p.type || (idx === 0 && normalized.payments!.length > 1 ? 'Sinal' : 'Parcela'),
      amount: Number(p.amount) || 0,
      expectedDate: p.expectedDate || normalized.date,
      effectiveDate: p.effectiveDate,
      accountId: p.accountId || fallbackAccountId,
      status: p.status === 'Recebido' ? 'Recebido' : (p.status === 'Cancelado' ? 'Cancelado' : 'Agendado'),
      notes: p.notes || '',
      transactionId: p.transactionId
    }));
  } else if (Array.isArray(normalized.receipts) && normalized.receipts.length > 0) {
    currentPayments = normalized.receipts.map(r => ({
      id: r.id || generateUUID(),
      type: r.type === 'Sinal' ? 'Sinal' : (r.type === 'Bônus' ? 'Bônus' : (r.type === 'Pagamento final' ? 'Pagamento final' : 'Parcela')),
      amount: Number(r.amount) || 0,
      expectedDate: r.expectedDate || normalized.date,
      effectiveDate: r.effectiveDate,
      accountId: r.accountId || fallbackAccountId,
      status: r.status === 'Recebido' ? 'Recebido' : 'Agendado',
      transactionId: r.transactionId
    }));
  }

  const extraFromPayments = currentPayments
    .filter(p => p && (p.type === 'Extra' || p.type === 'Bônus') && p.status !== 'Cancelado')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  normalized.totalCache = totalCacheVal;
  normalized.extraAmount = Math.max(extraAmountVal, extraFromPayments);
  normalized.cacheCombined = totalCacheVal;
  normalized.cacheReceived = Number(normalized.cacheReceived) || 0;
  normalized.payments = currentPayments;

  // 2. Normalizar Contratante e Nome
  const contractor = (normalized.contractorName || normalized.name || 'Apresentação').trim();
  normalized.contractorName = contractor;
  normalized.name = normalized.name ? normalized.name.trim() : contractor;

  // 3. Normalizar Status
  if (normalized.status === 'Agendado') {
    normalized.status = 'Aguardando confirmação';
  } else if (!normalized.status) {
    normalized.status = 'Confirmado';
  }

  // 4. Normalizar Dados de Agenda
  normalized.date = normalized.date || new Date().toISOString().slice(0, 10);
  normalized.time = normalized.time || '20:00';
  normalized.location = normalized.location || '';
  normalized.city = normalized.city || '';
  normalized.eventType = normalized.eventType || 'Show / Apresentação';
  normalized.createdAt = normalized.createdAt || Date.now();

  // 5. Normalizar Despesas (expenseItems)
  if (Array.isArray(normalized.expenseItems) && normalized.expenseItems.length > 0) {
    normalized.expenseItems = normalized.expenseItems.map(e => ({
      id: e.id || generateUUID(),
      category: e.category || 'Outros',
      amount: Number(e.amount) || 0,
      date: e.date || normalized.date,
      accountId: e.accountId || fallbackAccountId,
      notes: e.notes || '',
      transactionId: e.transactionId
    }));
  }

  return normalized;
}

/**
 * Calcula o resumo financeiro de um Show conforme as regras de negócio:
 * - Cachê Base Contratado: totalContracted
 * - Recebido do Cachê Base: baseCacheReceived (Sinais + Quitações/Parcelas)
 * - Receita Extra Vinculada: extraReceived (Horas Extras, Gorjetas)
 * - Total Geral Arrecadado: baseCacheReceived + extraReceived
 * - Saldo restante do cachê base: Math.max(0, totalContracted - baseCacheReceived)
 * - Adicionais NÃO estouram a porcentagem do cachê principal!
 */
export function getShowFinancialSummary(show: Show | null | undefined, transactions?: Transaction[]): ShowFinancialSummary {
  if (!show) {
    return {
      totalContracted: 0,
      baseContracted: 0,
      extraAmount: 0,
      extraContracted: 0,
      totalPredicted: 0,
      baseCacheReceived: 0,
      extraReceived: 0,
      totalReceived: 0,
      totalPending: 0,
      percentReceived: 0,
      totalScheduled: 0,
      paidExpenses: 0,
      pendingExpenses: 0,
      totalExpenses: 0,
      netProfit: 0,
      projectedProfit: 0,
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

  const totalContracted = Number(
    show.totalCache !== undefined && show.totalCache !== null
      ? show.totalCache
      : show.cacheCombined !== undefined && show.cacheCombined !== null
      ? show.cacheCombined
      : 0
  ) || 0;

  let baseCacheReceived = 0;
  let extraReceived = 0;
  let totalScheduled = 0;

  // Set de IDs de transações processadas para evitar qualquer duplicidade
  const processedTxIds = new Set<string>();

  // 1. Apuração dinâmica e prioritária a partir das transações do livro-razão vinculadas ao show
  const linkedIncomeTxs = transactions && transactions.length > 0 
    ? transactions.filter(t => t && t.showId === show.id && t.type === 'income' && t.status !== 'cancelled')
    : [];

  // Separar transações de Extras (Hora Extra, Gorjeta, Bônus) das transações de Cachê Base
  const extraTxs: Transaction[] = [];
  const baseTxs: Transaction[] = [];

  if (linkedIncomeTxs.length > 0) {
    linkedIncomeTxs.forEach(t => {
      const desc = (t.description || '').toLowerCase();
      const isExtra = t.showPaymentType === 'Extra' || t.showPaymentType === 'Bônus' || 
                      desc.includes('hora extra') || desc.includes('gorjeta') || desc.includes('adicional');
      if (isExtra) {
        extraTxs.push(t);
      } else {
        baseTxs.push(t);
      }
    });

    // Processar transações de extras
    extraTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.id) processedTxIds.add(t.id);
      if (t.status === 'paid') {
        extraReceived += amt;
      } else if (t.status === 'pending') {
        totalScheduled += amt;
      }
    });

    // REGRA DE SOBRESCRITA DE RECEITA DO SHOW:
    // Quando uma transação do Extrato (Pix/Transferência) for vinculada a um show,
    // o valor dessa transação deve DEFINIR/SOBRESCREVER o valor recebido do show, e NUNCA ser somado em duplicidade com o cachê previsto.
    if (baseTxs.length > 0) {
      // Se houver transação real do Extrato (ex: importada ou criada pelo usuário), prioriza sobre sintética
      const realBaseTxs = baseTxs.filter(t => t.importedFromBank || !t.description?.startsWith('Show: '));
      const effectiveBaseTxs = realBaseTxs.length > 0 ? realBaseTxs : baseTxs;

      effectiveBaseTxs.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.id) processedTxIds.add(t.id);
        if (t.status === 'paid') {
          // Se for uma única transação vinculada cobrindo o show, ela define o recebido
          baseCacheReceived += amt;
        } else if (t.status === 'pending') {
          totalScheduled += amt;
        }
      });

      // Capped ao cachê contratado para transações de base (evita duplicações acidentais de registros idênticos)
      if (totalContracted > 0 && effectiveBaseTxs.length > 1) {
        baseCacheReceived = Math.min(totalContracted, baseCacheReceived);
      }
    }
  } else {
    // 2. Se não houver transações vinculadas no livro-razão, lê exclusivamente o histórico de recebimentos do próprio show
    if (Array.isArray(show.payments) && show.payments.length > 0) {
      show.payments.forEach(p => {
        if (!p || p.status === 'Cancelado') return;
        const amt = Number(p.amount) || 0;
        const isExtra = p.type === 'Extra' || p.type === 'Bônus';

        if (p.status === 'Recebido') {
          if (isExtra) {
            extraReceived += amt;
          } else {
            baseCacheReceived += amt;
          }
        } else if (p.status === 'Agendado' || p.status === 'Previsto') {
          totalScheduled += amt;
        }
      });
      if (totalContracted > 0) {
        baseCacheReceived = Math.min(totalContracted, baseCacheReceived);
      }
    } else if (Array.isArray(show.receipts) && show.receipts.length > 0) {
      // Fallback legado
      show.receipts.forEach(r => {
        if (!r) return;
        const amt = Number(r.amount) || 0;
        const isExtra = r.type === 'Bônus';

        if (r.status === 'Recebido') {
          if (isExtra) {
            extraReceived += amt;
          } else {
            baseCacheReceived += amt;
          }
        } else {
          totalScheduled += amt;
        }
      });
      if (totalContracted > 0) {
        baseCacheReceived = Math.min(totalContracted, baseCacheReceived);
      }
    }
  }

  // O valor total do show deve ser exclusivamente: [Cachê Base Contratado] + [Extras / Hora Extra / Gorjeta].
  // Exemplo: Cachê inicial R$ 600,00 + Registro de R$ 200,00 de hora extra = Valor Final R$ 800,00.
  const extraAmount = Math.max(Number(show.extraAmount) || 0, extraReceived);
  const totalPredicted = Math.round((totalContracted + extraAmount) * 100) / 100;
  const totalReceived = Math.round((baseCacheReceived + extraReceived) * 100) / 100;

  // Saldo restante total do show = Math.max(0, totalPredicted - totalReceived)
  const totalPending = Math.max(0, Math.round((totalPredicted - totalReceived) * 100) / 100);

  // Porcentagem quitada do total do show
  const percentReceived = totalPredicted > 0 
    ? Math.min(100, Math.round((totalReceived / totalPredicted) * 100))
    : 100;

  // Despesas dinâmicas (Pagas e Pendentes)
  let paidExpenses = 0;
  let pendingExpenses = 0;

  // 1. Somar itens estruturados diretos do show (Equipe, Logística, Outras Despesas)
  if (Array.isArray(show.crewMembers)) {
    show.crewMembers.forEach(c => {
      if (!c) return;
      const amt = Number(c.cacheAmount) || 0;
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
      const amt = Number(l.amount) || 0;
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
      const amt = Number(o.amount) || 0;
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
      paidExpenses += Number(e.amount) || 0;
    });
  } else if (show.expenses) {
    // Caso de legado (apenas se não houver itens estruturados)
    const hasStructuredItems = (show.crewMembers && show.crewMembers.length > 0) ||
                               (show.logistics && show.logistics.length > 0) ||
                               (show.otherExpenses && show.otherExpenses.length > 0);
    if (!hasStructuredItems) {
      paidExpenses += (Number(show.expenses.fuel) || 0) +
                      (Number(show.expenses.food) || 0) +
                      (Number(show.expenses.toll) || 0) +
                      (Number(show.expenses.commission) || 0) +
                      (Number(show.expenses.others) || 0);
    }
  }

  // 2. Somar despesas avulsas do livro-razão (que não têm correspondente showExpenseId) para evitar dupla contagem
  if (transactions && transactions.length > 0) {
    const unlinkedExpenseTxs = transactions.filter(t => 
      t && t.showId === show.id && 
      t.type === 'expense' &&
      t.status !== 'cancelled' &&
      !t.showExpenseId // Somente avulsas adicionadas diretamente no Extrato geral!
    );

    unlinkedExpenseTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.status === 'paid') {
        paidExpenses += amt;
      } else if (t.status === 'pending') {
        pendingExpenses += amt;
      }
    });
  }

  const totalExpenses = Math.round((paidExpenses + pendingExpenses) * 100) / 100;

  // Lucro líquido realizado = Total recebido - Despesas pagas
  const netProfit = Math.round((totalReceived - paidExpenses) * 100) / 100;
  // Lucro projetado = Total previsto - Todas as despesas
  const projectedProfit = Math.round((totalPredicted - totalExpenses) * 100) / 100;

  // Fundo de Reserva / Depreciação de Equipamentos
  const equipmentReserveAmount = Math.max(0, Number(show.equipmentReserveAmount) || 0);
  const netProfitAfterReserve = Math.round((netProfit - equipmentReserveAmount) * 100) / 100;
  const projectedProfitAfterReserve = Math.round((projectedProfit - equipmentReserveAmount) * 100) / 100;

  // Tempo Dedicado Total e Métrica de Hora Trabalhada (Horas)
  const showDuration = Number(show.showDurationHours) || parseFloat(show.duration || '3') || 3;
  const travelHours = (Number(show.travelTimeMinutes) || 0) / 60;
  const soundcheckHours = (Number(show.soundcheckTimeMinutes) || 0) / 60;
  const totalTimeHours = Math.max(0.5, Math.round((showDuration + travelHours + soundcheckHours) * 10) / 10);

  const profitPerHour = Math.round((projectedProfitAfterReserve / totalTimeHours) * 100) / 100;
  const netProfitPerHour = Math.round((netProfitAfterReserve / totalTimeHours) * 100) / 100;

  const totalPaymentsSum = totalReceived + totalScheduled;
  const rawRemaining = totalPredicted - totalPaymentsSum;
  const remainingToSchedule = rawRemaining > 0 ? Math.round(rawRemaining * 100) / 100 : 0;

  return {
    totalContracted: Math.round(totalContracted * 100) / 100,
    baseContracted: Math.round(totalContracted * 100) / 100,
    extraAmount: Math.round(extraAmount * 100) / 100,
    extraContracted: Math.round(extraAmount * 100) / 100,
    totalPredicted: Math.round(totalPredicted * 100) / 100,
    baseCacheReceived: Math.round(baseCacheReceived * 100) / 100,
    extraReceived: Math.round(extraReceived * 100) / 100,
    totalReceived: Math.round(totalReceived * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    percentReceived,
    totalScheduled: Math.round(totalScheduled * 100) / 100,
    paidExpenses: Math.round(paidExpenses * 100) / 100,
    pendingExpenses: Math.round(pendingExpenses * 100) / 100,
    totalExpenses,
    netProfit,
    projectedProfit,
    equipmentReserveAmount,
    netProfitAfterReserve,
    projectedProfitAfterReserve,
    totalTimeHours,
    profitPerHour,
    netProfitPerHour,
    remainingToSchedule: isNaN(remainingToSchedule) ? 0 : remainingToSchedule,
    isOverTotal: false,
    excessAmount: 0
  };
}

/**
 * Localiza ou determina a categoria apropriada para receita e despesas de show
 */
function resolveIncomeCategoryId(categories: Category[]): string {
  if (!categories || categories.length === 0) return 'cat_33';
  const showCat = categories.find(c => 
    c.id === 'cat_33' || 
    (c.type === 'income' && (
      c.name.toLowerCase().includes('show') || 
      c.name.toLowerCase().includes('cachê') || 
      c.name.toLowerCase().includes('cache')
    ))
  );
  if (showCat) return showCat.id;
  const anyIncome = categories.find(c => c.type === 'income');
  return anyIncome ? anyIncome.id : 'cat_33';
}

function resolveExpenseCategoryId(categories: Category[], hint: string): string {
  if (!categories || categories.length === 0) return 'cat_producao_shows';
  const h = (hint || '').toLowerCase();
  
  if (h.includes('combustiv') || h.includes('gasolina') || h.includes('pedagio') || h.includes('uber') || h.includes('transporte') || h.includes('logist')) {
    const cat = categories.find(c => c.type === 'expense' && (c.name.toLowerCase().includes('combust') || c.name.toLowerCase().includes('transporte') || c.name.toLowerCase().includes('viagem')));
    if (cat) return cat.id;
  }
  
  if (h.includes('musico') || h.includes('equipe') || h.includes('bateria') || h.includes('baixo') || h.includes('freelance') || h.includes('sanfona') || h.includes('teclado')) {
    const cat = categories.find(c => c.type === 'expense' && (c.name.toLowerCase().includes('equipe') || c.name.toLowerCase().includes('produção') || c.name.toLowerCase().includes('músico')));
    if (cat) return cat.id;
  }

  const showExpCat = categories.find(c => c.type === 'expense' && (c.id === 'cat_producao_shows' || c.name.toLowerCase().includes('show') || c.scope === 'BUSINESS'));
  if (showExpCat) return showExpCat.id;

  const anyExp = categories.find(c => c.type === 'expense');
  return anyExp ? anyExp.id : 'cat_producao_shows';
}

/**
 * Sincroniza um Show com a lista de movimentações financeiras sem criar duplicações.
 * Sincroniza tanto Pagamentos (Receitas) quanto Custos Diretos (Despesas de Equipe, Logística e Extras).
 */
export function syncShowWithTransactions(
  show: Show,
  existingTransactions: Transaction[],
  categories: Category[]
): {
  updatedShow: Show;
  updatedTransactions: Transaction[];
} {
  const updatedShow: Show = { ...show };
  let txs = Array.isArray(existingTransactions) ? [...existingTransactions] : [];

  const incomeCatId = resolveIncomeCategoryId(categories);
  const showTitle = (updatedShow.contractorName || updatedShow.name || 'Show').trim();
  const isShowCancelled = updatedShow.status === 'Cancelado';
  const showDate = updatedShow.date || new Date().toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  
  // Status padrão para despesas do show: 'pending' (Pendente) se o show for futuro, ou 'paid' (Concluído) se já ocorreu ou foi realizado
  const defaultExpenseStatus: TransactionStatus = (showDate > todayStr && updatedShow.status !== 'Realizado') ? 'pending' : 'paid';

  // Set para acompanhar os IDs de transação ativos para este show
  const activeShowExpenseTxIds = new Set<string>();

  // 1. SINCRONIZAR PAGAMENTOS (RECEITAS)
  const currentPayments = Array.isArray(updatedShow.payments) ? updatedShow.payments : [];

  const updatedPayments = currentPayments.map(payment => {
    const p = { ...payment };
    const isReceived = p.status === 'Recebido';
    const txDate = (isReceived && p.effectiveDate) ? p.effectiveDate : (p.expectedDate || showDate);
    const txStatus: TransactionStatus = isReceived ? 'paid' : (isShowCancelled ? 'cancelled' : 'pending');
    const baseDesc = `Show: ${showTitle} (${p.type || 'Parcela'})`;
    const txDescription = (isShowCancelled && !isReceived)
      ? (baseDesc.startsWith('[CANCELADO]') ? baseDesc : `[CANCELADO] ${baseDesc}`)
      : baseDesc;
    const txAmount = (isShowCancelled && !isReceived) ? 0 : p.amount;

    if (p.transactionId) {
      const txIndex = txs.findIndex(t => t.id === p.transactionId);
      if (txIndex >= 0) {
        txs[txIndex] = {
          ...txs[txIndex],
          amount: txAmount,
          date: txDate,
          accountId: p.accountId || txs[txIndex].accountId || 'acc_bank',
          status: txStatus,
          description: txDescription,
          showId: updatedShow.id,
          showPaymentType: p.type,
          scope: 'BUSINESS',
          categoryId: incomeCatId
        };
      }
    } else if (p.amount > 0 && !isShowCancelled) {
      // Evita duplicar se já houver transação do Extrato vinculada ao show
      const existingMatchTx = txs.find(t => 
        t && t.showId === updatedShow.id && 
        t.type === 'income' && 
        (t.showPaymentId === p.id || (!t.showPaymentId && Math.abs(Number(t.amount) - p.amount) < 0.01))
      );

      if (existingMatchTx) {
        p.transactionId = existingMatchTx.id;
        existingMatchTx.showPaymentId = p.id;
        existingMatchTx.showPaymentType = p.type;
      } else {
        const newTxId = generateUUID();
        p.transactionId = newTxId;
        txs.push({
          id: newTxId,
          amount: p.amount,
          date: txDate,
          type: 'income',
          status: txStatus,
          description: txDescription,
          showId: updatedShow.id,
          showPaymentType: p.type,
          showPaymentId: p.id,
          scope: 'BUSINESS',
          categoryId: incomeCatId,
          accountId: p.accountId || 'acc_bank',
          createdAt: Date.now()
        });
      }
    }

    return p;
  });

  updatedShow.payments = updatedPayments;

  // 2. SINCRONIZAR CUSTOS DIRETOS (EQUIPE / MÚSICOS)
  if (Array.isArray(updatedShow.crewMembers)) {
    updatedShow.crewMembers = updatedShow.crewMembers.map(member => {
      const m = { ...member };
      if (!m.id) m.id = generateUUID();
      const amt = Number(m.cacheAmount) || 0;

      if (amt > 0 && !isShowCancelled) {
        const itemDesc = `${m.name}${m.role ? ' - ' + m.role : ''} (${showTitle})`;
        const itemStatus: TransactionStatus = m.status === 'paid' ? 'paid' : defaultExpenseStatus;
        const catId = resolveExpenseCategoryId(categories, m.role || 'Músicos');

        let txIdx = m.transactionId ? txs.findIndex(t => t.id === m.transactionId) : -1;
        if (txIdx < 0) {
          txIdx = txs.findIndex(t => t.showId === updatedShow.id && t.showExpenseId === m.id);
        }

        if (txIdx >= 0) {
          const existingTxId = txs[txIdx].id;
          m.transactionId = existingTxId;
          activeShowExpenseTxIds.add(existingTxId);
          txs[txIdx] = {
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
            categoryId: catId,
            category: catId
          };
        } else {
          const newTxId = generateUUID();
          m.transactionId = newTxId;
          activeShowExpenseTxIds.add(newTxId);
          txs.push({
            id: newTxId,
            amount: amt,
            date: showDate,
            type: 'expense',
            status: itemStatus,
            description: itemDesc,
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: m.id,
            scope: 'BUSINESS',
            categoryId: catId,
            category: catId,
            accountId: updatedShow.expenseAccountId || 'acc_bank',
            createdAt: Date.now()
          });
        }
      } else if (m.transactionId) {
        activeShowExpenseTxIds.add(m.transactionId);
      }
      return m;
    });
  }

  // 3. SINCRONIZAR LOGÍSTICA & DESLOCAMENTO
  if (Array.isArray(updatedShow.logistics)) {
    updatedShow.logistics = updatedShow.logistics.map(item => {
      const l = { ...item };
      if (!l.id) l.id = generateUUID();
      const amt = Number(l.amount) || 0;

      if (amt > 0 && !isShowCancelled) {
        const itemDesc = `${l.description || 'Deslocamento'} (${showTitle})`;
        const itemStatus: TransactionStatus = l.status === 'paid' ? 'paid' : defaultExpenseStatus;
        const catId = resolveExpenseCategoryId(categories, l.type || 'combustivel');

        let txIdx = l.transactionId ? txs.findIndex(t => t.id === l.transactionId) : -1;
        if (txIdx < 0) {
          txIdx = txs.findIndex(t => t.showId === updatedShow.id && t.showExpenseId === l.id);
        }

        if (txIdx >= 0) {
          const existingTxId = txs[txIdx].id;
          l.transactionId = existingTxId;
          activeShowExpenseTxIds.add(existingTxId);
          txs[txIdx] = {
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
            categoryId: catId,
            category: catId
          };
        } else {
          const newTxId = generateUUID();
          l.transactionId = newTxId;
          activeShowExpenseTxIds.add(newTxId);
          txs.push({
            id: newTxId,
            amount: amt,
            date: showDate,
            type: 'expense',
            status: itemStatus,
            description: itemDesc,
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: l.id,
            scope: 'BUSINESS',
            categoryId: catId,
            category: catId,
            accountId: updatedShow.expenseAccountId || 'acc_bank',
            createdAt: Date.now()
          });
        }
      } else if (l.transactionId) {
        activeShowExpenseTxIds.add(l.transactionId);
      }
      return l;
    });
  }

  // 4. SINCRONIZAR OUTRAS DESPESAS
  if (Array.isArray(updatedShow.otherExpenses)) {
    updatedShow.otherExpenses = updatedShow.otherExpenses.map(item => {
      const o = { ...item };
      if (!o.id) o.id = generateUUID();
      const amt = Number(o.amount) || 0;

      if (amt > 0 && !isShowCancelled) {
        const itemDesc = `${o.description || o.category || 'Despesa Extra'} (${showTitle})`;
        const itemStatus: TransactionStatus = o.status === 'paid' ? 'paid' : defaultExpenseStatus;
        const catId = resolveExpenseCategoryId(categories, o.category || 'Outros');

        let txIdx = o.transactionId ? txs.findIndex(t => t.id === o.transactionId) : -1;
        if (txIdx < 0) {
          txIdx = txs.findIndex(t => t.showId === updatedShow.id && t.showExpenseId === o.id);
        }

        if (txIdx >= 0) {
          const existingTxId = txs[txIdx].id;
          o.transactionId = existingTxId;
          activeShowExpenseTxIds.add(existingTxId);
          txs[txIdx] = {
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
            categoryId: catId,
            category: catId
          };
        } else {
          const newTxId = generateUUID();
          o.transactionId = newTxId;
          activeShowExpenseTxIds.add(newTxId);
          txs.push({
            id: newTxId,
            amount: amt,
            date: showDate,
            type: 'expense',
            status: itemStatus,
            description: itemDesc,
            showId: updatedShow.id,
            showName: showTitle,
            showExpenseId: o.id,
            scope: 'BUSINESS',
            categoryId: catId,
            category: catId,
            accountId: updatedShow.expenseAccountId || 'acc_bank',
            createdAt: Date.now()
          });
        }
      } else if (o.transactionId) {
        activeShowExpenseTxIds.add(o.transactionId);
      }
      return o;
    });
  }

  // 5. SINCRONIZAR EXPENSEITEMS (COMPATIBILIDADE LEGADA)
  if (Array.isArray(updatedShow.expenseItems)) {
    updatedShow.expenseItems = updatedShow.expenseItems.map(item => {
      const e = { ...item };
      if (!e.id) e.id = generateUUID();
      const amt = Number(e.amount) || 0;

      if (amt > 0 && !isShowCancelled) {
        const itemDesc = `${e.notes || e.category || 'Despesa'} (${showTitle})`;
        const itemStatus: TransactionStatus = defaultExpenseStatus;
        const catId = resolveExpenseCategoryId(categories, e.category || 'Outros');

        let txIdx = e.transactionId ? txs.findIndex(t => t.id === e.transactionId) : -1;
        if (txIdx < 0) {
          txIdx = txs.findIndex(t => t.showId === updatedShow.id && t.showExpenseId === e.id);
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
            scope: 'BUSINESS',
            categoryId: catId,
            category: catId,
            accountId: e.accountId || updatedShow.expenseAccountId || 'acc_bank',
            createdAt: Date.now()
          });
        }
      } else if (e.transactionId) {
        activeShowExpenseTxIds.add(e.transactionId);
      }
      return e;
    });
  }

  // 6. LIMPEZA AUTOMÁTICA DE TRANSAÇÕES ÓRFÃS DE DESPESA DO SHOW
  // Se o custo foi excluído da Ficha do Show, remove do Extrato de Transações
  txs = txs.filter(t => {
    if (t.showId === updatedShow.id && t.type === 'expense') {
      if (t.showExpenseId && !activeShowExpenseTxIds.has(t.id) && !activeShowExpenseTxIds.has(t.showExpenseId)) {
        return false; // Remove transação órfã
      }
    }
    return true;
  });

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
    statusMessage: string;
  }>;
  suggestedMatches: Array<{
    transaction: Transaction;
    candidateShow: Show;
    matchReason: string;
    confidence: 'high' | 'medium';
  }>;
  unlinkedExtratoIncomes: Transaction[];
  totalAuditedReceived: number;
  totalExcludedExtratoIncome: number;
}

/**
 * Auditoria Estrita de Receitas de Cachê e Extratos
 * - Garante que o Dashboard de Performance considere única e exclusivamente os shows cadastrados
 * - As receitas consideram os valores efetivamente recebidos
 * - Identifica movimentações do extrato desconsideradas para não inflacionar os valores
 * - Sugere vínculos automáticos/rápidos para transações passadas com shows correspondentes
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
    
    let statusMessage = 'Pendente de recebimento';
    if (fin.totalReceived >= fin.totalPredicted && fin.totalPredicted > 0) {
      statusMessage = '100% Recebido / Quitado';
    } else if (fin.totalReceived > 0) {
      statusMessage = `Parcialmente recebido (${fin.percentReceived}%)`;
    }

    return {
      show,
      financialSummary: fin,
      linkedTransactions: linked,
      statusMessage
    };
  });

  // Transações de receita no extrato que NÃO estão vinculadas a nenhum show
  const unlinkedIncomes = safeTxs.filter(t => {
    if (!t || t.type !== 'income' || t.status === 'cancelled') return false;
    if (t.showId && showMap.has(t.showId)) return false; // Já vinculado a show existente
    const desc = (t.description || '').toLowerCase();
    if (desc.includes('recebimento de pró-labore') || desc.includes('recebimento de pro-labore')) return false;
    return true;
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
    const isShowRelated = t.categoryId === 'cat_33' || 
                          desc.includes('cachê') || desc.includes('cache') || 
                          desc.includes('show') || desc.includes('evento') || 
                          desc.includes('apresentacao') || desc.includes('apresentação') || 
                          desc.includes('contratante');

    if (!isShowRelated) {
      excludedExtratoIncomes.push(t);
      return;
    }

    let matchedShow: Show | null = null;
    let matchReason = '';
    let confidence: 'high' | 'medium' = 'medium';

    // A. Busca por data exata
    if (t.date) {
      const sameDateShow = safeShows.find(s => s.date === t.date);
      if (sameDateShow) {
        matchedShow = sameDateShow;
        matchReason = `Mesma data do show (${sameDateShow.date})`;
        confidence = 'high';
      }
    }

    // B. Busca por proximidade de data (+- 3 dias) e valor
    if (!matchedShow && t.amount > 0 && t.date) {
      const txTime = new Date(t.date).getTime();
      const closeShow = safeShows.find(s => {
        if (!s.date) return false;
        const showTime = new Date(s.date).getTime();
        const diffDays = Math.abs(txTime - showTime) / (1000 * 60 * 60 * 24);
        if (diffDays <= 4) {
          const fin = getShowFinancialSummary(s, safeTxs);
          return Math.abs(fin.totalPredicted - t.amount) < 1 || Math.abs(fin.totalContracted - t.amount) < 1;
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
        const contractor = (s.contractorName || '').toLowerCase().trim();
        const venue = (s.location || '').toLowerCase().trim();
        return (contractor.length > 2 && desc.includes(contractor)) || 
               (venue.length > 2 && desc.includes(venue));
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
    } else {
      excludedExtratoIncomes.push(t);
    }
  });

  const totalExcludedExtratoIncome = excludedExtratoIncomes.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return {
    auditedShows,
    suggestedMatches,
    unlinkedExtratoIncomes: excludedExtratoIncomes,
    totalAuditedReceived,
    totalExcludedExtratoIncome
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

  // Filtrar transações de combustível em dias de show ou vinculadas a show
  const fuelTxs = safeTxs.filter(t => {
    if (!t || t.type !== 'expense' || t.status === 'cancelled') return false;
    const desc = `${t.description || ''} ${t.originalBankDescription || ''}`.toLowerCase();
    const isFuelCategory = t.categoryId === 'cat_21' || t.categoryId === 'cat_combustivel';
    const isFuelDesc = desc.includes('posto') || desc.includes('gasolina') || 
                       desc.includes('combustivel') || desc.includes('combustível') || 
                       desc.includes('etanol') || desc.includes('shell') || 
                       desc.includes('ipiranga') || desc.includes('petrobras') || 
                       desc.includes('abastec');

    if (!isFuelCategory && !isFuelDesc) return false;

    // Verificar se ocorreu em dia de show ou tem showId
    const isShowDay = t.date ? showDatesMap.has(t.date) : false;
    const hasShowId = t.showId ? showIdMap.has(t.showId) : false;

    return isShowDay || hasShowId;
  });

  return fuelTxs.map(t => {
    const matchedShow = (t.showId ? showIdMap.get(t.showId) : null) || (t.date ? showDatesMap.get(t.date) : null);
    return {
      transaction: t,
      matchedShow,
      showName: matchedShow ? (matchedShow.contractorName || matchedShow.name) : 'Show Registrado',
      date: t.date,
      amount: Number(t.amount) || 0
    };
  });
}
