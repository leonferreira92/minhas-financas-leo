import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Landmark, Plus, Wallet, PiggyBank, CreditCard, 
  ArrowLeft, Pencil, CheckCircle2, ChevronRight, RefreshCw, 
  Layers, Sparkles, User, Music, HelpCircle
} from 'lucide-react';
import { Account, AccountType, ScopeType } from '../types';
import { AccountBalanceModal } from './AccountBalanceModal';

export const AccountsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, getAccountBalance, addAccount, isBlurred } = useFinance();

  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);

  // New account form state
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('bank');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccColor, setNewAccColor] = useState('#003882');
  const [newAccVinculo, setNewAccVinculo] = useState<'PESSOAL' | 'MUSICO' | 'NEUTRO'>('PESSOAL');

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Soma consolidada de todas as contas ativas
  const consolidatedTotal = useMemo(() => {
    return accounts
      .filter(a => a.enabled !== false)
      .reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  }, [accounts, getAccountBalance]);

  // Contas Pessoais vs Músico
  const personalAccounts = useMemo(() => {
    return accounts.filter(a => a.vinculo !== 'MUSICO' && a.scope !== 'BUSINESS');
  }, [accounts]);

  const musicAccounts = useMemo(() => {
    return accounts.filter(a => a.vinculo === 'MUSICO' || a.scope === 'BUSINESS');
  }, [accounts]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const initialBal = parseFloat(newAccBalance.replace(',', '.')) || 0;
    const finalScope: ScopeType = newAccVinculo === 'MUSICO' ? 'BUSINESS' : newAccVinculo === 'PESSOAL' ? 'PERSONAL' : 'BOTH';

    addAccount({
      name: newAccName.trim(),
      type: newAccType,
      color: newAccColor,
      initialBalance: initialBal,
      enabled: true,
      scope: finalScope,
      vinculo: newAccVinculo
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
    <div className="space-y-6 pb-24 animate-fade-in text-white">
      {/* HEADER SUPERIOR */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition active:scale-95"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Landmark className="text-[#fcca00]" size={22} />
              <span>Saldo das Contas</span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">Gestão de múltiplas contas e carteiras</p>
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

      {/* CARD CONSOLIDADO SUPERIOR ESTILO BB */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002d6c] via-[#003882] to-[#001838] border border-blue-500/30 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-blue-200">
            Patrimônio Consolidado
          </span>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-900/60 border border-blue-400/20 text-[#fcca00]">
            {accounts.length} contas cadastradas
          </span>
        </div>

        <div className="mt-3">
          <h2 className="text-3xl font-black text-white tracking-tight">
            {formatCurrency(consolidatedTotal)}
          </h2>
          <p className="text-[11px] text-blue-200/80 mt-1">Soma de todos os saldos de contas correntes, carteiras e investimentos</p>
        </div>
      </div>

      {/* LISTA DE CONTAS PESSOAIS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <User size={14} className="text-blue-400" />
            <span>Contas Pessoais & Família</span>
          </h3>
          <span className="text-[10px] text-zinc-400 font-bold">{personalAccounts.length} contas</span>
        </div>

        <div className="space-y-2.5">
          {personalAccounts.map(acc => {
            const Icon = getAccountIcon(acc.type);
            const balance = getAccountBalance(acc.id);
            return (
              <div 
                key={acc.id}
                onClick={() => setSelectedAccountForEdit(acc)}
                className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between cursor-pointer group shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                    style={{ backgroundColor: `${acc.color || '#003882'}25`, color: acc.color || '#003882' }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-black text-white group-hover:text-blue-400 transition block truncate">
                      {acc.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 capitalize block">
                      {acc.type === 'wallet' ? 'Carteira Física / Espécie' : acc.type === 'savings' ? 'Poupança / Reserva' : 'Conta Corrente / Digital'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center space-x-2">
                  <div>
                    <span className="text-sm font-black text-white block">
                      {formatCurrency(balance)}
                    </span>
                    <span className="text-[10px] text-blue-400 flex items-center justify-end gap-1 font-semibold">
                      <Pencil size={10} /> Ajustar Saldo
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 group-hover:text-white transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LISTA DE CONTAS DA MÚSICA / CARREIRA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Music size={14} className="text-[#fcca00]" />
            <span>Contas de Música & Shows</span>
          </h3>
          <span className="text-[10px] text-zinc-400 font-bold">{musicAccounts.length} contas</span>
        </div>

        {musicAccounts.length === 0 ? (
          <div className="p-4 rounded-2xl bg-zinc-900 border border-dashed border-zinc-800 text-center text-xs text-zinc-400">
            Nenhuma conta vinculada exclusivamente à carreira. Crie uma para isolar o caixa dos shows!
          </div>
        ) : (
          <div className="space-y-2.5">
            {musicAccounts.map(acc => {
              const Icon = getAccountIcon(acc.type);
              const balance = getAccountBalance(acc.id);
              return (
                <div 
                  key={acc.id}
                  onClick={() => setSelectedAccountForEdit(acc)}
                  className="p-4 rounded-2xl bg-[#18181b] border border-amber-900/30 hover:border-amber-700/60 transition flex items-center justify-between cursor-pointer group shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div 
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner bg-amber-500/10 text-[#fcca00]"
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-black text-white group-hover:text-[#fcca00] transition truncate">
                          {acc.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-[#fcca00] border border-amber-500/30">
                          Música
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 capitalize block">
                        Caixa Profissional
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center space-x-2">
                    <div>
                      <span className="text-sm font-black text-white block">
                        {formatCurrency(balance)}
                      </span>
                      <span className="text-[10px] text-[#fcca00] flex items-center justify-end gap-1 font-semibold">
                        <Pencil size={10} /> Ajustar Saldo
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400 group-hover:text-white transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA CADASTRO DE NOVA CONTA */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#121214] rounded-3xl border border-zinc-800 p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white tracking-tight mb-1">Cadastrar Nova Conta</h3>
            <p className="text-xs text-zinc-400 mb-5">Adicione um banco, carteira física ou conta digital</p>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Nome da Conta / Banco</label>
                <input
                  type="text"
                  placeholder="Ex: Banco do Brasil, Mercado Pago, Carteira"
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 text-sm focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Tipo</label>
                  <select
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value as AccountType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="bank">Conta Corrente</option>
                    <option value="wallet">Carteira / Dinheiro</option>
                    <option value="savings">Poupança / Reserva</option>
                    <option value="investment">Investimento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Vínculo</label>
                  <select
                    value={newAccVinculo}
                    onChange={e => setNewAccVinculo(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="PESSOAL">Pessoal / Família</option>
                    <option value="MUSICO">Músico / Shows</option>
                    <option value="NEUTRO">Neutro (Ambos)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">Saldo Inicial (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={newAccBalance}
                  onChange={e => setNewAccBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-400 text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#003882] hover:bg-[#002d6c] text-[#fcca00] text-xs font-black transition shadow-md"
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO / CONCILIAÇÃO DE SALDO */}
      {selectedAccountForEdit && (
        <AccountBalanceModal
          account={selectedAccountForEdit}
          onClose={() => setSelectedAccountForEdit(null)}
        />
      )}
    </div>
  );
};
