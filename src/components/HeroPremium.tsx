import HeroButton from '@/components/ui/HeroButton';
import Check from 'lucide-react/dist/esm/icons/check';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import LockKeyhole from 'lucide-react/dist/esm/icons/lock-keyhole';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { useNavigate } from 'react-router-dom';
import OptimizedYouTube from './OptimizedYouTube';
import scrollToTarget from '@/utils/scrollToTarget';

const HeroPremium: React.FC = () => {
  const navigate = useNavigate();

  const scrollToBenefits = () => {
    const card = document.getElementById('capital-giro-card');
    if (!card) return;

    const headerOffset = window.innerWidth < 768 ? 96 : 108;
    const trustbar = document.getElementById('trustbar');
    const trustbarHeight = trustbar?.getBoundingClientRect().height ?? 0;
    const centerOffset =
      (window.innerHeight - card.getBoundingClientRect().height) / 2;
    const additionalScroll =
      window.innerHeight * (window.innerWidth < 768 ? 0.22 : 0.18);
    const offset =
      -headerOffset - trustbarHeight - centerOffset + additionalScroll;

    scrollToTarget(card, offset);
  };

  return (
    <section
      className="premium-hero min-h-[50vh] md:min-h-[55vh] lg:min-h-[60vh] xl:min-h-[calc(100vh-280px)] relative flex flex-col justify-center overflow-hidden"
      aria-labelledby="hero-heading"
      role="banner"
    >
      <div className="premium-hero-grid" aria-hidden="true" />
      <div className="premium-hero-glow premium-hero-glow--one" aria-hidden="true" />
      <div className="premium-hero-glow premium-hero-glow--two" aria-hidden="true" />

      <div className="container mx-auto px-4 md:px-6 relative z-10 flex-grow flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-12 items-center py-7 md:py-10">
          <div className="text-[#003399] max-w-xl mx-auto space-y-4 text-center lg:text-left flex flex-col items-center lg:items-start">
            <div className="w-full">
              <div className="hero-eyebrow mx-auto lg:mx-0">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                Patrimônio que abre possibilidades
              </div>
              <h1
                id="hero-heading"
                className="text-2xl md:text-4xl lg:text-[2.7rem] font-extrabold mt-4 mb-4 leading-[1.12] tracking-[-0.035em]"
              >
                <span>Crédito com Garantia de Imóvel</span>
                <span className="block hero-gradient-text">
                  simples, inteligente e seguro.
                </span>
              </h1>
              <p className="text-sm md:text-base text-slate-700 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Transforme o valor do seu imóvel em crédito para realizar planos,
                organizar a vida financeira ou acelerar seu negócio.
              </p>

              <ul className="mt-5 space-y-4 text-sm md:text-base font-medium">
                <li className="flex flex-wrap justify-center lg:justify-start gap-2">
                  {['A partir de 1,19% a.m.', 'Até 180 meses', '100% online'].map((item) => (
                    <span className="hero-proof-chip" key={item}>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      {item}
                    </span>
                  ))}
                </li>
                <li className="list-none">
                  <div className="w-full max-w-md mx-auto lg:mx-0 pt-1">
                    <HeroButton
                      onClick={() => navigate('/simulacao')}
                      variant="primary"
                      className="hero-primary-cta"
                    >
                      Simular meu crédito
                    </HeroButton>
                  </div>
                </li>
                <li className="flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-600">
                  <LockKeyhole className="w-3.5 h-3.5 text-[#007a5e]" aria-hidden="true" />
                  Simulação gratuita, segura e sem compromisso
                </li>
              </ul>
            </div>
          </div>

          <div className="w-full max-w-md lg:w-full lg:max-w-xl mx-auto">
            <div className="hero-media-shell">
              <div className="hero-media-label">
                <span className="hero-live-dot" />
                Conheça a Libra em 1 minuto
              </div>
              <div className="hero-video aspect-video">
                <OptimizedYouTube
                  videoId="E9lwL6R2l1s"
                  title="Vídeo institucional Libra Crédito"
                  priority
                  className="w-full h-full"
                  thumbnailSrc="/images/media/video-cgi-libra.webp"
                />
              </div>
              <div className="flex items-center justify-center gap-2 pt-3 text-white text-xs md:text-sm">
                <Shield className="w-4 h-4 flex-shrink-0 text-emerald-300" aria-hidden="true" />
                <span>Atendimento humano com segurança e agilidade</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-1 md:mt-2">
          <button
            onClick={scrollToBenefits}
            className="text-[#003399] flex flex-col items-center opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Rolar para benefícios"
          >
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroPremium;
