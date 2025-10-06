
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useNavigate } from 'react-router-dom';
import { LocalSimulationService } from '@/services/localSimulationService';
import { useUserJourney } from '@/hooks/useUserJourney';
import Home from 'lucide-react/dist/esm/icons/home';
import Building from 'lucide-react/dist/esm/icons/building';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { cn } from '@/lib/utils';
import { formatPhone, validatePhone } from '@/utils/validations';

interface SanitizedPhoneResult {
  sanitized: string;
  ddiRemoved: boolean;
  addedNine: boolean;
}

const sanitizePhoneInput = (value: string): SanitizedPhoneResult => {
  let digitsOnly = value.replace(/\D/g, '');
  let ddiRemoved = false;
  let addedNine = false;

  if (digitsOnly.length > 11 && digitsOnly.startsWith('55')) {
    digitsOnly = digitsOnly.slice(2);
    ddiRemoved = true;
  }

  if (digitsOnly.length > 11) {
    digitsOnly = digitsOnly.slice(0, 11);
  }

  if (digitsOnly.length > 2) {
    const ddd = digitsOnly.slice(0, 2);
    const subscriber = digitsOnly.slice(2);
    if (subscriber.length === 8) {
      digitsOnly = `${ddd}9${subscriber}`;
      addedNine = true;
    }
  }

  if (digitsOnly.length > 11) {
    digitsOnly = digitsOnly.slice(0, 11);
  }

  return {
    sanitized: digitsOnly,
    ddiRemoved,
    addedNine
  };
};

/**
 * Props for the contact form component.
 *
 * The form automatically forwards any available UTM parameters and the
 * original landing_page URL from the user's journey to the backend when the
 * contact is submitted.
 */
interface ContactFormProps {
  simulationResult: {
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
  };
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  compact?: boolean;
}

const ContactForm: React.FC<ContactFormProps> = ({ 
  simulationResult, 
  className = '',
  inputClassName = '',
  buttonClassName = '',
  compact = false
}) => {
  const { sessionId, visitorId, getJourneyData } = useUserJourney();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [telefoneSanitizado, setTelefoneSanitizado] = useState('');
  const [phoneSanitizationWarnings, setPhoneSanitizationWarnings] = useState({
    extraDDI: false,
    missingNine: false
  });
  const [imovelProprio, setImovelProprio] = useState<'proprio' | 'terceiro' | ''>('');
  const [aceitePrivacidade, setAceitePrivacidade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showIncompleteError, setShowIncompleteError] = useState(false);

  const invalidNome = nome.trim() === '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmail = !emailRegex.test(email.trim());
  const sanitizedTelefone = telefoneSanitizado || sanitizePhoneInput(telefone).sanitized;
  const invalidTelefone = !validatePhone(sanitizedTelefone);
  const invalidImovelProprio = imovelProprio === '';
  const invalidAceite = !aceitePrivacidade;
  const formComplete =
    !invalidNome &&
    !invalidEmail &&
    !invalidTelefone &&
    !invalidImovelProprio &&
    !invalidAceite;

  useEffect(() => {
    if (formComplete) {
      setShowIncompleteError(false);
    }
  }, [formComplete]);

  const handlePhoneChange = (value: string) => {
    const { sanitized, ddiRemoved, addedNine } = sanitizePhoneInput(value);
    setTelefoneSanitizado(sanitized);
    setTelefone(sanitized ? formatPhone(sanitized) : '');
    setPhoneSanitizationWarnings({
      extraDDI: ddiRemoved,
      missingNine: addedNine
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formComplete) {
      setShowIncompleteError(true);
      return;
    }
    
    console.log('🔍 Debug dados da simulação:', {
      simulationResult,
      simulationId: simulationResult.id,
      userJourneyId: simulationResult.userJourneyId,
      sessionId,
      hasId: !!simulationResult.id,
      hasSessionId: !!sessionId
    });
    
    if (!aceitePrivacidade) {
      alert('É necessário aceitar a Política de Privacidade para continuar.');
      return;
    }

    if (!imovelProprio) {
      alert('Por favor, informe se o imóvel é próprio ou de terceiro.');
      return;
    }

    if (!simulationResult.id) {
      console.error('❌ ID da simulação não encontrado:', simulationResult);
      alert('Erro: ID da simulação não encontrado. Tente simular novamente.');
      return;
    }
    
    if (!sessionId) {
      console.error('❌ Session ID não encontrado');
      alert('Erro: Session ID não encontrado. Tente recarregar a página.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('📋 Enviando formulário de contato:', {
        simulationId: simulationResult.id,
        sessionId,
        nome,
        email,
        telefone: sanitizedTelefone,
        imovelProprio,
        imovelProprioTexto: imovelProprio === 'proprio' ? 'Imóvel Próprio' : 'Imóvel de Terceiro'
      });

      const journey = getJourneyData();


      await LocalSimulationService.processContact({
        simulationId: simulationResult.id,
        sessionId,
        visitorId,
        ...(simulationResult.userJourneyId ? { userJourneyId: simulationResult.userJourneyId } : {}),
        nomeCompleto: nome,
        email,
        telefone: sanitizedTelefone,
        cidade: simulationResult.cidade,
        imovelProprio,
        observacoes: `Simulação: ${simulationResult.amortizacao} - ${simulationResult.parcelas}x - R$ ${simulationResult.valor.toLocaleString('pt-BR')}`,
        // Dados adicionais para API Ploomes
        valorDesejadoEmprestimo: simulationResult.valorEmprestimo,
        valorImovelGarantia: simulationResult.valorImovel,
        valorParcelaCalculada: simulationResult.valor,
        tipoAmortizacao: simulationResult.amortizacao,
        quantidadeParcelas: simulationResult.parcelas,
        aceitaPolitica: aceitePrivacidade,
        utm_source: journey?.utm_source ?? null,
        utm_medium: journey?.utm_medium ?? null,
        utm_campaign: journey?.utm_campaign ?? null,
        utm_term: journey?.utm_term ?? null,
        utm_content: journey?.utm_content ?? null,
        landing_page: journey?.landing_page ?? null,
        referrer: journey?.referrer ?? null

      });
      
      // Redirecionar diretamente para a página de confirmação com resumo
      const summary = {
        nome,
        email,
        telefone,
        valorEmprestimo: simulationResult.valorEmprestimo,
        valorImovel: simulationResult.valorImovel,
        cidade: simulationResult.cidade,
        parcelas: simulationResult.parcelas,
        valorParcela: simulationResult.valor,
        amortizacao: simulationResult.amortizacao,
        imovelProprio,
        emailValido: !invalidEmail

      };

      const currency = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
      const valorEmprestimo = currency.format(summary.valorEmprestimo);
      const valorParcela = currency.format(summary.valorParcela);
      const valorImovel = currency.format(summary.valorImovel);
      const mensagem = `Olá, meu nome é ${summary.nome}. Gostaria de um empréstimo de ${valorEmprestimo} em ${summary.parcelas} parcelas pelo sistema ${summary.amortizacao}. A parcela fica ${valorParcela}. Tenho ${summary.imovelProprio === 'proprio' ? 'imóvel próprio' : 'imóvel de terceiro'} em ${summary.cidade} avaliado em ${valorImovel}.`;
      const whatsappLink = `https://wa.me/5516997338791?text=${encodeURIComponent(mensagem)}`;

      navigate('/confirmacao', { state: { summary, whatsappLink } });
      
      // Limpar formulário
      setNome('');
      setEmail('');
      setTelefone('');
      setTelefoneSanitizado('');
      setPhoneSanitizationWarnings({ extraDDI: false, missingNine: false });
      setImovelProprio('');
      setAceitePrivacidade(false);
      
    } catch (error) {
      console.error('❌ Erro ao enviar solicitação:', error);
      
      let mensagemErro = 'Erro ao enviar solicitação. ';
      
      if (error instanceof Error) {
        // Verificar se é erro de duplicidade do Ploomes/CRM
        if (error.message.toLowerCase().includes('já existe') || 
            error.message.toLowerCase().includes('7 dias') ||
            error.message.toLowerCase().includes('lead já existe')) {
          mensagemErro = '⚠️ Você já possui uma solicitação em andamento.\n\nNossa equipe já está analisando seu pedido anterior.\nAguarde nosso contato!\n\n📞 Em caso de dúvidas, entre em contato pelo WhatsApp.';
        } else {
          mensagemErro += error.message;
        }
      } else {
        mensagemErro += 'Por favor, tente novamente.';
      }
      
      alert(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const valorFormatado = simulationResult.valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  // Versão compacta para uso no resultado visual
  if (compact) {
    return (
      <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
        <div>
          <label htmlFor="nome-compact" className="sr-only">
            Nome Completo
          </label>
          <Input
            id="nome-compact"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome Completo"
            className={cn(
              'rounded-lg h-12 focus:shadow-md',
              inputClassName,
              invalidNome && 'border-red-500 focus:border-red-500 focus:ring-red-500'
            )}
            required
            aria-required="true"
          />
        </div>
        
        <div>
          <label htmlFor="email-compact" className="sr-only">
            E-mail
          </label>
          <Input
            id="email-compact"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className={cn(
              'rounded-lg h-12 focus:shadow-md',
              inputClassName,
              invalidEmail && 'border-red-500 focus:border-red-500 focus:ring-red-500'
            )}
            required
            aria-required="true"
          />
        </div>
        
        <div>
          <label htmlFor="telefone-compact" className="sr-only">
            Telefone
          </label>
          <Input
            id="telefone-compact"
            type="tel"
            value={telefone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="Telefone (99) 99999-9999"
            className={cn(
              'rounded-lg h-12 focus:shadow-md',
              inputClassName,
              invalidTelefone && 'border-red-500 focus:border-red-500 focus:ring-red-500'
            )}
            inputMode="numeric"
            required
            aria-required="true"
          />
          {(phoneSanitizationWarnings.extraDDI || phoneSanitizationWarnings.missingNine) && (
            <div className="mt-1 text-xs text-yellow-100">
              {phoneSanitizationWarnings.extraDDI && (
                <p>Removemos o DDI internacional +55 do número informado.</p>
              )}
              {phoneSanitizationWarnings.missingNine && (
                <p>Adicionamos o dígito 9 obrigatório após o DDD.</p>
              )}
            </div>
          )}
        </div>
        
        <fieldset className={cn('space-y-2', invalidImovelProprio && 'border border-red-500 rounded-md p-2')}>
          <legend id="tipo-imovel-label" className="text-sm text-white font-medium mb-1">
            O imóvel que será utilizado como garantia é:
          </legend>
          <div className="flex gap-3" role="radiogroup" aria-labelledby="tipo-imovel-label">
            <label
              className={`relative flex-1 flex items-center justify-center gap-2 rounded-lg text-sm font-medium cursor-pointer ${
                imovelProprio === 'proprio' ? 'bg-white text-libra-blue' : 'bg-white/50 text-libra-navy'
              }`}
            >
              {/* Disable pointer events on hidden input to allow page scrolling */}
              <input
                type="radio"
                name="imovelProprioCompact"
                value="proprio"
                checked={imovelProprio === 'proprio'}
                onChange={(e) => setImovelProprio(e.target.value as 'proprio')}
                className="absolute inset-0 opacity-0 pointer-events-none"
                required
              />
              <Home className="w-4 h-4" />
              Imóvel Próprio
            </label>
            <label
              className={`relative flex-1 flex items-center justify-center gap-2 rounded-lg text-sm font-medium cursor-pointer ${
                imovelProprio === 'terceiro' ? 'bg-white text-libra-blue' : 'bg-white/50 text-libra-navy'
              }`}
            >
              <input
                type="radio"
                name="imovelProprioCompact"
                value="terceiro"
                checked={imovelProprio === 'terceiro'}
                onChange={(e) => setImovelProprio(e.target.value as 'terceiro')}
                className="absolute inset-0 opacity-0 pointer-events-none"
                required
              />
              <Building className="w-4 h-4" />
              Imóvel de terceiro
            </label>
          </div>
        </fieldset>

        <div
          className={cn(
            'flex items-start gap-2 mt-4',
            invalidAceite && 'border border-red-500 rounded-md p-2'
          )}
        >
          <Checkbox
            id="aceite-compact"
            checked={aceitePrivacidade}
            onCheckedChange={(checked) => setAceitePrivacidade(checked as boolean)}
            className="bg-white"
          />
          <label htmlFor="aceite-compact" className="text-sm text-white font-bold leading-tight">
            Concordo com a{' '}
            <Link
              to="/politica-privacidade"
              className="underline hover:text-white"
              target="_blank"
            >
              Política de Privacidade
            </Link>
          </label>
        </div>

        <div className="relative">
          <Button
            type="submit"
            disabled={loading || !formComplete}
            className={`w-full h-14 text-base font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 text-libra-navy hover:from-yellow-500 hover:to-yellow-600 ${buttonClassName}`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Enviando...
              </div>
            ) : (
              <span className="flex items-center gap-2">
                Solicitar análise agora
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </Button>
          { !formComplete && !loading && (
            <div
              className="absolute inset-0 rounded-full cursor-not-allowed"
              onClick={(e) => {
                e.preventDefault();
                setShowIncompleteError(true);
              }}
            />
          )}
        </div>
        {showIncompleteError && !formComplete && (
          <p className="text-red-600 text-sm mt-2">Preencha todos os campos</p>
        )}
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resultado da simulação */}
      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardContent className="p-4 text-center">
          <div className="bg-blue-800 rounded-lg p-3 mb-3 inline-block">
            <p className="text-sm mb-1">Valor da sua parcela:</p>
            <p className="text-2xl font-bold">{valorFormatado}</p>
          </div>
          
          <div className="text-xs space-y-1">
            <p>
              Parcela calculada pela tabela {simulationResult.amortizacao.toUpperCase()} com
              taxa de juros de 1,19% a.m. + IPCA. Esta taxa pode sofrer alterações de acordo
              com a análise de crédito. Já estão inclusos custos com avaliação do imóvel,
              cartório e impostos.
            </p>
            
            {simulationResult.amortizacao === 'SAC' && simulationResult.primeiraParcela && simulationResult.ultimaParcela && (
              <p className="mt-2">
                <strong>Sistema SAC:</strong> Primeira parcela: {simulationResult.primeiraParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | 
                Última parcela: {simulationResult.ultimaParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulário de contato */}
      <Card className="bg-libra-green">

        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-libra-navy text-center">
            Gostou? Preencha os campos abaixo e solicite uma análise de crédito! Em breve a 
            nossa equipe entrará em contato para dar continuidade no processo do seu 
            empréstimo.
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="nome-full" className="block text-sm font-medium text-libra-navy mb-1">
                Nome Completo *
              </label>
              <Input
                id="nome-full"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo"
                className={cn(invalidNome && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                required
                aria-required="true"
              />
            </div>
            
            <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
              <div className="flex-1">
                <label htmlFor="email-full" className="block text-sm font-medium text-libra-navy mb-1">
                  E-mail *
                </label>
                <Input
                  id="email-full"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  className={cn('h-12', invalidEmail && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                  required
                  aria-required="true"
                />
              </div>

              <div className="flex-1">
                <label htmlFor="telefone-full" className="block text-sm font-medium text-libra-navy mb-1">
                  Telefone *
                </label>
                <Input
                  id="telefone-full"
                  type="tel"
                  value={telefone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(99) 99999-9999"
                  inputMode="numeric"
                  className={cn('h-12', invalidTelefone && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                  required
                  aria-required="true"
                />
                {(phoneSanitizationWarnings.extraDDI || phoneSanitizationWarnings.missingNine) && (
                  <div className="mt-1 text-xs text-yellow-700">
                    {phoneSanitizationWarnings.extraDDI && (
                      <p>Removemos o DDI internacional +55 do número informado.</p>
                    )}
                    {phoneSanitizationWarnings.missingNine && (
                      <p>Adicionamos o dígito 9 obrigatório após o DDD.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <fieldset className={cn('space-y-3', invalidImovelProprio && 'border border-red-500 rounded-md p-2')}>
              <legend id="tipo-imovel-legend" className="text-sm font-medium text-libra-navy">
                O imóvel que será utilizado como garantia é: *
                <div className="text-xs text-gray-500 font-normal mt-1" title="A matrícula/escritura do imóvel está no seu nome próprio ou de um terceiro?">
                  (A matrícula/escritura do imóvel está no seu nome próprio ou de um terceiro?)
                </div>
              </legend>
              <div className="flex gap-4" role="radiogroup" aria-labelledby="tipo-imovel-legend">
                <label
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md shadow-sm cursor-pointer ${
                    imovelProprio === 'proprio' ? 'bg-white text-libra-blue' : 'bg-libra-light/60 text-libra-navy'
                  }`}
                >
                  <input
                    type="radio"
                    name="imovelProprio"
                    value="proprio"
                    checked={imovelProprio === 'proprio'}
                    onChange={(e) => setImovelProprio(e.target.value as 'proprio')}
                    className="text-libra-blue"
                    required
                    aria-describedby="tipo-imovel-help"
                  />
                  Imóvel Próprio
                </label>
                <label
                  className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md shadow-sm cursor-pointer ${
                    imovelProprio === 'terceiro' ? 'bg-white text-libra-blue' : 'bg-libra-light/60 text-libra-navy'
                  }`}
                >
                  <input
                    type="radio"
                    name="imovelProprio"
                    value="terceiro"
                    checked={imovelProprio === 'terceiro'}
                    onChange={(e) => setImovelProprio(e.target.value as 'terceiro')}
                    className="text-libra-blue"
                    required
                    aria-describedby="tipo-imovel-help"
                  />
                  Imóvel de terceiro
                </label>
              </div>
              <div id="tipo-imovel-help" className="sr-only">
                Selecione se o imóvel usado como garantia é seu ou de terceiros
              </div>
            </fieldset>

            <div
              className={cn(
                'flex items-start gap-2 mt-2',
                invalidAceite && 'border border-red-500 rounded-md p-2'
              )}
            >
              <Checkbox
                id="aceite"
                checked={aceitePrivacidade}
                onCheckedChange={(checked) => setAceitePrivacidade(checked as boolean)}
                className="bg-white"
              />
              <label htmlFor="aceite" className="text-sm font-bold text-white leading-tight bg-libra-light/60 px-3 py-2 rounded-md shadow-sm focus-within:outline focus-within:outline-libra-blue">

                Tenho ciência e concordo que meus dados de contato aqui informados poderão ser
                utilizados pela Libra Crédito de acordo com os termos da{' '}
                <Link
                  to="/politica-privacidade"
                  className="text-libra-blue underline hover:text-libra-navy"
                  target="_blank"
                >
                  Política de Privacidade
                </Link>
              </label>
            </div>

            <div className="relative">
              <Button
                type="submit"
                disabled={loading || !formComplete}
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 text-libra-navy hover:from-yellow-500 hover:to-yellow-600"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </div>
                ) : (
                  <span className="flex items-center gap-2">
                    Solicitar análise agora
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
              { !formComplete && !loading && (
                <div
                  className="absolute inset-0 rounded-full cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowIncompleteError(true);
                  }}
                />
              )}
            </div>
            {showIncompleteError && !formComplete && (
              <p className="text-red-600 text-sm mt-2">Preencha todos os campos</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactForm;
