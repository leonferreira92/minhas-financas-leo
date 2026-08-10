import React from 'react';
import { ArrowUpRight, ArrowDownRight, Clock, TrendingUp, Sparkles, Eye, EyeOff, Calendar } from 'lucide-react';

interface PanoramaCardProps {
  resultadoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  aReceber: number;
  aPagar: number;
  saldoProjetado: number;
  isBlurred: boolean;
  onToggleBlur: () => void;
  monthName: string;
}

export const PanoramaCard: React.FC<PanoramaCardProps> = ({
  resultadoAtual,
  totalEntradas,
  totalSaidas,
  aReceber,
  aPagar,
  saldoProjetado,
  isBlurred,
  onToggleBlur,
  monthName
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const isPositive = resultadoAtual >= 0;

  return (
    <div id="panorama-financeiro-card" className="relative bg-slate-900 dark:bg-black text-white rounded-[2.2rem] p-6 sm:p-7 border border-slate-800 shadow-2xl overflow-hidden transition-all">
      {/* Background Glow Effects */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600/25 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 bg-purple-600/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header with Title & Blur Toggle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-3 py-1 rounded-full">
              Panorama de {monthName}
            </span>
          </div>

          <button
            onClick={onToggleBlur}
            className="p-2 bg-white/10 hover:bg-white/15 rounded-xl border border-white/10 text-slate-300 hover:text-white transition active:scale-95"
            title={isBlurred ? "Exibir valores" : "Ocultar valores"}
          >
            {isBlurred ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* RESULTADO ATUAL */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
            Resultado Atual (Efetivado)
          </span>
          <div className="flex items-baseline space-x-2">
            {!isBlurred ? (
              <h2 className={`text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${isPositive ? 'text-white' : 'text-rose-400'}`}>
                {formatCurrency(resultadoAtual)}
              </h2>
            ) : (
              <span className="text-3xl font-black tracking-widest text-slate-400">••••••••</span>
            )}
            {!isBlurred && (
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${isPositive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                {isPositive ? '+Positivo' : '-Negativo'}
              </span>
            )}
          </div>
        </div>

        {/* ENTRADAS & SAÍDAS (Efetivadas) */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center space-x-1.5 text-emerald-400 mb-1">
              <ArrowUpRight size={14} className="shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider">Entradas</span>
            </div>
            <p className="text-base sm:text-lg font-black text-emerald-300 tabular-nums">
              {!isBlurred ? formatCurrency(totalEntradas) : '••••'}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center space-x-1.5 text-rose-400 mb-1">
              <ArrowDownRight size={14} className="shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider">Saídas</span>
            </div>
            <p className="text-base sm:text-lg font-black text-rose-300 tabular-nums">
              {!isBlurred ? formatCurrency(totalSaidas) : '••••'}
            </p>
          </div>
        </div>

        {/* PREVISÕES DO MÊS: A RECEBER | A PAGAR | SALDO PROJETADO */}
        <div className="pt-2">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2.5 flex items-center space-x-1">
            <Clock size={12} className="text-amber-400" />
            <span>Previsões do Mês (A Vencer / Pendentes)</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
              <span className="text-[8px] font-black uppercase text-amber-400 tracking-wider block mb-0.5">
                A Receber
              </span>
              <p className="text-xs sm:text-sm font-black text-amber-300 tabular-nums truncate">
                {!isBlurred ? formatCurrency(aReceber) : '••••'}
              </p>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
              <span className="text-[8px] font-black uppercase text-rose-400 tracking-wider block mb-0.5">
                A Pagar
              </span>
              <p className="text-xs sm:text-sm font-black text-rose-300 tabular-nums truncate">
                {!isBlurred ? formatCurrency(aPagar) : '••••'}
              </p>
            </div>

            <div className="bg-indigo-500/15 border border-indigo-500/30 p-3 rounded-2xl">
              <span className="text-[8px] font-black uppercase text-indigo-300 tracking-wider block mb-0.5">
                Saldo Projetado
              </span>
              <p className="text-xs sm:text-sm font-black text-white tabular-nums truncate">
                {!isBlurred ? formatCurrency(saldoProjetado) : '••••'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
