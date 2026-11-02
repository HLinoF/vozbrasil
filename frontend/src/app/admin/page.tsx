"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  FilePlus2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageSquare,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  api,
  query,
  useApi,
  themes,
  type Survey,
  type Paged,
  type Idea,
  type Question,
  type Results,
} from "@/lib/api";
import {
  PageHead,
  LocationFields,
  Loading,
  Empty,
  ErrorState,
} from "@/components/shared";
import { ResultCharts } from "@/components/results";
import { Button } from "@/components/ui/button";
type Draft = {
  title: string;
  description: string;
  theme: string;
  scope: string;
  stateId: number | null;
  municipalityId: number | null;
  opensAt: string | null;
  closesAt: string | null;
  questions: Question[];
};
const emptyQuestion = (index: number): Question => ({
  key: "q" + index,
  text: "",
  type: "SINGLE",
  theme: "Geral",
  required: true,
  conditionKey: null,
  conditionValue: null,
  options: [
    { key: "1", label: "" },
    { key: "2", label: "" },
  ],
});
const emptyDraft = (): Draft => ({
  title: "",
  description: "",
  theme: "Geral",
  scope: "NATIONAL",
  stateId: null,
  municipalityId: null,
  opensAt: null,
  closesAt: null,
  questions: [emptyQuestion(1)],
});
type Analytics = Results & {
  startsAllTime: number;
  completedAllTime: number;
  surveys: { id: string; title: string; responses: number }[];
};
type Report = {
  id: string;
  suggestionId: string;
  reason: string;
  status: string;
  createdAt: string;
};
export default function Admin() {
  const [auth, setAuth] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("surveys");
  const [page, setPage] = useState(0);
  const [surveys, setSurveys] = useState<Paged<Survey> | null>(null);
  const [ideas, setIdeas] = useState<Paged<Idea> | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState("");
  const [analysisCity, setAnalysisCity] = useState("");
  const [analysisSurvey, setAnalysisSurvey] = useState("");
  const [analysisTheme, setAnalysisTheme] = useState("");
  const [analysisFrom, setAnalysisFrom] = useState("");
  const [analysisTo, setAnalysisTo] = useState("");
  const catalog = useApi<Pick<Survey, "id" | "title">[]>(
    auth ? "/surveys/catalog" : null,
  );
  const analysisFilters = query({
    stateId: analysisState,
    municipalityId: analysisCity,
    surveyId: analysisSurvey,
    theme: analysisTheme,
    from: analysisFrom ? analysisFrom + "T00:00:00Z" : null,
    to: analysisTo
      ? new Date(
          new Date(analysisTo + "T00:00:00Z").getTime() + 86400000,
        ).toISOString()
      : null,
  });
  const headers = { Authorization: auth };
  async function load(token = auth) {
    setLoading(true);
    setError("");
    try {
      const opts = { headers: { Authorization: token } };
      const [s, i, r, a] = await Promise.all([
        api<Paged<Survey>>("/admin/surveys?page=" + page, opts),
        api<Paged<Idea>>("/admin/suggestions?page=" + page, opts),
        api<Report[]>("/admin/reports?page=" + page, opts),
        api<Analytics>("/admin/analytics?" + analysisFilters, opts),
      ]);
      setSurveys(s);
      setIdeas(i);
      setReports(r);
      setAnalytics(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (auth)
      void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [auth, page, analysisFilters]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const token = "Basic " + btoa(username + ":" + password);
    try {
      await api("/admin/me", { headers: { Authorization: token } });
      setAuth(token);
      setPassword("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function mutate(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(path, {
        method: "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      setMessage("Alteração registrada.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(s: Survey) {
    setEditId(s.id);
    setDraft({
      title: s.title,
      description: s.description,
      theme: s.theme,
      scope: s.scope,
      stateId: s.stateId,
      municipalityId: s.municipalityId,
      opensAt: s.opensAt,
      closesAt: s.closesAt,
      questions: s.questions.map(({ id, ...q }) => q),
    });
    setError("");
  }
  function setQuestion(index: number, value: Partial<Question>) {
    if (!draft) return;
    setDraft({
      ...draft,
      questions: draft.questions.map((q, i) =>
        i === index ? { ...q, ...value } : q,
      ),
    });
  }
  function reorder(index: number, offset: number) {
    if (!draft) return;
    const qs = [...draft.questions];
    [qs[index], qs[index + offset]] = [qs[index + offset], qs[index]];
    setDraft({ ...draft, questions: qs });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/admin/surveys" + (editId ? "/" + editId : ""), {
        method: editId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(draft),
      });
      setDraft(null);
      setMessage(
        "Pesquisa salva como configurada. Use Publicar para abrir a coleta.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportCsv() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/export.csv?" + analysisFilters, {
        headers,
      });
      if (!res.ok) throw Error("Falha ao exportar");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "vozbrasil-agregados.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!auth)
    return (
      <div className="container admin-login">
        <div className="card">
          <span className="question-symbol">
            <LockKeyhole size={26} />
          </span>
          <span className="eyebrow">ÁREA RESTRITA</span>
          <h1>Cuidar da escuta.</h1>
          <p>Acesso para administradores autorizados da VozBrasil.</p>
          <form onSubmit={login}>
            <label className="field">
              <span>Usuário</span>
              <input
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Senha</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy}>
              {busy ? "Verificando…" : "Entrar com segurança"}{" "}
              <ShieldCheck size={17} />
            </Button>
          </form>
          <span className="micro-note">
            Credenciais configuradas pelo operador nas variáveis de ambiente. A
            autenticação fica apenas na memória desta página.
          </span>
        </div>
      </div>
    );
  return (
    <div className="container page">
      <PageHead
        eyebrow="PAINEL DE CONTROLE"
        title="Uma escuta bem cuidada."
        description="Gerencie pesquisas, revise propostas e acompanhe a participação."
        action={
          <button
            className="button outline"
            onClick={() => {
              setAuth("");
              setDraft(null);
              setSurveys(null);
              setIdeas(null);
              setReports([]);
              setAnalytics(null);
            }}
          >
            <LogOut size={16} /> Sair
          </button>
        }
      />
      <div className="scope-tabs">
        {[
          ["surveys", "Pesquisas"],
          ["ideas", "Moderação"],
          ["reports", "Denúncias"],
          ["analytics", "Análises"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "selected" : ""}
            onClick={() => {
              setTab(key);
              setDraft(null);
              setPage(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <p className="success-note" role="status">
          <Check size={18} />
          {message}
        </p>
      )}
      {error && <ErrorState message={error} retry={() => load()} />}
      {loading ? (
        <Loading />
      ) : draft ? (
        <form className="admin-editor" onSubmit={save}>
          <div className="section-heading">
            <h2>{editId ? "Editar pesquisa" : "Nova pesquisa"}</h2>
            <button
              type="button"
              className="button outline"
              onClick={() => setDraft(null)}
            >
              <X size={16} /> Cancelar
            </button>
          </div>
          <section className="card">
            <div className="form-grid">
              <label className="field">
                <span>Título</span>
                <input
                  required
                  maxLength={160}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Tema</span>
                <select
                  value={draft.theme}
                  onChange={(e) =>
                    setDraft({ ...draft, theme: e.target.value })
                  }
                >
                  {themes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Descrição</span>
              <textarea
                required
                maxLength={1500}
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Alcance</span>
                <select
                  value={draft.scope}
                  onChange={(e) =>
                    setDraft({ ...draft, scope: e.target.value })
                  }
                >
                  {[
                    ["NATIONAL", "Nacional"],
                    ["STATE", "Estadual"],
                    ["MUNICIPAL", "Municipal"],
                    ["THEMATIC", "Temática"],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <LocationFields
                state={draft.stateId ? String(draft.stateId) : ""}
                city={draft.municipalityId ? String(draft.municipalityId) : ""}
                onState={(v) =>
                  setDraft((d) =>
                    d
                      ? { ...d, stateId: v ? +v : null, municipalityId: null }
                      : d,
                  )
                }
                onCity={(v) =>
                  setDraft((d) =>
                    d ? { ...d, municipalityId: v ? +v : null } : d,
                  )
                }
              />
              <label className="field">
                <span>Abre em (UTC, opcional)</span>
                <input
                  type="datetime-local"
                  value={draft.opensAt?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      opensAt: e.target.value ? e.target.value + ":00Z" : null,
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Encerra em (UTC, opcional)</span>
                <input
                  type="datetime-local"
                  value={draft.closesAt?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      closesAt: e.target.value ? e.target.value + ":00Z" : null,
                    })
                  }
                />
              </label>
            </div>
            <p className="micro-note">
              Sem UF fixa, uma pesquisa estadual ou municipal pode receber
              participantes de diferentes localidades, selecionadas no
              questionário.
            </p>
          </section>
          {draft.questions.map((q, index) => (
            <section className="card question-editor" key={index}>
              <div className="section-heading">
                <h3>Questão {index + 1}</h3>
                <div className="head-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Mover questão para cima"
                    disabled={!index}
                    onClick={() => reorder(index, -1)}
                  >
                    <ArrowUp size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Mover questão para baixo"
                    disabled={index === draft.questions.length - 1}
                    onClick={() => reorder(index, 1)}
                  >
                    <ArrowDown size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remover questão"
                    disabled={draft.questions.length === 1}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        questions: draft.questions.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <label className="field">
                <span>Pergunta</span>
                <input
                  required
                  maxLength={500}
                  value={q.text}
                  onChange={(e) => setQuestion(index, { text: e.target.value })}
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Chave única</span>
                  <input
                    required
                    pattern="[a-zA-Z0-9_-]+"
                    maxLength={60}
                    value={q.key}
                    onChange={(e) =>
                      setQuestion(index, { key: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Tipo</span>
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const type = e.target.value as Question["type"];
                      setQuestion(index, {
                        type,
                        options:
                          type === "TEXT"
                            ? []
                            : type === "SCALE"
                              ? [
                                  "Muito ruim",
                                  "Ruim",
                                  "Regular",
                                  "Bom",
                                  "Muito bom",
                                ].map((label, i) => ({
                                  key: String(i + 1),
                                  label,
                                }))
                              : q.options.length
                                ? q.options
                                : [
                                    { key: "1", label: "" },
                                    { key: "2", label: "" },
                                  ],
                      });
                    }}
                  >
                    {[
                      ["SINGLE", "Escolha única"],
                      ["MULTI", "Múltiplas escolhas"],
                      ["SCALE", "Escala de 1 a 5"],
                      ["RANK", "Prioridades ordenadas"],
                      ["TEXT", "Resposta discursiva"],
                    ].map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Tema da questão</span>
                  <select
                    value={q.theme}
                    onChange={(e) =>
                      setQuestion(index, { theme: e.target.value })
                    }
                  >
                    {themes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) =>
                    setQuestion(index, { required: e.target.checked })
                  }
                />
                Resposta obrigatória
              </label>
              {q.options.map((o, oi) => (
                <div className="option-editor" key={oi}>
                  <input
                    aria-label={"Chave da alternativa " + (oi + 1)}
                    required
                    maxLength={60}
                    value={o.key}
                    disabled={q.type === "SCALE"}
                    onChange={(e) =>
                      setQuestion(index, {
                        options: q.options.map((x, i) =>
                          i === oi ? { ...x, key: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={"Texto da alternativa " + (oi + 1)}
                    required
                    maxLength={200}
                    value={o.label}
                    onChange={(e) =>
                      setQuestion(index, {
                        options: q.options.map((x, i) =>
                          i === oi ? { ...x, label: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Excluir alternativa"
                    disabled={q.type === "SCALE" || q.options.length <= 2}
                    onClick={() =>
                      setQuestion(index, {
                        options: q.options.filter((_, i) => i !== oi),
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {!["TEXT", "SCALE"].includes(q.type) && (
                <button
                  type="button"
                  className="text-link"
                  disabled={q.options.length >= 20}
                  onClick={() =>
                    setQuestion(index, {
                      options: [
                        ...q.options,
                        { key: "opt_" + Date.now(), label: "" },
                      ],
                    })
                  }
                >
                  <Plus size={15} /> Alternativa
                </button>
              )}
              <div className="condition-editor">
                <h4>Lógica condicional</h4>
                <div className="form-grid">
                  <label className="field">
                    <span>Mostrar se a resposta à pergunta…</span>
                    <select
                      value={q.conditionKey ?? ""}
                      onChange={(e) =>
                        setQuestion(index, {
                          conditionKey: e.target.value || null,
                          conditionValue: null,
                        })
                      }
                    >
                      <option value="">Sempre mostrar</option>
                      {draft.questions
                        .slice(0, index)
                        .filter(
                          (p) => p.options.length > 0 && p.type !== "RANK",
                        )
                        .map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.key} · {p.text}
                          </option>
                        ))}
                    </select>
                  </label>
                  {q.conditionKey && (
                    <label className="field">
                      <span>…contiver a alternativa</span>
                      <select
                        required
                        value={q.conditionValue ?? ""}
                        onChange={(e) =>
                          setQuestion(index, { conditionValue: e.target.value })
                        }
                      >
                        <option value="">Selecione</option>
                        {draft.questions
                          .find((p) => p.key === q.conditionKey)
                          ?.options.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            </section>
          ))}
          <div className="editor-actions">
            <button
              className="button outline"
              type="button"
              disabled={draft.questions.length >= 50}
              onClick={() =>
                setDraft({
                  ...draft,
                  questions: [...draft.questions, emptyQuestion(Date.now())],
                })
              }
            >
              <Plus size={16} /> Adicionar pergunta
            </button>
            <button className="button primary" disabled={busy}>
              <Save size={17} />
              {busy ? "Salvando…" : "Salvar pesquisa"}
            </button>
          </div>
        </form>
      ) : tab === "surveys" ? (
        <>
          <div className="list-top">
            <span>{surveys?.total ?? 0} pesquisas</span>
            <button
              className="button primary"
              onClick={() => {
                setEditId(null);
                setDraft(emptyDraft());
                setError("");
              }}
            >
              <FilePlus2 size={17} /> Criar pesquisa
            </button>
          </div>
          <div className="admin-list">
            {surveys?.items.map((s) => (
              <article className="card" key={s.id}>
                <div>
                  <span className="tag">{s.status}</span>
                  <h3>{s.title}</h3>
                  <p>
                    {s.questions.length} perguntas · {s.responseCount} respostas
                  </p>
                </div>
                <div className="admin-row-actions">
                  <button
                    className="button outline small"
                    disabled={
                      busy || s.responseCount > 0 || s.status === "PUBLISHED"
                    }
                    onClick={() => edit(s)}
                  >
                    Editar
                  </button>
                  <button
                    className="button outline small"
                    disabled={busy}
                    onClick={() =>
                      mutate("/admin/surveys/" + s.id + "/duplicate")
                    }
                  >
                    <Copy size={14} /> Duplicar
                  </button>
                  {s.status !== "PUBLISHED" && (
                    <button
                      className="button primary small"
                      disabled={busy}
                      onClick={() =>
                        mutate("/admin/surveys/" + s.id + "/status", {
                          status: "PUBLISHED",
                        })
                      }
                    >
                      Publicar
                    </button>
                  )}
                  {s.status === "PUBLISHED" && (
                    <button
                      className="button outline small"
                      disabled={busy}
                      onClick={() =>
                        mutate("/admin/surveys/" + s.id + "/status", {
                          status: "CLOSED",
                        })
                      }
                    >
                      Encerrar
                    </button>
                  )}
                  {s.status !== "ARCHIVED" && (
                    <button
                      className="button outline small"
                      disabled={busy}
                      onClick={() =>
                        mutate("/admin/surveys/" + s.id + "/status", {
                          status: "ARCHIVED",
                        })
                      }
                    >
                      Arquivar
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <p className="micro-note">
            Encerre antes de editar. Pesquisas que já receberam respostas
            preservam as perguntas: use Duplicar para uma nova versão.
          </p>
        </>
      ) : tab === "ideas" ? (
        <>
          <p className="notice">
            Revise dados pessoais, spam, ofensas e discriminação antes de
            aprovar. O texto aprovado fica público.
          </p>
          <div className="admin-list">
            {ideas?.items.length ? (
              ideas.items.map((i) => (
                <article className="card" key={i.id}>
                  <span className="tag">{i.status}</span>
                  <h3>{i.title}</h3>
                  <p className="idea-description">{i.description}</p>
                  <div className="head-actions">
                    <button
                      className="button primary small"
                      disabled={busy}
                      onClick={() =>
                        mutate("/admin/suggestions/" + i.id + "/status", {
                          status: "APPROVED",
                        })
                      }
                    >
                      Aprovar publicação
                    </button>
                    <button
                      className="button outline small"
                      disabled={busy}
                      onClick={() =>
                        mutate("/admin/suggestions/" + i.id + "/status", {
                          status: "HIDDEN",
                        })
                      }
                    >
                      Ocultar
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Empty
                title="Fila de moderação vazia"
                text="As novas ideias aparecerão aqui para revisão."
              />
            )}
          </div>
        </>
      ) : tab === "reports" ? (
        <div className="admin-list">
          {reports.length ? (
            reports.map((r) => (
              <article className="card" key={r.id}>
                <span className="tag">{r.status}</span>
                <h3>Denúncia de conteúdo</h3>
                <p>{r.reason}</p>
                <span className="micro-note">Ideia: {r.suggestionId}</span>
                <button
                  className="button outline small"
                  disabled={busy}
                  onClick={() =>
                    mutate("/admin/suggestions/" + r.suggestionId + "/status", {
                      status: "HIDDEN",
                    })
                  }
                >
                  Ocultar ideia e resolver denúncias
                </button>
              </article>
            ))
          ) : (
            <Empty title="Nenhuma denúncia nesta página" />
          )}
        </div>
      ) : (
        analytics && (
          <>
            <div className="filter-panel">
              <LocationFields
                state={analysisState}
                city={analysisCity}
                onState={setAnalysisState}
                onCity={setAnalysisCity}
              />
              <label className="field">
                <span>Pesquisa</span>
                <select
                  value={analysisSurvey}
                  onChange={(e) => setAnalysisSurvey(e.target.value)}
                >
                  <option value="">Todas</option>
                  {catalog.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tema</span>
                <select
                  value={analysisTheme}
                  onChange={(e) => setAnalysisTheme(e.target.value)}
                >
                  <option value="">Todos</option>
                  {themes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>De (UTC)</span>
                <input
                  type="date"
                  value={analysisFrom}
                  onChange={(e) => setAnalysisFrom(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Até (UTC)</span>
                <input
                  type="date"
                  value={analysisTo}
                  min={analysisFrom}
                  onChange={(e) => setAnalysisTo(e.target.value)}
                />
              </label>
            </div>
            <div className="list-top">
              <h2>Participações acumuladas</h2>
              <button
                className="button outline"
                disabled={busy}
                onClick={exportCsv}
              >
                <Download size={17} /> Exportar agregados CSV
              </button>
            </div>
            <div className="dashboard-metrics">
              <div className="dashboard-metric">
                <strong>{analytics.startsAllTime}</strong>
                <span>Inícios únicos por pesquisa</span>
              </div>
              <div className="dashboard-metric">
                <strong>{analytics.completedAllTime}</strong>
                <span>Conclusões válidas</span>
              </div>
              <div className="dashboard-metric">
                <strong>
                  {analytics.startsAllTime
                    ? Math.min(
                        100,
                        Math.round(
                          (analytics.completedAllTime /
                            analytics.startsAllTime) *
                            100,
                        ),
                      ) + "%"
                    : "—"}
                </strong>
                <span>Conclusões / inícios registrados</span>
              </div>
              <div className="dashboard-metric">
                <strong>
                  {analytics.geography.filter((g) => !g.suppressed).length}
                </strong>
                <span>UFs com amostra publicável</span>
              </div>
            </div>
            <div className="card">
              <h3>Distribuição geográfica no recorte</h3>
              <p>{analytics.total} respostas válidas neste recorte.</p>
              {analytics.geography.length ? (
                analytics.geography.map((g) => (
                  <div className="analysis-row" key={g.stateId}>
                    <span>UF IBGE {g.stateId}</span>
                    <strong>
                      {g.suppressed ? "Amostra protegida" : g.count}
                    </strong>
                  </div>
                ))
              ) : (
                <p>Nenhuma participação localizada.</p>
              )}
            </div>
            <ResultCharts data={analytics} />
            <p className="micro-note">
              Indicador operacional acumulado. Envios diretos à API podem não
              registrar início. Use Brasil em Dados para recortes por período,
              pesquisa e região; a exportação pública PDF respeita esses
              filtros.
            </p>
            <div className="card">
              <h3>Pesquisas mais respondidas</h3>
              {[...analytics.surveys]
                .sort((a, b) => b.responses - a.responses)
                .map((s) => (
                  <div className="analysis-row" key={s.id}>
                    <span>{s.title}</span>
                    <strong>{s.responses}</strong>
                  </div>
                ))}
            </div>
          </>
        )
      )}
      {!draft && tab !== "analytics" && (
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
            disabled={
              tab === "reports"
                ? reports.length < 12
                : (page + 1) * 12 >=
                  (tab === "surveys"
                    ? (surveys?.total ?? 0)
                    : (ideas?.total ?? 0))
            }
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
