-- SAJA finalization: data integrity, provenance, versioning, time limits, file cleanup.

-- ─── Account deletion must never be blocked or leave personal rows behind ──
-- References to a person that exist only for accountability become NULL
-- ("someone who has since deleted their account"); the record itself stays.
alter table user_roles drop constraint user_roles_granted_by_fkey,
  add constraint user_roles_granted_by_fkey foreign key (granted_by) references users(id) on delete set null;
alter table age_status drop constraint age_status_consent_by_fkey,
  add constraint age_status_consent_by_fkey foreign key (consent_by) references users(id) on delete set null;
alter table age_status drop constraint age_status_approved_by_fkey,
  add constraint age_status_approved_by_fkey foreign key (approved_by) references users(id) on delete set null;
alter table chat_reports drop constraint chat_reports_resolved_by_fkey,
  add constraint chat_reports_resolved_by_fkey foreign key (resolved_by) references users(id) on delete set null;
alter table circle_approvals drop constraint circle_approvals_approved_by_fkey,
  add constraint circle_approvals_approved_by_fkey foreign key (approved_by) references users(id) on delete set null;
alter table content_reviews drop constraint content_reviews_reviewer_id_fkey,
  add constraint content_reviews_reviewer_id_fkey foreign key (reviewer_id) references users(id) on delete set null;
alter table content_revisions drop constraint content_revisions_applied_by_fkey,
  add constraint content_revisions_applied_by_fkey foreign key (applied_by) references users(id) on delete set null;
alter table dm_threads drop constraint dm_threads_requested_by_fkey,
  add constraint dm_threads_requested_by_fkey foreign key (requested_by) references users(id) on delete cascade;
alter table knowledge_document_versions drop constraint knowledge_document_versions_created_by_fkey,
  add constraint knowledge_document_versions_created_by_fkey foreign key (created_by) references users(id) on delete set null;
alter table moderation_actions drop constraint moderation_actions_actor_id_fkey,
  add constraint moderation_actions_actor_id_fkey foreign key (actor_id) references users(id) on delete set null;
alter table parental_settings drop constraint parental_settings_updated_by_fkey,
  add constraint parental_settings_updated_by_fkey foreign key (updated_by) references users(id) on delete set null;
alter table scholar_profiles drop constraint scholar_profiles_verified_by_fkey,
  add constraint scholar_profiles_verified_by_fkey foreign key (verified_by) references users(id) on delete set null;
-- Product analytics are personal data too: they go with the account.
alter table analytics_events drop constraint analytics_events_user_id_fkey,
  add constraint analytics_events_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

-- Private files whose deletion failed are retried until they are gone (no FK: the owner may already be deleted).
create table pending_file_deletions (
  storage_key text primary key,
  reason text not null,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now()
);

-- ─── Content provenance & versioning ──────────────────────────────────────
-- Learners receive the PUBLISHED version; editing creates a new draft version
-- without silently replacing what was reviewed.
alter table knowledge_documents add column published_version int;
alter table knowledge_document_versions add column provenance jsonb not null default '{}';
alter table content_reviews add column reviewer_scholar_id uuid references scholar_profiles(id) on delete set null;

-- Missions are versioned the same way; attempts record the exact version played.
create table mission_versions (
  mission_id text not null references missions(id) on delete cascade,
  version int not null,
  definition jsonb not null,
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  primary key (mission_id, version)
);
insert into mission_versions (mission_id, version, definition, provenance)
  select id, version, definition, '{"origin":"seed-demo"}'::jsonb from missions
  on conflict do nothing;
alter table mission_attempts add column mission_version int;

-- ─── Guardian time limits (measured by the server) ────────────────────────
create table daily_usage (
  user_id uuid not null references users(id) on delete cascade,
  usage_date date not null,
  seconds int not null default 0,
  last_activity_at timestamptz,
  extra_minutes int not null default 0,
  extra_granted_by uuid references users(id) on delete set null,
  primary key (user_id, usage_date)
);

-- ─── Direct messages: reports ─────────────────────────────────────────────
create table dm_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references dm_messages(id) on delete cascade,
  reporter_id uuid not null references users(id) on delete cascade,
  reason text not null check (reason in ('unkind','unsafe','personal-info','wrong-info','other')),
  status text not null default 'open' check (status in ('open','resolved','dismissed','escalated')),
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);
alter table dm_threads add column updated_at timestamptz not null default now();

-- ─── Scholar answers keep who answered, with what verification, at the time ─
alter table scholar_answers add column provenance jsonb not null default '{}';
alter table scholar_questions add column claimed_at timestamptz;
