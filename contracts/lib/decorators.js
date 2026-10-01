// 契约的四个自定义装饰器（docs/08 第 4 节、docs/10 第 5 节）。声明在 common.tsp。
// 它们只做“标注”：写成 x- 扩展；生成的 Zod / Pydantic 校验器不据此做任何校验。
//   @task("T14")   → 操作上的 x-task（负责实现的任务号）；JSON Schema 里没有操作，所以只出现在 OpenAPI
//   @maxChars(80)  → x-max-chars：字数上限，AI 运行时的 length_within 读取（超出就截到完整句）
//   @sourceQuote   → x-source-quote：原文片段，quotes_in_sources 读取（必须是输入原文的子串）
//   @image         → x-image：图片字段，运行时作为图片附件随 user 消息发送
// 后三个同时写进 OpenAPI 和 JSON Schema。
import { setExtension as setJsonSchemaExtension } from "@typespec/json-schema";
import { setExtension as setOpenApiExtension } from "@typespec/openapi";

function annotate(program, target, key, value) {
  setOpenApiExtension(program, target, key, value);
  setJsonSchemaExtension(program, target, key, value);
}

export const $decorators = {
  BowenHub: {
    task(context, target, id) {
      setOpenApiExtension(context.program, target, "x-task", id);
    },
    maxChars(context, target, limit) {
      annotate(context.program, target, "x-max-chars", limit);
    },
    sourceQuote(context, target) {
      annotate(context.program, target, "x-source-quote", true);
    },
    image(context, target) {
      annotate(context.program, target, "x-image", true);
    },
  },
};
