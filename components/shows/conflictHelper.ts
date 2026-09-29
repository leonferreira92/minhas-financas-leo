import { Show } from '../../types';

export interface ConflictResult {
  hasConflict: boolean;
  conflictingShow?: Show;
  message?: string;
}

export function checkScheduleConflict(
  shows: Show[],
  newDate: string,
  newStartTime: string,
  newEndTime: string | undefined,
  currentShowId?: string
): ConflictResult {
  if (!newDate) return { hasConflict: false };

  // Only check other confirmed shows on the same date
  const confirmedShowsOnSameDate = shows.filter(
    s => s.id !== currentShowId && 
         s.date === newDate && 
         (s.status === 'Confirmado')
  );

  if (confirmedShowsOnSameDate.length === 0) {
    return { hasConflict: false };
  }

  // Parse time (HH:MM -> minutes from midnight)
  const parseTimeToMinutes = (t: string): number => {
    if (!t) return 1200; // default 20:00
    const parts = t.split(':').map(Number);
    const h = isNaN(parts[0]) ? 20 : parts[0];
    const m = isNaN(parts[1]) ? 0 : parts[1];
    return h * 60 + m;
  };

  const startA = parseTimeToMinutes(newStartTime || '20:00');
  // If no end time, default to 3 hours show window
  let endA = newEndTime ? parseTimeToMinutes(newEndTime) : startA + 180;
  if (endA < startA) endA += 1440; // overnight show (e.g. 23:00 to 02:00)

  for (const s of confirmedShowsOnSameDate) {
    const startB = parseTimeToMinutes(s.time || '20:00');
    let endB = s.endTime ? parseTimeToMinutes(s.endTime) : startB + 180;
    if (endB < startB) endB += 1440;

    // Overlap condition
    if (startA < endB && endA > startB) {
      const showName = s.contractorName || s.name || 'Show';
      const showCity = s.city || s.location || 'Local a definir';
      
      const formatTimeOnly = (tStr: string) => {
        if (!tStr) return '';
        const [h, m] = tStr.split(':');
        return m === '00' ? `${parseInt(h, 10)}h` : `${parseInt(h, 10)}h${m}`;
      };

      const startBStr = formatTimeOnly(s.time || '20:00');
      const endBStr = s.endTime ? formatTimeOnly(s.endTime) : `${parseTimeToMinutes(s.time || '20:00') / 60 + 3}h`;
      const timeRange = s.endTime ? `${startBStr} às ${endBStr}` : `${startBStr}`;

      const [year, month, day] = s.date.split('-');
      const formattedDate = `${day}/${month}`;

      return {
        hasConflict: true,
        conflictingShow: s,
        message: `⚠️ Existe outro show confirmado neste período:\n${formattedDate} — ${showName} — ${timeRange} — ${showCity}.`
      };
    }
  }

  return { hasConflict: false };
}
