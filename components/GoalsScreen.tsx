import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Goal } from '../types';
import { 
  Plus, Target, Trophy, Sparkles, Gem, Home, Briefcase, 
  ChevronRight, Edit2, Trash2, ArrowUpRight, ArrowDownRight, 
  X, AlertCircle, Calendar, DollarSign, ShieldCheck, 
  ChevronLeft, PiggyBank, Award, Lightbulb, Calculator
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getIcon, parseCurrencyInput } from '../constants';
import { GoalDetail } from './GoalDetail';

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

export const GoalsScreen = () => {
  const navigate = useNavigate();
  const { goals, addGoal, updateGoal, deleteGoal, getAccountBalance, accounts, addTransaction, categories } = useFinance();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoalDetailId, setSelectedGoalDetailId] = useState<string | null>(null);
  
  // Aporte / Resgate rápido
  const [adjustingGoal, setAdjustingGoal] = useState<Goal | null>(null);
  const [adjustType, setAdjustType] = useState<'deposit' | 'withdraw'>('deposit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Exclusão de Meta com Devolução de Dinheiro
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [refundAccountId, setRefundAccountId] = useState<string>('');
  const [deleteRefundType, setDeleteRefundType] = useState<'refund' | 'discard'>('refund');

  // Formulário de Nova / Edição de Meta
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(GOAL_COLORS[0]);
  const [icon, setIcon] = useState(GOAL_ICONS[4].id); // Target default

  // Cálculos consolidados
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const savingsAccount = accounts.find(a => a.type === 'savings' || a.id === 'acc_savings');
  const savingsAccountBalance = savingsAccount ? getAccountBalance(savingsAccount.id) : totalSaved;
  const unallocatedSavings = Math.max(0, savingsAccountBalance - totalSaved);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const openNewForm = () => {
    setEditingGoal(null);
    setName('');
    setDescription('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDeadline('');
    setColor(GOAL_COLORS[0]);
    setIcon(GOAL_ICONS[4].id);
    setIsFormOpen(true);
    
    // Scroll smoothly to form
    setTimeout(() => {
      document.getElementById('goal-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const openEditForm = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setDescription(goal.description || '');
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setDeadline(goal.deadline ? goal.deadline.slice(0, 10) : '');
    setColor(goal.color);
    setIcon(goal.icon);
    setIsFormOpen(true);
    
    setTimeout(() => {
      document.getElementById('goal-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingGoal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount) return;

    const parsedTarget = parseCurrencyInput(targetAmount);
    const parsedCurrent = parseCurrencyInput(currentAmount);

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

    closeForm();
  };

  const handleAdjustAmount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingGoal || !adjustAmount) return;

    const parsedAmount = parseCurrencyInput(adjustAmount);
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

    const targetAccount = selectedAccountId || accounts.find(a => a.enabled)?.id || accounts[0]?.id || '';
    if (targetAccount) {
      addTransaction({
        description: adjustType === 'deposit'
          ? `Aporte em Objetivo: ${adjustingGoal.name}`
          : `Resgate de Objetivo: ${adjustingGoal.name}`,
        amount: parsedAmount,
        type: adjustType === 'deposit' ? 'goal_deposit' : 'goal_withdraw',
        status: 'paid',
        date: new Date().toISOString().slice(0, 10),
        categoryId: categories[0]?.id || 'goal-transfer',
        accountId: targetAccount,
        goalId: adjustingGoal.id
      });
    }

    setAdjustingGoal(null);
    setAdjustAmount('');
  };

  const handleDeleteClick = (goal: Goal) => {
    if (goal.currentAmount > 0) {
      setDeletingGoal(goal);
      const defaultAccount = accounts.find(a => a.enabled)?.id || accounts[0]?.id || '';
      setRefundAccountId(defaultAccount);
      setDeleteRefundType('refund');
    } else {
      if (window.confirm(`Deseja realmente remover a meta "${goal.name}"?`)) {
        deleteGoal(goal.id);
      }
    }
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingGoal) return;

    if (deleteRefundType === 'refund' && deletingGoal.currentAmount > 0) {
      const targetAccount = refundAccountId || accounts.find(a => a.enabled)?.id || accounts[0]?.id || '';
      if (targetAccount) {
        addTransaction({
          description: `Saldo retornado da meta excluída: ${deletingGoal.name}`,
          amount: deletingGoal.currentAmount,
          type: 'goal_withdraw',
          status: 'paid',
          date: new Date().toISOString().slice(0, 10),
          categoryId: categories[0]?.id || 'goal-transfer',
          accountId: targetAccount,
          goalId: deletingGoal.id
        });
      }
    }

    deleteGoal(deletingGoal.id);
    setDeletingGoal(null);
  };

  return (
    <div className="pb-32 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Header Sticky */}
      <div className="sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-30 pt-2 pb-4 px-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Link to="/" className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition text-slate-500 dark:text-slate-400">
               <ChevronLeft size={24} />
            </Link>
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Investimento no Sonho</span>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">Economias & Metas</h1>
            </div>
          </div>

          <button
            onClick={openNewForm}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-600/15 flex items-center justify-center transition-all active:scale-95"
            title="Criar nova conquista"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Dashboard de Economias Integrado */}
        <div className="bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-4">
             <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 flex items-center">
               <PiggyBank size={12} className="mr-1.5" /> Cofre Geral de Economias
             </span>
             <div className="flex items-center space-x-1 text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full">
                <ShieldCheck size={12} className="text-emerald-300 mr-1" />
                <span>Ativo</span>
             </div>
          </div>

          <div className="mb-6">
             <span className="text-xs opacity-75 block mb-1">Saldo Total da Poupança</span>
             <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black tracking-tight tabular-nums">{formatCurrency(savingsAccountBalance)}</span>
             </div>
          </div>

          {/* Sub-indicadores */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-left">
            <div>
               <span className="text-[8px] font-black uppercase tracking-wider text-indigo-100/70 block">Alocado</span>
               <span className="text-sm font-black tabular-nums">{formatCurrency(totalSaved)}</span>
            </div>
            <div>
               <span className="text-[8px] font-black uppercase tracking-wider text-indigo-100/70 block">Disponível</span>
               <span className="text-sm font-black tabular-nums text-emerald-300">{formatCurrency(unallocatedSavings)}</span>
            </div>
            <div>
               <span className="text-[8px] font-black uppercase tracking-wider text-indigo-100/70 block">Planejado</span>
               <div className="flex items-center space-x-1.5">
                 <span className="text-sm font-black tabular-nums">{formatCurrency(totalTarget)}</span>
                 <span className="text-[10px] font-black text-indigo-200">{totalProgress}%</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="px-1 space-y-6 mt-4">
        
        {/* Formulário de Criação/Edição Inline */}
        {isFormOpen && (
          <div id="goal-form-section" className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border-2 border-indigo-500/20 shadow-md animate-scale-in">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Trophy size={16} />
                  </div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    {editingGoal ? 'Editar Conquista' : 'Nova Conquista'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  Nome da Meta / Conquista
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Computador Novo, Intercâmbio, Carro..."
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm dark:text-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Valor Alvo (R$)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    placeholder="8500"
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm dark:text-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Saldo Guardado (R$)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={currentAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm dark:text-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Prazo Limite (Opcional)
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm dark:text-white transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Descrição Curta
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: Fundo para estúdio..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm dark:text-white transition"
                  />
                </div>
              </div>

              {/* Ícones */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Ícone da Conquista
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_ICONS.map(item => {
                    const IconComponent = getIcon(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIcon(item.id)}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          icon === item.id
                            ? 'bg-indigo-600 text-white shadow-md scale-105'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <IconComponent size={13} />
                        <span>{item.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cores */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Cor de Identificação
                </label>
                <div className="flex items-center space-x-2">
                  {GOAL_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-xl transition-all ${
                        color === c ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-[0.98]"
                >
                  {editingGoal ? 'Salvar Dados' : 'Criar Reserva'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listagem de Reservas */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
               Minhas Conquistas Cadastradas ({goals.length})
            </h2>
          </div>

          {goals.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-10 text-center shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <Target size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Nenhum sonho cadastrado</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-6">
                Planeje objetivos como computadores, viagens ou fundos de emergência definindo metas.
              </p>
              <button
                onClick={openNewForm}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition"
              >
                + Criar Primeira Reserva
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
                    className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-slate-800 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top do card */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform group-hover:scale-105"
                            style={{ backgroundColor: goal.color }}
                          >
                            <IconComp size={20} />
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

                        {/* Menu rápido */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openEditForm(goal)}
                            className="p-1.5 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(goal)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Progresso financeiro */}
                      <div className="mb-4">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <p className="text-lg font-black text-slate-800 dark:text-white tabular-nums">
                            {formatCurrency(goal.currentAmount)}
                          </p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Meta: {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${progress}%`,
                              backgroundColor: goal.color 
                            }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-black mt-2 uppercase tracking-wide">
                          <span className="text-indigo-600 dark:text-indigo-400">{progress}% Conquistado</span>
                          <span className="text-slate-400">
                            {remaining > 0 ? `Faltam ${formatCurrency(remaining)}` : '🎉 Meta Atingida!'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            setAdjustingGoal(goal);
                            setAdjustType('deposit');
                            setAdjustAmount('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/75 transition-all text-xs font-black flex items-center space-x-1"
                        >
                          <ArrowUpRight size={13} />
                          <span>+ Aportar</span>
                        </button>
                        <button
                          onClick={() => {
                            setAdjustingGoal(goal);
                            setAdjustType('withdraw');
                            setAdjustAmount('');
                          }}
                          className="px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-bold"
                          title="Resgatar"
                        >
                          <ArrowDownRight size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedGoalDetailId(goal.id)}
                        className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-bold flex items-center space-x-0.5 group-hover:underline"
                      >
                        <span>Análise & IA</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dicas e Educação Financeira Inteligente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm">
           <div className="flex items-center space-x-2.5 mb-3">
              <Lightbulb size={20} className="text-yellow-500 shrink-0" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dica de Gestão</h3>
           </div>
           <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
             O valor guardado em metas faz parte da sua conta de <strong className="text-indigo-600 dark:text-indigo-400">Poupança/Economias</strong>. Ao fazer um aporte em uma meta, esse saldo é alocado para o seu objetivo e reduz seu <strong className="text-slate-700 dark:text-slate-300">Cofrinho Livre</strong>, mas mantém seu patrimônio preservado e blindado contra compras impulsivas!
           </p>
        </div>
      </div>

      {/* Modal / Detalhes IA da Meta */}
      {selectedGoalDetailId && (
        <GoalDetail
          goalId={selectedGoalDetailId}
          onClose={() => setSelectedGoalDetailId(null)}
        />
      )}

      {/* Overlay de Aporte/Resgate rápido */}
      {adjustingGoal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: adjustingGoal.color }}
                >
                  <DollarSign size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    {adjustType === 'deposit' ? 'Adicionar Reserva' : 'Resgatar da Reserva'}
                  </span>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                    {adjustingGoal.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setAdjustingGoal(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAdjustAmount} className="space-y-4">
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setAdjustType('deposit')}
                  className={`flex-1 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                    adjustType === 'deposit'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  + Aportar
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('withdraw')}
                  className={`flex-1 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                    adjustType === 'withdraw'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  - Resgatar
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="any"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-lg font-black text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Guardado nesta meta: <strong className="text-slate-600 dark:text-slate-300">{formatCurrency(adjustingGoal.currentAmount)}</strong>
                </p>
              </div>

              {accounts.filter(a => a.enabled).length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    {adjustType === 'deposit' ? 'Conta de Origem' : 'Conta de Destino'}
                  </label>
                  <select
                    value={selectedAccountId || accounts.find(a => a.enabled)?.id || ''}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-800 dark:text-white"
                  >
                    {accounts.filter(acc => acc.enabled).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatCurrency(getAccountBalance(acc.id))})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setAdjustingGoal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-[0.98] ${
                    adjustType === 'deposit' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overlay de confirmação de exclusão com Reembolso */}
      {deletingGoal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <Trash2 size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-rose-500">
                    Remover Sonho
                  </span>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                    {deletingGoal.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setDeletingGoal(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
                Você acumulou <strong className="text-slate-800 dark:text-white">{formatCurrency(deletingGoal.currentAmount)}</strong> nesta meta. O que deseja fazer com esse saldo ao excluí-la?
              </p>

              <div className="flex flex-col gap-2">
                <label className={`flex items-center space-x-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                  deleteRefundType === 'refund' 
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/25 text-indigo-700 dark:text-indigo-300' 
                    : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="deleteRefundType" 
                    value="refund" 
                    checked={deleteRefundType === 'refund'}
                    onChange={() => setDeleteRefundType('refund')}
                    className="accent-indigo-600 h-4 w-4 shrink-0"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-black uppercase">Reembolsar Saldo</span>
                    <span className="block text-[10px] text-slate-400">
                      Depositar de volta em uma das suas contas ativas.
                    </span>
                  </div>
                </label>

                <label className={`flex items-center space-x-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                  deleteRefundType === 'discard' 
                    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300' 
                    : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="deleteRefundType" 
                    value="discard" 
                    checked={deleteRefundType === 'discard'}
                    onChange={() => setDeleteRefundType('discard')}
                    className="accent-rose-600 h-4 w-4 shrink-0"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-black uppercase">Apenas Excluir</span>
                    <span className="block text-[10px] text-slate-400">
                      Remover sem devolver saldo de volta ao caixa.
                    </span>
                  </div>
                </label>
              </div>

              {deleteRefundType === 'refund' && accounts.filter(a => a.enabled).length > 0 && (
                <div className="animate-fade-in">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                    Conta para Receber Reembolso
                  </label>
                  <select
                    value={refundAccountId}
                    onChange={e => setRefundAccountId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2"
                  >
                    {accounts.filter(acc => acc.enabled).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatCurrency(getAccountBalance(acc.id))})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setDeletingGoal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
