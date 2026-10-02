import {
  Paper as PaperSchema,
  PaperSummary as SummarySchema,
  Upload as UploadSchema,
} from "@bowen-hub/contracts/zod";
import { expect, test } from "@playwright/test";
import graph from "../../../../fixtures/samples/papers/GraphData.all.json" with { type: "json" };
import paperRaw from "../../../../fixtures/samples/papers/Paper.arxiv-2505.07078.json" with {
  type: "json",
};
import summariesRaw from "../../../../fixtures/samples/papers/PaperSummary.all.json" with {
  type: "json",
};
import catalog from "../../../../fixtures/samples/papers/PapersCatalog.all.json" with {
  type: "json",
};
import review from "../../../../fixtures/samples/papers/Review.synthetic.json" with {
  type: "json",
};

test("隔离真实API：虚拟通行密钥、私人笔记、原生问答流、解释卡及上传重试", async ({
  page,
  context,
}) => {
  const api = context.request;
  expect((await api.get("/v1/papers")).status()).toBe(401);
  const service = { Authorization: "Bearer paper-e2e-service-only" };
  const paper = PaperSchema.parse(paperRaw);
  paper.status.visibility = "private";
  const summary = SummarySchema.parse(summariesRaw.find((item) => item.id === paper.id));
  summary.visibility = "private";
  const seeded = await api.put(`/v1/internal/papers/${paper.id}`, {
    headers: service,
    data: { paper, summary },
  });
  expect(seeded.status()).toBe(204);
  for (const [key, value] of [
    ["papers.catalog.all", catalog],
    ["papers.graph.all", graph],
  ] as const)
    expect(
      (await api.put(`/v1/internal/documents/${key}`, { headers: service, data: value })).status(),
    ).toBe(204);
  const count = paper.structure?.pageCount ?? 15;
  const text = Array.from(
    { length: count },
    (_, i) => `=== p.${i + 1} ===\nL1: 离线API传输验收材料第${i + 1}页。\n`,
  ).join("\n");
  expect(
    (
      await api.put(`/v1/internal/papers/${paper.id}/files/pages.txt`, {
        headers: { ...service, "Content-Type": "text/plain" },
        data: Buffer.from(text),
      })
    ).status(),
  ).toBe(204);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWXkAAAAASUVORK5CYII=",
    "base64",
  );
  expect(
    (
      await api.put(`/v1/internal/papers/${paper.id}/pages/1`, {
        headers: { ...service, "Content-Type": "image/png" },
        data: png,
      })
    ).status(),
  ).toBe(204);
  expect(
    (
      await api.post(`/v1/internal/papers/${paper.id}/reviews`, { headers: service, data: review })
    ).status(),
  ).toBe(204);
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.goto("/papers");
  await page.getByText("第一次使用？登记通行密钥").click();
  await page.getByLabel("一次性登记口令").fill("paper-e2e-bootstrap-only");
  await page.getByRole("button", { name: "登记我的通行密钥" }).click();
  await expect(page).toHaveURL(/\/papers$/, { timeout: 20000 });
  await page.goto(`/papers/${paper.id}`);
  await expect(page.getByLabel("私人笔记")).toBeVisible();
  await page.getByLabel("私人笔记").fill("真实API保存的私人笔记");
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("私人笔记")).toHaveValue("真实API保存的私人笔记");
  expect((await (await api.get(`/v1/papers/${paper.id}/private`)).json()).notes).toBe(
    "真实API保存的私人笔记",
  );
  await page.getByRole("button", { name: "问这篇论文", exact: true }).click();
  await page.getByLabel("你的问题").fill("请说明结论边界");
  await page.getByRole("button", { name: "提问", exact: true }).click();
  await expect(page.getByText(/离线模型传输夹具回答/)).toBeVisible();
  await page.getByRole("button", { name: "保存为解释卡" }).click();
  await expect(page.getByRole("button", { name: "已保存解释卡" })).toBeVisible();
  await page.getByRole("button", { name: "原文第 1 页", exact: true }).click();
  await expect(page.getByRole("img", { name: "PDF 原文第 1 页" })).toHaveJSProperty(
    "naturalWidth",
    1,
  );
  await page
    .getByRole("dialog", { name: "原文第 1 页" })
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "问这篇论文" })
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.getByRole("button", { name: "确认这张解释卡" }).click();
  await page.reload();
  const privateRow = await (await api.get(`/v1/papers/${paper.id}/private`)).json();
  expect(privateRow.explanations).toHaveLength(1);
  expect(privateRow.explanations[0].status).toBe("confirmed");
  expect(privateRow.explanations[0].generatedBy.capability).toBe("papers.qa");
  await page.goto("/papers/inbox");
  await page.getByLabel("arXiv 链接").fill("https://arxiv.org/abs/1706.03762");
  await page.getByRole("button", { name: "提交链接" }).click();
  await expect(
    page.getByRole("heading", { name: "https://arxiv.org/abs/1706.03762" }),
  ).toBeVisible();
  const [upload] = await (await api.get("/v1/papers/uploads")).json();
  expect(
    (
      await api.patch(`/v1/internal/papers/uploads/${upload.id}`, {
        headers: service,
        data: { status: "failed", error: "离线验收失败阶段" },
      })
    ).status(),
  ).toBe(204);
  await page.getByRole("button", { name: "刷新状态" }).click();
  await page.getByRole("button", { name: "重试入库" }).click();
  await page.reload();
  expect((await (await api.get("/v1/papers/uploads")).json())[0].status).toBe("queued");
  const pdf = Buffer.from("%PDF-1.4\n%离线上传传输夹具，不代表入库处理成功\n%%EOF");
  await page
    .getByLabel("原文文件")
    .setInputFiles({ name: "transport-fixture.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: "上传并入库", exact: true }).click();
  await expect(page.getByRole("heading", { name: "transport-fixture.pdf" })).toBeVisible();
  await page.reload();
  const pdfUpload = UploadSchema.array()
    .parse(await (await api.get("/v1/papers/uploads")).json())
    .find((item) => item.filename === "transport-fixture.pdf");
  expect(pdfUpload?.status).toBe("queued");
  const stored = await api.get(`/v1/internal/papers/uploads/${pdfUpload?.id}/file`, {
    headers: service,
  });
  expect(stored.status()).toBe(200);
  expect(await stored.body()).toEqual(pdf);
  await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
});
