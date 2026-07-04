import { escapeHtml, sendEmail } from "@/lib/email";

import type { ResetPasswordEmailData } from "./options";

// The auth-triggered password-reset email. Runtime-only: imports
// "cloudflare:workers" via lib/email.ts, so this module must never be pulled
// into lib/auth/options.ts (the Better Auth CLI runs that in Node) —
// index.ts injects this via buildAuthOptions.

export async function sendResetPasswordEmail(
  data: ResetPasswordEmailData,
): Promise<void> {
  // data.url is built and validated by Better Auth from its baseURL.
  await sendEmail({
    to: data.user.email,
    subject: "Reset your Senex password",
    html: [
      `<p>Someone (hopefully you) asked to reset the password for ${escapeHtml(data.user.email)}.</p>`,
      `<p><a href="${escapeHtml(data.url)}">Choose a new password</a> — the link expires in an hour.</p>`,
      `<p>If you didn't ask for this, you can ignore this email; your password is unchanged.</p>`,
    ].join("\n"),
    text: [
      `Someone (hopefully you) asked to reset the password for ${data.user.email}.`,
      ``,
      `Choose a new password (the link expires in an hour):`,
      data.url,
      ``,
      `If you didn't ask for this, you can ignore this email; your password is unchanged.`,
    ].join("\n"),
  });
}
