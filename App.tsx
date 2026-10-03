import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ExtratoScreen } from './components/ExtratoScreen';
import { MusicianShowScreen } from './components/MusicianShowScreen';
import { DebtsScreen } from './components/DebtsScreen';
import { ExpenseAnalysisScreen } from './components/ExpenseAnalysisScreen';
import { AccountsScreen } from './components/AccountsScreen';
import { ReportsHubScreen } from './components/ReportsHubScreen';
import { MoreHubScreen } from './components/MoreHubScreen';
import { TransactionForm } from './components/TransactionForm';

const AppContent = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialFormType, setInitialFormType] = useState<'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw'>('expense');

  const handleOpenAddWithType = (type: 'income' | 'expense' | 'transfer' | 'goal_deposit' | 'goal_withdraw' = 'expense') => {
    setInitialFormType(type);
    setIsAddModalOpen(true);
  };

  return (
    <Layout onOpenAdd={handleOpenAddWithType}>
      <Routes>
        {/* AS 5 ABAS PRINCIPAIS - ESTILO BANCO DO BRASIL */}
        {/* 1. Início */}
        <Route path="/" element={<Dashboard />} />
        
        {/* 2. Lançamentos / Extrato */}
        <Route path="/lancamentos" element={<ExtratoScreen />} />
        <Route path="/extrato" element={<ExtratoScreen />} />
        <Route path="/financeiro" element={<ExtratoScreen />} />
        <Route path="/transactions" element={<ExtratoScreen />} />
        
        {/* 3. Shows */}
        <Route path="/shows" element={<MusicianShowScreen />} />
        
        {/* 4. Dívidas */}
        <Route path="/dividas" element={<DebtsScreen />} />
        <Route path="/debts" element={<DebtsScreen />} />
        
        {/* 5. Menu / Mais */}
        <Route path="/mais" element={<MoreHubScreen />} />

        {/* TELAS DEDICADAS DO ECOSSISTEMA */}
        <Route path="/gastos" element={<ExpenseAnalysisScreen />} />
        <Route path="/analise-gastos" element={<ExpenseAnalysisScreen />} />
        <Route path="/contas" element={<AccountsScreen />} />
        <Route path="/relatorios" element={<ReportsHubScreen />} />

        {/* ROTAS LEGADAS PRESERVADAS COM DIRECIONAMENTO TRANSPARENTE */}
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
