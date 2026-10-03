import { Category, ScopeType } from '../types';
import { getLocalDateString } from './dateUtils';

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

export interface StagingBankTransaction extends ParsedBankTransaction {
  selected: boolean;
  categoryId: string;
  scope: ScopeType;
  accountId: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  showId?: string; // ID do Show vinculado
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
 * Limpa e formata texto de descrição (Pix, TED, DOC, Cartão)
 */
export function sanitizeDescription(raw: string): string {
  if (!raw) return 'Lançamento Bancário';
  
  // Decodifica entidades comuns em OFX/XML
  let text = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");

  // Remove quebras de linha e múltiplos espaços
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  return text || 'Lançamento Bancário';
}

/**
 * Heurística inteligente para sugerir Categoria e Módulo (Pessoal vs Música/Empresa)
 */
export function suggestCategoryAndScope(
  description: string,
  type: 'income' | 'expense',
  categories: Category[]
): { suggestedCategoryId: string; suggestedScope: ScopeType } {
  const norm = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. MÚSICA / EMPRESA: Shows, Cachês, Eventos
  if (
    norm.includes('cache') ||
    norm.includes('show') ||
    norm.includes('contratante') ||
    norm.includes('couvert') ||
    norm.includes('musica') ||
    norm.includes('apresentacao') ||
    norm.includes('honorario artistico') ||
    norm.includes('sesc') ||
    norm.includes('prefeitura') ||
    norm.includes('evento')
  ) {
    if (type === 'income') {
      const showCat = categories.find(c => c.id === 'cat_33' || c.name.toLowerCase().includes('show') || c.name.toLowerCase().includes('cach'));
      return {
        suggestedCategoryId: showCat ? showCat.id : 'cat_33',
        suggestedScope: 'BUSINESS'
      };
    }
  }

  // 2. MÚSICA / EMPRESA: Equipamentos e Instrumentos
  if (
    norm.includes('equipamento') ||
    norm.includes('instrumento') ||
    norm.includes('guitarra') ||
    norm.includes('violao') ||
    norm.includes('baixo') ||
    norm.includes('teclado') ||
    norm.includes('bateria') ||
    norm.includes('microfone') ||
    norm.includes('cabo ') ||
    norm.includes('cabos') ||
    norm.includes('pedal') ||
    norm.includes('amplificador') ||
    norm.includes('caixa de som') ||
    norm.includes('fone') ||
    norm.includes('in-ear') ||
    norm.includes('luthier') ||
    norm.includes('corda') ||
    norm.includes('palheta') ||
    norm.includes('audio') ||
    norm.includes('gravação') ||
    norm.includes('estudio') ||
    norm.includes('roadie')
  ) {
    const equipCat = categories.find(c => c.id === 'cat_equipamentos' || c.name.toLowerCase().includes('equipamento') || c.name.toLowerCase().includes('produção'));
    return {
      suggestedCategoryId: equipCat ? equipCat.id : 'cat_equipamentos',
      suggestedScope: 'BUSINESS'
    };
  }

  // 3. PESSOAL: Alimentação
  if (
    norm.includes('ifood') ||
    norm.includes('rappi') ||
    norm.includes('aiqfome') ||
    norm.includes('restaurante') ||
    norm.includes('padaria') ||
    norm.includes('panificadora') ||
    norm.includes('supermercado') ||
    norm.includes('mercado') ||
    norm.includes('carrefour') ||
    norm.includes('pao de acucar') ||
    norm.includes('atacad') ||
    norm.includes('assai') ||
    norm.includes('acougue') ||
    norm.includes('hortifruti') ||
    norm.includes('mcdonald') ||
    norm.includes('burger') ||
    norm.includes('lanche') ||
    norm.includes('pizza') ||
    norm.includes('cafe') ||
    norm.includes('barbearia') === false && norm.includes('bar ')
  ) {
    const cat = categories.find(c => c.id === 'cat_1' || c.name.toLowerCase().includes('alimenta'));
    return {
      suggestedCategoryId: cat ? cat.id : 'cat_1',
      suggestedScope: 'PERSONAL'
    };
  }

  // 4. PESSOAL: Transporte
  if (
    norm.includes('uber') ||
    norm.includes('99app') ||
    norm.includes('99 app') ||
    norm.includes('99pay') ||
    norm.includes('99 pop') ||
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
    norm.includes('shell')
  ) {
    const cat = categories.find(c => c.id === 'cat_2' || c.name.toLowerCase().includes('transporte'));
    return {
      suggestedCategoryId: cat ? cat.id : 'cat_2',
      suggestedScope: 'PERSONAL'
    };
  }

  // 5. PESSOAL: Moradia e Contas Fixas
  if (
    norm.includes('aluguel') ||
    norm.includes('condominio') ||
    norm.includes('enel') ||
    norm.includes('cpfl') ||
    norm.includes('cemig') ||
    norm.includes('sabesp') ||
    norm.includes('copasa') ||
    norm.includes('luz') ||
    norm.includes('energia') ||
    norm.includes('agua') ||
    norm.includes('gas') ||
    norm.includes('comgas') ||
    norm.includes('internet') ||
    norm.includes('claro') ||
    norm.includes('vivo') ||
    norm.includes('tim') ||
    norm.includes('iptu')
  ) {
    const cat = categories.find(c => c.id === 'cat_3' || c.name.toLowerCase().includes('moradia'));
    return {
      suggestedCategoryId: cat ? cat.id : 'cat_3',
      suggestedScope: 'PERSONAL'
    };
  }

  // 6. PESSOAL: Saúde
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
    norm.includes('unimed')
  ) {
    const cat = categories.find(c => c.id === 'cat_4' || c.name.toLowerCase().includes('saude'));
    return {
      suggestedCategoryId: cat ? cat.id : 'cat_4',
      suggestedScope: 'PERSONAL'
    };
  }

  // 7. PESSOAL: Lazer
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
    norm.includes('booking')
  ) {
    const cat = categories.find(c => c.id === 'cat_5' || c.name.toLowerCase().includes('lazer'));
    return {
      suggestedCategoryId: cat ? cat.id : 'cat_5',
      suggestedScope: 'PERSONAL'
    };
  }

  // Fallbacks
  if (type === 'income') {
    const salaryCat = categories.find(c => c.id === 'cat_6' || c.type === 'income');
    return {
      suggestedCategoryId: salaryCat ? salaryCat.id : 'cat_6',
      suggestedScope: 'PERSONAL'
    };
  }

  const otherExpense = categories.find(c => c.id === 'cat_7' || c.type === 'expense') || categories[0];
  return {
    suggestedCategoryId: otherExpense ? otherExpense.id : 'cat_7',
    suggestedScope: 'PERSONAL'
  };
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

/**
 * Verifica duplicidades comparando com as transações já existentes no LocalStorage/App
 * Regra: Data exata + Valor (com tolerância de 0.01) + Tipo compatível + Similaridade de descrição
 */
export function detectDuplicates(
  parsed: ParsedBankTransaction[],
  existingTransactions: Array<{ date: string; amount: number; type?: string; description?: string; fitId?: string }>,
  targetAccountId: string
): StagingBankTransaction[] {
  return parsed.map(item => {
    // 1. Verificação por FITID se existir no OFX
    if (item.fitId) {
      const matchFit = existingTransactions.find(t => (t as any).fitId === item.fitId || (t as any).bankFitId === item.fitId);
      if (matchFit) {
        return {
          ...item,
          selected: false,
          categoryId: item.suggestedCategoryId || 'cat_7',
          scope: item.suggestedScope || 'PERSONAL',
          accountId: targetAccountId,
          isDuplicate: true,
          duplicateReason: 'Identificador bancário único (FITID) já registrado anteriormente.'
        };
      }
    }

    // 2. Verificação por Data + Valor exato + Tipo
    const matchSameDayAndAmount = existingTransactions.find(t => {
      const sameDate = t.date === item.date;
      const sameAmount = Math.abs(Number(t.amount) - item.amount) < 0.01;
      const sameType = !t.type || t.type === item.type;

      if (!sameDate || !sameAmount || !sameType) return false;

      // Se data e valor batem, compara semelhança de texto ou considera duplicata de alta chance
      const normExisting = (t.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normItem = (item.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Se um texto contiver o outro ou forem idênticos
      const textMatch = normExisting.includes(normItem) || normItem.includes(normExisting) || 
                        normExisting.slice(0, 10) === normItem.slice(0, 10);

      return textMatch || true; // Mesma data + mesmo valor + mesmo tipo no mesmo extrato
    });

    if (matchSameDayAndAmount) {
      return {
        ...item,
        selected: false, // Desmarca duplicata por padrão para proteger o usuário
        categoryId: item.suggestedCategoryId || 'cat_7',
        scope: item.suggestedScope || 'PERSONAL',
        accountId: targetAccountId,
        isDuplicate: true,
        duplicateReason: `Transação idêntica (R$ ${item.amount.toFixed(2)} em ${item.date}) já existe no extrato.`
      };
    }

    return {
      ...item,
      selected: true, // Itens novos vêm selecionados
      categoryId: item.suggestedCategoryId || (item.type === 'income' ? 'cat_6' : 'cat_7'),
      scope: item.suggestedScope || 'PERSONAL',
      accountId: targetAccountId,
      isDuplicate: false
    };
  });
}
