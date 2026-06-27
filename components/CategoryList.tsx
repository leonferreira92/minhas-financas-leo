
import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Category, TransactionType } from '../types';
import { getIcon, ICON_MAP } from '../constants';
import { Trash2, Edit2, Plus, X, ChevronLeft, Lock, CheckCircle2, Search, ArrowDownCircle, ArrowUpCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

export const CategoryList = () => {
  const { categories, transactions, addCategory, updateCategory, deleteCategory } = useFinance();
  
  // UI State
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Modal de confirmação
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState('DollarSign');

  // Stats for Usage Locking
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    transactions.forEach(t => {
      stats[t.categoryId] = (stats[t.categoryId] || 0) + 1;
    });
    return stats;
  }, [transactions]);

  const openNewCategory = () => {
    setEditingId(null);
    setName('');
    setType(activeTab); // Default to current tab
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setIcon('ShoppingBag');
    setIsModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color);
    setIcon(cat.icon);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    if (editingId) {
      updateCategory({ id: editingId, name, type, color, icon });
    } else {
      addCategory({ name, type, color, icon });
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    const count = categoryStats[id] || 0;
    if (count > 0) {
      alert(`Esta categoria não pode ser excluída pois possui ${count} lançamento(s) associado(s).`);
      return;
    }
    setDeleteConfirmationId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmationId) {
      deleteCategory(deleteConfirmationId);
      setDeleteConfirmationId(null);
      setIsModalOpen(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === activeTab);
  
  // Helper to get usage count safely inside render
  const getUsageCount = (id: string) => categoryStats[id] || 0;

  return (
    <div className="pb-24 animate-fade-in text-slate-900 dark:text-slate-100 min-h-screen relative">
      
      {/* --- Header --- */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-20 px-1 pt-2 pb-2">
        <div className="flex items-center space-x-2 mb-4">
          <Link to="/settings" className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400">
             <ChevronLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Categorias</h1>
        </div>

        {/* --- Tabs --- */}
        <div className="bg-slate-200 dark:bg-slate-800/50 p-1 rounded-xl flex space-x-1 mb-2">
           <button 
             onClick={() => setActiveTab('expense')}
             className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center transition-all active:scale-95 ${activeTab === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
           >
             <ArrowDownCircle size={16} className="mr-2" /> Despesas
           </button>
           <button 
             onClick={() => setActiveTab('income')}
             className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center transition-all active:scale-95 ${activeTab === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
           >
             <ArrowUpCircle size={16} className="mr-2" /> Receitas
           </button>
        </div>
      </div>

      {/* --- List --- */}
      <div className="px-1 space-y-3 mt-2">
         {filteredCategories.map((cat) => {
           const Icon = getIcon(cat.icon);
           const usageCount = getUsageCount(cat.id);
           const isInUse = usageCount > 0;
           
           return (
             <div 
               key={cat.id} 
               onClick={() => openEditCategory(cat)}
               className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between group active:scale-[0.98] transition-transform cursor-pointer"
             >
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: cat.color }}>
                      <Icon size={22} />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-base">{cat.name}</h3>
                      <div className="flex items-center mt-1">
                         <span className={`text-xs ${isInUse ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-400'}`}>
                            {usageCount} {usageCount === 1 ? 'lançamento' : 'lançamentos'}
                         </span>
                      </div>
                   </div>
                </div>
                
                <div className="flex items-center">
                   {isInUse ? (
                     <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        <Lock size={10} className="mr-1.5" /> Em uso
                     </div>
                   ) : (
                     <ChevronRight size={20} className="text-slate-300 dark:text-slate-600" />
                   )}
                </div>
             </div>
           );
         })}
         
         {/* Empty State */}
         {filteredCategories.length === 0 && (
            <div className="text-center py-12 opacity-60">
               <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={24} className="text-slate-400" />
               </div>
               <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nenhuma categoria encontrada</p>
               <p className="text-xs text-slate-400">Toque no botão + para criar a primeira.</p>
            </div>
         )}
      </div>

      {/* --- Floating Action Button --- */}
      <div className="fixed bottom-24 left-0 right-0 z-40 flex justify-end px-6 max-w-md mx-auto pointer-events-none">
        <button 
          onClick={openNewCategory}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-300 dark:shadow-indigo-900/50 flex items-center justify-center pointer-events-auto transition-transform active:scale-90"
        >
           <Plus size={28} />
        </button>
      </div>

      {/* --- Modal Form --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center backdrop-blur-sm animate-fade-in p-0 sm:p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar border border-slate-100 dark:border-slate-800">
              
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    {editingId ? 'Editar Categoria' : 'Nova Categoria'}
                 </h2>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95">
                    <X size={20} className="text-slate-500 dark:text-slate-400" />
                 </button>
              </div>

              <div className="space-y-6">
                 {/* Name Input */}
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nome</label>
                    <input 
                       value={name} onChange={e => setName(e.target.value)} 
                       className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-lg font-bold outline-none dark:text-white transition placeholder:font-normal"
                       placeholder="Ex: Supermercado"
                       autoFocus
                    />
                 </div>

                 {/* Type Selector (Locked if used) */}
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                       {editingId && getUsageCount(editingId) > 0 && (
                          <span className="flex items-center text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md font-bold">
                             <Lock size={10} className="mr-1" /> Tipo bloqueado (em uso)
                          </span>
                       )}
                    </div>
                    <div className="flex space-x-3">
                       <button 
                         onClick={() => setType('expense')}
                         disabled={editingId ? getUsageCount(editingId) > 0 : false}
                         className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${type === 'expense' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-400'} disabled:opacity-50`}
                       >
                         Despesa
                       </button>
                       <button 
                         onClick={() => setType('income')}
                         disabled={editingId ? getUsageCount(editingId) > 0 : false}
                         className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${type === 'income' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-400'} disabled:opacity-50`}
                       >
                         Receita
                       </button>
                    </div>
                 </div>

                 {/* Color Picker */}
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Cor</label>
                    <div className="flex flex-wrap gap-3">
                       {COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${color === c ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                            style={{ backgroundColor: c }}
                          >
                             {color === c && <CheckCircle2 size={16} className="text-white drop-shadow-md" />}
                          </button>
                       ))}
                    </div>
                 </div>

                 {/* Icon Picker */}
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Ícone</label>
                    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
                       {Object.keys(ICON_MAP).map(iconName => {
                          const IconComp = ICON_MAP[iconName];
                          const isSelected = icon === iconName;
                          return (
                             <button
                               key={iconName}
                               onClick={() => setIcon(iconName)}
                               className={`aspect-square rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                             >
                                <IconComp size={20} />
                             </button>
                          )
                       })}
                    </div>
                 </div>

                 {/* Actions */}
                 <div className="pt-4 flex space-x-3">
                    {editingId && (
                       getUsageCount(editingId) > 0 ? (
                         <div className="flex-none p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-[10px] font-bold text-center leading-tight max-w-[100px]">
                            <span className="flex flex-col items-center">
                              <Lock size={16} className="mb-1" />
                              Em uso
                            </span>
                         </div>
                       ) : (
                         <button 
                           onClick={() => handleDeleteClick(editingId)}
                           className="flex-none w-14 h-14 flex items-center justify-center rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition"
                         >
                            <Trash2 size={24} />
                         </button>
                       )
                    )}
                    <button 
                      onClick={handleSave}
                      className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 text-lg transition-transform active:scale-95 flex items-center justify-center"
                    >
                       {editingId ? 'Salvar Alterações' : 'Criar Categoria'}
                    </button>
                 </div>
              </div>

           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-in text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Excluir Categoria?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">
                 Você tem certeza que deseja excluir esta categoria permanentemente?
              </p>
              
              <div className="flex space-x-3">
                 <button 
                   onClick={() => setDeleteConfirmationId(null)}
                   className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs uppercase tracking-wider"
                 >
                    Cancelar
                 </button>
                 <button 
                   onClick={confirmDelete}
                   className="flex-1 py-4 text-white font-bold bg-rose-600 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-rose-200 dark:shadow-none"
                 >
                    Excluir
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
