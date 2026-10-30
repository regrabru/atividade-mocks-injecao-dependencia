import { HttpError } from "../src/errors";
import {
  parseId,
  positiveInteger,
  validateBody,
  validateName,
} from "../src/validation";

// Verifica que a função lança um HttpError 400.
function expectBadRequest(fn: () => unknown) {
  let thrown: unknown;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(HttpError);
  expect((thrown as HttpError).statusCode).toBe(400);
}

describe("positiveInteger", () => {
  test.each([1, 2147483647])(
    "retorna o próprio número quando o valor é %p (limite permitido)",
    (value) => {
      expect(positiveInteger(value, "RA")).toBe(value);
    },
  );

  test.each<[string, unknown]>([
    ["0", 0],
    ["-1", -1],
    ["1.5", 1.5],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["2147483648", 2147483648],
    ['"123" (string numérica)', "123"],
    ["null", null],
    ["undefined", undefined],
  ])("rejeita %s com HttpError 400", (_label, value) => {
    expectBadRequest(() => positiveInteger(value, "RA"));
  });
});

describe("parseId", () => {
  test.each([
    ["1", 1],
    ["2147483647", 2147483647],
  ])("converte a string %p para o número %p", (value, expected) => {
    expect(parseId(value, "RA")).toBe(expected);
  });

  test.each<[string, unknown]>([
    ['"1abc"', "1abc"],
    ['"1.2"', "1.2"],
    ['"1e2"', "1e2"],
    ['"" (vazia)', ""],
    ['"-1"', "-1"],
    ['"0"', "0"],
    ['"2147483648"', "2147483648"],
    ["o número 123", 123],
  ])("rejeita %s com HttpError 400", (_label, value) => {
    expectBadRequest(() => parseId(value, "RA"));
  });
});

describe("validateName", () => {
  test.each([
    ["Ana", "Ana"],
    ["string com 100 letras a", "a".repeat(100)],
  ])("retorna o nome recebido: %s", (_label, value) => {
    expect(validateName(value)).toBe(value);
  });

  test.each<[string, unknown]>([
    ['"" (vazio)', ""],
    ['"ab" (curto)', "ab"],
    ['"   " (só espaços)', "   "],
    ['" a " (espaços não completam o mínimo)', " a "],
    ["string com 101 letras a", "a".repeat(101)],
    ["o número 123", 123],
    ["null", null],
    ["undefined", undefined],
  ])("rejeita %s com HttpError 400", (_label, value) => {
    expectBadRequest(() => validateName(value));
  });
});

describe("validateBody", () => {
  test("retorna a mesma referência de um objeto congelado, sem modificá-lo", () => {
    const body = Object.freeze({ name: "Ana" });

    const result = validateBody(body);

    expect(result).toBe(body);
    expect(body).toEqual({ name: "Ana" });
  });

  test("aceita campos extras e retorna a mesma referência sem alterar o objeto", () => {
    const body = { name: "Ana", extra: true };

    const result = validateBody(body);

    expect(result).toBe(body);
    expect(body).toEqual({ name: "Ana", extra: true });
  });

  test.each<[string, unknown]>([
    ["null", null],
    ["undefined", undefined],
    ["array vazio", []],
    ['string "Ana"', "Ana"],
    ["número 12", 12],
  ])("rejeita %s com HttpError 400", (_label, value) => {
    expectBadRequest(() => validateBody(value));
  });
});
