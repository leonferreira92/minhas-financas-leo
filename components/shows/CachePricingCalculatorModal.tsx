import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, X, Plus, Trash2, DollarSign, Users, 
  Truck, Utensils, Percent, CheckCircle2, Sparkles, ArrowRight,
  ShieldCheck, FilePlus, Copy, MessageSquare, Calendar, MapPin, 
  Clock, Settings, Check, Share2, Sliders, Fuel, Music
} from 'lucide-react';
import { parseCurrencyInput } from '../../services/financeAggregator';
import { useFinance } from '../../context/FinanceContext';
import { ShowStatus } from '../../types';
import { getLocalDateString } from '../../services/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateQuote?: (totalCache: number, contractorName?: string, notes?: string, date?: string, location?: string) => void;
}

export interface SupportMusician {
  id: string;
  name: string;
  amount: number;
}

export interface SmartCachePresets {
  hourlyRates: Record<string, number>;
  kmCost: number;
  reservePercent: number;
}

const STORAGE_PRESETS_KEY = 'smart_cache_360_presets';

const DEFAULT_PRESETS: SmartCachePresets = {
  hourlyRates: {
    'Voz e Violão': 80,
    'Duo': 120,
    'Banda': 200,
  },
  kmCost: 1.50,
  reservePercent: 10,
};

export const CachePricingCalculatorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreateQuote
}) => {
  const { addShow } = useFinance();

  // Tab mode: 'calculator' | 'presets'
  const [activeSubTab, setActiveSubTab] = useState<'calculator' | 'presets'>('calculator');

  // Load Presets from LocalStorage
  const [presets, setPresets] = useState<SmartCachePresets>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PRESETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          hourlyRates: { ...DEFAULT_PRESETS.hourlyRates, ...(parsed.hourlyRates || {}) },
          kmCost: Number(parsed.kmCost) || DEFAULT_PRESETS.kmCost,
          reservePercent: Number(parsed.reservePercent) || DEFAULT_PRESETS.reservePercent,
        };
      }
    } catch (e) {
      console.error('Erro ao carregar presets do Smart Cachê 360', e);
    }
    return DEFAULT_PRESETS;
  });

  // Preset Editor Form State
  const [presetRates, setPresetRates] = useState<Record<string, string>>({
    'Voz e Violão': String(presets.hourlyRates['Voz e Violão'] || 80),
    'Duo': String(presets.hourlyRates['Duo'] || 120),
    'Banda': String(presets.hourlyRates['Banda'] || 200),
  });
  const [presetKmCostInput, setPresetKmCostInput] = useState(String(presets.kmCost));
  const [presetReserveInput, setPresetReserveInput] = useState(String(presets.reservePercent));
  const [presetSaveSuccess, setPresetSaveSuccess] = useState(false);

  // --- CALCULATOR INPUTS ---
  const [selectedFormat, setSelectedFormat] = useState<string>('Voz e Violão');
  const [showHoursInput, setShowHoursInput] = useState<string>('2');

  // Tempo Dedicado
  const [travelTimeMinutesInput, setTravelTimeMinutesInput] = useState<string>('60');
  const [soundcheckTimeMinutesInput, setSoundcheckTimeMinutesInput] = useState<string>('60');

  // Modelo Flexível de Receita
  const [revenueModel, setRevenueModel] = useState<'fixed' | 'couvert' | 'hybrid'>('fixed');
  const [estimatedPeopleInput, setEstimatedPeopleInput] = useState<string>('80');
  const [couvertPriceInput, setCouvertPriceInput] = useState<string>('15');
  const [guaranteedMinCacheInput, setGuaranteedMinCacheInput] = useState<string>('500');
  const [couvertPercentageInput, setCouvertPercentageInput] = useState<string>('100');

  // Deslocamento & Combustível (Veículo Próprio)
  const [totalKmInput, setTotalKmInput] = useState<string>('40');
  const [carKmPerLiterInput, setCarKmPerLiterInput] = useState<string>('10');
  const [fuelPricePerLiterInput, setFuelPricePerLiterInput] = useState<string>('6.00');
  const [tollAmountInput, setTollAmountInput] = useState<string>('15');
  const [costPerKmInput, setCostPerKmInput] = useState<string>(String(presets.kmCost));

  // Fundo de Depreciação / Reserva para Equipamento
  const [equipmentReserveFixedInput, setEquipmentReserveFixedInput] = useState<string>('20');

  // Custos Diretos
  const [foodCostInput, setFoodCostInput] = useState<string>('50');
  const [otherCostsInput, setOtherCostsInput] = useState<string>('0');
  
  // Músicos de Apoio
  const [supportMusicians, setSupportMusicians] = useState<SupportMusician[]>([
    { id: '1', name: 'Músico de Apoio / Percussão', amount: 200 }
  ]);
  const [newMusicianName, setNewMusicianName] = useState('');
  const [newMusicianAmount, setNewMusicianAmount] = useState('');

  // Ajustes Finais
  const [hourlyRateInput, setHourlyRateInput] = useState<string>(
    String(presets.hourlyRates['Voz e Violão'] || 80)
  );
  const [reservePercent, setReservePercent] = useState<number>(presets.reservePercent);
  const [commissionPercentInput, setCommissionPercentInput] = useState<string>('10');

  // --- SEÇÃO PROPOSTA & MENSAGEM ---
  const [showProposalSection, setShowProposalSection] = useState(false);
  const [contractorName, setContractorName] = useState('');
  const [contractorPhone, setContractorPhone] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return getLocalDateString(d);
  });
  const [eventTime, setEventTime] = useState('20:00');
  const [paymentTerms, setPaymentTerms] = useState('50% na reserva via PIX e 50% após o show');

  // Copy feedback
  const [copySuccess, setCopySuccess] = useState(false);
  const [savedToAgendaSuccess, setSavedToAgendaSuccess] = useState(false);

  // Whenever format changes, auto-update hourly rate input from presets
  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
    const rate = presets.hourlyRates[format] ?? 80;
    setHourlyRateInput(String(rate));
  };

  // Add Support Musician
  const handleAddSupportMusician = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseCurrencyInput(newMusicianAmount);
    if (!newMusicianName.trim() || val <= 0) return;

    setSupportMusicians(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newMusicianName.trim(),
        amount: val
      }
    ]);
    setNewMusicianName('');
    setNewMusicianAmount('');
  };

  const handleRemoveMusician = (id: string) => {
    setSupportMusicians(prev => prev.filter(m => m.id !== id));
  };

  // --- FINANCIAL FORMULA (CÁLCULO REVERSO E MÉTRICAS INTEGRADAS) ---
  const calculations = useMemo(() => {
    const showHours = Math.max(0.5, parseFloat(showHoursInput) || 0);
    const travelMins = Math.max(0, parseFloat(travelTimeMinutesInput) || 0);
    const soundcheckMins = Math.max(0, parseFloat(soundcheckTimeMinutesInput) || 0);
    const totalTimeHours = Math.max(0.5, Math.round((showHours + (travelMins / 60) + (soundcheckMins / 60)) * 10) / 10);

    // Logística Veículo Próprio
    const totalKm = Math.max(0, parseFloat(totalKmInput) || 0);
    const kmPerLiter = Math.max(0.1, parseFloat(carKmPerLiterInput) || 10);
    const fuelPrice = Math.max(0, parseCurrencyInput(fuelPricePerLiterInput));
    const tollVal = Math.max(0, parseCurrencyInput(tollAmountInput));
    const calculatedFuelCost = (totalKm / kmPerLiter) * fuelPrice;
    const kmTotalCost = calculatedFuelCost + tollVal;

    // Fundo de Depreciação / Reserva de Equipamento
    const equipmentReserveVal = Math.max(0, parseCurrencyInput(equipmentReserveFixedInput));

    // Direct Costs
    const foodCost = Math.max(0, parseCurrencyInput(foodCostInput));
    const otherCosts = Math.max(0, parseCurrencyInput(otherCostsInput));
    const musiciansTotalCost = supportMusicians.reduce((acc, m) => acc + m.amount, 0);

    // 1. Custo Operacional
    const operationalCost = kmTotalCost + foodCost + otherCosts + musiciansTotalCost + equipmentReserveVal;

    // 2. Mão de Obra Artista
    const hourlyRate = Math.max(0, parseCurrencyInput(hourlyRateInput));
    const artistLaborCost = hourlyRate * showHours;

    // 3. Subtotal
    const subtotal = operationalCost + artistLaborCost;

    // 4. Valor com Reserva de Segurança
    const reserveRatio = Math.max(0, reservePercent) / 100;
    const valueWithReserve = subtotal * (1 + reserveRatio);
    const reserveValue = valueWithReserve - subtotal;

    // 5. CACHÊ BASE CALCULADO
    const commPercentNum = Math.min(90, Math.max(0, parseCurrencyInput(commissionPercentInput)));
    const commRatio = commPercentNum / 100;
    const calculatedBaseCache = commRatio < 1 ? valueWithReserve / (1 - commRatio) : valueWithReserve;

    // Cálculo por Modelo de Receita
    const people = Math.max(0, parseFloat(estimatedPeopleInput) || 0);
    const cPrice = Math.max(0, parseCurrencyInput(couvertPriceInput));
    const minCache = Math.max(0, parseCurrencyInput(guaranteedMinCacheInput));
    const cPct = Math.max(0, parseFloat(couvertPercentageInput) || 100) / 100;

    let finalRevenue = calculatedBaseCache;
    if (revenueModel === 'couvert') {
      finalRevenue = people * cPrice;
    } else if (revenueModel === 'hybrid') {
      finalRevenue = minCache + (people * cPrice * cPct);
    }

    const recommendedCache = Math.max(1, Math.round(finalRevenue * 100) / 100);
    const commissionValue = recommendedCache > valueWithReserve ? recommendedCache - valueWithReserve : 0;

    // Lucro Líquido no Bolso (após todas as despesas e reserva de equipamento)
    const netProfitInPocket = Math.round((recommendedCache - operationalCost) * 100) / 100;
    const netProfitAfterEquipmentReserve = Math.round((netProfitInPocket - equipmentReserveVal) * 100) / 100;

    // Lucro por Hora Trabalhada
    const profitPerHour = Math.round((netProfitInPocket / totalTimeHours) * 100) / 100;

    return {
      showHours,
      travelMins,
      soundcheckMins,
      totalTimeHours,
      totalKm,
      kmPerLiter,
      fuelPrice,
      tollVal,
      calculatedFuelCost,
      kmTotalCost,
      foodCost,
      otherCosts,
      musiciansTotalCost,
      equipmentReserveVal,
      operationalCost,
      hourlyRate,
      artistLaborCost,
      subtotal,
      reserveRatio,
      reserveValue,
      valueWithReserve,
      commPercentNum,
      commissionValue,
      people,
      cPrice,
      minCache,
      cPct,
      recommendedCache,
      netProfitInPocket,
      netProfitAfterEquipmentReserve,
      profitPerHour
    };
  }, [
    showHoursInput, travelTimeMinutesInput, soundcheckTimeMinutesInput,
    totalKmInput, carKmPerLiterInput, fuelPricePerLiterInput, tollAmountInput,
    foodCostInput, otherCostsInput, supportMusicians, hourlyRateInput,
    reservePercent, commissionPercentInput, revenueModel, estimatedPeopleInput,
    couvertPriceInput, guaranteedMinCacheInput, couvertPercentageInput, equipmentReserveFixedInput
  ]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Save presets to localStorage
  const handleSavePresets = () => {
    const updatedRates: Record<string, number> = {};
    Object.keys(presetRates).forEach(key => {
      updatedRates[key] = parseCurrencyInput(presetRates[key]);
    });

    const newPresets: SmartCachePresets = {
      hourlyRates: updatedRates,
      kmCost: parseCurrencyInput(presetKmCostInput) || 1.5,
      reservePercent: Math.min(20, Math.max(0, parseFloat(presetReserveInput) || 10)),
    };

    setPresets(newPresets);
    try {
      localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(newPresets));
      setPresetSaveSuccess(true);
      setTimeout(() => setPresetSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Erro ao salvar presets', e);
    }
  };

  // --- GENERATED PROPOSAL TEXT ---
  const proposalFormattedText = useMemo(() => {
    const dateFormatted = eventDate ? eventDate.split('-').reverse().join('/') : 'A definir';
    const clientGreeting = contractorName.trim() ? `Olá, ${contractorName.trim()}!` : 'Olá!';

    return `${clientGreeting} Tudo bem? 🎶

Segue a proposta comercial para a apresentação musical:

📅 Data: ${dateFormatted}${eventTime ? ` às ${eventTime}` : ''}
📍 Local: ${eventLocation.trim() || 'A combinar'}
🎤 Formato: ${selectedFormat} (${calculations.showHours}h de show)

💰 Cachê Comercial: ${formatCurrency(calculations.recommendedCache)}
💳 Condições de Pagamento: ${paymentTerms}

✨ O valor contempla toda a estrutura, logística e suporte técnico para uma apresentação impecável.

Fico à disposição para confirmar a data na agenda! 🚀`;
  }, [
    contractorName, eventDate, eventTime, eventLocation,
    selectedFormat, calculations, paymentTerms
  ]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(proposalFormattedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar', err);
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = contractorPhone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(proposalFormattedText);
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const handleSaveToAgenda = () => {
    const dateStr = eventDate || new Date().toISOString().split('T')[0];
    const notesSummary = `Orçamento gerado via Smart Cachê 360:
- Formato: ${selectedFormat} (${calculations.showHours}h)
- Lucro Líquido Artista: ${formatCurrency(calculations.netProfitInPocket)}
- Custos Operacionais: ${formatCurrency(calculations.operationalCost)}
- Fundo de Reserva (${reservePercent}%): ${formatCurrency(calculations.reserveValue)}
- Comissão (${calculations.commPercentNum}%): ${formatCurrency(calculations.commissionValue)}
- Condições: ${paymentTerms}`;

    if (onCreateQuote) {
      onCreateQuote(
        calculations.recommendedCache,
        contractorName || selectedFormat,
        notesSummary,
        dateStr,
        eventLocation
      );
    } else {
      addShow({
        name: `${selectedFormat} - ${contractorName || 'Orçamento'}`,
        contractorName: contractorName || 'A definir',
        location: eventLocation || 'A definir',
        date: dateStr,
        time: eventTime || '20:00',
        totalCache: calculations.recommendedCache,
        status: 'Orçamento' as ShowStatus,
        notes: notesSummary
      });
    }

    setSavedToAgendaSuccess(true);
    setTimeout(() => {
      setSavedToAgendaSuccess(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-3 sm:p-4 animate-fade-in max-w-full overflow-x-hidden">
      <div className="bg-[#121212] text-slate-100 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-[#2a2a2a] p-5 sm:p-7 animate-slide-up max-h-[92vh] overflow-y-auto no-scrollbar space-y-6">
        
        {/* HEADER SPOTIFY STYLE */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272a]">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1ed760] text-black flex items-center justify-center shadow-lg shadow-[#1ed760]/20 font-black">
              <Calculator size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1ed760] block">
                  Smart Cachê 360
                </span>
                <span className="text-[9px] font-bold uppercase bg-[#181818] text-slate-400 px-2 py-0.5 rounded-full border border-[#27272a]">
                  Pro
                </span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Calculadora & Precificação Inteligente
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveSubTab(prev => prev === 'calculator' ? 'presets' : 'calculator')}
              className={`p-2.5 rounded-2xl border text-xs font-bold transition flex items-center space-x-1.5 ${
                activeSubTab === 'presets'
                  ? 'bg-[#1ed760] text-black border-[#1ed760]'
                  : 'bg-[#181818] text-slate-300 border-[#27272a] hover:border-[#3f3f46]'
              }`}
              title="Configurações de Presets"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Presets</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white rounded-2xl bg-[#181818] hover:bg-[#27272a] border border-[#27272a] transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* EDITOR DE PRESETS (SE SELECIONADO) */}
        {activeSubTab === 'presets' ? (
          <div className="space-y-5 p-5 rounded-3xl bg-[#181818] border border-[#27272a]">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center space-x-2 text-[#1ed760]">
                <Sliders size={18} />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Configurações de Valores Padrão (Presets)
                </h4>
              </div>
              <button
                onClick={() => setActiveSubTab('calculator')}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Voltar à Calculadora
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Personalize sua hora técnica por formato, custo de combustível por KM e percentual de reserva padrão. Esses valores serão salvos automaticamente no seu navegador.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Hora Técnica: Voz e Violão (R$/h)
                </label>
                <input
                  type="text"
                  value={presetRates['Voz e Violão'] || ''}
                  onChange={e => setPresetRates(r => ({ ...r, 'Voz e Violão': e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-[#27272a] text-sm font-bold text-white outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Hora Técnica: Duo (R$/h)
                </label>
                <input
                  type="text"
                  value={presetRates['Duo'] || ''}
                  onChange={e => setPresetRates(r => ({ ...r, 'Duo': e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-[#27272a] text-sm font-bold text-white outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Hora Técnica: Banda (R$/h)
                </label>
                <input
                  type="text"
                  value={presetRates['Banda'] || ''}
                  onChange={e => setPresetRates(r => ({ ...r, 'Banda': e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-[#27272a] text-sm font-bold text-white outline-none focus:border-[#1ed760]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Custo Padrão por KM Rodado (R$/km)
                </label>
                <input
                  type="text"
                  value={presetKmCostInput}
                  onChange={e => setPresetKmCostInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-[#27272a] text-sm font-bold text-white outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Fundo de Reserva / Equipamentos (%)
                </label>
                <input
                  type="text"
                  value={presetReserveInput}
                  onChange={e => setPresetReserveInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-[#27272a] text-sm font-bold text-white outline-none focus:border-[#1ed760]"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-[#27272a]">
              {presetSaveSuccess ? (
                <span className="text-xs text-[#1ed760] font-bold flex items-center space-x-1">
                  <Check size={14} />
                  <span>Presets salvos com sucesso!</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Salvo no armazenamento local.</span>
              )}

              <button
                type="button"
                onClick={handleSavePresets}
                className="px-5 py-2.5 rounded-xl bg-[#1ed760] hover:bg-[#22c55e] text-black text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md shadow-[#1ed760]/20"
              >
                Salvar Presets
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* HERO SUMMARY CARD (O CACHÊ RECOMENDADO EM DESTAQUE SPOTIFY + MÉTRICA POR HORA) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#121212] via-[#152e1b] to-[#121212] border border-[#22c55e]/40 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none text-[#1ed760]">
                <Music size={120} />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1ed760] block">
                      Cachê Final Recomendado
                    </span>
                    <span className="text-[9px] font-black uppercase bg-[#1ed760]/20 text-[#1ed760] px-2 py-0.5 rounded-full border border-[#1ed760]/30">
                      {revenueModel === 'fixed' ? 'Cachê Fixo' : revenueModel === 'couvert' ? 'Couvert Artístico' : 'Híbrido'}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight mt-1">
                    {formatCurrency(calculations.recommendedCache)}
                  </div>

                  <p className="text-[11px] text-slate-300 mt-1">
                    Garante <strong className="text-[#1ed760] font-black">{formatCurrency(calculations.netProfitInPocket)}</strong> no seu bolso (<strong>{formatCurrency(calculations.profitPerHour)}/hora</strong> para {calculations.totalTimeHours}h dedicadas).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowProposalSection(prev => !prev)}
                  className="px-5 py-3 rounded-2xl bg-[#1ed760] hover:bg-[#22c55e] text-black text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-lg shadow-[#1ed760]/20 flex items-center justify-center space-x-2 shrink-0"
                >
                  <MessageSquare size={16} strokeWidth={2.5} />
                  <span>{showProposalSection ? 'Ocultar Proposta' : 'Gerar Proposta p/ WhatsApp'}</span>
                </button>
              </div>

              {/* DETALHAMENTO EM MINI BADGES INCLUINDO MÉTRICA DE LUCRO POR HORA */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-[#27272a] text-[11px] relative z-10">
                <div className="p-2.5 rounded-xl bg-[#181818]/80 border border-[#27272a] space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Custos Operacionais</span>
                  <span className="text-xs font-black text-rose-400 tabular-nums">{formatCurrency(calculations.operationalCost)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#181818]/80 border border-[#27272a] space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Mão de Obra ({calculations.showHours}h)</span>
                  <span className="text-xs font-black text-sky-400 tabular-nums">{formatCurrency(calculations.artistLaborCost)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#181818]/80 border border-[#27272a] space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Reserva Equip.</span>
                  <span className="text-xs font-black text-amber-400 tabular-nums">{formatCurrency(calculations.equipmentReserveVal)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#181818]/80 border border-[#27272a] space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Tempo Total</span>
                  <span className="text-xs font-black text-purple-300 tabular-nums">{calculations.totalTimeHours}h dedicadas</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#1ed760]/10 border border-[#1ed760]/30 space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[9px] font-black uppercase text-[#1ed760] block">Lucro / Hora</span>
                  <span className="text-xs font-black text-[#1ed760] tabular-nums">{formatCurrency(calculations.profitPerHour)}/h</span>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE ENTRADAS INTELIGENTES E CONFIGURAÇÃO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* BLOCO 1: MODELO DE RECEITA & TEMPO DEDICADO */}
              <div className="p-4 rounded-2xl bg-[#181818] border border-[#27272a] space-y-3.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <Sparkles size={15} className="text-[#1ed760]" />
                  <span>1. Modelo de Receita & Tempo Dedicado</span>
                </h4>

                {/* Seleção do Modelo de Receita */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Formato de Recebimento
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'fixed', label: 'Cachê Fixo' },
                      { id: 'couvert', label: 'Couvert Artístico' },
                      { id: 'hybrid', label: 'Híbrido' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setRevenueModel(m.id as any)}
                        className={`py-2 px-1.5 rounded-xl text-xs font-black transition border ${
                          revenueModel === m.id
                            ? 'bg-[#1ed760] text-black border-[#1ed760]'
                            : 'bg-[#121212] text-slate-300 border-[#27272a] hover:border-[#3f3f46]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parâmetros Específicos do Modelo de Receita */}
                {revenueModel === 'couvert' && (
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#27272a] grid grid-cols-2 gap-2 animate-fade-in">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                        Pessoas Estimadas
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={estimatedPeopleInput}
                        onChange={e => setEstimatedPeopleInput(e.target.value)}
                        placeholder="Ex: 80"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                        Valor Couvert (R$/pessoa)
                      </label>
                      <input
                        type="text"
                        value={couvertPriceInput}
                        onChange={e => setCouvertPriceInput(e.target.value)}
                        placeholder="Ex: 15,00"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-[#1ed760] outline-none focus:border-[#1ed760]"
                      />
                    </div>
                  </div>
                )}

                {revenueModel === 'hybrid' && (
                  <div className="p-3 rounded-xl bg-[#121212] border border-[#27272a] grid grid-cols-2 gap-2 animate-fade-in">
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                        Cachê Mínimo Garantido (R$)
                      </label>
                      <input
                        type="text"
                        value={guaranteedMinCacheInput}
                        onChange={e => setGuaranteedMinCacheInput(e.target.value)}
                        placeholder="Ex: 500,00"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-[#1ed760] outline-none focus:border-[#1ed760]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                        Couvert p/ Pessoa (R$)
                      </label>
                      <input
                        type="text"
                        value={couvertPriceInput}
                        onChange={e => setCouvertPriceInput(e.target.value)}
                        placeholder="Ex: 15,00"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                        Pessoas Estimadas
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={estimatedPeopleInput}
                        onChange={e => setEstimatedPeopleInput(e.target.value)}
                        placeholder="Ex: 80"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-0.5">
                        % Repasse do Couvert
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={couvertPercentageInput}
                        onChange={e => setCouvertPercentageInput(e.target.value)}
                        placeholder="Ex: 100%"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                      />
                    </div>
                  </div>
                )}

                {/* Formato do Show (Voz e Violão, Duo, Banda) */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Formato Artístico
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Voz e Violão', 'Duo', 'Banda'].map(fmt => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => handleFormatChange(fmt)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition border ${
                          selectedFormat === fmt
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-[#121212] text-slate-400 border-[#27272a]'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tempo Dedicado (Deslocamento, Passagem de Som, Show) */}
                <div className="p-3 rounded-xl bg-[#121212] border border-[#27272a] space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">
                    Métrica de Tempo Dedicado
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5">
                        Deslocamento (min)
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={travelTimeMinutesInput}
                        onChange={e => setTravelTimeMinutesInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5">
                        Montagem (min)
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="0"
                        value={soundcheckTimeMinutesInput}
                        onChange={e => setSoundcheckTimeMinutesInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 mb-0.5">
                        Show (Horas)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={showHoursInput}
                        onChange={e => setShowHoursInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-300">
                    <span>Tempo Total Dedicado: <strong className="text-purple-300">{calculations.totalTimeHours} horas</strong></span>
                    <span className="font-bold text-[#1ed760]">{formatCurrency(calculations.profitPerHour)} / hora</span>
                  </div>
                </div>
              </div>

              {/* BLOCO 2: LOGÍSTICA INTELIGENTE (VEÍCULO PRÓPRIO) */}
              <div className="p-4 rounded-2xl bg-[#181818] border border-[#27272a] space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                    <Truck size={15} className="text-sky-400" />
                    <span>2. Logística (Veículo Próprio)</span>
                  </h4>
                  <span className="text-xs font-black text-sky-400 tabular-nums">
                    Total: {formatCurrency(calculations.kmTotalCost)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Distância Total (KM Ida/Volta)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalKmInput}
                      onChange={e => setTotalKmInput(e.target.value)}
                      placeholder="Ex: 80"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Consumo Carro (KM/L)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={carKmPerLiterInput}
                      onChange={e => setCarKmPerLiterInput(e.target.value)}
                      placeholder="Ex: 10"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Preço Litro Combustível (R$)
                    </label>
                    <input
                      type="text"
                      value={fuelPricePerLiterInput}
                      onChange={e => setFuelPricePerLiterInput(e.target.value)}
                      placeholder="Ex: 6.00"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Pedágios Totais (R$)
                    </label>
                    <input
                      type="text"
                      value={tollAmountInput}
                      onChange={e => setTollAmountInput(e.target.value)}
                      placeholder="Ex: 15.00"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#121212] border border-[#27272a] space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Fórmula Combustível:</span>
                    <span>({calculations.totalKm} km / {calculations.kmPerLiter} km/l) × {formatCurrency(calculations.fuelPrice)} = <strong className="text-white">{formatCurrency(calculations.calculatedFuelCost)}</strong></span>
                  </div>
                  <div className="flex justify-between text-sky-400 font-bold border-t border-[#27272a] pt-1">
                    <span>Combustível + Pedágio:</span>
                    <span className="tabular-nums">{formatCurrency(calculations.kmTotalCost)}</span>
                  </div>
                </div>

                {/* FUNDO DE DEPRECIAÇÃO / RESERVA PARA EQUIPAMENTO */}
                <div className="p-3 rounded-xl bg-[#121212] border border-amber-500/30 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase text-amber-400">
                      Fundo de Reserva / Depreciação (Equipamento)
                    </label>
                    <span className="text-xs font-black text-amber-400 tabular-nums">
                      {formatCurrency(calculations.equipmentReserveVal)}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={equipmentReserveFixedInput}
                    onChange={e => setEquipmentReserveFixedInput(e.target.value)}
                    placeholder="Ex: 20.00"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#181818] border border-[#27272a] text-xs font-bold text-amber-300 outline-none focus:border-amber-400"
                  />
                  <p className="text-[9px] text-slate-400">
                    Valor acumulado para substituição e manutenção de instrumentos e cabos.
                  </p>
                </div>
              </div>

            </div>

            {/* BLOCO 3: CUSTOS DIRETO ADICIONAIS & MÚSICOS DE APOIO */}
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#27272a] space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <Users size={15} className="text-purple-400" />
                  <span>3. Insumos & Músicos de Apoio</span>
                </h4>
                <span className="text-xs font-black text-rose-400 tabular-nums">
                  Outros Custos: {formatCurrency(calculations.foodCost + calculations.otherCosts + calculations.musiciansTotalCost)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Alimentação / Insumos (R$)
                  </label>
                  <input
                    type="text"
                    value={foodCostInput}
                    onChange={e => setFoodCostInput(e.target.value)}
                    placeholder="Ex: 50"
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Outros Custos / Som (R$)
                  </label>
                  <input
                    type="text"
                    value={otherCostsInput}
                    onChange={e => setOtherCostsInput(e.target.value)}
                    placeholder="Ex: 100"
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                  />
                </div>
              </div>

              {/* Músicos de Apoio (Adicionar Múltiplos) */}
              <div className="space-y-2 pt-2 border-t border-[#27272a]">
                <span className="text-[10px] font-black uppercase text-slate-400 block">
                  Músicos de Apoio / Freelas ({supportMusicians.length})
                </span>

                <form onSubmit={handleAddSupportMusician} className="flex gap-2">
                  <input
                    type="text"
                    value={newMusicianName}
                    onChange={e => setNewMusicianName(e.target.value)}
                    placeholder="Ex: Baterista / Roadie"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                  />
                  <input
                    type="text"
                    value={newMusicianAmount}
                    onChange={e => setNewMusicianAmount(e.target.value)}
                    placeholder="R$ 200"
                    className="w-24 px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-black uppercase tracking-wider transition shrink-0 flex items-center space-x-1"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </form>

                {supportMusicians.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
                    {supportMusicians.map(mus => (
                      <div
                        key={mus.id}
                        className="p-2 rounded-xl bg-[#121212] border border-[#27272a] flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-300">{mus.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-purple-400 tabular-nums">
                            {formatCurrency(mus.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMusician(mus.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BLOCO 4: AJUSTES FINAIS (RESERVA & COMISSÃO) */}
            <div className="p-4 rounded-2xl bg-[#181818] border border-[#27272a] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Fundo de Reserva / Depreciação ({reservePercent}%)
                  </label>
                  <span className="text-xs font-black text-amber-400 tabular-nums">
                    {formatCurrency(calculations.reserveValue)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={reservePercent}
                  onChange={e => setReservePercent(Number(e.target.value))}
                  className="w-full accent-[#1ed760] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                  Comissão de Agência / Casa (%)
                </label>
                <input
                  type="text"
                  value={commissionPercentInput}
                  onChange={e => setCommissionPercentInput(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-purple-400 outline-none focus:border-[#1ed760]"
                />
              </div>
            </div>

            {/* SEÇÃO PROPOSTA & MENSAGEM WHATSAPP (EXPANSÍVEL) */}
            {showProposalSection && (
              <div className="p-5 rounded-3xl bg-[#181818] border border-[#1ed760]/40 space-y-4 animate-slide-up">
                <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
                  <div className="flex items-center space-x-2 text-[#1ed760]">
                    <MessageSquare size={18} />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      Gerador de Proposta Comercial para WhatsApp
                    </h4>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-[#1ed760]/10 text-[#1ed760] px-2.5 py-0.5 rounded-full border border-[#1ed760]/30">
                    Pronto p/ Envio
                  </span>
                </div>

                {/* Campos de Contexto Rápido */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Nome do Contratante / Local
                    </label>
                    <input
                      type="text"
                      value={contractorName}
                      onChange={e => setContractorName(e.target.value)}
                      placeholder="Ex: Bar do Zé"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      WhatsApp (Com DDD)
                    </label>
                    <input
                      type="text"
                      value={contractorPhone}
                      onChange={e => setContractorPhone(e.target.value)}
                      placeholder="(11) 99999-8888"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Local / Cidade
                    </label>
                    <input
                      type="text"
                      value={eventLocation}
                      onChange={e => setEventLocation(e.target.value)}
                      placeholder="Ex: São Paulo - SP"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Data do Evento
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Horário do Show
                    </label>
                    <input
                      type="text"
                      value={eventTime}
                      onChange={e => setEventTime(e.target.value)}
                      placeholder="20:00"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Condições de Pagamento
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      placeholder="Ex: 50% na reserva via PIX e 50% após o show"
                      className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272a] text-xs font-bold text-white outline-none focus:border-[#1ed760]"
                    />
                  </div>
                </div>

                {/* AREA PREVIEW DA MENSAGEM */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    Preview da Mensagem
                  </label>
                  <pre className="w-full p-4 rounded-2xl bg-[#09090b] border border-[#27272a] text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-all">
                    {proposalFormattedText}
                  </pre>
                </div>

                {/* BOTÕES DE AÇÃO DA PROPOSTA */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="px-4 py-2.5 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-bold transition flex items-center space-x-1.5 active:scale-95"
                    >
                      {copySuccess ? <Check size={15} className="text-[#1ed760]" /> : <Copy size={15} />}
                      <span>{copySuccess ? 'Copiado!' : 'Copiar Texto'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="px-4 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#1ed760] text-black text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 shadow-md shadow-[#22c55e]/20 active:scale-95"
                    >
                      <Share2 size={15} />
                      <span>Enviar pelo WhatsApp</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveToAgenda}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 shadow-md active:scale-95"
                  >
                    {savedToAgendaSuccess ? <Check size={15} /> : <FilePlus size={15} />}
                    <span>{savedToAgendaSuccess ? 'Salvo na Agenda!' : 'Salvar como Orçamento na Agenda'}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* FOOTER */}
        <div className="pt-3 border-t border-[#27272a] flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Calculadora Reversa Smart Cachê 360 • Precificação sem Prejuízos
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#181818] hover:bg-[#27272a] text-slate-300 text-xs font-bold uppercase tracking-wider border border-[#27272a] transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
