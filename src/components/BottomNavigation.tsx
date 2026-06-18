import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Home from 'lucide-react/dist/esm/icons/home';
import Calculator from 'lucide-react/dist/esm/icons/calculator';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import { useDevice } from '@/hooks/useDevice';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  isSpecial?: boolean;
}

const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const _navigate = useNavigate();
  const { isMobile } = useDevice();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // WhatsApp number
  const whatsappNumber = '5511999999999'; // Substituir pelo número real
  const whatsappMessage = 'Olá! Gostaria de saber mais sobre o crédito com garantia de imóvel.';
  
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Início',
      icon: Home,
      href: '/'
    },
    {
      id: 'simulate',
      label: 'Simular',
      icon: Calculator,
      href: '/simulacao',
      isSpecial: true
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      action: () => {
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
      }
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: Menu,
      action: () => setIsMenuOpen(!isMenuOpen)
    }
  ];

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  if (!isMobile) return null;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-bottom">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href && location.pathname === item.href;
            
            const content = (
              <div className={cn(
                "flex flex-col items-center justify-center h-full relative transition-all duration-200",
                "tap-transparent", // Remove tap highlight
                item.isSpecial && "scale-110"
              )}>
                {item.isSpecial ? (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-libra-blue rounded-full shadow-lg flex items-center justify-center transform transition-transform active:scale-95">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <>
                    <Icon className={cn(
                      "w-5 h-5 transition-all",
                      isActive ? "text-libra-blue" : "text-gray-500",
                      item.id === 'menu' && isMenuOpen && "text-libra-blue"
                    )} />
                    <span className={cn(
                      "text-xs mt-1 transition-all",
                      isActive ? "text-libra-blue font-medium" : "text-gray-500",
                      item.id === 'menu' && isMenuOpen && "text-libra-blue font-medium"
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
                
                {/* Active indicator */}
                {isActive && !item.isSpecial && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-libra-blue rounded-full" />
                )}
              </div>
            );

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className="relative"
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                onClick={item.action}
                className="relative"
              >
                {content}
              </button>
            );
          })}
        </div>
        
        {/* Special button label */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-xs text-libra-blue font-medium">Simular</span>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="fixed right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-libra-blue">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-1">
              <MenuItem href="/" label="Início" onClick={() => setIsMenuOpen(false)} />
              <MenuItem href="/vantagens" label="Vantagens" onClick={() => setIsMenuOpen(false)} />
              <MenuItem href="/quem-somos" label="Quem Somos" onClick={() => setIsMenuOpen(false)} />
              <MenuItem href="/parceiros" label="Parceiros" onClick={() => setIsMenuOpen(false)} />
              <MenuItem href="/blog" label="Blog" onClick={() => setIsMenuOpen(false)} />
              
              <div className="h-px bg-gray-200 my-4" />
              
              <MenuItem href="/politica-privacidade" label="Política de Privacidade" onClick={() => setIsMenuOpen(false)} />
              
              {/* CTA Button in Menu */}
              <div className="mt-6">
                <Link
                  to="/simulacao"
                  className="block w-full py-3 px-4 bg-libra-blue text-white text-center font-semibold rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Simular Empréstimo
                </Link>
              </div>
            </div>

            {/* Contact Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50 safe-bottom">
              <p className="text-sm text-gray-600 text-center">
                Atendimento: Segunda a Sexta, 9h às 18h
              </p>
              <a 
                href={`tel:+${whatsappNumber}`}
                className="block text-center text-libra-blue font-semibold mt-2"
              >
                {whatsappNumber.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Menu Item Component
const MenuItem: React.FC<{ href: string; label: string; onClick: () => void }> = ({ 
  href, 
  label, 
  onClick 
}) => {
  const location = useLocation();
  const isActive = location.pathname === href;
  
  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(
        "block py-3 px-4 rounded-lg transition-colors",
        isActive 
          ? "bg-libra-blue/10 text-libra-blue font-medium" 
          : "text-gray-700 hover:bg-gray-100"
      )}
    >
      {label}
    </Link>
  );
};

export default BottomNavigation;
