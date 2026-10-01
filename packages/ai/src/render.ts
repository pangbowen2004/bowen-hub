/** 一次替换；不重新解释输入字符串中的模板或 $。 */
export function renderPrompt(
  template: string,
  inputs: Record<string, unknown>,
): { system: string; user: string } {
  const matches = [...template.matchAll(/^## ([^\n]+)\n/gm)];
  const sections: Record<string, string> = {};
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match) continue;
    const name = match[1]?.trim();
    if (name !== "system" && name !== "user") continue;
    const body = template
      .slice((match.index ?? 0) + match[0].length, matches[i + 1]?.index ?? template.length)
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();
    sections[name] = body.replace(/\{\{ ([A-Za-z][A-Za-z0-9_]*) \}\}/g, (_all, key: string) => {
      const value = inputs[key];
      if (
        value == null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" && Object.keys(value).length === 0)
      )
        return "（无）";
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);
    });
  }
  if (sections.system === undefined || sections.user === undefined)
    throw new Error("提示词必须包含 system 与 user 两节");
  return { system: sections.system, user: sections.user };
}
