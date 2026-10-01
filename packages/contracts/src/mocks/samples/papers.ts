// 公开处理器只登记公开论文；私有处理器使用全部档案。

import { HttpResponse, http } from "msw";
import allGraph from "../../../../../fixtures/samples/papers/GraphData.all.json" with {
  type: "json",
};
import publicGraph from "../../../../../fixtures/samples/papers/GraphData.public.json" with {
  type: "json",
};
import acl from "../../../../../fixtures/samples/papers/Paper.acl-2021.acl-long.500.json" with {
  type: "json",
};
import arxiv from "../../../../../fixtures/samples/papers/Paper.arxiv-2505.07078.json" with {
  type: "json",
};
import aclPrivate from "../../../../../fixtures/samples/papers/PaperPrivate.acl-2021.acl-long.500.json" with {
  type: "json",
};
import arxivPrivate from "../../../../../fixtures/samples/papers/PaperPrivate.arxiv-2505.07078.json" with {
  type: "json",
};
import summaries from "../../../../../fixtures/samples/papers/PaperSummary.all.json" with {
  type: "json",
};
import allCatalog from "../../../../../fixtures/samples/papers/PapersCatalog.all.json" with {
  type: "json",
};
import publicCatalog from "../../../../../fixtures/samples/papers/PapersCatalog.public.json" with {
  type: "json",
};
import review from "../../../../../fixtures/samples/papers/Review.synthetic.json" with {
  type: "json",
};
import search from "../../../../../fixtures/samples/papers/SearchIndex.public.json" with {
  type: "json",
};
import failed from "../../../../../fixtures/samples/papers/Upload.failed.json" with {
  type: "json",
};
import ready from "../../../../../fixtures/samples/papers/Upload.ready.json" with { type: "json" };
import {
  getInternalPapersGetUploadMockHandler,
  getPrivatePapersGetCatalogMockHandler,
  getPrivatePapersGetGraphMockHandler,
  getPrivatePapersGetPaperMockHandler,
  getPrivatePapersGetPrivateMockHandler,
  getPrivatePapersListPapersMockHandler,
  getPrivatePapersListReviewsMockHandler,
  getPrivatePapersListUploadsMockHandler,
  getPublicPapersGetCatalogMockHandler,
  getPublicPapersGetGraphMockHandler,
  getPublicPapersGetPaperMockHandler,
  getPublicPapersGetSearchIndexMockHandler,
} from "../../generated/msw";
import { type SampleRoute, sampleRoute } from "../registry";
export const papersSamples: SampleRoute[] = [
  sampleRoute(getPublicPapersGetCatalogMockHandler, [publicCatalog], { shape: "one" }),
  sampleRoute(getPublicPapersGetGraphMockHandler, [publicGraph], { shape: "one" }),
  sampleRoute(getPublicPapersGetSearchIndexMockHandler, [search], { shape: "one" }),
  {
    build: () => {
      const path = getPublicPapersGetPaperMockHandler().info.path;
      if (typeof path !== "string") throw new Error("公开论文处理器必须使用字符串路径");
      return http.get(path, ({ params }) =>
        params.id === arxiv.id
          ? HttpResponse.json(arxiv)
          : HttpResponse.json(
              { type: "about:blank", title: "论文不存在", status: 404 },
              { status: 404, headers: { "Content-Type": "application/problem+json" } },
            ),
      );
    },
  },
  sampleRoute(getPrivatePapersListPapersMockHandler, [summaries], { shape: "page" }),
  sampleRoute(getPrivatePapersListUploadsMockHandler, [ready, failed], { shape: "list" }),
  sampleRoute(getPrivatePapersGetGraphMockHandler, [allGraph], { shape: "one" }),
  sampleRoute(getPrivatePapersGetCatalogMockHandler, [allCatalog], { shape: "one" }),
  sampleRoute(getPrivatePapersGetPrivateMockHandler, [arxivPrivate, aclPrivate], {
    shape: "one",
    pick: (sample, params) =>
      params.id === "acl-2021.acl-long.500" ? sample === aclPrivate : sample === arxivPrivate,
  }),
  sampleRoute(getPrivatePapersListReviewsMockHandler, [review], { shape: "list" }),
  sampleRoute(getPrivatePapersGetPaperMockHandler, [arxiv, acl], {
    shape: "one",
    pick: (sample, params) => sample.id === params.id,
  }),
  sampleRoute(getInternalPapersGetUploadMockHandler, [ready, failed], {
    shape: "one",
    pick: (sample, params) => sample.id === params.uploadId,
  }),
];
