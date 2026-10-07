export type ReadingTopic = {
  id: string;
  label: string;
  description?: string;
  parentId: string | null;
};
export type ReadingTaxonomy = {
  topics: ReadingTopic[];
  assignments: {
    paperId: string;
    topicId: string;
    methodTags: string[];
    reason?: string;
  }[];
};

/** 阅读目录和原始研究空间分别保留；主题归属不作为概念连线证据。 */
export function topicPath(topics: ReadingTopic[], id: string): ReadingTopic[] {
  const path: ReadingTopic[] = [];
  const visited = new Set<string>();
  let topic = topics.find((item) => item.id === id);
  while (topic && !visited.has(topic.id)) {
    visited.add(topic.id);
    path.unshift(topic);
    topic = topics.find((item) => item.id === topic?.parentId);
  }
  return path;
}

export function topicContains(topics: ReadingTopic[], topicId: string, selected: string) {
  return selected === "all" || topicPath(topics, topicId).some((topic) => topic.id === selected);
}

export function visibleTaxonomy(taxonomy: ReadingTaxonomy, paperIds: string[]): ReadingTaxonomy {
  const ids = new Set(paperIds);
  const assignments = taxonomy.assignments.filter((item) => ids.has(item.paperId));
  const assigned = new Set(assignments.map((item) => item.paperId));
  const missing = paperIds.filter((id) => !assigned.has(id));
  const used = new Set(
    assignments.flatMap((item) =>
      topicPath(taxonomy.topics, item.topicId).map((topic) => topic.id),
    ),
  );
  const topics = taxonomy.topics.filter((topic) => used.has(topic.id));
  if (missing.length) {
    topics.push({ id: "unclassified", label: "待归类", parentId: null });
    assignments.push(
      ...missing.map((paperId) => ({ paperId, topicId: "unclassified", methodTags: [] })),
    );
  }
  return { topics, assignments };
}
