import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface MobileLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  showHeader = true,
  showFooter = true
}) => {
  useViewportHeight();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const mainContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const rootElement = document.scrollingElement || document.documentElement || document.body;

    const scrollTargets: HTMLElement[] = [
      scrollContainerRef.current ?? undefined,
      mainContentRef.current ?? undefined,
      mainContentRef.current?.parentElement instanceof HTMLElement
        ? mainContentRef.current.parentElement
        : undefined,
      rootElement instanceof HTMLElement ? rootElement : undefined
    ]
      .filter((element): element is HTMLElement => Boolean(element))
      .reduce<HTMLElement[]>((accumulator, element) => {
        if (!accumulator.includes(element)) {
          accumulator.push(element);
        }
        return accumulator;
      }, []);

    const resetScrollPositions = () => {
      scrollTargets.forEach((element) => {
        if (typeof element.scrollTo === 'function') {
          element.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        } else {
          element.scrollTop = 0;
          element.scrollLeft = 0;
        }
      });

      if (typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    };

    resetScrollPositions();

    const rafId = window.requestAnimationFrame(resetScrollPositions);
    const timeoutId = window.setTimeout(resetScrollPositions, 200);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname, location.search, location.hash, location.key]);

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(var(--vh) * 100)' }}>
      {/* Skip Navigation Links for Accessibility */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          className="absolute top-4 left-4 z-50 bg-libra-blue text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-libra-gold"
          tabIndex={1}
        >
          Pular para o conteúdo principal
        </a>
      </div>

      {/* Header - Simplificado em mobile */}
      {showHeader && <Header />}

      <div ref={scrollContainerRef} className="flex flex-col flex-1 overflow-y-auto">
        {/* Main Content */}
        <main
          ref={mainContentRef}
          id="main-content"
          data-has-header={showHeader ? 'true' : 'false'}
          className={`flex-1 overflow-y-auto ${showHeader ? 'pt-header' : ''}`}
          role="main"
          aria-label="Conteúdo principal"
        >
          {children}
        </main>

        {/* Footer - Sempre mostrar quando solicitado */}
        {showFooter && <Footer />}
      </div>
    </div>
  );
};

export default MobileLayout;
