# AI Gateway 供应商前缀模型预算兼容修复

T32 隔离云端真实问答返回200流协议但无正文。临时诊断仅记录固定错误类别与参数名，网关连续3次HTTP400，param=max_tokens、code=unsupported_parameter；未展示请求、响应正文或密钥。失败证据 `/tmp/bowen-t32-safe-tail-status4.log`。

已安装官方AI SDK OpenAI3.0.110源码按裸modelId识别GPT>=5及o系列。兼容网关必须保留openai/前缀；原适配器因此发送max_tokens，供应商要求max_completion_tokens。现对带OpenAI前缀的GPT>=5/o推理系列显式使用SDK maxCompletionTokens，避免同时发送max_tokens。旧GPT4等非推理路径仍用max_tokens。模型、reasoning、输入预算、输出预算、重试与超时保持原配置。

4模型×结构生成和流输出直接调用实际SDK并回放HTTP响应，断言线上序列化model、唯一正确预算字段3000、reasoning、输出与实际用量。AI52测试通过，0.333秒；完整check含类型/架构/所有权/pyright退出0，6.54秒。日志 `/tmp/bowen-prefixed-gateway-wire-test.log`、`/tmp/bowen-prefixed-gateway-check.log`。独立审查与正式CI结论由根核定。隔离云端长输出CPU仍由T32记录，不将适配器回放冒充云端性能验收。
