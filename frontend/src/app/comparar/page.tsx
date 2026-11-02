"use client";
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  useApi,
  query,
  type Paged,
  type Survey,
  type Results,
} from "@/lib/api";
import {
  PageHead,
  LocationFields,
  Notice,
  Loading,
  ErrorState,
  Empty,
} from "@/components/shared";
export default function Compare() {
  const [a, setA] = useState("28");
  const [ac, setAc] = useState("");
  const [b, setB] = useState("29");
  const [bc, setBc] = useState("");
  const [survey, setSurvey] = useState("");
  const surveys = useApi<Pick<Survey, "id" | "title">[]>("/surveys/catalog");
  const left = useApi<Results>(
    survey
      ? "/results?" +
          query({ surveyId: survey, stateId: a, municipalityId: ac })
      : null,
  );
  const right = useApi<Results>(
    survey
      ? "/results?" +
          query({ surveyId: survey, stateId: b, municipalityId: bc })
      : null,
  );
  return (
    <div className="container page">
      <PageHead
        eyebrow="PERSPECTIVAS LADO A LADO"
        title="Compare lugares. Entenda contextos."
        description="Compare as mesmas perguntas da mesma pesquisa, preservando a equivalência das alternativas e a privacidade dos participantes."
      />
      <div className="card">
        <label className="field">
          <span>Pesquisa para comparação</span>
          <select value={survey} onChange={(e) => setSurvey(e.target.value)}>
            <option value="">Selecione uma pesquisa</option>
            {surveys.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <div className="comparison-selectors">
          <div>
            <h3>Localidade A</h3>
            <div className="form-grid">
              <LocationFields
                state={a}
                city={ac}
                onState={setA}
                onCity={setAc}
              />
            </div>
          </div>
          <ArrowLeftRight className="compare-icon" />
          <div>
            <h3>Localidade B</h3>
            <div className="form-grid">
              <LocationFields
                state={b}
                city={bc}
                onState={setB}
                onCity={setBc}
              />
            </div>
          </div>
        </div>
      </div>
      <Notice />
      {surveys.error && <ErrorState message={surveys.error} />}
      {!survey ? (
        <Empty
          title="Escolha a conversa"
          text="Selecione uma pesquisa para comparar perguntas equivalentes."
        />
      ) : left.loading || right.loading ? (
        <Loading />
      ) : left.error || right.error ? (
        <ErrorState message={left.error || right.error} />
      ) : (
        <>
          <div className="comparison-base">
            <strong>Localidade A · n={left.data?.total ?? 0}</strong>
            <span>×</span>
            <strong>Localidade B · n={right.data?.total ?? 0}</strong>
          </div>
          <p className="muted">
            São amostras voluntárias com tamanhos e composições diferentes.
            Diferenças percentuais não demonstram diferenças entre as
            populações. Não calculamos margem de erro nem significância.
          </p>
          {left.data?.questions
            .filter(
              (q) =>
                right.data?.questions.some(
                  (r) => r.id === q.id && !r.suppressed,
                ) && !q.suppressed,
            )
            .map((q) => {
              const r = right.data!.questions.find((r) => r.id === q.id)!;
              return (
                <div className="chart-card" key={q.id}>
                  <span className="eyebrow">
                    {q.theme} · BASES A: {q.total} / B: {r.total}
                  </span>
                  <h3>{q.text}</h3>
                  <div className="compare-legend">
                    <span>● Localidade A</span>
                    <span>● Localidade B</span>
                  </div>
                  {q.options.map((o) => {
                    const ro = r.options.find((x) => x.key === o.key);
                    return (
                      <div className="compare-row" key={o.key}>
                        <strong>{o.label}</strong>
                        <div>
                          <span style={{ width: `${o.percent}%` }} />
                          <b>{o.percent}%</b>
                        </div>
                        <div>
                          <span
                            className="blue"
                            style={{ width: `${ro?.percent}%` }}
                          />
                          <b>{ro?.percent}%</b>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          {!left.data?.questions.some(
            (q) =>
              !q.suppressed &&
              right.data?.questions.some((r) => r.id === q.id && !r.suppressed),
          ) && (
            <Empty
              title="Ainda não é possível comparar"
              text="As duas localidades precisam ter amostras publicáveis para a mesma pergunta. Escolha outra pesquisa ou aguarde mais participações."
            />
          )}
        </>
      )}
    </div>
  );
}
