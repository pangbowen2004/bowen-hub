# 随机契约测试生成修复

T23 CI 36968320733 和同 seed 本地重跑在 MarketDayWrite 正向数据生成阶段遇到 filter_too_much；生成失败发生在 HTTP 调用前。固定 seed 为181429371103572170478833750935110002696。独立诊断原正向策略仅2有效/50拒绝，原负向20/20成功，栈表明递归任意 JSON 附加属性触发 Hypothesis 最大深度；并非业务响应失败。

使用 Schemathesis 4.28.0 官方 before_generate_case hook，仅为该 PUT 接口增加由仓库真实样例组成的正向辅助分支。st.one_of 保留原完整随机策略及其负向 case/meta；日期与样例正文匹配，辅助分支通过官方 as_strategy 构造元信息。其他操作返回原同一策略对象。业务契约、全部响应检查、健康检查、20 examples、seed 均不变。

5项独立回归通过，校验原随机/负向实际生成、case/meta identity、非目标操作、日期一致，以及正式 schema 仍拒绝4行窗口。该共享树的63个已实现接口同 seed 全部通过，1108个 case；尚未实现的18个接口按原探测返回501。T23完整实现树的79接口仍需合并共享修复后重验，不能拿63接口代替。根全仓check通过、完整test另记 CI；独立审查无P1/P2。

同批准备后续 MCP 所需官方 server/client2.2.0、Inspector2.9.0锁定依赖，控制台ops可选mock模块和限定flat路由sharedEdit；没有开始T41业务实现或越过波次依赖。
