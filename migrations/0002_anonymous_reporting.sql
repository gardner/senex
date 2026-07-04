create table if not exists "anonymous_research_submissions" (
  "submission_id" text not null primary key,
  "anonymous_study_id" text not null,
  "idempotency_key" text not null unique,
  "payload_json" text not null,
  "consent_snapshot_json" text not null,
  "category_list_json" text not null,
  "received_at" text not null,
  "status" text not null,
  "deletion_request_status" text not null default 'none'
);

create index if not exists "anonymous_research_submissions_study_idx"
  on "anonymous_research_submissions" ("anonymous_study_id");

create table if not exists "anonymous_research_submission_audit" (
  "audit_id" text not null primary key,
  "submission_id" text not null,
  "idempotency_key" text not null,
  "event_type" text not null,
  "event_json" text not null,
  "created_at" text not null
);

create index if not exists "anonymous_research_submission_audit_submission_idx"
  on "anonymous_research_submission_audit" ("submission_id");
