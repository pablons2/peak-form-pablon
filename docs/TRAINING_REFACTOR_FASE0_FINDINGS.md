# Fase 0 — Diagnóstico & Validação — FINDINGS

**Data:** 2026-09-23  
**Status:** ✅ COMPLETO (Análise de Código)  
**Bloqueador:** Ainda precisa validar dados no BD (Docker não rodou)

---

## 📊 Resumo Executivo

### Conclusão Preliminar
**Backend está correto do ponto de vista de lógica. Problema é provavelmente:**
1. **Dados:** Plano não foi criado com `clientId` correto no BD
2. **Dados:** Cliente esperado não existe ou tem ID diferente
3. **Frontend:** Erro ao chamar API ou na exibição

**Recomendação:** Validar dados no BD rodando `make up` e verificar se plano existe para client2.

---

## 🔍 Análise de Código — Backend

### 0.1 ✅ Endpoint GET /training-plans/mine

**Arquivo:** `apps/api/src/training-plans/presentation/training-plans.controller.ts:90-95`

```typescript
@Roles(Role.CLIENT)
@Get("mine")
listMineHandler(@CurrentUser() user: UserWithProfiles) {
  return this.listPlans
    .listMine(user.id)
    .then((plans) => plans.map(toPublicTrainingPlan));
}
```

**Status:** ✅ Correto
- Acessa apenas usuários com role `CLIENT`
- Passa `user.id` como `clientId` para o use case
- Mapeia resultado via serializer

---

### 0.2 ✅ Use Case: listMine

**Arquivo:** `apps/api/src/training-plans/application/use-cases/list-training-plans.use-case.ts:18-20`

```typescript
listMine(clientId: string) {
  return this.plans.listForClient(clientId);
}
```

**Status:** ✅ Correto
- Simplesmente passa clientId para repository
- Sem filtros adicionais
- Sem restrições de status

---

### 0.3 ✅ Repository: listForClient

**Arquivo:** `apps/api/src/training-plans/infrastructure/prisma-training-plan.repository.ts:46-52`

```typescript
listForClient(clientId: string): Promise<TrainingPlanWithMesocycles[]> {
  return this.prisma.trainingPlan.findMany({
    where: { clientId },
    include: WITH_MESOCYCLES,
    orderBy: { createdAt: "desc" },
  });
}
```

**Status:** ✅ Correto
- Query básica: `WHERE clientId = ?`
- Sem filtro por status
- Sem restrições de tipo

---

### 0.4 ✅ Create Plan: setando clientId

**Arquivo:** `apps/api/src/training-plans/application/use-cases/create-training-plan.use-case.ts:52-59`

```typescript
return this.plans.create({
  clientId: input.clientId,        // ← ✅ Sendo preenchido
  professionalId,
  authoredById: null,
  name: input.name,
  startDate: input.startDate,
  isStarterTemplate: false,
});
```

**Status:** ✅ Correto
- `clientId` está sendo preenchido com `input.clientId`
- Validação de cliente existe (linha 34-37)
- Gating de intake funciona (linha 45-50)

---

### 0.5 ✅ Schema: TrainingPlan

**Arquivo:** `apps/api/prisma/schema.prisma:603-624`

```prisma
model TrainingPlan {
  id             String             @id
  clientId       String?            // ← Nullable
  client         User?              @relation(...)
  professionalId String?
  professional   User?              @relation(...)
  authoredById   String?
  name           String
  startDate      DateTime           @db.Date
  status         TrainingPlanStatus @default(DRAFT)
  isStarterTemplate Boolean         @default(false)
  
  @@index([clientId])
  @@index([professionalId])
}
```

**Status:** ✅ Correto
- `clientId` é campo nullable (correto para starter templates)
- Índice em `clientId` (performance ok)
- Relação correta com User

---

## 🔍 Análise de Código — Frontend

### 0.6 ✅ API Client

**Arquivo:** `apps/web/features/training-plans/api-client.ts:151-153`

```typescript
export function listMyTrainingPlans(accessToken: string) {
  return request<PublicTrainingPlan[]>(accessToken, "/training-plans/mine");
}
```

**Status:** ✅ Correto
- Chama endpoint certo: `/training-plans/mine`
- Usando access token (auth ok)
- Tipado como `PublicTrainingPlan[]`

---

### 0.7 ✅ Pages

**Arquivo:** `apps/web/app/(app)/plans/page.tsx`

```typescript
export default async function MyPlansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const accessToken = session.accessToken!;
  const result = await listMyTrainingPlans(accessToken);  // ← Chama API
  const plans = result.ok ? result.data : [];
```

**Status:** ✅ Correto
- Role guard: apenas CLIENT
- Chamando API corretamente
- Fallback a array vazio se erro

---

## 🚨 Problema Identificado

Após análise completa do código:

| Layer | Status | Conclusão |
|-------|--------|-----------|
| Backend Controller | ✅ OK | Endpoint está correto |
| Use Case | ✅ OK | Lógica sem filtros extras |
| Repository | ✅ OK | Query simples `WHERE clientId` |
| Create Logic | ✅ OK | Salva `clientId` corretamente |
| Schema | ✅ OK | Campo existe e está indexado |
| Frontend API | ✅ OK | Chama endpoint correto |
| Frontend Page | ✅ OK | Renderiza resultado |

**Conclusão:** ❌ **Código está correto. Problema é nos dados.**

---

## 📋 Hipóteses (Ordem de Probabilidade)

### H1: 🔴 **MuitoProvável** — Plano não foi criado com clientId

**Cenário:** Profissional criou plano, mas `clientId` ficou NULL ou vazio

**Como validar:**
```sql
SELECT id, client_id, professional_id, name, status 
FROM training_plans 
WHERE name LIKE '%Musculação%' OR professional_id = 'prof_id';
```

**Se verdade:** Problema está na criação (validação de dados no form ou na API)

---

### H2: 🟠 **Possível** — Cliente tem ID diferente do esperado

**Cenário:** `client2` no seu teste é identificado por outro ID no BD

**Como validar:**
```sql
SELECT id, email, full_name, role FROM users WHERE email LIKE '%client%' OR full_name = 'client2';
```

**Se verdade:** Problema está na integração ou no seed de dados

---

### H3: 🟡 **Menos Provável** — Erro de autenticação

**Cenário:** Cliente está fazendo request mas `user.id` não é o que deveria ser

**Como validar:**
- Login como cliente
- Verificar `user.id` na sessão
- Comparar com `clientId` do plano no BD

**Se verdade:** Problema está em NextAuth ou session management

---

### H4: 🟡 **Menos Provável** — Filtro oculto no endpoint

**Cenário:** Há um middleware ou guard que filtra resultados

**Análise:** Já revisei todo código, não encontrei filtro adicional

---

## ✅ Próximos Passos (Para Validar Dados)

### CRÍTICO: Rodar Docker Stack
```bash
cd /home/pablon/Documents/projetos/peak-form-pablon
make up  # Inicia postgres + api + web + seed
```

### CRÍTICO: Validar Dados

```bash
# Conectar ao adminer (http://localhost:8080)
# Ou via psql:
psql postgresql://peakform:peakform_dev@localhost:5432/peakform

# Query 1: Listar todos os planos
SELECT id, client_id, professional_id, name, status FROM training_plans;

# Query 2: Listar clientes
SELECT id, email, full_name FROM users WHERE role = 'CLIENT';

# Query 3: Procurar plano de "client2"
SELECT id, client_id, professional_id, name FROM training_plans 
WHERE client_id = (SELECT id FROM users WHERE email ILIKE '%client%');

# Query 4: Procurar por nome de plano
SELECT id, client_id, professional_id, name FROM training_plans 
WHERE name ILIKE '%musculação%' OR name ILIKE '%training%';
```

---

## 📊 Matriz de Decisão

```
┌─────────────────────────────────────┐
│ RESULTADO ESPERADO DO BD            │
├─────────────────────────────────────┤
│ ✅ Plano existe com clientId correto│
│    → Problema é FRONTEND/SESSION    │
│    → Ir para debugging de auth      │
│                                      │
│ ❌ Plano não existe                 │
│    → Problema é CRIAÇÃO/DADOS       │
│    → Revisar form no frontend       │
│    → Revisar create endpoint        │
│                                      │
│ ⚠️  Plano existe mas clientId NULL  │
│    → Problema é VALIDATION          │
│    → Adicionar validação na create  │
└─────────────────────────────────────┘
```

---

## 🎯 Recomendação Final

### **Antes de continuar com Fases 1-6:**

1. ✅ **AGORA:** Código backend/frontend está ok
2. 🔴 **PRÓXIMO:** Validar dados no BD
3. 📊 **ENTÃO:** Decidir próximo passo baseado em dados

### Timeline
- Rodar `make up`: ~5 min (Docker build + migrations)
- Queries BD: ~2 min
- Análise: ~5 min
- **Total: ~12 minutos até conclusão**

---

## 📎 Referências

| Arquivo | Linha | O Quê |
|---------|-------|-------|
| controller | 90-95 | Endpoint /mine |
| use-case | 18-20 | listMine |
| repository | 46-52 | Query listForClient |
| create | 52-59 | setando clientId |
| schema | 603-624 | model TrainingPlan |
| api-client | 151-153 | listMyTrainingPlans |
| page | - | /plans page |

---

**Status:** ✅ Análise de código concluída  
**Próximo:** Executar BD queries para validar dados  
**Estimado:** 12 minutos até conclusão de Fase 0
