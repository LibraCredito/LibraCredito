import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase module before importing the service
const supabaseMock = { from: vi.fn() } as any;
vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock, supabaseApi: {} }));

const sendSimulationDataMock = vi.fn();
vi.mock('@/services/webhookService', () => ({
  WebhookService: {
    sendSimulationData: sendSimulationDataMock
  }
}));

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
    sendSimulationDataMock.mockReset();
    (global as any).localStorage = new LocalStorageMock();
    (global as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
      status: 200,
      statusText: 'OK',
      headers: { entries: () => [] }
    }));
    process.env.VITE_ALERT_WEBHOOK_URL = 'https://alert.test';
    delete process.env.VITE_WEBHOOK_URL;
    delete process.env.VITE_WEBHOOK_SECONDARY_URL;
  });

  afterEach(() => {
    delete (global as any).fetch;
    delete process.env.VITE_WEBHOOK_URL;
    delete process.env.VITE_WEBHOOK_SECONDARY_URL;
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
    expect(sendSimulationDataMock).not.toHaveBeenCalled();
  });

  it('envia dados para webhooks configurados após contato bem-sucedido', async () => {
    const simulationRecord = {
      id: 'supabase-123',
      session_id: 'sess1',
      cidade: 'São Paulo',
      valor_emprestimo: 150000,
      valor_imovel: 300000,
      parcelas: 180,
      tipo_amortizacao: 'PRICE',
      parcela_inicial: 2500,
      parcela_final: 2500,
      status: 'novo',
      user_agent: 'Agent',
      ip_address: '127.0.0.1'
    } as const;

    supabaseMock.from
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: simulationRecord, error: null })
          })
        })
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: simulationRecord, error: null })
          })
        })
      }))
      .mockImplementationOnce(() => ({
        update: () => ({
          eq: () => ({
            select: async () => ({
              data: [
                {
                  ...simulationRecord,
                  nome_completo: 'John Doe',
                  email: 'john@example.com',
                  telefone: '11999999999',
                  imovel_proprio: 'proprio',
                  status: 'interessado'
                }
              ],
              error: null
            })
          })
        })
      }));

    sendSimulationDataMock
      .mockResolvedValueOnce({ success: true, timestamp: new Date().toISOString(), attempt: 1 })
      .mockResolvedValueOnce({ success: true, timestamp: new Date().toISOString(), attempt: 1 });

    process.env.VITE_WEBHOOK_URL = 'https://primary.test';
    process.env.VITE_WEBHOOK_SECONDARY_URL = 'https://secondary.test';

    const { LocalSimulationService } = await import('../localSimulationService');

    const input = {
      simulationId: 'supabase-123',
      sessionId: 'sess1',
      visitorId: 'visit1',
      nomeCompleto: 'John Doe',
      email: 'john@example.com',
      telefone: '11999999999',
      cidade: 'São Paulo',
      imovelProprio: 'proprio' as const,
      valorDesejadoEmprestimo: 150000,
      valorImovelGarantia: 300000,
      quantidadeParcelas: 180,
      tipoAmortizacao: 'PRICE',
      valorParcelaCalculada: 2500,
      aceitaPolitica: true
    };

    const result = await LocalSimulationService.processContact(input);

    expect(result).toEqual({
      success: true,
      message: 'Dados enviados com sucesso! Nossa equipe entrará em contato em breve.'
    });

    expect(sendSimulationDataMock).toHaveBeenCalledTimes(2);
    const [primaryCall, secondaryCall] = sendSimulationDataMock.mock.calls;

    expect(primaryCall[0]).toMatchObject({
      simulationId: 'supabase-123',
      sessionId: 'sess1',
      nomeCompleto: 'John Doe',
      email: 'john@example.com',
      telefone: '11999999999',
      cidade: 'São Paulo',
      imovelProprio: 'proprio',
      valorEmprestimo: 150000,
      valorImovel: 300000,
      parcelas: 180,
      tipoAmortizacao: 'PRICE',
      valorParcela: 2500,
      primeiraParcela: 2500,
      ultimaParcela: 2500,
      status: 'interessado'
    });
    expect(primaryCall[1]).toBeUndefined();

    expect(secondaryCall[0]).toMatchObject({ simulationId: 'supabase-123' });
    expect(secondaryCall[1]).toEqual({ url: 'https://secondary.test' });
  });
});
