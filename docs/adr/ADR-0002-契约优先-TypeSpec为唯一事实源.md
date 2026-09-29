# ADR-0002 契约优先：TypeSpec 为唯一事实源

状态：已采纳（2026-09-29）

## 背景
老系统的数据结构散落在 Python 字典和前端 JS 里，改一处坏一片。

## 决定
所有接口和数据文档用 TypeSpec 定义，生成 OpenAPI 3.1、JSON Schema，再生成 TS（类型、Zod、客户端、Query hooks、MSW 模拟）和 Pydantic 模型。生成物入库，CI 检查一致性与破坏性变更。

## 理由
TypeSpec 比手写 OpenAPI 简洁，适合人和 Agent 阅读；一次定义、两端生成，保证前后端、TS 与 Python 永远一致；模拟数据让前端不必等后端。

## 后果
改接口必须先改契约（`11` 第 5.1 节）；契约 PR 需要优先合并。
