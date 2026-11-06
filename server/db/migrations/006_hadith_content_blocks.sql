-- Hadith records join the same review ledger as the other religious content.
-- The Arabic matn, reference, grading and SAJA's meaning explanation are
-- reviewed as one exact snapshot. Nothing about a hadith is reviewed "in
-- general": a later edit to the snapshot is a new version and returns to draft.

alter table content_blocks drop constraint content_blocks_kind_check;
alter table content_blocks add constraint content_blocks_kind_check
  check (kind in ('claim_rule','concept_story','quiz','hadith'));

-- Public reads serve only the published version of a hadith block. Keep the
-- lookup used by the learner route cheap and explicit.
create index content_blocks_published_idx on content_blocks (kind, id) where published_version is not null;
