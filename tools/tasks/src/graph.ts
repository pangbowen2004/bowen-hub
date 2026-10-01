// 读取并校验 tasks/graph.yaml（任务图）。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export type Task = {
  id: string;
  title: string;
  wave: number;
  dependsOn: string[];
  difficulty: string;
  owns: string[];
  scaffolds: string[];
  sharedEdits: string[];
};

export const GRAPH_PATH = "tasks/graph.yaml";

export function loadGraph(root: string): Task[] {
  return parseGraph(readFileSync(join(root, GRAPH_PATH), "utf8"));
}

export function parseGraph(text: string): Task[] {
  const doc: unknown = parse(text);
  if (!isRecord(doc) || !Array.isArray(doc.tasks)) {
    throw new Error(`${GRAPH_PATH} 里没有 tasks 列表`);
  }
  const tasks = doc.tasks.map((raw: unknown, index: number) => toTask(raw, index));
  const ids = new Set<string>();
  for (const task of tasks) {
    if (ids.has(task.id)) throw new Error(`${GRAPH_PATH}：任务号 ${task.id} 重复`);
    ids.add(task.id);
  }
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (!ids.has(dep)) throw new Error(`${GRAPH_PATH}：${task.id} 依赖的 ${dep} 不存在`);
    }
  }
  return tasks;
}

function toTask(raw: unknown, index: number): Task {
  if (!isRecord(raw)) throw new Error(`${GRAPH_PATH}：第 ${index + 1} 个任务不是对象`);
  const id = raw.id;
  if (typeof id !== "string" || !/^T\d+$/.test(id)) {
    throw new Error(`${GRAPH_PATH}：第 ${index + 1} 个任务的 id 不是 Txx 形式`);
  }
  return {
    id,
    title: typeof raw.title === "string" ? raw.title : "",
    wave: typeof raw.wave === "number" ? raw.wave : 0,
    dependsOn: stringList(raw.dependsOn, id, "dependsOn"),
    difficulty: typeof raw.difficulty === "string" ? raw.difficulty : "",
    owns: stringList(raw.owns, id, "owns"),
    scaffolds: stringList(raw.scaffolds, id, "scaffolds"),
    sharedEdits: stringList(raw.sharedEdits, id, "sharedEdits"),
  };
}

function stringList(value: unknown, id: string, field: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${GRAPH_PATH}：${id} 的 ${field} 必须是字符串列表`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
