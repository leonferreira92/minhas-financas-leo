/**
 * Utilitário para converter valores monetários em reais por extenso (Português Brasileiro)
 * Ex: 450 -> "quatrocentos e cinquenta reais"
 */

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const ESPECIAIS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function converterGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';

  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  const partes: string[] = [];

  if (c > 0) partes.push(CENTENAS[c]);

  if (d === 1) {
    partes.push(ESPECIAIS[u]);
  } else {
    if (d > 1) partes.push(DEZENAS[d]);
    if (u > 0) partes.push(UNIDADES[u]);
  }

  return partes.join(' e ');
}

export function valorPorExtenso(valor: number): string {
  if (!valor || isNaN(valor) || valor <= 0) return 'zero reais';

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  const partes: string[] = [];

  // Milhões
  const milhoes = Math.floor(inteiro / 1000000);
  // Milhares
  const milhares = Math.floor((inteiro % 1000000) / 1000);
  // Unidades/Centenas
  const resto = inteiro % 1000;

  if (milhoes > 0) {
    partes.push(converterGrupo(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
  }

  if (milhares > 0) {
    if (milhares === 1) {
      partes.push('um mil');
    } else {
      partes.push(converterGrupo(milhares) + ' mil');
    }
  }

  if (resto > 0) {
    partes.push(converterGrupo(resto));
  }

  let resultado = partes.join(' e ');
  if (inteiro === 1) {
    resultado += ' real';
  } else if (inteiro > 1) {
    resultado += ' reais';
  }

  if (centavos > 0) {
    const centavosTexto = converterGrupo(centavos);
    resultado += ` e ${centavosTexto} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }

  return resultado;
}
