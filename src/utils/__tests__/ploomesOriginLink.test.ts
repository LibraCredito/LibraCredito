import { describe, expect, it } from 'vitest';
import {
  PLOOMES_ORIGIN_FIELD,
  applyPloomesOriginFields,
  buildPloomesOriginLink,
  buildPloomesOriginOtherProperty
} from '../ploomesOriginLink';

describe('ploomesOriginLink', () => {
  it('formats admin Campaign & Origin attribution into a compact origin link', () => {
    const originLink = buildPloomesOriginLink({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'financiamento maio',
      utm_term: 'grupo-a',
      utm_content: 'criativo-1',
      landing_page: 'https://libracredito.com.br/simulacao',
      referrer: 'https://google.com'
    });

    expect(originLink).toContain('Origem: google / cpc');
    expect(originLink).toContain('Campanha: financiamento maio');
    expect(originLink).toContain('Grupo: grupo-a');
    expect(originLink).toContain('Anúncio: criativo-1');
  });

  it('builds the exact Ploomes OtherProperties entry for Link de origem', () => {
    expect(buildPloomesOriginOtherProperty('Origem: google / cpc')).toEqual({
      FieldKey: PLOOMES_ORIGIN_FIELD.key,
      StringValue: 'Origem: google / cpc'
    });
  });

  it('applies compatibility aliases used by the Ploomes proxy payload', () => {
    const payload = applyPloomesOriginFields({}, 'Origem: google / cpc');

    expect(payload['Link de origem']).toBe('Origem: google / cpc');
    expect(payload.linkOrigem).toBe('Origem: google / cpc');
    expect(payload.linkDeOrigem).toBe('Origem: google / cpc');
    expect(payload.link_origem).toBe('Origem: google / cpc');
    expect(payload.link_de_origem).toBe('Origem: google / cpc');
    expect(payload.originLink).toBe('Origem: google / cpc');
  });
});
