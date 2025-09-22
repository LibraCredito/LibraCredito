/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEBHOOK_URL?: string;
  readonly VITE_WEBHOOK_SECONDARY_URL?: string;
  readonly VITE_ALERT_WEBHOOK_URL?: string;
}
