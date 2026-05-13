import { useEffect, useRef } from 'react';

const runAfterInitialPaint = (callback: () => void) => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timerId = window.setTimeout(callback, 1200);
  return () => window.clearTimeout(timerId);
};

export default function TypewriterText({ strings }: { strings: string[] }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let typed: { destroy?: () => void } | undefined;
    let isMounted = true;

    const loadTyped = async () => {
      const { default: Typed } = await import('typed.js');
      if (!isMounted || !el.current) return;

      typed = new Typed(el.current, {
        strings,
        typeSpeed: 50,
        backSpeed: 30,
        backDelay: 1500,
        loop: true,
      });
    };

    const cancelDeferredLoad = runAfterInitialPaint(() => {
      void loadTyped();
    });

    return () => {
      isMounted = false;
      cancelDeferredLoad?.();
      typed?.destroy?.();
    };
  }, [strings]);

  return <span ref={el}>{strings[0]}</span>;
}
