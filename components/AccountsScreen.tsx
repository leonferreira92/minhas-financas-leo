import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Landmark, Plus, Wallet, PiggyBank, CreditCard, 
  ArrowLeft, Pencil, CheckCircle2, ChevronRight, RefreshCw, 
  Layers, Sparkles, User, Music, HelpCircle, Building2, Lock
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

  // Contas ativas (excluindo arquivadas, ocultas ou desativadas)
  const activeAccounts = useMemo(() => {
    return accounts.filter(isAccountActive);
  }, [accounts]);

  // Contas Pessoais vs legado empresa (local)
  const personalAccounts = useMemo(() => {
    return activeAccounts.filter(a => a.vinculo !== 'MUSICO' && a.scope !== 'BUSINESS');
  }, [activeAccounts]);

  const musicAccounts = useMemo(() => {
    return activeAccounts.filter(a => a.vinculo === 'MUSICO' || a.scope === 'BUSINESS');
  }, [activeAccounts]);

  const personalTotal = useMemo(() => {
    return parseFloat(
      personalAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0).toFixed(2)
    );
  }, [personalAccounts, getAccountBalance]);

  const liveCompanyCash = companyEstimate.companyCashBalance;

  // Pessoal + saldo vivo empresa (não soma legado local)
  const consolidatedTotal = useMemo(() => {
    return parseFloat((personalTotal + (liveCompanyCash != null ? liveCompanyCash : 0)).toFixed(2));
  }, [personalTotal, liveCompanyCash]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const initialBal = parseCurrencyInput(newAccBalance);
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
    <div className="space-y-6 pb-24 animate-fade-in text-slate-900">
      {/* HEADER SUPERIOR */}
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
            <p className="text-[11px] text-slate-600 font-medium">Gestão de múltiplas contas e carteiras</p>
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
            {activeAccounts.length} {activeAccounts.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
          </span>
        </div>

        <div className="mt-3">
          <h2 className="text-3xl font-black text-white tracking-tight">
            {formatCurrency(consolidatedTotal)}
          </h2>
          <p className="text-[11px] text-blue-200/80 mt-1">
            Contas pessoais + saldo vivo da empresa (Vida de Artista). Legado local não entra nesta soma.
          </p>
        </div>
      </div>

      {/* EMPRESA AO VIVO (SOMENTE LEITURA) */}
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
                Saldo em Conta (empresa)
              </span>
              <span className="text-[10px] text-indigo-700 block">
                Espelho Firestore · companyCashBalance
              </span>
            </div>
          </div>
          <span className="text-sm font-black text-indigo-800">
            {companyEstimate.isLoading
              ? '…'
              : liveCompanyCash != null
                ? formatCurrency(liveCompanyCash)
                : companyEstimate.needsCompanyAuth
                  ? 'Conecte no card de pró-labore'
                  : formatCurrency(0)}
          </span>
        </div>
      </div>

      {/* LISTA DE CONTAS PESSOAIS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <User size={14} className="text-blue-600" />
            <span>Contas Pessoais & Família</span>
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

      {/* LEGADO LOCAL — extrato antigo neste app (não é o saldo oficial) */}
      {musicAccounts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Music size={14} className="text-slate-500" />
              <span>Legado local (histórico)</span>
            </h3>
            <span className="text-[10px] text-slate-600 font-bold">{musicAccounts.length} contas</span>
          </div>
          <p className="text-[10px] text-slate-500 px-1 leading-snug">
            Saldos calculados pelos lançamentos antigos neste app. Preservados para o extrato; o saldo oficial da empresa é o card acima (Vida de Artista).
          </p>
          <div className="space-y-2.5">
            {musicAccounts.map(acc => {
              const Icon = getAccountIcon(acc.type);
              const balance = getAccountBalance(acc.id);
              return (
                <div 
                  key={acc.id}
                  onClick={() => setSelectedAccountForEdit(acc)}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition flex items-center justify-between cursor-pointer group shadow-xs active:scale-[0.99] opacity-90"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner bg-slate-200 text-slate-600">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-black text-slate-900 group-hover:text-slate-700 transition truncate">
                          {acc.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 border border-slate-300">
                          Legado
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 block">
                        Extrato local · não é o caixa oficial
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center space-x-2">
                    <div>
                      <span className="text-sm font-black text-slate-700 block">
                        {formatCurrency(balance)}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center justify-end gap-1 font-semibold">
                        <Pencil size={10} /> Conciliar legado
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-900 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL PARA CADASTRO DE NOVA CONTA */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">Cadastrar Nova Conta</h3>
            <p className="text-xs text-slate-600 mb-5">Adicione um banco, carteira física ou conta digital</p>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Nome da Conta / Banco</label>
                <input
                  type="text"
                  placeholder="Ex: Banco do Brasil, Mercado Pago, Carteira"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="bank">Conta Corrente</option>
                    <option value="wallet">Carteira / Dinheiro</option>
                    <option value="savings">Poupança / Reserva</option>
                    <option value="investment">Investimento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Vínculo</label>
                  <select
                    value={newAccVinculo}
                    onChange={e => setNewAccVinculo(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="PESSOAL">Pessoal / Família</option>
                    <option value="MUSICO">Músico / Shows</option>
                    <option value="NEUTRO">Neutro (Ambos)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Saldo Inicial (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={newAccBalance}
                  onChange={e => setNewAccBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition"
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
