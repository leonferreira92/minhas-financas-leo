import React, { useState, useMemo } from 'react';
import { MusicianCrewMember } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { 
  Users, Plus, Phone, MessageSquare, Copy, Check, 
  Trash2, Edit3, Search, X, DollarSign, Award, Music, 
  CreditCard, Sparkles, AlertCircle
} from 'lucide-react';

interface Props {
  onSelectMember?: (member: MusicianCrewMember) => void;
}

export const CrewManagementView: React.FC<Props> = ({ onSelectMember }) => {
  const { crew, addCrewMember, updateCrewMember, deleteCrewMember, isBlurred } = useFinance();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MusicianCrewMember | null>(null);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('Bateria');
  const [formDefaultCache, setFormDefaultCache] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPixKey, setFormPixKey] = useState('');
  const [formPixKeyType, setFormPixKeyType] = useState<MusicianCrewMember['pixKeyType']>('CPF');
  const [formNotes, setFormNotes] = useState('');

  const formatCurrency = (val: number) => {
    if (isBlurred) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleOpenModal = (member?: MusicianCrewMember) => {
    if (member) {
      setEditingMember(member);
      setFormName(member.name || '');
      setFormRole(member.role || 'Bateria');
      setFormDefaultCache(member.defaultCache ? String(member.defaultCache) : '');
      setFormPhone(member.phone || '');
      setFormPixKey(member.pixKey || '');
      setFormPixKeyType(member.pixKeyType || 'CPF');
      setFormNotes(member.notes || '');
    } else {
      setEditingMember(null);
      setFormName('');
      setFormRole('Bateria');
      setFormDefaultCache('');
      setFormPhone('');
      setFormPixKey('');
      setFormPixKeyType('CPF');
      setFormNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const cacheNum = parseFloat(formDefaultCache.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

    const data: Omit<MusicianCrewMember, 'id' | 'createdAt'> = {
      name: formName.trim(),
      role: formRole.trim(),
      defaultCache: cacheNum,
      phone: formPhone.trim() || undefined,
      pixKey: formPixKey.trim() || undefined,
      pixKeyType: formPixKeyType,
      notes: formNotes.trim() || undefined
    };

    if (editingMember) {
      updateCrewMember({
        ...editingMember,
        ...data
      });
    } else {
      addCrewMember(data);
    }

    setIsModalOpen(false);
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o músico/técnico "${name}" da equipe?`)) {
      deleteCrewMember(id);
    }
  };

  const handleCopyPix = (key: string, memberId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedPixId(memberId);
    setTimeout(() => {
      setCopiedPixId(null);
    }, 2000);
  };

  const rolesList = [
    'Bateria', 'Contrabaixo', 'Guitarra', 'Violão', 
    'Teclado / Piano', 'Sanfona / Acordeon', 'Percussão', 
    'Metais (Sax/Trompete)', 'Backing Vocal', 'Técnico de Som', 
    'Roadie', 'Iluminador', 'Produtor / Road Manager'
  ];

  const filteredCrew = useMemo(() => {
    return crew.filter(m => {
      const matchSearch = searchTerm === '' ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.pixKey && m.pixKey.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = selectedRoleFilter === 'all' || m.role.toLowerCase().includes(selectedRoleFilter.toLowerCase());

      return matchSearch && matchRole;
    });
  }, [crew, searchTerm, selectedRoleFilter]);

  return (
    <div className="space-y-5">
      
      {/* HEADER DA ABA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121214] p-4 rounded-3xl border border-zinc-800">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
            <Users size={20} className="text-purple-400" />
            <span>Músicos & Equipe (Freelancers)</span>
          </h2>
          <p className="text-[11px] text-zinc-400">
            Cadastre músicos de apoio, técnicos, roadies, cachês padrão e chaves PIX para pagamento rápido.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-purple-500/20 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Novo Músico / Equipe</span>
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
            placeholder="Buscar por nome, instrumento ou chave PIX..."
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

        {/* Quick Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition active:scale-95 ${
              selectedRoleFilter === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white bg-[#121214]'
            }`}
          >
            Todos ({crew.length})
          </button>
          {['Bateria', 'Baixo', 'Teclado', 'Sanfona', 'Técnico'].map(role => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition active:scale-95 ${
                selectedRoleFilter === role
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white bg-[#121214]'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA EM CARDS */}
      {filteredCrew.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#121214] border border-dashed border-zinc-800 text-center space-y-3">
          <Users size={32} className="mx-auto text-zinc-600" />
          <p className="text-sm font-bold text-white">Nenhum músico ou integrante cadastrado</p>
          <p className="text-xs text-zinc-400">Cadastre bateristas, baixistas e equipe para agilizar o cálculo de custos dos shows.</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center space-x-1"
          >
            <Plus size={14} />
            <span>Cadastrar Primeiro Integrante</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCrew.map(member => {
            const cleanPhone = member.phone ? member.phone.replace(/\D/g, '') : '';
            const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;
            const isCopied = copiedPixId === member.id;

            return (
              <div
                key={member.id}
                className="p-4 sm:p-5 rounded-3xl bg-[#141416] border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between space-y-3 group shadow-xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {member.role}
                      </span>
                      <h3 className="text-base font-black text-white mt-1.5 group-hover:text-purple-400 transition-colors">
                        {member.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenModal(member)}
                        className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition"
                        title="Editar Músico"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id, member.name)}
                        className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
                        title="Remover da Equipe"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Cachê Padrão por Show */}
                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Cachê / Diária</span>
                    <span className="text-sm font-black text-emerald-400 tabular-nums">
                      {formatCurrency(member.defaultCache)}
                    </span>
                  </div>

                  {/* Chave PIX com 1-Click Copy */}
                  {member.pixKey && (
                    <div className="p-2.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                        <span>Chave PIX ({member.pixKeyType || 'Chave'}):</span>
                        <button
                          onClick={() => handleCopyPix(member.pixKey!, member.id)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ${
                            isCopied ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-purple-300 hover:bg-zinc-700'
                          }`}
                        >
                          {isCopied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} />}
                          <span>{isCopied ? 'Copiado!' : 'Copiar PIX'}</span>
                        </button>
                      </div>
                      <span className="text-xs font-mono font-bold text-zinc-200 block truncate">
                        {member.pixKey}
                      </span>
                    </div>
                  )}

                  {member.notes && (
                    <p className="text-[11px] text-zinc-400 bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/50 line-clamp-2">
                      {member.notes}
                    </p>
                  )}
                </div>

                {/* BOTÃO DE CONTATO WHATSAPP */}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition flex items-center justify-center space-x-1.5"
                  >
                    <MessageSquare size={14} />
                    <span>Falar no WhatsApp ({member.phone})</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181b] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <Users size={18} className="text-purple-400" />
                <span>{editingMember ? 'Editar Integrante' : 'Novo Integrante da Equipe'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3.5 text-xs">
              <div>
                <label className="text-zinc-400 font-bold block mb-1">Nome Completo / Artístico *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Rodrigo Bateria, Mateus Baixista..."
                  className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Função / Instrumento</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    {rolesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Cachê Padrão (R$) *</label>
                  <input
                    type="number"
                    required
                    value={formDefaultCache}
                    onChange={(e) => setFormDefaultCache(e.target.value)}
                    placeholder="Ex: 350"
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-bold text-emerald-400"
                  />
                </div>
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

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-zinc-400 font-bold block mb-1">Tipo de Chave</label>
                  <select
                    value={formPixKeyType}
                    onChange={(e) => setFormPixKeyType(e.target.value as any)}
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="CPF">CPF</option>
                    <option value="Email">E-mail</option>
                    <option value="Telefone">Celular</option>
                    <option value="Aleatória">Aleatória</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-zinc-400 font-bold block mb-1">Chave PIX</label>
                  <input
                    type="text"
                    value={formPixKey}
                    onChange={(e) => setFormPixKey(e.target.value)}
                    placeholder="Chave para transferir o cachê..."
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 font-bold block mb-1">Observações / Equipamentos</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Traz bateria e microfones próprios, usa fone in-ear..."
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
                  Salvar Músico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
