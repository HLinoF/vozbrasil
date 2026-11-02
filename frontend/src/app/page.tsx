"use client";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  HeartPulse,
  Landmark,
  Lightbulb,
  MessageCircle,
  Shield,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  Wifi,
} from "lucide-react";
import {
  useApi,
  format,
  type Survey,
  type Paged,
  type Results,
  type State,
  type Idea,
} from "@/lib/api";
import { BrazilMap } from "@/components/map-loader";
import {
  Reveal,
  SurveyCard,
  ErrorState,
  Loading,
  Empty,
  Notice,
  CheckItem,
} from "@/components/shared";
export default function Home() {
  const stats = useApi<{
    participants: number;
    responses: number;
    states: number;
    suggestions: number;
  }>("/stats");
  const surveys = useApi<Paged<Survey>>("/surveys");
  const results = useApi<Results>("/results");
  const states = useApi<State[]>("/states");
  const ideas = useApi<Paged<Idea>>("/suggestions?sort=popular");
  const priority = results.data?.questions
    .filter((q) => q.key === "priority" && !q.suppressed)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0];
  const categories = [
    ["Educação", BookOpen],
    ["Saúde", HeartPulse],
    ["Segurança", Shield],
    ["Emprego", Landmark],
    ["Tecnologia", Wifi],
    ["Meio ambiente", Sprout],
  ] as const;
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <Reveal className="hero-copy">
            <span className="hero-badge">
              <span className="pulse" /> UM PAÍS MELHOR SE CONSTRÓI EM CONJUNTO
            </span>
            <h1>
              O que você
              <br />
              mudaria no
              <br />
              <span>Brasil?</span>
              <span className="hero-asterisk">✳</span>
            </h1>
            <p>
              Compartilhe sua opinião, participe de pesquisas e descubra quais
              mudanças os brasileiros querem para o futuro.
            </p>
            <div className="hero-actions">
              <Link href="/pesquisas" className="button cream">
                Participar de uma pesquisa <ArrowUpRight size={19} />
              </Link>
              <Link href="/dados" className="hero-secondary">
                Explorar resultados <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-trust">
              <CheckItem>Participação anônima</CheckItem>
              <CheckItem>Sem cadastro</CheckItem>
              <CheckItem>Sua voz importa</CheckItem>
            </div>
          </Reveal>
          <Reveal className="hero-visual">
            <div className="hero-map-label">
              <span className="tiny-label">DE NORTE A SUL</span>
              <h2>
                Um Brasil.
                <br />
                Muitas vozes.
              </h2>
            </div>
            <BrazilMap
              compact
              states={states.data ?? []}
              data={results.data?.geography}
              onSelect={(id) => {
                window.location.href = `/mapa?stateId=${id}`;
              }}
            />
            <div className="map-floating">
              <span className="float-icon">
                <AudioLines />
              </span>
              <div>
                <strong>Seu lugar nessa conversa.</strong>
                <span>26 estados + Distrito Federal</span>
              </div>
              <ArrowUpRight size={17} />
            </div>
            <span className="hero-coordinates">BRASIL · 14°14′ S 53°11′ O</span>
          </Reveal>
        </div>
        <div className="hero-base container">
          <span>Uma escuta aberta para transformar o amanhã.</span>
          <a href="#explore">
            Conheça a plataforma <ArrowDown size={15} />
          </a>
        </div>
      </section>
      <section className="metrics-section">
        <div className="container metrics">
          {stats.loading ? (
            <Loading />
          ) : stats.error ? (
            <ErrorState message={stats.error} retry={stats.refresh} />
          ) : (
            stats.data &&
            [
              [stats.data.participants, "Participantes (navegadores)", Users],
              [stats.data.responses, "Pesquisas respondidas", MessageCircle],
              [stats.data.states, "Estados representados", Landmark],
              [stats.data.suggestions, "Ideias publicadas", Lightbulb],
            ].map(([value, label, Icon]) => {
              const I = Icon as typeof Users;
              return (
                <div className="metric" key={String(label)}>
                  <I size={20} />
                  <strong>{format(value as number)}</strong>
                  <span>{label as string}</span>
                </div>
              );
            })
          )}
        </div>
      </section>
      <section id="explore" className="section container">
        <Reveal className="section-heading">
          <div>
            <span className="eyebrow">O QUE MOVE A NOSSA CONVERSA</span>
            <h2>Grandes temas. Impactos reais.</h2>
            <p>
              As preocupações de hoje são o ponto de partida para um país
              melhor.
            </p>
          </div>
          <Link href="/dados" className="text-link">
            Explorar as prioridades <ArrowUpRight size={17} />
          </Link>
        </Reveal>
        <div className="topic-grid">
          {categories.map(([label, Icon], i) => (
            <Link
              href={`/pesquisas?theme=${encodeURIComponent(label)}`}
              className="topic"
              key={label}
            >
              <span className={"topic-icon color-" + i}>
                <Icon size={25} />
              </span>
              <strong>{label}</strong>
              <ArrowUpRight size={14} />
            </Link>
          ))}
        </div>
        <div className="small-disclaimer">
          <ShieldCheck size={15} />{" "}
          {priority
            ? `Prioridade mais citada em “${priority.surveyTitle}”: ${[...priority.options].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0]?.label}. Base: ${priority.total} respostas, desde o início da coleta, Brasil, sem filtro temático.`
            : "As prioridades mais citadas serão exibidas quando houver uma amostra publicável. Nenhum resultado é simulado."}
        </div>
      </section>
      <section className="section surveys-section">
        <div className="container">
          <Reveal className="section-heading">
            <div>
              <span className="eyebrow">PARTICIPE DA MUDANÇA</span>
              <h2>
                Poucos minutos.
                <br className="mobile-break" /> Uma contribuição importante.
              </h2>
              <p>Escolha uma pesquisa e coloque sua perspectiva na conversa.</p>
            </div>
            <Link href="/pesquisas" className="button outline">
              Todas as pesquisas <ArrowUpRight size={17} />
            </Link>
          </Reveal>
          {surveys.loading ? (
            <Loading />
          ) : surveys.error ? (
            <ErrorState message={surveys.error} retry={surveys.refresh} />
          ) : surveys.data?.items.length ? (
            <div className="cards-grid">
              {[...surveys.data.items]
                .sort(
                  (a, b) =>
                    Number(b.scope === "NATIONAL") -
                    Number(a.scope === "NATIONAL"),
                )
                .slice(0, 3)
                .map((s, i) => (
                  <SurveyCard key={s.id} survey={s} index={i} />
                ))}
            </div>
          ) : (
            <Empty title="Novas pesquisas em breve" />
          )}
        </div>
      </section>
      <section className="section container">
        <div className="data-feature">
          <div className="data-feature-copy">
            <span className="eyebrow">BRASIL EM DADOS</span>
            <h2>
              Ouvir é o começo.
              <br />
              <span>Entender é o próximo passo.</span>
            </h2>
            <p>
              Explore o que os participantes pensam sobre os serviços e as
              prioridades de cada região. Dados abertos, contexto claro e
              respeito à privacidade.
            </p>
            <Link href="/dados" className="button primary">
              Descubra os resultados <ArrowUpRight size={17} />
            </Link>
            <span className="micro-note">
              Resultados de participações voluntárias, com proteção de amostras
              pequenas.
            </span>
          </div>
          <div className="data-preview">
            <div className="preview-heading">
              <span>
                <ChartNoAxesCombined size={17} /> Termômetro da participação
              </span>
              <span className="tag">Dados reais</span>
            </div>
            {results.loading ? (
              <Loading />
            ) : results.error ? (
              <ErrorState message={results.error} />
            ) : (
              <>
                <div className="preview-number">
                  {format(results.data?.total ?? 0)}
                  <span>opiniões registradas</span>
                </div>
                <div className="preview-distributions">
                  {priority ? (
                    [...priority.options]
                      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
                      .slice(0, 4)
                      .map((o) => (
                        <div key={o.key}>
                          <span>
                            {o.label}
                            <strong>{o.percent}%</strong>
                          </span>
                          <i>
                            <b style={{ width: `${o.percent}%` }} />
                          </i>
                        </div>
                      ))
                  ) : (
                    <div className="preview-wait">
                      <ChartNoAxesCombined size={32} />
                      <span>Aguardando uma amostra publicável.</span>
                    </div>
                  )}
                </div>
                <div className="preview-empty">
                  <span className="pulse" />
                  {results.data?.total
                    ? "Cada participação amplia esta conversa."
                    : "Esta conversa está começando. Faça parte."}
                </div>
                <span className="micro-note">
                  {priority
                    ? `Base: ${priority.total} respostas · ${priority.surveyTitle}`
                    : "Gráficos aparecem somente com dados suficientes."}
                </span>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="section how-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                SIMPLES PARA VOCÊ. RELEVANTE PARA TODOS.
              </span>
              <h2>Sua opinião encontra um caminho.</h2>
            </div>
            <span className="how-symbol">↗</span>
          </div>
          <div className="steps-grid">
            {[
              [
                "01",
                "Escolha uma conversa",
                "Encontre pesquisas sobre o Brasil, seu estado, sua cidade ou um tema importante para você.",
                MessageCircle,
              ],
              [
                "02",
                "Conte o que você pensa",
                "Responda no seu ritmo, sem cadastro e sem informar nome, CPF ou endereço.",
                AudioLines,
              ],
              [
                "03",
                "Veja a voz coletiva",
                "Explore os resultados agregados e descubra prioridades de quem participou.",
                ChartNoAxesCombined,
              ],
            ].map(([num, title, text, Icon]) => {
              const I = Icon as typeof Check;
              return (
                <Reveal className="step" key={String(num)}>
                  <div className="step-top">
                    <span>{num as string}</span>
                    <I size={24} />
                  </div>
                  <h3>{title as string}</h3>
                  <p>{text as string}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">IDEIAS PARA O BRASIL</span>
            <h2>Boas ideias merecem ser ouvidas.</h2>
            <p>Propostas da comunidade para transformar lugares e vidas.</p>
          </div>
          <Link href="/ideias?nova=1" className="button outline">
            Compartilhar uma ideia <Lightbulb size={17} />
          </Link>
        </div>
        {ideas.loading ? (
          <Loading />
        ) : ideas.error ? (
          <ErrorState message={ideas.error} retry={ideas.refresh} />
        ) : ideas.data?.items.length ? (
          <div className="cards-grid">
            {ideas.data.items.slice(0, 3).map((i) => (
              <Link className="idea-card" key={i.id} href="/ideias">
                <span className="tag">{i.theme}</span>
                <h3>{i.title}</h3>
                <p>{i.description.slice(0, 140)}</p>
                <span>
                  {i.supports} apoios <ArrowUpRight size={17} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="first-idea">
            <span className="first-idea-icon">
              <Lightbulb size={31} />
            </span>
            <div>
              <h3>A próxima boa ideia pode ser a sua.</h3>
              <p>
                Ainda não há ideias publicadas. Todas as propostas passam por
                moderação.
              </p>
            </div>
            <Link href="/ideias?nova=1" className="text-link">
              Escrever minha ideia <ArrowRight size={18} />
            </Link>
          </div>
        )}
        <Notice />
      </section>
      <section className="container cta">
        <Sparkles size={28} />
        <h2>O futuro não acontece sozinho.</h2>
        <p>Ele começa quando cada um de nós decide participar.</p>
        <Link href="/pesquisas" className="button cream">
          Minha voz faz parte <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}
