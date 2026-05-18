import React, { useEffect } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { setMetaTag } from '@/utils/seoMeta';

const WHATSAPP_REDIRECT_DELAY_MS = 1000;
const WHATSAPP_PHONE_NUMBER = '5516997207767';
const WHATSAPP_MESSAGE = 'Olá Libra Crédito, quero iniciar meu atendimento!';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const WhatsAppRedirect = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Redirecionando para o WhatsApp | Libra Crédito';

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Você será redirecionado para iniciar seu atendimento no WhatsApp da Libra Crédito.'
      );
    }

    const cleanupRobots = setMetaTag('robots', 'noindex,follow');
    const timer = window.setTimeout(() => {
      window.location.replace(WHATSAPP_URL);
    }, WHATSAPP_REDIRECT_DELAY_MS);

    return () => {
      cleanupRobots();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <MobileLayout>
      <main className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-4 py-12 text-center">
        <div className="max-w-md space-y-5 rounded-3xl border border-green-100 bg-green-50/80 px-6 py-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-2xl text-white">
            💬
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-libra-navy">Estamos te levando ao WhatsApp</h1>
            <p className="text-base text-gray-700">
              Aguarde um instante. Você será redirecionado automaticamente para iniciar seu atendimento com a Libra Crédito.
            </p>
          </div>
          <a
            className="inline-flex items-center justify-center rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            href={WHATSAPP_URL}
            rel="noreferrer"
            target="_blank"
          >
            Abrir WhatsApp agora
          </a>
          <p className="text-xs text-gray-500">Redirecionamento automático em aproximadamente 1 segundo.</p>
        </div>
      </main>
    </MobileLayout>
  );
};

export default WhatsAppRedirect;
