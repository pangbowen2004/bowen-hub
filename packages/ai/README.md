# TypeScript AI 运行时

`pnpm --filter @bowen-hub/ai build` 将清单、提示词、LLM配置、规则词表及JSON Schema编入 `src/generated/registry.ts`（忽略生成结果，提交生成源）；Worker执行不读文件。连续构建逐字一致，契约 Zod 仍来自 `@bowen-hub/contracts/zod`。

构造 `new Runtime(createGatewayAdapter(registry.llm, env), { record })`。record接收生成的AiCall，由API业务层通过生成客户端/服务端写入；调用方必须提供持久化回调。env只传进程/Worker环境变量，禁止读取.env。run返回内部Result，output可用性由status区分shadow/draft/ready/failed；L0的output始终null，L1只作草稿。generatedBy由运行时覆盖，不信任模型出处。

流式 `runtime.stream('papers.qa', input, emit, {totalPages})` 直接发送Markdown块，返回最终PaperQaOutput及校验报告。原文页数来自PDF元数据，缺totalPages明确失败；越界`[论文 p.X]`仍保留在已发送回答里，最终pages排除它。首块之前传输失败可退避1s/2s，发送内容后禁止重发。适配器消费SDK的fullStream，error/abort不能被只取文本的过滤器漏掉。

图片输入pageImages只渲染页码JSON；`images`必须逐页提供实际Uint8Array或URL，缺一页即失败。通用校验由CheckRegistry提供，领域包自行register，未注册paper_draft不能假通过。供应商strict schema仅为传输适配，业务结构校验、字符/引用检查仍以生成契约为准。
