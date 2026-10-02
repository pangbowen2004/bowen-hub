# 可选逐例评测输出与CI artifact

T31 第二轮真实 CI 36973426114 的作者评测通过、审核未通过（schema_valid=0.9、labels_match=0.8、must_include=0.9）：null_is_zero 能力失败，openmeva_generator_confusion 结构修复仍不合格。此前 CI 与每周 artifact 只保留汇总，无法恢复首轮模型输出；不得据汇总猜测 JSON 错误或修改用例/阈值凑绿。旧失败记录保留。

新增可选 `hub evals run --case-report <path>`，按能力分组保存 Dataset 已评分的 case ID、raw_output、schema_valid、ok、固定安全 reason、确定性 check_reports、原 scores 与 AiCall。评分器异常保存安全类型/阶段，保留原异常失败路径，不制造缺失评分；task 失败也保留安全记录，没有 Result 时 schema_valid=null、scores 为空、call=null，不假造评分或结构状态。默认不创建文件。文件权限为 0600，已有目标文件也在写入前收紧权限。多能力连续评测共用本次报告对象，后一个能力不覆盖前一个；每次 CLI 运行不混入旧文件结果。

仅启用 case-report 时给 GatewayAdapter 注入可选 observer，不使用全局猴子补丁。在 Agent.iter 的 CallToolsNode 执行校验前收取 ModelResponse 白名单：TextPart.content、ToolCallPart.tool_name/args、finish_reason、三项 token 用量，以及输出模型名、native/tool 模式、repair 标志。首轮与修复轮都与原 capability/case ID 关联，judge 也关联当前 case。结构错误仅取异常类型及 validation loc/type，不保存消息、body 或堆栈。默认 observer=None，不输出日志，不增调用、不改超时与重试。观察收集只在内存追加；评分结束后落盘。

报告不会序列化 Dataset/Case 完整对象、inputs、prompt、图片、HTTP headers、凭据、provider_details 或异常正文。模型输出本身是受限私有 artifact，不输出到工作流日志，不发布到公开站。它仍可能是论文回答等业务内容，使用现有私有仓库的 Actions artifact，保留7天。

CI 原评测命令仅追加 `--case-report ../eval-cases.json`，随后 `always() && steps.changes.outputs.ai == 'true'` 上传已有固定 actions/upload-artifact@v7；每周任务同样追加 weekly-eval-cases.json，与现有汇总一起在 always 步骤上传、retention-days=7。AI 变化判定、所有评测步骤、生产 API 记账、原返回值、阈值、预算、模型、固定用例及任何 skip 规则未变。

离线新增回归覆盖：失败评分及失败CLI退出仍保留、两能力分组、旧0644目标收紧到0600、嵌套私人输入/headers/图片不落盘、默认不创建报告；实际 PydanticAI FunctionModel 的原生截断JSON首轮与修复轮响应、finish_reason/usage 保存，修复成功仍 schema_valid=0，不合格仍失败，调用数与用量不变；judge 结构错误保留原 ValueError 与缺失评分，并归属原 case；未知评审异常正文不泄漏；实际 TestModel 工具输出非法 args 也在校验前保存；task 异常仅安全记录、不伪造结构与评分；每周经真实 evaluator 接线但 HTTP/邮件离线 mock。已定向72 passed（21.70秒），不是模型质量证据。安全 stash -u → fetch/ff main `a92885d` → pop 后，顺序 gen/check/test 最终均退出0；strict pyright零错误/警告，完整 TypeScript 824 项、Python 671项通过，1项既定联网PDF跳过，229.24秒；新增9项case-report回归全部通过。完整日志 `/tmp/bowen-eval-case-artifacts-setup.log`、`/tmp/bowen-eval-case-artifacts-gen-final.log`、`/tmp/bowen-eval-case-artifacts-check-final.log`、`/tmp/bowen-eval-case-artifacts-test-final.log`，初轮定向日志 `/tmp/bowen-eval-case-artifacts-targeted.log`。两工作流YAML合法且artifact参数核对通过，git diffcheck0；只更改共享hub-ai与测试、两工作流及本报告。代码已冻结，未读.env、未调用真实模型/API/SMTP，未提交。根与独立审查者随后审查及正式 PR CI，不能提前宣称新 CI artifact 已验收。

## 独立审查发现的CI相对路径修正

独立审查发现 tasks.evals 的真实工作目录是 `<root>/py`，原CI传入 eval-cases.json 实际落在 py/，根目录artifact会忽略它。本次最小改为 `--case-report ../eval-cases.json`，与根目录上传目标一致；weekly通过 mise exec 在根目录执行，保持原路径。新增回归读取真实 mise.toml 和工作流计算任务cwd/CLI参数/artifact目标，再从该cwd实际调用离线CLI并核对真实报告文件及0600；不是仅匹配提示字符串。修前该回归确实失败（py/eval-cases.json≠根eval-cases.json），日志 `/tmp/bowen-eval-case-artifacts-path-before.log`。修后完整 `mise run check` 退出0，strict pyright零错误/警告；报告专测10 passed（2.26秒），含原9项及新实际CLI路径回归。日志 `/tmp/bowen-eval-case-artifacts-path-check.log`、`/tmp/bowen-eval-case-artifacts-path-after.log`，git diffcheck0。本次仅CI参数、新路径测试与本记录增量，未重跑无关全量；原TS824/Python671+1skip全量通过证据保留。再次冻结交独立增量复审。

独立审查发现并修复CI cwd相对路径P2后，增量独审通过，无剩余P1/P2；独立报告专测10项通过2.13秒 `/tmp/bowen-eval-case-artifacts-independent-path-tests.log`。根复核源及真实workflow路径回归，既有模型/评分/预算/阈值未变。正式PR CI与实际artifact下载验证尚待执行，不将离线成功称为云端artifact已验收。
