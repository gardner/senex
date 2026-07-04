create table if not exists "trial_contact_status" (
  "user_id" text not null primary key references "user" ("id") on delete cascade,
  "enabled" integer not null check ("enabled" in (0, 1)),
  "consent_version" text not null,
  "opted_in_at" text,
  "opted_out_at" text,
  "last_reviewed_at" text not null,
  "updated_at" text not null
);

create table if not exists "trial_contact_consent_events" (
  "event_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "enabled" integer not null check ("enabled" in (0, 1)),
  "consent_version" text not null,
  "decided_at" text not null,
  "source" text not null,
  "created_at" text not null
);

create index if not exists "trial_contact_consent_events_user_decided_idx"
  on "trial_contact_consent_events" ("user_id", "decided_at");
