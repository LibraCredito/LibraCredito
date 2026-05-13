/**
 * Context otimizado para detecção mobile
 * 
 * Este contexto substitui o useIsMobile para evitar múltiplas instâncias
 * de media query listeners e reduzir re-renders desnecessários
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const MOBILE_BREAKPOINT = 1024;

interface MobileContextType {
  isMobile: boolean;
  isLoading: boolean;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

const getInitialIsMobile = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
};

interface MobileProviderProps {
  children: ReactNode;
}

export const MobileProvider: React.FC<MobileProviderProps> = ({ children }) => {
  // Use the real client viewport on first render to avoid desktop-to-mobile layout shifts.
  const [isMobile, setIsMobile] = useState(getInitialIsMobile);

  useEffect(() => {
    // Verificar se estamos no browser
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Keep the value synchronized after mount without forcing a second layout pass.
    setIsMobile(mql.matches);
    
    // Adicionar listener
    mql.addEventListener('change', onChange);
    
    // Cleanup
    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, []);

  const value: MobileContextType = {
    isMobile,
    isLoading: false
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobileOptimized = (): MobileContextType => {
  const context = useContext(MobileContext);
  
  if (context === undefined) {
    // Ao invés de lançar erro, retorna valores padrão
    console.warn('useMobileOptimized used outside MobileProvider, using defaults');
    return {
      isMobile: false,
      isLoading: false
    };
  }
  
  return context;
};

// Hook de compatibilidade para migração gradual
export const useIsMobile = (): boolean => {
  const { isMobile } = useMobileOptimized();
  return isMobile;
};
