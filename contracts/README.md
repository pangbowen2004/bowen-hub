# contracts —— 契约（唯一事实源）

全部接口和数据模型只在这里用 TypeSpec 定义一次，`mise run gen` 生成两种语言的类型、校验、客户端和模拟（`docs/08`）。
本文件是写契约、放样例、跑生成和测试的约定，T01 的乙丙丁三段和以后的 `[C]` PR 都照此做。

## 1. 目录与分工

| 路径 | 内容 | 谁写 |
|---|---|---|
| `tspconfig.yaml` | 编译配置（OpenAPI 3.1 + JSON Schema，警告也算失败） | 甲 |
| `main.tsp` | 入口：服务元信息、版本 `1.0.0`、导入其余文件 | 甲 |
| `http.tsp` | HTTP 管道（命名空间 `HubHttp`）：安全方案 `SessionCookie` / `ServiceToken`、`ErrorResponse`、`CursorParams` | 甲 |
| `lib/decorators.js` | 四个自定义装饰器的实现 | 甲 |
| `common.tsp` | 装饰器声明、`Date` / `DateTime`、`Problem`、`CursorPage<T>`、`GeneratedBy`、全体约定（文件开头的注释） | 甲 |
| `platform.tsp`、`watchlist.tsp` | 平台与自选股的模型 | 甲 |
| `news.tsp` | 新闻模型 | 乙 |
| `markets.tsp` | 市场模型 | 丙 |
| `papers.tsp` | 论文模型 | 丁 |
| `capabilities.tsp` | 只导入下面两个文件 | 甲 |
| `capabilities/news.tsp` / `capabilities/papers.tsp` | news.\* / papers.\* 能力的输入输出模型 | 乙 / 丁 |
| `routes/health.tsp` | `GET /v1/health` | 甲 |
| `routes/{public,private,internal}.tsp` | 每类接口的前缀与鉴权，只导入各领域的子文件 | 甲 |
| `routes/public/{markets,papers}.tsp` | 公开接口 | 丙 / 丁 |
| `routes/private/{news,watchlist,markets,papers,platform}.tsp` | 私有接口 | 乙、甲、丙、丁、甲 |
| `routes/internal/{news,watchlist,markets,papers,platform}.tsp` | 内部接口 | 乙、甲、丙、丁、甲 |
| `test/annotations/` | 装饰器的测试夹具（不是正式契约） | 甲 |
| `generated/` | 生成物：`openapi.yaml`、`schemas/<模型名>.json`（勿手改） | `mise run gen` |

乙丙丁只改上表里属于自己的文件，外加 `fixtures/samples/<领域>/**`、`packages/contracts/src/mocks/samples/<领域>.ts` 和第 5 节说的领域测试文件。

## 2. 写模型

- **所有具名模型、联合类型都写在 `namespace BowenHub;` 里**（每个模型文件开头一行 `namespace BowenHub;`）。`routes/` 下的文件**只写操作**；在那里声明具名模型，生成时会报“components.schemas 和 JSON Schema 对不上”。
- **模型名全局唯一**、PascalCase：它同时是 JSON Schema 文件名、TS 类型名、Python 类名、样例文件名的前缀。容易撞名的加领域前缀（如 `NewsSourceHealth`）。
- **字段名 camelCase**；不要用 Python 关键字（`from`、`class`、`in`、`is`、`global`、`lambda`、`pass`……）：生成会因为出现字段别名而失败，换个名字（如 `fromDate`）。TypeSpec 的关键字做字段名要加反引号，如 `` `model`: string ``。
- **类型**：日期 `Date`（YYYY-MM-DD），时间 `DateTime`（ISO 8601，必须带时区）；比例和收益率是 0–1 的 `float64`；金额字段名带币种（`amountCny`、`valueUsd`）；整数用 `int32`（不要用 `int64`：JSON Schema 会把它变成字符串）。
- **枚举**用字符串联合：复用的写成 `union WatchItemKind { "stock", "etf" }`，只用一次的直接写 `"a" | "b"`。不用 TypeSpec 的 `enum`。
- **缺失值**：暂无 / 没有的值用必填 + `| null`；只有文档写明“可选”的字段（老数据可能没有）用 `?`。
- **AI 生成的对象**带 `generatedBy: GeneratedBy`。
- **继承**可以用 `model B extends A`（JSON Schema 里是 `allOf`，Pydantic 里是子类），也可以用展开 `...A`。
- 能被样例、Python 发送或 TS 引用的东西都要是具名模型：分页返回 `model XxxPage is CursorPage<Xxx>;`；计算任务要发的请求体也写成具名模型，如 `model MarketDayWrite { day: MarketDay; summary: MarketDaySummary }`（否则 Pydantic 里没有这个类）。

### 四个装饰器

```tsp
@task("T14")                       // 操作上：负责实现的任务号 → OpenAPI 的 x-task。每个操作都要有
@maxChars(80) whatHappened: string;        // 字数上限 → x-max-chars
@maxChars(60) points: string[];            // 用在数组上 = 每个元素的上限
@sourceQuote quote: string;                // 原文片段 → x-source-quote（quotes_in_sources 校验）
@image pageImages: int32[];                // 图片字段 → x-image（运行时作为图片附件发送）
```

- 后三个同时出现在 OpenAPI 和 `generated/schemas/<模型名>.json`（JSON Schema 里没有操作，所以 `x-task` 只在 OpenAPI）。
- 生成的 Zod 和 Pydantic **都不**据此校验（`tools/gen/test/annotations.test.ts` 有证明）；AI 运行时（T04）从 `contracts/generated/schemas/<模型名>.json` 读取这些标注。
- 能力输出里的文字字段**不要**用 `@maxLength` / `@maxItems`：那会被生成的校验器强制，`length_within` 就没法截断了。随 mode 变化的上限标较宽的一档（`docs/10` 第 5 节）。字段和上限以对应提示词为准。

## 3. 写接口

每个领域文件开头已经写好命名空间，例如 `namespace BowenHub.Routes.Private.PrivateNews;`，前缀和默认鉴权由 `routes/<类>.tsp` 统一给，不要再写 `/v1` 和 `@useAuth`（私有写接口除外，见下）。

```tsp
/** 期次列表 */
@task("T14")
@get
@route("/news/editions")
op listEditions(@query kind?: EditionKind, ...HubHttp.CursorParams): EditionPage | HubHttp.ErrorResponse;
```

- **返回类型一律带 `| HubHttp.ErrorResponse`**（OpenAPI 里是 default 响应，`application/problem+json`）。
- **私有写接口**（PUT / POST / PATCH / DELETE）必须另标 `@useAuth(HubHttp.SessionCookie)`：私有前缀默认“会话或服务令牌”，而服务令牌只能读私有 GET（`docs/08` 第 5 节）。公开、内部接口不用标。
- **分页**：参数展开 `...HubHttp.CursorParams`（`cursor`、`limit` 1–100），返回 `XxxPage`。`docs/08` 第 5.1 节没列 `cursor` 的列表接口直接返回数组 `Xxx[]`。
- **写入**：内部写入用 `PUT` + 自然键路径，没有正文返回 `NoContentResponse`（204）；批量写入 `POST …/batch`，请求体是数组 `Xxx[]`，返回 `NoContentResponse`。删除返回 `NoContentResponse`。
- **参数**直接写在操作签名里（`@path`、`@query`、`@header`）；不要声明带 `@query` 的具名参数模型（同样会让生成报错）。路径参数取值固定的写联合，如 `@path name: "source.pdf" | "pages.jsonl" | "pages.txt"`。
- **非 JSON 的正文**写成签名里的匿名模型：

```tsp
op getHtml(@path id: string): { @header contentType: "text/html"; @body body: string } | HubHttp.ErrorResponse;
op putHtml(@path id: string, @header contentType: "text/html", @body body: string): NoContentResponse | HubHttp.ErrorResponse;
op getPdf(@path id: string): { @header contentType: "application/pdf"; @body body: bytes } | HubHttp.ErrorResponse;
op putPage(@path id: string, @path n: int32, @header contentType: "image/png", @body body: bytes): NoContentResponse | HubHttp.ErrorResponse;
op ask(@path id: string, @body body: PaperAskRequest): { @header contentType: "text/event-stream"; @body body: string } | HubHttp.ErrorResponse;
```

- **操作名**：生成的函数名 = 命名空间 + 操作名。`PrivateWatchlist` 里的 `list` → `privateWatchlistList()`、`usePrivateWatchlistList()`、`getPrivateWatchlistListMockHandler()`、Zod 的 `PrivateWatchlistListResponse`。同一命名空间里操作名不能重复。
- **只写 `docs/08` 第 5.1 节列出的接口**，不多不少。

## 4. 样例（`fixtures/samples/`）

- 放在 `fixtures/samples/<领域>/<模型名>.<变体>.json`，变体用小写和连字符（可以含点，如 `Paper.arxiv-2505.07078.json`）。文件内容是一个对象，或对象数组。以后的任务放 `fixtures/samples/<任务ID>/`。
- 测试会自动发现全部样例（`prompt-render/` 除外），按文件名里的模型名找 `contracts/generated/schemas/<模型名>.json` 校验，Python 再用 Pydantic 解析一遍、并检查有没有契约里没有的字段（拼错的字段名会被抓出来）。找不到模型的样例让测试失败。
- **每个 GET 接口返回的模型至少一份样例**，并在 `packages/contracts/src/mocks/samples/<领域>.ts` 登记“接口 ↔ 样例”，照 `samples/platform.ts` 写：

```ts
import editions from "../../../../../fixtures/samples/news/Edition.morning-2026-09-30.json" with { type: "json" };
import { getPrivateNewsGetEditionMockHandler } from "../../generated/msw";
import { type SampleRoute, sampleRoute } from "../registry";

export const newsSamples: SampleRoute[] = [
  sampleRoute(getPrivateNewsGetEditionMockHandler, [editions], {
    shape: "one", // one：返回一份；list：返回数组；page：包成 { items, nextCursor: null }
    pick: (sample, params) => sample.id === params.id, // 按路径参数挑，挑不中返回第一份
  }),
];
```

- 登记的形状会被测试检查：每个样例处理器的返回都要符合该接口在 OpenAPI 里的响应 schema。只能登记 GET 接口；HTML、PDF、PNG 这类接口不登记，回落到 Orval 生成的处理器。
- 样例优先由 `fixtures/` 里的老数据转换（老数据只读）；手写或推算的值在 `fixtures/samples/<领域>/README.md` 里注明。

## 5. 测试

| 位置 | 内容 |
|---|---|
| `packages/contracts/test/samples.test.ts` | 全部样例通过 JSON Schema（TS） |
| `packages/contracts/test/operations.test.ts` | 每个接口有 `x-task` 且任务号在 `tasks/graph.yaml`；路径以 `/v1/` 开头；鉴权与接口类别一致；错误响应是 problem+json |
| `packages/contracts/test/mocks.test.ts` | 样例处理器的返回符合响应 schema；分页、挑样例、回落 |
| `packages/contracts/test/prompt-render.test.ts` | 渲染向量的格式完整 |
| `py/packages/hub-contracts/tests/test_samples.py` | 全部样例通过 JSON Schema，并能用 Pydantic 解析，没有多余字段（Python） |
| `tools/gen/test/` | 生成链本身，含装饰器整条链路 |

上面这些是共用测试，乙丙丁不要改。**领域专属测试**放 `packages/contracts/test/domains/<领域>.test.ts`（vitest）或 `py/packages/hub-contracts/tests/domains/test_<领域>.py`（pytest），各领域只建自己的那一个文件。

## 6. 生成与命令

```bash
mise run gen               # 契约 → contracts/generated/、packages/contracts/src/generated/、py/packages/hub-contracts/src/hub_contracts/generated/
mise run contracts:check   # oasdiff：与 main（合并基点）上的 openapi.yaml 比，有破坏性变更就失败
mise run check             # 全部静态检查（含 tsc、路径所有权）
mise run test              # 全部测试（离线）
```

- `gen` 每次先清空三个生成目录再生成，排序稳定、不写时间戳，连续运行没有差异；每个生成文件第一行是“由 contracts 生成，勿手改”（JSON 用第一个键 `$comment`）。生成目录不许手改。
- 生成失败时看提示：常见的是具名模型写进了 `routes/`、字段名用了 Python 关键字、TypeSpec 有警告（警告也算失败）。
- 有 `services/api/scripts/gen-routes.*`（T02 写）时，`gen` 最后用 node 运行它（工作目录是仓库根），生成 `services/api/src/routes.gen.ts`。
- **领域分支（乙丙丁）不提交生成物**：本地随便跑 `gen` 验证，提交前还原，收尾统一生成：

```bash
git checkout -- contracts/generated packages/contracts/src/generated py/packages/hub-contracts/src/hub_contracts/generated
git clean -fdq -- contracts/generated packages/contracts/src/generated py/packages/hub-contracts/src/hub_contracts/generated
```

- 不加依赖；确实需要时先问编排者。

## 7. 用生成物

**TypeScript**（`@bowen-hub/contracts`，exports 直接指向源码）：

```ts
import type { WatchItem } from "@bowen-hub/contracts";                 // 类型（也可以从 /types 导入）
import { WatchItem as WatchItemSchema } from "@bowen-hub/contracts/zod"; // Zod：每个模型一个，外加每个接口的参数、请求体、响应
import { configureClient, privateWatchlistList } from "@bowen-hub/contracts/client";
import { usePrivateWatchlistList } from "@bowen-hub/contracts/hooks";   // TanStack Query v5
import { createHandlers } from "@bowen-hub/contracts/mocks";            // MSW：样例优先，没有样例的用随机数据
```

- 客户端函数直接返回响应正文，非 2xx 抛出 `Error`（带 `status` 和 `info`：problem+json 正文）。
- 基础地址：控制台同源，什么都不用配；公开站构建和 Node 脚本调用 `configureClient({ baseUrl: process.env.HUB_API_URL })`，没调用时自动读环境变量 `HUB_API_URL`。Node 的 fetch 不接受相对地址，测试里要配一个（如 `http://localhost`）。
- MSW 用 **2.x**（`packages/contracts` 锁定 2.15.0，`msw` 是 peer 依赖），用到 MSW 的包要装同一个大版本；TanStack Query 同理（5.x）。

**Python**（`hub-contracts`，模块 `hub_contracts`）：

```python
from hub_contracts import Run, WatchItem

run = Run(id="news-morning-2026-09-30-1287", job="news-morning", ...)
payload = run.model_dump(mode="json")   # 字段名就是 JSON 字段名（camelCase，没有别名）
```

- 时间字段是 `AwareDatetime`（必须带时区），日期是 `date`，字符串联合是 `Literal[...]`。
- 生成工具和测试依赖在 `py/packages/hub-contracts/pyproject.toml` 的 `dev` 依赖组。

## 8. 改契约（T01 合并之后）

- 单独开 `[C] <改了什么>` 的小 PR，只改 `contracts/` 和生成物（`docs/11` 第 5.1 节）；其他人 rebase 后 `mise run gen`。
- 只做增量兼容的改动（加可选字段、加接口）；`mise run contracts:check` 会拦住破坏性改动，破坏性改动需要 ADR 和 Kevin 同意。
