import { connect } from "cloudflare:sockets";
import type { Bindings } from "./env";

/** 使用现有SMTP账户；仅传输失败通知，不记录SMTP回复或认证值。 */
export async function sendClockMail(
  env: Bindings,
  subject: string,
  text: string,
  openSocket = connect,
): Promise<void> {
  const {
    EMAIL_SMTP_HOST: host,
    EMAIL_SMTP_USER: user,
    EMAIL_SMTP_PASSWORD: password,
    EMAIL_FROM: from,
    EMAIL_TO: to,
  } = env;
  if (!host || !user || !password || !from || !to) throw new Error("失败通知SMTP配置缺失");
  const recipients = to.split(",").map((address) => address.trim());
  if ([from, ...recipients].some((s) => !/^[^\s<>@,]+@[^\s<>@,]+$/.test(s)))
    throw new Error("邮件地址格式错误");
  const port = Number(env.EMAIL_SMTP_PORT || "465");
  if (![465, 587].includes(port)) throw new Error("SMTP仅支持465 TLS或587 STARTTLS端口");
  let socket = openSocket(
    { hostname: host, port },
    { secureTransport: port === 465 ? "on" : "starttls", allowHalfOpen: false },
  );
  let reader = socket.readable.getReader();
  let writer = socket.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  const read = async (expected: number) => {
    for (;;) {
      const end = buffer.indexOf("\r\n");
      if (end >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (/^\d{3} /.test(line)) {
          if (Number(line.slice(0, 3)) !== expected) throw new Error("SMTP拒绝通知");
          return;
        }
      } else {
        const chunk = await reader.read();
        if (chunk.done) throw new Error("SMTP连接提前关闭");
        buffer += decoder.decode(chunk.value, { stream: true });
      }
    }
  };
  const command = async (value: string, expected: number) => {
    await writer.write(encoder.encode(`${value}\r\n`));
    await read(expected);
  };
  const base64 = (value: string) => btoa(String.fromCharCode(...encoder.encode(value)));
  const delivery = async () => {
    await socket.opened;
    await read(220);
    await command("EHLO bowen-hub", 250);
    if (port === 587) {
      await command("STARTTLS", 220);
      reader.releaseLock();
      writer.releaseLock();
      socket = socket.startTls();
      reader = socket.readable.getReader();
      writer = socket.writable.getWriter();
      buffer = "";
      await socket.opened;
      await command("EHLO bowen-hub", 250);
    }
    await command("AUTH LOGIN", 334);
    await command(base64(user), 334);
    await command(base64(password), 235);
    await command(`MAIL FROM:<${from}>`, 250);
    for (const recipient of recipients) await command(`RCPT TO:<${recipient}>`, 250);
    await command("DATA", 354);
    const body =
      base64(text)
        .match(/.{1,76}/g)
        ?.join("\r\n") || "";
    await command(
      `From: <${from}>\r\nTo: ${recipients.map((address) => `<${address}>`).join(", ")}\r\nSubject: =?UTF-8?B?${base64(subject)}?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${body}\r\n.`,
      250,
    );
    // DATA获接受即完成，QUIT失败不重发。
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      delivery(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void socket.close();
          reject(new Error("SMTP通知超时"));
        }, 20000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    reader.releaseLock();
    writer.releaseLock();
    await socket.close();
  }
}
