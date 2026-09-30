import React, { useState, useMemo, useEffect } from 'react';
import { Show, ShowStatus, ShowPayment, ShowExpenseItem, ShowPaymentType, ShowPaymentStatus, Transaction } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, Calendar, Clock, MapPin, DollarSign, 
  CheckCircle2, AlertCircle, Edit3, Trash2, 
  Wallet, ArrowDownRight, ArrowUpRight,
  Check, Plus, AlertTriangle, Link2, Unlink,
  ChevronRight, ExternalLink, Sparkles, Tag, Info, Music
} from 'lucide-react';
import { getStatusConfig } from './types';
import { 
  normalizeShowFinancials, 
  getShowFinancialSummary 
} from '../../services/showFinanceSyncService';
import { generateUUID } from '../../services/uuidHelper';
import { useNavigate } from 'react-router-dom';

interface Props {
  show: Show | null;
  onClose: () => void;
  onEdit: (show: Show) => void;
  onDelete: (showId: string) => void;
  onUpdateStatus: (show: Show, newStatus: ShowStatus) => void;
}

const EXPENSE_CATEGORIES = [
  'Combustível',
  'Alimentação',
  'Pedágio',
  'Estacionamento',
  'Comissão',
  'Hospedagem',
  'Produção / Equipe',
  'Outros'
];

export const ShowDetailModal: React.FC<Props> = ({
  show: initialShow,
  onClose,
  onEdit,
  onDelete,
  onUpdateStatus
}) => {
  const navigate = useNavigate();
  const { shows, accounts, transactions, updateShow, updateTransaction, addTransaction } = useFinance();

  const [activeSection, setActiveSection] = useState<'finance' | 'expenses' | 'details'>('finance');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLinkPixModal, setShowLinkPixModal] = useState(false);

  // Default Account
  const defaultAccountId = accounts && accounts.length > 0 ? accounts[0].id : 'acc_bank';

  // Sincronização em tempo real do show
  const show = useMemo(() => {
    if (!initialShow) return null;
    const found = shows.find(s => s.id === initialShow.id) || initialShow;
    try {
      return normalizeShowFinancials(found, defaultAccountId);
    } catch {
      return found;
    }
  }, [shows, initialShow, defaultAccountId]);

  // Transações vinculadas do extrato (fontes da verdade do caixa)
  const linkedTransactions = useMemo(() => {
    if (!transactions || !show?.id) return [];
    return transactions
      .filter(t => t && t.showId === show.id)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [transactions, show?.id]);

  const linkedIncomeTransactions = useMemo(() => {
    return linkedTransactions.filter(t => t.type === 'income');
  }, [linkedTransactions]);

  const linkedExpenseTransactions = useMemo(() => {
    return linkedTransactions.filter(t => t.type === 'expense');
  }, [linkedTransactions]);

  // Transações de Receita NÃO vinculadas que podem ser associadas com 1 clique
  const unlinkedIncomeTransactions = useMemo(() => {
    if (!transactions || !show?.id) return [];
    return transactions
      .filter(t => t.type === 'income' && !t.showId && (t.scope === 'BUSINESS' || t.categoryId === 'cat_33'))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [transactions, show?.id]);

  // Payment Form State
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [payType, setPayType] = useState<ShowPaymentType>('Sinal');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => initialShow?.date || new Date().toISOString().slice(0, 10));
  const [payAccountId, setPayAccountId] = useState(defaultAccountId);
  const [payNotes, setPayNotes] = useState('');

  // Expense Form State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => initialShow?.date || new Date().toISOString().slice(0, 10));
  const [expAccountId, setExpAccountId] = useState(defaultAccountId);
  const [expNotes, setExpNotes] = useState('');

  // Reset form states on show switch
  useEffect(() => {
    setIsAddPaymentOpen(false);
    setIsAddExpenseOpen(false);
    setShowLinkPixModal(false);
    setShowDeleteConfirm(false);
    if (initialShow?.date) {
      setPayDate(initialShow.date);
      setExpDate(initialShow.date);
    }
  }, [initialShow?.id]);

  if (!show) return null;

  const statusCfg = getStatusConfig(show.status);
  const finSummary = getShowFinancialSummary(show, transactions);

  // Porcentagem de recebimento
  const percentReceived = finSummary.totalPredicted > 0 
    ? Math.min(100, Math.round((finSummary.totalReceived / finSummary.totalPredicted) * 100))
    : 0;

  const isFullyPaid = finSummary.totalPending === 0 && finSummary.totalPredicted > 0;

  const formatCurrency = (val?: number | string | null) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0).replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
  };

  const formatDateBR = (dStr?: string | null) => {
    if (!dStr) return '';
    try {
      const parts = String(dStr).split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const date = new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
      const dt = new Date(String(dStr));
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {}
    return String(dStr || '');
  };

  // Handler para vincular transação de Pix existente ao show
  const handleLinkTransaction = (tx: Transaction) => {
    updateTransaction({
      ...tx,
      showId: show.id,
      scope: 'BUSINESS',
      categoryId: tx.categoryId === 'cat_1' ? 'cat_33' : tx.categoryId
    });
    setShowLinkPixModal(false);
  };

  // Handler para desvincular transação do show
  const handleUnlinkTransaction = (tx: Transaction) => {
    updateTransaction({
      ...tx,
      showId: undefined
    });
  };

  // Handler para registrar novo recebimento manual
  const handleSaveManualPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(payAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    // Registra como transação real de entrada no financeiro vinculada ao show
    const newTx: any = {
      type: 'income',
      amount: amountVal,
      description: `Cachê: ${show.contractorName || show.name} (${payType})`,
      categoryId: 'cat_33',
      accountId: payAccountId,
      date: payDate,
      status: 'paid',
      scope: 'BUSINESS',
      showId: show.id
    };

    addTransaction(newTx);
    setPayAmount('');
    setPayNotes('');
    setIsAddPaymentOpen(false);
  };

  // Handler para registrar despesa do show
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(expAmount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    let catId = 'cat_producao_shows';
    if (expCategory.toLowerCase().includes('combust')) catId = 'cat_21';

    const newTx: any = {
      type: 'expense',
      amount: amountVal,
      description: `Despesa Show (${show.contractorName || show.name}): ${expCategory}${expNotes ? ` - ${expNotes}` : ''}`,
      categoryId: catId,
      accountId: expAccountId,
      date: expDate,
      status: 'paid',
      scope: 'BUSINESS',
      showId: show.id
    };

    addTransaction(newTx);
    setExpAmount('');
    setExpNotes('');
    setIsAddExpenseOpen(false);
  };

  const handleConfirmDelete = () => {
    onDelete(show.id);
  };

  return (
    <>
      {/* BACKDROP BLUR */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[105] animate-fade-in transition-opacity"
      />

      {/* DRAWER LATERAL (SLIDE-OVER PANEL) */}
      <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white dark:bg-slate-900 shadow-2xl z-[110] border-l border-slate-200/80 dark:border-slate-800 flex flex-col animate-slide-left overflow-hidden">
        
        {/* ========================================================================= */}
        {/* DRAWER HEADER COM STATUS, INFORMAÇÕES E BOTÕES DE AÇÃO RÁPIDA */}
        {/* ========================================================================= */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Music size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${statusCfg.badgeClass}`}>
                  {show.status}
                </span>
                {isFullyPaid && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-500 text-white flex items-center space-x-1">
                    <Check size={10} strokeWidth={3} />
                    <span>Quitado</span>
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate mt-0.5">
                {show.contractorName || show.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(show)}
              className="p-2 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              title="Editar Show"
            >
              <Edit3 size={17} />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              title="Excluir Show"
            >
              <Trash2 size={17} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition ml-1"
              title="Fechar Painel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BARRA DE STATUS RÁPIDO & PROGRESSO VISUAL DO PAGAMENTO */}
        {/* ========================================================================= */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 space-y-3.5 shrink-0">
          
          {/* Seletor Rápido de Status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Calendar size={13} className="text-purple-500" />
              <span className="font-bold">{formatDateBR(show.date)} • {show.time || '20:00'}</span>
            </div>

            <div className="flex items-center space-x-1.5">
              {show.status !== 'Realizado' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(show, 'Realizado')}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black uppercase tracking-wider transition active:scale-95 shadow-sm flex items-center space-x-1"
                >
                  <CheckCircle2 size={13} />
                  <span>Marcar Realizado</span>
                </button>
              )}

              {show.status === 'Realizado' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(show, 'Confirmado')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase transition"
                >
                  Reabrir (Confirmado)
                </button>
              )}
            </div>
          </div>

          {/* Card com Barra de Progresso Financeiro */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Status de Recebimento do Cachê
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {formatCurrency(finSummary.totalReceived)} de {formatCurrency(finSummary.totalPredicted)}
                </span>
              </div>

              <div className="text-right">
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  isFullyPaid 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : percentReceived > 0 
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {percentReceived}% Recebido
                </span>
                {finSummary.totalPending > 0 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                    Falta: {formatCurrency(finSummary.totalPending)}
                  </span>
                )}
              </div>
            </div>

            {/* Barra Visual de Progresso */}
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  isFullyPaid 
                    ? 'bg-emerald-500' 
                    : percentReceived > 0 
                    ? 'bg-purple-600' 
                    : 'bg-transparent'
                }`}
                style={{ width: `${percentReceived}%` }}
              />
            </div>
          </div>

          {/* Abas de Navegação do Drawer */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 pt-1">
            <button
              onClick={() => setActiveSection('finance')}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center justify-center space-x-1.5 ${
                activeSection === 'finance'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <DollarSign size={14} />
              <span>Recebimentos ({linkedIncomeTransactions.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('expenses')}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center justify-center space-x-1.5 ${
                activeSection === 'expenses'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <ArrowDownRight size={14} />
              <span>Despesas ({linkedExpenseTransactions.length})</span>
            </button>

            <button
              onClick={() => setActiveSection('details')}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center justify-center space-x-1.5 ${
                activeSection === 'details'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Info size={14} />
              <span>Detalhes & Contrato</span>
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CORPO PRINCIPAL DO DRAWER COM ROLAGEM SUAVE */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          
          {/* SEÇÃO 1: FINANCEIRO & RECEBIMENTOS VINCULADOS */}
          {activeSection === 'finance' && (
            <div className="space-y-4 animate-fade-in">
              
              {/* Botões de Ação para Recebimentos */}
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Transações Vinculadas de Receita
                </h4>

                <div className="flex items-center space-x-1.5">
                  {unlinkedIncomeTransactions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowLinkPixModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-200 dark:border-purple-800 flex items-center space-x-1 transition"
                    >
                      <Link2 size={12} />
                      <span>Vincular Pix do Extrato ({unlinkedIncomeTransactions.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsAddPaymentOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center space-x-1 transition"
                  >
                    <Plus size={13} strokeWidth={3} />
                    <span>+ Recebimento</span>
                  </button>
                </div>
              </div>

              {/* Lista de Transações de Receita Vinculadas */}
              {linkedIncomeTransactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <DollarSign size={24} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum recebimento vinculado ainda</p>
                  <p className="text-[11px] text-slate-400">
                    Ao cair um Pix no extrato, você pode vinculá-lo a este show para amortizar o saldo devedor.
                  </p>
                  {unlinkedIncomeTransactions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowLinkPixModal(true)}
                      className="mt-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-sm"
                    >
                      Ver Pix Disponíveis para Vincular
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedIncomeTransactions.map(tx => {
                    const acc = accounts.find(a => a.id === tx.accountId);
                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between shadow-xs group"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {tx.description}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Recebido
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{formatDateBR(tx.date)}</span>
                            {acc && <span>• {acc.name}</span>}
                            {tx.importedFromBank && <span className="text-purple-500 font-bold">• Extrato Bancário</span>}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            + {formatCurrency(tx.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnlinkTransaction(tx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition opacity-80 group-hover:opacity-100"
                            title="Desvincular do Show"
                          >
                            <Unlink size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Formulário Inline: Registrar Novo Pagamento / Sinal */}
              {isAddPaymentOpen && (
                <form onSubmit={handleSaveManualPayment} className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 space-y-3 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                      Registrar Recebimento Manual
                    </h5>
                    <button type="button" onClick={() => setIsAddPaymentOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Tipo</label>
                      <select
                        value={payType}
                        onChange={e => setPayType(e.target.value as ShowPaymentType)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                      >
                        <option value="Sinal">Sinal (Entrada)</option>
                        <option value="Parcela">Parcela</option>
                        <option value="Restante">Pagamento Final</option>
                        <option value="Extra">Cachê Extra</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Valor (R$)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ex: 500"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Data do Recebimento</label>
                      <input
                        type="date"
                        value={payDate}
                        onChange={e => setPayDate(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Conta Bancária</label>
                      <select
                        value={payAccountId}
                        onChange={e => setPayAccountId(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddPaymentOpen(false)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-black uppercase shadow-sm"
                    >
                      Confirmar Entrada
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* SEÇÃO 2: DESPESAS DA APRESENTAÇÃO */}
          {activeSection === 'expenses' && (
            <div className="space-y-4 animate-fade-in">
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Custos & Produção do Show
                  </h4>
                  <p className="text-[10px] text-slate-400">Total de Despesas: {formatCurrency(finSummary.totalExpenses)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black uppercase tracking-wider flex items-center space-x-1 transition"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>+ Despesa</span>
                </button>
              </div>

              {/* Lucro Líquido Card */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                    Lucro Líquido Real do Show
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Recebido ({formatCurrency(finSummary.totalReceived)}) - Despesas ({formatCurrency(finSummary.totalExpenses)})
                  </span>
                </div>
                <span className={`text-base font-black tabular-nums ${
                  finSummary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {formatCurrency(finSummary.netProfit)}
                </span>
              </div>

              {/* Lista de Despesas */}
              {linkedExpenseTransactions.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                  <ArrowDownRight size={24} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhuma despesa vinculada</p>
                  <p className="text-[11px] text-slate-400">Adicione gastos com músicos contratados, equipe, combustível ou pedágio.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedExpenseTransactions.map(tx => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between shadow-xs"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {tx.description}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDateBR(tx.date)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400 tabular-nums">
                          - {formatCurrency(tx.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnlinkTransaction(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition"
                          title="Desvincular Despesa"
                        >
                          <Unlink size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário Inline: Registrar Despesa */}
              {isAddExpenseOpen && (
                <form onSubmit={handleSaveExpense} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Registrar Despesa do Show
                    </h5>
                    <button type="button" onClick={() => setIsAddExpenseOpen(false)} className="text-slate-400">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Categoria</label>
                      <select
                        value={expCategory}
                        onChange={e => setExpCategory(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                      >
                        {EXPENSE_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Valor (R$)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ex: 200"
                        value={expAmount}
                        onChange={e => setExpAmount(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddExpenseOpen(false)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-black uppercase shadow-sm"
                    >
                      Salvar Despesa
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* SEÇÃO 3: DETALHES & CONTRATO */}
          {activeSection === 'details' && (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Contratante</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{show.contractorName || show.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block text-right">Tipo de Evento</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{show.eventType || 'Show / Apresentação'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Data & Horário</span>
                    <span className="font-bold text-slate-800 dark:text-white">{formatDateBR(show.date)} às {show.time || '20:00'}{show.endTime ? ` até ${show.endTime}` : ''}</span>
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Localidade</span>
                    <span className="font-bold text-slate-800 dark:text-white">{show.city || 'Cidade a definir'}</span>
                  </div>
                </div>

                {show.location && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Endereço / Local</span>
                    <span className="font-bold text-slate-800 dark:text-white">{show.location}</span>
                  </div>
                )}

                {show.notes && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Observações</span>
                    <p className="font-medium text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{show.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL PARA VINCULAR PIX DO EXTRATO NÃO ASSOCIADO */}
      {showLinkPixModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[125] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Vincular Pix do Extrato</h4>
                <p className="text-[10px] text-slate-400">Selecione uma receita para amortizar o saldo deste show</p>
              </div>
              <button type="button" onClick={() => setShowLinkPixModal(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 no-scrollbar">
              {unlinkedIncomeTransactions.map(tx => (
                <div
                  key={tx.id}
                  onClick={() => handleLinkTransaction(tx)}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-slate-700 hover:border-purple-400 cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-black text-slate-800 dark:text-white">{tx.description}</h5>
                    <span className="text-[10px] text-slate-400">{formatDateBR(tx.date)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block tabular-nums">
                      + {formatCurrency(tx.amount)}
                    </span>
                    <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400">
                      Clique para Vincular
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setShowLinkPixModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/85 z-[130] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in text-center">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 size={26} />
            </div>
            <h4 className="text-base font-black text-slate-900 dark:text-white mb-1">Excluir Apresentação?</h4>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              Esta ação removerá o evento da agenda e desvinculará suas movimentações financeiras.
            </p>
            <div className="flex space-x-3 justify-center">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase shadow-md"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
