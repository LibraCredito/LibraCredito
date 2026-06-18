/**
 * Componente de cabeçalho para desktop
 * 
 * @component DesktopHeader
 * @description Implementa a versão desktop do cabeçalho com navegação horizontal e botões de ação
 * 
 * @features
 * - Navegação horizontal com indicador de página atual
 * - Botões de ação com hover effects
 * - Logo e slogan da Libra Crédito
 * - Aviso informativo integrado
 * 
 * @param {DesktopHeaderProps} props
 * @param {() => void} props.onPortalClientes - Callback para acesso ao portal de clientes
 * @param {() => void} props.onSimulateNow - Callback para iniciar simulação
 * 
 * @example
 * ```tsx
 * <DesktopHeader 
 *   onPortalClientes={() => window.open('https://portal.com')}
 *   onSimulateNow={() => navigate('/simulacao')}
 * />
 * ```
 */

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Info from 'lucide-react/dist/esm/icons/info';
import X from 'lucide-react/dist/esm/icons/x';
// import ImageOptimizer from '@/components/ImageOptimizer';

interface DesktopHeaderProps {
  onPortalClientes: () => void;
  onSimulateNow: () => void;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({ onPortalClientes, onSimulateNow }) => {
  const location = useLocation();
  const _navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const [bannerHeight, setBannerHeight] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const headerHeightRef = useRef(0);

  // Atualiza o offset do header reagindo a mudanças de tamanho
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateOffset = () => {
      headerHeightRef.current = header.offsetHeight;
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty(
          '--header-offset-desktop',
          `${headerHeightRef.current}px`
        );
      });
    };

    updateOffset();

    const resizeObs = new ResizeObserver(updateOffset);
    resizeObs.observe(header);

    return () => resizeObs.disconnect();
  }, []);

  const navigationItems = [
    { name: 'Home', path: '/' },
    { name: 'Vantagens', path: '/vantagens' },
    { name: 'Quem Somos', path: '/quem-somos' },
    { name: 'Blog', path: '/blog' },
    { name: 'Parceiros', path: '/parceiros' },
  ];


  return (
      <header
        data-desktop="true"
        className="premium-header fixed top-0 left-0 right-0 z-40 bg-white/95 shadow-sm"
        role="banner"
        ref={headerRef}
      >
      {/* Faixa superior informativa */}
      {showBanner ? (
        <div ref={bannerRef} className="w-full bg-libra-navy overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="relative flex items-center justify-center py-2">
              <div className="flex items-center text-white text-sm font-semibold">
                <Info className="w-4 h-4 mr-2 text-white" />
                A Libra não realiza nenhum tipo de cobrança até a liberação do crédito.
              </div>
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 text-white hover:text-gray-200"
                onClick={() => {
                  if (bannerRef.current) {
                    setBannerHeight(bannerRef.current.offsetHeight);
                  }
                  setShowBanner(false);
                }}
                aria-label="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          aria-hidden="true"
          style={{ height: bannerHeight }}
          className="w-full overflow-hidden"
        />
      )}

        {/* Faixa principal */}
        <div className="border-b border-gray-100">
        <div className="container mx-auto px-4">
          {/* Height increased 20% for desktop */}
          <div className="flex items-center justify-between h-[50px] lg:h-[66px]">
            {/* Logo e slogan */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center tap-transparent">
                <div className="h-[50px] lg:h-[66px] overflow-hidden flex items-center">
                  <img
                    src="/images/logos/logo-header.webp"
                    alt="Libra Crédito - Home Equity com garantia de imóvel"
                    className="header-logo"
                    width="120"
                    height="120"
                  />
                </div>
              </Link>
            </div>

            {/* Navegação */}
            <nav className="flex-1 flex items-center justify-center space-x-4 md:space-x-6 xl:space-x-10 h-full">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center h-full text-[0.95rem] md:text-[1.0125rem] lg:text-[1.1406rem] xl:text-[1.2656rem] font-medium transition-all duration-200 hover:text-libra-blue ${
                    location.pathname === item.path
                      ? 'text-libra-blue after:absolute after:bottom-[-10px] after:left-0 after:w-full after:h-0.5 after:bg-libra-blue'
                      : 'text-libra-navy hover:text-libra-blue'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Botões à direita */}
            <div className="flex items-center gap-3 lg:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onPortalClientes}
                aria-label="Acessar Portal de Clientes"
                className="bg-transparent text-libra-navy border-2 border-libra-navy hover:bg-libra-navy hover:text-white transition-colors text-sm lg:text-base"
              >
                Portal de Clientes
              </Button>
              
              <Button
                onClick={onSimulateNow}
                size="sm"
                aria-label="Simular crédito agora"
                className="premium-header-cta px-4 lg:px-6 font-bold text-white transition-all duration-200 hover:-translate-y-0.5 text-sm lg:text-base"
              >
                Simule Agora
              </Button>
            </div>
          </div>
        </div>
      </div>
      </header>
  );
};

export default DesktopHeader;
