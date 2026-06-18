import React from 'react';
import { createRoot } from 'react-dom/client';
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

const scheduleNonCriticalWork = (callback: () => void) => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  let completed = false;
  const events = ['pointerdown', 'touchstart', 'keydown'] as const;
  const runOnce = () => {
    if (completed) return;
    completed = true;
    events.forEach((eventName) => {
      window.removeEventListener(eventName, runOnce);
    });
    callback();
  };

  events.forEach((eventName) => {
    window.addEventListener(eventName, runOnce, { once: true, passive: true });
  });
  const fallbackId = window.setTimeout(runOnce, 60000);

  return () => {
    window.clearTimeout(fallbackId);
    events.forEach((eventName) => {
      window.removeEventListener(eventName, runOnce);
    });
  };
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

// The build injects a lightweight first-fold shell. Replace it with the
// interactive application once JavaScript is ready, without hydration
// mismatches caused by viewport-specific header markup.
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
    createRoot(root).render(<App />);
  }
};

renderApp();

scheduleNonCriticalWork(() => {
  void disableLegacyServiceWorkers();
});

scheduleNonCriticalWork(() => {
  void import('@/services/localSimulationService')
    .then(({ LocalSimulationService }) => {
      void LocalSimulationService.resendPendingContacts();
    })
    .catch((error) => {
      console.warn('Falha ao reenviar contatos pendentes:', error);
    });
});
