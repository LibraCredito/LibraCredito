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

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContactForm from '../ContactForm';
import { LocalSimulationService } from '@/services/localSimulationService';

beforeEach(() => {
  vi.clearAllMocks();
});

const confirmPhoneDialog = async () => {
  await screen.findByRole('dialog');
  const confirmButton = await screen.findByRole('button', { name: /confirmar telefone/i });
  await act(async () => {
    fireEvent.click(confirmButton);
  });
};

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
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '35999625948' } });
    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));
    await confirmPhoneDialog();

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
          cidade: 'São Paulo',
          telefone: '3599625948'
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
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '5535999625948' } });
    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));
    await confirmPhoneDialog();

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
          cidade: 'São Paulo',
          telefone: '3599625948'
        })
      );
    });
  });

  it('sanitizes phone numbers with DDI 55 and informs the user', async () => {
    mockGetJourneyData.mockReturnValue(undefined);

    const simulationResult = {
      id: 'local_sim3',
      valor: 1000,
      amortizacao: 'PRICE',
      parcelas: 12,
      valorEmprestimo: 50000,
      valorImovel: 100000,
      cidade: 'São Paulo'
    } as any;

    render(<ContactForm simulationResult={simulationResult} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Maria Silva' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'maria@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '5511999999999' } });

    expect(screen.getByText('Removemos o DDI internacional (por exemplo, +55) do número informado.')).toBeInTheDocument();
    expect(screen.getByText('Padronizamos o telefone para DDD + 8 dígitos, mantendo apenas os oito últimos dígitos informados.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));
    await confirmPhoneDialog();

    await waitFor(() => {
      expect(LocalSimulationService.processContact).toHaveBeenCalledWith(
        expect.objectContaining({ telefone: '1199999999' })
      );
    });
  });

  it('keeps DDD 55 numbers without international prefix untouched', async () => {
    mockGetJourneyData.mockReturnValue(undefined);

    const simulationResult = {
      id: 'local_sim-ddd55',
      valor: 1000,
      amortizacao: 'PRICE',
      parcelas: 12,
      valorEmprestimo: 50000,
      valorImovel: 100000,
      cidade: 'São Paulo'
    } as any;

    render(<ContactForm simulationResult={simulationResult} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Rafael Costa' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'rafael@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '55987654321' } });

    expect(
      screen.queryByText('Removemos o DDI internacional (por exemplo, +55) do número informado.')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Padronizamos o telefone para DDD + 8 dígitos, mantendo apenas os oito últimos dígitos informados.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));
    await confirmPhoneDialog();

    await waitFor(() => {
      expect(LocalSimulationService.processContact).toHaveBeenCalledWith(
        expect.objectContaining({ telefone: '5587654321' })
      );
    });
  });

  it('trims numbers longer than DDD + 8 dígitos and warns the user', async () => {
    mockGetJourneyData.mockReturnValue(undefined);

    const simulationResult = {
      id: 'local_sim4',
      valor: 1000,
      amortizacao: 'PRICE',
      parcelas: 12,
      valorEmprestimo: 50000,
      valorImovel: 100000,
      cidade: 'São Paulo'
    } as any;

    render(<ContactForm simulationResult={simulationResult} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Carlos Souza' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'carlos@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '35999625948' } });

    expect(screen.getByText('Padronizamos o telefone para DDD + 8 dígitos, mantendo apenas os oito últimos dígitos informados.')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));
    await confirmPhoneDialog();

    await waitFor(() => {
      expect(LocalSimulationService.processContact).toHaveBeenCalledWith(
        expect.objectContaining({ telefone: '3599625948' })
      );
    });
  });

  it.each([
    '+5535999625948',
    '+55 (35) 9 9962-5948',
    '+55 35 99962 5948',
    '55 (35) 99962 5948',
    '(35) 99962-5948',
    '3599625948'
  ])('normalizes "%s" to DDD + 8 digits before submitting', async (inputVariant) => {
    mockGetJourneyData.mockReturnValue(undefined);

    const simulationResult = {
      id: 'local_sim-variants',
      valor: 1000,
      amortizacao: 'PRICE',
      parcelas: 12,
      valorEmprestimo: 50000,
      valorImovel: 100000,
      cidade: 'São Paulo'
    } as any;

    render(<ContactForm simulationResult={simulationResult} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Paula Gomes' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'paula@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: inputVariant } });
    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));
    await confirmPhoneDialog();

    await waitFor(() => {
      expect(LocalSimulationService.processContact).toHaveBeenCalledWith(
        expect.objectContaining({ telefone: '3599625948' })
      );
    });
  });

  it('keeps already valid phone numbers unchanged without warnings', async () => {
    mockGetJourneyData.mockReturnValue(undefined);

    const simulationResult = {
      id: 'local_sim5',
      valor: 1000,
      amortizacao: 'PRICE',
      parcelas: 12,
      valorEmprestimo: 50000,
      valorImovel: 100000,
      cidade: 'São Paulo'
    } as any;

    render(<ContactForm simulationResult={simulationResult} />);

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Ana Lima' } });
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '3599625948' } });

    expect(screen.queryByText('Removemos o DDI internacional (por exemplo, +55) do número informado.')).not.toBeInTheDocument();
    expect(screen.queryByText('Padronizamos o telefone para DDD + 8 dígitos, mantendo apenas os oito últimos dígitos informados.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Imóvel Próprio/i));
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /Solicitar análise agora/i }));
    await confirmPhoneDialog();

    await waitFor(() => {
      expect(LocalSimulationService.processContact).toHaveBeenCalledWith(
        expect.objectContaining({ telefone: '3599625948' })
      );
    });
  });
});

