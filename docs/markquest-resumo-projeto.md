# MarkQuest
## Resumo executivo e técnico do projeto

Data de referência: 16 de abril de 2026.

O MarkQuest é uma plataforma voltada para operação acadêmica com foco em cartões-resposta, geração de layouts personalizados, leitura OMR e correção de provas por gabarito. Em termos práticos, ele organiza o ciclo completo de uma avaliação: cadastro da estrutura acadêmica, definição de prova, composição do cartão, envio dos arquivos digitalizados, processamento da leitura e acompanhamento do desempenho.

No momento retratado neste documento, o projeto está em um estágio funcional e claramente mais maduro do que um protótipo visual simples. A branch principal do repositório está em `main`, com histórico nomeado até a versão `v3.0`, e o código mostra um avanço consistente em torno do editor de templates e do fluxo operacional da prova.

O banco local de demonstração indica material real de operação para desenvolvimento: 2 unidades, 3 turmas, 2 provas, 3 alunos, 2 uploads, 12 templates e 1 gabarito cadastrados, além de 4 jobs de processamento já registrados. Há, porém, um sinal importante de maturidade incompleta: apesar dos jobs existentes, o banco local ainda aparece com zero resultados finais persistidos.

Em resumo, o MarkQuest, neste momento, é um produto já orientado a uso real, com identidade funcional própria, com um motor relevante de composição de cartões e leitura, e com uma base promissora para evoluir para uma operação acadêmica mais robusta.

<!-- PAGEBREAK -->

## 1. O que o MarkQuest é como produto

O melhor jeito de entender o MarkQuest é vê-lo como uma plataforma de orquestração de avaliações objetivas. Ele não resolve apenas a leitura de marcações em cartões; ele organiza o antes, o durante e o depois da leitura. Antes da leitura, o sistema permite estruturar unidades, turmas, alunos e provas. Durante a preparação, ele oferece um editor de template bastante rico, capaz de determinar como o cartão-resposta deve ser impresso, quais campos institucionais aparecem e como o bloco de questões será distribuído. Depois disso, o sistema habilita a criação de gabaritos, o recebimento de uploads e o processamento da leitura OMR. Por fim, entrega uma camada de acompanhamento operacional com status, lotes e resultados por aluno.

A proposta do MarkQuest combina três preocupações que normalmente ficam separadas. A primeira é a preocupação acadêmica, isto é, o vínculo entre unidade, turma, aluno e prova. A segunda é a preocupação gráfica, isto é, como o cartão-resposta será montado, impresso e lido. A terceira é a preocupação operacional, isto é, como processar arquivos, aplicar gabaritos e acompanhar o que foi corrigido.

Há um posicionamento claro no texto da landing page. O produto se apresenta como leitura OMR para operação acadêmica, com promessa de automação da correção de provas por meio de um fluxo claro, rastreável e pronto para produção. Mesmo que a frase ainda seja mais aspiracional do que plenamente comprovada pela infraestrutura atual, o tom adotado revela a direção do projeto.

Em termos de público, o projeto parece atender escolas, cursinhos, cursos preparatórios e equipes acadêmicas que precisam de padronização, velocidade e menos dependência de correção manual.

<!-- PAGEBREAK -->

## 2. Estrutura geral do repositório e organização técnica

O projeto está organizado em formato de monorepo leve. Na raiz ficam o frontend, os arquivos de build e a configuração principal. Em `backend/` fica a API. Essa escolha faz sentido para a fase atual porque reduz fricção de desenvolvimento, mantém contexto próximo e facilita evolução simultânea entre interface e servidor.

No frontend, a base usa React 18, React Router DOM, TypeScript e Vite. O código está segmentado em diretórios bem reconhecíveis: `components`, `pages`, `layouts`, `services`, `hooks`, `router`, `utils`, `types`, `styles` e `data`. Essa organização separa bem o que é interface, o que é lógica utilitária, o que é acesso a API e o que é modelagem de domínio.

No backend, a base usa Fastify, TypeScript, `zod`, `@fastify/cors`, `@fastify/multipart` e `jimp`. A combinação é coerente com o problema: Fastify para API veloz, `multipart` para upload de arquivos, `zod` para validação e `jimp` para pré-processamento de imagem.

O armazenamento atual é propositalmente simples: uma classe `JsonRepository` carrega e persiste o estado em `backend/data/markquest-db.json`. Essa abordagem é excelente para desenvolvimento, demos e ciclos rápidos de validação, mas também estabelece um teto claro para escalabilidade, concorrência, auditoria e segurança.

Outro ponto positivo da organização é a existência de contratos explícitos entre frontend e backend. O cliente HTTP define endpoints claros para unidades, turmas, provas, alunos, uploads, resultados, templates e gabaritos. Isso ajuda a enxergar o projeto como um produto já orientado por domínio, não como um conjunto de telas soltas.

No conjunto, a estrutura do repositório é enxuta, compreensível e adequada ao estágio atual. Ela ainda não tem a sofisticação de uma arquitetura enterprise, mas já revela intencionalidade, separação funcional e um esforço de engenharia acima do nível de protótipo.

<!-- PAGEBREAK -->

## 3. Quantas páginas existem e como a navegação está organizada

O código do frontend possui 15 componentes de página dentro de `src/pages`. Desses, 13 estão efetivamente ligados ao roteador principal e 2 parecem remanescentes ou caminhos de navegação antigos ainda não integrados ao fluxo atual. Essa diferença é importante porque mostra que o projeto passou por reorganização de navegação e ainda preserva alguns artefatos de versões anteriores.

As 13 páginas ativas no roteador são: landing, dashboard, unidades, configurações da conta, detalhe da unidade, detalhe da turma, provas da turma, alunos da turma, detalhe da prova, editor de layout/template, gabaritos, uploads e resultados. Além disso, o roteador considera duas entradas para o editor de template: criação e edição de um template já existente.

As páginas presentes no código, mas não conectadas ao roteador atual, são `ClassroomsPage` e `ExamsPage`. Elas ajudam a contar a história do produto. Provavelmente representam etapas anteriores da modelagem de navegação, antes de o fluxo ser mais contextualizado dentro de unidade e turma.

A navegação principal visível na sidebar é mínima: Dashboard, Unidades e Configurações da conta. Isso é interessante porque o sistema não tenta expor toda a árvore de forma plana. Em vez disso, ele força um caminho contextual: primeiro escolhe-se a unidade, depois a turma, depois a prova, e então se acessa o restante do fluxo.

Na prática, o fluxo de navegação fica assim: landing pública, depois painel administrativo, depois unidades, depois turmas dentro da unidade, depois provas dentro da turma, depois a central da prova, e dessa central derivam layout, gabarito, uploads e resultados. Essa sequência é um dos pontos mais fortes do projeto, porque organiza a experiência em torno da prova como núcleo operacional.

Há ainda componentes estruturantes como `MainLayout`, `Sidebar`, `Topbar`, `Cabecalho`, `Breadcrumbs`, `Card`, `Table`, `SectionTitle` e os previews de template. Isso mostra um esforço de consistência visual e reutilização.

<!-- PAGEBREAK -->

## 4. Fluxo funcional do produto e jornada operacional

O fluxo funcional do MarkQuest foi desenhado para espelhar a operação real de uma equipe acadêmica. A unidade representa a entidade organizacional superior. Dentro dela existem turmas. Dentro das turmas existem provas. E a prova funciona como centro operacional. A partir dela, o usuário consegue controlar layout, gabarito, uploads e resultados.

Esse desenho aparece de maneira muito clara na página de detalhe da prova. Ela funciona como uma central operacional com checklist. O sistema verifica se há alunos cadastrados, se existe template salvo, se já foi criado gabarito, se há uploads enviados e se já houve processamento de resultados. Esse checklist é uma solução de produto particularmente boa porque reduz erro operacional.

O fluxo ideal é o seguinte. Primeiro, cadastra-se a unidade. Depois cria-se a turma. Em seguida cria-se a prova, com nome, disciplina e total de questões. Depois define-se o template do cartão-resposta. Em seguida cria-se um gabarito vinculado a esse template. Depois os arquivos dos cartões preenchidos são enviados por aluno. Por fim, selecionam-se template e gabarito ativos para processar o lote, gerando jobs e resultados.

O cuidado com contexto é visível também no hook `useAcademicScope`, que busca unidades, turmas, provas e alunos de forma integrada e ainda tenta restaurar contexto previamente selecionado. Isso mantém a navegação coesa e evita que o usuário se perca a cada tela.

Nas telas de uploads e resultados, o produto abandona uma visão genérica de tabela única e passa a trabalhar com contexto de turma e prova. A página de uploads organiza envios por aluno, enquanto a página de resultados exige a combinação explícita entre lote, template e gabarito. Isso reduz ambiguidade e melhora a rastreabilidade de cada processamento.

Do ponto de vista de produto, essa jornada é um dos ativos mais importantes do MarkQuest. O sistema não tenta apenas "ler bolinhas". Ele tenta tornar auditável o percurso que liga aluno, prova, folha, gabarito e resultado.

<!-- PAGEBREAK -->

## 5. Estrutura visual, componentes e cores utilizadas

O sistema visual do MarkQuest é construído majoritariamente sobre uma paleta fria, profissional e funcional. A base usa tons claros quase sempre sobre branco e azul-acinzentado, com uma sidebar escura para ancorar a navegação. A cor de texto principal é `#0f172a`. O fundo base é `#f8fafc`, acompanhado de gradientes suaves como o radial do `body`, que mistura `#f0f9ff` com `#f8fafc`.

A sidebar adota gradiente vertical entre `#0f172a` e `#111827`, com texto em `#e2e8f0` e labels secundários em `#94a3b8`. A marca reduzida "MQ" aparece em um bloco com gradiente `#38bdf8` para `#6366f1`, o que introduz energia sem abandonar o caráter sóbrio do restante do sistema.

Os botões primários usam gradiente entre `#2563eb` e `#4f46e5`, consolidando o azul e o índigo como eixo de ação principal. Já estados secundários e superfícies usam tons como `#e2e8f0`, `#eff6ff`, `#f8fafc` e `#dbeafe`. Para feedback, há verde para sucesso, laranja para aviso, vermelho para erro e azul para informação.

Os componentes de interface seguem uma linha consistente. `Card` concentra o padrão de bloco branco com borda suave e sombra discreta. `SectionTitle`, `Cabecalho` e `Breadcrumbs` ajudam a contextualizar cada tela. `Table`, `StatsCard`, `UploadArea` e os cards específicos de resultados e prova reforçam o caráter de painel de controle. O editor de template expande esse sistema com áreas de preview, blocos de configuração, painéis de resumo e estados técnicos.

Do ponto de vista tipográfico, o frontend usa Inter, com foco em legibilidade e hierarquia limpa. Não há experimentação estética excessiva. A proposta visual é de software de operação, não de branding emocional.

A responsividade também foi pensada. O CSS possui vários breakpoints reorganizando grids complexos em coluna única, desmontando sidebars fixas e ajustando áreas de preview. Esse cuidado é importante porque o sistema possui muitas telas com painéis laterais e grades densas.

<!-- PAGEBREAK -->

## 6. Editor de templates, geração de PDF e inteligência do cartão-resposta

O módulo mais sofisticado do projeto hoje é, sem dúvida, o editor de templates do cartão-resposta. É nele que o MarkQuest deixa de ser um CRUD acadêmico e passa a demonstrar diferenciação técnica. A tela `TemplatesPage` concentra uma quantidade grande de regras, estados, presets, diagnósticos e visualizações.

O editor não é superficial. Ele trabalha com presets, normalização de estado, validação de configuração, preview visual paginado e persistência de layout. Há suporte para controle de número de questões, quantidade de alternativas, distribuição por colunas, estilos de linha, densidade, bordas, título dos blocos, instruções, logotipo da instituição, campos de identificação e parâmetros de leitura OMR.

No frontend, essa área é sustentada por um conjunto robusto de utilitários: `cardTemplatePresets`, `cardTemplateValidator`, `questionBlocks`, `questionNumbering`, `templateLayout`, `templateLayoutBlueprint`, `templateLayoutGeometry`, `templatePageLayout`, `templateLayoutPdf` e outros. Só a existência desse ecossistema já revela o peso da funcionalidade na história recente do projeto.

A geração de PDF do cartão é acionada a partir da página da prova. O sistema pega o template mais recente, reconstrói o estado do editor e gera os cartões a partir do conjunto de alunos da turma. Esse é um ponto forte porque conecta design, operação acadêmica e saída final pronta para uso.

Outro diferencial está no suporte a blocos de questões e formatos de numeração. O código indica suporte a formatos numéricos e híbridos, como `numeric`, `numericAlpha`, `alphaNumeric`, `numericLower` e `numericDash`. Isso é valioso para provas que agrupam itens por área, caderno ou subquestões.

Em resumo, o editor de templates é o coração de inovação do MarkQuest. É a área onde o projeto mais investiu, onde as últimas versões mais cresceram e onde o produto ganha capacidade real de adaptação a diferentes modelos de avaliação.

<!-- PAGEBREAK -->

## 7. Backend, API e regras de negócio

O backend do MarkQuest tem uma arquitetura objetiva e relativamente bem distribuída. A aplicação é criada com Fastify, registra CORS, multipart e tratamento centralizado de erros, e expõe rotas de saúde e rotas de API sob o prefixo `/api`. As entidades de negócio principais aparecem claramente nas rotas: unidades, turmas, provas, alunos, uploads, processamento OMR, resultados, templates e gabaritos.

As rotas ativas incluem operações de criação e listagem para unidades, CRUD para turmas, CRUD para provas, CRUD para alunos, upload e listagem de arquivos, processamento OMR, consulta e exportação de resultados, criação, listagem, detalhe e edição de templates e criação, listagem e detalhe de gabaritos. Essa cobertura mostra que o backend já não é um mock; ele é a espinha dorsal funcional do sistema.

As regras de validação são feitas com `zod`. No caso de templates, as regras são extensas. O sistema exige `pageSize` igual a A4, total de questões positivo e limitado por `MAX_QUESTIONS`, alternativas entre 2 e 5, estilos controlados, blocos de questões bem definidos, conjunto de campos de identificação e um cabeçalho com parâmetros detalhados, incluindo logo e mensagem de rodapé.

O limite máximo de questões está fixado em 300 tanto no frontend quanto no backend. O modelo OMR aceita parâmetros como colunas, linhas por coluna, posições relativas, espaçamentos, raio da bolha, limiar de marcação e limiar de ambiguidade.

Há, porém, uma observação crítica importante: enquanto o template aceita entre 2 e 5 alternativas e labels alfanuméricos simples, o schema de gabarito do backend ainda restringe respostas aos valores `A`, `B`, `C`, `D` e `E`. Isso significa que a flexibilidade gráfica do template é maior do que a flexibilidade efetiva do contrato de correção.

<!-- PAGEBREAK -->

## 8. Estrutura de dados, persistência e estado atual do banco local

O repositório JSON do backend guarda uma estrutura de dados simples, mas abrangente. O arquivo local persiste unidades, turmas, provas, alunos, uploads, jobs, resultados OMR, resultados por aluno, templates e gabaritos. Isso significa que praticamente todo o domínio do sistema já está modelado e consolidado em um único estado serializado.

No retrato atual do banco local, existem 2 unidades, 3 turmas, 2 provas, 3 alunos, 2 uploads, 4 jobs de processamento, 12 templates e 1 gabarito. Já os arrays de resultados e resultados por aluno estão vazios. Para um documento de contextualização, esse dado é muito importante porque mostra duas coisas ao mesmo tempo: houve uso real do sistema para montar cenários e validar telas; porém a etapa de fechamento de correção e armazenamento de saídas finais ainda não está estabilizada.

Do ponto de vista de engenharia, a persistência em JSON oferece vantagens fortes no estágio atual. Ela permite subir o produto rapidamente, inspecionar dados manualmente, depurar fluxos com facilidade e versionar parte do estado junto do projeto. Em um momento de descoberta de produto, isso acelera muito.

Por outro lado, as limitações também são evidentes. Um arquivo único é ruim para concorrência, para histórico detalhado, para recuperação de falhas, para integridade transacional e para múltiplos operadores simultâneos. Também não há, nesse modelo, camadas robustas de auditoria, permissões finas ou consultas analíticas complexas.

Outro detalhe relevante é que os identificadores são gerados com prefixos por domínio, como `unt_`, `cls_`, `exam_`, `std_`, `upl_`, `job_`, `tpl_` e `key_`. Essa prática melhora legibilidade e rastreamento durante desenvolvimento, suporte e depuração.

Em resumo, o estado de dados do MarkQuest indica um sistema com domínio já bem pensado, mas ainda executado sobre infraestrutura de persistência propositalmente provisória.

<!-- PAGEBREAK -->

## 9. Evolução do projeto e leitura do histórico

O histórico de commits disponível é curto, mas bastante revelador. O projeto começa com `Primeiro commit`, avança para `Layout do cartão-resposta`, passa por `ajustes e refinos`, chega a `v2.1` e depois a `v3.0`. Mesmo com poucos marcos nomeados, a diferença entre os commits mostra um padrão claro: a grande aceleração do produto aconteceu em torno do editor de templates, do preview do cartão, da geração de PDF e da central operacional da prova.

O commit `Layout do cartão-resposta`, em 20 de março de 2026, foi um divisor de águas. Ele adicionou dezenas de arquivos e milhares de linhas, incluindo preview de cartão, validação de template, presets, geometria de layout e geração de PDF. Em outras palavras, foi o momento em que o MarkQuest passou de um sistema administrativo mais tradicional para uma solução com diferenciação real em composição de cartões.

No mesmo dia houve `ajustes e refinos`, o que sugere uma fase imediata de estabilização depois da grande entrega. Em 23 de março de 2026, a versão `v2.1` ampliou ainda mais o editor, refinou blueprint, paginação de layout, numeração de questões e comportamento do PDF. Já em 1º de abril de 2026, `v3.0` trouxe nova expansão significativa: question blocks, limites de questões, melhorias em resultados, uploads, detalhe de prova, identidade visual, logo, rodapé, opção de labels e outras peças importantes da experiência.

Isso leva a uma conclusão prática: o MarkQuest tem uma linha de evolução altamente concentrada em produto e UX operacional, especialmente no fluxo de prova e template. Não é um projeto que ficou estagnado em CRUDs básicos. Ele vem sendo empurrado para resolver o problema específico que o diferencia.

Também chama atenção o estado atual do worktree em 16 de abril de 2026. Há mudanças locais em arquivos diretamente ligados a schemas, entidades, preview de template, página de templates, tipos OMR e utilitários de layout, numeração e validação. Esse recorte mostra que o projeto continua avançando exatamente na sua parte mais estratégica.

<!-- PAGEBREAK -->

## 10. Diagnóstico geral do projeto neste momento

O MarkQuest, no estado atual, reúne qualidades importantes. Ele tem domínio claro, navegação orientada a contexto, arquitetura compreensível, editor de template sofisticado, geração de PDF e backend funcional com contratos explícitos. Há coesão entre problema, interface e código.

Ao mesmo tempo, o sistema ainda mostra sinais de etapa intermediária. A camada de persistência é transitória. Não há suíte de testes automatizados evidente no repositório. Há páginas remanescentes fora do roteador principal. O backend ainda trabalha com respostas A-E no gabarito, o que pode tensionar a flexibilidade prometida pelos templates. E o banco local mostra jobs sem resultados finais persistidos, sinalizando que o ciclo de correção ainda precisa de fechamento mais robusto.

Mesmo assim, o saldo é claramente positivo. O projeto não parece perdido nem inchado. Pelo contrário: ele tem um eixo de valor muito nítido. A central da prova, o checklist operacional, o editor de layout e a integração entre prova, aluno, upload e gabarito formam um núcleo que faz sentido.

Em termos de maturidade, a melhor definição para o MarkQuest hoje é: sistema funcional em fase avançada de lapidação. Ele já suporta demonstração séria, validação de fluxo e uso controlado em ambiente de operação. Porém, ainda precisa de reforço estrutural antes de ser tratado como plataforma pronta para escalar institucionalmente.

Se a equipe mantiver a direção atual, o caminho mais promissor é consolidar confiabilidade: persistência robusta, rastreabilidade melhor, testes, compatibilidade total entre template e correção, processamento OMR mais resiliente e resultados persistidos com consistência.

<!-- PAGEBREAK -->

## 11. Ideias de melhorias e próximas evoluções

- Migrar a persistência local em JSON para um banco relacional ou documento com controle de concorrência, histórico de alterações e melhor base para auditoria.
- Criar autenticação real por usuário e papéis de acesso, separando perfis administrativos, operação acadêmica e eventual visualização de resultados.
- Adicionar dashboards mais analíticos, com visão por turma, prova, disciplina, taxa média de acerto, distribuição de notas e evolução por período.
- Evoluir o motor de resultados para exportações mais ricas, como CSV, PDF consolidado por turma e relatórios comparativos por aluno.
- Incluir versionamento mais explícito de templates e gabaritos, com histórico de mudanças e indicação clara de qual versão foi usada em cada job.
- Melhorar o processo de uploads em lote com barra de progresso, validação visual de arquivo, reprocessamento seletivo e associação automática por QR code ou código do aluno.
- Permitir presets por instituição, com temas salvos, logotipos e cabeçalhos reutilizáveis em várias provas.
- Criar um módulo de homologação do template, capaz de validar visualmente se a configuração é segura para leitura antes da geração final do PDF.
- Adicionar testes automatizados de frontend, backend e regras de template, priorizando validação de question blocks, numeração, paginação e contratos de API.
- Formalizar um fluxo de status dos jobs com estados como enfileirado, processando, concluído, concluído com alertas e falhou, incluindo logs acessíveis na interface.
- Considerar recursos de inteligência assistida para revisão de marcações ambíguas, diminuindo retrabalho humano sem automatizar decisões críticas de forma opaca.

Estas melhorias não mudam a identidade do MarkQuest; elas aprofundam o que o projeto já faz bem.

<!-- PAGEBREAK -->

## 12. Partes críticas que devem ser melhoradas

- Persistência: o arquivo JSON único é útil para prototipagem, mas é o maior gargalo estrutural do projeto para escala, concorrência e segurança.
- Fechamento do fluxo de resultados: o banco local mostra jobs sem resultados persistidos, o que indica necessidade de fortalecer a etapa final da correção.
- Alinhamento entre template e gabarito: o editor aceita configurações mais flexíveis do que o schema atual de gabarito, que ainda restringe respostas a A-E.
- Testes: não há evidência de cobertura automatizada, o que aumenta risco justamente na área mais complexa do sistema, que é a composição e validação do cartão.
- Robustez do OMR: a própria documentação do backend admite limitações em rotação, perspectiva e layouts complexos, então a confiabilidade da leitura ainda precisa amadurecer.
- Governança de versões: templates e gabaritos evoluíram muito, mas o sistema ainda pode avançar em rastreabilidade de qual versão exata participou de cada operação.
- Infraestrutura de produção: ainda faltam sinais de camadas típicas de ambiente maduro, como autenticação forte, banco persistente, observabilidade e tratamento mais rico de falhas.
- Limpeza arquitetural: a presença de páginas fora do roteador principal sugere oportunidade de consolidar navegação e remover ou reintegrar caminhos legados.
- Escalabilidade da interface: o editor de templates é poderoso, mas também complexo; sem onboarding, ajuda contextual e mais automações, ele pode se tornar uma área de curva de aprendizado alta.
- Qualidade de dados: para ambientes reais, será importante endurecer validações de cadastro, duplicidade, integridade entre entidades e padronização de nomes e identificadores.

Em síntese, as partes críticas do MarkQuest não estão no valor do produto, e sim na sustentação da promessa. O produto já é interessante. O risco agora é crescer com uma base ainda provisória.
