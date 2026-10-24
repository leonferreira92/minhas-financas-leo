import { Category, ScopeType } from '../types';

export type CategoryGuideEntry = {
  id: string;
  /** Quando usar */
  useWhen: string;
  /** O que NÃO colocar aqui */
  notFor?: string;
  keywords: string[];
};

/**
 * Guia claro: qual categoria usar (relatórios e importação).
 * IDs estáveis — só renomeamos o significado, sem apagar histórico.
 */
export const CATEGORY_USAGE_GUIDE: CategoryGuideEntry[] = [
  {
    id: 'cat_1',
    useWhen: 'Supermercado, feira, hortifruti, atacado — comida para casa',
    notFor: 'Restaurante, ifood, bar, bebida/cigarro na rua',
    keywords: [
      'supermercado', 'mercado', 'feira', 'atacad', 'assai', 'assaí', 'carrefour',
      'pao de acucar', 'hortifruti', 'acougue', 'padaria', 'panificadora'
    ]
  },
  {
    id: 'cat_5',
    useWhen: 'Restaurante, lanchonete, café — comer fora sentado',
    notFor: 'Mercado de casa; bar/balada (use Bar / Festas)',
    keywords: [
      'restaurante', 'lanchonete', 'mcdonald', 'burger', 'pizza hut', 'outback',
      'cafe', 'cafeteria', 'starbucks', 'bob s', 'subway'
    ]
  },
  {
    id: 'cat_22',
    useWhen: 'iFood, Rappi, delivery, fast food pedido no app',
    notFor: 'Mercado; jantar no restaurante físico',
    keywords: ['ifood', 'rappi', 'aiqfome', 'delivery', 'uber eats', 'james delivery']
  },
  {
    id: 'cat_28',
    useWhen: 'Bar, balada, festa, cerveja/drinks na rua, cigarro, tabacaria',
    notFor: 'Mercado (cerveja de casa); cinema/cultura (use Lazer & Cultura)',
    keywords: [
      'boteco', 'balada', 'boate', 'festa', 'pub', 'choppe', 'chopp', 'cervejaria',
      'cigarro', 'tabacaria', 'vape', 'narguile', 'destilaria', 'whisky', 'drink',
      'baladeira', 'night club', 'nightclub', 'adeega', 'adega'
    ]
  },
  {
    id: 'cat_16',
    useWhen: 'Cinema, teatro, museu, parque, shows como público, passeios',
    notFor: 'Bar/festa; jogos digitais (use Jogos)',
    keywords: [
      'cinema', 'teatro', 'museu', 'ingresso', 'sympla', 'eventim', 'cinemark',
      'uci ', 'park', 'zoológico', 'zoologico', 'exposicao', 'exposição'
    ]
  },
  {
    id: 'cat_35',
    useWhen: 'Hobby em casa: instrumento, artesanato, materiais de criação, coleção',
    notFor: 'Bar/festa; academia',
    keywords: [
      'luthier', 'corda', 'palheta', 'guitarra', 'violao', 'violão', 'artesanato',
      'papelaria', 'hobby', 'lego', 'modelo', 'pintura'
    ]
  },
  {
    id: 'cat_21',
    useWhen: 'Gasolina, etanol, GNV — abastecimento',
    notFor: 'Peças, oficina, lavagem, IPVA (use Carro / Oficina ou Impostos)',
    keywords: [
      'posto', 'gasolina', 'etanol', 'combustivel', 'combustível', 'shell',
      'ipiranga', 'br distrib', 'ale ', 'petrobras'
    ]
  },
  {
    id: 'cat_34',
    useWhen: 'Oficina, peças, pneu, revisão, lavagem, estacionamento longo, seguro auto avulso',
    notFor: 'Combustível do dia a dia; Uber',
    keywords: [
      'oficina', 'autopecas', 'auto peças', 'pneu', 'borracharia', 'revisao',
      'revisão', 'mecanica', 'mecânica', 'lavagem', 'estacionamento', 'sem parar',
      'conectcar', 'veloe', 'pedagio', 'pedágio', 'ipva', 'detran'
    ]
  },
  {
    id: 'cat_3',
    useWhen: 'Ônibus, metrô, trem, app de transporte público',
    notFor: 'Uber/99 (pode criar ou usar Transporte sob demanda se existir)',
    keywords: ['onibus', 'ônibus', 'metro', 'metrô', 'cptm', 'bilhete unico', 'bilhete único']
  },
  {
    id: 'cat_15',
    useWhen: 'Netflix, Spotify, Disney+, assinaturas digitais',
    notFor: 'Ingresso avulso de cinema',
    keywords: [
      'netflix', 'spotify', 'disney', 'hbo', 'prime video', 'youtube premium',
      'apple music', 'deezer', 'paramount', 'globoplay'
    ]
  },
  {
    id: 'cat_11',
    useWhen: 'Farmácia, remédios, drogaria',
    notFor: 'Consulta/plano (use Plano de Saúde)',
    keywords: ['farmacia', 'farmácia', 'drogaria', 'drogasil', 'droga raia', 'pague menos', 'panvel']
  },
  {
    id: 'cat_9',
    useWhen: 'Roupas, calçados, acessórios',
    keywords: ['renner', 'zara', 'shein', 'roupa', 'calcado', 'calçado', 'nike', 'adidas']
  },
  {
    id: 'cat_19',
    useWhen: 'Steam, PlayStation, Xbox, games',
    keywords: ['steam', 'playstation', 'xbox', 'nintendo', 'game pass', 'epic games']
  },
  {
    id: 'cat_20',
    useWhen: 'Presente, doação, vaquinha',
    keywords: ['presente', 'doacao', 'doação', 'vakinha', 'crowdfunding']
  },
  {
    id: 'cat_29',
    useWhen: 'Hotel, passagem, Airbnb, viagem',
    keywords: ['airbnb', 'booking', 'hotel', 'passagem', 'decolar', 'latam', 'gol ', 'azul ']
  }
];

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Uber/99 como transporte sob demanda — mapeia para cat_3 se não houver categoria própria, com keyword forte */
const TRANSPORT_APP_KEYWORDS = ['uber', '99app', '99 app', '99 pop', '99pay', 'cabify'];

/**
 * Sugere categoria por palavras-chave + guia (sem inventar IDs inexistentes na lista do usuário).
 */
export function suggestCategoryByKeywords(
  description: string,
  type: 'income' | 'expense',
  categories: Category[]
): string | null {
  if (type !== 'expense') return null;
  const norm = normalize(description);
  if (norm.length < 2) return null;

  const idSet = new Set(categories.map(c => c.id));

  // Transporte app
  if (TRANSPORT_APP_KEYWORDS.some(k => norm.includes(normalize(k)))) {
    if (idSet.has('cat_3')) return 'cat_3';
  }

  // "bar" isolado (evita "barbeiro", "barbara")
  if (/\bbar\b/.test(norm) || /\bbars\b/.test(norm)) {
    if (idSet.has('cat_28')) return 'cat_28';
  }

  let bestId: string | null = null;
  let bestScore = 0;

  CATEGORY_USAGE_GUIDE.forEach(guide => {
    if (!idSet.has(guide.id)) return;
    let score = 0;
    guide.keywords.forEach(kw => {
      const k = normalize(kw);
      if (!k) return;
      if (norm.includes(k)) score += k.length >= 5 ? 12 : 8;
    });
    if (score > bestScore) {
      bestScore = score;
      bestId = guide.id;
    }
  });

  return bestScore >= 8 ? bestId : null;
}

/**
 * Histórico tem prioridade; senão keywords do guia.
 */
export function suggestCategorySmart(params: {
  description: string;
  type: 'income' | 'expense';
  categories: Category[];
  history: { description?: string; type: string; categoryId: string; status?: string }[];
}): { categoryId: string | null; source: 'history' | 'keywords' | 'none' } {
  const { description, type, categories, history } = params;
  const norm = normalize(description);
  if (norm.length < 2) return { categoryId: null, source: 'none' };

  // 1) Histórico (match de descrição)
  const scores: Record<string, number> = {};
  history.forEach(t => {
    if (t.type !== type || t.status === 'cancelled' || !t.categoryId) return;
    const h = normalize(t.description || '');
    if (!h) return;
    let s = 0;
    if (h === norm) s = 100;
    else if (h.includes(norm) || norm.includes(h)) s = 60;
    else {
      const tokens = norm.split(' ').filter(x => x.length >= 3);
      tokens.forEach(tok => {
        if (h.includes(tok)) s += 10;
      });
    }
    if (s > 0) scores[t.categoryId] = (scores[t.categoryId] || 0) + s;
  });

  let bestHist: string | null = null;
  let bestHistScore = 0;
  Object.entries(scores).forEach(([id, sc]) => {
    if (sc > bestHistScore) {
      bestHistScore = sc;
      bestHist = id;
    }
  });

  if (bestHist && bestHistScore >= 30 && categories.some(c => c.id === bestHist)) {
    return { categoryId: bestHist, source: 'history' };
  }

  // 2) Keywords
  const byKw = suggestCategoryByKeywords(description, type, categories);
  if (byKw) return { categoryId: byKw, source: 'keywords' };

  return { categoryId: null, source: 'none' };
}

export const getCategoryUsageHint = (categoryId: string): string | undefined =>
  CATEGORY_USAGE_GUIDE.find(g => g.id === categoryId)?.useWhen;

export const getCategoryNotForHint = (categoryId: string): string | undefined =>
  CATEGORY_USAGE_GUIDE.find(g => g.id === categoryId)?.notFor;

/** Atualiza nomes/hints de categorias conhecidas sem apagar IDs (soft sync). */
export function syncPersonalCategoryCatalog(categories: Category[]): {
  categories: Category[];
  changed: boolean;
} {
  const byId = new Map(categories.map(c => [c.id, { ...c }]));
  let changed = false;

  const upsert = (partial: Category) => {
    const existing = byId.get(partial.id);
    if (!existing) {
      byId.set(partial.id, { ...partial });
      changed = true;
      return;
    }
    if (
      existing.name !== partial.name ||
      existing.usageHint !== partial.usageHint ||
      existing.classification !== partial.classification ||
      existing.icon !== partial.icon ||
      existing.color !== partial.color
    ) {
      byId.set(partial.id, {
        ...existing,
        name: partial.name,
        usageHint: partial.usageHint,
        classification: partial.classification ?? existing.classification,
        icon: partial.icon || existing.icon,
        color: partial.color || existing.color,
        scope: partial.scope ?? existing.scope ?? 'PERSONAL',
        type: partial.type
      });
      changed = true;
    }
  };

  // Catálogo pessoal “claro”
  upsert({
    id: 'cat_1',
    name: 'Mercado',
    type: 'expense',
    color: '#ef4444',
    icon: 'ShoppingCart',
    classification: 'essential',
    scope: 'PERSONAL',
    usageHint: 'Supermercado e comida para casa'
  });
  upsert({
    id: 'cat_5',
    name: 'Restaurantes',
    type: 'expense',
    color: '#8b5cf6',
    icon: 'Utensils',
    classification: 'personal',
    scope: 'PERSONAL',
    usageHint: 'Comer fora (salão / lanchonete)'
  });
  upsert({
    id: 'cat_22',
    name: 'Delivery / Fast Food',
    type: 'expense',
    color: '#a855f7',
    icon: 'Pizza',
    classification: 'personal',
    scope: 'PERSONAL',
    usageHint: 'iFood, Rappi e pedidos no app'
  });
  upsert({
    id: 'cat_28',
    name: 'Bar / Festas',
    type: 'expense',
    color: '#a21caf',
    icon: 'Wine',
    classification: 'personal',
    scope: 'PERSONAL',
    usageHint: 'Bar, balada, drinks, cigarro, festa'
  });
  upsert({
    id: 'cat_16',
    name: 'Lazer & Cultura',
    type: 'expense',
    color: '#fb7185',
    icon: 'Theater',
    classification: 'personal',
    scope: 'PERSONAL',
    usageHint: 'Cinema, teatro, museu, passeios'
  });
  upsert({
    id: 'cat_35',
    name: 'Hobby / Passatempo',
    type: 'expense',
    color: '#8b5cf6',
    icon: 'Gem',
    classification: 'personal',
    scope: 'PERSONAL',
    usageHint: 'Instrumento, artesanato, criação em casa'
  });
  upsert({
    id: 'cat_21',
    name: 'Combustível',
    type: 'expense',
    color: '#f59e0b',
    icon: 'Fuel',
    classification: 'essential',
    scope: 'PERSONAL',
    usageHint: 'Só abastecimento (gasolina/etanol)'
  });
  upsert({
    id: 'cat_34',
    name: 'Carro / Oficina',
    type: 'expense',
    color: '#ea580c',
    icon: 'CarFront',
    classification: 'essential',
    scope: 'PERSONAL',
    usageHint: 'Peças, mecânico, pneu, lavagem, pedágio'
  });
  upsert({
    id: 'cat_15',
    name: 'Assinaturas / Streaming',
    type: 'expense',
    color: '#f43f5e',
    icon: 'Tv',
    classification: 'personal',
    scope: 'PERSONAL',
    usageHint: 'Netflix, Spotify e afins'
  });
  upsert({
    id: 'cat_19',
    name: 'Jogos / Games',
    type: 'expense',
    color: '#4f46e5',
    icon: 'Gamepad2',
    classification: 'personal',
    scope: 'PERSONAL',
    usageHint: 'Steam, console, game pass'
  });

  return { categories: Array.from(byId.values()), changed };
}

export const PERSONAL_LIFESTYLE_CATEGORY_IDS = [
  'cat_5',
  'cat_22',
  'cat_28',
  'cat_16',
  'cat_35',
  'cat_9',
  'cat_15',
  'cat_17',
  'cat_18',
  'cat_19',
  'cat_23',
  'cat_20',
  'cat_29'
];

export const PERSONAL_ESSENTIAL_CATEGORY_IDS = [
  'cat_1',
  'cat_2',
  'cat_3',
  'cat_21',
  'cat_34',
  'cat_4',
  'cat_11',
  'cat_12',
  'cat_13',
  'cat_14',
  'cat_26',
  'cat_27',
  'cat_dividas'
];

/** Escopo sugerido sempre pessoal no app atual */
export const personalScope = (): ScopeType => 'PERSONAL';
