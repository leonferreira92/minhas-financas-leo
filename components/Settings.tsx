
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, Layers, Trash2, Moon, Sun, Download, 
  Upload, Palette, Plus, X, Wallet, CheckCircle2, 
  TrendingUp, FileSpreadsheet, RefreshCw,
  ShieldCheck, Landmark, History, User, Bell, Clock,
  ChevronLeft, LayoutGrid, Database, AppWindow,
  GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, AlertTriangle,
  LogOut, Zap
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { useFinance } from '../context/FinanceContext';
import { Account, DashboardWidgetConfig } from '../types';

export const Settings = () => {
  const { 
    refreshData, settings, updateSettings, transactions, categories, 
    debts, accounts, budgets, goals, 
    addAccount, updateAccount, deleteAccount, reconcileBalance, getAccountBalance, 
    restoreAutoBackup, getBackupInfo 
  } = useFinance();
  
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  
  // Custom Confirmation Modal State
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; onConfirm?: () => void; isAlert?: boolean } | null>(null);

  // Account Form State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'wallet'|'bank'|'investment'>('bank');
  const [accColor, setAccColor] = useState('#6366f1');

  // Reconcile State
  const [reconcileAccountId, setReconcileAccountId] = useState('');
  const [actualBalance, setActualBalance] = useState('');

  const backupInputRef = useRef<HTMLInputElement>(null);
  const backupInfo = getBackupInfo();

  const handleClearData = () => {
    setConfirmation({
        title: 'Apagar Tudo',
        message: 'Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.',
        onConfirm: () => {
            StorageService.clearData();
            refreshData();
            setConfirmation({ title: 'Sucesso', message: 'Dados apagados com sucesso.', isAlert: true });
            setTimeout(() => window.location.reload(), 1500);
        }
    });
  };

  const openAccountModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setAccName(acc.name);
      setAccType(acc.type as any);
      setAccColor(acc.color);
    } else {
      setEditingAccount(null);
      setAccName('');
      setAccType('bank');
      setAccColor('#6366f1');
    }
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = () => {
    if (!accName) return;
    const accountData = {
      name: accName,
      type: accType,
      color: accColor,
      initialBalance: editingAccount ? editingAccount.initialBalance : 0,
      enabled: true
    };

    if (editingAccount) {
      updateAccount({ ...editingAccount, ...accountData });
    } else {
      addAccount(accountData);
    }
    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = (acc: Account) => {
      setConfirmation({
          title: 'Excluir Conta',
          message: 'Deseja excluir esta conta e desvincular todas as transações associadas?',
          onConfirm: () => {
              deleteAccount(acc.id);
              setIsAccountModalOpen(false);
          }
      });
  };

  const openReconcileModal = (acc: Account) => {
    setReconcileAccountId(acc.id);
    setActualBalance(getAccountBalance(acc.id).toString());
    setIsReconcileModalOpen(true);
  };

  const handleReconcile = () => {
    if (!reconcileAccountId || isNaN(parseFloat(actualBalance))) return;
    reconcileBalance(reconcileAccountId, parseFloat(actualBalance));
    setIsReconcileModalOpen(false);
  };
  
  const handleAutoRestore = () => {
    if (!backupInfo) return;
    setConfirmation({
        title: 'Restaurar Backup',
        message: `Deseja restaurar o backup automático de ${backupInfo.date.toLocaleString()}? Os dados atuais serão substituídos.`,
        onConfirm: () => {
            const success = restoreAutoBackup();
            if (success) {
                setConfirmation({ title: 'Sucesso', message: 'Backup restaurado com sucesso!', isAlert: true });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setConfirmation({ title: 'Erro', message: 'Falha ao restaurar.', isAlert: true });
            }
        }
    });
  };

  const toggleWidget = (id: string) => {
    const newLayout = settings.dashboardLayout.map(w => 
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    updateSettings({ dashboardLayout: newLayout });
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...settings.dashboardLayout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLayout.length) return;
    
    [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
    updateSettings({ dashboardLayout: newLayout });
  };

  const colors = [
    { key: 'indigo', label: 'Lime', hex: '#84cc16' }, // Primary Lime (mapped to indigo var)
    { key: 'blue', label: 'Azul', hex: '#3b82f6' },
    { key: 'emerald', label: 'Verde', hex: '#10b981' },
    { key: 'violet', label: 'Roxo', hex: '#8b5cf6' },
    { key: 'rose', label: 'Rosa', hex: '#f43f5e' },
    { key: 'orange', label: 'Laranja', hex: '#f97316' },
  ];

  const handleExport = () => {
      const data = { 
        version: '1.1', 
        timestamp: new Date().toISOString(), 
        transactions, categories, settings, debts, accounts, budgets, goals 
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      const dateStr = new Date().toISOString().slice(0,10);
      a.download = `financas_pro_backup_${dateStr}.json`;
      document.body.appendChild(a); 
      a.click(); 
      document.body.removeChild(a); 
      URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => { 
      if (backupInputRef.current) {
          backupInputRef.current.value = '';
          backupInputRef.current.click();
      }
  };
  
  const processRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setConfirmation({
          title: 'Importar Backup',
          message: 'ATENÇÃO: Restaurar um backup substituirá TODOS os dados atuais do aplicativo. Deseja continuar?',
          onConfirm: async () => {
              try {
                  const text = await file.text(); 
                  const data = JSON.parse(text);
                  
                  if (!Array.isArray(data.transactions) && !Array.isArray(data.categories)) {
                      throw new Error("Arquivo de backup inválido ou corrompido.");
                  }

                  StorageService.saveTransactions(data.transactions || []); 
                  StorageService.saveCategories(data.categories || []);
                  StorageService.saveSettings(data.settings || {}); 
                  StorageService.saveDebts(data.debts || []); 
                  StorageService.saveAccounts(data.accounts || []);
                  StorageService.saveBudgets(data.budgets || []);
                  StorageService.saveGoals(data.goals || []);
                  
                  const txCount = (data.transactions || []).length;
                  setConfirmation({ 
                      title: 'Sucesso', 
                      message: `Backup restaurado!\nRecuperados: ${txCount} Transações.`, 
                      isAlert: true 
                  });
                  setTimeout(() => window.location.reload(), 2000);
                  
              } catch (err) { 
                  setConfirmation({ title: 'Erro', message: 'Arquivo inválido.', isAlert: true });
                  console.error(err);
              }
          }
      });
      if (backupInputRef.current) backupInputRef.current.value = '';
  };

  const getAccountIcon = (type: string) => {
      switch(type) {
          case 'wallet': return Wallet;
          case 'investment': return TrendingUp;
          case 'bank': default: return Landmark;
      }
  }

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100 max-w-md mx-auto relative">
      
      {/* --- Sticky App Header --- */}
      <div className="sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-lg z-30 pt-4 pb-4 px-2 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center">
          <Link to="/" className="p-2 mr-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all active:scale-90">
             <ChevronLeft size={24} className="text-slate-500" />
          </Link>
          <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">Ajustes</h1>
        </div>
        <div className="w-8"></div> {/* Spacer for balance */}
      </div>

      <div className="space-y-6 px-3 pt-4">
        
        {/* --- Profile & Main Settings --- */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
           
           {/* Profile Input */}
           <div className="flex items-center space-x-4 relative z-10 mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
                 <User size={32} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Nome de Usuário</label>
                 <input 
                   value={settings.userName || ''} 
                   onChange={(e) => updateSettings({ userName: e.target.value })} 
                   placeholder="Seu Nome"
                   className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 border-b border-transparent focus:border-indigo-200 transition-colors pb-1"
                 />
              </div>
           </div>

           {/* Settings Grid */}
           <div className="grid grid-cols-2 gap-3">
              {/* Theme Toggle */}
              <button 
                onClick={() => updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
                className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-start border border-slate-100 dark:border-slate-700 transition active:scale-95"
              >
                 <div className="flex justify-between w-full mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tema</span>
                    {settings.theme === 'dark' ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-500" />}
                 </div>
                 <span className="text-sm font-bold dark:text-white capitalize">{settings.theme === 'light' ? 'Claro' : 'Escuro'}</span>
              </button>

              {/* Notification Toggle (Simulated cycle) */}
              <button 
                onClick={() => {
                   const next = settings.notificationInterval === 0 ? 12 : settings.notificationInterval === 12 ? 24 : 0;
                   updateSettings({ notificationInterval: next });
                }}
                className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-start border border-slate-100 dark:border-slate-700 transition active:scale-95"
              >
                 <div className="flex justify-between w-full mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Alertas</span>
                    <Bell size={16} className={settings.notificationInterval ? 'text-indigo-500' : 'text-slate-300'} />
                 </div>
                 <span className="text-sm font-bold dark:text-white">{settings.notificationInterval ? `${settings.notificationInterval}h` : 'Desligado'}</span>
              </button>

              {/* Categories */}
              <Link to="/categories" className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-start border border-slate-100 dark:border-slate-700 transition active:scale-95 col-span-2 flex-row items-center justify-between">
                 <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                       <LayoutGrid size={18} />
                    </div>
                    <div className="text-left">
                       <span className="text-sm font-bold text-slate-800 dark:text-white block">Categorias</span>
                       <span className="text-[10px] text-slate-400">Gerenciar etiquetas</span>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-slate-300" />
              </Link>
           </div>
        </section>

        {/* --- Accounts Management --- */}
        <section>
           <div className="flex justify-between items-center mb-3 px-2">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Minhas Contas</h2>
              <button onClick={() => openAccountModal()} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none active:scale-90 transition-all">
                 <Plus size={16} strokeWidth={3} />
              </button>
           </div>
           
           <div className="space-y-3">
              {accounts.map(acc => {
                const Icon = getAccountIcon(acc.type);
                const balance = getAccountBalance(acc.id);
                return (
                  <div key={acc.id} onClick={() => openAccountModal(acc)} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group">
                     <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: acc.color }}>
                           <Icon size={20} strokeWidth={2} />
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight">{acc.name}</h3>
                           <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{acc.type === 'wallet' ? 'Carteira' : acc.type === 'bank' ? 'Conta Corrente' : 'Investimento'}</span>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className={`font-black text-sm ${balance >= 0 ? 'text-slate-800 dark:text-white' : 'text-rose-500'}`}>
                           R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openReconcileModal(acc); }}
                          className="flex items-center text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg mt-1 group-hover:bg-indigo-100 transition-colors"
                        >
                           <RefreshCw size={10} className="mr-1" /> Ajustar
                        </button>
                     </div>
                  </div>
                );
              })}
           </div>
        </section>

        {/* --- Data & Security --- */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.2rem] overflow-hidden border border-slate-100 dark:border-slate-800">
           <div className="p-5 border-b border-slate-50 dark:border-slate-800/50">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                 <Database size={14} className="mr-2" /> Dados e Backup
              </h2>
              
              {/* Backup Status */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-2xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/50 mb-4">
                 <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                       <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block">Backup Automático</span>
                       <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {backupInfo ? `Última cópia: ${backupInfo.date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : 'Aguardando sincronização...'}
                       </span>
                    </div>
                 </div>
                 {backupInfo && (
                    <button onClick={handleAutoRestore} className="p-2 bg-white dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-sm hover:shadow-md transition active:scale-95">
                       <RefreshCw size={16} />
                    </button>
                 )}
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={handleExport} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl transition active:scale-95 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <Download size={20} className="text-indigo-500 mb-2" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Exportar JSON</span>
                 </button>
                 <button onClick={handleRestoreClick} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl transition active:scale-95 hover:bg-slate-100 dark:hover:bg-slate-700">
                    <Upload size={20} className="text-indigo-500 mb-2" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Importar JSON</span>
                 </button>
                 <input type="file" accept=".json" ref={backupInputRef} onChange={processRestoreFile} className="hidden" />
              </div>
           </div>

           {/* Danger Zone */}
           <button 
             onClick={handleClearData}
             className="w-full p-5 flex items-center justify-center space-x-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
           >
              <LogOut size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Resetar Aplicativo</span>
           </button>
        </section>

        {/* --- Customization Link --- */}
        <button 
           onClick={() => setIsLayoutModalOpen(true)}
           className="w-full py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center justify-center"
        >
           <Palette size={14} className="mr-2" /> Personalizar Dashboard
        </button>

      </div>

      {/* --- Dashboard Layout Modal --- */}
      {isLayoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-end sm:items-center justify-center backdrop-blur-md animate-fade-in p-0 sm:p-4">
           <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] sm:rounded-[3rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Organizar Início</h3>
                 <button onClick={() => setIsLayoutModalOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full transition-all active:scale-90"><X size={24} className="text-slate-400"/></button>
              </div>
              
              <div className="space-y-3">
                 {settings.dashboardLayout.map((widget, index) => (
                    <div key={widget.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl flex items-center justify-between group">
                       <div className="flex items-center space-x-3">
                          <div className="flex flex-col space-y-1">
                             <button 
                               onClick={() => moveWidget(index, 'up')}
                               disabled={index === 0}
                               className="p-1 text-slate-300 hover:text-indigo-500 disabled:opacity-20"
                             >
                                <ArrowUp size={14} />
                             </button>
                             <button 
                               onClick={() => moveWidget(index, 'down')}
                               disabled={index === settings.dashboardLayout.length - 1}
                               className="p-1 text-slate-300 hover:text-indigo-500 disabled:opacity-20"
                             >
                                <ArrowDown size={14} />
                             </button>
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{widget.label}</span>
                       </div>
                       
                       <button 
                         onClick={() => toggleWidget(widget.id)}
                         className={`p-2 rounded-xl transition-all ${widget.visible ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-400 opacity-50'}`}
                       >
                          {widget.visible ? <Eye size={20} /> : <EyeOff size={20} />}
                       </button>
                    </div>
                 ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Cor de Destaque</h4>
                 <div className="flex justify-between items-center px-1">
                    {colors.map(c => {
                      const isSelected = (settings.primaryColor || 'indigo') === c.key;
                      return (
                        <button 
                          key={c.key} 
                          onClick={() => updateSettings({ primaryColor: c.key })} 
                          className={`w-10 h-10 rounded-full transition-all flex items-center justify-center relative ${isSelected ? 'scale-110 shadow-xl shadow-indigo-200 dark:shadow-none ring-4 ring-white dark:ring-slate-800' : 'hover:scale-105 opacity-60 hover:opacity-100'}`} 
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && <CheckCircle2 size={18} className="text-white drop-shadow-md" />}
                        </button>
                      );
                    })}
                 </div>
              </div>

              <button 
                onClick={() => setIsLayoutModalOpen(false)}
                className="w-full mt-8 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                Concluir
              </button>
           </div>
        </div>
      )}

      {/* --- Account Form Modal --- */}
      {isAccountModalOpen && (
         <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-end sm:items-center justify-center backdrop-blur-md animate-fade-in p-0 sm:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-t-[3rem] sm:rounded-[3rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                     {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                  </h3>
                  <button onClick={() => setIsAccountModalOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full transition-all active:scale-90"><X size={24} className="text-slate-400"/></button>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Identificação</label>
                     <input 
                       value={accName} 
                       onChange={e => setAccName(e.target.value)} 
                       className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] dark:text-white outline-none font-bold text-lg" 
                       placeholder="Ex: Nubank, Bradesco..." 
                     />
                  </div>
                  
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Categoria</label>
                     <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        {(['bank', 'wallet', 'investment'] as const).map(t => (
                           <button 
                             key={t} 
                             onClick={() => setAccType(t)} 
                             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${accType === t ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-[1.02]' : 'text-slate-400'}`}
                           >
                              {t === 'bank' ? 'Banco' : t === 'wallet' ? 'Bolso' : 'Inv.'}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Cor Personalizada</label>
                     <div className="grid grid-cols-5 gap-3">
                        {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899'].map(c => (
                           <button 
                             key={c} 
                             onClick={() => setAccColor(c)} 
                             className={`aspect-square rounded-2xl transition-all relative ${accColor === c ? 'scale-110 ring-4 ring-white dark:ring-slate-800 shadow-lg' : 'opacity-60 hover:opacity-100'}`} 
                             style={{ backgroundColor: c }} 
                           >
                              {accColor === c && <CheckCircle2 size={16} className="text-white mx-auto drop-shadow-md" />}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="pt-4 flex flex-col space-y-3">
                    <button 
                      onClick={handleSaveAccount} 
                      className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-[0.98] transition-all"
                    >
                      Confirmar Conta
                    </button>
                    
                    {editingAccount && (
                       <button 
                         onClick={() => handleDeleteAccount(editingAccount)} 
                         className="w-full py-4 text-rose-500 font-bold text-xs uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-[1.5rem] transition"
                       >
                         Excluir Definitivamente
                       </button>
                    )}
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- Reconcile Modal --- */}
      {isReconcileModalOpen && (
         <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-in">
               <div className="text-center mb-8">
                 <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2rem] flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
                    <RefreshCw size={36} strokeWidth={1.5} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Ajuste de Saldo</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-4">
                    O saldo real no banco é diferente? Informe o valor correto para sincronizar.
                 </p>
               </div>

               <div className="space-y-6">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl flex justify-between items-center border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo no App</span>
                    <span className="text-lg font-black text-slate-800 dark:text-white">R$ {reconcileAccountId ? getAccountBalance(reconcileAccountId).toLocaleString('pt-BR', {minimumFractionDigits:2}) : '0,00'}</span>
                 </div>
                 
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Novo Saldo Real</label>
                    <div className="relative">
                       <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">R$</span>
                       <input 
                         type="number" 
                         step="0.01" 
                         value={actualBalance} 
                         onChange={e => setActualBalance(e.target.value)} 
                         className="w-full pl-14 pr-5 py-5 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/50 focus:border-indigo-500 rounded-[1.5rem] dark:text-white outline-none font-black text-2xl shadow-sm" 
                         placeholder="0,00"
                       />
                    </div>
                 </div>

                 <div className="flex space-x-3 pt-4">
                    <button onClick={() => setIsReconcileModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition">Cancelar</button>
                    <button onClick={handleReconcile} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition active:scale-[0.98]">Confirmar</button>
                 </div>
               </div>
            </div>
         </div>
      )}

      {/* Global Confirmation Modal */}
      {confirmation && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-in text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmation.isAlert ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                 {confirmation.isAlert ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{confirmation.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed whitespace-pre-line">
                 {confirmation.message}
              </p>
              
              <div className="flex space-x-3">
                 {!confirmation.isAlert && (
                    <button 
                      onClick={() => setConfirmation(null)}
                      className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs uppercase tracking-wider"
                    >
                       Cancelar
                    </button>
                 )}
                 <button 
                   onClick={() => {
                      if (confirmation.onConfirm) confirmation.onConfirm();
                      setConfirmation(null);
                   }}
                   className={`flex-1 py-4 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg ${confirmation.isAlert ? 'bg-indigo-600 w-full' : 'bg-rose-600 shadow-rose-200 dark:shadow-none'}`}
                 >
                    {confirmation.isAlert ? 'OK' : 'Confirmar'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
