# 编排：正式前端视觉更新

状态：实现与全部本机验收完成，等待根审查，尚未提交（2026-10-02）。工作区 bowen-hub-visual-refresh，分支 orchestrator/visual-refresh，起点 c79c696。

## 交付

依据 Kevin 认可的第二轮样稿与根修订的 docs/05，正式落地灰白纸面、墨黑正文、低饱和墨绿强调、中文宋体/英文 Bodoni/Didot 展示标题、系统正文、细线与留白。所有字体均使用本机字体栈，没有网络字体、新依赖或技术栈替换；红涨绿跌和蓝/琥珀/灰状态语义保留。

通用 Card 改为平面分组；Dialog/Sheet/菜单/Toast 保留独立表面和边框；按钮为胶囊，保留焦点与减少动效规则。公开站导航标记当前栏目。控制台桌面改为顶部主导航，保留全部七个领域/设置/运维入口；768px 导航换行，390px 继续四项底栏；主题系统/浅/深切换和持久化保持。

移除控制台标题、站名字标及 favicon 的旧可见品牌，使用现有中文产品名；不采用样稿的“序”。仓库、路由、部署项目名不改。市场首页只重新排列原 getDay 的摘要、成交额与上涨覆盖；论文扉页只取原公开 catalog 首篇真实书目；控制台今日只展示已有路由入口与样例连接状态。没有带入合成行情、美股行情产品、虚构新闻或阅读记录，没有实现后续领域业务。

## 验收（真实命令 → 结果）

命令均在本工作区执行；缓存/日志写入 /tmp，仅隔离本机权限，不改变预算。

| 命令 | 实际结果 |
|---|---|
| CI=true UV_CACHE_DIR=/tmp/visual-refresh-uv-cache mise run setup | 退出0，锁定依赖安装成功，无新增依赖/锁文件修改 |
| UV_CACHE_DIR=/tmp/visual-refresh-uv-cache mise run gen | 退出0，生成链成功；无生成物改动 |
| WRANGLER_LOG_PATH=/tmp/visual-refresh-wrangler UV_CACHE_DIR=/tmp/visual-refresh-uv-cache mise run check | 退出0，类型、Biome、ruff、pyright、架构检查通过；编排分支本地所有权检查按工具规则跳过，路径需根审查 |
| 同环境 mise run test | 退出0，TypeScript619、Python135实际通过；日志逐项求和，不使用旧分支计数 |
| 同环境 mise run e2e | 退出0；市场33、论文24、控制台48，共105；390/768/1440px全部页面无溢出、无浏览器错误、公开页无API请求；去Bowen、浅深主题实际背景色/持久化、全部桌面入口及手机更多回归通过 |
| mise exec -- pnpm --filter @bowen-hub/ui build-storybook | 退出0，Storybook build completed successfully |
| mise exec -- node /tmp/visual-refresh-capture.cjs | 退出0，本机静态服务逐一渲染35个故事，无页面错误；三应用三档截图无溢出；深色截图等待实际背景色生效 |
| WRANGLER_LOG_PATH=/tmp/visual-refresh-wrangler mise run lighthouse | 退出0，4 tasks successful（5m43s）；市场11 URL/33次、论文8 URL/24次，全部原预算断言通过；市场性能/可访问性最低100/100，论文最低100/91，两站脚本transferSize最大0B |
| git diff --check | 退出0 |

日志：/tmp/visual-refresh-{setup,gen,check,test,e2e,storybook,capture,lighthouse}.log。正式截图：/tmp/visual-refresh-{console,markets,papers}-{390,768,1440}.png，另三张1440-dark.png；临时构建/截图/性能报告不提交。

## 过程问题与限制

首轮 check 发现两个 Astro 首页 import 与下一语句缺空行，Biome 自动格式修复后完整复测通过。首次并行启动 E2E 与 Lighthouse 时，同一站点两个构建清理 dist，造成 prerender 模块丢失；改为串行执行，不修改构建逻辑。

子沙箱禁止 Chromium macOS Mach 端口（bootstrap_check_in Permission denied），浏览器缓存写权限不足时安装阶段也未完成。补缓存权限并最小启动验证取得自动审批后，浏览器命令在获授权的沙箱外运行成功；失败尝试未当作验收。主题切换测试最初使用立即读取 CSS，改为 Playwright 可重试的实际 CSS 断言，等待 React/浏览器样式稳定，三档真实通过。临时 Storybook 核验脚本最初把“有文本”当作渲染完成，纯 SVG 故事超时；改为真实渲染节点判定后35故事通过。

docs/05规格更新由根编排写入，工作者没有修改。未读取.env、密钥、旧项目代码或技能；未部署、未写git元数据、未推送/合并。公开业务与真实认证仍由后续任务接入，样例验收不等于线上数据验收。

## 根审查

根已审查三站核心实现、正式桌面与手机截图，并确认按用户认可的纸面方向实现。两项可访问性审查问题已修复并通过浏览器回归；无待用户决定的新增业务口径。等待PR CI后合并并更新预览。

## 接入 main 37a47fe 后复测

根代安全 merge origin/main 成功，HEAD37a47fe包含已合并T04；原视觉改动保留。`git diff c79c696 HEAD --name-only -- apps packages/ui` 输出为空，因此保留原E2E105、Storybook35及Lighthouse57次结果，不重复未变化的前端验收。

`CI=true UV_CACHE_DIR=/tmp/visual-refresh-uv-cache mise run setup`、同缓存及Wrangler日志重定向的 `mise run check`、`mise run test` 均退出0；13项类型任务通过。最新全仓实际TypeScript668、Python176通过；前表619/135是接入T04之前的真实基线，不能混为一轮。日志为/tmp/visual-refresh-main37-{setup,check,test}.log。新轮首次setup因工作区权限未延续无法清理node_modules而退出，重新获工作区写与网络权限后成功。

浮层复核：Card平面化不会使Dialog/Sheet/菜单/Toast透明，四类浮层专用规则在Card之后赋予背景、边框及24px内边距。手机四项底栏沿用T05功能，“更多”仍指向/ops；桌面七个主入口在768/1440均有浏览器断言。公开页390px的折叠菜单保持全部栏目链接。

## 审查修复：主题悬停与手机触控目标

根指出主题按钮悬停文字改为背景色、按钮自身却透明，确会失去对比度。现悬停同时设置 `background: var(--text)` 与 `color: var(--bg)`，浅深主题均使用纸面/墨色反转。手机底栏链接改为实际 inline-flex 触控元素，min-width/min-height 均44px，并居中，不把外层留白当作可点面积。

新增控制台浏览器回归：三档实际断言悬停背景与文字颜色，手机逐个读取四链接 boundingBox，宽高均≥44。`mise run check`退出0；控制台E2E首次直接调用包入口未指定VITE_USE_MOCKS，缺样例status使43项失败、8项通过；未作为通过结果。`VITE_USE_MOCKS=1 WRANGLER_LOG_PATH=/tmp/visual-refresh-wrangler mise exec -- pnpm --filter @bowen-hub/console e2e`重跑退出0，控制台51项通过（7.6s，390/768/1440px）。日志/tmp/visual-refresh-a11y-{check,e2e}.log。两公开站源码未变化，保留原E2E57项与Lighthouse57次通过结果；此次共计有效E2E108项，区分控制台重跑51与公开站原57。未提交/推送。
