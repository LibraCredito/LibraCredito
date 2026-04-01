import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/MobileLayout';
import WaveSeparator from '@/components/ui/WaveSeparator';

const WHATSAPP_LINK =
  'https://wa.me/5516997207767?text=Ol%C3%A1%20Libra%20Cr%C3%A9dito%2C%20quero%20iniciar%20meu%20atendimento!';

const Confirmacao = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Simulação Enviada | Libra Crédito';

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Confirmação de envio da simulação. Em breve nossa equipe entrará em contato.'
      );
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const timer = window.setTimeout(() => {
      navigate('/quem-somos');
    }, 30000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <MobileLayout>
      <WaveSeparator variant="hero" height="md" inverted />
      <main className="min-h-[60vh] bg-white px-4 py-12">
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-green-200 bg-green-50 p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-libra-navy">✅ Simulação enviada com sucesso</h1>
          <p className="mt-4 text-base text-gray-700">
            Recebemos seus dados e nossa equipe entrará em contato em breve.
          </p>
          <p className="mt-2 text-base text-gray-700">
            Fique atento: você pode receber nossa ligação pelo número (16) 3600-7956.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <a
              href={WHATSAPP_LINK}
              rel="noreferrer"
              target="_blank"
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              Iniciar atendimento no WhatsApp
            </a>
          </div>

          <p className="mt-5 text-sm text-gray-600">
            Você será redirecionado automaticamente em até 30 segundos.
          </p>
        </section>
      </main>
    </MobileLayout>
  );
};

export default Confirmacao;
