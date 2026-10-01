// 新闻 GET 接口返回可审查的离线样例。

import article from "../../../../../fixtures/samples/news/Article.synthetic.json" with {
  type: "json",
};
import articleTimeline from "../../../../../fixtures/samples/news/ArticleTimelineItem.synthetic.json" with {
  type: "json",
};
import earningsTimeline from "../../../../../fixtures/samples/news/EarningsTimelineItem.synthetic.json" with {
  type: "json",
};
import legacy from "../../../../../fixtures/samples/news/Edition.legacy-2026-09-29.json" with {
  type: "json",
};
import morning from "../../../../../fixtures/samples/news/Edition.morning-2026-09-30.json" with {
  type: "json",
};
import editionFeedback from "../../../../../fixtures/samples/news/EditionFeedback.score.json" with {
  type: "json",
};
import summaries from "../../../../../fixtures/samples/news/EditionSummary.archive.json" with {
  type: "json",
};
import filingTimeline from "../../../../../fixtures/samples/news/FilingTimelineItem.synthetic.json" with {
  type: "json",
};
import itemFeedback from "../../../../../fixtures/samples/news/ItemFeedback.incorrect.json" with {
  type: "json",
};
import failedSource from "../../../../../fixtures/samples/news/NewsSourceHealth.failed.json" with {
  type: "json",
};
import source from "../../../../../fixtures/samples/news/NewsSourceHealth.ok.json" with {
  type: "json",
};
import {
  getPrivateNewsGetEditionMockHandler,
  getPrivateNewsGetTimelineMockHandler,
  getPrivateNewsListEditionsMockHandler,
  getPrivateNewsListFeedbackMockHandler,
  getPrivateNewsListSourcesMockHandler,
  getPrivateNewsSearchArticlesMockHandler,
} from "../../generated/msw";
import { type SampleRoute, sampleRoute } from "../registry";
export const newsSamples: SampleRoute[] = [
  sampleRoute(getPrivateNewsListEditionsMockHandler, summaries, { shape: "page" }),
  sampleRoute(getPrivateNewsGetEditionMockHandler, [morning, legacy], {
    shape: "one",
    pick: (sample, params) => sample.id === params.id,
  }),
  sampleRoute(getPrivateNewsListFeedbackMockHandler, [editionFeedback, itemFeedback], {
    shape: "list",
  }),
  sampleRoute(getPrivateNewsSearchArticlesMockHandler, [article], { shape: "list" }),
  sampleRoute(
    getPrivateNewsGetTimelineMockHandler,
    [articleTimeline, filingTimeline, earningsTimeline],
    { shape: "list" },
  ),
  sampleRoute(getPrivateNewsListSourcesMockHandler, [source, failedSource], { shape: "list" }),
];
