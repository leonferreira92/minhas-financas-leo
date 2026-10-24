import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  Shield,
  ShoppingBag,
  PiggyBank,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useMonthInsights } from '../hooks/useMonthInsights';

export const IncomeTargetCard: React.FC = () => {
  const navigate = useNavigate();
  const { isBlurred } = useFinance();
  const { incomeTarget: t } = useMonthInsights();
  const [openDetail, setOpenDetail] = useState(false);

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const reserveProgress =
    t.targetReserveAmount > 0
      ? Math.min(100, Math.round((t.reservedToday / t.targetReserveAmount) * 100))
      : 100;

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 space-y-4"
      aria-label="Renda-alvo"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <Target size={13} className="text-[#003882]" />
            <span>Renda-alvo</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
            Quanto preciso ganhar
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Para quem vive de renda variável — números simples, sem planilha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/mais?tab=financial')}
          className="shrink-0 p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#003882] transition"
          title="Ajustar essenciais, lazer e reserva"
        >
          <Sliders size={15} />
        </button>
      </div>

      {/* Dois números principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-[#003882]/5 border border-[#003882]/15 px-3.5 py-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#003882]/80">
            Mês seguro
          </p>
          <p className="text-xl font-black text-[#003882] mt-0.5 tracking-tight">
            {formatCurrency(t.safeMonthlyIncome)}
          </p>
          <p className="text-[10px] text-slate-600 mt-1 leading-snug">
            Essenciais + guardar reserva ({t.targetReserveMonths} meses)
          </p>
        </div>
        <div className="rounded-2xl bg-[#fcca00]/15 border border-[#fcca00]/40 px-3.5 py-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-amber-900">
            Mês confortável
          </p>
          <p className="text-xl font-black text-blue-950 mt-0.5 tracking-tight">
            {formatCurrency(t.comfortableMonthlyIncome)}
          </p>
          <p className="text-[10px] text-slate-600 mt-1 leading-snug">
            Essenciais + lazer + parcela da reserva
          </p>
        </div>
      </div>

      {/* Composição */}
      <div className="space-y-2">
        <Row
          icon={<Shield size={14} className="text-blue-700" />}
          label="Gastos essenciais"
          value={formatCurrency(t.essentialMonthly)}
          hint="Moradia, comida, contas…"
        />
        <Row
          icon={<ShoppingBag size={14} className="text-violet-600" />}
          label="Estilo de vida"
          value={formatCurrency(t.lifestyleMonthly)}
          hint="Compras, lazer, extras"
        />
        <Row
          icon={<PiggyBank size={14} className="text-emerald-700" />}
          label={`Reserva (${t.targetReserveMonths} meses)`}
          value={
            t.reserveDeficit > 0
              ? `+ ${formatCurrency(t.monthlyReserveContribution)}/mês`
              : 'Completa'
          }
          hint={
            t.reserveDeficit > 0
              ? `Falta ${formatCurrency(t.reserveDeficit)} para a meta`
              : `Você já tem ${formatCurrency(t.reservedToday)} guardados`
          }
        />
      </div>

      {/* Barra da reserva */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span>Caixa de segurança</span>
          <span>
            {formatCurrency(t.reservedToday)} / {formatCurrency(t.targetReserveAmount)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#003882] transition-all"
            style={{ width: `${reserveProgress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpenDetail(v => !v)}
        className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 py-1"
      >
        <span>Como leio isso?</span>
        {openDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {openDetail && (
        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3 text-[11px] text-slate-600 space-y-2 leading-relaxed">
          <p>
            <strong className="text-slate-800">Mês seguro:</strong> o mínimo para cobrir o
            essencial e ir montando a reserva de {t.targetReserveMonths} meses.
          </p>
          <p>
            <strong className="text-slate-800">Mês confortável:</strong> o mesmo, mantendo seu
            ritmo de lazer/compras.
          </p>
          {t.avgIncomeLast3Months > 0 && (
            <p>
              Sua média de entradas (3 meses):{' '}
              <strong className="text-slate-800">{formatCurrency(t.avgIncomeLast3Months)}</strong>
              {t.incomeGapToComfortable > 0 ? (
                <>
                  {' '}
                  — faltam cerca de{' '}
                  <strong className="text-amber-800">
                    {formatCurrency(t.incomeGapToComfortable)}
                  </strong>{' '}
                  para o confortável.
                </>
              ) : (
                <> — você está na faixa confortável (na média).</>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate('/mais?tab=financial')}
            className="inline-flex items-center gap-0.5 font-bold text-[#003882] hover:underline pt-1"
          >
            Ajustar categorias e meses de reserva
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </section>
  );
};

const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}> = ({ icon, label, value, hint }) => (
  <div className="flex items-center justify-between gap-3 py-1">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate">{label}</p>
        <p className="text-[10px] text-slate-500 truncate">{hint}</p>
      </div>
    </div>
    <span className="text-xs font-black text-slate-900 shrink-0">{value}</span>
  </div>
);
