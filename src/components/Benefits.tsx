import React from 'react';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Building from 'lucide-react/dist/esm/icons/building';
import Home from 'lucide-react/dist/esm/icons/home';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import WaveSeparator from '@/components/ui/WaveSeparator';
import scrollToTarget from '@/utils/scrollToTarget';

const usageOptions = [
  {
    title: "Consolidação de Dívidas",
    icon: TrendingUp,
    description: "Quite suas dívidas com juros altos e tenha uma única parcela menor"
  },
  {
    title: "Capital de Giro",
    icon: Building,
    description: "Invista no seu negócio e faça ele crescer com capital de giro"
  },
  {
    title: "Investimentos/Reformas",
    icon: Home,
    description: "Reforme seu imóvel ou invista em novos projetos pessoais"
  }
];

const UsageCard: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  isMobile: boolean;
  onClick: () => void;
  id?: string;
}> = ({ title, description, icon: IconComponent, isMobile, onClick, id }) => {
  return (
    <div
      id={id}
      className={`premium-benefit-card group cursor-pointer ${isMobile ? 'p-4' : 'p-6'} ${id ? 'scroll-mt-header' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Simular ${title}`}
    >
      {isMobile ? (
        /* Layout horizontal para mobile - ícone e título lado a lado */
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="premium-icon-box">
              <IconComponent className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
        </div>
      ) : (
        /* Layout vertical centralizado para desktop */
        <div className="text-center">
          <div className="premium-icon-box w-fit mx-auto mb-4">
            <IconComponent className="w-6 h-6 text-emerald-700" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
};

const Benefits: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate('/simulacao');
  };
  
  return (
    <>
      {/* Ondas orientadas para cima antes da seção - apenas mobile */}
      {isMobile && <WaveSeparator variant="hero" height="md" inverted />}
      
      <section id="benefits" className={`${isMobile ? 'pt-6 pb-8' : 'pt-10 md:pt-14 pb-10 md:pb-14'} premium-benefits scroll-mt-header`}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-8 lg:mb-8 xl:mb-10">
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-700 font-bold uppercase tracking-[0.18em] mb-3`}>
              Crédito sob medida
            </p>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl md:text-4xl'} font-bold text-slate-900 tracking-[-0.03em] mb-3`}>
              Seu patrimônio pode <span className="text-emerald-700">impulsionar seus planos</span>
            </h2>
            <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
              Mais liberdade para escolher como usar seu crédito, com condições que fazem sentido.
            </p>
          </div>
          
          <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'md:grid-cols-3 gap-5'} animate-slide-up max-w-6xl mx-auto mb-6`}>
            {usageOptions.map((option, index) => (
              <UsageCard
                key={index}
                id={index === 1 ? 'capital-giro-card' : undefined}
                title={option.title}
                description={option.description}
                icon={option.icon}
                isMobile={isMobile}
                onClick={handleCardClick}
              />
            ))}
          </div>
          
          {/* CTA Desktop */}
          {!isMobile && (
            <div
              id="benefits-cta"
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center"
            >
              <Link to="/vantagens">
                <Button
                  size="lg"
                  className="bg-green-700 hover:bg-green-800 text-white px-8 py-3"
                >
                  Conheça Mais Vantagens
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-green-700 text-green-700 hover:bg-green-700 hover:text-white px-8 py-3"
                onClick={() => {
                  const testimonialsSection = document.getElementById('testimonials');
                  if (testimonialsSection) {
                    const videoContainer = testimonialsSection.querySelector('.aspect-video') as HTMLElement | null;
                    const extraOffset = window.innerHeight * 0.15; // Deslocamento adicional de 15%

                    if (videoContainer) {
                      const windowHeight = window.innerHeight;
                      const headerOffset = 120;
                      const centerOffset =
                        (windowHeight - videoContainer.getBoundingClientRect().height) / 2;
                      const offset = -centerOffset - headerOffset + extraOffset;
                      scrollToTarget(videoContainer, offset);
                    } else {
                      const headerOffset = 120;
                      scrollToTarget(testimonialsSection as HTMLElement, -headerOffset + extraOffset);
                    }
                  }

                }}
              >
                O que Falam da Libra
              </Button>
            </div>
          )}
        </div>
      </section>
      
      {/* Seção CTA Mobile com ondas e background azul */}
      {isMobile && (
        <>
          <WaveSeparator variant="hero" height="md" />
          <section 
            className="py-8"
            style={{ backgroundColor: '#003399' }}
            aria-label="Conheça mais vantagens do crédito"
          >
            <div className="container mx-auto px-4">
              <div className="flex justify-center items-center">
                <Link to="/vantagens">
                  <Button 
                    className="min-h-[48px] min-w-[200px] bg-white text-[#003399] hover:bg-gray-50 border-0"
                    size="default"
                    aria-label="Clique para conhecer mais vantagens do crédito"
                  >
                    Conheça Mais Vantagens
                  </Button>
                </Link>
              </div>
            </div>
          </section>
          <WaveSeparator variant="hero" height="md" inverted />
        </>
      )}
    </>
  );
};

export default Benefits;
