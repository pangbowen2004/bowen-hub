import type { PaperClaim } from "@bowen-hub/contracts";
import { useId } from "react";
import { type EvidenceImage, OriginalEvidence } from "./OriginalEvidence";
export function EvidencePopover({
  claims = [],
  inferred = false,
  label = "原文证据",
  onPage,
  tableEvidence = {},
}: {
  claims?: PaperClaim[];
  inferred?: boolean;
  label?: string;
  onPage?: (page: number) => void;
  tableEvidence?: Record<string, EvidenceImage>;
}) {
  const id = useId();
  if (!claims.length && !inferred) return null;
  return (
    <span className="evidence-mark">
      <button type="button" popoverTarget={id} aria-controls={id}>
        {inferred ? "解释性推断" : label} <span aria-hidden="true">↗</span>
      </button>
      <div
        id={id}
        popover="auto"
        className="evidence-popover"
        role="dialog"
        aria-label="原文证据与解释边界"
      >
        <button
          type="button"
          className="close"
          popoverTarget={id}
          popoverTargetAction="hide"
          aria-label="关闭证据"
        >
          关闭 ×
        </button>
        {inferred && <p>解释性推断，不能当作论文直接支持的主张。</p>}
        {claims.map((claim) => (
          <section key={claim.id}>
            <strong>{claim.claim}</strong>
            {claim.metric && <p>指标：{claim.metric}</p>}
            {claim.condition && <p>条件：{claim.condition}</p>}
            {(claim.anchor || claim.pdfPage) && (
              <p className="muted">
                {claim.anchor}
                {claim.pdfPage && ` · PDF p.${claim.pdfPage}`}
              </p>
            )}
            {claim.pdfPage && onPage && (
              <button type="button" onClick={() => onPage(claim.pdfPage!)}>
                打开原文第 {claim.pdfPage} 页
              </button>
            )}
            {claim.sourceExcerpt && (
              <OriginalEvidence claim={claim} image={tableEvidence[claim.id]} />
            )}
            {claim.interpretationBoundary && <p>解释边界：{claim.interpretationBoundary}</p>}
          </section>
        ))}
      </div>
    </span>
  );
}
