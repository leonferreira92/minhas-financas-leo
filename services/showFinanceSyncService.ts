import { Show, ShowPayment, ShowExpenseItem, Transaction, Category, Account } from '../types';

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
 * Converte dados legados de um Show (receipts e expenses) para o formato moderno de payments e expenseItems
 */
export function normalizeShowFinancials(show: Show, fallbackAccountId: string): Show {
  const normalized: Show = { ...show };

  // Migrar receipts legados para payments se payments estiver vazio
  if ((!normalized.payments || normalized.payments.length === 0) && normalized.receipts && normalized.receipts.length > 0) {
    normalized.payments = normalized.receipts.map(r => ({
      id: r.id,
      type: r.type === 'Sinal' ? 'Sinal' : 'Parcela',
      amount: Number(r.amount) || 0,
      expectedDate: r.expectedDate || show.date,
      effectiveDate: r.effectiveDate,
      accountId: r.accountId || fallbackAccountId,
      status: r.status === 'Recebido' ? 'Recebido' : 'Agendado',
      transactionId: r.transactionId
    }));
  }

  // Se não tem nem payments nem receipts, criar o primeiro pagamento previsto baseado no cachê total
  if (!normalized.payments || normalized.payments.length === 0) {
    if (normalized.totalCache > 0) {
      normalized.payments = [
        {
          id: crypto.randomUUID(),
          type: 'Parcela',
          amount: Number(normalized.totalCache),
          expectedDate: normalized.date,
          accountId: fallbackAccountId,
          status: normalized.status === 'Realizado' ? 'Recebido' : 'Agendado'
        }
      ];
    } else {
      normalized.payments = [];
    }
  }

  // Migrar expenses legadas se expenseItems estiver vazio
  if ((!normalized.expenseItems || normalized.expenseItems.length === 0) && normalized.expenses) {
    const items: ShowExpenseItem[] = [];
    const exp = normalized.expenses;
    const expAcc = normalized.expenseAccountId || fallbackAccountId;

    if (Number(exp.fuel) > 0) {
      items.push({
        id: crypto.randomUUID(),
        category: 'Combustível',
        amount: Number(exp.fuel),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.fuel
      });
    }
    if (Number(exp.food) > 0) {
      items.push({
        id: crypto.randomUUID(),
        category: 'Alimentação',
        amount: Number(exp.food),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.food
      });
    }
    if (Number(exp.toll) > 0) {
      items.push({
        id: crypto.randomUUID(),
        category: 'Pedágio',
        amount: Number(exp.toll),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.toll
      });
    }
    if (Number(exp.commission) > 0) {
      items.push({
        id: crypto.randomUUID(),
        category: 'Comissão',
        amount: Number(exp.commission),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.commission
      });
    }
    if (Number(exp.others) > 0) {
      items.push({
        id: crypto.randomUUID(),
        category: 'Outros',
        amount: Number(exp.others),
        date: normalized.date,
        accountId: expAcc,
        transactionId: normalized.expenseTransactionIds?.others
      });
    }

    normalized.expenseItems = items;
  }

  if (!normalized.expenseItems) {
    normalized.expenseItems = [];
  }

  return normalized;
}

/**
 * Calcula o resumo financeiro de um Show
 */
export function getShowFinancialSummary(show: Show): ShowFinancialSummary {
  const totalContracted = Number(show.totalCache) || 0;
  
  let totalReceived = 0;
  let totalPending = 0;

  if (show.payments && show.payments.length > 0) {
    show.payments.forEach(p => {
      if (p.status === 'Recebido') {
        totalReceived += Number(p.amount) || 0;
      } else if (p.status === 'Agendado' || p.status === 'Previsto') {
        totalPending += Number(p.amount) || 0;
      }
    });
  } else if (show.receipts && show.receipts.length > 0) {
    show.receipts.forEach(r => {
      if (r.status === 'Recebido') {
        totalReceived += Number(r.amount) || 0;
      } else {
        totalPending += Number(r.amount) || 0;
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
  if (show.expenseItems && show.expenseItems.length > 0) {
    show.expenseItems.forEach(e => {
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
  const remainingToSchedule = Math.max(0, parseFloat((totalContracted - scheduledTotal).toFixed(2)));
  const isOverTotal = scheduledTotal > totalContracted + 0.01;
  const excessAmount = Math.max(0, parseFloat((scheduledTotal - totalContracted).toFixed(2)));

  return {
    totalContracted: parseFloat(totalContracted.toFixed(2)),
    totalReceived: parseFloat(totalReceived.toFixed(2)),
    totalPending: parseFloat(totalPending.toFixed(2)),
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    remainingToSchedule,
    isOverTotal,
    excessAmount
  };
}

/**
 * Localiza ou determina a categoria apropriada para receita e despesas de show
 */
function resolveIncomeCategoryId(categories: Category[]): string {
  const showCat = categories.find(c => c.id === 'cat_33' || (c.type === 'income' && (c.name.toLowerCase().includes('show') || c.name.toLowerCase().includes('cachê') || c.name.toLowerCase().includes('cache'))));
  if (showCat) return showCat.id;
  const anyIncome = categories.find(c => c.type === 'income');
  return anyIncome ? anyIncome.id : 'cat_33';
}

function resolveExpenseCategoryId(categoryName: string, categories: Category[]): string {
  const lower = categoryName.toLowerCase();
  
  if (lower.includes('combust')) {
    const found = categories.find(c => c.type === 'expense' && c.name.toLowerCase().includes('combust'));
    if (found) return found.id;
  }
  if (lower.includes('aliment') || lower.includes('lanche')) {
    const found = categories.find(c => c.type === 'expense' && (c.name.toLowerCase().includes('restauran') || c.name.toLowerCase().includes('aliment') || c.name.toLowerCase().includes('delivery')));
    if (found) return found.id;
  }
  if (lower.includes('pedág') || lower.includes('estacion') || lower.includes('transp')) {
    const found = categories.find(c => c.type === 'expense' && (c.name.toLowerCase().includes('transp') || c.name.toLowerCase().includes('taxa') || c.name.toLowerCase().includes('imposto')));
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
  let txs = [...existingTransactions];

  const incomeCatId = resolveIncomeCategoryId(categories);
  const showTitle = show.contractorName || show.name || 'Show';

  // 1. SINCRONIZAR PAGAMENTOS (RECEITAS)
  const currentPayments = updatedShow.payments || [];
  const validPaymentIds = new Set(currentPayments.map(p => p.id));

  const updatedPayments = currentPayments.map(payment => {
    const p = { ...payment };
    const isReceived = p.status === 'Recebido';
    const isCancelled = p.status === 'Cancelado';
    const txDate = (isReceived && p.effectiveDate) ? p.effectiveDate : p.expectedDate;
    const txStatus = isReceived ? 'paid' : 'pending';
    const txDescription = `Show: ${showTitle} (${p.type})`;

    // Encontrar movimentação existente
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
      const newTxId = p.transactionId || crypto.randomUUID();
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
  const currentExpenses = updatedShow.expenseItems || [];
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
        date: e.date,
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
      const newTxId = e.transactionId || crypto.randomUUID();
      const newTx: Transaction = {
        id: newTxId,
        date: e.date,
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
  return transactions.filter(t => {
    // Se for deste show e estiver pendente/agendada, remove da projeção futura
    if (t.showId === showId && t.status === 'pending') {
      return false;
    }
    return true;
  });
}
