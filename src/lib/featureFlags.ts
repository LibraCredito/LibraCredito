/**
 * Feature flags that make it safe to ship work in progress alongside the
 * production experience. Preview-only routes must remain disabled in a
 * production deployment until they have an explicit environment opt-in.
 */
const enabledValues = new Set(['1', 'true', 'yes', 'on']);

const isEnabled = (value: unknown) =>
  typeof value === 'string' && enabledValues.has(value.trim().toLowerCase());

/**
 * Enables the private V2 experience in a preview/staging environment.
 * Development keeps it available to make local validation straightforward.
 */
export const isExperienceV2Enabled = () =>
  import.meta.env.DEV || isEnabled(import.meta.env.VITE_ENABLE_EXPERIENCE_V2);
