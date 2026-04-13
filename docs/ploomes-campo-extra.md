# Estudo técnico: adicionar um novo campo no envio da simulação para o Ploomes

## Resumo do fluxo atual

Hoje o projeto possui **dois caminhos** que podem enviar dados ao Ploomes:

1. **Fluxo principal do formulário**
   - `ContactForm` chama `LocalSimulationService.processContact(...)`.
   - `LocalSimulationService` monta `ploomesPayload` e faz `fetch` direto para `https://api-ploomes.vercel.app/cadastro/online/env`.

2. **Fluxo alternativo/legado**
   - `SimulationService` chama `PloomesService.cadastrarProposta(...)`.
   - `PloomesService` monta payload tipado e também envia para a mesma URL.

> Para evitar divergência, qualquer novo campo deve ser incluído nos dois caminhos (ou centralizar o envio em um único serviço depois).

---

## Pontos de alteração para incluir novo campo

Supondo que o novo campo seja `novoCampo` (troque pelo nome real), os locais são:

### 1) Origem do dado na UI
Arquivo: `src/components/ContactForm.tsx`

- Garantir que o valor exista no momento do submit.
- Incluir `novoCampo` no objeto enviado para `LocalSimulationService.processContact(...)`.

### 2) Tipagem de entrada
Arquivo: `src/services/localSimulationService.ts`

- Adicionar `novoCampo?: tipo` na interface `ContactDataInput`.

### 3) Payload enviado ao Ploomes (fluxo principal)
Arquivo: `src/services/localSimulationService.ts`

- Incluir `novoCampo` dentro de `ploomesPayload`.
- Se for obrigatório, adicionar validação antes do `fetch`.

### 4) Persistência local (se necessário para analytics/admin)
Arquivo: `src/services/localSimulationService.ts`

- Se fizer sentido de negócio, salvar também em `updateData` (tabela `simulacoes`) para rastreabilidade.

### 5) Fluxo alternativo/legado
Arquivo: `src/services/ploomesService.ts`

- Adicionar `novoCampo?: tipo` em `PloomesPayload`.
- Adicionar no argumento de `cadastrarProposta(...)`.
- Propagar para o `payload` final enviado no `fetch`.

Arquivo: `src/services/simulationService.ts`

- Se esse fluxo continuar ativo, passar `novoCampo` na chamada de `PloomesService.cadastrarProposta(...)`.

### 6) Testes
Arquivo: `src/services/__tests__/ploomesService.test.ts`

- Adicionar cenário garantindo que `novoCampo` vai no JSON enviado.

---

## Ordem recomendada de implementação

1. Confirmar no receptor do Ploomes o **nome exato da chave** e o tipo esperado (`string`, `number`, `boolean`, etc.).
2. Implementar no `LocalSimulationService` (fluxo hoje usado pelo `ContactForm`).
3. Replicar em `PloomesService` + `SimulationService` para manter compatibilidade.
4. Adicionar teste de payload.
5. Testar ponta a ponta em ambiente de homologação com webhook/request inspector.

---

## Riscos e cuidados

- **Campo desconhecido no endpoint**: alguns backends ignoram, outros rejeitam. Validar contrato antes.
- **Divergência de fluxo**: se adicionar apenas em um serviço, parte dos leads irá sem o novo dado.
- **Normalização**: se o campo for textual, usar `trim`; se numérico, converter (`Number`) e validar faixa.
- **LGPD**: se for dado sensível, revisar base legal e política de privacidade.

---

## Sugestão de melhoria futura (opcional)

Para reduzir manutenção, vale refatorar para ter um único serviço de envio ao Ploomes:

- `LocalSimulationService` passa a chamar `PloomesService` em vez de `fetch` direto.
- Toda transformação de payload fica centralizada em `PloomesService`.
- Menor chance de esquecer campos novos em caminhos diferentes.



## Configuração por Key do campo no Ploomes

Se o campo não aparecer pelo nome \`Link de origem\`, configure a key técnica do campo criado no Ploomes via variável de ambiente:

- \`VITE_PLOOMES_ORIGIN_FIELD_KEY=quote_SEU_FIELD_KEY\`

Com isso, além de enviar \`Link de origem\`, o payload passa a enviar também o valor nesse key técnico.


- Se os campos forem dependentes do estágio no Ploomes, configure também:
  - `VITE_PLOOMES_STAGE_ID=228324`

- Observação: se o campo "Link de origem" estiver em `EntityId = 2` (Pessoa/Contato), pode ser necessário mapear também aliases no integrador (`linkOrigem` e `link_origem`).
