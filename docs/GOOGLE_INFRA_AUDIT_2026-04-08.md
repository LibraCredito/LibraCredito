# Auditoria de Infraestrutura Google (Projeto atual)

**Data da auditoria:** 2026-04-08  
**Escopo:** validação do que está implementado no código do site atual para Google Tag Manager, Google Analytics e componentes relacionados de tracking.

## Resumo executivo

- O projeto **já carrega Google Tag Manager (GTM)** no HTML principal com o container `GTM-K4FVVD8`.
- Há um segundo HTML utilitário (`clear-localstorage.html`) que também injeta o mesmo GTM.
- **Não há implementação explícita de GA4 via `gtag.js`** no frontend atual.
- Existe variável de ambiente `VITE_GA_TRACKING_ID`, mas ela está apenas documentada e **não é utilizada no código**.
- O projeto usa **Vercel Analytics** em produção (cliente e SSR), em paralelo ao GTM.
- Também existe **Meta Pixel** hardcoded no `index.html`.

## Evidências no código

## 1) Google Tag Manager (GTM)

### Site principal
- Injeção do script GTM no `index.html`.
- Container atual no código: `GTM-K4FVVD8`.
- Inclusão de `<noscript><iframe ...>` para GTM.

### Página utilitária de limpeza
- `clear-localstorage.html` também injeta GTM com o mesmo container `GTM-K4FVVD8`.

## 2) Google Analytics (GA4)

### Estado atual encontrado
- Não existe snippet `gtag('config', 'G-...')` no HTML principal.
- Não foi encontrada integração direta de GA4 via código React.
- Existe variável `VITE_GA_TRACKING_ID` em `.env` e `.env.example`, mas sem uso ativo no app.
- O README sinaliza GA4 como item futuro/pendente.

**Conclusão prática:** no estado atual, GA4 só estará ativo se estiver configurado **dentro do container GTM** publicado em `GTM-K4FVVD8`.

## 3) Outros trackers relacionados

- **Vercel Analytics** está habilitado no app em produção (carregamento dinâmico no cliente) e renderizado também no SSR.
- **Meta Pixel** é carregado no `index.html` com `fbq('init', '763158836667720')`.


## Atualização com evidência do GTM (prints do time)

Com base nos prints enviados após a primeira versão da auditoria:

- O GTM mostra status **Urgente** com alerta de que a **tag parou de enviar dados nas últimas 48h**.
- O diagnóstico também aponta **"Tags do Google ausentes"** no container.
- Na lista de tags, há itens antigos (última edição de 1 a 3 anos) e não há sinal de operação ativa alinhada ao site novo.

**Interpretação:** isso confirma que, embora o snippet do container exista no código do site, o container publicado não está devidamente configurado para medir o site atual.

## Conclusão revisada

- O problema principal **não é ausência de snippet no código** (ele existe), e sim **container GTM desatualizado/incompleto para o novo site**.
- A transição correta precisa incluir não só o deploy do código, mas também a migração/publicação operacional no GTM/GA4.

## Plano de correção imediata (72h)

1. **Criar uma tag "Google tag" (GA4 Configuration)** no GTM para o Measurement ID oficial do site novo.
2. Disparar em **All Pages** e publicar uma nova versão do container.
3. Em seguida, recriar/validar eventos críticos:
   - `page_view`
   - geração de lead (envio de formulário)
   - início/finalização da simulação
4. Validar em sequência:
   - GTM Preview (web)
   - Tag Assistant
   - GA4 DebugView
   - Realtime GA4
5. Registrar versão de rollback do container antes da publicação.

## Checklist objetivo para agora

- [ ] Confirmar o Measurement ID GA4 oficial (formato `G-XXXXXXXXXX`).
- [ ] Garantir presença de **Google tag** ativa no container publicado.
- [ ] Revisar gatilhos quebrados/legados (tags sem disparo recente).
- [ ] Publicar versão nova do container com changelog.
- [ ] Testar no domínio de produção do site novo.
- [ ] Confirmar recebimento em tempo real no GA4.

## Lacunas e riscos de transição

1. **Dependência de configuração fora do repositório (GTM/GA no Google):** o código sozinho não garante que tags, triggers e consentimento tenham sido migrados.
2. **Ausência de parametrização de GTM por ambiente:** container está hardcoded no HTML.
3. **GA Tracking ID não conectado ao runtime:** risco de falsa sensação de configuração.
4. **Consentimento LGPD/Cookie Mode:** não há evidência no bootstrap atual de `Consent Mode` do Google antes do disparo das tags.
5. **Múltiplas fontes de analytics (GTM + Vercel + Pixel):** sem matriz clara de ownership, há risco de duplicidade/inconsistência de eventos.

## Plano recomendado para transição correta (GTM/GA)

## Fase 1 — Inventário e comparação

1. Levantar no **Google Tag Manager (container antigo e novo)**:
   - Tags
   - Triggers
   - Variables
   - Templates
   - Environments
   - Workspaces/publicações
2. Levantar no **GA4**:
   - Data Streams
   - Enhanced Measurement
   - Eventos customizados
   - Conversões
   - Audiences
   - Vinculações (Ads/Search Console/BigQuery)
3. Criar matriz “**Antigo vs Atual**” por item.

## Fase 2 — Implementação técnica no projeto

1. Externalizar IDs para variáveis de ambiente:
   - `VITE_GTM_ID`
   - `VITE_META_PIXEL_ID`
   - (opcional) `VITE_GA_TRACKING_ID` se decidirem manter fallback por `gtag`.
2. Remover hardcode de IDs no HTML.
3. Definir estratégia única de tracking de página/eventos (evitar duplicação entre GTM e bibliotecas paralelas).
4. Implementar consentimento (LGPD) **antes** de carregar tags de marketing/analytics.

## Fase 3 — Validação pós-cutover

1. Testar em ambiente de staging com GTM Preview.
2. Validar `page_view` e eventos críticos (lead, envio de formulário, clique CTA, simulação iniciada/finalizada).
3. Confirmar deduplicação em GA4 DebugView e em relatórios de tempo real.
4. Publicar container e manter plano de rollback (versão anterior do container).

## Checklist operacional (curto prazo)

- [ ] Confirmar qual container GTM oficial deve ficar no ar para o novo domínio/site.
- [ ] Auditar se esse container contém tag GA4 e conversões esperadas.
- [ ] Definir mapa de eventos canônico (nome, parâmetros e origem).
- [ ] Parametrizar IDs por ambiente no projeto.
- [ ] Configurar consentimento e revisão legal LGPD.
- [ ] Executar QA de tracking em staging e produção.

## Observação importante

Esta auditoria valida apenas o que está no **código do repositório**. A confirmação final de migração correta da infraestrutura Google depende também de acesso ao **Google Tag Manager**, **Google Analytics 4**, **Google Ads** e (se aplicável) **Search Console/BigQuery**.
