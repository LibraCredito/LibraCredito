import { describe, expect, it } from 'vitest';
import { mergeTrafficOrigin, resolveTrafficOrigin } from '../trafficOrigin';

describe('trafficOrigin', () => {
  it('preserves explicit UTM values from the landing URL', () => {
    const origin = resolveTrafficOrigin(
      'https://libracredito.com.br/?utm_source=meta&utm_medium=cpc&utm_campaign=campanha&utm_term=grupo&utm_content=anuncio',
      null
    );

    expect(origin).toMatchObject({
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: 'campanha',
      utm_term: 'grupo',
      utm_content: 'anuncio'
    });
  });

  it('infers paid traffic when only a click id is present', () => {
    const origin = resolveTrafficOrigin('https://libracredito.com.br/?gclid=abc123', null);

    expect(origin.utm_source).toBe('google');
    expect(origin.utm_medium).toBe('cpc');
  });

  it('falls back to referrer or direct so admin leads do not show blank origin', () => {
    expect(resolveTrafficOrigin('https://libracredito.com.br/', 'https://www.instagram.com/').utm_source).toBe(
      'instagram'
    );
    expect(resolveTrafficOrigin('https://libracredito.com.br/', '').utm_source).toBe('direct');
  });

  it('does not overwrite existing journey attribution when merging fallbacks', () => {
    const merged = mergeTrafficOrigin(
      { utm_source: 'google', utm_medium: 'cpc', landing_page: 'https://old.test' },
      resolveTrafficOrigin('https://new.test/?fbclid=1', 'https://facebook.com')
    );

    expect(merged.utm_source).toBe('google');
    expect(merged.utm_medium).toBe('cpc');
    expect(merged.landing_page).toBe('https://old.test');
  });
});
