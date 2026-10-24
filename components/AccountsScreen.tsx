import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance, isLegacyCompanyAccount } from '../context/FinanceContext';
import { 
  Landmark, Plus, Wallet, PiggyBank, 
  ArrowLeft, Pencil, ChevronRight,
  Sparkles, User, Building2, Lock
} from 'lucide-react';
import { Account, AccountType, ScopeType } from '../types';
import { AccountBalanceModal } from './AccountBalanceModal';
import { parseCurrencyInput } from '../services/financeAggregator';
import { isAccountActive } from '../context/FinanceContext';
import { useProLaboreEstimate } from '../hooks/useProLaboreEstimate';

export const AccountsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, getAccountBalance, addAccount, isBlurred } = useFinance();
  const companyEstimate = useProLaboreEstimate();

  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);

  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('bank');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccColor, setNewAccColor] = useState('#003882');
  const [newAccVinculo, setNewAccVinculo] = useState<'PESSOAL' | 'MUSICO' | 'NEUTRO'>('PESSOAL');

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const activeAccounts = useMemo(() => accounts.filter(isAccountActive), [accounts]);

  const personalAccounts = useMemo(() => {
    return activeAccounts.filter(a => !isLegacyCompanyAccount(a));
  }, [activeAccounts]);

  const archivedCompanyCount = useMemo(() => {
    return accounts.filter(a => isLegacyCompanyAccount(a)).length;
  }, [accounts]);

  const personalTotal = useMemo(() => {
    return parseFloat(
      personalAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0).toFixed(2)
    );
  }, [personalAccounts, getAccountBalance]);

  /** Mesmo valor do card Estimativa de Pró-Labore Disponível */
  const companyMirror = companyEstimate.availableEstimate;

  const consolidatedTotal = useMemo(() => {
    return parseFloat((personalTotal + (Number(companyMirror) || 0)).toFixed(2));
  }, [personalTotal, companyMirror]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const initialBal = parseCurrencyInput(newAccBalance);
    // Novas contas: apenas pessoais (empresa vem do espelho)
    const vinculo = newAccVinculo === 'MUSICO' ? 'PESSOAL' : newAccVinculo;
    const finalScope: ScopeType = vinculo === 'PESSOAL' ? 'PERSONAL' : 'BOTH';

    addAccount({
      name: newAccName.trim(),
      type: newAccType,
      color: newAccColor,
      initialBalance: initialBal,
      enabled: true,
      scope: finalScope,
      vinculo
    });

    setNewAccName('');
    setNewAccType('bank');
    setNewAccBalance('');
    setNewAccColor('#003882');
    setNewAccVinculo('PESSOAL');
    setIsNewAccountModalOpen(false);
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'savings': return PiggyBank;
      case 'wallet': return Wallet;
      case 'investment': return Sparkles;
      default: return Landmark;
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in text-slate-900">
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition active:scale-95"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Landmark className="text-[#fcca00]" size={22} />
              <span>Saldo das Contas</span>
            </h1>
            <p className="text-[11px] text-slate-600 font-medium">Contas pessoais + espelho da empresa</p>
          </div>
        </div>

        <button
          onClick={() => setIsNewAccountModalOpen(true)}
          className="px-3 py-2 rounded-xl bg-[#003882] hover:bg-[#002d6c] text-[#fcca00] font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-md flex items-center space-x-1.5 border border-blue-600/40"
        >
          <Plus size={16} />
          <span>Nova Conta</span>
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002d6c] via-[#003882] to-[#001838] border border-blue-500/30 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-blue-200">
            Patrimônio Consolidado
          </span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-900/60 border border-blue-400/20 text-[#fcca00]">
            {personalAccounts.length} pessoais + 1 empresa
          </span>
        </div>

        <div className="mt-3">
          <h2 className="text-3xl font-black text-white tracking-tight">
            {formatCurrency(consolidatedTotal)}
          </h2>
          <p className="text-[11px] text-blue-200/80 mt-1">
            Pessoal + Pró-labore disponível (mesmo valor do card). Contas MUSICO locais arquivadas — não somam.
          </p>
        </div>
      </div>

      {/* ÚNICA conta empresa — availableEstimate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Building2 size={14} className="text-indigo-600" />
            <span>Empresa · Vida de Artista</span>
          </h3>
          <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
            <Lock size={10} /> Somente leitura
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-500/15 text-indigo-600">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-black text-slate-900 block truncate">
                Pró-labore / Transferência Disponível
              </span>
              <span className="text-[10px] text-indigo-700 block">
                Mesmo valor do card · availableProLabore
              </span>
            </div>
          </div>
          <span className="text-sm font-black text-indigo-800">
            {companyEstimate.isLoading
              ? '…'
              : companyEstimate.needsCompanyAuth
                ? 'Conecte no card'
                : formatCurrency(companyMirror)}
          </span>
        </div>
        {archivedCompanyCount > 0 && (
          <p className="text-[10px] text-slate-500 px-1 leading-snug">
            {archivedCompanyCount} conta(s) empresa local(is) arquivada(s): lançamentos antigos preservados no extrato, fora deste total.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <User size={14} className="text-blue-600" />
            <span>Contas Pessoais</span>
          </h3>
          <span className="text-[10px] text-slate-600 font-bold">{personalAccounts.length} contas</span>
        </div>

        <div className="space-y-2.5">
          {personalAccounts.map(acc => {
            const Icon = getAccountIcon(acc.type);
            const balance = getAccountBalance(acc.id);
            return (
              <div 
                key={acc.id}
                onClick={() => setSelectedAccountForEdit(acc)}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition flex items-center justify-between cursor-pointer group shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                    style={{ backgroundColor: `${acc.color || '#003882'}25`, color: acc.color || '#003882' }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition block truncate">
                      {acc.name}
                    </span>
                    <span className="text-[10px] text-slate-600 capitalize block">
                      {acc.type === 'wallet' ? 'Carteira Física / Espécie' : acc.type === 'savings' ? 'Poupança / Reserva' : 'Conta Corrente / Digital'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center space-x-2">
                  <div>
                    <span className="text-sm font-black text-slate-900 block">
                      {formatCurrency(balance)}
                    </span>
                    <span className="text-[10px] text-blue-600 flex items-center justify-end gap-1 font-semibold">
                      <Pencil size={10} /> Ajustar Saldo
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-900 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">Cadastrar Nova Conta</h3>
            <p className="text-xs text-slate-600 mb-5">Conta pessoal (empresa vem do Vida de Artista)</p>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Nome da Conta / Banco</label>
                <input
                  type="text"
                  placeholder="Ex: Banco do Brasil, Nubank, Carteira"
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Tipo</label>
                  <select
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value as AccountType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="bank">Conta / Banco</option>
                    <option value="wallet">Carteira</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Saldo Inicial (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={newAccBalance}
                    onChange={e => setNewAccBalance(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#003882] text-[#fcca00] font-black text-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAccountForEdit && (
        <AccountBalanceModal
          account={selectedAccountForEdit}
          onClose={() => setSelectedAccountForEdit(null)}
        />
      )}
    </div>
  );
};
