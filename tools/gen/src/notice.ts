// 每个生成文件第一行的提示（docs/08 第 3 节）。JSON 不能写注释，用第一个键 "$comment"。
export const NOTICE = "由 contracts 生成，勿手改（mise run gen）";

export const SLASH_HEADER = `// ${NOTICE}`;
export const HASH_HEADER = `# ${NOTICE}`;

/** 在文本前加一行注释头（已经有了就不重复加）。 */
export function withHeader(text: string, header: string): string {
  return text.startsWith(`${header}\n`) ? text : `${header}\n${text}`;
}

/** JSON：把提示放进第一个键 "$comment"（JSON Schema 2020-12 自带这个注释关键字）。 */
export function withJsonNotice(value: Record<string, unknown>): Record<string, unknown> {
  const { $comment: _ignored, ...rest } = value;
  return { $comment: NOTICE, ...rest };
}

/** 统一的 JSON 写法：两空格缩进、末尾换行。 */
export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
