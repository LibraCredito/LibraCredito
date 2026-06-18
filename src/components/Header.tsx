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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '@/hooks/useDevice';
import DesktopHeader from './DesktopHeader';
import SimpleMobileHeader from './SimpleMobileHeader';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useDevice();

  const handleSimulateNow = () => {
    navigate('/simulacao');
  };

  const handlePortalClientes = () => {
    window.open('https://clientes.libracredito.com.br/', '_blank');
  };

  return isMobile ? (
    <SimpleMobileHeader onPortalClientes={handlePortalClientes} />
  ) : (
    <DesktopHeader
      onPortalClientes={handlePortalClientes}
      onSimulateNow={handleSimulateNow}
    />
  );
};

Header.displayName = 'Header';

export default Header;
