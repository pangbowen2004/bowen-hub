import config from "../../../../config/cloud_clock.json";
import { sendClockMail } from "./clock-mail";
import type { Bindings } from "./env";
import calendar from "./schedule-calendar.json";

type Job = { name: string; date: string; due: number; deadline: number; kind?: string };
type State = {
  dispatchedAt?: string;
  alertSentAt?: string;
  result?: string;
  error?: string;
  failedAt?: string;
};
const MINUTE = 60000;
export function dueJobs(now: Date): Job[] {
  const date = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  const local = (time: string) => Date.parse(`${date}T${time}:00+08:00`);
  const jobs: Job[] = [
    {
      name: "news-morning",
      date,
      kind: "morning",
      due: local(config.morningStart),
      deadline: local(config.morningDeadline),
    },
    {
      name: "data-export",
      date,
      due: local(config.backupStart),
      deadline: Number.POSITIVE_INFINITY,
    },
  ];
  if (calendar.aShare.includes(date))
    jobs.push({
      name: "market-eod",
      date,
      due: local(config.marketStart),
      deadline: local(config.marketDeadline),
    });
  const open = (calendar.nyse as Record<string, string>)[date];
  if (open)
    jobs.push({
      name: "news-premarket",
      date,
      kind: "premarket",
      due: Date.parse(open) - config.premarketMinutesBeforeOpen * MINUTE,
      deadline: Date.parse(open),
    });
  return jobs.filter((job) => now.getTime() >= job.due);
}
async function readDocument<T>(env: Bindings, key: string): Promise<T | null> {
  const row = await env.DB.prepare("SELECT payload FROM documents WHERE key = ?")
    .bind(key)
    .first<{ payload: string }>();
  return row ? (JSON.parse(row.payload) as T) : null;
}
async function save(env: Bindings, key: string, data: unknown, now: Date) {
  await env.DB.prepare(
    "INSERT INTO documents(key,payload,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at",
  )
    .bind(key, JSON.stringify(data), now.toISOString())
    .run();
}
async function complete(env: Bindings, job: Job): Promise<boolean> {
  if (job.kind)
    return Boolean(
      await env.DB.prepare(
        "SELECT id FROM editions WHERE date=? AND kind=? AND email_sent_at IS NOT NULL",
      )
        .bind(job.date, job.kind)
        .first(),
    );
  if (job.name === "market-eod")
    return Boolean(
      await env.DB.prepare("SELECT date FROM market_days WHERE date=? AND complete=1")
        .bind(job.date)
        .first(),
    );
  return Boolean(
    await env.DB.prepare("SELECT id FROM runs WHERE job=? AND date=? AND status='succeeded'")
      .bind(job.name, job.date)
      .first(),
  );
}
async function github(
  env: Bindings,
  path: string,
  body?: unknown,
  method?: string,
): Promise<Response> {
  if (!env.GH_AUTOMATION_TOKEN) throw new Error("GitHub调度令牌未配置");
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${env.GH_AUTOMATION_TOKEN}`,
      "User-Agent": "bowen-hub-clock",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`GitHub调度请求失败（HTTP ${response.status}）`);
  return response;
}
export async function checkClock(
  env: Bindings,
  now = new Date(),
  notify = sendClockMail,
): Promise<void> {
  const day = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  const results: Record<string, State> = {};
  if (day > calendar.end) {
    const key = `clock-calendar:${day}`;
    if (!(await readDocument(env, key))) {
      await notify(
        env,
        "⚠️ 调度交易日历需要更新",
        `当前交易日历只覆盖至${calendar.end}，不把未知日期猜成交易日。`,
      );
      await save(env, key, { notifiedAt: now.toISOString() }, now);
    }
    throw new Error("调度交易日历超出覆盖期");
  }
  for (const job of dueJobs(now)) {
    const key = `clock:${job.name}:${job.date}`;
    const state = (await readDocument<State>(env, key)) || {};
    try {
      if (await complete(env, job)) {
        state.result = "已产出";
      } else if (now.getTime() >= job.deadline) {
        state.result = "截止仍无产出";
        state.failedAt ||= now.toISOString();
        if (!state.alertSentAt) {
          await notify(
            env,
            `⚠️ ${job.name} ${job.date} 未按时完成`,
            `截至检查时，D1没有当天已完成产出。\n工作流：https://github.com/${env.GITHUB_REPO}/actions/workflows/${job.name}.yml\n不会强制重跑或覆盖已发送版次。`,
          );
          state.alertSentAt = now.toISOString();
        }
      } else if (
        !state.dispatchedAt ||
        now.getTime() - Date.parse(state.dispatchedAt) >= config.retryMinutes * MINUTE
      ) {
        const workflow = await github(env, `actions/workflows/${job.name}.yml`);
        const details = (await workflow.json()) as { state: string };
        if (details.state.startsWith("disabled")) {
          await github(env, `actions/workflows/${job.name}.yml/enable`, undefined, "PUT");
          await notify(
            env,
            `⚠️ 已恢复${job.name}定时任务`,
            `GitHub工作流状态为${details.state}，已恢复启用；保留Cloudflare时钟和GitHub备用定时。`,
          );
        }
        const response = await github(env, `actions/workflows/${job.name}.yml/runs?per_page=30`);
        const data = (await response.json()) as {
          workflow_runs: { status: string; created_at: string }[];
        };
        const active = data.workflow_runs.some(
          (run) => run.status !== "completed" && Date.parse(run.created_at) >= job.due,
        );
        if (!active) {
          await github(env, `actions/workflows/${job.name}.yml/dispatches`, {
            ref: "main",
            inputs: { date: job.date, force: "false" },
          });
          state.dispatchedAt = now.toISOString();
          state.result = "已派发";
        } else state.result = "GitHub运行中";
      }
      delete state.error;
    } catch (error) {
      state.error = error instanceof Error ? error.message : "调度失败";
    }
    results[job.name] = state;
    await save(env, key, state, now);
  }
  // 真实每日记录留在现有D1；晚成功不抹掉已发送的截止告警。
  await save(
    env,
    `clock-daily:${day}`,
    { checkedAt: now.toISOString(), jobs: results, calendarEnd: calendar.end },
    now,
  );
}

/** 上线日期由G3切换时配置；每日真实检查，不压缩或伪造14天。 */
export async function observeProduction(
  env: Bindings,
  now = new Date(),
  notify = sendClockMail,
): Promise<void> {
  if (!env.OBSERVATION_STARTED_ON) return;
  const day = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  if (day < env.OBSERVATION_STARTED_ON) return;
  const key = `production-observation:${day}`;
  const previous = await readDocument<{
    checkedAt: string;
    problems: string[];
    alertSentAt?: string;
  }>(env, key);
  if (previous && now.getTime() - Date.parse(previous.checkedAt) < 60 * MINUTE) return;
  const problems = [...(previous?.problems || [])];
  for (const site of ["bowen-market-observatory", "bowen-paper-library"]) {
    try {
      const response = await fetch(`https://${site}.pages.dev/`, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok && !problems.includes(site)) problems.push(site);
      await response.body?.cancel();
    } catch {
      if (!problems.includes(site)) problems.push(site);
    }
  }
  const daily = await readDocument<{ jobs: Record<string, State> }>(env, `clock-daily:${day}`);
  for (const [job, state] of Object.entries(daily?.jobs || {})) {
    if ((state.failedAt || state.error) && !problems.includes(job)) problems.push(job);
  }
  const record = {
    startedOn: env.OBSERVATION_STARTED_ON,
    checkedAt: now.toISOString(),
    problems,
    alertSentAt: previous?.alertSentAt,
  };
  if (problems.length && !record.alertSentAt) {
    await notify(
      env,
      `⚠️ 上线观察 ${day} 出现问题`,
      `实际检查失败：${problems.join("、")}。当天记录保留，不会被后来的成功覆盖。`,
    );
    record.alertSentAt = now.toISOString();
  }
  await save(env, key, record, now);
}
