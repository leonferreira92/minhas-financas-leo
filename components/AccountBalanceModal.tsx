import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Account, AccountType, ScopeType } from '../types';
import { X, Wallet, CreditCard, PiggyBank, Landmark, HelpCircle, Save, Trash2, CheckCircle2, User, Music, RefreshCw } from 'lucide-react';

interface AccountBalanceModalProps {
  account: Account | null;
  onClose: () => void;
}

export const AccountBalanceModal: React.FC<AccountBalanceModalProps> = ({ account, onClose }) => {
  const { reconcileBalance, getAccountBalance, updateAccount, deleteAccount, transactions } = useFinance();

  const [activeTab, setActiveTab] = useState<'balance' | 'details'>('balance');
  
  // Reconcile State
  const [newBalanceInput, setNewBalanceInput] = useState('');
  
  // Edit Details State
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [color, setColor] = useState('#6366f1');
  const [scope, setScope] = useState<ScopeType>('BOTH');

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setColor(account.color);
      setScope(account.scope || 'BOTH');
      const currentVal = getAccountBalance(account.id);
      setNewBalanceInput(currentVal.toString());
      setActiveTab('balance');
    }
  }, [account, transactions]);

  if (!account) return null;

  const currentBalance = getAccountBalance(account.id);
  const parsedNewBalance = parseFloat(newBalanceInput) || 0;
  const difference = parsedNewBalance - currentBalance;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBalanceInput.trim() === '') return;
    reconcileBalance(account.id, parsedNewBalance);
    onClose();
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '') return;
    updateAccount({
      ...account,
      name,
      type,
      color,
      scope: scope || 'BOTH'
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Deseja realmente excluir a conta "${account.name}"? Isso pode impactar o cálculo de saldos passados.`)) {
      deleteAccount(account.id);
      onClose();
    }
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'wallet': return <Wallet size={20} />;
      case 'bank': return <Landmark size={20} />;
      case 'savings': return <PiggyBank size={20} />;
      case 'investment': return <CreditCard size={20} />;
      default: return <HelpCircle size={20} />;
    }
  };

  const accountTypes: { value: AccountType; label: string }[] = [
    { value: 'bank', label: 'Conta Corrente' },
    { value: 'wallet', label: 'Carteira (Dinheiro)' },
    { value: 'savings', label: 'Poupança / Reserva' },
    { value: 'investment', label: 'Investimentos' },
    { value: 'other', label: 'Outros' }
  ];

  const colors = [
    '#6366f1', '#06b6d4', '#10b981', '#f59e0b', 
    '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6',
    '#22c55e', '#eab308', '#f97316', '#3b82f6'
  ];

  return (
    <div id="account-balance-modal" className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-fade-in">
      <div id="account-balance-modal-content" className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden animate-scale-in">
        
        {/* Header da Conta */}
        <div 
          className="p-6 text-white relative overflow-hidden"
          style={{ backgroundColor: color }}
        >
          {/* Luz ambiente sutil */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-sm">
                {getAccountIcon(type)}
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
                  {accountTypes.find(t => t.value === type)?.label || 'Conta'}
                </span>
                <h3 className="text-xl font-black tracking-tight leading-tight">{name}</h3>
              </div>
            </div>
            
            <button 
              id="account-modal-close-btn"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95 border border-white/5"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-6 flex justify-between items-baseline relative z-10">
            <span className="text-xs font-bold text-white/80">Saldo Atual no App</span>
            <span className="text-3xl font-black tracking-tight tabular-nums">{formatCurrency(currentBalance)}</span>
          </div>
        </div>

        {/* Tabs de Controle */}
        <div id="account-modal-tabs" className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-1">
          <button
            id="tab-balance"
            onClick={() => setActiveTab('balance')}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider transition-all rounded-2xl ${
              activeTab === 'balance'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-700/50'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Ajustar Saldo
          </button>
          <button
            id="tab-details"
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider transition-all rounded-2xl ${
              activeTab === 'details'
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-100 dark:border-slate-700/50'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Editar Detalhes
          </button>
        </div>

        {/* Conteúdo */}
        <div id="account-modal-body" className="p-6">
          {activeTab === 'balance' ? (
            <form id="adjust-balance-form" onSubmit={handleSaveBalance} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Novo Saldo Real
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-black text-xl">
                    R$
                  </span>
                  <input
                    id="new-balance-input"
                    type="number"
                    step="any"
                    value={newBalanceInput}
                    onChange={e => setNewBalanceInput(e.target.value)}
                    className="w-full pl-14 pr-5 py-4.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl dark:text-white outline-none font-black text-2xl shadow-inner transition-all"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              {/* Feedback Visual Inteligente da Diferença */}
              <div 
                id="difference-feedback"
                className={`p-4 rounded-2xl border transition-all ${
                  Math.abs(difference) < 0.01
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                    : difference > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <div className="text-left">
                    <span className="block text-[10px] font-black uppercase tracking-wider">
                      Resumo do Ajuste
                    </span>
                    <span className="block text-xs font-bold leading-normal">
                      {Math.abs(difference) < 0.01 ? (
                        'Os valores são iguais. Nenhum ajuste necessário.'
                      ) : difference > 0 ? (
                        <>Isso criará uma transação de ajuste positivo de <strong className="font-extrabold">{formatCurrency(difference)}</strong>.</>
                      ) : (
                        <>Isso criará uma transação de ajuste negativo de <strong className="font-extrabold">{formatCurrency(difference)}</strong>.</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div id="balance-actions" className="flex items-center space-x-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  id="cancel-balance-btn"
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  id="save-balance-btn"
                  type="submit"
                  disabled={Math.abs(difference) < 0.01}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/15 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  Salvar Ajuste
                </button>
              </div>
            </form>
          ) : (
            <form id="edit-details-form" onSubmit={handleSaveDetails} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Nome da Conta
                </label>
                <input
                  id="account-name-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Ex: Santander, NuConta"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Tipo de Conta
                </label>
                <select
                  id="account-type-select"
                  value={type}
                  onChange={e => setType(e.target.value as AccountType)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  {accountTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Módulo / Conta Pertencente
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('PERSONAL')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center justify-center space-x-1 transition-all ${
                      scope !== 'BUSINESS'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <User size={13} />
                    <span>👤 Pessoal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('BUSINESS')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center justify-center space-x-1 transition-all ${
                      scope === 'BUSINESS'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Music size={13} />
                    <span>🎸 Músico / Empresa</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Cor de Identificação
                </label>
                <div id="color-palette" className="flex flex-wrap gap-2.5">
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 ${
                        color === c ? 'border-slate-800 dark:border-white scale-110 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              <div id="details-actions" className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center space-x-2.5">
                  <button
                    id="cancel-details-btn"
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    id="save-details-btn"
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/15 dark:shadow-none transition-all active:scale-[0.98]"
                  >
                    Salvar Dados
                  </button>
                </div>

                <button
                  id="delete-account-btn"
                  type="button"
                  onClick={handleDelete}
                  className="w-full py-2.5 text-rose-500 hover:text-rose-600 dark:text-rose-400/80 dark:hover:text-rose-400 font-bold text-[10px] uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all mt-2"
                >
                  Excluir Conta
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
