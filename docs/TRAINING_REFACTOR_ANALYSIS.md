# Análise Profunda e Plano de Refatoração — Sistema de Treinos (PRD 06/07)

**Data:** 2026-09-23  
**Prioridade:** 🔴 **CRÍTICA** — Bloqueia a usabilidade principal da plataforma  
**Status:** Planejamento  

---

## 1. DIAGNÓSTICO DO PROBLEMA

### 1.1 Sintoma Relatado
- **Profissional:** Cria treino para `client2` em `/clients/[linkId]/plans/new` e consegue visualizar o plano criado
- **Cliente:** Acessa `/plans` e vê mensagem "Nenhum plano de treino atribuído ainda"
- **Resultado:** Cliente não consegue ver treinos atribuídos; UI/UX é confusa e não oferece clareza sobre o status

### 1.2 Raízes Identificadas (Análise Técnica)

#### 1.2.1 **Nível 1: Arquitetura e Fluxo Desconexo**
```
Profissional: /clients/[linkId]/plans/new 
    ↓ cria TrainingPlan
    ↓ associa ao Client
    ↓ gera Sessions
    ✅ Sucesso — plano está no banco

Cliente: /plans (GET /my-training-plans)
    ↓ busca planos atribuídos
    ❌ Não encontra — ou a lista não retorna, ou há erro de permissão
    ↓ vê "Nenhum plano ainda"
```

**Problema:** A visibilidade do plano entre criação (profissional) e consumo (cliente) é opaca. Não há um padrão claro de "notificação" ou "descoberta".

#### 1.2.2 **Nível 2: Navegação Fragmentada**

| Persona | URL | Função | Status |
|---------|-----|--------|--------|
| Cliente | `/plans` | Ver planos atribuídos | ❌ Quebrado |
| Cliente | `/today` | Ver treino de hoje | ⚠️ Depende de `/plans` funcionar |
| Cliente | `/dashboard` | Painel inicial | ⚠️ Mostra `TodayTrainingCard` mas sem contexto de planos |
| Profissional | `/clients` | Lista clientes | ✅ Funciona |
| Profissional | `/clients/[linkId]/plans` | Planos de um cliente | ✅ Funciona |
| Profissional | `/clients/[linkId]/plans/new` | Criar plano | ✅ Funciona |

**Problema:** Cliente não tem um ponto de entrada claro. Ele deveria poder:
1. Ver que tem um plano atribuído no **dashboard**
2. Acessar `/plans` ou `/today` com clareza
3. Receber **notificação** de que um profissional criou um plano para ele

#### 1.2.3 **Nível 3: Componentes Desorganizados**

**Duplicação:**
- `TrainingPlansTab` em `/clients/[linkId]` (lado profissional)
- `TodayTrainingCard` em `/dashboard` (lado cliente)
- `TodaySessionView` em `/today` (lado cliente)
- Lista de planos em `/plans` (lado cliente)

**Inconsistência Visual:**
- Sem estilo uniforme (alguns usam Card, outros usam li simples)
- Sem padrão de feedback visual (status do plano não é claro)
- Layout quebrado no mobile em alguns lugares

#### 1.2.4 **Nível 4: Falta de CTAs Claras**

**Cliente:**
- No `/dashboard` → Nenhum CTA para "Acessar meus treinos"
- No `/plans` → Mensagem vaga "Nenhum plano atribuído ainda"
- Não há **badge/notificação** indicando "novo plano atribuído"

**Profissional:**
- Cria plano mas **não há feedback** se foi atribuído com sucesso
- Não há **confirmação visual** que o cliente vai receber/ver o plano

#### 1.2.5 **Nível 5: Possível Problema no Backend**

Hipóteses a validar:
- ❓ Endpoint `GET /my-training-plans` retorna vazio mesmo com planos criados?
- ❓ Há filtro de `status` que exclui planos não-ACTIVE?
- ❓ Há validação de permissão que bloqueia planos de terceiros?
- ❓ A relação Cliente ↔ TrainingPlan está sendo criada incorretamente?

---

## 2. IMPACTO

| Área | Impacto | Severidade |
|------|---------|-----------|
| **Usuário Cliente** | Não consegue ver/executar treinos atribuídos | 🔴 Crítica |
| **Usuário Profissional** | Investe tempo criando planos que cliente não vê → frustração | 🔴 Crítica |
| **Discoverabilidade** | Novo usuário (cliente) não sabe onde acessar treinos | 🔴 Crítica |
| **Retenção** | Cliente abandona app pois "não funciona" | 🔴 Crítica |
| **Confiabilidade** | Usuário não tem certeza se plano foi criado/atribuído | 🟠 Alta |

---

## 3. OBJETIVOS DE REFATORAÇÃO

### 3.1 Objetivo Primário
✅ **Cliente consegue descobrir e acessar treinos atribuídos pelo profissional em < 3 cliques**

### 3.2 Objetivos Secundários
- ✅ Fluxo claro e intuitivo: Profissional cria → Cliente vê → Cliente executa
- ✅ Componentes organizados e estilos consistentes
- ✅ Feedback visual explícito sobre status de planos
- ✅ CTAs claras em todos os pontos de entrada
- ✅ Trabalhar bem no mobile (gym = phone)
- ✅ Validar/corrigir backend se necessário

---

## 4. RAÍZES PROFUNDAS (Análise de UX/Product)

### 4.1 Problema de Mentalidade
O app foi construído com **fluxo "write-first" (profissional cria)**:
- Interface de criação é o foco
- Interface de consumo (cliente) é "secondary" / "read-only"
- Não há integração entre os dois mundos

**Realidade:** Cliente passa **95%** do tempo em `/today` e `/dashboard`, não em `/plans`

### 4.2 Problema de Notificação
Não há mecanismo de **descoberta/notificação**:
- Profissional cria plano → nada acontece no cliente
- Cliente não recebe e-mail / push / badge
- Cliente não vê no dashboard

### 4.3 Problema de Clareza de Status
Um plano pode estar em vários estados:
- `DRAFT` — profissional ainda editando
- `ACTIVE` — pronto para cliente usar
- `SCHEDULED` — começará em uma data futura
- `COMPLETED` — já foi executado

Cliente não sabe em qual estado estão seus planos.

---

## 5. PRINCÍPIOS DE REFATORAÇÃO

### 5.1 **Descoberta é a Prioridade 1**
Cliente deve ver que tem treino **no dashboard**, antes de ir para `/plans` ou `/today`.

### 5.2 **Status Sempre Visível**
Cada plano/sessão deve mostrar: status, data de início, próxima sessão agendada.

### 5.3 **Componentes Unificados**
- Uma única representação visual de "plano" que vale em dashboard, /plans, /today
- Paleta consistente, espaçamento, tipografia

### 5.4 **Fluxo Bidirecional**
Não é "profissional cria → cliente consome". É:
- Profissional **notifica** cliente (via e-mail/push)
- Cliente **descobre** no dashboard/notificações
- Cliente **executa** em /today
- Profissional **monitora** no dashboard

### 5.5 **Mobile-First on Execution**
- `/today` é a tela de MÁXIMA frequência (cliente no gym)
- Deve funcionar perfeito no mobile
- Rest timer, entrada de dados, deve ser one-handed

---

## 6. SOLUÇÃO — VISÃO GERAL

### 6.1 Estrutura Nova (Conceitual)

```
Cliente (role=CLIENT):
├─ /dashboard (novo: "Training Card" proeminente)
│  └─ "Você tem 1 plano ativo — próxima sessão hoje às 10h" [CTA]
├─ /plans (refatorado: lista clara com status)
│  └─ Cada plano mostra: nome, status, próxima sessão, [Ver sessões]
├─ /today (melhorado: feedback visual melhor)
│  └─ Hoje: [sessão], ou "Dia de descanso"
└─ /dashboard → "Treino de Hoje" card (centralizado, claro)

Profissional (role=PROFESSIONAL):
├─ /clients (refatorado: rostos + atividade)
│  └─ "client2" → 1 plano ativo
├─ /clients/[linkId] (melhorado: aba "Treino" mais clara)
│  └─ Mostra planos, status, próxima sessão agendada
└─ /dashboard (renovado: "Clientes sem plano", "Próximas sessões", etc)
```

### 6.2 Fluxo de Criação → Descoberta → Execução

```
1. PROFISSIONAL CRIA
   /clients/[linkId]/plans/new
   ↓ Preenche: nome, data início, mesociclos, sessões
   ↓ Salva e publica (status=ACTIVE)
   ✅ Sistema envia: e-mail ao cliente + badge no app

2. CLIENTE DESCOBRE
   /dashboard
   ↓ Vê novo card: "Novo plano: [Nome do Plano]"
   ↓ [CTA: Ver treinos]
   
3. CLIENTE ACEITA (opcional, mas bom ter)
   Dialog: "Você recebeu um novo plano. Quer começar?"
   ↓ Sim → vai para /plans (mostra o novo plano)
   ↓ Não → dismiss (pode ver depois)

4. CLIENTE EXECUTA
   /today
   ↓ Vê sessão de hoje (do plano)
   ↓ Log: exercício, séries, reps, carga
   ✅ Profissional vê atualizações em seu dashboard

5. PROFISSIONAL MONITORA
   /clients/[linkId]
   ↓ Aba "Execução" mostra progresso do cliente
   ↓ Vê: última sessão, próxima, aderência
```

---

## 7. ROADMAP DE REFATORAÇÃO (6 Fases)

### ⚙️ FASE 0: VALIDAÇÃO & DIAGNÓSTICO [🔴 BLOCKER]

**Objetivo:** Descobrir se o problema é frontend ou backend

**Tarefas:**
- [ ] 0.1 — Listar via API o que backend retorna em `GET /my-training-plans`
  - Script: `curl -H "Authorization: Bearer $TOKEN" $API/training-plans`
  - Verificar: Vazio? Contém client2's plano? Há erro?
- [ ] 0.2 — Validar no DB: Existe `TrainingPlan` para `client2`?
  - `SELECT * FROM training_plans WHERE client_id = client2_id;`
- [ ] 0.3 — Validar relação: O plano tem `clientId` preenchido?
  - `SELECT id, client_id, professional_id, status FROM training_plans WHERE id = [plan_id];`
- [ ] 0.4 — Validar endpoint: Endpoint `/my-training-plans` está filtrando corretamente?
  - Revisar código em `apps/api/src/training-plans/controllers`
  - Verificar query: está fazendo `WHERE clientId = req.user.id`?

**Saída:** Relatório: "Problema é [Backend / Frontend / Dados]"

---

### 📋 FASE 1: FRONTEND — DISCOVERY (Dashboard Destaque)

**Objetivo:** Cliente vê que tem treino atribuído **no dashboard**

**Tarefas:**
- [ ] 1.1 — Criar componente `TrainingAssignmentCard` 
  - Props: `plans: TrainingPlan[]`, `today?: Session`
  - Exibe: "Você tem [N] plano(s) ativo(s)"
  - Se hoje tem sessão: "Próxima sessão hoje: [exercícios]"
  - CTA: "[Ver meus treinos]" → `/plans`
- [ ] 1.2 — Integrar em `/dashboard` (Cliente)
  - Posição: logo após `IntakeStatusCard`, antes de tabs
  - Chamar: `listMyTrainingPlans()` + `getTodaySessionAction()`
  - Fallback: Se nenhum plano, card não aparece (ou mostra "Sem plano atribuído")
- [ ] 1.3 — Testes BDD
  - Cenário 1: Cliente com 1 plano ativo vê card
  - Cenário 2: Cliente sem plano não vê card
  - Cenário 3: Cliente com sessão hoje vê "Próxima sessão hoje"
- [ ] 1.4 — Estilos (Tailwind)
  - Use `Card` + `Badge` (status) + Button (CTA)
  - Responsivo: mobile-first, 2-col no desktop
  - Cores: status (ACTIVE=green, DRAFT=yellow, COMPLETED=gray)

**Entrada:** Planos retornados por backend  
**Saída:** Cliente vê treino no dashboard

**Estimated:** 1 dia

---

### 🎨 FASE 2: FRONTEND — UNIFICAÇÃO DE COMPONENTES

**Objetivo:** Um único padrão visual para "Training Plan" em todo app

**Tarefas:**
- [ ] 2.1 — Criar `TrainingPlanCard` reutilizável
  - Props: `plan: TrainingPlan`, `nextSession?: Session`, `isEditable?: boolean`
  - Exibe: nome, status (badge), data início, próxima sessão, ações (ver, editar, etc)
  - Template:
    ```
    ┌─────────────────────────────┐
    │ [Status] [Plano Name]       │ (nome destacado)
    │ Início: 2026-09-24          │ (data clara)
    │ Próxima sessão: hoje 10h    │ (informação crítica)
    │ [Ver treino →] [Editar]     │ (CTAs)
    └─────────────────────────────┘
    ```
- [ ] 2.2 — Refatorar `/plans/page.tsx` (Cliente)
  - Substituir `<li>` simples por `TrainingPlanCard`
  - Adicionar: filtro por status, ordenação por data início
  - Adicionar: "Nenhum plano" → CTA para converter em Starter Template
- [ ] 2.3 — Refatorar `TrainingPlansTab` (Profissional)
  - Substituir por `TrainingPlanCard` (com `isEditable=true`)
  - Adicionar: "Editar plano" → `/plans/[id]/edit`
- [ ] 2.4 — Atualizar `TodayTrainingCard` (Dashboard)
  - Usar padrão similar a `TrainingPlanCard`
  - Destacar: "Treino de hoje" em vez de todos os planos
- [ ] 2.5 — Testes BDD
  - Card renderiza nome, status, data
  - Status aparece com cor correta
  - CTAs funcionam e navegam para lugar correto
  - Mobile: responsive, sem truncate de texto

**Entrada:** Componentes espalhados  
**Saída:** Componente unificado `TrainingPlanCard`

**Estimated:** 1-1.5 dias

---

### 📱 FASE 3: FRONTEND — LAYOUT & RESPONSIVIDADE

**Objetivo:** App funciona bem em mobile (gym) e desktop (planejamento)

**Tarefas:**
- [ ] 3.1 — Revisar `/today/page.tsx`
  - Mobile: stack vertical, sessão > exercícios
  - Desktop: 2-col (esquerda=plano info, direita=log)
  - Testar: sem scroll horizontal, botões clicáveis one-handed
- [ ] 3.2 — Revisar `/plans/page.tsx`
  - Mobile: lista simples, cards full-width
  - Desktop: 2-col (esquerda=lista, direita=detalhe)
  - Filtros: collapsible no mobile, sidebar no desktop
- [ ] 3.3 — Revisar `/dashboard` (Cliente)
  - Mobile: tabs stacked, cards full-width
  - Desktop: grid 2-3 cols
  - Training card proeminente em ambos
- [ ] 3.4 — Testar em Chrome DevTools
  - iPhone SE (375px)
  - Pixel 5 (412px)
  - iPad (768px)
  - Desktop (1440px)
- [ ] 3.5 — Testes BDD (responsividade)
  - Card layout muda em breakpoints
  - Texto não trunca no mobile
  - Botões têm min 44px touch target

**Entrada:** Layout fragmentado  
**Saída:** App funciona em mobile + desktop

**Estimated:** 1-1.5 dias

---

### 🔔 FASE 4: BACKEND — NOTIFICAÇÃO & DESCOBERTA

**Objetivo:** Cliente recebe notificação quando plano é criado

**Tarefas:**
- [ ] 4.1 — Endpoint: `POST /training-plans` emite evento
  - Na lógica de criar plano, emitir: `'training-plan.created'`
  - Payload: `{ planId, clientId, professionalId, planName }`
- [ ] 4.2 — Handler: Enviar e-mail ao cliente
  - Usar `MailerService`
  - Template: "Um novo plano de treino foi criado para você"
  - Link: "Acesse: /plans"
- [ ] 4.3 — Handler: Criar notificação in-app (PRD 12)
  - Tabela: `Notification` (se não existir)
  - Colunas: `userId`, `type`, `title`, `message`, `link`, `read`, `createdAt`
  - Inserir notificação para cliente
- [ ] 4.4 — Endpoint: `GET /notifications` (Cliente)
  - Listar notificações não-lidas
  - Ordenar por `createdAt DESC`
- [ ] 4.5 — Badge no app
  - Se há notificações não-lidas, mostrar badge no ícone (π)
  - Clicar badge → `/notifications`
- [ ] 4.6 — Testes BDD
  - Profissional cria plano → e-mail enviado
  - Cliente recebe notificação in-app
  - Badge aparece no app
  - Clicar em notificação → vai para `/plans`

**Entrada:** Criação de plano isolada  
**Saída:** Cliente notificado via e-mail + in-app

**Estimated:** 1.5-2 dias

---

### ✅ FASE 5: VALIDAÇÃO & QA COMPLETA

**Objetivo:** Fluxo completo funciona de ponta a ponta

**Tarefas:**
- [ ] 5.1 — Teste E2E: Fluxo completo
  - Profissional: login → clientes → seleciona client2 → cria plano
  - Cliente: login → vê notificação → clica → vê plano → vê treino de hoje
  - Ambos: veem dados consistentes
- [ ] 5.2 — Teste mobile: Gym scenario
  - Cliente no gym, conectado ao WiFi (spotty)
  - Abre `/today` → vê sessão
  - Log alguns exercícios → funciona?
  - Tira screenshot do layout
- [ ] 5.3 — Teste dados
  - Plano com 1 mesociclo × 3 sessões/semana × 4 semanas → 12 sessões
  - Todas aparecem em `/plans`?
  - `/today` mostra a correta?
- [ ] 5.4 — Testes BDD completos
  - 3-5 cenários cobrindo fluxo inteiro
  - Incluir edge cases: sem plano, múltiplos planos, plano passado
- [ ] 5.5 — Performance
  - `/plans` com 10 planos: < 1s?
  - `/today` com 20 exercícios: < 500ms?
  - Sem N+1 queries
- [ ] 5.6 — Acessibilidade
  - Alt text em imagens?
  - Contrast ratio ok?
  - Keyboard navigation funciona?

**Entrada:** Todas as fases 1-4 completas  
**Saída:** Fluxo validado, pronto para produção

**Estimated:** 1 dia

---

### 📊 FASE 6: MONITORIA & ITERAÇÃO

**Objetivo:** Observar uso real, coletar feedback, iterar

**Tarefas:**
- [ ] 6.1 — Métrica: clientes que veem `/plans` vs clientes com planos
  - Analytics: "Qual % de clientes com planos acessa /plans?"
  - Meta: > 80%
- [ ] 6.2 — Métrica: tempo gasto em `/today`
  - Analytics: "Qual é o tempo médio em /today?"
  - Meta: > 5 min (tempo real de exercício)
- [ ] 6.3 — Feedback: entrevistas com 3-5 clientes
  - "Você achou fácil achar seus treinos?"
  - "O que estava confuso?"
  - "Que faltou?"
- [ ] 6.4 — Problema backlog
  - Compilar issues encontradas
  - Priorizar
  - Iterar (v2 roadmap)

**Entrada:** Fluxo em produção  
**Saída:** Dados de uso, feedback, roadmap para v2

**Estimated:** 1-2 semanas (ongoing)

---

## 8. CHECKLIST DETALHADO DE TAREFAS

### 🔴 BLOCKER — FASE 0: DIAGNÓSTICO

```
FASE 0: Diagnóstico & Validação
├─ [ ] 0.1 — Listar planos via API
├─ [ ] 0.2 — Verificar BD se plano existe
├─ [ ] 0.3 — Validar relação clientId
├─ [ ] 0.4 — Revisar endpoint /my-training-plans
└─ [ ] 0.5 — Relatório: qual é o problema?

Status: ⏳ Bloqueado até diagnóstico
```

---

### 🎯 FASE 1: DESCOBERTA NO DASHBOARD

```
FASE 1: Frontend — Discovery Card
├─ [ ] 1.1 — Criar TrainingAssignmentCard
│  ├─ [ ] 1.1a — Props e types
│  ├─ [ ] 1.1b — Render: nome, status, próxima sessão
│  ├─ [ ] 1.1c — Estilos e responsividade
│  └─ [ ] 1.1d — CTA para /plans
├─ [ ] 1.2 — Integrar em /dashboard (Cliente)
│  ├─ [ ] 1.2a — Import e posição do card
│  ├─ [ ] 1.2b — Chamar APIs necessárias
│  ├─ [ ] 1.2c — Handling de loading/error
│  └─ [ ] 1.2d — Fallback se sem plano
├─ [ ] 1.3 — Testes BDD
│  ├─ [ ] 1.3a — Cliente com plano vê card
│  ├─ [ ] 1.3b — Cliente sem plano não vê card
│  └─ [ ] 1.3c — Card mostra próxima sessão se existir
└─ [ ] 1.4 — Code review & merge

Tempo estimado: 1 dia
```

---

### 🎨 FASE 2: COMPONENTES UNIFICADOS

```
FASE 2: Componentes Unificados
├─ [ ] 2.1 — TrainingPlanCard
│  ├─ [ ] 2.1a — Props: plan, nextSession, isEditable
│  ├─ [ ] 2.1b — Render layout (ver seção 6.1)
│  ├─ [ ] 2.1c — Status badge (colors por status)
│  ├─ [ ] 2.1d — Date formatter (PT-BR)
│  └─ [ ] 2.1e — Estilos & responsividade
├─ [ ] 2.2 — Refatorar /plans/page.tsx (Cliente)
│  ├─ [ ] 2.2a — Substituir <li> por TrainingPlanCard
│  ├─ [ ] 2.2b — Adicionar ordenação por data
│  ├─ [ ] 2.2c — "Nenhum plano" → feedback claro
│  └─ [ ] 2.2d — Testes (renderização, navegação)
├─ [ ] 2.3 — Refatorar TrainingPlansTab
│  ├─ [ ] 2.3a — Usar TrainingPlanCard (isEditable=true)
│  ├─ [ ] 2.3b — Adicionar link para editar
│  └─ [ ] 2.3c — Testes
├─ [ ] 2.4 — Melhorar TodayTrainingCard
│  ├─ [ ] 2.4a — Usar padrão similar a TrainingPlanCard
│  ├─ [ ] 2.4b — Destacar "hoje"
│  └─ [ ] 2.4c — Testes
└─ [ ] 2.5 — Code review & merge

Tempo estimado: 1.5 dias
```

---

### 📱 FASE 3: RESPONSIVIDADE

```
FASE 3: Layout & Responsividade
├─ [ ] 3.1 — Revisar /today
│  ├─ [ ] 3.1a — Mobile stack vertical
│  ├─ [ ] 3.1b — Desktop 2-col
│  ├─ [ ] 3.1c — Botões one-handed (44px min)
│  └─ [ ] 3.1d — Screenshot mobile
├─ [ ] 3.2 — Revisar /plans
│  ├─ [ ] 3.2a — Mobile: lista full-width
│  ├─ [ ] 3.2b — Desktop: 2-col (lista + detalhe)
│  ├─ [ ] 3.2c — Filtros responsivos
│  └─ [ ] 3.2d — Screenshot mobile
├─ [ ] 3.3 — Revisar /dashboard
│  ├─ [ ] 3.3a — Mobile: tabs, cards full-width
│  ├─ [ ] 3.3b — Desktop: grid 2-3 cols
│  └─ [ ] 3.3c — Training card proeminente
├─ [ ] 3.4 — Testes em múltiplos devices
│  ├─ [ ] 3.4a — iPhone SE (375px)
│  ├─ [ ] 3.4b — Pixel 5 (412px)
│  ├─ [ ] 3.4c — iPad (768px)
│  └─ [ ] 3.4d — Desktop (1440px)
├─ [ ] 3.5 — Testes BDD (responsividade)
│  └─ [ ] 3.5a — Layout muda em breakpoints
└─ [ ] 3.6 — Code review & merge

Tempo estimado: 1.5 dias
```

---

### 🔔 FASE 4: NOTIFICAÇÃO (Backend)

```
FASE 4: Backend — Notificação & Descoberta
├─ [ ] 4.1 — Evento quando plano criado
│  ├─ [ ] 4.1a — Revisar createTrainingPlan() controller
│  ├─ [ ] 4.1b — Emitir evento 'training-plan.created'
│  └─ [ ] 4.1c — Teste: evento dispara?
├─ [ ] 4.2 — E-mail ao cliente
│  ├─ [ ] 4.2a — Template e-mail (Handlebars/EJS)
│  ├─ [ ] 4.2b — Trigger do handler
│  ├─ [ ] 4.2c — Teste: e-mail enviado?
│  └─ [ ] 4.2d — Testar em MailHog local
├─ [ ] 4.3 — Notificação in-app
│  ├─ [ ] 4.3a — Schema Notification (se não existir)
│  ├─ [ ] 4.3b — Handler insere notificação
│  ├─ [ ] 4.3c — Teste BDD: notificação criada
│  └─ [ ] 4.3d — DB migration (se novo schema)
├─ [ ] 4.4 — Endpoint GET /notifications
│  ├─ [ ] 4.4a — Implementar endpoint
│  ├─ [ ] 4.4b — Filtro: not read, order by DESC
│  ├─ [ ] 4.4c — Paginação?
│  └─ [ ] 4.4d — Teste: retorna notificações corretas
├─ [ ] 4.5 — Frontend: Badge & bell icon
│  ├─ [ ] 4.5a — Nav bar: ícone sino com badge
│  ├─ [ ] 4.5b — Chamar GET /notifications
│  ├─ [ ] 4.5c — Mostrar badge se count > 0
│  └─ [ ] 4.5d — Link: sino → /notifications
├─ [ ] 4.6 — Testes BDD (E2E)
│  ├─ [ ] 4.6a — Profissional cria plano → e-mail
│  ├─ [ ] 4.6b — Cliente vê notificação in-app
│  ├─ [ ] 4.6c — Badge aparece
│  └─ [ ] 4.6d — Clica notificação → /plans
└─ [ ] 4.7 — Code review & merge

Tempo estimado: 2 dias
```

---

### ✅ FASE 5: VALIDAÇÃO COMPLETA

```
FASE 5: QA & Validação
├─ [ ] 5.1 — Teste E2E manual
│  ├─ [ ] 5.1a — Profissional cria plano
│  ├─ [ ] 5.1b — Cliente vê e acessa
│  ├─ [ ] 5.1c — Cliente executa sessão
│  └─ [ ] 5.1d — Dados consistentes em ambos
├─ [ ] 5.2 — Teste mobile (gym scenario)
│  ├─ [ ] 5.2a — Simular WiFi ruim
│  ├─ [ ] 5.2b — Log de exercícios
│  ├─ [ ] 5.2c — Layout funciona?
│  └─ [ ] 5.2d — Screenshot
├─ [ ] 5.3 — Teste de dados (volume)
│  ├─ [ ] 5.3a — Plano com 12+ sessões
│  ├─ [ ] 5.3b — Todas aparecem em /plans?
│  ├─ [ ] 5.3c — /today mostra correta?
│  └─ [ ] 5.3d — Performance ok?
├─ [ ] 5.4 — Testes BDD (complete)
│  ├─ [ ] 5.4a — 3-5 cenários de E2E
│  ├─ [ ] 5.4b — Edge cases (sem plano, múltiplos)
│  ├─ [ ] 5.4c — Todas passam?
│  └─ [ ] 5.4d — 100% de cobertura?
├─ [ ] 5.5 — Performance audit
│  ├─ [ ] 5.5a — /plans com 10 planos: < 1s
│  ├─ [ ] 5.5b — /today com 20 exercícios: < 500ms
│  ├─ [ ] 5.5c — Sem N+1 queries
│  └─ [ ] 5.5d — Lighthouse score > 80
├─ [ ] 5.6 — Acessibilidade
│  ├─ [ ] 5.6a — Alt text em imagens
│  ├─ [ ] 5.6b — Contrast ratio ok
│  ├─ [ ] 5.6c — Keyboard navigation
│  └─ [ ] 5.6d — Screen reader test
└─ [ ] 5.7 — Code review & merge

Tempo estimado: 1 dia
```

---

### 📊 FASE 6: MONITORIA (Ongoing)

```
FASE 6: Monitoria & Iteração
├─ [ ] 6.1 — Analytics setup
│  ├─ [ ] 6.1a — Track: clientId → /plans visit
│  ├─ [ ] 6.1b — Track: plan views vs has_plans
│  ├─ [ ] 6.1c — Track: time spent in /today
│  └─ [ ] 6.1d — Dashboard: visualize metrics
├─ [ ] 6.2 — Feedback loop
│  ├─ [ ] 6.2a — Entrevistas: 3-5 clientes
│  ├─ [ ] 6.2b — Feedback: o que funcionou?
│  ├─ [ ] 6.2c — Feedback: o que não funcionou?
│  └─ [ ] 6.2d — Compilar pain points
├─ [ ] 6.3 — Bug tracking
│  ├─ [ ] 6.3a — Monitorar erros em produção
│  ├─ [ ] 6.3b — Priorizar issues
│  └─ [ ] 6.3c — Iterar (v2)
└─ [ ] 6.4 — v2 Roadmap
   └─ [ ] 6.4a — Compilar para próximo ciclo

Tempo estimado: Ongoing (1-2 semanas)
```

---

## 9. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---|---|---|
| Diagnóstico mostra problema complexo no backend | Média | Alto | Fase 0 precisa ser rápida; ter dev experiente |
| Mudança quebra algo em outro fluxo | Média | Alto | Testes BDD completos; testar regressão |
| Performance degrada com muitos planos | Baixa | Médio | Fase 5 inclui perf audit; paginate se need |
| Cliente não descobre ainda (discovery falha) | Baixa | Crítico | Fase 4 (notificação) + Phase 6 (metrics) resolvem |
| Mobile ainda é ruim no gym | Baixa | Alto | Phase 3 + teste real em gym location |

---

## 10. SUCESSO — Métricas

| Métrica | Baseline | Target |
|---------|----------|--------|
| % clientes com planos que acessam `/plans` | ? (TBD após diagnóstico) | > 80% |
| Tempo para descobrir plano (novo cliente) | ? | < 3 cliques |
| Tempo médio em `/today` | ? | > 5 min (tempo real) |
| Taxa de conclusão de sessão (client logging) | ? | > 70% |
| NPS da experiência de treino (cliente) | ? | > 7/10 |
| Erro/crash em /plans, /today, /dashboard | TBD | 0 |

---

## 11. TIMELINE ESTIMADA

```
FASE 0: Diagnóstico ..................... 2-4 horas
FASE 1: Discovery Card .................. 1 dia
FASE 2: Componentes Unificados .......... 1.5 dias
FASE 3: Responsividade .................. 1.5 dias
FASE 4: Notificação (Backend) ........... 2 dias
FASE 5: QA Completa ..................... 1 dia
────────────────────────────────────────────────────
TOTAL (Critical Path) ................... ~10 dias
FASE 6: Monitoria ....................... Ongoing

Parallelizável:
- Fases 1-3 podem rodar em paralelo (frontend focus)
- Fase 4 pode iniciar depois que Fase 0 termina
- Fases 5-6 são sequenciais
```

---

## 12. PRÓXIMOS PASSOS IMEDIATOS

### NOW (< 1 hora)
1. **Executar Fase 0:** Diagnóstico
   - Rodar queries no BD
   - Testar endpoint via curl
   - Compilar relatório

### TODAY (Próximas horas)
2. Se backend está OK:
   - Iniciar Fase 1 (Discovery Card)
   - Iniciar Fase 2 (TrainingPlanCard)

3. Se backend com problema:
   - Priorizar fix no backend
   - Depois retomar fases frontend

---

## Apêndice A — Referências PRD

- **PRD 06 — Training Plan Builder:** Definição de planos, mesociclos, sessões, prescrições
- **PRD 07 — Client Training Execution:** Cliente executando (logging) treino
- **PRD 02 § 4:** Matriz de permissões de who-does-what
- **docs/redesign-plan.md:** Visão geral de UI/UX

---

## Apêndice B — Arquivos Principais a Revisar

```
Backend (NestJS):
├─ apps/api/src/training-plans/
│  ├─ controllers/training-plans.controller.ts
│  ├─ use-cases/
│  └─ services/
└─ Validar: GET /my-training-plans endpoint

Frontend (Next.js):
├─ apps/web/app/(app)/
│  ├─ dashboard/page.tsx
│  ├─ plans/page.tsx
│  ├─ plans/[id]/page.tsx
│  ├─ today/page.tsx
│  └─ clients/[linkId]/plans/
├─ features/training-plans/
│  └─ components/
├─ features/client-detail-hub/
│  └─ components/training-plans-tab.tsx
└─ features/dashboard/
   └─ components/today-training-card.tsx
```

---

**Documento criado:** 2026-09-23  
**Status:** 🟠 Planejamento (aguardando Fase 0 — Diagnóstico)  
**Próximo:** Executar diagnóstico e atualizar este documento com findings
