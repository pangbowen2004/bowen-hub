/** 范围只展开到实际PDF页数；非法引用保留校验哨兵，由pages_in_range标注。 */
export function extractCitationPages(text: string, totalPages: number): number[] {
  if (!Number.isSafeInteger(totalPages) || totalPages < 1) throw new Error("缺少真实 totalPages");
  const pages = new Set<number>();
  const invalid = () => pages.add(0);
  const add = (n: number) => {
    if (!Number.isSafeInteger(n) || n > 2147483647) invalid();
    else pages.add(n);
  };
  for (const match of text.matchAll(/\[论文\s+p{1,2}\.([^\]\r\n]*)\]/g)) {
    for (const item of match[1]!.split(/[、,，;；]/)) {
      const token = item.trim();
      if (/^\d+$/.test(token)) {
        add(Number(token));
        continue;
      }
      const range = token.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
      if (!range) {
        invalid();
        continue;
      }
      const first = Number(range[1]);
      const last = Number(range[2]);
      if (first > last) {
        invalid();
        continue;
      }
      // 保留非法端点供校验报告说明修改；绝不按未经信任的范围上限循环。
      if (first < 1 || first > totalPages) add(first);
      for (let page = Math.max(first, 1); page <= Math.min(last, totalPages); page++) add(page);
      if (last < 1 || last > totalPages) add(last);
    }
  }
  return [...pages];
}
