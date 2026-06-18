import HeroButton from '@/components/ui/HeroButton';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Shield from 'lucide-react/dist/esm/icons/shield';
import { useNavigate } from 'react-router-dom';
import OptimizedYouTube from './OptimizedYouTube';
import scrollToTarget from '@/utils/scrollToTarget';

const HeroPremium: React.FC = () => {
  const navigate = useNavigate();

  const scrollToSimulator = () => {
    navigate('/simulacao');
  };

  const scrollToBenefits = () => {
    const card = document.getElementById('capital-giro-card');
    if (card) {
      const headerOffset = window.innerWidth < 768 ? 96 : 108;
      const trustbarRect = trustbar?.getBoundingClientRect();
      const trustbarHeight = trustbarRect ? trustbarRect.height : 0;
      const centerOffset =
        (window.innerHeight - card.getBoundingClientRect().height) / 2;
      const isMobileView = window.innerWidth < 768;
      const additionalScroll = window.innerHeight * (isMobileView ? 0.22 : 0.18);
      const offset = -headerOffset - trustbarHeight - centerOffset + additionalScroll;

      scrollToTarget(card as HTMLElement, offset);

    }
  };

  return (
    <section
      className="min-h-[50vh] md:min-h-[55vh] lg:min-h-[60vh] xl:min-h-[calc(100vh-280px)] pb-0 bg-white relative flex flex-col justify-center"
      aria-labelledby="hero-heading"
      role="banner"
    >
      <div className="container mx-auto px-4 md:px-6 relative z-10 flex-grow flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 items-center">
          {/* Lado Esquerdo */}
          <div className="text-[#003399] max-w-lg mx-auto space-y-4 md:space-y-5 text-center flex flex-col items-center">
            <div>
              <h1
                id="hero-heading"
                className="text-xl md:text-3xl lg:text-4xl font-extrabold mb-4 leading-tight"
              >
                <span>Crédito com Garantia de Imóvel</span>
                <span className="block text-green-700">
                  é mais simples na Libra!
                </span>
              </h1>
              <ul className="mt-2 space-y-2 md:space-y-3 text-sm md:text-base lg:text-lg text-[#003399] font-medium">
                <li className="mt-2 lg:mt-4 text-xs md:text-sm lg:text-lg">
                  Taxas a partir de{' '}
                  <span className="font-bold text-green-700">1,19% a.m.</span> •
                  Até 180 meses • 100% online
                </li>
                <li className="list-none">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-sm mx-auto pt-2 sm:pt-3">
                    <HeroButton
                      onClick={scrollToSimulator}
                      variant="primary"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Simular Agora
                    </HeroButton>
                  </div>
                </li>
                <li className="text-lg md:text-xl lg:text-2xl">
                  Crédito inteligente para quem construiu patrimônio!
                </li>
              </ul>
            </div>
          </div>

          {/* Vídeo reduzido para exibir as ondas seguintes na dobra inicial */}
          <div className="w-full max-w-md lg:w-[85%] lg:max-w-lg mx-auto">
            <div className="hero-video aspect-video" style={{ aspectRatio: '16 / 9' }}>
              <OptimizedYouTube
                videoId="E9lwL6R2l1s"
                title="Vídeo institucional Libra Crédito"
                priority
                className="w-full h-full"
                thumbnailSrc="/images/media/video-cgi-libra.webp"
              />
            </div>
            {/* Texto abaixo do vídeo em telas mobile */}
            <div className="flex lg:hidden items-center justify-center gap-2 bg-green-50 rounded-md py-1 px-2 mt-2">
              <Shield className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-[#003399]" aria-hidden="true" />
              <span className="text-center text-[#003399]">

                Atendimento Premium, Segurança e Velocidade!
              </span>
            </div>
            <div className="hidden lg:flex items-center justify-center gap-2 bg-green-50 rounded-md py-1 px-2 mt-2">
              <Shield className="w-4 h-4 flex-shrink-0 text-[#003399]" aria-hidden="true" />
              <span className="text-center text-[#003399]">
                Atendimento Premium, Segurança e Velocidade!
              </span>
            </div>
          </div>
        </div>

        {/* Botão de rolagem para a seção de benefícios */}
        <div className="flex justify-center mt-2 md:mt-3">
          <button
            onClick={scrollToBenefits}
            className="text-[#003399] flex flex-col items-center opacity-90 hover:opacity-100 transition-opacity"
            aria-label="Rolar para benefícios"
          >
            <ChevronDown className="w-5 h-5 md:w-5 md:h-5 lg:w-4 lg:h-4 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroPremium;
