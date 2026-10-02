# 论文 API 接线

REST 的 31 个操作仅实现生成契约登记的路径。内部写要求服务令牌，私有读写要求真实会话；上传是 application/pdf 原始正文，不是 multipart。R2 读写保持流，浏览器 Blob 可以不显式设置 Content-Length；未知长度的自定义流若 R2 无法保存，会将 Upload 标为 failed 并返回 502，不伪造成功。

## 问答流

POST `/v1/papers/{id}/ask` 的生产响应为原生 OpenAI 兼容 SSE，`Content-Type: text/event-stream`，`x-paper-qa-stream: openai-sse-v1`。不设置 AI SDK UI stream header。客户端按该标识解析 `choices[].delta.content`，立即显示正文；原始供应商字节经原生 pipeTo 转发，没有逐delta SDK解析和二次编码。

上游 `data: [DONE]` 只代表模型输出结束，**继续读到响应EOF**，才收到专用 `event: paper-qa`，其 `data` 是 `{type:"data-paper-qa",data:{pages,generatedBy,validation,ok,error}}`。pages 为运行时校验后的引用页集合，generatedBy 为清单版本/实际模型出处，validation 为确定性报告；失败 error 只有安全中文提示。没有终态、ok=false或网络中断都按失败显示，不删改已到正文。原始上游错误字段不作为最终状态依据；客户端不显示原始诊断正文。显式注入假Adapter的测试辅助路径仍使用旧UI stream，只测试共享Runtime行为，不是生产协议。

原生Adapter仍由共享 Runtime.stream 构造清单模型/effort/token/timeout请求，记录真实供应商用量、提取完整answer引用并执行全部确定性校验。tee另一支在结束后一次读取/解析完整SSE，向运行时只产出一次全文，客户端仍在模型运行时收到字节。HTTP失败在发表流之前可有限重试；开始转发后任何格式、finish或usage错误不重发。生产路由通过executionCtx.waitUntil保留流尾校验/记账；客户端取消后另一tee分支继续有限读取，受模型超时与平台后台寿命约束。超过token预算明确失败且记录实际用量；缺用量明确失败并不写伪造0费用，只记安全缺失日志。

问答SQL只取guide、claims及PDF pageCount，不解析整篇Paper或私人字段；只读R2 pages.txt，校验完整连续物理页标及元数据一致，不重复下载/解析pages.jsonl。超长按证据页、前十页、其余页保留完整页块；输入与正文仍通过生成schema和Runtime校验。缺导读/证据/原文返回422，缺网关配置503。MCP papers_ask仍收集共享Runtime同能力，不另写质量规则。

这是性能修复方案，离线真流与校验通过不代表免费版10ms CPU达标。旧方案真实3000输出token的Cloudflare trace CPU1861ms失败；新方案仍需根部署/trace真实复测。

## 计算平面事件

上传或失败重试发送 papers-ingest `{uploadId}`，修订发送 papers-revise `{id,instructions}`，公开状态或研究空间变化发送 papers-changed `{id}`。GitHub 接受 dispatch 不等于工作流消费已完成；消费者由 T31/编排实现。失败上传保留原 ID、文件和 paperId。

公开详情与三类公开派生索引均按当前数据库 visibility 裁剪，旧派生文件不能使撤销公开的论文继续可见。详情 relations 同样过滤私有目标；私有完整文档保持原样。公开图中私有论文贡献的孤立概念与关联不会保留。
