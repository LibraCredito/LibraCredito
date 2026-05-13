import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/MobileLayout';
import { setMetaTag } from '@/utils/seoMeta';

const Sucesso = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Solicitação Recebida | Libra Crédito';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Agradecemos a sua simulação. Em breve nossa equipe entrará em contato.'
      );
    }

    const cleanupRobots = setMetaTag('robots', 'noindex,follow');

    const timer = setTimeout(() => {
      navigate('/quem-somos');
    }, 30000);

    return () => {
      cleanupRobots();
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <MobileLayout>
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6 bg-white">
        <h1 className="text-2xl font-bold text-libra-navy">🎉 Muito obrigado!</h1>
        <p className="text-base text-gray-700">Recebemos sua solicitação e nossos consultores entrarão em contato em breve.</p>
        <p className="text-base text-gray-700">Fique atento aos telefones (16) 3600-7956 ou (16) 99636-0424.</p>
        <a
          className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          href="https://wa.me/5516997207767?text=Ol%C3%A1%20Libra%20Cr%C3%A9dito%2C%20quero%20iniciar%20meu%20atendimento!"
          rel="noreferrer"
          target="_blank"
        >
          Iniciar atendimento no WhatsApp
        </a>
        <p className="text-sm text-gray-600 mt-4">Você será redirecionado automaticamente em até 30 segundos...</p>
      </div>
    </MobileLayout>
  );
};

export default Sucesso;
