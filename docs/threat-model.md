# Threat Model Workshop Notes

Scope: E11-T05 baseline threat model for the current Senex local-first cognitive
monitoring app, Anonymous Reporting, signed-in account sync, research export
ops, and trial-contact workflows.

Method: this note uses the OWASP Threat Modeling Cheat Sheet's four-step shape:
decompose the app, identify/rank threats, choose mitigations, then review and
validate. Privacy risks use the NIST Privacy Framework framing for identifying
and managing privacy risk, plus NIST SP 800-188's reminder that
re-identification risk is a specific privacy risk for de-identified datasets.

Sources:

- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- [OWASP Top 10: Broken Access Control](https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/)
- [OWASP Top 10: Identification and Authentication Failures](https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)
- [NIST SP 800-188 De-Identifying Government Datasets](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-188.pdf)

## Release Blocking Rule

Any follow-up marked `Release Blocker: yes` in
[SECURITY-FOLLOWUPS.md](../tickets/SECURITY-FOLLOWUPS.md) blocks the named
release surface until it is resolved, downgraded with written rationale, or
explicitly descoped from that release. External partner research exports and
trial recruiter workflows are separate release surfaces from the private
local-first MVP.

## Offline Data Loss

### Risks

- A private-mode user loses local IndexedDB history when a device is lost,
  reset, storage is cleared, or the browser evicts origin storage.
- Users may overestimate local persistence and fail to create JSON backups.
- Backup files can be misplaced or overwritten because they are user-managed.

### Current Mitigations

- Offline Mode keeps data local by default and never uploads automatically.
- JSON export/import exists, validates schema versions, and rejects corrupt or
  unknown future versions.
- Local storage status and persistence messaging are covered by browser tests.
- Account sync is opt-in and keeps the local browser copy.

### Open Questions

- Should the app show recurring backup reminders after a baseline is formed?
- Should encrypted local backups be a v1 requirement or a post-MVP hardening
  item?
- What retention language should appear in onboarding for shared devices?

### Follow-Up Tickets

- `SEC-E11-01` Backup reminder cadence and copy.
- `SEC-E11-08` Encrypted backup decision.

## Anonymous Re-Identification

### Risks

- Longitudinal task data plus coarse demographics can become identifying,
  especially in small cohorts.
- Research exports may reveal rare questionnaire combinations or device/input
  patterns.
- Operators may incorrectly describe pseudonymous datasets as anonymous.

### Current Mitigations

- Anonymous Reporting uses a random study ID instead of account identity.
- Ingestion, status dashboards, and data-quality dashboards redact raw study
  IDs and idempotency keys.
- Research export manifests store hashed study filters and deterministic export
  keys rather than raw anonymous study IDs.
- Copy says pseudonymous/anonymous reporting carefully and does not promise
  impossible anonymity.

### Open Questions

- What minimum cell-size rule should apply before external partner export?
- Which questionnaire fields should be bucketed or suppressed for small cohorts?
- Who approves the re-identification risk assessment for each export?

### Follow-Up Tickets

- `SEC-E11-02` Research export small-cell review checklist.
- `SEC-E11-03` Partner export approval log.

## Consent Bypass

### Risks

- A client could submit a payload containing categories not granted in the
  consent snapshot.
- Account sync could be mistaken for research consent.
- A future route could reuse local history without applying the consent gate.

### Current Mitigations

- Server ingestion validates that data-bearing categories are covered by the
  submitted consent snapshot.
- Missing consent is treated as not uploadable.
- Anonymous-to-account linking requires a separate explicit local consent event.
- Tests cover consent-scope rejection and anonymous reporting withdrawal.

### Open Questions

- Should every new upload/export route declare its consent category matrix in a
  central registry?
- Should admin views show consent-version distribution next to all exports?
- Should consent-bypass tests be required in PR templates for data routes?

### Follow-Up Tickets

- `SEC-E11-04` Route consent matrix registry.
- `SEC-E11-05` PR checklist for new data movement routes.

## Account Takeover

### Risks

- A compromised account can sync, export, or request deletion for that account's
  history.
- Weak passwords or credential reuse can expose account-linked data.
- Session theft can bypass normal sign-in friction.

### Current Mitigations

- Better Auth protects account APIs through server-side session checks.
- Account sync rejects payloads for another account ID.
- Account export and deletion request APIs require authentication before
  reading or writing account data.
- Browser and integration tests cover signed-out redirects and account scoping.

### Open Questions

- What production rate limits are required for sign-in, sign-up, password reset,
  and bearer-token paths?
- Should MFA be required for staff/admin accounts before any external pilot?
- How should suspicious account-export or deletion-request activity be reviewed?

### Follow-Up Tickets

- `SEC-E11-06` Auth rate-limit and lockout plan.
- `SEC-E11-07` Staff/admin MFA requirement.

## Research Export Misuse

### Risks

- An admin could generate an export outside the approved purpose.
- Exported datasets can be copied after download and are not revocable by D1
  state changes.
- A broad category export can include more data than a study needs.

### Current Mitigations

- Research export routes require admin role, purpose, approval reference, and
  explicit category selection.
- Export manifests are stored in D1 with category counts, schema versions,
  consent versions, and exclusion counts.
- Future exclusions skip submissions with non-`none`
  `deletion_request_status`.
- The export UI states that the dataset is returned once and the manifest is
  stored.

### Open Questions

- Should production exports require two-person approval before download?
- Should exported JSON be written to R2 with expiring access instead of a data
  URL in the admin browser?
- Which exports require legal/privacy review before release to a partner?

### Follow-Up Tickets

- `SEC-E11-02` Research export small-cell review checklist.
- `SEC-E11-03` Partner export approval log.

## Trial-Contact Misuse

### Risks

- Trial-contact opt-in could be confused with study enrolment.
- Contact preferences or eligibility answers could leak into research exports.
- Recruiters could contact users beyond the consented purpose or after opt-out.

### Current Mitigations

- Trial contact is signed-in only and separate from Anonymous Reporting.
- Trial-contact profile data is stored in separate current/profile event tables.
- Account export includes trial contact in a separate `trialContact` block.
- Research exports do not read trial-contact tables.
- Copy states that trial contact is not study enrolment.

### Open Questions

- Who can view or export trial-contact profiles in production?
- What cadence should require users to re-review contact preferences?
- What operational process confirms opt-out before any recruiter contact list is
  used?

### Follow-Up Tickets

- `SEC-E11-09` Trial-contact staff role separation.
- `SEC-E11-10` Trial-contact recruiter export gate.

## Corrupt Import File

### Risks

- A damaged backup could partially overwrite valid local history.
- Unknown future schema versions could downgrade or mis-map records.
- Duplicate or conflicting local IDs could make trends unreliable.

### Current Mitigations

- Import preview validates schema before restore.
- Replace/merge flows record local import audit entries.
- Restore rollback tests cover failed import behavior.
- Future local schema versions are rejected rather than migrated blindly.

### Open Questions

- Should users see a richer diff before merge/replace?
- Should backup files include a checksum for user-visible corruption detection?
- How should partial import failures be summarized for nontechnical users?

### Follow-Up Tickets

- `SEC-E11-11` User-visible import diff and checksum review.
- `SEC-E11-12` Import failure copy review.

## Malicious JSON Import

### Risks

- A crafted JSON file could try to inject unexpected object shapes, huge arrays,
  prototype keys, or hostile strings into local storage.
- Overlarge files can create browser memory pressure.
- Imported text might later render in UI surfaces.

### Current Mitigations

- Import validation uses structured schema checks before writing.
- Unknown schema versions and invalid relationships are rejected.
- User copy and dashboard copy avoid rendering arbitrary questionnaire free text
  in privileged/admin surfaces.
- Browser import tests cover invalid previews and rollback behavior.

### Open Questions

- What maximum backup file size should be enforced before parsing?
- Should import validation reject reserved object keys such as `__proto__` even
  when they are not expected fields?
- Should a fuzz corpus run in CI for local backup import parsing?

### Follow-Up Tickets

- `SEC-E11-13` Import size limit and reserved-key guard.
- `SEC-E11-14` Malicious import fuzz corpus.
