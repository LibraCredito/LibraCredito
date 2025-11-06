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

import { getAlertWebhookUrl } from '@/lib/env';
import { validateEmail, validatePhone } from '@/utils/validations';
import {
  SIMULATION_PLACEHOLDER_EMAIL,
  SIMULATION_PLACEHOLDER_NAME,
  SIMULATION_PLACEHOLDER_PHONE
} from '@/constants/simulationPlaceholders';
import {
  supabaseApi,
  SimulacaoData,
  supabase,
  UserJourneyData,
  UserJourneySimulacaoData,
  type Database
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
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
  timeOnSite?: number | null;
}

export interface SimulationResult {
  id: string;
  userJourneyId?: string;
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
  userJourneyId?: string;
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
  time_on_site?: number | null;
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
  time_on_site?: number | null;
  journey_status?: string | null;
  primary_session_id?: string | null;
}

const countJourneySignals = (journey?: Partial<UserJourneyData> | null): number => {
  if (!journey) return 0;
  const trackedKeys: (keyof UserJourneyData)[] = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'landing_page',
    'referrer',
    'time_on_site'
  ];
  return trackedKeys.reduce((count, key) => {
    const value = journey[key];
    if (value === undefined || value === null) {
      return count;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return count;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return count;
    }
    return count + 1;
  }, 0);
};

const pickBetterJourney = (
  current: UserJourneyData | undefined,
  candidate: UserJourneyData | undefined
): UserJourneyData | undefined => {
  if (!candidate) {
    return current;
  }
  if (!current) {
    return candidate;
  }

  return countJourneySignals(candidate) >= countJourneySignals(current)
    ? candidate
    : current;
};

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
        const normalizedName = (input.nomeCompleto || '').trim();
        const normalizedEmail = (input.email || '').trim().toLowerCase();
        const normalizedPhone = (input.telefone || '').trim();
        const sanitizedPhone = normalizedPhone.replace(/\D/g, '');

        const placeholderName = SIMULATION_PLACEHOLDER_NAME.toLowerCase();
        const placeholderEmail = SIMULATION_PLACEHOLDER_EMAIL.toLowerCase();
        const placeholderPhone = SIMULATION_PLACEHOLDER_PHONE.replace(/\D/g, '');

        const hasRealContactData =
          normalizedName !== '' &&
          normalizedName.toLowerCase() !== placeholderName &&
          normalizedEmail !== '' &&
          normalizedEmail !== placeholderEmail &&
          validateEmail(normalizedEmail) &&
          sanitizedPhone !== '' &&
          sanitizedPhone !== placeholderPhone &&
          validatePhone(normalizedPhone);

        if (hasRealContactData) {
          const supabaseData: Omit<
            SimulacaoData,
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
            user_agent: input.userAgent || null,
            ip_address: input.ipAddress || null,
            utm_source: input.utmSource ?? null,
            utm_medium: input.utmMedium ?? null,
            utm_campaign: input.utmCampaign ?? null,
            utm_term: input.utmTerm ?? null,
            utm_content: input.utmContent ?? null,
            landing_page: input.landingPage ?? null,
            referrer: input.referrer ?? null,
            time_on_site:
              typeof input.timeOnSite === 'number' && Number.isFinite(input.timeOnSite)
                ? Math.max(0, Math.floor(input.timeOnSite))
                : null,
            status: 'novo'
          };

          console.log('💾 Tentando salvar simulação no Supabase:', {
            session_id: supabaseData.session_id,
            visitor_id: supabaseData.visitor_id,
            cidade: supabaseData.cidade,
            valor_emprestimo: supabaseData.valor_emprestimo,
            original_local_id: simulationId
          });

          const supabaseResult = await supabaseApi.createSimulacao(supabaseData);
          console.log('✅ Simulação salva no Supabase:', {
            success: !!supabaseResult?.id,
            supabase_id: supabaseResult?.id,
            local_id: simulationId,
            result: supabaseResult
          });

          if (supabaseResult?.id) {
            console.log('🆔 ID do Supabase associado à simulação local:', {
              local_id: result.id,
              supabase_id: supabaseResult.id
            });
            result.userJourneyId = supabaseResult.id;
          } else {
            console.warn('⚠️ Supabase não retornou ID, mantendo apenas ID local:', result.id);
          }

          const journeyUpdate: Partial<UserJourneyData> = {
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
            status: 'novo'
          };

          if (input.utmSource !== undefined) {
            journeyUpdate.utm_source = input.utmSource;
          }
          if (input.utmMedium !== undefined) {
            journeyUpdate.utm_medium = input.utmMedium;
          }
          if (input.utmCampaign !== undefined) {
            journeyUpdate.utm_campaign = input.utmCampaign;
          }
          if (input.utmTerm !== undefined) {
            journeyUpdate.utm_term = input.utmTerm;
          }
          if (input.utmContent !== undefined) {
            journeyUpdate.utm_content = input.utmContent;
          }
          if (input.referrer !== undefined) {
            journeyUpdate.referrer = input.referrer;
          }
          if (input.landingPage !== undefined && input.landingPage !== null) {
            journeyUpdate.landing_page = input.landingPage;
          }
          if (typeof input.timeOnSite === 'number' && Number.isFinite(input.timeOnSite)) {
            journeyUpdate.time_on_site = Math.max(0, Math.floor(input.timeOnSite));
          }

          const sanitizedJourneyUpdate = Object.fromEntries(
            Object.entries(journeyUpdate).filter(([, value]) => value !== undefined)
          ) as Partial<UserJourneyData>;

          if (Object.keys(sanitizedJourneyUpdate).length > 0) {
            try {
              await supabaseApi.updateUserJourney(input.sessionId, sanitizedJourneyUpdate);
              console.log('🔁 Jornada do usuário atualizada com dados da simulação local');
            } catch (journeyError) {
              console.error('⚠️ Erro ao atualizar user journey:', journeyError);
            }
          }
        } else {
          const isPlaceholderName = normalizedName.toLowerCase() === placeholderName;
          const isPlaceholderEmail = normalizedEmail === placeholderEmail;
          const isPlaceholderPhone = sanitizedPhone === placeholderPhone;

          console.log('📝 Simulação não salva no Supabase (dados ausentes ou placeholders):', {
            nomeCompleto: normalizedName,
            email: normalizedEmail,
            telefone: normalizedPhone,
            isPlaceholderName,
            isPlaceholderEmail,
            isPlaceholderPhone,
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

      const sanitizedPhone = input.telefone.replace(/\D/g, '');

      // Obter dados da simulação do Supabase
      let simulationData: SimulacaoData | null = null;
      const simulationIdIsLocal = input.simulationId?.startsWith('local_');
      const supabaseSimulationId =
        input.userJourneyId && !input.userJourneyId.startsWith('local_')
          ? input.userJourneyId
          : simulationIdIsLocal
            ? null
            : input.simulationId;

      try {
        if (input.simulationId) {
          if (supabaseSimulationId) {
            console.log('🔍 Buscando simulação no Supabase pelo ID informado:', supabaseSimulationId);
            const { data } = await supabase
              .from('simulacoes')
              .select('*')
              .eq('id', supabaseSimulationId)
              .single();
            simulationData = (data as SimulacaoData) || null;
          } else if (simulationIdIsLocal) {
            console.log('🏠 ID local detectado, buscando por session_id:', input.sessionId);
            const { data: results, error: searchError } = await supabase
              .from('simulacoes')
              .select('*')
              .eq('session_id', input.sessionId)
              .order('created_at', { ascending: false })
              .limit(1);

            const data = results && results.length > 0 ? (results[0] as SimulacaoData) : null;

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
        telefone: sanitizedPhone,
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
      let updatedSimulationRecord: SimulacaoData | null = null;
      let journeyStatus: string | null = null;
      for (let attempt = 1; attempt <= maxSupabaseRetries; attempt++) {
        try {
          if (input.simulationId) {
            // Validar e preparar dados para atualização
            const normalizedTimeOnSite =
              typeof input.time_on_site === 'number' && Number.isFinite(input.time_on_site)
                ? Math.max(0, Math.floor(input.time_on_site))
                : undefined;

            const updateData: Partial<SimulacaoData> = {
              nome_completo: input.nomeCompleto.trim(),
              email: input.email.trim().toLowerCase(),
              telefone: sanitizedPhone, // Limpar telefone
              imovel_proprio: input.imovelProprio as 'proprio' | 'terceiro', // Garantir tipo correto
              status: 'interessado', // Status após contato para compatibilidade com AdminDashboard
              visitor_id: input.visitorId ?? simulationData?.visitor_id ?? null
            };

            if (input.utm_source !== undefined) {
              updateData.utm_source = input.utm_source;
            }
            if (input.utm_medium !== undefined) {
              updateData.utm_medium = input.utm_medium;
            }
            if (input.utm_campaign !== undefined) {
              updateData.utm_campaign = input.utm_campaign;
            }
            if (input.utm_term !== undefined) {
              updateData.utm_term = input.utm_term;
            }
            if (input.utm_content !== undefined) {
              updateData.utm_content = input.utm_content;
            }
            if (input.landing_page !== undefined) {
              updateData.landing_page = input.landing_page;
            }
            if (input.referrer !== undefined) {
              updateData.referrer = input.referrer;
            }
            if (input.time_on_site !== undefined) {
              updateData.time_on_site = normalizedTimeOnSite ?? null;
            }

            journeyStatus = updateData.status || null;

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
            const isLocalId = Boolean(simulationIdIsLocal);
            let existingData: SimulacaoData | null = null;
            let updateResult = null;

            if (supabaseSimulationId) {
              console.log('🆔 Atualizando simulação no Supabase pelo ID informado:', supabaseSimulationId);
              const { data: searchData, error: selectError } = await supabase
                .from('simulacoes')
                .select('id, nome_completo, email, telefone, imovel_proprio, status, visitor_id')
                .eq('id', supabaseSimulationId)
                .single();

              if (selectError) {
                console.error('❌ Erro ao buscar simulação por ID:', selectError);
                throw new Error(`Simulação não encontrada: ${selectError.message}`);
              }

              existingData = searchData;

              const { data, error } = await supabase
                .from('simulacoes')
                .update(updateData)
                .eq('id', supabaseSimulationId)
                .select();

              updateResult = { data, error };
            } else if (isLocalId) {
              console.log('🏠 Verificando se existe simulação por session_id:', input.sessionId);
              const { data: searchResults, error: selectError } = await supabase
                .from('simulacoes')
                .select('id, nome_completo, email, telefone, imovel_proprio, status, session_id, visitor_id, created_at')
                .eq('session_id', input.sessionId)
                .order('created_at', { ascending: false })
                .limit(1);

              const searchData = searchResults && searchResults.length > 0 ? searchResults[0] : null;

              if (selectError) {
                console.error('❌ Erro ao buscar simulação por session_id:', selectError);
                throw new Error(`Erro na busca: ${selectError.message}`);
              }

              if (!searchData) {
                console.log('➕ Simulação não existe no Supabase, criando nova...');

                const localSimulations = JSON.parse(
                  localStorage.getItem('libra_local_simulations') || '[]'
                );
                const localSimulation = localSimulations.find(
                  (s: any) => s.id === input.simulationId
                );

                if (!localSimulation) {
                  throw new Error('Dados da simulação não encontrados no localStorage');
                }

                const fullInput: SimulationInput | undefined = localSimulation.fullInput;
                const resolvedTimeOnSite =
                  normalizedTimeOnSite ??
                  (typeof fullInput?.timeOnSite === 'number' && Number.isFinite(fullInput.timeOnSite)
                    ? Math.max(0, Math.floor(fullInput.timeOnSite))
                    : simulationData?.time_on_site ?? null);

                const resolvedUtmSource =
                  updateData.utm_source ?? fullInput?.utmSource ?? simulationData?.utm_source ?? null;
                const resolvedUtmMedium =
                  updateData.utm_medium ?? fullInput?.utmMedium ?? simulationData?.utm_medium ?? null;
                const resolvedUtmCampaign =
                  updateData.utm_campaign ?? fullInput?.utmCampaign ?? simulationData?.utm_campaign ?? null;
                const resolvedUtmTerm =
                  updateData.utm_term ?? fullInput?.utmTerm ?? simulationData?.utm_term ?? null;
                const resolvedUtmContent =
                  updateData.utm_content ?? fullInput?.utmContent ?? simulationData?.utm_content ?? null;
                const resolvedLandingPage =
                  updateData.landing_page ??
                  fullInput?.landingPage ??
                  simulationData?.landing_page ??
                  null;
                const resolvedReferrer =
                  updateData.referrer ?? fullInput?.referrer ?? simulationData?.referrer ?? null;

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
                  status: updateData.status,
                  utm_source: resolvedUtmSource,
                  utm_medium: resolvedUtmMedium,
                  utm_campaign: resolvedUtmCampaign,
                  utm_term: resolvedUtmTerm,
                  utm_content: resolvedUtmContent,
                  landing_page: resolvedLandingPage,
                  referrer: resolvedReferrer,
                  time_on_site: resolvedTimeOnSite
                };

                console.log('💾 Criando nova simulação no Supabase:', createData);
                const { data, error } = await supabase
                  .from('simulacoes')
                  .insert(createData)
                  .select();

                updateResult = { data, error };
                console.log('✅ Nova simulação criada:', { data, error });
              } else {
                existingData = searchData;
                console.log('✅ Simulação encontrada para atualização:', {
                  id: existingData.id,
                  session_id: existingData.session_id,
                  nome_atual: existingData.nome_completo,
                  novo_nome: updateData.nome_completo
                });

                const { data, error } = await supabase
                  .from('simulacoes')
                  .update(updateData)
                  .eq('id', existingData.id)
                  .select();

                console.log('🔄 Resultado da atualização:', { data, error });
                updateResult = { data, error };
              }
            } else {
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

            if (data && data.length > 0) {
              updatedSimulationRecord = (data[0] as SimulacaoData) || null;
            } else if (!updatedSimulationRecord && existingData) {
              updatedSimulationRecord = existingData;
            }

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

      const fallbackSimulation = updatedSimulationRecord || simulationData;
      try {
        const resolveNumber = (
          formValue: number | null | undefined,
          ...fallbacks: Array<number | null | undefined>
        ): number | undefined => {
          if (formValue !== null && formValue !== undefined) {
            const parsed = Number(formValue);
            return Number.isFinite(parsed) ? parsed : undefined;
          }

          for (const fallback of fallbacks) {
            if (fallback !== null && fallback !== undefined) {
              const parsed = Number(fallback);
              if (Number.isFinite(parsed)) {
                return parsed;
              }
            }
          }

          return undefined;
        };

        const getNormalizedString = (
          ...values: Array<string | null | undefined>
        ): string | undefined => {
          for (const value of values) {
            if (typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed && trimmed.toLowerCase() !== 'não informado') {
                return trimmed;
              }
            }
          }
          return undefined;
        };

        let existingJourney: UserJourneySimulacaoData | null = null;
        try {
          existingJourney = await supabaseApi.getUserJourney(input.sessionId);
        } catch (journeyFetchError) {
          console.warn('⚠️ Erro ao buscar jornada do usuário:', journeyFetchError);
        }

        const normalizedNome = input.nomeCompleto.trim();
        const normalizedEmail = input.email.trim().toLowerCase();
        const normalizedTelefone = input.telefone.replace(/\D/g, '');
        const normalizedCidade = getNormalizedString(
          input.cidade,
          fallbackSimulation?.cidade,
          ploomesPayload.cidade,
          existingJourney?.cidade
        );

        const valorEmprestimoNumber = resolveNumber(
          input.valorDesejadoEmprestimo,
          fallbackSimulation?.valor_emprestimo,
          simulationData?.valor_emprestimo,
          existingJourney?.valor_emprestimo
        );
        const valorImovelNumber = resolveNumber(
          input.valorImovelGarantia,
          fallbackSimulation?.valor_imovel,
          simulationData?.valor_imovel,
          existingJourney?.valor_imovel
        );
        const parcelasNumber = resolveNumber(
          input.quantidadeParcelas,
          fallbackSimulation?.parcelas,
          simulationData?.parcelas,
          existingJourney?.parcelas
        );
        const parcelaInicialNumber = resolveNumber(
          input.valorParcelaCalculada,
          fallbackSimulation?.parcela_inicial,
          simulationData?.parcela_inicial,
          existingJourney?.parcela_inicial
        );
        const parcelaFinalNumber = resolveNumber(
          input.valorParcelaCalculada,
          fallbackSimulation?.parcela_final,
          fallbackSimulation?.parcela_inicial,
          simulationData?.parcela_final,
          existingJourney?.parcela_final
        );
        const tipoAmortizacaoValue = getNormalizedString(
          input.tipoAmortizacao?.toUpperCase(),
          fallbackSimulation?.tipo_amortizacao,
          simulationData?.tipo_amortizacao,
          existingJourney?.tipo_amortizacao
        );
        const utmSourceValue = getNormalizedString(
          input.utm_source,
          existingJourney?.utm_source
        );
        const utmMediumValue = getNormalizedString(
          input.utm_medium,
          existingJourney?.utm_medium
        );
        const utmCampaignValue = getNormalizedString(
          input.utm_campaign,
          existingJourney?.utm_campaign
        );
        const utmTermValue = getNormalizedString(
          input.utm_term,
          existingJourney?.utm_term
        );
        const utmContentValue = getNormalizedString(
          input.utm_content,
          existingJourney?.utm_content
        );
        const landingPageValue = getNormalizedString(
          input.landing_page,
          existingJourney?.landing_page
        );
        const referrerValue = getNormalizedString(
          input.referrer,
          existingJourney?.referrer
        );
        const timeOnSiteValue =
          typeof input.time_on_site === 'number' && Number.isFinite(input.time_on_site)
            ? Math.max(0, Math.floor(input.time_on_site))
            : input.time_on_site === null
              ? null
              : resolveNumber(
                  undefined,
                  fallbackSimulation?.time_on_site,
                  simulationData?.time_on_site,
                  existingJourney?.time_on_site
                );

        const journeyUpdatePayload: Partial<UserJourneyData> = {
          nome_completo: normalizedNome,
          email: normalizedEmail,
          telefone: normalizedTelefone,
          cidade: normalizedCidade,
          valor_emprestimo: valorEmprestimoNumber,
          valor_imovel: valorImovelNumber,
          parcelas: parcelasNumber,
          tipo_amortizacao: tipoAmortizacaoValue,
          parcela_inicial: parcelaInicialNumber,
          parcela_final: parcelaFinalNumber,
          status: journeyStatus || fallbackSimulation?.status || existingJourney?.status || 'interessado',
          utm_source: utmSourceValue,
          utm_medium: utmMediumValue,
          utm_campaign: utmCampaignValue,
          utm_term: utmTermValue,
          utm_content: utmContentValue,
          landing_page: landingPageValue,
          referrer: referrerValue
        };

        if (timeOnSiteValue !== undefined) {
          journeyUpdatePayload.time_on_site = timeOnSiteValue;
        }

        const sanitizedJourneyUpdatePayload = Object.fromEntries(
          Object.entries(journeyUpdatePayload).filter(([, value]) => value !== undefined)
        ) as Partial<UserJourneyData>;

        if (!existingJourney) {
          const resolvedVisitorId =
            input.visitorId?.trim() ||
            fallbackSimulation?.visitor_id ||
            simulationData?.visitor_id ||
            null;

          const journeyCreationPayload: Database['public']['Tables']['user_journey']['Insert'] = {
            session_id: input.sessionId,
            visitor_id: resolvedVisitorId,
            utm_source: utmSourceValue ?? null,
            utm_medium: utmMediumValue ?? null,
            utm_campaign: utmCampaignValue ?? null,
            utm_term: utmTermValue ?? null,
            utm_content: utmContentValue ?? null,
            landing_page:
              landingPageValue ??
              fallbackSimulation?.landing_page ??
              existingJourney?.landing_page ??
              null,
            referrer: referrerValue ?? null,
            time_on_site: timeOnSiteValue ?? null,
            ...sanitizedJourneyUpdatePayload
          };

          try {
            console.log('➕ Criando jornada do usuário no Supabase:', journeyCreationPayload);
            const createdJourney = await supabaseApi.createUserJourney(journeyCreationPayload);
            existingJourney = createdJourney || null;
            console.log('✅ Jornada criada no Supabase');
          } catch (journeyCreateError) {
            console.error('⚠️ Erro ao criar jornada do usuário:', journeyCreateError);
          }
        }

        if (Object.keys(sanitizedJourneyUpdatePayload).length > 0) {
          console.log('🔁 Atualizando jornada do usuário com dados do contato:', sanitizedJourneyUpdatePayload);
          await supabaseApi.updateUserJourney(input.sessionId, sanitizedJourneyUpdatePayload);
          console.log('✅ Jornada atualizada no Supabase');
        }
      } catch (journeyUpdateError) {
        console.error('⚠️ Erro ao atualizar user journey:', journeyUpdateError);
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
      return await supabaseApi.getSimulacoes({ limit });
    } catch (error) {
      console.error('❌ Erro ao buscar simulações:', error);
      throw error;
    }
  }

  static async getSimulacoesAgrupadas(
    options: {
      limit?: number;
      page?: number;
      status?: string;
      searchTerm?: string;
    } = {}
  ): Promise<SessionGroupWithJourney[]> {
    try {
      const { limit = 1000, page = 1, status, searchTerm } = options;
      const simulacoes = await supabaseApi.getSimulacoes({
        limit,
        page,
        status,
        searchTerm
      });

      if (!simulacoes?.length) {
        return [];
      }

      const grouped = new Map<string, SimulacaoData[]>();
      const sessionIds = new Set<string>();
      const visitorIds = new Set<string>();

      for (const sim of simulacoes) {
        const key = sim.visitor_id || sim.session_id;
        if (!key) continue;

        const existing = grouped.get(key) || [];
        existing.push(sim);
        grouped.set(key, existing);

        if (sim.session_id) {
          sessionIds.add(sim.session_id);
        }
        if (sim.visitor_id) {
          visitorIds.add(sim.visitor_id);
        }
      }

      const journeyMap = new Map<string, UserJourneyData>();
      const mergeJourney = (
        key: string | null | undefined,
        journey: UserJourneyData | null | undefined
      ) => {
        if (!key || !journey) return;
        const current = journeyMap.get(key);
        const better = pickBetterJourney(current, journey);
        if (better) {
          journeyMap.set(key, better);
        }
      };

      if (visitorIds.size > 0) {
        const journeysByVisitor = await this.fetchJourneysInChunks(
          Array.from(visitorIds),
          ids => supabaseApi.getUserJourneysByVisitorIds(ids)
        );

        for (const journey of journeysByVisitor) {
          if (!journey) continue;
          mergeJourney(journey.visitor_id ?? undefined, journey as UserJourneyData);
          mergeJourney(journey.session_id ?? undefined, journey as UserJourneyData);
        }
      }

      if (sessionIds.size > 0) {
        const journeysBySession = await this.fetchJourneysInChunks(
          Array.from(sessionIds),
          ids => supabaseApi.getUserJourneysBySessionIds(ids)
        );

        for (const journey of journeysBySession) {
          if (!journey) continue;
          mergeJourney(journey.session_id ?? undefined, journey as UserJourneyData);
          mergeJourney(journey.visitor_id ?? undefined, journey as UserJourneyData);
        }
      }

      const result: SessionGroupWithJourney[] = [];

      for (const [key, sims] of grouped.entries()) {
        sims.sort(
          (a, b) =>
            new Date(b.created_at || '').getTime() -
            new Date(a.created_at || '').getTime()
        );

        const primarySim = sims[0];
        const journey =
          (primarySim.visitor_id
            ? journeyMap.get(primarySim.visitor_id)
            : undefined) ||
          (primarySim.session_id
            ? journeyMap.get(primarySim.session_id)
            : undefined) ||
          journeyMap.get(key) ||
          null;

        const pickSimulationValue = <K extends keyof SimulacaoData>(
          field: K
        ): SimulacaoData[K] | null => {
          for (const simulation of sims) {
            const value = simulation[field];
            if (value === undefined || value === null) continue;
            if (typeof value === 'string' && value.trim() === '') continue;
            if (typeof value === 'number' && !Number.isFinite(value)) continue;
            return value;
          }
          return null;
        };

        const resolvedUtmSource = journey?.utm_source ?? pickSimulationValue('utm_source');
        const resolvedUtmMedium = journey?.utm_medium ?? pickSimulationValue('utm_medium');
        const resolvedUtmCampaign = journey?.utm_campaign ?? pickSimulationValue('utm_campaign');
        const resolvedUtmTerm = journey?.utm_term ?? pickSimulationValue('utm_term');
        const resolvedUtmContent = journey?.utm_content ?? pickSimulationValue('utm_content');
        const resolvedLandingPage =
          journey?.landing_page ?? (pickSimulationValue('landing_page') as string | null);
        const resolvedReferrer =
          journey?.referrer ?? (pickSimulationValue('referrer') as string | null);
        const resolvedTimeOnSite = (() => {
          const journeyValue = journey?.time_on_site;
          if (typeof journeyValue === 'number' && Number.isFinite(journeyValue)) {
            return journeyValue;
          }
          const simulationValue = pickSimulationValue('time_on_site');
          return typeof simulationValue === 'number' && Number.isFinite(simulationValue)
            ? simulationValue
            : null;
        })();

        result.push({
          visitor_id: key,
          simulacoes: sims,
          total_simulacoes: sims.length,
          utm_source: (resolvedUtmSource as string | null) ?? null,
          utm_medium: (resolvedUtmMedium as string | null) ?? null,
          utm_campaign: (resolvedUtmCampaign as string | null) ?? null,
          utm_term: (resolvedUtmTerm as string | null) ?? null,
          utm_content: (resolvedUtmContent as string | null) ?? null,
          landing_page: resolvedLandingPage ?? null,
          referrer: resolvedReferrer ?? null,
          time_on_site: resolvedTimeOnSite,
          journey_status: journey?.status ?? null,
          primary_session_id: primarySim.session_id ?? null
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
    const webhookUrl = getAlertWebhookUrl();
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