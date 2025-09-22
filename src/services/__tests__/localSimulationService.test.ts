import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SIMULATION_PLACEHOLDER_EMAIL,
  SIMULATION_PLACEHOLDER_NAME,
  SIMULATION_PLACEHOLDER_PHONE
} from '@/constants/simulationPlaceholders';

// Mock supabase module before importing the service
const supabaseMock = { from: vi.fn() } as any;
const supabaseApiMock = {
  createUserJourneySimulacao: vi.fn(),
  updateSimulacaoStatus: vi.fn(),
  getSimulacoes: vi.fn(),
  getUserJourneysByVisitorIds: vi.fn(),
  getUserJourneysBySessionIds: vi.fn()
};
vi.mock('@/lib/supabase', () => ({ supabase: supabaseMock, supabaseApi: supabaseApiMock }));

const validateCityMock = vi.fn(async (city: string) => ({
  found: true,
  status: 'success' as const,
  allowCalculation: true,
  city,
  ltv: 50,
  message: 'OK'
}));
const validateLtvMock = vi.fn(async () => ({ valid: true, message: 'OK' }));
vi.mock('@/utils/cityLtvService', () => ({
  validateCity: validateCityMock,
  validateLTV: validateLtvMock
}));

const validateLoanParametersMock = vi.fn(() => ({ valid: true }));
const getInterestRateMock = vi.fn(() => 0.01);
const calculateLoanMock = vi.fn(() => ({
  parcelaSac: { inicial: 1500, final: 800 },
  parcelaPrice: 1200,
  valorTotal: { sac: 0, price: 0 },
  jurosTotal: { sac: 0, price: 0 },
  taxaJurosEfetiva: 0.01
}));
vi.mock('@/utils/loanCalculator', () => ({
  validateLoanParameters: validateLoanParametersMock,
  getInterestRate: getInterestRateMock,
  calculateLoan: calculateLoanMock
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
    vi.clearAllMocks();
    supabaseMock.from.mockReset();
    supabaseApiMock.createUserJourneySimulacao.mockReset();
    supabaseApiMock.updateSimulacaoStatus.mockReset();
    supabaseApiMock.getSimulacoes.mockReset();
    supabaseApiMock.getUserJourneysByVisitorIds.mockReset();
    supabaseApiMock.getUserJourneysBySessionIds.mockReset();
    validateCityMock.mockClear();
    validateLtvMock.mockClear();
    validateLoanParametersMock.mockClear();
    getInterestRateMock.mockClear();
    calculateLoanMock.mockClear();
    (global as any).localStorage = new LocalStorageMock();
    (global as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
      status: 200,
      statusText: 'OK',
      headers: { entries: () => [] }
    }));
    process.env.VITE_ALERT_WEBHOOK_URL = 'https://alert.test';
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('não cria registros no Supabase quando dados de contato são placeholders', async () => {
    const { LocalSimulationService } = await import('../localSimulationService');

    const result = await LocalSimulationService.performSimulation({
      sessionId: 'session-placeholder',
      visitorId: 'visitor-placeholder',
      nomeCompleto: SIMULATION_PLACEHOLDER_NAME,
      email: SIMULATION_PLACEHOLDER_EMAIL,
      telefone: SIMULATION_PLACEHOLDER_PHONE,
      cidade: 'São Paulo - SP',
      valorEmprestimo: 200000,
      valorImovel: 500000,
      parcelas: 120,
      tipoAmortizacao: 'PRICE',
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
      isRuralProperty: false
    });

    expect(result).toBeDefined();
    expect(supabaseApiMock.createUserJourneySimulacao).not.toHaveBeenCalled();
  });

  it('salva simulação no Supabase quando dados válidos são fornecidos', async () => {
    supabaseApiMock.createUserJourneySimulacao.mockResolvedValue({ id: 'supabase-123' });

    const { LocalSimulationService } = await import('../localSimulationService');

    const result = await LocalSimulationService.performSimulation({
      sessionId: 'session-valid',
      visitorId: 'visitor-valid',
      nomeCompleto: 'Maria Silva',
      email: 'maria@example.com',
      telefone: '11987654321',
      cidade: 'Rio de Janeiro - RJ',
      valorEmprestimo: 250000,
      valorImovel: 600000,
      parcelas: 180,
      tipoAmortizacao: 'SAC',
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
      isRuralProperty: false
    });

    expect(supabaseApiMock.createUserJourneySimulacao).toHaveBeenCalledTimes(1);
    expect(supabaseApiMock.createUserJourneySimulacao).toHaveBeenCalledWith(expect.objectContaining({
      nome_completo: 'Maria Silva',
      email: 'maria@example.com',
      telefone: '11987654321'
    }));
    expect(result.id).toBe('supabase-123');
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
});
