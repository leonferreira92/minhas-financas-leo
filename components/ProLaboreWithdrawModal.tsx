import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { X, ArrowRightLeft, Wallet, CheckCircle2, DollarSign, Calendar, Landmark, Info } from 'lucide-react';
import { parseCurrencyInput } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
}

export const ProLaboreWithdrawModal: React.FC<Props> = ({ isOpen, onClose, defaultAmount }) => {
  const { accounts, categories, addTransaction, getAccountBalance, isBlurred } = useFinance();

  // Find business account or first active account
  const defaultSourceAccount = useMemo(() => {
    return accounts.find(a => a.scope === 'BUSINESS') || accounts.find(a => a.enabled !== false) || accounts[0];
  }, [accounts]);

  // Find personal account or second account
  const defaultDestAccount = useMemo(() => {
    return accounts.find(a => a.scope === 'PERSONAL') || accounts.find(a => a.id !== defaultSourceAccount?.id && a.enabled !== false) || accounts[0];
  }, [accounts, defaultSourceAccount]);

  const [amountStr, setAmountStr] = useState(defaultAmount ? defaultAmount.toString() : '');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceAccountId, setSourceAccountId] = useState(defaultSourceAccount?.id || '');
  const [destAccountId, setDestAccountId] = useState(defaultDestAccount?.id || '');
  const [notes, setNotes] = useState('Retirada de Pró-Labore da Carreira Musical');
  const [isSuccess, setIsSuccess] = useState(false);

  // Source account current balance
  const sourceBalance = useMemo(() => {
    if (!sourceAccountId) return 0;
    return getAccountBalance(sourceAccountId);
  }, [sourceAccountId, getAccountBalance]);

  if (!isOpen) return null;

  const handleQuickAdd = (val: number) => {
    const current = parseCurrencyInput(amountStr);
    setAmountStr((current + val).toString());
  };

  const handleSetMax = () => {
    if (sourceBalance > 0) {
      setAmountStr(sourceBalance.toString());
    }
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseCurrencyInput(amountStr);
    if (parsedAmount <= 0) {
      return;
    }

    // 1. Categoria Saída (Shows)
    const categoryShows = categories.find(c => 
      c.type === 'expense' && (c.id === 'cat_prolabore_out' || c.name.toLowerCase().includes('pró-labore') || c.name.toLowerCase().includes('pro-labore'))
    ) || categories.find(c => c.name.toLowerCase().includes('transfer')) || categories[0];

    // 2. Categoria Entrada (Pessoal)
    const categoryPersonal = categories.find(c => 
      c.type === 'income' && (c.id === 'cat_prolabore_in' || c.id === 'cat_7' || c.name.toLowerCase().includes('pró-labore') || c.name.toLowerCase().includes('pro-labore'))
    ) || categories.find(c => c.type === 'income') || categories[0];

    // 1. SAÍDA no escopo SHOWS (Categoria: Pró-Labore / Transferência)
    addTransaction({
      description: `Retirada de Pró-Labore: ${notes.trim() || 'Shows → Caixa Pessoal'}`,
      amount: parsedAmount,
      type: 'expense',
      date,
      status: 'paid',
      accountId: sourceAccountId || defaultSourceAccount?.id || 'acc_bank',
      categoryId: categoryShows?.id || 'cat_transfer',
      scope: 'BUSINESS'
    });

    // 2. ENTRADA no escopo PESSOAL (Categoria: Pró-Labore / Renda da Música)
    addTransaction({
      description: `Recebimento de Pró-Labore: ${notes.trim() || 'Renda da Música'}`,
      amount: parsedAmount,
      type: 'income',
      date,
      status: 'paid',
      accountId: destAccountId || defaultDestAccount?.id || 'acc_bank',
      categoryId: categoryPersonal?.id || 'cat_7',
      scope: 'PERSONAL'
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 sm:p-7 animate-slide-up max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
              <ArrowRightLeft size={22} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 block">
                Transferência entre Caixas
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Retirar Pró-Labore
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-12 text-center space-y-3 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>
            <h4 className="text-xl font-black text-slate-900 dark:text-white">
              Pró-Labore Retirado com Sucesso!
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              Duas movimentações sincronizadas geradas: Saída no Caixa de Shows e Entrada no Caixa Pessoal.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-5 pt-4">
            {/* Explicação da Operação */}
            <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-900/40 flex items-start space-x-3">
              <Info size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-900 dark:text-purple-200/90 leading-relaxed font-medium">
                Esta ação retira recursos gerados pelos shows e transfere oficialmente para o seu caixa pessoal como renda da música.
              </p>
            </div>

            {/* Input de Valor */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Valor da Retirada (R$)
                </label>
                <span className="text-[10px] text-slate-400 font-bold">
                  Disponível no Caixa: <strong className="text-slate-700 dark:text-slate-200">{!isBlurred ? formatCurrency(sourceBalance) : '••••'}</strong>
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-400">
                  R$
                </span>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  placeholder="0,00"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none font-black text-xl text-slate-900 dark:text-white transition"
                  required
                />
              </div>

              {/* Botões de Acesso Rápido */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleQuickAdd(500)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-600 transition"
                >
                  + R$ 500
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(1000)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-600 transition"
                >
                  + R$ 1.000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(2000)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-600 transition"
                >
                  + R$ 2.000
                </button>
                {sourceBalance > 0 && (
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="ml-auto px-2.5 py-1 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 text-[10px] font-extrabold hover:bg-purple-600/20 transition"
                  >
                    Saldo Total
                  </button>
                )}
              </div>
            </div>

            {/* Contas Origem & Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Conta Origem (Shows) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                  Origem (Caixa Shows)
                </label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.scope === 'BUSINESS' ? '(Shows)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conta Destino (Pessoal) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                  Destino (Caixa Pessoal)
                </label>
                <select
                  value={destAccountId}
                  onChange={e => setDestAccountId(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.scope === 'PERSONAL' ? '(Pessoal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data & Observação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                  Data da Transferência
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                  Identificação / Descrição
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Retirada de Pró-Labore"
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Ações */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={!amountStr || parseCurrencyInput(amountStr) <= 0}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/25 active:scale-95 transition disabled:opacity-40"
              >
                Confirmar Retirada
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
