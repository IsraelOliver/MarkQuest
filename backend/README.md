# MarkQuest API

API backend do MarkQuest (Node.js + TypeScript + Fastify) com pipeline OMR modular, correção por gabarito e persistência local em JSON.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run start
```

## Variáveis de ambiente

```env
NODE_ENV=development
PORT=3333
HOST=0.0.0.0
UPLOAD_DIR=uploads
DATA_FILE=data/markquest-db.json
```

## Endpoints

- `GET /health`
- `POST /api/uploads`
- `POST /api/templates`
- `GET /api/templates`
- `POST /api/answer-keys`
- `GET /api/answer-keys`
- `POST /api/omr/process`
- `GET /api/results`
- `GET /api/results/:id`
- `GET /api/results/:id/export`

## Fluxo recomendado

1. Upload do cartão (imagem).
2. Criação de template (com mapa OMR ou default).
3. Criação de gabarito ligado ao template.
4. Processamento OMR com `uploadIds`.
5. Consulta e exportação de resultados.

## Exemplos

### 1) Upload

```bash
curl -X POST http://localhost:3333/api/uploads \
  -F "examId=exam-001" \
  -F "studentId=student-001" \
  -F "file=@./samples/card-01.jpg"
```

Resposta (resumo):

```json
{
  "success": true,
  "data": {
    "id": "upl_xxx",
    "examId": "exam-001",
    "studentId": "student-001",
    "path": ".../uploads/upload_xxx.jpg"
  }
}
```

### 2) Criar template

```bash
curl -X POST http://localhost:3333/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Template 20Q v1",
    "examId":"exam-001",
    "totalQuestions":20
  }'
```

### 3) Criar gabarito

```bash
curl -X POST http://localhost:3333/api/answer-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Gabarito Oficial A",
    "examId":"exam-001",
    "templateId":"tpl_xxx",
    "answers":["A","B","C","D","E","A","B","C","D","E","A","B","C","D","E","A","B","C","D","E"]
  }'
```

### 4) Processar OMR

```bash
curl -X POST http://localhost:3333/api/omr/process \
  -H "Content-Type: application/json" \
  -d '{
    "examId":"exam-001",
    "uploadIds":["upl_xxx"],
    "templateId":"tpl_xxx",
    "answerKeyId":"key_xxx"
  }'
```

Resposta (resumo):

```json
{
  "success": true,
  "data": {
    "id": "job_xxx",
    "status": "completed",
    "templateId": "tpl_xxx",
    "answerKeyId": "key_xxx",
    "files": [
      {
        "id": "omr_xxx",
        "totalQuestions": 20,
        "totalCorrect": 16,
        "totalIncorrect": 4,
        "score": 80,
        "confidenceAverage": 0.87
      }
    ]
  }
}
```

### 5) Consultar e exportar

```bash
curl http://localhost:3333/api/results
curl http://localhost:3333/api/results/job_xxx
curl -OJ http://localhost:3333/api/results/job_xxx/export
```

## Limitações atuais

- Template fixo por coordenadas relativas (não há detecção automática de múltiplos layouts complexos).
- Correção de rotação é leve (ângulos pequenos) e não cobre casos extremos.
- Correção de perspectiva ainda é básica (normalização por bounding box de conteúdo).
- Melhorias futuras recomendadas: detecção por pontos de referência, deskew avançado, segmentação robusta e calibração por dataset real.
