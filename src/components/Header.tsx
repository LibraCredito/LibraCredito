/**
 * Componente de cabeçalho principal da aplicação Libra Crédito
 * 
 * @component Header
 * @description Implementa um cabeçalho responsivo que se adapta entre versões mobile e desktop.
 * Inclui funcionalidades de navegação, acesso ao portal de clientes e popup informativo.
 * 
 * @features
 * - Responsividade automática via useIsMobile hook
 * - Popup informativo com persistência via localStorage
 * - Integração com React Router para navegação
 * - Portal de clientes em nova aba
 * 
 * @example
 * ```tsx
 * <Header />
 * ```
 * 
 * @memoperformance
 * Componente memorizado via React.memo para evitar re-renders desnecessários
 */

import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDevice } from '@/hooks/useDevice';
import DesktopHeader from './DesktopHeader';
import SimpleMobileHeader from './SimpleMobileHeader';

// Lazy load dialog components para LCP
const Dialog = lazy(() => import('@/components/ui/dialog').then(m => ({ default: m.Dialog })));
const DialogContent = lazy(() => import('@/components/ui/dialog').then(m => ({ default: m.DialogContent })));
const DialogHeader = lazy(() => import('@/components/ui/dialog').then(m => ({ default: m.DialogHeader })));
const DialogTitle = lazy(() => import('@/components/ui/dialog').then(m => ({ default: m.DialogTitle })));
const DialogClose = lazy(() => import('@/components/ui/dialog').then(m => ({ default: m.DialogClose })));
const Button = lazy(() => import('@/components/ui/button').then(m => ({ default: m.Button })));
const Info = lazy(() => import('lucide-react/dist/esm/icons/info').then(m => ({ default: m.default })));

const Header: React.FC = () => {
  const [isInfoPopupOpen, setIsInfoPopupOpen] = useState(false);
  const [shouldShowDialog, setShouldShowDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useDevice();

  // Carrega o popup assim que o componente é montado
  useEffect(() => {
    const currentPath = location.pathname;
    const allowedPaths = ['/', '/simulacao'];

    if (allowedPaths.includes(currentPath)) {
      const storageKey = `popup_seen_${currentPath.replace('/', 'home')}`;
      const hasSeenPopup = localStorage.getItem(storageKey);

      if (!hasSeenPopup) {
        setShouldShowDialog(true);
        setIsInfoPopupOpen(true);
      }
    }
  }, [location.pathname]);

  const handleClosePopup = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const currentPath = location.pathname;
    const storageKey = `popup_seen_${currentPath.replace('/', 'home')}`;
    localStorage.setItem(storageKey, 'true');
    setIsInfoPopupOpen(false);
  };

  const handleSimulateNow = () => {
    navigate('/simulacao');
  };

  const handlePortalClientes = () => {
    window.open('http://clientes.libracredito.com.br/', '_blank');
  };

  return (
    <>
      {isMobile ? (
        <SimpleMobileHeader onPortalClientes={handlePortalClientes} />
      ) : (
        <DesktopHeader 
          onPortalClientes={handlePortalClientes}
          onSimulateNow={handleSimulateNow}
        />
      )}

      {/* Popup informativo lazy loaded - apenas após LCP */}
      {shouldShowDialog && (
        <Suspense fallback={null}>
          <Dialog
            open={isInfoPopupOpen}
            onOpenChange={setIsInfoPopupOpen}
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center text-libra-navy text-base">
                  <Info className="w-5 h-5 mr-2 text-libra-blue" aria-hidden="true" />
                  Informação Importante
                </DialogTitle>
              </DialogHeader>
                <p className="text-sm text-libra-navy">
                  A Libra não realiza nenhum tipo de cobrança até a liberação do crédito.
                </p>
              <DialogClose asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 self-end"
                  onClick={handleClosePopup}
                >
                  Fechar
                </Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </Suspense>
      )}
    </>
  );
};

Header.displayName = 'Header';

export default Header;
