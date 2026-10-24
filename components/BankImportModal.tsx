import React, { useMemo, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  X,
  Search,
  Check,
  AlertCircle,
  RefreshCw,
  Landmark,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Filter,
  CalendarRange,
  Link2
} from 'lucide-react';
import {
  readBankFileAsText,
  parseBankStatement,
  detectDuplicates,
  suggestCategoryFromHistory,
  StagingBankTransaction,
  MatchConfidence
} from '../services/bankStatementParser';
import { getAccountVinculo } from '../services/financeAggregator';

interface BankImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAccountId?: string;
}

type StagingFilter =
  | 'all'
  | 'selected'
  | 'new'
  | 'duplicates'
  | 'possible'
  | 'income'
  | 'expense';

export const BankImportModal: React.FC<BankImportModalProps> = ({
  isOpen,
  onClose,
  defaultAccountId
}) => {
  const { accounts, categories, transactions, importTransactions, refreshData } = useFinance();

  const personalAccounts = useMemo(
    () =>
      accounts.filter(
        a =>
          a.enabled !== false &&
          getAccountVinculo(a) !== 'MUSICO' &&
          a.scope !== 'BUSINESS'
      ),
    [accounts]
  );

  const personalCategories = useMemo(
    () =>
      categories.filter(
        c =>
          (c.type === 'income' || c.type === 'expense' || c.type === 'transfer') &&
          c.scope !== 'BUSINESS' &&
          !String(c.id).startsWith('cat_logistica') &&
          c.id !== 'cat_equipamentos' &&
          c.id !== 'cat_producao_shows' &&
          c.id !== 'cat_marketing' &&
          c.id !== 'cat_prolabore_out' &&
          c.id !== 'cat_33'
      ),
    [categories]
  );

  const [step, setStep] = useState<'upload' | 'staging' | 'success'>('upload');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    if (defaultAccountId && personalAccounts.some(a => a.id === defaultAccountId)) {
      return defaultAccountId;
    }
    const bankAcc = personalAccounts.find(a => a.type === 'bank') || personalAccounts[0];
    return bankAcc ? bankAcc.id : '';
  });

  const [stagingList, setStagingList] = useState<StagingBankTransaction[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [stagingFilter, setStagingFilter] = useState<StagingFilter>('all');
  const [stagingSearch, setStagingSearch] = useState('');
  const [batchAccountId, setBatchAccountId] = useState('');
  const [batchCategoryId, setBatchCategoryId] = useState('');
  /** Importar a partir desta data (inclusive) */
  const [dateFrom, setDateFrom] = useState('');
  /** Até esta data (inclusive) */
  const [dateTo, setDateTo] = useState('');
  const [fileDateMin, setFileDateMin] = useState('');
  const [fileDateMax, setFileDateMax] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const enrichStaging = (
    staged: StagingBankTransaction[],
    accountId: string
  ): StagingBankTransaction[] =>
    staged.map(item => {
      const fromHistory = suggestCategoryFromHistory(
        item.description || item.originalDescription,
        item.type,
        transactions
      );
      const categoryId =
        fromHistory ||
        item.categoryId ||
        item.suggestedCategoryId ||
        (item.type === 'income' ? 'cat_7' : 'cat_1');

      return {
        ...item,
        accountId: item.accountId || accountId,
        categoryId,
        scope: 'PERSONAL',
        showId: undefined,
        suggestedScope: 'PERSONAL'
      };
    });

  const dateFilteredList = useMemo(() => {
    return stagingList.filter(item => {
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      return true;
    });
  }, [stagingList, dateFrom, dateTo]);

  const filteredStagingList = useMemo(() => {
    return dateFilteredList.filter(item => {
      if (stagingFilter === 'selected' && !item.selected) return false;
      if (stagingFilter === 'new' && item.matchConfidence && item.matchConfidence !== 'none') {
        return false;
      }
      if (
        stagingFilter === 'duplicates' &&
        !(item.matchConfidence === 'exact' || item.matchConfidence === 'likely')
      ) {
        return false;
      }
      if (stagingFilter === 'possible' && item.matchConfidence !== 'possible') return false;
      if (stagingFilter === 'income' && item.type !== 'income') return false;
      if (stagingFilter === 'expense' && item.type !== 'expense') return false;

      if (stagingSearch.trim()) {
        const q = stagingSearch
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const desc = (item.description || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const orig = (item.originalDescription || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const matched = (item.matchedAppDescription || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const amtStr = item.amount.toFixed(2);
        return (
          desc.includes(q) ||
          orig.includes(q) ||
          matched.includes(q) ||
          amtStr.includes(q) ||
          item.date.includes(q)
        );
      }
      return true;
    });
  }, [dateFilteredList, stagingFilter, stagingSearch]);

  const selectedItems = useMemo(
    () => dateFilteredList.filter(i => i.selected),
    [dateFilteredList]
  );
  const exactLikelyCount = useMemo(
    () =>
      dateFilteredList.filter(
        i => i.matchConfidence === 'exact' || i.matchConfidence === 'likely'
      ).length,
    [dateFilteredList]
  );
  const possibleCount = useMemo(
    () => dateFilteredList.filter(i => i.matchConfidence === 'possible').length,
    [dateFilteredList]
  );

  const stats = useMemo(() => {
    let incomeTotal = 0;
    let expenseTotal = 0;
    selectedItems.forEach(item => {
      if (item.type === 'income') incomeTotal += item.amount;
      else expenseTotal += item.amount;
    });
    return {
      incomeTotal,
      expenseTotal,
      netTotal: incomeTotal - expenseTotal
    };
  }, [selectedItems]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleFileProcess = async (file: File) => {
    setErrorMessage('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'ofx' && ext !== 'csv' && ext !== 'txt') {
      setErrorMessage('Selecione um arquivo .OFX ou .CSV válido.');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    try {
      const fileText = await readBankFileAsText(file);
      if (!fileText?.trim()) throw new Error('O arquivo está vazio.');

      const parsed = parseBankStatement(fileText, file.name, categories);
      if (parsed.length === 0) {
        throw new Error(
          'Nenhuma movimentação encontrada. Confira se o arquivo é OFX/CSV do banco.'
        );
      }

      let targetAccId = selectedAccountId;
      if (parsed[0]?.bankName) {
        const foundAcc = personalAccounts.find(a =>
          a.name.toLowerCase().includes(parsed[0].bankName!.toLowerCase())
        );
        if (foundAcc) {
          targetAccId = foundAcc.id;
          setSelectedAccountId(foundAcc.id);
        }
      }
      if (!targetAccId && personalAccounts.length > 0) {
        targetAccId = personalAccounts[0].id;
        setSelectedAccountId(targetAccId);
      }

      const dates = parsed.map(p => p.date).filter(Boolean).sort();
      const minD = dates[0] || '';
      const maxD = dates[dates.length - 1] || '';
      setFileDateMin(minD);
      setFileDateMax(maxD);
      setDateFrom(minD);
      setDateTo(maxD);

      const staged = enrichStaging(
        detectDuplicates(parsed, transactions, targetAccId),
        targetAccId
      );
      setStagingList(staged);
      setStagingFilter('all');
      setStagingSearch('');
      setStep('staging');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao processar o arquivo. Tente novamente.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileProcess(e.dataTransfer.files[0]);
  };

  const toggleSelectRow = (tempId: string) => {
    setStagingList(prev =>
      prev.map(item =>
        item.tempId === tempId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateRowField = <K extends keyof StagingBankTransaction>(
    tempId: string,
    field: K,
    value: StagingBankTransaction[K]
  ) => {
    setStagingList(prev =>
      prev.map(item => (item.tempId === tempId ? { ...item, [field]: value } : item))
    );
  };

  const removeRow = (tempId: string) => {
    setStagingList(prev => prev.filter(item => item.tempId !== tempId));
  };

  const toggleSelectAll = () => {
    const visibleIds = new Set(dateFilteredList.map(i => i.tempId));
    const allSelected =
      dateFilteredList.length > 0 && dateFilteredList.every(item => item.selected);
    setStagingList(prev =>
      prev.map(item =>
        visibleIds.has(item.tempId) ? { ...item, selected: !allSelected } : item
      )
    );
  };

  const selectOnlyNew = () => {
    setStagingList(prev =>
      prev.map(item => ({
        ...item,
        selected:
          item.matchConfidence !== 'exact' && item.matchConfidence !== 'likely'
      }))
    );
  };

  const deselectMatches = () => {
    setStagingList(prev =>
      prev.map(item =>
        item.matchConfidence && item.matchConfidence !== 'none'
          ? { ...item, selected: false }
          : item
      )
    );
  };

  const useAppName = (tempId: string) => {
    setStagingList(prev =>
      prev.map(item =>
        item.tempId === tempId && item.matchedAppDescription
          ? { ...item, description: item.matchedAppDescription }
          : item
      )
    );
  };

  const applyDateRangeToSelection = () => {
    // Desmarca o que está fora do período; mantém seleção dos que estão dentro (exceto exact/likely)
    setStagingList(prev =>
      prev.map(item => {
        const inRange =
          (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo);
        if (!inRange) return { ...item, selected: false };
        if (item.matchConfidence === 'exact' || item.matchConfidence === 'likely') {
          return { ...item, selected: false };
        }
        return { ...item, selected: true };
      })
    );
  };

  const applyBatchAccount = (accId: string) => {
    if (!accId) return;
    setStagingList(prev =>
      prev.map(item => (item.selected ? { ...item, accountId: accId } : item))
    );
    setBatchAccountId(accId);
  };

  const applyBatchCategory = (catId: string) => {
    if (!catId) return;
    setStagingList(prev =>
      prev.map(item => (item.selected ? { ...item, categoryId: catId } : item))
    );
    setBatchCategoryId(catId);
  };

  const handleConfirmImport = () => {
    if (selectedItems.length === 0) {
      setErrorMessage('Selecione pelo menos um lançamento para importar.');
      return;
    }

    const txsToSave = selectedItems.map(item => ({
      date: item.date,
      amount: item.amount,
      type: item.type,
      categoryId:
        item.categoryId || (item.type === 'income' ? 'cat_7' : 'cat_1'),
      description:
        item.description.trim() ||
        item.originalDescription ||
        'Lançamento Bancário',
      status: 'paid' as const,
      accountId:
        item.accountId ||
        selectedAccountId ||
        (personalAccounts[0] ? personalAccounts[0].id : 'acc_bank'),
      scope: 'PERSONAL' as const,
      importedFromBank: true,
      originalBankDescription: item.originalDescription,
      bankFitId: item.fitId
    }));

    importTransactions(txsToSave);
    setImportedCount(txsToSave.length);
    setErrorMessage('');
    setStep('success');
    refreshData();
  };

  const handleReset = () => {
    setStagingList([]);
    setFileName('');
    setFileSize('');
    setErrorMessage('');
    setStep('upload');
  };

  if (!isOpen) return null;

  const stepIndex = step === 'upload' ? 1 : step === 'staging' ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-[#003882] text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#fcca00] text-[#003882] flex items-center justify-center shrink-0">
              <UploadCloud size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                Conciliação pessoal · passo {stepIndex} de 3
              </p>
              <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                Importar extrato bancário
              </h2>
              {step === 'staging' && fileName && (
                <p className="text-[10px] text-blue-100/90 truncate">
                  {fileName} · {fileSize}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 transition"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {[
            { n: 1, label: 'Arquivo' },
            { n: 2, label: 'Revisar' },
            { n: 3, label: 'Pronto' }
          ].map(s => (
            <React.Fragment key={s.n}>
              <span
                className={`inline-flex items-center gap-1 ${
                  stepIndex >= s.n ? 'text-[#003882]' : ''
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    stepIndex >= s.n
                      ? 'bg-[#003882] text-[#fcca00]'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {stepIndex > s.n ? <Check size={11} strokeWidth={3} /> : s.n}
                </span>
                {s.label}
              </span>
              {s.n < 3 && <span className="text-slate-300">—</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5 max-w-xl mx-auto py-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Landmark size={12} className="text-[#003882]" />
                    Conta de destino
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Os lançamentos entram nesta conta (só contas pessoais)
                  </p>
                </div>
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:border-[#003882] min-w-[180px]"
                >
                  {personalAccounts.length === 0 ? (
                    <option value="">Nenhuma conta pessoal</option>
                  ) : (
                    personalAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center gap-3 ${
                  isDragging
                    ? 'border-[#003882] bg-blue-50 scale-[1.01]'
                    : 'border-slate-300 hover:border-[#003882]/60 bg-slate-50/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx,.csv,.txt"
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      const f = e.target.files[0];
                      e.target.value = '';
                      handleFileProcess(f);
                    }
                  }}
                  onClick={e => e.stopPropagation()}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-[#003882]/10 text-[#003882] flex items-center justify-center">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Arraste o OFX/CSV ou toque para escolher
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Nubank, Inter, BB, Itaú, Bradesco, Santander, C6… OFX costuma ser o
                    mais preciso.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                    .OFX recomendado
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-sky-100 text-sky-800">
                    .CSV ok
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs font-bold">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-[#fcca00]/15 border border-[#fcca00]/40 text-[11px] text-slate-700 leading-relaxed space-y-1">
                <p className="font-black text-blue-950 flex items-center gap-1">
                  <Sparkles size={12} /> Como funciona
                </p>
                <p>
                  1) Conta · 2) Arquivo · 3) Escolha as datas · 4) O app limpa o nome do
                  banco (Pix/TED…) e avisa o que já parece cadastrado — mesmo com nome
                  diferente · 5) Confirme só o que falta.
                </p>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-3 text-[#003882] text-xs font-bold">
                  <RefreshCw size={16} className="animate-spin" />
                  Lendo extrato e sugerindo categorias…
                </div>
              )}
            </div>
          )}

          {/* STAGING */}
          {step === 'staging' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatCard label="No período" value={String(dateFilteredList.length)} />
                <StatCard
                  label="A importar"
                  value={`${selectedItems.length}`}
                  accent="blue"
                />
                <StatCard
                  label="Entradas"
                  value={formatCurrency(stats.incomeTotal)}
                  accent="green"
                  icon={<ArrowUpRight size={12} />}
                />
                <StatCard
                  label="Saídas"
                  value={formatCurrency(stats.expenseTotal)}
                  accent="rose"
                  icon={<ArrowDownRight size={12} />}
                />
              </div>

              {/* Filtro por data */}
              <div className="p-3.5 rounded-2xl border border-[#003882]/15 bg-[#003882]/5 space-y-2.5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#003882]">
                  <CalendarRange size={13} />
                  Importar a partir de qual período?
                </div>
                <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                  <label className="flex-1 text-[10px] font-bold text-slate-600 space-y-1">
                    <span>De</span>
                    <input
                      type="date"
                      value={dateFrom}
                      min={fileDateMin || undefined}
                      max={dateTo || fileDateMax || undefined}
                      onChange={e => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-[#003882]"
                    />
                  </label>
                  <label className="flex-1 text-[10px] font-bold text-slate-600 space-y-1">
                    <span>Até</span>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || fileDateMin || undefined}
                      max={fileDateMax || undefined}
                      onChange={e => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 outline-none focus:border-[#003882]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={applyDateRangeToSelection}
                    className="px-3 py-2 rounded-xl bg-[#003882] text-[#fcca00] text-[10px] font-black uppercase tracking-wide shrink-0"
                  >
                    Aplicar no período
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Arquivo: {fileDateMin || '—'} → {fileDateMax || '—'}. O que ficar fora das
                  datas some da lista abaixo. “Aplicar” marca só o período e tira o que já
                  parece cadastrado.
                </p>
              </div>

              {(exactLikelyCount > 0 || possibleCount > 0) && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      {exactLikelyCount > 0 && (
                        <>
                          <strong>{exactLikelyCount}</strong> bem parecido
                          {exactLikelyCount === 1 ? '' : 's'} com o que já está no app
                          (desmarcado{exactLikelyCount === 1 ? '' : 's'}).
                        </>
                      )}
                      {exactLikelyCount > 0 && possibleCount > 0 ? ' ' : ''}
                      {possibleCount > 0 && (
                        <>
                          <strong>{possibleCount}</strong> com o mesmo valor em data
                          próxima — confira o aviso em cada linha.
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setStagingFilter('duplicates')}
                      className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-white border border-amber-200"
                    >
                      Já no app
                    </button>
                    {possibleCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setStagingFilter('possible')}
                        className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-white border border-amber-200"
                      >
                        Conferir
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={selectOnlyNew}
                      className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-[#003882] text-[#fcca00]"
                    >
                      Só novos
                    </button>
                    <button
                      type="button"
                      onClick={deselectMatches}
                      className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-white border border-amber-200"
                    >
                      Tirar suspeitos
                    </button>
                  </div>
                </div>
              )}

              {/* Batch */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700"
                  >
                    {dateFilteredList.length > 0 &&
                    dateFilteredList.every(i => i.selected)
                      ? 'Desmarcar todos'
                      : 'Selecionar todos'}
                  </button>
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <Filter size={11} /> Aplicar nos marcados:
                  </span>
                  <select
                    value={batchAccountId}
                    onChange={e => applyBatchAccount(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold outline-none"
                  >
                    <option value="">Conta…</option>
                    {personalAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={batchCategoryId}
                    onChange={e => applyBatchCategory(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold outline-none max-w-[160px]"
                  >
                    <option value="">Categoria…</option>
                    {personalCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between pt-2 border-t border-slate-200/80">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {(
                      [
                        { id: 'all', label: `Período (${dateFilteredList.length})` },
                        { id: 'new', label: 'Só novos' },
                        {
                          id: 'selected',
                          label: `Marcados (${selectedItems.length})`
                        },
                        {
                          id: 'duplicates',
                          label: `Já no app (${exactLikelyCount})`
                        },
                        {
                          id: 'possible',
                          label: `Conferir (${possibleCount})`
                        },
                        { id: 'income', label: 'Entradas' },
                        { id: 'expense', label: 'Saídas' }
                      ] as { id: StagingFilter; label: string }[]
                    ).map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setStagingFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap transition ${
                          stagingFilter === f.id
                            ? 'bg-[#003882] text-[#fcca00]'
                            : 'text-slate-500 hover:bg-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-52">
                    <Search
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      size={13}
                    />
                    <input
                      type="text"
                      placeholder="Buscar…"
                      value={stagingSearch}
                      onChange={e => setStagingSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#003882]"
                    />
                  </div>
                </div>
              </div>

              {/* Lista — cards no mobile, tabela no desktop */}
              <div className="space-y-2 md:hidden">
                {filteredStagingList.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">
                    Nenhum item com esses filtros.
                  </p>
                ) : (
                  filteredStagingList.map(item => (
                    <MobileStagingCard
                      key={item.tempId}
                      item={item}
                      accounts={personalAccounts}
                      categories={personalCategories}
                      formatCurrency={formatCurrency}
                      onToggle={() => toggleSelectRow(item.tempId)}
                      onChange={updateRowField}
                      onRemove={() => removeRow(item.tempId)}
                      onUseAppName={() => useAppName(item.tempId)}
                    />
                  ))
                )}
              </div>

              <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-[46vh]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              dateFilteredList.length > 0 &&
                              dateFilteredList.every(i => i.selected)
                            }
                            onChange={toggleSelectAll}
                            className="rounded text-[#003882] cursor-pointer"
                          />
                        </th>
                        <th className="p-3 w-28">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3 w-44">Categoria</th>
                        <th className="p-3 w-36">Conta</th>
                        <th className="p-3 w-28 text-right">Valor</th>
                        <th className="p-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs bg-white">
                      {filteredStagingList.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-8 text-center text-slate-500"
                          >
                            Nenhum item com esses filtros.
                          </td>
                        </tr>
                      ) : (
                        filteredStagingList.map(item => {
                          const isIncome = item.type === 'income';
                          return (
                            <tr
                              key={item.tempId}
                              className={`transition-colors ${
                                item.selected
                                  ? 'bg-blue-50/40'
                                  : 'opacity-55 hover:opacity-100'
                              } ${
                                item.matchConfidence && item.matchConfidence !== 'none'
                                  ? 'border-l-4 border-l-amber-400'
                                  : ''
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleSelectRow(item.tempId)}
                                  className="rounded text-[#003882] cursor-pointer"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="date"
                                  value={item.date}
                                  onChange={e =>
                                    updateRowField(item.tempId, 'date', e.target.value)
                                  }
                                  className="bg-transparent border border-transparent hover:border-slate-200 focus:border-[#003882] rounded px-1 py-0.5 text-xs outline-none w-full"
                                />
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={e =>
                                    updateRowField(
                                      item.tempId,
                                      'description',
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-[#003882] rounded px-1 py-0.5 font-bold text-slate-900 outline-none"
                                />
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 px-1 text-[10px] text-slate-500">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-black uppercase ${
                                      isIncome
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {isIncome ? 'Entrada' : 'Saída'}
                                  </span>
                                  <MatchBadge confidence={item.matchConfidence} />
                                  <span
                                    className="truncate max-w-[200px] text-slate-400"
                                    title={item.originalDescription}
                                  >
                                    Banco: {item.originalDescription}
                                  </span>
                                </div>
                                {item.duplicateReason && (
                                  <MatchHint
                                    reason={item.duplicateReason}
                                    canUseAppName={Boolean(item.matchedAppDescription)}
                                    onUseAppName={() => useAppName(item.tempId)}
                                  />
                                )}
                              </td>
                              <td className="p-3">
                                <select
                                  value={item.categoryId}
                                  onChange={e =>
                                    updateRowField(
                                      item.tempId,
                                      'categoryId',
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium outline-none focus:border-[#003882]"
                                >
                                  {personalCategories
                                    .filter(
                                      c =>
                                        c.type === item.type ||
                                        c.type === 'transfer' ||
                                        (item.type === 'income' && c.type === 'income') ||
                                        (item.type === 'expense' && c.type === 'expense')
                                    )
                                    .concat(
                                      personalCategories.filter(
                                        c =>
                                          c.id === item.categoryId &&
                                          c.type !== item.type &&
                                          c.type !== 'transfer'
                                      )
                                    )
                                    .filter(
                                      (c, i, arr) =>
                                        arr.findIndex(x => x.id === c.id) === i
                                    )
                                    .map(cat => (
                                      <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                      </option>
                                    ))}
                                </select>
                              </td>
                              <td className="p-3">
                                <select
                                  value={item.accountId}
                                  onChange={e =>
                                    updateRowField(
                                      item.tempId,
                                      'accountId',
                                      e.target.value
                                    )
                                  }
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium outline-none focus:border-[#003882]"
                                >
                                  {personalAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                      {acc.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td
                                className={`p-3 text-right font-black tabular-nums ${
                                  isIncome ? 'text-emerald-700' : 'text-rose-600'
                                }`}
                              >
                                {isIncome ? '+' : '-'}
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeRow(item.tempId)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  title="Remover do lote"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {errorMessage}
                </div>
              )}
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="py-10 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Extrato importado</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  <strong>{importedCount}</strong> lançamento
                  {importedCount === 1 ? '' : 's'} pessoal
                  {importedCount === 1 ? '' : 'is'} no seu extrato.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider"
                >
                  Outro arquivo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl bg-[#003882] text-[#fcca00] font-black text-xs uppercase tracking-wider"
                >
                  Ver extrato
                </button>
              </div>
            </div>
          )}
        </div>

        {step === 'staging' && (
          <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 bg-slate-50/80">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-white"
            >
              Novo arquivo
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedItems.length === 0}
              className="px-5 py-3 rounded-2xl bg-[#003882] text-[#fcca00] font-black text-xs uppercase tracking-wider shadow-md active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Check size={15} strokeWidth={3} />
              Importar {selectedItems.length} lançamento
              {selectedItems.length === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  accent?: 'blue' | 'green' | 'rose';
  icon?: React.ReactNode;
}> = ({ label, value, accent, icon }) => {
  const box =
    accent === 'blue'
      ? 'bg-blue-50 border-blue-100'
      : accent === 'green'
        ? 'bg-emerald-50 border-emerald-100'
        : accent === 'rose'
          ? 'bg-rose-50 border-rose-100'
          : 'bg-slate-50 border-slate-200';
  const text =
    accent === 'blue'
      ? 'text-[#003882]'
      : accent === 'green'
        ? 'text-emerald-700'
        : accent === 'rose'
          ? 'text-rose-700'
          : 'text-slate-900';
  return (
    <div className={`p-3 rounded-2xl border ${box}`}>
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <p className={`text-sm font-black mt-0.5 tabular-nums truncate ${text}`}>{value}</p>
    </div>
  );
};

const MatchBadge: React.FC<{ confidence?: MatchConfidence }> = ({ confidence }) => {
  if (!confidence || confidence === 'none') return null;
  const map = {
    exact: { label: 'Já no app', className: 'bg-rose-100 text-rose-800' },
    likely: { label: 'Provável igual', className: 'bg-amber-100 text-amber-900' },
    possible: { label: 'Conferir valor', className: 'bg-sky-100 text-sky-800' }
  } as const;
  const m = map[confidence];
  return (
    <span className={`px-1.5 py-0.5 rounded font-black uppercase ${m.className}`}>
      {m.label}
    </span>
  );
};

const MatchHint: React.FC<{
  reason: string;
  canUseAppName?: boolean;
  onUseAppName?: () => void;
}> = ({ reason, canUseAppName, onUseAppName }) => (
  <div className="mt-1.5 p-2 rounded-xl bg-amber-50/90 border border-amber-100 text-[10px] text-amber-950 leading-snug space-y-1">
    <p className="flex items-start gap-1">
      <Link2 size={11} className="shrink-0 mt-0.5 text-amber-600" />
      <span>{reason}</span>
    </p>
    {canUseAppName && onUseAppName && (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onUseAppName();
        }}
        className="text-[9px] font-black uppercase text-[#003882] hover:underline"
      >
        Usar o nome que já está no app
      </button>
    )}
  </div>
);

const MobileStagingCard: React.FC<{
  item: StagingBankTransaction;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; type: string }[];
  formatCurrency: (v: number) => string;
  onToggle: () => void;
  onChange: <K extends keyof StagingBankTransaction>(
    tempId: string,
    field: K,
    value: StagingBankTransaction[K]
  ) => void;
  onRemove: () => void;
  onUseAppName?: () => void;
}> = ({
  item,
  accounts,
  categories,
  formatCurrency,
  onToggle,
  onChange,
  onRemove,
  onUseAppName
}) => {
  const isIncome = item.type === 'income';
  const cats = categories.filter(
    c => c.type === item.type || c.type === 'transfer' || c.id === item.categoryId
  );

  return (
    <div
      className={`rounded-2xl border p-3 space-y-2.5 ${
        item.selected ? 'border-[#003882]/30 bg-blue-50/30' : 'border-slate-200 opacity-70'
      } ${
        item.matchConfidence && item.matchConfidence !== 'none'
          ? 'border-l-4 border-l-amber-400'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-start gap-2 min-w-0 cursor-pointer">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={onToggle}
            className="mt-1 rounded text-[#003882]"
          />
          <div className="min-w-0">
            <input
              type="text"
              value={item.description}
              onChange={e => onChange(item.tempId, 'description', e.target.value)}
              className="w-full bg-transparent font-bold text-xs text-slate-900 outline-none"
            />
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              <MatchBadge confidence={item.matchConfidence} />
              <p className="text-[10px] text-slate-400 truncate">
                Banco: {item.originalDescription}
              </p>
            </div>
          </div>
        </label>
        <span
          className={`shrink-0 text-xs font-black tabular-nums ${
            isIncome ? 'text-emerald-700' : 'text-rose-600'
          }`}
        >
          {isIncome ? '+' : '-'}
          {formatCurrency(item.amount)}
        </span>
      </div>
      {item.duplicateReason && (
        <MatchHint
          reason={item.duplicateReason}
          canUseAppName={Boolean(item.matchedAppDescription)}
          onUseAppName={onUseAppName}
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={item.date}
          onChange={e => onChange(item.tempId, 'date', e.target.value)}
          className="px-2 py-1.5 rounded-xl border border-slate-200 text-[11px] bg-white"
        />
        <select
          value={item.accountId}
          onChange={e => onChange(item.tempId, 'accountId', e.target.value)}
          className="px-2 py-1.5 rounded-xl border border-slate-200 text-[11px] bg-white font-medium"
        >
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={item.categoryId}
          onChange={e => onChange(item.tempId, 'categoryId', e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-xl border border-slate-200 text-[11px] bg-white font-medium"
        >
          {cats.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
