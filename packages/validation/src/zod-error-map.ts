import { z, type ZodErrorMap, type ZodIssue } from "zod";

export function setupZodErrorMap(): void {
  const errorMap: ZodErrorMap = (issue, ctx) => {
    let message = ctx.defaultError;

    if (issue.code === z.ZodIssueCode.invalid_type) {
      const expected = getPtBrTypeName(issue.expected as string);
      const received = getPtBrTypeName(issue.received);
      message = `Esperado ${expected}, recebido ${received}`;
    } else if (issue.code === z.ZodIssueCode.invalid_string) {
      const validation = (issue as any).validation;
      if (validation === "email") {
        message = "Email inválido";
      } else if (validation === "url") {
        message = "URL inválida";
      } else if (validation === "uuid") {
        message = "ID inválido";
      } else if (validation === "regex") {
        message = "Formato inválido";
      } else {
        message = "String inválida";
      }
    } else if (issue.code === z.ZodIssueCode.too_small) {
      const issueType = (issue as any).type;
      const minimum = (issue as any).minimum;
      const kind =
        issueType === "string"
          ? "caracteres"
          : issueType === "array"
            ? "itens"
            : "valor";
      message = `Mínimo de ${minimum} ${kind} necessário`;
    } else if (issue.code === z.ZodIssueCode.too_big) {
      const issueType = (issue as any).type;
      const maximum = (issue as any).maximum;
      const kind =
        issueType === "string"
          ? "caracteres"
          : issueType === "array"
            ? "itens"
            : "valor";
      message = `Máximo de ${maximum} ${kind} permitido`;
    } else if (issue.code === z.ZodIssueCode.invalid_enum_value) {
      const options = (issue as any).options;
      message = `Valor inválido. Opções permitidas: ${options.join(", ")}`;
    } else if (issue.code === z.ZodIssueCode.invalid_date) {
      message = "Data inválida";
    } else if (issue.code === z.ZodIssueCode.invalid_union) {
      message = "Valor não corresponde a nenhuma opção";
    } else if (issue.code === z.ZodIssueCode.invalid_union_discriminator) {
      message = "Valor de discriminador inválido";
    } else if (issue.code === z.ZodIssueCode.custom) {
      message = "Dados inválidos";
    } else if (issue.code === z.ZodIssueCode.not_multiple_of) {
      const multipleOf = (issue as any).multipleOf;
      message = `Deve ser múltiplo de ${multipleOf}`;
    } else if (issue.code === z.ZodIssueCode.not_finite) {
      message = "Deve ser um número finito";
    }

    return { message };
  };

  z.setErrorMap(errorMap);
}

function getPtBrTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    string: "texto",
    number: "número",
    bigint: "número inteiro grande",
    boolean: "booleano",
    date: "data",
    symbol: "símbolo",
    undefined: "indefinido",
    null: "nulo",
    array: "array",
    object: "objeto",
    unknown: "desconhecido",
    never: "nunca",
    function: "função",
  };
  return typeMap[type] || type;
}
