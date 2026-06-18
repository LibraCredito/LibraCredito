import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useMobileContext';

// Critical components - NOT lazy loaded for LCP
import HeroPremium from '@/components/HeroPremium';
import WaveSeparator from '@/components/ui/WaveSeparator';
import Header from '@/components/Header';
import ImageOptimizer from '@/components/ImageOptimizer';

interface LazySectionProps {
  load: () => Promise<{ default: React.ComponentType<unknown> }>;
  reservedClassName: string;
}

const LazySection: React.FC<LazySectionProps> = ({ load, reservedClassName }) => {
  const [Component, setComponent] = useState<React.ComponentType<unknown> | null>(
    null,
  );
  const ref = useRef<HTMLDivElement | null>(null);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          loadRef.current().then(({ default: Loaded }) => {
            setComponent(() => Loaded);
          });
          obs.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={reservedClassName}>
      {Component ? <Component /> : null}
    </div>
  );
};


const Index: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Meta Title otimizado - 58 caracteres
    document.title = "Home Equity Libra Crédito | Garantia Imóvel 1,19% a.m";
    
    // Meta Description otimizada - 155 caracteres
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Crédito com garantia de imóvel (Home Equity) da Libra: taxa mínima 1,19% a.m., até 180 meses. Simule grátis e libere até 50% do valor do imóvel.');
    }
  }, []);

  const goToQuemSomos = () => {
    navigate('/quem-somos');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main
        id="main-content"
        data-has-header="true"
        className="flex-grow pt-header"
      >
        {/* Faixa Separadora Superior Invertida - Ondas para baixo */}
        <WaveSeparator variant="hero" height="md" inverted />
        
        <HeroPremium />
      
      {/* Faixa Separadora com Ondas - Apenas adicionada, sem alterar o resto */}
      <WaveSeparator variant="hero" height="md" />
      
      <LazySection
        load={() => import('@/components/TrustBarMinimal')}
        reservedClassName="min-h-[112px] md:min-h-[104px]"
      />

      <LazySection
        load={() => import('@/components/Benefits')}
        reservedClassName="min-h-[850px] lg:min-h-[520px]"
      />

      {/* Faixa azul com logo - apenas para desktop */}
      {!isMobile && (
        <LazySection
          load={() => import('@/components/LogoBand')}
          reservedClassName="min-h-[112px]"
        />
      )}

      <LazySection
        load={() => import('@/components/Testimonials')}
        reservedClassName="min-h-[620px] lg:min-h-[470px]"
      />

      <WaveSeparator variant="hero" height="md" />

      <LazySection
        load={() => import('@/components/MediaSection')}
        reservedClassName="min-h-[500px] md:min-h-[390px]"
      />
      
      <WaveSeparator variant="hero" height="md" inverted />
      
      <LazySection
        load={() => import('@/components/FAQ')}
        reservedClassName="min-h-[520px] md:min-h-[700px]"
      />
      
      {/* Wave separator acima do botão Conheça a Libra */}
      <WaveSeparator variant="hero" height="md" />
      
      {/* Botão Conheça a Libra - Desktop / Faixa azul clicável - Mobile */}
      {!isMobile ? (
        <section
          className="py-8"
          style={{ backgroundColor: '#003399' }}
          aria-label="Conheça mais sobre a Libra Crédito"
        >
          <div className="container mx-auto px-4">
            <div className="flex justify-center items-center">
              <Button
                onClick={goToQuemSomos}
                className="min-h-[48px] min-w-[200px] bg-white text-[#003399] hover:bg-gray-50 border-0"
                size="xl"
                aria-label="Clique para conhecer mais sobre a Libra Crédito"
              >
                Conheça a Libra
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="w-full bg-[#003399] flex justify-center py-8 cursor-pointer hover:bg-[#002277] transition-colors"
          onClick={goToQuemSomos}
          aria-label="Clique para conhecer mais sobre a Libra Crédito"
        >
          <div className="flex items-center px-4 max-w-full">
            <ImageOptimizer
              src="/images/logos/logo-branco.svg"
              alt="Libra Crédito"
              width={64}
              height={64}
              aspectRatio={1}
              className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0"
              imgClassName="w-full h-full"
              objectFit="contain"
              widths={[64, 128]}
              sizes="64px"
            />
            <span className="ml-3 sm:ml-4 text-white text-sm sm:text-base font-semibold leading-tight text-center flex-1 min-w-0">
              Crédito justo, equilibrado e consciente!
            </span>
          </div>
        </button>

      )}
      
      <WaveSeparator variant="hero" height="md" inverted />
      
      <LazySection
        load={() => import('@/components/BlogSection')}
        reservedClassName="min-h-[1320px] md:min-h-[760px]"
      />
      </main>

      <LazySection
        load={() => import('@/components/Footer')}
        reservedClassName="min-h-[500px] md:min-h-[460px]"
      />
    </div>
  );
};

export default Index;
