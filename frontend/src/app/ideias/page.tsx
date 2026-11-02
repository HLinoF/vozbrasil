"use client";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  Flag,
  Lightbulb,
  Plus,
  X,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import {
  api,
  useApi,
  query,
  themes,
  type Paged,
  type Idea,
  type State,
} from "@/lib/api";
import {
  PageHead,
  LocationFields,
  Notice,
  Loading,
  ErrorState,
  Empty,
} from "@/components/shared";
export default function Ideas() {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [theme, setTheme] = useState("");
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newTheme, setNewTheme] = useState("Educação");
  const [newState, setNewState] = useState("");
  const [newCity, setNewCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [supported, setSupported] = useState<string[]>([]);
  const states = useApi<State[]>("/states");
  const ideas = useApi<Paged<Idea>>(
    "/suggestions?" +
      query({ stateId: state, municipalityId: city, theme, sort, page }),
  );
  useEffect(() => {
    setOpen(new URLSearchParams(location.search).has("nova"));
  }, []);
  useEffect(() => setPage(0), [state, city, theme, sort]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api<{ message: string }>("/suggestions", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          theme: newTheme,
          stateId: newState ? +newState : null,
          municipalityId: newCity ? +newCity : null,
          consent,
        }),
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setConsent(false);
      setMessage(d.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function support(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/suggestions/" + id + "/support", { method: "POST" });
      setSupported((v) => [...v, id]);
      ideas.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function sendReport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/suggestions/${report}/reports`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setReport(null);
      setReason("");
      setMessage(
        "Denúncia recebida. A equipe de moderação vai analisar o conteúdo.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page">
      <PageHead
        eyebrow="IDEIAS PARA O BRASIL"
        title="E se a gente fizesse diferente?"
        description="Um espaço para propostas concretas. Compartilhe uma ideia, descubra outras perspectivas e apoie o que faz sentido para você."
        action={
          <button
            className="button primary"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            <Plus size={18} /> Compartilhar uma ideia
          </button>
        }
      />
      <div className="filter-panel">
        <LocationFields
          state={state}
          city={city}
          onState={setState}
          onCity={setCity}
        />
        <label className="field">
          <span>Tema</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="">Todos os temas</option>
            {themes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Ordenar por</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="popular">Mais apoiadas</option>
            <option value="recent">Mais recentes</option>
          </select>
        </label>
      </div>
      {message && (
        <div className="success-note" role="status">
          <CheckCircle2 size={20} />
          {message}
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && !open && !report && (
        <div role="alert" className="inline-error">
          {error}
        </div>
      )}
      {ideas.loading ? (
        <Loading />
      ) : ideas.error ? (
        <ErrorState message={ideas.error} retry={ideas.refresh} />
      ) : ideas.data?.items.length ? (
        <div className="cards-grid ideas-grid">
          {ideas.data.items.map((idea) => (
            <article className="idea-card" key={idea.id}>
              <div className="card-top">
                <span className="tag">{idea.theme}</span>
                <button
                  className="icon-button"
                  aria-label={"Denunciar ideia " + idea.title}
                  onClick={() => {
                    setReport(idea.id);
                    setError("");
                  }}
                >
                  <Flag size={15} />
                </button>
              </div>
              <h3>{idea.title}</h3>
              <p className="idea-description">{idea.description}</p>
              <div className="idea-local">
                <MapPin size={13} />
                {idea.stateId
                  ? states.data?.find((s) => s.id === idea.stateId)?.name
                  : "Brasil"}
                {idea.municipalityId
                  ? ` · Município IBGE ${idea.municipalityId}`
                  : ""}
              </div>
              <div className="idea-bottom">
                <button
                  className={
                    "support " +
                    (supported.includes(idea.id) ? "supported" : "")
                  }
                  disabled={busy || supported.includes(idea.id)}
                  onClick={() => support(idea.id)}
                >
                  <ArrowUp size={16} /> {idea.supports}{" "}
                  {supported.includes(idea.id) ? "Apoiado" : "Apoiar"}
                </button>
                <time dateTime={idea.createdAt}>
                  {new Date(idea.createdAt).toLocaleDateString("pt-BR")}
                </time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Espaço aberto para boas propostas."
          text="Nenhuma ideia publicada neste recorte. Que tal começar a conversa com uma proposta concreta?"
          action={
            <button className="button primary" onClick={() => setOpen(true)}>
              <Lightbulb size={17} /> Escrever uma ideia
            </button>
          }
        />
      )}
      <div className="pagination">
        <button
          className="button outline"
          disabled={!page}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          className="button outline"
          disabled={(page + 1) * 12 >= (ideas.data?.total ?? 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
      <p className="micro-note">
        Os apoios indicam engajamento dentro da plataforma e não aprovação da
        população em geral. Todas as ideias passam por revisão humana antes da
        publicação.
      </p>
      <Notice />
      {open && (
        <section className="inline-composer card" aria-label="Nova ideia">
          <div className="section-heading">
            <div>
              <span className="eyebrow">UMA PROPOSTA PODE ABRIR CAMINHOS</span>
              <h2>Qual é a sua ideia?</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                setOpen(false);
                setError("");
              }}
              aria-label="Fechar formulário"
            >
              <X />
            </button>
          </div>
          <form onSubmit={send}>
            <label className="field">
              <span>Título *</span>
              <input
                required
                minLength={8}
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Uma frase que resume sua proposta"
              />
            </label>
            <label className="field">
              <span>Descrição *</span>
              <textarea
                required
                minLength={20}
                maxLength={3000}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qual problema sua ideia resolve? Como poderia funcionar? Não inclua dados pessoais."
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Tema *</span>
                <select
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                >
                  {themes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <LocationFields
                state={newState}
                city={newCity}
                onState={setNewState}
                onCity={setNewCity}
              />
            </div>
            <label className="checkbox-label">
              <input
                required
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Entendo que minha proposta será revisada e poderá ser publicada.
                Não incluí dados pessoais, propaganda, ofensas ou conteúdo
                discriminatório.
              </span>
            </label>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Enviando…" : "Enviar para moderação"}{" "}
              <ArrowUp size={16} />
            </button>
          </form>
        </section>
      )}
      {report && (
        <section
          className="card inline-composer"
          aria-label="Denunciar conteúdo"
        >
          <div className="section-heading">
            <h2>Ajude a cuidar deste espaço.</h2>
            <button
              className="icon-button"
              aria-label="Cancelar denúncia"
              onClick={() => setReport(null)}
            >
              <X />
            </button>
          </div>
          <form onSubmit={sendReport}>
            <label className="field">
              <span>Por que este conteúdo precisa de revisão?</span>
              <textarea
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o problema sem repetir dados pessoais."
              />
            </label>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Enviando…" : "Enviar denúncia"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
