// 装饰器的测试夹具（tools/gen/test/annotations.test.ts 用）：不是正式契约，contracts/main.tsp 不导入它。
// 用来证明：@maxChars / @sourceQuote / @image 同时进了 OpenAPI 和 JSON Schema，@task 进了 OpenAPI，
// 而生成的 Zod 与 Pydantic 都不据此做校验。
import "@typespec/http";
import "@typespec/openapi";
import "@typespec/json-schema";
import "../../lib/decorators.js";
import "../../common.tsp";

using Http;
using TypeSpec.JsonSchema;

@service(#{ title: "annotations fixture" })
@jsonSchema
namespace BowenHub;

/** 三种标注都用上的能力输出 */
model AnnotatedOutput {
  @maxChars(80) whatHappened: string;
  @maxChars(60) points: string[];
  @sourceQuote quote: string;
  @image pageImages: int32[];
}

@route("/fixture")
namespace Routes.Fixture {
  @task("T01")
  @post
  op echo(@body body: AnnotatedOutput): AnnotatedOutput;
}
