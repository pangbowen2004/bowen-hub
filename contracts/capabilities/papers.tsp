// 论文能力契约：草稿复用持久化文档子结构；运行时在校验后盖章。
import "../common.tsp";
import "../papers.tsp";
namespace BowenHub;
model PaperDraftMeta extends PaperMeta {
  titleZh: string; authors: string[]; year: int32; venue: string; version: string;
  paperType: string; paperKind: PaperKind; studyDesign: string; sourceUrl: string;
  doi: string | null; arxivId: string | null; anthologyId: string | null;
}
model PaperDraftPrerequisite extends PaperPrerequisite { example: string; }
model PaperDraftSection extends PaperSection { role: string; keyQuestion: string; status: PaperSectionStatus; }
model PaperDraftFigure extends PaperFigure { explanation: string; }
model PaperDraftConcept extends PaperConcept { explanation: string; anchor: string; claimOrigin: PaperClaimOrigin; }
model PaperDraftCode extends PaperCode { url: string | null; note: string; checkedAt: Date | null; }
model PaperDraftGuide extends PaperGuide {
  oneSentence: string; readingGoal: string;
  /** 1800–3000 汉字是目标，不是硬上限；非典型论文允许更短。 */
  article: string; prerequisites: PaperDraftPrerequisite[];
  bottomLine: PaperBottomLine; limitations: string[];
}
model PaperDraftClaim extends PaperClaim {
  metric: string; anchor: string; condition: string; @minValue(1) pdfPage: int32;
  sourceLines: int32[]; claimOrigin: PaperClaimOrigin;
  interpretationBoundary: string; quantities: PaperQuantity[];
}
model PaperDraftEvidence extends PaperEvidence {
  readerCheck: PaperReaderCheck; claims: PaperDraftClaim[]; articleBlocks: PaperArticleBlock[];
}
model PaperDraftStructure extends PaperStructure {
  @minValue(1) pageCount: int32; sections: PaperDraftSection[]; figures: PaperDraftFigure[]; concepts: PaperDraftConcept[];
}
model PaperDraftResources extends PaperResources { landingPage: string; code: PaperDraftCode; }
model PaperDraft {
  meta: PaperDraftMeta; guide: PaperDraftGuide; evidence: PaperDraftEvidence;
  structure: PaperDraftStructure; resources: PaperDraftResources; generatedBy?: GeneratedBy;
}
model PaperAuthorInput {
  paperId: string; knownMeta: PaperMeta | null; pages: string;
  previousDraft: PaperDraft | null; problems: string[]; instructions: string | null;
}
model PaperQaInput { question: string; guide: PaperGuide; claims: PaperClaim[]; pages: string; }
model PaperQaOutput { answer: string; pages: int32[]; generatedBy?: GeneratedBy; }
model PaperReviewInput {
  paperId: string; paper: Paper | PaperDraft; pages: string;
  @image pageImages: int32[];
}
model PaperReviewOutput { ...PaperReviewContent; generatedBy?: GeneratedBy; }
