import type { PaperClaim } from "@bowen-hub/contracts";

export type EvidenceImage = { src: string; width: number; height: number; page: number };
/** 表格使用原PDF区域，保留真实表头；不把无表头数字串伪装成摘录。 */
export function OriginalEvidence({ claim, image }: { claim: PaperClaim; image?: EvidenceImage }) {
  if (image)
    return (
      <figure className="original-table">
        <img
          src={image.src}
          width={image.width}
          height={image.height}
          loading="lazy"
          alt={`原PDF第${image.page}页的表格，包含表头和原始数据`}
        />
        <figcaption>原 PDF 第 {image.page} 页</figcaption>
      </figure>
    );
  const text = claim.sourceExcerpt;
  if (!text) return <p className="muted">原文未找到</p>;
  const numbers = (text.match(/\d/g) || []).length;
  if (/(?:Table|表)\s*\d/i.test(claim.anchor || "") && numbers / text.length > 0.15)
    return <p className="muted">原文未找到</p>;
  return <blockquote>{text}</blockquote>;
}
