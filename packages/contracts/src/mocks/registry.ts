// “GET 接口默认返回样例”的登记方式（docs/08 第 7 节）。
// 各领域在 samples/<领域>.ts 里用 sampleRoute() 声明“哪个接口 ↔ 哪些样例”：
//   sampleRoute(getPrivateWatchlistListMockHandler, [watchItems], { shape: "list" })
// 第一个参数是 generated/msw.ts 里 Orval 生成的处理器工厂（接口改名时 tsc 会报错），
// 样例是 fixtures/samples/ 里的 JSON（一个对象或对象数组都行，会被摊平成一组样例）。
import type { HttpHandler, RequestHandlerOptions } from "msw";

type PathParams = Record<string, string | readonly string[] | undefined>;

type Sample = Record<string, unknown>;

/**
 * 接口返回的形状：
 * - one：返回一份样例（带路径参数时按 pick 挑，挑不中返回第一份）
 * - list：返回全部样例组成的数组
 * - page：分页接口，包成 { items: 全部样例, nextCursor: null }
 */
export type SampleShape = "one" | "list" | "page";

export type SampleOptions = {
  shape: SampleShape;
  /** shape 为 one 时按路径参数挑样例，如 (sample, params) => sample.id === params.id */
  pick?: (sample: Sample, params: PathParams) => boolean;
};

export type SampleRoute = {
  /** 生成一个新的 MSW 处理器（每次调用都是新实例，测试之间互不影响） */
  build: () => HttpHandler;
};

type HandlerFactory<TOverride> = (
  overrideResponse?: TOverride,
  options?: RequestHandlerOptions,
) => HttpHandler;

/** 把样例文件的内容摊平成一组样例（文件内容可以是对象，也可以是对象数组）。 */
export function flattenSamples(files: readonly unknown[]): Sample[] {
  return files.flatMap((content) => (Array.isArray(content) ? content : [content])) as Sample[];
}

/** 按形状和路径参数决定返回什么。 */
export function resolveSample(
  samples: readonly Sample[],
  options: SampleOptions,
  params: PathParams,
): unknown {
  if (options.shape === "list") return samples;
  if (options.shape === "page") return { items: samples, nextCursor: null };
  const { pick } = options;
  const picked = pick === undefined ? undefined : samples.find((sample) => pick(sample, params));
  return picked ?? samples[0];
}

export function sampleRoute<TOverride>(
  factory: HandlerFactory<TOverride>,
  files: readonly unknown[],
  options: SampleOptions,
): SampleRoute {
  const samples = flattenSamples(files);
  if (samples.length === 0) throw new Error("sampleRoute：至少要有一份样例");
  const override = (info: { params: PathParams }) => resolveSample(samples, options, info.params);
  return { build: () => factory(override as never) };
}
