"use client";
import { useCallback, useEffect, useState } from "react";
export type Option = { key: string; label: string };
export type Question = {
  id?: string;
  key: string;
  text: string;
  type: "SINGLE" | "MULTI" | "SCALE" | "RANK" | "TEXT";
  theme: string;
  required: boolean;
  conditionKey: string | null;
  conditionValue: string | null;
  options: Option[];
};
export type Survey = {
  id: string;
  title: string;
  description: string;
  theme: string;
  scope: string;
  status: string;
  stateId: number | null;
  municipalityId: number | null;
  opensAt: string | null;
  closesAt: string | null;
  accepting: boolean;
  responseCount: number;
  questions: Question[];
};
export type State = { id: number; name: string; uf: string };
export type City = { id: number; name: string; stateId: number };
export type Idea = {
  id: string;
  title: string;
  description: string;
  theme: string;
  stateId: number | null;
  municipalityId: number | null;
  createdAt: string;
  supports: number;
  status: string;
};
export type ResultQuestion = {
  id: string;
  key: string;
  surveyId: string;
  surveyTitle: string;
  text: string;
  theme: string;
  type: string;
  total: number | null;
  suppressed: boolean;
  average: number | null;
  options: {
    key: string;
    label: string;
    count: number | null;
    percent: number | null;
  }[];
};
export type Results = {
  total: number;
  participants: number;
  questions: ResultQuestion[];
  geography: { stateId: number; count: number | null; suppressed: boolean }[];
  timeline: { date: string; count: number | null }[];
  municipalities: {
    municipalityId: number;
    count: number | null;
    suppressed: boolean;
  }[];
  minSample: number;
  generatedAt: string;
  notice: string;
};
export type Paged<T> = { items: T[]; total: number; page: number };
export const themes = [
  "Geral",
  "Educação",
  "Saúde",
  "Segurança",
  "Emprego",
  "Tecnologia",
  "Meio ambiente",
  "Infraestrutura",
];
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.message ??
        (response.status === 401
          ? "Credenciais inválidas."
          : "Serviço indisponível. Tente novamente."),
    );
  }
  return response.json();
}
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    api<T>(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, loading, refresh };
}
export function query(
  values: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "")
      params.set(key, String(value));
  });
  return params.toString();
}
export function visibleQuestions(
  questions: Question[],
  answers: Record<string, string[]>,
) {
  return questions.filter(
    (q) =>
      !q.conditionKey ||
      answers[q.conditionKey]?.includes(q.conditionValue ?? ""),
  );
}
export function cleanAnswers(
  questions: Question[],
  answers: Record<string, string[]>,
) {
  const result = { ...answers };
  for (const q of questions)
    if (
      q.conditionKey &&
      !result[q.conditionKey]?.includes(q.conditionValue ?? "")
    )
      delete result[q.key];
  return result;
}
export const format = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
