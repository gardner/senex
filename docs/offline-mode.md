# Offline Mode

Offline Mode is the first usable Senex product path. It works without an
account, stores history in browser IndexedDB, and does not upload test data.

## First-Run Flow

The public home page starts with `components/offline-mode-panel.tsx`:

1. User chooses **Use privately on this device**.
2. Senex creates or reuses a local offline profile.
3. User can save optional baseline context:
   - sleep last night
   - stress today
   - distractions today
   - free-text context notes
4. Context is stored as local `QuestionnaireAnswerRecord` rows with
   `questionnaireId: "baseline_setup_v1"`.
5. The offline dashboard shows today status, baseline status, completion counts,
   and domain cards from local sessions and scores.

The copy must stay plain-language and non-diagnostic. Early sessions are
baseline-forming; they are not clinical findings.

## Dashboard Rules

Dashboard summaries are computed by `lib/offline-dashboard.ts` from local
sessions and scores:

- Today status is based on completed local sessions for the current date.
- Baseline status uses the reusable personal-baseline engine.
- Completion counts are unique completed days over 7 and 30 days.
- Reaction speed uses local `median_rt_ms` scores.
- Other domain cards remain explicit waiting states until their interactive
  task runners are complete.

The dashboard never shows population norms in v1. Low-confidence or
insufficient data must remain visibly uncertain.

## Local Data Controls

The offline panel links to the JSON backup card, keeps the persistent-storage
request path available, and adds a delete-local-history flow with browser
confirmation.

Browser storage remains browser-managed. MDN documents that
`navigator.storage.persist()` requests persistent storage and may resolve false
depending on browser rules. web.dev describes default storage as best-effort,
where IndexedDB data may be evicted under storage pressure unless persistence is
granted. That is why the UI treats JSON export as the safer user-owned backup
path.

Data protection by default also matters: the offline path limits collection to
local product use and keeps reporting/account sync off unless the user chooses
them later. The UK ICO describes data protection by default as limiting personal
information use to what is necessary for the purpose.

References:

- [MDN StorageManager.persist](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- [web.dev Storage for the web](https://web.dev/articles/storage-for-the-web)
- [ICO data protection by design and default](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-by-design-and-by-default/)

## Tests

- `tests/offline-dashboard.test.ts` covers summary states, baseline status,
  completion windows, and no population comparisons.
- `tests/browser/offline-mode.spec.ts` covers first-run private mode, local
  baseline context, dashboard refresh after a task, and delete cancel/confirm.
- `tests/browser/local-data.spec.ts` keeps local storage and persistence
  messaging covered through the new panel.
