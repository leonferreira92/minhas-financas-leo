import React, { useRef, useState } from 'react';
import { 
  X, Download, Share2, Printer, Check, Info, ShieldCheck, 
  MapPin, Calendar, Clock, DollarSign, User, Music, Phone, Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Show } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { valorPorExtenso } from '../../services/currencyInWords';

interface ReciboModalProps {
  isOpen: boolean;
  onClose: () => void;
  show: Show;
  sinalAmount?: number; // Valor recebido (sinal)
  totalCacheAmount?: number; // Cachê total
}

export const ReciboModal: React.FC<ReciboModalProps> = ({
  isOpen,
  onClose,
  show,
  sinalAmount,
  totalCacheAmount
}) => {
  const { settings, transactions } = useFinance();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Cálculos de Valores
  // 1. Total Cache: usa totalCacheAmount ou show.totalCache
  const totalCache = typeof totalCacheAmount === 'number' && totalCacheAmount > 0 
    ? totalCacheAmount 
    : (show.totalCache || show.cacheCombined || 0);

  // 2. Sinal Pago: usa sinalAmount se fornecido; senão busca no show / transações vinculadas
  let sinalPago = typeof sinalAmount === 'number' ? sinalAmount : 0;
  if (!sinalPago) {
    const showIncomeTxs = transactions.filter(t => 
      t.type === 'income' && 
      t.status === 'paid' && 
      (t.showId === show.id || (t.description && t.description.toLowerCase().includes(show.name.toLowerCase())))
    );
    sinalPago = showIncomeTxs.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    if (!sinalPago && show.cacheReceived) {
      sinalPago = show.cacheReceived;
    }
  }

  // Se ainda estiver zero (ex: acabou de cadastrar), sugere padrão 50% ou o cachê
  if (sinalPago === 0 && totalCache > 0) {
    sinalPago = Math.round(totalCache * 0.5);
  }

  const saldoRestante = Math.max(0, totalCache - sinalPago);
  const sinalPercent = totalCache > 0 ? Math.round((sinalPago / totalCache) * 100) : 50;

  // Dados do Músico (Settings)
  const musicianName = settings.userName || 'Leonardo Ferreira';
  const artisticName = settings.careerProjectName || 'Leo Ferreira';
  const musicianCpf = settings.musicianCpf || '000.000.000-00';
  const musicianCity = settings.musicianCity || show.city || 'Baependi - MG';

  // Formatação de Datas
  const formatDateBR = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
  };

  const hoje = new Date();
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const dataExtensoHoje = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0);
  };

  // Gerar e Baixar PDF em alta definição
  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingPDF(true);
    try {
      // Clona o container para renderizar de forma consistente sem cortes de scroll
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2.5, // 2.5x para alta resolução
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794 // Largura típica A4 em 96 DPI
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const cleanDate = show.date || hoje.toISOString().slice(0, 10);
      const cleanName = (show.contractorName || show.name || 'evento')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

      pdf.save(`recibo_sinal_${cleanName}_${cleanDate}.pdf`);
    } catch (err) {
      console.error('Falha ao gerar o PDF do recibo:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Disparar WhatsApp com mensagem pronta
  const handleWhatsAppShare = () => {
    const rawPhone = (show.contractorPhone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length >= 10 
      ? (rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`) 
      : '';

    const text = 
`📄 *RECIBO DE AGENDAMENTO & RESERVA*
────────────────────────
Olá, *${show.contractorName || show.name}*!

Confirmamos o agendamento da sua apresentação musical com *${artisticName}* (${musicianName}):

🎵 *Evento:* ${show.eventType || 'Apresentação Musical Ao Vivo'}
📅 *Data:* ${formatDateBR(show.date)} às ${show.time || '20:00'}${show.endTime ? ` às ${show.endTime}` : ''}
📍 *Local:* ${show.location || 'Local combinado'} ${show.city ? `• ${show.city}` : ''}

💰 *Cachê Total Acordado:* ${formatCurrency(totalCache)}
🟢 *Sinal Recebido:* ${formatCurrency(sinalPago)} (${sinalPercent}%)
⏳ *Saldo Restante:* ${formatCurrency(saldoRestante)} (a quitar no dia do evento)

Status: ✅ *DATA RESERVADA E CONFIRMADA*
────────────────────────
${musicianCity}, ${dataExtensoHoje}
*${musicianName}* | CPF: ${musicianCpf}`;

    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank');
  };

  // Copiar texto para área de transferência
  const handleCopySummary = () => {
    const text = 
`📄 RECIBO DE AGENDAMENTO - ${artisticName}
Contratante: ${show.contractorName || show.name}
Data do Evento: ${formatDateBR(show.date)} às ${show.time || '20:00'}
Local: ${show.location || ''} (${show.city || ''})
Cachê Total: ${formatCurrency(totalCache)}
Sinal Pago: ${formatCurrency(sinalPago)} (${sinalPercent}%)
Saldo Restante: ${formatCurrency(saldoRestante)}
Status: CONFIRMADO`;

    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      
      {/* Modal Container */}
      <div className="w-full max-w-2xl max-h-[96vh] flex flex-col bg-[#121212] rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden my-auto">
        
        {/* BARRA DE FERRAMENTAS / AÇÕES SUPERIORES */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#18181b] border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
              Comprovante de Agendamento & Sinal
            </h3>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Botão Baixar PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
              title="Baixar Recibo em PDF"
            >
              {isGeneratingPDF ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} strokeWidth={2.5} />
              )}
              <span className="hidden sm:inline">Baixar PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Botão Compartilhar WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-3 sm:px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-[#25D366]/20 active:scale-95 transition"
              title="Enviar Recibo no WhatsApp"
            >
              <Share2 size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Botão Copiar */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Copiar Resumo"
            >
              {copiedLink ? <Check size={16} className="text-emerald-400" /> : <Printer size={16} />}
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition ml-1"
              title="Fechar Visualização"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ÁREA COM SCROLL DO DOCUMENTO */}
        <div className="overflow-y-auto p-3 sm:p-6 bg-zinc-950 flex justify-center custom-scrollbar flex-1">
          
          {/* ========================================================================= */}
          {/* CONTAINER DO RECIBO (DESIGN SYSTEM FINTECH INSTITUCIONAL - BRANCO)        */}
          {/* ========================================================================= */}
          <div 
            ref={receiptRef}
            className="w-full max-w-xl bg-white text-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden font-sans select-text"
            style={{ minHeight: '620px' }}
          >
            
            {/* 1. CABEÇALHO ESCURO (#09090b) */}
            <div className="bg-[#09090b] text-white p-5 sm:p-6 flex items-start justify-between border-b border-zinc-800">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                    <Music size={15} />
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                    {artisticName}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight mt-1">
                  RECIBO DE AGENDAMENTO
                </h1>
                <p className="text-xs text-zinc-400 font-medium">
                  Comprovante de Reserva & Sinal
                </p>
              </div>

              {/* Pill Arredondada Verde #22c55e */}
              <div className="shrink-0 pt-1">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#22c55e]/15 text-[#16a34a] border border-[#22c55e]/40 text-[10px] font-black tracking-wider uppercase shadow-xs">
                  <Check size={11} strokeWidth={3} />
                  <span>CONFIRMADO</span>
                </span>
              </div>
            </div>

            {/* CONTEÚDO DO RECIBO */}
            <div className="p-5 sm:p-6 space-y-5">
              
              {/* 2. CARD DE DESTAQUE DE VALOR (Borda lateral verde 4px) */}
              <div className="p-4 sm:p-5 rounded-r-2xl bg-emerald-50/70 border-l-4 border-emerald-500 border-y border-r border-emerald-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-900 block">
                    VALOR RECEBIDO (SINAL {sinalPercent}%)
                  </span>
                  <span className="text-xs text-zinc-600 italic block mt-0.5 leading-snug">
                    ({valorPorExtenso(sinalPago)})
                  </span>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight tabular-nums block">
                    {formatCurrency(sinalPago)}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-800">
                    Depósito / Baixa Efetuada
                  </span>
                </div>
              </div>

              {/* 3. CARD DE AVISO AZUL CLARO */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-blue-50/90 border border-blue-200/80 flex items-start space-x-2.5 text-blue-900 shadow-xs">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  Este documento serve como comprovante de reserva de data e quitação parcial de sinal para prestação de contas.
                </p>
              </div>

              {/* 4. SEÇÃO "INFORMAÇÕES DAS PARTES" */}
              <div className="pt-2 border-t border-zinc-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                  INFORMAÇÕES DAS PARTES
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Coluna Contratante */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">
                      Contratante / Pagador
                    </span>
                    <strong className="text-sm font-black text-zinc-900 block truncate">
                      {show.contractorName || show.name}
                    </strong>
                    {show.contractorPhone && (
                      <span className="text-zinc-600 text-[11px] block">
                        Tel: {show.contractorPhone}
                      </span>
                    )}
                    {show.eventType && (
                      <span className="text-zinc-500 text-[10px] uppercase font-bold block">
                        Finalidade: {show.eventType}
                      </span>
                    )}
                  </div>

                  {/* Coluna Prestador do Serviço */}
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">
                      Prestador do Serviço
                    </span>
                    <strong className="text-sm font-black text-zinc-900 block truncate">
                      {musicianName}
                    </strong>
                    <span className="text-zinc-700 text-[11px] font-semibold block">
                      Nome Artístico: {artisticName}
                    </span>
                    <span className="text-zinc-600 text-[11px] block">
                      CPF: {musicianCpf}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. SEÇÃO "RESUMO DO EVENTO & CONDIÇÕES" */}
              <div className="pt-2 border-t border-zinc-100 space-y-2.5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  RESUMO DO EVENTO & CONDIÇÕES
                </h4>

                {/* Tabela Limpa */}
                <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100/90 text-zinc-600 border-b border-zinc-200">
                        <th className="py-2.5 px-3 font-black text-[10px] uppercase tracking-wider">
                          Descrição do Item
                        </th>
                        <th className="py-2.5 px-3 font-black text-[10px] uppercase tracking-wider">
                          Detalhes
                        </th>
                        <th className="py-2.5 px-3 font-black text-[10px] uppercase tracking-wider text-right">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-800">
                      <tr>
                        <td className="py-2.5 px-3 font-bold">
                          Apresentação Musical Ao Vivo
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600">
                          {show.eventType || 'Show Ao Vivo'} ({show.time || '20:00'}{show.endTime ? ` às ${show.endTime}` : ''})
                        </td>
                        <td className="py-2.5 px-3 text-right font-black tabular-nums">
                          {formatCurrency(totalCache)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold">
                          Data do Evento
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600">
                          {formatDateBR(show.date)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-bold text-[11px]">
                          Confirmada
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-bold">
                          Localização
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600" colSpan={2}>
                          {show.location || 'Local a definir'} {show.city ? `• ${show.city}` : ''}
                        </td>
                      </tr>
                    </tbody>
                    
                    {/* TOTAIS DESTACADOS NO RODAPÉ */}
                    <tfoot>
                      <tr className="bg-zinc-50 border-t border-zinc-200">
                        <td colSpan={2} className="py-2 px-3 text-right font-bold text-zinc-600 text-[11px]">
                          Valor Total Acordado:
                        </td>
                        <td className="py-2 px-3 text-right font-black text-zinc-900 tabular-nums">
                          {formatCurrency(totalCache)}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/60 border-t border-emerald-100">
                        <td colSpan={2} className="py-2 px-3 text-right font-black text-emerald-800 text-[11px] uppercase">
                          Sinal Pago:
                        </td>
                        <td className="py-2 px-3 text-right font-black text-emerald-600 tabular-nums">
                          - {formatCurrency(sinalPago)}
                        </td>
                      </tr>
                      <tr className="bg-amber-50/70 border-t border-amber-200/80">
                        <td colSpan={2} className="py-2 px-3 text-right font-black text-amber-900 text-xs uppercase">
                          Saldo Restante (A quitar no dia do evento):
                        </td>
                        <td className="py-2 px-3 text-right font-black text-amber-700 text-sm tabular-nums">
                          {formatCurrency(saldoRestante)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 6. RODAPÉ INSTITUCIONAL */}
              <div className="pt-6 space-y-8 border-t border-zinc-100">
                {/* Cidade-UF e Data de emissão alinhados à direita */}
                <div className="text-right">
                  <p className="text-xs font-semibold text-zinc-500">
                    {musicianCity}, {dataExtensoHoje}.
                  </p>
                </div>

                {/* Linha de Assinatura Centralizada */}
                <div className="text-center pt-4">
                  <div className="w-64 border-t border-zinc-400 mx-auto mb-1.5" />
                  <p className="text-xs font-black text-zinc-900 uppercase tracking-wide">
                    {musicianName}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    CPF: {musicianCpf} • {artisticName}
                  </p>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">
                    Músico / Prestador de Serviços Artísticos
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
