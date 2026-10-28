import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ExtratoScreen } from './components/ExtratoScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DebtsScreen } from './components/DebtsScreen';
import { ExpenseAnalysisScreen } from './components/ExpenseAnalysisScreen';
import { AccountsScreen } from './components/AccountsScreen';
import { ReportsHubScreen } from './components/ReportsHubScreen';
import { MoreHubScreen } from './components/MoreHubScreen';
import { FixedRecurringScreen } from './components/FixedRecurringScreen';
import { PlanningScreen } from './components/PlanningScreen';
import { PersonalInsightsScreen } from './components/PersonalInsightsScreen';
import { TransactionForm } from './components/TransactionForm';
import { LoginScreen } from './components/auth/LoginScreen';

const AppContent = () => {
  const { currentUser, isAuthLoading, isDemoMode } = useFinance();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialFormType, setInitialFormType] = useState<'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw'>('expense');

  const handleOpenAddWithType = (type: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw' = 'expense') => {
    setInitialFormType(type);
    setIsAddModalOpen(true);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center text-slate-800 select-none">
        <div className="w-14 h-14 rounded-2xl bg-blue-900 border-2 border-yellow-400 p-1 shadow-lg flex items-center justify-center text-yellow-400 font-black text-xl mb-4 animate-pulse">
          MF
        </div>
        <div className="w-6 h-6 border-2 border-blue-900 border-t-yellow-400 rounded-full animate-spin mb-3" />
        <p className="text-xs text-blue-950 font-bold tracking-wider uppercase">Carregando Minhas Finanças...</p>
      </div>
    );
  }

  // Rota Protegida: Se não houver usuário autenticado e não estiver no modo demonstração, exibe Login
  if (!currentUser && !isDemoMode) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Layout onOpenAdd={handleOpenAddWithType}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lancamentos" element={<ExtratoScreen />} />
          <Route path="/extrato" element={<ExtratoScreen />} />
          <Route path="/financeiro" element={<ExtratoScreen />} />
          <Route path="/transactions" element={<ExtratoScreen />} />
          <Route path="/dividas" element={<DebtsScreen />} />
          <Route path="/debts" element={<DebtsScreen />} />
          <Route path="/mais" element={<MoreHubScreen />} />
          <Route path="/contas-fixas" element={<FixedRecurringScreen />} />
          <Route path="/fixas" element={<FixedRecurringScreen />} />
          <Route path="/planejamento" element={<PlanningScreen />} />
          <Route path="/orcamentos" element={<PlanningScreen />} />
          <Route path="/inteligencia" element={<PersonalInsightsScreen />} />
          <Route path="/insights" element={<PersonalInsightsScreen />} />
          <Route path="/gastos" element={<ExpenseAnalysisScreen />} />
          <Route path="/analise-gastos" element={<ExpenseAnalysisScreen />} />
          <Route path="/contas" element={<AccountsScreen />} />
          <Route path="/relatorios" element={<ReportsHubScreen />} />
          {/* Shows/carreira desativados — txs históricas preservadas no saldo */}
          <Route path="/shows" element={<Navigate to="/" replace />} />
          <Route path="/shows/*" element={<Navigate to="/" replace />} />
          <Route path="/flow" element={<ReportsHubScreen initialTab="flow" />} />
          <Route path="/summary" element={<ReportsHubScreen initialTab="summary" />} />
          <Route path="/ai-report" element={<ReportsHubScreen initialTab="ai" />} />
          <Route path="/calendar" element={<ReportsHubScreen initialTab="calendar" />} />
          <Route path="/financial-settings" element={<MoreHubScreen />} />
          <Route path="/settings" element={<MoreHubScreen />} />
          <Route path="/categories" element={<MoreHubScreen />} />
          <Route path="/alerts" element={<MoreHubScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {isAddModalOpen && (
          <TransactionForm initialType={initialFormType} onClose={() => setIsAddModalOpen(false)} />
        )}
      </Layout>
    </div>
  );
};

const App = () => {
  return (
    <FinanceProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </FinanceProvider>
  );
};

export default App;
