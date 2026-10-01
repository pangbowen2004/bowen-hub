# Python AI 能力层

Registry从仓库根加载并校验清单，生成Pydantic模型来自hub_contracts。Runtime经GatewayAdapter/Pydantic AI调用配置中的Cloudflare网关，优先原生JSON Schema，不支持才用工具输出。OpenAI SDK自身重试关闭，运行时独立控制传输2次（1s/2s）与结构修复1次。schema_valid保留修复前状态，评测不会把修复后的输出当首次通过。

调用方通过record异步回调持久化生成AiCall（可调用hub-core ApiClient.write_ai_calls）；正常、失败、结构修复和主观评审的用量都计费，cachedInput按配置单价。无回调适用于显式离线/PR评测，不会偷偷写API。generatedBy由运行时覆盖；Result的output只有可用结果，status区别shadow/draft/ready/failed，L0只记录。

`total_pages`必须由PDF元数据提供，启用pages_in_range但缺它则明确失败；不从部分pages推测总页数。`images`按页码提供bytes（PNG）或URL，pageImages只在文本渲染两空格JSON页码。领域包以CheckRegistry.register接入paper_draft；缺校验失败。

评测命令保留T03 entry point。`hub evals run --changed`只选实际能力变化，框架变化报告0；指定能力缺用例失败。`--offline`要求显式responses.yaml；`--weekly --write-api`写EvalResult，PR只出报告。`hub providers check-models`真实读取网关模型列表，仅输出档位、模型和安全结果。真实密钥验收由编排者注入，本包不读.env。
