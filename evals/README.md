# 评测集

每个 AI 能力一个目录，目录名就是能力 ID（`news.ticker_digest/`、`papers.qa/` ……）。评测方法、评分器和运行时机见 `docs/10` 第 7 节；阈值写在各能力的清单 `capabilities/<id>.yaml` 的 `evals.thresholds`。

## 目录内容

```text
evals/news.ticker_digest/
├── cases.yaml            # 用例（必需）
├── judge_faithful.md     # 评分标准：清单里用到 judge_faithful 评分器时才需要
└── judge_specific.md     # 每个 judge 评分器一个同名文件
```

## `cases.yaml`

```yaml
- id: nvda-no-direct-news
  tags: [edge]                  # fixture 录制数据 / feedback 来自 Kevin 的反馈 / edge 手写边界
  input:                        # 能力的输入，结构同 contracts/capabilities.tsp 里的输入模型
    mode: daily
    symbol: NVDA
    name: 英伟达
    changeText: "-3.4%"
    withSector: true
    sectorEtf: SMH
    articles: []
    filings: []
    earnings: null
  expect:                       # 可选
    mustInclude: ["同步"]        # must_include：输出里必须出现
    mustExclude: ["因为", "由于"]  # must_exclude：输出里不能出现（这里：没有消息时不能编原因）
    label: null                 # labels_match：分类类能力的正确标签
    pages: []                   # papers.qa：回答必须引用到的页码
```

## `judge_<名字>.md`

和提示词同样的格式（`## system` / `## user`），占位符有 `{{ input }}`、`{{ output }}`、`{{ expect }}`。要求评审模型输出 `{"score": 0 到 1 的小数, "reason": "一句话"}`。每个 judge 只评一个维度（例如 `judge_faithful` 只看“有没有超出原文”），评分标准写成可判断的条目。

## 命令

```bash
uv run hub evals run --capability news.ticker_digest     # 跑一个能力（可以写通配，如 'news.*'）
uv run hub evals run --changed                           # 只跑本分支改动影响到的能力（CI 用）
uv run hub evals run --capability news.brief --offline   # 用假模型跑通流程，不花钱
uv run hub evals compare --candidate openai/gpt-6-astra  # 现配置 vs 候选模型，输出对比表
uv run hub evals harvest                                 # 把控制台里标了“有错 / 没用”的条目转成用例草稿
```

## 规矩

- 每个能力起步至少 10 条用例；`news.us_rank`、`news.ticker_digest`、`papers.qa` 至少 20 条。
- 用例里的真实新闻和论文内容只用于评测，不外传；不放任何密钥或私人笔记。
- 改提示词、换模型、改档位的 PR 必须附评测结果（`docs/10` 第 6 节）。
