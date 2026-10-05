import React, { useState, useMemo } from 'react';
import { MusicCostItem, MusicCostCategory, Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  Briefcase, Hammer, Sparkles, Plus, Trash2, Edit3, 
  Laptop, Shirt, Wrench, Megaphone, Disc, DollarSign, 
  PieChart, Tag, Check, X, Search
} from 'lucide-react';
import { getLocalDateString } from '../../services/dateUtils';
import {
  isCareerExpenseTransaction,
  resolveCareerSubcategoryMeta,
  getTransactionCareerAndPersonalSplit
} from '../../services/financeAggregator';

interface Props {
  shows: Show[];
}

export const GearAndCostsView: React.FC<Props> = ({ shows }) => {
  const { 
    musicCostItems, 
    transactions,
    debts,
    addMusicCostItem, 
    updateMusicCostItem, 
    deleteMusicCostItem, 
    deleteTransaction,
    isBlurred 
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MusicCostItem | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formCategory, setFormCategory] = useState<MusicCostCategory>('equipment');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => getLocalDateString());
  const [formShowId, setFormShowId] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const categoriesConfig: Record<MusicCostCategory, { label: string; icon: any; color: string; bgClass: string }> = {
    equipment: { label: 'Equipamentos & Instrumentos', icon: Hammer, color: '#a855f7', bgClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    accessories: { label: 'Acessórios & Cordas', icon: Tag, color: '#38bdf8', bgClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    maintenance: { label: 'Manutenção & Luthier', icon: Wrench, color: '#fb923c', bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    costume: { label: 'Figurino & Imagem', icon: Shirt, color: '#f43f5e', bgClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    marketing: { label: 'Marketing & Anúncios', icon: Megaphone, color: '#ec4899', bgClass: 'bg-pink-500/10 text-pink-400 border-pink-500/30' },
    software: { label: 'Softwares & Plugins', icon: Laptop, color: '#10b981', bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    rehearsal: { label: 'Ensaios & Estúdio', icon: Disc, color: '#818cf8', bgClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
    other: { label: 'Outros Custos', icon: Briefcase, color: '#94a3b8', bgClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' }
  };

  const inferMusicCategory = (t: any): MusicCostCategory => {
    if (t.subcategory) {
      const meta = resolveCareerSubcategoryMeta(String(t.subcategory));
      if (meta.musicCostKey) return meta.musicCostKey;
    }
    if (t.debtId) {
      const parentDebt = debts.find(d => d.id === t.debtId);
      if (parentDebt?.musicSubcategory) {
        const meta = resolveCareerSubcategoryMeta(parentDebt.musicSubcategory);
        if (meta.musicCostKey) return meta.musicCostKey;
      }
    }

    const desc = (t.description || '').toLowerCase();
    const orig = (t.originalBankDescription || '').toLowerCase();
    const txt = `${desc} ${orig}`;

    if (
      t.categoryId === 'cat_equipamentos' ||
      txt.includes('mesa') || txt.includes('som') || txt.includes('caixa') || 
      txt.includes('pedal') || txt.includes('ampli') || txt.includes('instrumento') || 
      txt.includes('violao') || txt.includes('violão') || txt.includes('guitarra') || 
      txt.includes('baixo') || txt.includes('bateria') || txt.includes('microfone') || 
      txt.includes('fone') || txt.includes('in-ear') || txt.includes('equipamento') || 
      txt.includes('teclado') || txt.includes('cabo') || txt.includes('estante') || 
      txt.includes('bag') || txt.includes('case')
    ) {
      return 'equipment';
    }
    if (
      t.categoryId === 'cat_marketing' || 
      txt.includes('marketing') || txt.includes('anuncio') || txt.includes('instagram') || 
      txt.includes('facebook') || txt.includes('ads') || txt.includes('trafego') || txt.includes('mkt')
    ) {
      return 'marketing';
    }
    if (txt.includes('luthier') || txt.includes('regulagem') || txt.includes('manutencao') || txt.includes('conserto') || txt.includes('reparo')) {
      return 'maintenance';
    }
    if (txt.includes('corda') || txt.includes('palheta') || txt.includes('acessorio') || txt.includes('capo') || txt.includes('correia')) {
      return 'accessories';
    }
    if (txt.includes('figurino') || txt.includes('roupa') || txt.includes('vestuario') || txt.includes('traje') || txt.includes('camisa')) {
      return 'costume';
    }
    if (txt.includes('software') || txt.includes('plugin') || txt.includes('daw') || txt.includes('reaper') || txt.includes('logic') || txt.includes('ableton')) {
      return 'software';
    }
    if (txt.includes('ensaio') || txt.includes('estudio') || txt.includes('gravacao')) {
      return 'rehearsal';
    }
    return 'equipment';
  };

  // Unifica musicCostItems e transações com escopo BUSINESS (incluindo parcelas pagas de dívidas vinculadas à Música e excluindo Pessoais)
  const allUnifiedCostItems = useMemo<MusicCostItem[]>(() => {
    const list: MusicCostItem[] = [...musicCostItems];
    const processedTxIds = new Set(musicCostItems.map(i => i.transactionId).filter(Boolean));

    transactions.forEach(t => {
      if (t.type !== 'expense' || t.status === 'cancelled') return;
      if (processedTxIds.has(t.id)) return;

      // Para lançamentos de dívida/parcelamento:
      // 1. Apenas parcelas PAGAS entram no relatório da música
      // 2. Parcelas marcadas como PESSOAL jamais entram no relatório da música
      // 3. No contrato do Viny, respeita o teto de R$ 650,00/mês e R$ 6.500,00 acumulado
      if (t.debtId) {
        if (t.status !== 'paid') return;
        const { careerAmount } = getTransactionCareerAndPersonalSplit(t, debts, transactions);
        if (careerAmount <= 0) return;

        const parentDebt = debts.find(d => d.id === t.debtId);
        const subLabel = t.subcategory || parentDebt?.musicSubcategory || 'Equipamentos / Instrumentos';
        list.push({
          id: `mcost_tx_${t.id}`,
          title: t.description || parentDebt?.name || 'Parcela de Dívida (Música)',
          amount: careerAmount,
          date: t.date || getLocalDateString(),
          category: inferMusicCategory(t),
          showId: t.showId,
          transactionId: t.id,
          notes: `Parcela paga • Subcategoria: ${subLabel}`,
          createdAt: t.createdAt
        });
        return;
      }

      const desc = `${t.description || ''} ${t.originalBankDescription || ''}`.toLowerCase();
      // REGRA: Combustível e Locomoção vão EXCLUSIVAMENTE para a aba 'Locomoção'
      const isFuelOrLocomotion = t.categoryId === 'cat_21' || 
                                 t.categoryId === 'cat_3' || 
                                 desc.includes('combustivel') || desc.includes('combustível') || 
                                 desc.includes('posto ') || desc.includes('gasolina') || 
                                 desc.includes('etanol') || desc.includes('ipiranga') || 
                                 desc.includes('shell') || desc.includes('petrobras') || 
                                 desc.includes('abastec') || desc.includes('uber') || 
                                 desc.includes('99app') || desc.includes('pedágio') || 
                                 desc.includes('pedagio');

      if (isFuelOrLocomotion) return;

      const isBusinessCost = t.categoryId === 'cat_equipamentos' || 
                             t.categoryId === 'cat_marketing' || 
                             t.categoryId === 'cat_producao_shows' || 
                             (t.scope === 'BUSINESS' && inferMusicCategory(t) !== 'other') ||
                             (!!t.showId && t.categoryId !== 'cat_21');

      if (isBusinessCost) {
        list.push({
          id: `mcost_tx_${t.id}`,
          title: t.description || 'Despesa de Estrutura',
          amount: Number(t.amount) || 0,
          date: t.date || getLocalDateString(),
          category: inferMusicCategory(t),
          showId: t.showId,
          transactionId: t.id,
          notes: t.originalBankDescription || undefined,
          createdAt: t.createdAt
        });
      }
    });

    return list;
  }, [musicCostItems, transactions, debts]);

  const handleOpenModal = (item?: MusicCostItem) => {
    if (item) {
      setEditingItem(item);
      setFormCategory(item.category || 'equipment');
      setFormTitle(item.title || '');
      setFormAmount(item.amount ? String(item.amount) : '');
      setFormDate(item.date || getLocalDateString());
      setFormShowId(item.showId || '');
      setFormNotes(item.notes || '');
    } else {
      setEditingItem(null);
      setFormCategory('equipment');
      setFormTitle('');
      setFormAmount('');
      setFormDate(getLocalDateString());
      setFormShowId('');
      setFormNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0 || !formTitle.trim()) return;

    const data: Omit<MusicCostItem, 'id' | 'createdAt'> = {
      category: formCategory,
      title: formTitle.trim(),
      amount: amt,
      date: formDate,
      showId: formShowId || undefined,
      notes: formNotes.trim() || undefined
    };

    if (editingItem) {
      updateMusicCostItem({
        ...editingItem,
        ...data
      });
    } else {
      addMusicCostItem(data, true);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string, transactionId?: string) => {
    if (window.confirm(`Deseja excluir a despesa "${title}" e remover o lançamento financeiro?`)) {
      if (transactionId) {
        deleteTransaction(transactionId);
      }
      deleteMusicCostItem(id, true);
    }
  };

  const totalEquipmentReserve = useMemo(() => {
    return (shows || []).filter(s => s && s.status !== 'Cancelado').reduce((sum, s) => {
      return sum + (Number(s.equipmentReserveAmount) || 0);
    }, 0);
  }, [shows]);

  // Metrics by Category
  const categoryTotals = useMemo(() => {
    const map = new Map<MusicCostCategory, number>();
    let grandTotal = 0;

    allUnifiedCostItems.forEach(item => {
      const amt = Number(item.amount) || 0;
      grandTotal += amt;
      map.set(item.category, (map.get(item.category) || 0) + amt);
    });

    const list = Object.keys(categoriesConfig).map(catKey => {
      const key = catKey as MusicCostCategory;
      const amount = map.get(key) || 0;
      const percentage = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
      return {
        category: key,
        ...categoriesConfig[key],
        amount,
        percentage
      };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    return {
      list,
      grandTotal
    };
  }, [allUnifiedCostItems]);

  const filteredItems = useMemo(() => {
    return allUnifiedCostItems
      .filter(item => {
        const matchCat = selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;
        const matchSearch = searchTerm === '' || item.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCat && matchSearch;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [allUnifiedCostItems, selectedCategoryFilter, searchTerm]);

  return (
    <div className="space-y-5">
      
      {/* HEADER DA ABA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121214] p-4 rounded-3xl border border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
            <Hammer size={20} className="text-purple-400" />
            <span>Custos da Música & Estrutura</span>
          </h2>
          <p className="text-[11px] text-zinc-400">
            Equipamentos, instrumentos, luthier, cordas, marketing, figurino e softwares musicais.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-purple-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Lançar Custo / Equipamento</span>
        </button>
      </div>

      {/* PAINEL DE DISTRIBUIÇÃO DE CUSTOS ESTATÍSTICOS */}
      <div className="p-5 rounded-3xl bg-[#141416] border border-zinc-800 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#0f0f11] border border-zinc-800 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-0.5">Total Investido em Estrutura</span>
              <h3 className="text-xl sm:text-2xl font-black text-white tabular-nums">
                {formatCurrency(categoryTotals.grandTotal)}
              </h3>
            </div>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20">
              {allUnifiedCostItems.length} despesas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f0f11] border border-amber-500/20 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">Reserva para Equipamentos (Shows)</span>
              <h3 className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                {formatCurrency(totalEquipmentReserve)}
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase bg-amber-500/10 text-amber-400 px-3 py-1 rounded-xl border border-amber-500/20">
              Fundo Acumulado
            </span>
          </div>
        </div>

        {/* BARRAS DE DISTRIBUIÇÃO */}
        {categoryTotals.list.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {categoryTotals.list.map(cat => (
                <div key={cat.category} className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                    <span className="truncate">{cat.label}</span>
                    <span>{cat.percentage.toFixed(0)}%</span>
                  </div>
                  <span className="text-xs font-black text-white tabular-nums block">
                    {formatCurrency(cat.amount)}
                  </span>
                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                    <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição (ex: Jogo de cordas, Pedal overdrive, Tráfego Instagram)..."
            className="w-full bg-[#121214] border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Pills de Categoria */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition active:scale-95 ${
              selectedCategoryFilter === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white bg-[#121214]'
            }`}
          >
            Todas
          </button>
          {Object.entries(categoriesConfig).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setSelectedCategoryFilter(k)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition active:scale-95 ${
                selectedCategoryFilter === k
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white bg-[#121214]'
              }`}
            >
              {v.label.split('&')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM DE CUSTOS */}
      {filteredItems.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121214] border border-dashed border-zinc-800 text-center space-y-3">
          <Hammer size={32} className="mx-auto text-zinc-600" />
          <p className="text-sm font-bold text-white">Nenhum custo ou equipamento cadastrado</p>
          <p className="text-xs text-zinc-400">Cadastre a compra de instrumentos, cabos, cordas e luthier para manter o DRE da música 100% preciso.</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs inline-flex items-center space-x-1"
          >
            <Plus size={14} />
            <span>Lançar Primeiro Custo</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map(item => {
            const cfg = categoriesConfig[item.category] || categoriesConfig.other;
            const Icon = cfg.icon;
            const linkedShow = shows.find(s => s.id === item.showId);

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#141416] border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-white truncate">
                        {item.title}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${cfg.bgClass}`}>
                        {cfg.label.split('&')[0].trim()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-0.5">
                      <span>{item.date}</span>
                      {linkedShow && (
                        <span className="text-purple-400 font-bold truncate">
                          • Show: {linkedShow.contractorName || linkedShow.name}
                        </span>
                      )}
                      {item.notes && (
                        <span className="text-zinc-500 truncate hidden sm:inline">
                          • {item.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-sm font-black text-rose-400 tabular-nums">
                    -{formatCurrency(item.amount)}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title, item.transactionId)}
                      className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR CUSTO DA MÚSICA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <Hammer size={18} className="text-purple-400" />
                <span>{editingItem ? 'Editar Custo da Música' : 'Novo Custo / Equipamento'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Categoria do Custo *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  {Object.entries(categoriesConfig).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Descrição do Item / Despesa *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Jogo de Cordas Elixir 0.10, Luthier Regulagem, Pedal Strymon, Anúncio Instagram..."
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-rose-400 font-black text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Vincular a um Show (Opcional)</label>
                <select
                  value={formShowId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setFormShowId(sid);
                    if (sid) {
                      const selectedShow = shows.find(s => s.id === sid);
                      if (selectedShow && selectedShow.date) {
                        setFormDate(selectedShow.date);
                      }
                    }
                  }}
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Gasto Geral de Carreira / Estrutura</option>
                  {shows.filter(s => s.status !== 'Cancelado').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.date} - {s.contractorName || s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Observações / Loja / Garantia</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Comprado na Santa Efigênia, garantia 1 ano..."
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-wider"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
