import type { connect } from "cloudflare:sockets";
import { expect, it, vi } from "vitest";
import { sendClockMail } from "../src/lib/clock-mail";
import type { Bindings } from "../src/lib/env";

it.each([465, 587])("SMTP %i先完成TLS，再认证，DATA获接受才算发送", async (port) => {
  const commands: string[] = [];
  const encoder = new TextEncoder();
  let upgraded = port === 465;
  const makeSocket = (greeting: boolean): ReturnType<typeof connect> => {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
        if (greeting) c.enqueue(encoder.encode("220 ready\r\n"));
      },
    });
    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        const command = new TextDecoder().decode(chunk).trim();
        commands.push(command);
        let code = 250;
        if (command === "STARTTLS") code = 220;
        else if (command === "AUTH LOGIN") {
          expect(upgraded).toBe(true);
          code = 334;
        } else if (command === btoa("user")) code = 334;
        else if (command === btoa("password")) code = 235;
        else if (command === "DATA") code = 354;
        controller.enqueue(encoder.encode(`${code} accepted\r\n`));
      },
    });
    return {
      readable,
      writable,
      opened: Promise.resolve(),
      close: async () => {},
      startTls: () => {
        upgraded = true;
        return makeSocket(false);
      },
    } as unknown as ReturnType<typeof connect>;
  };
  const open = vi.fn(() => makeSocket(true)) as unknown as typeof connect;
  await sendClockMail(
    {
      EMAIL_SMTP_HOST: "smtp.test",
      EMAIL_SMTP_PORT: String(port),
      EMAIL_SMTP_USER: "user",
      EMAIL_SMTP_PASSWORD: "password",
      EMAIL_FROM: "from@example.test",
      EMAIL_TO: "to@example.test,second@example.test",
    } as Bindings,
    "通知",
    "实际失败",
    open,
  );
  expect(commands.filter((c) => c === "EHLO bowen-hub")).toHaveLength(port === 587 ? 2 : 1);
  expect(commands.includes("STARTTLS")).toBe(port === 587);
  expect(commands.filter((c) => c.startsWith("RCPT TO:"))).toHaveLength(2);
  expect(commands.at(-1)).toContain("Content-Transfer-Encoding: base64");
});
