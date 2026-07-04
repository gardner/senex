# Engineering Implementation Plan: Browser-Based Cognitive Monitoring

## 0. Implementation strategy

Build the product as a **local-first cognitive testing platform** with optional reporting and account sync layered on top.

The central engineering idea:

> Every test session is created locally first, scored locally, stored locally, and then optionally exported, reported anonymously, or synced to an account depending on the user’s mode and consent state.

This keeps Offline Mode honest, makes Anonymous Reporting a controlled upload path, and avoids making Signed-In Mode a special snowflake.

Because you plan to deploy on Cloudflare using **vinext**, add an early compatibility spike. vinext is currently described as an experimental Vite-based reimplementation of the Next.js API surface, with Cloudflare Workers as its first natively supported target; its own FAQ says OpenNext is the safer mature option for production-like Next.js compatibility, while vinext has less long-tail API coverage. Build the app so the product logic, test engine, scoring, and storage adapters are not tightly coupled to framework-specific features. ([vinext][1]) ([GitHub][2])

---

# 1. Guiding architecture

## 1.1 Main product layers

Use these layers conceptually:

```text
UI layer
  Onboarding
  Test runner
  Dashboard
  Settings
  Consent flows
  Export/import
  Research/trial flows

Domain layer
  Test definitions
  Stimulus generation
  Trial validation
  Scoring
  Baseline calculation
  Trend calculation
  Consent rules
  Data quality rules

Persistence layer
  Local browser storage
  JSON import/export
  Anonymous reporting upload
  Signed-in account sync

Server layer
  Anonymous reporting API
  Account API
  Research dataset pipeline
  Consent ledger
  Trial-contact registry
  Admin/research operations, later

Analytics layer
  Score aggregation
  Quality filtering
  Longitudinal trend modelling
  Research exports
  Validation dashboards
```

The most important separation is:

```text
Test engine != UI
Scoring engine != backend
Consent state != account state
Local data model != server-only data model
```

That gives us room to run fully offline, upload selectively, and evolve the backend later.

---

# 2. Technology assumptions and constraints

## 2.1 Frontend/runtime

Assumption:

- Browser-based PWA-style application.
- vinext / Next-compatible app structure.
- Cloudflare deployment target.
- Local-first behavior.
- Test execution must continue even with no network connection.

Cloudflare’s official Workers docs currently position OpenNext as the main documented path for deploying Next.js apps to Workers, while vinext positions itself as a Cloudflare Workers-friendly Vite implementation of the Next.js API surface. Treat vinext as the planned path, but put compatibility checks into CI early. ([Cloudflare Docs][3]) ([vinext][1])

## 2.2 Browser APIs

Use `performance.now()` for reaction-time and trial timing because it provides high-resolution monotonic timestamps that are not tied to system clock adjustments. ([MDN Web Docs][4])

Use browser local persistence for Offline Mode. The app should request persistent storage where available, but browser behavior can vary; MDN notes that `StorageManager.persist()` may or may not be honored depending on browser-specific rules. This reinforces the need for visible JSON backup/export reminders. ([MDN Web Docs][5])

## 2.3 Cloudflare services

Recommended Cloudflare storage mapping for later implementation:

| Need                                         | Likely Cloudflare service              |
| -------------------------------------------- | -------------------------------------- |
| User/account relational records              | D1 or external Postgres via Hyperdrive |
| Large research exports, raw event archives   | R2                                     |
| Config, feature flags, consent-copy versions | KV                                     |
| Background ingestion, scoring, export jobs   | Queues                                 |
| Coordination/stateful workflows if needed    | Durable Objects                        |

Cloudflare’s own storage guide maps KV to key-value/config use cases, R2 to object/blob/log/dataset storage, D1 to lightweight relational data, Queues to background processing, and Durable Objects to coordinated state with strongly consistent storage. ([Cloudflare Docs][6])

Use Durable Objects only where coordination is actually needed. Cloudflare describes Durable Objects as stateful serverless objects with durable storage and strong consistency, useful for coordination; most of this product should not need that in v1. ([Cloudflare Docs][7])

---

# 3. Milestone roadmap

## Phase 0 — Project foundation and risk spike

**Goal:** Prove the framework/deployment/storage assumptions before building product depth.

### Workstreams

1. **Repository setup**
   - Create monorepo or single-app repo.
   - Use `pnpm`.
   - Set up linting, formatting, type checking, test runner, Playwright.
   - Add CI for unit, integration, and browser tests.
   - Add preview deployment pipeline.

2. **vinext compatibility spike**
   - Minimal app routes.
   - Client-only test page.
   - Server route/API handler.
   - Static assets.
   - Offline-capable shell.
   - Basic JSON upload/download.
   - Worker deployment.
   - Confirm known unsupported APIs.
   - Document “approved framework patterns.”

3. **Local storage spike**
   - Create local database abstraction.
   - Store profile, sessions, task runs, trial events.
   - Export JSON.
   - Import JSON.
   - Merge duplicate-safe restore.

4. **Timing spike**
   - Build raw reaction-time prototype.
   - Capture `performance.now()` timestamps.
   - Detect visibility changes, focus loss, tab switching.
   - Compare mouse, keyboard, and touch input latency qualitatively.

### Deliverables

- Running deployed skeleton.
- Local-first storage proof.
- JSON export/import proof.
- Reaction-time timing proof.
- Engineering decision record for vinext constraints.
- Initial data schema draft.

### Exit criteria

- App can deploy to Cloudflare.
- App can run a test page without login.
- App can save data locally.
- App can export/import JSON.
- Team has documented framework constraints and fallback options.

---

# 4. Phase 1 — Offline Mode MVP

**Goal:** Build the product’s core local-first experience.

Offline Mode is the foundation for everything else. Do not start with accounts. Do not start with research upload. Build the private mode first and make every later mode reuse it.

## 4.1 Offline user journeys

Implement:

1. First launch
2. Choose “Use privately on this device”
3. Complete minimal onboarding
4. Complete daily test
5. View baseline-forming dashboard
6. Return later and see prior history
7. Export JSON
8. Delete local data
9. Import JSON backup
10. Merge or replace history

## 4.2 Local data model

Core local entities:

```text
local_profile
  local_profile_id
  created_at
  display_name_optional
  mode
  schema_version
  app_version

sessions
  session_id
  profile_id
  started_at
  completed_at
  cadence
  context_snapshot
  quality_flags
  app_version
  schema_version

task_runs
  task_run_id
  session_id
  task_id
  task_version
  stimulus_pack_id
  stimulus_seed
  started_at
  completed_at
  summary_score
  quality_flags

trial_events
  trial_event_id
  task_run_id
  trial_index
  stimulus
  expected_response
  actual_response
  correct
  stimulus_onset_time
  response_time
  rt_ms
  event_flags

scores
  score_id
  session_id
  task_run_id
  domain
  metric_name
  raw_value
  normalized_value_optional
  confidence
  quality_flags

questionnaire_answers
  answer_id
  profile_id
  session_id_optional
  questionnaire_id
  question_id
  answer_value
  answered_at

consent_records
  consent_record_id
  profile_id
  mode
  consent_type
  version
  decision
  decided_at
```

Keep this data model mode-neutral. Offline Mode still has consent records, because local consent state matters when the user later migrates to Anonymous Reporting or Signed-In Mode.

## 4.3 JSON export/import

### Export requirements

Include:

```text
export_metadata
  export_id
  exported_at
  app_version
  schema_version
  profile_mode
  data_categories

profile
sessions
task_runs
trial_events
scores
questionnaire_answers
consent_records
stimulus_pack_references
```

### Import requirements

Import flow:

1. User selects JSON file.
2. App validates schema.
3. App shows summary:
   - Number of sessions
   - Date range
   - Data categories
   - Export version
   - Existing local data impact

4. User chooses:
   - Merge
   - Replace
   - Cancel

5. App deduplicates by stable IDs.
6. App reports success/failure.

### Data safety requirements

- Never silently overwrite.
- Never upload imported data without explicit consent.
- Preserve original timestamps.
- Preserve original consent records.
- Keep import audit record locally.

## 4.4 Offline dashboard

Build simple dashboard first:

- Today’s test status.
- Baseline status.
- Last 7/30 days completion.
- Reaction speed trend.
- Attention/processing trend once available.
- “Baseline forming” state.
- Export reminder.

Avoid population norms in v1. Use personal baseline only.

## 4.5 Offline Mode test modules

P0 implementation order:

1. **Reaction Time Sprint**
2. **Symbol Match**
3. **Arrow Focus**
4. **Sequence Tap**
5. **Pair Learning**
6. **Seven-Day Learning Week**

Do not implement all at once. Build one test end-to-end first, including local storage, scoring, dashboard display, quality flags, and export/import.

Recommended first test:

> Reaction Time Sprint

It exercises timing, quality flags, session storage, scoring, dashboard, and offline behavior.

---

# 5. Phase 2 — Test engine and scoring platform

**Goal:** Build a reusable system for repeatable cognitive tests.

## 5.1 Test definition structure

Each test should be described by a versioned test definition:

```text
task_id
task_version
domain
cadence
estimated_duration
instructions
practice_trials
stimulus_generation_rules
trial_count
response_types
valid_response_window
scoring_rules
quality_rules
accessibility_notes
```

This allows us to preserve historical meaning when tests evolve.

## 5.2 Stimulus generation

Requirements:

- Deterministic generation from seed.
- Store seed and task version with every task run.
- Support alternate forms.
- Support repeated-form learning tasks.
- Avoid accidental reuse where alternate forms are required.
- Preserve item-level difficulty metadata.

Examples:

```text
symbol_match
  seed -> symbol key + trial sequence

arrow_focus
  seed -> congruent/incongruent trial order

pair_learning
  seed -> item pairs + distractors + delayed recall order

seven_day_learning
  fixed monthly pack -> repeated across 7 days
```

## 5.3 Scoring principles

Every test should produce:

```text
raw metrics
domain metrics
quality flags
confidence score
human-readable result state
```

Example for Reaction Time Sprint:

```text
median_rt_ms
mean_rt_ms
rt_iqr
rt_variability
anticipation_count
lapse_count
valid_trial_count
fatigue_slope
quality_confidence
```

Example for Pair Learning:

```text
immediate_recall_accuracy
delayed_recall_accuracy
recognition_accuracy
first_attempt_errors
repeated_errors
learning_slope
forgetting_delta
```

## 5.4 Baseline logic

Implement a baseline state machine:

```text
not_started
forming
usable
stable
needs_recalibration
```

Initial baseline rules:

- First session is not enough.
- Show trends only after minimum data threshold.
- Show “baseline forming” until threshold met.
- Use conservative language when data quality is low.
- Recalculate baseline after enough valid sessions.
- Do not let poor-quality sessions dominate.

## 5.5 Quality flags

Add quality flags at multiple levels:

### Trial-level

- Too fast / anticipatory
- Too slow / lapse
- No response
- Multiple responses
- Invalid key/tap
- Stimulus render delay suspected

### Task-run-level

- Too few valid trials
- High lapse rate
- Accuracy below effort threshold
- Tab hidden
- Window blur
- Device/input changed
- Interrupted
- Self-reported distraction

### Session-level

- Incomplete session
- Unusual time of day
- Unusual device
- Poor sleep
- High stress
- Illness
- Medication/substance context
- User note present

## 5.6 Trend engine

Initial implementation:

- Rolling 7-day and 30-day summaries.
- Personal baseline comparison.
- Domain-level cards.
- Quality-weighted averages.
- Clear uncertainty states.

Later:

- Practice-effect adjustment.
- Device/input normalization.
- Time-of-day adjustment.
- Bayesian or mixed-effects trend modelling.
- Minimum detectable change estimates.

---

# 6. Phase 3 — Anonymous Reporting Mode

**Goal:** Add opt-in research contribution without accounts.

## 6.1 Anonymous identity

Implement:

```text
anonymous_study_id
created_at
local_profile_id
reporting_enabled
id_backup_status
consent_version
```

Requirements:

- Random study ID.
- Visible to user.
- Copy/export ID.
- Restore from JSON.
- Reset/start fresh.
- Pause reporting.
- Stop future reporting.
- Continue locally after stopping.

## 6.2 Consent flow

Build consent as a product subsystem, not a modal.

Consent categories:

```text
share_test_summaries
share_trial_level_data
share_session_context
share_demographics
share_questionnaires
allow_longitudinal_research_use
allow_approved_partner_access
```

Each consent record should include:

```text
consent_id
profile_id
subject_id
mode
category
decision
terms_version
decided_at
source_screen
app_version
```

## 6.3 Research questionnaires

Build a questionnaire engine rather than hard-coding forms.

Question types:

```text
single_choice
multi_choice
number
text_short
scale
date_or_year
prefer_not_to_say
```

Question metadata:

```text
question_id
version
required_for_reporting
required_for_trial_contact
sensitive
research_purpose
answer_visibility
```

P0 questionnaires:

1. Demographics
2. Digital/device familiarity
3. Sleep/stress baseline
4. Cognitive concerns
5. General health context
6. Session context check

## 6.4 Anonymous reporting upload

Reporting upload should be explicit and inspectable.

User choices:

```text
share_from_today_only
share_selected_date_range
share_all_existing_history
```

Submission payload categories:

```text
anonymous_study_id
consent_snapshot
profile_demographics
questionnaire_answers
session_summaries
task_run_summaries
trial_events_if_consented
quality_flags
schema_versions
```

## 6.5 Research data ingestion

Build the server-side ingestion as append-only.

Requirements:

- Validate payload schema.
- Validate consent snapshot.
- Reject data categories not covered by consent.
- Store raw submission envelope.
- Store normalized research records.
- Keep ingestion audit trail.
- Make uploads idempotent.
- Support retry from client.
- Support future deletion/exclusion requests where feasible.

## 6.6 Anonymous reporting dashboard

Display:

- Anonymous ID.
- Reporting on/off.
- Consent categories.
- Last successful upload.
- Number of sessions contributed.
- Demographics completion.
- Stop/pause reporting controls.
- Export backup reminder.

---

# 7. Phase 4 — Signed-In Mode

**Goal:** Add accounts, account-linked history, richer consent, and trial-contact opt-in.

## 7.1 Account creation and sign-in

Requirements:

- Create account.
- Sign in.
- Sign out.
- Recover access.
- Manage profile.
- Export account data.
- Delete account or request deletion.
- Import local/offline history.
- Link anonymous history only with explicit confirmation.

## 7.2 Migration into account

Supported flows:

```text
Offline -> Signed-In
Anonymous -> Signed-In
Signed-In -> local export
```

Critical confirmation screens:

- “Import local history into account?”
- “Link anonymous reporting history to your account?”
- “Share past history for research?”
- “Keep local-only copy?”

Never link anonymous reporting data to identifiable account data without a specific consent step.

## 7.3 Account data sync

Sync design:

- Local remains the source of test execution.
- Account sync uploads validated sessions.
- Server returns sync state.
- Client keeps a local cache.
- Conflict handling is append/merge, not destructive overwrite.
- Imported sessions retain original IDs and timestamps.

## 7.4 Signed-in consent center

Users can manage:

```text
research_data_sharing
demographics_sharing
questionnaire_sharing
trial_contact
study_specific_consents
communication_preferences
```

Consent UI must separate:

```text
Using the app
Sharing data for research
Being contacted for trials
Joining a specific trial/study
```

## 7.5 Trial-contact registry

Trial contact is not trial enrolment.

Trial opt-in record:

```text
account_id
trial_contact_enabled
preferred_contact_method
region
language
age_eligibility_info
broad_health_answers
remote_or_in_person_preference
care_partner_available_optional
last_updated_at
consent_version
```

Product rule:

- Anonymous Reporting users cannot be contacted for trials.
- Signed-In users can opt into contact.
- Trial-contact opt-in can be turned off any time.
- Trial matching should be manual/admin-only until governance is mature.

---

# 8. Phase 5 — Research operations and admin tooling

**Goal:** Support controlled research exports and internal QA.

Do not make a public researcher portal in v1. Start with internal tooling.

## 8.1 Internal admin requirements

Admin users need to:

- View aggregate submission counts.
- Monitor ingestion failures.
- Monitor data quality.
- View consent-version distribution.
- Export approved datasets.
- Exclude withdrawn users where feasible.
- Manage questionnaire versions.
- Manage test/stimulus versions.
- Manage research partner/study metadata.

## 8.2 Research export requirements

Exports should include:

```text
dataset_export_id
created_at
study_or_partner_id
approval_reference
data_categories
consent_filter
date_range
schema_version
export_manifest
```

Dataset records should preserve:

- Test version.
- Stimulus version.
- Scoring version.
- Consent version.
- Quality flags.
- Missing data codes.
- Mode: anonymous or signed-in research participant.
- No direct contact data unless specifically approved for trial workflows.

## 8.3 Study-specific modules

Later, allow:

- Study-specific consent.
- Study-specific questionnaires.
- Study-specific test cadence.
- Study-specific exports.
- Participant information sheets.
- Ethics/governance metadata.

---

# 9. Data model: server-side conceptual schema

## 9.1 Identity and profile

```text
subjects
  subject_id
  subject_type: anonymous | account
  created_at
  status

accounts
  account_id
  auth_provider_id
  email_hash_or_contact_reference
  created_at
  deleted_at

anonymous_identities
  anonymous_study_id
  subject_id
  created_at
  active
```

## 9.2 Consent

```text
consent_terms
  terms_id
  terms_type
  version
  effective_at
  content_hash

consent_events
  consent_event_id
  subject_id
  terms_id
  category
  decision
  decided_at
  source
```

## 9.3 Testing

```text
sessions
  session_id
  subject_id
  local_session_id
  started_at
  completed_at
  cadence
  context_summary
  quality_flags

task_runs
  task_run_id
  session_id
  task_id
  task_version
  stimulus_pack_id
  stimulus_seed
  started_at
  completed_at
  quality_flags

trial_events
  trial_event_id
  task_run_id
  trial_index
  event_payload
  rt_ms
  correct
  quality_flags

scores
  score_id
  task_run_id
  domain
  metric_name
  raw_value
  normalized_value
  scoring_version
  confidence
```

## 9.4 Questionnaires

```text
questionnaires
  questionnaire_id
  version
  purpose
  active

questions
  question_id
  questionnaire_id
  version
  data_category
  sensitivity
  requiredness

answers
  answer_id
  subject_id
  question_id
  questionnaire_version
  answer_value
  answered_at
```

## 9.5 Research ingestion

```text
research_submissions
  submission_id
  subject_id
  submitted_at
  payload_hash
  consent_snapshot
  accepted
  rejection_reason

research_exports
  export_id
  created_at
  purpose
  approval_reference
  data_categories
  record_count
  manifest
```

## 9.6 Trial contact

```text
trial_contact_profiles
  account_id
  enabled
  preferred_contact_method
  eligibility_summary
  last_updated_at
  consent_event_id
```

---

# 10. API surface: conceptual endpoints

Keep endpoint design simple and mode-specific.

## 10.1 Anonymous Reporting

```text
POST /reporting/anonymous/identity
POST /reporting/anonymous/submit
POST /reporting/anonymous/consent
POST /reporting/anonymous/withdraw
GET  /reporting/anonymous/status
```

## 10.2 Signed-In Mode

```text
POST /account/sessions/sync
GET  /account/history
POST /account/import
GET  /account/export
POST /account/delete-request
POST /account/consent
GET  /account/consent
POST /account/trial-contact
GET  /account/trial-contact
```

## 10.3 Research/admin

```text
GET  /admin/ingestion/status
GET  /admin/data-quality
POST /admin/research-export
GET  /admin/research-export/:id
POST /admin/questionnaires
POST /admin/stimulus-packs
```

These are conceptual, not final route specs.

---

# 11. Frontend implementation plan

## 11.1 Route groups

Suggested app sections:

```text
/
  Landing / mode chooser

/onboarding
  Mode selection
  Offline intro
  Anonymous reporting intro
  Signed-in intro
  Baseline setup

/test
  Daily session launcher
  Test runner
  Completion summary

/dashboard
  Personal trends
  Domain cards
  Baseline status
  Session history

/settings
  Profile
  Export/import
  Local data delete
  Mode migration
  Storage status

/research
  Consent
  Demographics
  Questionnaires
  Reporting dashboard

/account
  Sign in/up
  Account history
  Account export/delete
  Trial-contact settings
```

## 11.2 Test runner UX components

Reusable components:

```text
InstructionScreen
PracticeTrial
Countdown
StimulusStage
ResponsePad
KeyboardHandler
TouchTargetGrid
ProgressIndicator
PauseExitControl
QualityFlagBanner
CompletionSummary
```

## 11.3 Test runner state machine

```text
idle
loading_stimuli
instructions
practice
ready
running_trial
between_trials
paused
completed
aborted
error
```

Every test module should plug into the same state machine.

## 11.4 Dashboard components

```text
BaselineStatusCard
DailyCompletionCard
DomainTrendCard
SessionHistoryList
QualityFlagExplanation
ContextCorrelationNote
ExportReminder
ResearchContributionCard
TrialContactCard
```

## 11.5 Settings components

```text
ModeStatus
LocalStorageStatus
ExportDataButton
ImportDataFlow
DeleteLocalDataFlow
ConsentCenterLink
MigrationWizard
```

---

# 12. Test module implementation detail

## 12.1 Reaction Time Sprint

### Build first.

Features:

- Random delay before stimulus.
- Tap/click/keypress response.
- 20–40 trials.
- Practice trials.
- Anticipation detection.
- Lapse detection.
- Median RT.
- RT variability.
- Tab visibility tracking.
- Completion summary.

Engineering value:

- Validates timing.
- Validates event capture.
- Validates local storage.
- Validates scoring.
- Validates dashboard.
- Validates export/import.

## 12.2 Symbol Match

Features:

- Symbol-to-number key.
- Repeated quick matching.
- Accuracy and speed.
- Alternate forms by seed.
- Time-boxed task.

Metrics:

- Correct per minute.
- Error count.
- Median response time.
- Speed-accuracy balance.

## 12.3 Arrow Focus

Features:

- Congruent and incongruent arrow trials.
- Center-arrow response.
- Balanced trial types.
- Keyboard/touch support.

Metrics:

- Accuracy.
- Median RT.
- Conflict cost.
- False responses.
- Missed responses.

## 12.4 Sequence Tap

Features:

- Show tile sequence.
- User repeats forward.
- Later: backward variant.
- Adaptive span.

Metrics:

- Max span.
- Mean span.
- Order errors.
- Omission errors.

## 12.5 Pair Learning

Features:

- Learn pairs.
- Immediate recall.
- Distractor delay.
- Delayed recall.
- Recognition fallback.

Metrics:

- Immediate accuracy.
- Delayed accuracy.
- Forgetting delta.
- Error types.
- Learning slope.

## 12.6 Seven-Day Learning Week

Features:

- Fixed pack repeated across seven days.
- Same pack ID for the monthly week.
- Short daily recall.
- Missed-day handling.

Metrics:

- Day 1 baseline.
- Day 2–7 improvement.
- Learning slope.
- Area under learning curve.
- Retention after gap.

---

# 13. Privacy and consent implementation plan

## 13.1 Consent as data

Consent must be versioned, timestamped, and category-specific.

Do not store only:

```text
researchConsent: true
```

Store:

```text
category
decision
terms_version
decided_at
source
mode
data_scope
```

## 13.2 Consent gating

Before upload, the client should calculate an allowed data envelope:

```text
available_data - not_consented_categories = uploadable_data
```

Then the server should independently enforce the same rules.

## 13.3 Historical data sharing

When a user moves from Offline to Reporting or Signed-In research sharing:

Options:

```text
future_only
last_30_days
selected_range
all_history
```

Do not default to all-history sharing.

## 13.4 Withdrawal

Implement separately:

```text
pause_future_uploads
withdraw_research_consent
request_prior_data_exclusion
delete_local_data
delete_account
disable_trial_contact
```

Each has different consequences.

---

# 14. Local-first sync strategy

## 14.1 Core sync rule

All test data is created locally first.

Then:

```text
Offline Mode
  local only

Anonymous Reporting Mode
  local + consented research submission

Signed-In Mode
  local + account sync + optional research sharing
```

## 14.2 Idempotency

Every locally generated object should have a stable ID.

Server ingestion must tolerate:

- Duplicate uploads.
- Interrupted uploads.
- Retries.
- Partial submissions.
- Client restore from older backup.
- Out-of-order sessions.

## 14.3 Merge rules

Use append/merge semantics:

```text
same_id + same_hash = duplicate, ignore
same_id + different_hash = conflict, preserve both or flag
new_id = insert
deleted_local != server delete unless explicit deletion request
```

## 14.4 Offline queue

For Reporting and Signed-In Mode:

- Queue uploads locally.
- Retry when online.
- Show last sync/report status.
- Let user pause queue.
- Do not block testing because upload failed.

---

# 15. Quality assurance plan

## 15.1 Unit tests

Cover:

- Stimulus generation.
- Scoring.
- Baseline calculation.
- Trend calculation.
- Consent gating.
- JSON import validation.
- Merge/deduplication.
- Quality-flag logic.

## 15.2 Integration tests

Cover:

- Complete offline session.
- Export/import round trip.
- Anonymous reporting upload.
- Consent withdrawal.
- Account migration.
- Offline-to-signed-in import.
- Anonymous-to-signed-in linking.
- Trial-contact opt-in/out.

## 15.3 Browser tests

Use Playwright for:

- Desktop Chrome/Edge/Firefox/Safari where available.
- Mobile viewport simulation.
- Touch and keyboard flows.
- Offline network mode.
- Local storage persistence.
- Tab visibility interruption.
- Import/export flows.
- Accessibility checks.

## 15.4 Timing validation tests

For test-runner quality:

- Confirm all trial timestamps are monotonic.
- Confirm negative or impossible RTs are rejected.
- Confirm visibility changes flag sessions.
- Confirm focus loss flags sessions.
- Confirm very fast anticipations are excluded.
- Confirm missed responses are counted properly.

## 15.5 Data migration tests

Every schema version needs:

- Forward migration test.
- Import from older export.
- Merge with existing data.
- Invalid/corrupt JSON rejection.
- Partial data import behavior.

---

# 16. Security implementation plan

## 16.1 P0 security controls

- No automatic upload in Offline Mode.
- Strong consent gates.
- Server-side validation of consent scope.
- Authentication for signed-in account APIs.
- Least-privilege access to research/admin APIs.
- Audit logs for research exports.
- Clear account deletion path.
- Sensitive data separated from trial contact data.
- Avoid direct identifiers in anonymous reporting payloads.

## 16.2 P1 security controls

- Optional encrypted local export.
- Admin role separation.
- Study-specific data-access approvals.
- Dataset export review workflow.
- Re-identification risk checks for small cohorts.
- Data retention controls.

## 16.3 Threat model workshops

Run short threat modelling sessions for:

1. Offline data loss.
2. Anonymous reporting re-identification.
3. Consent bypass.
4. Account takeover.
5. Research export misuse.
6. Trial-contact misuse.
7. Corrupt import file.
8. Maliciously crafted JSON import.

---

# 17. Accessibility implementation plan

## 17.1 P0 accessibility

- Large text and targets.
- Keyboard support.
- Touch support.
- No colour-only instructions.
- Practice trials.
- Plain-language instructions.
- Reduced animation by default.
- Pause/exit controls.
- High contrast.
- Clear error messages.

## 17.2 Accessibility testing

Test with:

- Keyboard-only navigation.
- Screen reader smoke tests.
- Large text mode.
- Mobile touch targets.
- Colour contrast checks.
- Older-adult usability sessions.

---

# 18. Observability and product telemetry

Important split:

```text
Product analytics != cognitive test data
```

For Offline Mode, product analytics should be absent or strictly opt-in.

For Reporting/Signed-In modes, analytics should respect consent and privacy settings.

## 18.1 Engineering telemetry

Collect only what is needed for reliability:

- App errors.
- Failed imports.
- Failed uploads.
- Failed syncs.
- Test abort reasons.
- Version adoption.
- Schema migration failures.

## 18.2 Cognitive data observability

Internal dashboards:

- Completion rates.
- Invalid trial rates.
- Quality flag frequency.
- Median task duration.
- Drop-off by test.
- Device/input distribution.
- Missing questionnaire fields.
- Upload retry rates.

---

# 19. Release plan

## Release 0.1 — Engineering prototype

Includes:

- Deployed shell.
- Local storage.
- Reaction Time Sprint.
- Export/import.
- Basic dashboard.

Audience:

- Internal only.

Exit gate:

- 50+ internal sessions without data loss.
- Export/import round trip reliable.
- Timing data plausible.

## Release 0.2 — Offline Alpha

Includes:

- Offline onboarding.
- Reaction Time Sprint.
- Symbol Match.
- Arrow Focus.
- Local dashboard.
- JSON backup/restore.
- Delete local data.

Audience:

- Internal + trusted testers.

Exit gate:

- No critical data-loss bugs.
- Usability feedback incorporated.
- Test completion rate acceptable.
- Quality flags working.

## Release 0.3 — Offline Beta

Includes:

- Sequence Tap.
- Pair Learning.
- Better baseline logic.
- Better reports.
- Export/import hardened.
- Accessibility pass.

Audience:

- Wider private beta.

Exit gate:

- Baseline formation stable.
- Import/export robust across browsers.
- Test instructions understood by non-technical users.

## Release 0.4 — Anonymous Reporting Alpha

Includes:

- Anonymous ID.
- Research consent.
- Demographics.
- Reporting upload.
- Reporting dashboard.
- Pause/stop future reporting.

Audience:

- Private research pilot.

Exit gate:

- Consent gating verified.
- Ingestion idempotent.
- Research payloads validated.
- Withdrawal flow works.

## Release 0.5 — Signed-In Alpha

Includes:

- Account creation/sign-in.
- Account history.
- Offline import.
- Anonymous linking.
- Signed-in consent center.
- Trial-contact checkbox.

Audience:

- Private signed-in beta.

Exit gate:

- Migration flows safe.
- Account export/delete works.
- Trial-contact opt-in is separate and auditable.

## Release 1.0 — Public MVP

Includes:

- Offline Mode.
- Anonymous Reporting Mode.
- Signed-In Mode.
- Core daily/weekly tests.
- JSON export/import.
- Consent center.
- Research dashboard.
- Trial-contact opt-in.
- Conservative trend reporting.

Exit gate:

- Privacy review complete.
- Security review complete.
- Accessibility review complete.
- Data retention/deletion policy implemented.
- Support docs complete.
- Clinical-claim language reviewed.

---

# 20. Team workstreams

## Workstream A — App platform

Owns:

- vinext app setup.
- Routing/layout.
- Deployment.
- PWA/offline shell.
- CI/CD.
- Browser compatibility.

## Workstream B — Test engine

Owns:

- Test runner state machine.
- Stimulus generation.
- Reaction-time capture.
- Input handling.
- Test modules.
- Quality flags.

## Workstream C — Scoring and trends

Owns:

- Raw scoring.
- Domain scoring.
- Baseline state.
- Trend summaries.
- Practice-effect modelling later.
- Score versioning.

## Workstream D — Local data and sync

Owns:

- Local database.
- Import/export.
- Schema migration.
- Sync queue.
- Deduplication.
- Data integrity.

## Workstream E — Research and consent

Owns:

- Consent center.
- Anonymous ID.
- Questionnaires.
- Reporting upload.
- Ingestion validation.
- Research export model.

## Workstream F — Accounts and trials

Owns:

- Authentication.
- Account history.
- Mode migration.
- Account export/delete.
- Trial-contact opt-in.
- Contact preference storage.

## Workstream G — QA, accessibility, safety

Owns:

- Test plans.
- Playwright.
- Accessibility checks.
- Copy safety review.
- Edge-case validation.
- Release gates.

---

# 21. Engineering backlog by epic

## Epic 1 — Project foundation

- Create repo.
- Configure package manager.
- Configure lint/type/test.
- Configure CI.
- Configure preview deployment.
- Add environment management.
- Add architecture decision record template.

## Epic 2 — Local data platform

- Define local schema v1.
- Implement local DB adapter.
- Implement migrations.
- Implement local profile.
- Implement session persistence.
- Implement task-run persistence.
- Implement trial-event persistence.
- Implement scores persistence.
- Add storage status UI.

## Epic 3 — JSON export/import

- Define export schema v1.
- Implement export.
- Implement schema validation.
- Implement import preview.
- Implement merge/replace.
- Implement duplicate detection.
- Implement corrupt file handling.
- Add round-trip tests.

## Epic 4 — Test runner

- Build test state machine.
- Build instruction/practice flow.
- Build input abstraction.
- Build timing utilities.
- Build quality flag capture.
- Build completion summary.
- Add runner tests.

## Epic 5 — Reaction Time Sprint

- Define task v1.
- Implement stimulus schedule.
- Implement response capture.
- Implement scoring.
- Implement quality rules.
- Add dashboard card.
- Add tests.

## Epic 6 — Symbol Match

- Define task v1.
- Implement seeded symbol key.
- Implement trials.
- Implement scoring.
- Add dashboard card.
- Add tests.

## Epic 7 — Arrow Focus

- Define task v1.
- Implement congruent/incongruent trials.
- Implement keyboard/touch response.
- Implement conflict-cost scoring.
- Add dashboard card.
- Add tests.

## Epic 8 — Sequence Tap

- Define task v1.
- Implement tile sequence display.
- Implement response replay.
- Implement span scoring.
- Add tests.

## Epic 9 — Pair Learning

- Define item-pair schema.
- Implement learning screen.
- Implement immediate recall.
- Implement delayed recall.
- Implement recognition.
- Implement scoring.
- Add tests.

## Epic 10 — Seven-Day Learning Week

- Define monthly pack logic.
- Implement repeated pack schedule.
- Implement missed-day logic.
- Implement learning-curve scoring.
- Add dashboard report.

## Epic 11 — Dashboard

- Build baseline status.
- Build domain cards.
- Build session history.
- Build trend charts.
- Build quality explanations.
- Build “what affects this” copy.
- Build monthly summary.

## Epic 12 — Offline onboarding

- Mode chooser.
- Offline explanation.
- Baseline setup.
- Context questions.
- First test launcher.
- Return-user flow.

## Epic 13 — Consent platform

- Consent terms versioning.
- Consent categories.
- Consent event storage.
- Consent UI.
- Consent history.
- Consent gating utilities.
- Tests.

## Epic 14 — Anonymous Reporting

- Anonymous ID generation.
- Reporting mode onboarding.
- Reporting dashboard.
- Upload queue.
- Research payload builder.
- Server ingestion.
- Idempotency.
- Pause/stop reporting.

## Epic 15 — Questionnaires

- Questionnaire schema.
- Question renderer.
- Demographics questionnaire.
- Session context questionnaire.
- Research profile completion state.
- Prefer-not-to-say support.
- Versioned answers.

## Epic 16 — Accounts

- Sign up/sign in.
- Account profile.
- Account history sync.
- Account export.
- Account deletion.
- Offline import.
- Anonymous-to-account migration.

## Epic 17 — Trial contact

- Trial-contact consent.
- Checkbox flow.
- Contact preferences.
- Eligibility questions.
- Opt-out.
- Admin-safe export placeholder.

## Epic 18 — Admin/research ops

- Ingestion status.
- Data quality dashboard.
- Consent audit view.
- Research export job.
- Export manifest.
- Withdrawal/exclusion tooling.

## Epic 19 — Accessibility and usability

- Keyboard navigation.
- Touch target audit.
- Screen reader smoke test.
- Colour contrast.
- Reduced motion.
- Usability testing scripts.
- Older-adult test sessions.

## Epic 20 — Security and privacy

- Threat model.
- Authz rules.
- Admin role design.
- Export audit logs.
- Data deletion workflows.
- Consent bypass tests.
- Re-identification risk checklist.

---

# 22. Definition of done

A feature is not done until it has:

- Product copy reviewed.
- Unit tests.
- Integration or Playwright coverage where relevant.
- Accessibility check.
- Error states.
- Empty states.
- Loading states.
- Data migration path if schema changed.
- Export/import behavior defined.
- Consent behavior defined if data can leave device.
- Documentation updated.
- Release notes entry.

For cognitive test modules specifically:

- Test definition versioned.
- Stimulus generation deterministic.
- Scoring versioned.
- Quality flags implemented.
- Practice mode included.
- Results stored locally.
- Export/import round trip works.
- Dashboard representation exists.
- Invalid/interrupted sessions handled.

---

# 23. Key implementation risks

## 23.1 Browser storage loss

Risk:

- Users may clear browser data or browser may evict storage.

Mitigation:

- Persistent storage request where supported.
- Clear local-storage status UI.
- Regular export reminders.
- JSON backup.
- Signed-in mode for users who want recovery.

## 23.2 Timing inconsistency across devices

Risk:

- Reaction-time values vary by device, browser, input method, refresh rate, and load.

Mitigation:

- Capture device/input/browser metadata.
- Compare users to their own baseline first.
- Flag device/input changes.
- Use median and variability, not one-off raw times.
- Avoid cross-device claims in v1.

## 23.3 Consent mistakes

Risk:

- Data uploaded beyond user’s consent.

Mitigation:

- Client-side consent envelope.
- Server-side consent enforcement.
- Consent snapshot attached to every submission.
- Automated tests for every consent category.
- Audit logs.

## 23.4 Anonymous re-identification

Risk:

- Demographics plus longitudinal data can become identifying.

Mitigation:

- Avoid absolute anonymity claims.
- Use pseudonymous language.
- Minimize sensitive fields.
- Use coarse demographic buckets where possible.
- Review research exports for small-cell risk.

## 23.5 Overclaiming clinical meaning

Risk:

- Users interpret trends as diagnosis.

Mitigation:

- Conservative copy.
- No disease labels in routine results.
- No “brain age.”
- Sustained-change language only.
- Clinical/safety copy review before launch.

## 23.6 Framework maturity

Risk:

- vinext incompatibilities block features.

Mitigation:

- Compatibility spike in Phase 0.
- Avoid unusual Next APIs.
- Keep core logic framework-agnostic.
- Maintain fallback deployment path.
- Add deployment smoke tests to CI.

---

# 24. First four sprints

## Sprint 1 — Foundation

- Set up app repo.
- Configure CI.
- Deploy hello-world app.
- Build local data adapter skeleton.
- Build local profile.
- Build basic settings page.
- Create architecture decision log.
- Start vinext compatibility notes.

## Sprint 2 — Reaction-time vertical slice

- Build test runner state machine.
- Implement Reaction Time Sprint.
- Store sessions/task runs/trials locally.
- Calculate basic score.
- Show completion summary.
- Add basic dashboard card.
- Add Playwright happy path.

## Sprint 3 — Export/import and quality flags

- Implement JSON export.
- Implement import preview.
- Implement merge/replace.
- Add storage status UI.
- Add visibility/focus quality flags.
- Add corrupt import tests.
- Add timing sanity tests.

## Sprint 4 — Offline Mode alpha

- Build first-run mode chooser.
- Build Offline Mode onboarding.
- Add Symbol Match or Arrow Focus.
- Add baseline-forming dashboard state.
- Add delete-local-data flow.
- Run internal usability test.
- Fix data-loss and comprehension issues.

---

# 25. Suggested sequencing after sprint 4

```text
Sprint 5: Arrow Focus / Symbol Match complete
Sprint 6: Sequence Tap + dashboard improvements
Sprint 7: Pair Learning
Sprint 8: Seven-Day Learning Week
Sprint 9: Consent platform
Sprint 10: Anonymous Reporting upload
Sprint 11: Questionnaires + research dashboard
Sprint 12: Signed-In Mode foundation
Sprint 13: Account sync + migration
Sprint 14: Trial-contact opt-in
Sprint 15: Admin/research ops v0
Sprint 16: hardening, accessibility, privacy/security review
```

---

# 26. Recommended immediate engineering decisions

Make these decisions before heavy implementation:

1. **Local database choice**
   Decide the wrapper and migration approach for browser storage.

2. **Export schema governance**
   Decide how schema versions, migrations, and backwards compatibility are handled.

3. **Test definition format**
   Decide how task versions, stimulus seeds, scoring versions, and quality rules are represented.

4. **Consent model**
   Decide categories and versioning before any reporting upload exists.

5. **Anonymous ID model**
   Decide whether anonymous IDs are generated client-side, server-side, or both with server registration.

6. **Account provider**
   Decide auth provider and deletion/export responsibilities.

7. **Clinical-claim boundary**
   Freeze allowed and forbidden product language for v1.

8. **Research governance**
   Decide who can approve research exports and under what process.

---

# 27. Recommended build order

The best build order is:

```text
1. Local storage
2. Reaction-time vertical slice
3. JSON export/import
4. Offline onboarding
5. Dashboard/baseline
6. More tests
7. Consent engine
8. Anonymous reporting
9. Questionnaires
10. Signed-in accounts
11. Account migration/sync
12. Trial-contact opt-in
13. Research/admin tooling
14. Validation and hardening
```

Do not reverse this by starting with accounts or admin tooling. The hard part of this product is not login. The hard part is trustworthy repeated measurement, local-first data integrity, consent boundaries, and longitudinal scoring.

[1]: https://vinext.io/ "vinext — The Next.js API surface, reimplemented on Vite"
[2]: https://github.com/cloudflare/vinext "GitHub - cloudflare/vinext: Vite plugin that reimplements the Next.js API surface — deploy anywhere · GitHub"
[3]: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/ "Next.js · Cloudflare Workers docs"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Performance/now?utm_source=chatgpt.com "Performance: now() method - Web APIs - MDN Web Docs"
[5]: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist?utm_source=chatgpt.com "StorageManager: persist() method - Web APIs | MDN"
[6]: https://developers.cloudflare.com/workers/platform/storage-options/ "Choosing a data or storage product. · Cloudflare Workers docs"
[7]: https://developers.cloudflare.com/durable-objects/ "Overview · Cloudflare Durable Objects docs"
