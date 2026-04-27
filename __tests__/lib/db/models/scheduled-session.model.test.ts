/** @jest-environment node */
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';

describe('ScheduledSession model schema', () => {
  it('exports ScheduledSessionModel without throwing', () => {
    expect(ScheduledSessionModel).toBeDefined();
  });
});
