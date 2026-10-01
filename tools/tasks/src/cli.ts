// 命令行入口共用：打印结果、设置退出码；意外错误打印成一行中文说明。
export type RunResult = { code: number; output: string[] };

export function runMain(name: string, run: () => RunResult): void {
  try {
    const result = run();
    for (const line of result.output) console.log(line);
    process.exitCode = result.code;
  } catch (error) {
    console.error(`${name} 出错：${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
