import { GoogleGenAI } from "@google/genai";
import { Transaction, Category } from "../types";

// Robust JSON Extraction: Finds the first { and last } to isolate the JSON object
const extractJSON = (text: string) => {
  try {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      const jsonStr = text.substring(startIndex, endIndex + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text); // Fallback try
  } catch (e) {
    console.error("Failed to parse AI JSON response", e);
    return null;
  }
};

interface AnalysisContext {
  transactions: Transaction[];
  categories: Category[];
  currentMonth: string;
  metrics: {
    monthlyAverageExpense: number;
    topCategoryName: string;
    topCategoryValue: number;
    realBalance: number;
    projectedBalance: number;
    savingsRate: number;
  }
}

export const GeminiService = {
  analyzeFinances: async ({ transactions, categories, currentMonth, metrics }: AnalysisContext) => {
    // Fixed: Always create a new GoogleGenAI instance right before the call as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Simplify transaction data to save tokens and reduce noise
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
      .map(t => `${t.description}: ${t.amount} (${t.type})`);

    const prompt = `
      Atue como um consultor financeiro pessoal direto e motivador.
      DADOS DO MÊS (${currentMonth}):
      - Balanço Previsto: R$ ${metrics.projectedBalance.toFixed(2)}
      - Maior Gasto: ${metrics.topCategoryName} (R$ ${metrics.topCategoryValue.toFixed(2)})
      - Taxa Poupança: ${(metrics.savingsRate * 100).toFixed(0)}%
      - Histórico Recente: ${JSON.stringify(recentTransactions)}

      TAREFA:
      Analise os dados e forneça 3 dicas EXTREMAMENTE PRÁTICAS e curtas (máx 20 palavras cada) para melhorar a saúde financeira.
      Foque em cortar gastos supérfluos ou otimizar o maior gasto.
      
      FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
      { 
        "tips": [
          { "title": "Título Curto (Ex: Corte o Café)", "description": "Explicação direta.", "impact": "Alto|Médio|Baixo", "icon": "Coffee|ShoppingBag|Car|Utensils" } 
        ] 
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const parsed = extractJSON(response.text || '');
      return parsed || { tips: [] };
    } catch (error) {
      console.error(error);
      return { tips: [] };
    }
  },



  predictTransaction: async (description: string, history: Transaction[], categories: Category[]) => {
    // Fixed: Always create a new GoogleGenAI instance right before the call as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Minimal context for speed
    const categoryList = categories.map(c => c.name).join(', ');
    
    const prompt = `
      Classifique a transação: "${description}".
      Categorias disponíveis: ${categoryList}.
      Responda APENAS JSON: { "categoryId": "ID_DA_CATEGORIA_MAIS_PROVAVEL", "type": "expense|income", "amount": 0 (se estimável, senão 0) }
      Nota: Tente mapear para uma categoria existente pelo nome. Se for Uber -> Transporte, etc.
    `;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const result = extractJSON(response.text || '');
      
      // Match category name back to ID since AI might return name
      if (result && result.categoryId) {
         // Try to find by name if ID match fails (AI hallucination safeguard)
         const catByName = categories.find(c => c.name.toLowerCase() === result.categoryId.toLowerCase() || c.id === result.categoryId);
         if (catByName) {
             result.categoryId = catByName.id;
         } else {
             // Fallback default
             result.categoryId = ''; 
         }
      }
      return result;
    } catch (error) {
      return null;
    }
  },

  categorizeTransactionAI: async (description: string, categories: Category[]) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const categoryList = categories.map(c => c.name).join(', ');

    const prompt = `
      Analise a seguinte transação financeira: "${description}".
      Categorias disponíveis: ${categoryList}.
      
      Retorne obrigatoriamente um JSON no seguinte formato:
      {
        "categoria": "Nome da Categoria",
        "confianca": 0.95,
        "dica_economia": "Uma dica curta para economizar nesta categoria."
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      return extractJSON(response.text || '');
    } catch (error) {
      console.error("AI Categorization failed", error);
      return null;
    }
  }
};
