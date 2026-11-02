"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Download,
  Filter,
  Link2,
  ShieldCheck,
  TrendingUp,
  Users,
  MapPin,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  useApi,
  query,
  themes,
  type Survey,
  type Paged,
  type Results,
  format,
} from "@/lib/api";
import {
  PageHead,
  LocationFields,
  Notice,
  ErrorState,
  Loading,
  Empty,
} from "./shared";
export function ResultCharts({ data }: { data: Results }) {
  const questions = data.questions;
  return (
    <>
      <div className="result-grid">
        {questions.map((q) => (
          <div className="chart-card" key={q.id}>
            <span className="eyebrow">
              {q.theme} · {q.surveyTitle}
            </span>
            <h3>{q.text}</h3>
            {q.suppressed ? (
              <Empty
                title="Resultado protegido"
                text="A amostra ainda é insuficiente para divulgar esta distribuição com privacidade."
              />
            ) : (
              <>
                <div className="chart-meta">
                  Base: {q.total} respostas{" "}
                  {q.type === "RANK"
                    ? "· Primeira prioridade de cada participação"
                    : ""}
                  {q.average !== null
                    ? ` · Média: ${q.average.toFixed(1)}/5`
                    : ""}
                </div>
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(210, q.options.length * 54)}
                >
                  <BarChart
                    layout="vertical"
                    data={q.options}
                    margin={{ left: 0, right: 35, top: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="var(--line)"
                    />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                    />
                    <YAxis
                      type="category"
                      width={130}
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        borderColor: "var(--line)",
                        borderRadius: 10,
                      }}
                      formatter={(value) => [`${value}%`, "Participações"]}
                    />
                    <Bar
                      dataKey="percent"
                      fill="#168464"
                      radius={[0, 5, 5, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="distribution-table">
                  {q.options.map((o) => (
                    <div key={o.key}>
                      <span>{o.label}</span>
                      <strong>
                        {o.percent}% <small>n={o.count}</small>
                      </strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {!questions.length && (
        <Empty
          title="Toda conversa tem um começo."
          text="Ainda não há respostas neste recorte. Seja uma das primeiras pessoas a participar."
          action={
            <Link href="/pesquisas" className="button primary">
              Participar de uma pesquisa
            </Link>
          }
        />
      )}
      <div className="chart-card timeline">
        <span className="eyebrow">AO LONGO DO TEMPO</span>
        <h3>Participações por mês</h3>
        {data.timeline.some((d) => d.count !== null) ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface)" }} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#168464"
                strokeWidth={3}
                name="Respostas"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="muted">
            A evolução mensal será exibida quando houver ao menos 5 respostas no
            mês. Meses suprimidos aparecem como lacunas.
          </p>
        )}
      </div>
    </>
  );
}
export function ResultsPage() {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [theme, setTheme] = useState("");
  const [surveyId, setSurveyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const surveys = useApi<Pick<Survey, "id" | "title">[]>("/surveys/catalog");
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setState(p.get("stateId") ?? "");
    setCity(p.get("municipalityId") ?? "");
    setTheme(p.get("theme") ?? "");
    setSurveyId(p.get("surveyId") ?? "");
    setFrom(p.get("fromDate") ?? "");
    setTo(p.get("toDate") ?? "");
    setReady(true);
  }, []);
  const filters = query({
    stateId: state,
    municipalityId: city,
    theme,
    surveyId,
    from: from ? from + "T00:00:00.000Z" : null,
    to: to
      ? new Date(new Date(to + "T00:00:00Z").getTime() + 86400000).toISOString()
      : null,
  });
  const results = useApi<Results>(ready ? "/results?" + filters : null);
  useEffect(() => {
    if (ready)
      history.replaceState(
        null,
        "",
        "/dados?" +
          query({
            stateId: state,
            municipalityId: city,
            theme,
            surveyId,
            fromDate: from,
            toDate: to,
          }),
      );
  }, [ready, state, city, theme, surveyId, from, to]);
  const top = results.data?.questions.find(
    (q) => q.key === "priority" && !q.suppressed,
  );
  const leading = top
    ? [...top.options].sort((a, b) => (b.count ?? 0) - (a.count ?? 0))[0]
    : null;
  return (
    <div className="container page">
      <PageHead
        eyebrow="DADOS ABERTOS, CONTEXTO CLARO"
        title="Brasil em Dados"
        description="Transformando opiniões em uma visão compartilhada. Explore as participações registradas, com transparência sobre cada recorte."
        action={
          <div className="head-actions">
            <button
              className="button outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
            >
              <Link2 size={16} />
              {copied ? "Link copiado" : "Compartilhar"}
            </button>
            <a className="button primary" href={"/api/reports.pdf?" + filters}>
              <Download size={16} /> Relatório PDF
            </a>
          </div>
        }
      />
      <div className="filter-panel results-filters">
        <span className="filter-label">
          <Filter size={17} /> Filtrar resultados
        </span>
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
          <span>Pesquisa</span>
          <select
            value={surveyId}
            onChange={(e) => setSurveyId(e.target.value)}
          >
            <option value="">Todas as pesquisas</option>
            {surveys.data?.map((s) => (
              <option value={s.id} key={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>De (UTC)</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Até (UTC)</span>
          <input
            type="date"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="text-link"
          onClick={() => {
            setState("");
            setCity("");
            setTheme("");
            setSurveyId("");
            setFrom("");
            setTo("");
          }}
        >
          Limpar filtros
        </button>
      </div>
      {surveys.error && (
        <ErrorState message={surveys.error} retry={surveys.refresh} />
      )}
      <Notice />
      {results.loading ? (
        <Loading />
      ) : results.error ? (
        <ErrorState message={results.error} retry={results.refresh} />
      ) : (
        results.data && (
          <>
            <div className="dashboard-metrics">
              {[
                [Users, format(results.data.total), "Respostas no recorte"],
                [
                  TrendingUp,
                  leading?.label ?? "Aguardando amostra",
                  "Principal prioridade¹",
                ],
                [
                  ChartNoAxesCombined,
                  format(
                    results.data.questions.filter((q) => !q.suppressed).length,
                  ),
                  "Distribuições publicáveis",
                ],
                [
                  MapPin,
                  format(
                    results.data.geography.filter((g) => !g.suppressed).length,
                  ),
                  "UFs com amostra publicável",
                ],
              ].map(([Icon, value, label]) => {
                const I = Icon as typeof Users;
                return (
                  <div className="dashboard-metric" key={String(label)}>
                    <I size={21} />
                    <strong>{value as string}</strong>
                    <span>{label as string}</span>
                  </div>
                );
              })}
            </div>
            <div className="results-context">
              <span>
                <span className="pulse" /> Atualizado em{" "}
                {new Date(results.data.generatedAt).toLocaleString("pt-BR")}
              </span>
              <Link href="/comparar" className="text-link">
                Comparar regiões →
              </Link>
            </div>
            {top && leading && (
              <div className="insight">
                <ShieldCheck size={21} />
                <p>
                  <strong>{leading.percent}%</strong> dos participantes de “
                  {top.surveyTitle}” neste recorte apontaram{" "}
                  <strong>{leading.label.toLowerCase()}</strong> como
                  prioridade. Base: {top.total} respostas. Período:{" "}
                  {from || "início da coleta"} até {to || "agora"}. Estado:{" "}
                  {state || "todos"}; município: {city || "todos"}; tema:{" "}
                  {theme || "todos"}.
                </p>
              </div>
            )}
            <p className="micro-note">
              ¹ Distribuição da pergunta de prioridade da primeira pesquisa com
              amostra publicável neste recorte. Os percentuais de pesquisas
              diferentes não são somados.
            </p>
            <ResultCharts data={results.data} />
          </>
        )
      )}
    </div>
  );
}
