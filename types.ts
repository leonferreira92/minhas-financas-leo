
export type ScopeType = 'PERSONAL' | 'BUSINESS' | 'BOTH';
export type ActiveScopeFilter = 'ALL' | 'PERSONAL' | 'BUSINESS';

export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment' | 'goal_deposit' | 'goal_withdraw';
export type TransactionStatus = 'paid' | 'pending' | 'cancelled';
export type AccountType = 'wallet' | 'bank' | 'savings' | 'investment' | 'other';

export type DebtType = 'bank' | 'person' | 'card_installment' | 'car_financing';
export type DebtStatus = 'active' | 'paid';
export type DebtCostCenterMode = 'TOTAL_PERSONAL' | 'TOTAL_BUSINESS' | 'INSTALLMENT_RANGE';

export type CareerDebtSubcategory =
  | 'Equipamentos / Instrumentos'
  | 'Acessórios & Cordas'
  | 'Manutenção & Luthier'
  | 'Deslocamento / Logística'
  | 'Músicos / Apoio (Equipe)'
  | 'Marketing & Divulgação'
  | 'Figurino & Imagem'
  | 'Softwares & Plugins'
  | 'Ensaios & Estúdio'
  | 'Outros Custos da Música'
  | string;

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
  scope?: ScopeType;
  costCenterMode?: DebtCostCenterMode;
  businessStartInstallment?: number;
  businessEndInstallment?: number;
  musicMonthlyAmount?: number;
  includeDownPaymentInBusiness?: boolean;
  musicSubcategory?: CareerDebtSubcategory;
  categoryId?: string;
  personalCategoryId?: string;
  accountId?: string;
}

export type ShowCostGroup = 'logistica' | 'musicos' | 'equipamentos';

export type ShowLogisticsSubcategory = 'Combustível' | 'Pedágio' | 'Hospedagem';
export type ShowCrewSubcategory = 'Cachê de Terceiros / Equipe';
export type ShowEquipmentSubcategory = 'Aluguel' | 'Manutenção' | 'Insumos do Show';
export type ShowExpenseSubcategory = ShowLogisticsSubcategory | ShowCrewSubcategory | ShowEquipmentSubcategory | string;

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  category?: string; // Para compatibilidade com base legada
  subcategory?: ShowExpenseSubcategory; // Subcategoria vinculada ao custo do show
  costGroup?: ShowCostGroup; // Grupo de custo do show (logistica | musicos | equipamentos)
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
  customMusicAmount?: number;
  customPersonalAmount?: number;
  manualCostCenterOverride?: boolean;
  isFixed?: boolean;
  fixedGroupId?: string;
  interest?: number; // Valor excedente pago considerado como juros
  classification?: 'essential' | 'personal' | 'future' | 'professional' | 'extraordinary' | 'discretionary';
  showId?: string; // ID do Show vinculado
  showName?: string; // Nome/Contratante do Show vinculado (para fins de exibição no extrato)
  showPaymentId?: string; // ID do pagamento vinculado do show
  showPaymentType?: ShowPaymentType; // Natureza da parcela: Sinal | Parcela | Restante | Extra | Bônus
  showExpenseId?: string; // ID da despesa vinculada do show
  isEventTransaction?: boolean; // Flag explícita indicando que a transação pertence a um evento
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

export type ShowPaymentType = 'Cachê Principal' | 'Sinal' | 'Parcela' | 'Restante' | 'Pagamento final' | 'Extra' | 'Hora Extra' | 'Couvert' | 'Gorjeta' | 'Bônus' | 'Outro';
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

export type ShowExpenseCategory = 'Combustível' | 'Pedágio' | 'Hospedagem' | 'Cachê de Terceiros / Equipe' | 'Aluguel' | 'Manutenção' | 'Insumos do Show' | 'Alimentação' | 'Estacionamento' | 'Comissão' | 'Outros';

export interface ShowExpenseItem {
  id: string;
  category: ShowExpenseCategory | string;
  subcategory?: ShowExpenseSubcategory;
  costGroup?: ShowCostGroup;
  amount: number;
  date: string; // Data da despesa (YYYY-MM-DD)
  accountId: string; // Conta bancária/carteira de onde saiu o valor
  notes?: string;
  status?: 'paid' | 'pending';
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

export interface ShowCrewItem {
  id?: string;
  memberId?: string; // ID do músico no cadastro geral se houver
  name: string;
  role: string;      // Bateria, Baixo, Teclado, Roadie, Técnico, etc.
  subcategory?: ShowCrewSubcategory | string; // Cachê de Terceiros / Equipe
  costGroup?: ShowCostGroup;
  cacheAmount: number;
  status?: 'paid' | 'pending';
  pixKey?: string;
  notes?: string;
  transactionId?: string;
}

export interface ShowLogisticsItem {
  id?: string;
  type: 'fuel' | 'toll' | 'lodging' | 'uber' | 'car_km' | 'van' | 'parking' | 'other';
  subcategory?: ShowLogisticsSubcategory | string; // Combustível | Pedágio | Hospedagem
  costGroup?: ShowCostGroup;
  description: string;
  amount: number;
  km?: number;
  pricePerKm?: number;
  status?: 'paid' | 'pending';
  transactionId?: string;
}

export interface ShowOtherExpenseItem {
  id?: string;
  category: string;  // Aluguel, Manutenção, Insumos do Show, etc.
  subcategory?: ShowEquipmentSubcategory | string; // Aluguel | Manutenção | Insumos do Show
  costGroup?: ShowCostGroup;
  description: string;
  amount: number;
  status?: 'paid' | 'pending';
  transactionId?: string;
}

export type RevenueModelType = 'fixed' | 'couvert' | 'hybrid';

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
  
  // Modelo Flexível de Receita (Entrada do Show)
  revenueModel?: RevenueModelType;
  estimatedPeople?: number;      // Pessoas estimadas para Couvert
  couvertPrice?: number;         // Valor por pessoa no Couvert
  guaranteedMinCache?: number;   // Cachê mínimo garantido no Híbrido
  couvertPercentage?: number;    // % do Couvert repassado no Híbrido

  // Calculadora Inteligente de Logística (Veículo Próprio)
  totalKm?: number;              // Distância total ida/volta (KM)
  transportDistanceKm?: number;  // Distância total ida/volta (KM)
  carKmPerLiter?: number;        // Consumo do carro (KM/L)
  fuelPricePerLiter?: number;    // Preço do litro do combustível (R$)
  tollAmount?: number;           // Valor total de pedágios (R$)
  tollCost?: number;             // Valor total de pedágios (R$)

  // Fundo de Depreciação / Manutenção (Reserva de Equipamento)
  equipmentReserveAmount?: number; // Valor fixo de reserva p/ equipamento por show (ex: R$ 20.00)

  // Métrica de Hora Trabalhada (Tempo Total Dedicado)
  travelTimeMinutes?: number;    // Tempo de deslocamento ida/volta em minutos
  soundcheckTimeMinutes?: number;// Tempo de montagem / passagem de som em minutos
  showDurationHours?: number;    // Duração do show em horas
  showHours?: number;            // Duração do show em horas

  extraAmount?: number;   // Valor de extras adicionados à contratação
  extraNote?: string;     // Observação / motivo do extra (ex: 1h a mais de apresentação, gorjeta)
  cacheCombined?: number; // Cachê combinado (para compatibilidade anterior)
  cacheReceived?: number; // Cachê recebido totalizado (para compatibilidade anterior)
  paymentMethod?: string; // Forma de pagamento do show
  notes?: string;         // Observações
  status: ShowStatus;     // Status do show
  payments?: ShowPayment[]; // Lista de pagamentos/parcelas vinculados
  crewMembers?: ShowCrewItem[]; // Tabela de Músicos & Equipe vinculados ao show
  logistics?: ShowLogisticsItem[]; // Logística & Deslocamento associado a este show
  otherExpenses?: ShowOtherExpenseItem[]; // Outras Despesas do Show (camarim, alimentação, aluguel de equipamentos)
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

export interface Venue {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  city?: string;
  address?: string;
  defaultCache?: number;
  notes?: string;
  category?: 'Bar / Pub' | 'Casa de Show' | 'Restaurante' | 'Espaço de Eventos' | 'Prefeitura / Festival' | 'Casamento / Privado' | 'Outro';
  createdAt?: number;
}

export interface MusicianCrewMember {
  id: string;
  name: string;
  role: string; // ex: Bateria, Baixo, Teclado, Guitarra, Sanfona, Roadie, Técnico de Som
  defaultCache: number;
  phone?: string;
  pixKey?: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'Email' | 'Telefone' | 'Aleatória';
  notes?: string;
  createdAt?: number;
}

export interface MusicLocomotionExpense {
  id: string;
  date: string;
  type: 'uber' | 'fuel' | 'mileage' | 'toll' | 'parking';
  title: string;
  amount: number;
  km?: number;
  pricePerKm?: number;
  origin?: string;
  destination?: string;
  showId?: string;
  accountId?: string;
  transactionId?: string;
  notes?: string;
  createdAt?: number;
}

export type MusicCostCategory = 'equipment' | 'accessories' | 'maintenance' | 'costume' | 'marketing' | 'software' | 'rehearsal' | 'other';

export interface MusicCostItem {
  id: string;
  date: string;
  category: MusicCostCategory;
  title: string;
  amount: number;
  accountId?: string;
  showId?: string;
  transactionId?: string;
  notes?: string;
  createdAt?: number;
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


