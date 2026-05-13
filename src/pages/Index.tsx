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
}

const scheduleIdleLoad = (callback: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 3000 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timerId = window.setTimeout(callback, 1800);
  return () => window.clearTimeout(timerId);
};

const LazySection: React.FC<LazySectionProps> = ({ load }) => {
  const [Component, setComponent] = useState<React.ComponentType<unknown> | null>(
    null,
  );
  const ref = useRef<HTMLDivElement | null>(null);
  const loadRef = useRef(load);
  const loadedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    const loadComponent = () => {
      if (loadedRef.current) return;
      loadedRef.current = true;
      loadRef.current().then(({ default: Loaded }) => {
        if (mountedRef.current) {
          setComponent(() => Loaded);
        }
      });
    };

    const cancelIdleLoad = scheduleIdleLoad(loadComponent);
    const element = ref.current;

    if (!element) {
      return () => {
        mountedRef.current = false;
        cancelIdleLoad();
      };
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          loadComponent();
          obs.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );

    observer.observe(element);
    return () => {
      mountedRef.current = false;
      cancelIdleLoad();
      observer.disconnect();
    };
  }, []);

  return <div ref={ref}>{Component ? <Component /> : null}</div>;
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
      
      <LazySection load={() => import('@/components/TrustBarMinimal')} />

      <LazySection load={() => import('@/components/Benefits')} />

      {/* Faixa azul com logo - apenas para desktop */}
      {!isMobile && (
        <LazySection load={() => import('@/components/LogoBand')} />
      )}

      <LazySection load={() => import('@/components/Testimonials')} />

      <WaveSeparator variant="hero" height="md" />

      <LazySection load={() => import('@/components/MediaSection')} />
      
      <WaveSeparator variant="hero" height="md" inverted />
      
      <LazySection load={() => import('@/components/FAQ')} />
      
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
        <section 
          className="w-full bg-[#003399] flex justify-center py-8 cursor-pointer hover:bg-[#002277] transition-colors"
          onClick={goToQuemSomos}
          aria-label="Clique para conhecer mais sobre a Libra Crédito"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              goToQuemSomos();
            }
          }}
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
        </section>

      )}
      
      <WaveSeparator variant="hero" height="md" inverted />
      
      <LazySection load={() => import('@/components/BlogSection')} />
      </main>

      <LazySection load={() => import('@/components/Footer')} />
    </div>
  );
};

export default Index;
