import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@/services/localSimulationService', () => ({
  LocalSimulationService: {
    processContact: vi.fn().mockResolvedValue({ success: true, message: 'ok' })
  }
}));

const mockGetJourneyData = vi.fn();
vi.mock('@/hooks/useUserJourney', () => ({
  useUserJourney: () => ({
    sessionId: 'session123',
    visitorId: 'visitor123',
    getJourneyData: mockGetJourneyData
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => React.createElement('a', { href: to }, children)
  };
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactForm from '../ContactForm';
import { LocalSimulationService } from '@/services/localSimulationService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ContactForm', () => {

  it('forwards journey UTM params to LocalSimulationService.processContact', async () => {
    mockGetJourneyData.mockReturnValue({
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'camp',
      utm_term: 'term',
      utm_content: 'content',
      landing_page: 'https://example.com',
      referrer: 'https://referrer.com'
    });

    const simulationResult = {
      id: 'local_sim1',
      userJourneyId: 'supabase-123',
      valor: 1000,
      amortizacao: 'PRICE',
      parcelas: 12,
      valorEmprestimo: 50000,
      valorImovel: 100000,
      cidade: 'São Paulo'
    } as any;

    render(<ContactForm simulationResult={simulationResult} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '11999999999' } });
    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));

    await waitFor(() => {
      expect(LocalSimulationService.processContact).toHaveBeenCalledWith(
        expect.objectContaining({
          userJourneyId: 'supabase-123',
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'camp',
          utm_term: 'term',
          utm_content: 'content',
          landing_page: 'https://example.com',
          referrer: 'https://referrer.com',
          cidade: 'São Paulo'
        })
      );
    });
  });

  it('handles missing journey data and submits with null UTM fields', async () => {
    mockGetJourneyData.mockReturnValue(undefined);

    const simulationResult = {
      id: 'local_sim2',
      valor: 1000,
      amortizacao: 'PRICE',
      parcelas: 12,
      valorEmprestimo: 50000,
      valorImovel: 100000,
      cidade: 'São Paulo'
    } as any;

    render(<ContactForm simulationResult={simulationResult} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '11988888888' } });
    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));

    await waitFor(() => {
      expect(LocalSimulationService.processContact).toHaveBeenCalledWith(
        expect.objectContaining({
          utm_source: null,
          utm_medium: null,
          utm_campaign: null,
          utm_term: null,
          utm_content: null,
          landing_page: null,
          referrer: null,
          cidade: 'São Paulo'
        })
      );
    });
  });
});

