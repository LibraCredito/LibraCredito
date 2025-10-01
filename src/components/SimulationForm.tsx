/**
 * Formulário avançado de simulação de crédito
 * 
 * @component SimulationForm
 * @description Implementa o formulário completo de simulação de crédito com garantia de imóvel,
 * incluindo validações avançadas, cálculos precisos e integração com API.
 * 
 * @features
 * - Integração com API de simulação
 * - Suporte a diferentes sistemas de amortização (SAC/PRICE)
 * - Validações em tempo real
 * - Feedback visual de erros
 * - Loading states
 * - Formulário de contato pós-simulação
 * 
 * @businessRules
 * - Validação de valores mínimos e máximos
 * - Verificação de proporção empréstimo/garantia
 * - Cálculo de parcelas com juros + IPCA
 * - Tratamento de casos especiais (carência, etc)
 * 
 * @errorHandling
 * - Validação de entrada de dados
 * - Tratamento de erros da API
 * - Feedback visual de erros
 * - Logs de depuração
 * 
 * @integration
 * - Integração com serviço simulationApi
 * - Formatação de dados para API
 * - Parsing de resposta
 * 
 * @example
 * ```tsx
 * <SimulationForm />
 * ```
 * 
 * @see {@link simulateCredit} para detalhes da integração com API
 * @see {@link validateForm} para regras de validação
 * @see {@link formatBRL} para formatação de valores
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { validateForm } from '@/utils/validations';
import { LocalSimulationService, SimulationResult } from '@/services/localSimulationService';
import {
  SIMULATION_PLACEHOLDER_EMAIL,
  SIMULATION_PLACEHOLDER_NAME,
  SIMULATION_PLACEHOLDER_PHONE
} from '@/constants/simulationPlaceholders';
import { useUserJourney } from '@/hooks/useUserJourney';
import { useIsMobile } from '@/hooks/use-mobile';
import CityAutocomplete from './form/CityAutocomplete';
import LoanAmountField from './form/LoanAmountField';
import GuaranteeAmountField from './form/GuaranteeAmountField';
import InstallmentsField from './form/InstallmentsField';
import AmortizationField from './form/AmortizationField';
import ApiMessageDisplay from './ApiMessageDisplay';
import SmartApiMessage from './messages/SmartApiMessage';
import SimulationResultDisplay from './SimulationResultDisplay';
import { ApiMessageAnalysis } from '@/utils/apiMessageAnalyzer';
import { analyzeLocalMessage } from '@/utils/localMessageAnalyzer';
import { formatBRL, norm } from '@/utils/formatters';
import { toast } from '@/components/ui/use-toast';

const SimulationForm: React.FC = () => {
  const { sessionId, visitorId, trackSimulation, getJourneyData } = useUserJourney();
  const isMobile = useIsMobile();
  const loanAmountRef = useRef<HTMLInputElement>(null);
  const [emprestimo, setEmprestimo] = useState('');
  const [garantia, setGarantia] = useState('');
  const [parcelas, setParcelas] = useState<number>(180);
  const [amortizacao, setAmortizacao] = useState('PRICE');
  const [cidade, setCidade] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<SimulationResult | null>(null);
  const [erro, setErro] = useState('');
  const [apiMessage, setApiMessage] = useState<ApiMessageAnalysis | null>(null);
  const [isRuralProperty, setIsRuralProperty] = useState(false);

  // Validações
  const validation = validateForm(emprestimo, garantia, parcelas, amortizacao, cidade);

  const invalidCity = !cidade;
  const invalidLoan = !emprestimo || validation.emprestimoForaRange;
  const invalidGuarantee = !garantia || validation.emprestimoExcedeGarantia || norm(garantia) <= 0;
  const invalidAmortization = !amortizacao;

  const handleEmprestimoChange = (value: string) => {
    // aceitar somente números e limitar a 7 dígitos
    const numeric = value.replace(/\D/g, '').slice(0, 7);
    if (!numeric) return setEmprestimo('');

    // limitar valor máximo permitido
    let numValue = Number(numeric);
    if (numValue > 5000000) {
      numValue = 5000000;
    }

    setEmprestimo(formatBRL(numValue.toString()));
  };

  const handleGarantiaChange = (value: string) => {
    const numeric = value.replace(/\D/g, '').slice(0, 8);
    if (!numeric) return setGarantia('');

    let numValue = Number(numeric);
    if (numValue > 50000000) {
      numValue = 50000000;
    }

    setGarantia(formatBRL(numValue.toString()));
  };

  // Função para rolar para o resultado no mobile
  const scrollToResult = () => {
    if (isMobile) {
      setTimeout(() => {
        const resultElement = document.querySelector('[data-result-section="true"]');
        if (resultElement) {
          (resultElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300); // Delay para garantir que o resultado seja renderizado
    }
  };

  // Rolagem para mensagens de limite (rural/ltv30) no mobile
  const scrollToApiMessage = () => {
    if (isMobile) {
      setTimeout(() => {
        const messageElement = document.querySelector('[data-api-message="true"]');
        if (messageElement) {
          (messageElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.formularioValido) {
      toast({
        description: 'Preencha todos os campos primeiro para receber a sua simulação',
        variant: 'warning'
      });
      return;
    }

    if (!sessionId) return;

    setLoading(true);
    setErro('');
    setResultado(null);

    try {
      const journey = getJourneyData?.();
      const fallbackLandingPage =
        typeof window !== 'undefined' ? window.location.href : undefined;
      const fallbackReferrer =
        typeof document !== 'undefined' ? document.referrer || null : undefined;

      // Preparar dados para o serviço (sem dados pessoais ainda)
      const simulationInput = {
        sessionId,
        visitorId,
        nomeCompleto: SIMULATION_PLACEHOLDER_NAME, // Temporário até preenchimento do contato
        email: SIMULATION_PLACEHOLDER_EMAIL,
        telefone: SIMULATION_PLACEHOLDER_PHONE,
        cidade: cidade,
        valorEmprestimo: validation.emprestimoValue,
        valorImovel: validation.garantiaValue,
        parcelas: parcelas,
        tipoAmortizacao: amortizacao,
        userAgent: navigator.userAgent,
        ipAddress: undefined,
        isRuralProperty,
        utmSource: journey ? journey.utm_source ?? null : undefined,
        utmMedium: journey ? journey.utm_medium ?? null : undefined,
        utmCampaign: journey ? journey.utm_campaign ?? null : undefined,
        utmTerm: journey ? journey.utm_term ?? null : undefined,
        utmContent: journey ? journey.utm_content ?? null : undefined,
        landingPage: journey?.landing_page ?? fallbackLandingPage,
        referrer: journey ? journey.referrer ?? null : fallbackReferrer
      };


      // Usar o serviço local sem APIs
      const result = await LocalSimulationService.performSimulation(simulationInput);


      // Rastrear simulação na jornada do usuário
      trackSimulation({
        simulationId: result.id,
        valorEmprestimo: result.valorEmprestimo,
        valorImovel: result.valorImovel,
        parcelas: result.parcelas,
        cidade: result.cidade
      });

      setResultado(result);
      
      // Rolar para o resultado no mobile
      scrollToResult();

    } catch (error) {
      // Erro na simulação
      
      if (error instanceof Error) {
        // Analisar a mensagem usando analisador local
        const analysis = analyzeLocalMessage(error.message);
        
        if (analysis.type !== 'unknown_error') {
          // É uma mensagem estruturada do serviço local
          setApiMessage(analysis);
          setErro(''); // Limpar erro genérico
          if (analysis.type === 'limit_30_general' || analysis.type === 'limit_30_rural') {
            scrollToApiMessage();
          }
        } else {
          // É um erro genérico
          let errorMessage = 'Erro desconhecido ao realizar simulação';
          
          if (error.message.includes('HTTP') || error.message.includes('fetch')) {
            errorMessage = 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.';
          } else {
            errorMessage = error.message;
          }
          
          setErro(errorMessage);
          setApiMessage(null);
        }
      } else {
        setErro('Erro desconhecido ao realizar simulação');
        setApiMessage(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setEmprestimo('');
    setGarantia('');
    setParcelas(180);
    setAmortizacao('PRICE');
    setCidade('');
    setResultado(null);
    setErro('');
    setApiMessage(null);
    setIsRuralProperty(false);
  };

  // Função para ajustar valores automaticamente (30%) e executar simulação
  const handleAdjustValues = async (novoEmprestimo: number, isRural: boolean = false) => {
    const atual = norm(emprestimo);
    const final = Math.min(novoEmprestimo, atual);

    // Ajustar os valores - usar valor completo com formatação
    setEmprestimo(formatBRL(final.toString()));
    setIsRuralProperty(isRural);
    setApiMessage(null);
    setErro('');

    // Aguardar um pouco para garantir que os estados sejam atualizados
    setTimeout(async () => {
      // Verificar se temos todos os dados necessários para simular
      if (!sessionId || !cidade || !amortizacao) {
        return;
      }

      // Recalcular validação com novos valores
      const newValidation = validateForm(
        formatBRL(final.toString()),
        garantia,
        parcelas,
        amortizacao,
        cidade
      );

      if (!newValidation.formularioValido) {
        return;
      }

      // Executar simulação automaticamente
      setLoading(true);

      try {
        const simulationInput = {
          sessionId,
          visitorId,
          nomeCompleto: SIMULATION_PLACEHOLDER_NAME,
          email: SIMULATION_PLACEHOLDER_EMAIL,
          telefone: SIMULATION_PLACEHOLDER_PHONE,
          cidade: cidade,
          valorEmprestimo: newValidation.emprestimoValue,
          valorImovel: newValidation.garantiaValue,
          parcelas: parcelas,
          tipoAmortizacao: amortizacao,
          userAgent: navigator.userAgent,
          ipAddress: undefined,
          isRuralProperty: isRural
        };


        const result = await LocalSimulationService.performSimulation(simulationInput);


        // Rastrear simulação na jornada do usuário
        trackSimulation({
          simulationId: result.id,
          valorEmprestimo: result.valorEmprestimo,
          valorImovel: result.valorImovel,
          parcelas: result.parcelas,
          cidade: result.cidade
        });

        setResultado(result);
        
        // Rolar para o resultado no mobile
        scrollToResult();

      } catch (error) {
        // Erro na simulação automática
        
        if (error instanceof Error) {
          const analysis = analyzeLocalMessage(error.message);
          
          if (analysis.type !== 'unknown_error') {
            setApiMessage(analysis);
            setErro('');
            if (analysis.type === 'limit_30_general' || analysis.type === 'limit_30_rural') {
              scrollToApiMessage();
            }
          } else {
            let errorMessage = 'Erro ao processar simulação automática';
            
            if (error.message.includes('HTTP') || error.message.includes('fetch')) {
              errorMessage = 'Erro de conexão. Tente novamente.';
            } else {
              errorMessage = error.message;
            }
            
            setErro(errorMessage);
            setApiMessage(null);
          }
        } else {
          setErro('Erro desconhecido na simulação automática');
          setApiMessage(null);
        }
      } finally {
        setLoading(false);
      }
    }, 100); // Pequeno delay para garantir que os estados sejam atualizados
  };

  // Função para tentar novamente
  const handleTryAgain = () => {
    setApiMessage(null);
    setErro('');
    setResultado(null);
    // Manter os valores preenchidos para facilitar nova tentativa
  };

  // Função para nova simulação (limpa resultado mas mantém valores)
  const handleNewSimulation = () => {
    setResultado(null);
    setApiMessage(null);
    setErro('');
    // Manter valores para facilitar nova simulação
  };

  // Função para trocar para tabela PRICE e refazer simulação
  const handleSwitchToPrice = async () => {
    if (!sessionId || !cidade) return;

    // Alterar amortização para PRICE
    setAmortizacao('PRICE');
    setApiMessage(null);
    setErro('');
    setLoading(true);

    // Aguardar um pouco para garantir que o estado seja atualizado
    setTimeout(async () => {
      try {
        const simulationInput = {
          sessionId,
          visitorId,
          nomeCompleto: SIMULATION_PLACEHOLDER_NAME,
          email: SIMULATION_PLACEHOLDER_EMAIL,
          telefone: SIMULATION_PLACEHOLDER_PHONE,
          cidade: cidade,
          valorEmprestimo: validation.emprestimoValue,
          valorImovel: validation.garantiaValue,
          parcelas: parcelas,
          tipoAmortizacao: 'PRICE',
          userAgent: navigator.userAgent,
          ipAddress: undefined,
          isRuralProperty
        };


        const result = await LocalSimulationService.performSimulation(simulationInput);


        // Rastrear simulação na jornada do usuário
        trackSimulation({
          simulationId: result.id,
          valorEmprestimo: result.valorEmprestimo,
          valorImovel: result.valorImovel,
          parcelas: result.parcelas,
          cidade: result.cidade
        });

        setResultado(result);
        
        // Rolar para o resultado no mobile
        scrollToResult();

      } catch (error) {
        // Erro na simulação PRICE
        
        if (error instanceof Error) {
          const analysis = analyzeLocalMessage(error.message);
          
          if (analysis.type !== 'unknown_error') {
            setApiMessage(analysis);
            setErro('');
            if (analysis.type === 'limit_30_general' || analysis.type === 'limit_30_rural') {
              scrollToApiMessage();
            }
          } else {
            setErro('Erro ao refazer simulação com tabela PRICE');
            setApiMessage(null);
          }
        } else {
          setErro('Erro desconhecido ao refazer simulação');
          setApiMessage(null);
        }
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  const isLtvMessage =
    apiMessage &&
    (apiMessage.type === 'limit_30_general' || apiMessage.type === 'limit_30_rural');

  const showSideComplement = !isMobile && (resultado || isLtvMessage);

  return (
    <div
      className={`container mx-auto px-3 ${
        isMobile ? 'py-2 pb-4' : 'py-2 min-h-[calc(100vh-4rem)]'
      } ${showSideComplement ? 'max-w-6xl' : 'max-w-xl'}`}
    >
      <div className={`${showSideComplement ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch justify-center' : ''}`}> 
        {/* Formulário de Simulação */}
        <Card className="shadow-lg h-full" id="simulation-card">
          <CardHeader data-sim-card-header="true" className="text-center pb-2">
            <CardTitle className="text-lg md:text-xl font-bold text-green-700 mb-1">
              Sua simulação em um clique!
            </CardTitle>
            <p className="text-gray-600 text-xs">
              Veja se as parcelas encaixam no orçamento.
            </p>
          </CardHeader>
          
          <CardContent className="p-3 md:p-4">
            <form onSubmit={handleSubmit} className="space-y-2">
              
              <CityAutocomplete
                value={cidade}
                onCityChange={(city) => {
                  setCidade(city);
                  if (isMobile && city) {
                    setTimeout(() => loanAmountRef.current?.focus(), 0);
                  }
                }}
                isInvalid={invalidCity}
              />

              <LoanAmountField
                ref={loanAmountRef}
                value={emprestimo}
                onChange={handleEmprestimoChange}
                isInvalid={invalidLoan}
              />

              <GuaranteeAmountField
                value={garantia}
                onChange={handleGarantiaChange}
                showError={validation.emprestimoExcedeGarantia}
                isInvalid={invalidGuarantee}
              />

              <InstallmentsField value={parcelas} onChange={setParcelas} />

              <AmortizationField
                value={amortizacao}
                onChange={setAmortizacao}
                isInvalid={invalidAmortization}
              />

              {/* Botões */}
              <div className="flex gap-2 pt-2">
                <Button
                type="submit"
                disabled={!validation.formularioValido || loading}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 text-sm font-semibold min-h-[44px]"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Calculando...
                    </div>
                  ) : (
                    'CALCULAR'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="px-4 py-2 text-libra-blue border-libra-blue hover:bg-libra-light min-h-[44px] text-sm"
                >
                  LIMPAR
                </Button>
              </div>

              {/* Mensagem inteligente da API */}
              {apiMessage && (!isLtvMessage || isMobile) && (
                <div className="mt-3">
                  <SmartApiMessage
                    analysis={apiMessage}
                    valorImovel={validation.garantiaValue}
                    valorEmprestimoAtual={validation.emprestimoValue || norm(emprestimo)}
                    onAdjustValues={handleAdjustValues}
                    onTryAgain={handleTryAgain}
                  />
                </div>
              )}
              
              {/* Erro genérico */}
              {erro && !apiMessage && (
                <div className="mt-3">
                  <ApiMessageDisplay 
                    message={erro}
                    type="error"
                    onRetry={() => {
                      setErro('');
                      if (validation.formularioValido) {
                        handleSubmit(new Event('submit') as any);
                      }
                    }}
                    showRetryButton={validation.formularioValido}
                  />
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Resultado ou Complemento */}
        {(resultado || (!isMobile && isLtvMessage && apiMessage)) && (
          <div
            data-result-section="true"
            className={`scroll-mt-header h-full ${showSideComplement ? '' : 'mt-4'}`}
          >
            {resultado ? (
              <SimulationResultDisplay
                resultado={resultado}
                valorEmprestimo={validation.emprestimoValue}
                valorImovel={validation.garantiaValue}
                cidade={cidade}
                onNewSimulation={handleNewSimulation}
                onSwitchToPrice={handleSwitchToPrice}
              />
            ) : (
              <SmartApiMessage
                analysis={apiMessage as ApiMessageAnalysis}
                valorImovel={validation.garantiaValue}
                valorEmprestimoAtual={validation.emprestimoValue || norm(emprestimo)}
                onAdjustValues={handleAdjustValues}
                onTryAgain={handleTryAgain}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationForm;
