/** @jest-environment node */

describe('MemberInjuryModel schema', () => {
  it('requires memberId', async () => {
    const { MemberInjuryModel } = await import('@/lib/db/models/member-injury.model');
    const doc = new MemberInjuryModel({ title: 'Knee strain' });
    const err = doc.validateSync();
    expect(err?.errors['memberId']).toBeDefined();
  });

  it('requires title', async () => {
    const { MemberInjuryModel } = await import('@/lib/db/models/member-injury.model');
    const { Types } = await import('mongoose');
    const doc = new MemberInjuryModel({ memberId: new Types.ObjectId() });
    const err = doc.validateSync();
    expect(err?.errors['title']).toBeDefined();
  });

  it('defaults status to active', async () => {
    const { MemberInjuryModel } = await import('@/lib/db/models/member-injury.model');
    const { Types } = await import('mongoose');
    const doc = new MemberInjuryModel({
      memberId: new Types.ObjectId(),
      title: 'Test',
    });
    expect(doc.status).toBe('active');
  });

  it('defaults trainerNotes, memberNotes, affectedMovements to null', async () => {
    const { MemberInjuryModel } = await import('@/lib/db/models/member-injury.model');
    const { Types } = await import('mongoose');
    const doc = new MemberInjuryModel({
      memberId: new Types.ObjectId(),
      title: 'Test',
    });
    expect(doc.trainerNotes).toBeNull();
    expect(doc.memberNotes).toBeNull();
    expect(doc.affectedMovements).toBeNull();
  });

  it('rejects invalid status value', async () => {
    const { MemberInjuryModel } = await import('@/lib/db/models/member-injury.model');
    const { Types } = await import('mongoose');
    const doc = new MemberInjuryModel({
      memberId: new Types.ObjectId(),
      title: 'Test',
      status: 'unknown',
    });
    const err = doc.validateSync();
    expect(err?.errors['status']).toBeDefined();
  });
});
