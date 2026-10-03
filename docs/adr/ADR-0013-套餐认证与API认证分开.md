# ADR-0013 套餐认证与 API 认证分开

## 背景

2026-10-03，真实 API 请求返回 `credit_balance_exhausted`；Kevin 要求改用已有每月套餐，随后明确要求执行解决方案。本机官方 Codex CLI 的 ChatGPT 登录已完成真实结构化调用，不能将这种认证当作普通 API Key 使用。

## 决定

Python 能力运行时增加显式 `HUB_AI_BACKEND=subscription`，通过锁定的官方 Codex CLI 调用；默认 `gateway` 保留原有 Cloudflare 传输。模型、提示词、契约、评测集与阈值不因认证方式更换而改变。套餐与普通 API 两种路径分开，禁止自动切回收费 API。

私有 GitHub Actions 使用独立登录会话；会话只存于独立、默认私有且不绑定业务 Worker 的 R2 桶 `bowen-hub-automation`。全部使用该会话的工作流共用串行组，恢复当前版本后运行 Codex，成功或失败后都保存 Codex 更新的版本。不得复制桌面会话给多个机器并发使用，不得存入代码、日志、构建物或普通缓存。

## 理由

[官方非交互文档](https://learn.chatgpt.com/docs/non-interactive-mode)允许可信私有自动化使用 ChatGPT 登录；[官方续期说明](https://learn.chatgpt.com/docs/auth/ci-cd-auth)要求独立串行使用并持久保存更新后的会话。这样不依赖 Mac 持续在线，也不购买新服务。

## 后果

套餐调用的 `costUsd` 为本次新增 API 账单费用 0，实际输入、缓存与输出 token 仍记录；这不表示套餐无限或没有月费。套餐限额与日常 Codex 共享；耗尽或登录失效仍明确失败，不能伪装成功。套餐传输的 token 上限在返回真实用量后检查，CLI 不能提供与原 API 相同的请求侧硬输出上限，超限调用仍会消耗套餐额度。

Worker 实时 `papers.qa` 继续使用原 API 路径。本改动不能宣称其已恢复；[Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source/)对远程托管应用要求官方接入申请，不能把 Codex 会话直接塞入公开 Worker。后续验收仍区分这两条路径。

模型步骤预留作业超时前的会话保存时间。共享串行组使用 queue: max，避免新任务覆盖排队任务；手动强制取消、runner 失联仍可能丢失最新续期，需要重新登录，不保证所有中断下持久化成功。

公共模型目录及运行时改动均触发已注册的全部正式用例。仍未实现任务的未注册用例明确列为跳过，不生成结果；这些任务的后续交付必须补齐各自用例并通过，不能把跳过计为质量通过。
