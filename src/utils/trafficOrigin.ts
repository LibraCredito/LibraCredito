export interface TrafficOriginData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
}

type TrafficParams = Pick<
  TrafficOriginData,
  'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content'
>;

const cleanValue = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getParam = (searchParams: URLSearchParams, ...keys: string[]): string | null => {
  for (const key of keys) {
    const value = cleanValue(searchParams.get(key));
    if (value) return value;
  }
  return null;
};

const parseUrl = (url?: string | null): URL | null => {
  if (!url) return null;

  try {
    return new URL(url);
  } catch {
    try {
      return new URL(url, 'https://libra.local');
    } catch {
      return null;
    }
  }
};

const inferFromClickId = (searchParams: URLSearchParams): Partial<TrafficParams> => {
  if (getParam(searchParams, 'gclid', 'gbraid', 'wbraid')) {
    return { utm_source: 'google', utm_medium: 'cpc' };
  }

  if (getParam(searchParams, 'fbclid')) {
    return { utm_source: 'facebook', utm_medium: 'social' };
  }

  if (getParam(searchParams, 'msclkid')) {
    return { utm_source: 'bing', utm_medium: 'cpc' };
  }

  if (getParam(searchParams, 'ttclid')) {
    return { utm_source: 'tiktok', utm_medium: 'social' };
  }

  if (getParam(searchParams, 'li_fat_id')) {
    return { utm_source: 'linkedin', utm_medium: 'social' };
  }

  return {};
};

const inferFromReferrer = (referrer?: string | null): Partial<TrafficParams> => {
  const parsed = parseUrl(referrer);
  const hostname = parsed?.hostname.replace(/^www\./, '').toLowerCase();

  if (!hostname) {
    return { utm_source: 'direct', utm_medium: 'none' };
  }

  if (hostname.includes('google.')) return { utm_source: 'google', utm_medium: 'organic' };
  if (hostname.includes('bing.')) return { utm_source: 'bing', utm_medium: 'organic' };
  if (hostname.includes('yahoo.')) return { utm_source: 'yahoo', utm_medium: 'organic' };
  if (hostname.includes('facebook.') || hostname === 'fb.com' || hostname === 'm.facebook.com') {
    return { utm_source: 'facebook', utm_medium: 'social' };
  }
  if (hostname.includes('instagram.')) return { utm_source: 'instagram', utm_medium: 'social' };
  if (hostname.includes('linkedin.')) return { utm_source: 'linkedin', utm_medium: 'social' };
  if (hostname.includes('tiktok.')) return { utm_source: 'tiktok', utm_medium: 'social' };
  if (hostname.includes('youtube.')) return { utm_source: 'youtube', utm_medium: 'social' };

  return { utm_source: hostname, utm_medium: 'referral' };
};

export const resolveTrafficOrigin = (
  url?: string | null,
  referrer?: string | null
): TrafficOriginData => {
  const parsed = parseUrl(url);
  const searchParams = parsed?.searchParams ?? new URLSearchParams();
  const inferredByClickId = inferFromClickId(searchParams);
  const inferredByReferrer = inferFromReferrer(referrer);

  const utm_source =
    getParam(searchParams, 'utm_source', 'source') ??
    cleanValue(inferredByClickId.utm_source) ??
    cleanValue(inferredByReferrer.utm_source);
  const utm_medium =
    getParam(searchParams, 'utm_medium', 'medium') ??
    cleanValue(inferredByClickId.utm_medium) ??
    cleanValue(inferredByReferrer.utm_medium);

  return {
    utm_source,
    utm_medium,
    utm_campaign: getParam(searchParams, 'utm_campaign', 'campaign', 'campaign_id'),
    utm_term: getParam(searchParams, 'utm_term', 'keyword', 'term', 'adgroup', 'adset'),
    utm_content: getParam(searchParams, 'utm_content', 'content', 'creative', 'ad'),
    landing_page: cleanValue(url) ?? null,
    referrer: cleanValue(referrer) ?? (utm_source === 'direct' ? 'direct' : null)
  };
};

export const mergeTrafficOrigin = <T extends Partial<TrafficOriginData>>(
  current: T | null | undefined,
  fallback: TrafficOriginData
): TrafficOriginData => ({
  utm_source: cleanValue(current?.utm_source) ?? fallback.utm_source,
  utm_medium: cleanValue(current?.utm_medium) ?? fallback.utm_medium,
  utm_campaign: cleanValue(current?.utm_campaign) ?? fallback.utm_campaign,
  utm_term: cleanValue(current?.utm_term) ?? fallback.utm_term,
  utm_content: cleanValue(current?.utm_content) ?? fallback.utm_content,
  landing_page: cleanValue(current?.landing_page) ?? fallback.landing_page,
  referrer: cleanValue(current?.referrer) ?? fallback.referrer
});
