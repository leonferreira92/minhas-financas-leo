import { Show } from '../../types';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';

export interface ShowSmartAlert {
  id: string;
  type: 'conflict' | 'upcoming_today' | 'upcoming_soon' | 'payment_pending' | 'missing_info' | 'financial_discrepancy';
  severity: 'high' | 'medium' | 'info';
  title: string;
  description: string;
  showId?: string;
  showName?: string;
  actionLabel?: string;
}

/**
 * Analisa a lista de shows e pagamentos para gerar alertas inteligentes e concisos
 * Sem excesso de notificações, priorizando o que realmente requer atenção no dia a dia.
 */
export function generateShowSmartAlerts(shows: Show[]): ShowSmartAlert[] {
  const alerts: ShowSmartAlert[] = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(val) ? 0 : val);
  };

  const formatShortDate = (dStr?: string) => {
    if (!dStr) return '';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    } catch {}
    return dStr;
  };

  // 1. CONFLITOS DE HORÁRIO ENTRE SHOWS CONFIRMADOS NO MESMO DIA
  const confirmedShowsByDate: Record<string, Show[]> = {};
  shows.filter(s => s.status === 'Confirmado' && s.date).forEach(s => {
    if (!confirmedShowsByDate[s.date]) confirmedShowsByDate[s.date] = [];
    confirmedShowsByDate[s.date].push(s);
  });

  Object.entries(confirmedShowsByDate).forEach(([dateStr, dayShows]) => {
    if (dayShows.length > 1) {
      for (let i = 0; i < dayShows.length; i++) {
        for (let j = i + 1; j < dayShows.length; j++) {
          const s1 = dayShows[i];
          const s2 = dayShows[j];
          
          const parseTime = (t?: string) => {
            if (!t) return 1200; // 20:00 default
            const parts = t.split(':').map(Number);
            return (isNaN(parts[0]) ? 20 : parts[0]) * 60 + (isNaN(parts[1]) ? 0 : parts[1]);
          };

          const start1 = parseTime(s1.time);
          let end1 = s1.endTime ? parseTime(s1.endTime) : start1 + 180;
          if (end1 < start1) end1 += 1440;

          const start2 = parseTime(s2.time);
          let end2 = s2.endTime ? parseTime(s2.endTime) : start2 + 180;
          if (end2 < start2) end2 += 1440;

          if (start1 < end2 && end1 > start2) {
            alerts.push({
              id: `conflict_${s1.id}_${s2.id}`,
              type: 'conflict',
              severity: 'high',
              title: `Conflito de agenda em ${formatShortDate(dateStr)}`,
              description: `Sobreposição entre "${s1.contractorName || s1.name}" (${s1.time || '20:00'}) e "${s2.contractorName || s2.name}" (${s2.time || '20:00'}).`,
              showId: s1.id,
              showName: s1.contractorName || s1.name,
              actionLabel: 'Ver Conflito'
            });
          }
        }
      }
    }
  });

  // 2. SHOW CONFIRMADO PRÓXIMO (HOJE OU AMANHÃ)
  const upcomingConfirmed = shows
    .filter(s => s.status === 'Confirmado' && s.date && s.date >= todayStr)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));

  if (upcomingConfirmed.length > 0) {
    const nextShow = upcomingConfirmed[0];
    try {
      const targetDate = new Date(nextShow.date + 'T12:00:00');
      targetDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        alerts.push({
          id: `upcoming_today_${nextShow.id}`,
          type: 'upcoming_today',
          severity: 'high',
          title: `Show Hoje às ${nextShow.time || '20:00'}!`,
          description: `${nextShow.contractorName || nextShow.name} ${nextShow.city ? `em ${nextShow.city}` : ''}${nextShow.location ? ` (${nextShow.location})` : ''}.`,
          showId: nextShow.id,
          showName: nextShow.contractorName || nextShow.name,
          actionLabel: 'Ver Show'
        });
      } else if (diffDays === 1) {
        alerts.push({
          id: `upcoming_soon_${nextShow.id}`,
          type: 'upcoming_soon',
          severity: 'medium',
          title: `Show Amanhã: ${nextShow.contractorName || nextShow.name}`,
          description: `Horário: ${nextShow.time || '20:00'} ${nextShow.city ? `• ${nextShow.city}` : ''}.`,
          showId: nextShow.id,
          showName: nextShow.contractorName || nextShow.name,
          actionLabel: 'Ver Show'
        });
      }
    } catch {}
  }

  // 3. PAGAMENTOS PENDENTES VENCENDO OU ATRASADOS
  shows.forEach(show => {
    if (show.status === 'Confirmado' || show.status === 'Realizado') {
      const payments = show.payments || [];
      payments.forEach(p => {
        if (p.status === 'Agendado' && p.expectedDate) {
          try {
            const pDate = new Date(p.expectedDate + 'T12:00:00');
            pDate.setHours(0, 0, 0, 0);
            const pDiff = Math.round((pDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (pDiff < 0) {
              alerts.push({
                id: `payment_overdue_${p.id}`,
                type: 'payment_pending',
                severity: 'high',
                title: `Pagamento pendente: ${show.contractorName || show.name}`,
                description: `${p.type || 'Parcela'} de ${formatCurrency(Number(p.amount) || 0)} prevista para ${formatShortDate(p.expectedDate)} ainda não recebida.`,
                showId: show.id,
                showName: show.contractorName || show.name,
                actionLabel: 'Ver Pagamento'
              });
            } else if (pDiff === 0 || pDiff === 1) {
              alerts.push({
                id: `payment_due_soon_${p.id}`,
                type: 'payment_pending',
                severity: 'medium',
                title: `Recebimento ${pDiff === 0 ? 'hoje' : 'amanhã'} (${show.contractorName || show.name})`,
                description: `${formatCurrency(Number(p.amount) || 0)} (${p.type || 'Parcela'}) previsto para ${formatShortDate(p.expectedDate)}.`,
                showId: show.id,
                showName: show.contractorName || show.name,
                actionLabel: 'Ver Pagamento'
              });
            }
          } catch {}
        }
      });
    }
  });

  // 4. SHOWS CONFIRMADOS SEM INFORMAÇÕES ESSENCIAIS (SEM CIDADE/LOCAL OU SEM HORÁRIO)
  shows.filter(s => s.status === 'Confirmado' && s.date && s.date >= todayStr).forEach(s => {
    const isMissingCityOrLocation = !s.city && !s.location;
    const isMissingTime = !s.time;

    if (isMissingCityOrLocation) {
      alerts.push({
        id: `missing_location_${s.id}`,
        type: 'missing_info',
        severity: 'info',
        title: `Local não informado: ${s.contractorName || s.name}`,
        description: `Show em ${formatShortDate(s.date)} ainda não possui cidade ou endereço cadastrado.`,
        showId: s.id,
        showName: s.contractorName || s.name,
        actionLabel: 'Completar'
      });
    } else if (isMissingTime) {
      alerts.push({
        id: `missing_time_${s.id}`,
        type: 'missing_info',
        severity: 'info',
        title: `Horário não definido: ${s.contractorName || s.name}`,
        description: `Show em ${formatShortDate(s.date)} está sem horário de início definido.`,
        showId: s.id,
        showName: s.contractorName || s.name,
        actionLabel: 'Definir'
      });
    }
  });

  // 5. DISCREPÂNCIA FINANCEIRA NO SHOW (Cachê contratado diferente da soma dos pagamentos)
  shows.filter(s => s.status === 'Confirmado' && s.date && s.date >= todayStr).forEach(s => {
    const fin = getShowFinancialSummary(s);
    if (fin.isOverTotal) {
      alerts.push({
        id: `discrepancy_over_${s.id}`,
        type: 'financial_discrepancy',
        severity: 'medium',
        title: `Pagamentos ultrapassam cachê (${s.contractorName || s.name})`,
        description: `A soma das parcelas excede o cachê em ${formatCurrency(fin.excessAmount)}.`,
        showId: s.id,
        showName: s.contractorName || s.name,
        actionLabel: 'Ajustar'
      });
    } else if (fin.remainingToSchedule > 0 && (s.payments && s.payments.length > 0)) {
      alerts.push({
        id: `discrepancy_remaining_${s.id}`,
        type: 'financial_discrepancy',
        severity: 'info',
        title: `Falta agendar restante (${s.contractorName || s.name})`,
        description: `${formatCurrency(fin.remainingToSchedule)} do cachê ainda não foram parcelados.`,
        showId: s.id,
        showName: s.contractorName || s.name,
        actionLabel: 'Agendar'
      });
    }
  });

  // Ordenar por severidade (high -> medium -> info)
  const severityRank: Record<string, number> = { high: 1, medium: 2, info: 3 };
  return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
