import React, { Suspense, useState } from 'react';
import Calculator from 'lucide-react/dist/esm/icons/calculator';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Users from 'lucide-react/dist/esm/icons/users';
import Headphones from 'lucide-react/dist/esm/icons/headphones';
const TrendingUp = React.lazy(
  () => import('lucide-react/dist/esm/icons/trending-up')
);
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import ContactForm from './ContactForm';

interface SimulationResultDisplayProps {
  resultado: {
    id: string;
    valor: number;
    amortizacao: string;
    parcelas: number;
    primeiraParcela?: number;
    ultimaParcela?: number;
  };
  valorEmprestimo: number;
  valorImovel: number;
  cidade: string;
  onNewSimulation: () => void;
  onSwitchToPrice?: () => void;
}

/**
 * Tooltip component para informações sobre renda familiar
 */
const TooltipInfo: React.FC<{ children: React.ReactNode; content: string }> = ({ children, content }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        {children}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 px-3 py-2 bg-gray-800 text-white text-center text-sm rounded-lg z-10 shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};

/**
 * Mostra dica para trocar para PRICE quando a renda fica alta
 */
const SwitchPriceTip: React.FC<{ onSwitchToPrice?: () => void }> = ({
  onSwitchToPrice,
}) => {
  const [showTip, setShowTip] = useState(false);
  const [pinned, setPinned] = useState(false);
  return (
    <div className="relative inline-block text-yellow-800">
      <div
        onMouseEnter={() => !pinned && setShowTip(true)}
        onMouseLeave={() => !pinned && setShowTip(false)}
        onClick={() => {
          if (pinned) {
            setPinned(false);
            setShowTip(false);
          } else {
            setPinned(true);
            setShowTip(true);
          }
        }}
        className="cursor-pointer font-medium flex items-center gap-1"
      >
        <span role="img" aria-label="dica">💡</span>
        Diminua a Parcela
      </div>
      {showTip && (
        <div
          onMouseEnter={() => !pinned && setShowTip(true)}
          onMouseLeave={() => !pinned && setShowTip(false)}
          className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-60 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg shadow-lg text-center z-10"
        >
          <div className="text-xs mb-2">Na tabela PRICE a renda necessária é menor!</div>
          {onSwitchToPrice && (
            <Button
              onClick={onSwitchToPrice}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1"
              size="sm"
            >
              <Suspense fallback={<div className="w-3 h-3 mr-1" />}>
                <TrendingUp className="w-3 h-3 mr-1 text-[#003399]" />
              </Suspense>
              Ver simulação PRICE
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Componente otimizado para exibir resultado da simulação com layout responsivo
 */
const SimulationResultDisplay: React.FC<SimulationResultDisplayProps> = ({
  resultado,
  valorEmprestimo: _valorEmprestimo,
  valorImovel: _valorImovel,
  cidade: _cidade,
  onNewSimulation,
  onSwitchToPrice
}) => {
  const isMobile = useIsMobile();
  const {
    valor: valorRaw,
    amortizacao,
    parcelas: _parcelas,
    primeiraParcela: primeiraParcelaRaw,
    ultimaParcela: ultimaParcelaRaw,
  } = resultado;

  const valor = Number(valorRaw);
  const primeiraParcela =
    primeiraParcelaRaw !== undefined ? Number(primeiraParcelaRaw) : undefined;
  const ultimaParcela =
    ultimaParcelaRaw !== undefined ? Number(ultimaParcelaRaw) : undefined;
  
  // Cálculo da renda mínima familiar
  const calcularRendaMinima = () => {
    if (amortizacao === 'SAC' && primeiraParcela) {
      return primeiraParcela * 3.33;
    } else {
      return valor * 3.33;
    }
  };
  
  const rendaMinima = calcularRendaMinima();
  
  if (isMobile) {
    // Layout Mobile - Sucinto e direto
    return (
      <div className="flex flex-col h-full bg-libra-green rounded-xl p-4 text-libra-navy shadow-xl">

        {/* Header compacto */}
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-white" />
          <div>
            <h3 className="font-bold text-white">Simulação Pronta!</h3>
          </div>
        </div>

        {/* Valor da parcela destacado */}
        <div className="bg-green-50 rounded-lg p-4 mb-2 text-libra-navy">
          {amortizacao === 'SAC' && primeiraParcela ? (
            <div>
              <div className="text-xs font-medium mb-2 text-center">Sistema SAC - Parcelas Decrescentes</div>
              <div className="grid grid-cols-2 gap-3 text-center">
                {/* Primeira parcela */}
                <div className="bg-green-100 rounded-lg p-3 border border-green-200">
                  <div className="text-xs font-medium mb-1">1ª Parcela</div>
                  <div className="text-lg font-bold whitespace-nowrap">
                    R$ {primeiraParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Maior valor</div>
                </div>
                {/* Última parcela */}
                <div className="bg-green-100 rounded-lg p-3 border border-green-200">
                  <div className="text-xs font-medium mb-1">Última Parcela</div>
                  <div className="text-lg font-bold whitespace-nowrap">
                    R$ {ultimaParcela?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Menor valor</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-xs mb-1">Parcela Fixa (PRICE)</div>
              <div className="text-2xl font-bold whitespace-nowrap">
                R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>

        {/* Renda mínima */}
        <div className="bg-green-50 rounded-lg p-3 mb-2 text-center relative text-libra-navy">
          <div className="text-sm mb-1 flex items-center justify-center gap-1">
            <span className="font-bold">Renda necessária</span>
            <TooltipInfo content="Renda familiar podendo ser composta por até 4 pessoas">
              <Users className="w-3 h-3 text-[#003399]" />
            </TooltipInfo>
          </div>
          <div className="text-lg font-bold whitespace-nowrap">
            R$ {rendaMinima.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {amortizacao === 'SAC' && (
            <div className="text-xs mt-2">
              <SwitchPriceTip onSwitchToPrice={onSwitchToPrice} />
            </div>
          )}
        </div>

        {/* Informações sobre taxa e custos */}
        <div className="bg-green-100 rounded-lg p-3 mb-2 lg:mb-2 text-xs text-[#003399]">
          <p className="mb-1">
            <strong>Parcelas calculadas</strong> pelo sistema {amortizacao} com taxa de juros de 1,19% a.m. + IPCA.
          </p>
          <p>
            Já inclusos custos com avaliação do imóvel, cartório e impostos.
          </p>
        </div>

        {/* CTA e Formulário compacto */}
        <div className="bg-libra-blue text-white rounded-lg p-2 sm:p-4 mb-2 lg:mb-2 flex items-center justify-center gap-2">
          <Headphones className="w-5 h-5 text-[#003399]" />
        <p className="text-sm sm:text-lg font-bold">
          Gostou? <span className="inline">Solicite uma consultoria gratuita!</span>
        </p>
        </div>
        
        <ContactForm
          simulationResult={{
            ...resultado,
            valorEmprestimo: _valorEmprestimo,
            valorImovel: _valorImovel,
            cidade: _cidade
          }}
          compact={true}
          className="space-y-3"
          inputClassName="bg-white/90 text-gray-800 placeholder-gray-500"
        />
      </div>
    );
  }
  
  // Layout Desktop - Adaptação do Mobile na Lateral
  return (
    <div className="flex flex-col h-full bg-libra-green rounded-xl p-4 text-libra-navy shadow-xl">

      {/* Header compacto */}
      <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-white" />
          <h3 className="text-lg font-bold text-white">Simulação Pronta!</h3>
        </div>
        <Button
          onClick={onNewSimulation}
          variant="outline"
          className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs px-2 py-1"
          size="sm"
        >
          <Calculator className="w-3 h-3 mr-1 text-white" />
          <span className="font-bold">Nova Simulação</span>
        </Button>
      </div>

      {/* Valor da parcela e renda mínima em layout compacto */}
      <div className="mb-2 text-libra-navy">
        {amortizacao === 'SAC' && primeiraParcela ? (
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-xs font-medium mb-2 text-center">Sistema SAC - Parcelas Decrescentes</div>
            <div className="grid grid-cols-3 gap-1">
              {/* Primeira parcela */}
              <div className="text-center bg-green-100 rounded-lg p-1 border border-green-200">
                <div className="text-xs font-medium mb-1">1ª Parcela</div>
                <div className="text-lg font-bold">
                  R$ {primeiraParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs">Maior valor</div>
              </div>
              {/* Última parcela */}
              <div className="text-center bg-green-100 rounded-lg p-1 border border-green-200">
                <div className="text-xs font-medium mb-1">Última Parcela</div>
                <div className="text-base font-bold">
                  R$ {ultimaParcela?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs">Menor valor</div>
              </div>
              {/* Renda mínima */}
              <div className="text-center rounded-lg p-1 border border-green-200">
                <div className="text-xs mb-1 flex items-center justify-center gap-1">
                  <span className="font-bold">Renda necessária</span>
                  <TooltipInfo content="Renda familiar podendo ser composta por até 4 pessoas">
                    <Users className="w-3 h-3 text-[#003399]" />
                  </TooltipInfo>
                </div>
                <div className="text-base font-bold">
                  R$ {rendaMinima.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-1 text-xs">
                  <SwitchPriceTip onSwitchToPrice={onSwitchToPrice} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 rounded-lg p-3 text-center">

              <div className="text-xs mb-1">Parcela Fixa (PRICE)</div>
              <div className="text-xl lg:text-2xl font-bold">
                R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center relative">
              <div className="text-xs mb-1 flex items-center justify-center gap-1">
                <span className="font-bold">Renda necessária</span>
                <TooltipInfo content="Renda familiar podendo ser composta por até 4 pessoas">
                  <Users className="w-3 h-3 text-[#003399]" />
                </TooltipInfo>
              </div>
              <div className="text-xl lg:text-2xl font-bold">
                R$ {rendaMinima.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Informações sobre taxa e custos */}
      <div className="bg-green-100 rounded-lg p-3 mb-2 lg:mb-2 text-xs text-[#003399]">
        <p className="mb-1">
          <strong>Parcelas calculadas</strong> pelo sistema {amortizacao} com taxa de juros de 1,19% a.m. + IPCA.
        </p>
        <p>
          Já inclusos custos com avaliação do imóvel, cartório e impostos.
        </p>
      </div>

      {/* CTA e Formulário compacto */}
      <div className="bg-libra-blue text-white rounded-lg p-2 sm:p-4 mb-2 lg:mb-2 flex items-center justify-center gap-2">
        <Headphones className="w-5 h-5 text-[#003399]" />
        <p className="text-sm sm:text-lg font-bold">
          Gostou? <span className="inline">Solicite uma consultoria gratuita!</span>
        </p>
      </div>
      
      <ContactForm
        simulationResult={{
          ...resultado,
          valorEmprestimo: _valorEmprestimo,
          valorImovel: _valorImovel,
          cidade: _cidade
        }}
        compact={true}
        className="space-y-3"
        inputClassName="bg-white/90 text-gray-800 placeholder-gray-500"
      />
    </div>
  );
};

export default SimulationResultDisplay;
