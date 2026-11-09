-- Opt-in daily local prayer time alerts. Never stores whether a prayer was performed.
create table prayer_alert_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  enabled boolean not null default false,
  prayers text[] not null default array['fajr','dhuhr','asr','maghrib','isha']::text[],
  updated_at timestamptz not null default now(),
  constraint prayer_alerts_valid_names check (
    prayers <@ array['fajr','dhuhr','asr','maghrib','isha']::text[]
  )
);
create index prayer_alert_preferences_enabled_idx on prayer_alert_preferences(user_id) where enabled = true;
