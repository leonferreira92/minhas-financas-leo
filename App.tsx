import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FinancialHubScreen } from './components/FinancialHubScreen';
import { MusicianShowScreen } from './components/MusicianShowScreen';
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
        {/* AS 5 ÁREAS PRINCIPAIS */}
        {/* 1. Home */}
        <Route path="/" element={<Dashboard />} />
        
        {/* 2. Financeiro */}
        <Route path="/financeiro" element={<FinancialHubScreen />} />
        
        {/* 3. Shows */}
        <Route path="/shows" element={<MusicianShowScreen />} />
        
        {/* 4. Relatórios */}
        <Route path="/relatorios" element={<ReportsHubScreen />} />
        
        {/* 5. Mais */}
        <Route path="/mais" element={<MoreHubScreen />} />

        {/* ROTAS LEGADAS / ACESSOS DIRETOS PRESERVADOS (REDIRECIONAMENTO OU ACESSO TRANSPARENTE) */}
        <Route path="/transactions" element={<FinancialHubScreen initialTab="movimentacoes" />} />
        <Route path="/debts" element={<FinancialHubScreen initialTab="dividas" />} />
        <Route path="/metas" element={<FinancialHubScreen initialTab="metas" />} />
        <Route path="/planning" element={<FinancialHubScreen initialTab="projecoes" />} />
        <Route path="/flow" element={<ReportsHubScreen initialTab="flow" />} />
        <Route path="/insights" element={<FinancialHubScreen initialTab="insights" />} />
        <Route path="/summary" element={<ReportsHubScreen initialTab="summary" />} />
        <Route path="/ai-report" element={<ReportsHubScreen initialTab="ai" />} />
        <Route path="/calendar" element={<ReportsHubScreen initialTab="calendar" />} />
        <Route path="/financial-settings" element={<MoreHubScreen initialTab="financial" />} />
        <Route path="/settings" element={<MoreHubScreen initialTab="settings" />} />
        <Route path="/categories" element={<MoreHubScreen initialTab="categories" />} />
        <Route path="/alerts" element={<MoreHubScreen initialTab="alerts" />} />
        
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
