import React, { useState, useMemo } from 'react';
import { Venue, Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  Building2, Plus, MapPin, Phone, MessageSquare, DollarSign, 
  Trash2, Edit3, Search, X, Check, Music, ArrowUpRight, ExternalLink
} from 'lucide-react';
import { getShowFinancialSummary } from '../../services/showFinanceSyncService';

interface Props {
  onSelectVenue?: (venue: Venue) => void;
  onOpenCreateShowWithVenue?: (venueName: string, location?: string, city?: string, defaultCache?: number) => void;
}

export const VenuesManagementView: React.FC<Props> = ({
  onSelectVenue,
  onOpenCreateShowWithVenue
}) => {
  const { venues, shows, transactions, addVenue, updateVenue, deleteVenue, isBlurred } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDefaultCache, setFormDefaultCache] = useState<string>('');
  const [formCategory, setFormCategory] = useState<Venue['category']>('Bar / Pub');
  const [formNotes, setFormNotes] = useState('');

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Open modal for new venue or editing
  const handleOpenModal = (venue?: Venue) => {
    if (venue) {
      setEditingVenue(venue);
      setFormName(venue.name || '');
      setFormContactName(venue.contactName || '');
      setFormPhone(venue.phone || '');
      setFormCity(venue.city || '');
      setFormAddress(venue.address || '');
      setFormDefaultCache(venue.defaultCache ? String(venue.defaultCache) : '');
      setFormCategory(venue.category || 'Bar / Pub');
      setFormNotes(venue.notes || '');
    } else {
      setEditingVenue(null);
      setFormName('');
      setFormContactName('');
      setFormPhone('');
      setFormCity('');
      setFormAddress('');
      setFormDefaultCache('');
      setFormCategory('Bar / Pub');
      setFormNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const cacheNum = parseFloat(formDefaultCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

    const venueData: Omit<Venue, 'id' | 'createdAt'> = {
      name: formName.trim(),
      contactName: formContactName.trim() || undefined,
      phone: formPhone.trim() || undefined,
      city: formCity.trim() || undefined,
      address: formAddress.trim() || undefined,
      defaultCache: cacheNum > 0 ? cacheNum : undefined,
      category: formCategory,
      notes: formNotes.trim() || undefined
    };

    if (editingVenue) {
      updateVenue({
        ...editingVenue,
        ...venueData
      });
    } else {
      addVenue(venueData);
    }

    setIsModalOpen(false);
  };

  const handleDeleteVenue = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o local "${name}"?`)) {
      deleteVenue(id);
    }
  };

  // Filtered venues with shows count & accumulated revenue
  const enrichedVenues = useMemo(() => {
    return venues.map(v => {
      const vNameLower = v.name.toLowerCase();
      const venueShows = shows.filter(s => {
        const sLoc = (s.location || '').toLowerCase();
        const sContr = (s.contractorName || '').toLowerCase();
        const sName = (s.name || '').toLowerCase();
        return sLoc.includes(vNameLower) || sContr.includes(vNameLower) || sName.includes(vNameLower);
      });

      const totalShows = venueShows.length;
      const totalRevenue = venueShows.reduce((sum, s) => {
        const fin = getShowFinancialSummary(s, transactions);
        return sum + fin.totalContracted;
      }, 0);

      return {
        ...v,
        totalShows,
        totalRevenue
      };
    });
  }, [venues, shows, transactions]);

  const filteredVenues = useMemo(() => {
    return enrichedVenues.filter(v => {
      const matchSearch = searchTerm === '' || 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.city && v.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.contactName && v.contactName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategoryFilter === 'all' || v.category === selectedCategoryFilter;

      return matchSearch && matchCat;
    });
  }, [enrichedVenues, searchTerm, selectedCategoryFilter]);

  const categoriesList = ['Bar / Pub', 'Casa de Show', 'Restaurante', 'Espaço de Eventos', 'Prefeitura / Festival', 'Casamento / Privado', 'Outro'];

  return (
    <div className="space-y-5">
      
      {/* HEADER & BARRA DE AÇÕES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121214] p-4 rounded-3xl border border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
            <Building2 size={20} className="text-purple-400" />
            <span>Locais, Bares & Contratantes</span>
          </h2>
          <p className="text-[11px] text-zinc-400">
            Cadastre pubs, casas de eventos, donos de bares e históricos de cachê negociado.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-purple-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Novo Local / Bar</span>
        </button>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do bar, cidade ou contato..."
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

        {/* Categoria Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition active:scale-95 ${
              selectedCategoryFilter === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white bg-[#121214]'
            }`}
          >
            Todos ({venues.length})
          </button>
          {categoriesList.slice(0, 4).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition active:scale-95 ${
                selectedCategoryFilter === cat
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white bg-[#121214]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM DE LOCAIS EM CARDS RESPONSIVOS */}
      {filteredVenues.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121214] border border-dashed border-zinc-800 text-center space-y-3">
          <Building2 size={32} className="mx-auto text-zinc-600" />
          <p className="text-sm font-bold text-white">Nenhum local cadastrado ou encontrado</p>
          <p className="text-xs text-zinc-400">Cadastre seus bares frequentes para agilizar o lançamento de novos shows.</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center space-x-1"
          >
            <Plus size={14} />
            <span>Cadastrar Primeiro Local</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVenues.map(venue => {
            const cleanPhone = venue.phone ? venue.phone.replace(/\D/g, '') : '';
            const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

            return (
              <div
                key={venue.id}
                className="p-4 sm:p-5 rounded-3xl bg-[#141416] border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between space-y-3 group shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {venue.category || 'Bar / Pub'}
                      </span>
                      <h3 className="text-base font-black text-white mt-1.5 group-hover:text-purple-400 transition-colors">
                        {venue.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenModal(venue)}
                        className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
                        title="Editar Local"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteVenue(venue.id, venue.name)}
                        className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
                        title="Excluir Local"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Informações de Contato e Localização */}
                  <div className="space-y-1 text-xs text-zinc-400">
                    {venue.city && (
                      <div className="flex items-center space-x-1.5 text-zinc-300">
                        <MapPin size={13} className="text-purple-400 shrink-0" />
                        <span className="truncate">{venue.city}{venue.address ? ` • ${venue.address}` : ''}</span>
                      </div>
                    )}

                    {venue.contactName && (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-zinc-500">Contato:</span>
                        <span className="text-zinc-200 font-bold">{venue.contactName}</span>
                      </div>
                    )}
                  </div>

                  {/* Cachê Médio & Faturamento */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                    <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase block">Cachê Padrão</span>
                      <span className="text-xs font-black text-emerald-400 tabular-nums block mt-0.5">
                        {venue.defaultCache ? formatCurrency(venue.defaultCache) : 'A combinar'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase block">Shows Feitos</span>
                      <span className="text-xs font-black text-white tabular-nums block mt-0.5">
                        {venue.totalShows} {venue.totalShows === 1 ? 'show' : 'shows'}
                      </span>
                    </div>
                  </div>

                  {venue.notes && (
                    <p className="text-[11px] text-zinc-400 bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/60 line-clamp-2">
                      {venue.notes}
                    </p>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO RÁPIDA (WHATSAPP E AGENDAR SHOW) */}
                <div className="flex items-center space-x-2 pt-2 border-t border-zinc-800">
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition flex items-center justify-center shrink-0"
                      title="Chamar no WhatsApp"
                    >
                      <MessageSquare size={15} />
                    </a>
                  )}

                  {onOpenCreateShowWithVenue && (
                    <button
                      onClick={() => onOpenCreateShowWithVenue(venue.name, venue.address, venue.city, venue.defaultCache)}
                      className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1"
                    >
                      <Music size={13} />
                      <span>Agendar Show Aqui</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DE LOCAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <Building2 size={18} className="text-purple-400" />
                <span>{editingVenue ? 'Editar Local' : 'Novo Local / Bar'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveVenue} className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Nome do Estabelecimento / Bar *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Bar do Zé, Villa Country, Salão Nobre..."
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Categoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    {categoriesList.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Cachê Médio (R$)</label>
                  <input
                    type="number"
                    value={formDefaultCache}
                    onChange={(e) => setFormDefaultCache(e.target.value)}
                    placeholder="Ex: 1500"
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Nome do Responsável</label>
                  <input
                    type="text"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    placeholder="Ex: Marcos Gerente"
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Ex: São Paulo - SP"
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Endereço / Bairro</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Rua, Bairro..."
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Observações / Estrutura de Som</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Possui PA no local, passagem de som 1h antes, alimentação inclusa..."
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
                  Salvar Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
