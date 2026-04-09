# Auditoria técnica — Página de Simulação, Webhooks e Automações

## Escopo revisado
- Fluxo de simulação (UI): `src/components/SimulationForm.tsx`
- Fluxo de conclusão/contato: `src/components/ContactForm.tsx`
- Regras de negócio + persistência: `src/services/localSimulationService.ts`
- Transporte de webhook: `src/services/webhookService.ts`

## Sintomas reportados
1. Lentidão ao simular.
2. Lentidão ao concluir.
3. Casos em que o webhook não chega.

## Principais achados

### 1) Latência no fechamento do lead (conclusão)
O método `LocalSimulationService.processContact` executava operações de rede síncronas em sequência e aguardava também o disparo de webhooks no mesmo fluxo da UX.

**Impacto:** o usuário podia perceber demora antes da navegação para confirmação, principalmente com APIs lentas/intermitentes.

### 2) Entrega de webhook com chance de perda silenciosa
Mesmo com retries em memória no `WebhookService`, falhas de webhook eram apenas logadas e não havia fila persistente dedicada para reentrega posterior.

**Impacto:** em falhas transitórias (timeout, 5xx, rede), havia risco de automação não ser acionada.

### 3) Estratégia de retry pouco seletiva
A lógica antiga repetia para qualquer erro HTTP, inclusive 4xx não transitório.

**Impacto:** retrabalho desnecessário, mais tempo de espera e sem ganho de confiabilidade real.

## Melhorias implementadas nesta revisão

1. **Disparo assíncrono de webhook (não bloqueante da UX)** no fluxo de simulação e de contato.
2. **Fila local de webhooks pendentes** (`localStorage`) com reprocessamento automático.
3. **Tentativas limitadas com descarte controlado** para evitar loops infinitos.
4. **Retry seletivo por status transitório** (408, 429, 5xx) no `WebhookService`.
5. **Timeout/retries mais agressivos para responsividade** (redução de timeout padrão e retries).
6. **`keepalive` no fetch** para melhorar chance de envio em navegação/troca de rota.

## Próximos passos recomendados (arquitetura)

1. **Mover automações para backend/edge function**: o front deveria apenas gravar evento e retornar rápido.
2. **Implementar fila server-side (DLQ + retries exponenciais)** para garantir entrega “at least once”.
3. **Idempotência no receptor do webhook** usando `eventId` para evitar duplicidade.
4. **Observabilidade mínima**: taxa de sucesso por webhook, tempo de processamento e alertas por falha.
5. **SLA por etapa**: separar SLA de UX (rápido) do SLA de automação (eventual, confiável).

## Resultado esperado com as mudanças atuais
- Menor tempo percebido na conclusão.
- Menor chance de perda definitiva de webhook em falhas transitórias.
- Retentativas mais inteligentes e menos custosas.

> Observação: “nunca falhar” exige processamento robusto no backend. No front-end, só é possível reduzir bastante o risco, não eliminá-lo completamente.
