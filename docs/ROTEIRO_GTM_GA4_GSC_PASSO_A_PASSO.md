# Roteiro passo a passo — GTM + Google Analytics 4 + Google Search Console

**Objetivo:** deixar o site novo 100% rastreável (tráfego, conversão e SEO técnico) com governança clara.  
**Data:** 2026-04-08.

---

## Visão geral do que você vai concluir

Ao final deste roteiro, você terá:

1. **GTM ativo e publicado** no container correto do site novo.
2. **GA4 recebendo dados em tempo real** (`page_view` + eventos de negócio).
3. **Search Console validado**, com sitemap enviado e cobertura indexável monitorada.
4. **Checklist de QA/produção** para evitar perda de dados e eventos duplicados.

---

## Fase 0 — Preparação (30–60 min)

## 0.1 Defina os responsáveis

- Responsável técnico (site/código)
- Responsável mídia/performance (GTM/GA4)
- Responsável SEO (GSC)

## 0.2 Levante os IDs oficiais

- **GTM Container ID** (formato `GTM-XXXXXXX`)
- **GA4 Measurement ID** (formato `G-XXXXXXXXXX`)
- Domínio canônico do site (ex.: `https://www.seudominio.com.br`)

## 0.3 Congele baseline

- Exportar versão atual do container GTM.
- Criar anotação de data de migração no GA4.
- Salvar prints do estado atual (GTM diagnóstico, GA4 tempo real, GSC cobertura).

---

## Fase 1 — Corrigir GTM (prioridade máxima)

## 1.1 Confirme o snippet no código

No projeto atual, o snippet GTM já está no `index.html` e no `clear-localstorage.html` com `GTM-K4FVVD8` hardcoded.  
Se esse não for o container oficial do site novo, troque imediatamente pelo ID correto.

## 1.2 Criar base mínima no GTM (workspace novo)

No GTM:

1. Crie um **Workspace** chamado `migracao-site-novo-2026-04-08`.
2. Crie a tag **Google tag** (tipo “Google tag”) com o Measurement ID do GA4.
3. Trigger: **All Pages**.
4. Publique uma versão com descrição clara.

## 1.3 Garantir eventos essenciais (MVP)

Criar no GTM (ou via dataLayer + GTM):

- `page_view` (normalmente automático na Google tag/GA4)
- `generate_lead` (envio de formulário)
- `begin_checkout` ou `start_simulation` (início da simulação)
- `submit_simulation` ou `complete_simulation` (fim da simulação)
- `click_cta` (cliques em CTA críticos)

> Padrão recomendado: nomes em inglês/snake_case e parâmetros consistentes.

## 1.4 Configurar variáveis e gatilhos

- Variáveis UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`)
- Page URL, Path, Hostname
- Form ID / botão CTA / seletor de elemento
- Gatilhos para páginas-chave: `/`, `/simulacao`, `/sucesso`, `/confirmacao`

---

## Fase 2 — GA4 (coleta e conversões)

## 2.1 Ajustes de stream web

No GA4 > Admin > Data Streams > Web:

- Ativar Enhanced Measurement (page views, scroll, outbound click etc.)
- Configurar domínios válidos
- Garantir exclusões de referência quando necessário

## 2.2 Validar recebimento

Use nesta ordem:

1. GTM Preview
2. Tag Assistant
3. GA4 DebugView
4. GA4 Realtime

Critério de sucesso mínimo:

- `page_view` chegando em tempo real
- pelo menos 1 evento de lead/simulação disparando corretamente

## 2.3 Marcar conversões

No GA4:

- Marcar como conversão os eventos de negócio (ex.: `generate_lead`, `complete_simulation`)
- Validar parâmetros úteis (`page_location`, `utm_*`, `session_id`, `form_name`)

## 2.4 Governança de eventos

Documentar em planilha/Notion:

- Evento
- Quando dispara
- Trigger GTM
- Parâmetros
- Destino (GA4, Ads, outros)
- Dono do evento

---

## Fase 3 — Search Console (indexação e saúde SEO)

## 3.1 Criar/validar propriedade

No Google Search Console:

1. Preferir propriedade **Domínio** (DNS) quando possível.
2. Se necessário, adicionar propriedade **URL Prefix** (`https://www...`).

## 3.2 Verificação

Métodos (ordem preferida):

1. DNS TXT
2. Tag HTML
3. Google Tag Manager

## 3.3 Sitemap e cobertura

1. Enviar sitemap (ex.: `/sitemap.xml`).
2. Verificar robots.txt.
3. Acompanhar cobertura: páginas válidas, excluídas e com erro.

## 3.4 Inspeção de URL

- Testar homepage, páginas de simulação, blog e páginas institucionais.
- Solicitar indexação para páginas estratégicas.

---

## Fase 4 — Consentimento (LGPD) e qualidade

## 4.1 Consent Mode

Implementar Consent Mode antes dos disparos de marketing/analytics não essenciais.

## 4.2 Banner e preferências

- Banner com categorias (necessário, analytics, marketing)
- Registro de escolha do usuário
- Possibilidade de alteração/revogação

## 4.3 QA de privacidade

- Sem cookies de marketing antes de consentimento
- Com consentimento, eventos críticos devem disparar

---

## Fase 5 — Publicação segura

## 5.1 Checklist pré-publicação

- [ ] Container GTM correto no site
- [ ] Google tag ativa em All Pages
- [ ] Eventos críticos testados em DebugView
- [ ] Conversões marcadas no GA4
- [ ] GSC verificado + sitemap enviado
- [ ] Plano de rollback pronto

## 5.2 Janela de monitoramento

Primeiras 48h:

- Realtime GA4 (tráfego e conversão)
- Diagnóstico de container GTM
- Cobertura/erros no GSC

---

## Plano rápido de execução (se quiser fazer hoje)

1. Corrigir container GTM e publicar Google tag (All Pages).  
2. Validar `page_view` no GA4 Realtime/DebugView.  
3. Criar e validar `generate_lead` + `complete_simulation`.  
4. Marcar conversões no GA4.  
5. Validar Search Console + enviar sitemap.  
6. Abrir monitoramento 48h com checklist diário.

---

## Entregáveis finais esperados

- Versão GTM publicada com changelog.
- GA4 com eventos e conversões funcionando.
- Search Console validado e sitemap processando.
- Documento de governança de eventos.
- Checklist de QA arquivado para auditoria futura.
