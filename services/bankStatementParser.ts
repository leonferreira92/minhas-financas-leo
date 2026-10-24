import { Category, ScopeType } from '../types';
import { getLocalDateString } from './dateUtils';
import { suggestCategoryByKeywords } from './categoryIntelligence';

export interface ParsedBankTransaction {
  tempId: string;
  date: string; // YYYY-MM-DD
  rawDate?: string;
  description: string;
  originalDescription: string;
  amount: number; // Sempre positivo
  type: 'income' | 'expense';
  fitId?: string;
  suggestedCategoryId?: string;
  suggestedScope?: ScopeType;
  bankName?: string;
}

export type MatchConfidence = 'exact' | 'likely' | 'possible' | 'none';

export interface StagingBankTransaction extends ParsedBankTransaction {
  selected: boolean;
  categoryId: string;
  scope: ScopeType;
  accountId: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  /** Nível de correspondência com lançamento já existente no app */
  matchConfidence?: MatchConfidence;
  /** Descrição do lançamento do app que parece ser o mesmo */
  matchedAppDescription?: string;
  matchedAppDate?: string;
  matchedAppAmount?: number;
  showId?: string;
}

/**
 * Lê arquivo bancário (OFX ou CSV) prevenindo erros de codificação (UTF-8 ou ISO-8859-1/Latin-1)
 * para preservar descrições de Pix com acentos e caracteres especiais.
 */
export async function readBankFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  
  // Tenta UTF-8 primeiro
  const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
  const utf8Text = utf8Decoder.decode(buffer);

  // Se contiver caractere de substituição \uFFFD, provável arquivo Latin-1 / Windows-1252 gerado por bancos brasileiros
  if (utf8Text.includes('\uFFFD')) {
    try {
      const latin1Decoder = new TextDecoder('iso-8859-1', { fatal: false });
      return latin1Decoder.decode(buffer);
    } catch {
      return utf8Text;
    }
  }

  return utf8Text;
}

/**
 * Limpa e formata texto de descrição (Pix, TED, DOC, Cartão) → nome legível.
 */
export function sanitizeDescription(raw: string): string {
  if (!raw) return 'Lançamento Bancário';

  let text = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");

  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return humanizeBankDescription(text);
}

/**
 * Converte jargão de extrato bancário em texto fácil de reconhecer.
 */
export function humanizeBankDescription(raw: string): string {
  if (!raw?.trim()) return 'Lançamento Bancário';

  let text = raw.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Prefixo de tipo → rótulo curto (mantém o restante útil)
  const prefixRules: { re: RegExp; label: string }[] = [
    { re: /^pix\s*(enviado|enviada)\s*(para|a|ao)?\s*/i, label: 'Pix enviado · ' },
    { re: /^pix\s*(recebido|recebida)\s*(de|da|do)?\s*/i, label: 'Pix recebido · ' },
    { re: /^pix\s*(qr\s*code|troco)?\s*/i, label: 'Pix · ' },
    { re: /^ted\s*(enviad[oa]|enviada)?\s*/i, label: 'TED · ' },
    { re: /^doc\s*(enviad[oa])?\s*/i, label: 'DOC · ' },
    { re: /^tef\s*/i, label: 'Cartão · ' },
    { re: /^compra\s*(no\s*)?(cartao|cartão)\s*/i, label: 'Cartão · ' },
    { re: /^pagamento\s*(de\s*)?(boleto|titulo|título)\s*/i, label: 'Boleto · ' },
    { re: /^debito\s*automatico\s*/i, label: 'Débito automático · ' },
    { re: /^débito\s*automático\s*/i, label: 'Débito automático · ' },
    { re: /^tarifa\s*/i, label: 'Tarifa · ' },
    { re: /^pagamento\s*/i, label: 'Pagamento · ' }
  ];

  let prefix = '';
  for (const rule of prefixRules) {
    if (rule.re.test(text)) {
      prefix = rule.label;
      text = text.replace(rule.re, '');
      break;
    }
  }

  // Remove ruído típico de OFX/banco
  text = text
    .replace(/\b\d{2}\/\d{2}\/\d{2,4}\b/g, ' ')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, ' ') // CPF
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, ' ') // CNPJ
    .replace(/\b(ag(encia)?|cc|conta|banco)\s*[:.]?\s*\d+\b/gi, ' ')
    .replace(/\b(id|nsu|auth|autorizacao|autorização|fitid)\s*[:.]?\s*[\w-]+\b/gi, ' ')
    .replace(/\b\d{6,}\b/g, ' ') // códigos longos
    .replace(/[-_/|]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Marcas conhecidas → nome amigável
  const brands: [RegExp, string][] = [
    [/\bifood\b/i, 'iFood'],
    [/\brappi\b/i, 'Rappi'],
    [/\buber\s*eats\b/i, 'Uber Eats'],
    [/\buber\b/i, 'Uber'],
    [/\b99\s*(app|pop|pay)?\b/i, '99'],
    [/\bnetflix\b/i, 'Netflix'],
    [/\bspotify\b/i, 'Spotify'],
    [/\bamazon\b/i, 'Amazon'],
    [/\bmercado\s*livre\b|\bmlivre\b/i, 'Mercado Livre'],
    [/\bshopee\b/i, 'Shopee'],
    [/\bmagazine\s*luiza\b|\bmagalu\b/i, 'Magazine Luiza'],
    [/\bcarrefour\b/i, 'Carrefour'],
    [/\bpao\s*de\s*acucar\b|\bpão\s*de\s*açúcar\b/i, 'Pão de Açúcar'],
    [/\bassai\b|\bassaí\b/i, 'Assaí'],
    [/\bdrogasil\b/i, 'Drogasil'],
    [/\bdroga\s*raia\b/i, 'Droga Raia'],
    [/\bpague\s*menos\b/i, 'Pague Menos'],
    [/\benel\b/i, 'Enel (energia)'],
    [/\bcpfl\b/i, 'CPFL (energia)'],
    [/\bsabesp\b/i, 'Sabesp (água)'],
    [/\bclaro\b/i, 'Claro'],
    [/\bvivo\b/i, 'Vivo'],
    [/\btim\b/i, 'TIM'],
    [/\bsem\s*parar\b/i, 'Sem Parar'],
    [/\bshell\b/i, 'Shell'],
    [/\bipiranga\b/i, 'Ipiranga'],
    [/\bsteam\b/i, 'Steam'],
    [/\bdisney(\+|plus)?\b/i, 'Disney+'],
    [/\bhbo\b/i, 'HBO'],
    [/\byoutube\s*premium\b/i, 'YouTube Premium']
  ];

  for (const [re, nice] of brands) {
    if (re.test(text) || re.test(raw)) {
      text = nice;
      break;
    }
  }

  // Title Case leve se ainda for texto genérico
  if (text && text === text.toUpperCase() && text.length > 3) {
    text = text
      .toLowerCase()
      .split(' ')
      .map(w => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }

  const result = (prefix + text).replace(/\s{2,}/g, ' ').trim();
  return result || 'Lançamento Bancário';
}

const daysBetween = (a: string, b: string): number => {
  const da = new Date(a + 'T12:00:00').getTime();
  const db = new Date(b + 'T12:00:00').getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return 999;
  return Math.abs(Math.round((da - db) / 86400000));
};

const significantTokens = (s: string): string[] => {
  const stop = new Set([
    'pix', 'enviado', 'enviada', 'recebido', 'recebida', 'para', 'de', 'da', 'do',
    'pagamento', 'compra', 'cartao', 'cartão', 'ted', 'doc', 'the', 'and', 'com',
    'ltda', 'me', 'sa', 'eireli', 'pag', 'pagto'
  ]);
  return normalizeText(s)
    .split(' ')
    .filter(t => t.length >= 3 && !stop.has(t) && !/^\d+$/.test(t));
};

const tokenOverlapScore = (a: string, b: string): number => {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  let hits = 0;
  ta.forEach(t => {
    if (tb.some(x => x.includes(t) || t.includes(x))) hits += 1;
  });
  return hits / Math.max(ta.length, tb.length);
};

const normalizeText = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const findCat = (
  categories: Category[],
  ids: string[],
  nameIncludes?: string[]
): Category | undefined => {
  for (const id of ids) {
    const c = categories.find(x => x.id === id);
    if (c) return c;
  }
  if (nameIncludes) {
    return categories.find(c =>
      nameIncludes.some(n => normalizeText(c.name).includes(normalizeText(n)))
    );
  }
  return undefined;
};

/**
 * Heurística pessoal: sugere categoria. Escopo sempre PERSONAL (app sem módulo músico).
 */
export function suggestCategoryAndScope(
  description: string,
  type: 'income' | 'expense',
  categories: Category[]
): { suggestedCategoryId: string; suggestedScope: ScopeType } {
  const norm = normalizeText(description);
  const personal = 'PERSONAL' as ScopeType;

  // Guia inteligente (mercado vs bar vs combustível vs oficina…)
  if (type === 'expense') {
    const smartId = suggestCategoryByKeywords(description, type, categories);
    if (smartId) {
      return { suggestedCategoryId: smartId, suggestedScope: personal };
    }
  }

  // Receitas de trabalho / cachê → Pró-labore (pessoal)
  if (
    type === 'income' &&
    (norm.includes('cache') ||
      norm.includes('show') ||
      norm.includes('pix recebido') ||
      norm.includes('honorario') ||
      norm.includes('prolabore') ||
      norm.includes('pro labore') ||
      norm.includes('sesc') ||
      norm.includes('evento') ||
      norm.includes('apresentacao'))
  ) {
    const cat =
      findCat(categories, ['cat_7'], ['pro-labore', 'prolabore', 'vida de artista']) ||
      findCat(categories, ['cat_6'], ['salario', 'renda']);
    return { suggestedCategoryId: cat?.id || 'cat_7', suggestedScope: personal };
  }

  // Mercado / alimentação (fallback se o guia não casou)
  if (
    norm.includes('ifood') ||
    norm.includes('rappi') ||
    norm.includes('aiqfome') ||
    norm.includes('restaurante') ||
    norm.includes('padaria') ||
    norm.includes('supermercado') ||
    norm.includes('mercado') ||
    norm.includes('carrefour') ||
    norm.includes('pao de acucar') ||
    norm.includes('atacad') ||
    norm.includes('assai') ||
    norm.includes('hortifruti') ||
    norm.includes('mcdonald') ||
    norm.includes('burger') ||
    norm.includes('lanche') ||
    norm.includes('pizza') ||
    /\bbar\b/.test(norm)
  ) {
    const isDelivery =
      norm.includes('ifood') || norm.includes('rappi') || norm.includes('delivery');
    const isBar = /\bbar\b/.test(norm) || norm.includes('boteco') || norm.includes('balada');
    const isRest =
      !isBar &&
      (norm.includes('restaurante') ||
        norm.includes('mcdonald') ||
        norm.includes('burger') ||
        norm.includes('pizza') ||
        norm.includes('lanche'));
    const cat = isDelivery
      ? findCat(categories, ['cat_22'], ['delivery', 'fast food'])
      : isBar
        ? findCat(categories, ['cat_28'], ['bar', 'festa'])
        : isRest
          ? findCat(categories, ['cat_5'], ['restaurante'])
          : findCat(categories, ['cat_1'], ['mercado', 'alimenta']);
    return {
      suggestedCategoryId: cat?.id || (isBar ? 'cat_28' : 'cat_1'),
      suggestedScope: personal
    };
  }

  // Transporte / combustível / oficina
  if (
    norm.includes('uber') ||
    norm.includes('99') ||
    norm.includes('posto') ||
    norm.includes('combustivel') ||
    norm.includes('gasolina') ||
    norm.includes('etanol') ||
    norm.includes('estacionamento') ||
    norm.includes('sem parar') ||
    norm.includes('conectcar') ||
    norm.includes('veloe') ||
    norm.includes('pedagio') ||
    norm.includes('ipiranga') ||
    norm.includes('shell') ||
    norm.includes('br distrib') ||
    norm.includes('oficina') ||
    norm.includes('autopecas') ||
    norm.includes('pneu') ||
    norm.includes('borracharia')
  ) {
    const isFuel =
      norm.includes('posto') ||
      norm.includes('gasolina') ||
      norm.includes('combustivel') ||
      norm.includes('etanol') ||
      norm.includes('ipiranga') ||
      norm.includes('shell');
    const isCarMaint =
      norm.includes('oficina') ||
      norm.includes('autopecas') ||
      norm.includes('pneu') ||
      norm.includes('borracharia') ||
      norm.includes('estacionamento') ||
      norm.includes('sem parar') ||
      norm.includes('pedagio') ||
      norm.includes('conectcar') ||
      norm.includes('veloe');
    const cat = isFuel
      ? findCat(categories, ['cat_21'], ['combustivel'])
      : isCarMaint
        ? findCat(categories, ['cat_34'], ['carro', 'oficina'])
        : findCat(categories, ['cat_3'], ['transporte']);
    return {
      suggestedCategoryId: cat?.id || (isFuel ? 'cat_21' : isCarMaint ? 'cat_34' : 'cat_3'),
      suggestedScope: personal
    };
  }

  // Moradia / contas
  if (
    norm.includes('aluguel') ||
    norm.includes('condominio') ||
    norm.includes('enel') ||
    norm.includes('cpfl') ||
    norm.includes('cemig') ||
    norm.includes('sabesp') ||
    norm.includes('copasa') ||
    norm.includes('energia') ||
    norm.includes('comgas') ||
    norm.includes('internet') ||
    norm.includes('claro') ||
    norm.includes('vivo') ||
    norm.includes('tim') ||
    norm.includes('oi fibra') ||
    norm.includes('iptu') ||
    norm.includes('net ') ||
    norm.includes('sky ')
  ) {
    const isTelecom =
      norm.includes('internet') ||
      norm.includes('claro') ||
      norm.includes('vivo') ||
      norm.includes('tim') ||
      norm.includes('net ') ||
      norm.includes('sky ');
    const isRent = norm.includes('aluguel') || norm.includes('condominio');
    const cat = isRent
      ? findCat(categories, ['cat_2'], ['aluguel', 'condominio'])
      : isTelecom
        ? findCat(categories, ['cat_14'], ['internet', 'celular'])
        : findCat(categories, ['cat_13'], ['luz', 'agua', 'energia']);
    return {
      suggestedCategoryId: cat?.id || 'cat_13',
      suggestedScope: personal
    };
  }

  // Saúde
  if (
    norm.includes('farmacia') ||
    norm.includes('drogaria') ||
    norm.includes('drogasil') ||
    norm.includes('droga raia') ||
    norm.includes('pague menos') ||
    norm.includes('panvel') ||
    norm.includes('consulta') ||
    norm.includes('medico') ||
    norm.includes('dentista') ||
    norm.includes('hospital') ||
    norm.includes('laboratorio') ||
    norm.includes('unimed') ||
    norm.includes('amil') ||
    norm.includes('bradesco saude')
  ) {
    const isPharma =
      norm.includes('farmacia') ||
      norm.includes('drogaria') ||
      norm.includes('drogasil') ||
      norm.includes('raia') ||
      norm.includes('panvel');
    const cat = isPharma
      ? findCat(categories, ['cat_11'], ['farmacia'])
      : findCat(categories, ['cat_4'], ['saude', 'plano']);
    return {
      suggestedCategoryId: cat?.id || (isPharma ? 'cat_11' : 'cat_4'),
      suggestedScope: personal
    };
  }

  // Lazer / assinaturas / jogos / viagem
  if (
    norm.includes('netflix') ||
    norm.includes('spotify') ||
    norm.includes('amazon') ||
    norm.includes('prime video') ||
    norm.includes('hbo') ||
    norm.includes('disney') ||
    norm.includes('cinema') ||
    norm.includes('ingresso') ||
    norm.includes('sympla') ||
    norm.includes('eventim') ||
    norm.includes('airbnb') ||
    norm.includes('booking') ||
    norm.includes('steam') ||
    norm.includes('playstation') ||
    norm.includes('xbox')
  ) {
    const isStream =
      norm.includes('netflix') ||
      norm.includes('spotify') ||
      norm.includes('prime') ||
      norm.includes('hbo') ||
      norm.includes('disney');
    const isGame =
      norm.includes('steam') || norm.includes('playstation') || norm.includes('xbox');
    const isTravel = norm.includes('airbnb') || norm.includes('booking');
    const cat = isStream
      ? findCat(categories, ['cat_15'], ['assinatura', 'streaming'])
      : isGame
        ? findCat(categories, ['cat_19'], ['jogo', 'game'])
        : isTravel
          ? findCat(categories, ['cat_29'], ['viagem', 'hotel'])
          : findCat(categories, ['cat_16'], ['cinema', 'lazer', 'teatro']);
    return {
      suggestedCategoryId: cat?.id || 'cat_15',
      suggestedScope: personal
    };
  }

  // Roupas / compras
  if (
    norm.includes('renner') ||
    norm.includes('zara') ||
    norm.includes('shein') ||
    norm.includes('magazine luiza') ||
    norm.includes('magalu') ||
    norm.includes('americanas') ||
    norm.includes('shopee') ||
    norm.includes('mercado livre') ||
    norm.includes('mlivre')
  ) {
    const cat = findCat(categories, ['cat_9'], ['roupa', 'compra']);
    return { suggestedCategoryId: cat?.id || 'cat_9', suggestedScope: personal };
  }

  // Transferências / TED entre contas próprias (heurística leve)
  if (
    norm.includes('transferencia') ||
    norm.includes('ted ') ||
    norm.includes('doc ') ||
    norm.includes('entre contas')
  ) {
    const cat = findCat(categories, ['cat_transfer'], ['transferencia']);
    if (cat) return { suggestedCategoryId: cat.id, suggestedScope: personal };
  }

  // Hobby / instrumentos → Hobby / Passatempo (não Bar / Festas)
  if (
    norm.includes('guitarra') ||
    norm.includes('violao') ||
    norm.includes('luthier') ||
    norm.includes('instrumento') ||
    norm.includes('corda') ||
    norm.includes('palheta') ||
    norm.includes('artesanato')
  ) {
    const cat = findCat(categories, ['cat_35'], ['hobby', 'passatempo']);
    return { suggestedCategoryId: cat?.id || 'cat_35', suggestedScope: personal };
  }

  if (type === 'income') {
    const salaryCat =
      findCat(categories, ['cat_6', 'cat_7'], ['salario', 'pro-labore', 'renda']) ||
      categories.find(c => c.type === 'income');
    return {
      suggestedCategoryId: salaryCat?.id || 'cat_6',
      suggestedScope: personal
    };
  }

  const otherExpense =
    findCat(categories, ['cat_20'], ['outro', 'divers']) ||
    categories.find(c => c.type === 'expense' && c.scope !== 'BUSINESS') ||
    categories.find(c => c.type === 'expense');
  return {
    suggestedCategoryId: otherExpense?.id || 'cat_20',
    suggestedScope: personal
  };
}

/**
 * Aprende categoria a partir do histórico do usuário (descrições parecidas).
 */
export function suggestCategoryFromHistory(
  description: string,
  type: 'income' | 'expense',
  history: { description?: string; type: string; categoryId: string; status?: string }[]
): string | null {
  const norm = normalizeText(description);
  if (norm.length < 4) return null;

  const tokens = norm.split(' ').filter(t => t.length >= 3);
  if (tokens.length === 0) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  history.forEach(t => {
    if (t.type !== type || t.status === 'cancelled' || !t.categoryId) return;
    const h = normalizeText(t.description || '');
    if (!h) return;
    let score = 0;
    if (h === norm) score = 100;
    else if (h.includes(norm) || norm.includes(h)) score = 70;
    else {
      tokens.forEach(tok => {
        if (h.includes(tok)) score += 8;
      });
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = t.categoryId;
    }
  });

  return bestScore >= 24 ? bestId : null;
}

/**
 * Parser de arquivos OFX (Open Financial Exchange)
 */
export function parseOFX(content: string, categories: Category[]): ParsedBankTransaction[] {
  const transactions: ParsedBankTransaction[] = [];
  
  // Tenta extrair o nome ou código da instituição financeira do cabeçalho
  let bankName = '';
  const orgMatch = content.match(/<ORG>(.*?)(?:<\/[\w]+>|\r?\n|$)/i);
  if (orgMatch && orgMatch[1]) bankName = orgMatch[1].trim();

  // Encontra todos os blocos de transação <STMTTRN>
  // Usa regex não-gananciosa que aceita tanto tags fechadas </STMTTRN> quanto padrão SGML sem fechamento
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>|$))/gi;
  let match: RegExpExecArray | null;

  let counter = 0;
  while ((match = stmttrnRegex.exec(content)) !== null) {
    const block = match[1];
    if (!block || !block.trim()) continue;

    // Extrai campos
    const typeMatch = block.match(/<TRNTYPE>(.*?)(?:<\/[\w]+>|\r?\n|$)/i);
    const dateMatch = block.match(/<DTPOSTED>(.*?)(?:<\/[\w]+>|\r?\n|$)/i);
    const amountMatch = block.match(/<TRNAMT>(.*?)(?:<\/[\w]+>|\r?\n|$)/i);
    const fitIdMatch = block.match(/<FITID>(.*?)(?:<\/[\w]+>|\r?\n|$)/i);
    const memoMatch = block.match(/<MEMO>(.*?)(?:<\/[\w]+>|\r?\n|$)/i);
    const nameMatch = block.match(/<NAME>(.*?)(?:<\/[\w]+>|\r?\n|$)/i);

    if (!amountMatch || !dateMatch) continue;

    // Processa Data: YYYYMMDD... -> YYYY-MM-DD
    const rawDateStr = dateMatch[1].trim();
    let date = '';
    const dateParsed = rawDateStr.match(/^(\d{4})(\d{2})(\d{2})/);
    if (dateParsed) {
      date = `${dateParsed[1]}-${dateParsed[2]}-${dateParsed[3]}`;
    } else {
      date = getLocalDateString();
    }

    // Processa Valor
    const rawAmt = amountMatch[1].trim().replace(',', '.');
    const numAmt = parseFloat(rawAmt);
    if (isNaN(numAmt) || Math.abs(numAmt) < 0.0001) continue;

    const trnType = (typeMatch ? typeMatch[1].trim().toUpperCase() : '');
    const isExpense = numAmt < 0 || trnType === 'DEBIT' || trnType === 'PAYMENT';
    const finalType: 'income' | 'expense' = isExpense ? 'expense' : 'income';
    const positiveAmount = parseFloat(Math.abs(numAmt).toFixed(2));

    // Processa Descrição
    const memo = memoMatch ? memoMatch[1].trim() : '';
    const name = nameMatch ? nameMatch[1].trim() : '';
    let description = '';
    if (memo && name && memo !== name) {
      description = `${name} - ${memo}`;
    } else {
      description = memo || name || 'Lançamento OFX';
    }
    description = sanitizeDescription(description);

    const fitId = fitIdMatch ? fitIdMatch[1].trim() : undefined;
    const { suggestedCategoryId, suggestedScope } = suggestCategoryAndScope(description, finalType, categories);

    counter++;
    transactions.push({
      tempId: `ofx_${Date.now()}_${counter}_${Math.random().toString(36).substring(2, 7)}`,
      date,
      rawDate: rawDateStr,
      description,
      originalDescription: description,
      amount: positiveAmount,
      type: finalType,
      fitId,
      suggestedCategoryId,
      suggestedScope,
      bankName
    });
  }

  return transactions;
}

/**
 * Parser de arquivos CSV de bancos brasileiros (Nubank, Itaú, Bradesco, BB, Inter, Santander, etc.)
 */
export function parseCSV(content: string, categories: Category[]): ParsedBankTransaction[] {
  const transactions: ParsedBankTransaction[] = [];
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length < 2) return transactions;

  // Detecta o delimitador (, ; ou \t) contando ocorrências na primeira linha não-vazia
  const candidateDelimiters = [';', ',', '\t'];
  let delimiter = ';';
  let maxCount = -1;

  // Testa as primeiras 5 linhas para escolher o melhor delimitador
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  for (const delim of candidateDelimiters) {
    const total = sampleLines.reduce((acc, l) => acc + (l.split(delim).length - 1), 0);
    if (total > maxCount) {
      maxCount = total;
      delimiter = delim;
    }
  }

  // Função auxiliar para dividir campos respeitando aspas
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"(.*)"$/, '$1'));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"(.*)"$/, '$1'));
    return result;
  };

  // Encontra a linha de cabeçalho (pode haver metadados antes)
  let headerIndex = -1;
  let dateCol = -1;
  let descCol = -1;
  let amountCol = -1;
  let creditCol = -1;
  let debitCol = -1;
  let typeCol = -1;

  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const cols = splitLine(lines[i]).map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    
    // Procura por data
    const dIdx = cols.findIndex(c => c.includes('data') || c.includes('dt') || c === 'date' || c === 'dia');
    // Procura por descrição / histórico
    const descIdx = cols.findIndex(c => 
      c.includes('descri') || 
      c.includes('histor') || 
      c.includes('lancamento') || 
      c.includes('detalhe') || 
      c.includes('memo') || 
      c.includes('identificador') ||
      c.includes('origem/destino') ||
      c.includes('beneficiario') ||
      c === 'title' ||
      c === 'texto'
    );
    // Procura por valor único ou crédito/débito separados
    const vIdx = cols.findIndex(c => c === 'valor' || c === 'amount' || c.includes('valor (r$)') || c.includes('quantia'));
    const credIdx = cols.findIndex(c => c.includes('credito') || c.includes('entrada') || c.includes('receita'));
    const debIdx = cols.findIndex(c => c.includes('debito') || c.includes('saida') || c.includes('despesa'));
    const tIdx = cols.findIndex(c => c === 'tipo' || c === 'type' || c === 'd/c' || c === 'c/d');

    if (dIdx !== -1 && (descIdx !== -1 || vIdx !== -1 || credIdx !== -1 || debIdx !== -1)) {
      headerIndex = i;
      dateCol = dIdx;
      descCol = descIdx;
      amountCol = vIdx;
      creditCol = credIdx;
      debitCol = debIdx;
      typeCol = tIdx;
      break;
    }
  }

  // Fallback se nenhum cabeçalho textual foi reconhecido: analisa a primeira linha como colunas 0, 1, 2
  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0;
  if (headerIndex === -1) {
    dateCol = 0;
    descCol = 1;
    amountCol = 2;
  }

  // Helper para normalizar data DD/MM/AAAA ou AAAA-MM-DD para YYYY-MM-DD
  const parseDate = (raw: string): string | null => {
    if (!raw) return null;
    const clean = raw.trim();

    // Formato DD/MM/YYYY ou DD/MM/YY
    const slashMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
      let day = slashMatch[1].padStart(2, '0');
      let month = slashMatch[2].padStart(2, '0');
      let year = slashMatch[3];
      if (year.length === 2) {
        year = parseInt(year) <= 50 ? `20${year}` : `19${year}`;
      }
      return `${year}-${month}-${day}`;
    }

    // Formato YYYY-MM-DD
    const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    return null;
  };

  // Helper para converter string de valor monetário brasileiro ou americano para número
  const parseAmount = (raw: string): { amount: number; isNegative: boolean } | null => {
    if (!raw) return null;
    let s = raw.trim();
    if (!s) return null;

    let isNegative = false;
    if (s.startsWith('-') || s.endsWith('-') || (s.startsWith('(') && s.endsWith(')'))) {
      isNegative = true;
    }

    // Remove R$, espaços, parênteses
    s = s.replace(/R\$/gi, '').replace(/[\(\)\s\+]/g, '');

    // Verifica formato: se tem vírgula como decimal (ex: 1.250,50 ou -50,00)
    if (s.includes(',') && s.includes('.')) {
      // 1.250,50 -> remove ponto e troca vírgula por ponto
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      // 1250,50 -> 1250.50
      s = s.replace(',', '.');
    }

    const val = Math.abs(parseFloat(s));
    if (isNaN(val) || val === 0) return null;

    return { amount: parseFloat(val.toFixed(2)), isNegative };
  };

  let counter = 0;
  for (let i = startRow; i < lines.length; i++) {
    const row = splitLine(lines[i]);
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    // Obtém data
    const rawDate = dateCol !== -1 && row[dateCol] ? row[dateCol] : row[0];
    const parsedDate = parseDate(rawDate);
    if (!parsedDate) continue;

    // Obtém descrição
    let description = 'Lançamento CSV';
    if (descCol !== -1 && row[descCol]) {
      description = row[descCol];
    } else {
      // Procura primeiro campo texto longo
      const textCandidate = row.find(c => c && c.length > 3 && isNaN(Number(c.replace(',', '.'))));
      if (textCandidate) description = textCandidate;
    }
    description = sanitizeDescription(description);

    // Obtém valor e tipo
    let finalAmount = 0;
    let finalType: 'income' | 'expense' = 'expense';

    if (creditCol !== -1 && debitCol !== -1) {
      // Colunas separadas de crédito e débito
      const credParsed = parseAmount(row[creditCol]);
      const debParsed = parseAmount(row[debitCol]);

      if (credParsed && credParsed.amount > 0) {
        finalAmount = credParsed.amount;
        finalType = 'income';
      } else if (debParsed && debParsed.amount > 0) {
        finalAmount = debParsed.amount;
        finalType = 'expense';
      } else {
        continue;
      }
    } else if (amountCol !== -1 && row[amountCol]) {
      const parsedAmt = parseAmount(row[amountCol]);
      if (!parsedAmt) continue;

      finalAmount = parsedAmt.amount;

      // Se há coluna de tipo explícito (D/C)
      if (typeCol !== -1 && row[typeCol]) {
        const tStr = row[typeCol].trim().toUpperCase();
        if (tStr.startsWith('C') || tStr.includes('CRED') || tStr.includes('ENTRAD')) {
          finalType = 'income';
        } else {
          finalType = 'expense';
        }
      } else {
        // Usa o sinal negativo
        finalType = parsedAmt.isNegative ? 'expense' : 'income';
      }
    } else {
      // Procura qualquer coluna que tenha valor numérico
      let foundAmt = false;
      for (let c = 0; c < row.length; c++) {
        if (c === dateCol) continue;
        const res = parseAmount(row[c]);
        if (res) {
          finalAmount = res.amount;
          finalType = res.isNegative ? 'expense' : 'income';
          foundAmt = true;
          break;
        }
      }
      if (!foundAmt) continue;
    }

    const { suggestedCategoryId, suggestedScope } = suggestCategoryAndScope(description, finalType, categories);

    counter++;
    transactions.push({
      tempId: `csv_${Date.now()}_${counter}_${Math.random().toString(36).substring(2, 7)}`,
      date: parsedDate,
      rawDate,
      description,
      originalDescription: description,
      amount: finalAmount,
      type: finalType,
      suggestedCategoryId,
      suggestedScope
    });
  }

  return transactions;
}

/**
 * Função mestre que detecta o formato do arquivo (.OFX ou .CSV) e chama o parser correto
 */
export function parseBankStatement(
  content: string,
  fileName: string,
  categories: Category[]
): ParsedBankTransaction[] {
  const isOFX = fileName.toLowerCase().endsWith('.ofx') || 
                content.includes('<OFX>') || 
                content.includes('<STMTTRN>') || 
                content.includes('OFXHEADER:');

  if (isOFX) {
    return parseOFX(content, categories);
  } else {
    return parseCSV(content, categories);
  }
}

type ExistingTx = {
  date: string;
  amount: number;
  type?: string;
  description?: string;
  fitId?: string;
  bankFitId?: string;
  status?: string;
  accountId?: string;
  categoryId?: string;
};

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDateBR = (iso: string) => {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Cruza o arquivo do banco com o que já está no app.
 * - exact: FITID ou mesmo dia + mesmo valor
 * - likely: mesmo valor ±2 dias + nomes parecidos (mesmo com textos diferentes)
 * - possible: mesmo valor ±3 dias (só valor — você decide)
 */
export function detectDuplicates(
  parsed: ParsedBankTransaction[],
  existingTransactions: ExistingTx[],
  targetAccountId: string
): StagingBankTransaction[] {
  const existing = existingTransactions.filter(t => t.status !== 'cancelled');

  return parsed.map(item => {
    const baseCategory =
      item.suggestedCategoryId || (item.type === 'income' ? 'cat_7' : 'cat_1');

    const base: StagingBankTransaction = {
      ...item,
      selected: true,
      categoryId: baseCategory,
      scope: 'PERSONAL',
      accountId: targetAccountId,
      isDuplicate: false,
      matchConfidence: 'none'
    };

    // 1) FITID
    if (item.fitId) {
      const matchFit = existing.find(
        t => t.fitId === item.fitId || t.bankFitId === item.fitId
      );
      if (matchFit) {
        return {
          ...base,
          selected: false,
          isDuplicate: true,
          matchConfidence: 'exact',
          matchedAppDescription: matchFit.description,
          matchedAppDate: matchFit.date,
          matchedAppAmount: Math.abs(Number(matchFit.amount) || 0),
          duplicateReason: `Já no app: “${matchFit.description || 'lançamento'}” (${fmtBRL(Math.abs(Number(matchFit.amount) || 0))} em ${fmtDateBR(matchFit.date)}) — mesmo ID do banco.`
        };
      }
    }

    type Cand = {
      t: ExistingTx;
      confidence: MatchConfidence;
      score: number;
      reason: string;
    };
    const candidates: Cand[] = [];

    existing.forEach(t => {
      const amt = Math.abs(Number(t.amount) || 0);
      const sameAmount = Math.abs(amt - item.amount) < 0.02;
      if (!sameAmount) return;

      // Só compara entrada↔entrada e saída↔saída
      if (t.type === 'income' || t.type === 'expense') {
        if (t.type !== item.type) return;
      }

      const gap = daysBetween(t.date, item.date);
      if (gap > 3) return;

      const overlap = tokenOverlapScore(
        `${item.description} ${item.originalDescription}`,
        t.description || ''
      );
      const humanApp = humanizeBankDescription(t.description || '');
      const nameClose =
        overlap >= 0.35 ||
        normalizeText(humanApp) === normalizeText(item.description) ||
        (humanApp.length >= 4 &&
          normalizeText(item.description).includes(normalizeText(humanApp).slice(0, 8)));

      if (gap === 0) {
        candidates.push({
          t,
          confidence: nameClose ? 'exact' : 'likely',
          score: 100 - gap + overlap * 20,
          reason: nameClose
            ? `Já no app como “${t.description}” no mesmo dia e valor (${fmtBRL(amt)}).`
            : `Mesmo dia e valor (${fmtBRL(amt)}). No app: “${t.description || 'sem nome'}” — nomes diferentes, mas parece a mesma.`
        });
        return;
      }

      if (gap <= 2 && nameClose) {
        candidates.push({
          t,
          confidence: 'likely',
          score: 80 - gap + overlap * 25,
          reason: `Valor igual (${fmtBRL(amt)}), ${gap} dia(s) de diferença. No app: “${t.description}” (${fmtDateBR(t.date)}). Pode ser o mesmo com nome diferente.`
        });
        return;
      }

      if (gap <= 3) {
        candidates.push({
          t,
          confidence: 'possible',
          score: 40 - gap + overlap * 10,
          reason: `Valor igual (${fmtBRL(amt)}) perto da data (${fmtDateBR(t.date)} → ${fmtDateBR(item.date)}). No app: “${t.description || 'sem nome'}”. Confira se já registrou.`
        });
      }
    });

    if (candidates.length === 0) return base;

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const isStrong = best.confidence === 'exact' || best.confidence === 'likely';

    return {
      ...base,
      selected: !isStrong, // exact/likely desmarcados; possible fica marcado mas avisado
      isDuplicate: isStrong || best.confidence === 'possible',
      matchConfidence: best.confidence,
      matchedAppDescription: best.t.description,
      matchedAppDate: best.t.date,
      matchedAppAmount: Math.abs(Number(best.t.amount) || 0),
      duplicateReason: best.reason,
      categoryId: best.t.categoryId || base.categoryId
    };
  });
}
