// fetch 客户端：每个接口一个函数（如 privateWatchlistList()），直接返回响应正文；
// 非 2xx 时抛出 Error，带 status 和 info（problem+json 正文）。基础地址见 runtime/base-url.ts。
export * from "./generated/client";
export { type ClientConfig, configureClient, getBaseUrl } from "./runtime/base-url";
