import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType, TransactionStatus, ScopeType, Show } from '../types';
import { 
  X, Check, Trash2, Bell, BellRing, Repeat, Copy, Layers, 
  Sparkles, Loader2, TrendingUp, ArrowRightLeft, 
  AlertTriangle, Calendar as CalendarIcon,
  ChevronDown, Wallet, Target, Plus, Search, CheckCircle2,
  SlidersHorizontal, History, Zap, ArrowUpRight, ArrowDownRight,
  Music, ChevronRight, User, MapPin, DollarSign, Calendar
} from 'lucide-react';
import { getIcon } from '../constants';
import { parseCurrencyInput } from '../services/financeAggregator';
import { GeminiService } from '../services/geminiService';
import { CalendarModal } from './CalendarModal';
import { generateUUID } from '../services/uuidHelper';
import { getLocalDateString } from '../services/dateUtils';

interface Props {
  onClose: () => void;
  initialType?: TransactionType;
  initialCategoryId?: string;
  transaction?: Transaction | null;
}

export const TransactionForm: React.FC<Props> = ({ onClose, initialType = 'expense', initialCategoryId, transaction }) => {
  const { 
    addTransaction, updateTransaction, updateTransactionSeries, updateDebtTransaction, 
    deleteTransaction, categories, transactions, accounts, shows, addShow, checkTransactionImpact,
    getDefaultAccountForScope
  } = useFinance();

  // Primary Form State
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(initialCategoryId || '');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [date, setDate] = useState(() => transaction?.date || getLocalDateString());
  const [status, setStatus] = useState<TransactionStatus>('paid');
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  
  // Scope State (Pessoal vs Músico)
  const [scope, setScope] = useState<ScopeType>(() => {
    if (transaction?.scope === 'BUSINESS') return 'BUSINESS';
    if (transaction?.scope === 'PERSONAL') return 'PERSONAL';
    if (initialCategoryId === 'cat_33' || initialCategoryId === 'cat_equipamentos' || initialCategoryId === 'cat_producao_shows' || transaction?.showId) return 'BUSINESS';
    return 'PERSONAL';
  });

  // Show Link State (Vínculo com Shows no Módulo Músico)
  const [selectedShowId, setSelectedShowId] = useState<string>(transaction?.showId || '');

  // Quick Show Modal State
  const [showQuickCreateShowModal, setShowQuickCreateShowModal] = useState(false);
  const [quickShowContractor, setQuickShowContractor] = useState('');
  const [quickShowDate, setQuickShowDate] = useState('');
  const [quickShowTotalCache, setQuickShowTotalCache] = useState('');
  const [quickShowLocation, setQuickShowLocation] = useState('');
  const [quickShowCity, setQuickShowCity] = useState('');

  // Progressive Disclosure UI States
  const [showMoreOptions, setShowMoreOptions] = useState(!!transaction || !!transaction?.showId);
  const [showAllCategoriesModal, setShowAllCategoriesModal] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [userManuallySetCategory, setUserManuallySetCategory] = useState(false);
  const [userManuallySetAccount, setUserManuallySetAccount] = useState(false);
  const [parsedTextInfo, setParsedTextInfo] = useState<{ amount: number; text: string } | null>(null);

  // Modal / Confirm States
  const [showRecurringEditModal, setShowRecurringEditModal] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [baseAmount, setBaseAmount] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [impact, setImpact] = useState<{ compromisedTransaction: Transaction } | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [quickShowError, setQuickShowError] = useState<string | null>(null);

  // Initial Account Assignment
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const defAcc = getDefaultAccountForScope(scope);
      setAccountId(defAcc || accounts[0].id);
    }
  }, [accounts, scope, getDefaultAccountForScope, accountId]);

  // Load existing transaction for editing
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      if (transaction.debtId) {
        const originalBase = transaction.amount - (transaction.interest || 0);
        setBaseAmount(originalBase);
      }
      setDescription(transaction.description);
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId || accounts[0]?.id);
      setDestinationAccountId(transaction.destinationAccountId || '');
      setDate(transaction.date);
      setStatus(transaction.status);
      if (transaction.reminderDate) {
        setHasReminder(true);
        setReminderDate(transaction.reminderDate);
      }
      if (transaction.isFixed) {
        setIsFixed(true);
      }
      const initialScope = (transaction.scope === 'BUSINESS' || transaction.showId || transaction.categoryId === 'cat_33') ? 'BUSINESS' : 'PERSONAL';
      setScope(initialScope);
      if (transaction.showId) {
        setSelectedShowId(transaction.showId);
      }
      setShowMoreOptions(true);
    }
  }, [transaction]);

  // Financial impact calculation for expenses
  useEffect(() => {
    const val = parseCurrencyInput(amount);
    if (type === 'expense' && val > 0) {
      const result = checkTransactionImpact(val, date);
      setImpact(result);
    } else {
      setImpact(null);
    }
  }, [amount, date, type, checkTransactionImpact]);

  // Available Shows (Scheduled, Confirmed, Completed)
  const availableShows = useMemo(() => {
    return shows.filter(s => s.status !== 'Cancelado').sort((a, b) => b.date.localeCompare(a.date));
  }, [shows]);

  const activeLinkedShow = useMemo(() => {
    if (!selectedShowId) return null;
    return shows.find(s => s.id === selectedShowId) || null;
  }, [selectedShowId, shows]);

  // Handle Date Selection (Auto-set status for new transactions based on date)
  const handleDateSelect = (newDate: string) => {
    setDate(newDate);
    if (!transaction) {
      const selected = new Date(newDate + 'T12:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected > today) {
        setStatus('pending');
      } else {
        setStatus('paid');
      }
    }
  };

  // ==========================================
  // 1. INTERPRETAÇÃO DE TEXTO E VALOR ("Almoço 35")
  // ==========================================
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);

    if (!transaction) {
      const match = val.match(/^(.+?)\s+(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)$/i);
      if (match) {
        const cleanText = match[1].trim();
        const extractedNumStr = match[2].replace(',', '.');
        const numVal = parseFloat(extractedNumStr);

        if (!isNaN(numVal) && numVal > 0) {
          if (!amount || parsedTextInfo !== null) {
            setAmount(numVal.toString());
            setParsedTextInfo({ amount: numVal, text: cleanText });
          }
        }
      } else if (parsedTextInfo !== null && !val.trim()) {
        setParsedTextInfo(null);
      }
    }
  };

  // ==========================================
  // 2. MEMÓRIA OPERACIONAL & SUGESTÕES INTELIGENTES
  // ==========================================
  const smartSuggestion = useMemo(() => {
    const cleanDesc = description.trim().toLowerCase();
    if (!cleanDesc || cleanDesc.length < 2) return null;

    const matches = transactions.filter(t => {
      const tDesc = t.description.toLowerCase();
      return tDesc === cleanDesc || tDesc.includes(cleanDesc) || cleanDesc.includes(tDesc);
    });

    if (matches.length === 0) return null;

    const categoryCounts: Record<string, number> = {};
    const accountCounts: Record<string, number> = {};
    let fixedCount = 0;

    matches.forEach(t => {
      if (t.categoryId) {
        categoryCounts[t.categoryId] = (categoryCounts[t.categoryId] || 0) + 1;
      }
      if (t.accountId) {
        accountCounts[t.accountId] = (accountCounts[t.accountId] || 0) + 1;
      }
      if (t.isFixed) fixedCount++;
    });

    let bestCatId = '';
    let maxCatCount = 0;
    Object.entries(categoryCounts).forEach(([catId, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        bestCatId = catId;
      }
    });

    let bestAccId = '';
    let maxAccCount = 0;
    Object.entries(accountCounts).forEach(([accId, count]) => {
      if (count > maxAccCount) {
        maxAccCount = count;
        bestAccId = accId;
      }
    });

    const isLikelyFixed = fixedCount / matches.length >= 0.5;

    const suggestedCat = categories.find(c => c.id === bestCatId);
    const suggestedAcc = accounts.find(a => a.id === bestAccId);

    return {
      categoryId: bestCatId,
      categoryName: suggestedCat?.name || '',
      categoryIcon: suggestedCat?.icon || '',
      accountId: bestAccId,
      accountName: suggestedAcc?.name || '',
      isLikelyFixed,
      matchCount: matches.length
    };
  }, [description, transactions, categories, accounts]);

  // Pré-preenchimento automático inteligente
  useEffect(() => {
    if (!transaction && smartSuggestion) {
      if (smartSuggestion.categoryId && !userManuallySetCategory) {
        setCategoryId(smartSuggestion.categoryId);
      }
      if (smartSuggestion.accountId && !userManuallySetAccount) {
        setAccountId(smartSuggestion.accountId);
      }
      if (smartSuggestion.isLikelyFixed && !isFixed) {
        setIsFixed(true);
      }
    }
  }, [smartSuggestion, userManuallySetCategory, userManuallySetAccount, transaction]);

  // ==========================================
  // 3. RANKING DE CATEGORIAS (FILTRADO POR ESCOPO RIGOROSO)
  // ==========================================
  const moduleCategories = useMemo(() => {
    return categories.filter(c => {
      // Filtrar por tipo (expense / income)
      if (c.type !== type) return false;

      // Filtrar por escopo estrito
      if (scope === 'PERSONAL') {
        return c.scope === 'PERSONAL' || (!c.scope && c.id !== 'cat_33' && c.id !== 'cat_equipamentos' && c.id !== 'cat_producao_shows' && c.id !== 'cat_midia_marketing');
      } else {
        return c.scope === 'BUSINESS' || (!c.scope && (c.id === 'cat_33' || c.id === 'cat_equipamentos' || c.id === 'cat_producao_shows' || c.id === 'cat_midia_marketing'));
      }
    });
  }, [categories, type, scope]);

  const rankedCategories = useMemo(() => {
    const now = new Date().getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const scores: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.categoryId) {
        const isRecent = (now - t.createdAt) < thirtyDaysMs;
        scores[t.categoryId] = (scores[t.categoryId] || 0) + (isRecent ? 3 : 1);
      }
    });

    if (smartSuggestion?.categoryId) {
      scores[smartSuggestion.categoryId] = (scores[smartSuggestion.categoryId] || 0) + 100;
    }

    return [...moduleCategories].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  }, [moduleCategories, transactions, smartSuggestion]);

  // Top 4 categorias para a barra rápida inicial
  const topCategories = useMemo(() => rankedCategories.slice(0, 4), [rankedCategories]);

  // Categorias filtradas para a busca no modal
  const searchedCategories = useMemo(() => {
    if (!categorySearchTerm.trim()) return rankedCategories;
    const term = categorySearchTerm.toLowerCase();
    return rankedCategories.filter(c => c.name.toLowerCase().includes(term));
  }, [rankedCategories, categorySearchTerm]);

  // ==========================================
  // HANDLERS E SUBMISSÃO
  // ==========================================
  const diffAmount = useMemo(() => {
    if (!transaction?.debtId) return 0;
    const currentVal = parseCurrencyInput(amount);
    if (isNaN(currentVal)) return 0;
    return currentVal - baseAmount;
  }, [amount, baseAmount, transaction]);

  const isAmountInvalid = transaction?.debtId && diffAmount < -0.01;

  const handleSelectCategory = (id: string) => {
    setCategoryId(id);
    setUserManuallySetCategory(true);
  };

  const handleSelectAccount = (id: string) => {
    setAccountId(id);
    setUserManuallySetAccount(true);
  };

  const handleSelectShow = (showId: string) => {
    if (showId === '__create_new__') {
      // Abre modal rápido para criar show
      setQuickShowContractor(description || '');
      setQuickShowDate(date || new Date().toISOString().slice(0, 10));
      const val = parseCurrencyInput(amount);
      setQuickShowTotalCache(val > 0 ? val.toString() : '1500');
      setQuickShowLocation('');
      setQuickShowCity('');
      setShowQuickCreateShowModal(true);
      return;
    }

    setSelectedShowId(showId);
    if (showId) {
      setScope('BUSINESS');
      if (!userManuallySetCategory) {
        const cacheCategory = categories.find(c => c.id === 'cat_33');
        if (cacheCategory) {
          setCategoryId(cacheCategory.id);
        }
      }
    }
  };

  const handleCreateQuickShow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickShowContractor.trim() || !quickShowDate) {
      setQuickShowError('Preencha o nome do contratante/evento e a data.');
      return;
    }

    const cacheVal = parseFloat(quickShowTotalCache) || 0;
    const newShowId = `show_${generateUUID()}`;

    const newShow: Show = {
      id: newShowId,
      name: quickShowContractor.trim(),
      contractorName: quickShowContractor.trim(),
      date: quickShowDate,
      time: '20:00',
      totalCache: cacheVal,
      location: quickShowLocation.trim() || 'A definir',
      city: quickShowCity.trim() || 'São Paulo / SP',
      status: 'Confirmado',
      scope: 'BUSINESS',
      createdAt: Date.now()
    };

    addShow(newShow);
    setSelectedShowId(newShowId);
    setScope('BUSINESS');
    if (!userManuallySetCategory) {
      setCategoryId('cat_33');
    }
    setQuickShowError(null);
    setShowQuickCreateShowModal(false);
  };

  const handleSmartFillWithAI = async () => {
    if (!description || description.length < 3) return;
    setIsPredicting(true);
    const prediction = await GeminiService.predictTransaction(description, transactions, categories);
    setIsPredicting(false);
    if (prediction) {
      if (prediction.categoryId) {
        setCategoryId(prediction.categoryId);
        setUserManuallySetCategory(true);
      }
      if (prediction.type) setType(prediction.type as TransactionType);
      if (prediction.amount && prediction.amount > 0) setAmount(prediction.amount.toString());
    }
  };

  const handleReminderToggle = () => {
    setHasReminder(!hasReminder);
    if (!hasReminder && !reminderDate) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setReminderDate(now.toISOString().slice(0, 16));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseCurrencyInput(amount);
    
    if (!val || val <= 0 || !description.trim() || !accountId) {
      setValidationError("Preencha o valor, a descrição e a conta de lançamento.");
      return;
    }

    if (isAmountInvalid) {
      setValidationError("Valor inválido para dívida.");
      return;
    }

    if (type !== 'transfer' && !categoryId) {
      setValidationError("Por favor, selecione uma categoria.");
      return;
    }

    if (type === 'transfer') {
      if (!destinationAccountId) {
        setValidationError("Selecione a conta de destino para a transferência.");
        return;
      }
      if (accountId === destinationAccountId) {
        setValidationError("A conta de origem e destino devem ser diferentes.");
        return;
      }
    }

    setValidationError(null);

    const finalScope: ScopeType = (scope === 'BUSINESS' || categoryId === 'cat_33' || categoryId === 'cat_equipamentos' || categoryId === 'cat_producao_shows' || !!selectedShowId) ? 'BUSINESS' : 'PERSONAL';
    const finalShowId = (finalScope === 'BUSINESS' && type === 'income' && selectedShowId) ? selectedShowId : undefined;

    const data: any = {
      type, 
      amount: val, 
      description, 
      categoryId: type === 'transfer' ? 'cat_transfer' : categoryId,
      accountId, 
      destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      date, 
      status,
      reminderDate: (status === 'pending' && hasReminder) ? reminderDate : undefined,
      reminderSent: (status === 'pending' && hasReminder && transaction?.reminderDate === reminderDate) ? transaction.reminderSent : false,
      isFixed,
      interest: (transaction?.debtId && diffAmount > 0.01) ? diffAmount : 0,
      scope: finalScope,
      showId: finalShowId,
      importedFromBank: transaction?.importedFromBank,
      originalBankDescription: transaction?.originalBankDescription,
      bankFitId: transaction?.bankFitId
    };

    if (transaction) {
      if (transaction.debtId) {
        updateDebtTransaction({ ...transaction, ...data }, false);
        onClose();
      } else if (transaction.fixedGroupId) {
        setShowRecurringEditModal(true);
      } else {
        updateTransaction({ ...transaction, ...data });
        onClose();
      }
    } else {
      addTransaction(data);
      onClose();
    }
  };

  const handleConfirmRecurringUpdate = (updateFuture: boolean) => {
    if (!transaction) return;
    const val = parseCurrencyInput(amount);
    const finalScope: ScopeType = (scope === 'BUSINESS' || categoryId === 'cat_33' || categoryId === 'cat_equipamentos' || categoryId === 'cat_producao_shows' || !!selectedShowId) ? 'BUSINESS' : 'PERSONAL';
    const finalShowId = (finalScope === 'BUSINESS' && type === 'income' && selectedShowId) ? selectedShowId : undefined;

    const data: any = {
      type, 
      amount: val, 
      description, 
      categoryId: type === 'transfer' ? 'cat_transfer' : categoryId,
      accountId, 
      destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
      date, 
      status,
      reminderDate: (status === 'pending' && hasReminder) ? reminderDate : undefined,
      reminderSent: (status === 'pending' && hasReminder && transaction?.reminderDate === reminderDate) ? transaction.reminderSent : false,
      isFixed,
      scope: finalScope,
      showId: finalShowId
    };
    updateTransactionSeries({ ...transaction, ...data }, updateFuture);
    onClose();
  };

  const handleDelete = () => { if (transaction) setShowDeleteConfirm(true); };
  const confirmDelete = () => { if (transaction) { deleteTransaction(transaction.id); onClose(); } };

  // Theme styling based on active transaction type
  const activeColor = type === 'expense' ? 'rose' : type === 'income' ? 'emerald' : 'blue';
  const activeBg = type === 'expense' ? 'bg-rose-500' : type === 'income' ? 'bg-emerald-500' : 'bg-blue-500';
  const activeText = type === 'expense' ? 'text-rose-600 dark:text-rose-400' : type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md h-[95dvh] sm:h-auto sm:max-h-[90dvh] rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl animate-slide-up flex flex-col relative overflow-hidden border border-slate-200/50 dark:border-slate-800">
          
          {/* ========================================== */}
          {/* 1. SELETOR DO TIPO DE TRANSAÇÃO (TOP BAR)  */}
          {/* ========================================== */}
          <div className="px-6 pt-5 pb-3 flex justify-between items-center z-20 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl w-full max-w-[280px]">
              <button 
                type="button"
                onClick={() => { setType('expense'); setUserManuallySetCategory(false); }} 
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center space-x-1 ${type === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <ArrowDownRight size={14} strokeWidth={2.5} />
                <span>Despesa</span>
              </button>

              <button 
                type="button"
                onClick={() => { setType('income'); setUserManuallySetCategory(false); }} 
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center space-x-1 ${type === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <ArrowUpRight size={14} strokeWidth={2.5} />
                <span>Receita</span>
              </button>

              <button 
                type="button"
                onClick={() => { setType('transfer'); if (!description) setDescription('Transferência'); }} 
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center space-x-1 ${type === 'transfer' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <ArrowRightLeft size={14} strokeWidth={2.5} />
                <span>Transf.</span>
              </button>
            </div>

            <button 
              type="button"
              onClick={onClose} 
              className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 ml-2"
              title="Fechar"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar pb-36">
            
            {/* Seletor Rápido de Módulo: 👤 PESSOAL vs 🎸 MÚSICO */}
            <div className="px-6 pt-3">
              <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center justify-between border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setScope('PERSONAL');
                    setSelectedShowId('');
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 ${
                    scope === 'PERSONAL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <User size={13} />
                  <span>👤 Pessoal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('BUSINESS')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 ${
                    scope === 'BUSINESS'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-purple-600'
                  }`}
                >
                  <Music size={13} />
                  <span>🎸 Músico / Carreira</span>
                </button>
              </div>
            </div>

            {/* ========================================== */}
            {/* VÍNCULO COM SHOWS (EXCLUSIVO MÚSICO + RECEITA) */}
            {/* ========================================== */}
            {scope === 'BUSINESS' && type === 'income' && (
              <div className="mx-6 mt-3 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                      <Music size={13} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 dark:text-purple-300">
                      Vincular ao Show / Evento
                    </span>
                  </div>

                  {activeLinkedShow && (
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle2 size={11} />
                      <span>Vinculado</span>
                    </span>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedShowId || ''}
                    onChange={(e) => handleSelectShow(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-purple-200 dark:border-purple-700/80 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500 appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">-- Não vincular a nenhum show (Receita Geral) --</option>
                    <option value="__create_new__" className="text-purple-600 font-black">+ Criar Novo Show / Evento...</option>
                    {availableShows.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.contractorName || s.name} ({new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}) - Cachê: R$ {s.totalCache?.toLocaleString('pt-BR')}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {activeLinkedShow && (
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-purple-900/60 flex items-center justify-between text-[11px]">
                    <div>
                      <p className="font-extrabold text-slate-800 dark:text-white">{activeLinkedShow.contractorName || activeLinkedShow.name}</p>
                      <p className="text-[10px] text-slate-500">{new Date(activeLinkedShow.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {activeLinkedShow.city || activeLinkedShow.location}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedShowId('')}
                      className="text-[10px] font-bold text-rose-500 hover:underline"
                    >
                      Desvincular
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* 2. CAMPO VALOR (DESTAQUE MÁXIMO DA TELA)   */}
            {/* ========================================== */}
            <div className="flex flex-col items-center justify-center pt-5 pb-3 relative px-6">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 ${isAmountInvalid ? 'text-rose-500' : 'text-slate-400'}`}>
                {type === 'expense' ? 'Valor da Despesa' : type === 'income' ? 'Valor da Receita' : 'Valor da Transferência'}
              </span>

              <div className="flex items-baseline justify-center relative w-full">
                <span className={`text-3xl font-black mr-1.5 ${amount ? activeText : 'text-slate-300 dark:text-slate-700'}`}>
                  R$
                </span>
                <input 
                  type="number" 
                  step="any" 
                  min="0" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  className={`w-full bg-transparent text-center text-5xl sm:text-6xl font-black outline-none placeholder:text-slate-200 dark:placeholder:text-slate-800 transition-colors ${activeText}`}
                  placeholder="0,00" 
                  required 
                  autoFocus={!transaction}
                />
              </div>

              {/* Tag de interpretação de valor do texto */}
              {parsedTextInfo && (
                <div className="mt-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1 animate-fade-in">
                  <Zap size={12} />
                  <span>Valor extraído do texto: R$ {parsedTextInfo.amount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}

              {/* Alerta de Impacto Financeiro */}
              {impact && (
                <div className="mt-3 w-full p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start space-x-2.5 animate-pulse">
                  <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                  <div className="text-left">
                    <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">Comprometimento de Saldo</p>
                    <p className="text-[10px] font-medium text-rose-500 dark:text-rose-300 leading-tight mt-0.5">
                      Esta compra compromete a conta <span className="font-bold underline">{impact.compromisedTransaction.description}</span> do dia {new Date(impact.compromisedTransaction.date + 'T12:00:00').toLocaleDateString('pt-BR')}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================== */}
            {/* 3. CAMPO DESCRIÇÃO ("O QUE FOI?")          */}
            {/* ========================================== */}
            <div className="px-6 space-y-5">
              
              <div className="relative">
                <input 
                  type="text" 
                  value={description} 
                  onChange={handleDescriptionChange} 
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200/80 dark:border-slate-700/80 focus:border-indigo-500 dark:focus:border-indigo-500 px-4 py-4 text-base font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-2xl transition-all shadow-sm"
                  placeholder={type === 'expense' ? "O que foi? (ex: Almoço, Gasolina 100)" : type === 'income' ? (scope === 'BUSINESS' ? "Cachê / Contratante (ex: Bar do Zé, Casamento Pedro)" : "De onde veio? (ex: Pró-Labore, Salário)") : "Descrição da transferência"}
                  required 
                />
                
                {type !== 'transfer' && !transaction && description.length >= 3 && (
                  <button 
                    type="button" 
                    onClick={handleSmartFillWithAI} 
                    disabled={isPredicting} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition disabled:opacity-30 active:scale-95 flex items-center space-x-1"
                    title="Análise com IA"
                  >
                    {isPredicting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  </button>
                )}
              </div>

              {/* ========================================== */}
              {/* 4. CARD DE SUGESTÃO INTELIGENTE & HISTÓRICO*/}
              {/* ========================================== */}
              {smartSuggestion && smartSuggestion.matchCount > 0 && type !== 'transfer' && (
                <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <History size={15} className="text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        Sugestão pelo Histórico ({smartSuggestion.matchCount}x)
                      </span>
                    </div>

                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle2 size={11} />
                      <span>Pré-preenchido</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {smartSuggestion.categoryName && (
                      <span className="text-[11px] font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 flex items-center space-x-1">
                        <span className="text-indigo-500 font-extrabold">Categoria:</span>
                        <span>{smartSuggestion.categoryName}</span>
                      </span>
                    )}

                    {smartSuggestion.accountName && (
                      <span className="text-[11px] font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 flex items-center space-x-1">
                        <span className="text-indigo-500 font-extrabold">Conta:</span>
                        <span>{smartSuggestion.accountName}</span>
                      </span>
                    )}

                    <span className="text-[11px] font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700 flex items-center space-x-1">
                      <span className="text-indigo-500 font-extrabold">Status:</span>
                      <span>{status === 'paid' ? (type === 'expense' ? 'Pago' : 'Recebido') : 'Pendente'}</span>
                    </span>
                  </div>

                  {smartSuggestion.isLikelyFixed && (
                    <div className="pt-1 flex items-center justify-between text-[10px] text-indigo-700 dark:text-indigo-300 font-medium">
                      <span>Esta despesa é frequentemente fixa/recorrente.</span>
                      <button
                        type="button"
                        onClick={() => setIsFixed(!isFixed)}
                        className={`px-2.5 py-1 rounded-lg font-black uppercase text-[9px] border transition ${isFixed ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-indigo-600 border-indigo-300'}`}
                      >
                        {isFixed ? '✓ Recorrente' : '+ Marcar Recorrente'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* 5. CATEGORIAS RECENTES & BOTÃO VER TODAS   */}
              {/* ========================================== */}
              {type !== 'transfer' && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {scope === 'BUSINESS' ? 'Categorias do Músico / Empresa' : 'Categorias Pessoais'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowAllCategoriesModal(true)}
                      className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <span>Ver todas</span>
                      <ChevronDown size={14} className="-rotate-90" />
                    </button>
                  </div>

                  {/* Chips Rápidos Horizontal */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {topCategories.map(cat => {
                      const Icon = getIcon(cat.icon);
                      const isSelected = categoryId === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat.id)}
                          className={`p-3 rounded-2xl border-2 flex items-center space-x-2.5 transition-all text-left active:scale-95 ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-white shadow-md font-extrabold' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}
                        >
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                            style={{ backgroundColor: cat.color || '#6366f1' }}
                          >
                            <Icon size={16} />
                          </div>
                          <span className="text-xs font-bold truncate">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================== */}
              {/* 6. CAMPO CONTA ORIGEM & DESTINO            */}
              {/* ========================================== */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">
                  {type === 'transfer' ? 'Contas da Transferência' : 'Conta Utilizada'}
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Conta Origem */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl flex items-center relative border border-slate-200/80 dark:border-slate-700/80">
                    <select 
                      value={accountId} 
                      onChange={(e) => handleSelectAccount(e.target.value)} 
                      className="w-full h-full bg-transparent outline-none font-black text-xs text-slate-800 dark:text-white appearance-none pl-10 pr-8 py-3 cursor-pointer"
                    >
                      {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Wallet size={18} />
                    </div>
                    <ChevronDown size={16} className="absolute right-3 text-slate-400 pointer-events-none" />
                    <span className="absolute top-1 left-10 text-[8px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                      {type === 'transfer' ? 'De (Origem)' : 'Carteira / Conta'}
                    </span>
                  </div>

                  {/* Conta Destino (Apenas para Transferência) */}
                  {type === 'transfer' && (
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl flex items-center relative border-2 border-indigo-200 dark:border-indigo-900/50">
                      <select 
                        value={destinationAccountId} 
                        onChange={(e) => setDestinationAccountId(e.target.value)} 
                        className="w-full h-full bg-transparent outline-none font-black text-xs text-slate-800 dark:text-white appearance-none pl-10 pr-8 py-3 cursor-pointer"
                      >
                        <option value="">Selecione o destino...</option>
                        {accounts.filter(a => a.id !== accountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
                        <ArrowRightLeft size={18} />
                      </div>
                      <ChevronDown size={16} className="absolute right-3 text-slate-400 pointer-events-none" />
                      <span className="absolute top-1 left-10 text-[8px] font-black text-indigo-500 uppercase tracking-widest pointer-events-none">Para (Destino)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ========================================== */}
              {/* 7. PROGRESSIVE DISCLOSURE: + MAIS OPÇÕES   */}
              {/* ========================================== */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 border border-slate-200/50 dark:border-slate-700/50 active:scale-98"
                >
                  <SlidersHorizontal size={14} />
                  <span>{showMoreOptions ? '- Ocultar Detalhes' : '+ Mais Opções (Data, Status, Recorrência...)'}</span>
                </button>

                {showMoreOptions && (
                  <div className="mt-4 space-y-4 animate-fade-in p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    
                    {/* Data e Status Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      
                      {/* Data */}
                      <div 
                        onClick={() => setIsCalendarOpen(true)}
                        className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl flex flex-col justify-center cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition"
                      >
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                          <CalendarIcon size={12} className="mr-1 text-indigo-500"/> Data
                        </span>
                        <span className="text-xs font-black text-slate-800 dark:text-white truncate">
                          {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric'})}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl flex items-center relative border border-slate-200 dark:border-slate-700">
                        <select 
                          value={status} 
                          onChange={(e) => setStatus(e.target.value as TransactionStatus)} 
                          className="w-full h-full bg-transparent outline-none font-black text-xs text-slate-800 dark:text-white appearance-none px-3 pt-3 cursor-pointer"
                        >
                          <option value="paid">{type === 'expense' ? 'Pago' : type === 'transfer' ? 'Realizado' : 'Recebido'}</option>
                          <option value="pending">{type === 'expense' ? 'Pendente' : 'Previsto'}</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                        <span className="absolute top-1.5 left-3 text-[8px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">Status</span>
                      </div>

                    </div>

                    {/* Recorrência / Lembrete */}
                    {!transaction && !transaction?.debtId && type !== 'transfer' && (
                      <div className="flex space-x-3 pt-1">
                        <button 
                          type="button"
                          onClick={() => setIsFixed(!isFixed)}
                          className={`flex-1 py-3 px-3 rounded-2xl border-2 flex items-center justify-center space-x-2 transition-all ${isFixed ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'}`}
                        >
                          <Repeat size={16} />
                          <span className="text-[10px] font-black uppercase">Fixa Mensal</span>
                        </button>
                        
                        <button 
                          type="button"
                          onClick={handleReminderToggle}
                          className={`flex-1 py-3 px-3 rounded-2xl border-2 flex items-center justify-center space-x-2 transition-all ${hasReminder ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'}`}
                        >
                          {hasReminder ? <BellRing size={16} /> : <Bell size={16} />}
                          <span className="text-[10px] font-black uppercase">Lembrete</span>
                        </button>
                      </div>
                    )}

                    {/* Data/Hora do Lembrete */}
                    {hasReminder && (
                      <div className="animate-fade-in pt-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                          Data e Hora do Lembrete
                        </label>
                        <input 
                          type="datetime-local" 
                          value={reminderDate} 
                          onChange={(e) => setReminderDate(e.target.value)} 
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none font-bold" 
                        />
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          </form>

          {/* MENSAGEM VISUAL DE VALIDAÇÃO INLINE (SEM WINDOW.ALERT) */}
          {validationError && (
            <div className="absolute bottom-24 left-4 right-4 z-40 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center space-x-2 animate-fade-in shadow-xl backdrop-blur-md">
              <AlertTriangle size={16} className="shrink-0 text-rose-500" />
              <span className="flex-1">{validationError}</span>
              <button 
                type="button" 
                onClick={() => setValidationError(null)} 
                className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-300"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ========================================== */}
          {/* 8. BOTÃO CONFIRMAR (FIXO NO BOTTOM)        */}
          {/* ========================================== */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 z-30 flex items-center space-x-3 border-t border-slate-100 dark:border-slate-800/80">
            {transaction && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition active:scale-90 shrink-0 border border-rose-200/60 dark:border-rose-900/40"
                title="Excluir Lançamento"
              >
                <Trash2 size={22} />
              </button>
            )}

            <button 
              onClick={handleSubmit} 
              disabled={isAmountInvalid}
              className={`flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-2 text-white ${isAmountInvalid ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed' : activeBg + ' hover:opacity-90 shadow-indigo-500/20'}`}
            >
              <Check size={20} strokeWidth={3} />
              <span>{transaction ? 'Salvar Alterações' : 'Confirmar e Salvar'}</span>
            </button>
          </div>

          {/* Modal de Confirmação de Exclusão */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm animate-fade-in p-6 text-center">
              <div>
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">Excluir Lançamento?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">Essa ação não pode ser desfeita.</p>
                <div className="flex space-x-3 justify-center">
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-3 text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl text-xs uppercase">Cancelar</button>
                  <button onClick={confirmDelete} className="px-6 py-3 text-white font-bold bg-rose-600 rounded-xl text-xs uppercase shadow-lg">Excluir</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL: VER TODAS AS CATEGORIAS             */}
      {/* ========================================== */}
      {showAllCategoriesModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-[80dvh] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl flex flex-col animate-slide-up border border-slate-200 dark:border-slate-800">
            
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">
                  {scope === 'BUSINESS' ? 'Categorias do Músico / Empresa' : 'Categorias Pessoais'} • {type === 'expense' ? 'Despesas' : 'Receitas'}
                </span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Selecione uma Categoria</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAllCategoriesModal(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Barra de Pesquisa de Categorias */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Pesquisar categoria..."
                value={categorySearchTerm}
                onChange={(e) => setCategorySearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Grid Scrollável de Categorias */}
            <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-2 gap-2.5 pr-1">
              {searchedCategories.map(cat => {
                const Icon = getIcon(cat.icon);
                const isSelected = categoryId === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      handleSelectCategory(cat.id);
                      setShowAllCategoriesModal(false);
                    }}
                    className={`p-3.5 rounded-2xl border-2 flex items-center space-x-3 transition-all text-left ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-white shadow-md font-extrabold' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}
                  >
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color || '#6366f1' }}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-bold truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CRIAR NOVO SHOW RÁPIDO              */}
      {/* ========================================== */}
      {showQuickCreateShowModal && (
        <div className="fixed inset-0 bg-slate-950/85 z-[130] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Music size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">Novo Show / Evento</h3>
                  <p className="text-[10px] text-slate-500 font-bold">Cadastre e vincule a esta receita</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQuickCreateShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {quickShowError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center space-x-2 animate-fade-in">
                <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                <span className="flex-1">{quickShowError}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuickShow} className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Nome do Contratante / Evento *
                </label>
                <input 
                  type="text"
                  value={quickShowContractor}
                  onChange={(e) => setQuickShowContractor(e.target.value)}
                  placeholder="Ex: Bar do Zé, Casamento Pedro & Ana"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1 flex items-center">
                    <Calendar size={11} className="mr-1 text-purple-500" /> Data *
                  </label>
                  <input 
                    type="date"
                    value={quickShowDate}
                    onChange={(e) => setQuickShowDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1 flex items-center">
                    <DollarSign size={11} className="mr-1 text-purple-500" /> Cachê Total (R$)
                  </label>
                  <input 
                    type="number"
                    step="any"
                    value={quickShowTotalCache}
                    onChange={(e) => setQuickShowTotalCache(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1 flex items-center">
                  <MapPin size={11} className="mr-1 text-purple-500" /> Local / Casa de Show
                </label>
                <input 
                  type="text"
                  value={quickShowLocation}
                  onChange={(e) => setQuickShowLocation(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCreateShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase shadow-md active:scale-95 transition"
                >
                  Criar e Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      <CalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        selectedDate={date} 
        onSelect={handleDateSelect} 
      />

      {/* Recurring Edit Modal */}
      {showRecurringEditModal && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in text-center">
            <div className="flex justify-center mb-4 text-indigo-600"><Layers size={48} /></div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Editar Recorrência</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">Este é um lançamento recorrente. Como deseja aplicar as mudanças?</p>
            <div className="space-y-2">
              <button onClick={() => handleConfirmRecurringUpdate(false)} className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl flex items-center space-x-3 text-left"><Copy size={18} className="text-slate-500" /><div><span className="block text-xs font-bold text-slate-800 dark:text-white">Apenas esta</span><span className="block text-[9px] text-slate-400 font-bold uppercase">Somente a atual</span></div></button>
              <button onClick={() => handleConfirmRecurringUpdate(true)} className="w-full py-3 px-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 hover:border-indigo-500 rounded-2xl flex items-center space-x-3 text-left"><Layers size={18} className="text-indigo-600" /><div><span className="block text-xs font-bold text-indigo-900 dark:text-indigo-100">Esta e futuras</span><span className="block text-[9px] text-indigo-400 font-bold uppercase">Daqui para frente</span></div></button>
              <button onClick={() => setShowRecurringEditModal(false)} className="w-full py-3 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest mt-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
