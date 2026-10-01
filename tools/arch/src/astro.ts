// Astro 官方解析器保留模板表达式；脚本单独放在顶层，交给现有 dependency-cruiser 规则。

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { convertToTSX, parse } from "@astrojs/compiler/sync";
import type { DiagnosticMessage, Node } from "@astrojs/compiler/types";
import ts from "typescript-parser";

export const ASTRO_SUFFIX = ".__arch__.tsx";
const SOURCE = /\.(astro|[cm]?[jt]sx?)$/;
const SECRET = /^(?:\.env(?:\..*)?|\.dev\.vars)$/;
// Astro 会把 text/javascript 标成 unknown，不能据此跳过浏览器仍会执行的脚本。
const JS_TYPES =
  /^(?:(?:application|text)\/(?:x-)?(?:java|ecma)script|text\/(?:javascript1\.[0-5]|jscript|livescript))$/;
function executableScript(node: Extract<Node, { type: "element" }>): boolean {
  const type = node.attributes.find((attribute) => attribute.name === "type");
  if (type === undefined || type.kind !== "quoted") return true;
  const mime = type.value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mime === "" || mime === "module" || JS_TYPES.test(mime);
}

function checkDiagnostics(file: string, diagnostics: DiagnosticMessage[]): void {
  const errors = diagnostics.filter((item) => item.severity === 1);
  if (errors.length > 0) {
    throw new Error(`${file}：${errors.map((item) => item.text).join("；")}`);
  }
}

function checkSyntax(file: string, code: string): void {
  const result = ts.transpileModule(code, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.Preserve },
  });
  const errors = result.diagnostics?.filter(
    (item) => item.category === ts.DiagnosticCategory.Error,
  );
  if (errors?.length) {
    throw new Error(
      `${file}：${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, " ")).join("；")}`,
    );
  }
}

/** 不执行组件；保留 import type、模板中的动态导入和 script src 引用。 */
export function astroSource(file: string, source: string): string {
  const parsed = parse(source, { position: true });
  checkDiagnostics(file, parsed.diagnostics);
  const scriptSources: string[] = [];
  const snippets: string[] = [];
  const walk = (node: Node): void => {
    if (node.type === "frontmatter") checkSyntax(`${file}.ts`, node.value);
    if (node.type === "element" && node.name === "script" && executableScript(node)) {
      const src = node.attributes.find(
        (attribute) => attribute.name === "src" && attribute.kind === "quoted",
      );
      if (src !== undefined) scriptSources.push(`import ${JSON.stringify(src.value)};`);
      snippets.push(
        node.children
          .filter((child) => child.type === "text")
          .map((child) => child.value)
          .join(""),
      );
    }
    if ("children" in node) node.children.forEach(walk);
  };
  walk(parsed.ast);
  const converted = convertToTSX(source, {
    filename: file,
    includeScripts: false,
    includeStyles: false,
  });
  checkDiagnostics(file, converted.diagnostics);
  snippets.push(
    ...(converted.metaRanges.scripts ?? [])
      .filter((script) => script.type === "event-attribute")
      .map((script) => script.content),
  );
  for (const snippet of snippets) checkSyntax(`${file}.ts`, snippet);
  const code = [converted.code, ...scriptSources, ...snippets].join("\n;\n");
  checkSyntax(`${file}.tsx`, code);
  return code;
}

/**
 * 只在系统临时目录建立检查副本；源代码与包清单才复制内容，资源只保留路径供解析。
 * node_modules 不复制内容：内部工作区链接指向副本，第三方包链接到已安装的依赖。
 */
export function prepareAstroTree(
  root: string,
  dirs: string[],
  skipped: ReadonlySet<string>,
): string | undefined {
  const astros: string[] = [];
  const find = (dir: string): void => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory() && !skipped.has(entry.name)) find(path);
      else if (entry.isFile() && path.endsWith(".astro")) astros.push(path);
    }
  };
  dirs.forEach(find);
  if (astros.length === 0) return undefined;
  const shadow = mkdtempSync(join(tmpdir(), "bowen-hub-astro-"));
  const realRoot = realpathSync(root);
  const insideSource = (path: string): boolean =>
    dirs.some((dir) => path === dir || path.startsWith(`${dir}/`));

  const dependencies = (from: string, to: string): void => {
    if (!existsSync(from)) return;
    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const source = join(from, entry.name);
      const target = join(to, entry.name);
      if (entry.isDirectory() && entry.name.startsWith("@")) dependencies(source, target);
      else {
        const path = relative(realRoot, realpathSync(source));
        symlinkSync(
          insideSource(path) ? relative(to, join(shadow, path)) : resolve(source),
          target,
        );
      }
    }
  };
  const copy = (path: string): void => {
    const from = join(root, path);
    const to = join(shadow, path);
    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const child = `${path}/${entry.name}`;
      const target = join(shadow, child);
      if (entry.name === "node_modules") dependencies(join(root, child), target);
      else if (skipped.has(entry.name) || SECRET.test(entry.name)) continue;
      else if (entry.isDirectory()) copy(child);
      else if (entry.isSymbolicLink()) {
        const canonical = relative(realRoot, realpathSync(join(root, child)));
        if (!insideSource(canonical)) throw new Error(`${child}：源码链接指向检查范围之外`);
        symlinkSync(relative(dirname(target), join(shadow, canonical)), target);
      } else if (entry.isFile()) {
        if (SOURCE.test(entry.name) || entry.name === "package.json")
          copyFileSync(join(root, child), target);
        else writeFileSync(target, "");
      }
    }
  };
  try {
    dirs.forEach(copy);
    if (existsSync(join(root, "package.json")))
      copyFileSync(join(root, "package.json"), join(shadow, "package.json"));
    dependencies(join(root, "node_modules"), join(shadow, "node_modules"));
    copyFileSync(join(root, ".dependency-cruiser.cjs"), join(shadow, ".dependency-cruiser.cjs"));
    for (const path of astros) {
      const target = join(shadow, `${path}${ASTRO_SUFFIX}`);
      if (existsSync(target)) throw new Error(`${path}：临时检查文件名已被占用`);
      writeFileSync(target, astroSource(path, readFileSync(join(root, path), "utf8")));
    }
    return shadow;
  } catch (error) {
    rmSync(shadow, { recursive: true, force: true });
    throw error;
  }
}
