import React, { useState } from 'react';
import { Show, ShowStatus } from '../../types';
import { 
  X, Calendar, Clock, MapPin, User, DollarSign, 
  FileText, CheckCircle2, AlertCircle, Edit3, Trash2, 
  TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, 
  Check, ArrowRight, Sparkles 
} from 'lucide-react';
import { getStatusConfig, SHOW_STATUSES } from './types';

interface Props {
  show: Show | null;
  onClose: () => void;
  onEdit: (show: Show) => void;
  onDelete: (showId: string) => void;
  onUpdateStatus: (show: Show, newStatus: ShowStatus) => void;
}

export const ShowDetailModal: React.FC<Props> = ({
  show,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus
}) => {
  const [activeSection, setActiveSection] = useState<'info' | 'contract' | 'finance' | 'history'>('info');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!show) return null;

  const statusCfg = getStatusConfig(show.status);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDateBR = (dStr: string) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Financial calculations
  const totalCache = Number(show.totalCache) || 0;
  
  let totalReceived = 0;
  let totalPending = 0;
  if (show.receipts && show.receipts.length > 0) {
    show.receipts.forEach(r => {
      if (r.status === 'Recebido') totalReceived += (Number(r.amount) || 0);
      else totalPending += (Number(r.amount) || 0);
    });
  } else {
    if (show.status === 'Realizado') totalReceived = totalCache;
    else totalPending = totalCache;
  }

  const expensesTotal = show.expenses ? (
    (Number(show.expenses.fuel) || 0) +
    (Number(show.expenses.food) || 0) +
    (Number(show.expenses.toll) || 0) +
    (Number(show.expenses.commission) || 0) +
    (Number(show.expenses.others) || 0)
  ) : 0;

  const netProfit = totalCache - expensesTotal;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 z-10 max-h-[92vh] overflow-y-auto no-scrollbar">
        
        {/* Header com Status & Ações */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusCfg.badgeClass}`}>
              {show.status}
            </span>
            {show.eventType && (
              <span className="text-[10px] font-bold text-slate-400">
                • {show.eventType}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onEdit(show)}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Editar Show"
            >
              <Edit3 size={17} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              title="Excluir Show"
            >
              <Trash2 size={17} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top Highlight: Contratante e Valor */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {show.contractorName || show.name || 'Apresentação'}
          </h2>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-400">Cachê Contratado:</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(totalCache)}
            </span>
          </div>
        </div>

        {/* Abas da Ficha: Informações, Contratação, Financeiro, Histórico */}
        <div className="px-6 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex space-x-2 text-xs font-bold">
            <button
              onClick={() => setActiveSection('info')}
              className={`pb-2 px-1 border-b-2 transition ${
                activeSection === 'info'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Informações
            </button>
            <button
              onClick={() => setActiveSection('contract')}
              className={`pb-2 px-1 border-b-2 transition ${
                activeSection === 'contract'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Contratação
            </button>
            <button
              onClick={() => setActiveSection('finance')}
              className={`pb-2 px-1 border-b-2 transition ${
                activeSection === 'finance'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Financeiro
            </button>
            <button
              onClick={() => setActiveSection('history')}
              className={`pb-2 px-1 border-b-2 transition ${
                activeSection === 'history'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Conteúdo das Seções */}
        <div className="p-6 space-y-4">
          
          {/* SEÇÃO 1: INFORMAÇÕES */}
          {activeSection === 'info' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Data da Apresentação</span>
                <p className="text-xs font-bold text-slate-800 dark:text-white capitalize flex items-center">
                  <Calendar size={14} className="mr-1.5 text-indigo-600" />
                  {formatDateBR(show.date)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Horário</span>
                <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                  <Clock size={14} className="mr-1.5 text-indigo-600" />
                  {show.time || '20:00'} {show.endTime ? `às ${show.endTime}` : ''} {show.duration ? `(${show.duration})` : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Cidade</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center">
                    <MapPin size={14} className="mr-1.5 text-indigo-600" />
                    {show.city || 'Não informada'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Local / Endereço</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                    {show.location || 'A definir'}
                  </p>
                </div>
              </div>

              {show.notes && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Observações</span>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {show.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO 2: CONTRATAÇÃO */}
          {activeSection === 'contract' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Status Atual:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${statusCfg.badgeClass}`}>
                    {show.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs font-bold text-slate-500">Valor Total:</span>
                  <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(totalCache)}
                  </span>
                </div>
              </div>

              {/* Botões de Ação Rápida de Status */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Alterar Status do Show
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  {show.status !== 'Confirmado' && (
                    <button
                      onClick={() => onUpdateStatus(show, 'Confirmado')}
                      className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <Check size={14} strokeWidth={3} />
                      <span>Confirmar Show</span>
                    </button>
                  )}

                  {show.status !== 'Realizado' && (
                    <button
                      onClick={() => onUpdateStatus(show, 'Realizado')}
                      className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/20 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <CheckCircle2 size={14} strokeWidth={2.5} />
                      <span>Marcar Realizado</span>
                    </button>
                  )}

                  {show.status !== 'Orçamento' && (
                    <button
                      onClick={() => onUpdateStatus(show, 'Orçamento')}
                      className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/20 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <span>Mover p/ Orçamento</span>
                    </button>
                  )}

                  {show.status !== 'Cancelado' && (
                    <button
                      onClick={() => onUpdateStatus(show, 'Cancelado')}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/20 text-xs font-black uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <span>Cancelar Show</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 3: FINANCEIRO */}
          {activeSection === 'finance' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
                <span className="font-black block uppercase text-[10px] tracking-wider mb-0.5">
                  Estrutura Financeira da Apresentação
                </span>
                Valores calculados com base no cachê e recebimentos vinculados.
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ArrowUpRight size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Recebido</span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(totalReceived)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock size={16} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">A Receber</span>
                  </div>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatCurrency(totalPending)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ArrowDownRight size={16} className="text-rose-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Despesas Lançadas</span>
                  </div>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatCurrency(expensesTotal)}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between font-black">
                  <div className="flex items-center space-x-2">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <span className="text-xs text-emerald-900 dark:text-emerald-200">Lucro Líquido Estimado</span>
                  </div>
                  <span className="text-sm text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO 4: HISTÓRICO */}
          {activeSection === 'history' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Data de Cadastro:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {show.createdAt ? new Date(show.createdAt).toLocaleDateString('pt-BR') : 'Original'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Identificador:</span>
                  <span className="font-mono text-[10px] text-slate-500">{show.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Situação:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{show.status}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex items-center space-x-3 text-rose-600">
                <AlertCircle size={22} />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Excluir Apresentação?
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Tem certeza que deseja excluir o show de <strong>{show.contractorName || show.name}</strong>?
              </p>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 text-xs font-black uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete(show.id);
                    onClose();
                  }}
                  className="w-1/2 p-3 rounded-2xl bg-rose-600 text-white text-xs font-black uppercase tracking-wider hover:bg-rose-700"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
