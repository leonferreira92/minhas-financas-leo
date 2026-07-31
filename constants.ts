
import { Category } from './types';
import { 
  ShoppingBag, Utensils, Home, Car, HeartPulse, 
  Zap, Smartphone, Briefcase, DollarSign, Coffee,
  Plane, Gift, ShieldAlert, CarFront, Gamepad2,
  GraduationCap, PawPrint, Receipt, Tv, Activity,
  Wifi, CreditCard, Coins, PiggyBank, Dumbbell,
  Stethoscope, ShoppingCart, Bus, Fuel, Music,
  Theater, Pizza, Wine, Scissors, Hammer, TrendingUp,
  Landmark, ShieldCheck, Heart, Umbrella, Users,
  Gem, BookOpen, Brush, Baby, Cross, Trash, 
  ArrowRightLeft, BadgeDollarSign, Calculator, Globe,
  BarChart3, Fingerprint, LayoutDashboard, Clock
} from 'lucide-react';

export const DEFAULT_CATEGORIES: Category[] = [
  // --- DESPESAS ESSENCIAIS (50%) ---
  { id: 'cat_1', name: 'Mercado', type: 'expense', color: '#ef4444', icon: 'ShoppingCart', classification: 'essential' },
  { id: 'cat_2', name: 'Aluguel / Condomínio', type: 'expense', color: '#f97316', icon: 'Home', classification: 'essential' },
  { id: 'cat_3', name: 'Transporte Público', type: 'expense', color: '#eab308', icon: 'Bus', classification: 'essential' },
  { id: 'cat_21', name: 'Combustível', type: 'expense', color: '#f59e0b', icon: 'Fuel', classification: 'essential' },
  { id: 'cat_4', name: 'Plano de Saúde', type: 'expense', color: '#10b981', icon: 'Stethoscope', classification: 'essential' },
  { id: 'cat_11', name: 'Farmácia', type: 'expense', color: '#059669', icon: 'HeartPulse', classification: 'essential' },
  { id: 'cat_12', name: 'Escola / Curso', type: 'expense', color: '#3b82f6', icon: 'GraduationCap', classification: 'essential' },
  { id: 'cat_13', name: 'Luz / Água / Gás', type: 'expense', color: '#06b6d4', icon: 'Zap', classification: 'essential' },
  { id: 'cat_14', name: 'Internet / Celular', type: 'expense', color: '#0ea5e9', icon: 'Wifi', classification: 'essential' },
  { id: 'cat_26', name: 'Seguros', type: 'expense', color: '#64748b', icon: 'Umbrella', classification: 'essential' },
  { id: 'cat_27', name: 'Impostos / Taxas', type: 'expense', color: '#94a3b8', icon: 'Receipt', classification: 'essential' },

  // --- ESTILO DE VIDA / PESSOAL (30%) ---
  { id: 'cat_5', name: 'Restaurantes', type: 'expense', color: '#8b5cf6', icon: 'Utensils', classification: 'personal' },
  { id: 'cat_22', name: 'Delivery / Fast Food', type: 'expense', color: '#a855f7', icon: 'Pizza', classification: 'personal' },
  { id: 'cat_9', name: 'Roupas / Calçados', type: 'expense', color: '#ec4899', icon: 'ShoppingBag', classification: 'personal' },
  { id: 'cat_15', name: 'Assinaturas / Streaming', type: 'expense', color: '#f43f5e', icon: 'Tv', classification: 'personal' },
  { id: 'cat_16', name: 'Cinema / Teatro', type: 'expense', color: '#fb7185', icon: 'Theater', classification: 'personal' },
  { id: 'cat_17', name: 'Pet Shop', type: 'expense', color: '#6366f1', icon: 'PawPrint', classification: 'personal' },
  { id: 'cat_18', name: 'Barbeiro / Salão', type: 'expense', color: '#d946ef', icon: 'Scissors', classification: 'personal' },
  { id: 'cat_19', name: 'Jogos / Games', type: 'expense', color: '#4f46e5', icon: 'Gamepad2', classification: 'personal' },
  { id: 'cat_23', name: 'Academia / Esporte', type: 'expense', color: '#22c55e', icon: 'Dumbbell', classification: 'personal' },
  { id: 'cat_20', name: 'Presentes / Doações', type: 'expense', color: '#fb923c', icon: 'Gift', classification: 'personal' },
  { id: 'cat_28', name: 'Hobby / Diversão', type: 'expense', color: '#8b5cf6', icon: 'Gem', classification: 'personal' },
  { id: 'cat_29', name: 'Viagem / Férias', type: 'expense', color: '#06b6d4', icon: 'Globe', classification: 'personal' },

  // --- FUTURO / INVESTIMENTOS (20%) ---
  { id: 'cat_8', name: 'Ações / FIIs', type: 'income', color: '#10b981', icon: 'TrendingUp', classification: 'future' },
  { id: 'cat_30', name: 'Reserva de Emergência', type: 'expense', color: '#059669', icon: 'ShieldCheck', classification: 'future' },
  { id: 'cat_31', name: 'Previdência', type: 'expense', color: '#065f46', icon: 'PiggyBank', classification: 'future' },

  // --- RECEITAS ---
  { id: 'cat_6', name: 'Salário', type: 'income', color: '#3b82f6', icon: 'Briefcase', classification: 'future' },
  { id: 'cat_33', name: 'Shows / Cachês', type: 'income', color: '#8b5cf6', icon: 'Music', classification: 'future' },
  { id: 'cat_7', name: 'Pró-Labore', type: 'income', color: '#6366f1', icon: 'BadgeDollarSign', classification: 'future' },
  { id: 'cat_24', name: 'Bônus / PLR', type: 'income', color: '#2dd4bf', icon: 'Coins', classification: 'future' },
  { id: 'cat_25', name: 'Venda de Usados', type: 'income', color: '#8b5cf6', icon: 'DollarSign', classification: 'future' },
  { id: 'cat_32', name: 'Rendimentos', type: 'income', color: '#10b981', icon: 'TrendingUp', classification: 'future' },
];

export const ICON_MAP: Record<string, any> = {
  ShoppingBag, Utensils, Home, Car, HeartPulse, 
  Zap, Smartphone, Briefcase, DollarSign, Coffee,
  Plane, Gift, ShieldAlert, CarFront, Gamepad2,
  GraduationCap, PawPrint, Receipt, Tv, Activity,
  Wifi, CreditCard, Coins, PiggyBank, Dumbbell,
  Stethoscope, ShoppingCart, Bus, Fuel, Music,
  Theater, Pizza, Wine, Scissors, Hammer, TrendingUp,
  Landmark, ShieldCheck, Heart, Umbrella, Users,
  Gem, BookOpen, Brush, Baby, Cross, Trash, 
  ArrowRightLeft, BadgeDollarSign, Calculator, Globe,
  BarChart3, Fingerprint, LayoutDashboard, Clock
};

export const getIcon = (name: string) => ICON_MAP[name] || DollarSign;

export const APP_THEMES: Record<string, Record<string, string>> = {
  lime: { 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212', 900: '#365314', 950: '#1a2e05' },
  indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b' },
  blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
  orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12', 950: '#431407' }
};
