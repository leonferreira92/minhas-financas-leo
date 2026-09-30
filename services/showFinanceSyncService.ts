import { Show, ShowPayment, ShowExpenseItem, Transaction, Category } from '../types';
import { generateUUID } from './uuidHelper';

export interface ShowFinancialSummary {
  totalContracted: number;
  totalReceived: number;
  totalPending: number;
  totalExpenses: number;
  netProfit: number; // Fórmula solicitada: total recebido - total de despesas
  remainingToSchedule: number;
  isOverTotal: boolean;
  excessAmount: number;
}

/**
 * Converte dados legados ou incompletos de um Show para o formato moderno e seguro
 * Garante que nenhum campo undefined, nulo ou string cause falhas na aplicação
 */
export function normalizeShowFinancials(show: Show, fallbackAccountId: string): Show {
  if (!show) {
    throw new Error('Show não fornecido para normalização');
  }

  const normalized: Show = { ...show };

  // 1. Normalizar Cachê Total (compatibilidade com cacheCombined antigo)
  const totalCacheVal = Number(
    normalized.totalCache !== undefined && normalized.totalCache !== null
      ? normalized.totalCache
      : normalized.cacheCombined !== undefined && normalized.cacheCombined !== null
      ? normalized.cacheCombined
      : 0
  ) || 0;

  normalized.totalCache = totalCacheVal;
  normalized.cacheCombined = totalCacheVal;
  normalized.cacheReceived = Number(normalized.cacheReceived) || 0;

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

  // 5. Normalizar Pagamentos (payments)
  if (Array.isArray(normalized.payments) && normalized.payments.length > 0) {
    normalized.payments = normalized.payments.map((p, idx) => ({
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
    // Migrar receipts legados
    normalized.payments = normalized.receipts.map(r => ({
      id: r.id || generateUUID(),
      type: r.type === 'Sinal' ? 'Sinal' : (r.type === 'Bônus' ? 'Bônus' : 'Parcela'),
      amount: Number(r.amount) || 0,
      expectedDate: r.expectedDate || normalized.date,
      effectiveDate: r.effectiveDate,
      accountId: r.accountId || fallbackAccountId,
      status: r.status === 'Recebido' ? 'Recebido' : 'Agendado',
      transactionId: r.transactionId
    }));
  } else {
    // Se não tem nem payments nem receipts, criar o primeiro pagamento previsto com base no totalCache
    if (totalCacheVal > 0) {
      normalized.payments = [
        {
          id: generateUUID(),
          type: 'Parcela',
          amount: totalCacheVal,
          expectedDate: normalized.date,
          accountId: fallbackAccountId,
          status: normalized.status === 'Realizado' ? 'Recebido' : 'Agendado'
        }
      ];
    } else {
      normalized.payments = [];
    }
  }

  // 6. Normalizar Despesas (expenseItems)
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
  } else if (normalized.expenses) {
    // Migrar expenses legadas
    const items: ShowExpenseItem[] = [];
    const exp = normalized.expenses;
    const expAcc = normalized.expenseAccountId || fallbackAccountId;

    if (Number(exp.fuel) > 0) {
      items.push({
        id: generateUUID(),
        category: 'Combustível',
        amount: Number(exp.fuel),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.fuel
      });
    }
    if (Number(exp.food) > 0) {
      items.push({
        id: generateUUID(),
        category: 'Alimentação',
        amount: Number(exp.food),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.food
      });
    }
    if (Number(exp.toll) > 0) {
      items.push({
        id: generateUUID(),
        category: 'Pedágio',
        amount: Number(exp.toll),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.toll
      });
    }
    if (Number(exp.commission) > 0) {
      items.push({
        id: generateUUID(),
        category: 'Comissão',
        amount: Number(exp.commission),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.commission
      });
    }
    if (Number(exp.others) > 0) {
      items.push({
        id: generateUUID(),
        category: 'Outros',
        amount: Number(exp.others),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.others
      });
    }

    normalized.expenseItems = items;
  } else {
    normalized.expenseItems = [];
  }

  return normalized;
}

/**
 * Calcula o resumo financeiro de um Show
 * Resiliente contra undefined, null, NaN e estruturas incompletas
 */
export function getShowFinancialSummary(show: Show | null | undefined): ShowFinancialSummary {
  if (!show) {
    return {
      totalContracted: 0,
      totalReceived: 0,
      totalPending: 0,
      totalExpenses: 0,
      netProfit: 0,
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
  
  let totalReceived = 0;
  let totalPending = 0;

  if (Array.isArray(show.payments) && show.payments.length > 0) {
    show.payments.forEach(p => {
      if (!p) return;
      const amt = Number(p.amount) || 0;
      if (p.status === 'Recebido') {
        totalReceived += amt;
      } else if (p.status === 'Agendado' || p.status === 'Previsto') {
        totalPending += amt;
      }
    });
  } else if (Array.isArray(show.receipts) && show.receipts.length > 0) {
    show.receipts.forEach(r => {
      if (!r) return;
      const amt = Number(r.amount) || 0;
      if (r.status === 'Recebido') {
        totalReceived += amt;
      } else {
        totalPending += amt;
      }
    });
  } else {
    if (show.status === 'Realizado') {
      totalReceived = totalContracted;
    } else {
      totalPending = totalContracted;
    }
  }

  let totalExpenses = 0;
  if (Array.isArray(show.expenseItems) && show.expenseItems.length > 0) {
    show.expenseItems.forEach(e => {
      if (!e) return;
      totalExpenses += Number(e.amount) || 0;
    });
  } else if (show.expenses) {
    totalExpenses = (Number(show.expenses.fuel) || 0) +
                    (Number(show.expenses.food) || 0) +
                    (Number(show.expenses.toll) || 0) +
                    (Number(show.expenses.commission) || 0) +
                    (Number(show.expenses.others) || 0);
  }

  // Lucro líquido = total recebido - total de despesas (conforme regra do usuário)
  const netProfit = totalReceived - totalExpenses;

  const scheduledTotal = totalReceived + totalPending;
  const rawRemaining = totalContracted - scheduledTotal;
  const remainingToSchedule = rawRemaining > 0 ? Math.round(rawRemaining * 100) / 100 : 0;
  const isOverTotal = scheduledTotal > (totalContracted + 0.01);
  const rawExcess = scheduledTotal - totalContracted;
  const excessAmount = rawExcess > 0 ? Math.round(rawExcess * 100) / 100 : 0;

  return {
    totalContracted: Math.round(totalContracted * 100) / 100,
    totalReceived: Math.round(totalReceived * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    remainingToSchedule: isNaN(remainingToSchedule) ? 0 : remainingToSchedule,
    isOverTotal: Boolean(isOverTotal),
    excessAmount: isNaN(excessAmount) ? 0 : excessAmount
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

function resolveExpenseCategoryId(categoryName: string, categories: Category[]): string {
  if (!categories || categories.length === 0) return 'cat_1';
  const lower = (categoryName || '').toLowerCase();
  
  if (lower.includes('combust')) {
    const found = categories.find(c => c.type === 'expense' && c.name.toLowerCase().includes('combust'));
    if (found) return found.id;
  }
  if (lower.includes('aliment') || lower.includes('lanche')) {
    const found = categories.find(c => c.type === 'expense' && (
      c.name.toLowerCase().includes('restauran') || 
      c.name.toLowerCase().includes('aliment') || 
      c.name.toLowerCase().includes('delivery')
    ));
    if (found) return found.id;
  }
  if (lower.includes('pedág') || lower.includes('estacion') || lower.includes('transp')) {
    const found = categories.find(c => c.type === 'expense' && (
      c.name.toLowerCase().includes('transp') || 
      c.name.toLowerCase().includes('taxa') || 
      c.name.toLowerCase().includes('imposto')
    ));
    if (found) return found.id;
  }

  // fallback para qualquer categoria de despesa compatível
  const anyExp = categories.find(c => c.type === 'expense');
  return anyExp ? anyExp.id : 'cat_1';
}

/**
 * Sincroniza um Show com a lista de movimentações financeiras sem criar duplicações.
 * Atualiza pagamentos e despesas mantendo vínculo bidirecional (showId, showPaymentId, showExpenseId).
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
  const showTitle = show.contractorName || show.name || 'Show';

  // 1. SINCRONIZAR PAGAMENTOS (RECEITAS)
  const currentPayments = Array.isArray(updatedShow.payments) ? updatedShow.payments : [];
  const validPaymentIds = new Set(currentPayments.map(p => p.id));

  const updatedPayments = currentPayments.map(payment => {
    const p = { ...payment };
    const isReceived = p.status === 'Recebido';
    const isCancelled = p.status === 'Cancelado';
    const txDate = (isReceived && p.effectiveDate) ? p.effectiveDate : (p.expectedDate || show.date);
    const txStatus = isReceived ? 'paid' : 'pending';
    const txDescription = `Show: ${showTitle} (${p.type || 'Parcela'})`;

    // Encontrar movimentação existente vinculada
    let existingTxIndex = txs.findIndex(t => 
      (p.transactionId && t.id === p.transactionId) ||
      (t.showPaymentId === p.id) ||
      (t.showId === show.id && t.showPaymentId === p.id)
    );

    if (isCancelled) {
      // Se cancelado, remove transação se ela estiver pendente
      if (existingTxIndex >= 0 && txs[existingTxIndex].status === 'pending') {
        txs = txs.filter((_, idx) => idx !== existingTxIndex);
        p.transactionId = undefined;
      }
      return p;
    }

    if (existingTxIndex >= 0) {
      // Atualizar transação existente
      const existingTx = txs[existingTxIndex];
      const updatedTx: Transaction = {
        ...existingTx,
        amount: Number(p.amount) || 0,
        date: txDate,
        status: txStatus as any,
        accountId: p.accountId,
        categoryId: existingTx.categoryId || incomeCatId,
        description: txDescription,
        showId: show.id,
        showPaymentId: p.id
      };
      txs[existingTxIndex] = updatedTx;
      p.transactionId = updatedTx.id;
    } else {
      // Criar nova movimentação
      const newTxId = p.transactionId || generateUUID();
      const newTx: Transaction = {
        id: newTxId,
        date: txDate,
        amount: Number(p.amount) || 0,
        type: 'income',
        categoryId: incomeCatId,
        description: txDescription,
        status: txStatus as any,
        createdAt: Date.now(),
        accountId: p.accountId,
        showId: show.id,
        showPaymentId: p.id
      };
      txs.push(newTx);
      p.transactionId = newTx.id;
    }

    return p;
  });

  updatedShow.payments = updatedPayments;

  // 2. SINCRONIZAR DESPESAS
  const currentExpenses = Array.isArray(updatedShow.expenseItems) ? updatedShow.expenseItems : [];
  const validExpenseIds = new Set(currentExpenses.map(e => e.id));

  const updatedExpenses = currentExpenses.map(expense => {
    const e = { ...expense };
    const expCatId = resolveExpenseCategoryId(e.category, categories);
    const txDescription = `Show: ${showTitle} - ${e.category}${e.notes ? ` (${e.notes})` : ''}`;

    let existingTxIndex = txs.findIndex(t => 
      (e.transactionId && t.id === e.transactionId) ||
      (t.showExpenseId === e.id) ||
      (t.showId === show.id && t.showExpenseId === e.id)
    );

    if (existingTxIndex >= 0) {
      // Atualizar transação existente
      const existingTx = txs[existingTxIndex];
      const updatedTx: Transaction = {
        ...existingTx,
        amount: Number(e.amount) || 0,
        date: e.date || show.date,
        status: 'paid',
        accountId: e.accountId,
        categoryId: existingTx.categoryId || expCatId,
        description: txDescription,
        showId: show.id,
        showExpenseId: e.id
      };
      txs[existingTxIndex] = updatedTx;
      e.transactionId = updatedTx.id;
    } else {
      // Criar nova movimentação de despesa
      const newTxId = e.transactionId || generateUUID();
      const newTx: Transaction = {
        id: newTxId,
        date: e.date || show.date,
        amount: Number(e.amount) || 0,
        type: 'expense',
        categoryId: expCatId,
        description: txDescription,
        status: 'paid',
        createdAt: Date.now(),
        accountId: e.accountId,
        showId: show.id,
        showExpenseId: e.id
      };
      txs.push(newTx);
      e.transactionId = newTx.id;
    }

    return e;
  });

  updatedShow.expenseItems = updatedExpenses;

  // 3. LIMPEZA DE TRANSAÇÕES ÓRFÃS DESTE SHOW
  // Se um pagamento ou despesa foi removido do show, remove a transação correspondente (desde que não seja um lançamento avulso)
  txs = txs.filter(t => {
    if (t.showId !== show.id) return true;
    if (t.showPaymentId && !validPaymentIds.has(t.showPaymentId)) return false;
    if (t.showExpenseId && !validExpenseIds.has(t.showExpenseId)) return false;
    return true;
  });

  return {
    updatedShow,
    updatedTransactions: txs
  };
}

/**
 * Cancela/remove apenas receitas futuras agendadas de um show cancelado, preservando o que já foi recebido.
 */
export function cancelShowFutureTransactions(
  showId: string,
  transactions: Transaction[]
): Transaction[] {
  if (!transactions) return [];
  return transactions.filter(t => {
    // Se for deste show e estiver pendente/agendada, remove da projeção futura
    if (t.showId === showId && t.status === 'pending') {
      return false;
    }
    return true;
  });
}
