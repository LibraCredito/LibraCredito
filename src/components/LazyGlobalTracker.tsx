import { lazy, Suspense, useEffect, useState } from 'react';

const GlobalTracker = lazy(() => import('./GlobalTracker'));
const TRACKER_FALLBACK_DELAY = 60000;
const interactionEvents = ['pointerdown', 'touchstart', 'keydown'] as const;

const LazyGlobalTracker = () => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      setShouldLoad(true);
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, load);
      });
    };

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, load, { once: true, passive: true });
    });
    const fallbackId = window.setTimeout(load, TRACKER_FALLBACK_DELAY);

    return () => {
      window.clearTimeout(fallbackId);
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, load);
      });
    };
  }, []);

  return shouldLoad ? (
    <Suspense fallback={null}>
      <GlobalTracker />
    </Suspense>
  ) : null;
};

export default LazyGlobalTracker;
