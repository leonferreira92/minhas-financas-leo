import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Receipt, Landmark, ShieldAlert, PiggyBank, 
  BarChart3, TrendingUp, Sparkles, Plus, Wallet, 
  ArrowRightLeft, Eye, EyeOff, CheckCircle2, ChevronRight, Pencil
} from 'lucide-react';
import { TransactionList } from './TransactionList';
import { DebtList } from './DebtList';
import { GoalsScreen } from './GoalsScreen';
import { CostOfLivingSection } from './CostOfLivingSection';
import { SpendingAveragesSection } from './SpendingAveragesSection';
import { ShowTargetSection } from './ShowTargetSection';
import { HowMuchCanISpendCard } from './HowMuchCanISpendCard';
import { FinancialOverviewSection } from './FinancialOverviewSection';
import { FinancialProjectionSection } from './FinancialProjectionSection';
import { PlanningScreen } from './PlanningScreen';
import { FinancialInsightsSection } from './FinancialInsightsSection';
import { FinancialInsights } from './FinancialInsights';
import { AccountBalanceModal } from './AccountBalanceModal';
import { TransactionForm } from './TransactionForm';
import { Account, AccountType } from '../types';

export type FinanceTab = 'movimentacoes' | 'contas' | 'dividas' | 'metas' | 'analises' | 'projecoes' | 'insights';

interface Props {
  initialTab?: FinanceTab;
}

export const FinancialHubScreen: React.FC<Props> = ({ initialTab = 'movimentacoes' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accounts, getAccountBalance, isBlurred, toggleBlur, addAccount } = useFinance();

  const tabParam = (searchParams.get('tab') as FinanceTab) || initialTab;
  const [activeTab, setActiveTab] = useState<FinanceTab>(tabParam);

  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<Account | null>(null);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('bank');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccColor, setNewAccColor] = useState('#6366f1');

  // Quick transaction modal
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense' | 'transfer'>('expense');

  useEffect(() => {
    if (searchParams.get('tab') && searchParams.get('tab') !== activeTab) {
      setActiveTab(searchParams.get('tab') as FinanceTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: FinanceTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    const initialBal = parseFloat(newAccBalance.replace(',', '.')) || 0;
    addAccount({
      name: newAccName.trim(),
      type: newAccType,
      color: newAccColor,
      initialBalance: initialBal,
      enabled: true
    });
    setNewAccName('');
    setNewAccType('bank');
    setNewAccBalance('');
    setNewAccColor('#6366f1');
    setIsNewAccountModalOpen(false);
  };

  const tabs = [
    { id: 'movimentacoes', label: 'Movimentações', icon: Receipt },
    { id: 'contas', label: 'Contas', icon: Landmark },
    { id: 'dividas', label: 'Dívidas', icon: ShieldAlert },
    { id: 'metas', label: 'Metas / Cofrinhos', icon: PiggyBank },
    { id: 'analises', label: 'Análises', icon: BarChart3 },
    { id: 'projecoes', label: 'Projeções', icon: TrendingUp },
    { id: 'insights', label: 'Insights', icon: Sparkles }
  ];

  const totalBalance = accounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* HEADER DA ÁREA FINANCEIRO */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">
            Gestão Financeira
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Financeiro
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setTxType('expense');
              setIsTxModalOpen(true);
            }}
            className="px-3 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition shadow-sm flex items-center space-x-1"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Novo</span>
          </button>

          <button
            onClick={toggleBlur}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 shadow-sm"
            title={isBlurred ? "Exibir Valores" : "Ocultar Valores"}
          >
            {isBlurred ? <EyeOff size={18} className="text-indigo-500" /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* SUB-MENU DE ABAS ROLÁVEL (HORIZONTAL) */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-2 border-b border-slate-200/80 dark:border-slate-800 pb-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as FinanceTab)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO DA ABA SELECIONADA */}

      {/* 1. MOVIMENTAÇÕES */}
      {activeTab === 'movimentacoes' && (
        <div className="space-y-4">
          <TransactionList />
        </div>
      )}

      {/* 2. CONTAS */}
      {activeTab === 'contas' && (
        <div className="space-y-5">
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total em Contas</span>
              <p className="text-2xl font-black tabular-nums mt-0.5">
                {!isBlurred ? formatCurrency(totalBalance) : 'R$ •••••••'}
              </p>
            </div>
            <button
              onClick={() => setIsNewAccountModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-1 transition active:scale-95 shadow-md"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Nova Conta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {accounts.map(acc => {
              const bal = getAccountBalance(acc.id);
              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountForEdit(acc)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition cursor-pointer flex items-center justify-between shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm"
                      style={{ backgroundColor: acc.color || '#6366f1' }}
                    >
                      <Landmark size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{acc.name}</h4>
                      <span className="text-[10px] text-slate-400 font-medium capitalize">
                        {acc.type === 'bank' ? 'Conta Corrente' : acc.type === 'wallet' ? 'Carteira' : acc.type === 'savings' ? 'Poupança / Reserva' : 'Investimento'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Saldo</span>
                      <span className={`text-sm font-black tabular-nums ${bal >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
                        {!isBlurred ? formatCurrency(bal) : '••••'}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400">
                      <Pencil size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DÍVIDAS */}
      {activeTab === 'dividas' && (
        <div className="space-y-4">
          <DebtList />
        </div>
      )}

      {/* 4. METAS / COFRINHOS */}
      {activeTab === 'metas' && (
        <div className="space-y-4">
          <GoalsScreen />
        </div>
      )}

      {/* 5. ANÁLISES */}
      {activeTab === 'analises' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <h3 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center">
              <BarChart3 size={15} className="mr-1.5 text-indigo-600 dark:text-indigo-400" />
              Painel de Análises Financeiras
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Indicadores consolidados sobre custo de sobrevivência, médias por categoria e capacidade de gasto.
            </p>
          </div>

          <CostOfLivingSection />
          <SpendingAveragesSection />
          <ShowTargetSection />
          <HowMuchCanISpendCard />
          <FinancialOverviewSection />
        </div>
      )}

      {/* 6. PROJEÇÕES */}
      {activeTab === 'projecoes' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <h3 className="text-xs font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center">
              <TrendingUp size={15} className="mr-1.5 text-blue-600 dark:text-blue-400" />
              Projeções & Planejamento de Fluxo
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Previsão de 3, 6 e 12 meses, teto orçamentário e divisão 50/30/20.
            </p>
          </div>

          <FinancialProjectionSection />
          <PlanningScreen />
        </div>
      )}

      {/* 7. INSIGHTS */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <FinancialInsightsSection />
          <FinancialInsights />
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CONTA */}
      {selectedAccountForEdit && (
        <AccountBalanceModal
          account={selectedAccountForEdit}
          onClose={() => setSelectedAccountForEdit(null)}
        />
      )}

      {/* MODAL NOVA CONTA */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center">
              <Landmark size={18} className="mr-2 text-indigo-600 dark:text-indigo-400" />
              Nova Conta ou Carteira
            </h3>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Nome da Conta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank, Carteira..."
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Tipo
                  </label>
                  <select
                    value={newAccType}
                    onChange={e => setNewAccType(e.target.value as AccountType)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="bank">Conta Corrente</option>
                    <option value="wallet">Carteira</option>
                    <option value="savings">Poupança / Reserva</option>
                    <option value="investment">Investimento</option>
                    <option value="other">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newAccBalance}
                    onChange={e => setNewAccBalance(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 p-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK TRANSACTION MODAL */}
      {isTxModalOpen && (
        <TransactionForm
          onClose={() => setIsTxModalOpen(false)}
          initialType={txType}
        />
      )}
    </div>
  );
};
