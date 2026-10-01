// 论文文档、私人内容与派生数据（docs/04、docs/06）。旧档案缺省的内容块不填造值。
import "./common.tsp";

namespace BowenHub;

union PaperKind { "empirical", "theory", "survey", "system" }
union PaperVisibility { "public", "private" }
union PaperReviewStatus { "draft", "passed", "revise" }
union PaperReadingDepth { "R0", "R1", "R2", "R3" }
union PaperClaimOrigin { "paper_supported", "llm_inferred", "source_navigation" }
union PaperClaimKind { "method", "result", "limitation", "definition" }
union PaperMastery { "pending", "confirmed" }
union PaperCodeStatus { "verified", "unverified", "not_found" }
union PaperSectionStatus { "read", "skimmed", "unread" }
union PaperCoverageStatus { "complete", "partial", "missing", "not_applicable" }

/** 书目信息：老档案只有英文标题是必填，未提供的字段可以缺省。 */
model PaperMeta {
  title: string;
  titleZh?: string;
  authors?: string[];
  year?: int32;
  venue?: string;
  version?: string;
  paperType?: string;
  paperKind?: PaperKind;
  studyDesign?: string;
  doi?: string | null;
  arxivId?: string | null;
  anthologyId?: string | null;
  sourceUrl?: string;
  pdfUrl?: string;
}

model PaperStatus {
  visibility: PaperVisibility;
  review: PaperReviewStatus;
  readingDepth: PaperReadingDepth;
  nextAction: string;
  /** 内容更新日期；迁移按 docs/06 的依次回退规则取日期部分。 */
  updatedAt: Date;
}

model PaperPrerequisite { term: string; explanation: string; example?: string; }
model PaperExistingMethod { name: string; whatItDoes?: string; whyNotEnough?: string; }
model PaperProblem { setup?: string; existingMethods?: PaperExistingMethod[]; gap?: string; }
model PaperMethodComponent {
  name: string;
  question?: string;
  how?: string;
  purpose?: string;
  caveat?: string;
  anchor?: string;
}
model PaperMethod { thesis?: string; pipeline?: string[]; components?: PaperMethodComponent[]; }
model PaperExperimentTable { columns: string[]; rows: string[][]; }
model PaperExperiment { setup?: string; table?: PaperExperimentTable; howToRead?: string; anchor?: string; }
model PaperFinding { title: string; evidence?: string; interpretation?: string; caveat?: string; anchor?: string; }
model PaperBottomLine { supports: string; doesNotSupport: string; memorable: string; }
model PaperProjectConnection { translation?: string; safeDesign?: string; }

/** 迁移导读允许只保留已有部分；新草稿的要求在 PaperDraftGuide 中收紧。 */
model PaperGuide {
  oneSentence?: string;
  readingGoal?: string;
  article?: string;
  prerequisites?: PaperPrerequisite[];
  problem?: PaperProblem;
  method?: PaperMethod;
  experiment?: PaperExperiment;
  findings?: PaperFinding[];
  bottomLine?: PaperBottomLine;
  limitations?: string[];
  openQuestions?: string[];
  projectConnection?: PaperProjectConnection | null;
}

model PaperReaderCheck {
  problem: string;
  gap: string;
  input: string;
  mechanism: string;
  output: string;
  boundary: string;
  openQuestion: string;
}
model PaperQuantity { text: string; sourceText: string; meaning: string; }

/** 一条原文主张；R1 表格转换时没有页内行号和摘录，不制造这些值。 */
model PaperClaim {
  id: string;
  kind: PaperClaimKind;
  claim: string;
  metric?: string;
  condition?: string;
  anchor?: string;
  @minValue(1) pdfPage?: int32 | null;
  /** 起止行号；新草稿由 paper_draft 校验两项及范围。 */
  sourceLines?: int32[];
  @sourceQuote sourceExcerpt?: string | null;
  claimOrigin?: PaperClaimOrigin;
  interpretationBoundary?: string;
  quantities?: PaperQuantity[];
}
model PaperArticleBlock { claimOrigin: PaperClaimOrigin; claimIds: string[]; }
model PaperEvidence {
  readerCheck?: PaperReaderCheck | null;
  claims?: PaperClaim[];
  articleBlocks?: PaperArticleBlock[];
  /** 旧文本抽取的行号不再逐行核验；重写后整个 evidence 换为 false。 */
  legacyAnchors?: boolean;
}

model PaperSection { pages: string; role?: string; keyQuestion?: string; status?: PaperSectionStatus; }
model PaperFigure { @minValue(1) page: int32; title: string; explanation?: string; takeaway?: string; }
model PaperConcept {
  id: string;
  name: string;
  explanation?: string;
  whyItMatters?: string;
  dependsOn?: string[];
  anchor?: string;
  claimOrigin?: PaperClaimOrigin;
}
model PaperCoverage { dimension: string; status: PaperCoverageStatus; evidence?: string; }
model PaperAppraisalDimension { name: string; judgment?: string; status?: string; note?: string; }
model PaperAppraisal {
  minimumClaim?: string;
  overclaimToAvoid?: string;
  dimensions?: PaperAppraisalDimension[];
}
model PaperStructure {
  @minValue(1) pageCount?: int32;
  sections?: PaperSection[];
  figures?: PaperFigure[];
  concepts?: PaperConcept[];
  coverage?: PaperCoverage[];
  appraisal?: PaperAppraisal;
  negativeResults?: string[];
}

model PaperOrientation {
  whatItIs?: string;
  analogy?: string;
  whyItMatters?: string;
  notTheSameAs?: string[];
  thirtySecondStory?: string[];
}
model PaperMechanismStep { step: string; detail: string; input?: string; output?: string; anchor?: string; }
model PaperDesignIdea { title: string; explanation: string; anchor?: string; }
model PaperQuestionAnswer { question: string; answer: string; }
model PaperLearning {
  orientation?: PaperOrientation;
  mechanismSteps?: PaperMechanismStep[];
  designPhilosophy?: (string | PaperDesignIdea)[];
  activeRecall?: PaperQuestionAnswer[];
  expertQa?: PaperQuestionAnswer[];
}
model PaperCode {
  status: PaperCodeStatus;
  url?: string | null;
  note?: string;
  checkedAt?: Date | null;
}
model PaperSecondary { title: string; note?: string; }
model PaperResources { landingPage?: string; code?: PaperCode; secondary?: PaperSecondary[]; }
model PaperCitation { title: string; why: string; }
model PaperCitations { backward?: PaperCitation[]; forward?: PaperCitation[]; }
model PaperRelation { target: string; type: string; note?: string; }

/** 单篇公开内容。私人笔记、解释卡、老阅读卡只存在 PaperPrivate。 */
model Paper {
  schemaVersion?: 1;
  id: string;
  meta: PaperMeta;
  status: PaperStatus;
  spaces?: string[];
  guide?: PaperGuide;
  evidence?: PaperEvidence;
  structure?: PaperStructure;
  learning?: PaperLearning;
  resources?: PaperResources;
  citations?: PaperCitations;
  relations?: PaperRelation[];
  /** 新 AI 草稿落库时带运行时出处；旧论文没有可靠出处时不补造。 */
  generatedBy?: GeneratedBy;
}

model PaperExplanation {
  id: string;
  question: string;
  answer: string;
  pages: int32[];
  status: PaperMastery;
  createdAt: DateTime;
  /** 保存 AI 回答时保留该次问答的运行时出处。 */
  generatedBy?: GeneratedBy;
}
model PaperLegacyCard { title: string; markdown: string; }
model PaperPrivate {
  schemaVersion: 1;
  mastery: PaperMastery;
  notes: string;
  explanations: PaperExplanation[];
  legacyCards: PaperLegacyCard[];
}

/** 列表摘要由计算任务与 Paper 一起写入；原文缺省的展示字段用 null。 */
model PaperSummary {
  id: string;
  title: string;
  titleZh: string | null;
  year: int32 | null;
  venue: string | null;
  oneSentence: string | null;
  spaces: string[];
  readingDepth: PaperReadingDepth;
  paperKind: PaperKind | null;
  paperType: string | null;
  visibility: PaperVisibility;
  review: PaperReviewStatus;
  updatedAt: Date;
  hasCode: boolean;
  conceptCount: int32;
}
model PaperPage is CursorPage<PaperSummary>;
model PaperWrite { paper: Paper; summary: PaperSummary; }
model PaperPatch { visibility?: PaperVisibility; spaces?: string[]; readingDepth?: PaperReadingDepth; nextAction?: string; }
model PaperPrivateWrite { mastery: PaperMastery; notes: string; }
model PaperAskRequest { question: string; }
/** 新AI解释卡沿用原QA出处；旧数据缺省，不由API编造模型信息。 */
model PaperExplanationCreate { question: string; answer: string; pages: int32[]; generatedBy?: GeneratedBy; }
model PaperExplanationPatch { status: PaperMastery; }
model PaperReviseRequest { instructions: string; }
model PaperArxivUploadRequest { arxivUrl: string; }

// 派生文档只保存页面需要的内容；public 版本不带任何 PaperPrivate 内容。
model PapersCatalogStats { paperCount: int32; spaceCount: int32; conceptCount: int32; edgeCount: int32; }
model PaperSpace {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  aliases: string[];
  paperCount: int32;
}
model PapersCatalog { stats: PapersCatalogStats; spaces: PaperSpace[]; papers: PaperSummary[]; }
model PaperGraphNode { id: string; kind: "paper" | "concept" | "space"; label: string; }
model PaperGraphEdge {
  source: string;
  target: string;
  type: "discusses" | "belongs_to" | "relation";
  relationType?: string;
  note?: string;
}
model PaperConceptCooccurrence { source: string; target: string; count: int32; }
model GraphData { nodes: PaperGraphNode[]; edges: PaperGraphEdge[]; cooccurrence: PaperConceptCooccurrence[]; }
model PaperSearchItem {
  id: string;
  title: string;
  titleZh: string | null;
  authors: string[];
  oneSentence: string | null;
  concepts: string[];
  /** 研究空间的展示名称，供本地全文搜索。 */
  spaces: string[];
}
model SearchIndex { papers: PaperSearchItem[]; }

// 审核的纯内容由能力输出复用；存储模型另加真实运行信息。
union PaperReviewDecision { "pass", "revise", "escalate" }
model PaperReviewCheck { status: "pass" | "fail" | "not_applicable"; evidence: string; }
model PaperReviewChecks {
  identity: PaperReviewCheck;
  explanation: PaperReviewCheck;
  method: PaperReviewCheck;
  results: PaperReviewCheck;
  boundaries: PaperReviewCheck;
  sources: PaperReviewCheck;
}
model PaperIndependentSourceCheck {
  @minValue(1) pdfPage: int32;
  @sourceQuote sourceExcerpt: string;
  minimumClaim: string;
  counterexampleOrLimit: string;
  comparisonToArticle: string;
}
model PaperReviewFinding { severity: "P0" | "P1" | "P2"; location: string; fix: string; }
model PaperReviewContent {
  decision: PaperReviewDecision;
  readerRestatement: string;
  independentSourceCheck: PaperIndependentSourceCheck;
  sampledClaimIds: string[];
  checks: PaperReviewChecks;
  findings: PaperReviewFinding[];
  pagesChecked: int32[];
  visualPagesChecked: int32[];
}
model Review {
  ...PaperReviewContent;
  id: string;
  createdAt: DateTime;
  durationMs: int32;
  generatedBy: GeneratedBy;
}

union PaperUploadStatus { "queued", "extracting", "authoring", "checking", "reviewing", "ready", "failed" }
model Upload {
  id: string;
  filename: string | null;
  arxivUrl: string | null;
  status: PaperUploadStatus;
  error: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
  /** 定下后立即写入；重试沿用，避免误加版本后缀。 */
  paperId?: string;
}
model PaperUploadPatch { status?: PaperUploadStatus; error?: string | null; paperId?: string; }
