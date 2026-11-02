"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import {
  useApi,
  type Results,
  type State,
  type Paged,
  type Survey,
  type Idea,
  type City,
  query,
} from "@/lib/api";
import { BrazilMap } from "@/components/map-loader";
import {
  PageHead,
  Notice,
  Loading,
  ErrorState,
  Empty,
  LocationFields,
} from "@/components/shared";
export default function MapPage() {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [metric, setMetric] = useState("responses");
  const [municipal, setMunicipal] = useState(false);
  const cities = useApi<City[]>(
    state ? "/states/" + state + "/municipalities" : null,
  );
  const states = useApi<State[]>("/states");
  const data = useApi<Results>("/results");
  const local = useApi<Results>(
    state
      ? "/results?" + query({ stateId: state, municipalityId: city })
      : null,
  );
  const surveys = useApi<Paged<Survey>>(
    state ? "/surveys?stateId=" + state : null,
  );
  const ideas = useApi<Paged<Idea>>(
    state
      ? "/suggestions?" + query({ stateId: state, municipalityId: city })
      : null,
  );
  useEffect(() => {
    setState(new URLSearchParams(location.search).get("stateId") ?? "");
  }, []);
  const name = states.data?.find((s) => String(s.id) === state)?.name;
  return (
    <div className="container page">
      <PageHead
        eyebrow="UM PAÍS, MUITAS REALIDADES"
        title="Cada lugar tem uma voz."
        description="Explore a participação nos estados. Clique no mapa ou escolha sua localidade para conhecer os dados disponíveis."
      />
      <div className="filter-panel">
        <LocationFields
          state={state}
          city={city}
          onState={setState}
          onCity={setCity}
        />
        <label className="field">
          <span>Escala territorial</span>
          <select
            value={municipal ? "city" : "state"}
            onChange={(e) => {
              setMunicipal(e.target.value === "city");
              setCity("");
            }}
          >
            <option value="state">Estados</option>
            <option value="city" disabled={!state}>
              Municípios da UF selecionada
            </option>
          </select>
        </label>
        <label className="field">
          <span>Indicador do mapa</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="responses">Respostas publicáveis</option>
            <option value="coverage">Disponibilidade de amostra</option>
          </select>
        </label>
      </div>
      {states.error && (
        <ErrorState message={states.error} retry={states.refresh} />
      )}
      <div className="map-layout">
        <div className="map-card">
          {data.loading ? (
            <Loading />
          ) : data.error ? (
            <ErrorState message={data.error} retry={data.refresh} />
          ) : (
            <BrazilMap
              coverage={metric === "coverage"}
              municipalState={municipal && state ? +state : undefined}
              cities={cities.data ?? []}
              selected={
                municipal
                  ? city
                    ? +city
                    : undefined
                  : state
                    ? +state
                    : undefined
              }
              states={states.data ?? []}
              data={
                municipal
                  ? local.data?.municipalities?.map((g) => ({
                      stateId: g.municipalityId,
                      count: g.count,
                      suppressed: g.suppressed,
                    }))
                  : data.data?.geography
              }
              onSelect={(id) => {
                if (municipal) {
                  setCity(String(id));
                } else {
                  setState(String(id));
                  setCity("");
                }
              }}
            />
          )}
          <div className="map-legend">
            <span>
              <i />
              Sem amostra publicável
            </span>
            <span>
              <i />{" "}
              {metric === "coverage"
                ? "Amostra disponível"
                : "Mais participações"}
            </span>
            <span>
              <i />
              Selecionado
            </span>
          </div>
        </div>
        <aside className="local-panel">
          <span className="eyebrow">OLHAR LOCAL</span>
          <h2>
            <MapPin size={23} />
            {name ?? "Escolha um estado"}
          </h2>
          {!state ? (
            <Empty
              title="Explore o Brasil"
              text="Selecione uma UF no mapa para começar."
            />
          ) : local.loading ? (
            <Loading />
          ) : local.error ? (
            <ErrorState message={local.error} retry={local.refresh} />
          ) : (
            <>
              <strong className="local-count">
                {local.data?.total ?? 0}
                <span>respostas no recorte</span>
              </strong>
              <p className="muted">
                {city
                  ? "Recorte municipal selecionado."
                  : "Participações informadas para esta UF."}
              </p>
              <h3>Temas com resultados disponíveis</h3>
              {local.data?.questions.some((q) => !q.suppressed) ? (
                Array.from(
                  new Set(
                    local.data.questions
                      .filter((q) => !q.suppressed)
                      .map((q) => q.theme),
                  ),
                ).map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))
              ) : (
                <p className="muted">Aguardando amostra suficiente.</p>
              )}
              <h3>Pesquisas disponíveis</h3>
              {surveys.loading ? (
                <Loading />
              ) : surveys.error ? (
                <ErrorState message={surveys.error} />
              ) : (
                surveys.data?.items
                  .filter((s) => s.accepting)
                  .slice(0, 4)
                  .map((s) => (
                    <Link
                      className="local-survey"
                      href={"/pesquisas/" + s.id}
                      key={s.id}
                    >
                      {s.title}
                      <ArrowUpRight size={16} />
                    </Link>
                  ))
              )}
              <h3>Ideias da comunidade</h3>
              {ideas.loading ? (
                <Loading />
              ) : ideas.error ? (
                <ErrorState message={ideas.error} />
              ) : ideas.data?.items.length ? (
                ideas.data.items.slice(0, 2).map((i) => (
                  <Link className="local-survey" key={i.id} href="/ideias">
                    {i.title}
                    <ArrowUpRight size={16} />
                  </Link>
                ))
              ) : (
                <p className="muted">Nenhuma ideia publicada neste recorte.</p>
              )}
              <Link
                href={
                  "/dados?" + query({ stateId: state, municipalityId: city })
                }
                className="button primary"
              >
                Ver resultados locais <ArrowUpRight size={16} />
              </Link>
            </>
          )}
        </aside>
      </div>
      {city && (
        <div className="notice">
          <MapPin size={19} />
          <p>
            O painel usa o código oficial do município selecionado. Ative a
            escala municipal para carregar a malha oficial do IBGE sob demanda.
          </p>
        </div>
      )}
      <Notice />
    </div>
  );
}
