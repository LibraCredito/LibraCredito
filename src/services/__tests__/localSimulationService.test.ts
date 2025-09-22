import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase module before importing the service
const supabaseMock = { from: vi.fn() } as any;
vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock, supabaseApi: {} }));

// Simple in-memory localStorage mock
class LocalStorageMock {
  private store: Record<string, string> = {};
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
}

describe('LocalSimulationService', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
    (global as any).localStorage = new LocalStorageMock();
    (global as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
      status: 200,
      statusText: 'OK',
      headers: { entries: () => [] }
    }));
    vi.stubEnv('VITE_ALERT_WEBHOOK_URL', 'https://alert.test');
  });

  afterEach(() => {
    delete (global as any).fetch;
    vi.unstubAllEnvs();
  });

  it('salva contato local e envia alerta quando atualização no Supabase falha', async () => {
    let call = 0;
    supabaseMock.from.mockImplementation(() => {
      call++;
      if (call === 1) {
        // Busca inicial da simulação
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: '123', cidade: 'Cidade', valor_emprestimo: 1000, valor_imovel: 2000, parcelas: 36, tipo_amortizacao: 'PRICE', parcela_inicial: 100, parcela_final: 100 },
                error: null
              })
            })
          })
        };
      }
      if (call % 2 === 0) {
        // Busca para atualização em cada tentativa
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: '123', nome_completo: 'Old', email: 'old@example.com', telefone: '11999999999', imovel_proprio: 'proprio', status: 'novo', visitor_id: 'visit1' },
                error: null
              })
            })
          })
        };
      }
      // Atualização que falha
      return {
        update: () => ({
          eq: () => ({
            select: async () => ({
              data: null,
              error: { message: 'update failed', code: '500', details: '', hint: '' }
            })
          })
        })
      };
    });

    const { LocalSimulationService } = await import('../localSimulationService');

    const input = {
      simulationId: '123',
      sessionId: 'sess1',
      visitorId: 'visit1',
      nomeCompleto: 'John Doe',
      email: 'john@example.com',
      telefone: '11999999999',
      cidade: 'Cidade',
      imovelProprio: 'proprio' as const,
      valorDesejadoEmprestimo: 1000,
      valorImovelGarantia: 2000,
      quantidadeParcelas: 36,
      tipoAmortizacao: 'PRICE',
      valorParcelaCalculada: 100,
      aceitaPolitica: true
    };

    await expect(LocalSimulationService.processContact(input)).rejects.toThrow();
    const stored = JSON.parse(localStorage.getItem('libra_local_contacts') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].simulationId).toBe('123');
    const fetchCalls = (global as any).fetch.mock.calls.map((c: any[]) => c[0]);
    expect(fetchCalls).toContain('https://alert.test');
  });

  it('cria registro no Supabase quando recebe ID local sem correspondência', async () => {
    const inserted: any[] = [];

    supabaseMock.from.mockImplementation((table: string) => {
      if (table !== 'simulacoes') {
        throw new Error(`Unexpected table ${table}`);
      }

      const createOrderResult = () => {
        const response = { data: [] as any[], error: null };
        const orderResult: any = {};
        orderResult.limit = async () => response;
        orderResult.then = (resolve: any) => resolve(response);
        orderResult.catch = () => orderResult;
        orderResult.finally = () => orderResult;
        return orderResult;
      };

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => createOrderResult()),
            single: vi.fn(async () => ({ data: null, error: null }))
          }))
        })),
        insert: vi.fn((data: any) => {
          inserted.push(data);
          return {
            select: async () => ({ data: [{ id: 'supabase-id', ...data }], error: null })
          };
        }),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: async () => ({ data: [{ id: 'supabase-id' }], error: null })
          }))
        }))
      };
    });

    const { LocalSimulationService } = await import('../localSimulationService');

    localStorage.setItem('libra_local_simulations', JSON.stringify([
      {
        id: 'local_abc',
        valor: 100,
        amortizacao: 'PRICE',
        parcelas: 36,
        primeiraParcela: 100,
        ultimaParcela: 80,
        valorEmprestimo: 1000,
        valorImovel: 2000,
        cidade: 'Cidade'
      }
    ]));

    const input = {
      simulationId: 'local_abc',
      sessionId: 'sess1',
      visitorId: 'visit1',
      nomeCompleto: 'John Local',
      email: 'john@example.com',
      telefone: '11999999999',
      cidade: 'Cidade',
      imovelProprio: 'proprio' as const,
      valorDesejadoEmprestimo: 1000,
      valorImovelGarantia: 2000,
      quantidadeParcelas: 36,
      tipoAmortizacao: 'PRICE',
      valorParcelaCalculada: 100,
      aceitaPolitica: true
    };

    const result = await LocalSimulationService.processContact(input);

    expect(result.success).toBe(true);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      session_id: 'sess1',
      visitor_id: 'visit1',
      cidade: 'Cidade',
      valor_emprestimo: 1000,
      valor_imovel: 2000
    });
  });
});
