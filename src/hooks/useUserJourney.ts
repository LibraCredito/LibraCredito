/**
 * Hook para tracking completo da jornada do usuário
 * 
 * @hook useUserJourney
 * @description Hook responsável por rastrear toda a jornada do usuário no site
 * 
 * @features
 * - Geração de session_id único
 * - Captura de UTMs e referrer
 * - Tracking de páginas visitadas
 * - Detecção de device/browser
 * - Tempo de permanência
 * - Persistência no Supabase
 * 
 * @usage
 * ```tsx
 * const { sessionId, trackPageVisit, trackSimulation } = useUserJourney();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type {
  UserJourneyData,
  PageVisit,
  DeviceInfo
} from '@/lib/supabase';

// Lazy loader para evitar carregar Supabase na primeira pintura
type SupabaseApi = typeof import('@/lib/supabase').supabaseApi;
let cachedSupabase: SupabaseApi | null = null;
async function getSupabaseApi(): Promise<SupabaseApi> {
  if (!cachedSupabase) {
    try {
      const { getSupabaseApi } = await import('@/lib/supabaseLazy');
      cachedSupabase = await getSupabaseApi();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Supabase API unavailable:', error);
      }
      throw error;
    }
  }
  return cachedSupabase;
}

// Constantes
const SESSION_STORAGE_KEY = 'libra_session_id';
const VISITOR_STORAGE_KEY = 'libra_visitor_id';

// Types específicos do hook
interface UserJourneyHook {
  sessionId: string;
  visitorId: string;
  isTracking: boolean;
  trackPageVisit: (url?: string) => void;
  trackSimulation: (simulationData: unknown) => void;
  getJourneyData: () => UserJourneyData | null;
  updateTimeOnSite: () => void;
}

// Recupera ou gera um visitorId persistente no localStorage
function getOrCreateVisitorId(): string {
  let id = localStorage.getItem(VISITOR_STORAGE_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(VISITOR_STORAGE_KEY, id);
  }
  return id;
}

// Função para extrair UTMs da URL
function extractUTMParams(url: string = window.location.href): Record<string, string> {
  const urlObj = new URL(url);
  const utms: Record<string, string> = {};
  
  const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  
  utmParams.forEach(param => {
    const value = urlObj.searchParams.get(param);
    if (value) {
      utms[param] = value;
    }
  });
  
  return utms;
}

// Função para detectar informações do device
function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const screen = window.screen;
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  // Detecção simples de device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/Mobi|Android/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/Tablet|iPad/i.test(userAgent)) {
    deviceType = 'tablet';
  }
  
  // Detecção simples de browser
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  // Detecção simples de OS
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  return {
    user_agent: userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    viewport_size: `${viewport.width}x${viewport.height}`,
    device_type: deviceType,
    browser,
    os
  };
}

// Função para obter IP (usando serviço externo)
async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.warn('Erro ao obter IP:', error);
    return 'unknown';
  }
}

export function useUserJourney(): UserJourneyHook {
  const location = useLocation();
  const [sessionId, setSessionId] = useState<string>('');
  const [visitorId, setVisitorId] = useState<string>('');
  const [isTracking, setIsTracking] = useState(false);
  const [journeyData, setJourneyData] =
    useState<UserJourneyData | null>(null);
  const pageStartTime = useRef<number>(Date.now());
  const sessionStartTime = useRef<number>(Date.now());
  const ipFetchedRef = useRef<boolean>(false);

  const fetchAndStoreIP = useCallback(async () => {
    if (ipFetchedRef.current || !sessionId) return;
    ipFetchedRef.current = true;

    try {
      const ip = await getUserIP();
      const api = await getSupabaseApi();
          const payload: Partial<UserJourneyData> = { ip_address: ip };
          await api.updateUserJourney(sessionId, payload);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to update IP address:', error);
      }
    }
  }, [sessionId]);
  
  // Inicialização da sessão
  useEffect(() => {
    let currentSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const currentVisitorId = getOrCreateVisitorId();

    setVisitorId(currentVisitorId);

    if (!currentSessionId) {
      currentSessionId = uuidv4();
      sessionStorage.setItem(SESSION_STORAGE_KEY, currentSessionId);
      sessionStartTime.current = Date.now();
    }

    setSessionId(currentSessionId);
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => initializeJourney(currentSessionId!, currentVisitorId));
    } else {
      setTimeout(() => initializeJourney(currentSessionId!, currentVisitorId), 500);
    }
  }, []);
  
  // Tracking de mudança de página
  useEffect(() => {
    if (sessionId && isTracking) {
      trackPageVisit();
    }
  }, [location.pathname, sessionId, isTracking]);

  // Obter IP após primeira interação ou quando o navegador estiver ocioso
  useEffect(() => {
    if (!sessionId || !isTracking) return;

    const run = () => fetchAndStoreIP();

    const onInteract = () => run();
    window.addEventListener('pointerdown', onInteract, { once: true });
    window.addEventListener('keydown', onInteract, { once: true });

    let idleId: number;
    if ('requestIdleCallback' in window) {
      idleId = (window as any).requestIdleCallback(run, { timeout: 10000 });
    } else {
      idleId = window.setTimeout(run, 5000);
    }

    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      if ('cancelIdleCallback' in window) {
        try {
          (window as any).cancelIdleCallback(idleId);
        } catch {
          /* noop */
        }
      } else {
        clearTimeout(idleId);
      }
    };
  }, [sessionId, isTracking, fetchAndStoreIP]);
  
  // Inicializar jornada do usuário
  const initializeJourney = useCallback(async (sessionId: string, visitorId: string) => {
    try {
      // Verificar se já existe jornada para esta sessão
      let existingJourney;
      
      const supabaseApi = await getSupabaseApi();
      try {
        existingJourney = await supabaseApi.getUserJourney(sessionId);
      } catch (getError: unknown) {
        // Apenas log em desenvolvimento, não desabilitar o tracking ainda
        if (process.env.NODE_ENV === 'development') {
          console.warn('Could not fetch existing journey:', getError?.message);
        }
        existingJourney = null; // Continuar para tentar criar nova jornada
      }
      
      if (!existingJourney) {
        // Tentar criar nova jornada apenas se a consulta anterior funcionou
        try {
          const utms = extractUTMParams();
          const deviceInfo = getDeviceInfo();

          const newJourney: UserJourneyData = {
            session_id: sessionId,
            visitor_id: visitorId,
            utm_source: utms.utm_source || null,
            utm_medium: utms.utm_medium || null,
            utm_campaign: utms.utm_campaign || null,
            utm_term: utms.utm_term || null,
            utm_content: utms.utm_content || null,
            referrer: document.referrer || 'direct',
            landing_page: window.location.href,
            pages_visited: [],
            time_on_site: 0,
            device_info: deviceInfo,
            ip_address: null
          };

          existingJourney = await supabaseApi.createUserJourney(newJourney);

          existingJourney = {
            ...newJourney,
            id: createdJourney?.id || null
          };

          if (process.env.NODE_ENV === 'development') {
            console.log('Nova jornada criada:', existingJourney);
          }
        } catch (createError) {
          // Desabilitar tracking silenciosamente em caso de erro
          if (process.env.NODE_ENV === 'development') {
            console.warn('User journey tracking disabled:', createError);
          }
          setIsTracking(false);
          return;
        }
      }
      
      setJourneyData(existingJourney);
      setIsTracking(true);
      
    } catch (error) {
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.warn('User journey initialization failed:', error);
      }
      setIsTracking(false);
    }
  }, []);
  
  // Função para rastrear visita de página
  const trackPageVisit = useCallback((url?: string) => {
    if (!sessionId || !isTracking) return;
    
    const currentUrl = url || window.location.href;
    const currentTime = Date.now();
    
    setJourneyData(prev => {
      if (!prev) return prev;
      
      const newPageVisit: PageVisit = {
        url: currentUrl,
        timestamp: new Date().toISOString(),
        time_spent: currentTime - pageStartTime.current
      };
      
      const updatedJourney = {
        ...prev,
        pages_visited: [...(prev.pages_visited || []), newPageVisit],
        time_on_site: Math.floor((currentTime - sessionStartTime.current) / 1000)
      };
      
      // Atualizar no Supabase (debounced) apenas se tracking estiver ativo
      setTimeout(() => {
        if (isTracking && updatedJourney.pages_visited) {
          // Garantir que os dados são serializáveis
          const safeData: Partial<UserJourneyData> = {
            pages_visited: updatedJourney.pages_visited.map(page => ({
              url: String(page.url),
              timestamp: String(page.timestamp),
              time_spent: Number(page.time_spent) || 0
            })),
            time_on_site: Number(updatedJourney.time_on_site) || 0
          };

          getSupabaseApi()
            .then(api =>
              api.updateUserJourney(sessionId, safeData).catch((error) => {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('Failed to update user journey:', error);
                }
              })
            )
            .catch(error => {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Supabase API unavailable:', error);
              }
            });
        }
      }, 1000);
      
      return updatedJourney;
    });
    
    pageStartTime.current = currentTime;
  }, [sessionId, isTracking]);
  
  // Função para rastrear simulação
  const trackSimulation = useCallback((simulationData: unknown) => {
    if (!sessionId) return;
    
    console.log('Tracking simulação:', { sessionId, simulationData });
    
    // Adicionar evento de simulação às páginas visitadas
    const simulationEvent: PageVisit = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      time_spent: 0
    };
    
    setJourneyData(prev => {
      if (!prev) return prev;
      
      const updatedJourney = {
        ...prev,
        pages_visited: [...(prev.pages_visited || []), simulationEvent]
      };
      
      // Atualizar no Supabase apenas se tracking estiver ativo
      if (isTracking && updatedJourney.pages_visited) {
        // Garantir que os dados são serializáveis
        const safeData: Partial<UserJourneyData> = {
          pages_visited: updatedJourney.pages_visited.map(page => ({
            url: String(page.url),
            timestamp: String(page.timestamp),
            time_spent: Number(page.time_spent) || 0
          }))
        };
        
        getSupabaseApi()
          .then(api =>
            api.updateUserJourney(sessionId, safeData).catch((error) => {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to track simulation:', error);
              }
            })
          )
          .catch(error => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Supabase API unavailable:', error);
            }
          });
      }
      
      return updatedJourney;
    });
  }, [sessionId]);
  
  // Função para atualizar tempo no site
  const updateTimeOnSite = useCallback(() => {
    if (!sessionId || !isTracking) return;
    
    const currentTime = Date.now();
    const timeOnSite = Math.floor((currentTime - sessionStartTime.current) / 1000);
    
    if (isTracking) {
      const payload: Partial<UserJourneyData> = { time_on_site: timeOnSite };

      getSupabaseApi()
        .then(api =>
          api.updateUserJourney(sessionId, payload).catch((error) => {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Failed to update time on site:', error);
            }
          })
        )
        .catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Supabase API unavailable:', error);
          }
        });
    }
  }, [sessionId, isTracking]);
  
  // Atualizar tempo a cada 30 segundos
  useEffect(() => {
    if (!isTracking) return;
    
    const interval = setInterval(updateTimeOnSite, 30000);
    return () => clearInterval(interval);
  }, [isTracking, updateTimeOnSite]);
  
  // Cleanup ao sair da página
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateTimeOnSite();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [updateTimeOnSite]);
  
  const getJourneyData = useCallback(() => journeyData, [journeyData]);

  return {
    sessionId,
    visitorId,
    isTracking,
    trackPageVisit,
    trackSimulation,
    getJourneyData,
    updateTimeOnSite
  };
}

export default useUserJourney;
