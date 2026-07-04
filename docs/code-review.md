# Code Review

GitHub Actions includes an OpenCodeReview workflow for pull requests. It can
post review comments automatically or when asked with `/open-code-review`.

## Required Secrets

The workflow expects repository secrets:

- `OCR_LLM_URL`
- `OCR_LLM_AUTH_TOKEN`
- `OCR_LLM_MODEL`

## Triage Process

Treat automated review as input, not authority. For each finding:

- Read the referenced code.
- Decide whether the issue is real, overstated, or wrong.
- Fix real bugs.
- Explain rejected findings clearly in the PR.

Automated reviewers often find useful edge cases, but they can misread this
stack. Verify against the actual code and runtime behavior.

## Local Review Checklist

- Does the change preserve local-first and consent boundaries from
  [PRD.md](PRD.md)?
- Are production operations still routed through reviewed deploy paths?
- Are secrets kept out of source, logs, tests, and documentation examples?
- Are new docs linked from the relevant index or README?
- Are tests added or updated for behavior changes?
