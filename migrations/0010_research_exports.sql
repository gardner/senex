create table if not exists "research_exports" (
  "export_id" text not null primary key,
  "created_at" text not null,
  "created_by_user_id" text not null references "user" ("id"),
  "status" text not null check ("status" in ('completed')),
  "purpose" text not null,
  "approval_reference" text not null,
  "filters_json" text not null,
  "category_list_json" text not null,
  "submission_count" integer not null,
  "record_count" integer not null,
  "excluded_count" integer not null,
  "manifest_json" text not null
);

create index if not exists "research_exports_created_idx"
  on "research_exports" ("created_at");
