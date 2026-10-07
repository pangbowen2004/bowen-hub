import {
  type ReadingTaxonomy,
  topicContains,
  topicPath,
  visibleTaxonomy,
} from "@bowen-hub/ui/react/Universe3D";
import source from "../../../../config/paper_topics.json";

export const readingTaxonomy: ReadingTaxonomy = source;
export { topicContains, topicPath };
export function getReadingTaxonomy(paperIds: string[]) {
  return visibleTaxonomy(readingTaxonomy, paperIds);
}
