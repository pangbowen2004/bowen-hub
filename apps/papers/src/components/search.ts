import MiniSearch from "minisearch";
export interface PaperSearchDocument {
  id: string;
  title: string;
  authors: string;
  oneSentence: string;
  concepts: string;
  spaces: string;
}
/** Browser-local public index; Chinese words and English words share Unicode-aware tokenization. */
export function paperSearch(documents: PaperSearchDocument[]) {
  const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
  const index = new MiniSearch<PaperSearchDocument>({
    fields: ["title", "authors", "oneSentence", "concepts", "spaces"],
    storeFields: ["id"],
    tokenize: (text) =>
      [...segmenter.segment(text)].filter((part) => part.isWordLike).map((part) => part.segment),
    searchOptions: { prefix: true, combineWith: "AND" },
  });
  index.addAll(documents);
  return (query: string) =>
    query.trim()
      ? new Set(index.search(query.trim()).map((result) => String(result.id)))
      : new Set(documents.map((document) => document.id));
}
