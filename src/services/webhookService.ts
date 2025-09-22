/**
 * Serviço de Webhook para envio de dados de simulação
 *
 * @service webhookService
 * @description Serviço responsável por enviar dados da simulação finalizada para webhooks externos
 *
 * @features
 * - Envio de dados completos da simulação
 * - Retry automático em caso de falha
 * - Logging detalhado
 * - Validação de payload
 * - Configuração flexível de URLs
 *
 * @workflow
 * 1. Recebe dados da simulação completa
 * 2. Valida e formata os dados
 * 3. Envia para webhook configurado
 * 4. Implementa retry em caso de falha
 * 5. Registra resultado
 */

import { resolveWebhookUrl, type WebhookUrl } from '@/lib/env';

export interface WebhookPayload {
  // Dados da simulação
  simulationId: string;
  sessionId: string;
  timestamp: string;
  
  // Dados do cliente
  nomeCompleto: string;
  email: string;
  telefone: string;
  cidade: string;
  imovelProprio?: 'proprio' | 'terceiro';
  observacoes?: string;
  
  // Dados da simulação
  valorEmprestimo: number;
  valorImovel: number;
  parcelas: number;
  tipoAmortizacao: string;
  
  // Resultados calculados
  valorParcela: number;
  primeiraParcela?: number;
  ultimaParcela?: number;
  
  // Dados técnicos
  ipAddress?: string;
  userAgent?: string;
  
  // Metadados
  source: 'libra-credito-landing';
  status: string;
}

export interface WebhookConfig {
  url: WebhookUrl;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  message?: string;
  timestamp: string;
  attempt: number;
}

export class WebhookService {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 segundos
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 segundo
  
  /**
   * Enviar dados da simulação para webhook
   */
  static async sendSimulationData(
    simulationData: Partial<WebhookPayload>,
    config?: WebhookConfig
  ): Promise<WebhookResult> {
    
    // Obter URL do webhook das variáveis de ambiente
    const webhookUrl = resolveWebhookUrl(config?.url);
    
    if (!webhookUrl) {
      console.warn('⚠️ URL do webhook não configurada');
      return {
        success: false,
        message: 'URL do webhook não configurada',
        timestamp: new Date().toISOString(),
        attempt: 0
      };
    }
    
    // Preparar payload completo
    const payload: WebhookPayload = {
      ...simulationData,
      timestamp: new Date().toISOString(),
      source: 'libra-credito-landing',
      simulationId: simulationData.simulationId || '',
      sessionId: simulationData.sessionId || '',
      nomeCompleto: simulationData.nomeCompleto || '',
      email: simulationData.email || '',
      telefone: simulationData.telefone || '',
      cidade: simulationData.cidade || '',
      valorEmprestimo: simulationData.valorEmprestimo || 0,
      valorImovel: simulationData.valorImovel || 0,
      parcelas: simulationData.parcelas || 0,
      tipoAmortizacao: simulationData.tipoAmortizacao || '',
      valorParcela: simulationData.valorParcela || 0,
      status: simulationData.status || 'completed'
    };
    
    console.log('🪝 Enviando dados para webhook:', {
      url: webhookUrl,
      simulationId: payload.simulationId,
      email: payload.email
    });
    
    const maxRetries = config?.retries ?? this.DEFAULT_RETRIES;
    let lastError: WebhookResult | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.makeWebhookRequest(webhookUrl, payload, config, attempt);
        
        if (result.success) {
          console.log('✅ Webhook enviado com sucesso', {
            attempt,
            statusCode: result.statusCode,
            simulationId: payload.simulationId
          });
          return result;
        }
        
        lastError = result;
        
        // Se não é o último attempt, aguardar antes de tentar novamente
        if (attempt < maxRetries) {
          console.log(`⏳ Tentativa ${attempt} falhou, aguardando ${this.RETRY_DELAY}ms...`);
          await this.delay(this.RETRY_DELAY * attempt); // Backoff exponencial
        }
        
      } catch (error) {
        lastError = {
          success: false,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date().toISOString(),
          attempt
        };
        
        console.error(`❌ Erro na tentativa ${attempt}:`, error);
        
        if (attempt < maxRetries) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }
    
    console.error('❌ Webhook falhou após todas as tentativas:', lastError);
    return lastError || {
      success: false,
      message: 'Falha após todas as tentativas',
      timestamp: new Date().toISOString(),
      attempt: maxRetries
    };
  }
  
  /**
   * Fazer requisição HTTP para o webhook
   */
  private static async makeWebhookRequest(
    url: WebhookUrl,
    payload: WebhookPayload,
    config?: WebhookConfig,
    attempt: number = 1
  ): Promise<WebhookResult> {
    
    const timeout = config?.timeout ?? this.DEFAULT_TIMEOUT;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Libra-Credito-Webhook/1.0',
      ...config?.headers
    };
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const success = response.ok;
      const statusCode = response.status;
      
      let responseText = '';
      try {
        responseText = await response.text();
      } catch {
        // Ignorar erro ao ler resposta
      }
      
      return {
        success,
        statusCode,
        message: success ? 'Enviado com sucesso' : `HTTP ${statusCode}: ${responseText}`,
        timestamp: new Date().toISOString(),
        attempt
      };
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout após ${timeout}ms`);
      }
      throw error;
    }
  }
  
  /**
   * Validar dados do payload
   */
  static validatePayload(payload: Partial<WebhookPayload>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!payload.simulationId) errors.push('simulationId é obrigatório');
    if (!payload.sessionId) errors.push('sessionId é obrigatório');
    if (!payload.nomeCompleto) errors.push('nomeCompleto é obrigatório');
    if (!payload.email) errors.push('email é obrigatório');
    if (!payload.telefone) errors.push('telefone é obrigatório');
    if (!payload.valorEmprestimo || payload.valorEmprestimo <= 0) errors.push('valorEmprestimo deve ser maior que zero');
    if (!payload.valorImovel || payload.valorImovel <= 0) errors.push('valorImovel deve ser maior que zero');
    if (!payload.parcelas || payload.parcelas <= 0) errors.push('parcelas deve ser maior que zero');
    if (!payload.tipoAmortizacao) errors.push('tipoAmortizacao é obrigatório');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Testar conectividade do webhook
   */
  static async testWebhook(url?: WebhookUrl): Promise<WebhookResult> {
    const testUrl = resolveWebhookUrl(url);
    
    if (!testUrl) {
      return {
        success: false,
        message: 'URL do webhook não configurada',
        timestamp: new Date().toISOString(),
        attempt: 1
      };
    }
    
    const testPayload: WebhookPayload = {
      simulationId: 'test-' + Date.now(),
      sessionId: 'test-session',
      timestamp: new Date().toISOString(),
      nomeCompleto: 'Teste Webhook',
      email: 'teste@exemplo.com',
      telefone: '(11) 99999-9999',
      cidade: 'São Paulo',
      valorEmprestimo: 100000,
      valorImovel: 300000,
      parcelas: 36,
      tipoAmortizacao: 'SAC',
      valorParcela: 2800,
      source: 'libra-credito-landing',
      status: 'test'
    };
    
    return this.makeWebhookRequest(testUrl, testPayload, { timeout: 5000 }, 1);
  }
  
  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default WebhookService;