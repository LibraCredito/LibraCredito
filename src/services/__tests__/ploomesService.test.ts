import { describe, it, expect, vi, afterEach } from 'vitest';
import PloomesService from '../ploomesService';
import { PLOOMES_ORIGIN_FIELD } from '@/utils/ploomesOriginLink';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const validProposal = {
  cidade: 'São Paulo',
  valorEmprestimo: 10000,
  valorImovel: 20000,
  parcelas: 36,
  tipoAmortizacao: 'PRICE',
  valorParcela: 500,
  nomeCompleto: 'John Doe',
  email: 'john@example.com',
  telefone: '11999999999',
  imovelProprio: 'proprio' as const,
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'camp',
  utm_term: 'term',
  utm_content: 'content',
  landing_page: 'https://example.com',
  referrer: 'https://referrer.com'
};

const mockSuccessfulFetch = () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: true, msg: '', retorno: { nomeCompleto: '', email: '' } })
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const getRequestBody = (fetchMock: ReturnType<typeof mockSuccessfulFetch>) => {
  const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(requestOptions?.body));
};

describe('PloomesService', () => {
  it('sends core payload and UTM params without custom fields by default', async () => {
    const fetchMock = mockSuccessfulFetch();

    await PloomesService.cadastrarProposta(validProposal);

    expect(fetchMock).toHaveBeenCalled();
    const body = getRequestBody(fetchMock);

    expect(body).toMatchObject({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'camp',
      utm_term: 'term',
      utm_content: 'content',
      landing_page: 'https://example.com',
      referrer: 'https://referrer.com'
    });

    expect(body['Link de origem']).toBeUndefined();
    expect(body['Link de origem \n']).toBeUndefined();
    expect(body.linkOrigem).toBeUndefined();
    expect(body.link_origem).toBeUndefined();
    expect(body.OtherProperties).toBeUndefined();
  });

  it('sends the Ploomes deal custom field for Link de origem when custom fields are enabled', async () => {
    vi.stubEnv('VITE_PLOOMES_ENABLE_CUSTOM_FIELDS', 'true');
    const fetchMock = mockSuccessfulFetch();

    await PloomesService.cadastrarProposta(validProposal);

    const body = getRequestBody(fetchMock);

    expect(body[PLOOMES_ORIGIN_FIELD.key]).toContain('Origem: google / cpc');
    expect(body.OtherProperties).toEqual([
      {
        FieldKey: PLOOMES_ORIGIN_FIELD.key,
        StringValue: body[PLOOMES_ORIGIN_FIELD.key]
      }
    ]);
  });
});
