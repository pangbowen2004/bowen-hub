# ADR-0014 论文问答在免费 SQLite Durable Object 中运行

## 背景

T32 要求一次约 3,000 token 的流式问答在线上不超 CPU 限制。普通免费 Worker 实测 CPU 1,861 ms，改成原生转发流后仍有 102 ms，都超过免费版每次请求 10 ms 的上限；docs/10 第 5 节的退路（直接转发网关的流、结束后从全文提取页码）同样要在 Worker 里处理全文，仍然超限。

## 决定

`POST /v1/papers/{id}/ask` 的原始请求转交同一 Worker 导出的 SQLite Durable Object 执行（每次回答一个独立对象，不保存业务状态），会话与来源鉴权仍在原有应用里完成，入口原样返回事件流；其余接口路径不变（PR #88，docs/09 第 1 节）。

## 理由

SQLite 版 Durable Object 在 Workers 免费版可用，单次请求的 CPU 上限远高于普通 Worker（实测入口 1 ms、对象 79–89 ms 完成整次回答）；不需要购买 Workers 付费版，也不改变模型、提示词和输出预算。

## 后果

docs/01 第 9 节"Durable Objects 本期不依赖"对这一个接口不再成立，其余仍不依赖；wrangler.jsonc 多一个 Durable Object 绑定与迁移；Durable Objects 的免费额度（每天的请求数与时长）纳入运维观测。以后其他需要较长 CPU 的按需 AI 可以沿用这种方式，但要各自写 ADR。
