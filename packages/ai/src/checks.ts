/** 报告只包含路径与原因；业务校验由领域包登记。 */
import type { Schema } from "./registry";
export interface CheckContext {
  inputs: Record<string, unknown>;
  schema: Schema;
  adviceWords: string[];
  totalPages?: number;
}
export interface CheckReport {
  name: string;
  changes: string[];
  failed: boolean;
}
export type Check = (output: Record<string, unknown>, context: CheckContext) => CheckReport;
const exclusions =
  /(?<![0-9])(?:19|20)\d{2}(?![\d,.]|\s*(?:亿|万|%|B\b|million|billion))(?=年|\b)|\b\d{1,2}:\d{2}(?::\d{2})?\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\d{1,2}\s*月\s*\d{1,2}\s*[日号]|\bQ[1-4]\b|第[一二三四1234]季度|\b8-K\b|\bForm\s+\d+\b|\bItem\s+\d+(?:\.\d+)?\b|(?:标普|S&P\s*)\s*500|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/gi;
const factors: Record<string, number> = {
  万亿: 1e12,
  亿: 1e8,
  万: 1e4,
  b: 1e9,
  billion: 1e9,
  m: 1e6,
  million: 1e6,
  k: 1e3,
  thousand: 1e3,
};
export function quantities(text: string): Set<number> {
  const values = new Set<number>();
  for (const match of text
    .replace(exclusions, " ")
    .matchAll(
      /(?<![\w.])(\$)?[+-]?(\d[\d,]*(?:\.\d+)?)(?:\s*(万亿|亿|万|billion|million|thousand|[BMbmkK]|%|bp|倍))?/gi,
    )) {
    const n = match[2]?.replaceAll(",", "") ?? "";
    if (!match[1] && !match[3] && (n.split(".")[0]?.length ?? 0) < 3) continue;
    values.add(Number(n) * (factors[match[3]?.toLowerCase() ?? ""] ?? 1));
  }
  return values;
}
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}
function props(schema: Schema): Record<string, Schema> {
  let result = (schema.properties ?? {}) as Record<string, Schema>;
  for (const branch of [
    ...((schema.anyOf ?? []) as Schema[]),
    ...((schema.allOf ?? []) as Schema[]),
  ])
    result = { ...result, ...(branch.properties as Record<string, Schema>) };
  return result;
}
function walk(
  value: unknown,
  schema: Schema,
  transform: (text: string, schema: Schema, path: string) => string,
  path = "$",
): unknown {
  if (typeof value === "string") return transform(value, schema, path);
  if (Array.isArray(value))
    return value.map((item, i) =>
      walk(
        item,
        {
          ...((schema.items ?? {}) as Schema),
          ...(schema["x-max-chars"] === undefined ? {} : { "x-max-chars": schema["x-max-chars"] }),
        },
        transform,
        `${path}[${i}]`,
      ),
    );
  if (value && typeof value === "object") {
    const properties = props(schema);
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "generatedBy"
          ? item
          : walk(item, properties[key] ?? {}, transform, `${path}.${key}`),
      ]),
    );
  }
  return value;
}
function replace(output: Record<string, unknown>, updated: unknown): void {
  for (const key of Object.keys(output)) delete output[key];
  Object.assign(output, updated);
}
function filterText(
  name: string,
  output: Record<string, unknown>,
  ctx: CheckContext,
  valid: (sentence: string) => boolean,
): CheckReport {
  const report = { name, changes: [] as string[], failed: false };
  replace(
    output,
    walk(output, ctx.schema, (text, _schema, path) => {
      const result = (text.match(/.+?(?:[。！？!?]|\.(?=\s|$)|\n|$)|[。！？!?\n]/gs) ?? [])
        .filter(valid)
        .join("");
      if (result !== text) {
        report.changes.push(path);
        report.failed ||= !result.trim();
      }
      return result;
    }),
  );
  return report;
}
export const numbersInSources: Check = (output, ctx) => {
  const known = quantities(strings(ctx.inputs).join("\n"));
  return filterText("numbers_in_sources", output, ctx, (text) =>
    [...quantities(text)].every((n) => known.has(n)),
  );
};
export const noAdvice: Check = (output, ctx) =>
  filterText(
    "no_advice",
    output,
    ctx,
    (text) => !ctx.adviceWords.some((word) => text.includes(word)),
  );
export const lengthWithin: Check = (output, ctx) => {
  const report = { name: "length_within", changes: [] as string[], failed: false };
  replace(
    output,
    walk(output, ctx.schema, (text, schema, path) => {
      const max = schema["x-max-chars"];
      if (typeof max !== "number" || [...text].length <= max) return text;
      const prefix = [...text].slice(0, max).join("");
      const matches = [...prefix.matchAll(/[。！？!?]|\.(?=\s|$)/g)];
      const last = matches.at(-1);
      const result = last ? prefix.slice(0, last.index + last[0].length) : "";
      report.changes.push(path);
      report.failed ||= !result;
      return result;
    }),
  );
  return report;
};
export const quotesInSources: Check = (output, ctx) => {
  const report = { name: "quotes_in_sources", changes: [] as string[], failed: false };
  const source = strings(ctx.inputs.pages ?? ctx.inputs.sourceText ?? ctx.inputs)
    .join("\n")
    .replace(/^L\d+:\s*/gm, "")
    .replace(/\s+/g, "");
  function valid(item: unknown, schema: Schema, path: string): boolean {
    if (typeof item === "string" && schema["x-source-quote"]) {
      const ok = source.includes(item.replace(/\s+/g, ""));
      if (!ok) report.changes.push(path);
      return ok;
    }
    if (Array.isArray(item)) {
      const kept = item.filter((child, i) =>
        valid(child, (schema.items ?? {}) as Schema, `${path}[${i}]`),
      );
      report.failed ||= item.length > 0 && kept.length === 0;
      item.splice(0, item.length, ...kept);
    } else if (item && typeof item === "object") {
      const properties = props(schema);
      for (const [key, child] of Object.entries(item)) {
        const childSchema = properties[key] ?? {};
        if (!valid(child, childSchema, `${path}.${key}`)) {
          if (((childSchema.anyOf ?? []) as Schema[]).some((branch) => branch.type === "null"))
            (item as Record<string, unknown>)[key] = null;
          else return false;
        }
      }
    }
    return true;
  }
  const rootValid = valid(output, ctx.schema, "$");
  report.failed = report.failed || !rootValid;
  return report;
};
export const sourceIdsExist: Check = (output, ctx) => {
  const known = new Set<unknown>();
  function gather(value: unknown): void {
    if (Array.isArray(value)) for (const child of value) gather(child);
    else if (value && typeof value === "object") {
      const node = value as Record<string, unknown>;
      if (typeof node.id === "string" || typeof node.id === "number") known.add(node.id);
      for (const child of Object.values(node)) gather(child);
    }
  }
  gather(ctx.inputs);
  const report = { name: "source_ids_exist", changes: [] as string[], failed: false };
  function visit(value: unknown, path: string): boolean {
    if (Array.isArray(value)) {
      const before = value.length;
      const kept = value.filter((child, i) => visit(child, `${path}[${i}]`));
      value.splice(0, value.length, ...kept);
      report.failed ||= before > 0 && kept.length === 0;
    } else if (value && typeof value === "object") {
      const node = value as Record<string, unknown>;
      if ("id" in node && !known.has(node.id)) {
        report.changes.push(`${path}.id`);
        return false;
      }
      if (Array.isArray(node.sourceIds)) {
        const refs = node.sourceIds;
        const kept = refs.filter((ref) => known.has(ref));
        if (kept.length !== refs.length) {
          report.changes.push(`${path}.sourceIds`);
          report.failed ||= refs.length > 0 && kept.length === 0;
        }
        node.sourceIds = kept;
      }
      for (const [key, child] of Object.entries(node))
        if (key !== "generatedBy" && !visit(child, `${path}.${key}`)) return false;
    }
    return true;
  }
  const valid = visit(output, "$");
  report.failed = report.failed || !valid;
  return report;
};
export const pagesInRange: Check = (output, ctx) => {
  if (ctx.totalPages === undefined || ctx.totalPages < 1)
    throw new Error("pages_in_range 需要调用方提供真实 totalPages");
  const total = ctx.totalPages;
  const report = { name: "pages_in_range", changes: [] as string[], failed: false };
  function visit(value: unknown, path: string): void {
    if (Array.isArray(value))
      value.forEach((child, i) => {
        visit(child, `${path}[${i}]`);
      });
    else if (value && typeof value === "object")
      for (const [key, child] of Object.entries(value)) {
        if (["pages", "pagesChecked", "visualPagesChecked"].includes(key) && Array.isArray(child)) {
          const kept = child.filter((page) => Number.isInteger(page) && page >= 1 && page <= total);
          if (kept.length !== child.length) report.changes.push(`${path}.pages`);
          (value as Record<string, unknown>)[key] = kept;
        } else if (
          key === "pdfPage" &&
          child != null &&
          (typeof child !== "number" || !Number.isInteger(child) || child < 1 || child > total)
        ) {
          report.changes.push(`${path}.pdfPage`);
          report.failed = true;
          (value as Record<string, unknown>)[key] = null;
        } else visit(child, `${path}.${key}`);
      }
  }
  visit(output, "$");
  return report;
};
export class CheckRegistry {
  private readonly checks = new Map<string, Check>(
    Object.entries({
      numbers_in_sources: numbersInSources,
      quotes_in_sources: quotesInSources,
      source_ids_exist: sourceIdsExist,
      no_advice: noAdvice,
      length_within: lengthWithin,
      pages_in_range: pagesInRange,
    }),
  );
  register(name: string, check: Check): void {
    if (this.checks.has(name)) throw new Error("校验已注册");
    this.checks.set(name, check);
  }
  has(name: string): boolean {
    return this.checks.has(name);
  }
  run(
    names: string[],
    output: Record<string, unknown>,
    context: CheckContext,
  ): { output: Record<string, unknown>; reports: CheckReport[] } {
    const result = structuredClone(output);
    const reports = names.map((name) => {
      const check = this.checks.get(name);
      if (!check) throw new Error(`领域校验未注册：${name}`);
      return check(result, context);
    });
    return { output: result, reports };
  }
}
