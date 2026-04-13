import { describe, it, expect, vi, afterEach } from 'vitest';
import PloomesService from '../ploomesService';


const getOriginLink = (body: Record<string, unknown>): string => {
  const key = Object.keys(body).find((candidate) => candidate.startsWith('Link de origem'));
  return String((key && body[key]) || '');
};

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-ignore
  delete global.fetch;
});

describe('PloomesService', () => {
  it('sends UTM params in payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, msg: '', retorno: { nomeCompleto: '', email: '' } })
    });
    // @ts-ignore
    global.fetch = fetchMock;

    await PloomesService.cadastrarProposta({
      cidade: 'São Paulo',
      valorEmprestimo: 10000,
      valorImovel: 20000,
      parcelas: 36,
      tipoAmortizacao: 'PRICE',
      valorParcela: 500,
      nomeCompleto: 'John Doe',
      email: 'john@example.com',
      telefone: '11999999999',
      imovelProprio: 'proprio',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'camp',
      utm_term: 'term',
      utm_content: 'content',
      landing_page: 'https://example.com',
      referrer: 'https://referrer.com'
    });

    expect(fetchMock).toHaveBeenCalled();
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse((options as any).body);
    expect(body).toMatchObject({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'camp',
      utm_term: 'term',
      utm_content: 'content',
      landing_page: 'https://example.com',
      referrer: 'https://referrer.com'
    });

    const originLink = getOriginLink(body);
    expect(originLink).toContain('Origem: google / cpc');
    expect(originLink).toContain('Campanha: camp');
    expect(originLink).toContain('Grupo: term');
    expect(originLink).toContain('Anúncio: content');
    expect(originLink).toContain('landing_page: https://example.com');
    expect(originLink).toContain('referrer: https://referrer.com');
  });

  it('uses referrer as origin when there is no UTM and falls back to desconhecido', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: true, msg: '', retorno: { nomeCompleto: '', email: '' } })
    });
    // @ts-ignore
    global.fetch = fetchMock;

    await PloomesService.cadastrarProposta({
      cidade: 'São Paulo',
      valorEmprestimo: 10000,
      valorImovel: 20000,
      parcelas: 36,
      tipoAmortizacao: 'PRICE',
      valorParcela: 500,
      nomeCompleto: 'Jane Doe',
      email: 'jane@example.com',
      telefone: '11999999999',
      imovelProprio: 'proprio',
      referrer: 'instagram.com/'
    });

    const [, optionsWithReferrer] = fetchMock.mock.calls[0];
    const bodyWithReferrer = JSON.parse((optionsWithReferrer as any).body);
    expect(getOriginLink(bodyWithReferrer)).toContain('Origem: instagram.com/');

    fetchMock.mockClear();

    await PloomesService.cadastrarProposta({
      cidade: 'São Paulo',
      valorEmprestimo: 10000,
      valorImovel: 20000,
      parcelas: 36,
      tipoAmortizacao: 'PRICE',
      valorParcela: 500,
      nomeCompleto: 'No Origin',
      email: 'no-origin@example.com',
      telefone: '11999999999',
      imovelProprio: 'proprio'
    });

    const [, optionsNoReferrer] = fetchMock.mock.calls[0];
    const bodyNoReferrer = JSON.parse((optionsNoReferrer as any).body);
    const originLinkNoReferrer = getOriginLink(bodyNoReferrer);
    expect(originLinkNoReferrer).toContain('Origem: desconhecido');
    expect(originLinkNoReferrer).toContain('referrer: desconhecido');
  });
});
