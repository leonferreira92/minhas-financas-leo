import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Goal } from '../types';
import { 
  X, Plus, Target, Trophy, Sparkles, Laptop, Car, Plane, 
  Music, Gem, Home, Briefcase, ChevronRight, Edit2, 
  Trash2, ArrowUpRight, ArrowDownRight, Check, AlertCircle,
  Calendar, DollarSign, PieChart, ShieldCheck
} from 'lucide-react';
import { getIcon } from '../constants';

interface GoalManagerModalProps {
  onClose: () => void;
  onOpenGoalDetail?: (goalId: string) => void;
  initialGoalId?: string;
}

const GOAL_ICONS = [
  { id: 'Laptop', label: 'Tech & Computador' },
  { id: 'CarFront', label: 'Veículos' },
  { id: 'Plane', label: 'Viagens & Férias' },
  { id: 'Music', label: 'Música & Studio' },
  { id: 'Target', label: 'Meta Geral' },
  { id: 'Trophy', label: 'Conquista' },
  { id: 'Sparkles', label: 'Sonho Especial' },
  { id: 'Gem', label: 'Patrimônio / Luxo' },
  { id: 'Home', label: 'Casa & Reforma' },
  { id: 'Briefcase', label: 'Negócio / Carreira' },
];

const GOAL_COLORS = [
  '#3b82f6', // Azul
  '#10b981', // Esmeralda
  '#8b5cf6', // Violeta
  '#f59e0b', // Âmbar
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#6366f1', // Índigo
  '#f43f5e', // Vermelho
];

export const GoalManagerModal: React.FC<GoalManagerModalProps> = ({ 
  onClose, 
  onOpenGoalDetail,
  initialGoalId 
}) => {
  const { goals, addGoal, updateGoal, deleteGoal, getAccountBalance, accounts } = useFinance();
  
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  // Modal de Aporte / Resgate rápido em uma meta
  const [adjustingGoal, setAdjustingGoal] = useState<Goal | null>(null);
  const [adjustType, setAdjustType] = useState<'deposit' | 'withdraw'>('deposit');
  const [adjustAmount, setAdjustAmount] = useState('');

  // Formulário de Nova / Edição de Meta
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [icon, setIcon] = useState(GOAL_ICONS[0].id);

  // Cálculos consolidados
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const totalAccountsBalance = accounts
    .filter(a => a.enabled)
    .reduce((sum, a) => sum + getAccountBalance(a.id), 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const openFormForNew = () => {
    setEditingGoal(null);
    setName('');
    setDescription('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDeadline('');
    setColor(GOAL_COLORS[0]);
    setIcon(GOAL_ICONS[0].id);
    setActiveTab('form');
  };

  const openFormForEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setDescription(goal.description || '');
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setDeadline(goal.deadline ? goal.deadline.slice(0, 10) : '');
    setColor(goal.color);
    setIcon(goal.icon);
    setActiveTab('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount) return;

    const parsedTarget = parseFloat(targetAmount.replace(/\D/g, '')) / 100 || parseFloat(targetAmount) || 0;
    const parsedCurrent = parseFloat(currentAmount.replace(/\D/g, '')) / 100 || parseFloat(currentAmount) || 0;

    if (editingGoal) {
      updateGoal({
        ...editingGoal,
        name: name.trim(),
        description: description.trim() || undefined,
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        deadline: deadline || undefined,
        color,
        icon
      });
    } else {
      addGoal({
        name: name.trim(),
        description: description.trim() || undefined,
        targetAmount: parsedTarget,
        currentAmount: parsedCurrent,
        deadline: deadline || undefined,
        color,
        icon,
        createdAt: new Date().toISOString()
      });
    }

    setActiveTab('list');
  };

  const handleAdjustAmount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingGoal || !adjustAmount) return;

    const parsedAmount = parseFloat(adjustAmount.replace(/\D/g, '')) / 100 || parseFloat(adjustAmount) || 0;
    if (parsedAmount <= 0) return;

    let newCurrent = adjustingGoal.currentAmount;
    if (adjustType === 'deposit') {
      newCurrent += parsedAmount;
    } else {
      newCurrent = Math.max(0, newCurrent - parsedAmount);
    }

    updateGoal({
      ...adjustingGoal,
      currentAmount: newCurrent
    });

    setAdjustingGoal(null);
    setAdjustAmount('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja realmente remover esta meta? O saldo não será excluído das suas contas bancárias.')) {
      deleteGoal(id);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-3 md:p-6 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho do Gerenciador de Metas */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 p-6 md:p-8 text-white relative shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Target size={26} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">
                  Planejamento de Conquistas
                </span>
                <h2 className="text-2xl font-black tracking-tight">Metas & Reservas</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-white border border-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* KPI Bar no Cabeçalho */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Total Reservado</p>
              <p className="text-lg md:text-xl font-black text-white tabular-nums mt-0.5">
                {formatCurrency(totalSaved)}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Objetivo Somado</p>
              <p className="text-lg md:text-xl font-black text-white tabular-nums mt-0.5">
                {formatCurrency(totalTarget)}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Progresso Geral</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-lg md:text-xl font-black text-white">{totalProgress}%</p>
                <span className="text-xs font-bold text-blue-200">{goals.length} metas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Ação Rápida */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Minhas Reservas ({goals.length})
            </button>
            <button
              onClick={openFormForNew}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                activeTab === 'form' && !editingGoal
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Plus size={14} />
              <span>Nova Conquista</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs font-bold text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Saldo em Caixa: <strong className="text-slate-800 dark:text-white">{formatCurrency(totalAccountsBalance)}</strong></span>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'list' ? (
            goals.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                  <Target size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Nenhuma meta ou conquista cadastrada
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-6">
                  Crie sua primeira reserva para planejar a compra de um novo computador, viagem, instrumento musical ou fundo de emergência.
                </p>
                <button
                  onClick={openFormForNew}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  + Criar Primeira Conquista
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map(goal => {
                  const IconComp = getIcon(goal.icon);
                  const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

                  return (
                    <div
                      key={goal.id}
                      className="bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Topo do Card */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                              style={{ backgroundColor: goal.color }}
                            >
                              <IconComp size={22} />
                            </div>
                            <div>
                              <h4 className="text-base font-black text-slate-800 dark:text-white leading-tight">
                                {goal.name}
                              </h4>
                              {goal.description && (
                                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                  {goal.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Menu de Ações Rápido */}
                          <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openFormForEdit(goal)}
                              title="Editar meta"
                              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(goal.id)}
                              title="Excluir meta"
                              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Progresso Financeiro */}
                        <div className="mb-4">
                          <div className="flex items-baseline justify-between mb-1">
                            <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums">
                              {formatCurrency(goal.currentAmount)}
                            </p>
                            <span className="text-xs font-bold text-slate-400">
                              Alvo: {formatCurrency(goal.targetAmount)}
                            </span>
                          </div>

                          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ 
                                width: `${progress}%`,
                                backgroundColor: goal.color 
                              }}
                            ></div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-bold mt-1.5">
                            <span className="text-indigo-600 dark:text-indigo-400">{progress}% Conquistado</span>
                            <span className="text-slate-400">
                              {remaining > 0 ? `Faltam ${formatCurrency(remaining)}` : '🎉 Meta Atingida!'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botões de Aporte / Resgate / Detalhes */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              setAdjustingGoal(goal);
                              setAdjustType('deposit');
                              setAdjustAmount('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all text-xs font-black flex items-center space-x-1"
                          >
                            <ArrowUpRight size={14} />
                            <span>+ Aportar</span>
                          </button>
                          <button
                            onClick={() => {
                              setAdjustingGoal(goal);
                              setAdjustType('withdraw');
                              setAdjustAmount('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-all text-xs font-bold"
                            title="Resgatar saldo"
                          >
                            <ArrowDownRight size={14} />
                          </button>
                        </div>

                        {onOpenGoalDetail && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenGoalDetail(goal.id);
                            }}
                            className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-black flex items-center space-x-1 group-hover:underline"
                          >
                            <span>Detalhes</span>
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Formulário de Criação ou Edição */
            <form onSubmit={handleSubmit} className="space-y-5 max-w-xl mx-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  {editingGoal ? 'Editar Conquista / Meta' : 'Nova Conquista / Meta de Reserva'}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700"
                >
                  Voltar à Lista
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Nome da Conquista
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Novo Computador, Troca de Carro, Viagem..."
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Valor Alvo / Objetivo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    placeholder="8500,00"
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Saldo Já Reservado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Data Limite (Opcional)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Descrição Curta / Nota
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: Setup de estúdio, viagem ano que vem..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Seletor de Ícone */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Ícone Representativo
                </label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_ICONS.map(item => {
                    const IconComponent = getIcon(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIcon(item.id)}
                        className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          icon === item.id
                            ? 'bg-indigo-600 text-white shadow-md scale-105'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <IconComponent size={14} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor de Cor */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Cor da Conquista
                </label>
                <div className="flex items-center space-x-2">
                  {GOAL_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-xl transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
                >
                  {editingGoal ? 'Salvar Alterações' : 'Criar Conquista'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal de Ajuste de Saldo (Aporte / Resgate) */}
        {adjustingGoal && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: adjustingGoal.color }}
                  >
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {adjustType === 'deposit' ? 'Adicionar Dinheiro à Reserva' : 'Resgatar da Reserva'}
                    </span>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      {adjustingGoal.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setAdjustingGoal(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAdjustAmount} className="space-y-4">
                <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setAdjustType('deposit')}
                    className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${
                      adjustType === 'deposit'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    + Novo Aporte
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('withdraw')}
                    className={`flex-1 py-2 text-xs font-black uppercase rounded-xl transition-all ${
                      adjustType === 'withdraw'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    - Resgatar Saldo
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder="Ex: 500,00"
                    autoFocus
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xl font-black text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Saldo atual reservado na conquista: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(adjustingGoal.currentAmount)}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustingGoal(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 ${
                      adjustType === 'deposit' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {adjustType === 'deposit' ? 'Confirmar Aporte' : 'Confirmar Resgate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
