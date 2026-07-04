import { describe, expect, it } from "vitest";

import { escapeHtml, sendEmail } from "@/lib/email";

// lib/email.ts is the single chokepoint for outbound mail. These cover the
// parts that don't need a live EMAIL binding: HTML escaping (used on every
// user-controlled value) and the empty-field guard that fires before any
// send is attempted. Real delivery via Cloudflare Email Sending is exercised
// against the running service, not in unit tests.

describe("escapeHtml", () => {
  it("escapes the HTML-significant characters", () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Reset your password")).toBe("Reset your password");
  });
});

describe("sendEmail validation", () => {
  const valid = {
    to: "user@example.com",
    subject: "Hello",
    html: "<p>Hello</p>",
    text: "Hello",
  };

  it.each(["to", "subject", "html", "text"] as const)(
    "throws when %s is blank, before attempting a send",
    async (field) => {
      await expect(sendEmail({ ...valid, [field]: "   " })).rejects.toThrow(
        `"${field}" must not be empty`,
      );
    },
  );
});
