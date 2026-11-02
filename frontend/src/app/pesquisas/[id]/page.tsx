"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  api,
  useApi,
  visibleQuestions,
  cleanAnswers,
  type Survey,
  type Question,
} from "@/lib/api";
import {
  LocationFields,
  Loading,
  ErrorState,
  Notice,
} from "@/components/shared";
export default function Questionnaire({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const survey = useApi<Survey>("/surveys/" + id);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [step, setStep] = useState(-1);
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  useEffect(() => {
    try {
      const cached = JSON.parse(
        localStorage.getItem("vb-survey-" + id) ?? "null",
      );
      if (cached && cached.savedAt > Date.now() - 7 * 86400000) {
        setAnswers(cached.answers ?? {});
        setState(cached.state ?? "");
        setCity(cached.city ?? "");
      }
    } catch {
      setStorageAvailable(false);
    }
    setReady(true);
  }, [id]);
  useEffect(() => {
    if (ready && !done)
      try {
        localStorage.setItem(
          "vb-survey-" + id,
          JSON.stringify({ answers, state, city, savedAt: Date.now() }),
        );
      } catch {
        setStorageAvailable(false);
      }
  }, [answers, state, city, ready, done, id]);
  useEffect(() => {
    if (survey.data?.stateId) setState(String(survey.data.stateId));
    if (survey.data?.municipalityId)
      setCity(String(survey.data.municipalityId));
  }, [survey.data]);
  if (survey.loading || !ready)
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  if (survey.error)
    return (
      <div className="container page">
        <ErrorState message={survey.error} retry={survey.refresh} />
      </div>
    );
  const s = survey.data!;
  const questions = visibleQuestions(s.questions, answers);
  const q = questions[step];
  const review = step >= questions.length;
  function update(values: string[]) {
    setError("");
    setAnswers((prev) =>
      cleanAnswers(s.questions, { ...prev, [q.key]: values }),
    );
  }
  function valid(question: Question) {
    const v = answers[question.key] ?? [];
    return (
      !question.required ||
      (v.length > 0 &&
        (question.type !== "TEXT" || v[0].trim().length > 0) &&
        (question.type !== "RANK" || v.length === question.options.length))
    );
  }
  async function begin() {
    if (s.scope === "STATE" && !state) {
      setError("Selecione seu estado.");
      return;
    }
    if (s.scope === "MUNICIPAL" && (!state || !city)) {
      setError("Selecione seu estado e município.");
      return;
    }
    if (
      (s.stateId && String(s.stateId) !== state) ||
      (s.municipalityId && String(s.municipalityId) !== city)
    ) {
      setError("Selecione a localidade desta pesquisa.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/surveys/${id}/start`, { method: "POST" });
      setStep(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!consent) {
      setError("Confirme sua participação voluntária.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/surveys/${id}/responses`, {
        method: "POST",
        body: JSON.stringify({
          stateId: state ? +state : null,
          municipalityId: city ? +city : null,
          consent,
          answers: cleanAnswers(s.questions, answers),
        }),
      });
      try {
        localStorage.removeItem("vb-survey-" + id);
      } catch {}
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="container questionnaire success">
        <span className="success-icon">
          <CheckCircle2 size={45} />
        </span>
        <span className="eyebrow">PARTICIPAÇÃO CONFIRMADA</span>
        <h1>
          Sua voz agora faz parte
          <br />
          desta conversa.
        </h1>
        <p>
          Obrigado por compartilhar sua perspectiva. Os resultados são
          publicados de forma agregada, quando há participações suficientes.
        </p>
        <div className="hero-actions">
          <Link href={"/dados?surveyId=" + id} className="button primary">
            Explorar resultados <ArrowRight size={17} />
          </Link>
          <Link href="/pesquisas" className="button outline">
            Ver outras pesquisas
          </Link>
        </div>
      </div>
    );
  return (
    <div className="container questionnaire">
      <Link className="text-link muted" href="/pesquisas">
        <ArrowLeft size={16} /> Voltar às pesquisas
      </Link>
      <div className="questionnaire-heading">
        <span className="eyebrow">PESQUISA · {s.theme}</span>
        <h1>{s.title}</h1>
        <span className="privacy-inline">
          <LockKeyhole size={14} /> Anônima e sem cadastro
        </span>
      </div>
      {!s.accepting ? (
        <div className="card">
          <h2>Esta pesquisa está encerrada ou agendada.</h2>
          <p>
            Consulte os resultados disponíveis ou escolha uma pesquisa aberta.
          </p>
          <Link className="button primary" href={"/dados?surveyId=" + id}>
            Explorar resultados
          </Link>
        </div>
      ) : (
        <>
          <div className="progress-label">
            <span>
              {step < 0
                ? "Antes de começar"
                : review
                  ? "Revise sua participação"
                  : `Pergunta ${step + 1} de ${questions.length}`}
            </span>
            <strong>
              {step < 0
                ? 0
                : Math.min(100, Math.round((step / questions.length) * 100))}
              %
            </strong>
          </div>
          <div className="progress">
            <span
              style={{
                width: `${step < 0 ? 0 : Math.min(100, (step / questions.length) * 100)}%`,
              }}
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              className="question-card"
              onAnimationComplete={() =>
                document
                  .querySelector<HTMLElement>(".question-card h2")
                  ?.focus()
              }
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {step < 0 ? (
                <>
                  <span className="question-symbol">
                    <ShieldCheck size={27} />
                  </span>
                  <h2 tabIndex={-1}>
                    Um pouco de contexto.
                    <br />
                    Nenhum dado desnecessário.
                  </h2>
                  <p>{s.description}</p>
                  <p className="muted">
                    Sua localidade ajuda a organizar os resultados. Você pode
                    informar apenas o estado em pesquisas nacionais. Nunca
                    informe nome, CPF ou endereço nas respostas.
                  </p>
                  <div className="form-grid">
                    <LocationFields
                      state={state}
                      city={city}
                      onState={setState}
                      onCity={setCity}
                      required={["STATE", "MUNICIPAL"].includes(s.scope)}
                    />
                  </div>
                  <div className="draft-note">
                    O rascunho fica neste navegador por até 7 dias e é removido
                    após o envio. Evite dispositivos compartilhados.
                  </div>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={begin}
                  >
                    {busy ? "Preparando…" : "Começar pesquisa"}{" "}
                    <ArrowRight size={18} />
                  </button>
                </>
              ) : review ? (
                <>
                  <span className="eyebrow">QUASE LÁ</span>
                  <h2 tabIndex={-1}>Está tudo como você pensa?</h2>
                  <p>Revise suas respostas antes de enviar.</p>
                  <div className="review-list">
                    {questions.map((question, index) => (
                      <div key={question.key}>
                        <div>
                          <strong>{question.text}</strong>
                          <p>
                            {(answers[question.key] ?? [])
                              .map(
                                (v) =>
                                  question.options.find((o) => o.key === v)
                                    ?.label ?? v,
                              )
                              .join(" · ") || "Não respondida (opcional)"}
                          </p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => {
                            setStep(index);
                            setError("");
                          }}
                        >
                          Editar
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      Participo voluntariamente e concordo com o uso agregado
                      destas respostas, conforme a{" "}
                      <Link href="/privacidade" target="_blank">
                        política de privacidade
                      </Link>
                      .
                    </span>
                  </label>
                  <div className="question-actions">
                    <button
                      className="button outline"
                      disabled={busy}
                      onClick={() => setStep(questions.length - 1)}
                    >
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={send}
                    >
                      {busy ? "Registrando…" : "Enviar minha participação"}{" "}
                      <Check size={18} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="eyebrow">
                    {q.theme} · {q.required ? "OBRIGATÓRIA" : "OPCIONAL"}
                  </span>
                  <h2 tabIndex={-1}>{q.text}</h2>
                  <p>
                    {q.type === "MULTI"
                      ? "Você pode escolher mais de uma alternativa."
                      : q.type === "RANK"
                        ? "Toque em cada prioridade na ordem de importância, da maior para a menor."
                        : q.type === "TEXT"
                          ? "Não inclua nomes, telefones ou outras informações pessoais."
                          : "Escolha a alternativa que melhor representa sua opinião."}
                  </p>
                  {q.type === "TEXT" ? (
                    <textarea
                      aria-label={q.text}
                      rows={6}
                      maxLength={3000}
                      placeholder="Conte com suas palavras…"
                      value={answers[q.key]?.[0] ?? ""}
                      onChange={(e) =>
                        update(e.target.value ? [e.target.value] : [])
                      }
                    />
                  ) : q.type === "RANK" ? (
                    <div className="rank-list">
                      {(answers[q.key] ?? []).map((v, index) => (
                        <div className="rank-selected" key={v}>
                          <strong>{index + 1}</strong>
                          <span>
                            {q.options.find((o) => o.key === v)?.label}
                          </span>
                          <button
                            aria-label="Mover para cima"
                            className="icon-button"
                            disabled={index === 0}
                            onClick={() => {
                              const a = [...answers[q.key]];
                              [a[index - 1], a[index]] = [
                                a[index],
                                a[index - 1],
                              ];
                              update(a);
                            }}
                          >
                            <ChevronUp size={17} />
                          </button>
                          <button
                            aria-label="Remover prioridade da ordem"
                            className="icon-button"
                            onClick={() =>
                              update(answers[q.key].filter((x) => x !== v))
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {q.options
                        .filter((o) => !answers[q.key]?.includes(o.key))
                        .map((o) => (
                          <button
                            className="answer-option"
                            key={o.key}
                            onClick={() =>
                              update([...(answers[q.key] ?? []), o.key])
                            }
                          >
                            <span className="answer-index">+</span>
                            {o.label}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div
                      className={
                        "answer-list " + (q.type === "SCALE" ? "scale" : "")
                      }
                      role="group"
                      aria-label={q.text}
                    >
                      {q.options.map((o, index) => {
                        const selected =
                          answers[q.key]?.includes(o.key) ?? false;
                        return (
                          <button
                            aria-pressed={selected}
                            className={
                              "answer-option " + (selected ? "chosen" : "")
                            }
                            key={o.key}
                            onClick={() =>
                              update(
                                q.type === "MULTI"
                                  ? selected
                                    ? answers[q.key].filter((v) => v !== o.key)
                                    : [...(answers[q.key] ?? []), o.key]
                                  : [o.key],
                              )
                            }
                          >
                            <span className="answer-index">
                              {selected ? (
                                <Check size={16} />
                              ) : q.type === "SCALE" ? (
                                o.key
                              ) : (
                                String.fromCharCode(65 + index)
                              )}
                            </span>
                            <span>{o.label}</span>
                            <span
                              className={
                                q.type === "MULTI"
                                  ? "option-check square"
                                  : "option-check"
                              }
                            >
                              {selected && <Check size={12} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="question-actions">
                    <button
                      className="button outline"
                      onClick={() => {
                        setStep(step - 1);
                        setError("");
                      }}
                    >
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    <button
                      className="button primary"
                      onClick={() => {
                        if (!valid(q)) {
                          setError("Complete esta pergunta para continuar.");
                          return;
                        }
                        setError("");
                        setStep(step + 1);
                      }}
                    >
                      {" "}
                      {step === questions.length - 1
                        ? "Revisar respostas"
                        : "Próxima pergunta"}{" "}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          <div className="question-foot">
            <ShieldCheck size={15} />{" "}
            {storageAvailable
              ? "Salvamento temporário neste navegador"
              : "Rascunho indisponível neste navegador"}{" "}
            · Participação voluntária
            <button
              className="text-link"
              onClick={() => {
                try {
                  localStorage.removeItem("vb-survey-" + id);
                } catch {}
                setAnswers({});
                setStep(-1);
                setConsent(false);
              }}
            >
              Limpar rascunho
            </button>
          </div>
        </>
      )}
      <Notice />
    </div>
  );
}
