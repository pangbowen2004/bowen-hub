# T06 基础设施入口

只从环境变量读取凭据，不读取环境文件。执行者为根编排者；用户尚未授权的密钥不得导出。以下命令均从仓库根执行。新增工具沿用仓库已锁定的 Wrangler 4.145.0、yaml 2.9.1，不改变共享冷却期。

## 资源与部署

1. 根注入已授权的 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`，运行 `mise exec -- pnpm --filter @bowen-hub/infra bootstrap`。D1完整分页查询；R2和控制台精确名称查询，仅404创建。已有AI Gateway只验证。脚本不创建、修改两个现有公开Pages项目，不购买服务。非敏感资源ID写入cloudflare.json和API配置。
2. `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false mise run db:migrate:remote`，再 `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false mise exec -- pnpm --filter @bowen-hub/api exec wrangler deploy`。保持APP_MODE=production。
3. 控制台正式构建：`VITE_USE_MOCKS=0 mise exec -- pnpm --filter @bowen-hub/console build`；`mise exec -- pnpm --filter @bowen-hub/infra deploy-pages console production`。模拟版改为VITE_USE_MOCKS=1重新构建，再deploy-pages console preview。
4. 公开站分别 `DATA_SOURCE=fixtures mise exec -- pnpm --filter @bowen-hub/markets build`、papers同理；`SITES_LIVE=false mise exec -- pnpm --filter @bowen-hub/infra deploy-pages markets preview`、papers同理。发布器在站点目录调用锁定Wrangler，编入console/functions，检查远端生产分支避免preview覆盖生产。生产公开站必须SITES_LIVE=true，仍由用户G3授权后根设置。

四个工作流始终检出main。公开站push默认样例预览；数据dispatch读取API并由SITES_LIVE选择目标；手动输入data_source/target。API尚无数据时手动选fixtures/preview；真实API错误明确失败，不掩盖成样例成功。论文API发布先运行hub papers derive，实际派生功能由T30接入。部署并发取消旧运行。

## 密钥与验收

用户明确授权后，根从本机注入获准的Worker密钥，逐项显式传名称，例如 `mise exec -- pnpm --filter @bowen-hub/infra configure-worker OPENAI_API_KEY`。只允许OPENAI_API_KEY、HUB_SERVICE_TOKEN、BETTER_AUTH_SECRET、GH_AUTOMATION_TOKEN；不生成或设置HUB_BOOTSTRAP_TOKEN，不支持整包导出环境。GitHub密钥由根按用户授权逐项设置，不上传环境文件。

`mise exec -- pnpm --filter @bowen-hub/infra check-secrets`只输出缺少名称，检查T06配置、Worker普通变量和SITES_LIVE；后续计算任务缺项单独列出。HUB_BOOTSTRAP_TOKEN留G2，注册后删除不视为缺项。

根注入HUB_API_URL后运行 `mise exec -- pnpm --filter @bowen-hub/infra exec node verify.ts` 验证API健康、正式控制台代理及三个预览HTTP200；健康正文必须status=ok。浏览器样例效果仍需打开预览检查。

代理原样转交/v1、/auth、/mcp、/.well-known请求和响应，不缓冲PDF/PNG或SSE，Cookie保持同源。当前API /api/auth为T02占位，根已裁定T40统一到/auth；T06不改鉴权业务。
