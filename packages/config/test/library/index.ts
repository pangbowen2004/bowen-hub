// library 预设的自检：既没有 DOM 也没有 Node 的类型；strict 生效。
export const double = (value: number): number => value * 2;

// @ts-expect-error library 预设不带 DOM
export const title: string = document.title;

// @ts-expect-error library 预设不带 Node 的类型
export const nodeVersion: string = process.version;

// @ts-expect-error 隐式 any 必须报错（strict）
export const implicitAny = (value) => value;
