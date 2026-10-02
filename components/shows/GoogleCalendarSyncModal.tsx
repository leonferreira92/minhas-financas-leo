import React, { useState, useEffect } from 'react';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  syncShowToGoogleCalendar, 
  fetchCalendarEvents 
} from '../../services/googleCalendarService';
import { Show } from '../../types';
import { Calendar, CheckCircle2, RefreshCw, LogOut, ArrowDown, ArrowUpRight, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  shows: Show[];
  onUpdateShow: (show: Show) => void;
  onImportShow?: (newShow: Partial<Show>) => void;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  shows,
  onUpdateShow,
  onImportShow,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [importedEvents, setImportedEvents] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsLoading(true);
    setSyncStatus(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setSyncStatus('Conectado com sucesso ao Google Calendar!');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setSyncStatus(`Erro ao conectar: ${error.message || 'Falha na autenticação'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setSyncStatus('Sessão encerrada.');
  };

  const handleSyncAllShows = async () => {
    if (!token) {
      setSyncStatus('Por favor, conecte sua conta do Google antes de sincronizar.');
      return;
    }

    setIsLoading(true);
    setSyncStatus('Sincronizando shows com a agenda do Google...');
    let successCount = 0;
    let failCount = 0;

    const activeShows = shows.filter(s => s.status !== 'Cancelado');

    for (const show of activeShows) {
      try {
        const eventId = await syncShowToGoogleCalendar(show);
        if (eventId && eventId !== show.googleCalendarEventId) {
          onUpdateShow({ ...show, googleCalendarEventId: eventId });
        }
        successCount++;
      } catch (err) {
        console.error(`Erro ao sincronizar show ${show.name}:`, err);
        failCount++;
      }
    }

    setIsLoading(false);
    setSyncStatus(`Concluído! ${successCount} show(s) sincronizado(s) com o Google Calendar.${failCount > 0 ? ` (${failCount} falharam)` : ''}`);
  };

  const handleFetchCalendarEvents = async () => {
    if (!token) return;
    setIsLoading(true);
    setSyncStatus('Buscando compromissos da sua agenda...');
    try {
      const events = await fetchCalendarEvents();
      setImportedEvents(events);
      setSyncStatus(`${events.length} evento(s) encontrado(s) no seu Google Calendar.`);
    } catch (err: any) {
      setSyncStatus(`Erro ao buscar eventos: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#18181b] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 text-zinc-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* HEADER */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-[#1ed760] border border-emerald-500/20">
            <Calendar size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Google Calendar Sync</h2>
            <p className="text-xs text-zinc-400">Sincronize seus shows e datas com sua conta do Google</p>
          </div>
        </div>

        {/* AUTH STATUS CARD */}
        <div className="bg-[#121212] border border-zinc-800/80 rounded-2xl p-4 mb-6">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Google User'} className="w-10 h-10 rounded-full border border-emerald-500/40" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-[#1ed760] flex items-center justify-center font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-bold text-white">{user.displayName || 'Usuário Google'}</span>
                    <ShieldCheck size={14} className="text-[#1ed760]" />
                  </div>
                  <p className="text-xs text-zinc-400 truncate max-w-[200px]">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center space-x-1"
              >
                <LogOut size={14} />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-2 space-y-3">
              <p className="text-xs text-zinc-300">
                Conecte sua conta do Google para enviar e atualizar seus compromissos e shows com permissão diretamente no seu Google Calendar.
              </p>
              
              {/* GOOGLE SIGN IN BUTTON STYLED */}
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-2xl transition-all shadow-md flex items-center justify-center space-x-3 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span className="text-sm">Entrar com o Google</span>
              </button>
            </div>
          )}
        </div>

        {/* STATUS MESSAGES */}
        {syncStatus && (
          <div className="mb-4 p-3 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-xs text-zinc-200 flex items-center space-x-2">
            <AlertCircle size={16} className="text-[#1ed760] shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* ACTIONS */}
        {user && (
          <div className="space-y-3 mb-6">
            <button
              onClick={handleSyncAllShows}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#1ed760] hover:bg-[#1fdf64] text-zinc-950 font-extrabold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              <span>Sincronizar {shows.length} Show(s) com o Google Calendar</span>
            </button>

            <button
              onClick={handleFetchCalendarEvents}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all border border-zinc-700/60 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 text-xs"
            >
              <ArrowDown size={16} />
              <span>Ver Compromissos da Agenda do Google</span>
            </button>
          </div>
        )}

        {/* CALENDAR EVENTS LIST */}
        {importedEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Eventos Recentes na Agenda ({importedEvents.length})
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {importedEvents.slice(0, 5).map((evt: any) => (
                <div key={evt.id} className="p-2.5 bg-[#121212] rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white truncate max-w-[220px]">{evt.summary || 'Sem título'}</p>
                    <p className="text-[10px] text-zinc-400">
                      {evt.start?.dateTime ? new Date(evt.start.dateTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : evt.start?.date}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[#1ed760] text-[10px] font-bold">
                    Agenda
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500">
          Integração oficial Google Calendar com permissão explícita do usuário.
        </div>
      </div>
    </div>
  );
};
