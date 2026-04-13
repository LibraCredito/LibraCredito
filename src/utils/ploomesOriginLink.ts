export interface PloomesOriginFields {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
}

const normalize = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/[+]/g, ' ');
  try {
    return decodeURIComponent(normalized).replace(/\s+/g, ' ').trim();
  } catch {
    return normalized.replace(/\s+/g, ' ').trim();
  }
};

export const buildPloomesOriginLink = (fields: PloomesOriginFields): string => {
  const source = normalize(fields.utm_source);
  const medium = normalize(fields.utm_medium);
  const campaignRaw = normalize(fields.utm_campaign);
  const termRaw = normalize(fields.utm_term);
  const contentRaw = normalize(fields.utm_content);
  const landingPage = normalize(fields.landing_page) ?? 'desconhecido';
  const referrer = normalize(fields.referrer) ?? 'desconhecido';

  const campaign = campaignRaw ?? 'desconhecido';
  const term = termRaw ?? 'desconhecido';
  const content = contentRaw ?? 'desconhecido';

  const hasAnyUtm = Boolean(source || medium || campaignRaw || termRaw || contentRaw);

  const origin = hasAnyUtm
    ? [source, medium].filter(Boolean).join(' / ') || 'desconhecido'
    : referrer;

  return [
    `Origem: ${origin}`,
    `Campanha: ${campaign}`,
    `Grupo: ${term}`,
    `Anúncio: ${content}`,
    '',
    `utm_term: ${term}`,
    `utm_content: ${content}`,
    `landing_page: ${landingPage}`,
    `referrer: ${referrer}`
  ].join('\n');
};
