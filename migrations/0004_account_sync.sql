create table if not exists "account_sync_batches" (
  "sync_batch_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "idempotency_key" text not null,
  "source_profile_id" text not null,
  "record_counts_json" text not null,
  "received_at" text not null,
  "status" text not null check (
    "status" in ('accepted', 'duplicate', 'conflict', 'rejected')
  )
);

create unique index if not exists "account_sync_batches_user_idempotency_uidx"
  on "account_sync_batches" ("user_id", "idempotency_key");

create index if not exists "account_sync_batches_user_received_idx"
  on "account_sync_batches" ("user_id", "received_at");

create table if not exists "account_sync_state" (
  "user_id" text not null primary key references "user" ("id") on delete cascade,
  "last_sync_batch_id" text references "account_sync_batches" ("sync_batch_id") on delete set null,
  "last_synced_at" text,
  "cursor_json" text not null default '{}',
  "pending_conflict_count" integer not null default 0,
  "updated_at" text not null
);

create table if not exists "account_sync_sessions" (
  "account_session_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "sync_batch_id" text not null references "account_sync_batches" ("sync_batch_id") on delete cascade,
  "local_profile_id" text not null,
  "local_session_id" text not null,
  "record_hash" text not null,
  "started_at" text not null,
  "completed_at" text,
  "cadence" text not null,
  "context_snapshot_json" text not null,
  "quality_flags_json" text not null,
  "source_schema_version" integer not null,
  "source_app_version" text not null,
  "received_at" text not null
);

create unique index if not exists "account_sync_sessions_local_hash_uidx"
  on "account_sync_sessions" ("user_id", "local_session_id", "record_hash");

create index if not exists "account_sync_sessions_user_local_idx"
  on "account_sync_sessions" ("user_id", "local_session_id");

create index if not exists "account_sync_sessions_batch_idx"
  on "account_sync_sessions" ("sync_batch_id");

create table if not exists "account_sync_task_runs" (
  "account_task_run_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "sync_batch_id" text not null references "account_sync_batches" ("sync_batch_id") on delete cascade,
  "local_task_run_id" text not null,
  "local_session_id" text not null,
  "record_hash" text not null,
  "task_id" text not null,
  "task_version" text not null,
  "stimulus_pack_id" text not null,
  "stimulus_seed" text not null,
  "started_at" text not null,
  "completed_at" text,
  "summary_score_json" text not null,
  "quality_flags_json" text not null,
  "source_schema_version" integer not null,
  "source_app_version" text not null,
  "received_at" text not null
);

create unique index if not exists "account_sync_task_runs_local_hash_uidx"
  on "account_sync_task_runs" ("user_id", "local_task_run_id", "record_hash");

create index if not exists "account_sync_task_runs_session_idx"
  on "account_sync_task_runs" ("user_id", "local_session_id");

create index if not exists "account_sync_task_runs_batch_idx"
  on "account_sync_task_runs" ("sync_batch_id");

create table if not exists "account_sync_trial_events" (
  "account_trial_event_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "sync_batch_id" text not null references "account_sync_batches" ("sync_batch_id") on delete cascade,
  "local_trial_event_id" text not null,
  "local_task_run_id" text not null,
  "record_hash" text not null,
  "trial_index" integer not null,
  "stimulus_json" text not null,
  "expected_response_json" text not null,
  "actual_response_json" text not null,
  "correct" integer check ("correct" in (0, 1) or "correct" is null),
  "stimulus_onset_time" real not null,
  "response_time" real,
  "rt_ms" real,
  "event_flags_json" text not null,
  "source_schema_version" integer not null,
  "source_app_version" text not null,
  "received_at" text not null
);

create unique index if not exists "account_sync_trial_events_local_hash_uidx"
  on "account_sync_trial_events" ("user_id", "local_trial_event_id", "record_hash");

create index if not exists "account_sync_trial_events_task_run_idx"
  on "account_sync_trial_events" ("user_id", "local_task_run_id");

create index if not exists "account_sync_trial_events_batch_idx"
  on "account_sync_trial_events" ("sync_batch_id");

create table if not exists "account_sync_scores" (
  "account_score_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "sync_batch_id" text not null references "account_sync_batches" ("sync_batch_id") on delete cascade,
  "local_score_id" text not null,
  "local_session_id" text not null,
  "local_task_run_id" text not null,
  "record_hash" text not null,
  "domain" text not null,
  "metric_name" text not null,
  "raw_value" real not null,
  "normalized_value" real,
  "confidence" real not null check ("confidence" >= 0 and "confidence" <= 1),
  "quality_flags_json" text not null,
  "source_schema_version" integer not null,
  "source_app_version" text not null,
  "received_at" text not null
);

create unique index if not exists "account_sync_scores_local_hash_uidx"
  on "account_sync_scores" ("user_id", "local_score_id", "record_hash");

create index if not exists "account_sync_scores_session_idx"
  on "account_sync_scores" ("user_id", "local_session_id");

create index if not exists "account_sync_scores_task_run_idx"
  on "account_sync_scores" ("user_id", "local_task_run_id");

create index if not exists "account_sync_scores_batch_idx"
  on "account_sync_scores" ("sync_batch_id");

create table if not exists "account_sync_consent_events" (
  "account_consent_event_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "sync_batch_id" text not null references "account_sync_batches" ("sync_batch_id") on delete cascade,
  "local_consent_record_id" text not null,
  "local_profile_id" text not null,
  "record_hash" text not null,
  "mode" text not null check (
    "mode" in ('offline', 'anonymous_reporting', 'signed_in')
  ),
  "consent_type" text not null,
  "version" text not null,
  "decision" text not null check (
    "decision" in ('granted', 'denied', 'withdrawn')
  ),
  "decided_at" text not null,
  "source_screen" text not null,
  "data_categories_json" text not null,
  "source_schema_version" integer not null,
  "source_app_version" text not null,
  "received_at" text not null
);

create unique index if not exists "account_sync_consent_events_local_hash_uidx"
  on "account_sync_consent_events" (
    "user_id",
    "local_consent_record_id",
    "record_hash"
  );

create index if not exists "account_sync_consent_events_user_decided_idx"
  on "account_sync_consent_events" ("user_id", "decided_at");

create index if not exists "account_sync_consent_events_batch_idx"
  on "account_sync_consent_events" ("sync_batch_id");
