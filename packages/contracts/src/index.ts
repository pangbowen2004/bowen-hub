// @bowen-hub/contracts：由 contracts/ 生成（mise run gen），用法见 contracts/README.md。
// 根入口只导出模型类型和客户端配置；其余按需从子路径导入：
//   @bowen-hub/contracts/types   全部模型的类型（与根入口相同）
//   @bowen-hub/contracts/zod     Zod：每个模型一个 schema，外加每个接口的参数、请求体、响应
//   @bowen-hub/contracts/client  fetch 客户端，每个接口一个函数
//   @bowen-hub/contracts/hooks   TanStack Query hooks（控制台）
//   @bowen-hub/contracts/mocks   MSW 处理器：GET 接口默认返回 fixtures/samples 里的样例
export * from "./generated/types";
export { type ClientConfig, configureClient, getBaseUrl } from "./runtime/base-url";
