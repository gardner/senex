create table if not exists "anonymous_research_submission_records" (
  "record_id" text not null primary key,
  "submission_id" text not null,
  "anonymous_study_id" text not null,
  "category" text not null,
  "record_type" text not null,
  "record_json" text not null,
  "created_at" text not null
);

create index if not exists "anonymous_research_submission_records_submission_idx"
  on "anonymous_research_submission_records" ("submission_id");

create index if not exists "anonymous_research_submission_records_category_idx"
  on "anonymous_research_submission_records" ("category");
