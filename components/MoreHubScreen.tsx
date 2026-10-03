import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { 
  Search, Settings as SettingsIcon, ChevronDown, ChevronRight, ChevronLeft,
  User, Music, CreditCard, Sparkles, Sliders, Receipt, Landmark, 
  BarChart3, FolderTree, Plus, Calendar, DollarSign, FileText, 
  ShieldAlert, RefreshCw, UploadCloud, Database, Bell, X, ShieldCheck
} from 'lucide-react';
import { AuthHeaderWidget } from './AuthHeaderWidget';
import { TransactionForm } from './TransactionForm';
import { BankImportModal } from './BankImportModal';
import { Settings } from './Settings';
import { FinancialSettingsScreen } from './FinancialSettingsScreen';
import { CategoryList } from './CategoryList';
import { AlertsScreen } from './AlertsScreen';

interface MenuItem {
  id: string;
  title: string;
  desc: string;
  icon: any;
  action: () => void;
  badge?: string;
  keywords: string;
}

interface MenuCategory {
  id: string;
  title: string;
  icon: any;
  color: string;
  items: MenuItem[];
}

export const MoreHubScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const directTab = searchParams.get('tab');

  const { currentUser, getSystemAlerts } = useFinance();
  const alertsCount = useMemo(() => getSystemAlerts().length, [getSystemAlerts]);

  // Search input state
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);
  const [activeSubScreen, setActiveSubScreen] = useState<'settings' | 'financial' | 'categories' | 'alerts' | null>(
    directTab === 'settings' ? 'settings' :
    directTab === 'financial' ? 'financial' :
    directTab === 'categories' ? 'categories' :
    directTab === 'alerts' ? 'alerts' : null
  );

  // Accordion open/close state
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    personal: true,
    musician: true,
    debts: false,
    ai: false,
    system: false
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Definição das Categorias do Menu estilo Banco do Brasil
  const menuCategories: MenuCategory[] = useMemo(() => [
    {
      id: 'personal',
      title: 'Minhas Finanças (Pessoal)',
      icon: User,
      color: 'text-blue-400',
      items: [
        {
          id: 'extrato',
          title: 'Extrato Completo',
          desc: 'Lançamentos passados, saldos e extrato diário',
          icon: Receipt,
          action: () => navigate('/lancamentos'),
          keywords: 'extrato transacoes lancamentos movimentacoes receitas despesas'
        },
        {
          id: 'contas',
          title: 'Saldo por Conta',
          desc: 'Gerenciar bancos, carteira física e saldos',
          icon: Landmark,
          action: () => navigate('/contas'),
          keywords: 'contas bancos carteiras saldo patrimonio'
        },
        {
          id: 'gastos',
          title: 'Análise de Gastos',
          desc: 'Gráficos verticais e distribuição por categoria',
          icon: BarChart3,
          action: () => navigate('/gastos'),
          keywords: 'gastos graficos analise categorias consumo'
        },
        {
          id: 'categorias_pessoais',
          title: 'Categorias Pessoais',
          desc: 'Gerenciar grupos, cores e classificação de despesas',
          icon: FolderTree,
          action: () => setActiveSubScreen('categories'),
          keywords: 'categorias grupos classificacao'
        },
        {
          id: 'novo_lancamento',
          title: 'Lançamento Rápido',
          desc: 'Cadastrar nova receita, despesa ou transferência',
          icon: Plus,
          action: () => setIsTxModalOpen(true),
          badge: 'Atalho',
          keywords: 'novo lancamento despesa receita adicionar'
        }
      ]
    },
    {
      id: 'musician',
      title: 'Gestão de Carreira (Músico)',
      icon: Music,
      color: 'text-[#fcca00]',
      items: [
        {
          id: 'agenda_shows',
          title: 'Agenda de Shows',
          desc: 'Calendário de apresentações e fichas de eventos',
          icon: Calendar,
          action: () => navigate('/shows'),
          keywords: 'shows agenda apresentacoes eventos apresentacao'
        },
        {
          id: 'caches_receber',
          title: 'Cachês a Receber',
          desc: 'Sinais pendentes, quitações e propostas',
          icon: DollarSign,
          action: () => navigate('/shows?tab=history'),
          keywords: 'caches receber sinal pix contratos'
        },
        {
          id: 'relatorio_shows',
          title: 'Relatório de Shows',
          desc: 'Diagnóstico financeiro e faturamento musical',
          icon: FileText,
          action: () => navigate('/relatorios'),
          keywords: 'relatorio carreira musica shows lucros'
        },
        {
          id: 'gastos_logisticos',
          title: 'Gastos Logísticos',
          desc: 'Combustível, equipe e custos de palco',
          icon: Receipt,
          action: () => navigate('/lancamentos?status=all&type=expense'),
          keywords: 'logistica gasolina combustivel equipe musicos'
        }
      ]
    },
    {
      id: 'debts',
      title: 'Passivos e Contas',
      icon: CreditCard,
      color: 'text-rose-400',
      items: [
        {
          id: 'controle_dividas',
          title: 'Controle de Dívidas',
          desc: 'Financiamentos, empréstimos e progresso de quitação',
          icon: ShieldAlert,
          action: () => navigate('/dividas'),
          keywords: 'dividas financiamento emprestimo quitacao'
        },
        {
          id: 'contas_fixas',
          title: 'Contas Fixas & Recorrentes',
          desc: 'Compromissos agendados e despesas do mês',
          icon: RefreshCw,
          action: () => navigate('/lancamentos?status=pending'),
          keywords: 'contas fixas pendentes recorrentes agendadas'
        },
        {
          id: 'parcelamentos',
          title: 'Parcelamentos Abertos',
          desc: 'Evolução de parcelas de cartão e bancos',
          icon: CreditCard,
          action: () => navigate('/dividas'),
          keywords: 'parcelas parcelamento cartao credito'
        }
      ]
    },
    {
      id: 'ai',
      title: 'Inteligência & Automações',
      icon: Sparkles,
      color: 'text-purple-400',
      items: [
        {
          id: 'relatorio_ia',
          title: 'Relatório Financeiro para IA',
          desc: 'Exportar dados para análise com o Gemini',
          icon: Sparkles,
          action: () => navigate('/relatorios?tab=ai'),
          badge: 'Gemini',
          keywords: 'ia inteligência gemini relatorio diagnostico'
        },
        {
          id: 'importador_extrato',
          title: 'Importador de Extrato Bancário',
          desc: 'Subir arquivos .OFX ou .CSV de qualquer banco',
          icon: UploadCloud,
          action: () => setIsBankImportOpen(true),
          keywords: 'importar extrato ofx csv banco'
        }
      ]
    },
    {
      id: 'system',
      title: 'Sistema & Ajustes',
      icon: Sliders,
      color: 'text-zinc-400',
      items: [
        {
          id: 'config_gerais',
          title: 'Conta Firebase & Sincronização',
          desc: 'Status de conexão em nuvem e login Google',
          icon: Database,
          action: () => setActiveSubScreen('settings'),
          keywords: 'firebase nuvem conta google sync sincronizacao'
        },
        {
          id: 'backup_json',
          title: 'Backup & Restauração JSON',
          desc: 'Exportar e importar dados locais com segurança',
          icon: ShieldCheck,
          action: () => setActiveSubScreen('settings'),
          keywords: 'backup restauracao json exportar importar'
        },
        {
          id: 'parametros_financeiros',
          title: 'Parâmetros Financeiros',
          desc: 'Configurar limites, reserva de emergência e regras',
          icon: Sliders,
          action: () => setActiveSubScreen('financial'),
          keywords: 'parametros reserva metas configuracao'
        },
        {
          id: 'central_alertas',
          title: 'Central de Alertas',
          desc: 'Avisos de vencimento e inconsistências',
          icon: Bell,
          action: () => setActiveSubScreen('alerts'),
          badge: alertsCount > 0 ? `${alertsCount}` : undefined,
          keywords: 'alertas avisos vencimentos notificacoes'
        }
      ]
    }
  ], [navigate, alertsCount]);

  // Filtro de Busca em Tempo Real
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();

    const matches: MenuItem[] = [];
    menuCategories.forEach(cat => {
      cat.items.forEach(item => {
        if (
          item.title.toLowerCase().includes(term) ||
          item.desc.toLowerCase().includes(term) ||
          item.keywords.toLowerCase().includes(term)
        ) {
          matches.push(item);
        }
      });
    });
    return matches;
  }, [searchTerm, menuCategories]);

  // Se uma sub-tela específica estiver ativa (Configurações, Categorias, etc.)
  if (activeSubScreen) {
    return (
      <div className="space-y-4 pb-28 animate-fade-in text-white">
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setActiveSubScreen(null)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition active:scale-95"
          >
            <ChevronLeft size={16} />
            <span>Voltar ao Menu</span>
          </button>
        </div>

        {activeSubScreen === 'settings' && <Settings />}
        {activeSubScreen === 'financial' && <FinancialSettingsScreen />}
        {activeSubScreen === 'categories' && <CategoryList />}
        {activeSubScreen === 'alerts' && <AlertsScreen />}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 animate-fade-in text-white">
      {/* ========================================================================= */}
      {/* 1. TOPO DO MENU: CAMPO DE PESQUISA & ENGRENAGEM DE CONFIGURAÇÕES          */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pt-1 gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Menu & Serviços</span>
          </h1>
          <p className="text-[11px] text-zinc-400 font-medium">Acesso rápido a todas as funções do app</p>
        </div>

        {/* Botão de Engrenagem Direto para Configurações Gerais */}
        <button
          onClick={() => setActiveSubScreen('settings')}
          className="p-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-[#fcca00] transition active:scale-95 shadow-md shrink-0"
          title="Configurações Gerais (Firebase, Backup, Exportação)"
        >
          <SettingsIcon size={19} />
        </button>
      </div>

      {/* CAMPO DE PESQUISA EM TEMPO REAL: "O que você procura?" */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 text-zinc-400" size={17} />
        <input
          type="text"
          placeholder="O que você procura? (ex: extrato, shows, dívidas, backup...)"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-[#141416] border border-zinc-800 text-white placeholder-zinc-400 text-xs focus:border-blue-500 outline-none shadow-inner"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-3 text-zinc-400 hover:text-white"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* CARD DE STATUS DA CONTA & SINCRONIZAÇÃO NUVEM */}
      <AuthHeaderWidget />

      {/* ========================================================================= */}
      {/* 2. RESULTADOS DA PESQUISA EM TEMPO REAL                                   */}
      {/* ========================================================================= */}
      {filteredResults !== null ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Resultados da Busca ({filteredResults.length})
            </span>
          </div>

          {filteredResults.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
              Nenhuma função encontrada para "{searchTerm}".
            </div>
          ) : (
            <div className="space-y-2">
              {filteredResults.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    className="p-3.5 rounded-2xl bg-[#141416] border border-zinc-800 hover:border-blue-500/50 transition flex items-center justify-between cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate">
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 block truncate">{item.desc}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400 group-hover:text-white transition shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. CORPO DO MENU: ACCORDION EXPANSÍVEL POR CATEGORIA (ESTILO BB)          */
        /* ========================================================================= */
        <div className="space-y-3">
          {menuCategories.map(category => {
            const isOpen = openSections[category.id] ?? false;
            const CategoryIcon = category.icon;

            return (
              <div 
                key={category.id}
                className="rounded-3xl bg-[#141416] border border-zinc-800/90 overflow-hidden shadow-xs transition"
              >
                {/* Cabeçalho do Accordion */}
                <button
                  onClick={() => toggleSection(category.id)}
                  className="w-full p-4 flex items-center justify-between bg-zinc-900/60 hover:bg-zinc-800/40 transition text-left"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-2 rounded-xl bg-zinc-800 ${category.color} shrink-0`}>
                      <CategoryIcon size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white tracking-wide">
                        {category.title}
                      </h3>
                      <span className="text-[10px] text-zinc-400">
                        {category.items.length} opções disponíveis
                      </span>
                    </div>
                  </div>

                  <div className={`p-1 rounded-lg text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}>
                    <ChevronDown size={17} />
                  </div>
                </button>

                {/* Itens Internos do Accordion */}
                {isOpen && (
                  <div className="divide-y divide-zinc-800/60 border-t border-zinc-800/60 bg-[#121214]">
                    {category.items.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={item.action}
                          className="p-3.5 px-4 hover:bg-zinc-800/30 transition flex items-center justify-between cursor-pointer group active:scale-[0.99]"
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 text-zinc-300 group-hover:text-blue-400 group-hover:bg-blue-500/10 flex items-center justify-center shrink-0 transition">
                              <ItemIcon size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-[#fcca00] border border-amber-500/30">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-400 block truncate">{item.desc}</span>
                            </div>
                          </div>

                          <ChevronRight size={15} className="text-zinc-400 group-hover:text-white transition shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE LANÇAMENTO RÁPIDO */}
      {isTxModalOpen && (
        <TransactionForm
          onClose={() => setIsTxModalOpen(false)}
        />
      )}

      {/* MODAL DE IMPORTAÇÃO BANCÁRIA */}
      {isBankImportOpen && (
        <BankImportModal
          isOpen={isBankImportOpen}
          onClose={() => setIsBankImportOpen(false)}
        />
      )}
    </div>
  );
};
