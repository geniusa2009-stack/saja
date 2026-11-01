-- SAJA core schema. Portable PostgreSQL (runs on PGlite locally and managed Postgres in production).
create extension if not exists vector;

-- ─── Identity ────────────────────────────────────────────────────────────
create table users (
  id uuid primary key default gen_random_uuid(),
  email text,
  password_hash text,
  is_guest boolean not null default true,
  is_demo boolean not null default false,            -- seeded sample personas; never real people
  demo_handle text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index users_email_uq on users (lower(email)) where email is not null;

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('learner','guardian','mentor','scholar','moderator','admin')),
  granted_by uuid references users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

create table password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  provider text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- ─── Profile, age & consent ─────────────────────────────────────────────
create table profiles (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  locale text not null default 'en' check (locale in ('en','ar')),
  purpose text not null check (purpose in ('exploring','new-muslim','learn-more','child')),
  level text not null default 'beginner' check (level in ('beginner','some','confident')),
  modality text not null default 'hands-on' check (modality in ('hands-on','visual','story','guided')),
  goals text[] not null default '{}',
  interests text[] not null default '{}',
  character jsonb not null,
  onboarding_step text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Age is DECLARED by the user, may be APPROVED by a guardian/admin, and children need GUARDIAN CONSENT.
-- None of these are legal identity verification.
create table age_status (
  user_id uuid primary key references users(id) on delete cascade,
  declared_band text not null check (declared_band in ('child','teen','adult')),
  declared_at timestamptz not null default now(),
  approved_band text check (approved_band in ('child','teen','adult')),
  approved_by uuid references users(id),
  approved_at timestamptz,
  guardian_consent text not null default 'not_required' check (guardian_consent in ('not_required','pending','granted','revoked')),
  consent_by uuid references users(id),
  consent_at timestamptz
);

create table guardian_links (
  id uuid primary key default gen_random_uuid(),
  child_user_id uuid not null references users(id) on delete cascade,
  guardian_user_id uuid references users(id) on delete cascade,
  code_hash text not null unique,
  code_expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  created_at timestamptz not null default now(),
  consented_at timestamptz
);
create index guardian_links_guardian_idx on guardian_links (guardian_user_id);

create table parental_settings (
  child_user_id uuid primary key references users(id) on delete cascade,
  approve_circles boolean not null default true,
  quick_replies_only boolean not null default false,
  daily_minutes int not null default 45 check (daily_minutes between 0 and 600),
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

create table circle_approvals (
  child_user_id uuid not null references users(id) on delete cascade,
  circle_id text not null,
  approved_by uuid not null references users(id),
  approved_at timestamptz not null default now(),
  primary key (child_user_id, circle_id)
);

-- ─── Learning ────────────────────────────────────────────────────────────
create table missions (
  id text primary key,
  number int not null unique,
  location text not null,
  chapter int not null,
  topic text not null,
  concept text not null,
  interaction_type text not null,
  modality text not null,
  difficulty int not null check (difficulty between 1 and 3),
  minutes int not null,
  definition jsonb not null,
  version int not null default 1,
  is_demo boolean not null default true,
  updated_at timestamptz not null default now()
);

create table mission_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mission_id text not null references missions(id),
  status text not null default 'started' check (status in ('started','completed','abandoned')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  mistakes int not null default 0,
  hints int not null default 0,
  retries int not null default 0,
  modality text,
  helper_modality text,
  duration_ms int
);
create index mission_attempts_user_idx on mission_attempts (user_id, mission_id);

create table learning_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  attempt_id uuid references mission_attempts(id) on delete set null,
  kind text not null check (kind in ('step','hint','complete','adapt_offer','adapt_accept')),
  topic text not null,
  concept text not null,
  correct boolean,
  ms int,
  modality text,
  created_at timestamptz not null default now()
);
create index learning_signals_user_idx on learning_signals (user_id, created_at);

create table learner_models (
  user_id uuid primary key references users(id) on delete cascade,
  model jsonb not null,
  updated_at timestamptz not null default now()
);

create table achievements (
  user_id uuid not null references users(id) on delete cascade,
  achievement_id text not null,
  kind text not null check (kind in ('artifact','badge','item','story','place')),
  mission_id text references missions(id),
  location_id text,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table world_state (
  user_id uuid primary key references users(id) on delete cascade,
  location text not null default 'village',
  visited text[] not null default '{village}',
  updated_at timestamptz not null default now()
);

create table reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lines text[] not null,
  created_at timestamptz not null default now()
);

-- ─── Memory ──────────────────────────────────────────────────────────────
create table memory_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  style boolean not null default true,
  topics boolean not null default true,
  schedule boolean not null default false,
  conversations boolean not null default false,
  updated_at timestamptz not null default now()
);

create table tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user','siraj')),
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index tutor_messages_user_idx on tutor_messages (user_id, created_at);

-- ─── Knowledge & trust ───────────────────────────────────────────────────
create table knowledge_sources (
  id text primary key,
  kind text not null check (kind in ('quran','hadith','scholarly','reference')),
  title text not null,
  publisher text,
  language text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table knowledge_documents (
  id text primary key,
  topics text[] not null default '{}',
  confidence text not null check (confidence in ('consensus','majority','difference','review')),
  review_status text not null default 'draft' check (review_status in ('draft','internal_review','scholar_review','approved','published','archived')),
  is_demo boolean not null default true,
  current_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Versions are append-only: evidence is never overwritten silently.
create table knowledge_document_versions (
  document_id text not null references knowledge_documents(id) on delete cascade,
  version int not null,
  content jsonb not null,
  evidence jsonb not null,
  change_note text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  primary key (document_id, version)
);

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references knowledge_documents(id) on delete cascade,
  version int not null,
  source_id text references knowledge_sources(id),
  language text not null check (language in ('en','ar')),
  section text not null,
  reference text,
  content text not null,
  keywords text[] not null default '{}',
  embedding vector,
  embedding_model text not null,
  review_status text not null,
  created_at timestamptz not null default now()
);
create index knowledge_chunks_doc_idx on knowledge_chunks (document_id, version);

create table knowledge_claims (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references knowledge_documents(id) on delete cascade,
  version int not null,
  statement jsonb not null,
  source_id text references knowledge_sources(id),
  source_location text,
  rendering text not null check (rendering in ('translation','meaning','summary')),
  review_status text not null,
  language text not null default 'en'
);

create table knowledge_relationships (
  id uuid primary key default gen_random_uuid(),
  from_type text not null check (from_type in ('topic','source','claim','concept','mission','chapter','document','review','language')),
  from_id text not null,
  relation text not null check (relation in ('supports','related_to','explains','requires','precedes','illustrates','reviewed_by','translated_as')),
  to_type text not null check (to_type in ('topic','source','claim','concept','mission','chapter','document','review','language')),
  to_id text not null,
  created_at timestamptz not null default now(),
  unique (from_type, from_id, relation, to_type, to_id)
);

create table content_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id text not null references knowledge_documents(id) on delete cascade,
  version int not null,
  from_status text not null,
  to_status text not null,
  reviewer_id uuid references users(id),
  reviewer_role text not null,
  scope text not null,
  note text,
  created_at timestamptz not null default now()
);

create table daily_content (
  id text primary key,
  kind text not null check (kind in ('reflection','dua','learning')),
  document_id text not null references knowledge_documents(id),
  topic text not null,
  active_from date,
  active_to date,
  is_demo boolean not null default true
);

-- ─── Scholars ────────────────────────────────────────────────────────────
create table scholar_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete set null,
  display_name text not null,
  title jsonb not null,
  specialization jsonb not null,
  languages text[] not null default '{}',
  credentials jsonb not null default '[]',             -- metadata only, as provided and checked by admins
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','suspended')),
  verification_scope text,
  verified_by uuid references users(id),
  verified_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table scholar_questions (
  id uuid primary key default gen_random_uuid(),
  asker_id uuid not null references users(id) on delete cascade,
  question text not null,
  context text,
  topic text not null,
  redacted boolean not null default false,
  ai_assist jsonb,                                     -- AI structuring output, stored and shown as AI assistance
  status text not null default 'queued' check (status in ('held','queued','assigned','answered','rejected','withdrawn')),
  moderation jsonb,
  assigned_scholar_id uuid references scholar_profiles(id),
  source text not null default 'learner' check (source in ('learner','amanah','nour')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scholar_questions_status_idx on scholar_questions (status, created_at);

create table scholar_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references scholar_questions(id) on delete cascade,
  scholar_id uuid not null references scholar_profiles(id),
  body jsonb not null,
  sources jsonb not null default '[]',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Community ───────────────────────────────────────────────────────────
create table circles (
  id text primary key,
  name jsonb not null,
  tagline jsonb not null,
  age_band text not null check (age_band in ('child','teen','adult')),
  languages text[] not null,
  path jsonb not null,
  moderated boolean not null default true,
  rules jsonb not null,
  weekly_goal jsonb not null,
  challenge jsonb not null,
  resources jsonb not null default '[]',
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

create table circle_members (
  circle_id text not null references circles(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('member','mentor','moderator')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (circle_id, user_id)
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  circle_id text not null references circles(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  reply_to uuid references chat_messages(id) on delete set null,
  status text not null default 'visible' check (status in ('visible','held','hidden','removed')),
  moderation jsonb,
  is_quick_reply boolean not null default false,
  pinned boolean not null default false,
  client_id text,
  created_at timestamptz not null default now()
);
create unique index chat_messages_client_uq on chat_messages (author_id, client_id) where client_id is not null;
create index chat_messages_circle_idx on chat_messages (circle_id, created_at);

create table chat_reactions (
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  reaction text not null check (reaction in ('heart','mashaallah','helpful','keepgoing','proud')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);

create table chat_reads (
  circle_id text not null references circles(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references chat_messages(id) on delete cascade,
  reporter_id uuid not null references users(id) on delete cascade,
  reason text not null check (reason in ('unkind','unsafe','personal-info','wrong-info','other')),
  note text,
  status text not null default 'open' check (status in ('open','resolved','dismissed','escalated')),
  created_at timestamptz not null default now(),
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  unique (message_id, reporter_id)
);

create table user_blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- Adult-only, request/accept private messaging. Never available to children or teens (enforced in service code).
create table dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references users(id) on delete cascade,
  user_b uuid not null references users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','active','declined','closed')),
  requested_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);
create table dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references dm_threads(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible','held','hidden','removed')),
  moderation jsonb,
  created_at timestamptz not null default now()
);

create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('message','dm','user','question','circle','report')),
  target_id text not null,
  action text not null check (action in ('allow','hold','hide','warn','report','escalate','restore','remove')),
  categories text[] not null default '{}',
  reason text,
  actor_id uuid references users(id),
  actor_kind text not null check (actor_kind in ('system','human')),
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx on moderation_actions (target_type, target_id);

-- ─── My Day ──────────────────────────────────────────────────────────────
create table day_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  prefs jsonb not null,
  updated_at timestamptz not null default now()
);
create table daily_plans (
  user_id uuid not null references users(id) on delete cascade,
  plan_date date not null,
  note text,
  constraints jsonb not null default '[]',
  items jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);
create table plan_item_status (
  user_id uuid not null references users(id) on delete cascade,
  plan_date date not null,
  item_id text not null,
  done boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_date, item_id)
);
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 80),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create table prayer_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  city_id text,
  lat numeric(6,2),
  lng numeric(6,2),
  time_zone text not null default 'Asia/Riyadh',
  method text not null default 'auto',
  asr text not null default 'standard' check (asr in ('standard','hanafi')),
  updated_at timestamptz not null default now()
);
create table prayer_log (
  user_id uuid not null references users(id) on delete cascade,
  log_date date not null,
  prayer text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  mark text not null check (mark in ('prayed','later')),
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date, prayer)
);

-- ─── Notifications ───────────────────────────────────────────────────────
create table notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  categories jsonb not null,
  updated_at timestamptz not null default now()
);
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category text not null check (category in ('prayer','mission','circle','scholar','moderation','unlock','reflection')),
  title jsonb not null,
  body jsonb not null,
  url text,
  scheduled_for timestamptz not null default now(),
  status text not null default 'scheduled' check (status in ('scheduled','delivered','read','cancelled','failed')),
  channels text[] not null default '{}',
  dedupe_key text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz
);
create unique index notifications_dedupe_uq on notifications (user_id, dedupe_key) where dedupe_key is not null;
create index notifications_due_idx on notifications (status, scheduled_for);
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  failure_count int not null default 0
);

-- ─── Trust tools ─────────────────────────────────────────────────────────
create table uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('image','audio','video','document')),
  mime text not null,
  size_bytes int not null,
  sha256 text not null,
  storage_key text not null,
  original_name text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table content_audits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  tool text not null check (tool in ('amanah','nour')),
  title text,
  input_kind text not null,
  upload_id uuid references uploads(id) on delete set null,
  status text not null default 'processing' check (status in ('processing','completed','failed','unavailable')),
  stages jsonb not null default '[]',
  extracted_text text,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create table content_claims (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references content_audits(id) on delete cascade,
  position int not null,
  text text not null,
  verdict text not null check (verdict in ('supported','needs-context','mismatch','unverified','review')),
  explanation jsonb not null,
  evidence jsonb not null default '[]',
  suggestion jsonb,
  rule_id text
);
create table content_revisions (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references content_audits(id) on delete cascade,
  claim_id uuid references content_claims(id) on delete set null,
  before_text text not null,
  after_text text not null,
  applied_by uuid references users(id),
  created_at timestamptz not null default now()
);

-- ─── Analytics (privacy-conscious: event names + small non-content props) ─
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  name text not null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on analytics_events (name, created_at);
