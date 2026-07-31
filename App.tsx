
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { FinancialInsights } from './components/FinancialInsights';
import { TransactionForm } from './components/TransactionForm';
import { Settings } from './components/Settings';
import { CategoryList } from './components/CategoryList';
import { FinancialSummary } from './components/FinancialSummary';
import { MonthlyFlow } from './components/MonthlyFlow';
import { DebtList } from './components/DebtList';
import { AlertsScreen } from './components/AlertsScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { GoalsScreen } from './components/GoalsScreen';

const AppContent = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <Layout onOpenAdd={() => setIsAddModalOpen(true)}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/summary" element={<FinancialSummary />} />
        <Route path="/flow" element={<MonthlyFlow />} />
        <Route path="/transactions" element={<TransactionList />} />
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="/debts" element={<DebtList />} />
        <Route path="/alerts" element={<AlertsScreen />} />
        <Route path="/metas" element={<GoalsScreen />} />
        <Route path="/insights" element={<FinancialInsights />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/categories" element={<CategoryList />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {isAddModalOpen && (
        <TransactionForm onClose={() => setIsAddModalOpen(false)} />
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
