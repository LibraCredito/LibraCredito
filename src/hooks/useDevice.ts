import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPremiumDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  deviceType: 'mobile-sm' | 'mobile-md' | 'mobile-lg' | 'tablet' | 'desktop';
  isIOS: boolean;
  isAndroid: boolean;
  hasNotch: boolean;
  isTouchDevice: boolean;
}

const getInitialDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isPremiumDevice: false,
      screenWidth: 0,
      screenHeight: 0,
      deviceType: 'desktop',
      isIOS: false,
      isAndroid: false,
      hasNotch: false,
      isTouchDevice: false,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const platform = uaData?.platform || navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(platform);
  const isAndroid = /Android/.test(platform);
  const maxTouchPoints = 'maxTouchPoints' in navigator ? navigator.maxTouchPoints : 0;
  const isTouchDevice = 'ontouchstart' in window || maxTouchPoints > 0;

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const deviceType: DeviceInfo['deviceType'] = isMobile
    ? width < 375
      ? 'mobile-sm'
      : width < 414
        ? 'mobile-md'
        : 'mobile-lg'
    : isTablet
      ? 'tablet'
      : 'desktop';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isPremiumDevice:
      (isIOS && (width >= 375 || height >= 812)) ||
      (isAndroid && width >= 360 && window.devicePixelRatio >= 3),
    screenWidth: width,
    screenHeight: height,
    deviceType,
    isIOS,
    isAndroid,
    hasNotch:
      isIOS &&
      ((width === 375 && height === 812) ||
        (width === 414 && height === 896) ||
        (width === 390 && height === 844) ||
        (width === 393 && height === 852) ||
        (width === 430 && height === 932)),
    isTouchDevice,
  };
};

export const useDevice = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getInitialDeviceInfo);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const calculate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
      const platform = uaData?.platform || navigator.userAgent;

      const isIOS = /iPad|iPhone|iPod/.test(platform);
      const isAndroid = /Android/.test(platform);

      const isPremiumDevice =
        (isIOS && (width >= 375 || height >= 812)) ||
        (isAndroid && width >= 360 && window.devicePixelRatio >= 3);

      const hasNotch = isIOS && (
        (width === 375 && height === 812) ||
        (width === 414 && height === 896) ||
        (width === 390 && height === 844) ||
        (width === 393 && height === 852) ||
        (width === 430 && height === 932)
      );

      const maxTouchPoints =
        'maxTouchPoints' in navigator ? navigator.maxTouchPoints : 0;
      const isTouchDevice = 'ontouchstart' in window || maxTouchPoints > 0;

      let deviceType: DeviceInfo['deviceType'];
      let isMobile = false;
      let isTablet = false;
      let isDesktop = false;

      if (width < 768) {
        isMobile = true;
        if (width < 375) {
          deviceType = 'mobile-sm';
        } else if (width < 414) {
          deviceType = 'mobile-md';
        } else {
          deviceType = 'mobile-lg';
        }
      } else if (width < 1024) {
        isTablet = true;
        deviceType = 'tablet';
      } else {
        isDesktop = true;
        deviceType = 'desktop';
      }

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isPremiumDevice,
        screenWidth: width,
        screenHeight: height,
        deviceType,
        isIOS,
        isAndroid,
        hasNotch,
        isTouchDevice,
      });
    };

    calculate();
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
  }, []);

  return deviceInfo;
};

// Hook para verificar se é só mobile
export const useMobileOnly = () => {
  const { isMobile } = useDevice();
  return isMobile;
};

// Hook para media queries customizadas
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};
