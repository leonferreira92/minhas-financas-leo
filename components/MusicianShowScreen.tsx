import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Show, Receipt, Category, Transaction } from '../types';
import { 
  Plus, Music, Trash2, X, ChevronLeft, Calendar, 
  MapPin, CreditCard, Sparkles, Calculator, 
  ArrowRight, Coins, CheckCircle2, AlertCircle, Clock, 
  User, Clipboard, Landmark, Edit3, DollarSign, CalendarDays,
  ChevronDown, ArrowLeft, Check, TrendingUp, PlusCircle, Percent,
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MusicianShowScreen = () => {
  const navigate = useNavigate();
  const { 
    shows, addShow, updateShow, deleteShow, 
    accounts, transactions, addTransaction, updateTransaction, deleteTransaction, 
    categories, isBlurred, getAccountBalance
  } = useFinance();

  // Navigation / Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [activeShowId, setActiveShowId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDetailScreenId, setShowDetailScreenId] = useState<string | null>(null);
  const [isAddingNewShow, setIsAddingNewShow] = useState(false);

  // Form Fields - Step 1: Novo Show (Contract details)
  const [contractorName, setContractorName] = useState('');
  const [eventName, setEventName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('20:00');
  const [totalCache, setTotalCache] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Show['status']>('Confirmado');

  // Form Fields - Step 2: Despesas deste Show
  const [fuel, setFuel] = useState('');
  const [food, setFood] = useState('');
  const [toll, setToll] = useState('');
  const [commission, setCommission] = useState('');
  const [others, setOthers] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState(() => {
    const active = accounts.filter(a => a.enabled);
    return active.length > 0 ? active[0].id : 'acc_bank';
  });

  // Receipt Modal/State for individual shows
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptShowId, setReceiptShowId] = useState<string | null>(null);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);

  // Receipt Form Fields
  const [receiptType, setReceiptType] = useState<Receipt['type']>('Parcela');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptExpectedDate, setReceiptExpectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptAccountId, setReceiptAccountId] = useState(() => {
    const active = accounts.filter(a => a.enabled);
    return active.length > 0 ? active[0].id : 'acc_bank';
  });
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState('Pix');
  const [receiptStatus, setReceiptStatus] = useState<Receipt['status']>('Previsto');

  // Selected Show to display details/manage
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  // Helper to safely parse localized currency inputs
  const parseCurrency = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Replace dots used as thousands separators, then comma to dot
    const cleaned = val
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to format currency to BRL
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Helper to dynamically match categories for expenses
  const getCategoryForExpense = (type: 'fuel' | 'food' | 'toll' | 'commission' | 'others') => {
    switch(type) {
      case 'fuel':
        return categories.find(c => c.name.toLowerCase().includes('combustível') || c.name.toLowerCase().includes('combustivel'))?.id || 'cat_21';
      case 'food':
        return categories.find(c => c.name.toLowerCase().includes('restaurante') || c.name.toLowerCase().includes('alimentação') || c.name.toLowerCase().includes('alimentacao'))?.id || 'cat_5';
      case 'toll':
        return categories.find(c => c.name.toLowerCase().includes('transporte') || c.name.toLowerCase().includes('pedágio') || c.name.toLowerCase().includes('pedagio'))?.id || 'cat_3';
      case 'commission':
        return categories.find(c => c.name.toLowerCase().includes('imposto') || c.name.toLowerCase().includes('taxa') || c.name.toLowerCase().includes('comissão') || c.name.toLowerCase().includes('comissao'))?.id || 'cat_27';
      case 'others':
      default:
        return categories.find(c => c.name.toLowerCase().includes('hobby') || c.name.toLowerCase().includes('diversão') || c.name.toLowerCase().includes('outros'))?.id || 'cat_28';
    }
  };

  // Aggregate Stats Calculations
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalReceived = 0;
    
    shows.forEach(s => {
      totalRevenue += s.totalCache;
      
      // Calculate expenses
      const exp = s.expenses || { fuel: 0, food: 0, toll: 0, commission: 0, others: 0 };
      totalExpenses += (exp.fuel + exp.food + exp.toll + exp.commission + exp.others);

      // Sum of received receipts
      const recs = s.receipts || [];
      recs.forEach(r => {
        if (r.status === 'Recebido') {
          totalReceived += r.amount;
        }
      });
    });

    const netProfit = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    return {
      totalShows: shows.length,
      totalRevenue,
      totalReceived,
      totalExpenses,
      netProfit,
      margin
    };
  }, [shows]);

  // Open the wizard to register a new Show
  const handleOpenNewShow = () => {
    setContractorName('');
    setEventName('');
    setLocation('');
    setDate(new Date().toISOString().slice(0, 10));
    setTime('20:00');
    setTotalCache('');
    setNotes('');
    setStatus('Confirmado');

    setFuel('');
    setFood('');
    setToll('');
    setCommission('');
    setOthers('');
    const active = accounts.filter(a => a.enabled);
    setExpenseAccountId(active.length > 0 ? active[0].id : 'acc_bank');

    setFormStep(1);
    setActiveShowId(null);
    setIsEditing(false);
    setIsAddingNewShow(true);
  };

  // Open the wizard to edit an existing Show
  const handleOpenEditShow = (show: Show) => {
    setContractorName(show.contractorName || '');
    setEventName(show.name || '');
    setLocation(show.location || '');
    setDate(show.date || new Date().toISOString().slice(0, 10));
    setTime(show.time || '20:00');
    setTotalCache(show.totalCache ? show.totalCache.toString() : '');
    setNotes(show.notes || '');
    setStatus(show.status || 'Confirmado');

    setFuel(show.expenses?.fuel ? show.expenses.fuel.toString() : '');
    setFood(show.expenses?.food ? show.expenses.food.toString() : '');
    setToll(show.expenses?.toll ? show.expenses.toll.toString() : '');
    setCommission(show.expenses?.commission ? show.expenses.commission.toString() : '');
    setOthers(show.expenses?.others ? show.expenses.others.toString() : '');
    const active = accounts.filter(a => a.enabled);
    setExpenseAccountId(show.expenseAccountId || (active.length > 0 ? active[0].id : 'acc_bank'));

    setFormStep(1);
    setActiveShowId(show.id);
    setIsEditing(true);
    setShowDetailScreenId(show.id);
  };

  // Unified save handler for all show details and expense ledger synchronization
  const handleSaveAllChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShowId) return;

    const showToUpdate = shows.find(s => s.id === activeShowId);
    if (!showToUpdate) return;

    if (!eventName.trim() || !contractorName.trim() || !location.trim() || !totalCache) {
      alert('Por favor, preencha os dados obrigatórios: contratante, nome do show, local e valor do cachê.');
      return;
    }

    const parsedCache = parseCurrency(totalCache);
    const valFuel = parseCurrency(fuel || '0');
    const valFood = parseCurrency(food || '0');
    const valToll = parseCurrency(toll || '0');
    const valCommission = parseCurrency(commission || '0');
    const valOthers = parseCurrency(others || '0');

    const expensesObj = {
      fuel: valFuel,
      food: valFood,
      toll: valToll,
      commission: valCommission,
      others: valOthers
    };

    const expenseLaunchList = [
      { type: 'fuel' as const, amount: valFuel, label: 'Combustível', categoryId: getCategoryForExpense('fuel') },
      { type: 'food' as const, amount: valFood, label: 'Alimentação', categoryId: getCategoryForExpense('food') },
      { type: 'toll' as const, amount: valToll, label: 'Pedágio', categoryId: getCategoryForExpense('toll') },
      { type: 'commission' as const, amount: valCommission, label: 'Comissão', categoryId: getCategoryForExpense('commission') },
      { type: 'others' as const, amount: valOthers, label: 'Outros', categoryId: getCategoryForExpense('others') }
    ];

    const activeAccs = accounts.filter(a => a.enabled);
    const chosenAccountId = expenseAccountId || (activeAccs.length > 0 ? activeAccs[0].id : 'acc_bank');

    // Retrieve previous transaction IDs if they exist
    const prevTxIds = showToUpdate.expenseTransactionIds || {};
    const updatedTxIds = { ...prevTxIds };

    // Sync expenses with transactions ledger
    expenseLaunchList.forEach(exp => {
      const key = exp.type;
      const amount = exp.amount;
      let txId = prevTxIds[key];

      if (amount > 0) {
        const expStatus = status === 'Realizado' ? 'paid' : 'pending';
        if (txId) {
          // Update existing transaction
          updateTransaction({
            id: txId,
            date: date, // use updated date
            amount: amount,
            type: 'expense',
            categoryId: exp.categoryId,
            description: `${exp.label} - Show: ${eventName.trim()}`,
            status: expStatus,
            accountId: chosenAccountId,
            createdAt: Date.now()
          });
        } else {
          // Create new transaction
          const newTxId = crypto.randomUUID();
          addTransaction({
            id: newTxId,
            date: date,
            amount: amount,
            type: 'expense',
            categoryId: exp.categoryId,
            description: `${exp.label} - Show: ${eventName.trim()}`,
            status: expStatus,
            accountId: chosenAccountId
          });
          updatedTxIds[key] = newTxId;
        }
      } else {
        // Amount is 0 or less. If a transaction previously existed, delete it
        if (txId) {
          deleteTransaction(txId);
          delete updatedTxIds[key];
        }
      }
    });

    const updatedShow: Show = {
      ...showToUpdate,
      name: eventName.trim(),
      contractorName: contractorName.trim(),
      location: location.trim(),
      date,
      time,
      totalCache: parsedCache,
      cacheCombined: parsedCache,
      notes: notes.trim(),
      status,
      expenses: expensesObj,
      expensesLaunched: true,
      expenseTransactionIds: updatedTxIds,
      expenseAccountId: chosenAccountId
    };

    updateShow(updatedShow);
    setShowDetailScreenId(null);
    setActiveShowId(null);
    setIsEditing(false);
  };

  // Dedicated single-page creator handler for registering a new show
  const handleCreateNewShow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !contractorName.trim() || !location.trim() || !totalCache) {
      alert('Por favor, preencha os dados obrigatórios: contratante, nome do show, local e valor do cachê.');
      return;
    }

    const parsedCache = parseCurrency(totalCache);
    const valFuel = parseCurrency(fuel || '0');
    const valFood = parseCurrency(food || '0');
    const valToll = parseCurrency(toll || '0');
    const valCommission = parseCurrency(commission || '0');
    const valOthers = parseCurrency(others || '0');

    const expensesObj = {
      fuel: valFuel,
      food: valFood,
      toll: valToll,
      commission: valCommission,
      others: valOthers
    };

    const showId = crypto.randomUUID();

    // Handle expenses transactions immediately if amounts are filled
    const expenseLaunchList = [
      { type: 'fuel' as const, amount: valFuel, label: 'Combustível', categoryId: getCategoryForExpense('fuel') },
      { type: 'food' as const, amount: valFood, label: 'Alimentação', categoryId: getCategoryForExpense('food') },
      { type: 'toll' as const, amount: valToll, label: 'Pedágio', categoryId: getCategoryForExpense('toll') },
      { type: 'commission' as const, amount: valCommission, label: 'Comissão', categoryId: getCategoryForExpense('commission') },
      { type: 'others' as const, amount: valOthers, label: 'Outros', categoryId: getCategoryForExpense('others') }
    ];

    const activeAccs = accounts.filter(a => a.enabled);
    const chosenAccountId = expenseAccountId || (activeAccs.length > 0 ? activeAccs[0].id : 'acc_bank');
    const expenseTransactionIds: Record<string, string> = {};

    const initialExpStatus = status === 'Realizado' ? 'paid' : 'pending';
    expenseLaunchList.forEach(exp => {
      if (exp.amount > 0) {
        const newTxId = crypto.randomUUID();
        addTransaction({
          id: newTxId,
          date,
          amount: exp.amount,
          type: 'expense',
          categoryId: exp.categoryId,
          description: `${exp.label} - Show: ${eventName.trim()}`,
          status: initialExpStatus,
          accountId: chosenAccountId
        });
        expenseTransactionIds[exp.type] = newTxId;
      }
    });

    // Create default receipt for the total cache value with its corresponding transaction in extratos
    const initialReceiptId = crypto.randomUUID();
    const initialTxId = crypto.randomUUID();
    addTransaction({
      id: initialTxId,
      date,
      amount: parsedCache,
      type: 'income',
      categoryId: 'cat_33',
      description: `Recebimento [Pagamento final] - Show: ${eventName.trim()}`,
      status: status === 'Realizado' ? 'paid' : 'pending',
      accountId: chosenAccountId
    });

    const defaultReceipt: Receipt = {
      id: initialReceiptId,
      amount: parsedCache,
      expectedDate: date,
      accountId: chosenAccountId,
      paymentMethod: 'Pix',
      status: status === 'Realizado' ? 'Recebido' : 'Previsto',
      type: 'Pagamento final',
      transactionId: initialTxId
    };

    const newShow: Show = {
      id: showId,
      name: eventName.trim(),
      contractorName: contractorName.trim(),
      location: location.trim(),
      date,
      time,
      totalCache: parsedCache,
      cacheCombined: parsedCache,
      cacheReceived: 0,
      paymentMethod: 'Pix',
      notes: notes.trim(),
      status,
      receipts: [defaultReceipt],
      expensesLaunched: Object.keys(expenseTransactionIds).length > 0,
      expenses: expensesObj,
      expenseTransactionIds,
      expenseAccountId: chosenAccountId,
      createdAt: Date.now()
    };

    addShow(newShow);
    
    // Reset form states
    setContractorName('');
    setEventName('');
    setLocation('');
    setDate(new Date().toISOString().slice(0, 10));
    setTime('20:00');
    setTotalCache('');
    setNotes('');
    setStatus('Confirmado');
    setFuel('');
    setFood('');
    setToll('');
    setCommission('');
    setOthers('');

    setIsAddingNewShow(false);
    // Focus directly on the details screen of the newly created show!
    setShowDetailScreenId(showId);
  };

  // Step 1 Submit: Save contract details and progress to Step 2
  const handleSaveShowInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !contractorName.trim() || !location.trim() || !totalCache) {
      alert('Por favor, preencha os dados obrigatórios: contratante, nome do show, local e valor do cachê.');
      return;
    }

    const parsedCache = parseCurrency(totalCache);

    if (isEditing && activeShowId) {
      const showToUpdate = shows.find(s => s.id === activeShowId);
      if (showToUpdate) {
        const updatedShow: Show = {
          ...showToUpdate,
          name: eventName.trim(),
          contractorName: contractorName.trim(),
          location: location.trim(),
          date,
          time,
          totalCache: parsedCache,
          cacheCombined: parsedCache,
          notes: notes.trim(),
          status,
        };
        const targetStatus = status === 'Realizado' ? 'paid' : 'pending';
        if (showToUpdate.expenseTransactionIds) {
          Object.values(showToUpdate.expenseTransactionIds).forEach(txId => {
            const tx = transactions.find(t => t.id === txId);
            if (tx) {
              updateTransaction({
                ...tx,
                date,
                status: targetStatus,
                createdAt: Date.now()
              });
            }
          });
        }
        updateShow(updatedShow);
        setFormStep(2);
        return;
      }
    }

    const showId = crypto.randomUUID();

    const newShow: Show = {
      id: showId,
      name: eventName.trim(),
      contractorName: contractorName.trim(),
      location: location.trim(),
      date,
      time,
      totalCache: parsedCache,
      cacheCombined: parsedCache, // for backwards-compatibility
      cacheReceived: 0,            // initially no payments
      paymentMethod: 'Pix',
      notes: notes.trim(),
      status,
      receipts: [],
      expensesLaunched: false,
      expenses: {
        fuel: 0,
        food: 0,
        toll: 0,
        commission: 0,
        others: 0
      },
      createdAt: Date.now()
    };

    addShow(newShow);
    setActiveShowId(showId);
    setFormStep(2);
  };

  // Step 2 Submit: Save expenses and push them directly to personal finance ledger
  const handleSaveExpenses = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShowId) return;

    const showToUpdate = shows.find(s => s.id === activeShowId);
    if (!showToUpdate) return;

    const valFuel = parseCurrency(fuel || '0');
    const valFood = parseCurrency(food || '0');
    const valToll = parseCurrency(toll || '0');
    const valCommission = parseCurrency(commission || '0');
    const valOthers = parseCurrency(others || '0');

    const expensesObj = {
      fuel: valFuel,
      food: valFood,
      toll: valToll,
      commission: valCommission,
      others: valOthers
    };

    // Automatically record expenses as personal transaction entries
    const expenseLaunchList = [
      { type: 'fuel' as const, amount: valFuel, label: 'Combustível', categoryId: getCategoryForExpense('fuel') },
      { type: 'food' as const, amount: valFood, label: 'Alimentação', categoryId: getCategoryForExpense('food') },
      { type: 'toll' as const, amount: valToll, label: 'Pedágio', categoryId: getCategoryForExpense('toll') },
      { type: 'commission' as const, amount: valCommission, label: 'Comissão', categoryId: getCategoryForExpense('commission') },
      { type: 'others' as const, amount: valOthers, label: 'Outros', categoryId: getCategoryForExpense('others') }
    ];

    const activeAccs = accounts.filter(a => a.enabled);
    const chosenAccountId = expenseAccountId || (activeAccs.length > 0 ? activeAccs[0].id : 'acc_bank');

    // Retrieve previous transaction IDs if they exist
    const prevTxIds = showToUpdate.expenseTransactionIds || {};
    const updatedTxIds = { ...prevTxIds };

    const expStatus = showToUpdate.status === 'Realizado' ? 'paid' : 'pending';

    // Let's keep it simple, clean, and 100% bug-free:
    expenseLaunchList.forEach(exp => {
      const key = exp.type;
      const amount = exp.amount;
      let txId = prevTxIds[key];

      if (amount > 0) {
        if (txId) {
          // Update existing transaction
          updateTransaction({
            id: txId,
            date: showToUpdate.date,
            amount: amount,
            type: 'expense',
            categoryId: exp.categoryId,
            description: `${exp.label} - Show: ${showToUpdate.name}`,
            status: expStatus,
            accountId: chosenAccountId,
            createdAt: Date.now()
          });
        } else {
          // Create new transaction
          const newTxId = crypto.randomUUID();
          addTransaction({
            id: newTxId,
            date: showToUpdate.date,
            amount: amount,
            type: 'expense',
            categoryId: exp.categoryId,
            description: `${exp.label} - Show: ${showToUpdate.name}`,
            status: expStatus,
            accountId: chosenAccountId
          });
          updatedTxIds[key] = newTxId;
        }
      } else {
        // Amount is 0 or less. If a transaction previously existed, delete it
        if (txId) {
          deleteTransaction(txId);
          delete updatedTxIds[key];
        }
      }
    });

    const updatedShow: Show = {
      ...showToUpdate,
      expenses: expensesObj,
      expensesLaunched: true,
      expenseTransactionIds: updatedTxIds,
      expenseAccountId: chosenAccountId
    };

    updateShow(updatedShow);

    setIsFormOpen(false);
    setActiveShowId(null);
    setIsEditing(false);
    setExpandedShowId(showToUpdate.id); // focus on this show
  };

  // Open modal to add or edit a receipt for a specific show
  const handleOpenReceiptModal = (showId: string, receiptId?: string) => {
    const show = shows.find(s => s.id === showId);
    if (!show) return;

    setReceiptShowId(showId);
    
    const active = accounts.filter(a => a.enabled);
    const defaultAccount = active.length > 0 ? active[0].id : 'acc_bank';

    if (receiptId) {
      // Editing Mode
      const receipt = show.receipts.find(r => r.id === receiptId);
      if (receipt) {
        setEditingReceiptId(receiptId);
        setReceiptType(receipt.type);
        setReceiptAmount(receipt.amount.toString());
        setReceiptExpectedDate(receipt.expectedDate);
        setReceiptAccountId(receipt.accountId);
        setReceiptPaymentMethod(receipt.paymentMethod);
        setReceiptStatus(receipt.status);
      }
    } else {
      // Adding Mode
      setEditingReceiptId(null);
      setReceiptType('Parcela');
      setReceiptAmount('');
      setReceiptExpectedDate(show.date);
      setReceiptAccountId(defaultAccount);
      setReceiptPaymentMethod('Pix');
      setReceiptStatus('Previsto');
    }
    setIsReceiptModalOpen(true);
  };

  // Save or edit receipt & sync personal transaction securely
  const handleSaveReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptShowId) return;

    const show = shows.find(s => s.id === receiptShowId);
    if (!show) return;

    const parsedAmount = parseCurrency(receiptAmount);
    if (parsedAmount <= 0) {
      alert('Por favor, digite um valor maior que zero.');
      return;
    }

    // Validation: Receipts sum must not exceed cache total
    const existingReceiptsSum = show.receipts
      .filter(r => r.id !== editingReceiptId)
      .reduce((sum, r) => sum + r.amount, 0);

    if (existingReceiptsSum + parsedAmount > show.totalCache) {
      alert(`Valor ultrapassa o limite do cachê. O cachê total é ${formatCurrency(show.totalCache)} e a soma dos outros recebimentos é ${formatCurrency(existingReceiptsSum)}. Você só pode cadastrar no máximo ${formatCurrency(show.totalCache - existingReceiptsSum)}.`);
      return;
    }

    const updatedReceipts = [...show.receipts];

    const txStatus = receiptStatus === 'Recebido' ? 'paid' : 'pending';

    if (editingReceiptId) {
      // EDIT RECEIPT MODE
      const idx = updatedReceipts.findIndex(r => r.id === editingReceiptId);
      if (idx !== -1) {
        const oldReceipt = updatedReceipts[idx];
        let tid = oldReceipt.transactionId;

        if (tid) {
          // Already has transaction, update it
          updateTransaction({
            id: tid,
            date: receiptExpectedDate,
            amount: parsedAmount,
            type: 'income',
            categoryId: 'cat_33', // Shows / Cachês
            description: `Recebimento [${receiptType}] - Show: ${show.name}`,
            status: txStatus,
            accountId: receiptAccountId,
            createdAt: Date.now()
          });
        } else {
          // Create transaction for receipt
          tid = crypto.randomUUID();
          addTransaction({
            id: tid,
            date: receiptExpectedDate,
            amount: parsedAmount,
            type: 'income',
            categoryId: 'cat_33',
            description: `Recebimento [${receiptType}] - Show: ${show.name}`,
            status: txStatus,
            accountId: receiptAccountId
          });
        }

        updatedReceipts[idx] = {
          ...oldReceipt,
          type: receiptType,
          amount: parsedAmount,
          expectedDate: receiptExpectedDate,
          effectiveDate: receiptStatus === 'Recebido' ? (oldReceipt.effectiveDate || receiptExpectedDate) : undefined,
          accountId: receiptAccountId,
          paymentMethod: receiptPaymentMethod,
          status: receiptStatus,
          transactionId: tid
        };
      }
    } else {
      // NEW RECEIPT MODE
      const tid = crypto.randomUUID();
      addTransaction({
        id: tid,
        date: receiptExpectedDate,
        amount: parsedAmount,
        type: 'income',
        categoryId: 'cat_33',
        description: `Recebimento [${receiptType}] - Show: ${show.name}`,
        status: txStatus,
        accountId: receiptAccountId
      });

      const newReceipt: Receipt = {
        id: crypto.randomUUID(),
        amount: parsedAmount,
        expectedDate: receiptExpectedDate,
        effectiveDate: receiptStatus === 'Recebido' ? receiptExpectedDate : undefined,
        accountId: receiptAccountId,
        paymentMethod: receiptPaymentMethod,
        status: receiptStatus,
        type: receiptType,
        transactionId: tid
      };

      updatedReceipts.push(newReceipt);
    }

    // Calculate total cacheReceived compatibility metric
    const totalReceivedSum = updatedReceipts
      .filter(r => r.status === 'Recebido')
      .reduce((sum, r) => sum + r.amount, 0);

    const updatedShow: Show = {
      ...show,
      receipts: updatedReceipts,
      cacheReceived: totalReceivedSum
    };

    updateShow(updatedShow);
    setIsReceiptModalOpen(false);
  };

  // Toggle single receipt's state directly in-line with instant ledger integration
  const handleToggleReceiptStatus = (showId: string, receiptId: string) => {
    const show = shows.find(s => s.id === showId);
    if (!show) return;

    const updatedReceipts = show.receipts.map(r => {
      if (r.id === receiptId) {
        if (r.status === 'Previsto') {
          // Change to Recebido: Update transaction to paid or create if missing
          const tid = r.transactionId || crypto.randomUUID();
          if (r.transactionId) {
            updateTransaction({
              id: r.transactionId,
              date: r.expectedDate,
              amount: r.amount,
              type: 'income',
              categoryId: 'cat_33',
              description: `Recebimento [${r.type}] - Show: ${show.name}`,
              status: 'paid',
              accountId: r.accountId,
              createdAt: Date.now()
            });
          } else {
            addTransaction({
              id: tid,
              date: r.expectedDate,
              amount: r.amount,
              type: 'income',
              categoryId: 'cat_33',
              description: `Recebimento [${r.type}] - Show: ${show.name}`,
              status: 'paid',
              accountId: r.accountId
            });
          }
          return {
            ...r,
            status: 'Recebido' as const,
            effectiveDate: new Date().toISOString().slice(0, 10),
            transactionId: tid
          };
        } else {
          // Change to Previsto: Update transaction to pending or create if missing
          const tid = r.transactionId || crypto.randomUUID();
          if (r.transactionId) {
            updateTransaction({
              id: r.transactionId,
              date: r.expectedDate,
              amount: r.amount,
              type: 'income',
              categoryId: 'cat_33',
              description: `Recebimento [${r.type}] - Show: ${show.name}`,
              status: 'pending',
              accountId: r.accountId,
              createdAt: Date.now()
            });
          } else {
            addTransaction({
              id: tid,
              date: r.expectedDate,
              amount: r.amount,
              type: 'income',
              categoryId: 'cat_33',
              description: `Recebimento [${r.type}] - Show: ${show.name}`,
              status: 'pending',
              accountId: r.accountId
            });
          }
          return {
            ...r,
            status: 'Previsto' as const,
            effectiveDate: undefined,
            transactionId: tid
          };
        }
      }
      return r;
    });

    const totalReceivedSum = updatedReceipts
      .filter(r => r.status === 'Recebido')
      .reduce((sum, r) => sum + r.amount, 0);

    const updatedShow: Show = {
      ...show,
      receipts: updatedReceipts,
      cacheReceived: totalReceivedSum
    };

    updateShow(updatedShow);
  };

  // Delete a receipt safely and reverse transaction
  const handleDeleteReceipt = (showId: string, receiptId: string) => {
    const show = shows.find(s => s.id === showId);
    if (!show) return;

    if (!confirm('Deseja realmente excluir este recebimento?')) return;

    const receipt = show.receipts.find(r => r.id === receiptId);
    if (receipt && receipt.transactionId) {
      deleteTransaction(receipt.transactionId);
    }

    const updatedReceipts = show.receipts.filter(r => r.id !== receiptId);
    const totalReceivedSum = updatedReceipts
      .filter(r => r.status === 'Recebido')
      .reduce((sum, r) => sum + r.amount, 0);

    const updatedShow: Show = {
      ...show,
      receipts: updatedReceipts,
      cacheReceived: totalReceivedSum
    };

    updateShow(updatedShow);
  };

  // Securely delete whole show with nested ledger reversals
  const handleDeleteShowWithSync = (showId: string) => {
    const show = shows.find(s => s.id === showId);
    if (!show) return;

    if (!confirm(`Deseja realmente remover o show "${show.name}"? Isso também excluirá todas as transações de recebimentos e despesas associadas!`)) {
      return;
    }

    // 1. Delete transactions from all paid receipts
    show.receipts.forEach(r => {
      if (r.transactionId) {
        deleteTransaction(r.transactionId);
      }
    });

    // 2. Delete expense transactions (fuel, food, toll, commission, others)
    const expTxIds = show.expenseTransactionIds || {};
    Object.values(expTxIds).forEach(txId => {
      if (txId) {
        deleteTransaction(txId);
      }
    });

    // 3. Delete the show from app memory
    deleteShow(showId);
    if (expandedShowId === showId) {
      setExpandedShowId(null);
    }
  };

  // Confirm show realization and effectuate expense transactions
  const handleConfirmShowRealization = (showId: string) => {
    const show = shows.find(s => s.id === showId);
    if (!show) return;

    if (!confirm('Deseja confirmar a realização deste evento e efetivar as transações de despesas?')) {
      return;
    }

    if (show.expenseTransactionIds) {
      Object.values(show.expenseTransactionIds).forEach(txId => {
        const tx = transactions.find(t => t.id === txId);
        if (tx) {
          updateTransaction({
            ...tx,
            status: 'paid',
            createdAt: Date.now()
          });
        }
      });
    }

    const updatedShow: Show = {
      ...show,
      status: 'Realizado'
    };

    updateShow(updatedShow);
    if (activeShowId === showId) {
      setStatus('Realizado');
    }
  };

  // Filter shows dynamically based on the dashboard status selection
  const filteredShows = useMemo(() => {
    if (statusFilter === 'Todos') return shows;
    return shows.filter(s => s.status === statusFilter);
  }, [shows, statusFilter]);

  // Render Section
  if (showDetailScreenId) {
    const show = shows.find(s => s.id === showDetailScreenId);
    if (!show) {
      setShowDetailScreenId(null);
      return null;
    }

    const showExpTotal = (show.expenses?.fuel || 0) + (show.expenses?.food || 0) + (show.expenses?.toll || 0) + (show.expenses?.commission || 0) + (show.expenses?.others || 0);
    const profit = show.totalCache - showExpTotal;
    const showReceipts = show.receipts || [];
    const totalReceived = showReceipts
      .filter(r => r.status === 'Recebido')
      .reduce((sum, r) => sum + r.amount, 0);
    const remainingToReceive = Math.max(0, show.totalCache - totalReceived);
    const percentReceived = show.totalCache > 0 ? Math.round((totalReceived / show.totalCache) * 100) : 0;
    const profitability = show.totalCache > 0 ? Math.round((profit / show.totalCache) * 100) : 0;

    return (
      <div className="space-y-6 pb-28 text-slate-900 dark:text-slate-100 min-h-screen bg-slate-50/40 dark:bg-slate-950/20 -m-4 p-4 rounded-[2.5rem]">
        
        {/* Detail Sticky Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-850">
          <button 
            type="button"
            onClick={() => { setShowDetailScreenId(null); setActiveShowId(null); setIsEditing(false); }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            <span>Voltar</span>
          </button>
          <div className="text-center">
            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest block">Painel do Evento</span>
            <h2 className="text-sm font-black text-slate-800 dark:text-white leading-none tracking-tight mt-0.5 truncate max-w-[150px]">{show.contractorName}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              handleDeleteShowWithSync(show.id);
              setShowDetailScreenId(null);
            }}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-955/40 text-rose-600 dark:text-rose-400 rounded-xl transition active:scale-95 border border-rose-100/50 dark:border-rose-900/20"
            title="Excluir Show"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Info Hero Header */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-purple-500 rounded-full blur-3xl opacity-30"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                show.status === 'Confirmado' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                show.status === 'Agendado' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                show.status === 'Realizado' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {show.status}
              </span>
              <h1 className="text-lg font-black tracking-tight mt-2 text-white">{show.contractorName}</h1>
              <p className="text-xs text-slate-400 font-semibold">{show.name}</p>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">Cachê do Show</span>
              <span className="text-lg font-black text-purple-300 tabular-nums block mt-0.5">{formatCurrency(show.totalCache)}</span>
            </div>
          </div>
          {show.status !== 'Realizado' && (
            <button
              type="button"
              onClick={() => handleConfirmShowRealization(show.id)}
              className="relative z-10 mt-4 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-900/30 transition active:scale-95 flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 size={15} strokeWidth={2.5} />
              <span>Confirmar Realização do Evento</span>
            </button>
          )}
        </div>

        {/* Details and Edit Form */}
        <form onSubmit={handleSaveAllChanges} className="space-y-6">
          
          {/* Card 1: Informações de Contrato */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center">
              <Clipboard size={12} className="mr-1.5 text-purple-500" />
              Dados do Contrato
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Contratante</label>
                <input
                  type="text"
                  value={contractorName}
                  onChange={e => setContractorName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nome do Evento</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Local da Apresentação</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><MapPin size={12} /></span>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Horário Passagem</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Status Pills Selector */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Situação do Show</label>
              <div className="grid grid-cols-4 gap-2">
                {['Agendado', 'Confirmado', 'Realizado', 'Cancelado'].map(st => {
                  const isActive = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st as Show['status'])}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition flex flex-col items-center justify-center space-y-1 active:scale-95 ${
                        isActive 
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {isActive && <Check size={12} strokeWidth={3} />}
                      <span>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Cachê do Contrato (R$)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                <input
                  type="text"
                  value={totalCache}
                  onChange={e => setTotalCache(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Anotações / Rider</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Rider de palco, camarim, contatos..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none min-h-[70px]"
              />
            </div>
          </div>

          {/* Card 2: Financeiro & Fluxo de Parcelas */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center">
                <Coins size={12} className="mr-1.5 text-purple-500" />
                Fluxo de Recebimentos (Parcelas)
              </h3>
              <button
                type="button"
                onClick={() => handleOpenReceiptModal(show.id)}
                className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center space-x-1 hover:underline"
              >
                <PlusCircle size={12} />
                <span>Adicionar Parcela</span>
              </button>
            </div>

            {/* Received percentage bar */}
            <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Total Recebido</span>
                <span className="text-emerald-500 dark:text-emerald-400">{percentReceived}% ({formatCurrency(totalReceived)})</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${percentReceived}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold mt-1 text-slate-400">
                <span>Cachê Total: {formatCurrency(show.totalCache)}</span>
                <span>Restante: {formatCurrency(remainingToReceive)}</span>
              </div>
            </div>

            {showReceipts.length === 0 ? (
              <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-150 dark:border-slate-800 text-slate-400">
                <p className="text-[10px] font-black uppercase">Sem parcelas descritas</p>
                <p className="text-[9px] text-slate-400 mt-1">Configure o sinal, bônus ou o pagamento final usando o botão acima.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {showReceipts.map(receipt => {
                  const accName = accounts.find(a => a.id === receipt.accountId)?.name || 'Conta Corrente';
                  return (
                    <div 
                      key={receipt.id}
                      className={`p-3 rounded-2xl border flex justify-between items-center ${
                        receipt.status === 'Recebido'
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleReceiptStatus(show.id, receipt.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            receipt.status === 'Recebido'
                              ? 'bg-emerald-500 border-emerald-650 text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 hover:border-emerald-500'
                          }`}
                          title={receipt.status === 'Recebido' ? 'Marcar como previsto' : 'Marcar como recebido'}
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                        <div>
                          <p className="text-xs font-black text-slate-850 dark:text-slate-100 leading-none">{receipt.type}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight flex items-center">
                            <Calendar size={10} className="mr-0.5 shrink-0" />
                            {new Date(receipt.expectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                            <span className="mx-1">•</span>
                            <span className="truncate max-w-[80px]" title={accName}>{accName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 text-right">
                        <div>
                          <p className={`text-xs font-black ${
                            receipt.status === 'Recebido' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {formatCurrency(receipt.amount)}
                          </p>
                          <p className="text-[8px] font-black uppercase text-slate-400">{receipt.status}</p>
                        </div>
                        <div className="flex flex-col space-y-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenReceiptModal(show.id, receipt.id)}
                            className="p-1 text-slate-300 hover:text-purple-600 transition-colors"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReceipt(show.id, receipt.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 3: Custos & Despesas */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center">
              <TrendingUp size={12} className="mr-1.5 text-rose-500" />
              Custos de Logística e Taxas
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Combustível</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    value={fuel}
                    onChange={e => setFuel(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Alimentação</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    value={food}
                    onChange={e => setFood(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Pedágios</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    value={toll}
                    onChange={e => setToll(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Comissão / Impostos</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-405 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    value={commission}
                    onChange={e => setCommission(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Outros Custos / Cordas / Rider</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450 font-bold text-xs">R$</span>
                <input
                  type="text"
                  value={others}
                  onChange={e => setOthers(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Debitar Despesas da Conta</label>
              <div className="relative">
                <select
                  value={expenseAccountId}
                  onChange={e => setExpenseAccountId(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none appearance-none cursor-pointer"
                >
                  {accounts.filter(a => a.enabled).map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(getAccountBalance(acc.id))})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Relatório de Lucratividade */}
          <div className="bg-slate-900 text-white rounded-[2rem] p-5 shadow-lg space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-24 h-24 bg-purple-500 rounded-full blur-3xl opacity-10"></div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Análise Líquida de Resultados</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Receita Total</p>
                <p className="text-base font-black text-emerald-400">{formatCurrency(show.totalCache)}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Despesas Gerais</p>
                <p className="text-base font-black text-rose-400">{formatCurrency(showExpTotal)}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lucro Líquido</p>
                <p className={`text-lg font-black tracking-tight ${profit >= 0 ? 'text-purple-300' : 'text-rose-400'}`}>
                  {formatCurrency(profit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Margem de Lucro</p>
                <p className="text-base font-black text-white">{profitability}%</p>
              </div>
            </div>
          </div>

          {/* Form Actions bar */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowDetailScreenId(null); setActiveShowId(null); setIsEditing(false); }}
              className="flex-1 py-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95 shadow-lg shadow-purple-100 dark:shadow-none"
            >
              Salvar Alterações
            </button>
          </div>

        </form>

        {/* MODAL: ADD / EDIT CONTRACT PAYMENT RECEIPT (RENDERED LOCALLY IN SCENE) */}
        {isReceiptModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5 w-full max-w-sm shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-650 dark:text-purple-400">
                    {editingReceiptId ? 'Editar Parcela' : 'Adicionar Parcela'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold">Distribua o cachê recebido</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveReceipt} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Tipo</label>
                    <select
                      value={receiptType}
                      onChange={e => setReceiptType(e.target.value as Receipt['type'])}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="Sinal">Sinal</option>
                      <option value="Parcela">Parcela</option>
                      <option value="Pagamento final">Pagamento final</option>
                      <option value="Bônus">Bônus Extra</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Situação</label>
                    <select
                      value={receiptStatus}
                      onChange={e => setReceiptStatus(e.target.value as Receipt['status'])}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="Previsto">Previsto</option>
                      <option value="Recebido">Recebido</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Valor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                    <input
                      type="text"
                      placeholder="Ex: 300,00"
                      value={receiptAmount}
                      onChange={e => setReceiptAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Vencimento</label>
                    <input
                      type="date"
                      value={receiptExpectedDate}
                      onChange={e => setReceiptExpectedDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Método</label>
                    <select
                      value={receiptPaymentMethod}
                      onChange={e => setReceiptPaymentMethod(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Transferência">Transf.</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Conta de Recebimento</label>
                  <select
                    value={receiptAccountId}
                    onChange={e => setReceiptAccountId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    {accounts.filter(a => a.enabled).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition active:scale-95 shadow-md mt-2"
                >
                  Salvar Parcela
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  if (isAddingNewShow) {
    return (
      <div className="space-y-6 pb-28 text-slate-900 dark:text-slate-100 min-h-screen bg-slate-50/40 dark:bg-slate-950/20 -m-4 p-4 rounded-[2.5rem]">
        
        {/* Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-850">
          <button 
            type="button"
            onClick={() => { setIsAddingNewShow(false); }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            <span>Voltar</span>
          </button>
          <div>
            <span className="text-[9px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest block">Novo Registro</span>
            <h2 className="text-sm font-black text-slate-800 dark:text-white leading-none tracking-tight mt-0.5">Cadastrar Novo Show</h2>
          </div>
        </div>

        <form onSubmit={handleCreateNewShow} className="space-y-6">
          
          {/* Section 1: Contrato */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center">
              <Clipboard size={12} className="mr-1.5 text-purple-500" />
              1. Informações Básicas do Contrato
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Contratante / Local</label>
                <input
                  type="text"
                  placeholder="Ex: Bar do João"
                  value={contractorName}
                  onChange={e => setContractorName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nome do Show / Tipo</label>
                <input
                  type="text"
                  placeholder="Ex: Acústico Voz e Violão"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Endereço / Cidade</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><MapPin size={12} /></span>
                <input
                  type="text"
                  placeholder="Ex: Av. Batel, 1200 - Curitiba/PR"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Horário do Show</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Cachê Acordado (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    placeholder="1200,00"
                    value={totalCache}
                    onChange={e => setTotalCache(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-black focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Status Contratual</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Show['status'])}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="Agendado">Agendado</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Realizado">Realizado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Observações do Contrato / Rider</label>
              <textarea
                placeholder="Ex: Contato técnico, Rider, horário de passagem..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none min-h-[60px]"
              />
            </div>
          </div>

          {/* Section 2: Custos Estimados */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center">
              <TrendingUp size={12} className="mr-1.5 text-rose-500" />
              2. Custos e Despesas Estimados
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Combustível</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={fuel}
                    onChange={e => setFuel(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Alimentação</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={food}
                    onChange={e => setFood(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Pedágios</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={toll}
                    onChange={e => setToll(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Comissão / Taxa</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={commission}
                    onChange={e => setCommission(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Conta para Débito de Custos</label>
              <select
                value={expenseAccountId}
                onChange={e => setExpenseAccountId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none"
              >
                {accounts.filter(a => a.enabled).map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(getAccountBalance(acc.id))})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Footer */}
          <button
            type="submit"
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95 shadow-lg shadow-purple-100 dark:shadow-none"
          >
            Cadastrar Evento & Planejar Parcelas
          </button>

        </form>
      </div>
    );
  }

  // --- MAIN DASHBOARD & SHOW LIST VIEW ---
  return (
    <div className="space-y-6 pb-28 text-slate-900 dark:text-slate-100">
      
      {/* Top Header */}
      <div className="flex items-center space-x-3 pt-4">
        <button 
          onClick={() => navigate('/')} 
          className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 border border-slate-100 dark:border-slate-800 transition active:scale-95 shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">Módulo Corporativo</span>
          <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tight">Vida de Músico 🎸</h1>
        </div>
      </div>

      {/* Corporate Dashboard Panel - Modernized & High-Contrast Visuals */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden">
        {/* Glow effect with mathematical purpose */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-purple-600 rounded-full blur-[80px] opacity-25"></div>
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-32 h-32 bg-indigo-500 rounded-full blur-[70px] opacity-15"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center">
              <Briefcase size={12} className="mr-1 text-purple-400" />
              Gestão Financeira Corporativa
            </span>
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 text-[8px] font-black uppercase tracking-widest rounded-lg border border-purple-500/20">
              Musician Inc.
            </span>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Resultado Líquido do Portfólio</p>
            <p className="text-3xl font-black tracking-tight mt-0.5 tabular-nums text-white">
              {!isBlurred ? formatCurrency(stats.netProfit) : 'R$ ••••••••'}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5 text-center">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shows</p>
              <p className="text-xs font-black text-white mt-0.5">{stats.totalShows}</p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Faturamento</p>
              <p className="text-xs font-black text-emerald-400 mt-0.5">
                {!isBlurred ? formatCurrency(stats.totalRevenue) : 'R$ •••'}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Recebido</p>
              <p className="text-xs font-black text-indigo-400 mt-0.5">
                {!isBlurred ? formatCurrency(stats.totalReceived) : 'R$ •••'}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Margem</p>
              <p className="text-xs font-black text-purple-300 mt-0.5">{stats.margin}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary New Show Trigger */}
      <button
        onClick={handleOpenNewShow}
        className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg flex items-center justify-center space-x-2 active:scale-[0.98] transition-all"
      >
        <Plus size={16} strokeWidth={3} />
        <span>Cadastrar Novo Show</span>
      </button>

      {/* Modern Horizontal Filter Status Tabs */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filtrar por Situação</h3>
          <div className="flex overflow-x-auto space-x-1.5 pb-2 scrollbar-none">
            {['Todos', 'Confirmado', 'Agendado', 'Realizado', 'Cancelado'].map(f => {
              const isActive = statusFilter === f;
              const count = f === 'Todos' ? shows.length : shows.filter(s => s.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 transition active:scale-95 flex items-center space-x-1 ${
                    isActive
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span>{f}</span>
                  <span className={`text-[8px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Shows list rendered as clickable high-end widgets */}
        <div className="space-y-3.5">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contratos Registrados ({filteredShows.length})</h4>
          </div>

          {filteredShows.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 text-center text-slate-400 shadow-sm">
              <Music size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-wider">Nenhum show encontrado</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Tente mudar o filtro acima ou cadastre um novo evento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShows.map(show => {
                const showExpTotal = (show.expenses?.fuel || 0) + (show.expenses?.food || 0) + (show.expenses?.toll || 0) + (show.expenses?.commission || 0) + (show.expenses?.others || 0);
                const profit = show.totalCache - showExpTotal;
                const formattedDate = new Date(show.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                
                const showReceipts = show.receipts || [];
                const totalReceived = showReceipts
                  .filter(r => r.status === 'Recebido')
                  .reduce((sum, r) => sum + r.amount, 0);
                const percentReceived = show.totalCache > 0 ? Math.round((totalReceived / show.totalCache) * 100) : 0;
                
                return (
                  <div
                    key={show.id}
                    onClick={() => handleOpenEditShow(show)}
                    className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4.5 shadow-sm space-y-3 relative overflow-hidden cursor-pointer hover:border-purple-300 dark:hover:border-purple-900 hover:shadow-md transition-all active:scale-[0.99] group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${
                            show.status === 'Confirmado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            show.status === 'Agendado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                            show.status === 'Realizado' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' :
                            'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            {show.status}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">{show.time}</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-450 transition-colors leading-tight">
                          {show.contractorName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-[200px]">Evento: {show.name}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[8px] font-black uppercase text-slate-400">Cachê</span>
                        <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{formatCurrency(show.totalCache)}</p>
                      </div>
                    </div>

                    {/* Progress tracking line */}
                    <div className="grid grid-cols-2 gap-4 items-center pt-2.5 border-t border-slate-50 dark:border-slate-850">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-bold text-slate-400">
                          <span>Recebimentos</span>
                          <span className="text-emerald-500 font-black">{percentReceived}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${percentReceived}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 pl-2 border-l border-slate-100 dark:border-slate-800">
                        <span className="flex items-center"><Calendar size={10} className="mr-0.5 text-slate-300" /> {formattedDate}</span>
                        <span className={`font-black ${profit >= 0 ? 'text-purple-500 dark:text-purple-400' : 'text-rose-500'}`}>
                          Líq: {formatCurrency(profit)}
                        </span>
                      </div>
                    </div>

                    {show.status !== 'Realizado' && (
                      <div className="pt-2 border-t border-slate-50 dark:border-slate-850 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmShowRealization(show.id);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 border border-emerald-200/50 dark:border-emerald-800/40 transition active:scale-95"
                        >
                          <CheckCircle2 size={12} strokeWidth={2.5} />
                          <span>Confirmar Realização</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
