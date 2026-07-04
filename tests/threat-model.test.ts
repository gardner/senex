import { describe, expect, it } from "vitest";

import threatModelDoc from "../docs/threat-model.md?raw";
import followupsDoc from "../tickets/SECURITY-FOLLOWUPS.md?raw";

const threatModels = [
  "Offline Data Loss",
  "Anonymous Re-Identification",
  "Consent Bypass",
  "Account Takeover",
  "Research Export Misuse",
  "Trial-Contact Misuse",
  "Corrupt Import File",
  "Malicious JSON Import",
] as const;

const requiredThreatSections = [
  "Risks",
  "Current Mitigations",
  "Open Questions",
  "Follow-Up Tickets",
] as const;

describe("threat model notes", () => {
  it("keeps the E11 threat model workshop notes committed", () => {
    expect(threatModelDoc).toContain("Threat Model Workshop Notes");
    expect(threatModelDoc).toContain("Release Blocking Rule");
    expect(threatModelDoc).toContain("OWASP Threat Modeling Cheat Sheet");
    expect(threatModelDoc).toContain("NIST Privacy Framework");
    expect(threatModelDoc).toContain("NIST SP 800-188");
  });

  it("covers every required E11 threat model with risks, mitigations, questions, and follow-ups", () => {
    for (const threatModel of threatModels) {
      const section = sectionFor(threatModelDoc, threatModel);
      expect(section, threatModel).toBeTruthy();
      for (const requiredSection of requiredThreatSections) {
        expect(section).toContain(`### ${requiredSection}`);
      }
      expect(section).toMatch(/SEC-E11-\d{2}/);
    }
  });

  it("tracks follow-up tickets and release-blocking risk policy", () => {
    expect(followupsDoc).toContain("Security Follow-Up Tickets");
    expect(followupsDoc).toContain("Release Blocker");
    for (const threatModel of threatModels) {
      expect(followupsDoc).toContain(threatModel);
    }
    expect(threatModelDoc).not.toContain(
      "High-risk open release blocker: none",
    );
  });
});

function sectionFor(markdown: string, heading: string) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = markdown.indexOf("\n## ", start + heading.length + 3);
  return markdown.slice(start, next === -1 ? undefined : next);
}
