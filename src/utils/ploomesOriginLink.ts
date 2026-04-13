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
  const source = normalize(fields.utm_source) ?? '-';
  const medium = normalize(fields.utm_medium) ?? '-';
  const campaign = normalize(fields.utm_campaign) ?? '-';
  const term = normalize(fields.utm_term) ?? '-';
  const content = normalize(fields.utm_content) ?? '-';
  const landingPage = normalize(fields.landing_page) ?? '-';
  const referrer = normalize(fields.referrer) ?? '-';

  const origin = [source, medium].filter(part => part !== '-').join(' / ') || '-';

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
