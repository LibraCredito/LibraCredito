/**
 * Componente otimizador de imagens
 * 
 * @component ImageOptimizer
 * @description Componente responsável pela otimização e carregamento eficiente de imagens
 * 
 * @features
 * - Lazy loading automático
 * - Suporte a aspect ratio
 * - Otimização de carregamento para LCP (Largest Contentful Paint)
 * - Suporte a imagens prioritárias
 * - Melhoria de performance via atributos decoding e loading
 * 
 * @param {ImageOptimizerProps} props
 * @param {string} props.src - URL da imagem
 * @param {string} props.alt - Texto alternativo para acessibilidade
 * @param {string} [props.className] - Classes CSS opcionais
 * @param {number} [props.aspectRatio=16/9] - Proporção da imagem (width/height)
 * @param {boolean} [props.priority=false] - Se true, carrega a imagem com prioridade alta
 * @param {number} [props.width] - Largura da imagem em pixels
 * @param {number} [props.height] - Altura da imagem em pixels
 * @param {string} [props.objectFit="cover"] - Valor do object-fit (ex: cover, contain)
 *
 * @example
 * ```tsx
 * // Imagem normal com lazy loading
 * <ImageOptimizer 
 *   src="/images/photo.jpg" 
 *   alt="Descrição da foto"
 * />
 * 
 * // Imagem prioritária (ex: hero section)
 * <ImageOptimizer 
 *   src="/images/hero.jpg" 
 *   alt="Hero banner"
 *   priority={true}
 *   aspectRatio={21/9}
 * />
 * ```
 * 
 * @performance
 * - Usa lazy loading por padrão para otimizar performance
 * - Suporta priorização para imagens above the fold
 * - Mantém aspect ratio para evitar layout shifts
 * 
 * @accessibility
 * - Requer alt text para todas as imagens
 * - Preserva aspect ratio para consistência visual
 */

import React from 'react';
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

interface ImageOptimizerProps {
  src: string;
  alt: string;
  /** Classes aplicadas ao container */
  className?: string;
  /** Classes aplicadas diretamente à imagem */
  imgClassName?: string;
  /** Define o comportamento de object-fit da imagem */
  objectFit?:
    | 'contain'
    | 'cover'
    | 'fill'
    | 'none'
    | 'scale-down'
    | (string & {});
  aspectRatio?: number;
  priority?: boolean;
  width?: number;
  height?: number;
  widths?: number[];
  sizes?: string;
  decoding?: 'sync' | 'async' | 'auto';
  fetchPriority?: 'high' | 'low' | 'auto';
}

const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  className = "",
  imgClassName = "",
  objectFit = 'cover',
  aspectRatio = 16/9,
  priority = false,
  width,
  height,
  widths,
  sizes,
  decoding,
  fetchPriority,
}) => {
  const srcSet = widths?.map((w) => `${src}?width=${w} ${w}w`).join(', ');
  const allClasses = `${className} ${imgClassName}`;
  const hasWidthClass = /\bw-\S+/.test(allClasses);
  const hasHeightClass = /\bh-\S+/.test(allClasses);
  const resolvedDecoding = decoding ?? (priority ? 'sync' : 'async');
  const resolvedFetchPriority = fetchPriority ?? (priority ? 'high' : undefined);

  const imageElement = (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      className={cn(
        `object-${objectFit}`,
        !hasWidthClass && "w-full",
        !hasHeightClass && "h-full",
        imgClassName
      )}
      width={width}
      height={height}
      decoding={resolvedDecoding}
      srcSet={srcSet}
      sizes={sizes}
      fetchPriority={resolvedFetchPriority}
    />
  );

  const containerClasses = cn("overflow-hidden", className);

  return aspectRatio ? (
    <AspectRatio ratio={aspectRatio} className={containerClasses}>
      {imageElement}
    </AspectRatio>
  ) : (
    <div className={containerClasses}>
      {imageElement}
    </div>
  );
};

export default ImageOptimizer;
