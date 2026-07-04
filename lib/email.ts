import { env } from "cloudflare:workers";

// AIDEV-NOTE: The ONLY place the app sends email (same isolation rule as
// lib/auth/). Cloudflare Email Sending via the EMAIL send_email binding,
// configured in wrangler.jsonc. Transactional mail only (e.g. password
// resets) — never marketing. See docs/email-sending.md.

const FROM = { email: "no-reply@senex.nz", name: "Senex" };

export interface SendEmailOptions {
  to: string;
  subject: string;
  /** Both bodies are required: some clients render only plain text, and
   * text-less mail scores worse with spam filters. */
  html: string;
  text: string;
}

/** Escape a user-controlled value for interpolation into an HTML body. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  for (const field of ["to", "subject", "html", "text"] as const) {
    if (!options[field].trim()) {
      throw new Error(`sendEmail: "${field}" must not be empty`);
    }
  }
  await env.EMAIL.send({ from: FROM, ...options });
}
