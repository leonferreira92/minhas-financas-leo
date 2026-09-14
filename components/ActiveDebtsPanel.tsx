import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  CreditCard, Calendar, AlertTriangle, ShieldCheck, 
  TrendingDown, ArrowDownRight, CheckCircle2, 
  Clock, AlertCircle, Sparkles, ChevronRight, Info
} from 'lucide-react';
import { Debt } from '../types';
import { formatMonthYearBR } from '../services/aiReportService';

interface ActiveDebtItem {
  debt: Debt;
  remainingAmount: number;
  installmentAmount: number;
  paidCount: number;
  remainingCount: number;
  totalCount: number;
  endMonthYear: string;
  endDateRaw: string;
  hasInconsistency: boolean;
  inconsistencyMessage?: string;
}

interface Props {
  onSelectDebt?: (debtId: string) => void;
}

export const ActiveDebtsPanel: React.FC<Props> = ({ onSelectDebt }) => {
  const { debts, transactions, isBlurred, getDebtProgress } = useFinance();

  const formatBRL = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const parsedDebtsData = useMemo(() => {
    const items: ActiveDebtItem[] = [];

    debts.forEach(debt => {
      const { remaining, paid, totalReal } = getDebtProgress(debt.id);

      // REGRA OBRIGATÓRIA: Não considerar dívidas com saldo restante igual a R$0 como obrigações futuras
      if (remaining <= 0.05) {
        return;
      }

      const linkedTxs = transactions.filter(t => t.debtId === debt.id);
      const paidTxs = linkedTxs.filter(t => t.status === 'paid');
      const pendingTxs = linkedTxs.filter(t => t.status === 'pending').sort((a, b) => a.date.localeCompare(b.date));

      // Contagem de parcelas
      const totalCount = debt.installmentCount || (linkedTxs.length > 0 ? linkedTxs.length : 1);
      const paidCount = paidTxs.length;
      const remainingCount = pendingTxs.length > 0 ? pendingTxs.length : Math.max(0, totalCount - paidCount);

      // Valor da parcela
      let installmentAmount = 0;
      if (debt.installmentAmount && debt.installmentAmount > 0) {
        installmentAmount = Number(debt.installmentAmount);
      } else if (pendingTxs.length > 0 && Number(pendingTxs[0].amount) > 0) {
        installmentAmount = Number(pendingTxs[0].amount);
      } else if (totalCount > 0 && Number(debt.totalAmount) > 0) {
        installmentAmount = Number(debt.totalAmount) / totalCount;
      }

      // Mês previsto para término
      let endMonthYear = 'não informado';
      let endDateRaw = '';

      if (pendingTxs.length > 0) {
        const lastTx = pendingTxs[pendingTxs.length - 1];
        endDateRaw = lastTx.date;
        endMonthYear = formatMonthYearBR(lastTx.date.slice(0, 7));
      } else if (debt.startDate && remainingCount > 0) {
        const start = new Date(debt.startDate + 'T12:00:00');
        const estEnd = new Date(start.getFullYear(), start.getMonth() + totalCount - 1, 1);
        endDateRaw = estEnd.toISOString().slice(0, 10);
        endMonthYear = formatMonthYearBR(estEnd.toISOString().slice(0, 7));
      }

      // -----------------------------------------------------------------------
      // VERIFICAÇÃO DE INCONSISTÊNCIA MATEMÁTICA
      // (Saldo restante, valor da parcela e quantidade de parcelas restantes)
      // REGRA: Mostrar alerta em vez de corrigir ou inventar dados.
      // -----------------------------------------------------------------------
      let hasInconsistency = false;
      let inconsistencyMessage = '';

      const expectedByInstallments = remainingCount * installmentAmount;
      const diff = Math.abs(remaining - expectedByInstallments);

      // Tolerância: se a diferença for maior que 10% e mais que R$ 20,00 (ou se parcelas restantes = 0 com saldo positivo)
      if (remainingCount <= 0 && remaining > 1) {
        hasInconsistency = true;
        inconsistencyMessage = `Inconsistência: Consta saldo de ${formatBRL(remaining)}, mas nenhuma parcela restante está pendente.`;
      } else if (installmentAmount <= 0 && remaining > 1) {
        hasInconsistency = true;
        inconsistencyMessage = `Inconsistência: Saldo restante é ${formatBRL(remaining)}, mas o valor da parcela é R$ 0,00.`;
      } else if (remaining > 1 && remainingCount > 0 && installmentAmount > 0 && diff > Math.max(25, remaining * 0.12)) {
        hasInconsistency = true;
        inconsistencyMessage = `Inconsistência nos dados cadastrados: O saldo restante (${formatBRL(remaining)}) não fecha com ${remainingCount}x de ${formatBRL(installmentAmount)} (soma ${formatBRL(expectedByInstallments)}). Os valores foram preservados exatamente como cadastrados.`;
      }

      items.push({
        debt,
        remainingAmount: remaining,
        installmentAmount,
        paidCount,
        remainingCount,
        totalCount,
        endMonthYear,
        endDateRaw,
        hasInconsistency,
        inconsistencyMessage
      });
    });

    // Ordenar pelas dívidas que terminam primeiro
    items.sort((a, b) => {
      if (!a.endDateRaw) return 1;
      if (!b.endDateRaw) return -1;
      return a.endDateRaw.localeCompare(b.endDateRaw);
    });

    // -------------------------------------------------------------------------
    // RESUMO: PARCELAS ATUAIS POR MÊS E CRONOGRAMA DE QUEDA
    // -------------------------------------------------------------------------
    const totalCommittedPerMonth = items.reduce((sum, item) => sum + item.installmentAmount, 0);

    // Agrupar dívidas por data/mês de término para calcular como o total mensal cai
    const reliefTimelineMap: Record<string, { monthYear: string; debtsEnding: ActiveDebtItem[]; reliefAmount: number }> = {};

    items.forEach(item => {
      if (item.endMonthYear && item.endMonthYear !== 'não informado') {
        const key = item.endDateRaw.slice(0, 7);
        if (!reliefTimelineMap[key]) {
          reliefTimelineMap[key] = {
            monthYear: item.endMonthYear,
            debtsEnding: [],
            reliefAmount: 0
          };
        }
        reliefTimelineMap[key].debtsEnding.push(item);
        reliefTimelineMap[key].reliefAmount += item.installmentAmount;
      }
    });

    const reliefMilestones = Object.entries(reliefTimelineMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => ({ key, ...data }));

    // Calcular o saldo remanescente mensal após cada quitação
    let runningCommitted = totalCommittedPerMonth;
    const reliefSchedule = reliefMilestones.map(m => {
      const drop = m.reliefAmount;
      runningCommitted = Math.max(0, runningCommitted - drop);
      return {
        monthYear: m.monthYear,
        debtsNames: m.debtsEnding.map(d => d.debt.name).join(', '),
        reliefAmount: drop,
        newCommittedPerMonth: runningCommitted
      };
    });

    return {
      items,
      totalCommittedPerMonth,
      reliefSchedule
    };
  }, [debts, transactions, isBlurred, getDebtProgress]);

  if (parsedDebtsData.items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 border border-slate-200 dark:border-slate-800 text-center py-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
          <ShieldCheck size={28} />
        </div>
        <h3 className="text-base font-black text-slate-900 dark:text-white">Nenhuma Dívida Ativa</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Todas as dívidas cadastradas estão quitadas com saldo R$ 0,00 ou não há obrigações ativas registradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* --------------------------------------------------------------------- */}
      {/* CARD DE RESUMO: PARCELAS ATUAIS POR MÊS E QUEDA PREVISTA              */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-slate-900 text-white rounded-[2.2rem] p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-indigo-600 rounded-full blur-3xl opacity-20"></div>

        <div className="relative z-10 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block mb-1">
                Comprometimento Mensal Ativo
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-white">
                Parcelas atuais por mês: {formatBRL(parsedDebtsData.totalCommittedPerMonth)}
              </h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-slate-300 border border-white/10 w-fit">
              {parsedDebtsData.items.length} {parsedDebtsData.items.length === 1 ? 'dívida ativa' : 'dívidas ativas'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Soma exata das parcelas mensais de todos os passivos com saldo devedor pendente. Dívidas com saldo R$ 0,00 são desconsideradas.
          </p>

          {/* CRONOGRAMA DE ALÍVIO: QUANTO O VALOR CAIRÁ QUANDO CADA DÍVIDA TERMINAR */}
          {parsedDebtsData.reliefSchedule.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Cronograma de Alívio do Fluxo de Caixa:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {parsedDebtsData.reliefSchedule.map((milestone, idx) => (
                  <div 
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-300">
                        {milestone.monthYear}
                      </span>
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        -{formatBRL(milestone.reliefAmount)}/mês
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 truncate">
                      Fim de: <strong>{milestone.debtsNames}</strong>
                    </p>

                    <div className="pt-1 text-[10px] text-slate-400 border-t border-white/5 flex items-center justify-between">
                      <span>Parcelas caem para:</span>
                      <strong className={`tabular-nums font-black ${
                        milestone.newCommittedPerMonth === 0 ? 'text-emerald-400' : 'text-white'
                      }`}>
                        {milestone.newCommittedPerMonth === 0 ? 'R$ 0,00 (Quitado!)' : formatBRL(milestone.newCommittedPerMonth)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* PAINEL DETALHADO DE CADA DÍVIDA ATIVA                                 */}
      {/* --------------------------------------------------------------------- */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Detalhamento Individual das Dívidas
          </h3>
          <span className="text-[11px] text-slate-400">
            Total Comprometido: <strong>{formatBRL(parsedDebtsData.totalCommittedPerMonth)}/mês</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {parsedDebtsData.items.map(item => {
            const pct = item.totalCount > 0 ? (item.paidCount / item.totalCount) * 100 : 0;

            return (
              <div 
                key={item.debt.id}
                onClick={() => onSelectDebt && onSelectDebt(item.debt.id)}
                className={`bg-white dark:bg-slate-900 rounded-[2rem] p-5 border shadow-sm transition hover:shadow-md ${
                  item.hasInconsistency 
                    ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/10' 
                    : 'border-slate-200/80 dark:border-slate-800'
                } ${onSelectDebt ? 'cursor-pointer active:scale-[0.99]' : ''}`}
              >
                
                {/* TOPO: NOME, TIPO E PREVISÃO DE TÉRMINO */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <CreditCard size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        {item.debt.name}
                      </h4>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.debt.type === 'bank' ? 'Empréstimo Bancário' : item.debt.type === 'car_financing' ? 'Financiamento Veículo' : item.debt.type === 'card_installment' ? 'Cartão Parcelado' : 'Outros'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {item.paidCount} de {item.totalCount} parcelas pagas
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Término Previsto
                    </span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">
                      {item.endMonthYear}
                    </span>
                  </div>
                </div>

                {/* GRID DE VALORES REQUISITADOS: SALDO RESTANTE, VALOR DA PARCELA, PARCELAS RESTANTES, TOTAL COMPROMETIDO */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5">
                  
                  {/* Saldo Restante */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Saldo Restante
                    </span>
                    <span className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums block mt-0.5">
                      {formatBRL(item.remainingAmount)}
                    </span>
                  </div>

                  {/* Valor da Parcela */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Valor da Parcela
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums block mt-0.5">
                      {formatBRL(item.installmentAmount)}
                    </span>
                  </div>

                  {/* Parcelas Restantes */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Parcelas Restantes
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums block mt-0.5">
                      {item.remainingCount} {item.remainingCount === 1 ? 'restante' : 'restantes'}
                    </span>
                  </div>

                  {/* Parcelas Já Pagas */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Parcelas Já Pagas
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5">
                      {item.paidCount} {item.paidCount === 1 ? 'paga' : 'pagas'}
                    </span>
                  </div>

                </div>

                {/* BARRA DE PROGRESSO DE QUITAÇÃO */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>Progresso da Quitação</span>
                    <span className="tabular-nums font-bold text-slate-700 dark:text-slate-300">
                      {pct.toFixed(0)}% concluído
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    ></div>
                  </div>
                </div>

                {/* ALERTA DE INCONSISTÊNCIA MATEMÁTICA (CASO EXISTA) */}
                {item.hasInconsistency && (
                  <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-700/80 flex items-start space-x-2.5">
                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-black text-amber-800 dark:text-amber-300 block">
                        Aviso de Inconsistência nos Dados
                      </span>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                        {item.inconsistencyMessage}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
