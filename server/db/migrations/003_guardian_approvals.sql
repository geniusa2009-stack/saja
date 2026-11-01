-- A guardian's circle approvals are part of their consent: when the guardian's
-- account is deleted, the approvals go too (the child's consent is revoked in code).
alter table circle_approvals drop constraint circle_approvals_approved_by_fkey,
  add constraint circle_approvals_approved_by_fkey foreign key (approved_by) references users(id) on delete cascade;
