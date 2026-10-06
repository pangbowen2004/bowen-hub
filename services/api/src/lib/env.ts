// Worker普通变量与绑定；密钥只在运行时从env读取。
export interface Bindings {
  DB: D1Database;
  PAPER_QA_RUNTIME?: DurableObjectNamespace;
  FILES: R2Bucket;
  APP_MODE: string;
  GITHUB_REPO: string;
  AUTH_BASE_URL: string;
  AUTH_RP_ID: string;
  AUTH_TRUSTED_ORIGINS: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  HUB_SERVICE_TOKEN?: string;
  GH_AUTOMATION_TOKEN?: string;
  OPENAI_API_KEY?: string;
  OBSERVATION_STARTED_ON?: string;
  EMAIL_SMTP_HOST?: string;
  EMAIL_SMTP_PORT?: string;
  EMAIL_SMTP_USER?: string;
  EMAIL_SMTP_PASSWORD?: string;
  EMAIL_FROM?: string;
  EMAIL_TO?: string;

  BETTER_AUTH_SECRET?: string;
  HUB_BOOTSTRAP_TOKEN?: string;
}
export type AppEnv = { Bindings: Bindings; Variables: { requestId: string } };
