import type { Paper, PaperArticleBlock, PaperClaim, PaperCoverage } from "@bowen-hub/contracts";
import { Fragment, type ReactNode, useState } from "react";
import { ContentTree, labels } from "./ContentTree";
import { EvidencePopover as EvidenceMark } from "./EvidencePopover";
import { type EvidenceImage, OriginalEvidence } from "./OriginalEvidence";
import "./reader.css";
export interface ReadingParagraph {
  html: string;
  evidence?: PaperArticleBlock;
  claims: PaperClaim[];
}
export interface PaperReaderProps {
  paper?: Paper;
  paragraphs?: ReadingParagraph[];
  coverage?: number | null;
  related?: { concepts: Paper[]; spaces: Paper[]; relations: Paper[] };
  children?: ReactNode;
  onPage?: (page: number) => void;
  tableEvidence?: Record<string, EvidenceImage>;
}
/** Host parses Markdown safely before supplying paragraphs; ordinary pages render without hydration. */
export function PaperReader({
  paper,
  paragraphs = [],
  coverage: suppliedCoverage,
  related = { concepts: [], spaces: [], relations: [] },
  children,
  onPage,
  tableEvidence = {},
}: PaperReaderProps) {
  const [kind, setKind] = useState("all");
  if (!paper)
    return (
      <article className="paper-reader" aria-label="论文导读">
        {children}
      </article>
    );
  const { guide, evidence, structure, learning, resources, citations } = paper;
  const sourceUrl = paper.meta.sourceUrl ?? resources?.landingPage;
  let pdfUrl: string | null = null;
  try {
    if (sourceUrl) {
      const url = new URL(sourceUrl);
      if (["https:", "http:"].includes(url.protocol)) {
        if (
          (url.hostname === "arxiv.org" || url.hostname === "www.arxiv.org") &&
          url.pathname.startsWith("/abs/")
        )
          pdfUrl = `https://arxiv.org/pdf/${url.pathname.slice(5)}`;
        else if (url.hostname === "aclanthology.org" && /^\/[a-zA-Z0-9.-]+\/$/.test(url.pathname))
          pdfUrl = `https://aclanthology.org${url.pathname.slice(0, -1)}.pdf`;
        else if (url.pathname.endsWith(".pdf") || url.pathname.startsWith("/pdf/"))
          pdfUrl = url.href.split("#")[0] ?? null;
      }
    }
  } catch {
    /* 无可靠PDF地址时只显示已有页码。 */
  }
  const coverage =
    suppliedCoverage === undefined ? readingCoverage(structure?.coverage) : suppliedCoverage;
  const questions = {
    problem: "论文研究什么问题？",
    gap: "已有方法缺口在哪里？",
    input: "输入是什么？",
    mechanism: "机制是什么？",
    output: "输出是什么？",
    boundary: "适用边界是什么？",
    openQuestion: "还有什么未解决？",
  };
  const appendix: [string, unknown][] = [
    ["问题与已有方法", guide?.problem],
    ["方法与组成", guide?.method],
    [
      "实验设置",
      guide?.experiment && {
        setup: guide.experiment.setup,
        howToRead: guide.experiment.howToRead,
        anchor: guide.experiment.anchor,
      },
    ],
    ["主要发现", guide?.findings],
    ["概念定位", learning?.orientation],
    ["机制步骤", learning?.mechanismSteps],
    ["设计思路", learning?.designPhilosophy],
    ["专家问答", learning?.expertQa],
    ["图表导读", structure?.figures],
    ["核心概念", structure?.concepts],
    ["章节阅读", structure?.sections],
    ["局限", guide?.limitations],
    ["开放问题", guide?.openQuestions],
    ["研究迁移", guide?.projectConnection],
  ];
  const shownAppendix = appendix.filter(
    ([, value]) => value && (!Array.isArray(value) || value.length > 0),
  );
  return (
    <article className="paper-reader" aria-label="论文导读">
      {(guide?.oneSentence || guide?.readingGoal || guide?.bottomLine) && (
        <section className="reading-section">
          <h2>30 秒读懂</h2>
          {guide?.oneSentence && <p className="reading-lede">{guide.oneSentence}</p>}
          {guide?.readingGoal && <p>{guide.readingGoal}</p>}
          {guide?.bottomLine && (
            <dl>
              <dt>支持什么</dt>
              <dd>{guide.bottomLine.supports}</dd>
              <dt>不支持什么</dt>
              <dd>{guide.bottomLine.doesNotSupport}</dd>
              <dt>记住这一句</dt>
              <dd>{guide.bottomLine.memorable}</dd>
            </dl>
          )}
        </section>
      )}
      {Boolean(guide?.prerequisites?.length) && (
        <section className="reading-section">
          <h2>开始之前</h2>
          {guide?.prerequisites?.map((item) => (
            <div key={item.term}>
              <h3>{item.term}</h3>
              <p>{item.explanation}</p>
              {item.example && <p className="muted">例如：{item.example}</p>}
            </div>
          ))}
        </section>
      )}
      {paragraphs.length > 0 && (
        <section className="reading-section article-content" aria-label="中文导读">
          {paragraphs.map((block) => (
            <div key={block.html} className="article-paragraph">
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: host supplies raw-HTML-stripped, safe-link Markdown output; regression tests enforce this boundary. */}
              <div dangerouslySetInnerHTML={{ __html: block.html }} />
              <EvidenceMark
                claims={block.claims}
                tableEvidence={tableEvidence}
                onPage={onPage}
                inferred={block.evidence?.claimOrigin === "llm_inferred"}
              />
            </div>
          ))}
        </section>
      )}
      {Boolean(evidence?.claims?.length) && (
        <section className="reading-section" id="evidence">
          <h2>原文证据</h2>
          <p className="muted">将主张放回条件与原文定位中理解。</p>
          <label className="filter-label">
            主张类型{" "}
            <select
              id="claim-filter"
              defaultValue="all"
              onChange={(event) => setKind(event.target.value)}
            >
              <option value="all">全部</option>
              <option value="method">方法</option>
              <option value="result">结果</option>
              <option value="limitation">限制</option>
              <option value="definition">定义</option>
            </select>
          </label>
          <div className="evidence-cards">
            {evidence?.claims?.map((claim) => (
              <article
                className="evidence-card"
                key={claim.id}
                data-claim-kind={claim.kind}
                hidden={kind !== "all" && kind !== claim.kind}
              >
                <p className="evidence-kind">
                  {
                    { method: "方法", result: "结果", limitation: "限制", definition: "定义" }[
                      claim.kind
                    ]
                  }
                  {claim.claimOrigin === "llm_inferred" && " · 解释性推断"}
                </p>
                <h3>{claim.claim}</h3>
                {claim.sourceExcerpt ? (
                  <details className="evidence-original">
                    <summary>原文摘录</summary>
                    <OriginalEvidence claim={claim} image={tableEvidence[claim.id]} />
                  </details>
                ) : (
                  <p className="muted">原文未找到</p>
                )}
                {claim.condition && <p className="muted">条件：{claim.condition}</p>}
                {claim.metric && <p className="muted">指标：{claim.metric}</p>}
                <div className="evidence-location">
                  {claim.pdfPage &&
                    (onPage ? (
                      <button type="button" onClick={() => onPage(claim.pdfPage as number)}>
                        原文第 {claim.pdfPage} 页 ↗
                      </button>
                    ) : pdfUrl ? (
                      <a href={`${pdfUrl}#page=${claim.pdfPage}`} target="_blank" rel="noreferrer">
                        原文第 {claim.pdfPage} 页 ↗
                      </a>
                    ) : (
                      <span>PDF p.{claim.pdfPage}</span>
                    ))}
                  {claim.anchor && <span>{claim.anchor}</span>}
                  <EvidenceMark
                    claims={[claim]}
                    label="查看证据"
                    onPage={onPage}
                    tableEvidence={tableEvidence}
                  />
                </div>
                {claim.interpretationBoundary && (
                  <p className="muted">{claim.interpretationBoundary}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      {Boolean(evidence?.readerCheck || learning?.activeRecall?.length) && (
        <section className="reading-section">
          <h2>读完，试着回答</h2>
          {evidence?.readerCheck &&
            Object.entries(evidence.readerCheck).map(([key, answer]) => (
              <details key={key}>
                <summary>{questions[key as keyof typeof questions]}</summary>
                <p>{answer}</p>
              </details>
            ))}
          {learning?.activeRecall?.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      )}
      {shownAppendix.length > 0 && (
        <details className="reading-section appendix">
          <summary>技术附录</summary>
          {shownAppendix.map(([title, value]) => (
            <section key={title}>
              <h3>{String(title)}</h3>
              <ContentTree value={value} labels={labels} />
            </section>
          ))}
          {guide?.experiment?.table && (
            <div className="table-scroll">
              <table>
                <caption>实验结果</caption>
                <thead>
                  <tr>
                    {guide.experiment.table.columns.map((c) => (
                      <th key={c} scope="col">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.experiment.table.rows.map((row) => (
                    <tr key={row.join("|")}>
                      {row.map((c, column) => (
                        <td key={guide.experiment?.table?.columns[column]}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      )}
      {Boolean(
        structure?.appraisal || structure?.coverage?.length || structure?.negativeResults?.length,
      ) && (
        <details className="reading-section appendix">
          <summary>批判性阅读</summary>
          {coverage !== null && (
            <p>阅读覆盖率 {Math.round(coverage * 100)}% · 这是阅读覆盖，不是论文质量分数。</p>
          )}
          {structure?.coverage?.map((item) => (
            <p key={item.dimension}>
              <strong>{item.dimension}</strong> ·{" "}
              {
                { complete: "完整", partial: "部分", missing: "未覆盖", not_applicable: "不适用" }[
                  item.status
                ]
              }
              {item.evidence && `：${item.evidence}`}
            </p>
          ))}
          {structure?.appraisal?.minimumClaim && (
            <>
              <h3>最低充分结论</h3>
              <p>{structure.appraisal.minimumClaim}</p>
            </>
          )}
          {structure?.appraisal?.overclaimToAvoid && (
            <>
              <h3>避免过度声称</h3>
              <p>{structure.appraisal.overclaimToAvoid}</p>
            </>
          )}
          {structure?.appraisal?.dimensions && (
            <ContentTree value={structure.appraisal.dimensions} labels={labels} />
          )}{" "}
          {Boolean(structure?.negativeResults?.length) && (
            <>
              <h3>负结果</h3>
              <ContentTree value={structure?.negativeResults} />
            </>
          )}
        </details>
      )}
      {(citations || resources) && (
        <section className="reading-section">
          <h2>继续阅读</h2>
          {Boolean(citations?.backward?.length) && (
            <>
              <h3>前置研究</h3>
              <ContentTree value={citations?.backward} labels={labels} />
            </>
          )}
          {Boolean(citations?.forward?.length) && (
            <>
              <h3>后续研究</h3>
              <ContentTree value={citations?.forward} labels={labels} />
            </>
          )}
          {resources?.code?.note && <p>{resources.code.note.split(/\s+\{'label':/)[0]}</p>}
          {Boolean(resources?.secondary?.length) && (
            <>
              <h3>二手材料</h3>
              <p className="muted">二手材料不等同于论文原文。</p>
              <ContentTree value={resources?.secondary} labels={labels} />
            </>
          )}
        </section>
      )}
      {Object.entries(related).some(([, papers]) => papers.length > 0) && (
        <section className="reading-section">
          <h2>相关论文</h2>
          {Object.entries(related).map(
            ([key, papers]) =>
              papers.length > 0 && (
                <Fragment key={key}>
                  <h3>
                    {
                      { concepts: "共享概念", spaces: "同一研究空间", relations: "明确关系" }[
                        key as keyof typeof related
                      ]
                    }
                  </h3>
                  <ul>
                    {papers.map((p) => (
                      <li key={p.id}>
                        <a href={`/papers/${p.id}/`}>{p.meta.titleZh ?? p.meta.title}</a>
                      </li>
                    ))}
                  </ul>
                </Fragment>
              ),
          )}
        </section>
      )}
    </article>
  );
}

export function readingCoverage(coverage: PaperCoverage[] = []) {
  const applicable = coverage.filter((item) => item.status !== "not_applicable");
  return applicable.length
    ? applicable.reduce(
        (sum, item) => sum + (item.status === "complete" ? 1 : item.status === "partial" ? 0.5 : 0),
        0,
      ) / applicable.length
    : null;
}
