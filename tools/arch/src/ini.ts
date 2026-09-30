// 读写 import-linter 的 INI 配置。只支持本仓库用到的写法：[节]、key = value、缩进的续行、整行 # 注释。
export type IniSection = { name: string; entries: Map<string, string[]> };

export function parseIni(text: string): IniSection[] {
  const sections: IniSection[] = [];
  let current: IniSection | undefined;
  let values: string[] | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      values = undefined;
      continue;
    }
    if (trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
    const indented = /^\s/.test(raw);
    const header = /^\[(.+)\]$/.exec(trimmed);
    if (!indented && header?.[1] !== undefined) {
      current = { name: header[1], entries: new Map() };
      sections.push(current);
      values = undefined;
    } else if (indented && values !== undefined) {
      values.push(trimmed);
    } else {
      const index = raw.indexOf("=");
      if (current === undefined || index === -1 || indented) {
        throw new Error(`INI 格式不对：${trimmed}`);
      }
      const value = raw.slice(index + 1).trim();
      values = value === "" ? [] : [value];
      current.entries.set(raw.slice(0, index).trim(), values);
    }
  }
  return sections;
}

export function serializeIni(sections: IniSection[]): string {
  const blocks = sections.map((section) =>
    [
      `[${section.name}]`,
      ...[...section.entries].map(([key, values]) =>
        values.length === 1
          ? `${key} = ${values[0]}`
          : [`${key} =`, ...values.map((v) => `    ${v}`)].join("\n"),
      ),
    ].join("\n"),
  );
  return `${blocks.join("\n\n")}\n`;
}
