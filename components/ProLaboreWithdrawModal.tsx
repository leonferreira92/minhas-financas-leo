import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  X, ArrowRightLeft, Wallet, CheckCircle2, DollarSign, Calendar, 
  Landmark, Info, ShieldCheck, TrendingUp, Sparkles, AlertCircle, Target
} from 'lucide-react';
import { getAccountVinculo, parseCurrencyInput } from '../services/financeAggregator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
}

export const ProLaboreWithdrawModal: React.FC<Props> = ({ isOpen, onClose, defaultAmount }) => {
  const { accounts, categories, transactions, debts, settings, addTransaction, getAccountBalance, isBlurred } = useFinance();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Find business account (vinculo === 'MUSICO') or first active account
  const defaultSourceAccount = useMemo(() => {
    return accounts.find(a => getAccountVinculo(a) === 'MUSICO') || accounts.find(a => a.scope === 'BUSINESS') || accounts.find(a => a.enabled !== false) || accounts[0];
  }, [accounts]);

  // Find personal account (vinculo === 'PESSOAL') or second account
  const defaultDestAccount = useMemo(() => {
    return accounts.find(a => getAccountVinculo(a) === 'PESSOAL') || accounts.find(a => a.scope === 'PERSONAL') || accounts.find(a => a.id !== defaultSourceAccount?.id && a.enabled !== false) || accounts[0];
  }, [accounts, defaultSourceAccount]);

  // ---------------------------------------------------------------------------
  // CÁLCULOS INTELIGENTES DE INTERLIGAÇÃO (EMPRESA vs PESSOAL)
  // ---------------------------------------------------------------------------
  const interlinkMetrics = useMemo(() => {
    // 1. Custo de Vida Essencial Pessoal (Meta de Retirada)
    // Despesas pessoais essenciais no mês atual ou média
    const personalEssentialTxs = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const isPersonal = t.scope === 'PERSONAL' || !t.scope;
      if (!isPersonal) return false;
      // Essential category check
      const cat = categories.find(c => c.id === t.categoryId);
      const isEssential = cat?.classification === 'essential' || ['cat_1', 'cat_2', 'cat_3', 'cat_21', 'cat_4', 'cat_11', 'cat_12', 'cat_13', 'cat_14', 'cat_26', 'cat_27'].includes(t.categoryId);
      return isEssential;
    });

    const currMonthPersonalEssential = personalEssentialTxs
      .filter(t => t.date && t.date.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Se no mês atual ainda não tem gastos suficientes registrados, calcula a base total do mês ou um valor de referência
    const personalMetaWithdrawal = currMonthPersonalEssential > 0 ? currMonthPersonalEssential : 3084.74;

    // 2. Apuração do Lucro Líquido do Músico no Mês Atual
    const musicianMonthIncome = transactions
      .filter(t => t.type === 'income' && (t.scope === 'BUSINESS' || !!t.showId) && t.date && t.date.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const musicianMonthExpenses = transactions
      .filter(t => t.type === 'expense' && (t.scope === 'BUSINESS' || !!t.showId) && t.date && t.date.startsWith(currentMonthPrefix) && !t.description.toLowerCase().includes('pró-labore') && !t.description.toLowerCase().includes('pro-labore'))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const musicianNetProfit = Math.max(0, musicianMonthIncome - musicianMonthExpenses);

    // 3. Reinvestimento Recomendado da Empresa: 20% do Lucro Líquido
    const recommendedReinvestment = Math.round(musicianNetProfit * 0.20);

    // 4. Saldo Real em Caixa do Músico
    const musicianAccounts = accounts.filter(a => a.scope === 'BUSINESS');
    const musicianCash = musicianAccounts.length > 0 
      ? musicianAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0)
      : (defaultSourceAccount ? getAccountBalance(defaultSourceAccount.id) : 0);

    // 5. Contas Pendentes do Mês da Empresa
    const companyPendingBills = transactions
      .filter(t => t.type === 'expense' && t.status === 'pending' && (t.scope === 'BUSINESS' || !!t.showId) && t.date && t.date.startsWith(currentMonthPrefix))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // 6. Saldo Seguro para Pró-Labore: [ Saldo Real em Caixa - Contas do Mês Empresa - Reserva de Reinvestimento ]
    const safeProLaboreAmount = Math.max(0, musicianCash - companyPendingBills - recommendedReinvestment);

    return {
      personalMetaWithdrawal,
      musicianNetProfit,
      recommendedReinvestment,
      musicianCash,
      companyPendingBills,
      safeProLaboreAmount
    };
  }, [transactions, categories, accounts, defaultSourceAccount, currentMonthPrefix, getAccountBalance]);

  const [amountStr, setAmountStr] = useState(() => {
    if (defaultAmount) return defaultAmount.toString();
    if (interlinkMetrics.safeProLaboreAmount > 0) {
      // Prioritize personalMetaWithdrawal if safe amount covers it, otherwise safeProLaboreAmount
      const initialVal = Math.min(interlinkMetrics.personalMetaWithdrawal, interlinkMetrics.safeProLaboreAmount);
      return initialVal > 0 ? initialVal.toString() : '';
    }
    return '';
  });

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

  const handleSetAmount = (val: number) => {
    setAmountStr(val.toFixed(2));
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

    // 1. SAÍDA no escopo MÚSICO (Categoria: Pró-Labore / Transferência)
    addTransaction({
      description: `Retirada de Pró-Labore: ${notes.trim() || 'Músico → Caixa Pessoal'}`,
      amount: parsedAmount,
      type: 'expense',
      date,
      status: 'paid',
      accountId: sourceAccountId || defaultSourceAccount?.id || 'acc_bank',
      categoryId: categoryShows?.id || 'cat_prolabore_out',
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
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in max-w-full overflow-x-hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-5 sm:p-7 animate-slide-up max-h-[92vh] overflow-y-auto no-scrollbar space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ArrowRightLeft size={22} strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 block">
                Módulo de Interligação • Dois Apps em Um
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
              Pró-Labore Transferido com Sucesso!
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              Duas movimentações sincronizadas geradas: <strong>Saída no Músico (Empresa)</strong> e <strong>Entrada no Pessoal</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4">
            
            {/* CARDS INTELIGENTES DE METRICA */}
            <div className="grid grid-cols-3 gap-2">
              
              {/* 1. Meta de Retirada (Custo de Vida Essencial Pessoal) */}
              <div 
                onClick={() => handleSetAmount(interlinkMetrics.personalMetaWithdrawal)}
                className="p-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer hover:border-indigo-400 transition text-left"
                title="Clique para usar a meta de custo de vida essencial"
              >
                <div className="flex items-center space-x-1 text-indigo-600 dark:text-indigo-400 mb-1">
                  <Target size={12} strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Meta Pessoal</span>
                </div>
                <div className="text-xs font-black text-indigo-950 dark:text-indigo-200 tabular-nums truncate">
                  {!isBlurred ? formatCurrency(interlinkMetrics.personalMetaWithdrawal) : '••••'}
                </div>
                <span className="text-[8px] text-indigo-600/80 dark:text-indigo-400 font-bold block mt-0.5">Custo Essencial</span>
              </div>

              {/* 2. Reinvestimento Recomendado (20% do Lucro) */}
              <div className="p-2.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-left">
                <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400 mb-1">
                  <ShieldCheck size={12} strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Reserva 20%</span>
                </div>
                <div className="text-xs font-black text-purple-950 dark:text-purple-200 tabular-nums truncate">
                  {!isBlurred ? formatCurrency(interlinkMetrics.recommendedReinvestment) : '••••'}
                </div>
                <span className="text-[8px] text-purple-600/80 dark:text-purple-400 font-bold block mt-0.5">Carreira Musical</span>
              </div>

              {/* 3. Saldo Seguro para Retirada */}
              <div 
                onClick={() => handleSetAmount(interlinkMetrics.safeProLaboreAmount)}
                className="p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 cursor-pointer hover:border-emerald-400 transition text-left"
                title="Clique para preencher com o Saldo Seguro recomendado"
              >
                <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 mb-1">
                  <Sparkles size={12} strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Saldo Seguro</span>
                </div>
                <div className="text-xs font-black text-emerald-950 dark:text-emerald-200 tabular-nums truncate">
                  {!isBlurred ? formatCurrency(interlinkMetrics.safeProLaboreAmount) : '••••'}
                </div>
                <span className="text-[8px] text-emerald-600/80 dark:text-emerald-400 font-bold block mt-0.5">Livre p/ Retirar</span>
              </div>

            </div>

            {/* Input de Valor */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Valor da Retirada (R$)
                </label>
                <span className="text-[10px] text-slate-400 font-bold">
                  Disponível Músico: <strong className="text-slate-700 dark:text-slate-200">{!isBlurred ? formatCurrency(sourceBalance) : '••••'}</strong>
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
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none font-black text-xl text-slate-900 dark:text-white transition"
                  required
                />
              </div>

              {/* Botões de Acesso Rápido */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => handleSetAmount(interlinkMetrics.personalMetaWithdrawal)}
                  className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[10px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                >
                  Meta: {formatCurrency(interlinkMetrics.personalMetaWithdrawal)}
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAmount(interlinkMetrics.safeProLaboreAmount)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition"
                >
                  Seguro: {formatCurrency(interlinkMetrics.safeProLaboreAmount)}
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(500)}
                  className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-600 transition"
                >
                  + R$ 500
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(1000)}
                  className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-600 transition"
                >
                  + R$ 1.000
                </button>
                {sourceBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetAmount(sourceBalance)}
                    className="ml-auto px-2.5 py-1 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 text-[10px] font-extrabold hover:bg-purple-600/20 transition"
                  >
                    Saldo Total
                  </button>
                )}
              </div>
            </div>

            {/* Contas Origem & Destino */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Conta Origem (Músico) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Origem (Músico / Empresa)
                </label>
                <select
                  value={sourceAccountId}
                  onChange={e => setSourceAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.scope === 'BUSINESS' ? '(Músico)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conta Destino (Pessoal) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Destino (Pessoal)
                </label>
                <select
                  value={destAccountId}
                  onChange={e => setDestAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.scope === 'PERSONAL' ? '(Pessoal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data & Descrição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Data da Transferência
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Retirada de Pró-Labore"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white"
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
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/25 active:scale-95 transition disabled:opacity-40"
              >
                Confirmar Transferência
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
