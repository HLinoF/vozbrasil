import { describe, it, expect } from "vitest";
import { cleanAnswers, visibleQuestions, query, type Question } from "./api";
const questions: Question[] = [
  {
    key: "a",
    text: "A",
    type: "SINGLE",
    theme: "Geral",
    required: true,
    conditionKey: null,
    conditionValue: null,
    options: [],
  },
  {
    key: "b",
    text: "B",
    type: "MULTI",
    theme: "Geral",
    required: true,
    conditionKey: "a",
    conditionValue: "yes",
    options: [],
  },
  {
    key: "c",
    text: "C",
    type: "TEXT",
    theme: "Geral",
    required: true,
    conditionKey: "b",
    conditionValue: "yes",
    options: [],
  },
];
describe("rascunho e lógica condicional", () => {
  it("revela somente questões aplicáveis", () => {
    expect(visibleQuestions(questions, { a: ["no"] })).toHaveLength(1);
    expect(visibleQuestions(questions, { a: ["yes"] })).toHaveLength(2);
  });
  it("remove respostas de ramificações antigas em cascata", () => {
    expect(
      cleanAnswers(questions, { a: ["no"], b: ["yes"], c: ["texto privado"] }),
    ).toEqual({ a: ["no"] });
  });
  it("preserva respostas elegíveis", () => {
    expect(
      cleanAnswers(questions, { a: ["yes"], b: ["yes"], c: ["texto"] }),
    ).toEqual({ a: ["yes"], b: ["yes"], c: ["texto"] });
  });
  it("serializa filtros sem transformar ausentes em valores", () => {
    expect(
      query({
        stateId: 28,
        municipalityId: null,
        theme: "Saúde",
        surveyId: "",
      }),
    ).toBe("stateId=28&theme=Sa%C3%BAde");
  });
});
