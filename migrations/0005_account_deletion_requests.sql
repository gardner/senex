create table if not exists "account_deletion_requests" (
  "request_id" text not null primary key,
  "user_id" text not null references "user" ("id") on delete cascade,
  "requested_at" text not null,
  "status" text not null default 'pending' check (
    "status" in ('pending', 'reviewing', 'completed', 'rejected', 'cancelled')
  ),
  "scope_json" text not null,
  "limitations_json" text not null,
  "source" text not null,
  "updated_at" text not null
);

create index if not exists "account_deletion_requests_user_requested_idx"
  on "account_deletion_requests" ("user_id", "requested_at");

create unique index if not exists "account_deletion_requests_open_user_uidx"
  on "account_deletion_requests" ("user_id")
  where "status" in ('pending', 'reviewing');
