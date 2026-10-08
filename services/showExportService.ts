import { Show, Transaction, AppSettings } from '../types';
import { getShowFinancialSummary } from './showFinanceSyncService';
import { getShowDisplayHierarchy } from '../components/shows/types';

export interface ERPMusicianItem {
  nome: string;
  funcao: string;
  cache: number;
  status_pagamento: string;
  chave_pix?: string;
  observacoes?: string;
}

export interface ERPLogisticsItem {
  tipo: string;
  descricao: string;
  valor: number;
  km?: number;
  preco_km?: number;
  status_pagamento: string;
}

export interface ERPEquipmentItem {
  categoria: string;
  descricao: string;
  valor: number;
  status_pagamento: string;
}

export interface ERPShowExportItem {
  // Identificação Direta
  id: string;
  id_show: string;
  nome_evento_local: string;
  local_endereco: string;
  nome_contratante: string;
  telefone_contato: string;
  cidade: string;
  estado: string;
  tipo_evento: string;

  // Datas e Horários
  data_show: string;
  horario_inicio: string;
  horario_termino: string;
  duracao: string;

  // Financeiro
  cache_bruto: number;
  valor_combinado: number;
  valor_sinal_entrada: number;
  sinal_pago: boolean;
  cache_liquido: number;
  status_pagamento: 'Pendente' | 'Pago' | 'Sinal Pago';
  valor_total_recebido: number;
  valor_pendente: number;
  percentual_recebido: number;

  // Detalhamento de Custos
  custos_musicos_freelancers: ERPMusicianItem[];
  custo_musicos_total: number;
  custos_logistica: ERPLogisticsItem[];
  custo_logistica_total: number;
  custos_som_equipamentos: ERPEquipmentItem[];
  custo_som_equipamentos_total: number;
  custo_total_somado: number;

  // Status da Agenda
  status_agenda: 'Confirmado' | 'Realizado' | 'Orçamento/Lead';
  status_original: string;

  // Grupos estruturados para máxima facilidade de mapeamento no ERP
  identificacao: {
    id_show: string;
    nome_evento_local: string;
    local_endereco: string;
    nome_contratante: string;
    telefone_contato: string;
    cidade: string;
    estado: string;
    tipo_evento: string;
  };
  datas_e_horarios: {
    data_show: string;
    horario_inicio: string;
    horario_termino: string;
    duracao: string;
  };
  financeiro: {
    cache_bruto: number;
    valor_combinado: number;
    valor_sinal_entrada: number;
    sinal_pago: boolean;
    cache_liquido: number;
    status_pagamento: 'Pendente' | 'Pago' | 'Sinal Pago';
    valor_total_recebido: number;
    valor_pendente: number;
    percentual_recebido: number;
  };
  detalhamento_de_custos: {
    custos_com_musicos_freelancers: ERPMusicianItem[];
    subtotal_musicos: number;
    custos_de_logistica_combustivel_uber: ERPLogisticsItem[];
    subtotal_logistica: number;
    custos_de_som_equipamentos: ERPEquipmentItem[];
    subtotal_som_equipamentos: number;
    custo_total_somado: number;
  };

  // Preservação integral de todos os atributos e chaves originais (sem omissão)
  dados_completos_originais: Show;
  transacoes_financeiras_vinculadas: Transaction[];
}

export interface ERPExportPayload {
  versao_exportacao_erp: string;
  finalidade: string;
  data_geracao_iso: string;
  data_geracao_formatada: string;
  projeto_artista: string;
  total_shows_cadastrados: number;
  resumo_financeiro_global: {
    total_cache_bruto: number;
    total_custos_somados: number;
    total_cache_liquido: number;
    total_recebido: number;
    total_pendente: number;
    margem_lucro_global_percent: number;
  };
  distribuicao_por_status_agenda: {
    confirmados: number;
    realizados: number;
    orcamentos_leads: number;
    cancelados: number;
  };
  shows: ERPShowExportItem[];
}

/**
 * Extrai cidade e estado de strings de endereço ou campos de cidade.
 */
function extractCityAndState(cityStr?: string, locationStr?: string, defaultState = 'MG'): { cidade: string; estado: string } {
  const cleanCity = (cityStr || '').trim();
  const cleanLoc = (locationStr || '').trim();

  // Pattern: "Cidade - UF" ou "Cidade/UF" ou "Cidade, UF"
  const match = cleanCity.match(/^(.*?)(?:\s*[-/,]\s*([A-Za-z]{2}))$/);
  if (match) {
    return {
      cidade: match[1].trim(),
      estado: match[2].toUpperCase().trim()
    };
  }

  // Verifica se o endereço/local possui UF ao final (ex: "Cruzília, MG")
  const locMatch = cleanLoc.match(/(?:[-/,]|\bem\b)\s*([A-Za-z]{2})$/i);
  if (locMatch) {
    return {
      cidade: cleanCity || cleanLoc,
      estado: locMatch[1].toUpperCase().trim()
    };
  }

  // Se cidade possui apenas o nome
  if (cleanCity) {
    return {
      cidade: cleanCity,
      estado: defaultState
    };
  }

  return {
    cidade: cleanLoc || 'Não informada',
    estado: defaultState
  };
}

/**
 * Calcula duração formatada e horário de término se ausente.
 */
function resolveDurationAndEndTime(time?: string, endTime?: string, duration?: string, durationHours?: number) {
  const startTimeStr = (time || '20:00').trim();
  let endTimeStr = (endTime || '').trim();
  let duracaoStr = (duration || '').trim();

  if (durationHours && durationHours > 0) {
    duracaoStr = `${durationHours}h`;
  }

  if (startTimeStr && !endTimeStr && durationHours && durationHours > 0) {
    const parts = startTimeStr.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const endH = (h + Math.floor(durationHours)) % 24;
        const endM = (m + Math.round((durationHours % 1) * 60)) % 60;
        endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }
    }
  }

  if (!duracaoStr && startTimeStr && endTimeStr) {
    const sParts = startTimeStr.split(':');
    const eParts = endTimeStr.split(':');
    if (sParts.length >= 2 && eParts.length >= 2) {
      const sMins = parseInt(sParts[0], 10) * 60 + parseInt(sParts[1], 10);
      let eMins = parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10);
      if (eMins < sMins) eMins += 24 * 60; // atravessou meia-noite
      const diffMins = eMins - sMins;
      const hours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      duracaoStr = remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
    }
  }

  if (!duracaoStr) {
    duracaoStr = '3h (Padrão)';
  }

  if (!endTimeStr && startTimeStr) {
    const parts = startTimeStr.split(':');
    if (parts.length >= 2) {
      const h = (parseInt(parts[0], 10) + 3) % 24;
      endTimeStr = `${String(h).padStart(2, '0')}:${parts[1]}`;
    }
  }

  return {
    horarioInicio: startTimeStr,
    horarioTermino: endTimeStr,
    duracao: duracaoStr
  };
}

/**
 * Constrói a estrutura de migração completa e detalhada para ERP.
 */
export function buildShowsERPMigrationData(
  shows: Show[],
  transactions: Transaction[] = [],
  settings?: AppSettings
): ERPExportPayload {
  const safeShows = Array.isArray(shows) ? shows : [];
  const safeTxs = Array.isArray(transactions) ? transactions : [];

  const defaultState = (settings?.musicianCity?.match(/[A-Za-z]{2}$/)?.[0] || 'MG').toUpperCase();
  const projectName = settings?.careerProjectName || settings?.musicianArtisticName || 'Leo Ferreira';

  let totalGross = 0;
  let totalExpenses = 0;
  let totalNet = 0;
  let totalReceived = 0;
  let totalPending = 0;

  let countConfirmados = 0;
  let countRealizados = 0;
  let countOrcamentos = 0;
  let countCancelados = 0;

  const exportedShows: ERPShowExportItem[] = safeShows.map(show => {
    const summary = getShowFinancialSummary(show, safeTxs);
    const hierarchy = getShowDisplayHierarchy(show);
    const { cidade, estado } = extractCityAndState(show.city, show.location, defaultState);

    const { horarioInicio, horarioTermino, duracao } = resolveDurationAndEndTime(
      show.time,
      show.endTime,
      show.duration,
      show.showDurationHours || show.showHours
    );

    // 1. Identificação
    const id = show.id;
    const nomeEventoLocal = hierarchy.eventTitle || show.name || show.location || 'Show';
    const localEndereco = show.location || '';
    const nomeContratante = hierarchy.contractorNameOnly || show.contractorName || 'Não informado';
    const telefoneContato = show.contractorPhone || '';
    const tipoEvento = show.eventType || 'Show / Apresentação';

    // 2. Transações financeiras vinculadas
    const linkedTxs = safeTxs.filter(t => t.showId === show.id);

    // 3. Valor do Sinal / Entrada
    let valorSinal = 0;
    let sinalPago = false;

    // A partir de payments cadastrados no show
    if (Array.isArray(show.payments)) {
      show.payments.forEach(p => {
        const typeNorm = (p.type || '').toLowerCase();
        const noteNorm = (p.notes || '').toLowerCase();
        if (typeNorm.includes('sinal') || typeNorm.includes('entrada') || noteNorm.includes('sinal') || noteNorm.includes('entrada')) {
          const amt = Number(p.amount) || 0;
          valorSinal += amt;
          if (p.status === 'Recebido') {
            sinalPago = true;
          }
        }
      });
    }

    // A partir de receipts legados se houver
    if (Array.isArray(show.receipts)) {
      show.receipts.forEach(r => {
        if (r.type === 'Sinal') {
          const amt = Number(r.amount) || 0;
          valorSinal += amt;
          if (r.status === 'Recebido') {
            sinalPago = true;
          }
        }
      });
    }

    // A partir de transações vinculadas no extrato
    linkedTxs.forEach(t => {
      if (t.type === 'income' && t.status !== 'cancelled') {
        const desc = (t.description || '').toLowerCase();
        const isSinalTx = t.showPaymentType === 'Sinal' || desc.includes('sinal') || desc.includes('entrada');
        if (isSinalTx && valorSinal === 0) {
          valorSinal += Number(t.amount) || 0;
          if (t.status === 'paid') {
            sinalPago = true;
          }
        } else if (isSinalTx && t.status === 'paid') {
          sinalPago = true;
        }
      }
    });

    const cacheBruto = summary.realGrossCache;
    const cacheLiquido = summary.realNetProfit;

    // Status de Pagamento (Pendente, Pago, Sinal Pago)
    let statusPagamento: 'Pendente' | 'Pago' | 'Sinal Pago' = 'Pendente';
    if (summary.totalPending === 0 && cacheBruto > 0) {
      statusPagamento = 'Pago';
    } else if (show.status === 'Realizado' && summary.totalReceived >= cacheBruto) {
      statusPagamento = 'Pago';
    } else if ((valorSinal > 0 && sinalPago && summary.totalPending > 0) || (summary.totalReceived > 0 && summary.totalPending > 0)) {
      statusPagamento = 'Sinal Pago';
    } else {
      statusPagamento = 'Pendente';
    }

    // 4. Detalhamento de Custos com Músicos/Freelancers
    const musicosList: ERPMusicianItem[] = [];
    if (Array.isArray(show.crewMembers)) {
      show.crewMembers.forEach(m => {
        musicosList.push({
          nome: m.name || 'Músico Convidado',
          funcao: m.role || 'Músico / Apoio',
          cache: Number(m.cacheAmount) || 0,
          status_pagamento: m.status === 'paid' ? 'Pago' : 'Pendente',
          chave_pix: m.pixKey || '',
          observacoes: m.notes || ''
        });
      });
    }
    // Verificar se há despesas de músicos lançadas apenas em transações
    linkedTxs.forEach(tx => {
      if (tx.type === 'expense' && tx.status !== 'cancelled') {
        if (tx.costGroup === 'musicos' || tx.categoryId === 'cat_producao_shows' || tx.subcategory === 'Cachê de Terceiros / Equipe') {
          const alreadyInList = musicosList.some(m => m.nome.toLowerCase() === tx.description.toLowerCase());
          if (!alreadyInList && !tx.showExpenseId) {
            musicosList.push({
              nome: tx.description || 'Músico / Freelancer',
              funcao: 'Cachê de Terceiros / Equipe',
              cache: Number(tx.amount) || 0,
              status_pagamento: tx.status === 'paid' ? 'Pago' : 'Pendente'
            });
          }
        }
      }
    });

    // 5. Custos de Logística/Combustível/Uber
    const logisticaList: ERPLogisticsItem[] = [];
    if (Array.isArray(show.logistics)) {
      show.logistics.forEach(l => {
        const tipoLabel =
          l.type === 'fuel' ? 'Combustível' :
          l.type === 'toll' ? 'Pedágio' :
          l.type === 'lodging' ? 'Hospedagem' :
          l.type === 'uber' ? 'Uber / Deslocamento' :
          l.type === 'van' ? 'Van / Transporte' :
          l.type === 'parking' ? 'Estacionamento' : (l.type || 'Logística');

        logisticaList.push({
          tipo: tipoLabel,
          descricao: l.description || tipoLabel,
          valor: Number(l.amount) || 0,
          km: l.km,
          preco_km: l.pricePerKm,
          status_pagamento: l.status === 'paid' ? 'Pago' : 'Pendente'
        });
      });
    }
    // Incluir cálculo de combustível inteligente se houver valores calculados
    if (show.totalKm && show.totalKm > 0 && (!show.logistics || show.logistics.length === 0)) {
      const fuelCost = ((show.totalKm / (show.carKmPerLiter || 10)) * (show.fuelPricePerLiter || 5.89)) + (show.tollAmount || show.tollCost || 0);
      if (fuelCost > 0) {
        logisticaList.push({
          tipo: 'Combustível / Veículo Próprio',
          descricao: `Deslocamento ida e volta (${show.totalKm} KM)`,
          valor: Math.round(fuelCost * 100) / 100,
          km: show.totalKm,
          status_pagamento: 'Calculado'
        });
      }
    }
    // Transações de logística avulsas
    linkedTxs.forEach(tx => {
      if (tx.type === 'expense' && tx.status !== 'cancelled') {
        if (tx.costGroup === 'logistica' || tx.categoryId === 'cat_logistica_shows') {
          const already = logisticaList.some(l => l.descricao.toLowerCase() === tx.description.toLowerCase());
          if (!already && !tx.showExpenseId) {
            logisticaList.push({
              tipo: tx.subcategory || 'Deslocamento / Logística',
              descricao: tx.description || 'Logística',
              valor: Number(tx.amount) || 0,
              status_pagamento: tx.status === 'paid' ? 'Pago' : 'Pendente'
            });
          }
        }
      }
    });

    // 6. Custos de Som/Equipamentos
    const equipamentosList: ERPEquipmentItem[] = [];
    if (Array.isArray(show.otherExpenses)) {
      show.otherExpenses.forEach(o => {
        equipamentosList.push({
          categoria: o.category || 'Equipamentos / Som',
          descricao: o.description || o.category || 'Despesa de Som',
          valor: Number(o.amount) || 0,
          status_pagamento: o.status === 'paid' ? 'Pago' : 'Pendente'
        });
      });
    }
    if (Array.isArray(show.expenseItems)) {
      show.expenseItems.forEach(ei => {
        if (ei.costGroup === 'equipamentos' || ei.category === 'Aluguel' || ei.category === 'Manutenção' || ei.category === 'Insumos do Show') {
          equipamentosList.push({
            categoria: ei.category || 'Equipamentos',
            descricao: ei.notes || ei.category || 'Equipamento / Som',
            valor: Number(ei.amount) || 0,
            status_pagamento: ei.status === 'paid' ? 'Pago' : 'Pendente'
          });
        }
      });
    }
    if (show.equipmentReserveAmount && show.equipmentReserveAmount > 0) {
      equipamentosList.push({
        categoria: 'Fundo de Reserva / Manutenção',
        descricao: 'Provisão para depreciação e manutenção de instrumentos/PA',
        valor: Number(show.equipmentReserveAmount),
        status_pagamento: 'Reservado'
      });
    }
    linkedTxs.forEach(tx => {
      if (tx.type === 'expense' && tx.status !== 'cancelled') {
        if (tx.costGroup === 'equipamentos' || tx.categoryId === 'cat_equipamentos') {
          const already = equipamentosList.some(e => e.descricao.toLowerCase() === tx.description.toLowerCase());
          if (!already && !tx.showExpenseId) {
            equipamentosList.push({
              categoria: tx.subcategory || 'Equipamentos / Som',
              descricao: tx.description || 'Equipamento',
              valor: Number(tx.amount) || 0,
              status_pagamento: tx.status === 'paid' ? 'Pago' : 'Pendente'
            });
          }
        }
      }
    });

    // 7. Status da Agenda: Confirmado, Realizado ou Orçamento/Lead
    let statusAgenda: 'Confirmado' | 'Realizado' | 'Orçamento/Lead' = 'Confirmado';
    if (show.status === 'Realizado') {
      statusAgenda = 'Realizado';
      countRealizados++;
    } else if (show.status === 'Confirmado') {
      statusAgenda = 'Confirmado';
      countConfirmados++;
    } else if (show.status === 'Cancelado') {
      statusAgenda = 'Orçamento/Lead'; // Classificado na estrutura do ERP
      countCancelados++;
    } else {
      // 'Orçamento', 'Aguardando confirmação', 'Agendado'
      statusAgenda = 'Orçamento/Lead';
      countOrcamentos++;
    }

    const custoMusicos = summary.crewExpenses || musicosList.reduce((acc, m) => acc + m.cache, 0);
    const custoLogistica = summary.logisticsExpenses || logisticaList.reduce((acc, l) => acc + l.valor, 0);
    const custoEquipamentos = summary.equipmentExpenses || equipamentosList.reduce((acc, e) => acc + e.valor, 0);
    const custoTotalSomado = summary.totalExpenses;

    // Atualização dos totais gerais
    totalGross += cacheBruto;
    totalExpenses += custoTotalSomado;
    totalNet += cacheLiquido;
    totalReceived += summary.totalReceived;
    totalPending += summary.totalPending;

    return {
      // Chaves Diretas no Topo
      id: show.id,
      id_show: show.id,
      nome_evento_local: nomeEventoLocal,
      local_endereco: localEndereco,
      nome_contratante: nomeContratante,
      telefone_contato: telefoneContato,
      cidade: cidade,
      estado: estado,
      tipo_evento: tipoEvento,

      data_show: show.date,
      horario_inicio: horarioInicio,
      horario_termino: horarioTermino,
      duracao: duracao,

      cache_bruto: cacheBruto,
      valor_combinado: cacheBruto,
      valor_sinal_entrada: valorSinal,
      sinal_pago: sinalPago,
      cache_liquido: cacheLiquido,
      status_pagamento: statusPagamento,
      valor_total_recebido: summary.totalReceived,
      valor_pendente: summary.totalPending,
      percentual_recebido: summary.percentReceived,

      custos_musicos_freelancers: musicosList,
      custo_musicos_total: custoMusicos,
      custos_logistica: logisticaList,
      custo_logistica_total: custoLogistica,
      custos_som_equipamentos: equipamentosList,
      custo_som_equipamentos_total: custoEquipamentos,
      custo_total_somado: custoTotalSomado,

      status_agenda: statusAgenda,
      status_original: show.status,

      // Grupos estruturados para importação facilitada em qualquer ERP
      identificacao: {
        id_show: show.id,
        nome_evento_local: nomeEventoLocal,
        local_endereco: localEndereco,
        nome_contratante: nomeContratante,
        telefone_contato: telefoneContato,
        cidade: cidade,
        estado: estado,
        tipo_evento: tipoEvento
      },
      datas_e_horarios: {
        data_show: show.date,
        horario_inicio: horarioInicio,
        horario_termino: horarioTermino,
        duracao: duracao
      },
      financeiro: {
        cache_bruto: cacheBruto,
        valor_combinado: cacheBruto,
        valor_sinal_entrada: valorSinal,
        sinal_pago: sinalPago,
        cache_liquido: cacheLiquido,
        status_pagamento: statusPagamento,
        valor_total_recebido: summary.totalReceived,
        valor_pendente: summary.totalPending,
        percentual_recebido: summary.percentReceived
      },
      detalhamento_de_custos: {
        custos_com_musicos_freelancers: musicosList,
        subtotal_musicos: custoMusicos,
        custos_de_logistica_combustivel_uber: logisticaList,
        subtotal_logistica: custoLogistica,
        custos_de_som_equipamentos: equipamentosList,
        subtotal_som_equipamentos: custoEquipamentos,
        custo_total_somado: custoTotalSomado
      },

      // Dados integrais sem omissão
      dados_completos_originais: { ...show },
      transacoes_financeiras_vinculadas: linkedTxs
    };
  });

  const now = new Date();

  return {
    versao_exportacao_erp: '2.0.0-migracao-completa',
    finalidade: 'Migração de Dados de Shows e Apresentações Musicais para Sistema ERP',
    data_geracao_iso: now.toISOString(),
    data_geracao_formatada: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    projeto_artista: projectName,
    total_shows_cadastrados: exportedShows.length,
    resumo_financeiro_global: {
      total_cache_bruto: Math.round(totalGross * 100) / 100,
      total_custos_somados: Math.round(totalExpenses * 100) / 100,
      total_cache_liquido: Math.round(totalNet * 100) / 100,
      total_recebido: Math.round(totalReceived * 100) / 100,
      total_pendente: Math.round(totalPending * 100) / 100,
      margem_lucro_global_percent: totalGross > 0 ? Math.round((totalNet / totalGross) * 1000) / 10 : 0
    },
    distribuicao_por_status_agenda: {
      confirmados: countConfirmados,
      realizados: countRealizados,
      orcamentos_leads: countOrcamentos,
      cancelados: countCancelados
    },
    shows: exportedShows
  };
}

/**
 * Dispara o download automático do arquivo 'shows_migracao_leo_ferreira.json'.
 */
export function downloadShowsERPMigrationJSON(
  shows: Show[],
  transactions: Transaction[] = [],
  settings?: AppSettings
): ERPExportPayload {
  const exportPayload = buildShowsERPMigrationData(shows, transactions, settings);
  const jsonContent = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'shows_migracao_leo_ferreira.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return exportPayload;
}
