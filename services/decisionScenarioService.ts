import { Transaction, Category } from '../types';

const formatBRL = (val: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(Number(val) || 0)
    .replace(/\u00a0|\u202f/g, ' ');

/** Mantém acentos; só limpa lixo que quebra ao colar. */
const sanitize = (text: string): string =>
  String(text || '')
    .normalize('NFC')
    .replace(/\u00a0|\u202f|\u2007|\u2060|\uFEFF/g, ' ')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u00D7/g, 'x')
    .replace(/\u2265/g, '>=');

const formatMonthYearBR = (yearMonthStr: string): string => {
  try {
    const [y, m] = yearMonthStr.split('-');
    if (!y || !m) return yearMonthStr;
    const date = new Date(Number(y), Number(m) - 1, 15);
    const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
    return sanitize(`${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${y}`);
  } catch {
    return yearMonthStr;
  }
};

/**
 * Cenarios de decisao para o relatorio de IA.
 * Extensivel: adicione novos tipos na uniao sem quebrar os existentes.
 */
export type DecisionScenarioType = 'rent_replace' | 'new_fixed_cost' | 'one_time_purchase' | 'new_installment';

export interface RentReplaceScenario {
  type: 'rent_replace';
  newRentAmount: number;
  currentRentAmount: number;
  startMonth: string;
  label?: string;
}

export interface NewFixedCostScenario {
  type: 'new_fixed_cost';
  amount: number;
  startMonth: string;
  label?: string;
}

export interface OneTimePurchaseScenario {
  type: 'one_time_purchase';
  amount: number;
  startMonth: string;
  label?: string;
}

export interface NewInstallmentScenario {
  type: 'new_installment';
  installmentAmount: number;
  installmentCount: number;
  startMonth: string;
  label?: string;
}

export type DecisionScenario =
  | RentReplaceScenario
  | NewFixedCostScenario
  | OneTimePurchaseScenario
  | NewInstallmentScenario;

export const DECISION_SCENARIO_OPTIONS: Array<{
  id: DecisionScenarioType;
  label: string;
  description: string;
  available: boolean;
}> = [
  {
    id: 'rent_replace',
    label: 'Novo aluguel (substitui o atual)',
    description: 'Simula mudança de moradia trocando o aluguel atual pelo novo valor.',
    available: true
  },
  {
    id: 'new_fixed_cost',
    label: 'Novo custo fixo mensal',
    description: 'Assinatura, academia, creche ou qualquer gasto mensal novo.',
    available: true
  },
  {
    id: 'one_time_purchase',
    label: 'Compra à vista',
    description: 'Simula um gasto único no mês escolhido e o efeito no caixa.',
    available: true
  },
  {
    id: 'new_installment',
    label: 'Nova parcela mensal',
    description: 'Simula parcelamento (ex.: 10x de R$ 200) no horizonte do relatório.',
    available: true
  }
];

const monthIndex = (ym: string): number => {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return 0;
  return y * 12 + (m - 1);
};

const monthsBetween = (fromYm: string, toYm: string): number =>
  monthIndex(toYm) - monthIndex(fromYm);

/** Delta do cenário em um mês (valores positivos = mais saída). */
export const getScenarioMonthDeltas = (
  scenario: DecisionScenario,
  monthStr: string
): { essential: number; debt: number; other: number; total: number } => {
  const zero = { essential: 0, debt: 0, other: 0, total: 0 };

  if (scenario.type === 'rent_replace') {
    if (monthStr < scenario.startMonth) return zero;
    const essential = Number(
      (scenario.newRentAmount - scenario.currentRentAmount).toFixed(2)
    );
    return { essential, debt: 0, other: 0, total: essential };
  }

  if (scenario.type === 'new_fixed_cost') {
    if (monthStr < scenario.startMonth) return zero;
    const other = Number((scenario.amount || 0).toFixed(2));
    return { essential: 0, debt: 0, other, total: other };
  }

  if (scenario.type === 'one_time_purchase') {
    if (monthStr !== scenario.startMonth) return zero;
    const other = Number((scenario.amount || 0).toFixed(2));
    return { essential: 0, debt: 0, other, total: other };
  }

  if (scenario.type === 'new_installment') {
    if (monthStr < scenario.startMonth) return zero;
    const idx = monthsBetween(scenario.startMonth, monthStr);
    const count = Math.max(1, Math.floor(Number(scenario.installmentCount) || 1));
    if (idx < 0 || idx >= count) return zero;
    const debt = Number((scenario.installmentAmount || 0).toFixed(2));
    return { essential: 0, debt, other: 0, total: debt };
  }

  return zero;
};

export interface MonthlyFlowLike {
  monthStr: string;
  monthLabel: string;
  guaranteedIncomes: number;
  extraordinaryIncomes: number;
  showIncomes: number;
  recurringIncomes: number;
  essentialExpenses: number;
  debtInstallments: number;
  otherObligations: number;
  totalOutflows: number;
  netResult: number;
  projectedEndBalance: number;
}

export interface ScenarioMonthRow extends MonthlyFlowLike {
  scenarioDelta: number;
}

export interface ScenarioSimulationResult {
  scenario: DecisionScenario;
  netMonthlyImpact: number;
  rows: ScenarioMonthRow[];
  finalBalance: number;
  minBalance: number;
  firstNegativeMonth: string | null;
  monthsStillPositive: number;
  monthsInHorizon: number;
  verdict: 'comfortable' | 'tight' | 'unsafe';
  verdictLabel: string;
  verdictTip: string;
}

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const looksLikeRentExpense = (t: Transaction, categories: Category[]): boolean => {
  if (t.type !== 'expense' || t.status === 'cancelled') return false;
  if (t.categoryId === 'cat_2') return true;
  const cat = categories.find(c => c.id === t.categoryId);
  const blob = normalize(`${t.description || ''} ${cat?.name || ''}`);
  return (
    blob.includes('aluguel') ||
    blob.includes('alugue') ||
    blob.includes('condominio') ||
    blob.includes('moradia') ||
    blob.includes('habitacao')
  );
};

export const detectCurrentMonthlyRent = (
  transactions: Transaction[],
  categories: Category[],
  referenceMonthPrefix?: string
): { amount: number; source: string; samples: number } => {
  const now = new Date();
  const ref =
    referenceMonthPrefix ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const months: string[] = [];
  const [ry, rm] = ref.split('-').map(Number);
  for (let i = 0; i < 4; i++) {
    const d = new Date(ry, rm - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const byMonth = new Map<string, number>();
  transactions.forEach(t => {
    if (!t.date || !looksLikeRentExpense(t, categories)) return;
    if (t.status === 'cancelled') return;
    const m = t.date.slice(0, 7);
    if (!months.includes(m)) return;
    byMonth.set(m, (byMonth.get(m) || 0) + Math.abs(Number(t.amount) || 0));
  });

  const values = Array.from(byMonth.values()).filter(v => v > 0);
  if (values.length === 0) {
    return { amount: 0, source: 'não detectado nos lançamentos', samples: 0 };
  }

  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];

  const refVal = byMonth.get(ref);
  const amount = Number(((refVal && refVal > 0 ? refVal : median)).toFixed(2));

  return {
    amount,
    source:
      refVal && refVal > 0
        ? `lançamentos de ${formatMonthYearBR(ref)}`
        : `mediana de ${values.length} mês(es)`,
    samples: values.length
  };
};

/** Impacto “típico” mensal para cards da UI (compra à vista = valor único). */
export const getScenarioNetMonthlyImpact = (scenario: DecisionScenario): number => {
  if (scenario.type === 'rent_replace') {
    return Number((scenario.newRentAmount - scenario.currentRentAmount).toFixed(2));
  }
  if (scenario.type === 'new_fixed_cost') {
    return Number((scenario.amount || 0).toFixed(2));
  }
  if (scenario.type === 'one_time_purchase') {
    return Number((scenario.amount || 0).toFixed(2));
  }
  if (scenario.type === 'new_installment') {
    return Number((scenario.installmentAmount || 0).toFixed(2));
  }
  return 0;
};

export const simulateDecisionScenario = (
  baselineRows: MonthlyFlowLike[],
  startingCash: number,
  scenario: DecisionScenario
): ScenarioSimulationResult => {
  const netMonthlyImpact = getScenarioNetMonthlyImpact(scenario);
  let running = startingCash;

  const rows: ScenarioMonthRow[] = baselineRows.map(row => {
    const deltas = getScenarioMonthDeltas(scenario, row.monthStr);
    const essentialExpenses = Number((row.essentialExpenses + deltas.essential).toFixed(2));
    const debtInstallments = Number((row.debtInstallments + deltas.debt).toFixed(2));
    const otherObligations = Number((row.otherObligations + deltas.other).toFixed(2));
    const totalOutflows = Number(
      (essentialExpenses + debtInstallments + otherObligations).toFixed(2)
    );
    const netResult = Number((row.guaranteedIncomes - totalOutflows).toFixed(2));
    running = Number((running + netResult).toFixed(2));

    return {
      ...row,
      essentialExpenses,
      debtInstallments,
      otherObligations,
      totalOutflows,
      netResult,
      projectedEndBalance: running,
      scenarioDelta: deltas.total
    };
  });

  const finalBalance = rows[rows.length - 1]?.projectedEndBalance ?? startingCash;
  const minBalance = rows.length > 0 ? Math.min(...rows.map(r => r.projectedEndBalance)) : startingCash;
  const firstNeg = rows.find(r => r.projectedEndBalance < 0);
  const monthsStillPositive = rows.filter(r => r.projectedEndBalance >= 0).length;

  let verdict: ScenarioSimulationResult['verdict'] = 'comfortable';
  let verdictLabel = 'Cabe no bolso';
  let verdictTip = 'No horizonte simulado, o caixa fecha positivo com este cenário.';

  if (firstNeg) {
    verdict = 'unsafe';
    verdictLabel = 'Aperta / risco';
    verdictTip = `Com o cenário, o saldo projetado fica negativo a partir de ${sanitize(firstNeg.monthLabel)}.`;
  } else if (
    minBalance < 200 ||
    (netMonthlyImpact > 0 && minBalance < Math.max(200, startingCash * 0.15))
  ) {
    verdict = 'tight';
    verdictLabel = 'No limite';
    verdictTip = 'Não zera o caixa, mas a folga fica pequena — evite novos gastos extras.';
  }

  return {
    scenario,
    netMonthlyImpact,
    rows,
    finalBalance: Number(finalBalance.toFixed(2)),
    minBalance: Number(minBalance.toFixed(2)),
    firstNegativeMonth: firstNeg ? sanitize(firstNeg.monthLabel) : null,
    monthsStillPositive,
    monthsInHorizon: rows.length,
    verdict,
    verdictLabel,
    verdictTip
  };
};

export const formatScenarioReportSection = (
  baselineRows: MonthlyFlowLike[],
  sim: ScenarioSimulationResult
): string => {
  const lines: string[] = [];
  const s = sim.scenario;

  lines.push('============================================================');
  lines.push('8. CENÁRIO DE DECISÃO (SIMULAÇÃO)');
  lines.push('============================================================');

  if (s.type === 'rent_replace') {
    lines.push('Tipo: NOVO ALUGUEL SUBSTITUINDO O ATUAL');
    lines.push(`- Aluguel atual: ${formatBRL(s.currentRentAmount)}`);
    lines.push(`- Novo aluguel: ${formatBRL(s.newRentAmount)}`);
    lines.push(
      `- Impacto líquido mensal: ${sim.netMonthlyImpact >= 0 ? '+' : ''}${formatBRL(sim.netMonthlyImpact)}`
    );
    lines.push(`- Início do novo aluguel: ${formatMonthYearBR(s.startMonth)}`);
    lines.push(
      '- Regra: a partir do mês de início, o fluxo aplica o delta (novo - atual) sobre as essenciais.'
    );
  } else if (s.type === 'new_fixed_cost') {
    lines.push('Tipo: NOVO CUSTO FIXO MENSAL');
    lines.push(`- Valor mensal: ${formatBRL(s.amount)}`);
    lines.push(`- Início: ${formatMonthYearBR(s.startMonth)}`);
    lines.push('- Regra: a partir do mês de início, soma o valor em "outras obrigações" todo mês.');
  } else if (s.type === 'one_time_purchase') {
    lines.push('Tipo: COMPRA À VISTA (GASTO ÚNICO)');
    lines.push(`- Valor da compra: ${formatBRL(s.amount)}`);
    lines.push(`- Mês da compra: ${formatMonthYearBR(s.startMonth)}`);
    lines.push('- Regra: o valor sai do caixa apenas no mês escolhido.');
  } else if (s.type === 'new_installment') {
    lines.push('Tipo: NOVA PARCELA MENSAL');
    lines.push(`- Parcela: ${formatBRL(s.installmentAmount)}`);
    lines.push(`- Quantidade: ${s.installmentCount}x`);
    lines.push(
      `- Total financiado (aprox.): ${formatBRL(s.installmentAmount * s.installmentCount)}`
    );
    lines.push(`- Início: ${formatMonthYearBR(s.startMonth)}`);
    lines.push('- Regra: soma a parcela em dívidas/parcelas enquanto houver parcelas no horizonte.');
  }

  lines.push('');
  lines.push('COMPARAÇÃO DO FLUXO (SEM CENÁRIO x COM CENÁRIO):');
  lines.push('Mês             | Saldo SEM cenário | Saldo COM cenário | Delta do mês | Saídas COM');
  lines.push('----------------|-------------------|-------------------|--------------|---------------');

  baselineRows.forEach((base, idx) => {
    const withSc = sim.rows[idx];
    if (!withSc) return;
    const m = sanitize(base.monthLabel).slice(0, 15).padEnd(15);
    const sem = formatBRL(base.projectedEndBalance).padStart(17);
    const com = formatBRL(withSc.projectedEndBalance).padStart(17);
    const delta = `${withSc.scenarioDelta >= 0 ? '+' : ''}${formatBRL(withSc.scenarioDelta)}`.padStart(12);
    const out = formatBRL(withSc.totalOutflows).padStart(13);
    lines.push(`${m} | ${sem} | ${com} | ${delta} | ${out}`);
  });

  lines.push('');
  lines.push('RESULTADO DA SIMULAÇÃO:');
  lines.push(
    `- Saldo final SEM cenário: ${formatBRL(baselineRows[baselineRows.length - 1]?.projectedEndBalance ?? 0)}`
  );
  lines.push(`- Saldo final COM cenário: ${formatBRL(sim.finalBalance)}`);
  lines.push(`- Menor saldo COM cenário: ${formatBRL(sim.minBalance)}`);
  lines.push(
    `- Meses no azul COM cenário: ${sim.monthsStillPositive} de ${sim.monthsInHorizon}`
  );
  if (sim.firstNegativeMonth) {
    lines.push(`- Primeiro mês negativo COM cenário: ${sim.firstNegativeMonth}`);
  } else {
    lines.push('- Primeiro mês negativo COM cenário: nenhum no horizonte');
  }
  lines.push(`- Veredito do app: ${sanitize(sim.verdictLabel).toUpperCase()} - ${sanitize(sim.verdictTip)}`);

  lines.push('');
  lines.push('ORIENTAÇÃO DIRETA PARA A IA (CENÁRIO):');
  lines.push(
    'Use SOMENTE os números deste relatório. Compare o fluxo SEM e COM o cenário. Responda em português simples:'
  );
  lines.push('1) Essa decisão me aperta financeiramente? (sim/não/parcial, com motivo)');
  lines.push('2) Até qual mês consigo pagar sem problemas (saldo projetado >= 0)?');
  lines.push('3) Qual o impacto real no caixa e o que muda no custo de vida?');
  lines.push('4) Se apertar: 2-3 cortes concretos ou adiamentos, sem inventar receitas.');
  lines.push('5) Dê um plano curto: pode fazer agora / espere X meses / só se cortar Y.');

  return sanitize(lines.join('\n'));
};

export const buildScenarioAiPrompt = (sim: ScenarioSimulationResult): string => {
  const s = sim.scenario;
  const commonTail = [
    '',
    'Responda de forma direta e prática:',
    '1) Essa decisão me aperta?',
    '2) Até que mês consigo pagar sem problemas?',
    '3) O que eu deveria cortar ou adiar se quiser aguentar o horizonte do relatório?',
    '4) Conclusão em uma frase: posso fazer agora, esperar, ou só com ajustes.',
    '',
    'Não invente valores que não estejam no relatório.'
  ];

  if (s.type === 'rent_replace') {
    return sanitize(
      [
        'Analise o relatório financeiro abaixo, com ênfase na seção 8 (CENÁRIO DE DECISÃO).',
        '',
        `Estou avaliando me mudar. Meu aluguel atual é ${formatBRL(s.currentRentAmount)} e o novo seria ${formatBRL(s.newRentAmount)} a partir de ${formatMonthYearBR(s.startMonth)} (impacto líquido ${sim.netMonthlyImpact >= 0 ? '+' : ''}${formatBRL(sim.netMonthlyImpact)}/mês).`,
        ...commonTail
      ].join('\n')
    );
  }

  if (s.type === 'new_fixed_cost') {
    return sanitize(
      [
        'Analise o relatório financeiro abaixo, com ênfase na seção 8 (CENÁRIO DE DECISÃO).',
        '',
        `Estou avaliando assumir um novo custo fixo de ${formatBRL(s.amount)}/mês a partir de ${formatMonthYearBR(s.startMonth)}.`,
        ...commonTail
      ].join('\n')
    );
  }

  if (s.type === 'one_time_purchase') {
    return sanitize(
      [
        'Analise o relatório financeiro abaixo, com ênfase na seção 8 (CENÁRIO DE DECISÃO).',
        '',
        `Estou avaliando uma compra à vista de ${formatBRL(s.amount)} em ${formatMonthYearBR(s.startMonth)}.`,
        ...commonTail
      ].join('\n')
    );
  }

  if (s.type === 'new_installment') {
    return sanitize(
      [
        'Analise o relatório financeiro abaixo, com ênfase na seção 8 (CENÁRIO DE DECISÃO).',
        '',
        `Estou avaliando um parcelamento de ${s.installmentCount}x de ${formatBRL(s.installmentAmount)} a partir de ${formatMonthYearBR(s.startMonth)} (total aproximado ${formatBRL(s.installmentAmount * s.installmentCount)}).`,
        ...commonTail
      ].join('\n')
    );
  }

  return 'Analise o relatório e o cenário de decisão da seção 8.';
};
