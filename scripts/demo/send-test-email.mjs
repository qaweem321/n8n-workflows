// Sends a plain-text email to the local GreenMail inbox over SMTP (no auth, no TLS: local testing only).
// Uses only Node's standard library, so the demo needs no mail package.
import { createConnection } from "node:net";

const HOST = "127.0.0.1";
const PORT = 3025;

export function sendTestEmail({ from, fromName, to, subject, text }) {
  const body = text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, ".."); // SMTP dot-stuffing
  const message = [
    `From: ${fromName} <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
    ".",
  ].join("\r\n");
  const commands = ["HELO demo.local", `MAIL FROM:<${from}>`, `RCPT TO:<${to}>`, "DATA", message, "QUIT"];

  return new Promise((resolve, reject) => {
    const socket = createConnection(PORT, HOST);
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\r\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (/^\d{3}-/.test(line)) continue; // multi-line reply, wait for the last line
        if (/^[45]/.test(line)) {
          socket.destroy();
          return reject(new Error(`SMTP error: ${line}`));
        }
        const next = commands.shift();
        if (next === undefined) return socket.end();
        socket.write(`${next}\r\n`);
      }
    });
    socket.on("end", resolve);
    socket.on("error", reject);
  });
}
