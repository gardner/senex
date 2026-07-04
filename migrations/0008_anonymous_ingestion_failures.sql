create table if not exists "anonymous_research_ingestion_failures" (
  "failure_id" text not null primary key,
  "idempotency_key_hash" text,
  "payload_version" text,
  "local_schema_version" text,
  "app_version" text,
  "consent_terms_version" text,
  "category_list_json" text not null,
  "received_at" text not null,
  "status" text not null,
  "retry_state" text not null,
  "error_message" text not null,
  "action_required" text not null
);

create index if not exists "anonymous_research_ingestion_failures_received_idx"
  on "anonymous_research_ingestion_failures" ("received_at");

create index if not exists "anonymous_research_ingestion_failures_retry_idx"
  on "anonymous_research_ingestion_failures" ("retry_state");
