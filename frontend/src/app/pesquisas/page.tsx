"use client";
import { useEffect, useState } from "react";
import { useApi, query, themes, type Survey, type Paged } from "@/lib/api";
import {
  PageHead,
  SurveyCard,
  LocationFields,
  Loading,
  ErrorState,
  Empty,
  Notice,
} from "@/components/shared";
import { Search, SlidersHorizontal } from "lucide-react";
export default function Surveys() {
  const [scope, setScope] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [theme, setTheme] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => {
    setTheme(new URLSearchParams(location.search).get("theme") ?? "");
  }, []);
  const data = useApi<Paged<Survey>>(
    "/surveys?" +
      query({ stateId: state, municipalityId: city, theme, scope, page }),
  );
  useEffect(() => setPage(0), [state, city, theme, scope]);
  const items = data.data?.items.filter((s) =>
    s.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <div className="container page">
      <PageHead
        eyebrow="ESCUTA ABERTA"
        title="Sua perspectiva faz diferença."
        description="Encontre uma conversa que importa para você. Participe de forma anônima, no seu ritmo e sem cadastro."
      />
      <div className="scope-tabs" role="group" aria-label="Alcance da pesquisa">
        {[
          ["", "Todas as pesquisas"],
          ["NATIONAL", "Brasil"],
          ["STATE", "Meu estado"],
          ["MUNICIPAL", "Minha cidade"],
          ["THEMATIC", "Por tema"],
        ].map(([v, l]) => (
          <button
            key={v}
            aria-pressed={scope === v}
            onClick={() => setScope(v)}
            className={scope === v ? "selected" : ""}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="filter-panel">
        <span className="filter-label">
          <SlidersHorizontal size={18} /> Encontre sua pesquisa
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
      </div>
      <div className="list-top">
        <span>{data.data?.total ?? "…"} pesquisas encontradas</span>
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Buscar nesta página"
            placeholder="Buscar nesta página…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {data.loading ? (
        <Loading />
      ) : data.error ? (
        <ErrorState message={data.error} retry={data.refresh} />
      ) : items?.length ? (
        <div className="cards-grid">
          {items.map((s, i) => (
            <SurveyCard key={s.id} survey={s} index={i} />
          ))}
        </div>
      ) : (
        <Empty
          title="Nenhuma pesquisa neste recorte"
          text="Experimente outro tema ou localidade."
        />
      )}
      <div className="pagination">
        <button
          className="button outline"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          className="button outline"
          disabled={(page + 1) * 12 >= (data.data?.total ?? 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
      <Notice />
    </div>
  );
}
