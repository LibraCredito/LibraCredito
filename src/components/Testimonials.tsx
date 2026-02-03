import React, { memo, useEffect, useState } from 'react';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import User from 'lucide-react/dist/esm/icons/user';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { useIsMobile } from '@/hooks/use-mobile';
import OptimizedYouTube from './OptimizedYouTube';

const testimonials = [
  {
    name: "José Augusto Felix",
    age: "61 anos",
    text: "Dentre as possibilidades que haviam no mercado, optei por fechar com a Libra, justamente pelo excelente atendimento e taxas competitivas. Recebi toda a assistência necessária e fiquei bastante satisfeito."
  },
  {
    name: "Alcidemir Francisco de Oliveira",
    age: "59 anos",
    text: "Conheci a Libra pelo Instagram e as conversas iniciais foram rápidas e eficientes. Aprecio muito a atenção aos detalhes e o processo transparente. Eu achei a experiência geral, positiva e útil para o meu objetivo, que era reduzir dívidas."
  },
  {
    name: "Emanuele Cristina Presenti",
    age: "27 anos",
    text: "Meu primeiro contato com a Libra foi pelo Google, pesquisei mais detalhes sobre a empresa e entrei em contato. A primeira comunicação foi ótima e os consultores também! Fiz cotação com outras empresas, mas o valor que a Libra liberou foi maior, e as condições de pagamento e taxa de juros também foram melhores."
  },
  {
    name: "Rodrigo da Silva Reis Frias",
    age: "44 anos",
    text: "Vivemos um momento bem difícil pós pandemia, somos do comércio. Nesse momento eu entrei no Google e digitei “empréstimo com garantia de imóvel para negativado” o primeiro link que apareceu foi a Libra. Depois do cadastro, em uns 10 minutos recebi uma ligação e já entrei em processo de avaliação. Foi tudo muito rápido. Para mim o atendimento foi perfeito, eu estava num momento difícil, eu e a minha esposa brincamos que foi coisa de Deus. "
  },
  {
    name: "Jorge Gaulke",
    age: "49 anos",
    text: "Busquei o crédito pensando na melhoria da minha empresa, para poder atender melhor nossa capacidade. E aí eu acabei descobrindo a Libra por pesquisas e após a simulação um representante entrou em contato comigo, após levantarmos todas as documentações, fui aprovado. A Libra foi a melhor empresa que encontrei em relação a atendimento e facilidade no contrato."
  },
  {
    name: "Valdirene Ruiz Garcia",
    age: "42 anos",
    text: "Procurando financiar meu projeto de cosméticos terapêuticos, sabia que o desafio maior seria o investimento inicial. Foi nessa busca que me deparei com a opção de crédito com garantia de imóvel e encontrei a Libra Crédito. O processo foi fácil e o atendimento foi ótimo, consegui o suporte financeiro necessário para dar o primeiro passo com o projeto."
  }
];

const TestimonialCard = memo(({ name, age, text, isMobile, isActive, currentIndex, totalTestimonials, onNavigate, index }: {
  name: string,
  age: string,
  text: string,
  isMobile: boolean,
  isActive: boolean,
  currentIndex: number,
  totalTestimonials: number,
  onNavigate: (index: number) => void,
  index: number
}) => {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ${isActive ? 'opacity-100 cursor-pointer' : 'opacity-0 pointer-events-none'}`}
      onClick={() => onNavigate(index)}
    >
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-100 h-full flex flex-col">
        <div className="flex items-start gap-3 mb-2">
          <div className="bg-gray-100 rounded-full p-2">
            <User className="w-4 h-4 text-libra-navy" />
          </div>
          <div>
            <h4 className="font-bold text-libra-navy">{name}</h4>
            <p className="text-sm text-gray-500">{age}</p>
          </div>
        </div>
        <div className="flex-grow flex items-center">
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 italic`}>{text}</p>
        </div>
        
        {/* Faixa separadora fixa acima das bolas */}
        <div className="border-t border-gray-100 pt-2 mt-4 mt-auto">
          <div className="flex justify-center gap-1">
            {Array.from({ length: totalTestimonials }).map((_, index) => (
              <button
                key={index}
                className={`rounded-full transition-all duration-300 hover:scale-150 ${
                  currentIndex === index ? 'bg-libra-navy' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                style={{
                  width: isMobile ? '6px' : '4px',
                  height: isMobile ? '6px' : '4px',
                  minWidth: isMobile ? '6px' : '4px',
                  minHeight: isMobile ? '6px' : '4px'
                }}
                onClick={() => onNavigate(index)}
                aria-label={`Ver depoimento ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

TestimonialCard.displayName = 'TestimonialCard';

const Testimonials: React.FC = () => {
  const isMobile = useIsMobile();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const touchStartX = React.useRef(0);
  const touchEndX = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const delta = touchEndX.current - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      } else {
        setCurrentTestimonial(
          (prev) => (prev - 1 + testimonials.length) % testimonials.length
        );
      }
    }
  };
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 1500000); // Troca a cada 15 segundos
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <section id="testimonials" className={`${isMobile ? 'py-4' : 'py-8 md:py-12'} bg-white scroll-mt-header`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-12">
          <div className="flex justify-center items-center gap-2 mb-2 md:mb-4">
            <MessageSquare className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7 md:w-8 md:h-8'} text-libra-blue`} />
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'} font-bold text-libra-navy`}>
              Depoimentos de Clientes
            </h2>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:items-stretch items-center max-w-6xl mx-auto">
          <div className="w-full max-w-xl mx-auto">
            <div className="aspect-video rounded-lg overflow-hidden shadow-xl bg-black">
              <OptimizedYouTube
                videoId="a4x-wOpVdfI"
                title="Depoimento Cliente - Libra Crédito"
                priority={false}
                className="w-full h-full"
                thumbnailSrc="/images/media/timelibra2.webp"
              />
            </div>
          </div>
          
          <div className="relative h-full overflow-visible">
            {!isMobile && (
              <button
                className="absolute -left-6 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-6 bg-white rounded-full shadow-md hover:bg-gray-50"

                onClick={() =>
                  setCurrentTestimonial(
                    (prev) => (prev - 1 + testimonials.length) % testimonials.length
                  )
                }
                aria-label="Ver depoimento anterior"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div
              className="relative h-[260px] lg:h-full"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {testimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={index}
                  name={testimonial.name}
                  age={testimonial.age}
                  text={testimonial.text}
                  isMobile={isMobile}
                  isActive={currentTestimonial === index}
                  currentIndex={currentTestimonial}
                  totalTestimonials={testimonials.length}
                  onNavigate={setCurrentTestimonial}
                  index={index}
                />
              ))}
            </div>
            {!isMobile && (
              <button
                className="absolute -right-6 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-6 bg-white rounded-full shadow-md hover:bg-gray-50"

                onClick={() =>
                  setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
                }
                aria-label="Ver próximo depoimento"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
