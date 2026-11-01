import { canDirectMessage, canJoinCircle, getSafetyPolicy, moderateMessage, DEFAULT_PARENTAL } from '../safety';

describe('child safety policy', () => {
  it('never allows direct messages involving a child or teen, in either direction', () => {
    expect(canDirectMessage('adult', 'child')).toBe(false);
    expect(canDirectMessage('child', 'adult')).toBe(false);
    expect(canDirectMessage('child', 'child')).toBe(false);
    expect(canDirectMessage('adult', 'teen')).toBe(false);
    expect(canDirectMessage('adult', 'adult')).toBe(true);
  });

  it('blocks personal information from children before it is sent', () => {
    const kid = getSafetyPolicy('child');
    expect(moderateMessage('call me on 055 123 4567', kid)).toMatchObject({ status: 'blocked' });
    expect(moderateMessage('my email is sara@example.com', kid)).toMatchObject({ status: 'blocked', flags: ['email'] });
    expect(moderateMessage('add me on snapchat', kid).status).toBe('blocked');
    expect(moderateMessage('i live at 12 Palm Street', kid).status).toBe('blocked');
    expect(moderateMessage('رقمي ٠٥٥١٢٣٤٥٦٧', kid).status).toBe('blocked');
    expect(moderateMessage('let us meet up after school', kid).status).toBe('blocked');
  });

  it('blocks links for children but allows them for adults', () => {
    expect(moderateMessage('look at www.example.com', getSafetyPolicy('child')).status).toBe('blocked');
    expect(moderateMessage('look at www.example.com', getSafetyPolicy('adult')).status).toBe('ok');
  });

  it('holds (not blocks) adult personal info and unkind words for moderator review', () => {
    expect(moderateMessage('email me: a@b.co', getSafetyPolicy('adult')).status).toBe('held');
    expect(moderateMessage('that is stupid', getSafetyPolicy('adult')).status).toBe('held');
    expect(moderateMessage('that is stupid', getSafetyPolicy('child')).status).toBe('held');
  });

  it('lets ordinary encouragement through', () => {
    expect(moderateMessage('MashaAllah, I finished the wudu mission!', getSafetyPolicy('child')).status).toBe('ok');
    expect(moderateMessage('We start with the right side!', getSafetyPolicy('child')).status).toBe('ok');
  });

  it('restricts children to age-matched, moderated, guardian-approved circles', () => {
    const kid = getSafetyPolicy('child');
    const circle = { id: 'garden', ageBand: 'child' as const, moderated: true };
    expect(canJoinCircle(kid, circle, DEFAULT_PARENTAL)).toEqual({ ok: false, reason: 'needs-guardian' });
    expect(canJoinCircle(kid, circle, { ...DEFAULT_PARENTAL, approvedCircles: ['garden'] })).toEqual({ ok: true });
    expect(canJoinCircle(kid, { ...circle, ageBand: 'adult' }, { ...DEFAULT_PARENTAL, approvedCircles: ['garden'] })).toMatchObject({ ok: false, reason: 'age-band' });
    expect(canJoinCircle(kid, { ...circle, moderated: false }, { ...DEFAULT_PARENTAL, approvedCircles: ['garden'] })).toMatchObject({ ok: false, reason: 'unmoderated' });
  });

  it('never lets an adult (or teen) join a children’s circle', () => {
    const kidsCircle = { id: 'garden', ageBand: 'child' as const, moderated: true };
    expect(canJoinCircle(getSafetyPolicy('adult'), kidsCircle)).toMatchObject({ ok: false, reason: 'age-band' });
    expect(canJoinCircle(getSafetyPolicy('teen'), kidsCircle)).toMatchObject({ ok: false, reason: 'age-band' });
    expect(canJoinCircle(getSafetyPolicy('adult'), { id: 'x', ageBand: 'adult', moderated: false })).toEqual({ ok: true });
  });

  it('never exposes location publicly for anyone', () => {
    for (const band of ['child', 'teen', 'adult'] as const) {
      expect(getSafetyPolicy(band).publicFields).not.toContain('location' as never);
    }
  });
});
