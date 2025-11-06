import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { Button } from './ui/button';
import { ChevronDown } from 'lucide-react';
import type { SessionGroupWithJourney } from '@/services/localSimulationService';
import { cn } from '@/lib/utils';

interface UTMDetailsProps {
  visitor: SessionGroupWithJourney;
}

interface NormalizedUtmData {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  adGroup: string | null;
  ad: string | null;
  landingPage: string | null;
  referrer: string | null;
  timeOnSite: number | null;
}

const cleanUtmValue = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/[+]/g, ' ');
  try {
    const decoded = decodeURIComponent(normalized);
    return decoded.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  } catch {
    return normalized.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

const formatDuration = (seconds: number): string => {
  const totalSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

const UTMDetails: React.FC<UTMDetailsProps> = ({ visitor }) => {
  const [open, setOpen] = React.useState(false);

  const normalized = React.useMemo<NormalizedUtmData>(() => {
    const simulacoes = visitor.simulacoes || [];

    const pickSimulationValue = <K extends keyof (typeof simulacoes)[number]>(
      field: K
    ): (typeof simulacoes)[number][K] | null => {
      for (const sim of simulacoes) {
        const value = sim[field];
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' && value.trim() === '') continue;
        if (typeof value === 'number' && !Number.isFinite(value)) continue;
        return value;
      }
      return null;
    };

    const landingPage = visitor.landing_page ?? (pickSimulationValue('landing_page') as string | null);
    const referrer = visitor.referrer ?? (pickSimulationValue('referrer') as string | null);
    const timeOnSiteValue = (() => {
      if (typeof visitor.time_on_site === 'number' && Number.isFinite(visitor.time_on_site)) {
        return visitor.time_on_site;
      }
      const fromSim = pickSimulationValue('time_on_site');
      return typeof fromSim === 'number' && Number.isFinite(fromSim) ? fromSim : null;
    })();

    const candidateUrls = [landingPage, ...simulacoes.map(sim => sim.landing_page)]
      .filter(Boolean)
      .map(url => String(url));

    const searchParams = (() => {
      for (const url of candidateUrls) {
        try {
          const parsed = new URL(url);
          if (parsed.search && parsed.searchParams.toString().length > 0) {
            return parsed.searchParams;
          }
        } catch {
          // Ignorar URLs inválidas
        }
      }
      return null;
    })();

    const getParam = (...keys: string[]) => {
      if (!searchParams) return null;
      for (const key of keys) {
        const value = searchParams.get(key);
        if (value) return value;
      }
      return null;
    };

    const utmSource =
      visitor.utm_source ?? (pickSimulationValue('utm_source') as string | null) ?? getParam('utm_source', 'source');
    const utmMedium =
      visitor.utm_medium ?? (pickSimulationValue('utm_medium') as string | null) ?? getParam('utm_medium', 'medium');
    const utmCampaign =
      visitor.utm_campaign ??
      (pickSimulationValue('utm_campaign') as string | null) ??
      getParam('utm_campaign', 'campaign');
    const utmTerm =
      visitor.utm_term ??
      (pickSimulationValue('utm_term') as string | null) ??
      getParam('utm_term', 'keyword', 'term');
    const utmContent =
      visitor.utm_content ??
      (pickSimulationValue('utm_content') as string | null) ??
      getParam('utm_content', 'content');

    const adGroupRaw =
      getParam('utm_adgroup', 'adgroup', 'utm_adset', 'adset', 'ad_group', 'utm_adgroup_id') ?? utmTerm;
    const adRaw = getParam('utm_ad', 'ad', 'creative', 'utm_creative', 'utm_ad_id', 'utm_creative_id') ?? utmContent;

    return {
      source: cleanUtmValue(utmSource),
      medium: cleanUtmValue(utmMedium),
      campaign: cleanUtmValue(utmCampaign),
      term: cleanUtmValue(utmTerm),
      content: cleanUtmValue(utmContent),
      adGroup: cleanUtmValue(adGroupRaw),
      ad: cleanUtmValue(adRaw),
      landingPage: landingPage ?? null,
      referrer: referrer ?? null,
      timeOnSite: timeOnSiteValue
    };
  }, [visitor]);

  const shortenUrl = (url: string) => {
    try {
      const { hostname, pathname } = new URL(url);
      return `${hostname}${pathname}`;
    } catch {
      return url;
    }
  };

  const originLabel = [normalized.source, normalized.medium].filter(Boolean).join(' / ') || '-';
  const campaignLabel = normalized.campaign || '-';
  const adGroupLabel = normalized.adGroup || normalized.term || '-';
  const adLabel = normalized.ad || normalized.content || '-';

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="text-xs overflow-hidden max-w-[240px]"
    >
      <div className="flex items-start gap-2">
        <div className="space-y-1 text-[11px] leading-tight">
          <div>
            <strong>Origem:</strong> {originLabel}
          </div>
          <div>
            <strong>Campanha:</strong> {campaignLabel}
          </div>
          <div>
            <strong>Grupo:</strong> {adGroupLabel}
          </div>
          <div>
            <strong>Anúncio:</strong> {adLabel}
          </div>
        </div>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 mt-0.5 flex-shrink-0"
            aria-label={open ? 'Esconder detalhes UTM' : 'Mostrar detalhes UTM'}
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : '')}
            />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="mt-2 space-y-1 text-[11px] leading-tight">
        {normalized.term && (
          <div>
            <strong>utm_term:</strong> {normalized.term}
          </div>
        )}
        {normalized.content && (
          <div>
            <strong>utm_content:</strong> {normalized.content}
          </div>
        )}
        {typeof normalized.timeOnSite === 'number' && (
          <div>
            <strong>tempo_no_site:</strong> {formatDuration(normalized.timeOnSite)}
          </div>
        )}
        {normalized.landingPage && (
          <div>
            <strong>landing_page:</strong>{' '}
            <a
              href={normalized.landingPage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {shortenUrl(normalized.landingPage)}
            </a>
          </div>
        )}
        {normalized.referrer && (
          <div>
            <strong>referrer:</strong>{' '}
            <a
              href={normalized.referrer}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {shortenUrl(normalized.referrer)}
            </a>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default UTMDetails;

