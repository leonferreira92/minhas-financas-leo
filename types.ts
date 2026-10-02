
export type ScopeType = 'PERSONAL' | 'BUSINESS' | 'BOTH';
export type ActiveScopeFilter = 'ALL' | 'PERSONAL' | 'BUSINESS';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment' | 'goal_deposit' | 'goal_withdraw';
export type TransactionStatus = 'paid' | 'pending' | 'cancelled';
export type AccountType = 'wallet' | 'bank' | 'savings' | 'investment' | 'other';

export type DebtType = 'bank' | 'person' | 'card_installment' | 'car_financing';
export type DebtStatus = 'active' | 'paid';

export type AlertType = 'overdue' | 'today' | 'tomorrow' | 'week' | 'risk';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  classification?: 'essential' | 'personal' | 'future' | 'professional' | 'extraordinary' | 'discretionary';
  scope?: ScopeType;
}

export interface Budget {
  categoryId: string;
  limit: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  color: string;
  initialBalance: number;
  enabled: boolean;
  scope?: ScopeType;
  vinculo?: 'PESSOAL' | 'MUSICO' | 'NEUTRO';
}

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  totalAmount: number;
  startDate: string;
  installmentCount: number;
  description?: string;
  installmentAmount?: number;
  interestRate?: number;
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
  classification?: 'essential' | 'personal' | 'future' | 'professional' | 'extraordinary' | 'discretionary';
  showId?: string; // ID do Show vinculado
  showPaymentId?: string; // ID do pagamento vinculado do show
  showPaymentType?: ShowPaymentType; // Natureza da parcela: Sinal | Parcela | Restante | Extra | Bônus
  showExpenseId?: string; // ID da despesa vinculada do show
  scope?: ScopeType;
  importedFromBank?: boolean;
  originalBankDescription?: string;
  bankFitId?: string;
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
  accountsTotal?: number;
}

export type DashboardWidgetId = 'balance' | 'shortcuts' | 'status' | 'recent' | 'debts' | 'radar';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  visible: boolean;
  label: string;
}

export interface FinancialSettings {
  minReserveAmount: number;           // Reserva mínima desejada em R$
  targetReserveMonths: number;        // Quantidade de meses de reserva desejada (ex: 3, 6, 12)
  essentialCategoryIds: string[];     // IDs das categorias consideradas essenciais
  lifestyleCategoryIds: string[];     // IDs das categorias consideradas estilo de vida / pessoal
  professionalCategoryIds: string[];  // IDs das categorias consideradas investimentos profissionais
}

export interface AppSettings {
  theme: 'light' | 'dark';
  primaryColor?: string;
  userName?: string;
  careerProjectName?: string; // Nome do Projeto/Carreira (ex: "Leo Ferreira")
  musicianCpf?: string; // CPF do Músico para recibos e contratos
  musicianCity?: string; // Cidade-UF base do músico
  musicianArtisticName?: string; // Nome artístico
  notificationInterval?: number;
  dashboardLayout: DashboardWidgetConfig[];
  financialSettings?: FinancialSettings;
  personalDefaultAccountId?: string;
  businessDefaultAccountId?: string;
}

export interface ShowExpenses {
  fuel: number;         // Combustível
  food: number;         // Alimentação / Lanche
  toll: number;         // Pedágio
  commission: number;   // Comissão
  others: number;       // Outros
}

export type ShowPaymentType = 'Sinal' | 'Parcela' | 'Restante' | 'Pagamento final' | 'Extra' | 'Bônus' | 'Outro';
export type ShowPaymentStatus = 'Agendado' | 'Recebido' | 'Previsto' | 'Cancelado';

export interface ShowPayment {
  id: string;
  type: ShowPaymentType;
  amount: number;
  expectedDate: string; // Data prevista (YYYY-MM-DD)
  effectiveDate?: string; // Data efetiva de recebimento
  accountId: string; // Conta bancária/carteira
  status: ShowPaymentStatus;
  notes?: string;
  transactionId?: string; // ID da movimentação no Financeiro
}

export type ShowExpenseCategory = 'Combustível' | 'Alimentação' | 'Pedágio' | 'Estacionamento' | 'Comissão' | 'Hospedagem' | 'Outros';

export interface ShowExpenseItem {
  id: string;
  category: ShowExpenseCategory | string;
  amount: number;
  date: string; // Data da despesa (YYYY-MM-DD)
  accountId: string; // Conta bancária/carteira de onde saiu o valor
  notes?: string;
  transactionId?: string; // ID da movimentação no Financeiro
}

export interface Receipt {
  id: string;
  amount: number;
  expectedDate: string; // Data prevista
  effectiveDate?: string; // Data efetiva do recebimento (opcional)
  accountId: string; // Conta financeira onde foi depositado
  paymentMethod: string; // Pix, Dinheiro, Cartão, Transferência etc.
  status: 'Previsto' | 'Recebido'; // Situação
  type: 'Sinal' | 'Parcela' | 'Pagamento final' | 'Bônus' | 'Outro'; // Tipo do recebimento
  transactionId?: string; // ID correspondente no financeiro
  isImported?: boolean; // Indica se foi gerado por importação automática
}

export type ShowStatus = 'Orçamento' | 'Aguardando confirmação' | 'Confirmado' | 'Realizado' | 'Cancelado' | 'Agendado';

export interface Show {
  id: string;
  name: string;           // Nome do evento / Show
  contractorName: string; // Nome do contratante
  contractorPhone?: string; // Telefone / WhatsApp do contratante
  eventType?: string;     // Tipo de evento (Casamento, Corporativo, Bar, etc.)
  location: string;       // Local da apresentação / Endereço
  city?: string;          // Cidade
  date: string;           // Data da apresentação (YYYY-MM-DD)
  time: string;           // Horário de início
  endTime?: string;       // Horário de término
  duration?: string;      // Duração estimada (ex: 3h)
  totalCache: number;     // Valor total do cachê contratado
  extraAmount?: number;   // Valor de extras adicionados à contratação
  cacheCombined?: number; // Cachê combinado (para compatibilidade anterior)
  cacheReceived?: number; // Cachê recebido totalizado (para compatibilidade anterior)
  paymentMethod?: string; // Forma de pagamento do show
  notes?: string;         // Observações
  status: ShowStatus;     // Status do show
  payments?: ShowPayment[]; // Lista de pagamentos/parcelas vinculados
  expenseItems?: ShowExpenseItem[]; // Lista detalhada de despesas vinculadas
  receipts?: Receipt[];   // Lista de recebimentos vinculados (compatibilidade com dados legados)
  expensesLaunched?: boolean; // Se já lançou despesas
  expenses?: ShowExpenses;
  expenseTransactionIds?: {
    fuel?: string;
    food?: string;
    toll?: string;
    commission?: string;
    others?: string;
  };
  expenseAccountId?: string; // ID da conta bancária de onde saíram as despesas
  createdAt: number;
  isImported?: boolean; // Indica se foi gerado por importação automática
  scope?: ScopeType;
  googleCalendarEventId?: string;
}

/**
 * Função utilitária de compatibilidade para Módulo:
 * O app opera exclusivamente nos módulos PESSOAL e MÚSICA / EMPRESA.
 */
export function matchesScope(itemScope?: ScopeType | null, activeScope: ActiveScopeFilter = 'ALL'): boolean {
  if (activeScope === 'ALL') return true;
  if (activeScope === 'BUSINESS') return itemScope === 'BUSINESS';
  if (activeScope === 'PERSONAL') return itemScope !== 'BUSINESS';
  return true;
}

