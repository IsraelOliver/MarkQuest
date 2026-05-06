# Relatório técnico de confiabilidade OMR

Data: 2026-04-30

Este documento descreve o estado atual da leitura OMR do MarkQuest após as melhorias de rastreabilidade, rasterização de PDF, tolerância espacial, detecção estrutural, rotação automática e warning de baixa confiança.

## Visão geral do fluxo atual

1. O usuário envia um cartão por upload.
2. O backend valida o arquivo antes de persistir.
3. `OMRService.process` carrega upload, template e gabarito.
4. Se o upload for PDF, `pdf-rasterizer.ts` rasteriza a primeira página como PNG.
5. `analyzeAnswerSheetImage` executa o pré-processamento e a leitura por pixel.
6. `correctAnswers` compara a detecção com o gabarito.
7. O resultado é persistido em `results`, `studentResults` e `jobs`.
8. O job recebe `uploadReports` com métricas técnicas por arquivo.

O sistema não usa IA para leitura OMR. A leitura é determinística e baseada em pixels.

## Bibliotecas usadas

- `jimp`: leitura, normalização, rotação leve, binarização e análise de pixels.
- `pdfjs-dist`: leitura/renderização de PDF.
- `@napi-rs/canvas`: canvas usado na rasterização do PDF.
- `vitest`: testes automatizados.

## Funções principais

- `OMRService.process`: orquestra uploads, rasterização, engine, correção e persistência.
- `rasterizePdfFirstPage`: converte PDF para PNG em `144 DPI`.
- `preprocessImage`: aplica escala de cinza, detecção estrutural, rotação leve, crop e binarização.
- `analyzeAnswerSheetImage`: calcula posições das bolhas, lê marcações e gera metadata.
- `getBestBubbleFillRatio`: aplica tolerância espacial local ao redor da bolha esperada.
- `detectMarkedOption`: classifica cada questão como marcada, branca ou múltipla.
- `correctAnswers`: calcula acertos, erros e score.

## Arquivos suportados

Suportado:

- PNG.
- JPG/JPEG.
- PDF de uma página, rasterizado antes da leitura.

Parcialmente suportado:

- PDF multipágina. Apenas a primeira página é processada. O relatório registra:
  `PDF com múltiplas páginas: apenas a primeira página foi processada.`

Não suportado:

- PDF protegido, corrompido ou não rasterizável.
- Arquivos fora dos tipos aceitos no upload.
- Arquivos que dependam de leitura vetorial direta do PDF. O fluxo sempre rasteriza antes.

## Tipos de resposta realmente suportados

Suportado automaticamente:

- Múltipla escolha com alternativas A-E.
- Questão em branco.
- Múltipla marcação.

Não suportado automaticamente:

- Questões discursivas.
- Redação.
- Questões matemáticas com campos/quadradinhos.
- Imagens como questão.
- Qualquer leitura manual ou sem estrutura de bolhas objetiva.

Esses tipos podem existir no template, mas não são lidos automaticamente pelo engine OMR atual.

## Metadata gerada em `uploadReports`

Para cada upload processado, o job pode registrar:

- `uploadId`
- `fileName`
- `mimeType`
- `status`
- `processedAt`
- `originalMimeType`
- `processedMimeType`
- `originalFileWasPdf`
- `processedPage`
- `pdfPageCount`
- `rasterizationDpi`
- `warning`
- `width`
- `height`
- `autoRotationAngle`
- `rotationCandidates`
- `rotationConfidence`
- `lowConfidenceWarning`
- `boundingBoxDetected`
- `cropApplied`
- `cropFallbackUsed`
- `originalWidth`
- `originalHeight`
- `processedWidth`
- `processedHeight`
- `displacementAverage`
- `maxDisplacementDetected`
- `spatialCorrectionApplied`
- `confidenceAverage`
- `blankQuestionsCount`
- `multipleMarkedQuestionsCount`
- `error`

Esses campos são diagnósticos. Eles não mudam o formato final das respostas detectadas.

## Cenários testados

Os testes atuais cobrem:

- PNG controlado gerado no estilo MarkQuest.
- PDF de uma página derivado da fixture PNG.
- PDF multipágina com validação de `pdfPageCount === 2`, `processedPage === 1` e warning.
- PDF inválido/não rasterizável.
- Imagem alinhada.
- Leve deslocamento local das marcações.
- Leve rotação.
- Rotação acima da capacidade inicial.
- Margem extra ao redor do cartão.
- Sombra leve e ruído simples.
- Ausência de marcadores de canto, usando fallback antigo de crop.
- Questões em branco.
- Múltipla marcação.
- Marcações degradadas/fracas com warning de baixa confiança.

## Cenários suportados

Estes cenários são considerados seguros dentro das condições testadas:

- PNG/JPG/JPEG legível, bem enquadrado e com layout compatível com o template.
- PDF de uma página rasterizável.
- Cartão com os quatro marcadores de canto visíveis.
- Cartão alinhado.
- Leve rotação dentro da faixa inicial de busca `-3` a `+3` graus.
- Leve deslocamento local da marca em torno da bolha esperada.
- Questões objetivas A-E.
- Questões em branco.
- Questões com múltipla marcação.

## Cenários parcialmente suportados

Estes cenários podem funcionar, mas exigem revisão ou interpretação cuidadosa:

- PDF multipágina: somente a primeira página é processada.
- Cartão sem marcadores de canto: usa fallback por pixels escuros, menos estrutural.
- Marcações fracas/degradadas: o sistema mantém a leitura detectada, mas registra `lowConfidenceWarning`.
- Rotação no limite da busca: pode gerar warning quando a decisão de rotação é fraca.
- Sombra leve ou ruído simples: testado em fixture controlada, mas não equivale a iluminação ruim real em massa.
- Margem extra: suportada quando os marcadores de canto continuam detectáveis.

## Cenários não suportados/confiáveis

Estes cenários ainda não devem ser considerados confiáveis:

- Perspectiva forte, foto inclinada em 3D ou folha fotografada em ângulo.
- Dobra, curvatura ou ondulação da folha.
- Baixa resolução severa.
- Iluminação ruim, sombras fortes, reflexos ou fundo irregular.
- Cartão cortado sem bolhas ou sem área útil suficiente.
- Marcadores de canto ausentes junto com ruído/logos/textos que confundam o fallback.
- Layout fora do template OMR configurado.
- Número de questões/colunas diferente do esperado pelo template.
- Alternativas fora de A-E.
- Questões matemáticas, abertas, redação ou imagem como leitura automática.
- Correção de perspectiva completa.
- Detecção automática de layout desconhecido.

## Critérios de baixa confiança

O engine registra:

`Leitura OMR com baixa confiança. Revise o cartão processado.`

quando ocorre pelo menos um dos critérios:

- confiança média da leitura menor que `0.68`;
- mais de `50%` das questões detectadas como brancas;
- rotação escolhida no limite `±3` com `rotationConfidence < 0.05`.

O warning não altera respostas, acertos ou score. Ele apenas sinaliza que o resultado deve ser revisado.

## Rotação automática

A rotação automática usa faixa leve:

- `-3`
- `-2`
- `-1`
- `0`
- `1`
- `2`
- `3`

Quando os marcadores de canto existem, a escolha usa alinhamento geométrico dos marcadores.

Quando não há marcadores confiáveis, usa métrica de projeção/transições como fallback.

Em empate ou diferença pequena, o sistema prefere a menor rotação absoluta. Assim, quando `0` for equivalente, `0` é escolhido.

## Limites técnicos atuais

- O sistema ainda não faz correção de perspectiva.
- O sistema ainda não identifica automaticamente templates desconhecidos.
- O sistema depende de `omrConfig` coerente com o layout real.
- PDF é rasterizado somente na primeira página.
- A tolerância espacial é local e pequena; ela não substitui alinhamento global.
- A baixa confiança é sinalizada, mas não bloqueia automaticamente o resultado.
- O engine não valida visualmente se o cartão pertence ao template, apenas lê conforme coordenadas configuradas.

## Comandos de teste

Comandos usados para validar o estado atual:

```powershell
cd backend
npm run test -- omr.real-engine.test.ts
npm run test -- omr.contracts.test.ts omr.real-engine.test.ts
npm run test
npm run build
```

Na raiz:

```powershell
npm run build
```

## Total atual de testes

Na última execução completa do backend:

- `4` arquivos de teste passaram.
- `28` testes passaram.

Resultado:

```text
Test Files  4 passed (4)
Tests       28 passed (28)
```

## Conclusão

O OMR atual é confiável para cartões objetivos A-E, gerados no layout esperado, com boa qualidade visual, marcadores de canto visíveis e pequenas variações de rotação/deslocamento.

O sistema já possui rastreabilidade suficiente para diagnosticar muitos casos de falha ou baixa confiança.

Ainda não deve ser tratado como um leitor robusto para fotos reais em condições variadas, perspectiva forte, baixa resolução, iluminação ruim ou layouts fora do template.
