"""Runtime调用与PNG读取属于薄编排层；真实页行校验复用纯函数。"""

import re
from collections.abc import Callable, Sequence
from pathlib import Path
from uuid import uuid4

from hub_ai.runtime import Runtime
from hub_contracts import PaperAuthorInput, PaperDraft, PaperMeta, PaperReviewInput, Review
from hub_papers.ai import WrittenPaper, review_pages
from hub_papers.check import check_draft
from hub_papers.excerpt import PageText, fill_source_excerpts, pages_text
from hub_papers.pdf.config import load_rules


async def write_and_review(
    runtime: Runtime,
    paper_id: str,
    pages: Sequence[PageText],
    *,
    run_id: str,
    known_meta: PaperMeta | None = None,
    previous: PaperDraft | None = None,
    instructions: str | None = None,
    supplied: PaperDraft | None = None,
    image_directory: Path | None = None,
    supports_images: bool = True,
    phase: Callable[[str], None] = lambda _: None,
    resolve_id: Callable[[PaperDraft], str] | None = None,
) -> WrittenPaper:
    rules = load_rules()
    author_cap = runtime.registry.capabilities["papers.author"]
    reviewer_cap = runtime.registry.capabilities["papers.review"]
    text = pages_text(pages, numbered=True)
    reviews: list[Review] = []

    async def author(old: PaperDraft | None, problems: list[str]) -> PaperDraft:
        for attempt in range(int(author_cap["params"]["repairRounds"]) + 1):
            phase("authoring")
            request = PaperAuthorInput(
                paperId=paper_id,
                knownMeta=known_meta,
                pages=text,
                previousDraft=old,
                problems=problems,
                instructions=instructions,
            )
            result = await runtime.run(
                "papers.author",
                request.model_dump(mode="json"),
                run_id=run_id,
                total_pages=len(pages),
            )
            phase("checking")
            if result.ok and result.output:
                return fill_source_excerpts(PaperDraft.model_validate(result.output), pages)
            if result.raw_output is None:
                raise ValueError("作者能力失败")
            checked = check_draft(result.raw_output, pages, rules)
            if checked.valid or attempt == int(author_cap["params"]["repairRounds"]):
                raise ValueError("草稿校验修订已耗尽")
            old = checked.draft
            problems = list(checked.errors)
        raise ValueError("作者能力失败")

    if supplied is not None:
        checked = check_draft(supplied, pages, rules)
        if not checked.valid:
            raise ValueError("提交草稿校验失败")
        # 本机稿没有作者Runtime调用，不能采信稿件自填的模型出处。
        draft = fill_source_excerpts(
            supplied.model_copy(update={"generatedBy": None}, deep=True), pages
        )
    else:
        draft = await author(previous, [])
    if resolve_id is not None:
        paper_id = resolve_id(draft)
    for attempt in range(int(author_cap["params"]["reviewRounds"]) + 1):
        phase("reviewing")
        chosen = review_pages(draft, int(reviewer_cap["params"]["maxPageImages"]))
        # 图像能力按登记模型提供；没有实际PNG时明确使用文本审核。
        images: dict[int, bytes | str] = (
            {n: (image_directory / f"{n}.png").read_bytes() for n in chosen}
            if image_directory and supports_images
            else {}
        )
        request = PaperReviewInput(
            paperId=paper_id, paper=draft, pages=text, pageImages=chosen if images else []
        )
        result = await runtime.run(
            "papers.review",
            request.model_dump(mode="json"),
            run_id=run_id,
            total_pages=len(pages),
            images=images,
        )
        if not result.ok or not result.output:
            return WrittenPaper(draft, reviews, "draft")
        review = Review.model_validate(
            {
                **result.output,
                "id": str(uuid4()),
                "createdAt": result.call.at,
                "durationMs": result.call.durationMs,
            }
        )
        # 审核记录的普通int/str字段没有契约注解；在业务边界核对实际页与附件。
        checked_page = review.independentSourceCheck.pdfPage
        claim_ids = {claim.id for claim in draft.evidence.claims}
        if (
            not 1 <= checked_page <= len(pages)
            or not review.independentSourceCheck.sourceExcerpt.strip()
            or re.sub(r"\s+", "", review.independentSourceCheck.sourceExcerpt)
            not in re.sub(r"\s+", "", "\n".join(pages[checked_page - 1].lines))
            or checked_page not in review.pagesChecked
            or any(not 1 <= page <= len(pages) for page in review.pagesChecked)
            or not set(review.visualPagesChecked).issubset(images)
            or not set(review.sampledClaimIds).issubset(claim_ids)
            or (
                review.decision == "pass"
                and (
                    any(f.severity in {"P0", "P1"} for f in review.findings)
                    or any(
                        c.status == "fail"
                        for c in (
                            review.checks.identity,
                            review.checks.explanation,
                            review.checks.method,
                            review.checks.results,
                            review.checks.boundaries,
                            review.checks.sources,
                        )
                    )
                )
            )
        ):
            return WrittenPaper(draft, reviews, "draft")
        reviews.append(review)
        if (
            review.decision == "revise"
            and any(f.severity in {"P0", "P1"} for f in review.findings)
            and attempt < int(author_cap["params"]["reviewRounds"])
        ):
            draft = await author(
                draft, [f"{f.severity} {f.location}：{f.fix}" for f in review.findings]
            )
            continue
        return WrittenPaper(draft, reviews, "passed" if review.decision == "pass" else "revise")
    raise ValueError("审核状态无效")
