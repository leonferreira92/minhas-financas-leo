import React, { useState } from 'react';
import { ArrowRightLeft, BadgeDollarSign, CloudOff, Loader2, Building2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useProLaboreEstimate } from '../hooks/useProLaboreEstimate';
import { ProLaboreWithdrawModal } from './ProLaboreWithdrawModal';
import { parseCurrencyInput } from '../constants';

/**
 * Card: availableProLabore de leo-ferreira-app
 * (users/{companyUid}/companySummary/current).
 */
export const ProLaboreEstimateCard: React.FC = () => {
  const { isBlurred, currentUser } = useFinance();
  const estimate = useProLaboreEstimate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [companyEmail, setCompanyEmail] = useState(currentUser?.email || '');
  const [companyPassword, setCompanyPassword] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const showManualFallback =
    !estimate.isLoading && !estimate.hasFirestoreSummary && !estimate.needsCompanyAuth;

  const handleApplyManual = () => {
    const parsed = parseCurrencyInput(manualInput);
    if (parsed > 0) {
      estimate.setManualOverride(parsed);
    } else {
      estimate.setManualOverride(null);
    }
  };

  const handleCompanyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    try {
      await estimate.linkCompanyWithEmail(companyEmail, companyPassword);
      setCompanyPassword('');
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Falha ao conectar');
    }
  };

  return (
    <>
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <BadgeDollarSign size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                Vida de Artista → Pessoal
              </p>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Estimativa de Pró-Labore Disponível
              </h3>
            </div>
          </div>
          {estimate.hasFirestoreSummary ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              Sync OK
            </span>
          ) : estimate.needsCompanyAuth ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              Login empresa
            </span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0 flex items-center gap-1">
              <CloudOff size={10} />
              Sem doc
            </span>
          )}
        </div>

        <div>
          {estimate.isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 py-1">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-xs font-medium">Lendo leo-ferreira-app…</span>
            </div>
          ) : (
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(estimate.availableEstimate)}
            </p>
          )}
          {estimate.statusMessage && (
            <p className="text-[10px] text-amber-700 mt-1.5 leading-snug font-medium">
              {estimate.statusMessage}
            </p>
          )}
          {estimate.companyUid && (
            <p className="text-[9px] text-slate-400 mt-1 font-mono">
              UID empresa: {estimate.companyUid.slice(0, 12)}…
            </p>
          )}
          <p className="text-[10px] text-slate-500 mt-0.5">
            Entrada: {estimate.categoryLabel}
          </p>
        </div>

        {estimate.needsCompanyAuth && (
          <form
            onSubmit={handleCompanyLogin}
            className="space-y-2 p-3 rounded-2xl bg-amber-50/80 border border-amber-200"
          >
            <div className="flex items-center gap-1.5 text-amber-900">
              <Building2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-wide">
                Conta do Vida de Artista (leo-ferreira-app)
              </span>
            </div>
            <p className="text-[10px] text-amber-800/90 leading-snug">
              Use o <strong>mesmo e-mail e senha</strong> do painel da empresa. Google do app pessoal
              não compartilha o UID com o projeto leo-ferreira-app.
            </p>
            <input
              type="email"
              required
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="E-mail da empresa"
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
            />
            <input
              type="password"
              required
              value={companyPassword}
              onChange={(e) => setCompanyPassword(e.target.value)}
              placeholder="Senha da empresa"
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
            />
            {linkError && (
              <p className="text-[10px] text-rose-600 font-bold">{linkError}</p>
            )}
            <button
              type="submit"
              disabled={estimate.isLinkingCompany}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-xs transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {estimate.isLinkingCompany ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              <span>Conectar e ler pró-labore</span>
            </button>
          </form>
        )}

        {showManualFallback && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              step="any"
              min="0"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Valor manual (R$)"
              className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={handleApplyManual}
              className="shrink-0 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-wide transition"
            >
              Aplicar
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition active:scale-[0.98] shadow-sm flex items-center justify-center space-x-2"
        >
          <ArrowRightLeft size={14} strokeWidth={2.5} />
          <span>Registrar Pró-labore / Transferência</span>
        </button>
      </div>

      <ProLaboreWithdrawModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultAmount={
          estimate.availableEstimate > 0 ? estimate.availableEstimate : undefined
        }
      />
    </>
  );
};
