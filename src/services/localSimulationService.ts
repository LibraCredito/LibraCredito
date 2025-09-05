/**
 * Serviço de simulação local sem APIs externas
 * 
 * @service LocalSimulationService
 * @description Substitui o SimulationService mantendo todas as funcionalidades
 * mas usando dados locais ao invés de APIs externas
 * 
 * @features
 * - Mantém mesmas interfaces do SimulationService original
 * - Validação de cidades via JSON local
 * - Cálculos SAC/PRICE locais
 * - Mensagens contextuais baseadas em LTV da cidade
 * - Armazenamento local opcional (localStorage)
 * - Compatibilidade total com componentes existentes
 */

import { validateEmail, validatePhone } from '@/utils/validations';
import {
  supabaseApi,
  SimulacaoData,
  supabase,
  UserJourneySimulacaoData
} from '@/lib/supabase';

// Reutilizar interfaces do serviço original
export interface SimulationInput {
  sessionId: string;
  visitorId?: string;

  nomeCompleto: string;
  email: string;
  telefone: string;
  cidade: string;
  valorEmprestimo: number;
  valorImovel: number;
  parcelas: number;
  tipoAmortizacao: string;
  userAgent?: string;
  ipAddress?: string;
  isRuralProperty?: boolean;
}

export interface SimulationResult {
  id: string;
  valor: number;
  amortizacao: string;
  parcelas: number;
  primeiraParcela?: number;
  ultimaParcela?: number;
  valorEmprestimo: number;
  valorImovel: number;
  cidade: string;
  sessionId: string;
  visitorId?: string;
}

export interface ContactFormInput {
  simulationId: string;
  sessionId: string;
  visitorId?: string;

  nomeCompleto: string;
  email: string;
  telefone: string;
  cidade?: string;
  imovelProprio: 'proprio' | 'terceiro';
  observacoes?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
}

export interface SessionGroupWithJourney {
  visitor_id: string;
  simulacoes: SimulacaoData[];
  total_simulacoes: number;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
}

// Classe principal do serviço local
export class LocalSimulationService {

  /**
   * Busca jornadas em lotes para evitar erros de URL muito longas no Supabase
   */
  private static async fetchJourneysInChunks<T>(
    ids: string[],
    fetchFn: (chunk: string[]) => Promise<T[]>,
    chunkSize = 50
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      try {
        results.push(...await fetchFn(chunk));
      } catch (journeyError) {
        console.error('Erro ao buscar jornadas:', journeyError);
      }
    }
    return results;
  }
  
  /**
   * Realiza simulação usando apenas dados locais
   * Mantém mesma interface do SimulationService original
   */
  static async performSimulation(input: SimulationInput): Promise<SimulationResult> {
    try {
      console.log('🎯 Iniciando simulação local:', input);
      
      // 1. Validar dados de entrada
      this.validateSimulationInput(input);
      
      // 2. Validar cidade e LTV
      const { validateCity, validateLTV } = await import('@/utils/cityLtvService');
      const cityValidation = await validateCity(input.cidade);
      console.log('🏘️ Validação da cidade:', cityValidation);
      
      if (!cityValidation.found) {
        throw new Error('Cidade não encontrada em nossa base de dados');
      }

      // Para cidades que não trabalhamos (LTV 0), bloquear completamente
      if (cityValidation.status === 'not_working') {
        throw new Error(`Ainda não trabalhamos em ${input.cidade}. Nossa equipe está expandindo nossa cobertura.`);
      }

      // Para imóveis rurais (LTV 1), permitir cálculo mas com aviso
      if (cityValidation.status === 'rural_only') {
        console.log('🏡 Imóvel rural detectado para', input.cidade);
      }

      // 3. Validar LTV específico da cidade (apenas se não for rural sem limitações)
      let ltvValidation = { valid: true, message: 'OK' };
      
      if (cityValidation.status !== 'rural_only') {
        ltvValidation = await validateLTV(input.valorEmprestimo, input.valorImovel, input.cidade);
        console.log('📊 Validação de LTV:', ltvValidation);

        if (!ltvValidation.valid) {
          // Retornar erro com sugestão de ajuste
          let errorMessage = ltvValidation.message;
          if (ltvValidation.suggestedLoanAmount) {
            errorMessage += `. Valor máximo recomendado: R$ ${ltvValidation.suggestedLoanAmount.toLocaleString('pt-BR')}`;
          }
          throw new Error(errorMessage);
        }
      } else {
        // Para cidades rurais, sempre avisar sobre limite de 30%
        const ltvCalculado = (input.valorEmprestimo / input.valorImovel) * 100;
        const valorMaximo = Math.floor((input.valorImovel * 30) / 100);

        if (!input.isRuralProperty || ltvCalculado > 30) {
          throw new Error(`Para a cidade ${input.cidade}, trabalhamos apenas com imóveis rurais com limite de empréstimo de até 30% do valor do imóvel. Valor máximo: R$ ${valorMaximo.toLocaleString('pt-BR')}`);
        }
      }

      // 4. Importar calculadora de forma dinâmica para otimizar bundle
      const {
        validateLoanParameters,
        getInterestRate,
        calculateLoan
      } = await import('@/utils/loanCalculator');

      // 5. Validar parâmetros do empréstimo
      const paramValidation = validateLoanParameters(input.valorEmprestimo, input.parcelas);
      if (!paramValidation.valid) {
        throw new Error(paramValidation.error || 'Parâmetros inválidos');
      }

      // 6. Calcular empréstimo
      const taxaJuros = getInterestRate();
      const calculation = calculateLoan(
        input.valorEmprestimo,
        taxaJuros,
        input.parcelas,
        input.valorImovel
      );
      
      console.log('💰 Cálculo realizado:', calculation);

      // 6. Preparar resultado no formato esperado
      const simulationId = this.generateSimulationId();
      const result: SimulationResult = {
        id: simulationId,
        valor: input.tipoAmortizacao === 'PRICE' ? calculation.parcelaPrice : calculation.parcelaSac.inicial,
        amortizacao: input.tipoAmortizacao,
        parcelas: input.parcelas,
        primeiraParcela: calculation.parcelaSac.inicial,
        ultimaParcela: calculation.parcelaSac.final,
        valorEmprestimo: input.valorEmprestimo,
        valorImovel: input.valorImovel,
        cidade: input.cidade,
        sessionId: input.sessionId,
        visitorId: input.visitorId
      };

      // 7. Salvar no Supabase apenas se temos dados reais (não salvar placeholders)
      try {
        // Só salvar no Supabase se temos dados de contato reais
        const hasRealContactData = input.nomeCompleto && 
                                  input.nomeCompleto !== '' && 
                                  input.email && 
                                  input.email !== '' &&
                                  input.telefone && 
                                  input.telefone !== '';

        if (hasRealContactData) {
          const supabaseData: Omit<
            UserJourneySimulacaoData,
            'id' | 'created_at' | 'updated_at'
          > = {
            session_id: input.sessionId,
            visitor_id: input.visitorId || null,

            nome_completo: input.nomeCompleto,
            email: input.email,
            telefone: input.telefone,
            cidade: input.cidade,
            valor_emprestimo: input.valorEmprestimo,
            valor_imovel: input.valorImovel,
            parcelas: input.parcelas,
            tipo_amortizacao: input.tipoAmortizacao,
            parcela_inicial: calculation.parcelaSac.inicial,
            parcela_final: calculation.parcelaSac.final,
            imovel_proprio: 'proprio',
            user_agent: input.userAgent || '',
            ip_address: input.ipAddress || '',
            status: 'novo' // Status inicial para compatibilidade com AdminDashboard
          };

          console.log('💾 Tentando salvar simulação no Supabase:', {
            session_id: supabaseData.session_id,
            visitor_id: supabaseData.visitor_id,
            cidade: supabaseData.cidade,
            valor_emprestimo: supabaseData.valor_emprestimo,
            original_local_id: simulationId
          });

          const supabaseResult = await supabaseApi.createUserJourneySimulacao(
            supabaseData
          );
          console.log('✅ Simulação salva no Supabase:', {
            success: !!supabaseResult?.id,
            supabase_id: supabaseResult?.id,
            local_id: simulationId,
            result: supabaseResult
          });
          
          // Usar ID do Supabase se disponível
          if (supabaseResult?.id) {
            console.log('🔄 Substituindo ID local pelo ID do Supabase:', {
              antes: result.id,
              depois: supabaseResult.id
            });
            result.id = supabaseResult.id;
          } else {
            console.warn('⚠️ Supabase não retornou ID, mantendo ID local:', result.id);
          }
        } else {
          console.log('📝 Simulação não salva no Supabase (dados de contato ausentes):', {
            nomeCompleto: !!input.nomeCompleto,
            email: !!input.email, 
            telefone: !!input.telefone,
            session_id: input.sessionId,
            local_id: simulationId
          });
        }
      } catch (supabaseError) {
        console.error('❌ Erro ao salvar no Supabase (continuando):', {
          error: supabaseError,
          session_id: input.sessionId,
          local_id: simulationId
        });
      }

      // 8. Armazenar localmente como backup
      this.saveSimulationLocally(result, input);

      console.log('✅ Simulação local realizada com sucesso:', result);
      return result;

    } catch (error) {
      console.error('❌ Erro na simulação local:', error);
      throw error;
    }
  }

  /**
   * Processa contato pós-simulação
   * Integra com API Ploomes e Supabase
   */
  static async processContact(
    input: ContactFormInput & {
      valorDesejadoEmprestimo?: number;
      valorImovelGarantia?: number;
      quantidadeParcelas?: number;
      tipoAmortizacao?: string;
      valorParcelaCalculada?: number;
      aceitaPolitica?: boolean;
      referrer?: string | null;
    },
    options: { isRetry?: boolean } = {}
  ): Promise<{success: boolean, message: string}> {
    try {
      console.log('📧 Processando contato com integração:', input);
      
      // Validar dados
      if (!validateEmail(input.email)) {
        throw new Error('Email inválido');
      }
      
      if (!validatePhone(input.telefone)) {
        throw new Error('Telefone inválido');
      }

      // Obter dados da simulação do Supabase
      let simulationData = null;
      try {
        if (input.simulationId) {
          // Verificar se é um ID local (que não existe no Supabase)
          const isLocalId = input.simulationId.startsWith('local_');
          
          if (isLocalId) {
            console.log('🏠 ID local detectado, buscando por session_id:', input.sessionId);
            // Para IDs locais, buscar pela session_id mais recente
            const { data: results, error: searchError } = await supabase
              .from('simulacoes')
              .select('*')
              .eq('session_id', input.sessionId)
              .order('created_at', { ascending: false })
              .limit(1);
              
            // Pegar o primeiro resultado se existir
            const data = results && results.length > 0 ? results[0] : null;
            
            if (searchError) {
              console.warn('⚠️ Erro ao buscar por session_id:', searchError);
              console.log('📋 Tentando buscar todas as simulações para debug...');
              const { data: allData } = await supabase
                .from('simulacoes')
                .select('id, session_id, visitor_id, created_at')
                .eq('session_id', input.sessionId)
                .order('created_at', { ascending: false });
              console.log('📋 Simulações encontradas:', allData);
            } else if (!data) {
              console.warn('⚠️ Nenhuma simulação encontrada com session_id:', input.sessionId);
            }
            simulationData = data;
          } else {
            // Para IDs do Supabase, buscar normalmente
            const { data } = await supabase
              .from('simulacoes')
              .select('*')
              .eq('id', input.simulationId)
              .single();
            simulationData = data;
          }
          console.log('📊 Dados da simulação obtidos:', simulationData);
        }
      } catch (supabaseError) {
        console.warn('⚠️ Erro ao obter simulação do Supabase:', supabaseError);
      }

      // Preparar payload para API Ploomes com validação de tipos
      const ploomesPayload = {
        cidade: input.cidade?.trim() || simulationData?.cidade || 'Não informado',
        valorDesejadoEmprestimo: Number(input.valorDesejadoEmprestimo || simulationData?.valor_emprestimo || 0),
        valorImovelGarantia: Number(input.valorImovelGarantia || simulationData?.valor_imovel || 0),
        quantidadeParcelas: Number(input.quantidadeParcelas || simulationData?.parcelas || 36),
        tipoAmortizacao: (input.tipoAmortizacao || simulationData?.tipo_amortizacao || 'PRICE').toUpperCase(),
        valorParcelaCalculada: Number(input.valorParcelaCalculada || simulationData?.parcela_inicial || 0),
        nomeCompleto: input.nomeCompleto.trim(),
        email: input.email.trim().toLowerCase(),
        telefone: input.telefone.replace(/\D/g, ''), // Remove all non-digits
        imovelProprio: input.imovelProprio === 'proprio' ? 'Imóvel próprio' : 'Imóvel de terceiro',
        aceitaPolitica: Boolean(input.aceitaPolitica),
        utm_source: input.utm_source || null,
        utm_medium: input.utm_medium || null,
        utm_campaign: input.utm_campaign || null,
        utm_term: input.utm_term || null,
        utm_content: input.utm_content || null,
        landing_page: input.landing_page || null,
        referrer: input.referrer || null
      };

      // Validar campos obrigatórios
      if (!ploomesPayload.cidade || ploomesPayload.cidade.trim() === '' || ploomesPayload.cidade === 'Não informado') {
        throw new Error('Cidade é obrigatória');
      }
      if (!ploomesPayload.nomeCompleto) {
        throw new Error('Nome completo é obrigatório');
      }
      if (!ploomesPayload.email || !ploomesPayload.email.includes('@')) {
        throw new Error('Email válido é obrigatório');
      }
      if (!ploomesPayload.telefone || ploomesPayload.telefone.length < 10) {
        throw new Error('Telefone válido é obrigatório');
      }
      if (ploomesPayload.valorDesejadoEmprestimo <= 0) {
        throw new Error('Valor do empréstimo deve ser maior que zero');
      }
      if (ploomesPayload.valorImovelGarantia <= 0) {
        throw new Error('Valor do imóvel deve ser maior que zero');
      }
      if (ploomesPayload.valorParcelaCalculada <= 0) {
        throw new Error('Valor da parcela deve ser maior que zero');
      }

      console.log('🚀 Enviando para API Ploomes:', ploomesPayload);

      // Enviar para API Ploomes
      const ploomesResponse = await fetch('https://api-ploomes.vercel.app/cadastro/online/env', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ploomesPayload)
      });

      if (!ploomesResponse.ok) {
        const errorText = await ploomesResponse.text();
        console.error('❌ Erro na API Ploomes:', {
          status: ploomesResponse.status,
          statusText: ploomesResponse.statusText,
          headers: Object.fromEntries(ploomesResponse.headers.entries()),
          errorText,
          sentPayload: ploomesPayload
        });
        throw new Error(`Erro na API Ploomes: ${ploomesResponse.status} - ${errorText}`);
      }

      const ploomesResult = await ploomesResponse.json();
      console.log('✅ Sucesso na API Ploomes:', ploomesResult);

      // Salvar/Atualizar contato no Supabase com dados completos (com retry)
      const maxSupabaseRetries = 3;
      let lastSupabaseError: unknown = null;
      for (let attempt = 1; attempt <= maxSupabaseRetries; attempt++) {
        try {
          if (input.simulationId) {
            // Validar e preparar dados para atualização
            const updateData = {
              nome_completo: input.nomeCompleto.trim(),
              email: input.email.trim().toLowerCase(),
              telefone: input.telefone.replace(/\D/g, ''), // Limpar telefone
              imovel_proprio: input.imovelProprio as 'proprio' | 'terceiro', // Garantir tipo correto
              status: 'interessado', // Status após contato para compatibilidade com AdminDashboard
              visitor_id: input.visitorId
            };

            // Validar dados antes da atualização
            if (!updateData.nome_completo) {
              throw new Error('Nome completo é obrigatório para atualização');
            }
            if (!updateData.email.includes('@')) {
              throw new Error('Email válido é obrigatório para atualização');
            }
            if (!updateData.telefone || updateData.telefone.length < 10) {
              throw new Error('Telefone válido é obrigatório para atualização');
            }
            if (!['proprio', 'terceiro'].includes(updateData.imovel_proprio)) {
              throw new Error('Tipo de imóvel deve ser "proprio" ou "terceiro"');
            }

            console.log('🔄 Atualizando simulação no Supabase:', {
              simulationId: input.simulationId,
              updateData,
              inputData: {
                nomeCompleto: input.nomeCompleto,
                email: input.email,
                telefone: input.telefone,
                imovelProprio: input.imovelProprio
              }
            });

            // Usar a mesma lógica de busca para atualização/criação
            const isLocalId = input.simulationId.startsWith('local_');
            let existingData = null;
            let updateResult = null;

            if (isLocalId) {
              console.log('🏠 Verificando se existe simulação por session_id:', input.sessionId);
              // Para IDs locais, buscar pela session_id mais recente
              const { data: searchResults, error: selectError } = await supabase
                .from('simulacoes')
                .select('id, nome_completo, email, telefone, imovel_proprio, status, session_id, visitor_id, created_at')
                .eq('session_id', input.sessionId)
                .order('created_at', { ascending: false })
                .limit(1);

              // Pegar o primeiro resultado se existir
              const searchData = searchResults && searchResults.length > 0 ? searchResults[0] : null;

              if (selectError) {
                console.error('❌ Erro ao buscar simulação por session_id:', selectError);
                throw new Error(`Erro na busca: ${selectError.message}`);
              }

              if (!searchData) {
                // Não existe no Supabase, criar novo registro
                console.log('➕ Simulação não existe no Supabase, criando nova...');

                // Buscar dados da simulação do localStorage
                const localSimulations = JSON.parse(
                  localStorage.getItem('libra_local_simulations') || '[]'
                );
                const localSimulation = localSimulations.find(
                  (s: any) => s.id === input.simulationId
                );

                if (!localSimulation) {
                  throw new Error('Dados da simulação não encontrados no localStorage');
                }

                // Criar registro completo no Supabase
                const createData = {
                  session_id: input.sessionId,
                  visitor_id: input.visitorId || null,

                  nome_completo: updateData.nome_completo,
                  email: updateData.email,
                  telefone: updateData.telefone,
                  cidade: localSimulation.cidade,
                  valor_emprestimo: localSimulation.valorEmprestimo,
                  valor_imovel: localSimulation.valorImovel,
                  parcelas: localSimulation.parcelas,
                  tipo_amortizacao: localSimulation.amortizacao,
                  parcela_inicial: localSimulation.primeiraParcela || localSimulation.valor,
                  parcela_final: localSimulation.ultimaParcela || localSimulation.valor,
                  imovel_proprio: updateData.imovel_proprio,
                  user_agent: '',
                  ip_address: '',
                  status: updateData.status
                };

                console.log('💾 Criando nova simulação no Supabase:', createData);
                const { data, error } = await supabase
                  .from('simulacoes')
                  .insert(createData)
                  .select();

                updateResult = { data, error };
                console.log('✅ Nova simulação criada:', { data, error });
              } else {
                // Existe no Supabase, atualizar
                existingData = searchData;
                console.log('✅ Simulação encontrada para atualização:', {
                  id: existingData.id,
                  session_id: existingData.session_id,
                  nome_atual: existingData.nome_completo,
                  novo_nome: updateData.nome_completo
                });

                // Atualizar usando o ID real do Supabase
                const { data, error } = await supabase
                  .from('simulacoes')
                  .update(updateData)
                  .eq('id', existingData.id)
                  .select();

                console.log('🔄 Resultado da atualização:', { data, error });
                updateResult = { data, error };
              }
            } else {
              // Para IDs do Supabase, buscar e atualizar normalmente
              const { data: searchData, error: selectError } = await supabase
                .from('simulacoes')
                .select('id, nome_completo, email, telefone, imovel_proprio, status, visitor_id')
                .eq('id', input.simulationId)
                .single();

              if (selectError) {
                console.error('❌ Erro ao buscar simulação:', selectError);
                throw new Error(`Simulação não encontrada: ${selectError.message}`);
              }

              existingData = searchData;

              const { data, error } = await supabase
                .from('simulacoes')
                .update(updateData)
                .eq('id', input.simulationId)
                .select();

              updateResult = { data, error };
            }

            if (existingData) {
              console.log('📊 Dados antes da atualização:', existingData);
            }

            const { data, error } = updateResult;

            if (error) {
              console.error('❌ Erro ao atualizar Supabase:', {
                error,
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              });
              throw error;
            }

            console.log('✅ Contato atualizado no Supabase:', {
              antes: existingData,
              depois: data?.[0],
              success: !!data?.[0]
            });

            if (!data || data.length === 0) {
              throw new Error('Nenhuma linha foi atualizada no Supabase');
            }
          } else {
            throw new Error('ID da simulação não fornecido para atualização');
          }

          // Se chegou aqui, a operação foi bem-sucedida
          this.removeContactLocally(input);
          lastSupabaseError = null;
          break;
        } catch (supabaseError) {
          lastSupabaseError = supabaseError;
          console.error(`❌ Erro ao atualizar contato no Supabase (tentativa ${attempt}):`, supabaseError);
          if (attempt < maxSupabaseRetries) {
            const delay = 500 * Math.pow(2, attempt - 1);
            console.log(`⏳ Aguardando ${delay}ms antes da nova tentativa...`);
            await this.delay(delay);
          }
        }
      }

      if (lastSupabaseError) {
        throw lastSupabaseError;
      }

      console.log('✅ Contato processado com sucesso');

      // Após sucesso, tentar reenviar contatos pendentes (exceto quando já é uma tentativa)
      if (!options.isRetry) {
        await this.resendPendingContacts();
      }

      return {
        success: true,
        message: 'Dados enviados com sucesso! Nossa equipe entrará em contato em breve.'
      };

    } catch (error) {
      console.error('❌ Erro ao processar contato:', error);

      // Salvar localmente mesmo em caso de erro (somente na primeira tentativa)
      if (!options.isRetry) {
        try {
          this.saveContactLocally(input);
          console.log('💾 Dados salvos localmente como backup');
        } catch (localError) {
          console.error('❌ Erro ao salvar localmente:', localError);
        }
      }

      // Enviar alerta para intervenção manual
      await this.sendFailureAlert(input, error);

      throw new Error('Não foi possível enviar seus dados. Tente novamente mais tarde.');
    }
  }

  /**
   * Validação de entrada (reutilizada do serviço original)
   */
  private static validateSimulationInput(input: SimulationInput): void {
    if (!input.sessionId) {
      throw new Error('Session ID é obrigatório');
    }
    
    if (!input.cidade || input.cidade.trim() === '') {
      throw new Error('Cidade é obrigatória');
    }
    
    if (!input.valorEmprestimo || input.valorEmprestimo <= 0) {
      throw new Error('Valor do empréstimo deve ser maior que zero');
    }
    
    if (!input.valorImovel || input.valorImovel <= 0) {
      throw new Error('Valor do imóvel deve ser maior que zero');
    }
    
    if (!input.parcelas || input.parcelas < 36 || input.parcelas > 180) {
      throw new Error('Número de parcelas deve estar entre 36 e 180 meses');
    }
    
    if (!input.tipoAmortizacao || !['SAC', 'PRICE'].includes(input.tipoAmortizacao)) {
      throw new Error('Tipo de amortização deve ser SAC ou PRICE');
    }
  }

  /**
   * Gera ID único para simulação
   */
  private static generateSimulationId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Buscar simulações para admin (compatibilidade com AdminDashboard)
   */
  static async getSimulacoes(limit = 1000) {
    try {
      return await supabaseApi.getSimulacoes(limit);
    } catch (error) {
      console.error('❌ Erro ao buscar simulações:', error);
      throw error;
    }
  }

  static async getSimulacoesAgrupadas(limit = 1000): Promise<SessionGroupWithJourney[]> {
    try {
      const simulacoes = await supabaseApi.getSimulacoes(limit);

      const grouped = new Map<string, SimulacaoData[]>();
      const visitorIds = new Set<string>();
      const sessionIds = new Set<string>();

      for (const sim of simulacoes) {
        const key = sim.visitor_id || sim.session_id;
        if (!key) continue;
        const arr = grouped.get(key) || [];
        arr.push(sim);
        grouped.set(key, arr);

        if (sim.visitor_id) {
          visitorIds.add(sim.visitor_id);
        } else if (sim.session_id) {
          sessionIds.add(sim.session_id);

        }
      }

      let journeys: any[] = [];
      if (visitorIds.size > 0) {
        journeys = journeys.concat(
          await this.fetchJourneysInChunks(
            Array.from(visitorIds),
            ids => supabaseApi.getUserJourneysByVisitorIds(ids)
          )
        );
      }
      if (sessionIds.size > 0) {
        journeys = journeys.concat(
          await this.fetchJourneysInChunks(
            Array.from(sessionIds),
            ids => supabaseApi.getUserJourneysBySessionIds(ids)
          )
        );
      }

      const journeyMap = new Map<string, any>();
      for (const j of journeys) {
        const key = j?.visitor_id || j?.session_id;
        if (key) journeyMap.set(key, j);
      }

      const result: SessionGroupWithJourney[] = [];
      for (const [key, sims] of grouped.entries()) {
        sims.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        const journey = journeyMap.get(key);
        result.push({
          visitor_id: key,
          simulacoes: sims,
          total_simulacoes: sims.length,
          utm_source: journey?.utm_source ?? null,
          utm_medium: journey?.utm_medium ?? null,
          utm_campaign: journey?.utm_campaign ?? null,
          utm_term: journey?.utm_term ?? null,
          utm_content: journey?.utm_content ?? null,
          landing_page: journey?.landing_page ?? null,
          referrer: journey?.referrer ?? null,
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar simulações agrupadas:', error);

      throw error;
    }
  }
  
  /**
   * Atualizar status de simulação (compatibilidade com AdminDashboard)
   */
  static async updateSimulationStatus(id: string, status: string) {
    try {
      return await supabaseApi.updateSimulacaoStatus(id, status);
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      throw error;
    }
  }

  /**
   * Salva simulação no localStorage
   */
  private static saveSimulationLocally(result: SimulationResult, input: SimulationInput): void {
    try {
      const simulationData = {
        ...result,
        timestamp: new Date().toISOString(),
        userAgent: input.userAgent,
        fullInput: input
      };

      // Obter simulações existentes
      const existing = localStorage.getItem('libra_local_simulations');
      const simulations = existing ? JSON.parse(existing) : [];
      
      // Adicionar nova simulação
      simulations.unshift(simulationData);
      
      // Manter apenas últimas 50 simulações
      const limited = simulations.slice(0, 50);
      
      // Salvar de volta
      localStorage.setItem('libra_local_simulations', JSON.stringify(limited));
      
      console.log('💾 Simulação salva localmente');
    } catch (error) {
      console.warn('⚠️ Erro ao salvar simulação localmente:', error);
    }
  }

  /**
   * Salva contato no localStorage
   */
  private static saveContactLocally(input: ContactFormInput): void {
    try {
      const contactData = {
        ...input,
        timestamp: new Date().toISOString()
      };

      // Obter contatos existentes
      const existing = localStorage.getItem('libra_local_contacts');
      const contacts = existing ? JSON.parse(existing) : [];
      
      // Adicionar novo contato
      contacts.unshift(contactData);
      
      // Manter apenas últimos 100 contatos
      const limited = contacts.slice(0, 100);
      
      // Salvar de volta
      localStorage.setItem('libra_local_contacts', JSON.stringify(limited));
      
      console.log('💾 Contato salvo localmente');
    } catch (error) {
      console.warn('⚠️ Erro ao salvar contato localmente:', error);
    }
  }

  /**
   * Remove contato do localStorage após envio bem-sucedido
   */
  private static removeContactLocally(input: ContactFormInput): void {
    try {
      const existing = localStorage.getItem('libra_local_contacts');
      if (!existing) return;
      const contacts = JSON.parse(existing);
      const filtered = contacts.filter(
        (c: any) => c.simulationId !== input.simulationId || c.sessionId !== input.sessionId
      );
      if (filtered.length === 0) {
        localStorage.removeItem('libra_local_contacts');
      } else {
        localStorage.setItem('libra_local_contacts', JSON.stringify(filtered));
      }
      console.log('🗑️ Contato removido do armazenamento local');
    } catch (error) {
      console.warn('⚠️ Erro ao remover contato localmente:', error);
    }
  }

  /**
   * Envia alerta via webhook quando o contato não pôde ser salvo
   */
  private static async sendFailureAlert(input: ContactFormInput, error: unknown): Promise<void> {
    const webhookUrl = process.env.VITE_ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('⚠️ URL de alerta não configurada');
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact_failure',
          input,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })
      });
      console.log('🚨 Alerta de falha enviado');
    } catch (alertError) {
      console.error('❌ Erro ao enviar alerta de falha:', alertError);
    }
  }

  /**
   * Utilitário simples de atraso
   */
  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reenvia contatos locais pendentes ao Supabase
   */
  static async resendPendingContacts(): Promise<void> {
    try {
      const existing = localStorage.getItem('libra_local_contacts');
      if (!existing) return;
      const contacts: ContactFormInput[] = JSON.parse(existing);
      if (contacts.length === 0) return;

      console.log('🔄 Reenviando contatos locais pendentes:', contacts.length);

      for (const contact of contacts) {
        try {
          await this.processContact(contact, { isRetry: true });
        } catch (err) {
          console.error('❌ Falha ao reenviar contato local:', err);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao reenviar contatos locais:', error);
    }
  }

  /**
   * Obtém estatísticas das simulações locais
   */
  static getLocalStats(): {
    totalSimulations: number;
    totalContacts: number;
    lastSimulation?: Date;
    lastContact?: Date;
  } {
    try {
      const simulations = JSON.parse(localStorage.getItem('libra_local_simulations') || '[]');
      const contacts = JSON.parse(localStorage.getItem('libra_local_contacts') || '[]');
      
      return {
        totalSimulations: simulations.length,
        totalContacts: contacts.length,
        lastSimulation: simulations.length > 0 ? new Date(simulations[0].timestamp) : undefined,
        lastContact: contacts.length > 0 ? new Date(contacts[0].timestamp) : undefined
      };
    } catch (error) {
      console.warn('⚠️ Erro ao obter estatísticas locais:', error);
      return {
        totalSimulations: 0,
        totalContacts: 0
      };
    }
  }
}