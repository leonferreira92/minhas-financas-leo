import React, { useState, useRef, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  UploadCloud, FileText, CheckCircle2, AlertTriangle, 
  Trash2, X, ArrowUpRight, ArrowDownLeft, Filter, 
  Building2, User, Music, Search, Check, AlertCircle, RefreshCw, Plus, Calendar, MapPin
} from 'lucide-react';
import { 
  readBankFileAsText, 
  parseBankStatement, 
  detectDuplicates, 
  StagingBankTransaction 
} from '../services/bankStatementParser';
import { ScopeType } from '../types';
import { generateUUID } from '../services/uuidHelper';

interface BankImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAccountId?: string;
}

export const BankImportModal: React.FC<BankImportModalProps> = ({
  isOpen,
  onClose,
  defaultAccountId
}) => {
  const { accounts, categories, transactions, shows, addShow, importTransactions, refreshData } = useFinance();

  const [step, setStep] = useState<'upload' | 'staging' | 'success'>('upload');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Conta padrão selecionada
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    if (defaultAccountId && accounts.some(a => a.id === defaultAccountId)) return defaultAccountId;
    const bankAcc = accounts.find(a => a.type === 'bank') || accounts[0];
    return bankAcc ? bankAcc.id : '';
  });

  // Staging transactions
  const [stagingList, setStagingList] = useState<StagingBankTransaction[]>([]);
  const [importedCount, setImportedCount] = useState(0);

  // Staging filters & search
  const [stagingFilter, setStagingFilter] = useState<'all' | 'selected' | 'duplicates' | 'income' | 'expense'>('all');
  const [stagingSearch, setStagingSearch] = useState('');

  // Batch action states
  const [batchScope, setBatchScope] = useState<ScopeType | ''>('');
  const [batchAccountId, setBatchAccountId] = useState<string>('');
  const [batchCategoryId, setBatchCategoryId] = useState<string>('');
  const [batchShowId, setBatchShowId] = useState<string>('');

  // Quick Show creation modal state
  const [quickShowTargetItem, setQuickShowTargetItem] = useState<StagingBankTransaction | null>(null);
  const [quickShowContractor, setQuickShowContractor] = useState('');
  const [quickShowDate, setQuickShowDate] = useState('');
  const [quickShowTotalCache, setQuickShowTotalCache] = useState('');
  const [quickShowLocation, setQuickShowLocation] = useState('');
  const [quickShowCity, setQuickShowCity] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shows disponíveis para vínculo (Agendados, Confirmados ou Realizados)
  const availableShows = useMemo(() => {
    return shows.filter(s => s.status !== 'Cancelado');
  }, [shows]);

  // Filtragem da lista para exibição (Hook posicionado no topo absoluto)
  const filteredStagingList = useMemo(() => {
    return stagingList.filter(item => {
      // Filtro de aba
      if (stagingFilter === 'selected' && !item.selected) return false;
      if (stagingFilter === 'duplicates' && !item.isDuplicate) return false;
      if (stagingFilter === 'income' && item.type !== 'income') return false;
      if (stagingFilter === 'expense' && item.type !== 'expense') return false;

      // Filtro de busca textual
      if (stagingSearch.trim()) {
        const q = stagingSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const desc = item.description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const orig = item.originalDescription.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const amtStr = item.amount.toFixed(2);
        return desc.includes(q) || orig.includes(q) || amtStr.includes(q) || item.date.includes(q);
      }

      return true;
    });
  }, [stagingList, stagingFilter, stagingSearch]);

  // Totais e estatísticas dos itens selecionados (Hooks no topo absoluto)
  const selectedItems = useMemo(() => stagingList.filter(i => i.selected), [stagingList]);
  const duplicateCount = useMemo(() => stagingList.filter(i => i.isDuplicate).length, [stagingList]);
  
  const stats = useMemo(() => {
    let incomeTotal = 0;
    let incomeCount = 0;
    let expenseTotal = 0;
    let expenseCount = 0;

    selectedItems.forEach(item => {
      if (item.type === 'income') {
        incomeTotal += item.amount;
        incomeCount++;
      } else {
        expenseTotal += item.amount;
        expenseCount++;
      }
    });

    return {
      incomeTotal,
      incomeCount,
      expenseTotal,
      expenseCount,
      netTotal: incomeTotal - expenseTotal
    };
  }, [selectedItems]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Processamento do arquivo enviado
  const handleFileProcess = async (file: File) => {
    setErrorMessage('');
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'ofx' && ext !== 'csv' && ext !== 'txt') {
      setErrorMessage('Por favor, selecione um arquivo no formato .OFX ou .CSV válido.');
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    try {
      const fileText = await readBankFileAsText(file);
      if (!fileText || !fileText.trim()) {
        throw new Error('O arquivo selecionado está vazio.');
      }

      const parsed = parseBankStatement(fileText, file.name, categories);
      if (parsed.length === 0) {
        throw new Error('Nenhuma transação foi identificada no arquivo. Verifique se o formato é OFX ou CSV bancário compatível.');
      }

      // Detecção de banco / conta se o OFX trouxer nome
      let targetAccId = selectedAccountId;
      if (parsed[0]?.bankName) {
        const foundAcc = accounts.find(a => a.name.toLowerCase().includes(parsed[0].bankName!.toLowerCase()));
        if (foundAcc) targetAccId = foundAcc.id;
      }
      if (!targetAccId && accounts.length > 0) {
        targetAccId = accounts[0].id;
        setSelectedAccountId(targetAccId);
      }

      // Prevenção de duplicidades
      const staged = detectDuplicates(parsed, transactions, targetAccId);
      setStagingList(staged);
      setStep('staging');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar o arquivo. Verifique o formato e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      handleFileProcess(file);
    }
  };

  // Funções de manipulação individual na Staging Area
  const toggleSelectRow = (tempId: string) => {
    setStagingList(prev => prev.map(item => item.tempId === tempId ? { ...item, selected: !item.selected } : item));
  };

  const updateRowField = <K extends keyof StagingBankTransaction>(
    tempId: string, 
    field: K, 
    value: StagingBankTransaction[K]
  ) => {
    setStagingList(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      return { ...item, [field]: value };
    }));
  };

  const removeRow = (tempId: string) => {
    setStagingList(prev => prev.filter(item => item.tempId !== tempId));
  };

  // Funções em Lote (Batch)
  const toggleSelectAll = () => {
    const allSelected = stagingList.every(item => item.selected);
    setStagingList(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  const applyBatchScope = (scope: ScopeType) => {
    setStagingList(prev => prev.map(item => item.selected ? { ...item, scope } : item));
    setBatchScope(scope);
  };

  const applyBatchAccount = (accId: string) => {
    if (!accId) return;
    setStagingList(prev => prev.map(item => item.selected ? { ...item, accountId: accId } : item));
    setBatchAccountId(accId);
  };

  const applyBatchCategory = (catId: string) => {
    if (!catId) return;
    setStagingList(prev => prev.map(item => item.selected ? { ...item, categoryId: catId } : item));
    setBatchCategoryId(catId);
  };

  const applyBatchShow = (showId: string) => {
    setStagingList(prev => prev.map(item => {
      if (!item.selected || item.type !== 'income') return item;
      return { 
        ...item, 
        showId: showId || undefined, 
        scope: showId ? 'BUSINESS' : item.scope,
        categoryId: showId ? 'cat_33' : item.categoryId
      };
    }));
    setBatchShowId(showId);
  };

  // Abertura do formulário de criação rápida de show
  const openQuickShowModal = (item: StagingBankTransaction) => {
    setQuickShowTargetItem(item);
    const cleanName = item.description.replace(/^pix\s*(enviado|recebido)\s*/i, '').trim() || 'Show / Evento';
    setQuickShowContractor(cleanName);
    setQuickShowDate(item.date);
    setQuickShowTotalCache(item.amount.toString());
    setQuickShowLocation('');
    setQuickShowCity('');
  };

  const handleSaveQuickShow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickShowTargetItem || !quickShowContractor.trim()) return;

    const newShowId = generateUUID();
    const cacheAmount = parseFloat(quickShowTotalCache.replace(',', '.')) || quickShowTargetItem.amount;

    addShow({
      id: newShowId,
      name: quickShowContractor.trim(),
      contractorName: quickShowContractor.trim(),
      date: quickShowDate || quickShowTargetItem.date,
      time: '20:00',
      totalCache: cacheAmount,
      location: quickShowLocation.trim() || 'A definir',
      city: quickShowCity.trim() || '',
      status: 'Confirmado',
      scope: 'BUSINESS'
    });

    // Atualiza imediatamente o item de staging para vincular a este novo show
    updateRowField(quickShowTargetItem.tempId, 'showId', newShowId);
    updateRowField(quickShowTargetItem.tempId, 'scope', 'BUSINESS');
    updateRowField(quickShowTargetItem.tempId, 'categoryId', 'cat_33');

    setQuickShowTargetItem(null);
  };

  // Confirmação final da importação
  const handleConfirmImport = () => {
    if (selectedItems.length === 0) {
      alert('Selecione pelo menos um lançamento para importar.');
      return;
    }

    const txsToSave = selectedItems.map(item => ({
      date: item.date,
      amount: item.amount,
      type: item.type,
      categoryId: item.showId ? 'cat_33' : (item.categoryId || (item.type === 'income' ? 'cat_6' : 'cat_7')),
      description: item.description.trim() || item.originalDescription || 'Lançamento Bancário',
      status: 'paid' as const,
      accountId: item.accountId || selectedAccountId || (accounts[0] ? accounts[0].id : 'acc_bank'),
      scope: item.showId ? 'BUSINESS' : (item.scope || 'PERSONAL'),
      showId: item.showId,
      importedFromBank: true,
      originalBankDescription: item.originalDescription,
      bankFitId: item.fitId
    }));

    importTransactions(txsToSave);
    setImportedCount(txsToSave.length);
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

  // Verificação condicional de exibição feita APENAS NO FINAL, após a execução de todos os Hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in max-w-full overflow-x-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <UploadCloud size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                  Conciliação Inteligente & Vínculo com Shows
                </span>
                {step === 'staging' && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {fileName} ({fileSize})
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Importação de Extrato Bancário (.OFX / .CSV)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* PASSO 1: UPLOAD DRAG & DROP */}
          {step === 'upload' && (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              
              {/* Seleção de Conta Bancária Padrão */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    Conta Bancária de Destino
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Selecione qual conta receberá os lançamentos por padrão
                  </p>
                </div>

                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 shadow-xs"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type === 'bank' ? 'Banco' : 'Carteira'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Área de Drag & Drop */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx,.csv,.txt"
                  onChange={handleInputChange}
                  onClick={(e) => e.stopPropagation()}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                  <UploadCloud size={32} strokeWidth={2} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                    Arraste e solte seu arquivo .OFX ou .CSV aqui
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    Ou clique neste quadro para selecionar no seu dispositivo. Compatível com Nubank, Itaú, Banco do Brasil, Bradesco, Santander, Inter, C6 e outros.
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    Formato .OFX (Recomendado)
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                    Formato .CSV
                  </span>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center space-x-3 text-rose-700 dark:text-rose-300 text-xs font-bold animate-shake">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Guia Rápido dos Bancos */}
              <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  💡 Dica para exportar seu extrato bancário
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  No Internet Banking ou App do seu banco, acesse a opção <strong>Extrato</strong>, selecione o período desejado e clique em <strong>Exportar / Salvar</strong> escolhendo a opção <strong>OFX</strong> (Money/Financeiro) ou <strong>CSV</strong> (Excel). O arquivo OFX é o mais preciso, pois preserva datas, IDs e descrições exatas do Pix.
                </p>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center space-x-2 py-4 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Lendo e analisando extrato...</span>
                </div>
              )}
            </div>
          )}

          {/* PASSO 2: STAGING AREA (PRÉ-VISUALIZAÇÃO, EDIÇÃO EM LOTE E CONCILIAÇÃO) */}
          {step === 'staging' && (
            <div className="space-y-4">
              
              {/* BARRA DE AVISOS E ESTATÍSTICAS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Itens no Arquivo</span>
                  <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {stagingList.length} <span className="text-[10px] font-medium text-slate-500">encontrados</span>
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">Selecionados p/ Importar</span>
                  <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {selectedItems.length} <span className="text-[10px] font-medium opacity-80">de {stagingList.length}</span>
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Total Entradas</span>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                    {formatCurrency(stats.incomeTotal)}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Total Saídas</span>
                  <p className="text-base font-black text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                    {formatCurrency(stats.expenseTotal)}
                  </p>
                </div>
              </div>

              {/* AVISO DE DUPLICATAS DETECTADAS */}
              {duplicateCount > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      <strong>{duplicateCount} {duplicateCount === 1 ? 'duplicata identificada' : 'duplicatas identificadas'}</strong> já existentes no seu extrato foram desmarcadas automaticamente para evitar repetição.
                    </span>
                  </div>
                  <button
                    onClick={() => setStagingFilter('duplicates')}
                    className="text-[10px] font-black uppercase tracking-wider underline hover:text-amber-950 dark:hover:text-white shrink-0 ml-2"
                  >
                    Ver Duplicatas
                  </button>
                </div>
              )}

              {/* BARRA DE AÇÕES EM LOTE */}
              <div className="p-3.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={toggleSelectAll}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition shadow-xs"
                    >
                      {stagingList.every(i => i.selected) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({selectedItems.length} selecionados)
                    </span>
                  </div>

                  {/* Ações em lote aplicáveis aos selecionados */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                      Aplicar nos Marcados:
                    </span>

                    {/* Módulo em Lote */}
                    <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => applyBatchScope('PERSONAL')}
                        className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 flex items-center space-x-1 transition"
                        title="Definir Módulo Pessoal para os itens selecionados"
                      >
                        <User size={11} />
                        <span>Pessoal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyBatchScope('BUSINESS')}
                        className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-600 flex items-center space-x-1 transition"
                        title="Definir Módulo Músico / Empresa para os itens selecionados"
                      >
                        <Music size={11} />
                        <span>Músico</span>
                      </button>
                    </div>

                    {/* Conta Bancária em Lote */}
                    <select
                      value={batchAccountId}
                      onChange={(e) => applyBatchAccount(e.target.value)}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none shadow-xs"
                      title="Definir Conta Bancária para os itens selecionados"
                    >
                      <option value="">Definir Conta...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>

                    {/* Categoria em Lote */}
                    <select
                      value={batchCategoryId}
                      onChange={(e) => applyBatchCategory(e.target.value)}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none shadow-xs max-w-[130px] truncate"
                      title="Definir Categoria para os itens selecionados"
                    >
                      <option value="">Definir Categoria...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>

                    {/* Vincular Show em Lote */}
                    <select
                      value={batchShowId}
                      onChange={(e) => applyBatchShow(e.target.value)}
                      className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[11px] font-bold text-purple-900 dark:text-purple-200 outline-none shadow-xs max-w-[140px] truncate"
                      title="Vincular Show em lote para receitas marcadas"
                    >
                      <option value="">Vincular Show...</option>
                      {availableShows.map(s => (
                        <option key={s.id} value={s.id}>
                          🎤 {s.contractorName || s.name} ({s.date ? s.date.slice(5) : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filtros da Visualização e Busca */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'all', label: `Todos (${stagingList.length})` },
                      { id: 'selected', label: `Selecionados (${selectedItems.length})` },
                      { id: 'income', label: `Entradas (${stagingList.filter(i => i.type === 'income').length})` },
                      { id: 'expense', label: `Saídas (${stagingList.filter(i => i.type === 'expense').length})` },
                      { id: 'duplicates', label: `Duplicatas (${duplicateCount})` }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setStagingFilter(f.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition ${
                          stagingFilter === f.id
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="Filtrar por texto ou valor..."
                      value={stagingSearch}
                      onChange={(e) => setStagingSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* TABELA DE PRÉ-VISUALIZAÇÃO / STAGING */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[46vh]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/80 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={stagingList.length > 0 && stagingList.every(i => i.selected)}
                            onChange={() => toggleSelectAll()}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-3 w-28">Data</th>
                        <th className="p-3">Descrição / Lançamento</th>
                        <th className="p-3 w-40">Categoria</th>
                        <th className="p-3 w-32">Módulo</th>
                        <th className="p-3 w-32">Conta</th>
                        <th className="p-3 w-28 text-right">Valor</th>
                        <th className="p-3 w-10 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-medium bg-white dark:bg-slate-900">
                      {filteredStagingList.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            Nenhuma movimentação corresponde aos filtros ativos.
                          </td>
                        </tr>
                      ) : (
                        filteredStagingList.map(item => {
                          const isIncome = item.type === 'income';
                          const isMusician = item.scope === 'BUSINESS';
                          const linkedShow = item.showId ? shows.find(s => s.id === item.showId) : null;

                          return (
                            <tr
                              key={item.tempId}
                              className={`transition-colors ${
                                item.selected 
                                  ? 'bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20' 
                                  : 'opacity-50 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              } ${item.isDuplicate ? 'border-l-4 border-l-amber-500' : ''}`}
                            >
                              {/* Checkbox */}
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleSelectRow(item.tempId)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>

                              {/* Data */}
                              <td className="p-3">
                                <input
                                  type="date"
                                  value={item.date}
                                  onChange={(e) => updateRowField(item.tempId, 'date', e.target.value)}
                                  className="bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200 outline-none w-full"
                                />
                              </td>

                              {/* Descrição com texto original e seletor de Show se for receita do Músico */}
                              <td className="p-3">
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => updateRowField(item.tempId, 'description', e.target.value)}
                                    className="w-full bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 rounded px-1.5 py-0.5 font-bold text-slate-900 dark:text-white outline-none"
                                    placeholder="Nome do lançamento..."
                                  />
                                  <div className="flex items-center space-x-1.5 px-1.5 text-[10px] text-slate-400 truncate">
                                    <span className={`px-1 rounded text-[8px] font-black uppercase ${
                                      isIncome ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                    }`}>
                                      {isIncome ? 'Entrada' : 'Saída'}
                                    </span>
                                    <span className="truncate" title={item.originalDescription}>
                                      Original: {item.originalDescription}
                                    </span>
                                    {item.isDuplicate && (
                                      <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0" title={item.duplicateReason}>
                                        ⚠️ Duplicata
                                      </span>
                                    )}
                                  </div>

                                  {/* SELETOR DE VÍNCULO COM O SHOW (SE MÚSICO E RECEITA/ENTRADA) */}
                                  {isIncome && isMusician && (
                                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center space-x-1.5">
                                      <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 flex items-center shrink-0">
                                        <Music size={10} className="mr-0.5" /> Show:
                                      </span>
                                      <select
                                        value={item.showId || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '__NEW_SHOW__') {
                                            openQuickShowModal(item);
                                          } else {
                                            updateRowField(item.tempId, 'showId', val || undefined);
                                            if (val) {
                                              updateRowField(item.tempId, 'categoryId', 'cat_33');
                                            }
                                          }
                                        }}
                                        className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-purple-900 dark:text-purple-200 outline-none focus:border-purple-500 w-full truncate"
                                      >
                                        <option value="">Sem vínculo / Receita avulsa</option>
                                        <option value="__NEW_SHOW__">➕ Criar Novo Show...</option>
                                        {availableShows.map(s => (
                                          <option key={s.id} value={s.id}>
                                            🎤 {s.contractorName || s.name} ({s.date ? s.date.slice(5) : ''})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                </div>
                              </td>

                              {/* Categoria */}
                              <td className="p-3">
                                <select
                                  value={item.categoryId}
                                  onChange={(e) => updateRowField(item.tempId, 'categoryId', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 truncate"
                                >
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* Módulo / Conta Pertencente */}
                              <td className="p-3">
                                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateRowField(item.tempId, 'scope', 'PERSONAL');
                                      updateRowField(item.tempId, 'showId', undefined);
                                    }}
                                    className={`flex-1 py-1 rounded text-[9px] font-black uppercase tracking-wider transition ${
                                      item.scope === 'PERSONAL'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-indigo-600'
                                    }`}
                                    title="Módulo Pessoal"
                                  >
                                    👤 Pessoal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateRowField(item.tempId, 'scope', 'BUSINESS')}
                                    className={`flex-1 py-1 rounded text-[9px] font-black uppercase tracking-wider transition ${
                                      item.scope === 'BUSINESS'
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-purple-600'
                                    }`}
                                    title="Módulo Músico / Empresa"
                                  >
                                    🎸 Músico
                                  </button>
                                </div>
                              </td>

                              {/* Conta Bancária */}
                              <td className="p-3">
                                <select
                                  value={item.accountId}
                                  onChange={(e) => updateRowField(item.tempId, 'accountId', e.target.value)}
                                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 truncate"
                                >
                                  {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Valor */}
                              <td className={`p-3 text-right font-black tabular-nums whitespace-nowrap ${
                                isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                              </td>

                              {/* Ação Excluir */}
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => removeRow(item.tempId)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  title="Remover deste lote"
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

            </div>
          )}

          {/* PASSO 3: SUCESSO */}
          {step === 'success' && (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={42} strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Importação Concluída com Sucesso!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Foram importados <strong>{importedCount} lançamentos</strong> para o seu extrato financeiro. Se você vinculou receitas a shows, os cachês foram atualizados dinamicamente sem gerar duplicidades no caixa.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center space-x-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  Importar Outro Arquivo
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/25"
                >
                  Concluir & Ver Extrato
                </button>
              </div>
            </div>
          )}

        </div>

        {/* RODAPÉ DO MODAL (BARRAS DE AÇÃO) */}
        {step === 'staging' && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition"
            >
              Cancelar / Novo Arquivo
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={selectedItems.length === 0}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 active:scale-95 transition disabled:opacity-40 flex items-center space-x-2"
            >
              <Check size={16} strokeWidth={3} />
              <span>Confirmar e Importar {selectedItems.length} Lançamentos</span>
            </button>
          </div>
        )}

      </div>

      {/* MODAL SIMPLES DE CRIAÇÃO RÁPIDA DE SHOW AO VINCULAR */}
      {quickShowTargetItem && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Music size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Criar Novo Show & Vincular</h3>
                  <p className="text-[10px] text-slate-400">Associa a receita de {formatCurrency(quickShowTargetItem.amount)} imediatamente</p>
                </div>
              </div>
              <button 
                onClick={() => setQuickShowTargetItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickShow} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Nome do Show / Contratante
                </label>
                <input
                  type="text"
                  required
                  value={quickShowContractor}
                  onChange={e => setQuickShowContractor(e.target.value)}
                  placeholder="Ex: Show Aniversário Marina"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Data do Show
                  </label>
                  <input
                    type="date"
                    required
                    value={quickShowDate}
                    onChange={e => setQuickShowDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Cachê Total (R$)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={quickShowTotalCache}
                    onChange={e => setQuickShowTotalCache(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Local / Casa de Evento
                  </label>
                  <input
                    type="text"
                    value={quickShowLocation}
                    onChange={e => setQuickShowLocation(e.target.value)}
                    placeholder="Ex: Espaço Gardens"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={quickShowCity}
                    onChange={e => setQuickShowCity(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickShowTargetItem(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-purple-500/20"
                >
                  Criar e Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
