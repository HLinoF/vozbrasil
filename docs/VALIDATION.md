# Verificação em 02/11/2026

Ambiente: Windows, JDK 21.0.12.1, Node.js 24.22.0, Next.js 16.4.4 e Spring Boot 3.5.7.

| Verificação | Resultado |
| --- | --- |
| Maven `test package` | 15 testes, zero falhas, JAR executável gerado |
| Banco dos testes | PostgreSQL 14.19 real, porta aleatória, três migrations aplicadas |
| Frontend `npm test` | 4 testes aprovados |
| Frontend `next build` | Compilação e TypeScript aprovados; rotas geradas |
| Frontend `npm audit` | Zero vulnerabilidades relatadas |
| Localidades oficiais | 27 UFs, 5.571 municípios |
| Proxy de malha municipal | Sergipe: 75 polígonos municipais oficiais retornados |
| Navegador | Início e dashboard inspecionados; viewport móvel de 390 px revisado; nenhum erro no console do dashboard observado |

Os testes usam um banco isolado e descartável. Não são dados da plataforma local. Nenhuma migration insere participações fictícias.

Não foram executados: Docker Compose (Docker ausente), ensaio de carga, pentest, auditoria WCAG completa ou suíte E2E automatizada de navegador. A verificação visual é complementar aos testes e não garante conformidade integral de acessibilidade. Ver README para limites operacionais e preparação necessária antes de acesso público.
