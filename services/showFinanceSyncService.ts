import { Show, ShowPayment, ShowExpenseItem, Transaction, Category } from '../types';
import { generateUUID } from './uuidHelper';

export interface ShowFinancialSummary {
  totalContracted: number;     // Valor contratado (cachê base)
  extraAmount: number;         // Valor de extras adicionados
  totalPredicted: number;      // Valor total previsto = Valor contratado + Extras
  baseCacheReceived: number;   // Total recebido do cachê base (Sinais + Quitações)
  extraReceived: number;       // Total recebido de Horas Extras, Gorjetas e Adicionais
  totalReceived: number;       // Total geral recebido = baseCacheReceived + extraReceived
  totalPending: number;        // Saldo restante do cachê base = Math.max(0, totalContracted - baseCacheReceived)
  percentReceived: number;     // % quitada do cachê base (0 a 100%)
  totalScheduled: number;      // Total agendado em parcelas pendentes
  totalExpenses: number;       // Total de despesas registradas
  netProfit: number;           // Lucro líquido = Total recebido - Total de despesas
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
      extraAmount: 0,
      totalPredicted: 0,
      baseCacheReceived: 0,
      extraReceived: 0,
      totalReceived: 0,
      totalPending: 0,
      percentReceived: 0,
      totalScheduled: 0,
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

  let baseCacheReceived = 0;
  let extraReceived = 0;
  let totalScheduled = 0;

  // 1. Apuração dinâmica de receitas das transações do Financeiro vinculadas ao show
  if (transactions && transactions.length > 0) {
    const linkedIncomeTxs = transactions.filter(t => 
      t.showId === show.id && 
      t.type === 'income' && 
      t.status === 'paid'
    );
    
    linkedIncomeTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      const desc = (t.description || '').toLowerCase();
      const isExtra = t.showPaymentType === 'Extra' || t.showPaymentType === 'Bônus' || 
                      desc.includes('hora extra') || desc.includes('gorjeta') || desc.includes('adicional');
      
      if (isExtra) {
        extraReceived += amt;
      } else {
        baseCacheReceived += amt;
      }
    });

    const linkedTxIds = new Set(linkedIncomeTxs.map(t => t.id));

    // Pagamentos cadastrados no show que ainda não têm transação no extrato
    if (Array.isArray(show.payments)) {
      show.payments.forEach(p => {
        if (!p) return;
        const amt = Number(p.amount) || 0;
        const isExtra = p.type === 'Extra' || p.type === 'Bônus';

        if (p.status === 'Recebido') {
          if (!p.transactionId || !linkedTxIds.has(p.transactionId)) {
            if (!p.transactionId) {
              if (isExtra) {
                extraReceived += amt;
              } else {
                baseCacheReceived += amt;
              }
            }
          }
        } else if (p.status === 'Agendado' || p.status === 'Previsto') {
          totalScheduled += amt;
        }
      });
    }
  } else {
    // Fallback se transactions não for passado
    if (Array.isArray(show.payments) && show.payments.length > 0) {
      show.payments.forEach(p => {
        if (!p) return;
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
    } else if (Array.isArray(show.receipts) && show.receipts.length > 0) {
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
    }
  }

  const extraAmount = Math.max(Number(show.extraAmount) || 0, extraReceived);
  const totalPredicted = Math.round((totalContracted + extraAmount) * 100) / 100;
  const totalReceived = Math.round((baseCacheReceived + extraReceived) * 100) / 100;

  // Saldo restante do cachê base: Math.max(0, totalContracted - baseCacheReceived)
  const totalPending = Math.max(0, Math.round((totalContracted - baseCacheReceived) * 100) / 100);

  // Porcentagem quitada do cachê base (NÃO estoura 100%)
  const percentReceived = totalContracted > 0 
    ? Math.min(100, Math.round((baseCacheReceived / totalContracted) * 100))
    : 100;

  // Despesas dinâmicas
  let totalExpenses = 0;
  if (transactions && transactions.length > 0) {
    const linkedExpenseTxs = transactions.filter(t => 
      t.showId === show.id && 
      t.type === 'expense' && 
      t.status === 'paid'
    );
    const txExpenseSum = linkedExpenseTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const linkedExpenseTxIds = new Set(linkedExpenseTxs.map(t => t.id));

    let manualExpenseSum = 0;
    if (Array.isArray(show.expenseItems)) {
      show.expenseItems.forEach(e => {
        if (!e) return;
        if (!e.transactionId || !linkedExpenseTxIds.has(e.transactionId)) {
          if (!e.transactionId) {
            manualExpenseSum += Number(e.amount) || 0;
          }
        }
      });
    }
    totalExpenses = txExpenseSum + manualExpenseSum;
  } else {
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
  }

  // Lucro líquido = Total recebido - Total de despesas
  const netProfit = Math.round((totalReceived - totalExpenses) * 100) / 100;

  const totalPaymentsSum = totalReceived + totalScheduled;
  const rawRemaining = totalPredicted - totalPaymentsSum;
  const remainingToSchedule = rawRemaining > 0 ? Math.round(rawRemaining * 100) / 100 : 0;
  const isOverTotal = baseCacheReceived > (totalContracted + 0.01);
  const excessAmount = Math.max(0, Math.round((baseCacheReceived - totalContracted) * 100) / 100);

  return {
    totalContracted: Math.round(totalContracted * 100) / 100,
    extraAmount: Math.round(extraAmount * 100) / 100,
    totalPredicted: Math.round(totalPredicted * 100) / 100,
    baseCacheReceived: Math.round(baseCacheReceived * 100) / 100,
    extraReceived: Math.round(extraReceived * 100) / 100,
    totalReceived: Math.round(totalReceived * 100) / 100,
    totalPending: Math.round(totalPending * 100) / 100,
    percentReceived,
    totalScheduled: Math.round(totalScheduled * 100) / 100,
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

/**
 * Sincroniza um Show com a lista de movimentações financeiras sem criar duplicações.
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

  const updatedPayments = currentPayments.map(payment => {
    const p = { ...payment };
    const isReceived = p.status === 'Recebido';
    const txDate = (isReceived && p.effectiveDate) ? p.effectiveDate : (p.expectedDate || show.date);
    const txStatus = isReceived ? 'paid' : 'pending';
    const txDescription = `Show: ${showTitle} (${p.type || 'Parcela'})`;

    if (p.transactionId) {
      const txIndex = txs.findIndex(t => t.id === p.transactionId);
      if (txIndex >= 0) {
        txs[txIndex] = {
          ...txs[txIndex],
          amount: p.amount,
          date: txDate,
          accountId: p.accountId,
          status: txStatus,
          description: txDescription,
          showId: show.id,
          showPaymentType: p.type,
          scope: 'BUSINESS',
          categoryId: incomeCatId
        };
      }
    }

    return p;
  });

  updatedShow.payments = updatedPayments;

  return {
    updatedShow,
    updatedTransactions: txs
  };
}

export function cancelShowFutureTransactions(showId: string, transactions: Transaction[]): Transaction[] {
  return transactions.map(t => {
    if (t.showId === showId && t.status === 'pending') {
      return {
        ...t,
        description: `[CANCELADO] ${t.description}`
      };
    }
    return t;
  });
}
