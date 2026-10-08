import React, { useState, useMemo } from 'react';
import { Show, Transaction, AppSettings } from '../../types';
import { 
  X, Download, FileJson, Check, Copy, Sparkles, Database, 
  Calendar, DollarSign, TrendingUp, AlertCircle, ShieldCheck, 
  FileCheck2, ChevronRight, Eye, Code, Users, Car, Hammer
} from 'lucide-react';
import { buildShowsERPMigrationData, downloadShowsERPMigrationJSON, ERPExportPayload } from '../../services/showExportService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shows: Show[];
  transactions: Transaction[];
  settings?: AppSettings;
}

export const ExportShowsERPModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shows,
  transactions,
  settings
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'preview' | 'campos'>('resumo');

  const exportPayload: ERPExportPayload = useMemo(() => {
    return buildShowsERPMigrationData(shows, transactions, settings);
  }, [shows, transactions, settings]);

  const jsonString = useMemo(() => {
    return JSON.stringify(exportPayload, null, 2);
  }, [exportPayload]);

  if (!isOpen) return null;

  const handleDownload = () => {
    downloadShowsERPMigrationJSON(shows, transactions, settings);
    setDownloadTriggered(true);
    setTimeout(() => setDownloadTriggered(false), 3000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar JSON:', err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const { resumo_financeiro_global, distribuicao_por_status_agenda, total_shows_cadastrados } = exportPayload;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#121214] border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl shadow-purple-950/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-950/50 via-[#181524] to-[#121214] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-600/20 border border-purple-500/40 rounded-2xl text-purple-400">
              <Database size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                  Exportação Completa ERP
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {total_shows_cadastrados} {total_shows_cadastrados === 1 ? 'Show' : 'Shows'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Migração de Shows para ERP
              </h2>
              <p className="text-xs text-zinc-400">
                Arquivo padronizado: <span className="font-mono text-purple-300 font-bold">shows_migracao_leo_ferreira.json</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS DE NAVEGAÇÃO INTERNA */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 px-5 pt-2">
          <button
            onClick={() => setActiveTab('resumo')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'resumo' 
                ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-xl' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp size={14} />
            <span>Resumo da Migração</span>
          </button>

          <button
            onClick={() => setActiveTab('campos')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'campos' 
                ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-xl' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCheck2 size={14} />
            <span>Campos Incluídos</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'preview' 
                ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-xl' 
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code size={14} />
            <span>Inspecionar JSON</span>
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'resumo' && (
            <div className="space-y-5">
              {/* CARD DE DESTAQUE COM O ARQUIVO GERADO */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/20 via-zinc-900/60 to-emerald-950/20 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                    <FileJson size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white flex items-center space-x-1.5">
                      <span>shows_migracao_leo_ferreira.json</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Pronto para ERP</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Contém todos os objetos, chaves originais e estrutura completa com cachês, custos e agenda.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center space-x-1.5 border border-zinc-700"
                    title="Copiar JSON para a área de transferência"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 shadow-lg shadow-purple-600/20 active:scale-95"
                  >
                    <Download size={14} strokeWidth={2.5} />
                    <span>Baixar JSON</span>
                  </button>
                </div>
              </div>

              {/* STATS FINANCEIROS CONSOLIDADOS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cachê Bruto Total</div>
                  <div className="text-base sm:text-lg font-black text-white mt-1">
                    {formatCurrency(resumo_financeiro_global.total_cache_bruto)}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Soma contratada</div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Custos Somados</div>
                  <div className="text-base sm:text-lg font-black text-rose-300 mt-1">
                    {formatCurrency(resumo_financeiro_global.total_custos_somados)}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">Músicos + Logística + Som</div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Cachê Líquido Total</div>
                  <div className="text-base sm:text-lg font-black text-emerald-300 mt-1">
                    {formatCurrency(resumo_financeiro_global.total_cache_liquido)}
                  </div>
                  <div className="text-[10px] text-emerald-500 font-bold mt-0.5">
                    Margem: {resumo_financeiro_global.margem_lucro_global_percent}%
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Total Recebido</div>
                  <div className="text-base sm:text-lg font-black text-sky-300 mt-1">
                    {formatCurrency(resumo_financeiro_global.total_recebido)}
                  </div>
                  <div className="text-[10px] text-amber-400 font-bold mt-0.5">
                    Pendente: {formatCurrency(resumo_financeiro_global.total_pendente)}
                  </div>
                </div>
              </div>

              {/* DISTRIBUIÇÃO POR STATUS DE AGENDA */}
              <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl space-y-3">
                <div className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Distribuição por Status da Agenda (Mapeado p/ ERP)</span>
                  <span className="text-zinc-500 font-normal">{total_shows_cadastrados} eventos</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 block">Confirmados</span>
                      <span className="text-lg font-black text-white">{distribuicao_por_status_agenda.confirmados}</span>
                    </div>
                    <Calendar size={18} className="text-emerald-400" />
                  </div>

                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 block">Realizados</span>
                      <span className="text-lg font-black text-white">{distribuicao_por_status_agenda.realizados}</span>
                    </div>
                    <ShieldCheck size={18} className="text-purple-400" />
                  </div>

                  <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-sky-400 block">Orçamento / Lead</span>
                      <span className="text-lg font-black text-white">{distribuicao_por_status_agenda.orcamentos_leads}</span>
                    </div>
                    <FileCheck2 size={18} className="text-sky-400" />
                  </div>

                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-rose-400 block">Cancelados</span>
                      <span className="text-lg font-black text-white">{distribuicao_por_status_agenda.cancelados}</span>
                    </div>
                    <AlertCircle size={18} className="text-rose-400" />
                  </div>
                </div>
              </div>

              {/* LISTA RESUMIDA DOS PRIMEIROS SHOWS */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-400 flex items-center justify-between">
                  <span>Prévia dos Shows Mapeados</span>
                  <span className="text-[11px] text-purple-400 font-bold">100% dos dados preservados</span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {exportPayload.shows.map((s, idx) => (
                    <div 
                      key={s.id || idx}
                      className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-white truncate">{s.nome_evento_local}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            s.status_agenda === 'Confirmado' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            s.status_agenda === 'Realizado' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          }`}>
                            {s.status_agenda}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                          <span>{s.data_show} • {s.horario_inicio}</span>
                          <span>•</span>
                          <span>{s.cidade} - {s.estado}</span>
                          <span>•</span>
                          <span className="text-zinc-300 font-bold">{s.nome_contratante}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <div className="font-black text-white">{formatCurrency(s.cache_bruto)}</div>
                        <div className="text-[10px] text-emerald-400 font-bold">
                          Líq: {formatCurrency(s.cache_liquido)}
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          {s.status_pagamento}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'campos' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
                <h3 className="font-black text-white flex items-center space-x-2 text-sm">
                  <ShieldCheck size={18} className="text-purple-400" />
                  <span>Dicionário dos Dados Exportados para ERP</span>
                </h3>
                <p className="text-zinc-400">
                  Todas as chaves solicitadas foram organizadas tanto na raiz do objeto quanto em grupos hierárquicos para adaptação direta em qualquer banco ou ERP:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* IDENTIFICAÇÃO */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                    <span className="font-black text-purple-300 uppercase tracking-wider text-[11px] block">
                      1. Identificação
                    </span>
                    <ul className="text-zinc-300 space-y-1 text-[11px]">
                      <li>• <span className="font-mono text-purple-400">id / id_show</span>: ID único do show</li>
                      <li>• <span className="font-mono text-purple-400">nome_evento_local</span>: Nome do Evento / Casa</li>
                      <li>• <span className="font-mono text-purple-400">nome_contratante</span>: Nome do Contratante</li>
                      <li>• <span className="font-mono text-purple-400">telefone_contato</span>: WhatsApp / Telefone</li>
                      <li>• <span className="font-mono text-purple-400">cidade</span>: Cidade da apresentação</li>
                      <li>• <span className="font-mono text-purple-400">estado</span>: UF (Estado)</li>
                      <li>• <span className="font-mono text-purple-400">tipo_evento</span>: Casamento, Pub, Corporativo, etc.</li>
                    </ul>
                  </div>

                  {/* DATAS E HORÁRIOS */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                    <span className="font-black text-sky-300 uppercase tracking-wider text-[11px] block">
                      2. Datas e Horários
                    </span>
                    <ul className="text-zinc-300 space-y-1 text-[11px]">
                      <li>• <span className="font-mono text-sky-400">data_show</span>: Data da apresentação (YYYY-MM-DD)</li>
                      <li>• <span className="font-mono text-sky-400">horario_inicio</span>: Horário de início</li>
                      <li>• <span className="font-mono text-sky-400">horario_termino</span>: Horário de término</li>
                      <li>• <span className="font-mono text-sky-400">duracao</span>: Duração estimada (ex: 3h)</li>
                    </ul>
                  </div>

                  {/* FINANCEIRO */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                    <span className="font-black text-emerald-300 uppercase tracking-wider text-[11px] block">
                      3. Financeiro
                    </span>
                    <ul className="text-zinc-300 space-y-1 text-[11px]">
                      <li>• <span className="font-mono text-emerald-400">cache_bruto</span>: Valor Combinado Contratado</li>
                      <li>• <span className="font-mono text-emerald-400">valor_sinal_entrada</span>: Sinal pago ou previsto</li>
                      <li>• <span className="font-mono text-emerald-400">cache_liquido</span>: Bruto deduzido de todos os custos</li>
                      <li>• <span className="font-mono text-emerald-400">status_pagamento</span>: Pendente, Pago ou Sinal Pago</li>
                      <li>• <span className="font-mono text-emerald-400">valor_total_recebido</span> / <span className="font-mono text-emerald-400">valor_pendente</span></li>
                    </ul>
                  </div>

                  {/* DETALHAMENTO DE CUSTOS */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5">
                    <span className="font-black text-rose-300 uppercase tracking-wider text-[11px] block">
                      4. Detalhamento de Custos
                    </span>
                    <ul className="text-zinc-300 space-y-1 text-[11px]">
                      <li>• <span className="font-mono text-rose-400">custos_musicos_freelancers</span>: Nomes, funções, cachês</li>
                      <li>• <span className="font-mono text-rose-400">custos_logistica</span>: Combustível, Pedágio, Uber, KM</li>
                      <li>• <span className="font-mono text-rose-400">custos_som_equipamentos</span>: Aluguel, manutenção, PA</li>
                      <li>• <span className="font-mono text-rose-400">custo_total_somado</span>: Soma de todas as despesas</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1 mt-3">
                  <span className="font-black text-amber-300 uppercase tracking-wider text-[11px] block">
                    5. Status da Agenda & Preservação Integral
                  </span>
                  <p className="text-zinc-300 text-[11px]">
                    • <span className="font-mono text-amber-400">status_agenda</span>: Estritamente classificado como <strong className="text-white">Confirmado</strong>, <strong className="text-white">Realizado</strong> ou <strong className="text-white">Orçamento/Lead</strong>.
                  </p>
                  <p className="text-zinc-300 text-[11px]">
                    • <span className="font-mono text-amber-400">dados_completos_originais</span>: Objeto intacto com 100% das chaves (nenhum detalhe técnico ou customizado foi omitido).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Visualizador de Código JSON Gerado ({jsonString.length.toLocaleString()} caracteres)</span>
                <button
                  onClick={handleCopy}
                  className="text-purple-400 hover:text-purple-300 font-bold flex items-center space-x-1"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado para Área de Transferência' : 'Copiar Tudo'}</span>
                </button>
              </div>

              <pre className="p-4 bg-black/90 border border-zinc-800 rounded-2xl text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-96 selection:bg-purple-600/30">
                {jsonString}
              </pre>
            </div>
          )}
        </div>

        {/* FOOTER COM AÇÕES */}
        <div className="p-4 sm:p-5 bg-zinc-900/60 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 flex items-center space-x-2">
            <Sparkles size={15} className="text-purple-400" />
            <span>Arquivo destino: <strong className="text-white">shows_migracao_leo_ferreira.json</strong></span>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition flex-1 sm:flex-initial"
            >
              Fechar
            </button>

            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center justify-center space-x-1.5 flex-1 sm:flex-initial"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/25 active:scale-95 flex-1 sm:flex-initial"
            >
              <Download size={16} strokeWidth={2.5} />
              <span>{downloadTriggered ? 'Arquivo Baixado!' : 'Exportar Todos os Shows (Migração ERP)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
