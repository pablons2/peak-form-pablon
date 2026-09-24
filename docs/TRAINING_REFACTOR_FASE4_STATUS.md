# Fase 4 — Notificação & Descoberta — STATUS

**Data:** 2026-09-23
**Status:** ✅ **IMPLEMENTADO**
**Tempo Estimado:** 2 dias

---

## 🔍 Descoberta Chave

A infraestrutura de notificação da PRD 12 **já existia quase completa**:

- ✅ `GET /notifications` + unread count (o badge da nav já consumia)
- ✅ Dispatcher (`DispatchNotificationUseCase`): Notification row + e-mail (Nodemailer/MailHog) + push, com preferências por tipo
- ✅ Event bus in-process (`DomainEventBus`) com 8 triggers já mapeados
- ✅ `PLAN_UPDATED` já notificava o cliente quando um plano ficava ACTIVE

**O gap real:** o momento "você recebeu um plano novo" usava o texto genérico
"Plano de treino atualizado" — enganoso para uma primeira atribuição. Além disso,
planos são criados como DRAFT (por design, PRD 12: rascunhos não notificam ninguém),
então o gatilho correto é a publicação (DRAFT → ACTIVE).

---

## ✅ O Que Foi Feito

### 4.1 ✅ Evento `TRAINING_PLAN_CREATED`

- ✅ `domain-event-bus.port.ts` — constante + `TrainingPlanCreatedPayload`
  (`planId`, `clientId`, `professionalId`, `planName`)
- ✅ `update-training-plan.use-case.ts` — o flip DRAFT → ACTIVE emite o novo
  evento (com o nome do plano); edições de planos já-ativos continuam em
  `PLAN_UPDATED` (dedupe same-day intacto no dispatcher)
- ✅ Action-triggered: `dedupeKeyFor` retorna `null` (uma publicação = uma notificação)

### 4.2 ✅ E-mail ao cliente

- ✅ Via dispatcher existente — `renderEmail` gera subject/texto a partir de
  `describeNotification`; cai no MailHog local como os demais tipos

### 4.3 ✅ Tipo de notificação + persistência

- ✅ `NotificationType.TRAINING_PLAN_CREATED` no enum do Prisma
- ✅ Migration SQL gerada e **aplicada** no `peakform` e `peakform_test`
- ✅ `PREFERENCE_ELIGIBLE_TYPES` — o tipo aparece nas preferências (default: e-mail + push on)
- ✅ `notification-text.ts` — "Novo plano de treino" / "Seu treinador criou um novo plano para você: {nome}."
- ✅ `notification-event-listener.service.ts` — subscription → dispatch para o cliente

### 4.4 ✅ `GET /notifications`

- ✅ Já existia (lista + `unreadCount` + mark-read/mark-all) — verificado, sem mudanças

### 4.5 ✅ Frontend

- ✅ Badge de notificações na nav **já existia** (lê o mesmo `unreadCount`)
- ✅ `api-client.ts` — `NotificationType` union atualizada
- ✅ `labels.ts` — "Novo plano de treino" nas labels de tipo/preferências

### 4.6 ✅ Verificação

- ✅ `notification-types.spec.ts` — novos asserts (preference-eligible + dedupe null);
  o teste de partição do enum cobre o novo tipo automaticamente
- ✅ Suite BDD: **172/174 passando** (as 2 falhas são pré-existentes e não
  relacionadas — drift de mensagem EN/pt-BR em link-lifecycle e messaging;
  confirmado via `git stash`)
- ✅ `tsc --noEmit` limpo no API e no Web (3 erros pré-existentes no Web, arquivos não tocados)
- ⚠️ ESLint do API não roda: **não há config ESLint em `apps/api`** (gap pré-existente do repo)

---

## ⚠️ Pendências Ambientais (root-owned, requer sudo)

O diretório `apps/api/prisma/migrations/` é root-owned (escrito por container),
então o arquivo de migration não pôde ser criado lá. O SQL já foi aplicado no
banco (dev + test) e o client Prisma regenerado — falta apenas materializar o
arquivo para o histórico de migrações:

```bash
sudo chown -R pablon:pablon apps/api/prisma/migrations
mkdir -p apps/api/prisma/migrations/20260923120000_training_plan_created_notification
cp /tmp/training-plan-created-migration/migration.sql \
   apps/api/prisma/migrations/20260923120000_training_plan_created_notification/migration.sql
```

Sem isso, um futuro `prisma migrate dev` detectará drift e tentará recriar o enum.

> Obs.: o mesmo problema de ownership afeta `apps/web/.next/types` (bloqueia
> `next build`) e `apps/api/dist` (bloqueia tsc incremental). Sugestão única:
> `sudo chown -R pablon:pablon apps/api/dist apps/api/prisma/migrations apps/web/.next`

Para o stack Docker pegar as mudanças: rebuild do container da API
(`docker compose up -d --build api`).

---

## 🔧 Arquivos Modificados

**Backend:**
- `apps/api/prisma/schema.prisma` (enum)
- `apps/api/src/shared/domain-events/domain-event-bus.port.ts` (evento + payload)
- `apps/api/src/training-plans/application/use-cases/update-training-plan.use-case.ts` (emissor)
- `apps/api/src/notifications/domain/notification-types.ts` (preference-eligible)
- `apps/api/src/notifications/domain/notification-text.ts` (copy pt-BR)
- `apps/api/src/notifications/infrastructure/notification-event-listener.service.ts` (subscription)
- `apps/api/src/notifications/domain/notification-types.spec.ts` (testes)

**Frontend:**
- `apps/web/features/notifications/api-client.ts` (type union)
- `apps/web/features/notifications/labels.ts` (label)

---

## 🚀 Próximos Passos

- **Fase 5:** QA completa — E2E manual do fluxo (profissional publica → cliente
  vê badge → notificação → /plans), volume, performance, acessibilidade
- **Backlog:** filtro por status em `/plans`; drift EN/pt-BR nos testes de link

---

## ✅ Status Final Fase 4

- **Implementação:** ✅ 100% completa
- **Testes backend:** ✅ 172/174 (2 falhas pré-existentes, não relacionadas)
- **Typecheck:** ✅ API + Web
- **Migration:** ⚠️ aplicada no banco; arquivo pendente de `chown` (ver acima)
