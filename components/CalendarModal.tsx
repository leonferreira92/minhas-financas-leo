
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  title?: string;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose, selectedDate, onSelect, title = 'Selecionar Data' }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (isOpen && selectedDate) {
      // Evita problemas de fuso horário definindo meio-dia
      setCurrentDate(new Date(selectedDate + 'T12:00:00'));
    }
  }, [isOpen, selectedDate]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDayClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onSelect(`${year}-${month}-${dayStr}`);
    onClose();
  };

  const handleToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    onSelect(`${year}-${month}-${dayStr}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl animate-scale-in border border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Month Nav */}
        <div className="flex items-center justify-between mb-6 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition text-slate-500 dark:text-slate-400 active:scale-95">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition text-slate-500 dark:text-slate-400 active:scale-95">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Grid */}
        <div className="mb-2">
          <div className="grid grid-cols-7 mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate === dateStr;
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`
                    h-10 w-full rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-95
                    ${isSelected 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                      : isToday 
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
           <button 
             onClick={handleToday}
             className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
           >
             Hoje
           </button>
        </div>

      </div>
    </div>
  );
};
