import { Transaction, Account, ScopeType } from '../types';

export type AccountVinculo = 'PESSOAL' | 'MUSICO' | 'NEUTRO';

/**
 * Helper para interpretar valores inseridos com padrão brasileiro ou internacional.
 * Ex: "1.250,50" -> 1250.50
 * Ex: "1,250.50" -> 1250.50
 * Ex: "500" -> 500
 */
export const parseCurrencyInput = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const str = String(value).trim();
  if (!str) return 0;

  // Se contiver ambos vírgula e ponto:
  // Ex: 1.250,50 (PT-BR) vs 1,250.50 (US)
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Padrão PT-BR: 1.250,50 -> remove pontos, substitui vírgula por ponto
      const clean = str.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    } else {
      // Padrão US: 1,250.50 -> remove vírgulas
      const clean = str.replace(/,/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : parsed;
    }
  }

  // Se contiver apenas vírgula (ex: 1250,50)
  if (str.includes(',')) {
    const clean = str.replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Apenas números ou ponto simples (ex: 1250.50)
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Normaliza e obtém o vínculo ('PESSOAL' | 'MUSICO' | 'NEUTRO') de uma conta
 */
export const getAccountVinculo = (acc: Account): AccountVinculo => {
  if (acc.vinculo) return acc.vinculo;
  if (acc.scope === 'BUSINESS') return 'MUSICO';
  if (acc.scope === 'PERSONAL') return 'PESSOAL';
  return 'NEUTRO';
};

/**
 * Converte vínculo para ScopeType
 */
export const vinculoToScope = (vinculo: AccountVinculo): ScopeType => {
  if (vinculo === 'MUSICO') return 'BUSINESS';
  if (vinculo === 'PESSOAL') return 'PERSONAL';
  return 'BOTH';
};

/**
 * Métricas do Mês para Carreira Artística / Empresa (Regime de Caixa Estrito - Apenas Transações Efetivadas)
 */
export const getMonthlyCareerMetrics = (
  transactions: Transaction[],
  monthStr: string
) => {
  const monthPrefix = monthStr.slice(0, 7);

  // 1. Receitas Efetivas (Regime de Caixa: status === 'paid' no mês selecionado)
  const incomeTxs = transactions.filter(t => {
    if (!t.date || !t.date.startsWith(monthPrefix)) return false;
    if (t.type !== 'income' || t.status !== 'paid') return false;

    const desc = (t.description || '').toLowerCase();
    if (desc.includes('recebimento de pró-labore') || desc.includes('recebimento de pro-labore')) return false;

    return (
      t.scope === 'BUSINESS' ||
      t.categoryId === 'cat_33' ||
      !!t.showId ||
      desc.includes('cachê') ||
      desc.includes('cache') ||
      desc.includes('show')
    );
  });

  // Desconsidera transações duplicadas de base para o mesmo showId
  const seenShowBaseIds = new Set<string>();
  const deduplicatedIncomeTxs = incomeTxs.filter(t => {
    if (!t.showId) return true;
    const desc = (t.description || '').toLowerCase();
    const isExtra = t.showPaymentType === 'Extra' || t.showPaymentType === 'Bônus' || desc.includes('hora extra') || desc.includes('gorjeta');
    if (isExtra) return true;
    if (seenShowBaseIds.has(t.showId)) return false;
    seenShowBaseIds.add(t.showId);
    return true;
  });

  const faturamentoReal = deduplicatedIncomeTxs.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  // 2. Despesas Efetivas (Regime de Caixa)
  const expenseTxs = transactions.filter(t => {
    if (!t.date || !t.date.startsWith(monthPrefix)) return false;
    if (t.type !== 'expense' || t.status !== 'paid') return false;

    const desc = (t.description || '').toLowerCase();
    if (desc.includes('retirada de pró-labore') || desc.includes('retirada de pro-labore')) return false;

    return (
      t.scope === 'BUSINESS' ||
      t.categoryId === 'cat_equipamentos' ||
      t.categoryId === 'cat_producao_shows' ||
      !!t.showId ||
      !!t.showExpenseId ||
      desc.includes('equipamento') ||
      desc.includes('músico') ||
      desc.includes('musico') ||
      desc.includes('ensaio') ||
      desc.includes('logística') ||
      desc.includes('logistica')
    );
  });

  const custosReais = expenseTxs.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const lucroLiquido = faturamentoReal - custosReais;
  const margemLucro = faturamentoReal > 0 ? (lucroLiquido / faturamentoReal) * 100 : 0;

  return {
    faturamentoReal: Math.round(faturamentoReal * 100) / 100,
    custosReais: Math.round(custosReais * 100) / 100,
    lucroLiquido: Math.round(lucroLiquido * 100) / 100,
    margemLucro: Math.round(margemLucro * 10) / 10,
    incomeCount: incomeTxs.length,
    expenseCount: expenseTxs.length
  };
};
