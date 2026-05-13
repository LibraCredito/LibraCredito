export const PLOOMES_ORIGIN_FIELD = {
  id: 80002454,
  key: 'deal_4E9D160A-197F-469B-B1C7-228C199694F3',
  name: 'Link de origem'
} as const;

export interface PloomesOriginFields {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
}

export interface PloomesOriginOtherProperty {
  FieldKey: string;
  StringValue: string;
}

export type PloomesOriginPayloadTarget = Record<string, unknown> & {
  OtherProperties?: PloomesOriginOtherProperty[];
};

const MAX_PLOOMES_ORIGIN_LENGTH = 250;

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

const truncateToLimit = (value: string, max = MAX_PLOOMES_ORIGIN_LENGTH): string => {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
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

  const compact = [
    `Origem: ${origin}`,
    `Campanha: ${campaign}`,
    `Grupo: ${term}`,
    `Anúncio: ${content}`,
    `utm_term: ${term}`,
    `utm_content: ${content}`,
    `landing_page: ${landingPage}`,
    `referrer: ${referrer}`
  ].join(' | ');

  return truncateToLimit(compact);
};

export const buildPloomesOriginOtherProperty = (
  originLink: string,
  fieldKey = PLOOMES_ORIGIN_FIELD.key
): PloomesOriginOtherProperty => ({
  FieldKey: normalize(fieldKey) ?? PLOOMES_ORIGIN_FIELD.key,
  StringValue: originLink
});

export const applyPloomesOriginFields = (
  payload: PloomesOriginPayloadTarget,
  originLink: string,
  fieldKey = PLOOMES_ORIGIN_FIELD.key
): PloomesOriginPayloadTarget => {
  const normalizedFieldKey = normalize(fieldKey) ?? PLOOMES_ORIGIN_FIELD.key;
  const originProperty = buildPloomesOriginOtherProperty(originLink, normalizedFieldKey);

  payload[PLOOMES_ORIGIN_FIELD.name] = originLink;
  payload[`${PLOOMES_ORIGIN_FIELD.name} \n`] = originLink;
  payload.linkOrigem = originLink;
  payload.linkDeOrigem = originLink;
  payload.link_origem = originLink;
  payload.link_de_origem = originLink;
  payload.originLink = originLink;
  payload[normalizedFieldKey] = originLink;
  payload.OtherProperties = [originProperty];

  return payload;
};
