import React, { useEffect } from 'react';
import MobileLayout from '@/components/MobileLayout';
import { setMetaTag } from '@/utils/seoMeta';
import AgentChat from '@/components/AgentChat';

const Atendimento = () => {
  useEffect(() => {
    document.title = 'Atendimento Automatizado | Libra Crédito';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Tire suas dúvidas sobre crédito com garantia de imóvel no atendimento automatizado da Libra Crédito.'
      );
    }

    return setMetaTag('robots', 'noindex,follow');
  }, []);

  return (
    <MobileLayout>
      <AgentChat />
    </MobileLayout>
  );
};

export default Atendimento;

