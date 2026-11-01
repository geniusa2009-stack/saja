-- One review workflow for every piece of religious content:
--   DRAFT → INTERNAL REVIEW → SCHOLAR REVIEW → APPROVED → PUBLISHED (versioned)
-- Knowledge documents already had it. This adds missions and the texts that
-- live in code (AMANAH/NOUR claim rules, explainer stories, Siraj quizzes),
-- and stops staff drafts of demo content from ever reaching learners.

-- ─── Demo baseline ─────────────────────────────────────────────────────────
-- Learners receive the PUBLISHED version or, until something is published, the
-- seeded DEMO version (labelled as demo). A new draft never changes either.
alter table knowledge_documents add column demo_version int;
update knowledge_documents d set demo_version = (select min(v.version) from knowledge_document_versions v where v.document_id = d.id) where d.is_demo;

-- ─── Missions ──────────────────────────────────────────────────────────────
alter table missions add column review_status text not null default 'draft'
  check (review_status in ('draft','internal_review','scholar_review','approved','published','archived'));
alter table missions add column published_version int;
alter table missions add column demo_version int;
update missions m set demo_version = (select min(v.version) from mission_versions v where v.mission_id = m.id) where m.is_demo;
alter table mission_versions add column change_note text;
alter table mission_versions add column created_by uuid references users(id) on delete set null;

-- ─── Texts that live in code ───────────────────────────────────────────────
-- The text itself ships with the app. What is reviewed is an exact snapshot
-- (content hash). If the code changes, the block goes back to draft.
create table content_blocks (
  kind text not null check (kind in ('claim_rule','concept_story','quiz')),
  id text not null,
  current_version int not null default 1,
  content_hash text not null,
  review_status text not null default 'draft'
    check (review_status in ('draft','internal_review','scholar_review','approved','published','archived')),
  published_version int,
  is_demo boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
create table content_block_versions (
  kind text not null,
  id text not null,
  version int not null,
  content_hash text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (kind, id, version),
  foreign key (kind, id) references content_blocks(kind, id) on delete cascade
);

-- ─── One review ledger ─────────────────────────────────────────────────────
alter table content_reviews alter column document_id drop not null;
alter table content_reviews add column mission_id text references missions(id) on delete cascade;
alter table content_reviews add column block_kind text;
alter table content_reviews add column block_id text;
alter table content_reviews add constraint content_reviews_block_fk foreign key (block_kind, block_id) references content_blocks(kind, id) on delete cascade;
alter table content_reviews add constraint content_reviews_one_subject
  check (num_nonnulls(document_id, mission_id, block_id) = 1 and (block_id is null) = (block_kind is null));
create index content_reviews_mission_idx on content_reviews (mission_id, version);
create index content_reviews_block_idx on content_reviews (block_kind, block_id, version);

-- ─── Scholar verification: SAMPLE is its own state ─────────────────────────
alter table scholar_profiles drop constraint scholar_profiles_verification_status_check;
alter table scholar_profiles add constraint scholar_profiles_verification_status_check
  check (verification_status in ('unverified','pending','verified','suspended','sample'));
update scholar_profiles set verification_status = 'sample' where is_demo;
-- A sample profile can never be anything else, and nothing else can be a sample.
alter table scholar_profiles add constraint scholar_profiles_sample_is_demo check ((verification_status = 'sample') = is_demo);
