import { describe, expect, it } from "vitest";

import releaseGatesDoc from "../docs/release-gates.md?raw";

const releases = [
  "Release 0.1",
  "Release 0.2",
  "Release 0.3",
  "Release 0.4",
  "Release 0.5",
  "Release 1.0",
] as const;

const gateSections = [
  "Quality Gate",
  "Accessibility Gate",
  "Privacy And Security Gate",
  "Deployment Gate",
  "Data Migration Gate",
  "Reviewer Sign-Off",
] as const;

describe("release gates", () => {
  it("keeps explicit release checklists for every planned release", () => {
    expect(releaseGatesDoc).toContain("Release Gates");
    expect(releaseGatesDoc).toContain("Cloudflare Workers Builds");
    expect(releaseGatesDoc).toContain("GitHub deployment environments");
    expect(releaseGatesDoc).toContain("FDA General Wellness");

    for (const release of releases) {
      const section = sectionFor(releaseGatesDoc, release);
      expect(section, release).toBeTruthy();
      expect(section).toContain("Must-pass checks");
      for (const gateSection of gateSections) {
        expect(section).toContain(`### ${gateSection}`);
      }
    }
  });

  it("keeps the public MVP gate tied to privacy and clinical-claim review", () => {
    const releaseOne = sectionFor(releaseGatesDoc, "Release 1.0");
    expect(releaseOne).toContain("Privacy Review");
    expect(releaseOne).toContain("Clinical-Claim Boundary Review");
    expect(releaseOne).toContain("docs/threat-model.md");
    expect(releaseOne).toContain("docs/copy-safety.md");
  });
});

function sectionFor(markdown: string, heading: string) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = markdown.indexOf("\n## ", start + heading.length + 3);
  return markdown.slice(start, next === -1 ? undefined : next);
}
