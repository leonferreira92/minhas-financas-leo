import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { auth, app } from '../src/firebase/config';
import { Show } from '../types';

export { auth };

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Calendar');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// --- GOOGLE CALENDAR REST API CALLS ---

export const fetchCalendarEvents = async (timeMin?: string, timeMax?: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Usuário não autenticado no Google');

  const now = new Date();
  const defaultMin = timeMin || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const defaultMax = timeMax || new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.append('timeMin', defaultMin);
  url.searchParams.append('timeMax', defaultMax);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || 'Erro ao buscar eventos do Google Calendar');
  }

  const data = await response.json();
  return data.items || [];
};

export const syncShowToGoogleCalendar = async (show: Show): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Conecte sua conta do Google para sincronizar com a agenda');

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  const showDate = show.date || new Date().toISOString().split('T')[0];
  const startTimeStr = show.time || '20:00';
  const endTimeStr = show.endTime || '23:00';

  const startDateTime = `${showDate}T${startTimeStr.length === 5 ? startTimeStr + ':00' : startTimeStr}`;
  const endDateTime = `${showDate}T${endTimeStr.length === 5 ? endTimeStr + ':00' : endTimeStr}`;

  const eventPayload = {
    summary: `🎵 Show: ${show.name || 'Apresentação'}`,
    location: show.location || show.city || '',
    description: `Contratante: ${show.contractorName || 'Não especificado'}\nTelefone: ${show.contractorPhone || 'N/A'}\nCachê Total: R$ ${show.totalCache || 0}\nStatus: ${show.status}\nObservações: ${show.notes || ''}`,
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone,
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
      timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 24 * 60 }, // 1 dia antes
        { method: 'popup', minutes: 120 },     // 2 horas antes
      ],
    },
  };

  let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  let method = 'POST';

  if (show.googleCalendarEventId) {
    url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${show.googleCalendarEventId}`;
    method = 'PUT';
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || 'Erro ao salvar evento no Google Calendar');
  }

  const resultData = await response.json();
  return resultData.id;
};

export const deleteGoogleCalendarEvent = async (eventId: string) => {
  const token = await getAccessToken();
  if (!token) throw new Error('Sessão expirada do Google');

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json();
    throw new Error(errorData?.error?.message || 'Erro ao remover evento do Google Calendar');
  }
};
