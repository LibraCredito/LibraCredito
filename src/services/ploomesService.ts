/**
 * Serviço de integração com Ploomes CRM
 * 
 * @service ploomesService
 * @description Serviço responsável pela integração com a API do Ploomes para cadastro de propostas
 * 
 * @features
 * - Cadastro de propostas online
 * - Validação de duplicidade (7 dias)
 * - Formatação de dados para API
 * - Tratamento de erros
 * 
 * @businessRules
 * - Todos os campos são obrigatórios
 * - Valores devem ser números sem formatação
 * - Amortização: PRICE, SAC, SAC e PRICE
 * - Propriedade: "Imóvel próprio", "Imóvel de terceiro"
 * - Bloqueio de duplicidade: 7 dias por email
 */

import { buildPloomesOriginLink } from '@/utils/ploomesOriginLink';

// Interface para payload do Ploomes
export interface PloomesPayload {
  [key: string]: unknown;
  cidade: string;
  valorDesejadoEmprestimo: number;
  valorImovelGarantia: number;
  quantidadeParcelas: number;
  tipoAmortizacao: 'PRICE' | 'SAC' | 'SAC e PRICE';
  valorParcelaCalculada: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  imovelProprio: 'Imóvel próprio' | 'Imóvel de terceiro';
  aceitaPolitica: boolean;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
  'Link de origem'?: string;
  'Link de origem \n'?: string;
  linkOrigem?: string;
  link_origem?: string;
}

// Interface para resposta do Ploomes
export interface PloomesResponse {
  status: boolean;
  msg: string;
  retorno: {
    nomeCompleto: string;
    email: string;
  };
}

// Mapeamento de valores
const AMORTIZACAO_MAP: Record<string, 'PRICE' | 'SAC' | 'SAC e PRICE'> = {
  'PRICE': 'PRICE',
  'SAC': 'SAC',
  'price': 'PRICE',
  'sac': 'SAC'
};

const IMOVEL_MAP: Record<string, 'Imóvel próprio' | 'Imóvel de terceiro'> = {
  'proprio': 'Imóvel próprio',
  'terceiro': 'Imóvel de terceiro'
};

export class PloomesService {
  private static readonly API_URL = 'https://api-ploomes.vercel.app/cadastro/online/env';
  private static readonly ORIGIN_FIELD_KEY =
    (import.meta.env.VITE_PLOOMES_ORIGIN_FIELD_KEY as string | undefined)?.trim() || null;
  private static readonly STAGE_ID =
    Number(import.meta.env.VITE_PLOOMES_STAGE_ID || 0) || null;
  
  /**
   * Cadastra uma proposta no Ploomes
   */
  static async cadastrarProposta(data: {
    cidade: string;
    valorEmprestimo: number;
    valorImovel: number;
    parcelas: number;
    tipoAmortizacao: string;
    valorParcela: number;
    nomeCompleto: string;
    email: string;
    telefone: string;
    imovelProprio: 'proprio' | 'terceiro';
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_term?: string | null;
    utm_content?: string | null;
    landing_page?: string | null;
    referrer?: string | null;
  }): Promise<PloomesResponse> {
    try {
      console.log('🚀 Iniciando cadastro no Ploomes:', data);
      
      // Preparar payload com valores corretos
      const originLink = buildPloomesOriginLink({
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        landing_page: data.landing_page,
        referrer: data.referrer
      });

      const payload: PloomesPayload = {
        cidade: data.cidade,
        valorDesejadoEmprestimo: this.limparValorMonetario(data.valorEmprestimo),
        valorImovelGarantia: this.limparValorMonetario(data.valorImovel),
        quantidadeParcelas: Number(data.parcelas),
        tipoAmortizacao: this.mapearAmortizacao(data.tipoAmortizacao),
        valorParcelaCalculada: this.limparValorMonetario(data.valorParcela),
        nomeCompleto: data.nomeCompleto,
        email: data.email.toLowerCase().trim(),
        telefone: this.limparTelefone(data.telefone),
        imovelProprio: IMOVEL_MAP[data.imovelProprio],
        aceitaPolitica: true, // Sempre true pois já foi validado antes
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_term: data.utm_term || null,
        utm_content: data.utm_content || null,
        landing_page: data.landing_page || null,
        referrer: data.referrer || null,
        'Link de origem': originLink,
        'Link de origem \n': originLink,
        linkOrigem: originLink,
        link_origem: originLink
      };
      

      if (this.ORIGIN_FIELD_KEY) {
        payload[this.ORIGIN_FIELD_KEY] = originLink;
      }

      if (this.STAGE_ID) {
        payload.StageId = this.STAGE_ID;
      }

      console.log('📤 Payload formatado para Ploomes:', payload);
      
      // Fazer requisição
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log('📥 Resposta do Ploomes:', result);
      
      // Verificar se houve erro HTTP
      if (!response.ok && !result.status) {
        throw new Error(result.msg || `Erro HTTP ${response.status}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao cadastrar no Ploomes:', error);
      
      // Re-throw com mensagem mais amigável
      if (error instanceof Error) {
        throw new Error(`Erro ao cadastrar no CRM: ${error.message}`);
      }
      throw new Error('Erro desconhecido ao cadastrar no CRM');
    }
  }
  
  /**
   * Limpa valor monetário removendo formatação
   */
  private static limparValorMonetario(valor: number | string): number {
    if (typeof valor === 'number') return Number(valor.toFixed(2));
    
    // Remover tudo exceto números, vírgula e ponto
    const limpo = String(valor)
      .replace(/[^0-9.,]/g, '')
      .replace(',', '.');
    
    return Number(parseFloat(limpo).toFixed(2));
  }
  
  /**
   * Limpa telefone removendo formatação
   */
  private static limparTelefone(telefone: string): string {
    // Remove tudo exceto números
    return telefone.replace(/\D/g, '');
  }
  
  /**
   * Mapeia tipo de amortização para valores aceitos pela API
   */
  private static mapearAmortizacao(tipo: string): 'PRICE' | 'SAC' | 'SAC e PRICE' {
    const mapped = AMORTIZACAO_MAP[tipo] || AMORTIZACAO_MAP[tipo.toLowerCase()];
    
    if (!mapped) {
      console.warn(`Tipo de amortização não mapeado: ${tipo}, usando PRICE como padrão`);
      return 'PRICE';
    }
    
    return mapped;
  }
  
  /**
   * Verifica se o erro é de duplicidade
   */
  static isDuplicidadeError(response: PloomesResponse): boolean {
    return !response.status && 
           response.msg.toLowerCase().includes('já existe') && 
           response.msg.toLowerCase().includes('7 dias');
  }
}

export default PloomesService;
