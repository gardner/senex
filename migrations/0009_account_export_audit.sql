create table if not exists "account_export_audit" (
  "audit_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "event_type" text not null check (
    "event_type" in ('account_export_generated')
  ),
  "exported_at" text not null,
  "export_version" text not null,
  "record_counts_json" text not null,
  "source" text not null
);

create index if not exists "account_export_audit_user_exported_idx"
  on "account_export_audit" ("user_id", "exported_at");
