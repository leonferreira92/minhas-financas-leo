import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ShieldCheck, LogIn, LogOut, Cloud, CloudOff, User, Sparkles } from 'lucide-react';

export const AuthHeaderWidget: React.FC = () => {
  const { currentUser, isAuthLoading, signInWithGoogle, logoutUser } = useFinance();
  const [isSyncing, setIsSyncing] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#18181b] border border-zinc-800 animate-pulse text-xs text-zinc-400">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-zinc-800" />
          <span>Verificando sincronização...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-2xl bg-[#18181b] border border-zinc-800/80 shadow-sm flex items-center justify-between text-xs text-zinc-300">
      {currentUser ? (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2.5 min-w-0">
            {currentUser.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || 'Usuário'} 
                className="w-7 h-7 rounded-full border border-emerald-500/40 shrink-0" 
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-[#1ed760] font-bold flex items-center justify-center shrink-0">
                {currentUser.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                  {currentUser.displayName || currentUser.email}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-[#1ed760] text-[9px] font-black uppercase flex items-center space-x-0.5 border border-emerald-500/20 shrink-0">
                  <Cloud size={10} className="mr-0.5" />
                  <span>Nuvem Ativa</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate max-w-[180px]">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={() => logoutUser()}
            className="p-1.5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 rounded-xl transition flex items-center space-x-1 text-[11px] font-semibold shrink-0"
            title="Encerrar Sessão"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CloudOff size={15} />
            </div>
            <div>
              <p className="font-bold text-white text-[11px]">Modo Convidado / Local</p>
              <p className="text-[10px] text-zinc-400">Faça login para salvar seus dados em nuvem</p>
            </div>
          </div>

          <button
            onClick={() => signInWithGoogle()}
            className="px-3 py-1.5 bg-[#1ed760] hover:bg-[#1fdf64] text-zinc-950 font-black rounded-xl text-xs transition shadow-sm flex items-center space-x-1.5 shrink-0 active:scale-95"
          >
            <LogIn size={13} strokeWidth={2.5} />
            <span>Entrar com Google</span>
          </button>
        </div>
      )}
    </div>
  );
};
