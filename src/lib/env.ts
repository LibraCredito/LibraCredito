export type WebhookUrl = string;
export type OptionalWebhookUrl = WebhookUrl | undefined;

type MaybeString = string | null | undefined;

type WebhookEnvKeys =
  | 'VITE_WEBHOOK_URL'
  | 'VITE_WEBHOOK_SECONDARY_URL'
  | 'VITE_ALERT_WEBHOOK_URL';

const normalizeEnvValue = (value: unknown): OptionalWebhookUrl => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readWebhookEnv = (key: WebhookEnvKeys): OptionalWebhookUrl => {
  return normalizeEnvValue(import.meta.env[key] as MaybeString);
};

export const getPrimaryWebhookUrl = (): OptionalWebhookUrl => readWebhookEnv('VITE_WEBHOOK_URL');

export const getSecondaryWebhookUrl = (): OptionalWebhookUrl => readWebhookEnv('VITE_WEBHOOK_SECONDARY_URL');

export const getAlertWebhookUrl = (): OptionalWebhookUrl => readWebhookEnv('VITE_ALERT_WEBHOOK_URL');

export const resolveWebhookUrl = (override?: MaybeString): OptionalWebhookUrl => {
  return normalizeEnvValue(override) ?? getPrimaryWebhookUrl();
};
