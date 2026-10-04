import { Show, ShowStatus } from '../../types';

export interface ShowDisplayHierarchy {
  eventTitle: string;
  contractorSubtitle: string;
  contractorNameOnly: string;
  cityTag: string;
}

/**
 * Padroniza estritamente a hierarquia de exibição dos cards e fichas de show:
 * 1. TÍTULO PRINCIPAL: Nome do Evento / Casa (ex: "Show Haras Casa Velha")
 * 2. SUBTÍTULO: Nome do Contratante / Cliente (ex: "Contratante: LSA Tecnologia")
 * 3. TAG/CIDADE: Cidade e Estado (ex: "Cruzília - MG")
 */
export const getShowDisplayHierarchy = (show?: Partial<Show> | null): ShowDisplayHierarchy => {
  if (!show) {
    return {
      eventTitle: 'Evento / Show',
      contractorSubtitle: 'Contratante: Não informado',
      contractorNameOnly: 'Não informado',
      cityTag: 'Cidade a definir'
    };
  }

  const rawName = (show.name || '').trim();
  const rawContractor = (show.contractorName || '').trim();
  const rawLocation = (show.location || '').trim();
  const rawCity = (show.city || '').trim();

  const isValidLocation =
    rawLocation !== '' &&
    rawLocation.toLowerCase() !== 'a definir' &&
    rawLocation.toLowerCase() !== 'local a definir';

  const isGenericName =
    rawName === '' ||
    rawName.toLowerCase() === 'show' ||
    rawName.toLowerCase() === 'evento';

  // Se name for igual ao contractorName, mas houver um location válido diferente, o location era o nome da casa/evento
  let eventTitle = '';
  if (!isGenericName) {
    if (rawName === rawContractor && isValidLocation && rawLocation !== rawContractor) {
      eventTitle = rawLocation;
    } else {
      eventTitle = rawName;
    }
  } else if (isValidLocation) {
    eventTitle = rawLocation;
  } else if (rawContractor) {
    eventTitle = `Show ${rawContractor}`;
  } else {
    eventTitle = 'Show / Evento';
  }

  const contractorNameOnly = rawContractor || (!isGenericName ? rawName : 'Não informado');
  const contractorSubtitle = `Contratante: ${contractorNameOnly}`;
  const cityTag = rawCity || 'Cidade a definir';

  return {
    eventTitle,
    contractorSubtitle,
    contractorNameOnly,
    cityTag
  };
};

export const EVENT_TYPES = [
  'Casamento',
  'Aniversário / Festa Privada',
  'Bar / Restaurante / Pub',
  'Evento Corporativo',
  'Festival / Prefeitura / Público',
  'Formatura',
  'Bodas / Celebração',
  'Outro'
];

export const SHOW_STATUSES: { value: ShowStatus; label: string; color: string; badgeClass: string; dotClass: string }[] = [
  { 
    value: 'Confirmado', 
    label: 'Confirmado', 
    color: '#10b981',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dotClass: 'bg-emerald-500'
  },
  { 
    value: 'Aguardando confirmação', 
    label: 'Aguardando confirmação', 
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-500'
  },
  { 
    value: 'Orçamento', 
    label: 'Orçamento', 
    color: '#0ea5e9',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    dotClass: 'bg-sky-500'
  },
  { 
    value: 'Realizado', 
    label: 'Realizado', 
    color: '#8b5cf6',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    dotClass: 'bg-purple-500'
  },
  { 
    value: 'Cancelado', 
    label: 'Cancelado', 
    color: '#f43f5e',
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
    dotClass: 'bg-rose-500'
  }
];

export const getStatusConfig = (status?: string) => {
  // Normalize legacy status 'Agendado' to 'Aguardando confirmação' or find match
  if (status === 'Agendado') {
    return SHOW_STATUSES[1];
  }
  const found = SHOW_STATUSES.find(s => s.value === status);
  return found || SHOW_STATUSES[0];
};
