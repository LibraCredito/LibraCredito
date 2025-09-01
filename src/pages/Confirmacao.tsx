import React, { useEffect, useLayoutEffect } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import WaveSeparator from '@/components/ui/WaveSeparator';

const Confirmacao = () => {
  const location = useLocation();
  const { summary, whatsappLink: stateWhatsappLink } =
    (location.state as { summary?: unknown; whatsappLink?: string }) || {};
  void summary;
  const whatsappLink = stateWhatsappLink || 'https://wa.me/5516997338791';
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
  }, []);

  useLayoutEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      // Garante que o usuário comece no topo da página de confirmação
      mainContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <MobileLayout>
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
          Quer acelerar seu processo? Fale com nossa Atendente Virtual
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button asChild variant="whatsapp">
            <Link to={whatsappLink} target="_blank" rel="noopener noreferrer">
              Falar com a Atendente
            </Link>
          </Button>
          <Button asChild variant="default" className="px-6">
            <Link to="/quem-somos">Conheça a Libra</Link>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Confirmacao;
