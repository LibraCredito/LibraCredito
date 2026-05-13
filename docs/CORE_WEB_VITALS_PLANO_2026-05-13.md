# Plano seguro para aprovação em Core Web Vitals

Data do diagnóstico: 13 de maio de 2026.
URL analisada no feedback: `https://www.libracredito.com.br/`.

## 1. Estado atual informado pelo PageSpeed / CrUX

### Dados de campo dos últimos 28 dias

| Métrica | Valor informado | Meta para aprovação | Situação |
| --- | ---: | ---: | --- |
| LCP | 2,6 s | <= 2,5 s | Muito próximo da aprovação, mas ainda reprovando |
| INP | 243 ms | <= 200 ms | Próximo da aprovação, pede redução de trabalho no main thread |
| CLS | 0,7 | <= 0,1 | Principal risco de reprovação no campo |
| FCP | 1,3 s | <= 1,8 s | Saudável |

### Dados de laboratório mobile

| Métrica | Valor informado | Meta prática | Situação |
| --- | ---: | ---: | --- |
| Performance | 54 | >= 90 | Precisa de otimização incremental |
| FCP | 5,0 s | <= 1,8 s | Alto no laboratório |
| LCP | 7,0 s | <= 2,5 s | Alto no laboratório |
| TBT | 220 ms | <= 200 ms | Levemente acima |
| CLS | 0,112 | <= 0,1 | Próximo da meta no laboratório |
| Speed Index | 6,7 s | <= 3,4 s | Alto |

## 2. Leitura do código atual

O projeto já tem boas bases de performance: a home é importada diretamente para reduzir o LCP, enquanto várias rotas secundárias são carregadas por `lazy()`; o HTML de hero é injetado no build; gzip e Brotli já estão configurados; e as seções abaixo da dobra usam carregamento sob demanda por `IntersectionObserver`.

Pontos que devem ser tratados com cuidado:

1. **JavaScript de terceiros no caminho inicial**: GTM, Meta Pixel e GA4 estão no `index.html`; parte é disparada por `requestIdleCallback` ou interação, mas GA4 ainda baixa imediatamente via `<script async>`. Isso tende a afetar TBT/INP e pode disputar rede com o LCP.
2. **CSS inicial grande**: o build reportou `dist/assets/css/index.css` com cerca de 113 kB antes de gzip. Mesmo comprimido, CSS grande bloqueia renderização e piora FCP/LCP em conexões móveis.
3. **Hidratação adiada por limpeza de service workers/caches**: antes de renderizar/hidratar o React, o `main.tsx` aguarda a rotina de desregistro e limpeza finalizar. Em aparelhos lentos isso pode atrasar interatividade e causar diferença entre HTML pré-renderizado e app hidratado.
4. **Elemento LCP provável é o vídeo/thumbnail ou o bloco de texto do hero**: o hero tem thumbnail prioritário e preload, mas também carrega `TypewriterText`, ícones e `OptimizedYouTube` na dobra inicial. Mudanças nessa área precisam passar por comparação visual mobile/desktop.
5. **Risco real de CLS em produção**: os dados de campo mostram CLS 0,7, muito acima do laboratório. Isso normalmente indica deslocamentos que dependem de consentimento, banners, fontes, menus, widgets externos, imagens sem reserva de espaço ou diferenças entre HTML pré-renderizado e hidratação.

## 3. Estratégia para otimizar sem quebrar

A abordagem recomendada é **evolutiva, medida e reversível**. Não devemos trocar toda a arquitetura nem reescrever a home de uma vez. Cada fase deve ter uma hipótese, uma alteração pequena, evidência antes/depois e rollback simples.

### Guardrails obrigatórios antes de qualquer alteração

- Criar baseline de métricas em produção e em ambiente local: Lighthouse mobile, WebPageTest ou PageSpeed, plus filmstrip quando possível.
- Validar visualmente as páginas críticas: `/`, `/simulacao`, `/vantagens`, `/quem-somos`, `/blog` e um post.
- Rodar `npm run typecheck` e `npm run build` a cada alteração.
- Comparar DOM acima da dobra antes/depois para evitar alteração de layout e copy.
- Usar feature flags ou commits pequenos para permitir rollback.
- Não remover tracking sem alinhar com marketing; primeiro atrasar, consentir ou carregar em condição segura.

## 4. Plano de execução por fases

### Fase 0 — Medição e diagnóstico controlado

Objetivo: saber exatamente qual elemento está causando LCP e quais eventos geram CLS/INP antes de mexer em UX.

Ações:

1. Adicionar medição com `web-vitals` em produção amostrada, enviando `LCP`, `INP`, `CLS`, `FCP` e atributos úteis: rota, tipo de navegação, conexão, dispositivo aproximado, elemento LCP e fontes de layout shift quando disponíveis.
2. Criar checklist de Lighthouse local com throttling padrão mobile e Chrome DevTools Performance.
3. Registrar baseline por commit: pontuação, LCP, INP, CLS, TBT, tamanho de JS/CSS e elemento LCP.
4. Confirmar se o CLS 0,7 vem de home, rotas internas, banners, menu mobile, hidratação ou scripts externos.

Critério de saída:

- Relatório com principal elemento LCP, maiores long tasks e top 3 fontes de CLS.

Risco de quebra: baixo. Instrumentação deve ser passiva.

### Fase 1 — Corrigir CLS primeiro

Objetivo: levar CLS de campo de 0,7 para abaixo de 0,1. É a maior reprovação atual.

Ações prováveis:

1. Reservar altura fixa/estável para header, hero, ondas, thumbnail do vídeo, trust bar, CTAs e faixas carregadas abaixo da dobra.
2. Garantir que todo componente lazy abaixo da dobra tenha placeholder com `min-height` quando sua entrada puder deslocar conteúdo já visível.
3. Revisar banners, toasts, popups e elementos injetados por scripts de terceiros para que não empurrem conteúdo; se forem necessários, usar overlay sem alterar fluxo do documento.
4. Conferir diferenças entre `public/hero.html` pré-renderizado e a hidratação real do React.
5. Evitar animações que mudam dimensões no hero; preferir `transform`/`opacity`.

Critério de saída:

- CLS local <= 0,05 e RUM p75 em queda por pelo menos uma janela de coleta.

Risco de quebra: médio-baixo se só reservar espaço e não remover elementos.

### Fase 2 — Reduzir LCP sem mudar aparência

Objetivo: baixar LCP de campo de 2,6 s para uma margem segura, idealmente <= 2,2 s.

Ações prováveis:

1. Confirmar se o LCP é texto do hero, thumbnail do vídeo ou outro bloco.
2. Se o thumbnail for LCP, manter preload/fetch priority, gerar versões responsivas reais (`avif`/`webp`) e servir dimensões adequadas para mobile; evitar query string que não transforma imagem no servidor.
3. Se texto for LCP, reduzir dependência de JS no heading inicial: renderizar texto estático primeiro e iniciar typewriter depois da primeira pintura ou após hidratação.
4. Avaliar remoção do preload de recursos não usados na primeira dobra e trocar prefetch de páginas por `prefetch` em idle/interação.
5. Validar se o preload de CSS aponta para o arquivo correto em todos os ambientes, pois o build já preserva `assets/css/index.css`.

Critério de saída:

- LCP de laboratório e campo com queda consistente, sem alteração perceptível no layout do hero.

Risco de quebra: médio, pois mexe na dobra inicial. Exigir screenshot mobile/desktop.

### Fase 3 — Melhorar INP/TBT reduzindo JavaScript inicial

Objetivo: INP <= 200 ms com margem, TBT <= 150 ms em laboratório.

Ações prováveis:

1. Unificar e atrasar carregamento de analytics: carregar GA4/GTM/Meta depois de primeira interação, consentimento ou idle com timeout conservador, evitando baixar GA4 imediatamente no `head`.
2. Garantir que scripts de terceiros nunca bloqueiem navegação, scroll ou clique em CTA.
3. Rever importações do bundle inicial: manter só o necessário para header/hero; lazy-load ícones, YouTube e componentes não críticos quando possível.
4. Manter Supabase fora do caminho inicial; auditar chunks para garantir que `vendor-supabase` não entre na home antes de necessidade real.
5. Adiar tarefas de manutenção de cache/service worker para depois da renderização/hidratação.

Critério de saída:

- INP p75 <= 200 ms no campo e long tasks iniciais reduzidas.

Risco de quebra: médio, pois envolve tracking e bootstrap. Exigir validação de eventos de marketing.

### Fase 4 — Reduzir CSS e recursos bloqueantes

Objetivo: melhorar FCP/Speed Index e diminuir custo de renderização.

Ações prováveis:

1. Auditar Tailwind/content para remover classes não usadas e CSS legado.
2. Separar CSS crítico da home do CSS de páginas internas, se o ganho justificar.
3. Revisar CSS inline do `index.html` para manter apenas regras realmente usadas acima da dobra.
4. Evitar duplicidade entre critical CSS inline e `index.css` quando isso aumentar custo sem benefício.
5. Manter fonte local, mas validar `font-display` no `@font-face` e impacto visual.

Critério de saída:

- CSS inicial menor e FCP/Speed Index melhores sem regressão visual.

Risco de quebra: médio se remover classes sem cobertura visual; fazer em lotes pequenos.

### Fase 5 — Cache, CDN e deploy

Objetivo: garantir que o ganho chegue ao usuário real.

Ações prováveis:

1. Conferir headers de cache para assets com hash: `Cache-Control: public, max-age=31536000, immutable`.
2. Garantir compressão Brotli/Gzip servida pela hospedagem, não apenas gerada no build.
3. Remover service workers antigos de forma não bloqueante e com plano de rollback.
4. Validar que imagens e fontes estão no mesmo CDN/domínio quando possível.

Critério de saída:

- Assets versionados com cache longo e HTML com cache curto/controlado.

Risco de quebra: médio, pois cache errado pode preservar bundle antigo. Exigir teste de deploy limpo.

## 5. Ordem recomendada de commits

1. Instrumentação RUM e relatório de baseline.
2. Correções de CLS com reserva de espaço e sem mudança visual.
3. Otimização LCP do hero/thumbnail/typewriter.
4. Atraso/unificação de analytics e scripts externos.
5. Ajustes de hidratação/cache/service worker.
6. Redução de CSS e limpeza de dependências/chunks.
7. Headers/CDN e validação pós-deploy.

## 6. Metas de aceite

| Métrica | Meta mínima | Meta segura |
| --- | ---: | ---: |
| LCP campo | <= 2,5 s | <= 2,2 s |
| INP campo | <= 200 ms | <= 160 ms |
| CLS campo | <= 0,1 | <= 0,05 |
| Lighthouse mobile | >= 80 inicial | >= 90 final |
| TBT laboratório | <= 200 ms | <= 150 ms |

## 7. Checklist de não-regressão

- Header e menu mobile funcionam.
- CTA "Simular Agora" navega para `/simulacao`.
- Vídeo/thumbnail do hero mantém proporção sem deslocamento.
- Ondas e faixas não sobrepõem conteúdo.
- Formulários de simulação continuam enviando normalmente.
- Eventos essenciais de GA4/GTM/Meta continuam disparando após a estratégia de carregamento definida.
- Blog e sitemap continuam gerando no build, mesmo quando Supabase estiver indisponível.

## 8. Priorização final

A prioridade técnica para aprovação é:

1. **CLS**: maior reprovação e maior risco de experiência ruim.
2. **LCP**: está perto no campo, mas ruim no laboratório; foco na dobra inicial.
3. **INP/TBT**: reduzir JS de terceiros e trabalho inicial.
4. **CSS/Speed Index**: consolidar ganhos e margem.

Com essa ordem, a chance de aprovação aumenta sem mudanças bruscas de layout, conteúdo ou fluxo comercial.
