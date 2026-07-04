create table if not exists "trial_contact_profiles" (
  "user_id" text not null primary key references "user" ("id") on delete cascade,
  "profile_version" text not null,
  "preferred_contact_method" text,
  "country_region" text,
  "age_eligibility" text,
  "broad_health_answers_json" text not null,
  "availability_preference" text,
  "last_reviewed_at" text not null,
  "updated_at" text not null
);

create table if not exists "trial_contact_profile_events" (
  "event_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "event_type" text not null check ("event_type" in ('updated', 'cleared')),
  "profile_version" text not null,
  "preferred_contact_method" text,
  "country_region" text,
  "age_eligibility" text,
  "broad_health_answers_json" text not null,
  "availability_preference" text,
  "reviewed_at" text not null,
  "source" text not null,
  "created_at" text not null
);

create index if not exists "trial_contact_profile_events_user_reviewed_idx"
  on "trial_contact_profile_events" ("user_id", "reviewed_at");
