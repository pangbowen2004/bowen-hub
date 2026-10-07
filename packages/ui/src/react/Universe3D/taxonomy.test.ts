import { expect, it } from "vitest";
import source from "../../../../../config/paper_topics.json";
import { topicContains, topicPath, visibleTaxonomy } from "./taxonomy";

it("88份档案有唯一小类，AI与金融大类汇总不重复", () => {
  const ids = source.assignments.map((item) => item.paperId);
  expect(new Set(ids).size).toBe(88);
  expect(ids.length).toBe(88);
  const counts = source.topics
    .filter((topic) => !topic.parentId)
    .map(
      (root) =>
        source.assignments.filter((item) => topicContains(source.topics, item.topicId, root.id))
          .length,
    );
  expect(counts).toEqual([74, 14]);
  for (const assignment of source.assignments) {
    const path = topicPath(source.topics, assignment.topicId);
    expect(path).toHaveLength(2);
    expect(path[0]?.parentId).toBeNull();
    expect(assignment.reason.length).toBeGreaterThan(0);
  }
});

it("剧本论文按主题查找，方法标签不把它改归通用Agent", () => {
  const book = source.assignments.find((item) => item.paperId === "acl-2025.acl-long.773")!;
  expect(topicPath(source.topics, book.topicId).map((topic) => topic.label)).toEqual([
    "AI 研究与应用",
    "剧本与互动叙事",
  ]);
  expect(book.methodTags).toContain("多智能体");
  expect(topicContains(source.topics, book.topicId, "agent-cooperation")).toBe(false);
});

it("新论文不会因目录尚未更新而消失，私有论文不进入公开目录", () => {
  const view = visibleTaxonomy(source, ["acl-2025.acl-long.773", "new-paper"]);
  expect(view.assignments.map((item) => item.paperId)).toEqual([
    "acl-2025.acl-long.773",
    "new-paper",
  ]);
  expect(view.topics.map((topic) => topic.id)).toEqual([
    "ai-research",
    "interactive-drama",
    "unclassified",
  ]);
  expect(view.assignments.find((item) => item.paperId === "new-paper")?.topicId).toBe(
    "unclassified",
  );
});
