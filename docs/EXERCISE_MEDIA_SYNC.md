# Exercise Media Synchronization

Este documento explica como sincronizar imagens e GIFs de exercícios do repositório externo (exercises-dataset) com o PeakForm.

## Overview

O sistema sincroniza automaticamente:
- **Imagens** de exercícios (JPG)
- **GIFs** de demonstração (animados)
- **Instruções** (instruction steps)

De um dataset externo (https://github.com/hasaneyldrm/exercises-dataset) para o PeakForm.

## Como Funciona

### 1. **Matching Fuzzy**
O sistema usa similaridade de string (Levenshtein distance) para fazer match entre:
- Nome do exercício no PeakForm
- Nome do exercício no dataset externo

Exemplos de match:
- "Supino Reto com Barra" ↔ "Barbell Bench Press"
- "Rosca Direta" ↔ "Barbell Bicep Curl"
- "Agachamento" ↔ "Barbell Back Squat"

### 2. **Upload de Mídia**
As imagens e GIFs são:
- Lidas do filesystem local
- Feitas upload para MinIO/S3
- Armazenadas com ID único do media

### 3. **Atualização de Dados**
Cada exercício é atualizado com:
- URL da mídia (imagem ou GIF)
- Instruções em passos (se não tiver)

## Usando a Sincronização

### Via Command Line (CLI)

```bash
# No container da API
docker exec peakform-api-1 npm run sync:exercise-media

# Ou com caminho customizado
docker exec peakform-api-1 npm run sync:exercise-media -- --dataset /tmp/exercises-dataset
```

### Via API HTTP

```bash
# Fazer login como admin
curl -X POST http://localhost:3001/admin/exercises/sync/media-from-dataset \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json"

# Com caminho customizado
curl -X POST "http://localhost:3001/admin/exercises/sync/media-from-dataset?datasetPath=/tmp/exercises-dataset" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## Response

```json
{
  "message": "Sync completed",
  "processed": 1324,
  "uploaded": 450,
  "updated": 450,
  "errors": 12
}
```

## Estrutura do Dataset

```
exercises-dataset/
├── data/
│   ├── exercises.json      # Lista completa de exercícios
│   └── exercises.schema.json
├── images/                  # 1324 imagens JPG
│   ├── 0001-2gPfomN.jpg
│   ├── 0002-Hy9D21L.jpg
│   └── ...
└── videos/                  # 1324 GIFs
    ├── 0001-2gPfomN.gif
    ├── 0002-Hy9D21L.gif
    └── ...
```

## Configuração

### Environment Variables

```env
# MinIO/S3
S3_ENDPOINT=minio:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=peakform
S3_PUBLIC_URL=http://minio:9000
```

### Threshold de Similarity

No arquivo `sync-exercise-media.service.ts`, linha 72:
```typescript
const bestScore = 0.5; // Ajustar para ser mais/menos rigoroso
```

- **0.5**: Mais permissivo (menos matches exatos)
- **0.7**: Balanceado (recomendado)
- **0.9**: Muito rigoroso (poucos matches)

## Exemplo de Execução

```bash
$ docker exec peakform-api-1 npm run sync:exercise-media

Starting sync from: /tmp/exercises-dataset
Loaded 1324 exercises from dataset
Found 450 exercises in PeakForm
Updated: Bench Press with media
Updated: Squat with media
Updated: Deadlift with media
...
Sync duration: 4m 32s

✅ Sync completed successfully!
📊 Results:
   Processed: 1324
   Uploaded:  450
   Updated:   450
   Errors:    12
```

## Troubleshooting

### Erro: "Dataset not found"
Certifique-se que o dataset foi clonado:
```bash
git clone https://github.com/hasaneyldrm/exercises-dataset.git /tmp/exercises-dataset
```

### Erro: "S3 connection failed"
Verifique se MinIO está rodando:
```bash
docker exec peakform-minio-1 ps aux | grep minio
```

### Poucos exercícios sendo atualizados
Ajuste o threshold de similaridade em `sync-exercise-media.service.ts`:
```typescript
const bestScore = 0.6; // Reduzir para 0.6
```

## Performance

- **Tempo típico**: 4-6 minutos para 450 exercícios
- **Uptime**: Seguro executar em produção (não afeta users)
- **Concorrência**: Não, executa sequencialmente

## Próximas Melhorias

- [ ] Cache de matches já feitos
- [ ] Suporte a múltiplos idiomas
- [ ] Priorização por popularidade
- [ ] Execução em background jobs
- [ ] Webhook para notificar ao terminar
