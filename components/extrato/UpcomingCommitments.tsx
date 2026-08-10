import React, { useMemo } from 'react';
import { Transaction, Category } from '../../types';
import { getIcon } from '../../constants';
import { Clock, Check, ChevronRight, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

interface UpcomingCommitmentsProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonthStr: string;
  isBlurred: boolean;
  onSelectTransaction: (transaction: Transaction) => void;
  onToggleStatus: (e: React.MouseEvent, transaction: Transaction) => void;
}

export const UpcomingCommitments: React.FC<UpcomingCommitmentsProps> = ({
  transactions,
  categories,
  selectedMonthStr,
  isBlurred,
  onSelectTransaction,
  onToggleStatus
}) => {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const upcomingList = useMemo(() => {
    // Filter pending expenses (or deposits) for current/selected month or upcoming
    const pending = transactions.filter(
      t => t.status === 'pending' && (t.type === 'expense' || t.type === 'goal_deposit') && t.date.startsWith(selectedMonthStr)
    ).sort((a, b) => a.date.localeCompare(b.date));

    return pending;
  }, [transactions, selectedMonthStr]);

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDate().toString().padStart(2, '0');
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    return { day, monthName };
  };

  return (
    <div id="proximos-compromissos-section" className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contas a Pagar</h3>
            <p className="text-sm font-black text-slate-800 dark:text-white">Próximos Compromissos ({upcomingList.length})</p>
          </div>
        </div>

        {upcomingList.length > 0 && (
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
            Aguardando Pagamento
          </span>
        )}
      </div>

      {upcomingList.length === 0 ? (
        <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-1">
          <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Tudo em dia para este mês!
          </p>
          <p className="text-[10px] text-slate-400">Nenhum compromisso pendente localizado neste período.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {upcomingList.map(t => {
            const category = categories.find(c => c.id === t.categoryId);
            const IconComp = category ? getIcon(category.icon) : Clock;
            const { day, monthName } = formatShortDate(t.date);

            return (
              <div
                key={t.id}
                onClick={() => onSelectTransaction(t)}
                className="p-3.5 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] hover:bg-amber-500/[0.08] dark:hover:bg-amber-500/[0.05] border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  {/* Date Badge */}
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-amber-800 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 leading-none">{day}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none mt-0.5">{monthName}</span>
                  </div>

                  {/* Transaction Details */}
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {t.description}
                    </h4>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {category ? category.name : 'Geral'}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 uppercase">
                        Pendente
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount & Quick Pay Button */}
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800 dark:text-white tabular-nums">
                      {!isBlurred ? formatCurrency(t.amount) : '••••'}
                    </p>
                  </div>

                  {/* Quitar/Pagar Button */}
                  <button
                    onClick={(e) => onToggleStatus(e, t)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-sm transition active:scale-95"
                    title="Marcar como Pago"
                  >
                    <Check size={12} strokeWidth={3} />
                    <span className="hidden sm:inline">Pagar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
