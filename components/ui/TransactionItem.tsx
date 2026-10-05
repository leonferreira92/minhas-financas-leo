import React from 'react';
import { Transaction, Category, Account } from '../../types';
import { getIcon } from '../../constants';
import {
  ArrowDownCircle,
  ArrowRightLeft,
  PiggyBank,
  Clock,
  Check,
  Music,
  Repeat,
  Wallet,
  Edit3,
  Trash2
} from 'lucide-react';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  account?: Account;
  isHighlighted?: boolean;
  isBlurred?: boolean;
  formatCurrency: (val: number) => string;
  onEdit: (tx: Transaction) => void;
  onToggleStatus: (e: React.MouseEvent, tx: Transaction) => void;
  onDelete: (e: React.MouseEvent, txId: string) => void;
  onOpenShow?: (showId: string) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction: t,
  category,
  account,
  isHighlighted = false,
  isBlurred = false,
  formatCurrency,
  onEdit,
  onToggleStatus,
  onDelete,
  onOpenShow
}) => {
  const Icon = category ? getIcon(category.icon) : ArrowDownCircle;
  const isExpense = t.type === 'expense' || t.type === 'goal_deposit';
  const isIncome = t.type === 'income' || t.type === 'goal_withdraw';
  const isPending = t.status === 'pending';
  const isBusiness =
    t.scope === 'BUSINESS' ||
    t.categoryId === 'cat_33' ||
    t.categoryId === 'cat_equipamentos' ||
    t.categoryId === 'cat_producao_shows' ||
    t.categoryId === 'cat_logistica_shows' ||
    Boolean(t.showId);

  return (
    <div
      id={`tx-${t.id}`}
      onClick={() => onEdit(t)}
      className={`group p-4 sm:p-4.5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer flex items-start sm:items-center justify-between gap-4 ${
        isHighlighted
          ? 'ring-2 ring-emerald-500 shadow-lg bg-emerald-500/10 border-emerald-500/40'
          : isPending
          ? 'bg-[#18181b] border-amber-500/30 hover:border-amber-500/50'
          : 'bg-[#18181b] border-zinc-800/80 hover:border-zinc-700 hover:shadow-xs'
      }`}
    >
      {/* Lado Esquerdo: Ícone + Título (em linha própria sem truncamento pelas tags) + Badges com Gap amplo */}
      <div className="flex items-start space-x-3.5 min-w-0 pr-2 flex-1">
        {/* Ícone Indicativo */}
        <div className="relative shrink-0 mt-0.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${
              isExpense
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : isIncome
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
            }`}
          >
            {t.type === 'transfer' ? (
              <ArrowRightLeft size={19} />
            ) : t.type === 'goal_deposit' || t.type === 'goal_withdraw' ? (
              <PiggyBank size={19} />
            ) : (
              <Icon size={19} style={{ color: category?.color || '#22c55e' }} />
            )}
          </div>

          {isPending && (
            <div
              className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-zinc-900 flex items-center justify-center shadow-xs"
              title="Lançamento Agendado/Pendente"
            >
              <Clock size={8} className="text-black font-black" strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Detalhes do Lançamento: Nome separado das Badges com espaçamento (gap) adequado */}
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <h4 className="transaction-item-title text-xs sm:text-sm font-black text-white group-hover:text-emerald-400 transition-colors leading-relaxed break-words">
            {t.description || 'Sem descrição'}
          </h4>

          <div className="transaction-badges-row flex flex-wrap items-center gap-2">
            {/* Categoria */}
            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wide mr-1">
              {t.type === 'transfer' ? 'Transferência' : category ? category.name : 'Geral'}
            </span>

            {/* Badge Módulo: Pessoal vs Música */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                isBusiness
                  ? 'bg-purple-600 text-white border-purple-400/40'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700'
              }`}
            >
              {isBusiness ? '🎸 Música' : '👤 Pessoal'}
            </span>

            {/* Badge Status: Pendente vs Efetivado */}
            {isPending ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black border border-amber-400 uppercase tracking-wider shrink-0">
                <Clock size={9} className="shrink-0 text-black" strokeWidth={2.5} />
                <span>Pendente</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider shrink-0">
                <Check size={9} strokeWidth={3} className="shrink-0" />
                <span>Efetivado</span>
              </span>
            )}

            {/* Tag Show com Atalho Direto */}
            {t.showId && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenShow && t.showId) onOpenShow(t.showId);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white hover:bg-purple-500 border border-purple-400/40 uppercase tracking-wider transition active:scale-95 shrink-0"
                title="Abrir detalhes deste show na agenda"
              >
                <Music size={9} className="text-white shrink-0" />
                <span>Show</span>
              </button>
            )}

            {/* Tag Recorrente / Fixa */}
            {t.isFixed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase shrink-0">
                <Repeat size={8} className="shrink-0" />
                <span>Fixa</span>
              </span>
            )}

            {/* Tag Parcelamento */}
            {t.installmentNumber && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30 uppercase shrink-0">
                {t.installmentNumber}/{t.installmentTotal}
              </span>
            )}

            {/* Conta Bancária */}
            {account && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium text-zinc-300 bg-zinc-800/90 border border-zinc-700/70 truncate max-w-[150px]">
                <Wallet size={8} className="shrink-0 text-zinc-400" />
                <span className="truncate">{account.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lado Direito: Valor + Atalhos de Ação Rápida */}
      <div className="flex items-center space-x-2.5 shrink-0 self-center">
        <div className="text-right">
          <span
            className={`text-xs sm:text-base font-black tabular-nums block ${
              isExpense
                ? 'text-white'
                : isIncome
                ? 'text-emerald-400'
                : 'text-sky-400'
            }`}
          >
            {isExpense ? '- ' : isIncome ? '+ ' : ''}
            {!isBlurred ? formatCurrency(Math.abs(t.amount)) : '••••••'}
          </span>
          <span className="text-[9px] text-zinc-400 block">
            {isPending ? 'Projetado' : 'Liquidado'}
          </span>
        </div>

        {/* Botão de 1 Clique para Alternar Status (Agendado <-> Efetivado) */}
        <button
          type="button"
          onClick={(e) => onToggleStatus(e, t)}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-xs shrink-0 ${
            isPending
              ? 'bg-amber-500 text-black border border-amber-400 hover:bg-emerald-500 hover:text-black hover:border-emerald-400'
              : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-xs'
          }`}
          title={
            isPending
              ? 'Clique para marcar como EFETIVADO (Recebido/Pago)'
              : 'Clique para marcar como AGENDADO (Pendente)'
          }
        >
          {isPending ? (
            <Clock size={16} className="text-black" />
          ) : (
            <Check size={17} strokeWidth={3} className="text-black" />
          )}
        </button>

        {/* Botão Editar */}
        <button
          type="button"
          onClick={() => onEdit(t)}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition hidden sm:flex"
          title="Editar Lançamento"
        >
          <Edit3 size={15} />
        </button>

        {/* Botão Excluir */}
        <button
          type="button"
          onClick={(e) => onDelete(e, t.id)}
          className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition flex"
          title="Excluir Lançamento"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};
