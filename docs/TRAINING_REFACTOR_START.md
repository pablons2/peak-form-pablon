# 🎯 Training System Refactor — START HERE

**Problema:** Cliente não consegue ver treino que profissional criou para ele.

**Solução:** Plano de refatoração em 6 fases (10 dias, crítica para plataforma).

---

## 📚 Documentação Completa

Foram criados **3 documentos** para orientar este projeto:

### 1. **🚀 TRAINING_REFACTOR_QUICK_REF.md** — Comece aqui
   - ✅ TL;DR do problema
   - ✅ Checklist master rápido
   - ✅ Próximos passos imediatos
   - **Tempo de leitura:** 5 minutos

   👉 [**Abra este primeiro**](./TRAINING_REFACTOR_QUICK_REF.md)

### 2. **📊 TRAINING_REFACTOR_TRACKER.md** — Para rastrear progresso
   - ✅ Status de cada fase (0-6)
   - ✅ Checklist detalhada por tarefa
   - ✅ BDD scenarios prontas
   - ✅ Marcos e timeline
   - **Tempo de leitura:** 10 minutos

   👉 [**Use durante a implementação**](./TRAINING_REFACTOR_TRACKER.md)

### 3. **🔍 TRAINING_REFACTOR_ANALYSIS.md** — Análise profunda completa
   - ✅ Diagnóstico em 5 níveis (raízes profundas)
   - ✅ Roadmap detalhado de refatoração (6 fases)
   - ✅ Riscos e mitigações
   - ✅ Métricas de sucesso
   - ✅ Apêndices com referências
   - **Tempo de leitura:** 30-45 minutos

   👉 [**Consulte quando precisar de contexto**](./TRAINING_REFACTOR_ANALYSIS.md)

---

## 🔥 AÇÃO IMEDIATA — Fase 0 (BLOCKER)

### Próximas 2-4 horas: Diagnóstico

Antes de qualquer refatoração, precisa validar **onde está o problema**:

```bash
# 1. Verificar BD
SELECT * FROM training_plans WHERE client_id = 'client2_id';

# 2. Testar API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/training-plans

# 3. Revisar código
# apps/api/src/training-plans/controllers
```

**Saída esperada:**
- ✅ "Backend retorna plano corretamente" → próxima é Fase 1
- ✅ "Backend retorna vazio" → fix backend primeiro
- ✅ "Relação clientId está null" → fix schema primeiro

→ [**Detalhes completos em QUICK_REF.md**](./TRAINING_REFACTOR_QUICK_REF.md)

---

## 📋 Timeline Estimada

```
Fase 0 — Diagnóstico ...................... 2-4 horas
Fase 1 — Discovery Card ................... 1 dia
Fase 2 — Componentes Unificados ........... 1.5 dias
Fase 3 — Responsividade ................... 1.5 dias
Fase 4 — Notificação (Backend) ............ 2 dias
Fase 5 — Validação Completa .............. 1 dia
────────────────────────────────────────────────────
TOTAL (Critical Path) ..................... ~10 dias

Parallelizável: Fases 1-3, depois 4 paralelo
```

---

## 🎯 O Que Vai Mudar Para o Usuário

### Cliente (Hoje ❌ → Depois ✅)

| Antes | Depois |
|-------|--------|
| ❌ Acessa `/plans` → "Sem plano" | ✅ Dashboard mostra "Novo plano" |
| ❌ Não sabe que tem treino atribuído | ✅ Badge + notificação quando criado |
| ❌ Fluxo confuso: dashboard → plans → today | ✅ Caminho claro: dashboard [CTA] → plans → today |
| ❌ UI inconsistente | ✅ Cards unificadas, estilos consistentes |
| ❌ Mobile quebrado no gym | ✅ Funciona bem em phone (WiFi ruim) |

### Profissional (Hoje ❌ → Depois ✅)

| Antes | Depois |
|-------|--------|
| ✅ Cria plano | ✅ Cria plano + vê confirmação de entrega |
| ❌ Não sabe se cliente recebeu | ✅ Badge no dashboard mostra "cliente viu" |
| ❌ Sem feedback visual | ✅ Card mostra status do plano + progresso cliente |

---

## 📞 Estrutura de Documentos

```
docs/
├─ TRAINING_REFACTOR_START.md ............ ← VOCÊ ESTÁ AQUI
├─ TRAINING_REFACTOR_QUICK_REF.md ....... ← Leia depois (5 min)
├─ TRAINING_REFACTOR_TRACKER.md ......... ← Use durante impl
└─ TRAINING_REFACTOR_ANALYSIS.md ........ ← Análise completa
```

### Como Navegar

1. **Primeira vez?** → Leia este arquivo + QUICK_REF.md
2. **Vai começar Fase X?** → Abra TRACKER.md, vá até Fase X
3. **Precisa de contexto/raízes?** → Abra ANALYSIS.md, seção 4
4. **Quer roadmap visual?** → Abra ANALYSIS.md, seção 7

---

## ✅ Definição de Sucesso (Fase 6)

Depois de tudo pronto, esperamos:

| Métrica | Meta |
|---------|------|
| % clientes que veem plano atribuído | > 90% |
| Tempo para descobrir treino | < 3 cliques |
| NPS da experiência | > 7/10 |
| Crashes/Erros em training | 0 |
| Performance `/today` | < 500ms |

---

## 🚀 Comece Agora

### Opção A: Começar pelo Diagnóstico (Recomendado)
1. Abra o terminal
2. Execute comandos da Fase 0 (QUICK_REF.md)
3. Compile findings
4. Continue para Fase 1

### Opção B: Entender o Contexto Primeiro
1. Leia QUICK_REF.md (5 min)
2. Leia ANALYSIS.md seção 4 (raízes profundas) (10 min)
3. Volte para Opção A

### Opção C: Implementação Direta (Se Backend está OK)
1. Abra TRACKER.md
2. Vá para Fase 1 (Discovery Card)
3. Siga checklist passo a passo

---

## 💡 Perguntas Frequentes

### P: Por que 10 dias? Pode ser mais rápido?
**R:** Critical path é: Diagnóstico (2-4h) → Fases 1-3 paralelo (4 dias) → Fase 4 (2 dias) → Validação (1 dia). Pode ser paralelizado com mais devs, mas 10 dias é o timeline realista para qualidade.

### P: Precisamos fazer tudo de uma vez?
**R:** Fase 0 é blocker (precisa fazer agora). Fases 1-3 são frontend (rápidas, podem ser feitas paralelizadas). Fase 4 é backend (2 dias). Fases 5-6 são validação + monitoria (essenciais).

### P: E se backend estiver quebrado?
**R:** Fase 0 vai encontrar. Se sim, prioriza o fix backend antes de frontend. Estimado extra: 1-2 dias.

### P: Posso começar Fase 1 enquanto faz Fase 0?
**R:** Não, porque Fase 1 depende do resultado de Fase 0. Se backend está OK, pode fazer. Se não, tempo perdido.

---

## 📞 Próximo Passo

1. **Agora:** Leia [TRAINING_REFACTOR_QUICK_REF.md](./TRAINING_REFACTOR_QUICK_REF.md) (5 min)
2. **Próximas 2-4 horas:** Execute Fase 0 (diagnóstico)
3. **Depois:** Consulte [TRAINING_REFACTOR_TRACKER.md](./TRAINING_REFACTOR_TRACKER.md) para a fase que vai começar

---

**Criado:** 2026-09-23  
**Status:** 🟠 Planejamento (Fase 0 — Diagnóstico ainda não iniciado)  
**Responsável:** [TBD]

---

## 📎 Links Rápidos

| Documento | Propósito | Tempo |
|-----------|-----------|-------|
| [Quick Ref](./TRAINING_REFACTOR_QUICK_REF.md) | Overview + checklist rápido | 5 min |
| [Tracker](./TRAINING_REFACTOR_TRACKER.md) | Checklist detalhada por fase | 15 min |
| [Análise](./TRAINING_REFACTOR_ANALYSIS.md) | Contexto completo, raízes, roadmap | 45 min |
| [PRD 06](./prds/06-training-plan-builder.md) | Requisitos de criação de planos | 20 min |
| [PRD 07](./prds/07-client-training-execution.md) | Requisitos de execução (cliente) | 20 min |

---

**🚀 Vamos começar!**
