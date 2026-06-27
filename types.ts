
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'paid' | 'pending';

export type DebtType = 'bank' | 'person' | 'card_installment' | 'car_financing';
export type DebtStatus = 'active' | 'paid';

export type AlertType = 'overdue' | 'today' | 'tomorrow' | 'week' | 'risk';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  classification?: 'essential' | 'personal' | 'future';
}

export interface Budget {
  categoryId: string;
  limit: number;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  icon: string;
  createdAt: string; // ISO String
}

export interface Account {
  id: string;
  name: string;
  type: 'wallet' | 'bank' | 'investment' | 'other';
  color: string;
  initialBalance: number;
  enabled: boolean;
}

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  totalAmount: number;
  startDate: string;
  installmentCount: number;
  description?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  description: string;
  status: TransactionStatus;
  createdAt: number;
  accountId: string; 
  destinationAccountId?: string; 
  reminderDate?: string; 
  reminderSent?: boolean;
  debtId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  isFixed?: boolean;
  fixedGroupId?: string;
  interest?: number; // Valor excedente pago considerado como juros
}

export interface SystemAlert {
  id: string;
  title: string;
  amount: number;
  date: string;
  type: AlertType;
  isCovered: boolean;
  transactionId?: string;
}

export interface BalanceSummary {
  realBalance: number;
  projectedBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  pendingIncome: number;
  pendingExpense: number;
}

export type DashboardWidgetId = 'balance' | 'shortcuts' | 'goals' | 'status' | 'recent' | 'debts' | 'radar';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  visible: boolean;
  label: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  primaryColor?: string;
  userName?: string;
  notificationInterval?: number;
  dashboardLayout: DashboardWidgetConfig[];
}
