# AI 生成 registry 的原子发布

T31 第三次 CI `36984807540`、head `97746ab` 静态检查报
`TS2305: generated/registry 无 registryData 导出`。保留原始失败日志
`/tmp/bowen-T31-ci-36984807540-failed.log`；此前本地通过不能否认该失败。

## 复现与实现

实际执行 `packages/ai/scripts/build.ts`：8 个并发写者各构建 3 次，另一个真实
`readFile` 读者持续读取生成文件。修前 24 次构建、1217 次读取发现 35 次不完整
文件，首次为 0 字节，TypeScript AST 中无 `registryData` 导出。证据：
`/tmp/bowen-ai-registry-concurrency-before.log`。这证明原直接 `writeFile` 的截断
窗口真实存在，与 CI 错误一致；没有声称恢复到 CI 当时的那一次读取。

生成源只更换发布方式：同目录 UUID 临时文件，以 `wx` 独占创建，完整写入并关闭
后 `rename` 替换目标。失败时尝试关闭、删除临时文件，再抛出原始错误；清理错误
不遮住写入或发布错误。没有改生成内容、能力、提示、评测、预算、tsconfig 或并发
构建配置。Node 原生 `.ts` helper 用 URL 加载，保留 `typeof import` 静态签名和
helper 本身的项目类型检查。

同一实际构建探针修后 24 次构建、1111 次读取，不完整次数 0，AST 正常导出，
无语法错误：`/tmp/bowen-ai-registry-concurrency-after.log`。修前与修后生成文件
均为 333217 字节，SHA-256：
`cafda47a214b34ec1607d8370950cbf65d9365e25bedd1a11bf15853449bd6eb`。

## 离线验证

新增真实临时目录回归：8 写者反复发布两种不同大模块，持续真实读取只能看到完整
旧版或新版，并通过 Node 模块加载验证导出；另用目标目录造成真实发布失败，验证
原错误、目录内容和临时文件清理。没有 mock 文件系统。旧直接写实现确实失败，
修后 2 项通过。日志：`/tmp/bowen-ai-registry-atomic-test-before.log`、
`/tmp/bowen-ai-registry-atomic-test-after.log`。

按顺序执行 setup、gen、check：最终均退出 0；检查日志
`/tmp/bowen-ai-registry-atomic-check-final.log`。完整离线测试退出 0：TS 826 项，
Python 672 项通过、1 项既定真实公开 PDF 联网验收跳过，耗时 184.20 秒；日志
`/tmp/bowen-ai-registry-atomic-test-full.log`。

再执行 `turbo run build typecheck --force --filter=@bowen-hub/ai
--filter=@bowen-hub/api`，3 个任务全部重新运行、0 缓存，AI build 和 AI typecheck
中的 build 同时执行，后续 API 类型检查通过。伴随真实读取 3234 次，未见不完整
文件；日志 `/tmp/bowen-ai-registry-atomic-cold-build.log`。既有 build 无 dist 输出
的 Turbo 警告保留，没有改配置隐藏它。没有执行真实模型、远端 API、E2E、
fuzz 或提交；独立审查和新 PR 的真实 CI 仍由根任务验收。

## 并行全仓负载下的测试期限

根任务同时运行两个分支的全仓测试时，T31 集成树该并发文件回归在 5617ms
触发 Vitest 默认 5000ms 超时，日志 `/tmp/bowen-T31-atomic-integrated-test.log`
保留；报错是测试期限，没有出现字节完整性断言失败。此案例验证原子发布完整性，
不验证 5 秒性能 SLA。因此只为该案例显式设置 15000ms 测试期限，仍保留
8 写者 × 6 轮、全部大文件 payload、真实读取、模块加载与清理断言。不改变全局
测试期限、生产逻辑或业务／模型 deadline。此次定向两项测试通过（254ms），全
检查退出 0（6.41 秒）；日志 `/tmp/bowen-ai-registry-atomic-timeout-test.log`、
`/tmp/bowen-ai-registry-atomic-timeout-check.log`。没有重跑 setup/gen 或其他 CI；
该增量仍须独立审查及 PR 新 head 的实际 CI 验收。
