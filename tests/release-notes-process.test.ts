import { describe, expect, it } from "vitest";

import prTemplate from "../.github/pull_request_template.md?raw";
import releaseNotesDoc from "../docs/release-notes.md?raw";
import releaseNotesTemplate from "../docs/releases/TEMPLATE.md?raw";
import ticketsReadme from "../tickets/README.md?raw";

describe("release notes process", () => {
  it("keeps a lightweight release notes process and template committed", () => {
    expect(releaseNotesDoc).toContain("Release Notes Process");
    expect(releaseNotesDoc).toContain(
      "GitHub automatically generated release notes",
    );
    expect(releaseNotesDoc).toContain("Keep a Changelog");
    expect(releaseNotesDoc).toContain(
      "FTC Health Products Compliance Guidance",
    );
    expect(releaseNotesTemplate).toContain("Product Behavior Changes");
    expect(releaseNotesTemplate).toContain("Migration Notes");
    expect(releaseNotesTemplate).toContain("Consent And Data-Sharing Changes");
    expect(releaseNotesTemplate).toContain("Known Limitations");
  });

  it("connects user-visible work to release notes and claim safety", () => {
    expect(ticketsReadme).toContain("user-visible behavior");
    expect(ticketsReadme).toContain("release notes");
    expect(prTemplate).toContain("Release notes");
    expect(releaseNotesTemplate).toContain("Unsupported Medical Claims");
    expect(releaseNotesTemplate).toContain("docs/copy-safety.md");
  });
});
