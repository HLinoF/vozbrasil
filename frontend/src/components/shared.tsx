"use client";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Inbox,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useApi, type State, type City, type Survey } from "@/lib/api";
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> Carregando dados…
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>Não foi possível carregar</strong>
        <p>{message}</p>
        {retry && (
          <button className="text-link" onClick={retry}>
            Tentar novamente <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title = "Ainda estamos ouvindo",
  text = "Os resultados aparecerão aqui quando houver participações suficientes.",
  action,
}: {
  title?: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Notice() {
  return (
    <div className="notice">
      <ShieldCheck size={20} />
      <p>
        <strong>Transparência em primeiro lugar.</strong> As participações são
        voluntárias e não representam a população brasileira. Resultados de
        grupos pequenos são protegidos.{" "}
        <Link href="/privacidade">
          Conheça nossa metodologia <ArrowUpRight size={13} />
        </Link>
      </p>
    </div>
  );
}
export function LocationFields({
  state,
  city,
  onState,
  onCity,
  required = false,
}: {
  state: string;
  city: string;
  onState: (v: string) => void;
  onCity: (v: string) => void;
  required?: boolean;
}) {
  const states = useApi<State[]>("/states");
  const cities = useApi<City[]>(
    state ? `/states/${state}/municipalities` : null,
  );
  return (
    <>
      <label className="field">
        <span>Estado {required ? "*" : ""}</span>
        <select
          required={required}
          value={state}
          onChange={(e) => {
            onState(e.target.value);
            onCity("");
          }}
        >
          <option value="">
            {states.loading ? "Carregando estados…" : "Todos os estados"}
          </option>
          {states.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.uf})
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Município</span>
        <select
          disabled={!state || cities.loading}
          value={city}
          onChange={(e) => onCity(e.target.value)}
        >
          <option value="">
            {cities.loading && state ? "Carregando…" : "Todos os municípios"}
          </option>
          {cities.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {states.error && (
        <ErrorState message={states.error} retry={states.refresh} />
      )}
      {cities.error && (
        <ErrorState message={cities.error} retry={cities.refresh} />
      )}
    </>
  );
}
export const scopeLabels: Record<string, string> = {
  NATIONAL: "Nacional",
  STATE: "Estadual",
  MUNICIPAL: "Municipal",
  THEMATIC: "Temática",
};
export function SurveyCard({
  survey,
  index = 0,
}: {
  survey: Survey;
  index?: number;
}) {
  const estimated = Math.max(1, Math.ceil(survey.questions.length * 0.6));
  return (
    <Reveal className={"survey-card theme-" + (index % 3)}>
      <div className="card-top">
        <span className="tag">{scopeLabels[survey.scope]}</span>
        <span className={"status " + (survey.accepting ? "live" : "")}>
          {survey.accepting ? (
            <>
              <i /> Aberta para ouvir
            </>
          ) : (
            "Encerrada ou agendada"
          )}
        </span>
      </div>
      <div className="survey-icon">
        {survey.scope === "MUNICIPAL" ? (
          <MapPin />
        ) : survey.scope === "THEMATIC" ? (
          <MessageSquare />
        ) : (
          <Users />
        )}
      </div>
      <span className="overline">{survey.theme}</span>
      <h3>{survey.title}</h3>
      <p>{survey.description}</p>
      <div className="survey-meta">
        <span>
          <Clock3 size={14} /> {estimated} min
        </span>
        <span>{survey.questions.length} perguntas</span>
      </div>
      <Link
        className="card-action"
        href={
          survey.accepting
            ? `/pesquisas/${survey.id}`
            : `/dados?surveyId=${survey.id}`
        }
      >
        {survey.accepting
          ? "Quero dar minha opinião"
          : "Ver pesquisa e resultados"}{" "}
        <ArrowUpRight size={18} />
      </Link>
    </Reveal>
  );
}
export function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="check-item">
      <Check size={14} />
      {children}
    </span>
  );
}
