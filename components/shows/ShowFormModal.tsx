import React, { useState, useEffect } from 'react';
import { Show, ShowStatus } from '../../types';
import { 
  X, Calendar, Clock, MapPin, User, DollarSign, 
  FileText, AlertTriangle, Check, Sparkles, AlertCircle 
} from 'lucide-react';
import { EVENT_TYPES, SHOW_STATUSES } from './types';
import { checkScheduleConflict, ConflictResult } from './conflictHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (showData: Partial<Show>) => void;
  existingShow?: Show | null;
  existingShows: Show[];
  prefilledDate?: string;
  initialStatus?: ShowStatus;
}

export const ShowFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  existingShow,
  existingShows,
  prefilledDate,
  initialStatus
}) => {
  const [contractorName, setContractorName] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [date, setDate] = useState(() => prefilledDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('20:00');
  const [endTime, setEndTime] = useState('23:00');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [totalCache, setTotalCache] = useState('');
  const [status, setStatus] = useState<ShowStatus>(() => initialStatus || 'Confirmado');
  const [notes, setNotes] = useState('');

  // Conflict warning state
  const [conflictPrompt, setConflictPrompt] = useState<ConflictResult | null>(null);

  useEffect(() => {
    if (existingShow) {
      setContractorName(existingShow.contractorName || existingShow.name || '');
      setEventType(existingShow.eventType || EVENT_TYPES[0]);
      setDate(existingShow.date || new Date().toISOString().slice(0, 10));
      setTime(existingShow.time || '20:00');
      setEndTime(existingShow.endTime || '');
      setCity(existingShow.city || '');
      setLocation(existingShow.location || '');
      const cacheVal = existingShow.totalCache ?? existingShow.cacheCombined;
      setTotalCache(cacheVal !== undefined && cacheVal !== null ? String(cacheVal) : '');
      setStatus((existingShow.status === 'Agendado' ? 'Aguardando confirmação' : existingShow.status) || 'Confirmado');
      setNotes(existingShow.notes || '');
    } else {
      setContractorName('');
      setEventType(EVENT_TYPES[0]);
      setDate(prefilledDate || new Date().toISOString().slice(0, 10));
      setTime('20:00');
      setEndTime('23:00');
      setCity('');
      setLocation('');
      setTotalCache('');
      setStatus(initialStatus || 'Confirmado');
      setNotes('');
    }
    setConflictPrompt(null);
  }, [existingShow, prefilledDate, initialStatus, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorName.trim()) return;

    // Check conflict if status is 'Confirmado'
    if (status === 'Confirmado') {
      const conflict = checkScheduleConflict(
        existingShows,
        date,
        time,
        endTime,
        existingShow?.id
      );

      if (conflict.hasConflict) {
        setConflictPrompt(conflict);
        return;
      }
    }

    executeSave();
  };

  const executeSave = () => {
    const cacheVal = parseFloat(totalCache.replace(',', '.')) || 0;
    const showPayload: Partial<Show> = {
      name: contractorName.trim(),
      contractorName: contractorName.trim(),
      eventType,
      date,
      time,
      endTime: endTime.trim() || undefined,
      city: city.trim(),
      location: location.trim(),
      totalCache: cacheVal,
      cacheCombined: cacheVal,
      extraAmount: existingShow?.extraAmount || 0,
      status,
      notes: notes.trim(),
      scope: existingShow?.scope || 'BUSINESS'
    };

    onSave(showPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 z-10 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-20">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Agenda Profissional
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {existingShow ? 'Editar Apresentação' : 'Cadastrar Novo Show'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Contratante */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Nome do Contratante / Evento *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Ex: Cerimonial Sol Nascente, Bar do Zé, etc."
                value={contractorName}
                onChange={e => setContractorName(e.target.value)}
                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            </div>
          </div>

          {/* Tipo de Evento & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Tipo de Evento
              </label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Status do Show
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ShowStatus)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-black"
              >
                {SHOW_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data & Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Data do Show *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <Calendar size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Início
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <Clock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Término / Limite
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <Clock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Cidade & Local */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Cidade
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: Baependi, Caxambu..."
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Local / Endereço
              </label>
              <input
                type="text"
                placeholder="Ex: Clube de Campo, Sítio Boa Vista"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Valor Total Contratado */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Valor Total Contratado (Cachê R$)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={totalCache}
                onChange={e => setTotalCache(e.target.value)}
                className="w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 tabular-nums"
              />
              <DollarSign size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Observações & Detalhes
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Som próprio incluso, repertório sertanejo, contato do cerimonial..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-2/3 p-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition shadow-md flex items-center justify-center space-x-1"
            >
              <Check size={16} strokeWidth={3} />
              <span>{existingShow ? 'Salvar Alterações' : 'Confirmar Cadastro'}</span>
            </button>
          </div>
        </form>

        {/* MODAL DE ALERTA DE CONFLITO DE AGENDA */}
        {conflictPrompt && conflictPrompt.hasConflict && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <div className="flex items-start space-x-3 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={24} className="shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Conflito de Horário Detectado
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium whitespace-pre-line mt-2 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                    {conflictPrompt.message}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Você pode revisar os horários para evitar sobreposição ou prosseguir com o agendamento mesmo assim.
              </p>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setConflictPrompt(null)}
                  className="w-1/2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition"
                >
                  Revisar Horário
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConflictPrompt(null);
                    executeSave();
                  }}
                  className="w-1/2 p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-md"
                >
                  Continuar Mesmo Assim
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
