// node 预设的自检：能用 Node 的 API；strict 生效。
import { readFileSync } from "node:fs";

export const readText = (path: string): string => readFileSync(path, "utf8");

// @ts-expect-error 隐式 any 必须报错（strict）
export const implicitAny = (value) => value;

const numbers: number[] = [];
// @ts-expect-error 下标访问可能是 undefined（noUncheckedIndexedAccess）
export const first: number = numbers[0];
