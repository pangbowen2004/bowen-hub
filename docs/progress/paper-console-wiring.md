# 论文控制台公共接线

共享阅读组件新增可选 onPage 回调：控制台证据浮层用键盘可达按钮打开实际 PDF 物理页，公开站不传回调时仍只读且不会请求私人页。原有调用保持兼容。

控制台样例模式可选加载 mocks/papers/index.ts 的 paperHandlers，位于通用回放处理器前；模块尚不存在时为空。测试入口发现整个 features，避免后续论文测试漏跑。Vite 开发代理支持 HUB_LOCAL_API_URL，默认端口保持；供 T34 隔离真实 API 端口使用。默认样例项目忽略 papers/real.spec.ts，T34 将在自己的隔离配置中执行，未把忽略算作真实验收。

验证：UI29测试通过（新增实际物理页回调及公开站不产生按钮）；mise run check退出0，首次导入格式错误修正后通过。mise run e2e退出0：公开论文39、市场54、控制台85通过，包含既有虚拟WebAuthn真实鉴权。日志 /tmp/bowen-paper-console-wiring-{ui-test,final-check,e2e}.log。独立新闻工作者只读审查无P1/P2。
