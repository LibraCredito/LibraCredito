import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App.tsx'
import './index.css';
import './styles/overflow-fix.css';


const requestIdleCb = (callback: IdleRequestCallback) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback);
  }

  return window.setTimeout(() => {
    const start = Date.now();
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1);
};

const disableLegacyServiceWorkers = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn('Falha ao desregistrar service workers antigos:', error);
    }
  }

  if ('caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      const libraCaches = cacheKeys.filter((key) => key.includes('libra'));
      await Promise.all(libraCaches.map((key) => caches.delete(key)));
    } catch (error) {
      console.warn('Falha ao limpar caches antigos da Libra:', error);
    }
  }
};

// Hidratação do HTML pré-renderizado para LCP otimizado
const renderApp = () => {
  // Definir idioma da página
  document.documentElement.lang = 'pt-BR';
  
  // Skip Link para acessibilidade - lazy load
  requestIdleCb(() => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-libra-navy focus:rounded';
    skipLink.textContent = 'Pular para o conteúdo principal';
    document.body.insertBefore(skipLink, document.body.firstChild);
  });
  
  const root = document.getElementById('root');
  if (root) {
    if (root.hasChildNodes()) {
      hydrateRoot(root, <App />);
    } else {
      createRoot(root).render(<App />);
    }
  }
};

disableLegacyServiceWorkers().finally(renderApp);

requestIdleCb(() => {
  void import('@/services/localSimulationService')
    .then(({ LocalSimulationService }) => {
      void LocalSimulationService.resendPendingContacts();
    })
    .catch((error) => {
      console.warn('Falha ao reenviar contatos pendentes:', error);
    });
});
