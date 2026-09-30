// dom 预设的自检：能用浏览器 API，没有 Node 的类型；strict 生效。
export const pageTitle = (): string => document.title;

// @ts-expect-error dom 预设不带 Node 的类型
export const nodeVersion: string = process.version;

// @ts-expect-error 隐式 any 必须报错（strict）
export const implicitAny = (value) => value;
