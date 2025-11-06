import Play from 'lucide-react/dist/esm/icons/play';
import { type FC, type MouseEvent, useEffect } from 'react';

let youtubeApiPromise: Promise<void> | null = null;

const loadYouTubeApi = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  const w = window as typeof window & {
    YT?: { Player?: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };

  if (w.YT && w.YT.Player) {
    return Promise.resolve();
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      w.onYouTubeIframeAPIReady = () => resolve();
    });
  }

  return youtubeApiPromise;
};

interface OptimizedYouTubeProps {
  videoId: string;
  title: string;
  className?: string;
  /**
   * If true, the thumbnail is loaded eagerly with high fetch priority.
   * Use for above-the-fold videos that impact LCP.
   */
  priority?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'sync' | 'async' | 'auto';
  thumbnailSrc?: string;
}

/**
 * Lightweight YouTube embed that swaps in the real iframe on demand.
 * Set `priority` for above-the-fold videos so their thumbnail is requested early
 * with high fetch priority, improving Largest Contentful Paint.
 */
const OptimizedYouTube: FC<OptimizedYouTubeProps> = ({
  videoId,
  title,
  className = '',
  priority = false,
  fetchPriority,
  decoding = priority ? 'sync' : 'async',
  thumbnailSrc,
}) => {
  const thumbnailImage = thumbnailSrc || '/images/media/video-cgi-libra.webp';
  const fetchPriorityAttr = fetchPriority ?? (priority ? 'high' : undefined);

  useEffect(() => {
    if (!priority || typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    const win = window as typeof window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const load = () => {
      if (!cancelled) {
        void loadYouTubeApi();
      }
    };

    if (win.requestIdleCallback) {
      const handle = win.requestIdleCallback(load, { timeout: 2000 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(handle);
      };
    }

    const timeoutId = window.setTimeout(load, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [priority]);

  const loadVideo = async (e: MouseEvent<HTMLButtonElement>) => {
    const container = e.currentTarget.parentElement as HTMLElement | null;
    if (!container || typeof window === 'undefined') return;

    const fallbackUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const w = window as typeof window & {
      YT?: { Player?: new (...args: any[]) => any };
    };

    try {
      await loadYouTubeApi();
    } catch (error) {
      console.error('Erro ao carregar a API do YouTube', error);
    }

    if (!w.YT || !w.YT.Player) {
      window.open(fallbackUrl, '_blank', 'noopener');
      return;
    }

    container.innerHTML = '';
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.inset = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    container.appendChild(div);

    const player = new w.YT.Player(div, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: { autoplay: 1, playsinline: 1, modestbranding: 1, rel: 0 },
    });

    player.unMute();
    player.setVolume(100);
    player.playVideo();
  };

  return (
    <div className={`hero-video relative w-full h-full overflow-hidden bg-gray-200 ${className}`}>
      <button
        className="w-full h-full cursor-pointer relative flex items-center justify-center group"
        onClick={(event) => {
          void loadVideo(event);
        }}
        aria-label={`Reproduzir vídeo: ${title}`}
        type="button"
      >
        <picture className="absolute inset-0 w-full h-full block">

          <img
            src={thumbnailImage}
            alt={`Miniatura do ${title}`}
            width="480"
            height="360"
            className="w-full h-full object-cover block"
            loading={priority ? 'eager' : 'lazy'}
            {...(fetchPriorityAttr ? { fetchpriority: fetchPriorityAttr } : {})}
            decoding={decoding}

          />
        </picture>
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors duration-200">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:bg-red-700 transition-all duration-200 group-hover:scale-105">
            <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor" />
          </div>
        </div>
      </button>
    </div>
  );
};

export default OptimizedYouTube;
