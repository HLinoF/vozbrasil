# VozBrasil

Plataforma local de participação cidadã: pesquisas anônimas, ideias moderadas e resultados agregados. **O futuro do Brasil começa com a sua voz.**

## Executar no Windows, sem Docker

Requisitos: **PowerShell 7**, **JDK 21**, **Node.js 24 LTS** e internet na primeira execução. O script baixa Maven 3.9.11 do Maven Central e os binários PostgreSQL distribuídos pela dependência de desenvolvimento Zonky. Não precisa instalar PostgreSQL como serviço.

```powershell
cd C:\Users\lino\Documents\VoizBrasil
# Ajuste se seu JDK estiver em outra pasta:
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
pwsh -NoProfile -File .\scripts\Start-Local.ps1
```

O script instala o frontend, compila o backend, inicia um **PostgreSQL real**, inicia a API e executa o Next.js. Em execuções seguintes, pode usar `-SkipInstall` quando o `package-lock.json` não mudou. O banco fica persistido em `.tools/postgres-data`; não apague essa pasta se quiser preservar as participações.

Se não existir `.env`, o script gera um segredo aleatório e uma senha administrativa aleatória. **Consulte `ADMIN_USER` e `ADMIN_PASSWORD` nesse arquivo para entrar no painel.** Ele é ignorado pelo Git. A configuração PostgreSQL `postgres/postgres` é exclusiva do banco de desenvolvimento em loopback, que usa autenticação local trust; nunca reutilize esse modo em produção.

| Serviço | Endereço |
| --- | --- |
| Plataforma | [http://localhost:3000](http://localhost:3000) |
| Administração | [http://localhost:3000/admin](http://localhost:3000/admin) |
| API REST | [http://localhost:8080/api/health](http://localhost:8080/api/health) |
| Swagger / OpenAPI | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) |
| Especificação JSON | [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs) |

Use **localhost**, pois a origem de escrita deve coincidir com `APP_ORIGIN`. `Ctrl+C` no terminal encerra os serviços iniciados pelo script. Não execute dois scripts de inicialização simultaneamente. Se a porta 5432 já estiver ocupada, o script preserva o serviço existente; configure `.env` para esse banco ou libere a porta antes de executar. Erros do banco ficam em `.tools/database-error.log`; da API, em `.tools/backend.log` e `.tools/backend-error.log`.

## Executar com Docker Desktop

Instale Docker Desktop com Compose v2. Prepare `.env` a partir de `.env.example` e substitua os valores de exemplo por senhas reais e um segredo aleatório com pelo menos 32 caracteres. Se o arquivo veio da execução sem Docker, **troque `DB_PASSWORD=postgres` por uma senha forte** antes de inicializar um volume Docker novo.

```powershell
# Só copie se ainda não existir .env:
Copy-Item .env.example .env
# Edite o arquivo antes de continuar.
docker compose up --build -d
docker compose logs -f backend
```

As mesmas URLs ficam disponíveis. PostgreSQL 17 usa um volume nomeado e não expõe porta ao host. Frontend e backend ficam vinculados ao loopback. Use `docker compose down` para parar preservando o banco. Não utilize a opção de remoção de volumes se precisar manter os dados. Alterar `POSTGRES_PASSWORD` em `.env` não altera uma senha já gravada num volume existente.

**Verificação desta entrega:** Docker Compose foi configurado, mas não executado neste computador, pois Docker não estava instalado. A execução nativa e os testes usaram PostgreSQL 14.19 real fornecido pela biblioteca de desenvolvimento. A compatibilidade com a imagem PostgreSQL 17 deve ser confirmada ao subir o Compose.

## Estrutura e arquitetura

```text
frontend/                       Next.js App Router + TypeScript
  src/app/                      Páginas públicas e painel administrativo
  src/app/api/geography/        Proxy restrito de malhas municipais IBGE
  src/components/               Questionários, gráficos, mapa e componentes
  src/components/ui/button.tsx  Componente no padrão shadcn/ui (Radix + CVA)
  src/lib/                      Tipos da API e lógica condicional
  public/brazil.geojson         Malha estadual oficial do IBGE
backend/                        Java 21 + Spring Boot
  src/main/java/br/org/vozbrasil/
    Model.java                  Entidades JPA e relacionamentos
    Dtos.java                   DTOs com Bean Validation
    CivicService.java           Transações, validação e agregação
    SecurityConfig.java         Autorização, cookies assinados e limites
    ApiController.java          REST e endpoints administrativos
    ReportService.java          PDF com gráficos e CSV agregado
    Retention.java              Exclusão diária por retenção
  src/main/resources/db/migration/
    V1__schema.sql              Tabelas, constraints e índices
    V2__ibge_localities.sql     Localidades oficiais
    V3__initial_surveys.sql     Pesquisas iniciais, sem respostas
  src/test/                     Testes em PostgreSQL isolado
scripts/Start-Local.ps1          Execução integrada no Windows
compose.yaml                    PostgreSQL, API e frontend
```

O navegador usa a API pela mesma origem, via proxy Next.js; o Spring é a autoridade para validação, regras condicionais, transações e autorização. A malha estadual está versionada; malhas municipais são obtidas sob demanda pelo servidor Next.js com cache de 24 horas. As requisições desse proxy só aceitam os 27 códigos estaduais oficiais e só consultam o domínio IBGE.

Listagens de pesquisas e ideias têm paginação de 12 itens feita no banco. Consultas geográficas, temáticas e por período filtram no banco antes da agregação. Os gráficos usam apenas respostas persistidas; não há fallback com métricas inventadas. O catálogo leve de pesquisas alimenta os seletores sem limitar a escolha à primeira página.

## Fluxos disponíveis

- **Pesquisas:** nacional, estadual, municipal e temática; escolha única, múltipla, escala 1–5, ordenação e texto; condições dependentes de alternativas anteriores; revisão, consentimento e confirmação. Rascunhos locais expiram após 7 dias quando reabertos. Uma pesquisa com respostas preserva suas perguntas: o administrador deve duplicá-la para criar outra versão.
- **Brasil em Dados:** filtros combináveis, barras, médias de escalas, primeira prioridade dos rankings, distribuição percentual, evolução mensal, mapa, comparação da mesma pergunta em duas regiões, links compartilháveis e PDF com filtros/base/período. O histórico de pesquisas encerradas continua disponível; arquivar retira a pesquisa da consulta pública.
- **Mapa:** 27 UFs, hover, clique, zoom, seleção pelo teclado e dois indicadores (respostas e disponibilidade de amostra). Após escolher uma UF, use **Escala territorial → Municípios** para carregar sua malha municipal. Seletores manuais funcionam também sem usar o mapa.
- **Ideias:** criação anônima, revisão obrigatória, filtros regionais/temáticos, ordenação por data ou apoios, um apoio por cookie/ideia e denúncias. Nada é aprovado automaticamente.
- **Admin:** autenticação, criar/editar/duplicar/publicar/encerrar/arquivar, editor de alternativas, reordenação, condições, localidade e agendamento de abertura/encerramento. Moderação, denúncias, recortes analíticos, série mensal, distribuição geográfica, taxa operacional de conclusão e CSV agregado.
- **Interface:** responsiva, modo claro/escuro, foco visível, labels, navegação por teclado, link para pular ao conteúdo, mensagens de loading/vazio/erro e animações suaves.

As datas de publicação só passam a valer para pesquisas com status **PUBLISHED**; não é preciso alterar o status por cron. Os PDFs são gerados automaticamente **sob demanda**, sem serviço externo ou agendamento de envio.

## Dados e metodologia

Há 27 UFs e 5.571 municípios conforme a API do IBGE consultada em 02/11/2026. As cinco pesquisas iniciais são conteúdo editorial; **não há respostas, apoios ou sugestões fictícias nas migrations**. Os registros usados pelos testes são criados e descartados em outra instância de PostgreSQL, sem contaminar a instalação local.

Fontes: [localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades), [malhas do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas). A implementação segue o [App Router do Next.js](https://nextjs.org/docs/app/getting-started) e usa o stack Spring Boot definido no `pom.xml`.

Não edite migrations já aplicadas nem execute `scripts/seed.mjs` sobre uma instalação existente: ele é um gerador de manutenção das migrations iniciais e usa entradas baixadas em `.tools`. Evoluções do esquema devem ser novas migrations versionadas.

O número de participantes estima navegadores identificados por cookie técnico; **não significa pessoas verificadas**. Apagar cookies ou trocar de dispositivo pode contornar limites. Nenhuma estatística é apresentada como pesquisa eleitoral, amostra científica ou opinião de toda a população.

O mínimo público é 5 respostas. Se alguma alternativa tiver entre 1 e 4 respostas, a distribuição inteira da pergunta é suprimida para dificultar inferência por subtração. Mapas e séries mensais também suprimem pequenos grupos. Totais amplos continuam visíveis. Filtros sobrepostos podem permitir inferências; o limite não é uma garantia absoluta de anonimato estatístico. Para bases sensíveis, aumente a proteção antes da exposição pública.

Percentuais usam quem respondeu à questão, não o total nacional. Questões opcionais em branco não entram no denominador; condições podem reduzir a base; múltiplas escolhas podem somar mais de 100%. Rankings divulgam a primeira colocação; escalas usam média aritmética. Comparações exigem **a mesma pergunta da mesma pesquisa**; não inferem diferenças entre populações.

## Segurança e privacidade

- Admin protegido no backend com Spring Security, senha BCrypt e role ADMIN. Credenciais do frontend ficam em memória e são descartadas ao sair/recarregar. Não há senha administrativa padrão ativa quando `ADMIN_PASSWORD` não foi configurada.
- Segredo HMAC obrigatório (mínimo 32 caracteres), cookie anônimo assinado, HttpOnly e SameSite=Lax; `SECURE_COOKIE=true` em HTTPS. Constraints únicas e transações garantem um registro por identificador/pesquisa ou identificador/apoio, incluindo envios concorrentes.
- Origens divergentes são rejeitadas em operações de escrita. CSRF do Spring é desabilitado porque a autenticação administrativa usa cabeçalho Basic explícito, sem sessão autenticada em cookie. Escritas também passam pela verificação de Origin. Não habilite autenticação administrativa por cookie sem revisar a proteção CSRF.
- Limite geral de 180 requisições/minuto por endereço de origem do backend; limites adicionais por cookie para escrita: 30/minuto, 5 ideias/hora e 20 denúncias/hora. Contadores são locais à instância e reiniciam com o processo. O IP é HMAC transitório em memória, nunca coluna do banco.
- Consultas parametrizadas, Bean Validation, limites de opções/textos e respostas; React escapa textos e não usa HTML enviado pelo público. CSV neutraliza prefixos de fórmulas. Textos discursivos e identificadores nunca entram nos endpoints agregados nem nas exportações.
- Retenção padrão de 730 dias, executada diariamente às 03:00 (America/Sao_Paulo). Respostas e seus textos são excluídos juntos. Ideias antigas só são removidas quando não há dependências ativas. Cookies do navegador expiram em um ano; o operador deve aplicar a retenção também aos backups.

Antes de acesso público, configure controlador e contato de privacidade em `/privacidade`, revisão da base legal, HTTPS, senhas fortes, backups protegidos, restrição do Swagger e monitoramento. **Não se declara certificação LGPD ou WCAG.** Há recursos de acessibilidade implementados, mas não foi feita auditoria WCAG 2.2 AA completa nem teste com leitores de tela.

O limite de IP enxerga o peer do backend. Atrás do proxy Next.js ele pode compartilhar o orçamento entre visitantes; produção deve usar rate limiting no gateway com IP validado e limites distribuídos. Agregação ainda ocorre no serviço a partir dos registros filtrados: alto volume exige medição de carga e possivelmente agregação SQL/materializada. Não houve ensaio de carga, pentest, MFA ou infraestrutura de operação pública nesta entrega.

## Testes e build

No PowerShell, a partir da raiz (o script inicial baixa Maven quando necessário):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
& .\.tools\apache-maven-3.9.11\bin\mvn.cmd -f backend/pom.xml test
npm.cmd test --prefix frontend
npm.cmd run typecheck --prefix frontend
npm.cmd run build --prefix frontend
npm.cmd audit --prefix frontend
```

O PostgreSQL dos testes usa porta aleatória e é descartado após a suíte; não requer Docker nem o banco da aplicação. São testados envio válido e atômico, obrigatoriedade, condições, alternativas inválidas, rankings, duplicações, filtros, percentuais, proteção de pequenos grupos, autenticação, origem, moderação, apoios, denúncias, PDF, exportação, edição e retenção. Os testes de frontend verificam limpeza em cascata de condições e serialização de filtros. A inspeção visual foi feita em navegador desktop e viewport móvel de 390 px; isso não equivale a uma suíte E2E automatizada completa.

## Variáveis

| Nome | Uso |
| --- | --- |
| `DATABASE_URL`, `DB_USER`, `DB_PASSWORD` | Conexão JDBC PostgreSQL |
| `APP_SECRET` | Assinatura dos cookies e HMAC dos identificadores |
| `ADMIN_USER`, `ADMIN_PASSWORD` | Criação/atualização do administrador na inicialização |
| `APP_ORIGIN` | Origem autorizada para escritas, por padrão `http://localhost:3000` |
| `SECURE_COOKIE` | `true` para cookie restrito a HTTPS |
| `RETENTION_DAYS` | Prazo de retenção, por padrão 730 dias |
| `API_INTERNAL_URL` | Destino do proxy Next.js, definido no build para Docker |
| `PORT` | Porta da API, por padrão 8080 |

Para executar frontend e backend manualmente, carregue `.env` no ambiente do processo Java, inicie PostgreSQL, rode `mvn spring-boot:run` em `backend` e `npm run dev` em `frontend`. O Spring lê variáveis de ambiente; não lê `.env` diretamente. O script integrado e o Docker Compose cuidam dessa passagem.
