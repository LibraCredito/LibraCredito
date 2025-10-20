
import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';

interface SanitizedPhoneResult {
  sanitized: string;
  ddiRemoved: boolean;
  trimmedToEightDigits: boolean;
}

const sanitizePhoneInput = (value: string): SanitizedPhoneResult => {
  let digitsOnly = value.replace(/\D/g, '');
  let ddiRemoved = false;
  let trimmedToEightDigits = false;

  if (!digitsOnly) {
    return { sanitized: '', ddiRemoved, trimmedToEightDigits };
  }

  digitsOnly = digitsOnly.replace(/^0+/, '');

  if (digitsOnly.startsWith('55') && digitsOnly.length > 11) {
    digitsOnly = digitsOnly.slice(2);
    ddiRemoved = true;
    digitsOnly = digitsOnly.replace(/^0+/, '');
  }

  if (digitsOnly.length <= 2) {
    return { sanitized: digitsOnly, ddiRemoved, trimmedToEightDigits };
  }

  const ddd = digitsOnly.slice(0, 2);
  const originalSubscriber = digitsOnly.slice(2);
  let subscriber = originalSubscriber;

  if (subscriber.length > 9) {
    subscriber = subscriber.slice(-9);
  }

  if (subscriber.length === 8 && originalSubscriber.length > 8) {
    trimmedToEightDigits = true;
  }

  return {
    sanitized: `${ddd}${subscriber}`,
    ddiRemoved,
    trimmedToEightDigits
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
  const sanitizedPhone = useMemo(() => sanitizePhoneInput(telefone), [telefone]);
  const digitsOnlyPhone = useMemo(
    () => telefone.replace(/\D/g, '').replace(/^0+/, ''),
    [telefone]
  );
  const [phoneConfirmationOpen, setPhoneConfirmationOpen] = useState(false);
  const [imovelProprio, setImovelProprio] = useState<'proprio' | 'terceiro' | ''>('');
  const [aceitePrivacidade, setAceitePrivacidade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showIncompleteError, setShowIncompleteError] = useState(false);

  const invalidNome = nome.trim() === '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmail = !emailRegex.test(email.trim());
  const sanitizedTelefone = sanitizedPhone.sanitized;
  const invalidTelefone = !validatePhone(sanitizedTelefone);
  const requiresPhoneConfirmation = useMemo(
    () =>
      Boolean(sanitizedTelefone) &&
      (sanitizedPhone.ddiRemoved ||
        sanitizedPhone.trimmedToEightDigits ||
        digitsOnlyPhone !== sanitizedTelefone),
    [digitsOnlyPhone, sanitizedPhone.ddiRemoved, sanitizedPhone.trimmedToEightDigits, sanitizedTelefone]
  );
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
    setTelefone(value);
  };

  const resetForm = () => {
    setNome('');
    setEmail('');
    setTelefone('');
    setImovelProprio('');
    setAceitePrivacidade(false);
  };

  const submitContact = async () => {
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
        telefone: sanitizedTelefone,
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

      resetForm();

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

    if (requiresPhoneConfirmation) {
      setPhoneConfirmationOpen(true);
      return;
    }

    await submitContact();
  };

  const confirmPhoneAndSubmit = async () => {
    setPhoneConfirmationOpen(false);
    await submitContact();
  };

  const formattedSanitizedTelefone = sanitizedTelefone ? formatPhone(sanitizedTelefone) : '';

  const phoneConfirmationDialog = (
    <Dialog open={phoneConfirmationOpen} onOpenChange={setPhoneConfirmationOpen}>
      <DialogContent className="max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle>Confirme o telefone informado</DialogTitle>
          <DialogDescription>
            Verifique se o número abaixo está correto antes de enviar seus dados para análise.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-libra-navy">
          <div>
            <p className="font-medium">Como você digitou:</p>
            <p className="mt-1 rounded bg-libra-light/40 px-3 py-2 break-all">{telefone || '—'}</p>
          </div>
          <div>
            <p className="font-medium">Como iremos enviar ao time da Libra:</p>
            <p className="mt-1 rounded bg-libra-light px-3 py-2 font-semibold">
              {formattedSanitizedTelefone || sanitizedTelefone}
            </p>
          </div>
          {(sanitizedPhone.ddiRemoved || sanitizedPhone.trimmedToEightDigits) && (
            <div className="rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
              {sanitizedPhone.ddiRemoved && (
                <p>Removemos o DDI internacional antes de padronizar o número.</p>
              )}
              {sanitizedPhone.trimmedToEightDigits && (
                <p>Mantivemos apenas os oito últimos dígitos após o DDD, conforme solicitado.</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="sm:space-x-2 sm:space-y-0 space-y-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              Editar número
            </Button>
          </DialogClose>
          <Button type="button" onClick={confirmPhoneAndSubmit} disabled={loading}>
            Confirmar telefone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const valorFormatado = simulationResult.valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  // Versão compacta para uso no resultado visual
  if (compact) {
    return (
      <>
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
          {(sanitizedPhone.ddiRemoved || sanitizedPhone.trimmedToEightDigits) && sanitizedTelefone && (
            <div className="mt-1 text-xs text-yellow-100">
              {sanitizedPhone.ddiRemoved && (
                <p>Removemos o DDI internacional (por exemplo, +55) do número informado.</p>
              )}
              {sanitizedPhone.trimmedToEightDigits && (
                <p>Padronizamos o telefone para DDD + 8 dígitos, mantendo apenas os oito últimos dígitos informados.</p>
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
        {phoneConfirmationDialog}
      </>
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
                {(sanitizedPhone.ddiRemoved || sanitizedPhone.trimmedToEightDigits) && sanitizedTelefone && (
                  <div className="mt-1 text-xs text-yellow-700">
                    {sanitizedPhone.ddiRemoved && (
                      <p>Removemos o DDI internacional (por exemplo, +55) do número informado.</p>
                    )}
                    {sanitizedPhone.trimmedToEightDigits && (
                      <p>Padronizamos o telefone para DDD + 8 dígitos, mantendo apenas os oito últimos dígitos informados.</p>
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
          {phoneConfirmationDialog}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactForm;
