-- Recurring, opt-in remembrance notifications. Only a timezone and wall-clock time are stored.
-- Never store a location, prayer history or religious adherence in this table.
alter table notifications drop constraint if exists notifications_category_check;
alter table notifications add constraint notifications_category_check
  check (category in ('prayer','mission','circle','scholar','moderation','unlock','reflection','adhkar'));

create table devotional_reminders (
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('morning','evening')),
  enabled boolean not null default false,
  at_time text not null check (at_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  time_zone text not null,
  last_local_date text,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);
create index devotional_reminders_enabled_idx on devotional_reminders (enabled) where enabled = true;
