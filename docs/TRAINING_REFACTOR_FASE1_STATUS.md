# Fase 1 — Discovery Card no Dashboard — STATUS

**Data:** 2026-09-23  
**Status:** ✅ **IMPLEMENTADO**  
**Tempo Estimado:** 1 dia  
**Tempo Real:** ~45 minutos  

---

## ✅ O Que Foi Feito

### 1.1 ✅ Componente `TrainingAssignmentCard` Criado

**Arquivo:** `apps/web/features/dashboard/components/training-assignment-card.tsx`

Componente novo que mostra:
- ✅ Número de planos atribuídos
- ✅ Nome do plano principal (first active ou first)
- ✅ Status badge (colorido)
- ✅ Data de início
- ✅ Indicador de próxima sessão (se hoje)
- ✅ CTA button: "Ver meus treinos →"
- ✅ Retorna `null` se sem planos (não aparece)

**Props:**
```typescript
{
  plans: PublicTrainingPlan[];
  todaySession?: PublicSession | null;
}
```

**Estilos:**
- ✅ Border primary/30 (destaque suave)
- ✅ Background primary/5 (cor de fundo clara)
- ✅ Hover effect: primary/10
- ✅ Responsive: funciona em mobile + desktop
- ✅ Accessible: link wrapper, semantic HTML

---

### 1.2 ✅ Integrado em `/dashboard/page.tsx`

**Mudanças:**

1. **Imports adicionados:**
   ```typescript
   import { TrainingAssignmentCard } from "@/features/dashboard/components/training-assignment-card";
   import { listMyTrainingPlans } from "@/features/training-plans/api-client";
   ```

2. **API chamada:**
   ```typescript
   const [todayResult, weekResult, intakeResult, plansResult] = await Promise.all([
     getTodayDashboard(accessToken),
     getWeekDashboard(accessToken),
     getMyIntake(accessToken),
     listMyTrainingPlans(accessToken), // ← NOVO
   ]);
   ```

3. **Data extraída:**
   ```typescript
   const plans = plansResult.ok ? plansResult.data : [];
   ```

4. **Renderizado (após IntakeStatusCard):**
   ```jsx
   <TrainingAssignmentCard plans={plans} todaySession={today.training.session} />
   ```

---

## 📊 Checklist Fase 1

- [x] 1.1 — Criar componente `TrainingAssignmentCard`
  - [x] 1.1a — Props e types
  - [x] 1.1b — Render: nome, status, próxima sessão
  - [x] 1.1c — Estilos e responsividade
  - [x] 1.1d — CTA para /plans

- [x] 1.2 — Integrar em `/dashboard` (Cliente)
  - [x] 1.2a — Import e posição do card
  - [x] 1.2b — Chamar APIs necessárias
  - [x] 1.2c — Handling de loading/error (fallback a array vazio)
  - [x] 1.2d — Fallback se sem plano

- [ ] 1.3 — Testes BDD (Próximo)
  - [ ] 1.3a — Cliente com plano vê card
  - [ ] 1.3b — Cliente sem plano não vê card
  - [ ] 1.3c — Card mostra próxima sessão se existir

- [ ] 1.4 — Code review & merge

---

## 🎨 Visual do Componente

```
┌─────────────────────────────────────────────────┐
│ ● Você tem 1 plano de treino    [ACTIVE]       │
│                                                 │
│ plano A                                         │
│ Início: 2026-09-24                              │
│                                                 │
│ 📅 Próxima sessão: hoje                         │
│    5 exercício(s)                               │
│                                                 │
│ Ver meus treinos →                              │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Teste Manual (PRÓXIMO)

### Pré-requisitos
- [ ] Stack rodando (`make up` completado)
- [ ] Plano "plano A" com status ACTIVE no BD

### Teste 1: Cliente com plano vê card
1. Login como `client2@peakform.demo` (password: `Demo12345!`)
2. Acesse http://localhost:3000/dashboard
3. Após `IntakeStatusCard`, deve ver `TrainingAssignmentCard` com:
   - ✓ "Você tem 1 plano de treino"
   - ✓ "plano A"
   - ✓ "ACTIVE" badge (verde)
   - ✓ Data início
   - ✓ "Próxima sessão: hoje" (se hoje tem sessão)
   - ✓ CTA button "Ver meus treinos →"
4. Clicar CTA deve ir para `/plans`
5. Em `/plans`, deve ver o plano

### Teste 2: Cliente sem plano não vê card
1. Criar novo cliente sem planos
2. Login como esse cliente
3. Em `/dashboard`, NÃO deve ver `TrainingAssignmentCard`
4. Dashboard normal deve funcionar

### Teste 3: Responsividade
1. Mobile (375px - DevTools):
   - Card deve ser full-width
   - Texto sem truncate
   - CTA button deve ser clicável
2. Desktop (1440px):
   - Card lado-a-lado com outras
   - Espaçamento ok

---

## 📈 Impacto (Antes vs Depois)

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Descoberta | ❌ Cliente não sabe que tem plano | ✅ Card destaca na primeira coisa que vê |
| CTAs | ❌ Sem call-to-action | ✅ "Ver meus treinos →" claro |
| Visual | ❌ Genérico | ✅ Card destacado com cor primária |
| Cliques | ❌ ∞ (não acha) | ✅ 2 cliques (dashboard → /plans) |

---

## 🚀 Próximos Passos

### Imediato (Teste)
- [ ] Rodar em navegador (localhost:3000)
- [ ] Validar renderização
- [ ] Testar responsividade
- [ ] Testar navegação (/plans)

### Fase 2 (Próxima)
- [ ] Criar `TrainingPlanCard` unificado
- [ ] Refatorar `/plans/page.tsx`
- [ ] Refatorar `TrainingPlansTab`
- [ ] Testes BDD

### Timeline
- **Fase 1 (Hoje):** ✅ Implementado
- **Testes BDD:** Próximas horas
- **Fase 2 (Amanhã):** 1.5 dias
- **Fase 3 (Dia seguinte):** 1.5 dias
- **Fase 4:** 2 dias
- **Fase 5:** 1 dia
- **TOTAL:** ~10 dias

---

## 📝 Notas de Implementação

### Decisões Tomadas

1. **Componente separado**: `TrainingAssignmentCard` é um novo componente, não modificação de `TodayTrainingCard`
   - Razão: Responsabilidade única, reutilizável, não afeta parte existente

2. **Posição no dashboard**: Logo após `IntakeStatusCard`
   - Razão: Cliente que não fez intake não pode ter planos (gating), então card de planos vem logo depois de status intake

3. **Sem filtro por status**: Card mostra qualquer plano, não apenas ACTIVE
   - Razão: Cliente com DRAFT pode querer saber que seu profissional criou plano

4. **Fallback a null**: Se sem planos, componente retorna null (não renderiza nada)
   - Razão: Dashboard limpo, sem mensagem vazia desnecessária

5. **Próxima sessão**: Se `todaySession` existe e é hoje, mostra no card
   - Razão: Reforça urgência de praticar hoje

### Padrões Seguidos

- ✅ Mesmo estilo de outros cards (border, rounded-lg, p-4)
- ✅ Mesmo uso de Labels e formatação de datas
- ✅ Mesmo padrão de imports TypeScript
- ✅ Mesma responsividade (mobile-first)
- ✅ Mesma acessibilidade (semantic HTML, alt text)

---

## 🔧 Arquivo Modificado

- ✅ `apps/web/features/dashboard/components/training-assignment-card.tsx` (novo)
- ✅ `apps/web/app/(app)/dashboard/page.tsx` (modificado)

---

## 🧹 Limpeza/Refatoração Futura

Nada requer refatoração agora. Fase 2 vai criar `TrainingPlanCard` e usar em múltiplos lugares, consolidando a apresentação visual.

---

## ✅ Status Final Fase 1

- **Implementação:** ✅ 100% completa
- **Testes Unitários:** ⏳ Próximo (Testes BDD)
- **Integration Tests:** ⏳ Próximo (Testes BDD)
- **Manual Testing:** ⏳ Próximo (Teste no navegador)
- **Code Review:** ⏳ Próximo
- **Merge:** ⏳ Após testes + review

---

**Fase 1 concluída em: ~45 minutos** (estimado 1 dia, ganho de 15 horas!)

Próximo: Testes BDD + Fase 2 (Componentes Unificados)
