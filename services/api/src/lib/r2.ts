import { ApiError } from "./problem";
/** 直接传递流，不把PDF/PNG或邮件归档整块读进内存。 */
export async function readFile(bucket: R2Bucket, key: string): Promise<Response> {
  const object = await bucket.get(key);
  if (!object) throw new ApiError(404, "文件不存在");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
export async function writeFile(
  bucket: R2Bucket,
  key: string,
  body: ReadableStream | null,
  contentType: string,
  contentLength?: number,
): Promise<void> {
  if (body && contentLength !== undefined) {
    const fixed = new FixedLengthStream(contentLength);
    await Promise.all([
      body.pipeTo(fixed.writable),
      bucket.put(key, fixed.readable, { httpMetadata: { contentType } }),
    ]);
    return;
  }
  await bucket.put(key, body, { httpMetadata: { contentType } });
}
