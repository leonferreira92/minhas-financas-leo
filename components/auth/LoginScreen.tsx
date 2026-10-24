import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  Lock, Mail, User, Eye, EyeOff, Sparkles, 
  ArrowRight, ShieldCheck, CheckCircle2, AlertCircle,
  PlayCircle, LogIn, UserPlus, KeyRound, Music, DollarSign
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { 
    signInWithEmail, 
    registerWithEmail, 
    signInWithGoogle, 
    resetPassword,
    enterDemoMode 
  } = useFinance();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);

  const translateFirebaseError = (error: any): string => {
    const code = error?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'Este e-mail já está cadastrado. Alterne para a aba "Entrar" para acessar.';
    }
    if (code === 'auth/weak-password') {
      return 'A senha é muito fraca. Escolha uma senha com no mínimo 6 caracteres.';
    }
    if (code === 'auth/invalid-email') {
      return 'Por favor, informe um endereço de e-mail válido.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'O login com o Google foi cancelado na janela pop-up.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Falha de conexão com a rede. Verifique sua conexão com a internet.';
    }
    return error?.message || 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, informe sua senha.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas digitadas não coincidem.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }
    } catch (err: any) {
      setErrorMessage(translateFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMessage(translateFirebaseError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setIsResetLoading(true);
    setErrorMessage(null);
    try {
      await resetPassword(resetEmail);
      setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setIsResetModalOpen(false);
      setResetEmail('');
    } catch (err: any) {
      setErrorMessage(translateFirebaseError(err));
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      
      {/* GLOW BACKGROUND EFEITO DARK PREMIUM / BANCO DO BRASIL VIP & SPOTIFY */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#fcca00]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* CARD PRINCIPAL */}
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        
        {/* LOGO & BRAND HEADER */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-white via-white to-white border border-[#fcca00]/25 text-[11px] font-black uppercase tracking-[0.2em] text-[#fcca00] shadow-sm">
            <Sparkles size={12} className="text-[#fcca00] animate-pulse" />
            <span>Finanças Pro • Multi-Tenant</span>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#003882] to-[#002d6c] border border-blue-500/40 p-1 shadow-xl flex items-center justify-center text-[#fcca00] font-black text-xl shadow-blue-900/30">
              FP
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                Finanças Pro
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Fintech & Gestão de Carreira Musical
              </p>
            </div>
          </div>
        </div>

        {/* CONTAINER DO CARD TRANSLÚCIDO */}
        <div className="backdrop-blur-2xl bg-[#121215]/85 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5">
          
          {/* SELETOR DE ABAS: ENTRAR vs CRIAR CONTA */}
          <div className="grid grid-cols-2 p-1 bg-white/90 rounded-2xl border border-slate-200/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[#003882] to-[#004bb0] text-[#fcca00] font-black shadow-md border border-blue-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn size={14} />
              <span>Entrar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-purple-700 to-purple-600 text-white font-black shadow-md border border-purple-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus size={14} />
              <span>Criar Conta</span>
            </button>
          </div>

          {/* MENSAGENS DE FEEDBACK */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs flex items-start space-x-2.5 animate-slide-up">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs flex items-start space-x-2.5 animate-slide-up">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* FORMULÁRIO DE E-MAIL E SENHA */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Nome Completo
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome ou nome artístico"
                    className="w-full bg-white/90 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                E-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-white/90 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Senha
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setIsResetModalOpen(true);
                      setErrorMessage(null);
                    }}
                    className="text-[10px] text-purple-600 hover:text-purple-700 font-bold transition"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/90 border border-slate-200 rounded-2xl pl-10 pr-11 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full bg-white/90 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
            )}

            {/* BOTÃO PRINCIPAL DE ENVIO */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-lg active:scale-98 disabled:opacity-50 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[#003882] via-[#004bb0] to-[#002d6c] text-[#fcca00] hover:brightness-110 shadow-blue-950/50 border border-blue-500/30'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:bg-purple-500 shadow-purple-950/50 border border-purple-500/30'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Entrar no Sistema' : 'Criar Minha Conta'}</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* DIVISOR */}
          <div className="flex items-center space-x-3 my-2">
            <div className="flex-1 h-px bg-slate-50" />
            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">ou continue com</span>
            <div className="flex-1 h-px bg-slate-50" />
          </div>

          {/* LOGIN COM GOOGLE */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3 px-4 rounded-2xl bg-white/90 hover:bg-zinc-850 border border-zinc-750 text-xs font-bold text-slate-600 transition flex items-center justify-center space-x-3 active:scale-98 disabled:opacity-50 shadow-sm"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.21v3.15C3.25 21.4 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.32 14.27c-.24-.73-.38-1.5-.38-2.27s.14-1.54.38-2.27V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.6 1.21 6.58l4.11 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                </svg>
                <span>Continuar com Google</span>
              </>
            )}
          </button>

          {/* SEÇÃO DESTACADA: MODO DEMONSTRAÇÃO / VISITANTE */}
          <div className="pt-2">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-white via-white to-white border border-[#fcca00]/30 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-xl bg-[#fcca00]/20 text-[#fcca00]">
                  <PlayCircle size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                    <span>Modo Demonstração (Visitante)</span>
                    <span className="text-[9px] bg-[#fcca00]/20 text-[#fcca00] font-black uppercase px-1.5 py-0.2 rounded">
                      Sem Cadastro
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    Avalie o sistema com saldo organizado, 3 lançamentos e 1 dívida de teste carregados em memória local.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => enterDemoMode()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-white via-white to-white hover:brightness-105 text-blue-950 font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Sparkles size={14} className="text-slate-900" />
                <span>Acessar Modo Demonstração (Visitante)</span>
              </button>
            </div>
          </div>

          {/* NOTA DE PRIVACIDADE E SEGURANÇA */}
          <div className="text-center pt-1">
            <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-600 font-medium">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span>Isolamento Total de Dados • Multi-Tenant Seguro</span>
            </div>
          </div>

        </div>

        {/* RODAPÉ INFORMATIVO */}
        <p className="text-center text-[11px] text-slate-600 mt-5">
          Finanças Pro &copy; 2026 • Painel de Gestão Financeira Pessoal & Carreira
        </p>

      </div>

      {/* MODAL: RECUPERAÇÃO DE SENHA */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121215] border border-slate-200 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-purple-500/20 text-purple-600 rounded-xl">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Recuperar Senha</h3>
                <p className="text-[11px] text-slate-600">Enviaremos um link de redefinição para o seu e-mail.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-600 block">E-mail Cadastrado</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isResetLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-black uppercase text-white transition disabled:opacity-50"
                >
                  {isResetLoading ? 'Enviando...' : 'Enviar Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
