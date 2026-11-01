-- Every step a scholar question goes through, with who did it (audit trail for the scholar workflow).
create table scholar_question_events (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references scholar_questions(id) on delete cascade,
  event text not null check (event in ('submitted','held','released','rejected','claimed','unclaimed','answered','withdrawn')),
  actor_user_id uuid references users(id) on delete set null,
  actor_scholar_id uuid references scholar_profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index scholar_question_events_q_idx on scholar_question_events (question_id, created_at);
