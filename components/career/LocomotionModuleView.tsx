import React, { useState, useMemo } from 'react';
import { MusicLocomotionExpense, Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  Car, Fuel, Plus, Trash2, Edit3, Calculator, 
  MapPin, Calendar, Clock, DollarSign, ArrowUpRight, 
  CheckCircle2, X, Search, Navigation
} from 'lucide-react';
import { getLocalDateString } from '../../services/dateUtils';

interface Props {
  shows: Show[];
  onOpenCreateShow?: () => void;
}

export const LocomotionModuleView: React.FC<Props> = ({ shows }) => {
  const { 
    locomotionExpenses, 
    addLocomotionExpense, 
    updateLocomotionExpense, 
    deleteLocomotionExpense,
    isBlurred 
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MusicLocomotionExpense | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // Form states
  const [formType, setFormType] = useState<MusicLocomotionExpense['type']>('fuel');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(() => getLocalDateString());
  const [formAmount, setFormAmount] = useState('');
  const [formKm, setFormKm] = useState('');
  const [formPricePerKm, setFormPricePerKm] = useState('1.20'); // Padrão R$ 1,20 por KM
  const [formOrigin, setFormOrigin] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formShowId, setFormShowId] = useState<string>('');
  const [formNotes, setFormNotes] = useState('');

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Helper when KM or PricePerKM changes in mileage mode
  const handleKmChange = (newKm: string, newPrice: string = formPricePerKm) => {
    setFormKm(newKm);
    const kmNum = parseFloat(newKm.replace(',', '.')) || 0;
    const priceNum = parseFloat(newPrice.replace(',', '.')) || 0;
    if (kmNum > 0 && priceNum > 0) {
      setFormAmount((kmNum * priceNum).toFixed(2));
    }
  };

  const handlePricePerKmChange = (newPrice: string) => {
    setFormPricePerKm(newPrice);
    handleKmChange(formKm, newPrice);
  };

  const handleOpenModal = (expense?: MusicLocomotionExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormType(expense.type || 'fuel');
      setFormTitle(expense.title || '');
      setFormDate(expense.date || getLocalDateString());
      setFormAmount(expense.amount ? String(expense.amount) : '');
      setFormKm(expense.km ? String(expense.km) : '');
      setFormPricePerKm(expense.pricePerKm ? String(expense.pricePerKm) : '1.20');
      setFormOrigin(expense.origin || '');
      setFormDestination(expense.destination || '');
      setFormShowId(expense.showId || '');
      setFormNotes(expense.notes || '');
    } else {
      setEditingExpense(null);
      setFormType('fuel');
      setFormTitle('');
      setFormDate(getLocalDateString());
      setFormAmount('');
      setFormKm('');
      setFormPricePerKm('1.20');
      setFormOrigin('');
      setFormDestination('');
      setFormShowId('');
      setFormNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;

    const kmNum = parseFloat(formKm.replace(',', '.')) || undefined;
    const priceKmNum = parseFloat(formPricePerKm.replace(',', '.')) || undefined;

    const defaultTitleByType = {
      uber: 'Corrida Uber / 99',
      fuel: 'Abastecimento Combustível',
      mileage: `Deslocamento (${kmNum || 0} KM)`,
      toll: 'Pedágio',
      parking: 'Estacionamento'
    };

    const finalTitle = formTitle.trim() || defaultTitleByType[formType];

    const data: Omit<MusicLocomotionExpense, 'id' | 'createdAt'> = {
      type: formType,
      title: finalTitle,
      date: formDate,
      amount: amt,
      km: kmNum,
      pricePerKm: priceKmNum,
      origin: formOrigin.trim() || undefined,
      destination: formDestination.trim() || undefined,
      showId: formShowId || undefined,
      notes: formNotes.trim() || undefined
    };

    if (editingExpense) {
      updateLocomotionExpense({
        ...editingExpense,
        ...data
      });
    } else {
      addLocomotionExpense(data, true);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Deseja excluir a despesa "${title}" e remover do financeiro?`)) {
      deleteLocomotionExpense(id, true);
    }
  };

  // Metrics
  const locomotionMetrics = useMemo(() => {
    const totalAmount = locomotionExpenses.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const totalKm = locomotionExpenses.reduce((s, l) => s + (Number(l.km) || 0), 0);
    const fuelAmount = locomotionExpenses.filter(l => l.type === 'fuel').reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const uberAmount = locomotionExpenses.filter(l => l.type === 'uber').reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const tollAndParking = locomotionExpenses.filter(l => l.type === 'toll' || l.type === 'parking').reduce((s, l) => s + (Number(l.amount) || 0), 0);

    return {
      totalAmount,
      totalKm,
      fuelAmount,
      uberAmount,
      tollAndParking
    };
  }, [locomotionExpenses]);

  const filteredExpenses = useMemo(() => {
    return locomotionExpenses
      .filter(l => selectedTypeFilter === 'all' || l.type === selectedTypeFilter)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [locomotionExpenses, selectedTypeFilter]);

  return (
    <div className="space-y-5">
      
      {/* HEADER DA ABA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121214] p-4 rounded-3xl border border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
            <Car size={20} className="text-amber-400" />
            <span>Locomoção, Combustível & KM Rodado</span>
          </h2>
          <p className="text-[11px] text-zinc-400">
            Controle de viagens para shows, cálculo de custo por KM rodado, corridas Uber e pedágios.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-amber-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Registrar Deslocamento</span>
        </button>
      </div>

      {/* KPI CARDS DE LOCOMOÇÃO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-zinc-400">Total Gasto em Transporte</span>
          <span className="text-xl font-black text-amber-400 tabular-nums block">
            {formatCurrency(locomotionMetrics.totalAmount)}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">Todos os deslocamentos</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-zinc-400">Total KM Rodados</span>
          <span className="text-xl font-black text-white tabular-nums block">
            {locomotionMetrics.totalKm.toLocaleString('pt-BR')} km
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">Viagens computadas</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-zinc-400">Combustível</span>
          <span className="text-xl font-black text-emerald-400 tabular-nums block">
            {formatCurrency(locomotionMetrics.fuelAmount)}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">Postos e abastecimento</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase text-zinc-400">Uber & Apps</span>
          <span className="text-xl font-black text-purple-400 tabular-nums block">
            {formatCurrency(locomotionMetrics.uberAmount)}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">Corridas e transporte</span>
        </div>
      </div>

      {/* FILTROS DE TIPO */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'fuel', label: 'Combustível' },
          { id: 'mileage', label: 'KM Rodado' },
          { id: 'uber', label: 'Uber / 99' },
          { id: 'toll', label: 'Pedágio & Estac.' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setSelectedTypeFilter(filter.id)}
            className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition active:scale-95 ${
              selectedTypeFilter === filter.id
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white bg-[#121214]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* LISTAGEM DE DESLOCAMENTOS */}
      {filteredExpenses.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121214] border border-dashed border-zinc-800 text-center space-y-3">
          <Car size={32} className="mx-auto text-zinc-600" />
          <p className="text-sm font-bold text-white">Nenhum gasto de locomoção registrado</p>
          <p className="text-xs text-zinc-400">Use a calculadora de KM rodado ou registre abastecimentos para descontar do lucro real.</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-black uppercase text-xs inline-flex items-center space-x-1"
          >
            <Plus size={14} strokeWidth={3} />
            <span>Registrar Primeiro Deslocamento</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredExpenses.map(expense => {
            const linkedShow = shows.find(s => s.id === expense.showId);

            return (
              <div
                key={expense.id}
                className="p-4 rounded-2xl bg-[#141416] border border-zinc-800 hover:border-zinc-700 transition flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    expense.type === 'fuel' ? 'bg-emerald-500/10 text-emerald-400' :
                    expense.type === 'uber' ? 'bg-purple-500/10 text-purple-400' :
                    expense.type === 'mileage' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {expense.type === 'fuel' ? <Fuel size={18} /> : <Car size={18} />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-white truncate">
                        {expense.title}
                      </span>
                      {expense.km && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-zinc-800 text-amber-300">
                          {expense.km} km ({formatCurrency(expense.pricePerKm || 1.20)}/km)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-0.5">
                      <span>{expense.date}</span>
                      {linkedShow && (
                        <span className="text-purple-400 font-bold truncate">
                          • Show: {linkedShow.contractorName || linkedShow.name}
                        </span>
                      )}
                      {expense.origin && expense.destination && (
                        <span className="text-zinc-500 truncate hidden sm:inline">
                          • {expense.origin} ➔ {expense.destination}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-sm font-black text-rose-400 tabular-nums">
                    -{formatCurrency(expense.amount)}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenModal(expense)}
                      className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id, expense.title)}
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

      {/* MODAL: REGISTRAR / EDITAR DESLOCAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <Car size={18} className="text-amber-400" />
                <span>{editingExpense ? 'Editar Deslocamento' : 'Novo Deslocamento & Locomoção'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Tipo de Despesa</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'fuel', label: 'Combustível' },
                    { id: 'mileage', label: 'KM Rodado' },
                    { id: 'uber', label: 'Uber / App' },
                    { id: 'toll', label: 'Pedágio' },
                    { id: 'parking', label: 'Estacionamento' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormType(t.id as any)}
                      className={`p-2 rounded-xl font-bold text-[11px] transition active:scale-95 ${
                        formType === t.id
                          ? 'bg-amber-500 text-zinc-950 font-black'
                          : 'bg-[#121214] text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* MODO KM RODADO: CALCULADORA AUTOMÁTICA */}
              {formType === 'mileage' && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1">
                    <Calculator size={13} />
                    Calculadora de Custo por KM
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-zinc-400 font-bold block mb-1">KM Total Rodado</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formKm}
                        onChange={(e) => handleKmChange(e.target.value)}
                        placeholder="Ex: 85"
                        className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-400 font-bold block mb-1">Valor por KM (R$)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={formPricePerKm}
                        onChange={(e) => handlePricePerKmChange(e.target.value)}
                        placeholder="Ex: 1.20"
                        className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-rose-400 font-black text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Descrição / Trajeto</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Ida e Volta Show São Paulo, Combustível Van..."
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Vincular a um Show (Opcional)</label>
                <select
                  value={formShowId}
                  onChange={(e) => setFormShowId(e.target.value)}
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Gasto Geral de Transporte da Carreira</option>
                  {shows.filter(s => s.status !== 'Cancelado').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.date} - {s.contractorName || s.name} ({s.location || s.city || 'Sem local'})
                    </option>
                  ))}
                </select>
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
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black uppercase tracking-wider"
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
