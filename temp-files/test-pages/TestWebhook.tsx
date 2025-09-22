/**
 * Página de teste para webhook
 * 
 * @component TestWebhook
 * @description Permite testar a funcionalidade de webhook e visualizar os dados que serão enviados
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPrimaryWebhookUrl } from '@/lib/env';
import { WebhookService, WebhookResult } from '@/services/webhookService';
import MobileLayout from '@/components/MobileLayout';

const TestWebhook: React.FC = () => {
  const defaultWebhookUrl = getPrimaryWebhookUrl() || '';
  const [webhookUrl, setWebhookUrl] = useState(defaultWebhookUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WebhookResult | null>(null);
  const [customData, setCustomData] = useState({
    nomeCompleto: 'João Silva (Teste)',
    email: 'joao.teste@exemplo.com',
    telefone: '(11) 99999-9999',
    cidade: 'São Paulo',
    valorEmprestimo: 250000,
    valorImovel: 500000,
    parcelas: 120,
    tipoAmortizacao: 'SAC',
    valorParcela: 3500
  });

  const handleTest = async () => {
    if (!webhookUrl) {
      alert('Por favor, insira a URL do webhook');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const testResult = await WebhookService.testWebhook(webhookUrl);
      setResult(testResult);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        attempt: 1
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTest = async () => {
    if (!webhookUrl) {
      alert('Por favor, insira a URL do webhook');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        simulationId: 'custom-test-' + Date.now(),
        sessionId: 'custom-session-' + Date.now(),
        ...customData
      };

      const testResult = await WebhookService.sendSimulationData(payload, { url: webhookUrl });
      setResult(testResult);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        attempt: 1
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              🪝 Teste de Webhook
            </CardTitle>
            <p className="text-center text-gray-600">
              Ferramenta para testar o envio de dados para webhooks externos
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Configuração da URL */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                URL do Webhook
              </label>
              <Input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-webhook.com/api/endpoint"
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                {defaultWebhookUrl ?
                  `URL padrão: ${defaultWebhookUrl}` :
                  'Nenhuma URL configurada no .env'
                }
              </p>
            </div>

            {/* Teste Básico */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Teste Básico</h3>
              <Button 
                onClick={handleTest}
                disabled={loading || !webhookUrl}
                className="w-full"
              >
                {loading ? 'Testando...' : 'Testar Conectividade'}
              </Button>
            </div>

            {/* Teste Personalizado */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Teste com Dados Personalizados</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <Input
                    value={customData.nomeCompleto}
                    onChange={(e) => setCustomData({...customData, nomeCompleto: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={customData.email}
                    onChange={(e) => setCustomData({...customData, email: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <Input
                    value={customData.telefone}
                    onChange={(e) => setCustomData({...customData, telefone: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <Input
                    value={customData.cidade}
                    onChange={(e) => setCustomData({...customData, cidade: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Empréstimo
                  </label>
                  <Input
                    type="number"
                    value={customData.valorEmprestimo}
                    onChange={(e) => setCustomData({...customData, valorEmprestimo: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Imóvel
                  </label>
                  <Input
                    type="number"
                    value={customData.valorImovel}
                    onChange={(e) => setCustomData({...customData, valorImovel: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleCustomTest}
                disabled={loading || !webhookUrl}
                className="w-full"
                variant="outline"
              >
                {loading ? 'Enviando...' : 'Enviar Dados Personalizados'}
              </Button>
            </div>

            {/* Resultado */}
            {result && (
              <Card className={`${result.success ? 'border-green-500' : 'border-red-500'}`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? '✅' : '❌'}
                    {result.success ? 'Sucesso' : 'Falha'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><strong>Timestamp:</strong> {result.timestamp}</div>
                    <div><strong>Tentativa:</strong> {result.attempt}</div>
                    {result.statusCode && (
                      <div><strong>Status Code:</strong> {result.statusCode}</div>
                    )}
                    <div><strong>Mensagem:</strong> {result.message}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documentação */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-800">📖 Como Usar</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-700 space-y-2">
                <p><strong>1.</strong> Configure a URL do webhook no campo acima</p>
                <p><strong>2.</strong> Use "Testar Conectividade" para verificar se o endpoint responde</p>
                <p><strong>3.</strong> Use "Enviar Dados Personalizados" para testar com dados específicos</p>
                <p><strong>4.</strong> O webhook receberá dados completos da simulação no formato JSON</p>
                <p><strong>5.</strong> Configure a URL permanente no arquivo .env como VITE_WEBHOOK_URL</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default TestWebhook;