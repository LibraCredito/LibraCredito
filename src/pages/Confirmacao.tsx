import React, { useEffect, useLayoutEffect, useRef } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import WaveSeparator from '@/components/ui/WaveSeparator';

const Confirmacao = () => {
  const topAnchorRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Runs once on mount to update page metadata
    document.title = 'Simulação Enviada | Libra Crédito';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Confirmação de envio da simulação. Em breve nossa equipe entrará em contato.'
      );
    }

    const timer = window.setTimeout(() => {
      navigate('/quem-somos');
    }, 30000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [navigate]);

  useLayoutEffect(() => {
    const scrollingElement = document.scrollingElement || document.documentElement;
    scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      // Garante que o usuário comece no topo da página de confirmação
      mainContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      mainContent.parentElement?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    if (!topAnchorRef.current) {
      return;
    }

    const scrollToTop = () => {
      const anchor = topAnchorRef.current;
      if (anchor && typeof anchor.scrollIntoView === 'function') {
        anchor.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    };

    // Reforça o reset de scroll em diferentes ciclos de renderização
    scrollToTop();

    const rafId = window.requestAnimationFrame(scrollToTop);
    const timeoutId = window.setTimeout(scrollToTop, 150);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <MobileLayout>
      <div ref={topAnchorRef} aria-hidden="true" />
      <WaveSeparator variant="hero" height="md" inverted />
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6 bg-white">

        <h1 className="text-2xl font-bold text-libra-navy">✅ Simulação enviada com sucesso</h1>
        <p className="text-base text-gray-700">
          Recebemos seus dados e em breve, um dos nossos analistas entrará em contato com você.
        </p>
        <p className="text-base text-gray-700">
          Fique atento ao telefone (16) 36007956 para nosso contato.
        </p>
        <p className="text-base text-gray-700">
          Enquanto isso, aproveite para conhecer mais sobre a Libra e nossas soluções clicando
          no botão abaixo.
        </p>
        <p className="text-sm text-gray-600">Você será redirecionado automaticamente em até 30 segundos.</p>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button asChild variant="default" className="px-6">
            <Link to="/quem-somos">Conheça a Libra</Link>
          </Button>
          <Button
            asChild
            className="px-6 bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600"
          >
            <a
              href="https://wa.me/5516997879837?text=Ol%C3%A1%20Libra%20Cr%C3%A9dito%2C%20quero%20iniciar%20meu%20atendimento!"
              rel="noreferrer"
              target="_blank"
            >
              Iniciar atendimento no WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Confirmacao;
