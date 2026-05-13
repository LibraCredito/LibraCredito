import React, { useState, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: string;
  webpSrc?: string;
  avifSrc?: string;
  sizes?: string;
  srcSet?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  placeholder,
  webpSrc,
  avifSrc
}) => {
  return (
    <picture>
      {/* AVIF for best compression */}
      {avifSrc && (
        <source
          srcSet={avifSrc}
          type="image/avif"
        />
      )}
      
      {/* WebP for good compression with wide support */}
      {webpSrc && (
        <source
          srcSet={webpSrc}
          type="image/webp"
        />
      )}
      
      {/* Fallback to original format */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        {...{ fetchpriority: priority ? 'high' : 'auto' }}
        decoding="async"
        style={{
          contentVisibility: priority ? 'visible' : 'auto',
          containIntrinsicSize: width && height ? `${width}px ${height}px` : undefined,
          backgroundColor: placeholder || '#f3f4f6'
        }}
      />
    </picture>
  );
};

export default OptimizedImage;

// Hook para detectar suporte a WebP
export const useWebPSupport = () => {
  const [supportsWebP, setSupportsWebP] = React.useState(false);
  
  React.useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };
    
    setSupportsWebP(checkWebPSupport());
  }, []);
  
  return supportsWebP;
};

// Utilitário para gerar URLs de imagem otimizada
export const getOptimizedImageUrl = (originalUrl: string, format: 'webp' | 'avif' = 'webp') => {
  if (originalUrl.includes('youtube.com') || originalUrl.includes('googleapis.com')) {
    return originalUrl; // Não modificar URLs externas
  }
  
  const parts = originalUrl.split('.');
  const extension = parts.pop();
  const base = parts.join('.');
  
  return `${base}.${format}`;
};

// Componente específico para logo
export const OptimizedLogo: React.FC<{
  className?: string;
  width?: number;
  height?: number;
}> = ({ className, width = 150, height = 50 }) => {
  return (
    <OptimizedImage
      src="/images/logo.png"
      webpSrc="/images/logo.webp"
      avifSrc="/images/logo.avif"
      alt="Libra Crédito"
      width={width}
      height={height}
      className={className}
      priority={true}
      placeholder="#003399"
    />
  );
};

// Componente específico para ícones
export const OptimizedIcon: React.FC<{
  src: string;
  alt: string;
  className?: string;
  size?: number;
}> = ({ src, alt, className, size = 24 }) => {
  return (
    <OptimizedImage
      src={src}
      webpSrc={getOptimizedImageUrl(src, 'webp')}
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority={false}
    />
  );
};
