import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../../context.ts';
import { body } from '../../lib/http.ts';
import { AppError } from '../../lib/errors.ts';
import { requireAccess } from '../../auth/middleware.ts';
import { answerIntent, ask } from './pipeline.ts';
import { track } from '../analytics.ts';

export const sirajRoutes = new Hono<AppEnv>();

const Ctx = z.object({
  locale: z.enum(['en', 'ar']),
  lastMission: z.object({ id: z.string().max(40), title: z.string().max(80) }).optional(),
  weakTopics: z.array(z.string().max(20)).max(8).optional(),
  modality: z.enum(['hands-on', 'visual', 'story', 'guided']).optional(),
  focusKnowledgeId: z.string().max(40).optional(),
});

sirajRoutes.post('/ask', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  const b = await body(c, z.object({ text: z.string().max(2000).optional(), intent: z.enum(['simple', 'deep', 'example', 'why', 'source', 'quiz']).optional(), ctx: Ctx }).refine((x) => x.text || x.intent));
  let answer;
  if (b.intent) {
    if (!b.ctx.focusKnowledgeId) throw new AppError('bad_request', 'Choose a topic first.');
    answer = await answerIntent(s, b.intent, b.ctx.focusKnowledgeId, b.ctx.locale);
    if (!answer) throw new AppError('not_found', 'Unknown topic.');
  } else {
    await s.limiter.take('ai', a.userId);
    answer = await ask(s, a, b.text!, b.ctx);
  }
  if (a.memory.conversations) {
    if (b.text) await s.db.query("insert into tutor_messages (user_id, role, content) values ($1, 'user', $2)", [a.userId, JSON.stringify({ text: b.text })]);
    await s.db.query("insert into tutor_messages (user_id, role, content) values ($1, 'siraj', $2)", [a.userId, JSON.stringify(answer)]);
  }
  await track(s.db, a.userId, answer.route?.kind === 'scholar' ? 'siraj_escalated' : 'siraj_answered', { status: answer.status, by: answer.generatedBy });
  return c.json(answer);
});

sirajRoutes.get('/history', async (c) => {
  const s = c.get('services');
  const a = requireAccess(c);
  if (!a.memory.conversations) return c.json({ messages: [], remembered: false });
  const rows = await s.db.query('select role, content, created_at from tutor_messages where user_id = $1 order by created_at desc limit 60', [a.userId]);
  return c.json({ messages: rows.reverse(), remembered: true });
});
