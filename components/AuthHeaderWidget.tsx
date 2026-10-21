import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { LogIn, LogOut, Cloud, CloudOff, Sparkles, RefreshCw, CheckCircle2, Database } from 'lucide-react';

export const AuthHeaderWidget: React.FC = () => {
  const { currentUser, isAuthLoading, isDemoMode, exitDemoMode, signInWithGoogle, logoutUser, consolidateToDefaultDatabase } = useFinance();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualConsolidation = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await consolidateToDefaultDatabase();
      setSyncFeedback(result.message || 'Sincronizado no banco (default)!');
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (e) {
      setSyncFeedback('Erro ao sincronizar.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 animate-pulse text-xs text-slate-500 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-slate-200" />
          <span>Conectando ao banco de dados (default)...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700">
      {currentUser ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            {currentUser.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || 'Usuário'} 
                className="w-8 h-8 rounded-full border border-blue-900/30 shrink-0" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-900 text-yellow-400 font-extrabold flex items-center justify-center shrink-0 text-xs shadow-sm">
                {currentUser.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="font-extrabold text-slate-900 truncate max-w-[150px] sm:max-w-[200px]">
                  {currentUser.displayName || currentUser.email}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase flex items-center space-x-1 border border-emerald-200 shrink-0">
                  <Database size={11} className="text-emerald-600" />
                  <span>Banco (default)</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{currentUser.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
            {syncFeedback ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>{syncFeedback}</span>
              </span>
            ) : (
              <button
                onClick={handleManualConsolidation}
                disabled={isSyncing}
                className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center space-x-1.5 border border-slate-300 disabled:opacity-50"
                title="Consolidar e enviar todas as transações para o banco (default)"
              >
                <RefreshCw size={12} className={isSyncing ? 'animate-spin text-blue-900' : 'text-slate-600'} />
                <span>{isSyncing ? 'Consolidando...' : 'Sincronizar (default)'}</span>
              </button>
            )}

            <button
              onClick={() => logoutUser()}
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition flex items-center space-x-1 text-[11px] font-semibold"
              title="Encerrar Sessão"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      ) : isDemoMode ? (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-yellow-100 text-yellow-800 border border-yellow-300">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <p className="font-extrabold text-slate-900 text-xs">Modo Demonstração</p>
                <span className="text-[9px] bg-yellow-200 text-yellow-900 font-black uppercase px-1.5 py-0.2 rounded">
                  Visitante
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Dados de teste em memória local</p>
            </div>
          </div>

          <button
            onClick={() => exitDemoMode()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-300 flex items-center space-x-1 shrink-0 active:scale-95"
            title="Encerrar Modo Demonstração e ir para o Login"
          >
            <LogOut size={13} />
            <span>Sair da Demo</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <CloudOff size={16} />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-xs">Desconectado da Nuvem</p>
              <p className="text-[11px] text-slate-500">Conecte sua conta para direcionar tudo ao banco (default)</p>
            </div>
          </div>

          <button
            onClick={() => signInWithGoogle()}
            className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 shrink-0 active:scale-95"
          >
            <LogIn size={14} strokeWidth={2.5} />
            <span>Entrar com Google</span>
          </button>
        </div>
      )}
    </div>
  );
};
