# Quick Reference — Training System Refactor

**Status:** 🟠 Planejamento  
**Prioridade:** 🔴 CRÍTICA  
**Documento Completo:** [`TRAINING_REFACTOR_ANALYSIS.md`](./TRAINING_REFACTOR_ANALYSIS.md)

---

## 📋 TL;DR

**Problema:** Cliente não consegue ver treino que profissional criou para ele.

**Raiz:** Fluxo desconexo entre criação (profissional) e visualização (cliente); falta de descoberta/notificação.

**Solução:** 6 fases:
1. ✅ Diagnóstico (Fase 0)
2. 🎨 Discovery Card no dashboard (Fase 1)
3. 🧩 Componentes unificados (Fase 2)
4. 📱 Responsividade (Fase 3)
5. 🔔 Notificação quando plano criado (Fase 4)
6. ✅ Validação completa (Fase 5)
7. 📊 Monitoria (Fase 6)

**Timeline:** ~10 dias (critical path)

---

## 🚨 Fase 0: DIAGNÓSTICO (BLOCKER) — Fazer AGORA

**Por quê?** Precisa validar se problema é frontend ou backend antes de qualquer refatoração.

### Tarefas Rápidas
- [ ] Verificar BD: existe `TrainingPlan` para `client2`?
- [ ] Testar API: `curl -H "Authorization: Bearer $TOKEN" $API/training-plans`
- [ ] Revisar controller: `/my-training-plans` filtra corretamente?
- [ ] Compilar relatório: **Problema é [Backend/Frontend/Dados]?**

### Saída Esperada
Um de:
- ✅ "Backend ok, problema é frontend" → próxima é Fase 1
- ✅ "Backend retorna vazio quando deveria retornar plano" → fix backend primeiro
- ✅ "Relação clientId está null" → fix schema/migration

**Tempo:** 30 min — 2 horas  
**Status:** ⏳ Bloqueado

---

## 📂 Arquivos Principais

### Para Entender o Problema
| Arquivo | Propósito | Status |
|---------|-----------|--------|
| `/apps/web/app/(app)/plans/page.tsx` | Cliente vê planos aqui | ❌ Quebrado |
| `/apps/web/app/(app)/dashboard/page.tsx` | Cliente acessa por aqui | ⚠️ Sem destaque |
| `/apps/api/src/training-plans/controllers` | Backend retorna planos | ❓ TBD |

### Para Refatorar
| Fase | Arquivo | Ação |
|-----|---------|------|
| 1 | `/apps/web/features/dashboard/` | Criar `TrainingAssignmentCard` |
| 2 | `/apps/web/features/training-plans/components/` | Criar `TrainingPlanCard` |
| 3 | `/apps/web/app/(app)/today/page.tsx` | Responsive review |
| 4 | `/apps/api/src/training-plans/use-cases/` | Adicionar event + email handler |

---

## 🎯 Checklist Master (Todas Fases)

### Fase 0: Diagnóstico
- [ ] Diagnóstico: BD check
- [ ] Diagnóstico: API test
- [ ] Diagnóstico: Controller review
- [ ] Diagnóstico: Compilar relatório

### Fase 1: Discovery Card
- [ ] 1.1 — Criar `TrainingAssignmentCard`
- [ ] 1.2 — Integrar em `/dashboard`
- [ ] 1.3 — Testes BDD
- [ ] 1.4 — Code review & merge

### Fase 2: Componentes
- [ ] 2.1 — Criar `TrainingPlanCard`
- [ ] 2.2 — Refatorar `/plans`
- [ ] 2.3 — Refatorar `TrainingPlansTab`
- [ ] 2.4 — Melhorar `TodayTrainingCard`
- [ ] 2.5 — Testes BDD

### Fase 3: Responsividade
- [ ] 3.1 — Review `/today`
- [ ] 3.2 — Review `/plans`
- [ ] 3.3 — Review `/dashboard`
- [ ] 3.4 — Testes em devices
- [ ] 3.5 — Testes BDD

### Fase 4: Notificação
- [ ] 4.1 — Evento ao criar plano
- [ ] 4.2 — E-mail handler
- [ ] 4.3 — Notificação in-app
- [ ] 4.4 — Endpoint `/notifications`
- [ ] 4.5 — Badge no app
- [ ] 4.6 — Testes BDD

### Fase 5: Validação
- [ ] 5.1 — E2E manual
- [ ] 5.2 — Teste mobile
- [ ] 5.3 — Teste volume
- [ ] 5.4 — Testes BDD complete
- [ ] 5.5 — Performance audit
- [ ] 5.6 — Acessibilidade

### Fase 6: Monitoria
- [ ] 6.1 — Analytics setup
- [ ] 6.2 — Feedback loop
- [ ] 6.3 — Bug tracking
- [ ] 6.4 — v2 Roadmap

---

## 🔍 Perguntas Importantes

### Antes de Começar Fase 1+
1. **Backend retorna planos corretamente?**
   - `GET /my-training-plans` traz o plano criado?
   - Ou retorna vazio?

2. **Relações no BD estão OK?**
   - `TrainingPlan.clientId` está preenchido?
   - `TrainingPlan.status` é `ACTIVE` ou `DRAFT`?

3. **Há filtro de status que bloqueia?**
   - Endpoint filtra por `status IN ('ACTIVE')`?
   - Se plano é `DRAFT`, cliente não vê?

### Antes de Fazer Fase 2
4. **Qual é o visual final de `TrainingPlanCard`?**
   - Mockup aprovado?
   - Cores, typography, layout confirmado?

### Antes de Fase 3
5. **App vai rodar on gym WiFi (spotty)?**
   - Cache de media? offline mode?
   - Rest timer local?

---

## 📊 Métricas de Sucesso

```
Depois de refatoração completa (Fase 6), esperamos:

✅ > 80% de clientes com planos acessam /plans
✅ Cliente descobre plano em < 3 cliques
✅ Tempo em /today > 5 min (exercício real)
✅ 0% de crashes/erros em training screens
✅ NPS da experiência > 7/10
```

---

## 🚀 Como Usar Este Documento

1. **Leia este arquivo** (5 min) para overview
2. **Execute Fase 0** (diagnóstico) — 30 min a 2h
3. **Abra TRAINING_REFACTOR_ANALYSIS.md** — guia completo
4. **Use checklist da fase correspondente** conforme avança
5. **Update este arquivo** com status conforme progride

---

## 💬 Dúvidas?

- Seção 4 de TRAINING_REFACTOR_ANALYSIS: Raízes Profundas
- Seção 7: Roadmap de Refatoração (detalhado)
- Seção 8: Checklist Detalhado (passo a passo)

---

**Atualizado:** 2026-09-23  
**Próximo:** Executar diagnóstico (Fase 0)
